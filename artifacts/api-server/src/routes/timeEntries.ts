import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import {
  db, timeEntriesTable, projectsTable, usersTable, tasksTable,
  activityDefaultsTable, timeSettingsTable, timeCategoriesTable,
  allocationsTable, holidayDatesTable,
} from "@workspace/db";
import { requirePM } from "../middleware/rbac";
import type { AuthenticatedRequest } from "../middleware/roleClaim";
import {
  getGovernanceSettings, checkEntryEditable, checkEntryStatusChangeable,
  checkInvoicedMove, checkTimesheetEditable, getTimesheetForEntry,
} from "../lib/governance";
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

// ─── Guardrail Engine ─────────────────────────────────────────────────────────

type GuardrailItem =
  | { type: "hard_block"; code: string; message: string }
  | { type: "soft_block"; code: string; message: string };

function getWeekStart(date: string): string {
  const d = new Date(date + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

async function runGuardrails(data: {
  userId: number;
  date: string;
  hours: number;
  projectId?: number | null;
  taskId?: number | null;
}): Promise<GuardrailItem[]> {
  const results: GuardrailItem[] = [];

  // Rule 9 — Time Entry on Inactive / Ended Project allocation
  if (data.projectId) {
    const [alloc] = await db
      .select()
      .from(allocationsTable)
      .where(
        and(
          eq(allocationsTable.projectId, data.projectId),
          eq(allocationsTable.userId, data.userId),
        ),
      )
      .limit(1);
    if (alloc && alloc.endDate < data.date) {
      results.push({
        type: "hard_block",
        code: "INACTIVE_PROJECT",
        message: `Your allocation on this project ended on ${alloc.endDate}. You cannot log time to this project. Contact your PM to extend your allocation if needed.`,
      });
    }
  }

  // Rule 5 — Weekend / Non-Working Day Guard
  const dateObj = new Date(data.date + "T00:00:00");
  const dow = dateObj.getDay(); // 0=Sun, 6=Sat
  if (dow === 0 || dow === 6) {
    results.push({
      type: "soft_block",
      code: "NON_WORKING_DAY",
      message: `${data.date} is a weekend. Are you sure you want to log time here?`,
    });
  } else {
    // Check user's holiday calendar
    const [user] = await db
      .select({ holidayCalendarId: usersTable.holidayCalendarId } as any)
      .from(usersTable)
      .where(eq(usersTable.id, data.userId))
      .limit(1);
    const calId = (user as any)?.holidayCalendarId;
    if (calId) {
      const [holiday] = await db
        .select({ id: holidayDatesTable.id })
        .from(holidayDatesTable)
        .where(
          and(
            eq(holidayDatesTable.calendarId, calId),
            eq(holidayDatesTable.date, data.date),
          ),
        )
        .limit(1);
      if (holiday) {
        results.push({
          type: "soft_block",
          code: "PUBLIC_HOLIDAY",
          message: `${data.date} is a public holiday in your calendar. Are you sure you want to log time here?`,
        });
      }
    }
  }

  // Rule 1 — Daily Hour Cap
  const [settings] = await db.select().from(timeSettingsTable).limit(1);
  const weeklyCapacity = settings?.weeklyCapacityHours ?? 40;
  const workingDays = (settings?.workingDays ?? "Mon,Tue,Wed,Thu,Fri").split(",").filter(Boolean).length || 5;
  const dailyCapacity = Math.round(weeklyCapacity / workingDays);

  const dayEntries = await db
    .select({ hours: timeEntriesTable.hours })
    .from(timeEntriesTable)
    .where(
      and(
        eq(timeEntriesTable.userId, data.userId),
        eq(timeEntriesTable.date, data.date),
      ),
    );
  const existingDayHours = dayEntries.reduce((s, e) => s + Number(e.hours), 0);
  const newDayTotal = existingDayHours + data.hours;

  if (newDayTotal > dailyCapacity) {
    results.push({
      type: "soft_block",
      code: "DAILY_CAP",
      message: `You will log ${newDayTotal.toFixed(1)} hours on ${data.date}, which exceeds your daily capacity of ${dailyCapacity} hours. Please review before saving.`,
    });
  }

  // Rule 4 — Duplicate Entry Detection
  if (data.projectId && data.taskId) {
    const [dup] = await db
      .select({ id: timeEntriesTable.id })
      .from(timeEntriesTable)
      .where(
        and(
          eq(timeEntriesTable.userId, data.userId),
          eq(timeEntriesTable.projectId, data.projectId),
          eq(timeEntriesTable.taskId, data.taskId),
          eq(timeEntriesTable.date, data.date),
        ),
      )
      .limit(1);
    if (dup) {
      results.push({
        type: "soft_block",
        code: "DUPLICATE_ENTRY",
        message: `A time entry already exists for this task on ${data.date}. Adding this will combine with the existing entry.`,
      });
    }
  }

  // Rules 2 & 3 — Allocation overrun checks
  if (data.projectId) {
    const [alloc] = await db
      .select()
      .from(allocationsTable)
      .where(
        and(
          eq(allocationsTable.projectId, data.projectId),
          eq(allocationsTable.userId, data.userId),
        ),
      )
      .limit(1);

    if (alloc) {
      // Rule 2 — Weekly Allocation Overrun
      const allocHPW = Number(alloc.hoursPerWeek);
      if (allocHPW > 0) {
        const wStart = getWeekStart(data.date);
        const wEnd = getWeekEnd(wStart);
        const weekEntries = await db
          .select({ hours: timeEntriesTable.hours })
          .from(timeEntriesTable)
          .where(
            and(
              eq(timeEntriesTable.userId, data.userId),
              eq(timeEntriesTable.projectId, data.projectId),
              gte(timeEntriesTable.date, wStart),
              lte(timeEntriesTable.date, wEnd),
            ),
          );
        const weekHours = weekEntries.reduce((s, e) => s + Number(e.hours), 0);
        if (weekHours + data.hours > allocHPW) {
          results.push({
            type: "soft_block",
            code: "WEEKLY_OVERRUN",
            message: `You will log ${(weekHours + data.hours).toFixed(1)} hours on this project this week, which exceeds your weekly allocation of ${allocHPW}h. Billed hours are more than planned — please recheck before submitting.`,
          });
        }
      }

      // Rule 3 — Cumulative Budget Overrun
      const allocTotal = Number(alloc.totalHours);
      if (allocTotal > 0) {
        const cumEntries = await db
          .select({ hours: timeEntriesTable.hours })
          .from(timeEntriesTable)
          .where(
            and(
              eq(timeEntriesTable.userId, data.userId),
              eq(timeEntriesTable.projectId, data.projectId),
            ),
          );
        const cumHours = cumEntries.reduce((s, e) => s + Number(e.hours), 0);
        const newTotal = cumHours + data.hours;
        const pct = (newTotal / allocTotal) * 100;
        if (pct >= 100) {
          results.push({
            type: "hard_block",
            code: "BUDGET_OVERRUN",
            message: `Your total logged hours on this project have reached ${newTotal.toFixed(1)} of your ${allocTotal}h allocated hours. Contact your Project Manager before logging additional hours.`,
          });
        } else if (pct >= 90) {
          results.push({
            type: "soft_block",
            code: "BUDGET_WARNING",
            message: `Your total logged hours on this project will reach ${newTotal.toFixed(1)} of your ${allocTotal}h allocated (${pct.toFixed(0)}%). Contact your PM if you need more time.`,
          });
        }
      }
    }
  }

  return results;
}

// ─── Guardrail context endpoint ───────────────────────────────────────────────
// GET /api/time-entries/guardrail-context?userId=X&weekStart=Y
// Returns allocation vs actuals context for the timesheet grid.
router.get("/time-entries/guardrail-context", async (req, res): Promise<void> => {
  const userId = req.query.userId ? Number(req.query.userId) : null;
  const weekStart = req.query.weekStart ? String(req.query.weekStart) : null;
  if (!userId || !weekStart) {
    res.status(400).json({ error: "userId and weekStart required" });
    return;
  }
  const weekEnd = getWeekEnd(weekStart);

  const allocs = await db
    .select()
    .from(allocationsTable)
    .where(eq(allocationsTable.userId, userId));

  const weekEntries = await db
    .select()
    .from(timeEntriesTable)
    .where(
      and(
        eq(timeEntriesTable.userId, userId),
        gte(timeEntriesTable.date, weekStart),
        lte(timeEntriesTable.date, weekEnd),
      ),
    );

  const allEntries = await db
    .select({ projectId: timeEntriesTable.projectId, hours: timeEntriesTable.hours })
    .from(timeEntriesTable)
    .where(eq(timeEntriesTable.userId, userId));

  const context = allocs.map((a) => {
    const weekLoggedHours = weekEntries
      .filter((e) => e.projectId === a.projectId)
      .reduce((s, e) => s + Number(e.hours), 0);
    const totalLoggedHours = allEntries
      .filter((e) => e.projectId === a.projectId)
      .reduce((s, e) => s + Number(e.hours), 0);
    const allocTotal = Number(a.totalHours);
    const allocPerWeek = Number(a.hoursPerWeek);
    return {
      projectId: a.projectId,
      allocatedPerWeek: allocPerWeek,
      allocatedTotal: allocTotal,
      weekLoggedHours,
      totalLoggedHours,
      remainingTotal: allocTotal > 0 ? Math.max(0, allocTotal - totalLoggedHours) : null,
      weekOverrun: allocPerWeek > 0 && weekLoggedHours > allocPerWeek,
      budgetPct: allocTotal > 0 ? Math.round((totalLoggedHours / allocTotal) * 100) : null,
      allocationEndDate: a.endDate,
      isExpired: a.endDate < weekStart,
    };
  });

  // Also compute daily totals for the week for Rule 1 (daily cap) display
  const [settings] = await db.select().from(timeSettingsTable).limit(1);
  const weeklyCapacity = settings?.weeklyCapacityHours ?? 40;
  const workingDays = (settings?.workingDays ?? "Mon,Tue,Wed,Thu,Fri").split(",").filter(Boolean).length || 5;
  const dailyCapacity = Math.round(weeklyCapacity / workingDays);

  const dailyTotals: Record<string, number> = {};
  for (const e of weekEntries) {
    dailyTotals[e.date] = (dailyTotals[e.date] ?? 0) + Number(e.hours);
  }

  res.json({ allocations: context, dailyCapacity, weeklyCapacity, dailyTotals });
});

// ─── Core helpers ─────────────────────────────────────────────────────────────

async function isParentOrPhaseTask(taskId: number): Promise<boolean> {
  const [self] = await db
    .select({ isPhase: tasksTable.isPhase })
    .from(tasksTable)
    .where(eq(tasksTable.id, taskId))
    .limit(1);
  if (self?.isPhase) return true;
  const children = await db
    .select({ id: tasksTable.id })
    .from(tasksTable)
    .where(eq(tasksTable.parentTaskId, taskId))
    .limit(1);
  return children.length > 0;
}

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

// ─── Routes ───────────────────────────────────────────────────────────────────

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

router.post("/time-entries", async (req, res): Promise<void> => {
  const parsed = CreateTimeEntryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data: any = { ...parsed.data, hours: String(parsed.data.hours) };
  const body = req.body ?? {};

  if (body.categoryId !== undefined && data.categoryId === undefined) {
    data.categoryId = body.categoryId === null ? null : Number(body.categoryId);
  }
  if (body.taskId !== undefined && data.taskId === undefined) {
    data.taskId = body.taskId === null ? null : Number(body.taskId);
  }
  if (data.taskId != null) {
    if (await isParentOrPhaseTask(Number(data.taskId))) {
      res.status(400).json({ error: "Cannot log time on a parent task. Log against an individual child task." });
      return;
    }
  }

  // Enforce: non-project activities must be non-billable
  if (!data.projectId) { data.projectId = null; data.billable = false; }

  // Default cascade: task → activity-default → time-settings.defaultBillable / time-category.defaultBillable
  const billableMissing = data.billable === undefined || data.billable === null;
  const categoryMissing = data.categoryId === undefined || data.categoryId === null;
  if ((billableMissing || categoryMissing) && data.taskId) {
    const [t] = await db.select().from(tasksTable).where(eq(tasksTable.id, Number(data.taskId)));
    if (t) {
      if (billableMissing && data.projectId) data.billable = !!t.billable;
      if (categoryMissing && t.categoryId) data.categoryId = t.categoryId;
    }
  }
  if ((data.billable === undefined || data.billable === null || data.categoryId === undefined || data.categoryId === null) && body.activityName) {
    const [ad] = await db.select().from(activityDefaultsTable).where(eq(activityDefaultsTable.activityName, String(body.activityName)));
    if (ad && ad.isActive) {
      if ((data.billable === undefined || data.billable === null) && data.projectId) data.billable = !!ad.billable;
      if ((data.categoryId === undefined || data.categoryId === null) && ad.categoryId) data.categoryId = ad.categoryId;
    }
  }
  if (data.billable === undefined || data.billable === null) {
    const [ts] = await db.select().from(timeSettingsTable).limit(1);
    if (ts && data.projectId) data.billable = ts.defaultBillable !== false;
  }
  if ((data.billable === undefined || data.billable === null) && data.categoryId) {
    const [cat] = await db.select().from(timeCategoriesTable).where(eq(timeCategoriesTable.id, Number(data.categoryId)));
    if (cat && data.projectId) data.billable = cat.defaultBillable !== false;
  }

  // ─── Run guardrails ────────────────────────────────────────────────────────
  const force = body.force === true;
  const guardrailResults = await runGuardrails({
    userId: Number(data.userId),
    date: String(data.date),
    hours: Number(data.hours),
    projectId: data.projectId ?? null,
    taskId: data.taskId ?? null,
  });

  const hardBlocks = guardrailResults.filter((r) => r.type === "hard_block") as { type: "hard_block"; code: string; message: string }[];
  const softBlocks = guardrailResults.filter((r) => r.type === "soft_block") as { type: "soft_block"; code: string; message: string }[];

  if (hardBlocks.length > 0) {
    res.status(422).json({
      error: hardBlocks[0].message,
      guardrailCode: hardBlocks[0].code,
      guardrails: guardrailResults,
    });
    return;
  }

  if (softBlocks.length > 0 && !force) {
    res.status(409).json({
      warning: softBlocks[0].message,
      guardrailCode: softBlocks[0].code,
      guardrails: guardrailResults,
      requiresConfirmation: true,
    });
    return;
  }

  const [row] = await db.insert(timeEntriesTable).values(data).returning();
  res.status(201).json({ ...mapEntry(row), guardrails: softBlocks.length > 0 ? guardrailResults : undefined });
});

router.patch("/time-entries/:id", async (req, res): Promise<void> => {
  const params = UpdateTimeEntryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateTimeEntryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const role = (req as AuthenticatedRequest).authRole ?? "collaborator";
  const [existing] = await db.select().from(timeEntriesTable).where(eq(timeEntriesTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Time entry not found" }); return; }
  const settings = await getGovernanceSettings();
  const dateErr = checkEntryEditable(existing, role, settings);
  if (dateErr) { res.status(dateErr.status).json({ error: dateErr.error }); return; }
  const ts = await getTimesheetForEntry(existing);
  if (ts) {
    const tsErr = checkTimesheetEditable(ts, role, settings);
    if (tsErr) { res.status(tsErr.status).json({ error: tsErr.error }); return; }
  }
  const invErr = await checkInvoicedMove(existing, (parsed.data as any).projectId);
  if (invErr) { res.status(invErr.status).json({ error: invErr.error }); return; }
  const teUpdates: any = { ...parsed.data };
  if (teUpdates.hours !== undefined) teUpdates.hours = String(teUpdates.hours);
  const body = req.body ?? {};
  if (body.categoryId !== undefined) teUpdates.categoryId = body.categoryId === null ? null : Number(body.categoryId);
  if (body.taskId !== undefined) teUpdates.taskId = body.taskId === null ? null : Number(body.taskId);
  if (teUpdates.taskId != null) {
    if (await isParentOrPhaseTask(Number(teUpdates.taskId))) {
      res.status(400).json({ error: "Cannot log time on a parent task. Log against an individual child task." });
      return;
    }
  }
  if (typeof body.role === "string") teUpdates.role = body.role.trim() || null;
  if (typeof body.rejected === "boolean") teUpdates.rejected = body.rejected;
  if (typeof body.rejectionNote === "string") teUpdates.rejectionNote = body.rejectionNote.trim() || null;
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

router.post("/time-entries/:id/reject", requirePM, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const reason = String(req.body?.rejectionNote ?? req.body?.reason ?? "").trim();
  const [existing] = await db.select().from(timeEntriesTable).where(eq(timeEntriesTable.id, id));
  if (!existing) { res.status(404).json({ error: "Time entry not found" }); return; }
  const role = (req as AuthenticatedRequest).authRole ?? "collaborator";
  const settings = await getGovernanceSettings();
  const statusErr = checkEntryStatusChangeable(existing, role, settings);
  if (statusErr) { res.status(statusErr.status).json({ error: statusErr.error }); return; }
  const [row] = await db.update(timeEntriesTable)
    .set({ rejected: true, approved: false, rejectionNote: reason || null })
    .where(eq(timeEntriesTable.id, id))
    .returning();
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

router.post("/time-entries/bulk-reject", requirePM, async (req, res): Promise<void> => {
  const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map((x: any) => Number(x)).filter(Boolean) : [];
  const reason = String(req.body?.rejectionNote ?? req.body?.reason ?? "").trim();
  if (ids.length === 0) { res.status(400).json({ error: "ids array required" }); return; }
  const { inArray } = await import("drizzle-orm");
  const existing = await db.select().from(timeEntriesTable).where(inArray(timeEntriesTable.id, ids));
  const role = (req as AuthenticatedRequest).authRole ?? "collaborator";
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

router.post("/time-entries/bulk-approve", requirePM, async (req, res): Promise<void> => {
  const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map((x: any) => Number(x)).filter(Boolean) : [];
  if (ids.length === 0) { res.status(400).json({ error: "ids array required" }); return; }
  const { inArray } = await import("drizzle-orm");
  const existing = await db.select().from(timeEntriesTable).where(inArray(timeEntriesTable.id, ids));
  const role = (req as AuthenticatedRequest).authRole ?? "collaborator";
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

router.post("/time-entries/bulk-delete", requirePM, async (req, res): Promise<void> => {
  const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map((x: any) => Number(x)).filter(Boolean) : [];
  if (ids.length === 0) { res.status(400).json({ error: "ids array required" }); return; }
  const { inArray } = await import("drizzle-orm");
  const existing = await db.select().from(timeEntriesTable).where(inArray(timeEntriesTable.id, ids));
  const role = (req as AuthenticatedRequest).authRole ?? "collaborator";
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

router.delete("/time-entries/:id", async (req, res): Promise<void> => {
  const params = DeleteTimeEntryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [existing] = await db.select().from(timeEntriesTable).where(eq(timeEntriesTable.id, params.data.id));
  if (!existing) { res.sendStatus(204); return; }
  const role = (req as AuthenticatedRequest).authRole ?? "collaborator";
  const settings = await getGovernanceSettings();
  const dateErr = checkEntryEditable(existing, role, settings);
  if (dateErr) { res.status(dateErr.status).json({ error: dateErr.error }); return; }
  const ts = await getTimesheetForEntry(existing);
  if (ts) {
    const tsErr = checkTimesheetEditable(ts, role, settings);
    if (tsErr) { res.status(tsErr.status).json({ error: tsErr.error }); return; }
  }
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
    projectName: projects.find(p => p.id === projectId)?.name ?? "Unknown",
    hours,
  }));

  const byUserMap = new Map<number, number>();
  allEntries.forEach(e => byUserMap.set(e.userId, (byUserMap.get(e.userId) || 0) + Number(e.hours)));

  const byUser = Array.from(byUserMap.entries()).map(([userId, hours]) => ({
    userId,
    userName: users.find(u => u.id === userId)?.name ?? "Unknown",
    hours,
  }));

  res.json(GetTimeEntrySummaryResponse.parse({ totalHoursThisWeek, totalHoursThisMonth, billablePercent, byProject, byUser }));
});

export default router;
