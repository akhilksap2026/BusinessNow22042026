import { Router, type IRouter } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, timesheetsTable, notificationsTable, timesheetRowsTable, timeSettingsTable, timesheetMessagesTable, notificationPreferencesTable, usersTable, allocationsTable } from "@workspace/db";
import { getGovernanceSettings, checkTimesheetStatusChangeable, checkTimesheetEditable } from "../lib/governance";
import { requirePM } from "../middleware/rbac";
import type { AuthenticatedRequest } from "../middleware/roleClaim";
import {
  ListTimesheetsQueryParams,
  ListTimesheetsResponse,
  CreateTimesheetBody,
  GetTimesheetParams,
  GetTimesheetResponse,
  UpdateTimesheetParams,
  UpdateTimesheetBody,
  UpdateTimesheetResponse,
  SubmitTimesheetParams,
  SubmitTimesheetResponse,
  ApproveTimesheetParams,
  ApproveTimesheetBody,
  ApproveTimesheetResponse,
  RejectTimesheetParams,
  RejectTimesheetBody,
  RejectTimesheetResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapTimesheet(t: typeof timesheetsTable.$inferSelect) {
  return {
    ...t,
    totalHours: Number(t.totalHours),
    billableHours: Number(t.billableHours),
    submittedAt: t.submittedAt instanceof Date ? t.submittedAt.toISOString() : t.submittedAt,
    approvedAt: t.approvedAt instanceof Date ? t.approvedAt.toISOString() : t.approvedAt,
    rejectedAt: (t as any).rejectedAt instanceof Date ? (t as any).rejectedAt.toISOString() : (t as any).rejectedAt ?? null,
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt,
  };
}

// Resolve who should approve a given user's timesheet, based on global routing mode.
// Returns array of approver user IDs.
async function resolveApprovers(submitterUserId: number): Promise<number[]> {
  const settingsRows = await db.select().from(timeSettingsTable).limit(1);
  const mode = settingsRows[0]?.approverRoutingMode ?? "admin_default";
  if (mode === "designated") {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, submitterUserId));
    if (u && (u as any).timesheetApproverUserId) return [(u as any).timesheetApproverUserId];
  }
  // Fallback: all admins
  const admins = await db.select().from(usersTable).where(eq(usersTable.role, "Admin"));
  if (admins.length > 0) return admins.map(a => a.id);
  // Last resort: all Project Managers
  const pms = await db.select().from(usersTable).where(eq(usersTable.role, "Project Manager"));
  return pms.map(p => p.id);
}

async function notifyUsers(userIds: number[], type: string, message: string, entityId: number) {
  for (const uid of userIds) {
    // Check user's notification preferences (defaults to enabled if no row)
    const prefs = await db.select().from(notificationPreferencesTable)
      .where(and(eq(notificationPreferencesTable.userId, uid), eq(notificationPreferencesTable.type, type)));
    const inAppEnabled = prefs.length === 0 ? true : prefs[0].inAppEnabled;
    if (!inAppEnabled) continue;
    await db.insert(notificationsTable).values({
      type, message, userId: uid, entityType: "timesheet", entityId: String(entityId), read: false,
    } as any).catch(() => {});
  }
}

router.get("/timesheets", async (req, res): Promise<void> => {
  const qp = ListTimesheetsQueryParams.safeParse(req.query);
  const conditions: ReturnType<typeof eq>[] = [];
  if (qp.success && qp.data.userId) conditions.push(eq(timesheetsTable.userId, qp.data.userId));
  if (qp.success && qp.data.status) conditions.push(eq(timesheetsTable.status, qp.data.status));
  if (qp.success && qp.data.weekStart) conditions.push(eq(timesheetsTable.weekStart, qp.data.weekStart));
  const rows = conditions.length
    ? await db.select().from(timesheetsTable).where(and(...conditions))
    : await db.select().from(timesheetsTable);
  res.json(ListTimesheetsResponse.parse(rows.map(mapTimesheet)));
});

router.post("/timesheets", async (req, res): Promise<void> => {
  const parsed = CreateTimesheetBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const existing = await db.select().from(timesheetsTable)
    .where(and(eq(timesheetsTable.userId, parsed.data.userId), eq(timesheetsTable.weekStart, parsed.data.weekStart)));
  if (existing.length > 0) {
    res.status(201).json(GetTimesheetResponse.parse(mapTimesheet(existing[0])));
    return;
  }
  const [row] = await db.insert(timesheetsTable).values(parsed.data).returning();
  res.status(201).json(GetTimesheetResponse.parse(mapTimesheet(row)));
});

