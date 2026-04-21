import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { requirePM } from "../middleware/rbac";
import { db, allocationsTable, usersTable, holidayDatesTable } from "@workspace/db";
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

router.post("/allocations", requirePM, async (req, res): Promise<void> => {
  const parsed = CreateAllocationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const isSoftAllocation = req.body.isSoftAllocation === true || req.body.isSoftAllocation === "true";
  const [row] = await db.insert(allocationsTable).values({ ...parsed.data as any, isSoftAllocation }).returning();
  res.status(201).json(mapAllocation(row));
});

router.patch("/allocations/:id", requirePM, async (req, res): Promise<void> => {
  const params = UpdateAllocationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateAllocationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updateData: any = { ...parsed.data };
  if (req.body.isSoftAllocation !== undefined) updateData.isSoftAllocation = req.body.isSoftAllocation === true || req.body.isSoftAllocation === "true";
  const [row] = await db.update(allocationsTable).set(updateData).where(eq(allocationsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Allocation not found" }); return; }
  res.json(UpdateAllocationResponse.parse(mapAllocation(row)));
});

router.delete("/allocations/:id", requirePM, async (req, res): Promise<void> => {
  const params = DeleteAllocationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(allocationsTable).where(eq(allocationsTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/resources/capacity", async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable);
  const allocations = await db.select().from(allocationsTable);
  const now = new Date();
  const nowStr = now.toISOString().slice(0, 10);

  // Calculate current week bounds (Mon–Sun)
  const dayOfWeek = now.getDay(); // 0 = Sun
  const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMon);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  // Count holidays this week (affects all users equally for MVP)
  const holidays = await db.select().from(holidayDatesTable).where(
    and(gte(holidayDatesTable.date, weekStartStr), lte(holidayDatesTable.date, weekEndStr))
  );
  const uniqueHolidayDays = new Set(holidays.map(h => h.date)).size;
  const holidayHoursThisWeek = uniqueHolidayDays * 8;

  const capacity = users.map(u => {
    const active = allocations.filter(a => a.userId === u.id && a.endDate >= nowStr);
    const allocated = active.reduce((s, a) => s + Number(a.hoursPerWeek), 0);
    const cap = Math.max(0, u.capacity - holidayHoursThisWeek);
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
