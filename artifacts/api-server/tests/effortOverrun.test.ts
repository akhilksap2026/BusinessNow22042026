/**
 * Effort overrun detection — integration test.
 *
 * Approving a timesheet whose time entries push a task to 91% of its
 * plannedHours must create exactly one notification for the project PM
 * and stamp task.overrunAlertSentAt.
 *
 * Run with:  pnpm --filter @workspace/api-server test
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
  tasksTable,
  timesheetsTable,
  timeEntriesTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

describe("POST /api/timesheets/:id/approve — effort overrun detection", () => {
  let server: Server;
  let baseUrl: string;

  // Two distinct users: pmUser approves, submitterUser owns the timesheet.
  let pmUserId: number;
  let submitterUserId: number;
  let testProjectId: number;
  let testTaskId: number;
  let testTimesheetId: number;
  const createdEntryIds: number[] = [];
  const createdNotifIds: number[] = [];

  before(async () => {
    // Reuse the first two seeded users (or create a second if only one exists).
    const seedUsers = await db.select().from(usersTable).limit(2);
    assert.ok(seedUsers.length >= 1, "seed must have at least one user");

    const [acct] = await db.select().from(accountsTable).limit(1);
    assert.ok(acct, "seed must have at least one account");

    // PM user is the first seed user — they own the project and will approve.
    pmUserId = seedUsers[0].id;

    // Submitter is the second seed user; create a minimal one if it doesn't exist.
    if (seedUsers.length >= 2) {
      submitterUserId = seedUsers[1].id;
    } else {
      const [created] = await db.insert(usersTable).values({
        name: "TEST_OVERRUN_SUBMITTER",
        email: `overrun_submitter_${Date.now()}@test.invalid`,
        role: "Developer",
        capacity: 40,
      } as any).returning();
      submitterUserId = created.id;
    }

    // Project owned by pmUser.
    const today = new Date().toISOString().slice(0, 10);
    const far = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    const [proj] = await db.insert(projectsTable).values({
      accountId: acct.id,
      name: "TEST_OVERRUN_PROJECT",
      status: "Active",
      ownerId: pmUserId,
      startDate: today,
      dueDate: far,
      billingType: "Fixed",
      budget: "0",
      budgetedHours: "0",
    } as any).returning();
    testProjectId = proj.id;

    // Task with plannedHours = 10.
    const [task] = await db.insert(tasksTable).values({
      projectId: testProjectId,
      name: "TEST_OVERRUN_TASK",
      status: "In Progress",
      priority: "Medium",
      plannedHours: "10",
    } as any).returning();
    testTaskId = task.id;

    // Timesheet for the submitter — start in Draft, then set to Submitted.
    const weekStart = "2025-01-06"; // a known Monday
    const [ts] = await db.insert(timesheetsTable).values({
      userId: submitterUserId,
      weekStart,
      status: "Submitted",
      totalHours: "9.1",
      submittedAt: new Date(),
      submittedByUserId: submitterUserId,
    } as any).returning();
    testTimesheetId = ts.id;

    // Time entry: 9.1 h → 91% of 10h plannedHours, above the 90% threshold.
    const [entry] = await db.insert(timeEntriesTable).values({
      userId: submitterUserId,
      projectId: testProjectId,
      taskId: testTaskId,
      timesheetId: testTimesheetId,
      date: "2025-01-06",
      hours: "9.1",
      billable: true,
    } as any).returning();
    createdEntryIds.push(entry.id);

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    for (const id of createdNotifIds) {
      await db.delete(notificationsTable).where(eq(notificationsTable.id, id)).catch(() => {});
    }
    // Also clean up any overrun notifications created by the test.
    await db.delete(notificationsTable)
      .where(and(
        eq(notificationsTable.entityType, "task"),
        eq(notificationsTable.entityId, String(testTaskId)),
      ))
      .catch(() => {});
    for (const id of createdEntryIds) {
      await db.delete(timeEntriesTable).where(eq(timeEntriesTable.id, id)).catch(() => {});
    }
    if (testTimesheetId) {
      await db.delete(timesheetsTable).where(eq(timesheetsTable.id, testTimesheetId)).catch(() => {});
    }
    if (testTaskId) {
      await db.delete(tasksTable).where(eq(tasksTable.id, testTaskId)).catch(() => {});
    }
    if (testProjectId) {
      await db.delete(projectsTable).where(eq(projectsTable.id, testProjectId)).catch(() => {});
    }
    if (server) await new Promise<void>((r) => server.close(() => r()));
  });

  it("(a) approving a timesheet at 91% of task plannedHours creates one PM notification", async () => {
    const res = await fetch(`${baseUrl}/api/timesheets/${testTimesheetId}/approve`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": String(pmUserId),
        "x-user-role": "account_admin",
      },
      body: JSON.stringify({ approvedByUserId: pmUserId }),
    });

    assert.equal(res.status, 200, `approve failed: ${await res.text()}`);

    // Allow a short tick for any async notification writes that may be deferred.
    await new Promise(r => setTimeout(r, 50));

    // One overrun notification must exist for the PM on this task.
    const notifs = await db
      .select()
      .from(notificationsTable)
      .where(and(
        eq(notificationsTable.entityType, "task"),
        eq(notificationsTable.entityId, String(testTaskId)),
        eq(notificationsTable.type, "effort_overrun"),
      ));

    assert.equal(notifs.length, 1,
      `expected 1 overrun notification, found ${notifs.length}: ${JSON.stringify(notifs)}`);
    assert.equal(notifs[0].userId, pmUserId,
      "notification must be addressed to the project PM");
    assert.ok(
      notifs[0].message.includes("91%") || notifs[0].message.includes("100%"),
      `notification message should contain the utilisation %: ${notifs[0].message}`,
    );

    // task.overrunAlertSentAt must be stamped to prevent repeat alerts.
    const [updatedTask] = await db
      .select({ overrunAlertSentAt: tasksTable.overrunAlertSentAt })
      .from(tasksTable)
      .where(eq(tasksTable.id, testTaskId));

    assert.ok(updatedTask.overrunAlertSentAt !== null,
      "task.overrunAlertSentAt must be set after the alert fires");
  });
});
