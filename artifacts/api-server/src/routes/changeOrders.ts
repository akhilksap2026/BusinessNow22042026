import { Router, type IRouter } from "express";
import { eq, count } from "drizzle-orm";
import { db, changeOrdersTable, projectsTable, resourceRequestsTable, tasksTable } from "@workspace/db";
import { requirePM } from "../middleware/rbac";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

const CR_STATUSES = ["Draft", "Submitted", "Approved", "Rejected"] as const;

function mapCO(c: typeof changeOrdersTable.$inferSelect) {
  return {
    ...c,
    amount: Number(c.amount),
    additionalHours: Number(c.additionalHours ?? 0),
    linkedTaskTitles: (c.linkedTaskTitles as string[] | null) ?? [],
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt,
  };
}

async function generateCRNumber(projectId: number): Promise<string> {
  const [result] = await db
    .select({ cnt: count() })
    .from(changeOrdersTable)
    .where(eq(changeOrdersTable.projectId, projectId));
  const next = (Number(result?.cnt ?? 0) + 1).toString().padStart(3, "0");
  return `CR-${next}`;
}

router.get("/projects/:id/change-orders", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.id, 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }
  const rows = await db.select().from(changeOrdersTable).where(eq(changeOrdersTable.projectId, projectId));
  res.json(rows.map(mapCO));
});

router.post("/projects/:id/change-orders", requirePM, async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.id, 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }
  const {
    title, description, amount, additionalHours, status,
    requestedDate, submittedDate, submittedByUserId,
    newResourceRole, linkedTaskTitles,
  } = req.body;
  if (!title) { res.status(400).json({ error: "title is required" }); return; }

  const crNumber = await generateCRNumber(projectId);

  const [row] = await db.insert(changeOrdersTable).values({
    projectId,
    crNumber,
    title,
    description: description ?? null,
    amount: String(amount ?? 0),
    additionalHours: String(additionalHours ?? 0),
    status: CR_STATUSES.includes(status) ? status : "Draft",
    requestedDate: requestedDate ?? null,
    submittedDate: submittedDate ?? null,
    submittedByUserId: submittedByUserId ? Number(submittedByUserId) : null,
    newResourceRole: newResourceRole ?? null,
    linkedTaskTitles: Array.isArray(linkedTaskTitles) ? linkedTaskTitles : [],
  }).returning();

  await logAudit({
    entityType: "change_order",
    entityId: row.id,
    action: "created",
    description: `Change request "${title}" (${crNumber}) created for project ${projectId}`,
  });
  res.status(201).json(mapCO(row));
});

router.patch("/change-orders/:id", requirePM, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [existing] = await db.select().from(changeOrdersTable).where(eq(changeOrdersTable.id, id));
  if (!existing) { res.status(404).json({ error: "Change request not found" }); return; }

  const updates: Partial<typeof changeOrdersTable.$inferInsert> = {};
  const {
    title, description, amount, additionalHours, status,
    requestedDate, submittedDate, decisionDate, approvedDate,
    submittedByUserId, approvedByUserId,
    newResourceRole, linkedTaskTitles,
  } = req.body;

  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (amount !== undefined) updates.amount = String(amount);
  if (additionalHours !== undefined) updates.additionalHours = String(additionalHours);
  if (status !== undefined && CR_STATUSES.includes(status)) updates.status = status;
  if (requestedDate !== undefined) updates.requestedDate = requestedDate;
  if (submittedDate !== undefined) updates.submittedDate = submittedDate;
  if (decisionDate !== undefined) updates.decisionDate = decisionDate;
  if (approvedDate !== undefined) updates.approvedDate = approvedDate;
  if (submittedByUserId !== undefined) updates.submittedByUserId = submittedByUserId ? Number(submittedByUserId) : null;
  if (approvedByUserId !== undefined) updates.approvedByUserId = approvedByUserId ? Number(approvedByUserId) : null;
  if (newResourceRole !== undefined) updates.newResourceRole = newResourceRole;
  if (linkedTaskTitles !== undefined) updates.linkedTaskTitles = Array.isArray(linkedTaskTitles) ? linkedTaskTitles : [];

  updates.updatedAt = new Date();

  const [row] = await db
    .update(changeOrdersTable)
    .set(updates)
    .where(eq(changeOrdersTable.id, id))
    .returning();

  // ── Approval side-effects ────────────────────────────────────────────────
  if (status === "Approved" && existing.status !== "Approved") {
    // 1. Update project budget and budgeted hours
    const [proj] = await db.select().from(projectsTable).where(eq(projectsTable.id, existing.projectId));
    if (proj) {
      const newBudget = Number(proj.budget) + Number(row.amount);
      const newHours = Number(proj.budgetedHours) + Number(row.additionalHours ?? 0);
      await db.update(projectsTable).set({
        budget: String(newBudget),
        budgetedHours: String(newHours),
        updatedAt: new Date(),
      }).where(eq(projectsTable.id, proj.id));
    }

    // 2. Create tasks listed in linkedTaskTitles
    const taskTitles = (row.linkedTaskTitles as string[] | null) ?? [];
    for (const taskTitle of taskTitles) {
      if (taskTitle.trim()) {
        await db.insert(tasksTable).values({
          projectId: existing.projectId,
          name: taskTitle.trim(),
          status: "Not Started",
          priority: "Medium",
        } as any);
      }
    }

    // 3. Create resource request if a role was specified
    if (row.newResourceRole) {
      const today = new Date().toISOString().slice(0, 10);
      const in90 = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
      await db.insert(resourceRequestsTable).values({
        projectId: existing.projectId,
        requestedByUserId: row.approvedByUserId ?? row.submittedByUserId ?? 1,
        role: row.newResourceRole,
        startDate: today,
        endDate: in90,
        hoursPerWeek: 40,
        priority: "Medium",
        notes: `Auto-created from Change Request ${row.crNumber ?? ""}`,
        status: "Open",
      } as any);
    }

    await logAudit({
      entityType: "change_order",
      entityId: id,
      action: "approved",
      previousValue: { status: existing.status },
      newValue: { status: "Approved" },
      description: `Change request ${row.crNumber ?? id} approved — budget updated by $${Number(row.amount).toFixed(2)}`,
    });
  }

  if (status && status !== existing.status) {
    await logAudit({
      entityType: "change_order",
      entityId: id,
      action: "status_changed",
      previousValue: { status: existing.status },
      newValue: { status: row.status },
    });
  }

  res.json(mapCO(row));
});

router.delete("/change-orders/:id", requirePM, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(changeOrdersTable).where(eq(changeOrdersTable.id, id));
  res.sendStatus(204);
});

export default router;
