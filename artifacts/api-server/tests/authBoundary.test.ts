/**
 * Sprint 1 / Phase 3.9 — denyCustomerRole boundary.
 *
 *  - Customer role on /api/projects → 403
 *  - Customer role on /api/time-entries → 403
 *  - Customer role on /api/invoices → 403
 *  - Missing x-user-id → 401
 *  - Valid admin role on /api/projects → 200 (sanity baseline)
 */

import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import app from "../src/app.ts";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

describe("auth boundary — customer + missing-user blocks", () => {
  let server: Server;
  let baseUrl: string;
  let customerUserId: number;
  let adminUserId: number;
  let createdCustomer = false;

  before(async () => {
    // Find or create a customer user we can claim as.
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.role, "customer")).limit(1);
    if (existing) {
      customerUserId = existing.id;
    } else {
      const [created] = await db.insert(usersTable).values({
        name: "TEST_CUSTOMER_AUTH",
        initials: "TC",
        department: "External",
        email: `test-customer-auth-${Date.now()}@example.invalid`,
        role: "customer",
      } as any).returning();
      customerUserId = created.id;
      createdCustomer = true;
    }
    const admins = await db.select().from(usersTable).where(eq(usersTable.role, "Admin")).limit(1);
    adminUserId = (admins[0] ?? (await db.select().from(usersTable).limit(1))[0]).id;

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    if (createdCustomer) {
      await db.delete(usersTable).where(eq(usersTable.id, customerUserId)).catch(() => {});
    }
    if (server) await new Promise<void>((r) => server.close(() => r()));
  });

  const customer = () => ({
    "x-user-id": String(customerUserId),
    "x-user-role": "customer",
  });

  it("customer role blocked from GET /api/projects", async () => {
    const res = await fetch(`${baseUrl}/api/projects`, { headers: customer() });
    assert.equal(res.status, 403);
  });

  it("customer role blocked from GET /api/time-entries", async () => {
    const res = await fetch(`${baseUrl}/api/time-entries`, { headers: customer() });
    assert.equal(res.status, 403);
  });

  it("customer role blocked from GET /api/invoices", async () => {
    const res = await fetch(`${baseUrl}/api/invoices`, { headers: customer() });
    assert.equal(res.status, 403);
  });

  it("missing x-user-id returns 401", async () => {
    const res = await fetch(`${baseUrl}/api/projects`);
    assert.equal(res.status, 401);
  });

  it("admin role baseline: GET /api/projects succeeds", async () => {
    const res = await fetch(`${baseUrl}/api/projects`, {
      headers: { "x-user-id": String(adminUserId), "x-user-role": "account_admin" },
    });
    assert.equal(res.status, 200);
  });
});
