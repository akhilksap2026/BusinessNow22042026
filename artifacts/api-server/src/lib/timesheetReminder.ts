/**
 * WF-1 — Daily timesheet reminder cron.
 *
 * Reads reminder window from time_settings:
 *   reminderDaysBefore  — send pre-deadline reminder N days before timesheetDueDay
 *   reminderDaysAfter   — send follow-up alert N days after timesheetDueDay if still no entries
 *   timesheetDueDay     — e.g. "Monday"
 *
 * When today falls in the reminder window, finds every active internal user who
 * has logged zero time entries in the current ISO week and inserts a
 * `timesheet_reminder` in-app notification addressed to that user.
 *
 * Zero reminder values disable that leg (reminderDaysBefore=0 → no pre-reminder).
 */

import { eq, and, gte, lte, ne } from "drizzle-orm";
import { db, usersTable, timeEntriesTable, notificationsTable, timeSettingsTable } from "@workspace/db";
import { logger } from "./logger";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function isoWeekBounds(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun … 6=Sat
  const diffToMon = (day + 6) % 7;
  const mon = new Date(now);
  mon.setDate(now.getDate() - diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(mon), end: fmt(sun) };
}

function dayOfWeek(name: string): number {
  const i = DAY_NAMES.findIndex(d => d.toLowerCase() === name.toLowerCase());
  return i < 0 ? 1 : i; // default Monday
}

export async function runTimesheetReminders(): Promise<void> {
  const [settings] = await db.select().from(timeSettingsTable).limit(1);
  if (!settings) return;

  const { reminderDaysBefore, reminderDaysAfter, timesheetDueDay } = settings;
  if (!reminderDaysBefore && !reminderDaysAfter) return; // reminders disabled

  const todayJs = new Date().getDay(); // 0=Sun
  const dueDayJs = dayOfWeek(timesheetDueDay ?? "Monday");

  const beforeTriggerDay = ((dueDayJs - (reminderDaysBefore ?? 0) + 7) % 7);
  const afterTriggerDay  = ((dueDayJs + (reminderDaysAfter  ?? 0)) % 7);

  const isBeforeWindow = reminderDaysBefore && todayJs === beforeTriggerDay;
  const isAfterWindow  = reminderDaysAfter  && todayJs === afterTriggerDay;
  if (!isBeforeWindow && !isAfterWindow) return;

  const { start, end } = isoWeekBounds();

  const internalUsers = await db
    .select({ id: usersTable.id, name: usersTable.name })
    .from(usersTable)
    .where(and(eq(usersTable.isActive, 1), ne(usersTable.role, "customer")));

  for (const user of internalUsers) {
    try {
      const entries = await db
        .select({ id: timeEntriesTable.id })
        .from(timeEntriesTable)
        .where(
          and(
            eq(timeEntriesTable.userId, user.id),
            gte(timeEntriesTable.date, start),
            lte(timeEntriesTable.date, end),
          ),
        )
        .limit(1);

      if (entries.length > 0) continue; // already has time this week

      const msg = isAfterWindow
        ? `Reminder: you have not yet logged any time for the week of ${start}. Please submit before it's locked.`
        : `Heads-up: the timesheet deadline (${timesheetDueDay}) is approaching. Please log your time for the week of ${start}.`;

      await db.insert(notificationsTable).values({
        type: "timesheet_reminder",
        message: msg,
        userId: user.id,
        entityType: "timesheet",
        read: false,
      } as any);
    } catch (err) {
      logger.warn({ err, userId: user.id }, "timesheet reminder insert failed");
    }
  }
}
