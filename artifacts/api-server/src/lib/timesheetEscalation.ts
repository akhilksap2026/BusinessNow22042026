/**
 * Sprint 2 / Phase 8.4 — Daily SLA escalation for stale Submitted timesheets.
 *
 * Finds timesheets that have been in Submitted status for longer than the
 * configured `time_settings.escalation_days_after` threshold (default 5)
 * and notifies the requester's manager (`users.managerId`). If the user
 * has no manager set, no escalation fires (we don't assume an org-wide
 * admin should be paged for every stuck timesheet).
 *
 * Setting `escalation_days_after` to 0 disables escalation entirely
 * (used as a kill-switch for orgs that don't want SLA paging).
 *
 * Notification deduplication: we set `timesheets.escalatedAt` the first
 * time we notify, so subsequent runs skip already-escalated rows. The
 * timesheets route resets `escalatedAt` to NULL on every status transition
 * away from Submitted (and on resubmit), so a withdraw + resubmit re-arms
 * escalation correctly.
 */

import { eq, and, isNull, lt, isNotNull } from "drizzle-orm";
import { db, timesheetsTable, usersTable, notificationsTable, timeSettingsTable } from "@workspace/db";
import { logger } from "./logger";

const DEFAULT_STALE_DAYS = 5;

async function getStaleDays(): Promise<number> {
  try {
    const [row] = await db.select({ d: timeSettingsTable.escalationDaysAfter })
      .from(timeSettingsTable).limit(1);
    const v = row?.d;
    return typeof v === "number" && v > 0 ? v : DEFAULT_STALE_DAYS;
  } catch {
    return DEFAULT_STALE_DAYS;
  }
}

export async function runTimesheetEscalations(): Promise<void> {
  const staleDays = await getStaleDays();
  if (staleDays <= 0) return; // disabled
  const cutoff = new Date(Date.now() - staleDays * 86400_000);
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
        message: `Timesheet for ${requester.name ?? "team member"} (week of ${t.weekStart}) has been awaiting approval for over ${staleDays} days.`,
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
