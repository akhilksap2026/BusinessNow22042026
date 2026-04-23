import { Router, type IRouter } from "express";
import { eq, and, isNull, isNotNull, inArray } from "drizzle-orm";
import { db, projectsTable, invoicesTable, allocationsTable, accountsTable, tasksTable, phasesTable, taskDependenciesTable } from "@workspace/db";
import { logAudit } from "../lib/audit";
import { requireAdmin, requirePM } from "../middleware/rbac";
import {
  ListProjectsResponse,
  ListProjectsQueryParams,
  CreateProjectBody,
  GetProjectParams,
  GetProjectResponse,
  UpdateProjectParams,
  UpdateProjectBody,
  UpdateProjectResponse,
  DeleteProjectParams,
  GetProjectSummaryParams,
  GetProjectSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapProject(p: typeof projectsTable.$inferSelect) {
  return {
    ...p,
    budget: Number(p.budget),
    trackedHours: Number(p.trackedHours),
    allocatedHours: Number(p.allocatedHours),
    budgetedHours: Number(p.budgetedHours),
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
  };
}

router.get("/projects", async (req, res): Promise<void> => {
  const qp = ListProjectsQueryParams.safeParse(req.query);
  const conditions: ReturnType<typeof eq>[] = [isNull(projectsTable.deletedAt)];
  if (qp.success && qp.data.status) conditions.push(eq(projectsTable.status, qp.data.status));
  if (qp.success && qp.data.accountId) conditions.push(eq(projectsTable.accountId, qp.data.accountId));
  const rows = await db
    .select({ project: projectsTable, accountName: accountsTable.name, accountDomain: accountsTable.domain })
    .from(projectsTable)
    .leftJoin(accountsTable, eq(projectsTable.accountId, accountsTable.id))
    .where(and(...conditions));
  res.json(ListProjectsResponse.parse(rows.map(({ project, accountName, accountDomain }) => ({
    ...mapProject(project),
    companyName: accountName ?? undefined,
    companyDomain: accountDomain ?? undefined,
  }))));
});

router.post("/projects", requirePM, async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(projectsTable).values(parsed.data as any).returning();
  await logAudit({ entityType: "project", entityId: row.id, action: "created", description: `Project "${row.name}" created` });
  res.status(201).json(GetProjectResponse.parse(mapProject(row)));
});

router.get("/projects/deleted", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(projectsTable).where(isNotNull(projectsTable.deletedAt));
  res.json(rows.map(mapProject));
});

router.get("/projects/:id", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Project not found" }); return; }
  res.json(GetProjectResponse.parse(mapProject(row)));
});

router.patch("/projects/:id", requirePM, async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(projectsTable).set(parsed.data as any).where(eq(projectsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Project not found" }); return; }
  await logAudit({ entityType: "project", entityId: row.id, action: "updated", description: `Project "${row.name}" updated` });
  res.json(UpdateProjectResponse.parse(mapProject(row)));
});

router.delete("/projects/:id", requirePM, async (req, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.update(projectsTable).set({ deletedAt: new Date() } as any).where(eq(projectsTable.id, params.data.id));
  res.sendStatus(204);
});

router.post("/projects/:id/restore", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.update(projectsTable).set({ deletedAt: null } as any).where(eq(projectsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Project not found" }); return; }
  res.json(mapProject(row));
});

router.get("/projects/:id/summary", async (req, res): Promise<void> => {
  const params = GetProjectSummaryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.id));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const projectInvoices = await db.select().from(invoicesTable).where(eq(invoicesTable.projectId, params.data.id));
  const allocations = await db.select().from(allocationsTable).where(eq(allocationsTable.projectId, params.data.id));

  const budget = Number(project.budget);
  const budgetedHours = Number(project.budgetedHours);
  const trackedHours = Number(project.trackedHours);
  const invoicedAmount = projectInvoices.filter(i => i.status === 'Paid' || i.status === 'Approved').reduce((s, i) => s + Number(i.total), 0);
  const pendingAmount = projectInvoices.filter(i => i.status === 'In Review' || i.status === 'Draft').reduce((s, i) => s + Number(i.total), 0);
  const due = new Date(project.dueDate);
  const daysRemaining = Math.max(0, Math.ceil((due.getTime() - Date.now()) / 86400000));
  const teamSize = new Set(allocations.map(a => a.userId)).size;

  res.json(GetProjectSummaryResponse.parse({
    projectId: params.data.id,
    budgetUsedPercent: budget > 0 ? Math.min(100, Math.round((invoicedAmount / budget) * 100)) : 0,
    hoursUsedPercent: budgetedHours > 0 ? Math.min(100, Math.round((trackedHours / budgetedHours) * 100)) : 0,
    daysRemaining,
    invoicedAmount,
    pendingAmount,
    teamSize,
  }));
});

