import { Router, type IRouter } from "express";
import { eq, and, asc, isNull, isNotNull, inArray, ne, sql } from "drizzle-orm";
import { parsePagination, envelope } from "../lib/pagination";
import { db, projectsTable, invoicesTable, allocationsTable, accountsTable, usersTable, tasksTable, taskDependenciesTable, budgetEntriesTable, notificationsTable } from "@workspace/db";
import { logAudit } from "../lib/audit";
import { getTrackedHoursMap, getTrackedHours } from "../lib/trackedHours";
import { checkOutOfRangeAllocations } from "../lib/outOfRangeAllocationCheck";
import { requireAdmin, requirePM } from "../middleware/rbac";
import {
  ListProjectsResponse,
  ListProjectsQueryParams,
  CreateProjectBody,
  GetProjectParams,
  GetProjectResponse,
  UpdateProjectParams,
  UpdateProjectBody,
  UpdateProjectResponse,
  DeleteProjectParams,
  GetProjectSummaryParams,
  GetProjectSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Project lifecycle state machine
// ---------------------------------------------------------------------------
// Canonical keys are lowercase with underscores. Both the currentStatus from
// the DB and the incoming newStatus are normalised before the lookup so legacy
// TitleCase / spaced values ("On Hold", "Completed", …) are handled gracefully.
// statuses not present as keys (e.g. legacy "Not Started") are treated as
// unrestricted — the guard is a no-op for those rows.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  not_started: ["draft", "active"],
  draft:       ["active"],
  active:      ["on_hold", "completed", "cancelled"],
  on_hold:     ["active", "cancelled"],
  completed:   [],
  cancelled:   [],
};

/** Normalise any status string to the lowercase_underscore key used in ALLOWED_TRANSITIONS. */
function normaliseStatus(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "_");
}

function mapProject(p: typeof projectsTable.$inferSelect, trackedHours: number = 0) {
  // PM-03: Auto-compute health when not explicitly set, based on end date proximity.
  let health: string | null = p.health ?? null;
  if (!health) {
    const closedStatuses = ["Completed", "Cancelled", "Archived", "On Hold"];
    const endDateVal = (p as any).endDate ?? (p as any).dueDate ?? null;
    if (endDateVal && !closedStatuses.includes(p.status ?? "")) {
      const today = new Date().toISOString().slice(0, 10);
      if (endDateVal < today) {
        health = "Red";
      } else {
        const daysLeft = Math.ceil((new Date(endDateVal).getTime() - Date.now()) / 86400000);
        if (daysLeft <= 14) health = "Amber";
        else health = "Green";
      }
    }
  }
  return {
    ...p,
    health,
    budget: Number(p.budget),
    trackedHours,
    allocatedHours: Number(p.allocatedHours),
    budgetedHours: Number(p.budgetedHours),
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
  };
}

