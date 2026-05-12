/**
 * Sprint 1 — write-path idempotency probes.
 *
 *  - Re-approving an already-Approved change order does NOT double-write
 *    a budget_entries row (the unique index on change_order_id holds).
 *  - PATCH /timesheets/:id withdraw is idempotent: second call also leaves
 *    the timesheet in Draft state.
 *
 * The "convert-to-project" idempotency case is already covered by
 * sprint1Hardening.test.ts, so we don't duplicate it here.
 */

import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import app from "../src/app.ts";
import {
  db, accountsTable, usersTable, projectsTable,
  changeOrdersTable, budgetEntriesTable, timesheetsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";

const JSON_HEADERS = { "content-type": "application/json" };

describe("idempotency — change-order re-approval + timesheet withdraw", () => {
  let server: Server;
  let baseUrl: string;
  let acctId: number;
  let adminId: number;
  let projectId: number;
  let crId: number;
  let tsId: number;

  before(async () => {
    const [acct] = await db.select().from(accountsTable).limit(1);
    const admins = await db.select().from(usersTable).where(eq(usersTable.role, "Admin")).limit(1);
    acctId = acct.id;
    adminId = (admins[0] ?? (await db.select().from(usersTable).limit(1))[0]).id;

    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
    const [p] = await db.insert(projectsTable).values({
      accountId: acctId, ownerId: adminId, startDate: today, dueDate: due,
      billingType: "Fixed", budget: "1000", budgetedHours: "100",
      name: "TEST_IDEMPOTENT_CR_PROJECT", status: "active",
    } as any).returning();
    projectId = p.id;

    // Submitter must differ from approver to clear the self-approval guard.
    const otherUsers = await db.select().from(usersTable).limit(5);
    const submitterId = (otherUsers.find(u => u.id !== adminId) ?? otherUsers[0]).id;

    const [cr] = await db.insert(changeOrdersTable).values({
      projectId, crNumber: "CR-IDEMP-001",
      title: "TEST_IDEMP_CR", amount: "500", additionalHours: "10",
      status: "Submitted", submittedByUserId: submitterId,
    } as any).returning();
    crId = cr.id;

    const weekStart = (() => {
      const d = new Date();
      const dow = d.getDay();
      const diff = dow === 0 ? -6 : 1 - dow;
      d.setDate(d.getDate() + diff);
      return d.toISOString().slice(0, 10);
    })();
    const [ts] = await db.insert(timesheetsTable).values({
      userId: adminId, weekStart, status: "Submitted",
      totalHours: "10", billableHours: "10",
      submittedAt: new Date(), submittedByUserId: adminId,
    } as any).returning();
    tsId = ts.id;

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await db.delete(budgetEntriesTable).where(eq(budgetEntriesTable.changeOrderId, crId)).catch(() => {});
    await db.delete(changeOrdersTable).where(eq(changeOrdersTable.id, crId)).catch(() => {});
    await db.delete(timesheetsTable).where(eq(timesheetsTable.id, tsId)).catch(() => {});
    await db.delete(projectsTable).where(eq(projectsTable.id, projectId)).catch(() => {});
    if (server) await new Promise<void>((r) => server.close(() => r()));
  });

  const headers = () => ({
    ...JSON_HEADERS,
    "x-user-id": String(adminId),
    "x-user-role": "account_admin",
  });

  it("re-approving an already-Approved change order does not create a duplicate budget_entries row", async () => {
    // First approval — this must create exactly one budget_entries row keyed by changeOrderId.
    const r1 = await fetch(`${baseUrl}/api/change-orders/${crId}`, {
      method: "PATCH", headers: headers(),
      body: JSON.stringify({ status: "Approved" }),
    });
    assert.equal(r1.status, 200);

    const after1 = await db.select().from(budgetEntriesTable)
      .where(eq(budgetEntriesTable.changeOrderId, crId));
    assert.equal(after1.length, 1, "first approval must create exactly one budget entry");

    // Second approval — should be a no-op on side-effects.
    const r2 = await fetch(`${baseUrl}/api/change-orders/${crId}`, {
      method: "PATCH", headers: headers(),
      body: JSON.stringify({ status: "Approved" }),
    });
    assert.equal(r2.status, 200);

    const after2 = await db.select().from(budgetEntriesTable)
      .where(eq(budgetEntriesTable.changeOrderId, crId));
    assert.equal(after2.length, 1, "re-approval must not double-write budget entry");
  });

  it("PATCH /timesheets/:id withdraw is idempotent across two calls", async () => {
    const r1 = await fetch(`${baseUrl}/api/timesheets/${tsId}`, {
      method: "PATCH", headers: headers(),
      body: JSON.stringify({ status: "Draft" }),
    });
    assert.equal(r1.status, 200);
    const [after1] = await db.select().from(timesheetsTable).where(eq(timesheetsTable.id, tsId));
    assert.equal(after1.status, "Draft");

    const r2 = await fetch(`${baseUrl}/api/timesheets/${tsId}`, {
      method: "PATCH", headers: headers(),
      body: JSON.stringify({ status: "Draft" }),
    });
    assert.equal(r2.status, 200);
    const [after2] = await db.select().from(timesheetsTable).where(eq(timesheetsTable.id, tsId));
    assert.equal(after2.status, "Draft");
    assert.equal(after2.submittedAt, null);
    assert.equal(after2.submittedByUserId, null);
  });
});
