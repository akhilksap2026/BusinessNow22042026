import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, tasksTable, invoicesTable, projectsTable, allocationsTable, notificationsTable, csatSurveysTable } from "@workspace/db";
import { requirePM } from "../middleware/rbac";
import { logAudit } from "../lib/audit";
import {
  ListTasksResponse,
  ListTasksQueryParams,
  CreateTaskBody,
  GetTaskParams,
  GetTaskResponse,
  UpdateTaskParams,
  UpdateTaskBody,
  UpdateTaskResponse,
  DeleteTaskParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const PM_ROLES = new Set(["Admin", "PM", "Super User"]);
function canReadPrivateNotes(role: string): boolean {
  return PM_ROLES.has(role);
}

function mapTask(t: typeof tasksTable.$inferSelect) {
  return {
    ...t,
    effort: Number(t.effort),
    assigneeIds: t.assigneeIds ?? [],
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt,
  };
}

router.get("/tasks", async (req, res): Promise<void> => {
  const role = (req.headers["x-user-role"] as string) ?? "Viewer";
  const qp = ListTasksQueryParams.safeParse(req.query);
  const conditions = [];
  if (qp.success && qp.data.projectId) conditions.push(eq(tasksTable.projectId, qp.data.projectId));
  if (qp.success && qp.data.status) conditions.push(eq(tasksTable.status, qp.data.status));
  const rows = conditions.length
    ? await db.select().from(tasksTable).where(and(...conditions))
    : await db.select().from(tasksTable);
  const mapped = rows.map(t => {
    const task = mapTask(t);
    if (!canReadPrivateNotes(role)) task.privateNotes = null;
    return task;
  });
  res.json(ListTasksResponse.parse(mapped));
});

router.post("/tasks", requirePM, async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(tasksTable).values({ ...parsed.data as any, assigneeIds: parsed.data.assigneeIds ?? [] }).returning();
  await logAudit({ entityType: "task", entityId: row.id, action: "created", description: `Task "${row.name}" created` });
  res.status(201).json(GetTaskResponse.parse(mapTask(row)));
});

router.get("/tasks/:id", async (req, res): Promise<void> => {
  const role = (req.headers["x-user-role"] as string) ?? "Viewer";
  const params = GetTaskParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Task not found" }); return; }
  const task = mapTask(row);
  if (!canReadPrivateNotes(role)) task.privateNotes = null;
  res.json(GetTaskResponse.parse(task));
});

router.patch("/tasks/:id", requirePM, async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  // Load existing task for status transition checks
  const [existing] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Task not found" }); return; }

  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [row] = await db.update(tasksTable).set(parsed.data as any).where(eq(tasksTable.id, params.data.id)).returning();

  // Audit status changes
  if (parsed.data.status && parsed.data.status !== existing.status) {
    await logAudit({
      entityType: "task",
      entityId: row.id,
      action: "status_changed",
      previousValue: { status: existing.status },
      newValue: { status: row.status },
      description: `Task "${row.name}" moved from ${existing.status} to ${row.status}`,
    });
  }

  // Milestone-triggered invoice: Payment milestone completed → create draft invoice
  const completedStatuses = ["Completed", "Done"];
  const wasNotCompleted = !completedStatuses.includes(existing.status ?? "");
  const isNowCompleted = completedStatuses.includes(row.status ?? "");

  if (wasNotCompleted && isNowCompleted && row.isMilestone) {
    const milestoneType = (row as any).milestoneType ?? "";
    if (typeof milestoneType === "string" && milestoneType.toLowerCase().includes("payment")) {
      try {
        const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, row.projectId));
        if (project) {
          const allInvoices = await db.select().from(invoicesTable);
          const invoiceId = `INV-${String(allInvoices.length + 1).padStart(4, "0")}`;
          const [newInvoice] = await db.insert(invoicesTable).values({
            id: invoiceId,
            projectId: project.id,
            accountId: project.accountId,
            status: "Draft",
            issueDate: new Date().toISOString().slice(0, 10),
            dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
            total: String(project.budget ?? 0),
            notes: `Auto-generated from milestone: ${row.name}`,
          }).returning();
          await logAudit({
            entityType: "invoice",
            entityId: newInvoice.id,
            action: "created",
            description: `Draft invoice ${invoiceId} created from milestone task "${row.name}"`,
          });
        }
      } catch (err) {
        // Non-blocking: invoice creation failure should not fail the task update
        console.error("Milestone invoice creation failed:", err);
      }
    }
  }

  // Milestone-triggered CSAT survey: any milestone completed with csat_enabled → create survey + notify
  if (wasNotCompleted && isNowCompleted && row.isMilestone && (row as any).csatEnabled !== false) {
    try {
      // Check no survey already exists for this task
      const existing = await db.select().from(csatSurveysTable).where(eq(csatSurveysTable.milestoneTaskId, row.id));
      if (existing.length === 0) {
        // Find project customer champion: first allocation on project
        const allocs = await db.select().from(allocationsTable).where(eq(allocationsTable.projectId, row.projectId));
        const recipientId = allocs[0]?.userId ?? null;

        const token = crypto.randomUUID();
        const [survey] = await db.insert(csatSurveysTable).values({
          milestoneTaskId: row.id,
          projectId: row.projectId,
          recipientUserId: recipientId,
          token,
        }).returning();

        // Create in-app notification for recipient
        if (recipientId) {
          await db.insert(notificationsTable).values({
            type: "csat_survey",
            message: `You have a satisfaction survey for milestone "${row.name}"`,
            userId: recipientId,
            projectId: row.projectId,
            entityType: "csat_survey",
            entityId: String(survey.id),
          });
        }
      }
    } catch (err) {
      console.error("CSAT survey creation failed:", err);
    }
  }

  res.json(UpdateTaskResponse.parse(mapTask(row)));
});

router.delete("/tasks/:id", requirePM, async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [existing] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  await db.delete(tasksTable).where(eq(tasksTable.id, params.data.id));
  if (existing) {
    await logAudit({ entityType: "task", entityId: params.data.id, action: "deleted", description: `Task "${existing.name}" deleted` });
  }
  res.sendStatus(204);
});

export default router;
