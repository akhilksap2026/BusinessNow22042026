import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, taskDailyAllocationsTable, tasksTable } from "@workspace/db";
import { requirePM } from "../middleware/rbac";
import { z } from "zod";

const router = Router();

const CreateBody = z.object({
  userId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  hours: z.number().min(0).max(24),
  notes: z.string().optional(),
});

const UpdateBody = z.object({
  hours: z.number().min(0).max(24).optional(),
  notes: z.string().optional(),
});

function mapRow(r: typeof taskDailyAllocationsTable.$inferSelect) {
  return {
    ...r,
    hours: Number(r.hours),
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

// GET /api/tasks/:taskId/daily-allocations
router.get("/tasks/:taskId/daily-allocations", async (req, res): Promise<void> => {
  const taskId = parseInt(req.params.taskId as string, 10);
  if (isNaN(taskId)) { res.status(400).json({ error: "Invalid taskId" }); return; }

  const rows = await db.select().from(taskDailyAllocationsTable)
    .where(eq(taskDailyAllocationsTable.taskId, taskId));

  res.json(rows.map(mapRow));
});

// POST /api/tasks/:taskId/daily-allocations
router.post("/tasks/:taskId/daily-allocations", requirePM, async (req, res): Promise<void> => {
  const taskId = parseInt(String(req.params.taskId as string), 10);
  if (isNaN(taskId)) { res.status(400).json({ error: "Invalid taskId" }); return; }

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }

  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [row] = await db.insert(taskDailyAllocationsTable)
    .values({
      taskId,
      userId: parsed.data.userId,
      date: parsed.data.date,
      hours: String(parsed.data.hours),
      notes: parsed.data.notes ?? null,
    })
    .onConflictDoUpdate({
      target: [taskDailyAllocationsTable.taskId, taskDailyAllocationsTable.userId, taskDailyAllocationsTable.date],
      set: { hours: String(parsed.data.hours), notes: parsed.data.notes ?? null, updatedAt: new Date() },
    })
    .returning();

  res.status(201).json(mapRow(row));
});

// PATCH /api/task-daily-allocations/:id
router.patch("/task-daily-allocations/:id", requirePM, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id as string), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.hours !== undefined) updates.hours = String(parsed.data.hours);
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

  const [row] = await db.update(taskDailyAllocationsTable)
    .set(updates as any)
    .where(eq(taskDailyAllocationsTable.id, id))
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapRow(row));
});

// DELETE /api/task-daily-allocations/:id
router.delete("/task-daily-allocations/:id", requirePM, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id as string), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(taskDailyAllocationsTable)
    .where(eq(taskDailyAllocationsTable.id, id));
  res.status(204).end();
});

export default router;
