/**
 * Project lifecycle state machine — tests.
 *
 * (a) Invalid transition returns HTTP 422.
 * (b) Valid transition without statusChangeReason returns HTTP 400.
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

const AUTH_HEADERS = {
  "content-type": "application/json",
  "x-user-id": "1",
  "x-user-role": "account_admin",
};

describe("PATCH /api/projects/:id — lifecycle state machine", () => {
  let server: Server;
  let baseUrl: string;

  // We create one project per test so state doesn't bleed between cases.
  const createdIds: number[] = [];

  async function createProject(status: string): Promise<number> {
    const [acct] = await db.select().from(accountsTable).limit(1);
    const [user] = await db.select().from(usersTable).limit(1);
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const [row] = await db
      .insert(projectsTable)
      .values({
        accountId: acct.id,
        name: `TEST_STATE_MACHINE_${Date.now()}`,
        status,
        ownerId: user.id,
        startDate: today,
        dueDate: due,
        billingType: "Fixed",
        budget: "0",
        budgetedHours: "0",
      } as any)
      .returning();
    createdIds.push(row.id);
    return row.id;
  }

  before(async () => {
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", () => resolve()));
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    for (const id of createdIds) {
      await db.delete(projectsTable).where(eq(projectsTable.id, id)).catch(() => {});
    }
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("(a) returns 422 for an invalid transition (completed → active)", async () => {
    const id = await createProject("completed");
    const res = await fetch(`${baseUrl}/api/projects/${id}`, {
      method: "PATCH",
      headers: AUTH_HEADERS,
      body: JSON.stringify({ status: "active", statusChangeReason: "trying to reopen" }),
    });
    assert.equal(res.status, 422, "expected HTTP 422 for invalid transition");
    const body = await res.json() as Record<string, unknown>;
    assert.equal(body.error, "invalid_transition", `error should be 'invalid_transition', got: ${body.error}`);
    assert.equal(body.from, "completed");
    assert.equal(body.to, "active");
    assert.ok(Array.isArray(body.allowed), "response should include allowed array");
    assert.equal((body.allowed as string[]).length, 0, "completed has no allowed transitions");
  });

  it("(b) returns 422 for a different invalid transition (active → draft)", async () => {
    const id = await createProject("active");
    const res = await fetch(`${baseUrl}/api/projects/${id}`, {
      method: "PATCH",
      headers: AUTH_HEADERS,
      body: JSON.stringify({ status: "draft", statusChangeReason: "reverting to draft" }),
    });
    assert.equal(res.status, 422, "expected HTTP 422 for invalid transition");
    const body = await res.json() as Record<string, unknown>;
    assert.equal(body.error, "invalid_transition");
    assert.ok(
      (body.allowed as string[]).includes("on_hold") &&
      (body.allowed as string[]).includes("completed") &&
      (body.allowed as string[]).includes("cancelled"),
      "allowed should list valid targets from active",
    );
  });

  it("(c) returns 400 when statusChangeReason is missing on a valid transition", async () => {
    const id = await createProject("active");
    const res = await fetch(`${baseUrl}/api/projects/${id}`, {
      method: "PATCH",
      headers: AUTH_HEADERS,
      body: JSON.stringify({ status: "on_hold" }),   // no statusChangeReason
    });
    assert.equal(res.status, 400, "expected HTTP 400 when reason is absent");
    const body = await res.json() as Record<string, unknown>;
    assert.equal(body.error, "reason_required");
  });

  it("(d) returns 400 when statusChangeReason is an empty string", async () => {
    const id = await createProject("active");
    const res = await fetch(`${baseUrl}/api/projects/${id}`, {
      method: "PATCH",
      headers: AUTH_HEADERS,
      body: JSON.stringify({ status: "on_hold", statusChangeReason: "   " }),
    });
    assert.equal(res.status, 400, "expected HTTP 400 for whitespace-only reason");
    const body = await res.json() as Record<string, unknown>;
    assert.equal(body.error, "reason_required");
  });

  it("(e) allows a valid transition when reason is supplied and updates the project", async () => {
    const id = await createProject("active");
    const res = await fetch(`${baseUrl}/api/projects/${id}`, {
      method: "PATCH",
      headers: AUTH_HEADERS,
      body: JSON.stringify({ status: "on_hold", statusChangeReason: "Client requested pause" }),
    });
    assert.equal(res.status, 200, "expected HTTP 200 for valid transition with reason");
    const body = await res.json() as Record<string, unknown>;
    assert.equal(body.status, "on_hold", "project status should be updated to on_hold");
  });

  it("(f) non-status PATCH fields (name, budget) bypass the machine entirely", async () => {
    const id = await createProject("active");
    const res = await fetch(`${baseUrl}/api/projects/${id}`, {
      method: "PATCH",
      headers: AUTH_HEADERS,
      body: JSON.stringify({ name: "Renamed Project" }),   // no status field
    });
    assert.equal(res.status, 200, "non-status PATCH must not trigger state machine checks");
    const body = await res.json() as Record<string, unknown>;
    assert.equal(body.name, "Renamed Project");
  });
});
