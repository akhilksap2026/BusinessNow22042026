/**
 * Budget lock — integration tests.
 *
 * (a) PATCH budget field on a locked project → 403 budget_locked
 * (b) Non-budget field on locked project → 200 (lock is field-specific)
 * (c) PATCH /projects/:id/unlock-budget (admin, with reason) → 200 + budget field PATCH succeeds
 * (d) draft → active transition auto-sets budgetLocked = true
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

const ADMIN_HEADERS = {
  "content-type": "application/json",
  "x-user-id": "1",
  "x-user-role": "account_admin",
};

describe("Budget lock — PATCH /api/projects/:id", () => {
  let server: Server;
  let baseUrl: string;
  const createdIds: number[] = [];

  async function makeProject(status: string, budgetLocked: boolean): Promise<number> {
    const [acct] = await db.select().from(accountsTable).limit(1);
    const [user] = await db.select().from(usersTable).limit(1);
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
    const [row] = await db.insert(projectsTable).values({
      accountId: acct.id,
      name: `TEST_BUDGET_LOCK_${Date.now()}`,
      status,
      ownerId: user.id,
      startDate: today,
      dueDate: due,
      billingType: "Fixed",
      budget: "10000",
      budgetedHours: "100",
      budgetLocked,
    } as any).returning();
    createdIds.push(row.id);
    return row.id;
  }

  before(async () => {
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    for (const id of createdIds) {
      await db.delete(projectsTable).where(eq(projectsTable.id, id)).catch(() => {});
    }
    await new Promise<void>((r) => server.close(() => r()));
  });

  it("(a) PATCH budget field on locked project returns 403 budget_locked with changeOrderUrl", async () => {
    const id = await makeProject("active", true);
    const res = await fetch(`${baseUrl}/api/projects/${id}`, {
      method: "PATCH",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ budget: 99999 }),
    });
    const text = await res.text();
    assert.equal(res.status, 403, `expected 403, got ${res.status}: ${text}`);
    const body = JSON.parse(text) as any;
    assert.equal(body.error, "budget_locked");
    assert.ok(body.changeOrderUrl?.includes(`/projects/${id}`),
      `changeOrderUrl missing project id: ${body.changeOrderUrl}`);
  });

  it("(b) PATCH non-budget field on locked project succeeds", async () => {
    const id = await makeProject("active", true);
    const res = await fetch(`${baseUrl}/api/projects/${id}`, {
      method: "PATCH",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ health: "At Risk" }),
    });
    assert.equal(res.status, 200, `expected 200, got ${res.status}: ${await res.text()}`);
  });

  it("(c) unlock-budget allows subsequent budget PATCH", async () => {
    const id = await makeProject("active", true);

    // Unlock
    const unlock = await fetch(`${baseUrl}/api/projects/${id}/unlock-budget`, {
      method: "PATCH",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ reason: "Approved by steering committee" }),
    });
    assert.equal(unlock.status, 200, `unlock failed: ${await unlock.text()}`);

    // Budget PATCH should now succeed
    const patch = await fetch(`${baseUrl}/api/projects/${id}`, {
      method: "PATCH",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ budget: 50000 }),
    });
    assert.equal(patch.status, 200, `budget PATCH after unlock failed: ${await patch.text()}`);
  });

  it("(d) draft→active transition auto-locks budget", async () => {
    const id = await makeProject("draft", false);

    const res = await fetch(`${baseUrl}/api/projects/${id}`, {
      method: "PATCH",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ status: "active", statusChangeReason: "Project approved and published" }),
    });
    const text = await res.text();
    assert.equal(res.status, 200, `status change failed: ${text}`);
    const body = JSON.parse(text) as any;
    assert.equal(body.budgetLocked, true, "budgetLocked must be true after draft→active");
  });
});
