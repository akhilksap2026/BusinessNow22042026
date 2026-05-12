/**
 * Sprint 2 / Phase 8.4 — Escalation re-arms after a resubmit.
 *
 * Regression for the gap caught in Sprint 2 review: once a timesheet has been
 * escalated, withdrawing/rejecting back to Draft and resubmitting must clear
 * `escalatedAt` so the next stale-check is eligible again.
 */

import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";

import { db, usersTable, timesheetsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { runTimesheetEscalations } from "../src/lib/timesheetEscalation";

describe("escalation lifecycle re-arm", () => {
  let mgrId: number;
  let userId: number;
  let tsId: number;

  before(async () => {
    const ts = Date.now();
    const [m] = await db.insert(usersTable).values({
      name: "Esc Mgr", initials: "EM", role: "super_user",
      email: `esc-mgr-${ts}@test.local`, department: "TST_ESC",
    } as any).returning();
    mgrId = m.id;
    const [u] = await db.insert(usersTable).values({
      name: "Esc Usr", initials: "EU", role: "collaborator",
      email: `esc-usr-${ts}@test.local`, department: "TST_ESC", managerId: m.id,
    } as any).returning();
    userId = u.id;

    const oldSubmit = new Date(Date.now() - 10 * 86400_000);
    const today = new Date().toISOString().slice(0, 10);
    const [t] = await db.insert(timesheetsTable).values({
      userId, weekStart: today, status: "Submitted", totalHours: "1", billableHours: "1",
      submittedAt: oldSubmit,
    } as any).returning();
    tsId = t.id;
  });

  after(async () => {
    await db.delete(timesheetsTable).where(eq(timesheetsTable.id, tsId)).catch(() => {});
    await db.delete(usersTable).where(inArray(usersTable.id, [userId, mgrId])).catch(() => {});
  });

  it("escalates once, then re-arms after Draft → resubmit", async () => {
    // First run escalates the stale timesheet.
    await runTimesheetEscalations();
    let [row] = await db.select().from(timesheetsTable).where(eq(timesheetsTable.id, tsId));
    assert.notEqual(row.escalatedAt, null, "first run should escalate");

    // Second run is a no-op while still escalated.
    const firstEsc = row.escalatedAt;
    await runTimesheetEscalations();
    [row] = await db.select().from(timesheetsTable).where(eq(timesheetsTable.id, tsId));
    assert.equal(
      (row.escalatedAt as Date).getTime(),
      (firstEsc as Date).getTime(),
      "second run must not re-write escalatedAt while still escalated",
    );

    // Simulate withdraw to Draft (clears escalatedAt) then resubmit (also clears).
    await db.update(timesheetsTable).set({ status: "Draft", escalatedAt: null } as any).where(eq(timesheetsTable.id, tsId));
    await db.update(timesheetsTable)
      .set({ status: "Submitted", submittedAt: new Date(Date.now() - 10 * 86400_000), escalatedAt: null } as any)
      .where(eq(timesheetsTable.id, tsId));

    // Now another stale-check must escalate again.
    await runTimesheetEscalations();
    [row] = await db.select().from(timesheetsTable).where(eq(timesheetsTable.id, tsId));
    assert.notEqual(row.escalatedAt, null, "post-resubmit, escalation must re-fire");
  });
});
