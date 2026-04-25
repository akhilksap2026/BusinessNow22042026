import { Router, type IRouter } from "express";
import {
  db,
  projectTemplatesTable,
  templatePhasesTable,
  templateTasksTable,
  templateAllocationsTable,
  projectsTable,
  tasksTable,
  allocationsTable,
  placeholdersTable,
  usersTable,
} from "@workspace/db";
import { eq, asc, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin, requirePM } from "../middleware/rbac";

const router: IRouter = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addCalendarDays(base: string, days: number): string {
  const d = new Date(base + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function mapTemplate(t: typeof projectTemplatesTable.$inferSelect) {
  return {
    ...t,
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt,
  };
}
function mapPhase(p: typeof templatePhasesTable.$inferSelect) {
  return {
    ...p,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
  };
}
function mapTask(t: typeof templateTasksTable.$inferSelect) {
  return {
    ...t,
    effort: Number(t.effort),
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt,
  };
}
function mapAllocation(a: typeof templateAllocationsTable.$inferSelect) {
  return {
    ...a,
    hoursPerDay: Number(a.hoursPerDay),
    methodValue: a.methodValue === null ? null : Number(a.methodValue),
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
    updatedAt: a.updatedAt instanceof Date ? a.updatedAt.toISOString() : a.updatedAt,
  };
}

async function getTemplateWithPhases(templateId: number) {
  const [template] = await db
    .select()
    .from(projectTemplatesTable)
    .where(eq(projectTemplatesTable.id, templateId));
  if (!template) return null;
  const phases = await db
    .select()
    .from(templatePhasesTable)
    .where(eq(templatePhasesTable.templateId, templateId))
    .orderBy(asc(templatePhasesTable.order));
  const tasks = await db
    .select()
    .from(templateTasksTable)
    .where(eq(templateTasksTable.templateId, templateId))
    .orderBy(asc(templateTasksTable.order));
  const allocations = await db
    .select()
    .from(templateAllocationsTable)
    .where(eq(templateAllocationsTable.templateId, templateId))
    .orderBy(asc(templateAllocationsTable.relativeStartDay));
  return {
    ...mapTemplate(template),
    phases: phases.map(p => ({
      ...mapPhase(p),
      tasks: tasks.filter(t => t.templatePhaseId === p.id).map(mapTask),
    })),
    allocations: allocations.map(mapAllocation),
  };
}

// Compute totalHours from hoursPerDay × workingDays in [relativeStartDay, relativeEndDay].
// Treats every relative day as a working day (templates are calendar-agnostic).
function computeTemplateAllocationTotals(input: { relativeStartDay: number; relativeEndDay: number; hoursPerDay: number }) {
  const days = Math.max(1, input.relativeEndDay - input.relativeStartDay + 1);
  const total = input.hoursPerDay * days;
  return { days, totalHours: Math.round(total * 100) / 100 };
}

function validateTemplateAllocation(body: any): string | null {
  const hasUser = body.userId !== undefined && body.userId !== null;
  const hasPlaceholder = body.placeholderId !== undefined && body.placeholderId !== null;
  if (hasUser && hasPlaceholder) return "Provide exactly one of userId or placeholderId";
  if (!hasUser && !hasPlaceholder) return "Either userId or placeholderId is required";
  if (!body.role || typeof body.role !== "string" || !body.role.trim()) return "role is required";
  if (typeof body.relativeStartDay !== "number" || !Number.isInteger(body.relativeStartDay) || body.relativeStartDay < 1) return "relativeStartDay must be an integer ≥ 1";
  if (typeof body.relativeEndDay !== "number" || !Number.isInteger(body.relativeEndDay) || body.relativeEndDay < body.relativeStartDay) return "relativeEndDay must be an integer ≥ relativeStartDay";
  if (typeof body.hoursPerDay !== "number" || body.hoursPerDay <= 0) return "hoursPerDay must be > 0";
  return null;
}

// ─── Templates CRUD ──────────────────────────────────────────────────────────

router.get("/project-templates", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(projectTemplatesTable)
    .orderBy(projectTemplatesTable.name);
  const results = await Promise.all(rows.map(t => getTemplateWithPhases(t.id)));
  res.json(results.filter(Boolean));
});

const TemplateBodySchema = z.object({
  name: z.string().min(1, "name is required"),
  description: z.string().nullish(),
  billingType: z.string().nullish(),
  totalDurationDays: z.number().int().min(1).nullish(),
  accountId: z.number().int().positive().nullish(),
  createdByUserId: z.number().int().positive().nullish(),
  autoAllocate: z.boolean().nullish(),
});

const TemplatePhaseBodySchema = z.object({
  name: z.string().min(1, "name is required"),
  relativeStartOffset: z.number().int().min(0).nullish(),
  relativeEndOffset: z.number().int().min(0).nullish(),
  order: z.number().int().min(0).nullish(),
});
const TemplatePhasePatchSchema = TemplatePhaseBodySchema.partial();
function checkPhaseDateOrder(d: { relativeStartOffset?: number | null; relativeEndOffset?: number | null }): string | null {
  if (d.relativeStartOffset != null && d.relativeEndOffset != null && d.relativeEndOffset < d.relativeStartOffset) {
    return "relativeEndOffset must be >= relativeStartOffset";
  }
  return null;
}

const TemplateTaskBodySchema = z.object({
  name: z.string().min(1, "name is required"),
  parentTaskId: z.union([z.number().int().positive(), z.null()]).nullish(),
  relativeDueDateOffset: z.number().int().min(0).nullish(),
  effort: z.union([z.number().min(0), z.string()]).nullish(),
  billableDefault: z.boolean().nullish(),
  categoryId: z.union([z.number().int().positive(), z.null()]).nullish(),
  priority: z.string().nullish(),
  assigneeRolePlaceholder: z.string().nullish(),
  order: z.number().int().min(0).nullish(),
});

router.post("/project-templates", requirePM, async (req, res): Promise<void> => {
  const parsed = TemplateBodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { name, description, billingType, totalDurationDays, accountId, createdByUserId, autoAllocate } = parsed.data;
  const [row] = await db
    .insert(projectTemplatesTable)
    .values({
      name,
      description: description ?? null,
      billingType: billingType ?? "Fixed Fee",
      totalDurationDays: totalDurationDays ?? 30,
      accountId: accountId ?? null,
      createdByUserId: createdByUserId ?? null,
      isArchived: false,
      autoAllocate: autoAllocate ?? false,
    })
    .returning();
  res.status(201).json(await getTemplateWithPhases(row.id));
});

router.get("/project-templates/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const result = await getTemplateWithPhases(id);
  if (!result) { res.status(404).json({ error: "Not found" }); return; }
  res.json(result);
});

