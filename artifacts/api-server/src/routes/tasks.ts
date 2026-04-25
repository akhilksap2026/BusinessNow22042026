import { Router, type IRouter } from "express";
import { eq, and, inArray, asc } from "drizzle-orm";
import { db, tasksTable, invoicesTable, projectsTable, allocationsTable, notificationsTable, csatSurveysTable, timeEntriesTable } from "@workspace/db";
import { requirePM } from "../middleware/rbac";
import { logAudit } from "../lib/audit";
import {
  ListTasksResponse,
  ListTasksQueryParams,
  CreateTaskBody,
  GetTaskParams,
  GetTaskResponse,
  UpdateTaskParams,
  UpdateTaskBody,
  UpdateTaskResponse,
  DeleteTaskParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const PM_ROLES = new Set(["Admin", "PM", "Super User"]);
function canReadPrivateNotes(role: string): boolean {
  return PM_ROLES.has(role);
}

function mapTask(t: typeof tasksTable.$inferSelect, actualHoursById?: Map<number, number>) {
  const planned = Number(t.plannedHours ?? 0) || Number(t.effort ?? 0);
  const estimate = Number(t.estimateHours ?? 0) || planned;
  const actual = actualHoursById?.get(t.id) ?? 0;
  const etc = estimate - actual;
  const eac = actual + Math.abs(etc);
  return {
    ...t,
    effort: Number(t.effort),
    plannedHours: planned,
    estimateHours: estimate,
    actualHours: Number(actual.toFixed(2)),
    etc: Number(etc.toFixed(2)),
    eac: Number(eac.toFixed(2)),
    assigneeIds: t.assigneeIds ?? [],
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt,
  };
}

// Build a map of taskId → sum of time-entry hours for the given task ids.
async function getActualHoursMap(taskIds: number[]): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  if (taskIds.length === 0) return map;
  const rows = await db.select().from(timeEntriesTable).where(inArray(timeEntriesTable.taskId, taskIds));
  for (const r of rows) {
    if (r.taskId == null) continue;
    map.set(r.taskId, (map.get(r.taskId) ?? 0) + Number(r.hours ?? 0));
  }
  return map;
}

// Count Mon–Fri working days inclusive between two ISO date strings (yyyy-mm-dd).
// Returns null for invalid input or end < start so callers can skip allocation
// rather than silently inflating hours/day.
function workingDays(startISO: string | null | undefined, endISO: string | null | undefined): number | null {
  if (!startISO || !endISO) return null;
  const start = new Date(startISO + "T00:00:00Z");
  const end = new Date(endISO + "T00:00:00Z");
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return null;
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count > 0 ? count : null;
}

// Auto-allocate hook: for each newly assigned user on a task whose project
// has autoAllocate=true, create a hard allocation with source='auto' and
// hours_per_day derived from task.effort / working_days(start, end).
// Skips users who already have an active allocation that covers the window.
async function runAutoAllocateHook(opts: {
  task: typeof tasksTable.$inferSelect;
  newlyAssignedIds: number[];
}) {
  const { task } = opts;
  // Dedupe + drop falsy ids so duplicate request payloads don't double-insert.
  const newlyAssignedIds = Array.from(new Set(opts.newlyAssignedIds.filter(Boolean)));
  if (newlyAssignedIds.length === 0) return;
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, task.projectId));
  if (!project || !project.autoAllocate) return;

  const startDate = task.startDate ?? project.startDate;
  const endDate = task.dueDate ?? project.dueDate;
  const days = workingDays(startDate, endDate);
  if (days === null) return; // Invalid window: skip auto-allocation entirely.
  const effort = Number(task.effort ?? 0);
  const hoursPerDay = effort > 0 ? effort / days : 0;
  const hoursPerWeek = hoursPerDay * 5;
  const totalHours = hoursPerDay * days;

  const existingAllocs = await db.select().from(allocationsTable).where(eq(allocationsTable.projectId, project.id));

  for (const uid of newlyAssignedIds) {
    const overlapping = existingAllocs.some(a => a.userId === uid && a.endDate >= startDate && a.startDate <= endDate);
    if (overlapping) continue;
    const role = (task.taskRoles as Record<string, string> | null)?.[String(uid)] ?? "Team Member";
    const [created] = await db.insert(allocationsTable).values({
      projectId: project.id,
      userId: uid,
      startDate,
      endDate,
      hoursPerDay: hoursPerDay.toFixed(2),
      hoursPerWeek: hoursPerWeek.toFixed(2),
      totalHours: totalHours.toFixed(2),
      allocationMethod: "hours_per_day",
      methodValue: hoursPerDay.toFixed(2),
      role,
      isSoftAllocation: false,
      source: "auto",
    } as any).returning();
    await logAudit({
      entityType: "allocation",
      entityId: created.id,
      action: "created",
      description: `Auto-allocated user ${uid} to project "${project.name}" via task "${task.name}" (${hoursPerDay.toFixed(2)}h/day)`,
    });
  }
}

