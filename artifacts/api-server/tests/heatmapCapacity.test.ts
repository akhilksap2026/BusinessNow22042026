/**
 * Heatmap capacity — approved time-off + public holidays deducted from availableHours.
 *
 * Scenario: user has 40h/wk capacity, 1 holiday day (8h), 1 approved time-off day (8h).
 * Expected availableHours for that week = 40 - 8 - 8 = 24.
 *
 * Run: pnpm --filter @workspace/api-server test
 */

import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import app from "../src/app.ts";
import {
  db,
  usersTable,
  accountsTable,
  holidayCalendarsTable,
  holidayDatesTable,
  timeOffRequestsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

// Use a far-future week to avoid interference from real data:
// Week Mon 2030-01-07 → Sun 2030-01-13
const TEST_WEEK_START = "2030-01-07"; // Monday
const HOLIDAY_DATE = "2030-01-07"; // Monday → holiday (8h off)
const TIME_OFF_DATE = "2030-01-08"; // Tuesday → approved leave (8h off)
// 3 remaining working days (Wed–Fri) × 8h = 24h available

const ADMIN_HEADERS = {
  "content-type": "application/json",
  "x-user-id": "1",
  "x-user-role": "account_admin",
};

describe("Heatmap capacity — time-off + holiday deduction", () => {
  let server: Server;
  let baseUrl: string;

  let userId: number;
  let calendarId: number;
  let holidayDateId: number;
  let timeOffId: number;

  before(async () => {
    server = app.listen(0);
    await new Promise<void>(r => server.once("listening", r));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;

    const [acct] = await db.select().from(accountsTable).limit(1);

    // Create a holiday calendar + one holiday date
    const [cal] = await db.insert(holidayCalendarsTable).values({
      name: `TEST_HEATMAP_CAL_${Date.now()}`,
    }).returning();
    calendarId = cal.id;

    const [hd] = await db.insert(holidayDatesTable).values({
      calendarId,
      name: "Test Holiday",
      date: HOLIDAY_DATE,
    }).returning();
    holidayDateId = hd.id;

    // Create a user with capacity=40 and this holiday calendar
    const [u] = await db.insert(usersTable).values({
      name: `TEST_HEATMAP_USER_${Date.now()}`,
      initials: "TH",
      email: `test_heatmap_${Date.now()}@example.com`,
      role: "collaborator",
      department: "Engineering",
      accountId: acct.id,
      capacity: 40,
      holidayCalendarId: calendarId,
      isInternal: true,
    } as any).returning();
    userId = u.id;

    // Create an approved time-off for the user on the Tuesday of the test week
    const [tor] = await db.insert(timeOffRequestsTable).values({
      userId,
      type: "PTO",
      startDate: TIME_OFF_DATE,
      endDate: TIME_OFF_DATE,
      status: "Approved",
      durationType: "Full Day",
    } as any).returning();
    timeOffId = tor.id;
  });

  after(async () => {
    await db.delete(timeOffRequestsTable).where(eq(timeOffRequestsTable.id, timeOffId)).catch(() => {});
    await db.delete(usersTable).where(eq(usersTable.id, userId)).catch(() => {});
    await db.delete(holidayDatesTable).where(eq(holidayDatesTable.id, holidayDateId)).catch(() => {});
    await db.delete(holidayCalendarsTable).where(eq(holidayCalendarsTable.id, calendarId)).catch(() => {});
    await new Promise<void>(r => server.close(() => r()));
  });

  it("returns availableHours = 24 (40h cap − 8h holiday − 8h time-off)", async () => {
    const url = `${baseUrl}/resources/heatmap-capacity?weekStart=${TEST_WEEK_START}&weekCount=1`;
    const res = await fetch(url, { headers: ADMIN_HEADERS });
    const body = await res.text();
    assert.equal(res.status, 200, body);

    const data: Array<{ userId: number; weeks: Array<{ weekStart: string; availableHours: number; timeOffHours: number; holidayHours: number }> }> = JSON.parse(body);

    const userEntry = data.find(d => d.userId === userId);
    assert.ok(userEntry, `No entry for userId=${userId} in response`);

    const week = userEntry.weeks.find(w => w.weekStart === TEST_WEEK_START);
    assert.ok(week, `No week entry for ${TEST_WEEK_START}`);

    assert.equal(week.availableHours, 24, `Expected 24h available (40 − 8 holiday − 8 time-off)`);
    assert.equal(week.holidayHours, 8, "Expected 8h of holiday hours");
    assert.equal(week.timeOffHours, 8, "Expected 8h of time-off hours");
  });
});