router.put("/project-templates/:id", requirePM, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const parsed = TemplateBodySchema.partial().extend({ isArchived: z.boolean().optional() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { name, description, billingType, totalDurationDays, accountId, isArchived, autoAllocate } = parsed.data;
  const [row] = await db
    .update(projectTemplatesTable)
    .set({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(billingType !== undefined && { billingType }),
      ...(totalDurationDays !== undefined && { totalDurationDays }),
      ...(accountId !== undefined && { accountId }),
      ...(isArchived !== undefined && { isArchived }),
      ...(autoAllocate !== undefined && { autoAllocate }),
      updatedAt: new Date(),
    } as any)
    .where(eq(projectTemplatesTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await getTemplateWithPhases(row.id));
});

router.delete("/project-templates/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(templateAllocationsTable).where(eq(templateAllocationsTable.templateId, id));
  await db.delete(templateTasksTable).where(eq(templateTasksTable.templateId, id));
  await db.delete(templatePhasesTable).where(eq(templatePhasesTable.templateId, id));
  await db.delete(projectTemplatesTable).where(eq(projectTemplatesTable.id, id));
  res.status(204).end();
});

// ─── Template Phases ─────────────────────────────────────────────────────────

router.get("/project-templates/:id/phases", async (req, res): Promise<void> => {
  const templateId = parseInt(req.params.id, 10);
  const phases = await db
    .select()
    .from(templatePhasesTable)
    .where(eq(templatePhasesTable.templateId, templateId))
    .orderBy(asc(templatePhasesTable.order));
  res.json(phases.map(mapPhase));
});

router.post("/project-templates/:id/phases", requirePM, async (req, res): Promise<void> => {
  const templateId = parseInt(req.params.id, 10);
  const parsed = TemplatePhaseBodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const phaseErr = checkPhaseDateOrder(parsed.data);
  if (phaseErr) { res.status(400).json({ error: phaseErr }); return; }
  const { name, relativeStartOffset, relativeEndOffset, order } = parsed.data;
  const [row] = await db
    .insert(templatePhasesTable)
    .values({
      templateId,
      name,
      relativeStartOffset: relativeStartOffset ?? 0,
      relativeEndOffset: relativeEndOffset ?? 7,
      order: order ?? 0,
    })
    .returning();
  res.status(201).json(mapPhase(row));
});

router.put("/template-phases/:phaseId", requirePM, async (req, res): Promise<void> => {
  const phaseId = parseInt(req.params.phaseId, 10);
  const parsed = TemplatePhasePatchSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const phaseErr = checkPhaseDateOrder(parsed.data);
  if (phaseErr) { res.status(400).json({ error: phaseErr }); return; }
  const { name, relativeStartOffset, relativeEndOffset, order } = parsed.data;
  const [row] = await db
    .update(templatePhasesTable)
    .set({
      ...(name !== undefined && { name }),
      ...(relativeStartOffset !== undefined && { relativeStartOffset }),
      ...(relativeEndOffset !== undefined && { relativeEndOffset }),
      ...(order !== undefined && { order }),
      updatedAt: new Date(),
    } as any)
    .where(eq(templatePhasesTable.id, phaseId))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapPhase(row));
});

