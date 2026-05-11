/**
 * Cost entry duplicate detection — integration test.
 *
 * Submitting the same cost entry twice (same projectId, externalTransactionId,
 * amount, and date) must return HTTP 409 with `error: "duplicate_cost_entry"`
 * and `existingId` on the second call.
 *
 * Run with:  pnpm --filter @workspace/api-server test
 */

import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import app from "../src/app.ts";
import { db, accountsTable, usersTable, projectsTable, costEntriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

describe("POST /api/cost-entries — duplicate detection", () => {
  let server: Server;
  let baseUrl: string;

  let pmUserId: number;
  let testProjectId: number;
  const createdEntryIds: number[] = [];

  before(async () => {
    server = app.listen(0);
    await new Promise<void>(r => server.once("listening", r));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const [acct] = await db.select().from(accountsTable).limit(1);
    assert.ok(acct, "seed must have at least one account");

    const [user] = await db.select().from(usersTable).limit(1);
    assert.ok(user, "seed must have at least one user");
    pmUserId = user.id;

    const [proj] = await db.insert(projectsTable).values({
      accountId:     acct.id,
      name:          `TEST_COST_DUP_${Date.now()}`,
      status:        "Active",
      ownerId:       pmUserId,
      startDate:     "2026-01-01",
      dueDate:       "2026-12-31",
      billingType:   "Fixed",
      budget:        "50000",
      budgetedHours: "500",
    } as any).returning();
    testProjectId = proj.id;
  });

  after(async () => {
    for (const id of createdEntryIds) {
      await db.delete(costEntriesTable).where(eq(costEntriesTable.id, id)).catch(() => {});
    }
    await db.delete(projectsTable).where(eq(projectsTable.id, testProjectId)).catch(() => {});
    server.close();
  });

  const payload = {
    projectId:             0,   // filled in before()
    entryDate:             "2026-05-01",
    description:           "AWS infrastructure invoice",
    amount:                1250.00,
    costCategory:          "vendor",
    externalTransactionId: `EXT-${Date.now()}`,
  };

  it("first POST returns 201 and creates the entry", async () => {
    payload.projectId = testProjectId;

    const res = await fetch(`${baseUrl}/api/cost-entries`, {
      method:  "POST",
      headers: { "content-type": "application/json", "x-user-id": String(pmUserId), "x-user-role": "account_admin" },
      body:    JSON.stringify(payload),
    });

    const body = await res.text();
    assert.equal(res.status, 201, `Expected 201, got ${res.status}: ${body}`);
    const entry = JSON.parse(body);
    assert.equal(entry.costCategory, "vendor");
    assert.equal(Number(entry.amount), 1250);
    createdEntryIds.push(entry.id);
  });

  it("second POST with identical externalTransactionId/amount/date returns 409 duplicate_cost_entry", async () => {
    const res = await fetch(`${baseUrl}/api/cost-entries`, {
      method:  "POST",
      headers: { "content-type": "application/json", "x-user-id": String(pmUserId), "x-user-role": "account_admin" },
      body:    JSON.stringify(payload),
    });

    const body = await res.text();
    assert.equal(res.status, 409, `Expected 409, got ${res.status}: ${body}`);
    const json = JSON.parse(body);
    assert.equal(json.error, "duplicate_cost_entry", `Expected error 'duplicate_cost_entry', got '${json.error}'`);
    assert.ok(typeof json.existingId === "number", `existingId should be a number, got ${json.existingId}`);
    assert.equal(json.existingId, createdEntryIds[0], `existingId should match the first entry id`);
  });

  it("POST without externalTransactionId is never blocked (manual entries skip duplicate check)", async () => {
    const manualPayload = {
      projectId:   testProjectId,
      entryDate:   "2026-05-01",
      description: "Manual expense note",
      amount:      1250.00,
      costCategory:"overhead",
      // no externalTransactionId
    };

    const res1 = await fetch(`${baseUrl}/api/cost-entries`, {
      method:  "POST",
      headers: { "content-type": "application/json", "x-user-id": String(pmUserId), "x-user-role": "account_admin" },
      body:    JSON.stringify(manualPayload),
    });
    const b1 = await res1.text();
    assert.equal(res1.status, 201, `First manual: ${res1.status}: ${b1}`);
    createdEntryIds.push(JSON.parse(b1).id);

    const res2 = await fetch(`${baseUrl}/api/cost-entries`, {
      method:  "POST",
      headers: { "content-type": "application/json", "x-user-id": String(pmUserId), "x-user-role": "account_admin" },
      body:    JSON.stringify(manualPayload),
    });
    const b2 = await res2.text();
    assert.equal(res2.status, 201, `Second manual (no extId) should also be 201, got ${res2.status}: ${b2}`);
    createdEntryIds.push(JSON.parse(b2).id);
  });

  it("POST with missing costCategory returns 400", async () => {
    const { costCategory: _, ...noCat } = payload as any;
    const res = await fetch(`${baseUrl}/api/cost-entries`, {
      method:  "POST",
      headers: { "content-type": "application/json", "x-user-id": String(pmUserId), "x-user-role": "account_admin" },
      body:    JSON.stringify(noCat),
    });
    assert.equal(res.status, 400, `Expected 400 for missing costCategory, got ${res.status}`);
  });
});
