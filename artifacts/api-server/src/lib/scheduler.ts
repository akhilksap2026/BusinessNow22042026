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

  logger.info({ timezone }, "Scheduler started: utilisation alerts at Mon 08:00");
}
