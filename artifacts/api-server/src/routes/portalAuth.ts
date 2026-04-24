import { Router } from "express";
import { db, projectsTable, tasksTable, allocationsTable, accountsTable, documentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export const portalAuthRouter = Router();

function requireCustomer(req: any, res: any, next: any) {
  const role = req.headers["x-user-role"];
  if (role !== "Customer") {
    res.status(403).json({ error: "Customer role required" });
    return;
  }
  next();
}

function getCustomerUserId(req: any): number | null {
  const raw = req.headers["x-user-id"];
  if (!raw) return null;
  const n = parseInt(raw as string, 10);
  return isNaN(n) ? null : n;
}

function defaultTheme() {
  return { primaryColor: "#4f46e5", accentColor: "#7c3aed", logoUrl: null, tabVisibility: { plan: true, updates: true, spaces: false } };
}

portalAuthRouter.get("/portal-auth/projects", requireCustomer, async (req, res): Promise<void> => {
  const userId = getCustomerUserId(req);
  if (!userId) { res.status(400).json({ error: "x-user-id header required" }); return; }

  const allocs = await db
    .select({ projectId: allocationsTable.projectId })
    .from(allocationsTable)
    .where(eq(allocationsTable.userId, userId));

  if (allocs.length === 0) { res.json([]); return; }

  const projectIds = allocs.map(a => a.projectId);
  const allProjects: (typeof projectsTable.$inferSelect)[] = [];
  for (const pid of projectIds) {
    const rows = await db.select().from(projectsTable).where(eq(projectsTable.id, pid));
    allProjects.push(...rows);
  }

  const enriched = await Promise.all(allProjects.map(async p => {
    const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, p.accountId));
    const tasks = await db.select().from(tasksTable)
      .where(and(eq(tasksTable.projectId, p.id), eq(tasksTable.visibleToClient, true)));
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "Completed").length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const theme = account?.portalTheme ?? defaultTheme();
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      health: p.health,
      startDate: p.startDate,
      dueDate: p.dueDate,
      overallProgress: pct,
      totalTasks: total,
      completedTasks: completed,
      accountName: account?.name ?? null,
      accountLogoUrl: account?.logoUrl ?? null,
      portalTheme: theme,
    };
  }));

  res.json(enriched);
});

portalAuthRouter.get("/portal-auth/projects/:id", requireCustomer, async (req, res): Promise<void> => {
  const userId = getCustomerUserId(req);
  if (!userId) { res.status(400).json({ error: "x-user-id header required" }); return; }

  const projectId = parseInt(req.params.id, 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }

  const allocs = await db.select().from(allocationsTable)
    .where(and(eq(allocationsTable.userId, userId), eq(allocationsTable.projectId, projectId)));
  if (allocs.length === 0) { res.status(403).json({ error: "Not authorized" }); return; }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) { res.status(404).json({ error: "Not found" }); return; }

  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, project.accountId));
  const theme = account?.portalTheme ?? defaultTheme();

  const tasks = await db.select().from(tasksTable)
    .where(and(eq(tasksTable.projectId, projectId), eq(tasksTable.visibleToClient, true)));

  const phaseTasks = tasks.filter(t => t.parentTaskId == null && t.isPhase);

  const docs = await db.select().from(documentsTable).where(eq(documentsTable.projectId, projectId));

  const total = tasks.length;
  const completed = tasks.filter(t => t.status === "Completed").length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const milestones = tasks
    .filter(t => t.isMilestone)
    .map(m => ({ id: m.id, name: m.name, status: m.status, dueDate: m.dueDate }));

  const phasesWithTasks = phaseTasks.map(ph => ({
    id: ph.id,
    name: ph.name,
    status: ph.status,
    startDate: ph.startDate,
    endDate: ph.dueDate,
    tasks: tasks
      .filter(t => t.parentTaskId === ph.id && !t.isMilestone)
      .map(t => ({
        id: t.id,
        name: t.name,
        status: t.status,
        dueDate: t.dueDate,
        assigneeIds: t.assigneeIds,
        priority: t.priority,
        isMine: (t.assigneeIds ?? []).includes(userId),
      })),
  }));

  res.json({
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      health: project.health,
      startDate: project.startDate,
      dueDate: project.dueDate,
      accountName: account?.name ?? null,
    },
    overallProgress: pct,
    totalTasks: total,
    completedTasks: completed,
    phases: phasesWithTasks,
    milestones,
    documents: docs.map(d => ({ id: d.id, title: d.name, type: d.documentType, updatedAt: d.updatedAt })),
    portalTheme: theme,
  });
});

portalAuthRouter.patch("/portal-auth/tasks/:id/complete", requireCustomer, async (req, res): Promise<void> => {
  const userId = getCustomerUserId(req);
  if (!userId) { res.status(400).json({ error: "x-user-id header required" }); return; }

  const taskId = parseInt(req.params.id, 10);
  if (isNaN(taskId)) { res.status(400).json({ error: "Invalid task id" }); return; }

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
  if (!task) { res.status(404).json({ error: "Not found" }); return; }
  if (task.assigneeId !== userId) { res.status(403).json({ error: "You can only complete your own tasks" }); return; }
  if (!task.visibleToClient) { res.status(403).json({ error: "Not authorized" }); return; }

  const [updated] = await db
    .update(tasksTable)
    .set({ status: "Completed", updatedAt: new Date() })
    .where(eq(tasksTable.id, taskId))
    .returning();

  res.json({ id: updated.id, status: updated.status });
});

portalAuthRouter.get("/portal-auth/accounts/:id/branding", async (req, res): Promise<void> => {
  const accountId = parseInt(req.params.id, 10);
  if (isNaN(accountId)) { res.status(400).json({ error: "Invalid account id" }); return; }
  const [row] = await db.select().from(accountsTable).where(eq(accountsTable.id, accountId));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row.portalTheme ?? defaultTheme());
});

portalAuthRouter.patch("/portal-auth/accounts/:id/branding", async (req, res): Promise<void> => {
  const accountId = parseInt(req.params.id, 10);
  if (isNaN(accountId)) { res.status(400).json({ error: "Invalid account id" }); return; }

  const { primaryColor, accentColor, logoUrl, tabVisibility } = req.body ?? {};

  const [existing] = await db.select().from(accountsTable).where(eq(accountsTable.id, accountId));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const current = existing.portalTheme ?? defaultTheme();
  const merged = {
    ...current,
    ...(primaryColor !== undefined && { primaryColor }),
    ...(accentColor !== undefined && { accentColor }),
    ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
    tabVisibility: { ...current.tabVisibility, ...(tabVisibility ?? {}) },
  };

  const [updated] = await db.update(accountsTable)
    .set({ portalTheme: merged, updatedAt: new Date() })
    .where(eq(accountsTable.id, accountId))
    .returning();
  res.json(updated.portalTheme);
});