router.delete("/template-phases/:phaseId", requirePM, async (req, res): Promise<void> => {
  const phaseId = parseInt(req.params.phaseId, 10);
  await db.delete(templateTasksTable).where(eq(templateTasksTable.templatePhaseId, phaseId));
  // Detach allocations from the deleted phase rather than dropping them — the
  // allocation itself is still meaningful (placeholder/user + day range), only the
  // phase association is lost.
  await db
    .update(templateAllocationsTable)
    .set({ templatePhaseId: null })
    .where(eq(templateAllocationsTable.templatePhaseId, phaseId));
  await db.delete(templatePhasesTable).where(eq(templatePhasesTable.id, phaseId));
  res.status(204).end();
});

// ─── Template Tasks ───────────────────────────────────────────────────────────

router.get("/template-phases/:phaseId/tasks", async (req, res): Promise<void> => {
  const phaseId = parseInt(req.params.phaseId, 10);
  const tasks = await db
    .select()
    .from(templateTasksTable)
    .where(eq(templateTasksTable.templatePhaseId, phaseId))
    .orderBy(asc(templateTasksTable.order));
  res.json(tasks.map(mapTask));
});

router.post("/template-phases/:phaseId/tasks", requirePM, async (req, res): Promise<void> => {
  const phaseId = parseInt(req.params.phaseId, 10);
  const [phase] = await db
    .select()
    .from(templatePhasesTable)
    .where(eq(templatePhasesTable.id, phaseId));
  if (!phase) { res.status(404).json({ error: "Phase not found" }); return; }
  const parsed = TemplateTaskBodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { name, parentTaskId, relativeDueDateOffset, effort, billableDefault, categoryId, priority, assigneeRolePlaceholder, order } = parsed.data;

  // Validate parent (must be in same template if provided).
  if (parentTaskId != null) {
    const [parent] = await db
      .select()
      .from(templateTasksTable)
      .where(eq(templateTasksTable.id, parentTaskId));
    if (!parent || parent.templateId !== phase.templateId) {
      res.status(400).json({ error: "parentTaskId must refer to a task in the same template" });
      return;
    }
  }

  const [row] = await db
    .insert(templateTasksTable)
    .values({
      templatePhaseId: phaseId,
      templateId: phase.templateId,
      parentTaskId: parentTaskId ?? null,
      name,
      relativeDueDateOffset: relativeDueDateOffset ?? phase.relativeEndOffset,
      effort: String(effort ?? 0),
      billableDefault: billableDefault ?? true,
      categoryId: categoryId === null || categoryId === undefined ? null : Number(categoryId),
      priority: priority ?? "Medium",
      assigneeRolePlaceholder: assigneeRolePlaceholder ?? null,
      order: order ?? 0,
    })
    .returning();
  res.status(201).json(mapTask(row));
});

