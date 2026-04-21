import { Router, type IRouter } from "express";
import { db, projectTemplatesTable, projectsTable, phasesTable, tasksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateProjectTemplateBody, CreateProjectFromTemplateBody } from "@workspace/api-zod";

const router: IRouter = Router();

function mapTemplate(t: typeof projectTemplatesTable.$inferSelect) {
  return {
    ...t,
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt,
  };
}

router.get("/project-templates", async (_req, res): Promise<void> => {
  const rows = await db.select().from(projectTemplatesTable).orderBy(projectTemplatesTable.name);
  res.json(rows.map(mapTemplate));
});

router.post("/project-templates", async (req, res): Promise<void> => {
  const parsed = CreateProjectTemplateBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(projectTemplatesTable).values({
    ...parsed.data,
    phases: parsed.data.phases ?? [],
  } as any).returning();
  res.status(201).json(mapTemplate(row));
});

router.get("/project-templates/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [row] = await db.select().from(projectTemplatesTable).where(eq(projectTemplatesTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapTemplate(row));
});

router.delete("/project-templates/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(projectTemplatesTable).where(eq(projectTemplatesTable.id, id));
  res.status(204).end();
});

router.post("/projects/from-template", async (req, res): Promise<void> => {
  const parsed = CreateProjectFromTemplateBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [template] = await db.select().from(projectTemplatesTable).where(eq(projectTemplatesTable.id, parsed.data.templateId));
  if (!template) { res.status(404).json({ error: "Template not found" }); return; }

  const startDate = new Date(parsed.data.startDate);
  const dueDate = new Date(startDate);
  dueDate.setDate(dueDate.getDate() + template.durationDays);

  const [project] = await db.insert(projectsTable).values({
    name: parsed.data.name,
    accountId: parsed.data.accountId,
    ownerId: parsed.data.ownerId,
    startDate: startDate.toISOString().slice(0, 10),
    dueDate: dueDate.toISOString().slice(0, 10),
    billingType: template.billingType,
    status: "Draft",
    health: "On Track",
    budget: String(parsed.data.budget ?? 0),
    budgetedHours: "0",
    trackedHours: "0",
    completion: 0,
    templateId: template.id,
  }).returning();

  const phases = (template.phases as any[]) ?? [];
  for (const tPhase of phases) {
    const phaseStart = new Date(startDate);
    const [phase] = await db.insert(phasesTable).values({
      projectId: project.id,
      name: tPhase.name,
      status: "Not Started",
      order: tPhase.order ?? 0,
    }).returning();

    for (const tTask of (tPhase.tasks ?? [])) {
      const taskDue = new Date(phaseStart);
      taskDue.setDate(taskDue.getDate() + (tTask.daysFromStart ?? 0) + (tTask.durationDays ?? 1));
      await db.insert(tasksTable).values({
        projectId: project.id,
        phaseId: phase.id,
        name: tTask.name,
        status: "Not Started",
        priority: "Medium",
        effort: String(tTask.effort ?? 0),
        billable: tTask.billable ?? true,
        assigneeIds: [],
        dueDate: taskDue.toISOString().slice(0, 10),
        isMilestone: false,
        visibleToClient: false,
      });
    }
  }

  res.status(201).json({
    ...project,
    budget: Number(project.budget),
    budgetedHours: Number(project.budgetedHours),
    trackedHours: Number(project.trackedHours),
    startDate: project.startDate,
    dueDate: project.dueDate,
    createdAt: (project.createdAt as any) instanceof Date ? (project.createdAt as any).toISOString() : project.createdAt,
    updatedAt: (project.updatedAt as any) instanceof Date ? (project.updatedAt as any).toISOString() : project.updatedAt,
  });
});

export default router;
