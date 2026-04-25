import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, taskCommentsTable, taskChecklistsTable, taskNotesTable, usersTable } from "@workspace/db";

const router: IRouter = Router();

const PM_ROLES = new Set(["Admin", "PM", "Super User"]);
function isPM(role: string): boolean {
  return PM_ROLES.has(role);
}

function mapNote(n: typeof taskNotesTable.$inferSelect, userName: string | null) {
  return {
    id: n.id,
    taskId: n.taskId,
    userId: n.userId,
    userName: userName ?? `User ${n.userId}`,
    content: n.content,
    createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt,
    updatedAt: n.updatedAt instanceof Date ? n.updatedAt.toISOString() : n.updatedAt,
  };
}

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

// ─── TASK NOTES ─────────────────────────────────────────────────────────────
router.get("/tasks/:id/notes", async (req, res): Promise<void> => {
  const taskId = parseInt(req.params.id);
  if (isNaN(taskId)) { res.status(400).json({ error: "Invalid task id" }); return; }
  const rows = await db
    .select({
      id: taskNotesTable.id,
      taskId: taskNotesTable.taskId,
      userId: taskNotesTable.userId,
      content: taskNotesTable.content,
      createdAt: taskNotesTable.createdAt,
      updatedAt: taskNotesTable.updatedAt,
      userName: usersTable.name,
    })
    .from(taskNotesTable)
    .leftJoin(usersTable, eq(taskNotesTable.userId, usersTable.id))
    .where(eq(taskNotesTable.taskId, taskId))
    .orderBy(asc(taskNotesTable.createdAt));
  res.json(rows.map(r => ({
    id: r.id,
    taskId: r.taskId,
    userId: r.userId,
    userName: r.userName ?? `User ${r.userId}`,
    content: r.content,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  })));
});

router.post("/tasks/:id/notes", async (req, res): Promise<void> => {
  const taskId = parseInt(req.params.id);
  if (isNaN(taskId)) { res.status(400).json({ error: "Invalid task id" }); return; }
  const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
  if (!content) { res.status(400).json({ error: "content is required" }); return; }
  // Authoring identity is bound to the trusted x-user-id header (set by middleware),
  // not the request body, so callers cannot impersonate another user.
  const headerUserId = Number(req.headers["x-user-id"] ?? 0);
  if (!headerUserId || isNaN(headerUserId)) { res.status(401).json({ error: "Authentication required" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, headerUserId));
  if (!user) { res.status(401).json({ error: "Unknown user" }); return; }
  const [row] = await db.insert(taskNotesTable).values({ taskId, userId: headerUserId, content }).returning();
  res.status(201).json(mapNote(row, user.name));
});

router.delete("/tasks/:taskId/notes/:noteId", async (req, res): Promise<void> => {
  const noteId = parseInt(req.params.noteId);
  if (isNaN(noteId)) { res.status(400).json({ error: "Invalid note id" }); return; }
  const [existing] = await db.select().from(taskNotesTable).where(eq(taskNotesTable.id, noteId));
  if (!existing) { res.sendStatus(204); return; }
  const role = String(req.headers["x-user-role"] ?? "");
  const requesterId = Number(req.headers["x-user-id"] ?? 0);
  const owner = requesterId && existing.userId === requesterId;
  if (!owner && !isPM(role)) {
    res.status(403).json({ error: "Only the note author or a PM can delete this note." });
    return;
  }
  await db.delete(taskNotesTable).where(eq(taskNotesTable.id, noteId));
  res.sendStatus(204);
});

export default router;