router.put("/template-tasks/:taskId", requirePM, async (req, res): Promise<void> => {
  const taskId = parseInt(req.params.taskId, 10);
  const parsed = TemplateTaskBodySchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { name, parentTaskId, relativeDueDateOffset, effort, billableDefault, categoryId, priority, assigneeRolePlaceholder, order } = parsed.data;

  // Validate parent if changing: same template, not self, no cycle.
  if (parentTaskId !== undefined && parentTaskId !== null) {
    if (parentTaskId === taskId) {
      res.status(400).json({ error: "parentTaskId cannot be the task itself" });
      return;
    }
    const [self] = await db.select().from(templateTasksTable).where(eq(templateTasksTable.id, taskId));
    if (!self) { res.status(404).json({ error: "Not found" }); return; }
    const [parent] = await db.select().from(templateTasksTable).where(eq(templateTasksTable.id, parentTaskId));
    if (!parent || parent.templateId !== self.templateId) {
      res.status(400).json({ error: "parentTaskId must refer to a task in the same template" });
      return;
    }
    // Cycle check: walk up parent chain.
    let cursor: number | null = parent.parentTaskId ?? null;
    const seen = new Set<number>([taskId, parent.id]);
    while (cursor !== null) {
      if (seen.has(cursor)) {
        res.status(400).json({ error: "Cycle detected in template task hierarchy" });
        return;
      }
      seen.add(cursor);
      const [next] = await db.select().from(templateTasksTable).where(eq(templateTasksTable.id, cursor));
      if (!next) break;
      cursor = next.parentTaskId ?? null;
    }
  }

  const [row] = await db
    .update(templateTasksTable)
    .set({
      ...(name !== undefined && { name }),
      ...(parentTaskId !== undefined && { parentTaskId }),
      ...(relativeDueDateOffset !== undefined && { relativeDueDateOffset }),
      ...(effort !== undefined && { effort: String(effort) }),
      ...(billableDefault !== undefined && { billableDefault }),
      ...(categoryId !== undefined && { categoryId: categoryId === null ? null : Number(categoryId) }),
      ...(priority !== undefined && { priority }),
      ...(assigneeRolePlaceholder !== undefined && { assigneeRolePlaceholder }),
      ...(order !== undefined && { order }),
      updatedAt: new Date(),
    } as any)
    .where(eq(templateTasksTable.id, taskId))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapTask(row));
});

router.delete("/template-tasks/:taskId", requirePM, async (req, res): Promise<void> => {
  const taskId = parseInt(req.params.taskId, 10);
  await db.delete(templateTasksTable).where(eq(templateTasksTable.id, taskId));
  res.status(204).end();
});

// ─── Template Allocations ────────────────────────────────────────────────────

router.get("/project-templates/:id/allocations", async (req, res): Promise<void> => {
  const templateId = parseInt(req.params.id, 10);
  const rows = await db
    .select()
    .from(templateAllocationsTable)
    .where(eq(templateAllocationsTable.templateId, templateId))
    .orderBy(asc(templateAllocationsTable.relativeStartDay));
  res.json(rows.map(mapAllocation));
});

router.post("/project-templates/:id/allocations", requirePM, async (req, res): Promise<void> => {
  const templateId = parseInt(req.params.id, 10);
  const [template] = await db
    .select()
    .from(projectTemplatesTable)
    .where(eq(projectTemplatesTable.id, templateId));
  if (!template) { res.status(404).json({ error: "Template not found" }); return; }

  const body = {
    placeholderId: req.body.placeholderId ?? null,
    userId: req.body.userId ?? null,
    role: req.body.role,
    relativeStartDay: req.body.relativeStartDay,
    relativeEndDay: req.body.relativeEndDay,
    hoursPerDay: req.body.hoursPerDay,
    allocationMethod: req.body.allocationMethod ?? "hours_per_day",
    methodValue: req.body.methodValue ?? req.body.hoursPerDay,
    isSoftAllocation: req.body.isSoftAllocation === true,
    templatePhaseId: req.body.templatePhaseId ?? null,
  };
  const err = validateTemplateAllocation(body);
  if (err) { res.status(400).json({ error: err }); return; }

  // Verify referenced placeholder/user exists
  if (body.placeholderId) {
    const [p] = await db.select().from(placeholdersTable).where(eq(placeholdersTable.id, body.placeholderId));
    if (!p) { res.status(400).json({ error: `Placeholder ${body.placeholderId} not found` }); return; }
  }
  if (body.userId) {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, body.userId));
    if (!u) { res.status(400).json({ error: `User ${body.userId} not found` }); return; }
  }

  const [row] = await db
    .insert(templateAllocationsTable)
    .values({
      templateId,
      templatePhaseId: body.templatePhaseId,
      placeholderId: body.placeholderId,
      userId: body.userId,
      role: body.role,
      relativeStartDay: body.relativeStartDay,
      relativeEndDay: body.relativeEndDay,
      hoursPerDay: String(body.hoursPerDay),
      allocationMethod: body.allocationMethod,
      methodValue: String(body.methodValue),
      isSoftAllocation: body.isSoftAllocation,
    })
    .returning();
  res.status(201).json(mapAllocation(row));
});

