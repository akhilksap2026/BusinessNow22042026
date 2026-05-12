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

import { eq, and, isNull } from "drizzle-orm";
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
  // Only fetch entries that have NOT yet been snapshotted (immutability guard).
  const entries = await db
    .select()
    .from(timeEntriesTable)
    .where(
      and(
        eq(timeEntriesTable.timesheetId, timesheetId),
        isNull(timeEntriesTable.appliedBillRate),
      ),
    );

  if (entries.length === 0) return;

  // Prefetch all rate cards and relevant projects + users in bulk.
  const [allCards, allUsers, allProjects] = await Promise.all([
    db.select().from(rateCardsTable),
    db.select({ id: usersTable.id, role: usersTable.role, costRate: usersTable.costRate }).from(usersTable),
    db.select({ id: projectsTable.id, rateCardId: projectsTable.rateCardId }).from(projectsTable),
  ]);

  for (const entry of entries) {
    const workDate  = entry.date;
    const user      = allUsers.find(u => u.id === entry.userId);
    const project   = entry.projectId ? allProjects.find(p => p.id === entry.projectId) : undefined;
    const fallbackCardId = project?.rateCardId ?? null;

    // Effective role: entry.role overrides user.role (some entries carry a
    // project-specific role override already stored on the entry itself).
    const effectiveRole = entry.role ?? user?.role ?? null;

    const card     = resolveCardForDate(allCards, workDate, fallbackCardId);
    const billRate = card ? billRateFromCard(card, effectiveRole) : 0;
    const costRate = user ? Number(user.costRate) : 0;

    await db.update(timeEntriesTable)
      .set({
        appliedBillRate: String(billRate),
        appliedCostRate: String(costRate),
      })
      .where(
        and(
          eq(timeEntriesTable.id, entry.id),
          isNull(timeEntriesTable.appliedBillRate), // race-safe: double-check still null
        ),
      );
  }
}
