import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, timesheetsTable, notificationsTable, timesheetRowsTable, timeSettingsTable } from "@workspace/db";
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
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt,
  };
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
  // Check minimum hours requirement
  const settingsRows = await db.select().from(timeSettingsTable).limit(1);
  const minHours = settingsRows[0]?.minSubmitHours ?? 0;
  if (minHours > 0 && Number(existing.totalHours) < minHours) {
    res.status(400).json({ error: `Minimum ${minHours} hours required before submission. Current: ${Number(existing.totalHours)}h` });
    return;
  }
  const [row] = await db.update(timesheetsTable)
    .set({ status: "Submitted", submittedAt: new Date() })
    .where(eq(timesheetsTable.id, params.data.id))
    .returning();
  res.json(SubmitTimesheetResponse.parse(mapTimesheet(row)));
});

router.post("/timesheets/:id/approve", async (req, res): Promise<void> => {
  const params = ApproveTimesheetParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = ApproveTimesheetBody.safeParse(req.body ?? {});
  const [existing] = await db.select().from(timesheetsTable).where(eq(timesheetsTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Timesheet not found" }); return; }
  if (existing.status !== "Submitted") { res.status(400).json({ error: "Only Submitted timesheets can be approved" }); return; }
  const [row] = await db.update(timesheetsTable)
    .set({
      status: "Approved",
      approvedAt: new Date(),
      approvedByUserId: body.success ? body.data.approvedByUserId ?? null : null,
      rejectionNote: null,
    })
    .where(eq(timesheetsTable.id, params.data.id))
    .returning();
  await db.insert(notificationsTable).values({
    type: "timesheet_approved",
    message: `Your timesheet for the week of ${existing.weekStart} has been approved.`,
    userId: existing.userId,
    entityType: "timesheet",
    entityId: String(existing.id),
    read: false,
  } as any).catch(() => {});
  res.json(ApproveTimesheetResponse.parse(mapTimesheet(row)));
});

router.post("/timesheets/:id/reject", async (req, res): Promise<void> => {
  const params = RejectTimesheetParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = RejectTimesheetBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [existing] = await db.select().from(timesheetsTable).where(eq(timesheetsTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Timesheet not found" }); return; }
  if (existing.status !== "Submitted") { res.status(400).json({ error: "Only Submitted timesheets can be rejected" }); return; }
  const [row] = await db.update(timesheetsTable)
    .set({ status: "Draft", rejectionNote: parsed.data.rejectionNote, approvedAt: null, approvedByUserId: null })
    .where(eq(timesheetsTable.id, params.data.id))
    .returning();
  const note = parsed.data.rejectionNote ? ` Reason: ${parsed.data.rejectionNote}` : "";
  await db.insert(notificationsTable).values({
    type: "timesheet_rejected",
    message: `Your timesheet for the week of ${existing.weekStart} was returned for changes.${note}`,
    userId: existing.userId,
    entityType: "timesheet",
    entityId: String(existing.id),
    read: false,
  } as any).catch(() => {});
  res.json(RejectTimesheetResponse.parse(mapTimesheet(row)));
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