router.put("/template-allocations/:allocId", requirePM, async (req, res): Promise<void> => {
  const allocId = parseInt(req.params.allocId, 10);
  const [existing] = await db
    .select()
    .from(templateAllocationsTable)
    .where(eq(templateAllocationsTable.id, allocId));
  if (!existing) { res.status(404).json({ error: "Allocation not found" }); return; }

  const merged = {
    placeholderId: req.body.placeholderId !== undefined ? req.body.placeholderId : existing.placeholderId,
    userId: req.body.userId !== undefined ? req.body.userId : existing.userId,
    role: req.body.role ?? existing.role,
    relativeStartDay: req.body.relativeStartDay ?? existing.relativeStartDay,
    relativeEndDay: req.body.relativeEndDay ?? existing.relativeEndDay,
    hoursPerDay: req.body.hoursPerDay ?? Number(existing.hoursPerDay),
  };
  const err = validateTemplateAllocation(merged);
  if (err) { res.status(400).json({ error: err }); return; }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (req.body.placeholderId !== undefined) updateData.placeholderId = req.body.placeholderId;
  if (req.body.userId !== undefined) updateData.userId = req.body.userId;
  if (req.body.role !== undefined) updateData.role = req.body.role;
  if (req.body.relativeStartDay !== undefined) updateData.relativeStartDay = req.body.relativeStartDay;
  if (req.body.relativeEndDay !== undefined) updateData.relativeEndDay = req.body.relativeEndDay;
  if (req.body.hoursPerDay !== undefined) {
    updateData.hoursPerDay = String(req.body.hoursPerDay);
    updateData.methodValue = String(req.body.hoursPerDay);
  }
  if (req.body.methodValue !== undefined) updateData.methodValue = String(req.body.methodValue);
  if (req.body.allocationMethod !== undefined) updateData.allocationMethod = req.body.allocationMethod;
  if (req.body.isSoftAllocation !== undefined) updateData.isSoftAllocation = req.body.isSoftAllocation === true;
  if (req.body.templatePhaseId !== undefined) updateData.templatePhaseId = req.body.templatePhaseId;

  const [row] = await db
    .update(templateAllocationsTable)
    .set(updateData)
    .where(eq(templateAllocationsTable.id, allocId))
    .returning();
  res.json(mapAllocation(row));
});

router.delete("/template-allocations/:allocId", requirePM, async (req, res): Promise<void> => {
  const allocId = parseInt(req.params.allocId, 10);
  await db.delete(templateAllocationsTable).where(eq(templateAllocationsTable.id, allocId));
  res.status(204).end();
});

// Aggregate summary: per-role totals + grand totals
router.get("/project-templates/:id/allocations/summary", async (req, res): Promise<void> => {
  const templateId = parseInt(req.params.id, 10);
  const rows = await db
    .select()
    .from(templateAllocationsTable)
    .where(eq(templateAllocationsTable.templateId, templateId));

  let grandHours = 0;
  let grandPersonDays = 0;
  const byRole = new Map<string, { role: string; allocations: number; totalHours: number; personDays: number }>();
  for (const a of rows) {
    const hpd = Number(a.hoursPerDay);
    const { days, totalHours } = computeTemplateAllocationTotals({
      relativeStartDay: a.relativeStartDay,
      relativeEndDay: a.relativeEndDay,
      hoursPerDay: hpd,
    });
    grandHours += totalHours;
    grandPersonDays += days;
    const cur = byRole.get(a.role) ?? { role: a.role, allocations: 0, totalHours: 0, personDays: 0 };
    cur.allocations += 1;
    cur.totalHours = Math.round((cur.totalHours + totalHours) * 100) / 100;
    cur.personDays += days;
    byRole.set(a.role, cur);
  }
  res.json({
    templateId,
    totalAllocations: rows.length,
    totalHours: Math.round(grandHours * 100) / 100,
    totalPersonDays: grandPersonDays,
    byRole: Array.from(byRole.values()).sort((a, b) => b.totalHours - a.totalHours),
  });
});

// ─── Apply template to existing project ──────────────────────────────────────
// Supports multi-template composition: call multiple times on same project.