router.get("/projects", async (req, res): Promise<void> => {
  const qp = ListProjectsQueryParams.safeParse(req.query);
  const conditions: ReturnType<typeof eq>[] = [isNull(projectsTable.deletedAt)];
  if (qp.success && qp.data.status) conditions.push(eq(projectsTable.status, qp.data.status));
  // MT-1: scope by authenticated user's tenant when accountId not explicitly provided.
  const authReqP = req as import("../middleware/roleClaim").AuthenticatedRequest;
  const tenantId = authReqP.authAccountId;
  if (qp.success && qp.data.accountId) {
    conditions.push(eq(projectsTable.accountId, qp.data.accountId));
  } else if (tenantId) {
    conditions.push(eq(projectsTable.accountId, tenantId));
  }
  if (typeof req.query.context === "string" && req.query.context === "timesheet") {
    conditions.push(ne(projectsTable.status, "draft"));
  }
  const page = parsePagination(req.query as Record<string, unknown>);
  const baseQuery = db
    .select({ project: projectsTable, accountName: accountsTable.name, accountDomain: accountsTable.domain, ownerName: usersTable.name })
    .from(projectsTable)
    .leftJoin(accountsTable, eq(projectsTable.accountId, accountsTable.id))
    .leftJoin(usersTable, eq(projectsTable.ownerId, usersTable.id))
    .where(and(...conditions));
  const rows = page.paginated
    ? await baseQuery.limit(page.limit).offset(page.offset)
    : await baseQuery;
  let total = rows.length;
  if (page.paginated) {
    const [{ c }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(projectsTable)
      .where(and(...conditions));
    total = Number(c);
  }
  const thMap = await getTrackedHoursMap(rows.map(r => r.project.id));
  const data = ListProjectsResponse.parse(rows.map(({ project, accountName, accountDomain, ownerName }) => ({
    ...mapProject(project, thMap.get(project.id) ?? 0),
    companyName: accountName ?? undefined,
    companyDomain: accountDomain ?? undefined,
    ownerName: ownerName ?? undefined,
  })));
  res.json(envelope(data, total, page));
});

router.post("/projects", requirePM, async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  // Cross-field guard: dueDate must not precede startDate.
  const sd = (parsed.data as any).startDate;
  const dd = (parsed.data as any).dueDate;
  if (sd && dd && new Date(dd) < new Date(sd)) {
    res.status(400).json({ error: "dueDate must be on or after startDate" });
    return;
  }
  const [row] = await db.insert(projectsTable).values(parsed.data as any).returning();
  await logAudit({ entityType: "project", entityId: row.id, action: "created", description: `Project "${row.name}" created` });

  // Auto-create the initial SOW budget entry so the budget ledger and
  // burn-down report are populated from day one. Fire-and-forget; a failure
  // here does not block the project creation response.
  if (Number(parsed.data.budget) > 0) {
    db.insert(budgetEntriesTable).values({
      projectId: row.id,
      entryDate: parsed.data.startDate,
      type: "SOW",
      description: "Initial SOW — project creation",
      amount: String(parsed.data.budget),
      hours: String(parsed.data.budgetedHours ?? 0),
    }).catch((err: unknown) => {
      console.error(`[projects] auto-SOW insert failed for project ${row.id}:`, err);
    });
  }

  res.status(201).json(GetProjectResponse.parse(mapProject(row)));
});

router.get("/projects/deleted", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(projectsTable).where(isNotNull(projectsTable.deletedAt));
  const thMap = await getTrackedHoursMap(rows.map(r => r.id));
  res.json(rows.map(r => mapProject(r, thMap.get(r.id) ?? 0)));
});

router.get("/projects/:id", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Project not found" }); return; }
  const th = await getTrackedHours(row.id);
  res.json(GetProjectResponse.parse(mapProject(row, th)));
});