router.get("/tasks", async (req, res): Promise<void> => {
  const role = (req.headers["x-user-role"] as string) ?? "Viewer";
  const qp = ListTasksQueryParams.safeParse(req.query);
  const conditions = [];
  if (qp.success && qp.data.projectId) conditions.push(eq(tasksTable.projectId, qp.data.projectId));
  if (qp.success && qp.data.status) conditions.push(eq(tasksTable.status, qp.data.status));
  const rows = conditions.length
    ? await db.select().from(tasksTable).where(and(...conditions)).orderBy(asc(tasksTable.sortOrder), asc(tasksTable.id))
    : await db.select().from(tasksTable).orderBy(asc(tasksTable.sortOrder), asc(tasksTable.id));
  const actualMap = await getActualHoursMap(rows.map(r => r.id));
  const mapped = rows.map(t => {
    const task = mapTask(t, actualMap);
    if (!canReadPrivateNotes(role)) task.privateNotes = null;
    return task;
  });
  res.json(ListTasksResponse.parse(mapped));
});

router.post("/tasks", requirePM, async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const sd = (parsed.data as any).startDate;
  const dd = (parsed.data as any).dueDate;
  if (sd && dd && new Date(dd) < new Date(sd)) {
    res.status(400).json({ error: "dueDate must be on or after startDate" });
    return;
  }
  const assigneeIds = parsed.data.assigneeIds ?? [];
  // Hours model: accept plannedHours/estimateHours; default estimate=planned;
  // also persist effort=plannedHours for backward compatibility.
  const body = req.body ?? {};
  const insertValues: any = { ...parsed.data as any, assigneeIds };
  const hasPlanned = body.plannedHours !== undefined && body.plannedHours !== null;
  const hasEstimate = body.estimateHours !== undefined && body.estimateHours !== null;
  if (hasPlanned) {
    const planned = Number(body.plannedHours) || 0;
    insertValues.plannedHours = String(planned);
    insertValues.effort = String(planned);
    insertValues.estimateHours = String(hasEstimate ? Number(body.estimateHours) || 0 : planned);
  } else if (hasEstimate) {
    insertValues.estimateHours = String(Number(body.estimateHours) || 0);
  } else if (insertValues.effort !== undefined) {
    // Back-compat: if only effort was sent, mirror it into plannedHours/estimateHours.
    const planned = Number(insertValues.effort) || 0;
    insertValues.plannedHours = String(planned);
    insertValues.estimateHours = String(planned);
  }
  const [row] = await db.insert(tasksTable).values(insertValues).returning();
  await logAudit({ entityType: "task", entityId: row.id, action: "created", description: `Task "${row.name}" created` });

  // Auto-allocate hook on initial creation: every assignee is "newly assigned".
  try {
    await runAutoAllocateHook({ task: row, newlyAssignedIds: assigneeIds });
  } catch (err) {
    console.error("Auto-allocate from task creation failed:", err);
  }

  res.status(201).json(GetTaskResponse.parse(mapTask(row)));
});