router.post("/project-templates/:id/apply", requirePM, async (req, res): Promise<void> => {
  const templateId = parseInt(req.params.id, 10);
  const { projectId, startDate } = req.body;
  if (!projectId || !startDate) {
    res.status(400).json({ error: "projectId and startDate are required" });
    return;
  }

  const [template] = await db
    .select()
    .from(projectTemplatesTable)
    .where(eq(projectTemplatesTable.id, templateId));
  if (!template) { res.status(404).json({ error: "Template not found" }); return; }
  if (template.isArchived) { res.status(400).json({ error: "Template is archived" }); return; }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const templatePhases = await db
    .select()
    .from(templatePhasesTable)
    .where(eq(templatePhasesTable.templateId, templateId))
    .orderBy(asc(templatePhasesTable.order));

  const templateTasks = await db
    .select()
    .from(templateTasksTable)
    .where(eq(templateTasksTable.templateId, templateId))
    .orderBy(asc(templateTasksTable.order));

  const createdPhaseTasks: typeof tasksTable.$inferSelect[] = [];
  const createdTasks: typeof tasksTable.$inferSelect[] = [];

  for (const tPhase of templatePhases) {
    const phaseStart = addCalendarDays(startDate, tPhase.relativeStartOffset);
    const phaseEnd = addCalendarDays(startDate, tPhase.relativeEndOffset);

    const [phaseTask] = await db
      .insert(tasksTable)
      .values({
        projectId,
        parentTaskId: null,
        isPhase: true,
        name: tPhase.name,
        status: "Not Started",
        priority: "Medium",
        effort: "0",
        billable: true,
        assigneeIds: [],
        startDate: phaseStart,
        dueDate: phaseEnd,
        isMilestone: false,
        fromTemplate: true,
        appliedTemplateId: templateId,
      })
      .returning();
    createdPhaseTasks.push(phaseTask);

    const phaseTasks = templateTasks.filter(t => t.templatePhaseId === tPhase.id);
    for (const tTask of phaseTasks) {
      const taskDue = addCalendarDays(startDate, tTask.relativeDueDateOffset);
      const [task] = await db
        .insert(tasksTable)
        .values({
          projectId,
          parentTaskId: phaseTask.id,
          name: tTask.name,
          status: "Not Started",
          priority: tTask.priority,
          effort: String(tTask.effort),
          billable: tTask.billableDefault,
          categoryId: tTask.categoryId ?? null,
          assigneeIds: [],
          startDate: phaseStart,
          dueDate: taskDue,
          isMilestone: false,
          fromTemplate: true,
          appliedTemplateId: templateId,
        })
        .returning();
      createdTasks.push(task);
    }
  }

  res.status(201).json({
    templateId,
    templateName: template.name,
    projectId,
    startDate,
    phasesCreated: createdPhaseTasks.length,
    tasksCreated: createdTasks.length,
  });
});

// ─── Create project from template (new project) ───────────────────────────────