router.patch("/projects/:id", requirePM, async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  // Soft-delete leak guard: do not allow edits to a soft-deleted project
  // (callers should use the dedicated /restore endpoint first).
  const [existing] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Project not found" }); return; }
  if (existing.deletedAt) {
    res.status(409).json({ error: "Project is deleted; restore it before editing." });
    return;
  }

  // -------------------------------------------------------------------------
  // Budget lock guard
  // -------------------------------------------------------------------------
  // While budgetLocked = true, any attempt to change monetary/hours budget
  // fields is rejected with 403. Non-budget fields pass through unchanged.
  // Account Admin can unlock via PATCH /projects/:id/unlock-budget.
  const BUDGET_FIELDS = ["budget", "budgetedHours", "budgetCurrency"] as const;
  const bodyAny = parsed.data as any;
  if ((existing as any).budgetLocked && BUDGET_FIELDS.some(f => f in bodyAny)) {
    res.status(403).json({
      error: "budget_locked",
      message: "Budget is locked. Raise a Change Order to modify the budget.",
      changeOrderUrl: `/projects/${existing.id}?tab=changes`,
    });
    return;
  }

  // -------------------------------------------------------------------------
  // Lifecycle state machine guard
  // -------------------------------------------------------------------------
  const incomingStatus = (parsed.data as any).status as string | undefined;
  const isStatusChange = incomingStatus !== undefined && incomingStatus !== existing.status;
  if (isStatusChange) {
    // Rule 3: statusChangeReason is mandatory for any status transition.
    const reason = typeof (req.body as any).statusChangeReason === "string"
      ? ((req.body as any).statusChangeReason as string).trim()
      : "";
    if (!reason) {
      res.status(400).json({ error: "reason_required" });
      return;
    }

    // Rule 2: enforce the allowed-transition matrix.
    const fromKey = normaliseStatus(existing.status);
    const toKey = normaliseStatus(incomingStatus);
    const allowed = ALLOWED_TRANSITIONS[fromKey]; // undefined = legacy status → no restriction
    if (allowed !== undefined && !allowed.includes(toKey)) {
      res.status(422).json({
        error: "invalid_transition",
        from: existing.status,
        to: incomingStatus,
        allowed: allowed.map(k => k),   // return matrix keys as-is
      });
      return;
    }

    // Rule 4: write the reason + actor + timestamp to the audit log.
    const actorUserId = Number(req.headers["x-user-id"] ?? 0) || undefined;
    await logAudit({
      entityType: "project",
      entityId: existing.id,
      action: "status_changed",
      actorUserId,
      description: `Status changed from "${existing.status}" to "${incomingStatus}": ${reason}`,
      previousValue: { status: existing.status },
      newValue: { status: incomingStatus, reason },
    });
  }

  // Cross-field guard against the merged value, so PATCH-only-startDate or
  // PATCH-only-dueDate cannot create an inverted range.
  const merged = { ...existing, ...(parsed.data as any) };
  if (merged.startDate && merged.dueDate && new Date(merged.dueDate) < new Date(merged.startDate)) {
    res.status(400).json({ error: "dueDate must be on or after startDate" });
    return;
  }
  // Auto-lock budget when publishing (draft → active).
  const updatePayload: any = { ...(parsed.data as any) };
  if (isStatusChange
      && normaliseStatus(existing.status) === "draft"
      && normaliseStatus(incomingStatus!) === "active") {
    updatePayload.budgetLocked = true;
  }
  const [row] = await db.update(projectsTable).set(updatePayload).where(eq(projectsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Project not found" }); return; }
  const th = await getTrackedHours(row.id);
  if (!isStatusChange) {
    await logAudit({ entityType: "project", entityId: row.id, action: "updated", description: `Project "${row.name}" updated` });
  }

  // WF-01 — Notify all allocated users + project owner on status change (fire-and-forget).
  if (isStatusChange) {
    void (async () => {
      try {
        const allocated = await db
          .select({ userId: allocationsTable.userId })
          .from(allocationsTable)
          .where(eq(allocationsTable.projectId, row.id));
        const recipientSet = new Set<number>();
        if (row.ownerId) recipientSet.add(row.ownerId);
        for (const a of allocated) { if (a.userId) recipientSet.add(a.userId); }
        for (const uid of recipientSet) {
          await db.insert(notificationsTable).values({
            userId: uid,
            type: "project_status_changed",
            title: `"${row.name}" is now ${row.status}`,
            message: `Project status changed from "${existing.status}" to "${row.status}".`,
            entityType: "project",
            entityId: String(row.id),
          });
        }
      } catch { /* non-blocking */ }
    })();
  }

  // ── Out-of-range allocation detection (fire-and-forget) ──────────────────
  // Runs only when the project timeline actually changed and the project has a PM.
  const dateChanged = ("startDate" in (parsed.data as any)) || ("dueDate" in (parsed.data as any));
  if (dateChanged && row.ownerId) {
    checkOutOfRangeAllocations({
      projectId: row.id,
      projectName: row.name,
      newStartDate: row.startDate,
      newDueDate: row.dueDate,
      pmUserId: row.ownerId,
    }).catch(() => {});
  }

  res.json(UpdateProjectResponse.parse(mapProject(row, th)));
});

// ---------------------------------------------------------------------------
// Budget unlock (Account Admin only)
// ---------------------------------------------------------------------------
// Clears budgetLocked so direct budget edits are permitted again.
// A reason is mandatory and written to the audit log.
// NOTE: must be registered before the generic PATCH /projects/:id so Express
// does not swallow ":id/unlock-budget" as a param match (different method +
// extra path segment — no conflict in practice, but keep the order explicit).
router.patch("/projects/:id/unlock-budget", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const reason = typeof (req.body as any).reason === "string"
    ? ((req.body as any).reason as string).trim()
    : "";
  if (!reason) {
    res.status(400).json({ error: "reason is required to unlock the budget" });
    return;
  }
  const [row] = await db
    .update(projectsTable)
    .set({ budgetLocked: false } as any)
    .where(eq(projectsTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Project not found" }); return; }
  await logAudit({
    entityType: "project",
    entityId: id,
    action: "updated",
    actorUserId: Number(req.headers["x-user-id"] ?? 0) || undefined,
    description: `Budget unlocked: ${reason}`,
    previousValue: { budgetLocked: true },
    newValue: { budgetLocked: false, reason },
  });
  const th = await getTrackedHours(row.id);
  res.json(mapProject(row, th));
});

router.delete("/projects/:id", requirePM, async (req, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [previous] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.id));
  await db.update(projectsTable).set({ deletedAt: new Date() } as any).where(eq(projectsTable.id, params.data.id));
  if (previous) {
    await logAudit({
      entityType: "project",
      entityId: previous.id,
      action: "deleted",
      actorUserId: Number(req.headers["x-user-id"] ?? 0) || undefined,
      description: `Project "${previous.name}" archived (soft-deleted)`,
    });
  }
  res.sendStatus(204);
});