// Bulk reorder: update sortOrder + parentTaskId for many tasks atomically.
// Used by the drag-and-drop reorder UI.
router.patch("/tasks/reorder", requirePM, async (req, res): Promise<void> => {
  const updates = (req.body?.updates ?? []) as Array<{ id: number; sortOrder: number; parentTaskId: number | null }>;
  if (!Array.isArray(updates) || updates.length === 0) {
    res.status(400).json({ error: "updates must be a non-empty array" });
    return;
  }
  // Type-validate every entry up-front so an invalid payload aborts before any write.
  for (const u of updates) {
    if (typeof u?.id !== "number" || typeof u?.sortOrder !== "number") {
      res.status(400).json({ error: "each update needs numeric id and sortOrder" });
      return;
    }
    if (u.parentTaskId !== null && typeof u.parentTaskId !== "number") {
      res.status(400).json({ error: "parentTaskId must be a number or null" });
      return;
    }
  }

  // ── Structural validation (Phase 4 hardening) ─────────────────────────────
  // Fetch every task referenced by id OR parentTaskId so we can verify
  // existence, single-project scope, and absence of cycles before mutating.
  const ids = updates.map((u) => u.id);
  const parentIds = updates
    .map((u) => u.parentTaskId)
    .filter((p): p is number => p != null);
  const referencedIds = Array.from(new Set([...ids, ...parentIds]));

  const referenced = await db
    .select()
    .from(tasksTable)
    .where(inArray(tasksTable.id, referencedIds));
  const refMap = new Map(referenced.map((t) => [t.id, t]));

  for (const id of ids) {
    if (!refMap.has(id)) {
      res.status(400).json({ error: `Task ${id} not found` });
      return;
    }
  }
  for (const pid of parentIds) {
    if (!refMap.has(pid)) {
      res.status(400).json({ error: `Parent task ${pid} not found` });
      return;
    }
  }

  // All updated tasks (and any new parent) must live in exactly one project.
  const projectIdSet = new Set(referenced.map((t) => t.projectId));
  if (projectIdSet.size !== 1) {
    res.status(400).json({ error: "All updated tasks and parents must belong to the same project" });
    return;
  }
  const projectId = [...projectIdSet][0]!;

  // Pull the full project task graph so cycle detection can walk through
  // ancestors that aren't in the update set.
  const projectTasks = await db
    .select({ id: tasksTable.id, parentTaskId: tasksTable.parentTaskId })
    .from(tasksTable)
    .where(eq(tasksTable.projectId, projectId));
  const newParentMap = new Map<number, number | null>(
    projectTasks.map((t) => [t.id, t.parentTaskId ?? null])
  );
  for (const u of updates) newParentMap.set(u.id, u.parentTaskId);

  // Cycle prevention: walk the would-be ancestor chain of every updated task.
  for (const u of updates) {
    let cur: number | null = u.parentTaskId;
    const seen = new Set<number>();
    while (cur != null) {
      if (cur === u.id) {
        res.status(400).json({ error: `Cycle detected: task ${u.id} cannot be its own ancestor` });
        return;
      }
      if (seen.has(cur)) break; // unrelated pre-existing cycle, abort the walk
      seen.add(cur);
      cur = newParentMap.get(cur) ?? null;
    }
  }

  const updated = await db.transaction(async (tx) => {
    let count = 0;
    for (const u of updates) {
      const result = await tx.update(tasksTable)
        .set({ sortOrder: u.sortOrder, parentTaskId: u.parentTaskId, updatedAt: new Date() })
        .where(eq(tasksTable.id, u.id))
        .returning({ id: tasksTable.id });
      count += result.length;
    }
    return count;
  });
  await logAudit({
    entityType: "task",
    entityId: 0,
    action: "reordered",
    description: `Bulk reorder applied to ${updated} task(s) in project ${projectId}`,
  });
  res.json({ updated });
});

router.get("/tasks/:id", async (req, res): Promise<void> => {
  const role = (req.headers["x-user-role"] as string) ?? "Viewer";
  const params = GetTaskParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Task not found" }); return; }
  const task = mapTask(row);
  if (!canReadPrivateNotes(role)) task.privateNotes = null;
  res.json(GetTaskResponse.parse(task));
});

