import { Router, type IRouter } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, timesheetsTable, notificationsTable, timesheetRowsTable, timeSettingsTable, timesheetMessagesTable, notificationPreferencesTable, usersTable } from "@workspace/db";
import { getGovernanceSettings, checkTimesheetStatusChangeable, checkTimesheetEditable } from "../lib/governance";
import { requirePM } from "../middleware/rbac";
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
  // Check minimum hours requirement
  const settingsRows = await db.select().from(timeSettingsTable).limit(1);
  const minHours = settingsRows[0]?.minSubmitHours ?? 0;
  if (minHours > 0 && Number(existing.totalHours) < minHours) {
    res.status(400).json({ error: `Minimum ${minHours} hours required before submission. Current: ${Number(existing.totalHours)}h` });
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

router.delete("/timesheet-rows/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(timesheetRowsTable).where(eq(timesheetRowsTable.id, id));
  res.sendStatus(204);
});

export default router;
