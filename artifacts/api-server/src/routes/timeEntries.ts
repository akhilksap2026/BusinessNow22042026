import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, timeEntriesTable, projectsTable, usersTable } from "@workspace/db";
import { requirePM } from "../middleware/rbac";
import {
  ListTimeEntriesResponse,
  ListTimeEntriesQueryParams,
  CreateTimeEntryBody,
  UpdateTimeEntryParams,
  UpdateTimeEntryBody,
  UpdateTimeEntryResponse,
  DeleteTimeEntryParams,
  GetTimeEntrySummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapEntry(e: typeof timeEntriesTable.$inferSelect) {
  return {
    ...e,
    hours: Number(e.hours),
    projectId: e.projectId ?? undefined,
    taskId: e.taskId ?? undefined,
    activityName: (e as any).activityName ?? undefined,
    createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
    updatedAt: e.updatedAt instanceof Date ? e.updatedAt.toISOString() : e.updatedAt,
  };
}

router.get("/time-entries", async (req, res): Promise<void> => {
  const qp = ListTimeEntriesQueryParams.safeParse(req.query);
  const conditions = [];
  if (qp.success && qp.data.projectId) conditions.push(eq(timeEntriesTable.projectId, qp.data.projectId));
  if (qp.success && qp.data.userId) conditions.push(eq(timeEntriesTable.userId, qp.data.userId));
  if (qp.success && qp.data.startDate) conditions.push(gte(timeEntriesTable.date, qp.data.startDate));
  if (qp.success && qp.data.endDate) conditions.push(lte(timeEntriesTable.date, qp.data.endDate));
  const rows = conditions.length
    ? await db.select().from(timeEntriesTable).where(and(...conditions))
    : await db.select().from(timeEntriesTable);
  res.json(ListTimeEntriesResponse.parse(rows.map(mapEntry)));
});

router.post("/time-entries", requirePM, async (req, res): Promise<void> => {
  const parsed = CreateTimeEntryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data: any = { ...parsed.data, hours: String(parsed.data.hours) };
  // Enforce: non-project activities must be non-billable
  if (!data.projectId) { data.projectId = null; data.billable = false; }
  const [row] = await db.insert(timeEntriesTable).values(data).returning();
  res.status(201).json(mapEntry(row));
});

router.patch("/time-entries/:id", requirePM, async (req, res): Promise<void> => {
  const params = UpdateTimeEntryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateTimeEntryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const teUpdates: any = { ...parsed.data };
  if (teUpdates.hours !== undefined) teUpdates.hours = String(teUpdates.hours);
  const [row] = await db.update(timeEntriesTable).set(teUpdates).where(eq(timeEntriesTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Time entry not found" }); return; }
  res.json(UpdateTimeEntryResponse.parse(mapEntry(row)));
});

router.delete("/time-entries/:id", requirePM, async (req, res): Promise<void> => {
  const params = DeleteTimeEntryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(timeEntriesTable).where(eq(timeEntriesTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/time-entries/summary", async (_req, res): Promise<void> => {
  const now = new Date();
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
  const monthAgo = new Date(now); monthAgo.setDate(now.getDate() - 30);
  const weekStr = weekAgo.toISOString().slice(0, 10);
  const monthStr = monthAgo.toISOString().slice(0, 10);

  const allEntries = await db.select().from(timeEntriesTable);
  const projects = await db.select().from(projectsTable);
  const users = await db.select().from(usersTable);

  const totalHoursThisWeek = allEntries.filter(e => e.date >= weekStr).reduce((s, e) => s + Number(e.hours), 0);
  const totalHoursThisMonth = allEntries.filter(e => e.date >= monthStr).reduce((s, e) => s + Number(e.hours), 0);
  const billableHours = allEntries.filter(e => e.billable && e.date >= monthStr).reduce((s, e) => s + Number(e.hours), 0);
  const billablePercent = totalHoursThisMonth > 0 ? Math.round((billableHours / totalHoursThisMonth) * 100) : 0;

  const byProjectMap = new Map<number, number>();
  allEntries.filter(e => e.projectId != null).forEach(e => {
    byProjectMap.set(e.projectId!, (byProjectMap.get(e.projectId!) || 0) + Number(e.hours));
  });

  const byProject = Array.from(byProjectMap.entries()).map(([projectId, hours]) => ({
    projectId,
    projectName: projects.find(p => p.id === projectId)?.name ?? 'Unknown',
    hours,
  }));

  const byUserMap = new Map<number, number>();
  allEntries.forEach(e => byUserMap.set(e.userId, (byUserMap.get(e.userId) || 0) + Number(e.hours)));

  const byUser = Array.from(byUserMap.entries()).map(([userId, hours]) => ({
    userId,
    userName: users.find(u => u.id === userId)?.name ?? 'Unknown',
    hours,
  }));

  res.json(GetTimeEntrySummaryResponse.parse({ totalHoursThisWeek, totalHoursThisMonth, billablePercent, byProject, byUser }));
});

export default router;
