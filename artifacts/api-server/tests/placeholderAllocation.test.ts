/**
 * Placeholder allocations — unit tests.
 *
 * (a) POST with null userId + roleLabel (placeholderRole) → 201, row has userId=null
 * (b) POST with null userId + no roleLabel → 400
 *
 * Run with:  pnpm --filter @workspace/api-server test
 */

import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import app from "../src/app.ts";
import { db, projectsTable, accountsTable, usersTable, allocationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const ADMIN_HEADERS = {
  "content-type": "application/json",
  "x-user-id": "1",
  "x-user-role": "account_admin",
};

describe("Placeholder allocations — POST /api/allocations", () => {
  let server: Server;
  let baseUrl: string;
  let projectId: number;
  const createdAllocIds: number[] = [];

  before(async () => {
    server = app.listen(0);
    await new Promise<void>(r => server.once("listening", r));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;

    const [acct] = await db.select().from(accountsTable).limit(1);
    const [user] = await db.select().from(usersTable).limit(1);
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
    const [proj] = await db.insert(projectsTable).values({
      accountId: acct.id,
      ownerId: user.id,
      name: `TEST_PH_ALLOC_${Date.now()}`,
      status: "Started",
      health: "On Track",
      budget: "0",
      startDate: today,
      dueDate: due,
    } as any).returning();
    projectId = proj.id;
  });

  after(async () => {
    for (const id of createdAllocIds) {
      await db.delete(allocationsTable).where(eq(allocationsTable.id, id));
    }
    await db.delete(projectsTable).where(eq(projectsTable.id, projectId));
    await new Promise<void>(r => server.close(() => r()));
  });

  it("POST with null userId + roleLabel → 201, userId is null", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const end = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const res = await fetch(`${baseUrl}/allocations`, {
      method: "POST",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        projectId,
        userId: null,
        placeholderRole: "Senior Developer",
        startDate: today,
        endDate: end,
        hoursPerWeek: 20,
      }),
    });
    const text = await res.text();
    assert.equal(res.status, 201, text);
    const body = JSON.parse(text);
    createdAllocIds.push(body.id);
    assert.equal(body.userId, null, "userId should be null for placeholder allocation");
    assert.equal(body.placeholderRole, "Senior Developer");
    assert.equal(body.role, "Senior Developer");
  });

  it("POST with null userId + no roleLabel → 400", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const end = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const res = await fetch(`${baseUrl}/allocations`, {
      method: "POST",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        projectId,
        userId: null,
        startDate: today,
        endDate: end,
        hoursPerWeek: 20,
      }),
    });
    assert.equal(res.status, 400, await res.text());
  });
});
