/**
 * Phase 4 Verification — FIX 4/5/7: Ownership scoping, DB re-validation,
 * and audit log coverage.
 *
 * FIX 4 — Ownership checks:
 *   PATCH /time-entries/:id  — collaborator cannot edit another user's entry (IDOR)
 *   GET  /timesheets/:id     — collaborator cannot view another user's sheet (IDOR)
 *   POST /timesheets/:id/approve — actor cannot approve own timesheet (self-approval)
 *   DELETE /time-off-requests/:id — collaborator cannot delete another user's request
 *   GET /users/:id           — collaborator cannot view another user's profile (IDOR)
 *   POST /users/:id/skills   — collaborator cannot manage another user's skills
 *
 * FIX 5 — DB re-validation:
 *   POST /timesheets/:id/approve — inactive actor rejected even with valid role header
 *
 * FIX 7 — Audit log:
 *   POST /timesheets/:id/approve — audit_log row written with action="approved"
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
  db,
  usersTable,
  timesheetsTable,
  timeEntriesTable,
  timeOffRequestsTable,
  auditLogTable,
} from "@workspace/db";
import { and, desc, eq, inArray } from "drizzle-orm";

const TAG = `RBAC47_${Date.now()}`;
const J = "application/json";

// ── helpers ──────────────────────────────────────────────────────────────────

function nextMonday(): string {
  const d = new Date();
  const dow = d.getDay();
  const diff = dow === 0 ? 1 : 8 - dow;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// ── test suite ───────────────────────────────────────────────────────────────

describe("FIX 4 — ownership / IDOR checks", () => {
  let server: Server;
  let baseUrl: string;

  let adminId: number;
  let pmId: number;
  let collabAId: number;  // owns the test resources
  let collabBId: number;  // the intruding collaborator

  let entryAId: number;           // time entry owned by collabA
  let timesheetAId: number;       // timesheet owned by collabA (Submitted)
  let timesheetPmId: number;      // timesheet owned by pmId (Submitted, for self-approval test)
  let timeOffAId: number;         // time-off request owned by collabA

  const tsWeek = nextMonday();
  const tsWeekPrev = (() => {
    const d = new Date(tsWeek + "T00:00:00");
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  })();

  before(async () => {
    const ts = Date.now();

    const [admin] = await db.insert(usersTable).values({
      name: `${TAG}_admin`, initials: "HA", role: "account_admin",
      email: `${TAG}-admin-${ts}@test.local`, department: "QA",
    } as any).returning();
    adminId = admin.id;

    const [pm] = await db.insert(usersTable).values({
      name: `${TAG}_pm`, initials: "HP", role: "super_user",
      email: `${TAG}-pm-${ts}@test.local`, department: "QA",
    } as any).returning();
    pmId = pm.id;

    const [cA] = await db.insert(usersTable).values({
      name: `${TAG}_cA`, initials: "CA", role: "collaborator",
      email: `${TAG}-ca-${ts}@test.local`, department: "QA",
    } as any).returning();
    collabAId = cA.id;

    const [cB] = await db.insert(usersTable).values({
      name: `${TAG}_cB`, initials: "CB", role: "collaborator",
      email: `${TAG}-cb-${ts}@test.local`, department: "QA",
    } as any).returning();
    collabBId = cB.id;

    // Time entry owned by collabA
    const [entry] = await db.insert(timeEntriesTable).values({
      userId: collabAId,
      date: isoDate(1),
      hours: "4",
      description: `${TAG}_entry`,
      billable: false,
    } as any).returning();
    entryAId = entry.id;

    // Timesheet owned by collabA — Submitted
    const [tsA] = await db.insert(timesheetsTable).values({
      userId: collabAId,
      weekStart: tsWeek,
      status: "Submitted",
      totalHours: "8",
      billableHours: "0",
      submittedAt: new Date(),
      submittedByUserId: collabAId,
    } as any).returning();
    timesheetAId = tsA.id;

    // Timesheet owned by PM — Submitted (used for self-approval test)
    const [tsPm] = await db.insert(timesheetsTable).values({
      userId: pmId,
      weekStart: tsWeekPrev,
      status: "Submitted",
      totalHours: "8",
      billableHours: "8",
      submittedAt: new Date(),
      submittedByUserId: pmId,
    } as any).returning();
    timesheetPmId = tsPm.id;

    // Time-off request owned by collabA
    const [tor] = await db.insert(timeOffRequestsTable).values({
      userId: collabAId,
      type: "Vacation",
      startDate: isoDate(30),
      endDate: isoDate(31),
      status: "Pending",
    } as any).returning();
    timeOffAId = tor.id;

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await db.delete(timeOffRequestsTable).where(eq(timeOffRequestsTable.id, timeOffAId)).catch(() => {});
    await db.delete(timesheetsTable).where(inArray(timesheetsTable.id, [timesheetAId, timesheetPmId].filter(Boolean))).catch(() => {});
    await db.delete(timeEntriesTable).where(eq(timeEntriesTable.id, entryAId)).catch(() => {});
    await db.delete(usersTable).where(inArray(usersTable.id, [adminId, pmId, collabAId, collabBId].filter(Boolean))).catch(() => {});
    await new Promise<void>((r) => server.close(() => r()));
  });

  const h = (id: number, role: string) => ({
    "x-user-id": String(id),
    "x-user-role": role,
  });
  const jh = (id: number, role: string) => ({ ...h(id, role), "content-type": J });

  // ── PATCH /time-entries/:id — cross-user IDOR ─────────────────────────────

  it("time-entries PATCH: collaborator cannot edit another user's entry → 403", async () => {
    const r = await fetch(`${baseUrl}/api/time-entries/${entryAId}`, {
      method: "PATCH",
      headers: jh(collabBId, "collaborator"),
      body: JSON.stringify({ hours: 2 }),
    });
    assert.equal(r.status, 403);
  });

  it("time-entries PATCH: collaborator can edit own entry → not 403", async () => {
    const r = await fetch(`${baseUrl}/api/time-entries/${entryAId}`, {
      method: "PATCH",
      headers: jh(collabAId, "collaborator"),
      body: JSON.stringify({ hours: 4 }),
    });
    assert.ok(r.status !== 403, `expected own-entry edit to pass guard, got ${r.status}`);
  });

  it("time-entries PATCH: super_user can edit any entry → not 403", async () => {
    const r = await fetch(`${baseUrl}/api/time-entries/${entryAId}`, {
      method: "PATCH",
      headers: jh(pmId, "super_user"),
      body: JSON.stringify({ hours: 4 }),
    });
    assert.ok(r.status !== 403, `expected PM to pass ownership guard, got ${r.status}`);
  });

  // ── GET /timesheets/:id — cross-user IDOR ────────────────────────────────

  it("timesheets GET by id: collaborator cannot view another user's sheet → 403", async () => {
    const r = await fetch(`${baseUrl}/api/timesheets/${timesheetAId}`, {
      headers: h(collabBId, "collaborator"),
    });
    assert.equal(r.status, 403);
  });

  it("timesheets GET by id: collaborator can view own sheet → not 403", async () => {
    const r = await fetch(`${baseUrl}/api/timesheets/${timesheetAId}`, {
      headers: h(collabAId, "collaborator"),
    });
    assert.ok(r.status !== 403, `expected own-sheet read to pass guard, got ${r.status}`);
  });

  it("timesheets GET by id: super_user can view any sheet → not 403", async () => {
    const r = await fetch(`${baseUrl}/api/timesheets/${timesheetAId}`, {
      headers: h(pmId, "super_user"),
    });
    assert.ok(r.status !== 403, `expected PM to pass ownership guard, got ${r.status}`);
  });

  // ── POST /timesheets/:id/approve — self-approval block ───────────────────

  it("timesheets approve: actor cannot approve own timesheet → 403", async () => {
    const r = await fetch(`${baseUrl}/api/timesheets/${timesheetPmId}/approve`, {
      method: "POST",
      headers: jh(pmId, "super_user"),
      body: JSON.stringify({}),
    });
    assert.equal(r.status, 403);
  });

  it("timesheets approve: different PM can approve → not 403", async () => {
    // collabA's sheet; pmId is the approver — no self-approval conflict
    const r = await fetch(`${baseUrl}/api/timesheets/${timesheetAId}/approve`, {
      method: "POST",
      headers: jh(pmId, "super_user"),
      body: JSON.stringify({}),
    });
    assert.ok(r.status !== 403, `expected approval of other user's sheet to pass, got ${r.status}`);
  });

  // ── DELETE /time-off-requests/:id — cross-user IDOR ──────────────────────

  it("time-off DELETE: collaborator cannot delete another user's request → 403", async () => {
    const r = await fetch(`${baseUrl}/api/time-off-requests/${timeOffAId}`, {
      method: "DELETE",
      headers: h(collabBId, "collaborator"),
    });
    assert.equal(r.status, 403);
  });

  it("time-off DELETE: collaborator can delete own request → not 403", async () => {
    // Note: deletes the row. Cleanup already covers it via catch().
    const r = await fetch(`${baseUrl}/api/time-off-requests/${timeOffAId}`, {
      method: "DELETE",
      headers: h(collabAId, "collaborator"),
    });
    assert.ok(r.status !== 403, `expected own-request delete to pass guard, got ${r.status}`);
  });

  // ── GET /users/:id — cross-user IDOR ─────────────────────────────────────

  it("users GET by id: collaborator cannot view another user's profile → 403", async () => {
    const r = await fetch(`${baseUrl}/api/users/${collabAId}`, {
      headers: h(collabBId, "collaborator"),
    });
    assert.equal(r.status, 403);
  });

  it("users GET by id: collaborator can view own profile → not 403", async () => {
    const r = await fetch(`${baseUrl}/api/users/${collabBId}`, {
      headers: h(collabBId, "collaborator"),
    });
    assert.ok(r.status !== 403, `expected own-profile read to pass guard, got ${r.status}`);
  });

  it("users GET by id: super_user can view any profile → not 403", async () => {
    const r = await fetch(`${baseUrl}/api/users/${collabAId}`, {
      headers: h(pmId, "super_user"),
    });
    assert.ok(r.status !== 403, `expected PM to pass ownership guard, got ${r.status}`);
  });

  // ── POST /users/:id/skills — cross-user IDOR ─────────────────────────────

  it("users skills POST: collaborator cannot manage another user's skills → 403", async () => {
    const r = await fetch(`${baseUrl}/api/users/${collabAId}/skills`, {
      method: "POST",
      headers: jh(collabBId, "collaborator"),
      body: JSON.stringify({ skillId: 1, proficiencyLevel: "Beginner" }),
    });
    assert.equal(r.status, 403);
  });

  it("users skills POST: collaborator can manage own skills → not 403", async () => {
    const r = await fetch(`${baseUrl}/api/users/${collabBId}/skills`, {
      method: "POST",
      headers: jh(collabBId, "collaborator"),
      body: JSON.stringify({ skillId: 1, proficiencyLevel: "Beginner" }),
    });
    // Own-user guard passes; may still be 404/409/422 depending on data — that's fine.
    assert.ok(r.status !== 403, `expected own-user skill POST to pass guard, got ${r.status}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("FIX 5 — DB re-validation: inactive actor blocked on approve", () => {
  let server: Server;
  let baseUrl: string;

  let inactivePmId: number;
  let collabId: number;
  let timesheetId: number;

  const tsWeek = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // 2 weeks out — unlikely to clash
    const dow = d.getDay();
    d.setDate(d.getDate() + (dow === 0 ? 1 : 8 - dow));
    return d.toISOString().slice(0, 10);
  })();

  before(async () => {
    const ts = Date.now();

    const [pm] = await db.insert(usersTable).values({
      name: `${TAG}_inactive_pm`, initials: "IP", role: "super_user",
      email: `${TAG}-ipm-${ts}@test.local`, department: "QA",
      activeStatus: "active",
    } as any).returning();
    inactivePmId = pm.id;

    const [collab] = await db.insert(usersTable).values({
      name: `${TAG}_fix5_collab`, initials: "FC", role: "collaborator",
      email: `${TAG}-f5c-${ts}@test.local`, department: "QA",
    } as any).returning();
    collabId = collab.id;

    const [ts_row] = await db.insert(timesheetsTable).values({
      userId: collabId,
      weekStart: tsWeek,
      status: "Submitted",
      totalHours: "8",
      billableHours: "0",
      submittedAt: new Date(),
      submittedByUserId: collabId,
    } as any).returning();
    timesheetId = ts_row.id;

    // Deactivate the PM before the server starts, so DB state is already stale.
    await db.update(usersTable)
      .set({ activeStatus: "inactive" } as any)
      .where(eq(usersTable.id, inactivePmId));

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await db.delete(timesheetsTable).where(eq(timesheetsTable.id, timesheetId)).catch(() => {});
    await db.delete(usersTable).where(inArray(usersTable.id, [inactivePmId, collabId].filter(Boolean))).catch(() => {});
    await new Promise<void>((r) => server.close(() => r()));
  });

  it("inactive PM with valid role header is blocked from approving → 401 or 403", async () => {
    // Headers claim super_user, but DB shows activeStatus='inactive'.
    // The roleClaim middleware re-validates from DB and may return 401;
    // the handler's FIX-5 belt-and-braces check returns 403.
    // Either status correctly denies the inactive actor.
    const r = await fetch(`${baseUrl}/api/timesheets/${timesheetId}/approve`, {
      method: "POST",
      headers: {
        "content-type": J,
        "x-user-id": String(inactivePmId),
        "x-user-role": "super_user",
      },
      body: JSON.stringify({}),
    });
    assert.ok(
      r.status === 401 || r.status === 403,
      `expected inactive actor to be denied (401 or 403), got ${r.status}`,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("FIX 7 — audit log written on timesheet approve", () => {
  let server: Server;
  let baseUrl: string;

  let pmId: number;
  let collabId: number;
  let timesheetId: number;

  const tsWeek = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 21); // 3 weeks out
    const dow = d.getDay();
    d.setDate(d.getDate() + (dow === 0 ? 1 : 8 - dow));
    return d.toISOString().slice(0, 10);
  })();

  before(async () => {
    const ts = Date.now();

    const [pm] = await db.insert(usersTable).values({
      name: `${TAG}_audit_pm`, initials: "AP", role: "super_user",
      email: `${TAG}-apm-${ts}@test.local`, department: "QA",
      activeStatus: "active",
    } as any).returning();
    pmId = pm.id;

    const [collab] = await db.insert(usersTable).values({
      name: `${TAG}_audit_collab`, initials: "AC", role: "collaborator",
      email: `${TAG}-ac-${ts}@test.local`, department: "QA",
    } as any).returning();
    collabId = collab.id;

    const [ts_row] = await db.insert(timesheetsTable).values({
      userId: collabId,
      weekStart: tsWeek,
      status: "Submitted",
      totalHours: "8",
      billableHours: "0",
      submittedAt: new Date(),
      submittedByUserId: collabId,
    } as any).returning();
    timesheetId = ts_row.id;

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await db.delete(timesheetsTable).where(eq(timesheetsTable.id, timesheetId)).catch(() => {});
    await db.delete(usersTable).where(inArray(usersTable.id, [pmId, collabId].filter(Boolean))).catch(() => {});
    await new Promise<void>((r) => server.close(() => r()));
  });

  it("approve writes an audit_log row with action='approved' and entityType='timesheet'", async () => {
    // Capture the max audit_log id before the approve call.
    const before = await db.select({ id: auditLogTable.id })
      .from(auditLogTable)
      .orderBy(desc(auditLogTable.id))
      .limit(1);
    const beforeMaxId = before[0]?.id ?? 0;

    // PM approves the collab's timesheet.
    const r = await fetch(`${baseUrl}/api/timesheets/${timesheetId}/approve`, {
      method: "POST",
      headers: {
        "content-type": J,
        "x-user-id": String(pmId),
        "x-user-role": "super_user",
      },
      body: JSON.stringify({}),
    });
    assert.ok(r.status === 200 || r.status === 201, `expected 200/201 from approve, got ${r.status}`);

    // logAudit is fire-and-forget — give it a brief moment to settle.
    await new Promise<void>((res) => setTimeout(res, 200));

    // Verify a new audit row exists.
    const after = await db.select()
      .from(auditLogTable)
      .where(
        and(
          eq(auditLogTable.entityType, "timesheet"),
          eq(auditLogTable.action, "approved"),
        ),
      )
      .orderBy(desc(auditLogTable.id))
      .limit(5);

    const fresh = after.find((row) => row.id > beforeMaxId && row.entityId === String(timesheetId));
    assert.ok(
      fresh,
      `expected a new audit_log row with entityType='timesheet', action='approved', entityId='${timesheetId}'`,
    );
    assert.equal(fresh!.actorUserId, pmId, "audit row actorUserId must equal the approver's id");
  });
});
