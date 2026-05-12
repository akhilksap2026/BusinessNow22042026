/**
 * Sprint 2 / Phase 8.2 — bulk-approve returns a structured skip breakdown.
 * Self-approval entries are silently skipped (skippedSelf), other-blocked
 * entries land in skippedOther; eligible ones are approved.
 */

import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import app from "../src/app.ts";
import { db, accountsTable, usersTable, projectsTable, timeEntriesTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

describe("bulk-approve skip breakdown", () => {
  let server: Server;
  let baseUrl: string;
  let adminId: number;
  let otherId: number;
  let projectId: number;
  const cleanupEntries: number[] = [];

  before(async () => {
    const [acct] = await db.select().from(accountsTable).limit(1);
    const [admin] = await db.select().from(usersTable).where(eq(usersTable.role, "Admin")).limit(1);
    adminId = (admin ?? (await db.select().from(usersTable).limit(1))[0]).id;
    const ts = Date.now();
    const [other] = await db.insert(usersTable).values({
      name: "Other BAS", initials: "OB", role: "collaborator",
      email: `other-bas-${ts}@test.local`, department: "TST_BAS",
    } as any).returning();
    otherId = other.id;

    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const [p] = await db.insert(projectsTable).values({
      accountId: acct.id, ownerId: adminId, startDate: today, dueDate: due,
      billingType: "Fixed", budget: "0", budgetedHours: "0",
      name: "TEST_BAS_PROJECT", status: "active",
    } as any).returning();
    projectId = p.id;

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    if (cleanupEntries.length) await db.delete(timeEntriesTable).where(inArray(timeEntriesTable.id, cleanupEntries)).catch(() => {});
    await db.delete(projectsTable).where(eq(projectsTable.id, projectId)).catch(() => {});
    await db.delete(usersTable).where(eq(usersTable.id, otherId)).catch(() => {});
    if (server) await new Promise<void>((r) => server.close(() => r()));
  });

  it("time-entries bulk-approve splits skippedSelf vs skippedOther", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [self] = await db.insert(timeEntriesTable).values({
      userId: adminId, projectId, hours: "1", date: today, description: "self", billable: true, approved: false, rejected: false,
    } as any).returning();
    const [eligible] = await db.insert(timeEntriesTable).values({
      userId: otherId, projectId, hours: "1", date: today, description: "elig", billable: true, approved: false, rejected: false,
    } as any).returning();
    cleanupEntries.push(self.id, eligible.id);

    const r = await fetch(`${baseUrl}/api/time-entries/bulk-approve`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-id": String(adminId), "x-user-role": "account_admin" },
      body: JSON.stringify({ ids: [self.id, eligible.id] }),
    });
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.equal(body.approved, 1, "1 eligible entry approved");
    assert.equal(body.skippedSelf, 1, "1 self-entry silently skipped");
    assert.equal(body.skippedOther, 0);
  });
});
