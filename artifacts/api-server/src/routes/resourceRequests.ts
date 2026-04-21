import { Router, type IRouter } from "express";
import { db, resourceRequestsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListResourceRequestsQueryParams,
  CreateResourceRequestBody,
  UpdateResourceRequestBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapRR(r: typeof resourceRequestsTable.$inferSelect) {
  return {
    ...r,
    hoursPerWeek: Number(r.hoursPerWeek),
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

router.get("/resource-requests", async (req, res): Promise<void> => {
  const qp = ListResourceRequestsQueryParams.safeParse(req.query);
  const conditions: any[] = [];
  if (qp.success) {
    if (qp.data.projectId) conditions.push(eq(resourceRequestsTable.projectId, qp.data.projectId));
    if (qp.data.status) conditions.push(eq(resourceRequestsTable.status, qp.data.status));
    if (qp.data.requestedByUserId) conditions.push(eq(resourceRequestsTable.requestedByUserId, qp.data.requestedByUserId));
  }
  const rows = conditions.length
    ? await db.select().from(resourceRequestsTable).where(and(...conditions))
    : await db.select().from(resourceRequestsTable);
  res.json(rows.map(mapRR));
});

router.post("/resource-requests", async (req, res): Promise<void> => {
  const parsed = CreateResourceRequestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(resourceRequestsTable).values({
    ...parsed.data,
    hoursPerWeek: String(parsed.data.hoursPerWeek),
    requiredSkills: parsed.data.requiredSkills ?? [],
    priority: parsed.data.priority ?? "Medium",
  }).returning();
  res.status(201).json(mapRR(row));
});

router.patch("/resource-requests/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const parsed = UpdateResourceRequestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updates: any = { ...parsed.data, updatedAt: new Date() };
  if (updates.hoursPerWeek !== undefined) updates.hoursPerWeek = String(updates.hoursPerWeek);
  const [row] = await db.update(resourceRequestsTable).set(updates).where(eq(resourceRequestsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapRR(row));
});

router.delete("/resource-requests/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(resourceRequestsTable).where(eq(resourceRequestsTable.id, id));
  res.status(204).end();
});

router.patch("/resource-requests/:id/status", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { status, assignedUserId, rejectionReason } = req.body;
  if (!status) { res.status(400).json({ error: "status required" }); return; }
  const updates: any = { status, updatedAt: new Date() };
  if (assignedUserId !== undefined) updates.assignedUserId = assignedUserId;
  if (rejectionReason !== undefined) updates.rejectionReason = rejectionReason;
  if (status === "Fulfilled" && assignedUserId) updates.fulfilledByUserId = assignedUserId;
  const [row] = await db.update(resourceRequestsTable).set(updates).where(eq(resourceRequestsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapRR(row));
});

export default router;
