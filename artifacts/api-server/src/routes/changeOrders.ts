import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, changeOrdersTable } from "@workspace/db";
import { requirePM } from "../middleware/rbac";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

function mapCO(c: typeof changeOrdersTable.$inferSelect) {
  return {
    ...c,
    amount: Number(c.amount),
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt,
  };
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
  const { title, description, amount, status, requestedDate } = req.body;
  if (!title) { res.status(400).json({ error: "title is required" }); return; }
  const [row] = await db.insert(changeOrdersTable).values({
    projectId,
    title,
    description: description ?? null,
    amount: String(amount ?? 0),
    status: status ?? "Pending",
    requestedDate: requestedDate ?? null,
  }).returning();
  await logAudit({ entityType: "change_order", entityId: row.id, action: "created", description: `Change order "${title}" created for project ${projectId}` });
  res.status(201).json(mapCO(row));
});

router.patch("/change-orders/:id", requirePM, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [existing] = await db.select().from(changeOrdersTable).where(eq(changeOrdersTable.id, id));
  if (!existing) { res.status(404).json({ error: "Change order not found" }); return; }
  const updates: Partial<typeof changeOrdersTable.$inferInsert> = {};
  const { title, description, amount, status, requestedDate, approvedDate } = req.body;
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (amount !== undefined) updates.amount = String(amount);
  if (status !== undefined) updates.status = status;
  if (requestedDate !== undefined) updates.requestedDate = requestedDate;
  if (approvedDate !== undefined) updates.approvedDate = approvedDate;
  const [row] = await db.update(changeOrdersTable).set(updates).where(eq(changeOrdersTable.id, id)).returning();
  await logAudit({ entityType: "change_order", entityId: id, action: "updated", previousValue: { status: existing.status }, newValue: { status: row.status } });
  res.json(mapCO(row));
});

router.delete("/change-orders/:id", requirePM, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(changeOrdersTable).where(eq(changeOrdersTable.id, id));
  res.sendStatus(204);
});

export default router;