router.post("/projects/:id/restore", requirePM, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.update(projectsTable).set({ deletedAt: null } as any).where(eq(projectsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Project not found" }); return; }
  await logAudit({
    entityType: "project",
    entityId: row.id,
    action: "updated",
    actorUserId: Number(req.headers["x-user-id"] ?? 0) || undefined,
    description: `Project "${row.name}" restored from archive`,
  });
  const th = await getTrackedHours(row.id);
  res.json(mapProject(row, th));
});

router.get("/projects/:id/summary", async (req, res): Promise<void> => {
  const params = GetProjectSummaryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.id));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const projectInvoices = await db.select().from(invoicesTable).where(eq(invoicesTable.projectId, params.data.id));
  const allocations = await db.select().from(allocationsTable).where(eq(allocationsTable.projectId, params.data.id));

  const budget = Number(project.budget);
  const budgetedHours = Number(project.budgetedHours);
  const trackedHours = await getTrackedHours(project.id);
  const invoicedAmount = projectInvoices.filter(i => i.status === 'Paid' || i.status === 'Approved').reduce((s, i) => s + Number(i.total), 0);
  const pendingAmount = projectInvoices.filter(i => i.status === 'In Review' || i.status === 'Draft').reduce((s, i) => s + Number(i.total), 0);
  const due = new Date(project.dueDate);
  const daysRemaining = Math.max(0, Math.ceil((due.getTime() - Date.now()) / 86400000));
  const teamSize = new Set(allocations.map(a => a.userId)).size;

  res.json(GetProjectSummaryResponse.parse({
    projectId: params.data.id,
    budgetUsedPercent: budget > 0 ? Math.min(100, Math.round((invoicedAmount / budget) * 100)) : 0,
    hoursUsedPercent: budgetedHours > 0 ? Math.min(100, Math.round((trackedHours / budgetedHours) * 100)) : 0,
    daysRemaining,
    invoicedAmount,
    pendingAmount,
    teamSize,
  }));
});

// ─── Shift Dates ──────────────────────────────────────────────────────────────
router.post("/projects/:id/shift-dates", requirePM, async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.id, 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }

  const { days, fromTaskId } = req.body;
  const shiftDays = parseInt(days, 10);
  if (isNaN(shiftDays) || shiftDays === 0) {
    res.status(400).json({ error: "days must be a non-zero integer" }); return;
  }

  const shiftMs = shiftDays * 86400000;

  function shiftDate(d: string | null | undefined): string | null {
    if (!d) return null;
    return new Date(new Date(d).getTime() + shiftMs).toISOString().slice(0, 10);
  }

  // Get all tasks for the project
  const allTasks = await db.select().from(tasksTable).where(eq(tasksTable.projectId, projectId));

  // If fromTaskId given, only shift that task and its downstream dependents
  let taskIdsToShift: Set<number>;
  if (fromTaskId) {
    const startId = parseInt(fromTaskId, 10);
    // BFS downstream
    taskIdsToShift = new Set<number>([startId]);
    const allDeps = await db.select().from(taskDependenciesTable)
      .where(inArray(taskDependenciesTable.predecessorId, allTasks.map(t => t.id)));
    const queue = [startId];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const downstream = allDeps.filter(d => d.predecessorId === cur);
      for (const d of downstream) {
        if (!taskIdsToShift.has(d.successorId)) {
          taskIdsToShift.add(d.successorId);
          queue.push(d.successorId);
        }
      }
    }
  } else {
    taskIdsToShift = new Set(allTasks.map(t => t.id));
  }

  // Shift tasks
  for (const task of allTasks) {
    if (!taskIdsToShift.has(task.id)) continue;
    await db.update(tasksTable).set({
      startDate: shiftDate(task.startDate),
      dueDate: shiftDate(task.dueDate),
    }).where(eq(tasksTable.id, task.id));
  }

  // Phase rollup: Level-1 phase tasks now hold their own dates and are shifted in the
  // tasks loop above; no separate phases entity to recalc.

  // Optionally shift project dates too
  if (!fromTaskId) {
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
    if (project) {
      await db.update(projectsTable).set({
        startDate: shiftDate(project.startDate),
        dueDate: shiftDate(project.dueDate),
      }).where(eq(projectsTable.id, projectId));
    }
  }

  await logAudit({ action: "updated", entityType: "project", entityId: projectId, description: `Shifted dates by ${shiftDays} days` });
  res.json({ shifted: taskIdsToShift.size, days: shiftDays });
});

