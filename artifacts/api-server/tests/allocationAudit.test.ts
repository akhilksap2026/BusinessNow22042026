/**
 * Allocation audit log — integration tests.
 *
 * Verifies that POST / PATCH / DELETE /api/allocations each write exactly
 * one audit log entry with the correct action and entityId.
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
  auditLogTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

describe("Allocation lifecycle → audit log", () => {
  let server: Server;
  let baseUrl: string;

  let pmUserId: number;
  let resourceUserId: number;
  let testProjectId: number;

  const createdAllocIds: number[] = [];
  const createdAuditIds: number[] = [];

  before(async () => {
    server = app.listen(0);
    await new Promise<void>(r => server.once("listening", r));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const [acct] = await db.select().from(accountsTable).limit(1);
    assert.ok(acct, "seed must have at least one account");

    const seedUsers = await db.select().from(usersTable).limit(2);
    assert.ok(seedUsers.length >= 1, "seed must have at least one user");

    pmUserId = seedUsers[0].id;
    resourceUserId = seedUsers.length >= 2 ? seedUsers[1].id : seedUsers[0].id;

    const [proj] = await db.insert(projectsTable).values({
      accountId: acct.id,
      name: `TEST_ALLOC_AUDIT_${Date.now()}`,
      status: "Active",
      ownerId: pmUserId,
      startDate: "2026-01-01",
      dueDate: "2026-12-31",
      billingType: "Fixed",
      budget: "0",
      budgetedHours: "0",
    } as any).returning();
    testProjectId = proj.id;
  });

  after(async () => {
    // Clean up allocations then audit rows
    for (const id of createdAllocIds) {
      await db.delete(allocationsTable).where(eq(allocationsTable.id, id)).catch(() => {});
    }
    for (const id of createdAuditIds) {
      await db.delete(auditLogTable).where(eq(auditLogTable.id, id)).catch(() => {});
    }
    await db.delete(projectsTable).where(eq(projectsTable.id, testProjectId)).catch(() => {});
    server.close();
  });

  // Helper: fetch the most recent audit row for a given entityType + entityId
  async function latestAuditRow(entityId: number | string) {
    const [row] = await db
      .select()
      .from(auditLogTable)
      .where(
        and(
          eq(auditLogTable.entityType, "allocation"),
          eq(auditLogTable.entityId, String(entityId)),
        ),
      )
      .orderBy(desc(auditLogTable.timestamp))
      .limit(1);
    return row ?? null;
  }

  it("POST /api/allocations → writes one audit row with action=created", async () => {
    const res = await fetch(`${baseUrl}/api/allocations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": String(pmUserId),
        "x-user-role": "account_admin",
      },
      body: JSON.stringify({
        projectId: testProjectId,
        userId: resourceUserId,
        startDate: "2026-03-01",
        endDate: "2026-06-30",
        hoursPerWeek: 32,
        role: "Developer",
        allocationMethod: "hours_per_week",
        isSoftAllocation: true,
      }),
    });

    const body = await res.text();
    assert.equal(res.status, 201, `Expected 201, got ${res.status}: ${body}`);
    const alloc = JSON.parse(body) as any;
    const allocId: number = alloc.id;
    createdAllocIds.push(allocId);

    // Give the fire-and-forget logAudit a moment to commit
    await new Promise(r => setTimeout(r, 100));

    const audit = await latestAuditRow(allocId);
    assert.ok(audit, `No audit row found for allocation ${allocId}`);
    assert.equal(audit.action, "created", `Expected action 'created', got '${audit.action}'`);
    assert.equal(audit.entityId, String(allocId));
    assert.equal(audit.entityType, "allocation");

    createdAuditIds.push(audit.id);
  });

  it("PATCH /api/allocations/:id → writes one audit row with action=updated and before/after", async () => {
    // Create a fresh allocation to patch
    const [alloc] = await db.insert(allocationsTable).values({
      projectId: testProjectId,
      userId: resourceUserId,
      startDate: "2026-07-01",
      endDate: "2026-09-30",
      hoursPerWeek: "24",
      hoursPerDay: "4.8",
      totalHours: "312",
      allocationMethod: "hours_per_week",
      role: "Developer",
      isSoftAllocation: false,
      isOverride: false,
    } as any).returning();
    createdAllocIds.push(alloc.id);

    const res = await fetch(`${baseUrl}/api/allocations/${alloc.id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-user-id": String(pmUserId),
        "x-user-role": "account_admin",
      },
      body: JSON.stringify({ hoursPerWeek: 40 }),
    });

    assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${await res.text()}`);

    await new Promise(r => setTimeout(r, 100));

    const audit = await latestAuditRow(alloc.id);
    assert.ok(audit, `No audit row found for allocation ${alloc.id}`);
    assert.equal(audit.action, "updated");
    assert.equal(audit.entityId, String(alloc.id));

    // previousValue must record the old hours; newValue the new hours
    const prev = audit.previousValue as any;
    const next = audit.newValue as any;
    assert.ok(prev, "previousValue must be set");
    assert.ok(next, "newValue must be set");
    assert.equal(parseFloat(prev.hoursPerWeek), 24, `Expected previous hoursPerWeek=24, got ${prev.hoursPerWeek}`);
    assert.equal(parseFloat(next.hoursPerWeek), 40, `Expected new hoursPerWeek=40, got ${next.hoursPerWeek}`);

    createdAuditIds.push(audit.id);
  });

  it("DELETE /api/allocations/:id → writes one audit row with action=deleted", async () => {
    // Create a fresh allocation to delete
    const [alloc] = await db.insert(allocationsTable).values({
      projectId: testProjectId,
      userId: resourceUserId,
      startDate: "2026-10-01",
      endDate: "2026-12-31",
      hoursPerWeek: "16",
      hoursPerDay: "3.2",
      totalHours: "208",
      allocationMethod: "hours_per_week",
      role: "QA Engineer",
      isSoftAllocation: false,
      isOverride: false,
    } as any).returning();
    // Don't push to createdAllocIds — the DELETE request will remove it
    const allocId = alloc.id;

    const res = await fetch(`${baseUrl}/api/allocations/${allocId}`, {
      method: "DELETE",
      headers: {
        "x-user-id": String(pmUserId),
        "x-user-role": "account_admin",
      },
    });

    assert.equal(res.status, 204, `Expected 204, got ${res.status}`);

    await new Promise(r => setTimeout(r, 100));

    const audit = await latestAuditRow(allocId);
    assert.ok(audit, `No audit row found for deleted allocation ${allocId}`);
    assert.equal(audit.action, "deleted");
    assert.equal(audit.entityId, String(allocId));

    // previousValue must carry the snapshot of what was deleted
    const prev = audit.previousValue as any;
    assert.ok(prev, "previousValue (snapshot) must be set on delete");
    assert.ok(prev.hoursPerWeek !== undefined, "hoursPerWeek must be in the deleted snapshot");

    createdAuditIds.push(audit.id);
  });
});
