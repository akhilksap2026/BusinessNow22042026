import { Router, type IRouter } from "express";
import { eq, and, gte, lte, isNull, inArray, ne, sql } from "drizzle-orm";
import { parsePagination, envelope } from "../lib/pagination";
import { requirePM } from "../middleware/rbac";
import { db, allocationsTable, usersTable, holidayDatesTable, timeOffRequestsTable, projectsTable, userSkillsTable, skillsTable } from "@workspace/db";
import { logAudit } from "../lib/audit";
import { checkOverAllocation } from "../lib/overAllocationGuard";
import {
  ListAllocationsResponse,
  ListAllocationsQueryParams,
  CreateAllocationBody,
  UpdateAllocationParams,
  UpdateAllocationBody,
  UpdateAllocationResponse,
  DeleteAllocationParams,
  GetCapacityOverviewResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapAllocation(a: typeof allocationsTable.$inferSelect) {
  return {
    ...a,
    hoursPerWeek: Number(a.hoursPerWeek),
    hoursPerDay: Number(a.hoursPerDay ?? 0),
    totalHours: Number(a.totalHours ?? 0),
    methodValue: a.methodValue !== null && a.methodValue !== undefined ? Number(a.methodValue) : null,
    percentOfCapacity: a.percentOfCapacity !== null && a.percentOfCapacity !== undefined ? Number(a.percentOfCapacity) : null,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
    updatedAt: a.updatedAt instanceof Date ? a.updatedAt.toISOString() : a.updatedAt,
  };
}

// Count working days (Mon–Fri) in inclusive date range YYYY-MM-DD
function workingDaysInRange(startDate: string, endDate: string): number {
  let d = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");
  let n = 0;
  while (d <= end) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) n++;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return n;
}

const SUPPORTED_METHODS = new Set(["total_hours", "hours_per_day", "hours_per_week", "percentage_capacity", "hours"]);

type ComputeResult =
  | { ok: true; value: { hoursPerDay: number; hoursPerWeek: number; totalHours: number; percentOfCapacity: number | null; methodValue: number | null; allocationMethod: string } }
  | { ok: false; error: string };

// Auto-derive hoursPerDay/hoursPerWeek/totalHours from method + methodValue.
// Returns explicit error rather than silently falling back when inputs are invalid.
async function computeAllocationFields(input: {
  startDate: string;
  endDate: string;
  allocationMethod?: string;
  methodValue?: number | null;
  hoursPerWeek?: number | null;
  userId?: number | null;
}): Promise<ComputeResult> {
  const days = Math.max(1, workingDaysInRange(input.startDate, input.endDate));
  const rawMethod = input.allocationMethod ?? "hours_per_week";
  if (!SUPPORTED_METHODS.has(rawMethod)) {
    return { ok: false, error: `Unsupported allocationMethod "${rawMethod}". Supported: total_hours, hours_per_day, hours_per_week, percentage_capacity` };
  }
  // "hours" is a legacy alias for "hours_per_week"
  const method = rawMethod === "hours" ? "hours_per_week" : rawMethod;
  const mv: number = input.methodValue ?? input.hoursPerWeek ?? 0;
  let hpd = 0, hpw = 0, total = 0, pct: number | null = null;

  if (method === "total_hours") {
    total = mv;
    hpd = total / days;
    hpw = hpd * 5;
  } else if (method === "hours_per_day") {
    hpd = mv;
    hpw = hpd * 5;
    total = hpd * days;
  } else if (method === "percentage_capacity") {
    if (!input.userId) {
      return { ok: false, error: "percentage_capacity requires userId so user.capacity can be resolved" };
    }
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, input.userId));
    if (!u) return { ok: false, error: `percentage_capacity: user ${input.userId} not found` };
    pct = mv;
    const weeklyCap = u.capacity;
    hpd = (pct / 100) * (weeklyCap / 5);
    hpw = (pct / 100) * weeklyCap;
    total = hpd * days;
  } else {
    // hours_per_week
    hpw = mv;
    hpd = hpw / 5;
    total = hpd * days;
  }

  return {
    ok: true,
    value: {
      hoursPerDay: Math.round(hpd * 100) / 100,
      hoursPerWeek: Math.round(hpw * 100) / 100,
      totalHours: Math.round(total * 100) / 100,
      percentOfCapacity: pct,
      methodValue: mv,
      allocationMethod: method,
    },
  };
}

// Identity rule: exactly one of (userId, placeholderId) must be set.
// `placeholderRole` (legacy text label) is only accepted when placeholderId is also set, as descriptive metadata.
function validateAllocationCore(body: any): string | null {
  const hasUser = body.userId !== undefined && body.userId !== null;
  const hasPlaceholderId = body.placeholderId !== undefined && body.placeholderId !== null;
  const hasLegacyPlaceholderRole = body.placeholderRole !== undefined && body.placeholderRole !== null && body.placeholderRole !== "";
  // Allow legacy rows where only placeholderRole is set (pre-catalog data) for PATCH compatibility
  const hasPlaceholder = hasPlaceholderId || hasLegacyPlaceholderRole;
  if (hasUser && hasPlaceholder) return "Provide exactly one of userId or placeholderId";
  if (!hasUser && !hasPlaceholder) return "Either userId or placeholderId is required";
  if (body.startDate && body.endDate && body.endDate < body.startDate) return "endDate must be on or after startDate";
  return null;
}

router.get("/allocations", async (req, res): Promise<void> => {
  const qp = ListAllocationsQueryParams.safeParse(req.query);
  const conditions = [];
  if (qp.success && qp.data.projectId) conditions.push(eq(allocationsTable.projectId, qp.data.projectId));
  if (qp.success && qp.data.userId) conditions.push(eq(allocationsTable.userId, qp.data.userId));
  const page = parsePagination(req.query as Record<string, unknown>);
  const baseSelect = conditions.length
    ? db.select().from(allocationsTable).where(and(...conditions))
    : db.select().from(allocationsTable);
  const rows = page.paginated
    ? await baseSelect.limit(page.limit).offset(page.offset)
    : await baseSelect;
  let total = rows.length;
  if (page.paginated) {
    const baseCount = conditions.length
      ? db.select({ c: sql<number>`count(*)::int` }).from(allocationsTable).where(and(...conditions))
      : db.select({ c: sql<number>`count(*)::int` }).from(allocationsTable);
    const [{ c }] = await baseCount;
    total = Number(c);
  }
  const data = ListAllocationsResponse.parse(rows.map(mapAllocation));
  res.json(envelope(data, total, page));
});

