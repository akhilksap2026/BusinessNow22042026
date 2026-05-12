/**
 * Rate Snapshotting — captures the bill rate and cost rate active on each
 * time entry's WORK DATE at the moment a timesheet is approved.
 *
 * Rules:
 *  - Bill rate: most recent rate card whose effectiveDate <= entry.date.
 *    Falls back to the project's current rate card, then any card.
 *  - Cost rate: the resource's user.costRate at approval time.
 *  - Once set (appliedBillRate IS NOT NULL), fields are immutable — entries
 *    already snapshotted are skipped (Rule 2c).
 *  - Errors are swallowed; snapshotting must never block the approve response.
 */

import { eq, and, isNull, sql } from "drizzle-orm";
import { db, timeEntriesTable, projectsTable, rateCardsTable, usersTable } from "@workspace/db";

type RateCard = typeof rateCardsTable.$inferSelect;

/**
 * Find the rate card whose effectiveDate is the most recent one that is
 * still <= workDate ("the card in effect on that day").
 *
 * Falls back to `fallbackCardId` (the project's current card) if no
 * historical card is found, then to any card in the system.
 */
function resolveCardForDate(allCards: RateCard[], workDate: string, fallbackCardId: number | null): RateCard | undefined {
  const eligible = allCards
    .filter(rc => rc.effectiveDate != null && rc.effectiveDate <= workDate)
    .sort((a, b) => (b.effectiveDate ?? "").localeCompare(a.effectiveDate ?? ""));

  if (eligible.length > 0) return eligible[0];

  // Fallback 1: the card the project currently points at
  if (fallbackCardId != null) {
    const current = allCards.find(rc => rc.id === fallbackCardId);
    if (current) return current;
  }

  // Fallback 2: any card in the system
  return allCards[0];
}

/**
 * Look up the bill rate for a given role in a rate card.
 * Falls back to the card's defaultRate if the role has no explicit entry.
 */
function billRateFromCard(card: RateCard, role: string | null): number {
  const roles = (card.roles as { role: string; rate: number }[]) ?? [];
  const entry = role ? roles.find(r => r.role === role) : undefined;
  return entry ? entry.rate : Number(card.defaultRate ?? 0);
}

export async function snapshotRatesForTimesheet(timesheetId: number): Promise<void> {
  // Sprint 2 / Phase 8.3 — Wrap the whole snapshot in a single transaction
  // and serialise concurrent calls for the same timesheet via a Postgres
  // advisory transaction lock. Two concurrent approve handlers for the same
  // timesheet would otherwise both read entries with appliedBillRate = NULL
  // and race; the second now blocks until the first commits, then sees zero
  // un-snapshotted entries and exits cleanly. The double-check predicate
  // (isNull(appliedBillRate)) on the per-row UPDATE remains as a belt-and-
  // braces guarantee.
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${timesheetId})`);

    const entries = await tx
      .select()
      .from(timeEntriesTable)
      .where(
        and(
          eq(timeEntriesTable.timesheetId, timesheetId),
          isNull(timeEntriesTable.appliedBillRate),
        ),
      );

    if (entries.length === 0) return;

    const [allCards, allUsers, allProjects] = await Promise.all([
      tx.select().from(rateCardsTable),
      tx.select({ id: usersTable.id, role: usersTable.role, costRate: usersTable.costRate }).from(usersTable),
      tx.select({ id: projectsTable.id, rateCardId: projectsTable.rateCardId }).from(projectsTable),
    ]);

    for (const entry of entries) {
      const workDate  = entry.date;
      const user      = allUsers.find(u => u.id === entry.userId);
      const project   = entry.projectId ? allProjects.find(p => p.id === entry.projectId) : undefined;
      const fallbackCardId = project?.rateCardId ?? null;
      const effectiveRole = entry.role ?? user?.role ?? null;

      const card     = resolveCardForDate(allCards, workDate, fallbackCardId);
      const billRate = card ? billRateFromCard(card, effectiveRole) : 0;
      const costRate = user ? Number(user.costRate) : 0;

      await tx.update(timeEntriesTable)
        .set({ appliedBillRate: String(billRate), appliedCostRate: String(costRate) })
        .where(
          and(
            eq(timeEntriesTable.id, entry.id),
            isNull(timeEntriesTable.appliedBillRate),
          ),
        );
    }
  });
}
