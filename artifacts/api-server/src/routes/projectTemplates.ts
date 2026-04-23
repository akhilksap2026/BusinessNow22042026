import { Router, type IRouter } from "express";
import {
  db,
  projectTemplatesTable,
  templatePhasesTable,
  templateTasksTable,
  projectsTable,
  phasesTable,
  tasksTable,
} from "@workspace/db";
import { eq, asc } from "drizzle-orm";
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
  return {
    ...mapTemplate(template),
    phases: phases.map(p => ({
      ...mapPhase(p),
      tasks: tasks.filter(t => t.templatePhaseId === p.id).map(mapTask),
    })),
  };
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

router.post("/project-templates", requirePM, async (req, res): Promise<void> => {
  const { name, description, billingType, totalDurationDays, accountId, createdByUserId } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
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
  const { name, description, billingType, totalDurationDays, accountId, isArchived } = req.body;
  const [row] = await db
    .update(projectTemplatesTable)
    .set({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(billingType !== undefined && { billingType }),
      ...(totalDurationDays !== undefined && { totalDurationDays }),
      ...(accountId !== undefined && { accountId }),
      ...(isArchived !== undefined && { isArchived }),
      updatedAt: new Date(),
    })
    .where(eq(projectTemplatesTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await getTemplateWithPhases(row.id));
});

router.delete("/project-templates/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
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
  const { name, relativeStartOffset, relativeEndOffset, privacyDefault, order } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const [row] = await db
    .insert(templatePhasesTable)
    .values({
      templateId,
      name,
      relativeStartOffset: relativeStartOffset ?? 0,
      relativeEndOffset: relativeEndOffset ?? 7,
      privacyDefault: privacyDefault ?? "shared",
      order: order ?? 0,
    })
    .returning();
  res.status(201).json(mapPhase(row));
});

router.put("/template-phases/:phaseId", requirePM, async (req, res): Promise<void> => {
  const phaseId = parseInt(req.params.phaseId, 10);
  const { name, relativeStartOffset, relativeEndOffset, privacyDefault, order } = req.body;
  const [row] = await db
    .update(templatePhasesTable)
    .set({
      ...(name !== undefined && { name }),
      ...(relativeStartOffset !== undefined && { relativeStartOffset }),
      ...(relativeEndOffset !== undefined && { relativeEndOffset }),
      ...(privacyDefault !== undefined && { privacyDefault }),
      ...(order !== undefined && { order }),
      updatedAt: new Date(),
    })
    .where(eq(templatePhasesTable.id, phaseId))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapPhase(row));
});

router.delete("/template-phases/:phaseId", requirePM, async (req, res): Promise<void> => {
  const phaseId = parseInt(req.params.phaseId, 10);
  await db.delete(templateTasksTable).where(eq(templateTasksTable.templatePhaseId, phaseId));
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
  const { name, relativeDueDateOffset, effort, billableDefault, priority, assigneeRolePlaceholder, order } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const [row] = await db
    .insert(templateTasksTable)
    .values({
      templatePhaseId: phaseId,
      templateId: phase.templateId,
      name,
      relativeDueDateOffset: relativeDueDateOffset ?? phase.relativeEndOffset,
      effort: String(effort ?? 0),
      billableDefault: billableDefault ?? true,
      priority: priority ?? "Medium",
      assigneeRolePlaceholder: assigneeRolePlaceholder ?? null,
      order: order ?? 0,
    })
    .returning();
  res.status(201).json(mapTask(row));
});

router.put("/template-tasks/:taskId", requirePM, async (req, res): Promise<void> => {
  const taskId = parseInt(req.params.taskId, 10);
  const { name, relativeDueDateOffset, effort, billableDefault, priority, assigneeRolePlaceholder, order } = req.body;
  const [row] = await db
    .update(templateTasksTable)
    .set({
      ...(name !== undefined && { name }),
      ...(relativeDueDateOffset !== undefined && { relativeDueDateOffset }),
      ...(effort !== undefined && { effort: String(effort) }),
      ...(billableDefault !== undefined && { billableDefault }),
      ...(priority !== undefined && { priority }),
      ...(assigneeRolePlaceholder !== undefined && { assigneeRolePlaceholder }),
      ...(order !== undefined && { order }),
      updatedAt: new Date(),
    })
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

  const createdPhases: typeof phasesTable.$inferSelect[] = [];
  const createdTasks: typeof tasksTable.$inferSelect[] = [];

  for (const tPhase of templatePhases) {
    const phaseStart = addCalendarDays(startDate, tPhase.relativeStartOffset);
    const phaseEnd = addCalendarDays(startDate, tPhase.relativeEndOffset);

    const [phase] = await db
      .insert(phasesTable)
      .values({
        projectId,
        name: tPhase.name,
        status: "Not Started",
        startDate: phaseStart,
        dueDate: phaseEnd,
        order: tPhase.order,
        isSharedWithClient: tPhase.privacyDefault === "shared",
      })
      .returning();
    createdPhases.push(phase);

    const phaseTasks = templateTasks.filter(t => t.templatePhaseId === tPhase.id);
    for (const tTask of phaseTasks) {
      const taskDue = addCalendarDays(startDate, tTask.relativeDueDateOffset);
      const [task] = await db
        .insert(tasksTable)
        .values({
          projectId,
          phaseId: phase.id,
          name: tTask.name,
          status: "Not Started",
          priority: tTask.priority,
          effort: String(tTask.effort),
          billable: tTask.billableDefault,
          assigneeIds: [],
          startDate: phaseStart,
          dueDate: taskDue,
          isMilestone: false,
          visibleToClient: tPhase.privacyDefault === "shared",
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
    phasesCreated: createdPhases.length,
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

    const [phase] = await db
      .insert(phasesTable)
      .values({
        projectId: project.id,
        name: tPhase.name,
        status: "Not Started",
        startDate: phaseStart,
        dueDate: phaseEnd,
        order: tPhase.order,
        isSharedWithClient: tPhase.privacyDefault === "shared",
      })
      .returning();

    const phaseTasks = templateTasks.filter(t => t.templatePhaseId === tPhase.id);
    for (const tTask of phaseTasks) {
      const taskDue = addCalendarDays(startDate, tTask.relativeDueDateOffset);
      await db.insert(tasksTable).values({
        projectId: project.id,
        phaseId: phase.id,
        name: tTask.name,
        status: "Not Started",
        priority: tTask.priority,
        effort: String(tTask.effort),
        billable: tTask.billableDefault,
        assigneeIds: [],
        startDate: phaseStart,
        dueDate: taskDue,
        isMilestone: false,
        visibleToClient: tPhase.privacyDefault === "shared",
        fromTemplate: true,
        appliedTemplateId: templateId,
      });
    }
  }

  res.status(201).json({
    ...project,
    budget: Number(project.budget),
    budgetedHours: Number(project.budgetedHours),
    trackedHours: Number(project.trackedHours),
    createdAt: project.createdAt instanceof Date ? project.createdAt.toISOString() : project.createdAt,
    updatedAt: project.updatedAt instanceof Date ? project.updatedAt.toISOString() : project.updatedAt,
  });
});

export default router;
