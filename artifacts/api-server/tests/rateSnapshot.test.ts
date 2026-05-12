/**
 * Rate snapshot at timesheet approval — integration test.
 *
 * Rule 5: approving a timesheet must store the rate active on the
 * WORK DATE of each entry, not the rate active on the approval date.
 *
 * Setup:
 *  - Old rate card  effectiveDate="2025-01-01"  bill rate $100 for TEST_SNAP_ROLE
 *  - New rate card  effectiveDate="2026-04-01"  bill rate $200 for TEST_SNAP_ROLE
 *  - User with role TEST_SNAP_ROLE, costRate=$55
 *  - Time entry work date = "2025-06-01"  (after old card, before new card)
 *  - Approval date  = today (~May 2026)  (after new card effectiveDate)
 *
 * Expected:
 *  entry.appliedBillRate = 100  (old card, active on work date)
 *  entry.appliedCostRate = 55   (user.costRate at approval time)
 *
 * Run with:  pnpm --filter @workspace/api-server test
 */

import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import app from "../src/app.ts";
import {
  db,
  accountsTable,
  usersTable,
  projectsTable,
  timesheetsTable,
  timeEntriesTable,
  rateCardsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

describe("POST /api/timesheets/:id/approve — rate snapshot on work date", () => {
  let server: Server;
  let baseUrl: string;

  let pmUserId: number;
  let submitterUserId: number;
  let testProjectId: number;
  let oldCardId: number;
  let newCardId: number;
  let timesheetId: number;
  let entryId: number;

  const TEST_ROLE = `TEST_SNAP_ROLE_${Date.now()}`;

  before(async () => {
    server = app.listen(0);
    await new Promise<void>(r => server.once("listening", r));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const [acct] = await db.select().from(accountsTable).limit(1);
    assert.ok(acct, "seed must have at least one account");

    const seedUsers = await db.select().from(usersTable).limit(2);
    assert.ok(seedUsers.length >= 1, "seed must have at least one user");

    pmUserId = seedUsers[0].id;

    // Create a dedicated submitter with a known role + costRate
    const [sub] = await db.insert(usersTable).values({
      name:       "TEST_SNAP_SUBMITTER",
      email:      `snap_sub_${Date.now()}@test.invalid`,
      role:       TEST_ROLE,
      costRate:   "55.00",
      initials:   "TS",
      department: "",
      skills:     [],
    } as any).returning();
    submitterUserId = sub.id;

    // Old rate card — effective 2025-01-01, bill rate $100
    const [oldCard] = await db.insert(rateCardsTable).values({
      name:          `TEST_OLD_CARD_${Date.now()}`,
      currency:      "USD",
      status:        "Active",
      effectiveDate: "2025-01-01",
      defaultRate:   "80",
      roles:         [{ role: TEST_ROLE, rate: 100 }] as any,
    }).returning();
    oldCardId = oldCard.id;

    // New rate card — effective 2026-04-01, bill rate $200
    const [newCard] = await db.insert(rateCardsTable).values({
      name:          `TEST_NEW_CARD_${Date.now()}`,
      currency:      "USD",
      status:        "Active",
      effectiveDate: "2026-04-01",
      defaultRate:   "160",
      roles:         [{ role: TEST_ROLE, rate: 200 }] as any,
    }).returning();
    newCardId = newCard.id;

    // Project linked to the NEW card (current)
    const [proj] = await db.insert(projectsTable).values({
      accountId:     acct.id,
      name:          `TEST_SNAP_PROJ_${Date.now()}`,
      status:        "Active",
      ownerId:       pmUserId,
      startDate:     "2025-01-01",
      dueDate:       "2026-12-31",
      billingType:   "Fixed",
      budget:        "100000",
      budgetedHours: "1000",
      rateCardId:    newCardId,
    } as any).returning();
    testProjectId = proj.id;

    // Timesheet — Submitted, owned by submitter
    const [ts] = await db.insert(timesheetsTable).values({
      userId:      submitterUserId,
      weekStart:   "2025-06-02",
      weekEnd:     "2025-06-08",
      status:      "Submitted",
      totalHours:  "8",
      billableHours: "8",
      submittedAt: new Date(),
    } as any).returning();
    timesheetId = ts.id;

    // Time entry work date = 2025-06-01 (between old card 2025-01-01 and new card 2026-04-01)
    const [entry] = await db.insert(timeEntriesTable).values({
      userId:      submitterUserId,
      projectId:   testProjectId,
      timesheetId: timesheetId,
      date:        "2025-06-01",
      hours:       "8",
      description: "Feature work",
      billable:    true,
      approved:    false,
      rejected:    false,
      role:        TEST_ROLE,
    } as any).returning();
    entryId = entry.id;
  });

  after(async () => {
    await db.delete(timeEntriesTable).where(eq(timeEntriesTable.id, entryId)).catch(() => {});
    await db.delete(timesheetsTable).where(eq(timesheetsTable.id, timesheetId)).catch(() => {});
    await db.delete(projectsTable).where(eq(projectsTable.id, testProjectId)).catch(() => {});
    await db.delete(rateCardsTable).where(eq(rateCardsTable.id, oldCardId)).catch(() => {});
    await db.delete(rateCardsTable).where(eq(rateCardsTable.id, newCardId)).catch(() => {});
    await db.delete(usersTable).where(eq(usersTable.id, submitterUserId)).catch(() => {});
    server.close();
  });

  it("approve endpoint returns 200", async () => {
    const res = await fetch(`${baseUrl}/api/timesheets/${timesheetId}/approve`, {
      method:  "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id":    String(pmUserId),
        "x-user-role":  "account_admin",
      },
      body: JSON.stringify({}),
    });
    const body = await res.text();
    assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${body}`);
  });

  it("appliedBillRate is the old card rate (active on work date 2025-06-01), NOT the new card rate", async () => {
    // Small delay to let the fire-and-forget snapshot complete
    await new Promise(r => setTimeout(r, 500));

    const [entry] = await db
      .select()
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.id, entryId));

    assert.ok(entry, "entry must exist");

    const billRate = Number(entry.appliedBillRate);
    assert.equal(
      billRate,
      100,
      `Expected appliedBillRate=100 (old card, active on 2025-06-01), got ${billRate}. ` +
      `New card rate is 200 (only effective from 2026-04-01 — after the work date).`,
    );
  });

  it("appliedCostRate is the user costRate at approval time ($55)", async () => {
    const [entry] = await db
      .select()
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.id, entryId));

    const costRate = Number(entry.appliedCostRate);
    assert.equal(
      costRate,
      55,
      `Expected appliedCostRate=55, got ${costRate}`,
    );
  });

  it("re-approving (or re-snapshotting) does not overwrite existing rates (immutability)", async () => {
    // Manually change the DB value to simulate a later rate change
    await db.update(rateCardsTable)
      .set({ roles: [{ role: TEST_ROLE, rate: 999 }] as any })
      .where(eq(rateCardsTable.id, oldCardId));

    // Run the snapshot helper directly on the same timesheet
    const { snapshotRatesForTimesheet } = await import("../src/lib/snapshotRates.ts");
    await snapshotRatesForTimesheet(timesheetId);

    const [entry] = await db
      .select()
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.id, entryId));

    // Must still be 100 — the field was already set (non-null) so it is skipped
    assert.equal(
      Number(entry.appliedBillRate),
      100,
      "appliedBillRate must be immutable once set — rate card changes must not overwrite it",
    );
  });
});
