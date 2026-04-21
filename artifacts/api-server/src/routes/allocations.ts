import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, allocationsTable, usersTable } from "@workspace/db";
import {
  ListAllocationsResponse,
  ListAllocationsQueryParams,
  CreateAllocationBody,
  UpdateAllocationParams,
  UpdateAllocationBody,
  UpdateAllocationResponse,
  DeleteAllocationParams,
  GetCapacityOverviewResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapAllocation(a: typeof allocationsTable.$inferSelect) {
  return {
    ...a,
    hoursPerWeek: Number(a.hoursPerWeek),
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
    updatedAt: a.updatedAt instanceof Date ? a.updatedAt.toISOString() : a.updatedAt,
  };
}

router.get("/allocations", async (req, res): Promise<void> => {
  const qp = ListAllocationsQueryParams.safeParse(req.query);
  const conditions = [];
  if (qp.success && qp.data.projectId) conditions.push(eq(allocationsTable.projectId, qp.data.projectId));
  if (qp.success && qp.data.userId) conditions.push(eq(allocationsTable.userId, qp.data.userId));
  const rows = conditions.length
    ? await db.select().from(allocationsTable).where(and(...conditions))
    : await db.select().from(allocationsTable);
  res.json(ListAllocationsResponse.parse(rows.map(mapAllocation)));
});

router.post("/allocations", async (req, res): Promise<void> => {
  const parsed = CreateAllocationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(allocationsTable).values(parsed.data as any).returning();
  res.status(201).json(mapAllocation(row));
});

router.patch("/allocations/:id", async (req, res): Promise<void> => {
  const params = UpdateAllocationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateAllocationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(allocationsTable).set(parsed.data as any).where(eq(allocationsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Allocation not found" }); return; }
  res.json(UpdateAllocationResponse.parse(mapAllocation(row)));
});

router.delete("/allocations/:id", async (req, res): Promise<void> => {
  const params = DeleteAllocationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(allocationsTable).where(eq(allocationsTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/resources/capacity", async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable);
  const allocations = await db.select().from(allocationsTable);
  const now = new Date().toISOString().slice(0, 10);

  const capacity = users.map(u => {
    const active = allocations.filter(a => a.userId === u.id && a.endDate >= now);
    const allocated = active.reduce((s, a) => s + Number(a.hoursPerWeek), 0);
    const cap = u.capacity;
    const available = Math.max(0, cap - allocated);
    const utilizationPercent = cap > 0 ? Math.min(100, Math.round((allocated / cap) * 100)) : 0;
    return {
      userId: u.id,
      userName: u.name,
      userInitials: u.initials,
      capacity: cap,
      allocated,
      available,
      utilizationPercent,
      department: u.department,
      role: u.role,
    };
  });

  res.json(GetCapacityOverviewResponse.parse(capacity));
});

export default router;
