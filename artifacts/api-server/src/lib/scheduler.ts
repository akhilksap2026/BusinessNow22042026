/**
 * Application scheduler.
 *
 * Reads the org timezone from company_settings, then registers all cron jobs.
 * Called once from index.ts after the HTTP server starts listening.
 * Not imported by app.ts so that tests remain unaffected.
 */

import cron from "node-cron";
import { db, companySettingsTable } from "@workspace/db";
import { logger } from "./logger";
import { runUtilisationAlerts } from "./utilisationAlerts";
import { runTimesheetEscalations } from "./timesheetEscalation";
import { runTimesheetReminders } from "./timesheetReminder";
import { runTimesheetNonSubmissionCheck } from "./timesheetNonSubmission";
import { runInvoiceOverdueCheck } from "./invoiceOverdue";

export async function startScheduler(): Promise<void> {
  const [settings] = await db
    .select({ timezone: companySettingsTable.timezone })
    .from(companySettingsTable)
    .limit(1);

  const timezone = settings?.timezone ?? "America/Toronto";

  // Utilisation variance alerts — every Monday at 08:00 org timezone
  cron.schedule(
    "0 8 * * 1",
    () => { void runUtilisationAlerts(); },
    { timezone },
  );

  // Sprint 2 / Phase 8.4 — Timesheet SLA escalation, daily at 09:00 org tz
  cron.schedule(
    "0 9 * * *",
    () => { void runTimesheetEscalations(); },
    { timezone },
  );

  // WF-1 — Timesheet reminder cron, daily at 08:30 org tz.
  // Fires only on days matching reminderDaysBefore / reminderDaysAfter windows.
  cron.schedule(
    "30 8 * * *",
    () => { void runTimesheetReminders(); },
    { timezone },
  );

  // WF-5 — Non-submission detection cron, daily at 10:00 org tz.
  // Detects active users who have no submitted timesheet for the prior week.
  cron.schedule(
    "0 10 * * *",
    () => { void runTimesheetNonSubmissionCheck(); },
    { timezone },
  );

  // INV-5 — Invoice overdue detection, daily at 01:00 org tz.
  cron.schedule(
    "0 1 * * *",
    () => { void runInvoiceOverdueCheck(); },
    { timezone },
  );

  logger.info({ timezone }, "Scheduler started: utilisation Mon 08:00, escalations 09:00, reminders 08:30, non-submission 10:00, overdue 01:00");
}
