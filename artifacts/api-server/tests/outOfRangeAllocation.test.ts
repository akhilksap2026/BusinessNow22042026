/**
 * Out-of-range allocation detection — integration test.
 *
 * Shortening a project's dueDate so that existing hard allocations fall
 * outside the new timeline must:
 *   - Set allocation.status = 'needs_review' on each orphaned allocation.
 *   - Create exactly ONE consolidated notification to the project PM.
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
  notificationsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

describe("PATCH /api/projects/:id — out-of-range allocation detection", () => {
  let server: Server;
  let baseUrl: string;

  let pmUserId: number;
  let resourceUserId: number;
  let testProjectId: number;
  let allocId1: number;
  let allocId2: number;

  const originalStart = "2025-01-01";
  const originalEnd = "2025-12-31";
  // Shortening to March — the two allocations run through June, so both are orphaned.
  const newEnd = "2025-03-31";

  before(async () => {
    const [acct] = await db.select().from(accountsTable).limit(1);
    assert.ok(acct, "seed must have at least one account");

    const seedUsers = await db.select().from(usersTable).limit(2);
    assert.ok(seedUsers.length >= 1, "seed must have at least one user");

    pmUserId = seedUsers[0].id;
    resourceUserId = seedUsers.length >= 2 ? seedUsers[1].id : seedUsers[0].id;

    // Project owned by pmUser with a full-year timeline.
    const [proj] = await db.insert(projectsTable).values({
      accountId: acct.id,
      name: "TEST_OUT_OF_RANGE_PROJECT",
      status: "Active",
      ownerId: pmUserId,
      startDate: originalStart,
      dueDate: originalEnd,
      billingType: "Fixed",
      budget: "0",
      budgetedHours: "0",
    } as any).returning();
    testProjectId = proj.id;

    // Two hard allocations that run through June — both fall outside the new March end.
    const [a1] = await db.insert(allocationsTable).values({
      projectId: testProjectId,
      userId: resourceUserId,
      startDate: "2025-01-01",
      endDate: "2025-06-30",
      hoursPerWeek: "32",
      hoursPerDay: "6.4",
      totalHours: "832",
      allocationMethod: "hours_per_week",
      role: "Developer",
      isSoftAllocation: false,
      isOverride: false,
    } as any).returning();
    allocId1 = a1.id;

    const [a2] = await db.insert(allocationsTable).values({
      projectId: testProjectId,
      userId: pmUserId,
      startDate: "2025-02-01",
      endDate: "2025-06-30",
      hoursPerWeek: "20",
      hoursPerDay: "4",
      totalHours: "480",
      allocationMethod: "hours_per_week",
      role: "PM",
      isSoftAllocation: false,
      isOverride: false,
    } as any).returning();
    allocId2 = a2.id;

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    // Clean up notifications created by this test.
    await db.delete(notificationsTable)
      .where(and(
        eq(notificationsTable.entityType, "project"),
        eq(notificationsTable.entityId, String(testProjectId)),
        eq(notificationsTable.type, "out_of_range_allocation"),
      ))
      .catch(() => {});
    if (allocId1) await db.delete(allocationsTable).where(eq(allocationsTable.id, allocId1)).catch(() => {});
    if (allocId2) await db.delete(allocationsTable).where(eq(allocationsTable.id, allocId2)).catch(() => {});
    if (testProjectId) await db.delete(projectsTable).where(eq(projectsTable.id, testProjectId)).catch(() => {});
    if (server) await new Promise<void>((r) => server.close(() => r()));
  });

  it("shortening project dueDate sets both allocations to needs_review and creates 1 notification", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-user-id": String(pmUserId),
        "x-user-role": "account_admin",
      },
      body: JSON.stringify({ dueDate: newEnd }),
    });

    assert.equal(res.status, 200, `PATCH failed: ${await res.text()}`);

    // Allow the fire-and-forget helper to complete.
    await new Promise(r => setTimeout(r, 80));

    // Both allocations must be marked needs_review.
    const [upd1] = await db
      .select({ status: allocationsTable.status })
      .from(allocationsTable)
      .where(eq(allocationsTable.id, allocId1));
    assert.equal((upd1 as any).status, "needs_review",
      `allocation ${allocId1} must be 'needs_review'`);

    const [upd2] = await db
      .select({ status: allocationsTable.status })
      .from(allocationsTable)
      .where(eq(allocationsTable.id, allocId2));
    assert.equal((upd2 as any).status, "needs_review",
      `allocation ${allocId2} must be 'needs_review'`);

    // Exactly one consolidated notification to the PM.
    const notifs = await db
      .select()
      .from(notificationsTable)
      .where(and(
        eq(notificationsTable.entityType, "project"),
        eq(notificationsTable.entityId, String(testProjectId)),
        eq(notificationsTable.type, "out_of_range_allocation"),
      ));

    assert.equal(notifs.length, 1,
      `expected exactly 1 notification, got ${notifs.length}: ${JSON.stringify(notifs)}`);
    assert.equal(notifs[0].userId, pmUserId,
      "notification must be addressed to the project PM");
    assert.ok(
      notifs[0].message.includes("2") && notifs[0].message.includes("TEST_OUT_OF_RANGE_PROJECT"),
      `message must mention count and project name: ${notifs[0].message}`,
    );
  });
});
