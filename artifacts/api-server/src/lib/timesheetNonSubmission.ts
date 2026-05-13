/**
 * WF-5 — Daily non-submission detection cron.
 *
 * Runs daily. Looks at the PRIOR ISO week (Mon–Sun). For every active internal
 * user whose timesheet for that week is missing, still Draft, or Rejected,
 * notifies their manager (`users.managerId`) with a `timesheet_non_submission`
 * notification.
 *
 * Deduplication: one notification per (userId, weekStart) pair — checked via
 * an existing notification row with the same message prefix so re-runs are safe.
 */

import { eq, and, ne } from "drizzle-orm";
import { db, usersTable, timesheetsTable, notificationsTable } from "@workspace/db";
import { logger } from "./logger";

function priorWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = (day + 6) % 7;
  const thisMon = new Date(now);
  thisMon.setDate(now.getDate() - diffToMon);
  const priorMon = new Date(thisMon);
  priorMon.setDate(thisMon.getDate() - 7);
  return priorMon.toISOString().slice(0, 10);
}

export async function runTimesheetNonSubmissionCheck(): Promise<void> {
  const weekStart = priorWeekStart();

  const internalUsers = await db
    .select({ id: usersTable.id, name: usersTable.name, managerId: usersTable.managerId })
    .from(usersTable)
    .where(and(eq(usersTable.isActive, 1), ne(usersTable.role, "customer")));

  for (const user of internalUsers) {
    if (!user.managerId) continue;

    try {
      const [ts] = await db
        .select({ id: timesheetsTable.id, status: timesheetsTable.status })
        .from(timesheetsTable)
        .where(
          and(
            eq(timesheetsTable.userId, user.id),
            eq(timesheetsTable.weekStart, weekStart),
          ),
        );

      const needsAlert =
        !ts ||
        ts.status === "Draft" ||
        ts.status === "Rejected";

      if (!needsAlert) continue;

      const reason = !ts ? "not started" : ts.status.toLowerCase();
      const message = `${user.name ?? `User #${user.id}`} has not submitted a timesheet for the week of ${weekStart} (status: ${reason}).`;

      // Dedup: skip if this manager already has an identical notification for this week
      const existing = await db
        .select({ id: notificationsTable.id })
        .from(notificationsTable)
        .where(
          and(
            eq(notificationsTable.userId, user.managerId),
            eq(notificationsTable.type, "timesheet_non_submission"),
            eq(notificationsTable.message, message),
          ),
        )
        .limit(1);

      if (existing.length > 0) continue;

      await db.insert(notificationsTable).values({
        type: "timesheet_non_submission",
        message,
        userId: user.managerId,
        entityType: "timesheet",
        entityId: ts ? String(ts.id) : null,
        read: false,
      } as any);
    } catch (err) {
      logger.warn({ err, userId: user.id }, "non-submission check failed for user");
    }
  }
}
