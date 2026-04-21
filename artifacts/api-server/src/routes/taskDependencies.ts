import { Router, type IRouter } from "express";
import { eq, or } from "drizzle-orm";
import { db, taskDependenciesTable, tasksTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/tasks/:id/dependencies", async (req, res): Promise<void> => {
  const taskId = parseInt(req.params.id, 10);
  if (isNaN(taskId)) { res.status(400).json({ error: "Invalid task id" }); return; }
  const deps = await db.select().from(taskDependenciesTable).where(
    or(eq(taskDependenciesTable.predecessorId, taskId), eq(taskDependenciesTable.successorId, taskId))
  );
  // Enrich with task names
  const taskIds = [...new Set(deps.flatMap(d => [d.predecessorId, d.successorId]))];
  const tasks = taskIds.length > 0
    ? await db.select({ id: tasksTable.id, name: tasksTable.name }).from(tasksTable)
    : [];
  const taskMap = Object.fromEntries(tasks.map(t => [t.id, t.name]));
  res.json(deps.map(d => ({
    ...d,
    predecessorName: taskMap[d.predecessorId] ?? `Task #${d.predecessorId}`,
    successorName: taskMap[d.successorId] ?? `Task #${d.successorId}`,
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
  })));
});

router.post("/tasks/:id/dependencies", async (req, res): Promise<void> => {
  const successorId = parseInt(req.params.id, 10);
  if (isNaN(successorId)) { res.status(400).json({ error: "Invalid task id" }); return; }
  const { predecessorId, dependencyType = "FS", lagDays = 0 } = req.body;
  if (!predecessorId) { res.status(400).json({ error: "predecessorId is required" }); return; }
  if (predecessorId === successorId) { res.status(400).json({ error: "Task cannot depend on itself" }); return; }
  const [row] = await db.insert(taskDependenciesTable).values({
    predecessorId: parseInt(predecessorId, 10),
    successorId,
    dependencyType,
    lagDays: parseInt(lagDays, 10),
  }).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt });
});

router.delete("/task-dependencies/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(taskDependenciesTable).where(eq(taskDependenciesTable.id, id));
  res.sendStatus(204);
});

export default router;
