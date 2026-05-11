/**
 * Over-allocation guard for hard resource allocations.
 *
 * Only fires when isSoftAllocation === false and userId is set.
 * Computes, per working day in the requested range, whether adding the new
 * allocation's hoursPerDay would push the resource past their daily capacity
 * (accounting for public holidays and approved time-off). Returns a block
 * descriptor or null if the request is safe to proceed.
 *
 * Usage:
 *   const block = await checkOverAllocation({ userId, startDate, endDate, hoursPerDay, hoursPerWeek, totalHours }, req);
 *   if (block) { res.status(block.status).json(block.body); return; }
 */

import type { Request } from "express";
import { eq, and, lte, gte } from "drizzle-orm";
import { db, allocationsTable, usersTable, holidayDatesTable, timeOffRequestsTable } from "@workspace/db";
import { logAudit } from "./audit";
import { resolveRole } from "../constants/roles";

export interface OverAllocationInput {
  userId: number;
  startDate: string;       // YYYY-MM-DD
  endDate: string;         // YYYY-MM-DD
  hoursPerDay: number;     // derived from computeAllocationFields
  hoursPerWeek: number;    // for context in the response
  totalHours: number;      // for context in the response
}

export interface GuardBlock {
  status: number;
  body: Record<string, unknown>;
}

/** All working days (Mon–Fri) in [start, end], excluding public holidays. */
function workingDaysInRange(start: string, end: string, holidaySet: Set<string>): string[] {
  const days: string[] = [];
  const cur = new Date(`${start}T00:00:00Z`);
  const fin = new Date(`${end}T00:00:00Z`);
  while (cur <= fin) {
    const dow = cur.getUTCDay();
    const iso = cur.toISOString().slice(0, 10);
    if (dow !== 0 && dow !== 6 && !holidaySet.has(iso)) days.push(iso);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

/**
 * Returns null when the caller may proceed, or a { status, body } object
 * that the route handler must send as the response before returning.
 * When forceOverride is granted, returns null AND sets `insertFlags` on the
 * returned context so the caller can mark the row.
 */
export async function checkOverAllocation(
  input: OverAllocationInput,
  req: Request,
): Promise<GuardBlock | null> {
  const { userId, startDate, endDate, hoursPerDay, totalHours } = input;

  // ── Fetch reference data in parallel ────────────────────────────────────
  const [user, existingAllocations, holidays, approvedTimeOffs] = await Promise.all([
    db.select({ id: usersTable.id, capacity: usersTable.capacity })
      .from(usersTable).where(eq(usersTable.id, userId))
      .then(rows => rows[0] ?? null),

    // Existing hard (non-soft) allocations for this user that overlap the range.
    db.select({
      id: allocationsTable.id,
      startDate: allocationsTable.startDate,
      endDate: allocationsTable.endDate,
      hoursPerDay: allocationsTable.hoursPerDay,
    })
      .from(allocationsTable)
      .where(
        and(
          eq(allocationsTable.userId, userId),
          eq(allocationsTable.isSoftAllocation, false),
          lte(allocationsTable.startDate, endDate),
          gte(allocationsTable.endDate, startDate),
        ),
      ),

    // Public holidays that fall inside the range.
    db.select({ date: holidayDatesTable.date })
      .from(holidayDatesTable)
      .where(and(gte(holidayDatesTable.date, startDate), lte(holidayDatesTable.date, endDate))),

    // Approved time-off for this user overlapping the range.
    db.select({ startDate: timeOffRequestsTable.startDate, endDate: timeOffRequestsTable.endDate })
      .from(timeOffRequestsTable)
      .where(
        and(
          eq(timeOffRequestsTable.userId, userId),
          eq(timeOffRequestsTable.status, "Approved"),
          lte(timeOffRequestsTable.startDate, endDate),
          gte(timeOffRequestsTable.endDate, startDate),
        ),
      ),
  ]);

  if (!user) return null; // let the route's own validation catch unknown users

  const dailyCapacity = user.capacity / 5;
  const holidaySet = new Set(holidays.map(h => h.date));

  // Build a set of approved time-off dates for this user in the range.
  const timeOffSet = new Set<string>();
  for (const t of approvedTimeOffs) {
    const cur = new Date(`${t.startDate}T00:00:00Z`);
    const fin = new Date(`${t.endDate}T00:00:00Z`);
    while (cur <= fin) {
      const iso = cur.toISOString().slice(0, 10);
      if (iso >= startDate && iso <= endDate) timeOffSet.add(iso);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }

  // Working days where the user is available (not holiday, not on approved leave).
  const workingDays = workingDaysInRange(startDate, endDate, holidaySet)
    .filter(d => !timeOffSet.has(d));

  // Compute available capacity (total hours over the range).
  const availableHours = workingDays.length * dailyCapacity;

  // For each working day, sum existing committed hours from overlapping hard allocations.
  const overlapDates: string[] = [];
  for (const day of workingDays) {
    const existingHours = existingAllocations
      .filter(a => a.startDate <= day && a.endDate >= day)
      .reduce((s, a) => s + Number(a.hoursPerDay), 0);
    if (existingHours + hoursPerDay > dailyCapacity) {
      overlapDates.push(day);
    }
  }

  if (overlapDates.length === 0) return null; // within capacity — all clear

  // ── Over-allocation detected ─────────────────────────────────────────────
  // Compute total committed hours across the full range (for the 409 body).
  const existingTotalCommitted = existingAllocations.reduce((s, a) => {
    // Count only the overlap between this existing alloc and the new range.
    const overlapStart = a.startDate > startDate ? a.startDate : startDate;
    const overlapEnd = a.endDate < endDate ? a.endDate : endDate;
    const days = workingDaysInRange(overlapStart, overlapEnd, holidaySet)
      .filter(d => !timeOffSet.has(d));
    return s + days.length * Number(a.hoursPerDay);
  }, 0);

  // ── Admin / PM override check ────────────────────────────────────────────
  const overrideFlag = String(req.body?.forceOverride ?? "").toLowerCase();
  const overrideReason = typeof req.body?.overrideReason === "string"
    ? (req.body.overrideReason as string).trim()
    : "";
  const rawRole = String(req.headers["x-user-role"] ?? "");
  const role = resolveRole(rawRole);
  const actorUserId = Number(req.headers["x-user-id"] ?? 0) || undefined;
  const canOverride = (role === "account_admin" || role === "super_user")
    && overrideFlag === "true"
    && overrideReason.length > 0;

  if (canOverride) {
    await logAudit({
      entityType: "allocation",
      entityId: userId,
      action: "over_allocation_override" as any,
      actorUserId,
      description: `Over-allocation override for user ${userId} (${overlapDates.length} day(s) over capacity): ${overrideReason}`,
      previousValue: { availableHours, committedHours: existingTotalCommitted },
      newValue: { requestedHours: totalHours, overlapDates },
    });
    return null; // caller proceeds with isOverride=true on the insert row
  }

  return {
    status: 409,
    body: {
      error: "over_allocation",
      resourceId: userId,
      availableHours: Math.round(availableHours * 100) / 100,
      requestedHours: Math.round(totalHours * 100) / 100,
      overlapDates,
    },
  };
}
