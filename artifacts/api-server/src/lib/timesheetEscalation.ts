/**
 * Sprint 2 / Phase 8.4 — Daily SLA escalation for stale Submitted timesheets.
 *
 * Finds timesheets that have been in Submitted status for longer than
 * `STALE_DAYS` and notifies the requester's manager (users.managerId).
 * If the user has no manager set, no escalation fires (we don't assume an
 * org-wide admin should be paged for every stuck timesheet).
 *
 * Notification deduplication: we set timesheets.escalatedAt the first time
 * we notify, so subsequent runs skip already-escalated rows. Reset to NULL
 * on any status change away from Submitted (handled in the timesheets route
 * via existing Date update — kept as a follow-up if churn shows up).
 */

import { eq, and, isNull, lt, isNotNull } from "drizzle-orm";
import { db, timesheetsTable, usersTable, notificationsTable } from "@workspace/db";
import { logger } from "./logger";

const STALE_DAYS = 5;

export async function runTimesheetEscalations(): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_DAYS * 86400_000);
  const stale = await db
    .select()
    .from(timesheetsTable)
    .where(
      and(
        eq(timesheetsTable.status, "Submitted"),
        isNotNull(timesheetsTable.submittedAt),
        lt(timesheetsTable.submittedAt, cutoff),
        isNull(timesheetsTable.escalatedAt),
      ),
    );

  if (stale.length === 0) return;

  for (const t of stale) {
    try {
      const [requester] = await db.select({ managerId: usersTable.managerId, name: usersTable.name })
        .from(usersTable).where(eq(usersTable.id, t.userId));
      if (!requester?.managerId) continue;

      await db.insert(notificationsTable).values({
        type: "timesheet_escalation",
        message: `Timesheet for ${requester.name ?? "team member"} (week of ${t.weekStart}) has been awaiting approval for over ${STALE_DAYS} days.`,
        userId: requester.managerId,
        entityType: "timesheet",
        entityId: String(t.id),
        read: false,
      } as any);

      await db.update(timesheetsTable)
        .set({ escalatedAt: new Date() } as any)
        .where(eq(timesheetsTable.id, t.id));
    } catch (err) {
      logger.warn({ err, timesheetId: t.id }, "timesheet escalation failed");
    }
  }
}
