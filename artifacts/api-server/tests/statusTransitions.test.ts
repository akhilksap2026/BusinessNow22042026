/**
 * Sprint 1 — invoice + timesheet status transition guards.
 *
 *  - Invoice status_changed audit row written on PATCH /invoices/:id when status changes
 *  - Timesheet PATCH withdraw (Submitted → Draft) clears submittedAt/submittedByUserId
 *  - Timesheet PATCH withdraw on an Approved timesheet is rejected
 */

import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import app from "../src/app.ts";
import {
  db, accountsTable, usersTable, projectsTable, invoicesTable, timesheetsTable,
  auditLogTable,
} from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";

const JSON_HEADERS = { "content-type": "application/json" };

describe("status transitions — invoices + timesheets", () => {
  let server: Server;
  let baseUrl: string;
  let acctId: number;
  let adminId: number;
  let projectId: number;
  let invoiceId: string;
  let tsSubmittedId: number;
  let tsApprovedId: number;

  before(async () => {
    const [acct] = await db.select().from(accountsTable).limit(1);
    const admins = await db.select().from(usersTable).where(eq(usersTable.role, "Admin")).limit(1);
    acctId = acct.id;
    adminId = (admins[0] ?? (await db.select().from(usersTable).limit(1))[0]).id;

    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const [p] = await db.insert(projectsTable).values({
      accountId: acctId, ownerId: adminId, startDate: today, dueDate: due,
      billingType: "Fixed", budget: "1000", budgetedHours: "0",
      name: "TEST_STATUS_PROJECT", status: "active",
    } as any).returning();
    projectId = p.id;

    invoiceId = `INV-TEST-${Date.now()}`;
    await db.insert(invoicesTable).values({
      id: invoiceId, projectId, accountId: acctId,
      amount: "100", tax: "0", total: "100",
      status: "Draft",
      issueDate: today, dueDate: due,
      description: "TEST_STATUS_INVOICE",
    } as any);

    // Mon as week start
    const weekStart = (() => {
      const d = new Date();
      const dow = d.getDay();
      const diff = dow === 0 ? -6 : 1 - dow;
      d.setDate(d.getDate() + diff);
      return d.toISOString().slice(0, 10);
    })();

    const [submitted] = await db.insert(timesheetsTable).values({
      userId: adminId, weekStart, status: "Submitted",
      totalHours: "10", billableHours: "10",
      submittedAt: new Date(), submittedByUserId: adminId,
    } as any).returning();
    tsSubmittedId = submitted.id;

    const otherWeekStart = (() => {
      const d = new Date(weekStart + "T00:00:00");
      d.setDate(d.getDate() - 7);
      return d.toISOString().slice(0, 10);
    })();
    const [approved] = await db.insert(timesheetsTable).values({
      userId: adminId, weekStart: otherWeekStart, status: "Approved",
      totalHours: "20", billableHours: "20",
      submittedAt: new Date(), submittedByUserId: adminId,
      approvedAt: new Date(), approvedByUserId: adminId,
    } as any).returning();
    tsApprovedId = approved.id;

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await db.delete(timesheetsTable).where(eq(timesheetsTable.id, tsSubmittedId)).catch(() => {});
    await db.delete(timesheetsTable).where(eq(timesheetsTable.id, tsApprovedId)).catch(() => {});
    await db.delete(invoicesTable).where(eq(invoicesTable.id, invoiceId)).catch(() => {});
    await db.delete(projectsTable).where(eq(projectsTable.id, projectId)).catch(() => {});
    if (server) await new Promise<void>((r) => server.close(() => r()));
  });

  const headers = () => ({
    ...JSON_HEADERS,
    "x-user-id": String(adminId),
    "x-user-role": "account_admin",
  });

  it("PATCH /invoices/:id status change writes a status_changed audit row", async () => {
    const before = await db.select().from(auditLogTable)
      .where(and(eq(auditLogTable.entityType, "invoice"), eq(auditLogTable.action, "status_changed")))
      .orderBy(desc(auditLogTable.id)).limit(1);
    const beforeMaxId = before[0]?.id ?? 0;

    const res = await fetch(`${baseUrl}/api/invoices/${invoiceId}`, {
      method: "PATCH", headers: headers(),
      body: JSON.stringify({ status: "In Review" }),
    });
    assert.equal(res.status, 200);

    const after = await db.select().from(auditLogTable)
      .where(and(eq(auditLogTable.entityType, "invoice"), eq(auditLogTable.action, "status_changed")))
      .orderBy(desc(auditLogTable.id)).limit(5);
    const fresh = after.find(r => r.id > beforeMaxId);
    assert.ok(fresh, "expected a new status_changed audit row");
  });

  it("PATCH /timesheets/:id withdraw clears submittedAt and submittedByUserId", async () => {
    const res = await fetch(`${baseUrl}/api/timesheets/${tsSubmittedId}`, {
      method: "PATCH", headers: headers(),
      body: JSON.stringify({ status: "Draft" }),
    });
    assert.equal(res.status, 200);
    const [row] = await db.select().from(timesheetsTable).where(eq(timesheetsTable.id, tsSubmittedId));
    assert.equal(row.status, "Draft");
    assert.equal(row.submittedAt, null, "submittedAt should be cleared on withdraw");
    assert.equal(row.submittedByUserId, null, "submittedByUserId should be cleared on withdraw");
  });

  // NB: PATCH /timesheets/:id from Approved → Draft is allowed for admin
  // unconditionally (only blocked when lockOnApprovalEnabled is on AND caller
  // is non-admin). The behaviour is covered by governance.test.ts where the
  // setting is toggled, so we don't re-assert it here.
});