// ── Gantt data ────────────────────────────────────────────────────────────────
router.get("/projects/:id/gantt", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid project id" }); return; }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.projectId, id));
  const users = await db.select().from(usersTable);

  const taskIds = tasks.map(t => t.id);
  const deps = taskIds.length > 0
    ? await db.select().from(taskDependenciesTable).where(
        inArray(taskDependenciesTable.successorId, taskIds)
      )
    : [];

  // Build a set of task IDs that are parents
  const parentIds = new Set(tasks.filter(t => t.parentTaskId !== null).map(t => t.parentTaskId as number));

  // Compute depth for each task by walking the parent chain
  const depthMap = new Map<number, number>();
  function getDepth(taskId: number, visited = new Set<number>()): number {
    if (depthMap.has(taskId)) return depthMap.get(taskId)!;
    if (visited.has(taskId)) return 0;
    visited.add(taskId);
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.parentTaskId === null) {
      depthMap.set(taskId, 0);
      return 0;
    }
    const d = 1 + getDepth(task.parentTaskId, visited);
    depthMap.set(taskId, d);
    return d;
  }
  tasks.forEach(t => getDepth(t.id));

  // Sort tasks: top-level first, then by parent hierarchy
  const sortedTasks = [...tasks].sort((a, b) => {
    const da = depthMap.get(a.id) ?? 0;
    const db_ = depthMap.get(b.id) ?? 0;
    if (da !== db_) return da - db_;
    return a.id - b.id;
  });

  const rows = sortedTasks.map(t => {
    const assigneeIds = (t.assigneeIds ?? []) as number[];
    const assigneeNames = assigneeIds
      .map(id => users.find(u => u.id === id)?.name ?? `User ${id}`)
      .slice(0, 2)
      .join(", ");
    return {
      id: t.id,
      type: t.isMilestone ? "milestone" : "task",
      name: t.name,
      startDate: t.startDate ?? null,
      dueDate: t.dueDate ?? null,
      status: t.status,
      completion: 0,
      parentId: t.parentTaskId ?? null,
      parentTaskId: t.parentTaskId ?? null,
      depth: depthMap.get(t.id) ?? 0,
      isMilestone: t.isMilestone,
      milestoneType: t.milestoneType ?? null,
      hasChildren: parentIds.has(t.id),
      assigneeIds,
      assigneeNames,
    };
  });

  const dependencies = deps.map(d => ({
    id: d.id,
    predecessorId: d.predecessorId,
    successorId: d.successorId,
    dependencyType: d.dependencyType ?? "FS",
    lagDays: d.lagDays ?? 0,
  }));

  // Determine project date range from tasks if project dates are missing
  const allStarts = tasks.map(t => t.startDate).filter(Boolean) as string[];
  const allEnds = tasks.map(t => t.dueDate).filter(Boolean) as string[];
  const projectStart = project.startDate || (allStarts.length ? allStarts.sort()[0] : new Date().toISOString().slice(0, 10));
  const projectEnd = project.dueDate || (allEnds.length ? allEnds.sort().at(-1)! : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));

  res.json({ projectId: id, projectStart, projectEnd, rows, dependencies });
});

// ─── Budget entries ───────────────────────────────────────────────────────────
function mapBudgetEntry(b: typeof budgetEntriesTable.$inferSelect) {
  return {
    id: b.id,
    projectId: b.projectId,
    entryDate: b.entryDate,
    type: b.type,
    description: b.description,
    amount: Number(b.amount),
    hours: Number(b.hours),
    documentLink: b.documentLink,
    changeOrderId: b.changeOrderId,
    createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
  };
}

