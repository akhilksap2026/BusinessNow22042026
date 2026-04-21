import { Router } from "express";
import {
  db,
  clientPortalAccessTable,
  projectsTable,
  tasksTable,
  phasesTable,
  documentsTable,
  accountsTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

// ─── Create portal token ─────────────────────────────────────────────────────
router.post("/projects/:id/portal-tokens", async (req, res) => {
  const projectId = Number(req.params.id);
  const { label, expiresAt } = req.body;

  const [token] = await db.insert(clientPortalAccessTable).values({
    projectId,
    label: label || "Client Portal",
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  }).returning();

  return res.status(201).json(mapToken(token));
});

// ─── List portal tokens ──────────────────────────────────────────────────────
router.get("/projects/:id/portal-tokens", async (req, res) => {
  const projectId = Number(req.params.id);
  const rows = await db
    .select()
    .from(clientPortalAccessTable)
    .where(eq(clientPortalAccessTable.projectId, projectId))
    .orderBy(desc(clientPortalAccessTable.createdAt));
  return res.json(rows.map(mapToken));
});

// ─── Revoke portal token ─────────────────────────────────────────────────────
router.delete("/projects/:id/portal-tokens/:tokenId", async (req, res) => {
  const tokenId = Number(req.params.tokenId);
  await db
    .update(clientPortalAccessTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(clientPortalAccessTable.id, tokenId));
  return res.status(204).send();
});

// ─── Gantt data ──────────────────────────────────────────────────────────────
router.get("/projects/:id/gantt", async (req, res) => {
  const projectId = Number(req.params.id);

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) return res.status(404).json({ error: "Not found" });

  const phases = await db.select().from(phasesTable).where(eq(phasesTable.projectId, projectId));
  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.projectId, projectId));

  const rows: any[] = [];

  // Add phases
  for (const phase of phases) {
    const phaseTasks = tasks.filter(t => t.phaseId === phase.id);
    // Phase dates: min start / max due from its tasks
    const starts = phaseTasks.map(t => t.startDate).filter(Boolean).sort();
    const dues = phaseTasks.map(t => t.dueDate).filter(Boolean).sort();
    const completedCount = phaseTasks.filter(t => t.status === "Completed").length;
    const completion = phaseTasks.length > 0 ? Math.round((completedCount / phaseTasks.length) * 100) : 0;

    rows.push({
      id: phase.id,
      type: "phase",
      name: phase.name,
      startDate: starts[0] ?? project.startDate,
      dueDate: dues[dues.length - 1] ?? project.dueDate,
      status: phase.status ?? "Not Started",
      completion,
      parentId: null,
      isMilestone: false,
    });

    // Add tasks under phase
    for (const task of phaseTasks) {
      rows.push({
        id: task.id,
        type: "task",
        name: task.name,
        startDate: task.startDate ?? project.startDate,
        dueDate: task.dueDate ?? project.dueDate,
        status: task.status,
        completion: task.status === "Completed" ? 100 : task.status === "In Progress" ? 50 : 0,
        parentId: phase.id,
        isMilestone: task.isMilestone ?? false,
      });
    }
  }

  // Add unphased tasks
  const unphasedTasks = tasks.filter(t => !t.phaseId);
  for (const task of unphasedTasks) {
    rows.push({
      id: task.id,
      type: "task",
      name: task.name,
      startDate: task.startDate ?? project.startDate,
      dueDate: task.dueDate ?? project.dueDate,
      status: task.status,
      completion: task.status === "Completed" ? 100 : task.status === "In Progress" ? 50 : 0,
      parentId: null,
      isMilestone: task.isMilestone ?? false,
    });
  }

  return res.json({
    projectId,
    projectStart: project.startDate,
    projectEnd: project.dueDate,
    rows,
  });
});

// ─── Public portal endpoint ──────────────────────────────────────────────────
router.get("/portal/:token", async (req, res) => {
  const { token } = req.params;

  const [access] = await db
    .select()
    .from(clientPortalAccessTable)
    .where(and(eq(clientPortalAccessTable.token, token), eq(clientPortalAccessTable.isActive, true)));

  if (!access) return res.status(404).json({ error: "Portal not found or link has been revoked" });
  if (access.expiresAt && new Date(access.expiresAt) < new Date()) {
    return res.status(404).json({ error: "Portal link has expired" });
  }

  // Increment view count
  await db
    .update(clientPortalAccessTable)
    .set({ viewCount: access.viewCount + 1, lastViewedAt: new Date(), updatedAt: new Date() })
    .where(eq(clientPortalAccessTable.id, access.id));

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, access.projectId));
  if (!project) return res.status(404).json({ error: "Project not found" });

  let accountName: string | null = null;
  if (project.accountId) {
    const [acc] = await db.select().from(accountsTable).where(eq(accountsTable.id, project.accountId));
    accountName = acc?.name ?? null;
  }

  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.projectId, project.id));
  const completedTasks = tasks.filter(t => t.status === "Completed").length;
  const milestones = tasks.filter(t => t.isMilestone).map(t => ({
    id: t.id,
    name: t.name,
    status: t.status,
    dueDate: t.dueDate,
    completedAt: t.status === "Completed" ? t.updatedAt : null,
  }));

  let documents: any[] = [];
  try {
    const docs = await db.select().from(documentsTable).where(eq(documentsTable.projectId, project.id));
    documents = docs.map(d => ({
      id: d.id,
      title: d.name,
      type: d.documentType ?? d.spaceType ?? "Document",
      updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : d.updatedAt,
    }));
  } catch {
    documents = [];
  }

  return res.json({
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      health: project.health,
      completion: project.completion,
      startDate: project.startDate,
      dueDate: project.dueDate,
      description: project.description,
      accountName,
    },
    milestones,
    documents,
    overallProgress: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0,
    totalTasks: tasks.length,
    completedTasks,
    label: access.label,
  });
});

function mapToken(row: typeof clientPortalAccessTable.$inferSelect) {
  return {
    id: row.id,
    projectId: row.projectId,
    token: row.token,
    label: row.label,
    isActive: row.isActive,
    expiresAt: row.expiresAt instanceof Date ? row.expiresAt.toISOString() : row.expiresAt,
    viewCount: row.viewCount,
    lastViewedAt: row.lastViewedAt instanceof Date ? row.lastViewedAt.toISOString() : row.lastViewedAt,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

export default router;
