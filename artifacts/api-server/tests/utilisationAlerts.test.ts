/**
 * Utilisation variance alerts — integration test.
 *
 * A resource who logged 20h billable out of 40h working capacity for the
 * prior week (50% utilisation, below the 60% threshold) must generate at
 * least one under_utilisation notification for their manager / admin users.
 *
 * Run with:  pnpm --filter @workspace/api-server test
 */

import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";

import {
  db,
  accountsTable,
  usersTable,
  timesheetsTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { runUtilisationAlerts, UNDER_UTIL_THRESHOLD, TARGET_UTIL } from "../src/lib/utilisationAlerts.ts";

describe("runUtilisationAlerts — under-utilisation notification", () => {
  // Test week: use a Monday well in the past so it never collides with live data.
  const TEST_WEEK_START = "2024-01-08"; // Monday 8 Jan 2024

  let resourceUserId: number;
  let managerUserId: number;
  let testTimesheetId: number;
  const createdNotifIds: number[] = [];

  before(async () => {
    const [acct] = await db.select().from(accountsTable).limit(1);
    assert.ok(acct, "seed must have at least one account");

    // Create the manager first (account_admin so they also act as Resource Manager)
    const [mgr] = await db.insert(usersTable).values({
      name:         "TEST_UTIL_MANAGER",
      initials:     "TM",
      role:         "account_admin",
      email:        `util_mgr_${Date.now()}@test.invalid`,
      department:   "Management",
      capacity:     40,
      isActive:     1,
      isInternal:   true,
    } as any).returning();
    managerUserId = mgr.id;

    // Create the resource, pointing at the manager as their timesheet approver
    const [resource] = await db.insert(usersTable).values({
      name:                    "TEST_UTIL_RESOURCE",
      initials:                "TR",
      role:                    "super_user",
      email:                   `util_resource_${Date.now()}@test.invalid`,
      department:              "Engineering",
      capacity:                40,        // 40 h/wk working hours
      isActive:                1,
      isInternal:              true,
      timesheetApproverUserId: managerUserId,
    } as any).returning();
    resourceUserId = resource.id;

    // Approved timesheet for the test week with 20h billable (50% utilisation)
    const [ts] = await db.insert(timesheetsTable).values({
      userId:        resourceUserId,
      weekStart:     TEST_WEEK_START,
      status:        "Approved",
      totalHours:    "20",
      billableHours: "20",   // 20h billable / 40h capacity = 50% < 60% threshold
    } as any).returning();
    testTimesheetId = ts.id;
  });

  after(async () => {
    // Clean up in reverse-dependency order
    for (const id of createdNotifIds) {
      await db.delete(notificationsTable).where(eq(notificationsTable.id, id)).catch(() => {});
    }
    await db.delete(timesheetsTable).where(eq(timesheetsTable.id, testTimesheetId)).catch(() => {});
    await db.delete(usersTable).where(eq(usersTable.id, resourceUserId)).catch(() => {});
    await db.delete(usersTable).where(eq(usersTable.id, managerUserId)).catch(() => {});
  });

  it("generates an under_utilisation notification for the manager when billable hours are below threshold", async () => {
    await runUtilisationAlerts(TEST_WEEK_START);

    // There should be at least one notification addressed to the manager
    const notifs = await db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId,     managerUserId),
          eq(notificationsTable.entityType, "user"),
          eq(notificationsTable.entityId,   String(resourceUserId)),
        ),
      );

    assert.ok(notifs.length >= 1, `Expected at least 1 notification for the manager, got ${notifs.length}`);

    const notif = notifs[0];
    assert.equal(notif.type, "under_utilisation", `Expected type 'under_utilisation', got '${notif.type}'`);
    assert.ok(
      notif.message.includes("TEST_UTIL_RESOURCE"),
      `Notification message should mention the resource name: "${notif.message}"`,
    );
    assert.ok(
      notif.message.includes("50%"),
      `Notification message should include the utilisation percentage: "${notif.message}"`,
    );
    assert.ok(
      notif.message.includes(`${Math.round(TARGET_UTIL * 100)}%`),
      `Notification message should include the target utilisation: "${notif.message}"`,
    );

    // Track for cleanup
    for (const n of notifs) createdNotifIds.push(n.id);
  });

  it("does NOT generate an alert for a resource whose utilisation is within the acceptable band", async () => {
    // Create a separate user with a 40h/40h timesheet (100% utilisation — within range)
    const [okUser] = await db.insert(usersTable).values({
      name:       "TEST_UTIL_OK_RESOURCE",
      initials:   "TO",
      role:       "super_user",
      email:      `util_ok_${Date.now()}@test.invalid`,
      department: "Engineering",
      capacity:   40,
      isActive:   1,
      isInternal: true,
    } as any).returning();

    const [okTs] = await db.insert(timesheetsTable).values({
      userId:        okUser.id,
      weekStart:     TEST_WEEK_START,
      status:        "Approved",
      totalHours:    "40",
      billableHours: "40",  // 100% — exactly at OVER_UTIL_THRESHOLD, no alert expected
    } as any).returning();

    try {
      await runUtilisationAlerts(TEST_WEEK_START);

      const notifs = await db
        .select()
        .from(notificationsTable)
        .where(
          and(
            eq(notificationsTable.entityType, "user"),
            eq(notificationsTable.entityId,   String(okUser.id)),
          ),
        );

      // 100% utilisation is exactly at the boundary — no alert (> threshold only fires alert)
      assert.equal(notifs.length, 0, `Expected 0 notifications for OK-utilisation resource, got ${notifs.length}`);
    } finally {
      await db.delete(timesheetsTable).where(eq(timesheetsTable.id, okTs.id)).catch(() => {});
      await db.delete(usersTable).where(eq(usersTable.id, okUser.id)).catch(() => {});
    }
  });
});