// ---------------------------------------------------------------------------
// POST /api/allocations/preview  — read-only capacity impact preview
// Must be declared BEFORE POST /allocations to avoid Express routing to
// the wrong handler.
// ---------------------------------------------------------------------------
router.post("/allocations/preview", requirePM, async (req, res): Promise<void> => {
  // Reuse the same compute + validation path as the real create route,
  // but never touch the database for writes.
  const userId = req.body.userId ? Number(req.body.userId) : null;
  const startDate = String(req.body.startDate ?? "");
  const endDate = String(req.body.endDate ?? "");
  if (!userId || !startDate || !endDate || endDate < startDate) {
    res.status(400).json({ error: "userId, startDate, endDate (startDate ≤ endDate) required" });
    return;
  }

  const computeRes = await computeAllocationFields({
    startDate,
    endDate,
    allocationMethod: req.body.allocationMethod ?? "hours_per_week",
    methodValue: req.body.methodValue,
    hoursPerWeek: req.body.hoursPerWeek,
    userId,
  });
  if (!computeRes.ok) { res.status(400).json({ error: computeRes.error }); return; }
  const { hoursPerDay, hoursPerWeek, totalHours } = computeRes.value;

  // Fetch reference data in parallel (same queries as the guard helper).
  const [user, existingAllocs, holidays, approvedTimeOffs] = await Promise.all([
    db.select({ id: usersTable.id, capacity: usersTable.capacity })
      .from(usersTable).where(eq(usersTable.id, userId))
      .then(r => r[0] ?? null),
    db.select({
      id: allocationsTable.id,
      startDate: allocationsTable.startDate,
      endDate: allocationsTable.endDate,
      hoursPerDay: allocationsTable.hoursPerDay,
    })
      .from(allocationsTable)
      .where(and(
        eq(allocationsTable.userId, userId),
        eq(allocationsTable.isSoftAllocation, false),
        lte(allocationsTable.startDate, endDate),
        gte(allocationsTable.endDate, startDate),
      )),
    db.select({ date: holidayDatesTable.date })
      .from(holidayDatesTable)
      .where(and(gte(holidayDatesTable.date, startDate), lte(holidayDatesTable.date, endDate))),
    db.select({ startDate: timeOffRequestsTable.startDate, endDate: timeOffRequestsTable.endDate })
      .from(timeOffRequestsTable)
      .where(and(
        eq(timeOffRequestsTable.userId, userId),
        eq(timeOffRequestsTable.status, "Approved"),
        lte(timeOffRequestsTable.startDate, endDate),
        gte(timeOffRequestsTable.endDate, startDate),
      )),
  ]);

  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const dailyCap = user.capacity / 5;
  const holidaySet = new Set(holidays.map(h => h.date));

  // Build time-off date set (limited to the requested range).
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

  // Helper: working days in [s, e] excluding holidays + time-off.
  function availableWorkDays(s: string, e: string): string[] {
    const days: string[] = [];
    const cur = new Date(`${s}T00:00:00Z`);
    const fin = new Date(`${e}T00:00:00Z`);
    while (cur <= fin) {
      const dow = cur.getUTCDay();
      const iso = cur.toISOString().slice(0, 10);
      if (dow !== 0 && dow !== 6 && !holidaySet.has(iso) && !timeOffSet.has(iso)) days.push(iso);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return days;
  }

  const workDays = availableWorkDays(startDate, endDate);
  const availableHours = workDays.length * dailyCap;

  // Committed hours from existing hard allocations in the range.
  const currentUsedHours = existingAllocs.reduce((sum, a) => {
    const days = availableWorkDays(
      a.startDate > startDate ? a.startDate : startDate,
      a.endDate < endDate ? a.endDate : endDate,
    );
    return sum + days.length * Number(a.hoursPerDay);
  }, 0);

  const afterUsedHours = currentUsedHours + totalHours;
  const utilisationPct = availableHours > 0 ? Math.round((afterUsedHours / availableHours) * 100) : 0;

  // Build per-ISO-week breakdown: iterate weeks in the range (Mon start).
  const affectedWeeks: { week: string; usedHours: number; availableHours: number }[] = [];
  {
    // Find first Monday on or before startDate.
    const rangeStart = new Date(`${startDate}T00:00:00Z`);
    const dow = rangeStart.getUTCDay(); // 0=Sun
    const diffToMon = dow === 0 ? -6 : 1 - dow;
    const weekCur = new Date(rangeStart);
    weekCur.setUTCDate(weekCur.getUTCDate() + diffToMon);
    const rangeEnd = new Date(`${endDate}T00:00:00Z`);

    while (weekCur <= rangeEnd) {
      const weekSun = new Date(weekCur);
      weekSun.setUTCDate(weekCur.getUTCDate() + 6);
      const wStart = weekCur.toISOString().slice(0, 10);
      const wEnd = weekSun.toISOString().slice(0, 10);

      // Overlap with our allocation range.
      const overlapStart = wStart < startDate ? startDate : wStart;
      const overlapEnd = wEnd > endDate ? endDate : wEnd;
      if (overlapStart <= overlapEnd) {
        const wDays = availableWorkDays(overlapStart, overlapEnd);
        const wAvail = wDays.length * dailyCap;
        const wExisting = existingAllocs.reduce((s, a) => {
          const aStart = a.startDate > overlapStart ? a.startDate : overlapStart;
          const aEnd = a.endDate < overlapEnd ? a.endDate : overlapEnd;
          if (aStart > aEnd) return s;
          return s + availableWorkDays(aStart, aEnd).length * Number(a.hoursPerDay);
        }, 0);
        const wNew = wDays.length * hoursPerDay;
        affectedWeeks.push({
          week: wStart,
          usedHours: Math.round((wExisting + wNew) * 100) / 100,
          availableHours: Math.round(wAvail * 100) / 100,
        });
      }
      weekCur.setUTCDate(weekCur.getUTCDate() + 7);
    }
  }

  res.json({
    resourceId: userId,
    currentUsedHours: Math.round(currentUsedHours * 100) / 100,
    currentAvailableHours: Math.round(Math.max(0, availableHours - currentUsedHours) * 100) / 100,
    afterUsedHours: Math.round(afterUsedHours * 100) / 100,
    afterAvailableHours: Math.round(Math.max(0, availableHours - afterUsedHours) * 100) / 100,
    utilisationPct,
    isOverAllocated: afterUsedHours > availableHours,
    affectedWeeks,
  });
});

// ---------------------------------------------------------------------------
// POST /api/allocations/bulk-preview  — read-only, returns before/after per item
// Body: { updates: [{ allocationId, newResourceId?, newStartDate?, newEndDate?, newHoursPerWeek? }] }
// ---------------------------------------------------------------------------
router.post("/allocations/bulk-preview", requirePM, async (req, res): Promise<void> => {
  const updates: Array<{
    allocationId: number;
    newResourceId?: number | null;
    newStartDate?: string;
    newEndDate?: string;
    newHoursPerWeek?: number;
  }> = req.body?.updates;
  if (!Array.isArray(updates) || updates.length === 0) {
    res.status(400).json({ error: "updates must be a non-empty array" });
    return;
  }

  const allocIds = updates.map(u => Number(u.allocationId)).filter(id => !isNaN(id));
  const allocations = allocIds.length > 0
    ? await db.select().from(allocationsTable).where(inArray(allocationsTable.id, allocIds))
    : [];

  // Collect all userId values to look up names + capacities
  const userIds = new Set<number>();
  for (const a of allocations) if (a.userId != null) userIds.add(a.userId);
  for (const u of updates) if (u.newResourceId != null) userIds.add(u.newResourceId);

  const userRows = userIds.size > 0
    ? await db.select({ id: usersTable.id, name: usersTable.name, capacity: usersTable.capacity })
        .from(usersTable).where(inArray(usersTable.id, [...userIds]))
    : [];
  const userMap = new Map(userRows.map(u => [u.id, u]));

  const previews = updates.map(upd => {
    const alloc = allocations.find(a => a.id === Number(upd.allocationId));
    if (!alloc) return null;

    const beforeUserId = alloc.userId ?? null;
    const afterUserId = upd.newResourceId !== undefined ? (upd.newResourceId ?? null) : beforeUserId;
    const beforeUser = beforeUserId != null ? (userMap.get(beforeUserId) ?? null) : null;
    const afterUser = afterUserId != null ? (userMap.get(afterUserId) ?? null) : null;

    return {
      allocationId: alloc.id,
      projectId: alloc.projectId,
      role: alloc.role,
      resource: {
        before: { id: beforeUserId, name: beforeUser?.name ?? "Placeholder" },
        after: { id: afterUserId, name: afterUser?.name ?? "Placeholder" },
      },
      capacityImpact: {
        before: {
          hoursPerWeek: Number(alloc.hoursPerWeek),
          startDate: alloc.startDate,
          endDate: alloc.endDate,
          resourceCapacity: beforeUser?.capacity ?? null,
        },
        after: {
          hoursPerWeek: upd.newHoursPerWeek ?? Number(alloc.hoursPerWeek),
          startDate: upd.newStartDate ?? alloc.startDate,
          endDate: upd.newEndDate ?? alloc.endDate,
          resourceCapacity: afterUser?.capacity ?? null,
        },
      },
    };
  }).filter(Boolean);

  res.json({ previews });
});

// ---------------------------------------------------------------------------
// POST /api/allocations/bulk-update — transactional apply; 409 on over-allocation
// Body: same shape as bulk-preview.
// ---------------------------------------------------------------------------
router.post("/allocations/bulk-update", requirePM, async (req, res): Promise<void> => {
  const updates: Array<{
    allocationId: number;
    newResourceId?: number | null;
    newStartDate?: string;
    newEndDate?: string;
    newHoursPerWeek?: number;
  }> = req.body?.updates;
  if (!Array.isArray(updates) || updates.length === 0) {
    res.status(400).json({ error: "updates must be a non-empty array" });
    return;
  }

  const actorUserId = Number(req.headers["x-user-id"] ?? 0) || undefined;
  const allocIds = updates.map(u => Number(u.allocationId)).filter(id => !isNaN(id));
  const allocations = allocIds.length > 0
    ? await db.select().from(allocationsTable).where(inArray(allocationsTable.id, allocIds))
    : [];

  // ── Per-resource over-allocation check (before any writes) ────────────────
  // Helper: working days Mon–Fri in [start, end] excluding holidays
  function workingDays(start: string, end: string, holidaySet: Set<string>): string[] {
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

  for (const upd of updates) {
    const alloc = allocations.find(a => a.id === Number(upd.allocationId));
    if (!alloc) { res.status(404).json({ error: `Allocation ${upd.allocationId} not found` }); return; }

    // Only hard allocations with a named user are checked
    if (alloc.isSoftAllocation || !alloc.userId) continue;

    const targetUserId = upd.newResourceId !== undefined ? (upd.newResourceId ?? null) : alloc.userId;
    if (!targetUserId) continue; // moving to placeholder — skip guard

    const newStart = upd.newStartDate ?? alloc.startDate;
    const newEnd = upd.newEndDate ?? alloc.endDate;
    const newHpw = upd.newHoursPerWeek ?? Number(alloc.hoursPerWeek);
    const newHpd = newHpw / 5;

    const [targetUser, rivals, holidays] = await Promise.all([
      db.select({ capacity: usersTable.capacity }).from(usersTable).where(eq(usersTable.id, targetUserId)).then(r => r[0] ?? null),
      // All OTHER hard allocations for the target user overlapping the proposed range
      db.select({ id: allocationsTable.id, startDate: allocationsTable.startDate, endDate: allocationsTable.endDate, hoursPerDay: allocationsTable.hoursPerDay })
        .from(allocationsTable)
        .where(and(
          eq(allocationsTable.userId, targetUserId),
          eq(allocationsTable.isSoftAllocation, false),
          ne(allocationsTable.id, alloc.id), // exclude self so we don't double-count
          lte(allocationsTable.startDate, newEnd),
          gte(allocationsTable.endDate, newStart),
        )),
      db.select({ date: holidayDatesTable.date })
        .from(holidayDatesTable)
        .where(and(gte(holidayDatesTable.date, newStart), lte(holidayDatesTable.date, newEnd))),
    ]);

    if (!targetUser) { res.status(404).json({ error: `User ${targetUserId} not found` }); return; }
    const dailyCap = targetUser.capacity / 5;
    const hSet = new Set(holidays.map(h => h.date));
    const days = workingDays(newStart, newEnd, hSet);

    const overlapDay = days.find(day => {
      const existingHpd = rivals
        .filter(r => r.startDate <= day && r.endDate >= day)
        .reduce((s, r) => s + Number(r.hoursPerDay), 0);
      return existingHpd + newHpd > dailyCap;
    });

    if (overlapDay) {
      res.status(409).json({
        error: "over_allocation",
        allocationId: alloc.id,
        resourceId: targetUserId,
        firstOverlapDate: overlapDay,
      });
      return;
    }
  }

  // ── All checks passed — apply transactionally ─────────────────────────────
  const updatedRows: ReturnType<typeof mapAllocation>[] = [];
  await db.transaction(async (tx) => {
    for (const upd of updates) {
      const alloc = allocations.find(a => a.id === Number(upd.allocationId))!;
      const updateData: Record<string, unknown> = { updatedAt: new Date() };

      if (upd.newResourceId !== undefined) updateData.userId = upd.newResourceId ?? null;
      if (upd.newStartDate !== undefined) updateData.startDate = upd.newStartDate;
      if (upd.newEndDate !== undefined) updateData.endDate = upd.newEndDate;

      // Recompute derived hours fields when any dimension changed
      if (upd.newHoursPerWeek !== undefined || upd.newStartDate !== undefined || upd.newEndDate !== undefined) {
        const hpw = upd.newHoursPerWeek ?? Number(alloc.hoursPerWeek);
        const start = upd.newStartDate ?? alloc.startDate;
        const end = upd.newEndDate ?? alloc.endDate;
        const hpd = hpw / 5;
        const days = workingDays(start, end, new Set());
        updateData.hoursPerWeek = String(hpw);
        updateData.hoursPerDay = String(hpd);
        updateData.totalHours = String(Math.round(days.length * hpd * 100) / 100);
      }

      const [row] = await tx.update(allocationsTable)
        .set(updateData as any)
        .where(eq(allocationsTable.id, alloc.id))
        .returning();
      updatedRows.push(mapAllocation(row));
    }
  });

  // Audit each change outside the transaction (fire-and-forget)
  for (const upd of updates) {
    const before = allocations.find(a => a.id === Number(upd.allocationId));
    if (!before) continue;
    await logAudit({
      entityType: "allocation",
      entityId: before.id,
      action: "updated",
      actorUserId,
      description: `Bulk update: allocation ${before.id}` +
        (upd.newResourceId !== undefined ? ` — resource ${before.userId} → ${upd.newResourceId}` : "") +
        (upd.newStartDate ? ` — start ${before.startDate} → ${upd.newStartDate}` : "") +
        (upd.newEndDate ? ` — end ${before.endDate} → ${upd.newEndDate}` : "") +
        (upd.newHoursPerWeek !== undefined ? ` — ${before.hoursPerWeek}h/wk → ${upd.newHoursPerWeek}h/wk` : ""),
      previousValue: { userId: before.userId, startDate: before.startDate, endDate: before.endDate, hoursPerWeek: before.hoursPerWeek },
      newValue: { userId: upd.newResourceId ?? before.userId, startDate: upd.newStartDate ?? before.startDate, endDate: upd.newEndDate ?? before.endDate, hoursPerWeek: upd.newHoursPerWeek ?? before.hoursPerWeek },
    });
  }

  res.json({ updated: updatedRows });
});

router.post("/allocations", requirePM, async (req, res): Promise<void> => {
  const parsed = CreateAllocationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const validationError = validateAllocationCore({ ...parsed.data, ...req.body });
  if (validationError) { res.status(400).json({ error: validationError }); return; }

  // Placeholder allocation: when userId is null, roleLabel (placeholderRole) is required.
  const roleLabel = typeof req.body.placeholderRole === "string" ? req.body.placeholderRole.trim() : "";
  if (!parsed.data.userId && !roleLabel) {
    res.status(400).json({ error: "roleLabel is required when resourceId is null" });
    return;
  }

  const isSoftAllocation = req.body.isSoftAllocation === true || req.body.isSoftAllocation === "true";
  const computeRes = await computeAllocationFields({
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
    allocationMethod: req.body.allocationMethod ?? parsed.data.allocationMethod,
    methodValue: req.body.methodValue,
    hoursPerWeek: parsed.data.hoursPerWeek,
    userId: parsed.data.userId ?? null,
  });
  if (!computeRes.ok) { res.status(400).json({ error: computeRes.error }); return; }
  const computed = computeRes.value;

  // ── Over-allocation guard (hard allocations only, named users only) ───────
  // Soft allocations are excluded per spec ("Do NOT change soft allocation logic").
  // Placeholder rows (no userId) are also excluded — no user to check capacity for.
  if (!isSoftAllocation && parsed.data.userId) {
    const overAllocBlock = await checkOverAllocation(
      {
        userId: parsed.data.userId,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        hoursPerDay: computed.hoursPerDay,
        hoursPerWeek: computed.hoursPerWeek,
        totalHours: computed.totalHours,
      },
      req,
    );
    if (overAllocBlock) {
      res.status(overAllocBlock.status).json(overAllocBlock.body);
      return;
    }
  }

  // ── Skill validation (fires only when requiredSkillId is supplied) ─────────
  // Skip entirely when no skill requirement is specified — no change to existing
  // behaviour for callers that omit this field.
  const requiredSkillId = req.body.requiredSkillId ? Number(req.body.requiredSkillId) : null;
  const requiredProficiencyLevel = req.body.requiredProficiencyLevel
    ? Number(req.body.requiredProficiencyLevel)
    : null;

  if (requiredSkillId && parsed.data.userId) {
    // Numeric rank for text proficiency levels stored in user_skills.
    const PROFICIENCY_RANK: Record<string, number> = {
      beginner: 1, novice: 1,
      intermediate: 2,
      advanced: 3,
      proficient: 4,
      expert: 5, master: 5,
    };
    const rankOf = (level: string | null | undefined): number =>
      level ? (PROFICIENCY_RANK[level.toLowerCase()] ?? 0) : 0;

    const [[skill], [userSkill]] = await Promise.all([
      db.select({ id: skillsTable.id, name: skillsTable.name })
        .from(skillsTable).where(eq(skillsTable.id, requiredSkillId)),
      db.select({ proficiencyLevel: userSkillsTable.proficiencyLevel })
        .from(userSkillsTable)
        .where(and(
          eq(userSkillsTable.userId, parsed.data.userId),
          eq(userSkillsTable.skillId, requiredSkillId),
        )),
    ]);

    const resourceLevelText = userSkill?.proficiencyLevel ?? null;
    const resourceRank = rankOf(resourceLevelText);
    const requiredRank = requiredProficiencyLevel ?? 1;

    if (resourceRank < requiredRank) {
      const skillOverrideReason = typeof req.body.skillOverrideReason === "string"
        ? req.body.skillOverrideReason.trim()
        : "";

      if (!skillOverrideReason) {
        res.status(422).json({
          error: "skill_mismatch",
          resourceId: parsed.data.userId,
          requiredSkill: skill?.name ?? String(requiredSkillId),
          requiredLevel: requiredRank,
          resourceLevel: resourceLevelText,
        });
        return;
      }

      // Override granted — log it and continue.
      await logAudit({
        entityType: "allocation",
        entityId: parsed.data.userId,
        action: "updated",
        actorUserId: Number(req.headers["x-user-id"]) || undefined,
        description: `Skill requirement overridden: skill "${skill?.name ?? requiredSkillId}" requires level ${requiredRank}, resource is "${resourceLevelText ?? "none"}". Reason: ${skillOverrideReason}`,
      });
    }
  }

  const placeholderId = req.body.placeholderId ?? null;
  // Mark as an override row when the guard was bypassed via forceOverride.
  const isOverride = !isSoftAllocation && parsed.data.userId
    && String(req.body?.forceOverride ?? "").toLowerCase() === "true"
    && typeof req.body?.overrideReason === "string"
    && (req.body.overrideReason as string).trim().length > 0;
  const overrideReason = isOverride
    ? (req.body.overrideReason as string).trim()
    : null;

  const insertVals: any = {
    ...parsed.data,
    // Auto-fill role from roleLabel for placeholder allocations
    role: parsed.data.role ?? (roleLabel || "Placeholder"),
    placeholderRole: roleLabel || parsed.data.placeholderRole || null,
    userId: parsed.data.userId ?? null,
    isSoftAllocation,
    placeholderId,
    isOverride: !!isOverride,
    overrideReason,
    hoursPerWeek: String(computed.hoursPerWeek),
    hoursPerDay: String(computed.hoursPerDay),
    totalHours: String(computed.totalHours),
    methodValue: computed.methodValue !== null ? String(computed.methodValue) : null,
    percentOfCapacity: computed.percentOfCapacity !== null ? String(computed.percentOfCapacity) : null,
    allocationMethod: computed.allocationMethod,
    requiredSkillId: requiredSkillId ?? null,
    requiredProficiencyLevel: requiredProficiencyLevel ?? null,
  };
  const [row] = await db.insert(allocationsTable).values(insertVals).returning();

  await logAudit({
    entityType: "allocation",
    entityId: row.id,
    action: "created",
    actorUserId: Number(req.headers["x-user-id"]) || undefined,
    description: `Allocation ${row.id} created for ${row.userId ? `user ${row.userId}` : `placeholder "${row.placeholderRole}"`} on project ${row.projectId} (${row.startDate} → ${row.endDate}, ${row.hoursPerWeek}h/wk)`,
    newValue: { projectId: row.projectId, userId: row.userId, startDate: row.startDate, endDate: row.endDate, hoursPerWeek: row.hoursPerWeek, isSoftAllocation: row.isSoftAllocation },
  });

  res.status(201).json(mapAllocation(row));
});

router.patch("/allocations/:id", requirePM, async (req, res): Promise<void> => {
  const params = UpdateAllocationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateAllocationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [existing] = await db.select().from(allocationsTable).where(eq(allocationsTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Allocation not found" }); return; }

  const merged = { ...existing, ...parsed.data, ...(req.body.placeholderId !== undefined ? { placeholderId: req.body.placeholderId } : {}) };
  const validationError = validateAllocationCore(merged);
  if (validationError) { res.status(400).json({ error: validationError }); return; }

  const updateData: any = { ...parsed.data, updatedAt: new Date() };
  if (req.body.placeholderId !== undefined) updateData.placeholderId = req.body.placeholderId;
  if (req.body.isSoftAllocation !== undefined) updateData.isSoftAllocation = req.body.isSoftAllocation === true || req.body.isSoftAllocation === "true";

  // Recompute derived fields if any input changed
  const inputsChanged = parsed.data.startDate !== undefined || parsed.data.endDate !== undefined
    || parsed.data.hoursPerWeek !== undefined || req.body.methodValue !== undefined
    || req.body.allocationMethod !== undefined || parsed.data.userId !== undefined;
  if (inputsChanged) {
    const computeRes = await computeAllocationFields({
      startDate: parsed.data.startDate ?? existing.startDate,
      endDate: parsed.data.endDate ?? existing.endDate,
      allocationMethod: req.body.allocationMethod ?? existing.allocationMethod,
      methodValue: req.body.methodValue ?? (existing.methodValue !== null ? Number(existing.methodValue) : (parsed.data.hoursPerWeek ?? Number(existing.hoursPerWeek))),
      hoursPerWeek: parsed.data.hoursPerWeek ?? Number(existing.hoursPerWeek),
      userId: parsed.data.userId ?? existing.userId ?? null,
    });
    if (!computeRes.ok) { res.status(400).json({ error: computeRes.error }); return; }
    const computed = computeRes.value;
    updateData.hoursPerWeek = String(computed.hoursPerWeek);
    updateData.hoursPerDay = String(computed.hoursPerDay);
    updateData.totalHours = String(computed.totalHours);
    updateData.methodValue = computed.methodValue !== null ? String(computed.methodValue) : null;
    updateData.percentOfCapacity = computed.percentOfCapacity !== null ? String(computed.percentOfCapacity) : null;
    updateData.allocationMethod = computed.allocationMethod;
  }

  const [row] = await db.update(allocationsTable).set(updateData).where(eq(allocationsTable.id, params.data.id)).returning();

  await logAudit({
    entityType: "allocation",
    entityId: row.id,
    action: "updated",
    actorUserId: Number(req.headers["x-user-id"]) || undefined,
    description: `Allocation ${row.id} updated (project ${row.projectId}, user ${row.userId ?? "placeholder"})`,
    previousValue: { userId: existing.userId, startDate: existing.startDate, endDate: existing.endDate, hoursPerWeek: existing.hoursPerWeek, isSoftAllocation: existing.isSoftAllocation },
    newValue: { userId: row.userId, startDate: row.startDate, endDate: row.endDate, hoursPerWeek: row.hoursPerWeek, isSoftAllocation: row.isSoftAllocation },
  });

  res.json(UpdateAllocationResponse.parse(mapAllocation(row)));
});

// Cascade-delete: remove all allocations for a user on a project (when removed from project)
router.delete("/projects/:projectId/users/:userId/allocations", requirePM, async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId);
  const userId = parseInt(req.params.userId);
  if (isNaN(projectId) || isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const removed = await db.delete(allocationsTable)
    .where(and(eq(allocationsTable.projectId, projectId), eq(allocationsTable.userId, userId)))
    .returning();
  if (removed.length > 0) {
    await logAudit({
      entityType: "allocation",
      entityId: `project:${projectId}/user:${userId}`,
      action: "deleted",
      actorUserId: Number(req.headers["x-user-id"] ?? 0) || undefined,
      description: `Removed ${removed.length} allocation(s) for user ${userId} on project ${projectId}`,
    });
  }
  res.json({ removedCount: removed.length });
});

// RS-01 — Fill a placeholder allocation with a named user.
router.post("/allocations/:id/fill", requirePM, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const userId = Number(req.body.userId);
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }
  const [alloc] = await db.select().from(allocationsTable).where(eq(allocationsTable.id, id));
  if (!alloc) { res.status(404).json({ error: "Allocation not found" }); return; }
  if (alloc.userId) { res.status(409).json({ error: "Allocation already has a named user" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const [updated] = await db
    .update(allocationsTable)
    .set({ userId, placeholderRole: null })
    .where(eq(allocationsTable.id, id))
    .returning();
  await logAudit({
    entityType: "allocation",
    entityId: id,
    action: "updated",
    actorUserId: Number(req.headers["x-user-id"] ?? 0) || undefined,
    description: `Placeholder allocation #${id} filled by ${user.name}`,
    previousValue: { placeholderRole: alloc.placeholderRole },
    newValue: { userId },
  });
  res.json(updated);
});

router.delete("/allocations/:id", requirePM, async (req, res): Promise<void> => {
  const params = DeleteAllocationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [previous] = await db.select().from(allocationsTable).where(eq(allocationsTable.id, params.data.id));
  await db.delete(allocationsTable).where(eq(allocationsTable.id, params.data.id));
  if (previous) {
    await logAudit({
      entityType: "allocation",
      entityId: previous.id,
      action: "deleted",
      actorUserId: Number(req.headers["x-user-id"] ?? 0) || undefined,
      description: `Allocation ${previous.id} deleted (project ${previous.projectId}, user ${previous.userId})`,
      previousValue: { hoursPerWeek: previous.hoursPerWeek, startDate: previous.startDate, endDate: previous.endDate },
    });
  }
  res.sendStatus(204);
});

// ---------------------------------------------------------------------------
// GET /api/resources/heatmap-capacity?weekStart=YYYY-MM-DD&weekCount=N
// Returns per-user, per-week availableHours factoring in approved time-off
// and public holidays (per user's holidayCalendarId). Never negative.
// ---------------------------------------------------------------------------
router.get("/resources/heatmap-capacity", async (req, res): Promise<void> => {
  const weekCount = Math.min(52, Math.max(1, parseInt(String(req.query.weekCount ?? "12"), 10) || 12));

  // Determine weekStart — must be a Monday (YYYY-MM-DD)
  let weekStartDate: Date;
  if (req.query.weekStart && /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.weekStart))) {
    weekStartDate = new Date(`${req.query.weekStart}T00:00:00Z`);
    // Snap to Monday if the given date isn't one
    const dow = weekStartDate.getUTCDay();
    const diffToMon = dow === 0 ? -6 : 1 - dow;
    weekStartDate.setUTCDate(weekStartDate.getUTCDate() + diffToMon);
  } else {
    const now = new Date();
    const dow = now.getUTCDay();
    const diffToMon = dow === 0 ? -6 : 1 - dow;
    weekStartDate = new Date(now);
    weekStartDate.setUTCDate(now.getUTCDate() + diffToMon);
    weekStartDate.setUTCHours(0, 0, 0, 0);
  }

  // Build week [start, end] ISO string pairs
  const weeks: Array<{ start: string; end: string }> = [];
  for (let i = 0; i < weekCount; i++) {
    const wStart = new Date(weekStartDate);
    wStart.setUTCDate(weekStartDate.getUTCDate() + i * 7);
    const wEnd = new Date(wStart);
    wEnd.setUTCDate(wStart.getUTCDate() + 6);
    weeks.push({ start: wStart.toISOString().slice(0, 10), end: wEnd.toISOString().slice(0, 10) });
  }

  const rangeStart = weeks[0].start;
  const rangeEnd = weeks[weeks.length - 1].end;

  // Load all internal users
  const allUsers = await db.select().from(usersTable);
  const users = allUsers.filter(u => u.isInternal !== false);

  // Load all holiday dates in range, grouped by calendarId
  const allHolidays = await db.select()
    .from(holidayDatesTable)
    .where(and(gte(holidayDatesTable.date, rangeStart), lte(holidayDatesTable.date, rangeEnd)));
  const holidaysByCalendar = new Map<number, Set<string>>();
  for (const h of allHolidays) {
    if (!holidaysByCalendar.has(h.calendarId)) holidaysByCalendar.set(h.calendarId, new Set());
    holidaysByCalendar.get(h.calendarId)!.add(h.date);
  }

  // Load all approved time-off requests overlapping range
  const allTimeOffs = await db.select()
    .from(timeOffRequestsTable)
    .where(and(
      eq(timeOffRequestsTable.status, "Approved"),
      lte(timeOffRequestsTable.startDate, rangeEnd),
      gte(timeOffRequestsTable.endDate, rangeStart),
    ));
  const timeOffByUser = new Map<number, Array<{ startDate: string; endDate: string }>>();
  for (const t of allTimeOffs) {
    if (!timeOffByUser.has(t.userId)) timeOffByUser.set(t.userId, []);
    timeOffByUser.get(t.userId)!.push({ startDate: t.startDate, endDate: t.endDate });
  }

  const result = users.map(u => {
    const dailyCap = u.capacity / 5;
    const userHolidays: Set<string> = u.holidayCalendarId != null
      ? (holidaysByCalendar.get(u.holidayCalendarId) ?? new Set())
      : new Set();

    // Expand user's approved time-off into a date set within the range
    const timeOffSet = new Set<string>();
    for (const t of (timeOffByUser.get(u.id) ?? [])) {
      const cur = new Date(`${t.startDate}T00:00:00Z`);
      const fin = new Date(`${t.endDate}T00:00:00Z`);
      while (cur <= fin) {
        const iso = cur.toISOString().slice(0, 10);
        if (iso >= rangeStart && iso <= rangeEnd) timeOffSet.add(iso);
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    }

    const weekData = weeks.map(w => {
      let workingDays = 0, holidayDays = 0, timeOffDays = 0;
      const cur = new Date(`${w.start}T00:00:00Z`);
      const fin = new Date(`${w.end}T00:00:00Z`);
      while (cur <= fin) {
        const dow = cur.getUTCDay();
        const iso = cur.toISOString().slice(0, 10);
        if (dow !== 0 && dow !== 6) {
          workingDays++;
          if (userHolidays.has(iso)) holidayDays++;
          else if (timeOffSet.has(iso)) timeOffDays++;
        }
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
      const availableDays = Math.max(0, workingDays - holidayDays - timeOffDays);
      return {
        weekStart: w.start,
        availableHours: Math.round(availableDays * dailyCap * 100) / 100,
        timeOffHours: Math.round(timeOffDays * dailyCap * 100) / 100,
        holidayHours: Math.round(holidayDays * dailyCap * 100) / 100,
      };
    });

    return { userId: u.id, weeks: weekData };
  });

  res.json(result);
});

router.get("/resources/capacity", async (_req, res): Promise<void> => {
  const allUsers = await db.select().from(usersTable);
  // Exclude external contacts (is_internal=false) from resource pool
  const users = allUsers.filter(u => u.isInternal !== false);
  // Exclude allocations from soft-deleted (archived) projects
  const activeProjects = await db.select({ id: projectsTable.id }).from(projectsTable).where(isNull(projectsTable.deletedAt));
  const activeProjectIds = new Set(activeProjects.map(p => p.id));
  const allAllocations = await db.select().from(allocationsTable);
  const allocations = allAllocations.filter(a => activeProjectIds.has(a.projectId));
  const now = new Date();
  const nowStr = now.toISOString().slice(0, 10);

  // Calculate current week bounds (Mon–Sun)
  const dayOfWeek = now.getDay(); // 0 = Sun
  const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMon);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  // Count holidays this week (affects all users equally)
  const holidays = await db.select().from(holidayDatesTable).where(
    and(gte(holidayDatesTable.date, weekStartStr), lte(holidayDatesTable.date, weekEndStr))
  );
  const uniqueHolidayDays = new Set(holidays.map(h => h.date)).size;

  // Load approved time-off requests overlapping this week
  const approvedTimeOff = await db.select().from(timeOffRequestsTable).where(
    and(
      eq(timeOffRequestsTable.status, "Approved"),
      lte(timeOffRequestsTable.startDate, weekEndStr),
      gte(timeOffRequestsTable.endDate, weekStartStr)
    )
  );

  const capacity = users.map(u => {
    const dailyCap = u.capacity / 5;

    // Count approved time-off working days for this user within the week
    const userTimeOffs = approvedTimeOff.filter(t => t.userId === u.id);
    let timeOffDays = 0;
    for (const t of userTimeOffs) {
      const start = t.startDate > weekStartStr ? t.startDate : weekStartStr;
      const end = t.endDate < weekEndStr ? t.endDate : weekEndStr;
      let d = new Date(start);
      const endD = new Date(end);
      while (d <= endD) {
        const dow = d.getDay();
        if (dow !== 0 && dow !== 6) timeOffDays++;
        d.setDate(d.getDate() + 1);
      }
    }

    const holidayHoursThisWeek = uniqueHolidayDays * dailyCap;
    const timeOffHoursThisWeek = timeOffDays * dailyCap;
    const cap = Math.max(0, u.capacity - holidayHoursThisWeek - timeOffHoursThisWeek);

    const active = allocations.filter(a => a.userId === u.id && a.endDate >= nowStr);
    const allocated = active.reduce((s, a) => s + Number(a.hoursPerWeek), 0);
    const available = Math.max(0, cap - allocated);
    const utilizationPercent = cap > 0 ? Math.min(100, Math.round((allocated / cap) * 100)) : 0;
    return {
      userId: u.id,
      userName: u.name,
      userInitials: u.initials,
      capacity: cap,
      allocated,
      available,
      utilizationPercent,
      department: u.department,
      role: u.role,
      region: u.region ?? null,
      isInternal: u.isInternal ?? true,
      activeStatus: u.activeStatus ?? "active",
    };
  });

  res.json(GetCapacityOverviewResponse.parse(capacity));
});

const PROFICIENCY_RANK: Record<string, number> = {
  Trained: 1,
  Independent: 2,
  Lead: 3,
  Expert: 4,
};

router.post("/resources/suggest", requirePM, async (req, res): Promise<void> => {
  const body = req.body ?? {};
  const hoursPerWeek = Number(body.hoursPerWeek ?? 0);
  const startDate = String(body.startDate ?? "").slice(0, 10);
  const endDate = String(body.endDate ?? "").slice(0, 10);
  const limit = Math.min(50, Math.max(1, Number(body.limit ?? 10)));
  const requiredSkillsWithLevel: { skillId?: number; skillName: string; competencyLevel: string }[] =
    Array.isArray(body.requiredSkillsWithLevel) ? body.requiredSkillsWithLevel : [];
  const requiredSkills: string[] = Array.isArray(body.requiredSkills) ? body.requiredSkills : [];
  const excludeUserIds = new Set<number>(Array.isArray(body.excludeUserIds) ? body.excludeUserIds.map((n: any) => Number(n)) : []);

  if (!startDate || !endDate || !hoursPerWeek || hoursPerWeek <= 0) {
    res.status(400).json({ error: "startDate, endDate and positive hoursPerWeek are required" });
    return;
  }
  if (startDate > endDate) {
    res.status(400).json({ error: "startDate must be on or before endDate" });
    return;
  }

  const allUsers = await db.select().from(usersTable);
  const candidates = allUsers.filter(
    u => u.isInternal !== false && (u.activeStatus ?? "active") === "active" && !excludeUserIds.has(u.id),
  );
  const candidateIds = new Set(candidates.map(u => u.id));

  const activeProjects = await db.select({ id: projectsTable.id }).from(projectsTable).where(isNull(projectsTable.deletedAt));
  const activeProjectIds = new Set(activeProjects.map(p => p.id));
  const allAllocations = await db.select().from(allocationsTable);
  const overlappingAllocs = allAllocations.filter(
    a =>
      a.userId !== null &&
      candidateIds.has(a.userId) &&
      activeProjectIds.has(a.projectId) &&
      a.startDate <= endDate &&
      a.endDate >= startDate,
  );

  const allUserSkills = await db.select().from(userSkillsTable);
  const allSkills = await db.select().from(skillsTable);
  const skillById = new Map(allSkills.map(s => [s.id, s]));
  const skillsByUser = new Map<number, typeof allUserSkills>();
  for (const us of allUserSkills) {
    if (!candidateIds.has(us.userId)) continue;
    const arr = skillsByUser.get(us.userId) ?? [];
    arr.push(us);
    skillsByUser.set(us.userId, arr);
  }

  const approvedTimeOff = await db
    .select()
    .from(timeOffRequestsTable)
    .where(
      and(
        eq(timeOffRequestsTable.status, "Approved"),
        lte(timeOffRequestsTable.startDate, endDate),
        gte(timeOffRequestsTable.endDate, startDate),
      ),
    );

  const hasSkillRequirements = requiredSkillsWithLevel.length > 0 || requiredSkills.length > 0;

  function scoreSkills(userId: number): {
    skillScore: number;
    matched: number;
    total: number;
    details: { skillName: string; required: string; userLevel: string | null; meets: boolean }[];
  } {
    const userSkills = skillsByUser.get(userId) ?? [];
    if (requiredSkillsWithLevel.length > 0) {
      const details = requiredSkillsWithLevel.map(r => {
        const us = userSkills.find(
          x =>
            (r.skillId !== undefined && x.skillId === r.skillId) ||
            (skillById.get(x.skillId)?.name?.toLowerCase() === r.skillName.toLowerCase()),
        );
        const userLevel = us?.proficiencyLevel ?? null;
        const userRank = userLevel ? PROFICIENCY_RANK[userLevel] ?? 0 : 0;
        const reqRank = PROFICIENCY_RANK[r.competencyLevel] ?? 1;
        const meets = userRank >= reqRank;
        return { skillName: r.skillName, required: r.competencyLevel, userLevel, meets };
      });
      const matched = details.filter(d => d.meets).length;
      const skillScore = (matched / requiredSkillsWithLevel.length) * 100;
      return { skillScore, matched, total: requiredSkillsWithLevel.length, details };
    }
    if (requiredSkills.length > 0) {
      const userSkillNames = userSkills
        .map(us => skillById.get(us.skillId)?.name?.toLowerCase() ?? "")
        .filter(Boolean);
      const details = requiredSkills.map(s => {
        const meets = userSkillNames.includes(s.toLowerCase());
        return { skillName: s, required: "Independent", userLevel: meets ? "Independent" : null, meets };
      });
      const matched = details.filter(d => d.meets).length;
      const skillScore = (matched / requiredSkills.length) * 100;
      return { skillScore, matched, total: requiredSkills.length, details };
    }
    return { skillScore: 0, matched: 0, total: 0, details: [] };
  }

  const suggestions = candidates.map(u => {
    const cap = u.capacity ?? 40;
    const userAllocs = overlappingAllocs.filter(a => a.userId === u.id);
    const allocatedHpw = userAllocs.reduce((s, a) => s + Number(a.hoursPerWeek ?? 0), 0);

    const userTimeOff = approvedTimeOff.filter(t => t.userId === u.id);
    const hasTimeOffOverlap = userTimeOff.length > 0;

    const proposedHpw = allocatedHpw + hoursPerWeek;
    const utilizationPct = cap > 0 ? Math.round((proposedHpw / cap) * 100) : 0;
    const availableHpw = Math.max(0, cap - allocatedHpw);

    let capacityScore = 0;
    if (cap > 0) {
      capacityScore = Math.max(0, Math.min(100, ((cap - proposedHpw) / cap) * 100 + 50));
      if (proposedHpw > cap) capacityScore = Math.max(0, 50 - (proposedHpw - cap));
    }

    const skill = scoreSkills(u.id);

    let composite = hasSkillRequirements
      ? skill.skillScore * 0.7 + capacityScore * 0.3
      : capacityScore;
    if (utilizationPct > 100) composite -= 25;
    if (hasTimeOffOverlap) composite -= 10;
    composite = Math.max(0, Math.min(100, composite));

    const reasons: string[] = [];
    if (skill.total > 0) {
      reasons.push(`Matches ${skill.matched}/${skill.total} required skill${skill.total === 1 ? "" : "s"}`);
    }
    if (availableHpw >= hoursPerWeek) {
      reasons.push(`${availableHpw}h/wk available — fits the ${hoursPerWeek}h/wk request`);
    } else if (utilizationPct > 100) {
      reasons.push(`Will be ${utilizationPct}% allocated — over ${cap}h/wk capacity`);
    } else {
      reasons.push(`${availableHpw}h/wk available, ${utilizationPct}% utilization after assignment`);
    }
    if (hasTimeOffOverlap) reasons.push("Has approved time-off in this date range");

    return {
      userId: u.id,
      userName: u.name,
      userInitials: u.initials,
      role: u.role,
      department: u.department,
      capacity: cap,
      currentAllocatedHpw: allocatedHpw,
      proposedAllocatedHpw: proposedHpw,
      utilizationPct,
      availableHpw,
      hasTimeOffOverlap,
      skillScore: Math.round(skill.skillScore),
      skillsMatched: skill.matched,
      skillsRequired: skill.total,
      skillDetails: skill.details,
      capacityScore: Math.round(capacityScore),
      compositeScore: Math.round(composite),
      reasons,
    };
  });

  suggestions.sort((a, b) => b.compositeScore - a.compositeScore);
  res.json(suggestions.slice(0, limit));
});

export default router;
