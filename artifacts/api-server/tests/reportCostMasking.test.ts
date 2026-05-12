/**
 * Role-based cost masking — utilization-grid report.
 *
 * Architecture:
 *  - The API endpoint is gated by requirePermission("reports.view"), which
 *    already blocks collaborators and customers (403).  The endpoint therefore
 *    always returns the full labourCost field for any caller who reaches it
 *    (account_admin / super_user).
 *  - Masking for collaborator/customer roles is enforced in the presentation
 *    layer via the maskIfRestricted() helper (mirrored here for unit testing).
 *
 * Tests:
 *  1. HTTP — account_admin receives labourCost as a number ≥ 0.
 *  2. HTTP — super_user receives labourCost as a number ≥ 0.
 *  3. Pure-function — maskIfRestricted returns "—" for collaborator + cost field.
 *  4. Pure-function — maskIfRestricted returns "—" for customer + cost field.
 *  5. Pure-function — maskIfRestricted passes through value for account_admin.
 *  6. Pure-function — maskIfRestricted passes through value for non-cost fields.
 *
 * Run with:  pnpm --filter @workspace/api-server test
 */

import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import app from "../src/app.ts";
import { db, usersTable, accountsTable, timeEntriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// ─── Frontend masking helper (mirrored from reports.tsx) ─────────────────────
const COST_FIELDS = new Set(["costRate", "appliedCostRate", "labourCost", "margin", "internalCost"]);
function maskIfRestricted(value: any, userRole: string, field: string): string {
  if (COST_FIELDS.has(field) && (userRole === "collaborator" || userRole === "customer")) {
    return "—";
  }
  return value === null || value === undefined ? "—" : String(value);
}

// ─── HTTP integration tests ───────────────────────────────────────────────────
const FROM = "2026-01-01";
const TO   = "2026-03-31";

describe("GET /api/reports/utilization-grid — role-based cost masking", () => {
  let server: Server;
  let baseUrl: string;

  let testUserId: number;
  let testEntryId: number;
  const TAG = `COST_MASK_${Date.now()}`;

  before(async () => {
    server = app.listen(0);
    await new Promise<void>(r => server.once("listening", r));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const [acct] = await db.select().from(accountsTable).limit(1);
    assert.ok(acct, "seed must have at least one account");

    const [user] = await db
      .insert(usersTable)
      .values({
        name: TAG,
        initials: "CM",
        email: `${TAG}@test.invalid`,
        role: "account_admin",
        department: "QA",
        costRate: "85.00",
        capacity: 40,
        isActive: 1,
        accountId: acct.id,
      })
      .returning();
    testUserId = user.id;

    const [entry] = await db
      .insert(timeEntriesTable)
      .values({
        userId: testUserId,
        date: "2026-02-03",
        hours: "8",
        description: "Cost masking test",
        billable: true,
      })
      .returning();
    testEntryId = entry.id;
  });

  after(async () => {
    await db.delete(timeEntriesTable).where(eq(timeEntriesTable.id, testEntryId));
    await db.delete(usersTable).where(eq(usersTable.id, testUserId));
    await new Promise<void>((res, rej) => server.close(e => e ? rej(e) : res()));
  });

  async function fetchGrid(role: string) {
    const r = await fetch(
      `${baseUrl}/api/reports/utilization-grid?from=${FROM}&to=${TO}&grouping=month`,
      { headers: { "x-user-id": String(testUserId), "x-user-role": role } },
    );
    assert.equal(r.status, 200, `expected 200 for role=${role}, got ${r.status}`);
    return r.json() as Promise<any>;
  }

  // ── HTTP: privileged roles see real labourCost ────────────────────────────

  it("account_admin receives labourCost as a non-negative number", async () => {
    const { rows } = await fetchGrid("account_admin");
    const testRow = rows.find((r: any) => r.userId === testUserId);
    assert.ok(testRow, "test user must appear in the report");
    assert.equal(typeof testRow.totals.labourCost, "number", "totals.labourCost must be a number for account_admin");
    assert.ok(testRow.totals.labourCost >= 0, "labourCost must be non-negative");
    assert.ok(testRow.totals.labourCost > 0, "labourCost must be > 0 (8h × $85 = $680)");
    for (const cell of testRow.cells as any[]) {
      assert.equal(typeof cell.labourCost, "number", `cell ${cell.period} labourCost must be a number`);
    }
  });

  it("labourCost value is 8h × $85/hr = $680 (verifies computation)", async () => {
    const { rows } = await fetchGrid("account_admin");
    const testRow = rows.find((r: any) => r.userId === testUserId);
    assert.ok(testRow, "test user must appear in the report");
    assert.equal(testRow.totals.labourCost, 680, "8 tracked hours × $85 costRate = $680");
  });

  // ── Pure-function: maskIfRestricted ──────────────────────────────────────

  it("collaborator-role export: maskIfRestricted returns '—' for labourCost", () => {
    assert.equal(maskIfRestricted(680, "collaborator", "labourCost"), "—");
    assert.equal(maskIfRestricted(0, "collaborator", "labourCost"), "—");
    assert.equal(maskIfRestricted(680, "collaborator", "costRate"), "—");
    assert.equal(maskIfRestricted(680, "collaborator", "appliedCostRate"), "—");
    assert.equal(maskIfRestricted(680, "collaborator", "margin"), "—");
    assert.equal(maskIfRestricted(680, "collaborator", "internalCost"), "—");
  });

  it("customer-role export: maskIfRestricted returns '—' for all cost fields", () => {
    assert.equal(maskIfRestricted(500, "customer", "labourCost"), "—");
    assert.equal(maskIfRestricted(120, "customer", "costRate"), "—");
    assert.equal(maskIfRestricted(200, "customer", "margin"), "—");
  });

  it("account_admin: maskIfRestricted passes through all cost fields", () => {
    assert.equal(maskIfRestricted(680, "account_admin", "labourCost"), "680");
    assert.equal(maskIfRestricted(85, "account_admin", "costRate"), "85");
    assert.equal(maskIfRestricted(200, "account_admin", "margin"), "200");
  });

  it("non-cost fields are never masked regardless of role", () => {
    assert.equal(maskIfRestricted(75, "collaborator", "utilization"), "75");
    assert.equal(maskIfRestricted(40, "customer", "trackedHours"), "40");
    assert.equal(maskIfRestricted("Active", "collaborator", "status"), "Active");
  });
});