router.patch("/tasks/:id", requirePM, async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  // Load existing task for status transition checks
  const [existing] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Task not found" }); return; }

  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const merged = { ...existing, ...(parsed.data as any) };
  if (merged.startDate && merged.dueDate && new Date(merged.dueDate) < new Date(merged.startDate)) {
    res.status(400).json({ error: "dueDate must be on or after startDate" });
    return;
  }

  const updates: any = { ...parsed.data };
  const body = req.body ?? {};
  // Hours model: accept plannedHours/estimateHours pass-through; mirror planned↔effort.
  if (body.plannedHours !== undefined && body.plannedHours !== null) {
    const planned = Number(body.plannedHours) || 0;
    updates.plannedHours = String(planned);
    updates.effort = String(planned);
  }
  if (body.estimateHours !== undefined && body.estimateHours !== null) {
    updates.estimateHours = String(Number(body.estimateHours) || 0);
  }
  // Back-compat: if a legacy client only sends `effort` (no plannedHours/estimateHours),
  // mirror it into both new fields so the new hours model stays in sync.
  if (
    body.plannedHours === undefined &&
    body.estimateHours === undefined &&
    updates.effort !== undefined
  ) {
    const planned = Number(updates.effort) || 0;
    updates.plannedHours = String(planned);
    updates.estimateHours = String(planned);
  }

  const [row] = await db.update(tasksTable).set(updates).where(eq(tasksTable.id, params.data.id)).returning();

  // Audit status changes
  if (parsed.data.status && parsed.data.status !== existing.status) {
    await logAudit({
      entityType: "task",
      entityId: row.id,
      action: "status_changed",
      previousValue: { status: existing.status },
      newValue: { status: row.status },
      description: `Task "${row.name}" moved from ${existing.status} to ${row.status}`,
    });
  }

  // Milestone-triggered invoice: Payment milestone completed → create draft invoice
  const completedStatuses = ["Completed", "Done"];
  const wasNotCompleted = !completedStatuses.includes(existing.status ?? "");
  const isNowCompleted = completedStatuses.includes(row.status ?? "");

  if (wasNotCompleted && isNowCompleted && row.isMilestone) {
    const milestoneType = (row as any).milestoneType ?? "";
    if (typeof milestoneType === "string" && milestoneType.toLowerCase().includes("payment")) {
      try {
        const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, row.projectId));
        if (project) {
          const allInvoices = await db.select().from(invoicesTable);
          const invoiceId = `INV-${String(allInvoices.length + 1).padStart(4, "0")}`;
          const [newInvoice] = await db.insert(invoicesTable).values({
            id: invoiceId,
            projectId: project.id,
            accountId: project.accountId,
            status: "Draft",
            issueDate: new Date().toISOString().slice(0, 10),
            dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
            total: String(project.budget ?? 0),
            notes: `Auto-generated from milestone: ${row.name}`,
          }).returning();
          await logAudit({
            entityType: "invoice",
            entityId: newInvoice.id,
            action: "created",
            description: `Draft invoice ${invoiceId} created from milestone task "${row.name}"`,
          });
        }
      } catch (err) {
        // Non-blocking: invoice creation failure should not fail the task update
        console.error("Milestone invoice creation failed:", err);
      }
    }
  }

  // Milestone-triggered CSAT survey: any milestone completed with csat_enabled → create survey + notify
  if (wasNotCompleted && isNowCompleted && row.isMilestone && (row as any).csatEnabled !== false) {
    try {
      // Check no survey already exists for this task
      const existing = await db.select().from(csatSurveysTable).where(eq(csatSurveysTable.milestoneTaskId, row.id));
      if (existing.length === 0) {
        // Find project customer champion: first allocation on project
        const allocs = await db.select().from(allocationsTable).where(eq(allocationsTable.projectId, row.projectId));
        const recipientId = allocs[0]?.userId ?? null;

        const token = crypto.randomUUID();
        const [survey] = await db.insert(csatSurveysTable).values({
          milestoneTaskId: row.id,
          projectId: row.projectId,
          recipientUserId: recipientId,
          token,
        }).returning();

        // Create in-app notification for recipient
        if (recipientId) {
          await db.insert(notificationsTable).values({
            type: "csat_survey",
            message: `You have a satisfaction survey for milestone "${row.name}"`,
            userId: recipientId,
            projectId: row.projectId,
            entityType: "csat_survey",
            entityId: String(survey.id),
          });
        }
      }
    } catch (err) {
      console.error("CSAT survey creation failed:", err);
    }
  }

  // Auto-allocate hook: if project.autoAllocate is true and assigneeIds changed,
  // create a hard, source='auto' allocation for each newly-assigned user with
  // hours_per_day = task.effort / working_days(start, end).
  try {
    if (parsed.data.assigneeIds !== undefined) {
      const prevSet = new Set((existing.assigneeIds ?? []) as number[]);
      const nextIds = (row.assigneeIds ?? []) as number[];
      const newlyAssigned = nextIds.filter(id => !prevSet.has(id));
      await runAutoAllocateHook({ task: row, newlyAssignedIds: newlyAssigned });
    }
  } catch (err) {
    console.error("Auto-allocate from task assignment failed:", err);
  }

  res.json(UpdateTaskResponse.parse(mapTask(row)));
});

router.delete("/tasks/:id", requirePM, async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [existing] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  await db.delete(tasksTable).where(eq(tasksTable.id, params.data.id));
  if (existing) {
    await logAudit({ entityType: "task", entityId: params.data.id, action: "deleted", description: `Task "${existing.name}" deleted` });
  }
  res.sendStatus(204);
});

export default router;
