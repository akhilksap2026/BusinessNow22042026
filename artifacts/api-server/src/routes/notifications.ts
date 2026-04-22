import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import {
  ListNotificationsResponse,
  MarkNotificationReadParams,
  MarkNotificationReadResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapNotification(n: typeof notificationsTable.$inferSelect) {
  return {
    ...n,
    projectId: n.projectId ?? undefined,
    projectName: n.projectName ?? undefined,
    timestamp: n.timestamp instanceof Date ? n.timestamp.toISOString() : n.timestamp,
  };
}

router.get("/notifications", async (_req, res): Promise<void> => {
  const rows = await db.select().from(notificationsTable).orderBy(notificationsTable.timestamp);
  res.json(ListNotificationsResponse.parse(rows.map(mapNotification)));
});

router.post("/notifications", async (req, res): Promise<void> => {
  const { type, message, userId, projectId, projectName, entityType, entityId } = req.body;
  if (!type || !message) { res.status(400).json({ error: "type and message required" }); return; }
  const [row] = await db.insert(notificationsTable).values({
    type,
    message,
    userId: userId ?? null,
    projectId: projectId ?? null,
    projectName: projectName ?? null,
    entityType: entityType ?? null,
    entityId: entityId ? String(entityId) : null,
    read: false,
  } as any).returning();
  res.status(201).json(mapNotification(row));
});

router.patch("/notifications/:id/read", async (req, res): Promise<void> => {
  const params = MarkNotificationReadParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Notification not found" }); return; }
  res.json(MarkNotificationReadResponse.parse(mapNotification(row)));
});

router.delete("/notifications/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid notification id" }); return; }
  await db.delete(notificationsTable).where(eq(notificationsTable.id, id));
  res.status(204).send();
});

export default router;
