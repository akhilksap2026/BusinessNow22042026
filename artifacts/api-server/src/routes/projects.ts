import { Router, type IRouter } from "express";
import { eq, and, isNull, isNotNull, inArray } from "drizzle-orm";
import { db, projectsTable, invoicesTable, allocationsTable, accountsTable, tasksTable, taskDependenciesTable } from "@workspace/db";
import { logAudit } from "../lib/audit";
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

function mapProject(p: typeof projectsTable.$inferSelect) {
  return {
    ...p,
    budget: Number(p.budget),
    trackedHours: Number(p.trackedHours),
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
  if (qp.success && qp.data.accountId) conditions.push(eq(projectsTable.accountId, qp.data.accountId));
  const rows = await db
    .select({ project: projectsTable, accountName: accountsTable.name, accountDomain: accountsTable.domain })
    .from(projectsTable)
    .leftJoin(accountsTable, eq(projectsTable.accountId, accountsTable.id))
    .where(and(...conditions));
  res.json(ListProjectsResponse.parse(rows.map(({ project, accountName, accountDomain }) => ({
    ...mapProject(project),
    companyName: accountName ?? undefined,
    companyDomain: accountDomain ?? undefined,
  }))));
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
  res.status(201).json(GetProjectResponse.parse(mapProject(row)));
});

router.get("/projects/deleted", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(projectsTable).where(isNotNull(projectsTable.deletedAt));
  res.json(rows.map(mapProject));
});

router.get("/projects/:id", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Project not found" }); return; }
  res.json(GetProjectResponse.parse(mapProject(row)));
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
  // Cross-field guard against the merged value, so PATCH-only-startDate or
  // PATCH-only-dueDate cannot create an inverted range.
  const merged = { ...existing, ...(parsed.data as any) };
  if (merged.startDate && merged.dueDate && new Date(merged.dueDate) < new Date(merged.startDate)) {
    res.status(400).json({ error: "dueDate must be on or after startDate" });
    return;
  }
  const [row] = await db.update(projectsTable).set(parsed.data as any).where(eq(projectsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Project not found" }); return; }
  await logAudit({ entityType: "project", entityId: row.id, action: "updated", description: `Project "${row.name}" updated` });
  res.json(UpdateProjectResponse.parse(mapProject(row)));
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

router.post("/projects/:id/restore", requireAdmin, async (req, res): Promise<void> => {
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
  res.json(mapProject(row));
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
  const trackedHours = Number(project.trackedHours);
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

  const rows = sortedTasks.map(t => ({
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
  }));

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

export default router;

