/**
 * Sprint 1 / Phase 2.1 — numeric floors on hours, amount, additionalHours.
 *
 *  - POST /api/time-entries with hours <= 0 → 400
 *  - POST /api/time-entries with hours > 24 → 400
 *  - POST /api/invoices with amount < 0 → 400
 *  - POST /api/projects/:id/change-orders with amount < 0 → 400
 *  - POST /api/projects/:id/change-orders with additionalHours < 0 → 400
 */

import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import app from "../src/app.ts";
import { db, accountsTable, usersTable, projectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const JSON_HEADERS = { "content-type": "application/json" };

describe("numeric validation floors", () => {
  let server: Server;
  let baseUrl: string;
  let acctId: number;
  let adminId: number;
  let projectId: number;

  before(async () => {
    const [acct] = await db.select().from(accountsTable).limit(1);
    const admins = await db.select().from(usersTable).where(eq(usersTable.role, "Admin")).limit(1);
    const fallback = admins[0] ?? (await db.select().from(usersTable).limit(1))[0];
    acctId = acct.id;
    adminId = fallback.id;

    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const [p] = await db.insert(projectsTable).values({
      accountId: acctId, ownerId: adminId, startDate: today, dueDate: due,
      billingType: "Fixed", budget: "0", budgetedHours: "0",
      name: "TEST_NUMERIC_PROJECT", status: "active",
    } as any).returning();
    projectId = p.id;

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await db.delete(projectsTable).where(eq(projectsTable.id, projectId)).catch(() => {});
    if (server) await new Promise<void>((r) => server.close(() => r()));
  });

  const headers = () => ({
    ...JSON_HEADERS,
    "x-user-id": String(adminId),
    "x-user-role": "account_admin",
  });

  it("POST /time-entries rejects hours = 0", async () => {
    const res = await fetch(`${baseUrl}/api/time-entries`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        userId: adminId, projectId,
        date: new Date().toISOString().slice(0, 10),
        hours: 0, description: "zero", billable: false,
      }),
    });
    assert.equal(res.status, 400);
  });

  it("POST /time-entries rejects hours > 24", async () => {
    const res = await fetch(`${baseUrl}/api/time-entries`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        userId: adminId, projectId,
        date: new Date().toISOString().slice(0, 10),
        hours: 25, description: "too many", billable: false,
      }),
    });
    assert.equal(res.status, 400);
  });

  it("POST /invoices rejects amount < 0 (with all required fields present)", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    // Negative amount — must be rejected by the floor, not by missing-field 400.
    const negRes = await fetch(`${baseUrl}/api/invoices`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        projectId, accountId: acctId,
        amount: -100, tax: 0,
        issueDate: today, dueDate: due,
        description: "TEST_NEG_AMOUNT",
      }),
    });
    assert.equal(negRes.status, 400, "negative amount should fail");

    // Negative tax — same.
    const negTaxRes = await fetch(`${baseUrl}/api/invoices`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        projectId, accountId: acctId,
        amount: 100, tax: -1,
        issueDate: today, dueDate: due,
        description: "TEST_NEG_TAX",
      }),
    });
    assert.equal(negTaxRes.status, 400, "negative tax should fail");

    // Positive control — same body shape, valid amounts → 201.
    const okRes = await fetch(`${baseUrl}/api/invoices`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        projectId, accountId: acctId,
        amount: 100, tax: 5,
        issueDate: today, dueDate: due,
        description: "TEST_POS_INVOICE",
      }),
    });
    assert.equal(okRes.status, 201, "positive amounts should succeed");
  });

  it("POST /projects/:id/change-orders rejects amount < 0", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/change-orders`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ title: "negative amount", amount: -50, additionalHours: 0 }),
    });
    assert.equal(res.status, 400);
  });

  it("POST /projects/:id/change-orders rejects additionalHours < 0", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/change-orders`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ title: "negative hours", amount: 0, additionalHours: -1 }),
    });
    assert.equal(res.status, 400);
  });
});
