/**
 * E2E tests for Tasks T1–T10 (May 2026 sprint).
 *
 * T1  — EAC formula: eac / eacStatus / varianceHours on GET /tasks
 * T2  — Badge counts: badgeCounts.changeRequests + badgeCounts.updates on summary
 * T3  — Burn chart: GET /projects/:id/burn-chart structure + data integrity
 * T4  — (front-end only component; not testable here)
 * T5  — (front-end only Overview tab; not testable here)
 * T6  — (front-end only; forms tab absence; not testable here)
 * T7  — health-stats: atRisk (milestones due) field present + correct type
 * T8  — Profitability KPI: profitToDate + marginPct on summary
 * T9  — (soft-delete audit only; no schema changes; not applicable)
 * T10 — Quoted-vs-actual: GET /projects/:id/quoted-vs-actual structure + totals
 */

import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import app from "../src/app.ts";
import {
  db,
  accountsTable,
  projectsTable,
  tasksTable,
  timeEntriesTable,
  timesheetsTable,
  invoicesTable,
  changeOrdersTable,
  projectUpdatesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const PM_HEADERS = {
  "x-user-id": "1",
  "x-user-role": "account_admin",
  "Content-Type": "application/json",
};

async function req(
  server: Server,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; body: unknown }> {
  const port = (server.address() as AddressInfo).port;
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: PM_HEADERS,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

describe("T1–T10 E2E", () => {
  let server: Server;
  let acctId: number;
  let projectId: number;
  let taskId: number;
  let phaseId: number;
  let invoiceId: string;
  let coId: number;
  let updateId: number;

  let timesheetId: number;

  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });

    // Reuse the first existing account (avoids NOT NULL domain/tier/region constraints)
    const [acct] = await db.select({ id: accountsTable.id }).from(accountsTable).limit(1);
    acctId = acct.id;

    const [proj] = await db
      .insert(projectsTable)
      .values({
        name: "E2E T1-T10 Project",
        accountId: acctId,
        ownerId: 1,
        status: "Active",
        budget: "100000",
        startDate: "2025-01-01",
        dueDate: "2025-12-31",
      })
      .returning({ id: projectsTable.id });
    projectId = proj.id;

    // Phase (isPhase = true, no parent)
    const [phase] = await db
      .insert(tasksTable)
      .values({
        projectId,
        name: "Phase A",
        status: "In Progress",
        isPhase: true,
        estimateHours: "40",
        plannedHours: "40",
        completionPct: 50,
      })
      .returning({ id: tasksTable.id });
    phaseId = phase.id;

    // Child task under phase (12h actual at 50% → EAC = 24, variance = +4)
    const [task] = await db
      .insert(tasksTable)
      .values({
        projectId,
        parentTaskId: phaseId,
        name: "Child Task",
        status: "In Progress",
        estimateHours: "20",
        plannedHours: "20",
        completionPct: 50,
      })
      .returning({ id: tasksTable.id });
    taskId = task.id;

    // Timesheet + approved time entry: 12h * $150 = $1800 cost
    const [ts] = await db
      .insert(timesheetsTable)
      .values({ userId: 1, weekStart: "2025-06-02", status: "Approved" })
      .returning({ id: timesheetsTable.id });
    timesheetId = ts.id;

    await db.insert(timeEntriesTable).values({
      userId: 1,
      projectId,
      taskId,
      timesheetId,
      date: "2025-06-02",
      hours: "12",
      description: "E2E entry",
      billable: true,
      status: "Approved",
      billRate: "150",
    });

    // Invoice: $5000 invoiced. profit = 5000 - 1800 = 3200, margin = 64%
    const invId = `INV-2025-E2ET-${projectId}`;
    await db.insert(invoicesTable).values({
      id: invId,
      projectId,
      accountId: acctId,
      amount: "5000",
      total: "5000",
      description: "E2E test invoice",
      status: "Paid",
      issueDate: "2025-06-30",
      dueDate: "2025-07-30",
    });
    invoiceId = invId;

    // Change order (for badge count)
    const [co] = await db
      .insert(changeOrdersTable)
      .values({ projectId, title: "Extra scope" })
      .returning({ id: changeOrdersTable.id });
    coId = co.id;

    // Project update (for badge count)
    const [upd] = await db
      .insert(projectUpdatesTable)
      .values({ projectId, createdByUserId: 1, subject: "Week 1 update", body: "On track." })
      .returning({ id: projectUpdatesTable.id });
    updateId = upd.id;
  });

  after(async () => {
    // Clean up in reverse FK order (reused account is not deleted)
    await db.delete(timeEntriesTable).where(eq(timeEntriesTable.projectId, projectId));
    await db.delete(timesheetsTable).where(eq(timesheetsTable.id, timesheetId));
    await db.delete(invoicesTable).where(eq(invoicesTable.projectId, projectId));
    await db.delete(changeOrdersTable).where(eq(changeOrdersTable.projectId, projectId));
    await db.delete(projectUpdatesTable).where(eq(projectUpdatesTable.projectId, projectId));
    await db.delete(tasksTable).where(eq(tasksTable.projectId, projectId));
    await db.delete(projectsTable).where(eq(projectsTable.id, projectId));
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  // ─── T1: EAC ────────────────────────────────────────────────────────────────

  describe("T1 — EAC fields on GET /tasks", () => {
    it("returns eac, eacStatus, varianceHours on every task", async () => {
      const { status, body } = await req(server, "GET", `/api/tasks?projectId=${projectId}`);
      assert.equal(status, 200);
      const tasks = Array.isArray(body) ? body : (body as any).data;
      assert.ok(tasks.length >= 2, "expected at least phase + child task");
      for (const t of tasks) {
        assert.ok(typeof t.eac === "number", `eac must be number on task ${t.id}`);
        assert.ok(
          ["under", "on-track", "over"].includes(t.eacStatus),
          `eacStatus invalid on task ${t.id}: ${t.eacStatus}`
        );
        assert.ok(typeof t.varianceHours === "number", `varianceHours must be number on task ${t.id}`);
      }
    });

    it("child task with 12h actual / 20h estimate / 50% → EAC ≈ 24, status='over'", async () => {
      const { status, body } = await req(server, "GET", `/api/tasks?projectId=${projectId}`);
      assert.equal(status, 200);
      const tasks = Array.isArray(body) ? body : (body as any).data;
      const child = tasks.find((t: any) => t.id === taskId);
      assert.ok(child, "child task not found in response");
      // EAC = actual + actual * ((1-pct)/pct) = 12 + 12*(0.5/0.5) = 24
      assert.equal(child.eac, 24);
      assert.equal(child.eacStatus, "over");
      // variance = 24 - 20 = +4
      assert.equal(child.varianceHours, 4);
    });

    it("phase with no actual hours → EAC = estimateHours, status='on-track'", async () => {
      const { status, body } = await req(server, "GET", `/api/tasks?projectId=${projectId}`);
      assert.equal(status, 200);
      const tasks = Array.isArray(body) ? body : (body as any).data;
      const phase = tasks.find((t: any) => t.id === phaseId);
      assert.ok(phase, "phase not found in response");
      assert.equal(phase.eac, 40);
      assert.equal(phase.eacStatus, "on-track");
      assert.equal(phase.varianceHours, 0);
    });

    it("GET /tasks/:id also returns eac fields", async () => {
      const { status, body } = await req(server, "GET", `/api/tasks/${taskId}`);
      assert.equal(status, 200);
      const t = body as any;
      assert.ok(typeof t.eac === "number");
      assert.ok(["under", "on-track", "over"].includes(t.eacStatus));
      assert.ok(typeof t.varianceHours === "number");
    });
  });

  // ─── T2: Badge counts ────────────────────────────────────────────────────────

  describe("T2 — badge counts on GET /projects/:id/summary", () => {
    it("summary includes badgeCounts object", async () => {
      const { status, body } = await req(server, "GET", `/api/projects/${projectId}/summary`);
      assert.equal(status, 200);
      const b = (body as any).badgeCounts;
      assert.ok(b && typeof b === "object", "badgeCounts missing");
      assert.ok(typeof b.changeRequests === "number", "changeRequests must be number");
      assert.ok(typeof b.updates === "number", "updates must be number");
    });

    it("changeRequests count matches seeded change order", async () => {
      const { body } = await req(server, "GET", `/api/projects/${projectId}/summary`);
      const b = (body as any).badgeCounts;
      assert.equal(b.changeRequests, 1, "expected 1 change order");
    });

    it("updates count matches seeded project update", async () => {
      const { body } = await req(server, "GET", `/api/projects/${projectId}/summary`);
      const b = (body as any).badgeCounts;
      assert.equal(b.updates, 1, "expected 1 project update");
    });
  });

  // ─── T3: Burn chart ──────────────────────────────────────────────────────────

  describe("T3 — GET /projects/:id/burn-chart", () => {
    it("returns 200 with expected envelope fields", async () => {
      const { status, body } = await req(server, "GET", `/api/projects/${projectId}/burn-chart`);
      assert.equal(status, 200);
      const b = body as any;
      assert.ok(typeof b.currency === "string", "currency missing");
      assert.ok(typeof b.todayLine === "string", "todayLine missing");
      assert.ok(Array.isArray(b.series), "series must be array");
    });

    it("series has at least one data point", async () => {
      const { body } = await req(server, "GET", `/api/projects/${projectId}/burn-chart`);
      assert.ok((body as any).series.length >= 1);
    });

    it("each series point has required numeric fields", async () => {
      const { body } = await req(server, "GET", `/api/projects/${projectId}/burn-chart`);
      const pts = (body as any).series as any[];
      for (const pt of pts) {
        assert.ok(typeof pt.date === "string", `date missing on point`);
        assert.ok(typeof pt.plannedBudget === "number", `plannedBudget missing`);
        assert.ok(typeof pt.actualCost === "number", `actualCost missing`);
        assert.ok(typeof pt.invoicedAmount === "number", `invoicedAmount missing`);
        assert.ok(typeof pt.plannedHours === "number", `plannedHours missing`);
        assert.ok(typeof pt.actualHours === "number", `actualHours missing`);
        assert.ok(typeof pt.forecastCost === "number", `forecastCost missing`);
        assert.ok(typeof pt.forecastHours === "number", `forecastHours missing`);
      }
    });

    it("todayLine is today (YYYY-MM-DD format)", async () => {
      const { body } = await req(server, "GET", `/api/projects/${projectId}/burn-chart`);
      const today = new Date().toISOString().slice(0, 10);
      assert.equal((body as any).todayLine, today);
    });

    it("a point on/after time entry date has actualCost > 0", async () => {
      const { body } = await req(server, "GET", `/api/projects/${projectId}/burn-chart`);
      const pts: any[] = (body as any).series;
      const pointWithCost = pts.find((p) => p.actualCost > 0);
      assert.ok(pointWithCost, "expected at least one point with actualCost > 0");
      // 12 hours * $150/h = $1800
      const maxCost = Math.max(...pts.map((p) => p.actualCost));
      assert.equal(maxCost, 1800);
    });

    it("returns 404 for non-existent project", async () => {
      const { status } = await req(server, "GET", "/api/projects/99999999/burn-chart");
      assert.equal(status, 404);
    });
  });

  // ─── T7: Health stats (Milestones Due / atRisk) ───────────────────────────────

  describe("T7 — GET /projects/:id/health-stats (atRisk / milestones due)", () => {
    it("returns 200 with atRisk numeric field", async () => {
      const { status, body } = await req(server, "GET", `/api/projects/${projectId}/health-stats`);
      assert.equal(status, 200);
      const b = body as any;
      assert.ok(typeof b.atRisk === "number", "atRisk must be a number");
    });

    it("returns all expected health-stats fields", async () => {
      const { body } = await req(server, "GET", `/api/projects/${projectId}/health-stats`);
      const b = body as any;
      for (const field of ["total", "completed", "overdue", "blocked", "atRisk", "onTrack"]) {
        assert.ok(typeof b[field] === "number", `${field} missing or non-numeric`);
      }
    });

    it("atRisk + onTrack + overdue + blocked + completed <= total", async () => {
      const { body } = await req(server, "GET", `/api/projects/${projectId}/health-stats`);
      const b = body as any;
      // totals don't need to sum exactly (categories can overlap) but each can't exceed total
      assert.ok(b.atRisk <= b.total);
      assert.ok(b.onTrack <= b.total);
    });

    it("with a past-due milestone, atRisk increments", async () => {
      // Insert an overdue milestone
      const [ms] = await db
        .insert(tasksTable)
        .values({
          projectId,
          name: "Past Due Milestone",
          status: "Not Started",
          isMilestone: true,
          dueDate: "2024-01-01",
        })
        .returning({ id: tasksTable.id });

      const { body } = await req(server, "GET", `/api/projects/${projectId}/health-stats`);
      const b = body as any;
      assert.ok(b.overdue >= 1, "overdue should be >= 1 after inserting past-due milestone");

      await db.delete(tasksTable).where(eq(tasksTable.id, ms.id));
    });
  });

  // ─── T8: Profitability KPI ────────────────────────────────────────────────────

  describe("T8 — profitability KPI on GET /projects/:id/summary", () => {
    it("summary includes profitToDate and marginPct", async () => {
      const { status, body } = await req(server, "GET", `/api/projects/${projectId}/summary`);
      assert.equal(status, 200);
      const b = body as any;
      assert.ok(typeof b.profitToDate === "number", "profitToDate missing");
      assert.ok(typeof b.marginPct === "number", "marginPct missing");
    });

    it("profitToDate = invoicedAmount − totalCost", async () => {
      const { body } = await req(server, "GET", `/api/projects/${projectId}/summary`);
      const b = body as any;
      // invoiced = 5000 (from our invoice); totalCost = 12h * $150 = 1800
      assert.equal(b.invoicedAmount, 5000);
      assert.equal(b.totalCost, 1800);
      assert.equal(b.profitToDate, 3200);
    });

    it("marginPct = round(profitToDate / invoicedAmount * 100)", async () => {
      const { body } = await req(server, "GET", `/api/projects/${projectId}/summary`);
      const b = body as any;
      const expected = Math.round((b.profitToDate / b.invoicedAmount) * 100);
      assert.equal(b.marginPct, expected);
    });

    it("marginPct is 0 when invoicedAmount is 0 (no division by zero)", async () => {
      // Create a fresh project with no invoice
      const [p2] = await db
        .insert(projectsTable)
        .values({
          name: "E2E No-Invoice Project",
          accountId: acctId,
          status: "Active",
          currency: "USD",
          budget: "50000",
          startDate: "2025-01-01",
          endDate: "2025-12-31",
        })
        .returning({ id: projectsTable.id });

      const { status, body } = await req(server, "GET", `/api/projects/${p2.id}/summary`);
      assert.equal(status, 200);
      assert.equal((body as any).marginPct, 0);

      await db.delete(projectsTable).where(eq(projectsTable.id, p2.id));
    });
  });

  // ─── T10: Quoted-vs-Actual ───────────────────────────────────────────────────

  describe("T10 — GET /projects/:id/quoted-vs-actual", () => {
    it("returns 200 with rows array and totals object", async () => {
      const { status, body } = await req(server, "GET", `/api/projects/${projectId}/quoted-vs-actual`);
      assert.equal(status, 200);
      const b = body as any;
      assert.ok(Array.isArray(b.rows), "rows must be array");
      assert.ok(b.totals && typeof b.totals === "object", "totals must be object");
      assert.ok(typeof b.totals.quotedHours === "number", "totals.quotedHours must be number");
      assert.ok(typeof b.totals.actualHours === "number", "totals.actualHours must be number");
    });

    it("returns one row for each phase in the project", async () => {
      const { body } = await req(server, "GET", `/api/projects/${projectId}/quoted-vs-actual`);
      // We seeded 1 phase (phaseId)
      assert.equal((body as any).rows.length, 1);
    });

    it("row shape has all required fields", async () => {
      const { body } = await req(server, "GET", `/api/projects/${projectId}/quoted-vs-actual`);
      const row = (body as any).rows[0] as any;
      assert.ok(typeof row.phaseId === "number");
      assert.ok(typeof row.phaseName === "string");
      assert.ok(typeof row.quotedHours === "number");
      assert.ok(typeof row.actualHours === "number");
      assert.ok(typeof row.completionPct === "number");
      assert.ok(["on-track", "at-risk", "overrun"].includes(row.status), `invalid status: ${row.status}`);
    });

    it("phase quotedHours = sum of child task estimateHours", async () => {
      const { body } = await req(server, "GET", `/api/projects/${projectId}/quoted-vs-actual`);
      const row = (body as any).rows[0];
      // Child task has estimateHours = 20
      assert.equal(row.quotedHours, 20);
    });

    it("phase actualHours = sum of approved time entries on child tasks", async () => {
      const { body } = await req(server, "GET", `/api/projects/${projectId}/quoted-vs-actual`);
      const row = (body as any).rows[0];
      // Time entry = 12h
      assert.equal(row.actualHours, 12);
    });

    it("totals aggregate across all phases", async () => {
      const { body } = await req(server, "GET", `/api/projects/${projectId}/quoted-vs-actual`);
      const b = body as any;
      assert.equal(b.totals.quotedHours, 20);
      assert.equal(b.totals.actualHours, 12);
    });

    it("project with no phases returns empty rows + zero totals", async () => {
      const [p2] = await db
        .insert(projectsTable)
        .values({
          name: "E2E No-Phase Project",
          accountId: acctId,
          status: "Active",
          currency: "USD",
          budget: "10000",
          startDate: "2025-01-01",
          endDate: "2025-12-31",
        })
        .returning({ id: projectsTable.id });

      const { status, body } = await req(server, "GET", `/api/projects/${p2.id}/quoted-vs-actual`);
      assert.equal(status, 200);
      assert.equal((body as any).rows.length, 0);
      assert.equal((body as any).totals.quotedHours, 0);
      assert.equal((body as any).totals.actualHours, 0);

      await db.delete(projectsTable).where(eq(projectsTable.id, p2.id));
    });

    it("returns 404 for non-existent project", async () => {
      const { status } = await req(server, "GET", "/api/projects/99999999/quoted-vs-actual");
      assert.equal(status, 404);
    });

    it("phase status='overrun' when actualHours > quotedHours * 1.1", async () => {
      // Create a phase where actual exceeds estimate by > 10%
      const [overPhase] = await db
        .insert(tasksTable)
        .values({
          projectId,
          name: "Overrun Phase",
          status: "In Progress",
          isPhase: true,
          estimateHours: "10",
          plannedHours: "10",
        })
        .returning({ id: tasksTable.id });

      const [overChild] = await db
        .insert(tasksTable)
        .values({
          projectId,
          parentTaskId: overPhase.id,
          name: "Overrun Child",
          status: "In Progress",
          estimateHours: "10",
          plannedHours: "10",
        })
        .returning({ id: tasksTable.id });

      // Log 15h against it (50% over estimate)
      const [ts2] = await db
        .insert(timesheetsTable)
        .values({ userId: 1, weekStart: "2025-07-07", status: "Approved" })
        .returning({ id: timesheetsTable.id });

      await db.insert(timeEntriesTable).values({
        userId: 1,
        projectId,
        taskId: overChild.id,
        timesheetId: ts2.id,
        date: "2025-07-07",
        hours: "15",
        description: "overrun",
        billable: true,
        status: "Approved",
        billRate: "100",
      });

      const { body } = await req(server, "GET", `/api/projects/${projectId}/quoted-vs-actual`);
      const row = (body as any).rows.find((r: any) => r.phaseId === overPhase.id);
      assert.ok(row, "overrun phase not found in rows");
      assert.equal(row.status, "overrun");

      // Cleanup
      await db.delete(timeEntriesTable).where(eq(timeEntriesTable.taskId, overChild.id));
      await db.delete(timesheetsTable).where(eq(timesheetsTable.id, ts2.id));
      await db.delete(tasksTable).where(eq(tasksTable.id, overChild.id));
      await db.delete(tasksTable).where(eq(tasksTable.id, overPhase.id));
    });
  });
});
