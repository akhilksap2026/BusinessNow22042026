import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { requirePM } from "../middleware/rbac";
import type { AuthenticatedRequest } from "../middleware/roleClaim";
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

router.get("/notifications", async (req, res): Promise<void> => {
  // Scope: each user only sees their own notifications unless PM+.
  const callerId = (req as AuthenticatedRequest).authUserId;
  const callerRole = (req as unknown as AuthenticatedRequest).authRole ?? "collaborator";
  const { hasRole } = await import("../constants/roles");
  const isPM = hasRole(callerRole, "super_user");
  const { eq: eqDrizzle } = await import("drizzle-orm");
  const rows = isPM
    ? await db.select().from(notificationsTable).orderBy(notificationsTable.timestamp)
    : await db.select().from(notificationsTable)
        .where(callerId ? eqDrizzle(notificationsTable.userId, callerId) : eqDrizzle(notificationsTable.userId, -1))
        .orderBy(notificationsTable.timestamp);
  res.json(ListNotificationsResponse.parse(rows.map(mapNotification)));
});

// POST /notifications — PM+ only; prevents arbitrary feed injection by collaborators.
router.post("/notifications", requirePM, async (req, res): Promise<void> => {
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
