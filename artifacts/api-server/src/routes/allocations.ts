import { Router, type IRouter } from "express";
import { eq, and, gte, lte, isNull } from "drizzle-orm";
import { requirePM } from "../middleware/rbac";
import { db, allocationsTable, usersTable, holidayDatesTable, timeOffRequestsTable, projectsTable, userSkillsTable, skillsTable } from "@workspace/db";
import { logAudit } from "../lib/audit";
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
  const rows = conditions.length
    ? await db.select().from(allocationsTable).where(and(...conditions))
    : await db.select().from(allocationsTable);
  res.json(ListAllocationsResponse.parse(rows.map(mapAllocation)));
});

router.post("/allocations", requirePM, async (req, res): Promise<void> => {
  const parsed = CreateAllocationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const validationError = validateAllocationCore({ ...parsed.data, ...req.body });
  if (validationError) { res.status(400).json({ error: validationError }); return; }
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
  const placeholderId = req.body.placeholderId ?? null;
  const insertVals: any = {
    ...parsed.data,
    isSoftAllocation,
    placeholderId,
    hoursPerWeek: String(computed.hoursPerWeek),
    hoursPerDay: String(computed.hoursPerDay),
    totalHours: String(computed.totalHours),
    methodValue: computed.methodValue !== null ? String(computed.methodValue) : null,
    percentOfCapacity: computed.percentOfCapacity !== null ? String(computed.percentOfCapacity) : null,
    allocationMethod: computed.allocationMethod,
  };
  const [row] = await db.insert(allocationsTable).values(insertVals).returning();
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