router.get("/timesheets/:id", async (req, res): Promise<void> => {
  const params = GetTimesheetParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.select().from(timesheetsTable).where(eq(timesheetsTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Timesheet not found" }); return; }
  res.json(GetTimesheetResponse.parse(mapTimesheet(row)));
});

router.patch("/timesheets/:id", async (req, res): Promise<void> => {
  const params = UpdateTimesheetParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateTimesheetBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const tsUpdates: any = { ...parsed.data };
  if (tsUpdates.totalHours !== undefined) tsUpdates.totalHours = String(tsUpdates.totalHours);
  if (tsUpdates.billableHours !== undefined) tsUpdates.billableHours = String(tsUpdates.billableHours);
  const role = String(req.headers["x-user-role"] ?? "");
  const settings = await getGovernanceSettings();
  // Withdraw flow: if status is changing back to Draft from Submitted, clear submitted audit fields.
  if (tsUpdates.status === "Draft") {
    const [existing] = await db.select().from(timesheetsTable).where(eq(timesheetsTable.id, params.data.id));
    if (existing) {
      // Lock-on-Approval: cannot withdraw an Approved timesheet
      const tsErr = checkTimesheetEditable(existing, role, settings);
      if (tsErr) { res.status(tsErr.status).json({ error: tsErr.error }); return; }
      // Status lock: cannot withdraw if week is in locked period
      const stErr = checkTimesheetStatusChangeable(existing, role, settings);
      if (stErr) { res.status(stErr.status).json({ error: stErr.error }); return; }
      if (existing.status === "Submitted") {
        tsUpdates.submittedAt = null;
        tsUpdates.submittedByUserId = null;
      }
    }
  } else if (tsUpdates.totalHours !== undefined || tsUpdates.billableHours !== undefined) {
    const [existing] = await db.select().from(timesheetsTable).where(eq(timesheetsTable.id, params.data.id));
    if (existing) {
      const tsErr = checkTimesheetEditable(existing, role, settings);
      if (tsErr) { res.status(tsErr.status).json({ error: tsErr.error }); return; }
    }
  }
  const [row] = await db.update(timesheetsTable).set(tsUpdates).where(eq(timesheetsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Timesheet not found" }); return; }
  res.json(UpdateTimesheetResponse.parse(mapTimesheet(row)));
});

router.post("/timesheets/:id/submit", async (req, res): Promise<void> => {
  const params = SubmitTimesheetParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [existing] = await db.select().from(timesheetsTable).where(eq(timesheetsTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Timesheet not found" }); return; }
  if (existing.status !== "Draft") { res.status(400).json({ error: "Only Draft timesheets can be submitted" }); return; }
  // Status lock guard
  {
    const role = String(req.headers["x-user-role"] ?? "");
    const settings = await getGovernanceSettings();
    const stErr = checkTimesheetStatusChangeable(existing, role, settings);
    if (stErr) { res.status(stErr.status).json({ error: stErr.error }); return; }
  }
  // Check minimum and maximum hours requirements
  const settingsRows = await db.select().from(timeSettingsTable).limit(1);
  const minHours = settingsRows[0]?.minSubmitHours ?? 0;
  const maxHours = settingsRows[0]?.maxSubmitHours ?? null;
  const currentHours = Number(existing.totalHours);
  if (minHours > 0 && currentHours < minHours) {
    res.status(400).json({ error: `You have only logged ${currentHours}h this week. The minimum required for submission is ${minHours} hours.` });
    return;
  }
  if (maxHours != null && currentHours > maxHours) {
    res.status(400).json({ error: `Your total logged hours of ${currentHours}h exceed the maximum allowed of ${maxHours} hours per week. Please review.` });
    return;
  }
  const submittedByUserId = (req.body as any)?.submittedByUserId ?? existing.userId;
  const [row] = await db.update(timesheetsTable)
    .set({ status: "Submitted", submittedAt: new Date(), submittedByUserId })
    .where(eq(timesheetsTable.id, params.data.id))
    .returning();
  // Notify resolved approver(s)
  try {
    const approverIds = await resolveApprovers(existing.userId);
    await notifyUsers(
      approverIds,
      "approval_requested",
      `Approval requested for timesheet (week of ${existing.weekStart}).`,
      existing.id,
    );
  } catch {}
  res.json(SubmitTimesheetResponse.parse(mapTimesheet(row)));
});

router.post("/timesheets/:id/approve", requirePM, async (req, res): Promise<void> => {
  const params = ApproveTimesheetParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = ApproveTimesheetBody.safeParse(req.body ?? {});
  const [existing] = await db.select().from(timesheetsTable).where(eq(timesheetsTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Timesheet not found" }); return; }
  if (existing.status !== "Submitted") { res.status(400).json({ error: "Only Submitted timesheets can be approved" }); return; }
  const actorId = Number(req.headers["x-user-id"] ?? 0);
  if (actorId === existing.userId) {
    res.status(403).json({ error: "You cannot approve your own timesheet." });
    return;
  }
  {
    const role = String(req.headers["x-user-role"] ?? "");
    const settings = await getGovernanceSettings();
    const stErr = checkTimesheetStatusChangeable(existing, role, settings);
    if (stErr) { res.status(stErr.status).json({ error: stErr.error }); return; }
  }
  const [row] = await db.update(timesheetsTable)
    .set({
      status: "Approved",
      approvedAt: new Date(),
      approvedByUserId: body.success ? body.data.approvedByUserId ?? null : null,
      rejectedAt: null,
      rejectedByUserId: null,
      rejectionNote: null,
    })
    .where(eq(timesheetsTable.id, params.data.id))
    .returning();
  await notifyUsers([existing.userId], "timesheet_approved",
    `Your timesheet for the week of ${existing.weekStart} has been approved.`, existing.id);
  res.json(ApproveTimesheetResponse.parse(mapTimesheet(row)));
});

// Undo approval: returns timesheet to Submitted and clears Approved + Rejected audit fields.
router.post("/timesheets/:id/unapprove", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (!id || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [existing] = await db.select().from(timesheetsTable).where(eq(timesheetsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Timesheet not found" }); return; }
  if (existing.status !== "Approved") { res.status(400).json({ error: "Only Approved timesheets can be unapproved" }); return; }
  {
    const role = String(req.headers["x-user-role"] ?? "");
    const settings = await getGovernanceSettings();
    const stErr = checkTimesheetStatusChangeable(existing, role, settings);
    if (stErr) { res.status(stErr.status).json({ error: stErr.error }); return; }
  }
  const [row] = await db.update(timesheetsTable)
    .set({
      status: "Submitted",
      approvedAt: null,
      approvedByUserId: null,
      rejectedAt: null,
      rejectedByUserId: null,
      rejectionNote: null,
    })
    .where(eq(timesheetsTable.id, id))
    .returning();
  await notifyUsers([existing.userId], "timesheet_unapproved",
    `Your timesheet for the week of ${existing.weekStart} approval was reverted and is awaiting re-review.`, existing.id);
  res.json(mapTimesheet(row));
});

router.post("/timesheets/:id/reject", async (req, res): Promise<void> => {
  const params = RejectTimesheetParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = RejectTimesheetBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [existing] = await db.select().from(timesheetsTable).where(eq(timesheetsTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Timesheet not found" }); return; }
  if (existing.status !== "Submitted") { res.status(400).json({ error: "Only Submitted timesheets can be rejected" }); return; }
  // Rule 12 — Rejection note is mandatory
  const rejectionNote = (parsed.data.rejectionNote ?? "").trim();
  if (!rejectionNote) {
    res.status(400).json({ error: "A rejection note is required. Please explain why this timesheet is being returned so the employee can correct it." });
    return;
  }
  {
    const role = String(req.headers["x-user-role"] ?? "");
    const settings = await getGovernanceSettings();
    const stErr = checkTimesheetStatusChangeable(existing, role, settings);
    if (stErr) { res.status(stErr.status).json({ error: stErr.error }); return; }
  }
  const rejectedByUserId = (req.body as any)?.rejectedByUserId ?? null;
  const [row] = await db.update(timesheetsTable)
    .set({
      status: "Draft",
      rejectionNote: parsed.data.rejectionNote,
      rejectedAt: new Date(),
      rejectedByUserId,
      approvedAt: null,
      approvedByUserId: null,
    })
    .where(eq(timesheetsTable.id, params.data.id))
    .returning();
  const note = parsed.data.rejectionNote ? ` Reason: ${parsed.data.rejectionNote}` : "";
  await notifyUsers([existing.userId], "timesheet_rejected",
    `Your timesheet for the week of ${existing.weekStart} was returned for changes.${note}`, existing.id);
  res.json(RejectTimesheetResponse.parse(mapTimesheet(row)));
});

// Bulk approve: accepts { ids: number[], approvedByUserId?: number }
router.post("/timesheets/bulk-approve", requirePM, async (req, res): Promise<void> => {
  const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map((x: any) => Number(x)).filter(Boolean) : [];
  if (ids.length === 0) { res.status(400).json({ error: "ids array required" }); return; }
  const approvedByUserId = req.body?.approvedByUserId ?? null;
  const existing = await db.select().from(timesheetsTable).where(inArray(timesheetsTable.id, ids));
  const role = String(req.headers["x-user-role"] ?? "");
  const actorId = Number(req.headers["x-user-id"] ?? 0);
  const settings = await getGovernanceSettings();
  const eligible = existing
    .filter(t => t.status === "Submitted")
    .filter(t => t.userId !== actorId)
    .filter(t => !checkTimesheetStatusChangeable(t, role, settings))
    .map(t => t.id);
  if (eligible.length === 0) { res.json({ approved: 0, skipped: ids.length }); return; }
  await db.update(timesheetsTable)
    .set({ status: "Approved", approvedAt: new Date(), approvedByUserId, rejectedAt: null, rejectedByUserId: null, rejectionNote: null })
    .where(inArray(timesheetsTable.id, eligible));
  for (const t of existing.filter(x => eligible.includes(x.id))) {
    await notifyUsers([t.userId], "timesheet_approved",
      `Your timesheet for the week of ${t.weekStart} has been approved.`, t.id);
  }
  res.json({ approved: eligible.length, skipped: ids.length - eligible.length });
});

// ─── Timesheet Messages (in-context conversation) ────────────────────────────
router.get("/timesheets/:id/messages", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const rows = await db.select().from(timesheetMessagesTable)
    .where(eq(timesheetMessagesTable.timesheetId, id))
    .orderBy(timesheetMessagesTable.createdAt);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt })));
});

router.post("/timesheets/:id/messages", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { userId, body } = req.body ?? {};
  if (!userId || !body) { res.status(400).json({ error: "userId and body required" }); return; }
  const [row] = await db.insert(timesheetMessagesTable).values({ timesheetId: id, userId: Number(userId), body: String(body) }).returning();
  // Notify timesheet owner + approvers
  const [ts] = await db.select().from(timesheetsTable).where(eq(timesheetsTable.id, id));
  if (ts) {
    const approverIds = await resolveApprovers(ts.userId).catch(() => [] as number[]);
    const recipients = Array.from(new Set([ts.userId, ...approverIds].filter(uid => uid !== Number(userId))));
    await notifyUsers(recipients, "timesheet_message",
      `New message on timesheet for the week of ${ts.weekStart}.`, ts.id);
  }
  res.status(201).json({ ...row, createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt });
});

// ─── Notification Preferences ────────────────────────────────────────────────
router.get("/notification-preferences", async (req, res): Promise<void> => {
  const userId = req.query.userId ? Number(req.query.userId) : null;
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }
  const rows = await db.select().from(notificationPreferencesTable).where(eq(notificationPreferencesTable.userId, userId));
  res.json(rows.map(r => ({ ...r, updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt })));
});

router.put("/notification-preferences", async (req, res): Promise<void> => {
  const { userId, type, emailEnabled, inAppEnabled } = req.body ?? {};
  if (!userId || !type) { res.status(400).json({ error: "userId and type required" }); return; }
  const existing = await db.select().from(notificationPreferencesTable)
    .where(and(eq(notificationPreferencesTable.userId, Number(userId)), eq(notificationPreferencesTable.type, String(type))));
  if (existing.length > 0) {
    const [row] = await db.update(notificationPreferencesTable)
      .set({ emailEnabled: !!emailEnabled, inAppEnabled: !!inAppEnabled, updatedAt: new Date() })
      .where(eq(notificationPreferencesTable.id, existing[0].id))
      .returning();
    res.json({ ...row, updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt });
    return;
  }
  const [row] = await db.insert(notificationPreferencesTable)
    .values({ userId: Number(userId), type: String(type), emailEnabled: !!emailEnabled, inAppEnabled: !!inAppEnabled })
    .returning();
  res.status(201).json({ ...row, updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt });
});

// ─── Timesheet Rows (persistent row tracking) ────────────────────────────────

router.get("/timesheet-rows", async (req, res): Promise<void> => {
  const userId = req.query.userId ? Number(req.query.userId) : null;
  const rows = userId
    ? await db.select().from(timesheetRowsTable).where(eq(timesheetRowsTable.userId, userId))
    : await db.select().from(timesheetRowsTable);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt })));
});

router.post("/timesheet-rows", async (req, res): Promise<void> => {
  const { userId, projectId, taskId, activityName, isNonProject, billable, categoryId } = req.body;
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }
  const data: any = { userId: Number(userId), isNonProject: !!isNonProject, billable: isNonProject ? false : !!billable };
  if (projectId) data.projectId = Number(projectId);
  if (taskId) data.taskId = Number(taskId);
  if (activityName) data.activityName = String(activityName);
  if (categoryId) data.categoryId = Number(categoryId);
  const [row] = await db.insert(timesheetRowsTable).values(data).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt });
});

