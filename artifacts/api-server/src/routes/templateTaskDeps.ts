import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, templateTaskDependenciesTable, templateTasksTable } from "@workspace/db";
import { requirePM } from "../middleware/rbac";
import { z } from "zod";

const router = Router();

const CreateDepBody = z.object({
  predecessorId: z.number().int().positive(),
  dependencyType: z.enum(["FS", "SS", "SF", "FF"]).default("FS"),
  lagDays: z.number().int().default(0),
});

// GET /api/template-tasks/:taskId/dependencies
router.get("/template-tasks/:taskId/dependencies", async (req, res): Promise<void> => {
  const taskId = parseInt(req.params.taskId as string, 10);
  if (isNaN(taskId)) { res.status(400).json({ error: "Invalid taskId" }); return; }

  const [asSuccessor, asPredecessor] = await Promise.all([
    db.select().from(templateTaskDependenciesTable)
      .where(eq(templateTaskDependenciesTable.successorId, taskId)),
    db.select().from(templateTaskDependenciesTable)
      .where(eq(templateTaskDependenciesTable.predecessorId, taskId)),
  ]);

  res.json({ predecessors: asSuccessor, successors: asPredecessor });
});

// POST /api/template-tasks/:taskId/dependencies
// Body: { predecessorId, dependencyType?, lagDays? }
router.post("/template-tasks/:taskId/dependencies", requirePM, async (req, res): Promise<void> => {
  const successorId = parseInt(String(req.params.taskId as string), 10);
  if (isNaN(successorId)) { res.status(400).json({ error: "Invalid taskId" }); return; }

  const parsed = CreateDepBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { predecessorId, dependencyType, lagDays } = parsed.data;

  if (predecessorId === successorId) {
    res.status(400).json({ error: "A task cannot depend on itself" });
    return;
  }

  // Validate both tasks belong to the same template
  const [pred, succ] = await Promise.all([
    db.select().from(templateTasksTable).where(eq(templateTasksTable.id, predecessorId)),
    db.select().from(templateTasksTable).where(eq(templateTasksTable.id, successorId)),
  ]);
  if (!pred[0] || !succ[0]) { res.status(404).json({ error: "Task not found" }); return; }
  if (pred[0].templateId !== succ[0].templateId) {
    res.status(400).json({ error: "Both tasks must belong to the same template" });
    return;
  }

  const [row] = await db.insert(templateTaskDependenciesTable)
    .values({ predecessorId, successorId, dependencyType, lagDays })
    .onConflictDoUpdate({
      target: [templateTaskDependenciesTable.predecessorId, templateTaskDependenciesTable.successorId],
      set: { dependencyType, lagDays },
    })
    .returning();

  res.status(201).json(row);
});

// DELETE /api/template-task-dependencies/:id
router.delete("/template-task-dependencies/:id", requirePM, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id as string), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(templateTaskDependenciesTable)
    .where(eq(templateTaskDependenciesTable.id, id));
  res.status(204).end();
});

// GET /api/template-tasks/:templateId/all-dependencies — bulk fetch for entire template
router.get("/project-templates/:templateId/task-dependencies", async (req, res): Promise<void> => {
  const templateId = parseInt(req.params.templateId as string, 10);
  if (isNaN(templateId)) { res.status(400).json({ error: "Invalid templateId" }); return; }

  // Get all template task IDs for this template
  const tasks = await db.select({ id: templateTasksTable.id })
    .from(templateTasksTable)
    .where(eq(templateTasksTable.templateId, templateId));

  if (tasks.length === 0) { res.json([]); return; }

  const taskIds = tasks.map(t => t.id);
  const deps = await db.select().from(templateTaskDependenciesTable);
  const filtered = deps.filter(d => taskIds.includes(d.predecessorId) && taskIds.includes(d.successorId));
  res.json(filtered);
});

export default router;
