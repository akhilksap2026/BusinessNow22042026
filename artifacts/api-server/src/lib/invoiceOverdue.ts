/**
 * INV-5 — Daily overdue invoice detection cron.
 *
 * Finds invoices with status "Sent" whose dueDate has passed and transitions
 * them to "Overdue" automatically. Logs an audit entry for each transition.
 * Fires daily at 01:00 org timezone via scheduler.ts.
 */

import { eq, and, lt } from "drizzle-orm";
import { db, invoicesTable } from "@workspace/db";
import { logAudit } from "./audit";
import { logger } from "./logger";

export async function runInvoiceOverdueCheck(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  const sentInvoices = await db
    .select()
    .from(invoicesTable)
    .where(
      and(
        eq(invoicesTable.status, "Sent"),
        lt(invoicesTable.dueDate, today),
      ),
    );

  if (sentInvoices.length === 0) return;

  for (const inv of sentInvoices) {
    try {
      await db
        .update(invoicesTable)
        .set({ status: "Overdue", updatedAt: new Date() } as any)
        .where(eq(invoicesTable.id, inv.id));

      await logAudit({
        entityType: "invoice",
        entityId: inv.id,
        action: "status_changed",
        description: `Invoice ${inv.id} automatically marked Overdue (due ${inv.dueDate})`,
        previousValue: { status: "Sent" },
        newValue: { status: "Overdue" },
      });
    } catch (err) {
      logger.warn({ err, invoiceId: inv.id }, "invoice overdue transition failed");
    }
  }

  logger.info({ count: sentInvoices.length }, "Invoice overdue check complete");
}
