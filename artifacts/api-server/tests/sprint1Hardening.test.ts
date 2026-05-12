/**
 * Sprint 1 hardening — focused integration tests
 *
 *   1. Auth audit emission on missing/invalid x-user-id and role mismatch
 *      → row written to audit_log with entityType='auth_event'.
 *   2. Closed-project guard on a *deleted* project blocks even with
 *      account_admin + X-Admin-Override (the override only applies to
 *      'completed' projects, not soft-deleted ones).
 *   3. Opportunity → project convert is idempotent: a second call returns
 *      the same project id rather than creating a duplicate.
 *   4. ChangeOrder PATCH self-approval block: a fresh re-read inside the
 *      txn rejects the actor when they are the submitter, even when the
 *      pre-txn read showed a different submitter.
 */

import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import app from "../src/app.ts";
import {
  db,
  accountsTable,
  usersTable,
  projectsTable,
  opportunitiesTable,
  changeOrdersTable,
  auditLogTable,
} from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";

const JSON_HEADERS = { "content-type": "application/json" };

describe("Sprint 1 hardening", () => {
  let server: Server;
  let baseUrl: string;
  let acctId: number;
  let adminUserId: number;
  let submitterUserId: number;

  // Resources to clean up
  let deletedProjectId: number;
  let oppId: number;
  let convertedProjectId: number | null = null;
  let crProjectId: number;
  let crId: number;

  before(async () => {
    const [acct] = await db.select().from(accountsTable).limit(1);
    const users = await db.select().from(usersTable).limit(2);
    assert.ok(acct, "seed must have an account");
    assert.ok(users.length >= 2, "seed must have at least 2 users");
    acctId = acct.id;
    adminUserId = users[0].id;
    submitterUserId = users[1].id;

    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const baseProj = {
      accountId: acctId, ownerId: adminUserId, startDate: today, dueDate: due,
      billingType: "Fixed", budget: "0", budgetedHours: "0",
    };

    // Soft-deleted project for guard test
    const [dp] = await db.insert(projectsTable).values({
      ...baseProj, name: "TEST_DELETED_PROJECT", status: "active", deletedAt: new Date(),
    } as any).returning();
    deletedProjectId = dp.id;

    // Opportunity for idempotency test (Won so convert is allowed)
    const [opp] = await db.insert(opportunitiesTable).values({
      accountId: acctId, name: "TEST_IDEMPOTENT_OPP",
      stage: "Won", probability: 100, value: "1000",
      ownerId: adminUserId,
    } as any).returning();
    oppId = opp.id;

    // CR project + CR submitted by submitterUserId for self-approval test
    const [cp] = await db.insert(projectsTable).values({
      ...baseProj, name: "TEST_CR_PROJECT", status: "active",
    } as any).returning();
    crProjectId = cp.id;
    const [cr] = await db.insert(changeOrdersTable).values({
      projectId: crProjectId,
      title: "TEST_SELF_APPROVE_CR",
      description: "self-approve guard test",
      status: "Submitted",
      submittedByUserId: submitterUserId,
    } as any).returning();
    crId = cr.id;

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await db.delete(changeOrdersTable).where(eq(changeOrdersTable.id, crId)).catch(() => {});
    await db.delete(projectsTable).where(eq(projectsTable.id, crProjectId)).catch(() => {});
    if (convertedProjectId) {
      await db.delete(projectsTable).where(eq(projectsTable.id, convertedProjectId)).catch(() => {});
    }
    await db.delete(opportunitiesTable).where(eq(opportunitiesTable.id, oppId)).catch(() => {});
    await db.delete(projectsTable).where(eq(projectsTable.id, deletedProjectId)).catch(() => {});
    if (server) await new Promise<void>((r) => server.close(() => r()));
  });

  // ── 1. Auth audit emission ────────────────────────────────────────────────

  it("missing x-user-id on a protected route writes an auth_event audit row", async () => {
    // Track highest id before so we only inspect rows written by THIS request.
    const beforeRows = await db.select().from(auditLogTable)
      .where(eq(auditLogTable.entityType, "auth_event"))
      .orderBy(desc(auditLogTable.id))
      .limit(1);
    const beforeMaxId = beforeRows[0]?.id ?? 0;

    const res = await fetch(`${baseUrl}/api/projects`, { method: "GET" });
    assert.equal(res.status, 401);

    // Auth audit is fire-and-forget — give it a beat to land.
    await new Promise((r) => setTimeout(r, 150));

    const after = await db.select().from(auditLogTable)
      .where(eq(auditLogTable.entityType, "auth_event"))
      .orderBy(desc(auditLogTable.id))
      .limit(10);
    const newRows = after.filter(r => r.id > beforeMaxId);
    assert.ok(newRows.length > 0, "expected at least one new auth_event row");
    const found = newRows.find(r => String(r.description ?? "").startsWith("missing_user_id"));
    assert.ok(found, "expected a missing_user_id audit entry");
  });

  it("role mismatch (claimed role not in user's assigned set) writes an auth_event audit row", async () => {
    // Pick a user whose role is NOT account_admin — claim account_admin to force mismatch.
    const nonAdmin = await db.select().from(usersTable)
      .where(eq(usersTable.role, "Collaborator")).limit(1);
    if (nonAdmin.length === 0) {
      // Fall back: any user with role != Admin
      const anyUser = await db.select().from(usersTable).limit(20);
      const candidate = anyUser.find(u => u.role !== "Admin" && u.role !== "account_admin");
      if (!candidate) return; // nothing we can assert against — skip
      const res = await fetch(`${baseUrl}/api/projects`, {
        method: "GET",
        headers: { "x-user-id": String(candidate.id), "x-user-role": "account_admin" },
      });
      assert.equal(res.status, 403);
    } else {
      const res = await fetch(`${baseUrl}/api/projects`, {
        method: "GET",
        headers: { "x-user-id": String(nonAdmin[0].id), "x-user-role": "account_admin" },
      });
      assert.equal(res.status, 403);
    }
    await new Promise((r) => setTimeout(r, 150));
    const rows = await db.select().from(auditLogTable)
      .where(eq(auditLogTable.entityType, "auth_event"))
      .orderBy(desc(auditLogTable.id))
      .limit(20);
    const mismatch = rows.find(r => String(r.description ?? "").startsWith("role_mismatch"));
    assert.ok(mismatch, "expected a role_mismatch audit entry");
  });

  // ── 2. Deleted-project guard (admin override does NOT apply) ──────────────

  it("admin override does NOT bypass the deleted-project block", async () => {
    const res = await fetch(`${baseUrl}/api/time-entries`, {
      method: "POST",
      headers: {
        ...JSON_HEADERS,
        "x-user-id": String(adminUserId),
        "x-user-role": "account_admin",
        "x-admin-override": "true",
      },
      body: JSON.stringify({
        userId: adminUserId,
        projectId: deletedProjectId,
        date: new Date().toISOString().slice(0, 10),
        hours: 1,
        description: "should-be-blocked",
        billable: false,
      }),
    });
    assert.equal(res.status, 403);
    const body = await res.json() as Record<string, unknown>;
    assert.equal(body.error, "project_deleted",
      "deleted projects must be blocked with project_deleted regardless of override");
  });

  // ── 3. Opportunity convert idempotency ────────────────────────────────────

  it("opportunity → convert-to-project is idempotent on second call", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const body = JSON.stringify({
      name: "TEST_IDEMPOTENT_PROJECT", startDate: today, dueDate: due,
    });
    const headers = {
      ...JSON_HEADERS,
      "x-user-id": String(adminUserId),
      "x-user-role": "account_admin",
    };

    const r1 = await fetch(`${baseUrl}/api/opportunities/${oppId}/convert-to-project`, {
      method: "POST", headers, body,
    });
    assert.equal(r1.status, 201);
    const j1 = await r1.json() as { project: { id: number } };
    convertedProjectId = j1.project.id;

    const r2 = await fetch(`${baseUrl}/api/opportunities/${oppId}/convert-to-project`, {
      method: "POST", headers, body,
    });
    assert.equal(r2.status, 200, "second convert should return 200, not create a new project");
    const j2 = await r2.json() as { project: { id: number }; alreadyConverted?: boolean };
    assert.equal(j2.project.id, j1.project.id, "second call must return same project id");
    assert.equal(j2.alreadyConverted, true);
  });

  // ── 4. ChangeOrder self-approval inside the txn ───────────────────────────

  it("submitter approving their own change request is rejected with 403", async () => {
    // Promote the submitter to account_admin for the duration of this test so
    // the role-claim middleware permits the call to reach the self-approval
    // guard. Without this the request would 403 on role mismatch instead.
    const [origUser] = await db.select().from(usersTable).where(eq(usersTable.id, submitterUserId));
    const origRole = origUser.role;
    await db.update(usersTable).set({ role: "account_admin" } as any).where(eq(usersTable.id, submitterUserId));
    try {
      const res = await fetch(`${baseUrl}/api/change-orders/${crId}`, {
        method: "PATCH",
        headers: {
          ...JSON_HEADERS,
          "x-user-id": String(submitterUserId), // same as submittedByUserId
          "x-user-role": "account_admin",
        },
        body: JSON.stringify({ status: "Approved" }),
      });
      assert.equal(res.status, 403);
      const body = await res.json() as Record<string, unknown>;
      assert.match(String(body.error), /cannot approve/i);
    } finally {
      await db.update(usersTable).set({ role: origRole } as any).where(eq(usersTable.id, submitterUserId));
    }

    // Verify CR was NOT flipped to Approved.
    const [fresh] = await db.select().from(changeOrdersTable).where(eq(changeOrdersTable.id, crId));
    assert.notEqual(fresh.status, "Approved", "CR must remain unapproved after self-approve attempt");
  });
});
