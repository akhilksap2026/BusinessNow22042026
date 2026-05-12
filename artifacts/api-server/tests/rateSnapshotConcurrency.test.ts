/**
 * Sprint 2 / Phase 8.3 — snapshotRatesForTimesheet must be safe under
 * concurrent calls for the same timesheet (advisory lock + double-check
 * predicate keeps appliedBillRate from being written twice).
 */

import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";

import { snapshotRatesForTimesheet } from "../src/lib/snapshotRates";
import { db, accountsTable, usersTable, projectsTable, timesheetsTable, timeEntriesTable, rateCardsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

describe("rate snapshot concurrency", () => {
  let projectId: number;
  let timesheetId: number;
  let entryId: number;
  let adminId: number;
  let cardId: number;

  before(async () => {
    const [acct] = await db.select().from(accountsTable).limit(1);
    const [admin] = await db.select().from(usersTable).where(eq(usersTable.role, "Admin")).limit(1);
    adminId = (admin ?? (await db.select().from(usersTable).limit(1))[0]).id;

    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const [card] = await db.insert(rateCardsTable).values({
      name: "TST_RSC_CARD", currency: "USD", defaultRate: "100", effectiveDate: today, roles: [],
    } as any).returning();
    cardId = card.id;

    const [p] = await db.insert(projectsTable).values({
      accountId: acct.id, ownerId: adminId, startDate: today, dueDate: due,
      billingType: "T&M", budget: "0", budgetedHours: "0",
      name: "TEST_RSC_PROJECT", status: "active", rateCardId: cardId,
    } as any).returning();
    projectId = p.id;

    const [ts] = await db.insert(timesheetsTable).values({
      userId: adminId, weekStart: today, status: "Approved", totalHours: "1", billableHours: "1",
    } as any).returning();
    timesheetId = ts.id;

    const [e] = await db.insert(timeEntriesTable).values({
      userId: adminId, projectId, timesheetId, hours: "1", date: today,
      description: "rsc", billable: true, approved: true, rejected: false,
    } as any).returning();
    entryId = e.id;
  });

  after(async () => {
    await db.delete(timeEntriesTable).where(eq(timeEntriesTable.id, entryId)).catch(() => {});
    await db.delete(timesheetsTable).where(eq(timesheetsTable.id, timesheetId)).catch(() => {});
    await db.delete(projectsTable).where(eq(projectsTable.id, projectId)).catch(() => {});
    await db.delete(rateCardsTable).where(eq(rateCardsTable.id, cardId)).catch(() => {});
  });

  it("two concurrent snapshot calls produce exactly one snapshot per entry", async () => {
    await Promise.all([
      snapshotRatesForTimesheet(timesheetId),
      snapshotRatesForTimesheet(timesheetId),
      snapshotRatesForTimesheet(timesheetId),
    ]);
    const [row] = await db.select().from(timeEntriesTable).where(eq(timeEntriesTable.id, entryId));
    assert.notEqual(row.appliedBillRate, null, "snapshot must be set");
    assert.equal(Number(row.appliedBillRate), 100, "rate matches card default");
  });

  it("re-running snapshot is a no-op (immutability)", async () => {
    const [before] = await db.select().from(timeEntriesTable).where(eq(timeEntriesTable.id, entryId));
    await snapshotRatesForTimesheet(timesheetId);
    const [after] = await db.select().from(timeEntriesTable).where(eq(timeEntriesTable.id, entryId));
    assert.equal(after.appliedBillRate, before.appliedBillRate);
    assert.equal(after.appliedCostRate, before.appliedCostRate);
  });
});
