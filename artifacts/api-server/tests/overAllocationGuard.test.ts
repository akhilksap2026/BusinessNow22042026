/**
 * Over-allocation guard — tests.
 *
 * (a) Attempting to create a hard allocation that exceeds the resource's
 *     available capacity returns HTTP 409 { error: 'over_allocation' }.
 * (b) Supplying forceOverride:true + overrideReason as an account_admin
 *     succeeds (201) and sets isOverride=true on the row.
 *
 * Run with:  pnpm --filter @workspace/api-server test
 */

import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import app from "../src/app.ts";
import { db, allocationsTable, projectsTable, usersTable, accountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const BASE_HEADERS = {
  "content-type": "application/json",
  "x-user-id": "1",
  "x-user-role": "account_admin",
};

describe("POST /api/allocations — over-allocation guard", () => {
  let server: Server;
  let baseUrl: string;
  let testUserId: number;
  let testProjectId: number;
  let existingAllocId: number | null = null;
  const createdAllocIds: number[] = [];

  before(async () => {
    const [acct] = await db.select().from(accountsTable).limit(1);
    const [user] = await db.select().from(usersTable).limit(1);
    assert.ok(acct && user, "seed must contain at least one account and user");
    testUserId = user.id;

    // Create a test project
    const today = new Date().toISOString().slice(0, 10);
    const far = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    const [proj] = await db.insert(projectsTable).values({
      accountId: acct.id,
      name: "TEST_OVERALLOC_PROJECT",
      status: "Active",
      ownerId: user.id,
      startDate: today,
      dueDate: far,
      billingType: "Fixed",
      budget: "0",
      budgetedHours: "0",
    } as any).returning();
    testProjectId = proj.id;

    // Pre-create a hard allocation that fills this user's capacity fully for the next 7 days.
    // user.capacity is typically 40 h/week → 8 h/day.
    // We insert hoursPerDay = dailyCap to fully book them.
    const start = new Date();
    start.setDate(start.getDate() + 1); // start tomorrow
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    const dailyCap = (user.capacity ?? 40) / 5;

    const [existingAlloc] = await db.insert(allocationsTable).values({
      projectId: testProjectId,
      userId: testUserId,
      startDate: startStr,
      endDate: endStr,
      hoursPerWeek: String(user.capacity ?? 40),
      hoursPerDay: String(dailyCap),
      totalHours: String(dailyCap * 5),
      allocationMethod: "hours_per_week",
      role: "Developer",
      isSoftAllocation: false,
      isOverride: false,
    } as any).returning();
    existingAllocId = existingAlloc.id;

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    for (const id of createdAllocIds) {
      await db.delete(allocationsTable).where(eq(allocationsTable.id, id)).catch(() => {});
    }
    if (existingAllocId) {
      await db.delete(allocationsTable).where(eq(allocationsTable.id, existingAllocId)).catch(() => {});
    }
    await db.delete(projectsTable).where(eq(projectsTable.id, testProjectId)).catch(() => {});
    if (server) await new Promise<void>((r) => server.close(() => r()));
  });

  // Build a date range that overlaps the pre-existing "full" allocation
  function overlapRange() {
    const start = new Date();
    start.setDate(start.getDate() + 2); // inside the pre-existing range
    const end = new Date(start);
    end.setDate(start.getDate() + 4);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }

  it("(a) hard allocation exceeding capacity returns 409 over_allocation", async () => {
    const { startDate, endDate } = overlapRange();
    const res = await fetch(`${baseUrl}/api/allocations`, {
      method: "POST",
      headers: BASE_HEADERS,
      body: JSON.stringify({
        projectId: testProjectId,
        userId: testUserId,
        startDate,
        endDate,
        hoursPerWeek: 40,  // required by CreateAllocationBody
        allocationMethod: "hours_per_week",
        methodValue: 40,   // full week again → would exceed capacity
        role: "Developer",
        isSoftAllocation: false,
      }),
    });
    assert.equal(res.status, 409);
    const body = await res.json() as Record<string, unknown>;
    assert.equal(body.error, "over_allocation", `expected over_allocation, got: ${JSON.stringify(body)}`);
    assert.equal(body.resourceId, testUserId);
    assert.ok(typeof body.availableHours === "number");
    assert.ok(typeof body.requestedHours === "number");
    assert.ok(Array.isArray(body.overlapDates) && (body.overlapDates as string[]).length > 0,
      "overlapDates should contain at least one date");
  });

  it("(b) soft allocation is NOT blocked even when capacity is full", async () => {
    const { startDate, endDate } = overlapRange();
    const res = await fetch(`${baseUrl}/api/allocations`, {
      method: "POST",
      headers: BASE_HEADERS,
      body: JSON.stringify({
        projectId: testProjectId,
        userId: testUserId,
        startDate,
        endDate,
        hoursPerWeek: 40,
        allocationMethod: "hours_per_week",
        methodValue: 40,
        role: "Developer",
        isSoftAllocation: true,   // soft → guard must not fire
      }),
    });
    // 201 = created (guard bypassed for soft); anything except 409 passes this test
    assert.notEqual(res.status, 409, "soft allocation must bypass the over-allocation guard");
    if (res.status === 201) {
      const body = await res.json() as Record<string, unknown>;
      createdAllocIds.push(body.id as number);
    }
  });

  it("(c) forceOverride + overrideReason as account_admin returns 201 and sets isOverride=true", async () => {
    const { startDate, endDate } = overlapRange();
    const res = await fetch(`${baseUrl}/api/allocations`, {
      method: "POST",
      headers: BASE_HEADERS,
      body: JSON.stringify({
        projectId: testProjectId,
        userId: testUserId,
        startDate,
        endDate,
        hoursPerWeek: 40,
        allocationMethod: "hours_per_week",
        methodValue: 40,
        role: "Developer",
        isSoftAllocation: false,
        forceOverride: true,
        overrideReason: "Client approval received for extended hours",
      }),
    });
    const body = await res.json() as Record<string, unknown>;
    assert.equal(res.status, 201, `expected 201 with override, got ${res.status}: ${JSON.stringify(body)}`);
    createdAllocIds.push(body.id as number);
    assert.equal(body.isOverride, true, "isOverride must be true when override was granted");
  });
});
