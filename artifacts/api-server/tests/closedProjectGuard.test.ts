/**
 * Closed-project guard — tests.
 *
 * Verifies that POST /api/time-entries and POST /api/timesheet-rows
 * are blocked with 403 when the target project is completed, and that
 * the admin-override header bypasses the block for account_admin callers.
 *
 * Run with:  pnpm --filter @workspace/api-server test
 */

import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import app from "../src/app.ts";
import { db, projectsTable, accountsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const BASE_HEADERS = {
  "content-type": "application/json",
  "x-user-id": "1",
  "x-user-role": "account_admin",
};

describe("Closed-project guard", () => {
  let server: Server;
  let baseUrl: string;
  let completedProjectId: number;
  let activeProjectId: number;
  let testUserId: number;

  before(async () => {
    const [acct] = await db.select().from(accountsTable).limit(1);
    const [user] = await db.select().from(usersTable).limit(1);
    assert.ok(acct && user, "seed must contain at least one account and user");
    testUserId = user.id;

    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    const base = {
      accountId: acct.id,
      ownerId: user.id,
      startDate: today,
      dueDate: due,
      billingType: "Fixed",
      budget: "0",
      budgetedHours: "0",
    };

    const [cp] = await db
      .insert(projectsTable)
      .values({ ...base, name: "TEST_COMPLETED_GUARD", status: "completed" } as any)
      .returning();
    completedProjectId = cp.id;

    const [ap] = await db
      .insert(projectsTable)
      .values({ ...base, name: "TEST_ACTIVE_GUARD", status: "Active" } as any)
      .returning();
    activeProjectId = ap.id;

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await db.delete(projectsTable).where(eq(projectsTable.id, completedProjectId)).catch(() => {});
    await db.delete(projectsTable).where(eq(projectsTable.id, activeProjectId)).catch(() => {});
    if (server) await new Promise<void>((r) => server.close(() => r()));
  });

  // ── POST /api/time-entries ─────────────────────────────────────────────────

  it("POST /api/time-entries on a completed project returns 403", async () => {
    const res = await fetch(`${baseUrl}/api/time-entries`, {
      method: "POST",
      headers: BASE_HEADERS,
      body: JSON.stringify({
        userId: testUserId,
        projectId: completedProjectId,
        date: new Date().toISOString().slice(0, 10),
        hours: 2,
        description: "Test entry",
        billable: false,
      }),
    });
    assert.equal(res.status, 403);
    const body = await res.json() as Record<string, unknown>;
    assert.equal(body.error, "project_closed");
    assert.ok(typeof body.message === "string" && body.message.length > 0);
  });

  it("POST /api/time-entries on an active project is not blocked (reaches normal flow)", async () => {
    const res = await fetch(`${baseUrl}/api/time-entries`, {
      method: "POST",
      headers: BASE_HEADERS,
      body: JSON.stringify({
        userId: testUserId,
        projectId: activeProjectId,
        date: new Date().toISOString().slice(0, 10),
        hours: 2,
        description: "Test active",
        billable: false,
      }),
    });
    // 201 = created, 409 = soft-block guardrail — both mean the closed-project
    // guard did NOT fire. Anything except 403 is a pass for this test.
    assert.notEqual(res.status, 403, "active project must not be blocked by closed-project guard");
  });

  it("POST /api/time-entries with X-Admin-Override on completed project returns non-403", async () => {
    const res = await fetch(`${baseUrl}/api/time-entries`, {
      method: "POST",
      headers: { ...BASE_HEADERS, "x-admin-override": "true" },
      body: JSON.stringify({
        userId: testUserId,
        projectId: completedProjectId,
        date: new Date().toISOString().slice(0, 10),
        hours: 1,
        description: "Admin override entry",
        billable: false,
      }),
    });
    assert.notEqual(
      res.status, 403,
      "account_admin with X-Admin-Override must bypass the closed-project block",
    );
  });

  // ── POST /api/timesheet-rows ───────────────────────────────────────────────

  it("POST /api/timesheet-rows on a completed project returns 403", async () => {
    const res = await fetch(`${baseUrl}/api/timesheet-rows`, {
      method: "POST",
      headers: BASE_HEADERS,
      body: JSON.stringify({
        userId: testUserId,
        projectId: completedProjectId,
        isNonProject: false,
        billable: false,
      }),
    });
    assert.equal(res.status, 403);
    const body = await res.json() as Record<string, unknown>;
    assert.equal(body.error, "project_closed");
  });

  it("POST /api/timesheet-rows with X-Admin-Override on completed project returns non-403", async () => {
    const res = await fetch(`${baseUrl}/api/timesheet-rows`, {
      method: "POST",
      headers: { ...BASE_HEADERS, "x-admin-override": "true" },
      body: JSON.stringify({
        userId: testUserId,
        projectId: completedProjectId,
        isNonProject: false,
        billable: false,
      }),
    });
    assert.notEqual(res.status, 403, "admin override must bypass block on timesheet-rows too");
  });
});
