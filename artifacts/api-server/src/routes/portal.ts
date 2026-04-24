import { Router } from "express";
import {
  db,
  clientPortalAccessTable,
  projectsTable,
  tasksTable,
  documentsTable,
  accountsTable,
  taskDependenciesTable,
  changeOrdersTable,
} from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";

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

  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.projectId, projectId));

  // Derive project date range from tasks if not set
  const allStarts = tasks.map(t => t.startDate).filter(Boolean).sort() as string[];
  const allEnds = tasks.map(t => t.dueDate).filter(Boolean).sort() as string[];
  const today = new Date().toISOString().slice(0, 10);
  const addDays = (d: string, n: number) =>
    new Date(new Date(d).getTime() + n * 86400000).toISOString().slice(0, 10);
  const projectStart = project.startDate ?? allStarts[0] ?? today;
  const projectEnd = project.dueDate ?? allEnds[allEnds.length - 1] ?? addDays(projectStart, 30);

  // Recursive row builder (preorder: parent then children)
  function buildRows(parentId: number | null, depth: number): any[] {
    const children = tasks.filter(t => (t.parentTaskId ?? null) === parentId);
    const rows: any[] = [];
    for (const task of children) {
      const hasChildren = tasks.some(t => t.parentTaskId === task.id);
      const completion =
        task.status === "Completed" ? 100 :
        task.status === "In Progress" ? 50 : 0;
      rows.push({
        id: task.id,
        type: "task",
        name: task.name,
        startDate: task.startDate ?? projectStart,
        dueDate: task.dueDate ?? projectEnd,
        status: task.status,
        completion,
        parentTaskId: task.parentTaskId ?? null,
        depth,
        isMilestone: task.isMilestone ?? false,
        milestoneType: task.milestoneType ?? null,
        hasChildren,
      });
      rows.push(...buildRows(task.id, depth + 1));
    }
    return rows;
  }

  const rows = buildRows(null, 0);

  // Fetch all dependencies for tasks in this project
  const taskIds = tasks.map(t => t.id);
  const deps = taskIds.length > 0
    ? await db.select().from(taskDependenciesTable).where(
        inArray(taskDependenciesTable.predecessorId, taskIds)
      )
    : [];

  return res.json({
    projectId,
    projectStart,
    projectEnd,
    rows,
    dependencies: deps.map(d => ({
      id: d.id,
      predecessorId: d.predecessorId,
      successorId: d.successorId,
      dependencyType: d.dependencyType,
      lagDays: d.lagDays ?? 0,
    })),
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

  // Approved change requests — visible to clients
  let approvedChangeRequests: any[] = [];
  try {
    const cos = await db.select().from(changeOrdersTable)
      .where(and(eq(changeOrdersTable.projectId, project.id), eq(changeOrdersTable.status, "Approved")));
    // SECURITY: financial fields (amount, additionalHours) are intentionally
    // omitted from the public portal payload — clients see scope/status only.
    approvedChangeRequests = cos.map(co => ({
      id: co.id,
      crNumber: co.crNumber,
      title: co.title,
      description: co.description,
      decisionDate: co.decisionDate ?? co.approvedDate,
    }));
  } catch {
    approvedChangeRequests = [];
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
    approvedChangeRequests,
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
