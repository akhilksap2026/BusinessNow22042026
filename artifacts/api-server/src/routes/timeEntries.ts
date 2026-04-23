import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, timeEntriesTable, projectsTable, usersTable } from "@workspace/db";
import { requirePM } from "../middleware/rbac";
import { getGovernanceSettings, checkEntryEditable, checkEntryStatusChangeable, checkInvoicedMove, checkTimesheetEditable, getTimesheetForEntry } from "../lib/governance";
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
  const role = String(req.headers["x-user-role"] ?? "");
  const [existing] = await db.select().from(timeEntriesTable).where(eq(timeEntriesTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Time entry not found" }); return; }
  const settings = await getGovernanceSettings();
  // Date-based lock: edit details
  const dateErr = checkEntryEditable(existing, role, settings);
  if (dateErr) { res.status(dateErr.status).json({ error: dateErr.error }); return; }
  // Lock-on-Approval: parent timesheet
  const ts = await getTimesheetForEntry(existing);
  if (ts) {
    const tsErr = checkTimesheetEditable(ts, role, settings);
    if (tsErr) { res.status(tsErr.status).json({ error: tsErr.error }); return; }
  }
  // Invoice protection: block project move if entry is invoiced
  const invErr = await checkInvoicedMove(existing, (parsed.data as any).projectId);
  if (invErr) { res.status(invErr.status).json({ error: invErr.error }); return; }
  const teUpdates: any = { ...parsed.data };
  if (teUpdates.hours !== undefined) teUpdates.hours = String(teUpdates.hours);
  // Pass-through fields not in generated UpdateTimeEntryBody Zod schema
  const body = req.body ?? {};
  if (body.categoryId !== undefined) teUpdates.categoryId = body.categoryId === null ? null : Number(body.categoryId);
  if (body.taskId !== undefined) teUpdates.taskId = body.taskId === null ? null : Number(body.taskId);
  if (typeof body.role === "string") teUpdates.role = body.role.trim() || null;
  if (typeof body.rejected === "boolean") teUpdates.rejected = body.rejected;
  if (typeof body.rejectionNote === "string") teUpdates.rejectionNote = body.rejectionNote.trim() || null;
  // Status changes (approved / rejected) require status-change permission
  if (body.approved !== undefined || body.rejected !== undefined) {
    const statusErr = checkEntryStatusChangeable(existing, role, settings);
    if (statusErr) { res.status(statusErr.status).json({ error: statusErr.error }); return; }
    if (teUpdates.approved === true) teUpdates.rejected = false;
    if (teUpdates.rejected === true) teUpdates.approved = false;
  }
  teUpdates.updatedAt = new Date();
  const [row] = await db.update(timeEntriesTable).set(teUpdates).where(eq(timeEntriesTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Time entry not found" }); return; }
  res.json(UpdateTimeEntryResponse.parse(mapEntry(row)));
});

// Per-entry reject (used by Approvals → detail review with selected entries)
router.post("/time-entries/:id/reject", requirePM, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const reason = String(req.body?.rejectionNote ?? req.body?.reason ?? "").trim();
  const [existing] = await db.select().from(timeEntriesTable).where(eq(timeEntriesTable.id, id));
  if (!existing) { res.status(404).json({ error: "Time entry not found" }); return; }
  const role = String(req.headers["x-user-role"] ?? "");
  const settings = await getGovernanceSettings();
  const statusErr = checkEntryStatusChangeable(existing, role, settings);
  if (statusErr) { res.status(statusErr.status).json({ error: statusErr.error }); return; }
  const [row] = await db.update(timeEntriesTable)
    .set({ rejected: true, approved: false, rejectionNote: reason || null })
    .where(eq(timeEntriesTable.id, id))
    .returning();
  // Notify submitter
  try {
    await db.insert((await import("@workspace/db")).notificationsTable).values({
      type: "timesheet_entry_rejected",
      message: `A time entry on ${existing.date} was rejected${reason ? `: ${reason}` : ""}.`,
      userId: existing.userId,
      entityType: "time_entry",
      entityId: String(existing.id),
      read: false,
    } as any);
  } catch {}
  res.json(mapEntry(row));
});

// Bulk per-entry reject: { ids: number[], reason: string }
router.post("/time-entries/bulk-reject", requirePM, async (req, res): Promise<void> => {
  const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map((x: any) => Number(x)).filter(Boolean) : [];
  const reason = String(req.body?.rejectionNote ?? req.body?.reason ?? "").trim();
  if (ids.length === 0) { res.status(400).json({ error: "ids array required" }); return; }
  const { inArray } = await import("drizzle-orm");
  const existing = await db.select().from(timeEntriesTable).where(inArray(timeEntriesTable.id, ids));
  const role = String(req.headers["x-user-role"] ?? "");
  const settings = await getGovernanceSettings();
  for (const e of existing) {
    const err = checkEntryStatusChangeable(e, role, settings);
    if (err) { res.status(err.status).json({ error: err.error, blockedEntryId: e.id }); return; }
  }
  await db.update(timeEntriesTable)
    .set({ rejected: true, approved: false, rejectionNote: reason || null })
    .where(inArray(timeEntriesTable.id, ids));
  const { notificationsTable } = await import("@workspace/db");
  const userToEntries = new Map<number, number[]>();
  for (const e of existing) {
    if (!userToEntries.has(e.userId)) userToEntries.set(e.userId, []);
    userToEntries.get(e.userId)!.push(e.id);
  }
  for (const [uid, entryIds] of userToEntries) {
    try {
      await db.insert(notificationsTable).values({
        type: "timesheet_entry_rejected",
        message: `${entryIds.length} time entry(ies) were rejected${reason ? `: ${reason}` : ""}.`,
        userId: uid,
        entityType: "time_entry",
        read: false,
      } as any);
    } catch {}
  }
  res.json({ rejected: ids.length });
});

// Bulk approve: { ids: number[] }
router.post("/time-entries/bulk-approve", requirePM, async (req, res): Promise<void> => {
  const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map((x: any) => Number(x)).filter(Boolean) : [];
  if (ids.length === 0) { res.status(400).json({ error: "ids array required" }); return; }
  const { inArray } = await import("drizzle-orm");
  const existing = await db.select().from(timeEntriesTable).where(inArray(timeEntriesTable.id, ids));
  const role = String(req.headers["x-user-role"] ?? "");
  const settings = await getGovernanceSettings();
  for (const e of existing) {
    const err = checkEntryStatusChangeable(e, role, settings);
    if (err) { res.status(err.status).json({ error: err.error, blockedEntryId: e.id }); return; }
  }
  await db.update(timeEntriesTable)
    .set({ approved: true, rejected: false, rejectionNote: null, updatedAt: new Date() })
    .where(inArray(timeEntriesTable.id, ids));
  res.json({ approved: ids.length });
});

// Bulk delete: { ids: number[] }
router.post("/time-entries/bulk-delete", requirePM, async (req, res): Promise<void> => {
  const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map((x: any) => Number(x)).filter(Boolean) : [];
  if (ids.length === 0) { res.status(400).json({ error: "ids array required" }); return; }
  const { inArray } = await import("drizzle-orm");
  const existing = await db.select().from(timeEntriesTable).where(inArray(timeEntriesTable.id, ids));
  const role = String(req.headers["x-user-role"] ?? "");
  const settings = await getGovernanceSettings();
  const { getInvoicedLink } = await import("../lib/governance");
  for (const e of existing) {
    const dateErr = checkEntryEditable(e, role, settings);
    if (dateErr) { res.status(dateErr.status).json({ error: dateErr.error, blockedEntryId: e.id }); return; }
    const ts = await getTimesheetForEntry(e);
    if (ts) {
      const tsErr = checkTimesheetEditable(ts, role, settings);
      if (tsErr) { res.status(tsErr.status).json({ error: tsErr.error, blockedEntryId: e.id }); return; }
    }
    const link = await getInvoicedLink(e.id);
    if (link) { res.status(409).json({ error: `Cannot delete entry ${e.id}: it is on invoice ${link.invoiceId} (${link.invoiceStatus}).`, blockedEntryId: e.id }); return; }
  }
  await db.delete(timeEntriesTable).where(inArray(timeEntriesTable.id, ids));
  res.json({ deleted: ids.length });
});

router.delete("/time-entries/:id", requirePM, async (req, res): Promise<void> => {
  const params = DeleteTimeEntryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [existing] = await db.select().from(timeEntriesTable).where(eq(timeEntriesTable.id, params.data.id));
  if (!existing) { res.sendStatus(204); return; }
  const role = String(req.headers["x-user-role"] ?? "");
  const settings = await getGovernanceSettings();
  const dateErr = checkEntryEditable(existing, role, settings);
  if (dateErr) { res.status(dateErr.status).json({ error: dateErr.error }); return; }
  const ts = await getTimesheetForEntry(existing);
  if (ts) {
    const tsErr = checkTimesheetEditable(ts, role, settings);
    if (tsErr) { res.status(tsErr.status).json({ error: tsErr.error }); return; }
  }
  // Invoiced entries cannot be deleted
  const { getInvoicedLink } = await import("../lib/governance");
  const link = await getInvoicedLink(existing.id);
  if (link) { res.status(409).json({ error: `Cannot delete: this entry is on invoice ${link.invoiceId} (${link.invoiceStatus}). Void or delete the invoice first.` }); return; }
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
