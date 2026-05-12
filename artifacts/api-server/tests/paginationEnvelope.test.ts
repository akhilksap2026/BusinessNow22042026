/**
 * Sprint 2 / Phase 6 — Pagination envelope on list endpoints.
 *
 * Contract:
 *   - No `?limit` / `?offset`  → plain T[] (back-compat)
 *   - With either present      → { data, total, limit, offset }
 *   - `?limit > 500`           → clamped to 500
 *   - `?limit=abc` (garbage)   → falls back to default 100
 */

import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import app from "../src/app.ts";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

describe("pagination envelope", () => {
  let server: Server;
  let baseUrl: string;
  let adminId: number;

  before(async () => {
    const admins = await db.select().from(usersTable).where(eq(usersTable.role, "Admin")).limit(1);
    adminId = (admins[0] ?? (await db.select().from(usersTable).limit(1))[0]).id;
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => { if (server) await new Promise<void>((r) => server.close(() => r())); });

  const h = () => ({ "x-user-id": String(adminId), "x-user-role": "account_admin" });

  it("returns plain array when no pagination params", async () => {
    const r = await fetch(`${baseUrl}/api/projects`, { headers: h() });
    const body = await r.json();
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(body), `expected array, got ${typeof body}`);
  });

  it("returns envelope when ?limit is present", async () => {
    const r = await fetch(`${baseUrl}/api/projects?limit=2`, { headers: h() });
    const body = await r.json();
    assert.equal(r.status, 200);
    assert.ok(!Array.isArray(body), "expected envelope object");
    assert.ok(Array.isArray(body.data), "envelope.data must be array");
    assert.equal(typeof body.total, "number");
    assert.equal(body.limit, 2);
    assert.equal(body.offset, 0);
    assert.ok(body.data.length <= 2);
  });

  it("clamps limit > 500 to 500", async () => {
    const r = await fetch(`${baseUrl}/api/accounts?limit=99999`, { headers: h() });
    const body = await r.json();
    assert.equal(r.status, 200);
    assert.equal(body.limit, 500);
  });

  it("falls back to default 100 on garbage limit", async () => {
    const r = await fetch(`${baseUrl}/api/accounts?limit=abc`, { headers: h() });
    const body = await r.json();
    assert.equal(r.status, 200);
    assert.equal(body.limit, 100);
  });

  it("/time-entries respects ?offset", async () => {
    const r = await fetch(`${baseUrl}/api/time-entries?limit=1&offset=0`, { headers: h() });
    const body = await r.json();
    assert.equal(r.status, 200);
    assert.equal(body.offset, 0);
    assert.equal(body.limit, 1);
  });

  it("/allocations envelope shape", async () => {
    const r = await fetch(`${baseUrl}/api/allocations?limit=5`, { headers: h() });
    const body = await r.json();
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(body.data));
    assert.ok("total" in body);
  });
});
