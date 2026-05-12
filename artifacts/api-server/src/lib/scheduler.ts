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

  logger.info({ timezone }, "Scheduler started: utilisation Mon 08:00, escalations daily 09:00");
}
