import { Router, type IRouter } from "express";
import { db, timeOffRequestsTable, holidayCalendarsTable, holidayDatesTable, notificationsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requirePM } from "../middleware/rbac";
import {
  ListTimeOffRequestsQueryParams,
  CreateTimeOffRequestBody,
  UpdateTimeOffRequestStatusParams,
  UpdateTimeOffRequestStatusBody,
  DeleteTimeOffRequestParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapTimeOff(r: typeof timeOffRequestsTable.$inferSelect) {
  return {
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

router.get("/time-off-requests", async (req, res): Promise<void> => {
  const qp = ListTimeOffRequestsQueryParams.safeParse(req.query);
  const conditions: any[] = [];
  if (qp.success) {
    if (qp.data.userId) conditions.push(eq(timeOffRequestsTable.userId, qp.data.userId));
    if (qp.data.status) conditions.push(eq(timeOffRequestsTable.status, qp.data.status));
  }
  const rows = conditions.length
    ? await db.select().from(timeOffRequestsTable).where(and(...conditions))
    : await db.select().from(timeOffRequestsTable);
  res.json(rows.map(mapTimeOff));
});

function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + "T00:00:00Z");
  const fin = new Date(end + "T00:00:00Z");
  while (cur <= fin) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

router.post("/time-off-requests", async (req, res): Promise<void> => {
  const parsed = CreateTimeOffRequestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { userId, startDate, endDate } = parsed.data as any;

  // Dedup check: if the user has an assigned holiday calendar, reject if ALL
  // requested dates are already covered by holidays (no duplicate deduction).
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (user?.holidayCalendarId) {
    const holidayDates = await db.select().from(holidayDatesTable)
      .where(eq(holidayDatesTable.calendarId, user.holidayCalendarId));
    const holidaySet = new Set(holidayDates.map(h => h.date));
    const requestedDates = dateRange(startDate, endDate);
    const workingDates = requestedDates.filter(d => {
      const dow = new Date(d + "T00:00:00Z").getUTCDay();
      return dow !== 0 && dow !== 6;
    });
    const conflicting = workingDates.filter(d => holidaySet.has(d));
    if (conflicting.length > 0 && conflicting.length === workingDates.length) {
      res.status(409).json({
        error: `All requested dates (${conflicting.join(", ")}) are already marked as holidays in your assigned calendar. No duplicate capacity deduction needed.`,
      });
      return;
    }
  }

  const insertData: any = { ...parsed.data };
  if (req.body.durationType) insertData.durationType = req.body.durationType;
  if (req.body.customHours !== undefined) insertData.customHours = req.body.customHours ? Number(req.body.customHours) : null;
  if (req.body.notifyProjectOwners !== undefined) insertData.notifyProjectOwners = Boolean(req.body.notifyProjectOwners);
  if (req.body.additionalEmails !== undefined) insertData.additionalEmails = req.body.additionalEmails || null;
  const [row] = await db.insert(timeOffRequestsTable).values(insertData).returning();
  res.status(201).json(mapTimeOff(row));
});

router.patch("/time-off-requests/:id", requirePM, async (req, res): Promise<void> => {
  const params = UpdateTimeOffRequestStatusParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateTimeOffRequestStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const newStatus = (parsed.data as any).status as string | undefined;
  if (newStatus === "Approved" || newStatus === "Rejected") {
    const [existing] = await db.select().from(timeOffRequestsTable).where(eq(timeOffRequestsTable.id, params.data.id));
    if (!existing) { res.status(404).json({ error: "Time-off request not found" }); return; }
    const actorId = Number(req.headers["x-user-id"] ?? 0);
    if (actorId && actorId === existing.userId) {
      res.status(403).json({ error: `You cannot ${newStatus.toLowerCase()} your own time-off request.` });
      return;
    }
  }
  const [row] = await db.update(timeOffRequestsTable)
    .set({ ...parsed.data, updatedAt: new Date() } as any)
    .where(eq(timeOffRequestsTable.id, params.data.id))
    .returning();
  if (!row) { res.status(404).json({ error: "Time-off request not found" }); return; }
  // Notify submitter when approved
  if ((parsed.data as any).status === "Approved") {
    try {
      await db.insert(notificationsTable).values({
        type: "time_off_applied",
        message: `Your time-off request (${row.type}, ${row.startDate} → ${row.endDate}) was approved.`,
        userId: row.userId,
        entityType: "time_off",
        entityId: String(row.id),
        read: false,
      } as any);
    } catch {}
  }
  res.json(mapTimeOff(row));
});

router.delete("/time-off-requests/:id", async (req, res): Promise<void> => {
  const params = DeleteTimeOffRequestParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(timeOffRequestsTable).where(eq(timeOffRequestsTable.id, params.data.id));
  res.status(204).send();
});

router.get("/holiday-calendars", async (_req, res): Promise<void> => {
  const calendars = await db.select().from(holidayCalendarsTable);
  const dates = await db.select().from(holidayDatesTable);
  res.json(calendars.map(c => ({
    ...c,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    holidays: dates.filter(d => d.calendarId === c.id).map(d => ({
      ...d,
      createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
    })),
  })));
});

router.post("/holiday-calendars", async (req, res): Promise<void> => {
  const { name, description } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const [cal] = await db.insert(holidayCalendarsTable).values({ name, description }).returning();
  res.status(201).json({ ...cal, holidays: [] });
});

router.post("/holiday-calendars/:id/dates", async (req, res): Promise<void> => {
  const calendarId = parseInt(req.params.id);
  const { name, date } = req.body;
  if (!name || !date) { res.status(400).json({ error: "name and date required" }); return; }
  const [row] = await db.insert(holidayDatesTable).values({ calendarId, name, date }).returning();
  res.status(201).json(row);
});

router.get("/holiday-calendars/:id/dates", async (req, res): Promise<void> => {
  const calendarId = parseInt(req.params.id);
  if (isNaN(calendarId)) { res.status(400).json({ error: "Invalid calendar id" }); return; }
  const rows = await db.select().from(holidayDatesTable).where(eq(holidayDatesTable.calendarId, calendarId));
  res.json(rows.map(d => ({ ...d, createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt })));
});

router.delete("/holiday-calendars/:id/dates/:dateId", async (req, res): Promise<void> => {
  const dateId = parseInt(req.params.dateId);
  await db.delete(holidayDatesTable).where(eq(holidayDatesTable.id, dateId));
  res.status(204).send();
});

router.delete("/holiday-calendars/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid calendar id" }); return; }
  await db.delete(holidayDatesTable).where(eq(holidayDatesTable.calendarId, id));
  await db.delete(holidayCalendarsTable).where(eq(holidayCalendarsTable.id, id));
  res.status(204).send();
});

export default router;