router.post("/projects/from-template", requirePM, async (req, res): Promise<void> => {
  const { templateId, name, accountId, ownerId, startDate, budget } = req.body;
  if (!templateId || !name || !accountId || !ownerId || !startDate) {
    res.status(400).json({ error: "templateId, name, accountId, ownerId, startDate are required" });
    return;
  }

  const [template] = await db
    .select()
    .from(projectTemplatesTable)
    .where(eq(projectTemplatesTable.id, templateId));
  if (!template) { res.status(404).json({ error: "Template not found" }); return; }
  if (template.isArchived) { res.status(400).json({ error: "Template is archived" }); return; }

  const dueDate = addCalendarDays(startDate, template.totalDurationDays);

  const [project] = await db
    .insert(projectsTable)
    .values({
      name,
      accountId,
      ownerId,
      startDate,
      dueDate,
      billingType: template.billingType,
      status: "Not Started",
      health: "On Track",
      budget: String(budget ?? 0),
      budgetedHours: "0",
      trackedHours: "0",
      completion: 0,
      templateId: template.id,
      autoAllocate: template.autoAllocate,
    })
    .returning();

  const templatePhases = await db
    .select()
    .from(templatePhasesTable)
    .where(eq(templatePhasesTable.templateId, templateId))
    .orderBy(asc(templatePhasesTable.order));

  const templateTasks = await db
    .select()
    .from(templateTasksTable)
    .where(eq(templateTasksTable.templateId, templateId))
    .orderBy(asc(templateTasksTable.order));

  for (const tPhase of templatePhases) {
    const phaseStart = addCalendarDays(startDate, tPhase.relativeStartOffset);
    const phaseEnd = addCalendarDays(startDate, tPhase.relativeEndOffset);

    const [phaseTask] = await db
      .insert(tasksTable)
      .values({
        projectId: project.id,
        parentTaskId: null,
        isPhase: true,
        name: tPhase.name,
        status: "Not Started",
        priority: "Medium",
        effort: "0",
        billable: true,
        assigneeIds: [],
        startDate: phaseStart,
        dueDate: phaseEnd,
        isMilestone: false,
        fromTemplate: true,
        appliedTemplateId: templateId,
      })
      .returning();

    const phaseTasks = templateTasks.filter(t => t.templatePhaseId === tPhase.id);
    for (const tTask of phaseTasks) {
      const taskDue = addCalendarDays(startDate, tTask.relativeDueDateOffset);
      await db.insert(tasksTable).values({
        projectId: project.id,
        parentTaskId: phaseTask.id,
        name: tTask.name,
        status: "Not Started",
        priority: tTask.priority,
        effort: String(tTask.effort),
        billable: tTask.billableDefault,
        categoryId: tTask.categoryId ?? null,
        assigneeIds: [],
        startDate: phaseStart,
        dueDate: taskDue,
        isMilestone: false,
        fromTemplate: true,
        appliedTemplateId: templateId,
      });
    }
  }

  // ── Copy template allocations → real allocations with absolute dates ──
  // Day 1 = project.startDate (relative day index is 1-based, inclusive end).
  // - Placeholder allocations: copied as-is (unfilled, ready for assignment).
  // - Named-user allocations: only copied if the user is still active (isActive=1);
  //   inactive users are skipped and reported in `warnings` (caller can re-assign manually).
  // Allocation copy is gated on the template's autoAllocate flag. When false, the
  // project starts with no allocations and the PM allocates resources manually.
  const templateAllocs = template.autoAllocate
    ? await db
        .select()
        .from(templateAllocationsTable)
        .where(eq(templateAllocationsTable.templateId, templateId))
        .orderBy(asc(templateAllocationsTable.relativeStartDay))
    : [];

  let allocationsCreated = 0;
  let allocationsSkipped = 0;
  const warnings: string[] = [];

  // Pre-fetch active status for all referenced users in one query
  const userIds = Array.from(new Set(templateAllocs.map(a => a.userId).filter((x): x is number => x !== null)));
  const userMap = new Map<number, { id: number; name: string; isActive: number }>();
  if (userIds.length > 0) {
    const us = await db.select().from(usersTable).where(inArray(usersTable.id, userIds));
    for (const u of us) userMap.set(u.id, { id: u.id, name: u.name, isActive: u.isActive });
  }

  for (const ta of templateAllocs) {
    // relativeStartDay=1 maps to project.startDate (offset 0); relativeEndDay inclusive
    const allocStart = addCalendarDays(startDate, ta.relativeStartDay - 1);
    const allocEnd = addCalendarDays(startDate, ta.relativeEndDay - 1);
    const hpd = Number(ta.hoursPerDay);
    const days = Math.max(1, ta.relativeEndDay - ta.relativeStartDay + 1);
    const totalHours = Math.round(hpd * days * 100) / 100;
    const hpw = Math.round(hpd * 5 * 100) / 100;

    if (ta.userId !== null) {
      const u = userMap.get(ta.userId);
      if (!u || u.isActive !== 1) {
        allocationsSkipped += 1;
        warnings.push(`Skipped inactive user "${u?.name ?? `#${ta.userId}`}" for role ${ta.role} (Day ${ta.relativeStartDay}–${ta.relativeEndDay}). Re-assign manually.`);
        continue;
      }
    }

    await db.insert(allocationsTable).values({
      projectId: project.id,
      userId: ta.userId,
      placeholderId: ta.placeholderId,
      placeholderRole: ta.placeholderId !== null ? ta.role : null,
      startDate: allocStart,
      endDate: allocEnd,
      hoursPerDay: String(hpd),
      hoursPerWeek: String(hpw),
      totalHours: String(totalHours),
      allocationMethod: ta.allocationMethod,
      methodValue: String(Number(ta.methodValue ?? hpd)),
      role: ta.role,
      isSoftAllocation: ta.isSoftAllocation,
    });
    allocationsCreated += 1;
  }

  res.status(201).json({
    ...project,
    budget: Number(project.budget),
    budgetedHours: Number(project.budgetedHours),
    trackedHours: Number(project.trackedHours),
    createdAt: project.createdAt instanceof Date ? project.createdAt.toISOString() : project.createdAt,
    updatedAt: project.updatedAt instanceof Date ? project.updatedAt.toISOString() : project.updatedAt,
    templateApplied: {
      templateId: template.id,
      templateName: template.name,
      autoAllocate: template.autoAllocate,
      allocationsCreated,
      allocationsSkipped,
      warnings,
    },
  });
});

// ─── Apply template as a single segment (one phase task with all template tasks nested) ──
// Body: { templateId: number, phaseName?: string }
// Creates ONE phase task on the project, then inserts all template tasks under it,
// preserving the template task hierarchy (parentTaskId chain) via a templateTaskId → realTaskId map.

router.post("/projects/:id/apply-template", requirePM, async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.id, 10);
  const { templateId, phaseName } = req.body ?? {};
  if (!templateId || typeof templateId !== "number") {
    res.status(400).json({ error: "templateId (number) is required" });
    return;
  }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [template] = await db.select().from(projectTemplatesTable).where(eq(projectTemplatesTable.id, templateId));
  if (!template) { res.status(404).json({ error: "Template not found" }); return; }
  if (template.isArchived) { res.status(400).json({ error: "Template is archived" }); return; }

  const templateTasks = await db
    .select()
    .from(templateTasksTable)
    .where(eq(templateTasksTable.templateId, templateId))
    .orderBy(asc(templateTasksTable.order));

  const baseStartDate = project.startDate ?? new Date().toISOString().slice(0, 10);
  const finalPhaseName = (typeof phaseName === "string" && phaseName.trim()) ? phaseName.trim() : template.name;

  // Determine sortOrder for the new phase task: append after existing top-level rows.
  const existingTopLevel = await db
    .select({ sortOrder: tasksTable.sortOrder })
    .from(tasksTable)
    .where(eq(tasksTable.projectId, projectId));
  const maxSort = existingTopLevel.reduce((m, r) => Math.max(m, r.sortOrder ?? 0), 0);
  const phaseSortOrder = maxSort + 10;

  // Create the single phase task.
  const phaseStart = baseStartDate;
  const phaseEnd = addCalendarDays(baseStartDate, template.totalDurationDays);
  const [phaseTask] = await db
    .insert(tasksTable)
    .values({
      projectId,
      parentTaskId: null,
      isPhase: true,
      name: finalPhaseName,
      status: "Not Started",
      priority: "Medium",
      effort: "0",
      billable: true,
      assigneeIds: [],
      startDate: phaseStart,
      dueDate: phaseEnd,
      isMilestone: false,
      fromTemplate: true,
      appliedTemplateId: templateId,
      sortOrder: phaseSortOrder,
    })
    .returning();

  // Two-pass insert preserving hierarchy via templateTaskId → realTaskId map.
  const taskIdMap = new Map<number, number>();
  let createdCount = 0;
  let nextSort = 10;

  // Pass 1: top-level template tasks (parentTaskId == null) → children of phaseTask.
  for (const tTask of templateTasks.filter(t => t.parentTaskId == null)) {
    const dueDate = addCalendarDays(baseStartDate, tTask.relativeDueDateOffset);
    const [row] = await db
      .insert(tasksTable)
      .values({
        projectId,
        parentTaskId: phaseTask.id,
        name: tTask.name,
        status: "Not Started",
        priority: tTask.priority,
        effort: String(tTask.effort),
        billable: tTask.billableDefault,
        categoryId: tTask.categoryId ?? null,
        assigneeIds: [],
        startDate: phaseStart,
        dueDate,
        isMilestone: false,
        fromTemplate: true,
        appliedTemplateId: templateId,
        sortOrder: nextSort,
      })
      .returning();
    taskIdMap.set(tTask.id, row.id);
    createdCount += 1;
    nextSort += 10;
  }

  // Pass 2+: child template tasks. Iterate until all resolvable parents are placed
  // (handles arbitrary nesting depth). Bail out if a pass makes no progress (orphans).
  let pending = templateTasks.filter(t => t.parentTaskId != null);
  let safety = 50; // guard against degenerate templates
  while (pending.length > 0 && safety-- > 0) {
    const next: typeof pending = [];
    for (const tTask of pending) {
      const realParentId = taskIdMap.get(tTask.parentTaskId!);
      if (realParentId == null) {
        next.push(tTask);
        continue;
      }
      const dueDate = addCalendarDays(baseStartDate, tTask.relativeDueDateOffset);
      const [row] = await db
        .insert(tasksTable)
        .values({
          projectId,
          parentTaskId: realParentId,
          name: tTask.name,
          status: "Not Started",
          priority: tTask.priority,
          effort: String(tTask.effort),
          billable: tTask.billableDefault,
          categoryId: tTask.categoryId ?? null,
          assigneeIds: [],
          startDate: phaseStart,
          dueDate,
          isMilestone: false,
          fromTemplate: true,
          appliedTemplateId: templateId,
          sortOrder: nextSort,
        })
        .returning();
      taskIdMap.set(tTask.id, row.id);
      createdCount += 1;
      nextSort += 10;
    }
    if (next.length === pending.length) break; // no progress → orphans
    pending = next;
  }

  res.status(201).json({
    phaseTaskId: phaseTask.id,
    phasesCreated: 1,
    tasksCreated: createdCount,
  });
});

export default router;
