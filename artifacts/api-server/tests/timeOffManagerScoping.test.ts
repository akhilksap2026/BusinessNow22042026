/**
 * Sprint 2 / Phase 8.1 — Time-off approver must be the requester's manager
 * or an account_admin. Non-manager super_user → 403.
 */

import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import app from "../src/app.ts";
import { db, usersTable, timeOffRequestsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

describe("time-off manager scoping", () => {
  let server: Server;
  let baseUrl: string;
  let requesterId: number;
  let managerId: number;
  let strangerId: number;
  let adminId: number;
  const cleanupRequests: number[] = [];

  before(async () => {
    const [admin] = await db.select().from(usersTable).where(eq(usersTable.role, "Admin")).limit(1);
    adminId = admin?.id ?? (await db.select().from(usersTable).limit(1))[0].id;

    const dept = "TST_TOMS";
    const ts = Date.now();
    const [mgr] = await db.insert(usersTable).values({
      name: "Mgr TOMS", initials: "MT", role: "super_user",
      email: `mgr-toms-${ts}@test.local`, department: dept,
    } as any).returning();
    managerId = mgr.id;
    const [req] = await db.insert(usersTable).values({
      name: "Req TOMS", initials: "RT", role: "collaborator",
      email: `req-toms-${ts}@test.local`, department: dept, managerId: mgr.id,
    } as any).returning();
    requesterId = req.id;
    const [str] = await db.insert(usersTable).values({
      name: "Str TOMS", initials: "ST", role: "super_user",
      email: `str-toms-${ts}@test.local`, department: dept,
    } as any).returning();
    strangerId = str.id;

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    if (cleanupRequests.length) {
      await db.delete(timeOffRequestsTable).where(inArray(timeOffRequestsTable.id, cleanupRequests)).catch(() => {});
    }
    await db.delete(usersTable).where(inArray(usersTable.id, [requesterId, managerId, strangerId].filter(Boolean))).catch(() => {});
    if (server) await new Promise<void>((r) => server.close(() => r()));
  });

  async function makeRequest(): Promise<number> {
    const today = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const end = new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10);
    const r = await fetch(`${baseUrl}/api/time-off-requests`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-id": String(requesterId), "x-user-role": "collaborator" },
      body: JSON.stringify({ userId: requesterId, type: "Vacation", startDate: today, endDate: end, status: "Pending" }),
    });
    assert.equal(r.status, 201);
    const body = await r.json();
    cleanupRequests.push(body.id);
    return body.id;
  }

  it("stranger super_user cannot approve (403)", async () => {
    const id = await makeRequest();
    const r = await fetch(`${baseUrl}/api/time-off-requests/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-user-id": String(strangerId), "x-user-role": "super_user" },
      body: JSON.stringify({ status: "Approved" }),
    });
    assert.equal(r.status, 403);
  });

  it("requester's manager can approve (200)", async () => {
    const id = await makeRequest();
    const r = await fetch(`${baseUrl}/api/time-off-requests/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-user-id": String(managerId), "x-user-role": "super_user" },
      body: JSON.stringify({ status: "Approved" }),
    });
    assert.equal(r.status, 200);
  });

  it("account_admin can approve regardless of managerId (200)", async () => {
    const id = await makeRequest();
    const r = await fetch(`${baseUrl}/api/time-off-requests/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-user-id": String(adminId), "x-user-role": "account_admin" },
      body: JSON.stringify({ status: "Approved" }),
    });
    assert.equal(r.status, 200);
  });
});
