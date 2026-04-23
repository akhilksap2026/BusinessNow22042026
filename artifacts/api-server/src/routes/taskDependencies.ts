import { Router, type IRouter } from "express";
import { eq, or, inArray } from "drizzle-orm";
import { db, taskDependenciesTable, tasksTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/tasks/:id/dependencies", async (req, res): Promise<void> => {
  const taskId = parseInt(req.params.id, 10);
  if (isNaN(taskId)) { res.status(400).json({ error: "Invalid task id" }); return; }
  const deps = await db.select().from(taskDependenciesTable).where(
    or(eq(taskDependenciesTable.predecessorId, taskId), eq(taskDependenciesTable.successorId, taskId))
  );
  const taskIds = [...new Set(deps.flatMap(d => [d.predecessorId, d.successorId]))];
  const tasks = taskIds.length > 0
    ? await db.select({ id: tasksTable.id, name: tasksTable.name }).from(tasksTable).where(inArray(tasksTable.id, taskIds))
    : [];
  const taskMap = Object.fromEntries(tasks.map(t => [t.id, t.name]));
  res.json(deps.map(d => ({
    ...d,
    predecessorName: taskMap[d.predecessorId] ?? `Task #${d.predecessorId}`,
    successorName: taskMap[d.successorId] ?? `Task #${d.successorId}`,
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
  })));
});

// Detect cycles via DFS in dependency graph
async function wouldCreateCycle(predecessorId: number, successorId: number): Promise<boolean> {
  // BFS: can we reach predecessorId starting from successorId following FS edges?
  const visited = new Set<number>();
  const queue = [successorId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === predecessorId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const downstream = await db
      .select({ successorId: taskDependenciesTable.successorId })
      .from(taskDependenciesTable)
      .where(eq(taskDependenciesTable.predecessorId, current));
    for (const d of downstream) queue.push(d.successorId);
  }
  return false;
}

router.post("/tasks/:id/dependencies", async (req, res): Promise<void> => {
  const successorId = parseInt(req.params.id, 10);
  if (isNaN(successorId)) { res.status(400).json({ error: "Invalid task id" }); return; }
  const { predecessorId, dependencyType = "FS", lagDays = 0 } = req.body;
  if (!predecessorId) { res.status(400).json({ error: "predecessorId is required" }); return; }
  const predId = parseInt(predecessorId, 10);
  if (predId === successorId) { res.status(400).json({ error: "Task cannot depend on itself" }); return; }

  // Circular dependency check
  if (await wouldCreateCycle(predId, successorId)) {
    res.status(400).json({ error: "This dependency would create a circular reference. Operation rejected." });
    return;
  }

  const [row] = await db.insert(taskDependenciesTable).values({
    predecessorId: predId,
    successorId,
    dependencyType,
    lagDays: parseInt(lagDays, 10) || 0,
  }).returning();

  // Cascade dates: if predecessor has a dueDate, push successor's startDate/dueDate forward
  const [pred] = await db.select().from(tasksTable).where(eq(tasksTable.id, predId));
  const [succ] = await db.select().from(tasksTable).where(eq(tasksTable.id, successorId));
  if (pred?.dueDate && succ) {
    const predDue = new Date(pred.dueDate);
    const lagMs = (parseInt(lagDays, 10) || 0) * 86400000;
    const newStart = new Date(predDue.getTime() + 86400000 + lagMs);
    if (!succ.startDate || new Date(succ.startDate) < newStart) {
      const durationDays = succ.startDate && succ.dueDate
        ? Math.ceil((new Date(succ.dueDate).getTime() - new Date(succ.startDate).getTime()) / 86400000)
        : 1;
      const newDue = new Date(newStart.getTime() + durationDays * 86400000);
      await db.update(tasksTable).set({
        startDate: newStart.toISOString().slice(0, 10),
        dueDate: newDue.toISOString().slice(0, 10),
      }).where(eq(tasksTable.id, successorId));
    }
  }

  res.status(201).json({ ...row, createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt });
});

router.delete("/task-dependencies/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(taskDependenciesTable).where(eq(taskDependenciesTable.id, id));
  res.sendStatus(204);
});

export default router;
