import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, taskCommentsTable, taskChecklistsTable } from "@workspace/db";

const router: IRouter = Router();

function mapComment(r: typeof taskCommentsTable.$inferSelect) {
  return {
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

function mapChecklist(r: typeof taskChecklistsTable.$inferSelect) {
  return {
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  };
}

router.get("/tasks/:id/comments", async (req, res): Promise<void> => {
  const taskId = parseInt(req.params.id);
  if (isNaN(taskId)) { res.status(400).json({ error: "Invalid task id" }); return; }
  const rows = await db.select().from(taskCommentsTable).where(eq(taskCommentsTable.taskId, taskId));
  res.json(rows.map(mapComment));
});

router.post("/tasks/:id/comments", async (req, res): Promise<void> => {
  const taskId = parseInt(req.params.id);
  if (isNaN(taskId)) { res.status(400).json({ error: "Invalid task id" }); return; }
  const { userId, content, isPrivate, parentCommentId } = req.body;
  if (!userId || !content) { res.status(400).json({ error: "userId and content required" }); return; }
  const [row] = await db.insert(taskCommentsTable).values({
    taskId,
    userId: Number(userId),
    content,
    isPrivate: isPrivate ?? false,
    parentCommentId: parentCommentId ?? null,
  }).returning();
  res.status(201).json(mapComment(row));
});

router.delete("/tasks/:id/comments/:commentId", async (req, res): Promise<void> => {
  const commentId = parseInt(req.params.commentId);
  if (isNaN(commentId)) { res.status(400).json({ error: "Invalid comment id" }); return; }
  await db.delete(taskCommentsTable).where(eq(taskCommentsTable.id, commentId));
  res.status(204).send();
});

router.get("/tasks/:id/checklist", async (req, res): Promise<void> => {
  const taskId = parseInt(req.params.id);
  if (isNaN(taskId)) { res.status(400).json({ error: "Invalid task id" }); return; }
  const rows = await db.select().from(taskChecklistsTable).where(eq(taskChecklistsTable.taskId, taskId));
  res.json(rows.map(mapChecklist));
});

router.post("/tasks/:id/checklist", async (req, res): Promise<void> => {
  const taskId = parseInt(req.params.id);
  if (isNaN(taskId)) { res.status(400).json({ error: "Invalid task id" }); return; }
  const { name, order } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const [row] = await db.insert(taskChecklistsTable).values({
    taskId,
    name,
    order: order ?? 0,
    completed: false,
  }).returning();
  res.status(201).json(mapChecklist(row));
});

router.patch("/tasks/:id/checklist/:itemId", async (req, res): Promise<void> => {
  const itemId = parseInt(req.params.itemId);
  if (isNaN(itemId)) { res.status(400).json({ error: "Invalid item id" }); return; }
  const updates: Record<string, unknown> = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.completed !== undefined) updates.completed = req.body.completed;
  if (req.body.order !== undefined) updates.order = req.body.order;
  const [row] = await db.update(taskChecklistsTable).set(updates as any).where(eq(taskChecklistsTable.id, itemId)).returning();
  if (!row) { res.status(404).json({ error: "Item not found" }); return; }
  res.json(mapChecklist(row));
});

router.delete("/tasks/:id/checklist/:itemId", async (req, res): Promise<void> => {
  const itemId = parseInt(req.params.itemId);
  if (isNaN(itemId)) { res.status(400).json({ error: "Invalid item id" }); return; }
  await db.delete(taskChecklistsTable).where(eq(taskChecklistsTable.id, itemId));
  res.status(204).send();
});

export default router;
