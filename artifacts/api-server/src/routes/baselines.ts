import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, baselinesTable, phasesTable, tasksTable } from "@workspace/db";
import { requirePM } from "../middleware/rbac";

const router: IRouter = Router();

// List baselines for a project
router.get("/projects/:id/baselines", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.id, 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }
  const rows = await db.select().from(baselinesTable).where(eq(baselinesTable.projectId, projectId));
  res.json(rows.map(b => ({
    ...b,
    phaseSnapshot: b.phaseSnapshot ?? [],
    taskSnapshot: b.taskSnapshot ?? [],
    createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
  })));
});

// Create a baseline snapshot for a project
router.post("/projects/:id/baselines", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.id, 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }
  const { name, notes } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  // Snapshot current phases and tasks
  const phases = await db.select().from(phasesTable).where(eq(phasesTable.projectId, projectId));
  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.projectId, projectId));

  const phaseSnapshot = phases.map(p => ({
    id: p.id,
    name: p.name,
    startDate: p.startDate,
    endDate: p.endDate,
  }));
  const taskSnapshot = tasks.map(t => ({
    id: t.id,
    name: t.name,
    startDate: t.startDate,
    dueDate: t.dueDate,
    phaseId: t.phaseId,
  }));

  const today = new Date().toISOString().slice(0, 10);
  const [row] = await db.insert(baselinesTable).values({
    projectId,
    name,
    notes: notes ?? null,
    snapshotDate: today,
    phaseSnapshot,
    taskSnapshot,
  }).returning();

  res.status(201).json({
    ...row,
    phaseSnapshot: row.phaseSnapshot ?? [],
    taskSnapshot: row.taskSnapshot ?? [],
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  });
});

// Delete a baseline — PM+ only; baselines are otherwise immutable records
router.delete("/baselines/:id", requirePM, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(baselinesTable).where(eq(baselinesTable.id, id));
  res.sendStatus(204);
});

export default router;