// Bulk-import timesheet rows for a user from their active resource
// allocations. The intent is to remove the manual row-creation step at the
// start of each week: the planner has already told us which projects this
// person is on, so we surface them as ready-to-fill rows. We compute the
// week window from `weekStart` (YYYY-MM-DD) and pick allocations whose
// (startDate..endDate) range overlaps that week. We dedupe against rows the
// user already has (same project + no taskId/activity), so calling the
// endpoint multiple times in the same week is safe and idempotent.
router.post("/timesheets/import-allocations", async (req: AuthenticatedRequest, res): Promise<void> => {
  const actorId = req.authUserId ?? 0;
  const actorRole = req.authRole;
  const requestedUserId = req.body?.userId !== undefined ? Number(req.body.userId) : actorId;
  const isElevated = actorRole === "account_admin" || actorRole === "super_user";
  if (requestedUserId !== actorId && !isElevated) {
    res.status(403).json({ error: "Cannot import allocations for another user" });
    return;
  }
  const userId = requestedUserId;
  const weekStart = String(req.body?.weekStart ?? "");
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) { res.status(400).json({ error: "weekStart must be YYYY-MM-DD" }); return; }

  // Compute end of the timesheet week (inclusive, 6 days after start).
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  const weekEnd = end.toISOString().slice(0, 10);

  // Fetch all allocations for this user; filter overlap in JS so that string
  // date comparisons stay simple (allocations.startDate/endDate are text).
  const myAllocations = await db.select().from(allocationsTable).where(eq(allocationsTable.userId, userId));
  const overlapping = myAllocations.filter(a => a.startDate <= weekEnd && a.endDate >= weekStart);

  // Deduplicate by projectId so each project shows up once.
  const projectIds = Array.from(new Set(overlapping.map(a => a.projectId).filter((v): v is number => typeof v === "number")));
  if (projectIds.length === 0) { res.json({ imported: 0, skipped: 0 }); return; }

  // Find existing project rows for this user so we don't duplicate. We treat
  // a row as a "project row" when it has a projectId and no taskId — that's
  // the granularity the import creates.
  const existing = await db.select().from(timesheetRowsTable).where(eq(timesheetRowsTable.userId, userId));
  const alreadyHaveProjectIds = new Set(
    existing
      .filter(r => r.projectId != null && r.taskId == null && !r.isNonProject)
      .map(r => r.projectId!)
  );

  const toInsert = projectIds
    .filter(pid => !alreadyHaveProjectIds.has(pid))
    .map(pid => ({ userId, projectId: pid, isNonProject: false, billable: true }));

  if (toInsert.length > 0) {
    await db.insert(timesheetRowsTable).values(toInsert);
  }
  res.json({ imported: toInsert.length, skipped: projectIds.length - toInsert.length });
});

router.delete("/timesheet-rows/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(timesheetRowsTable).where(eq(timesheetRowsTable.id, id));
  res.sendStatus(204);
});

export default router;
