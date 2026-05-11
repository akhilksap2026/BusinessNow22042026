/**
 * Time-off / allocation conflict detection — integration test.
 *
 * Approving a time-off request that overlaps a hard allocation must:
 *   - Create exactly one notification per affected project PM.
 *   - Set allocation.status = 'at_risk' on each conflicting allocation.
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
  allocationsTable,
  timeOffRequestsTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

describe("PATCH /api/time-off-requests/:id — allocation conflict check", () => {
  let server: Server;
  let baseUrl: string;

  // pmUser = project owner (approves the leave, receives the PM notification)
  // resourceUser = the person taking leave (owns the allocation + time-off)
  let pmUserId: number;
  let resourceUserId: number;
  let testProjectId: number;
  let testAllocId: number;
  let testTimeOffId: number;

  before(async () => {
    const [acct] = await db.select().from(accountsTable).limit(1);
    assert.ok(acct, "seed must have at least one account");

    const seedUsers = await db.select().from(usersTable).limit(2);
    assert.ok(seedUsers.length >= 1, "seed must have at least one user");

    pmUserId = seedUsers[0].id;

    // Resource is the second seed user, or a freshly-inserted one.
    if (seedUsers.length >= 2) {
      resourceUserId = seedUsers[1].id;
    } else {
      const [u] = await db.insert(usersTable).values({
        name: "TEST_TIMEOFF_RESOURCE",
        email: `timeoff_resource_${Date.now()}@test.invalid`,
        role: "Developer",
        capacity: 40,
      } as any).returning();
      resourceUserId = u.id;
    }

    // Project owned by pmUser.
    const today = new Date().toISOString().slice(0, 10);
    const far = new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10);
    const [proj] = await db.insert(projectsTable).values({
      accountId: acct.id,
      name: "TEST_TIMEOFF_CONFLICT_PROJECT",
      status: "Active",
      ownerId: pmUserId,
      startDate: today,
      dueDate: far,
      billingType: "Fixed",
      budget: "0",
      budgetedHours: "0",
    } as any).returning();
    testProjectId = proj.id;

    // Hard allocation for resourceUser on that project — overlaps the leave range.
    // Leave will be 2025-03-10 → 2025-03-14; alloc covers 2025-03-01 → 2025-03-31.
    const [alloc] = await db.insert(allocationsTable).values({
      projectId: testProjectId,
      userId: resourceUserId,
      startDate: "2025-03-01",
      endDate: "2025-03-31",
      hoursPerWeek: "32",
      hoursPerDay: "6.4",
      totalHours: "160",
      allocationMethod: "hours_per_week",
      role: "Developer",
      isSoftAllocation: false,
      isOverride: false,
    } as any).returning();
    testAllocId = alloc.id;

    // Time-off request for resourceUser — Pending, will be approved via PATCH.
    const [tor] = await db.insert(timeOffRequestsTable).values({
      userId: resourceUserId,
      type: "Annual Leave",
      startDate: "2025-03-10",
      endDate: "2025-03-14",
      status: "Pending",
      reason: "Integration test leave",
    } as any).returning();
    testTimeOffId = tor.id;

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    // Clean up conflict notifications created by the test.
    await db.delete(notificationsTable)
      .where(and(
        eq(notificationsTable.entityType, "allocation"),
        eq(notificationsTable.entityId, String(testAllocId)),
      ))
      .catch(() => {});
    if (testTimeOffId) {
      await db.delete(timeOffRequestsTable).where(eq(timeOffRequestsTable.id, testTimeOffId)).catch(() => {});
    }
    if (testAllocId) {
      await db.delete(allocationsTable).where(eq(allocationsTable.id, testAllocId)).catch(() => {});
    }
    if (testProjectId) {
      await db.delete(projectsTable).where(eq(projectsTable.id, testProjectId)).catch(() => {});
    }
    if (server) await new Promise<void>((r) => server.close(() => r()));
  });

  it("(a) approving leave overlapping a hard allocation notifies PM and marks allocation at_risk", async () => {
    // Approve as pmUser (different from resourceUser — satisfies self-approval guard).
    const res = await fetch(`${baseUrl}/api/time-off-requests/${testTimeOffId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-user-id": String(pmUserId),
        "x-user-role": "account_admin",
      },
      body: JSON.stringify({ status: "Approved" }),
    });

    assert.equal(res.status, 200, `approve failed: ${await res.text()}`);

    // Allow async writes to settle.
    await new Promise(r => setTimeout(r, 60));

    // One conflict notification must exist for the PM on the allocation.
    const notifs = await db
      .select()
      .from(notificationsTable)
      .where(and(
        eq(notificationsTable.entityType, "allocation"),
        eq(notificationsTable.entityId, String(testAllocId)),
        eq(notificationsTable.type, "leave_allocation_conflict"),
      ));

    assert.equal(notifs.length, 1,
      `expected 1 conflict notification, found ${notifs.length}: ${JSON.stringify(notifs)}`);
    assert.equal(notifs[0].userId, pmUserId,
      "notification must be addressed to the project PM");
    assert.ok(
      notifs[0].message.includes("2025-03-10") && notifs[0].message.includes("2025-03-14"),
      `notification must mention the leave dates: ${notifs[0].message}`,
    );

    // Allocation must be marked at_risk.
    const [updatedAlloc] = await db
      .select({ status: allocationsTable.status } as any)
      .from(allocationsTable)
      .where(eq(allocationsTable.id, testAllocId));

    assert.equal((updatedAlloc as any).status, "at_risk",
      "allocation.status must be 'at_risk' after leave conflict is detected");
  });
});