// ─── Shift Dates ──────────────────────────────────────────────────────────────
router.post("/projects/:id/shift-dates", requirePM, async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.id, 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }

  const { days, fromTaskId } = req.body;
  const shiftDays = parseInt(days, 10);
  if (isNaN(shiftDays) || shiftDays === 0) {
    res.status(400).json({ error: "days must be a non-zero integer" }); return;
  }

  const shiftMs = shiftDays * 86400000;

  function shiftDate(d: string | null | undefined): string | null {
    if (!d) return null;
    return new Date(new Date(d).getTime() + shiftMs).toISOString().slice(0, 10);
  }

  // Get all tasks for the project
  const allTasks = await db.select().from(tasksTable).where(eq(tasksTable.projectId, projectId));

  // If fromTaskId given, only shift that task and its downstream dependents
  let taskIdsToShift: Set<number>;
  if (fromTaskId) {
    const startId = parseInt(fromTaskId, 10);
    // BFS downstream
    taskIdsToShift = new Set<number>([startId]);
    const allDeps = await db.select().from(taskDependenciesTable)
      .where(inArray(taskDependenciesTable.predecessorId, allTasks.map(t => t.id)));
    const queue = [startId];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const downstream = allDeps.filter(d => d.predecessorId === cur);
      for (const d of downstream) {
        if (!taskIdsToShift.has(d.successorId)) {
          taskIdsToShift.add(d.successorId);
          queue.push(d.successorId);
        }
      }
    }
  } else {
    taskIdsToShift = new Set(allTasks.map(t => t.id));
  }

  // Shift tasks
  for (const task of allTasks) {
    if (!taskIdsToShift.has(task.id)) continue;
    await db.update(tasksTable).set({
      startDate: shiftDate(task.startDate),
      dueDate: shiftDate(task.dueDate),
    }).where(eq(tasksTable.id, task.id));
  }

  // Shift phases: recalc from tasks after update
  const updatedTasks = await db.select().from(tasksTable).where(eq(tasksTable.projectId, projectId));
  const phases = await db.select().from(phasesTable).where(eq(phasesTable.projectId, projectId));
  for (const phase of phases) {
    const phaseTasks = updatedTasks.filter(t => t.phaseId === phase.id);
    const starts = phaseTasks.map(t => t.startDate).filter(Boolean).sort() as string[];
    const dues = phaseTasks.map(t => t.dueDate).filter(Boolean).sort() as string[];
    if (starts.length > 0 || dues.length > 0) {
      await db.update(phasesTable).set({
        startDate: starts[0] ?? phase.startDate,
        endDate: dues[dues.length - 1] ?? phase.endDate,
      }).where(eq(phasesTable.id, phase.id));
    }
  }

  // Optionally shift project dates too
  if (!fromTaskId) {
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
    if (project) {
      await db.update(projectsTable).set({
        startDate: shiftDate(project.startDate),
        dueDate: shiftDate(project.dueDate),
      }).where(eq(projectsTable.id, projectId));
    }
  }

  await logAudit({ action: "shift_dates", entityType: "project", entityId: projectId, description: `Shifted dates by ${shiftDays} days` });
  res.json({ shifted: taskIdsToShift.size, days: shiftDays });
});

export default router;

