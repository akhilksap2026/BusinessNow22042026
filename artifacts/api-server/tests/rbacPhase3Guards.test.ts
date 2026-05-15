/**
 * Phase 4 Verification — FIX 3: Middleware guards on previously-unguarded routes.
 *
 * For every route that received a new role guard in FIX 3, this file
 * verifies:
 *   - an under-privileged caller receives 403
 *   - an authorised caller is NOT blocked (may receive 200, 201, 400, 404
 *     depending on payload — any non-403 signals the guard passed)
 *
 * Strictly additive: no application source files are modified here.
 * Run with: pnpm --filter @workspace/api-server test
 */

import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import app from "../src/app.ts";
import {
  db, usersTable, notificationsTable, holidayCalendarsTable, documentTemplatesTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const TAG = `RBAC3_${Date.now()}`;
const J = "application/json";

describe("FIX 3 — route-level RBAC guards", () => {
  let server: Server;
  let baseUrl: string;

  let adminId: number;
  let pmId: number;
  let collabId: number;

  const cleanupNotifIds: number[] = [];
  const cleanupCalIds: number[] = [];
  const cleanupTmplIds: number[] = [];

  before(async () => {
    const ts = Date.now();

    const [admin] = await db.insert(usersTable).values({
      name: `${TAG}_admin`, initials: "GA", role: "account_admin",
      email: `${TAG}-admin-${ts}@test.local`, department: "QA",
    } as any).returning();
    adminId = admin.id;

    const [pm] = await db.insert(usersTable).values({
      name: `${TAG}_pm`, initials: "GP", role: "super_user",
      email: `${TAG}-pm-${ts}@test.local`, department: "QA",
    } as any).returning();
    pmId = pm.id;

    const [collab] = await db.insert(usersTable).values({
      name: `${TAG}_collab`, initials: "GC", role: "collaborator",
      email: `${TAG}-collab-${ts}@test.local`, department: "QA",
    } as any).returning();
    collabId = collab.id;

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    if (cleanupNotifIds.length) {
      await db.delete(notificationsTable).where(inArray(notificationsTable.id, cleanupNotifIds)).catch(() => {});
    }
    if (cleanupCalIds.length) {
      await db.delete(holidayCalendarsTable).where(inArray(holidayCalendarsTable.id, cleanupCalIds)).catch(() => {});
    }
    if (cleanupTmplIds.length) {
      await db.delete(documentTemplatesTable).where(inArray(documentTemplatesTable.id, cleanupTmplIds)).catch(() => {});
    }
    await db.delete(usersTable).where(inArray(usersTable.id, [adminId, pmId, collabId].filter(Boolean))).catch(() => {});
    await new Promise<void>((r) => server.close(() => r()));
  });

  const h = (id: number, role: string) => ({
    "x-user-id": String(id),
    "x-user-role": role,
  });
  const jh = (id: number, role: string) => ({ ...h(id, role), "content-type": J });

  // ── GET /api/resource-cost-rates  (requireAdmin) ──────────────────────────

  it("resource-cost-rates: collaborator → 403", async () => {
    const r = await fetch(`${baseUrl}/api/resource-cost-rates`, { headers: h(collabId, "collaborator") });
    assert.equal(r.status, 403);
  });

  it("resource-cost-rates: super_user → 403 (admin-only)", async () => {
    const r = await fetch(`${baseUrl}/api/resource-cost-rates`, { headers: h(pmId, "super_user") });
    assert.equal(r.status, 403);
  });

  it("resource-cost-rates: account_admin → 200", async () => {
    const r = await fetch(`${baseUrl}/api/resource-cost-rates`, { headers: h(adminId, "account_admin") });
    assert.equal(r.status, 200);
  });

  it("resource-cost-rates: unauthenticated → 401", async () => {
    const r = await fetch(`${baseUrl}/api/resource-cost-rates`);
    assert.equal(r.status, 401);
  });

  // ── GET /api/revenue-entries  (requireFinance = super_user+) ──────────────

  it("revenue-entries: collaborator → 403", async () => {
    const r = await fetch(`${baseUrl}/api/revenue-entries`, { headers: h(collabId, "collaborator") });
    assert.equal(r.status, 403);
  });

  it("revenue-entries: super_user → 200", async () => {
    const r = await fetch(`${baseUrl}/api/revenue-entries`, { headers: h(pmId, "super_user") });
    assert.equal(r.status, 200);
  });

  it("revenue-entries: unauthenticated → 401", async () => {
    const r = await fetch(`${baseUrl}/api/revenue-entries`);
    assert.equal(r.status, 401);
  });

  // ── GET /api/billing-schedules  (requireFinance) ──────────────────────────

  it("billing-schedules: collaborator → 403", async () => {
    const r = await fetch(`${baseUrl}/api/billing-schedules`, { headers: h(collabId, "collaborator") });
    assert.equal(r.status, 403);
  });

  it("billing-schedules: super_user → 200", async () => {
    const r = await fetch(`${baseUrl}/api/billing-schedules`, { headers: h(pmId, "super_user") });
    assert.equal(r.status, 200);
  });

  // ── GET /api/cost-entries  (requirePM = super_user+) ─────────────────────

  it("cost-entries: collaborator → 403", async () => {
    const r = await fetch(`${baseUrl}/api/cost-entries`, { headers: h(collabId, "collaborator") });
    assert.equal(r.status, 403);
  });

  it("cost-entries: super_user → 200", async () => {
    const r = await fetch(`${baseUrl}/api/cost-entries`, { headers: h(pmId, "super_user") });
    assert.equal(r.status, 200);
  });

  // ── POST /api/notifications  (requirePM) ──────────────────────────────────

  it("notifications POST: collaborator → 403", async () => {
    const r = await fetch(`${baseUrl}/api/notifications`, {
      method: "POST",
      headers: jh(collabId, "collaborator"),
      body: JSON.stringify({ type: "test", message: "guard-verify" }),
    });
    assert.equal(r.status, 403);
  });

  it("notifications POST: super_user → 201", async () => {
    const r = await fetch(`${baseUrl}/api/notifications`, {
      method: "POST",
      headers: jh(pmId, "super_user"),
      body: JSON.stringify({ type: "rbac_phase4_test", message: "guard verify", userId: pmId }),
    });
    assert.equal(r.status, 201);
    const row = await r.json() as any;
    if (row?.id) cleanupNotifIds.push(row.id);
  });

  it("notifications POST: unauthenticated → 401", async () => {
    const r = await fetch(`${baseUrl}/api/notifications`, {
      method: "POST",
      headers: { "content-type": J },
      body: JSON.stringify({ type: "test", message: "no-auth" }),
    });
    assert.equal(r.status, 401);
  });

  // ── GET /api/resources/heatmap-capacity  (requirePM) ─────────────────────

  it("resources/heatmap-capacity: collaborator → 403", async () => {
    const r = await fetch(`${baseUrl}/api/resources/heatmap-capacity?from=2026-01-01&to=2026-03-31`, {
      headers: h(collabId, "collaborator"),
    });
    assert.equal(r.status, 403);
  });

  it("resources/heatmap-capacity: super_user → not 403", async () => {
    const r = await fetch(`${baseUrl}/api/resources/heatmap-capacity?from=2026-01-01&to=2026-03-31`, {
      headers: h(pmId, "super_user"),
    });
    assert.ok(r.status !== 403, `expected guard to pass, got ${r.status}`);
  });

  // ── GET /api/resources/capacity  (requirePM) ─────────────────────────────

  it("resources/capacity: collaborator → 403", async () => {
    const r = await fetch(`${baseUrl}/api/resources/capacity`, { headers: h(collabId, "collaborator") });
    assert.equal(r.status, 403);
  });

  it("resources/capacity: super_user → not 403", async () => {
    const r = await fetch(`${baseUrl}/api/resources/capacity`, { headers: h(pmId, "super_user") });
    assert.ok(r.status !== 403, `expected guard to pass, got ${r.status}`);
  });

  // ── GET /api/resources/bench  (requirePM) ────────────────────────────────

  it("resources/bench: collaborator → 403", async () => {
    const r = await fetch(`${baseUrl}/api/resources/bench`, { headers: h(collabId, "collaborator") });
    assert.equal(r.status, 403);
  });

  it("resources/bench: super_user → not 403", async () => {
    const r = await fetch(`${baseUrl}/api/resources/bench`, { headers: h(pmId, "super_user") });
    assert.ok(r.status !== 403, `expected guard to pass, got ${r.status}`);
  });

  // ── POST /api/holiday-calendars  (requireAdmin) ───────────────────────────

  it("holiday-calendars POST: super_user → 403", async () => {
    const r = await fetch(`${baseUrl}/api/holiday-calendars`, {
      method: "POST",
      headers: jh(pmId, "super_user"),
      body: JSON.stringify({ name: `${TAG}_cal_pm`, year: 2026, country: "CA" }),
    });
    assert.equal(r.status, 403);
  });

  it("holiday-calendars POST: collaborator → 403", async () => {
    const r = await fetch(`${baseUrl}/api/holiday-calendars`, {
      method: "POST",
      headers: jh(collabId, "collaborator"),
      body: JSON.stringify({ name: `${TAG}_cal_collab`, year: 2026, country: "CA" }),
    });
    assert.equal(r.status, 403);
  });

  it("holiday-calendars POST: account_admin → not 403", async () => {
    const r = await fetch(`${baseUrl}/api/holiday-calendars`, {
      method: "POST",
      headers: jh(adminId, "account_admin"),
      body: JSON.stringify({ name: `${TAG}_cal_admin` }),
    });
    assert.ok(r.status !== 403, `expected guard to pass, got ${r.status}`);
    if (r.status === 201) {
      const row = await r.json() as any;
      if (row?.id) cleanupCalIds.push(row.id);
    }
  });

  // ── POST /api/document-templates  (requireAdmin) ─────────────────────────

  it("document-templates POST: super_user → 403", async () => {
    const r = await fetch(`${baseUrl}/api/document-templates`, {
      method: "POST",
      headers: jh(pmId, "super_user"),
      body: JSON.stringify({ name: `${TAG}_tmpl_pm`, description: "test", content: "hello", documentType: "general" }),
    });
    assert.equal(r.status, 403);
  });

  it("document-templates POST: collaborator → 403", async () => {
    const r = await fetch(`${baseUrl}/api/document-templates`, {
      method: "POST",
      headers: jh(collabId, "collaborator"),
      body: JSON.stringify({ name: `${TAG}_tmpl_c`, description: "test", content: "hello", documentType: "general" }),
    });
    assert.equal(r.status, 403);
  });

  it("document-templates POST: account_admin → not 403", async () => {
    const r = await fetch(`${baseUrl}/api/document-templates`, {
      method: "POST",
      headers: jh(adminId, "account_admin"),
      body: JSON.stringify({ name: `${TAG}_tmpl_admin`, description: "phase4 verify", content: "hello", documentType: "general" }),
    });
    assert.ok(r.status !== 403, `expected guard to pass, got ${r.status}`);
    if (r.status === 201) {
      const row = await r.json() as any;
      if (row?.id) cleanupTmplIds.push(row.id);
    }
  });

  // ── POST /api/timesheets/:id/unapprove  (requirePM) ──────────────────────
  // Guard fires before any DB lookup, so a non-existent id=99999 is fine here.

  it("timesheets unapprove: collaborator → 403", async () => {
    const r = await fetch(`${baseUrl}/api/timesheets/99999/unapprove`, {
      method: "POST",
      headers: jh(collabId, "collaborator"),
    });
    assert.equal(r.status, 403);
  });

  it("timesheets unapprove: unauthenticated → 401", async () => {
    const r = await fetch(`${baseUrl}/api/timesheets/99999/unapprove`, { method: "POST" });
    assert.equal(r.status, 401);
  });

  it("timesheets unapprove: super_user → not 403 (404 for missing sheet)", async () => {
    const r = await fetch(`${baseUrl}/api/timesheets/99999/unapprove`, {
      method: "POST",
      headers: jh(pmId, "super_user"),
    });
    assert.ok(r.status !== 403, `expected guard to pass, got ${r.status}`);
  });
});
