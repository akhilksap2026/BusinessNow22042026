import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, tasksTable } from "@workspace/db";
import { requirePM } from "../middleware/rbac";
import {
  ListTasksResponse,
  ListTasksQueryParams,
  CreateTaskBody,
  GetTaskParams,
  GetTaskResponse,
  UpdateTaskParams,
  UpdateTaskBody,
  UpdateTaskResponse,
  DeleteTaskParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapTask(t: typeof tasksTable.$inferSelect) {
  return {
    ...t,
    effort: Number(t.effort),
    assigneeIds: t.assigneeIds ?? [],
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt,
  };
}

router.get("/tasks", async (req, res): Promise<void> => {
  const qp = ListTasksQueryParams.safeParse(req.query);
  const conditions = [];
  if (qp.success && qp.data.projectId) conditions.push(eq(tasksTable.projectId, qp.data.projectId));
  if (qp.success && qp.data.status) conditions.push(eq(tasksTable.status, qp.data.status));
  const rows = conditions.length
    ? await db.select().from(tasksTable).where(and(...conditions))
    : await db.select().from(tasksTable);
  res.json(ListTasksResponse.parse(rows.map(mapTask)));
});

router.post("/tasks", requirePM, async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(tasksTable).values({ ...parsed.data as any, assigneeIds: parsed.data.assigneeIds ?? [] }).returning();
  res.status(201).json(GetTaskResponse.parse(mapTask(row)));
});

router.get("/tasks/:id", async (req, res): Promise<void> => {
  const params = GetTaskParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Task not found" }); return; }
  res.json(GetTaskResponse.parse(mapTask(row)));
});

router.patch("/tasks/:id", requirePM, async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(tasksTable).set(parsed.data as any).where(eq(tasksTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Task not found" }); return; }
  res.json(UpdateTaskResponse.parse(mapTask(row)));
});

router.delete("/tasks/:id", requirePM, async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(tasksTable).where(eq(tasksTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
