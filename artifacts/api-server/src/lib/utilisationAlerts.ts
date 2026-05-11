/**
 * Utilisation variance alerts.
 *
 * Runs every Monday at 08:00 (org timezone).  For each active internal
 * resource it computes billable utilisation for the prior week:
 *
 *   utilisation = approvedBillableHours / weeklyCapacityHours
 *
 * If the result is below UNDER_UTIL_THRESHOLD or above OVER_UTIL_THRESHOLD
 * the resource's manager (timesheetApproverUserId) and all account_admin
 * users (the Resource Manager equivalent) receive an in-app notification.
 *
 * Resources on approved full-week leave are skipped entirely.
 *
 * The exported `runUtilisationAlerts(overrideWeekStart?)` accepts an
 * optional ISO Monday date so the test suite can invoke it without waiting
 * for the cron schedule.
 */

import { and, eq, gte, lte } from "drizzle-orm";
import {
  db,
  usersTable,
  timesheetsTable,
  timeOffRequestsTable,
  notificationsTable,
} from "@workspace/db";
import { logger } from "./logger";

// ── Thresholds ────────────────────────────────────────────────────────────────

export const UNDER_UTIL_THRESHOLD = 0.60;
export const OVER_UTIL_THRESHOLD  = 1.00;
export const TARGET_UTIL          = 0.75;

// ── Date helpers ──────────────────────────────────────────────────────────────

/**
 * Given any date, return the ISO Monday (YYYY-MM-DD) that starts that
 * calendar week, plus the matching Sunday.
 */
function weekBoundsFromMonday(monday: Date): { weekStart: string; weekEnd: string } {
  const sun = new Date(monday);
  sun.setUTCDate(monday.getUTCDate() + 6);
  return {
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd:   sun.toISOString().slice(0, 10),
  };
}

/**
 * Returns the Monday and Sunday (YYYY-MM-DD) of the week *before* the one
 * that contains `refDate`.
 */
function priorWeekBounds(refDate: Date): { weekStart: string; weekEnd: string } {
  const d = new Date(refDate);
  // Snap to current Monday
  const dow = d.getUTCDay();              // 0=Sun, 1=Mon, …
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + diffToMon);
  // Step back 7 days to prior Monday
  d.setUTCDate(d.getUTCDate() - 7);
  return weekBoundsFromMonday(d);
}

// ── Core job ──────────────────────────────────────────────────────────────────

/**
 * Run the utilisation alert check.
 *
 * @param overrideWeekStart - ISO Monday date (YYYY-MM-DD) to use instead of
 *   the automatically-derived prior week.  Useful for tests and backfill.
 */
export async function runUtilisationAlerts(overrideWeekStart?: string): Promise<void> {
  try {
    const { weekStart, weekEnd } = overrideWeekStart
      ? weekBoundsFromMonday(new Date(`${overrideWeekStart}T00:00:00Z`))
      : priorWeekBounds(new Date());

    logger.info({ weekStart, weekEnd }, "Utilisation alerts: starting");

    // 1. All active internal users
    const users = await db
      .select({
        id:                      usersTable.id,
        name:                    usersTable.name,
        capacity:                usersTable.capacity,
        timesheetApproverUserId: usersTable.timesheetApproverUserId,
      })
      .from(usersTable)
      .where(and(eq(usersTable.isActive, 1), eq(usersTable.isInternal, true)));

    if (users.length === 0) {
      logger.info("Utilisation alerts: no active internal users, skipping");
      return;
    }

    // 2. All account_admin users act as "Resource Managers"
    const adminRows = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.role, "account_admin"));
    const adminIds = adminRows.map(u => u.id);

    // 3. Approved full-week leaves that span the entire prior week
    const fullWeekLeaves = await db
      .select({ userId: timeOffRequestsTable.userId })
      .from(timeOffRequestsTable)
      .where(
        and(
          eq(timeOffRequestsTable.status, "Approved"),
          lte(timeOffRequestsTable.startDate, weekStart),
          gte(timeOffRequestsTable.endDate,   weekEnd),
        ),
      );
    const onLeaveIds = new Set(fullWeekLeaves.map(r => r.userId));

    // 4. Per-user check
    let alertCount = 0;
    for (const user of users) {
      // Rule 4 — skip resources on full-week approved leave
      if (onLeaveIds.has(user.id)) continue;

      // Approved timesheet for the prior week → billableHours
      const [ts] = await db
        .select({ billableHours: timesheetsTable.billableHours })
        .from(timesheetsTable)
        .where(
          and(
            eq(timesheetsTable.userId,    user.id),
            eq(timesheetsTable.weekStart, weekStart),
            eq(timesheetsTable.status,    "Approved"),
          ),
        );

      const billableHours = Number(ts?.billableHours ?? 0);
      const workingHours  = user.capacity > 0 ? user.capacity : 40;
      const utilRatio     = billableHours / workingHours;

      // Within acceptable range — no alert
      if (utilRatio >= UNDER_UTIL_THRESHOLD && utilRatio <= OVER_UTIL_THRESHOLD) continue;

      const pct = Math.round(utilRatio * 100);
      const isUnder = utilRatio < UNDER_UTIL_THRESHOLD;
      const message = isUnder
        ? `${user.name} was ${pct}% utilised last week (target: ${Math.round(TARGET_UTIL * 100)}%). Review their allocations.`
        : `${user.name} logged ${pct}% last week — check for burnout.`;
      const type = isUnder ? "under_utilisation" : "over_utilisation";

      // Unique recipient set: manager + all account_admin users
      const recipientSet = new Set<number>(adminIds);
      if (user.timesheetApproverUserId) {
        recipientSet.add(user.timesheetApproverUserId);
      }

      if (recipientSet.size === 0) continue;

      const notifications = Array.from(recipientSet).map(recipientId => ({
        type,
        message,
        userId:     recipientId,
        entityType: "user",
        entityId:   String(user.id),
        read:       false,
      }));

      await db.insert(notificationsTable).values(notifications);
      alertCount += notifications.length;

      logger.info(
        { userId: user.id, name: user.name, utilPct: pct, type, recipients: notifications.length },
        "Utilisation alert fired",
      );
    }

    logger.info({ weekStart, weekEnd, alertCount }, "Utilisation alerts: run complete");
  } catch (err) {
    logger.error({ err }, "Utilisation alerts: job failed");
  }
}
