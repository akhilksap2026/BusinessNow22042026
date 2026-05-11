/**
 * Draft project isolation guard — tests.
 *
 * Verifies that GET /api/projects?context=timesheet hides projects whose
 * status is "draft" while the same route without `context=timesheet`
 * (i.e. the projects-list / detail / admin callers) still returns them.
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
  "x-user-id": "1",
  "x-user-role": "account_admin",
};

describe("GET /api/projects — draft isolation guard", () => {
  let server: Server;
  let baseUrl: string;
  let draftProjectId: number;
  let activeProjectId: number;
  let accountId: number;
  let ownerId: number;

  before(async () => {
    // Reuse the first existing account + user from the seed; tests must not
    // assume any specific id beyond "something exists".
    const [acct] = await db.select().from(accountsTable).limit(1);
    const [user] = await db.select().from(usersTable).limit(1);
    assert.ok(acct, "seed must contain at least one account");
    assert.ok(user, "seed must contain at least one user");
    accountId = acct.id;
    ownerId = user.id;

    const today = new Date().toISOString().slice(0, 10);
    const dueDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    const [draft] = await db
      .insert(projectsTable)
      .values({
        accountId,
        name: "TEST_DRAFT_ISOLATION_PROJECT",
        status: "draft",
        ownerId,
        startDate: today,
        dueDate,
        billingType: "Fixed",
        budget: "0",
        budgetedHours: "0",
      } as any)
      .returning();
    draftProjectId = draft.id;

    const [active] = await db
      .insert(projectsTable)
      .values({
        accountId,
        name: "TEST_ACTIVE_ISOLATION_PROJECT",
        status: "Active",
        ownerId,
        startDate: today,
        dueDate,
        billingType: "Fixed",
        budget: "0",
        budgetedHours: "0",
      } as any)
      .returning();
    activeProjectId = active.id;

    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", () => resolve()));
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    if (draftProjectId) await db.delete(projectsTable).where(eq(projectsTable.id, draftProjectId));
    if (activeProjectId) await db.delete(projectsTable).where(eq(projectsTable.id, activeProjectId));
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("excludes draft projects when context=timesheet", async () => {
    const res = await fetch(`${baseUrl}/api/projects?context=timesheet`, { headers: AUTH_HEADERS });
    assert.equal(res.status, 200);
    const body = (await res.json()) as Array<{ id: number; status: string }>;
    assert.ok(Array.isArray(body), "response is an array");

    const ids = body.map((p) => p.id);
    assert.equal(
      ids.includes(draftProjectId),
      false,
      `draft project ${draftProjectId} must NOT appear when context=timesheet`,
    );
    assert.equal(
      ids.includes(activeProjectId),
      true,
      `active project ${activeProjectId} must still appear when context=timesheet`,
    );
    assert.equal(
      body.some((p) => p.status === "draft"),
      false,
      "no row in the timesheet-context response should have status='draft'",
    );
  });

  it("still returns draft projects when context is omitted (projects list / admin)", async () => {
    const res = await fetch(`${baseUrl}/api/projects`, { headers: AUTH_HEADERS });
    assert.equal(res.status, 200);
    const body = (await res.json()) as Array<{ id: number; status: string }>;
    const ids = body.map((p) => p.id);
    assert.equal(
      ids.includes(draftProjectId),
      true,
      "draft project must remain visible to the default (non-timesheet) callers",
    );
  });
});