router.get("/projects/:id/budget-entries", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.id, 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }
  const rows = await db
    .select()
    .from(budgetEntriesTable)
    .where(eq(budgetEntriesTable.projectId, projectId))
    .orderBy(asc(budgetEntriesTable.entryDate), asc(budgetEntriesTable.id));

  let runningAmount = 0;
  let runningHours = 0;
  const entries = rows.map((r) => {
    const m = mapBudgetEntry(r);
    runningAmount += m.amount;
    runningHours += m.hours;
    return { ...m, runningAmount: Number(runningAmount.toFixed(2)), runningHours: Number(runningHours.toFixed(2)) };
  });

  res.json({
    totalAmount: Number(runningAmount.toFixed(2)),
    totalHours: Number(runningHours.toFixed(2)),
    entries,
  });
});

// Manual entries are restricted to "SOW" (one per project, the original
// statement-of-work baseline) or "Adjustment" (corrections). CO rows are
// inserted automatically by the /change-orders approval flow — exposing that
// type here would let users double-count the budget.
router.post("/projects/:id/budget-entries", requirePM, async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.id, 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const { entryDate, type, description, amount, hours, documentLink } = req.body ?? {};
  if (!entryDate || typeof entryDate !== "string") { res.status(400).json({ error: "entryDate is required" }); return; }
  if (type !== "Adjustment" && type !== "SOW") {
    res.status(400).json({ error: "Manual entries must be type 'SOW' or 'Adjustment'. CO entries are recorded automatically." });
    return;
  }
  // Only one SOW row per project — it's the baseline.  We do an upfront check
  // for a friendly 409 in the common (single-request) case, and the partial
  // unique index `budget_entries_sow_per_project_uq` is the race-safe
  // backstop for concurrent POSTs (caught below as a 23505 unique violation).
  if (type === "SOW") {
    const [existingSow] = await db
      .select({ id: budgetEntriesTable.id })
      .from(budgetEntriesTable)
      .where(and(eq(budgetEntriesTable.projectId, projectId), eq(budgetEntriesTable.type, "SOW")));
    if (existingSow) {
      res.status(409).json({ error: "An SOW entry already exists for this project. Use 'Adjustment' for further changes." });
      return;
    }
  }
  const desc = typeof description === "string" ? description.trim() : "";
  if (!desc) { res.status(400).json({ error: "description is required" }); return; }

  let row;
  try {
    [row] = await db.insert(budgetEntriesTable).values({
      projectId,
      entryDate,
      type,
      description: desc,
      amount: String(Number(amount) || 0),
      hours: String(Number(hours) || 0),
      documentLink: documentLink || null,
    }).returning();
  } catch (err: any) {
    // Race-safety backstop: the partial unique index
    // `budget_entries_sow_per_project_uq` fires when a concurrent request
    // beat us to inserting the SOW row.  Drizzle wraps the pg error, so
    // pull the code/constraint from either `err` or `err.cause`, and
    // narrow strictly to *our* SOW index — any other 23505 (a real bug)
    // should re-throw and surface as 500 rather than be silently masked
    // as "SOW already exists".
    const pgCode = err?.code ?? err?.cause?.code;
    const constraint: string | undefined = err?.constraint ?? err?.cause?.constraint;
    const message: string = typeof err?.message === "string" ? err.message : "";
    const isSowDuplicate =
      pgCode === "23505" &&
      (constraint === "budget_entries_sow_per_project_uq" ||
        message.includes("budget_entries_sow_per_project_uq"));
    if (isSowDuplicate) {
      res.status(409).json({ error: "An SOW entry already exists for this project. Use 'Adjustment' for further changes." });
      return;
    }
    throw err;
  }

  await logAudit({
    entityType: "budget_entry",
    entityId: row.id,
    action: "updated",
    description: `Budget entry added to project ${projectId} (${type}): ${desc} — $${Number(row.amount).toFixed(2)}, ${Number(row.hours).toFixed(2)}h`,
    newValue: { projectId, type, amount: Number(row.amount), hours: Number(row.hours) },
  });

  res.status(201).json(mapBudgetEntry(row));
});

export default router;

