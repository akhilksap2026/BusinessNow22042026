import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, auditLogTable, usersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/audit-log", async (req, res): Promise<void> => {
  const { entityType, actorUserId, limit } = req.query as Record<string, string>;
  const maxLimit = Math.min(parseInt(limit || "100", 10), 500);

  let query = db.select().from(auditLogTable).orderBy(desc(auditLogTable.timestamp)).limit(maxLimit);

  const rows = await (entityType
    ? db.select().from(auditLogTable).where(eq(auditLogTable.entityType, entityType)).orderBy(desc(auditLogTable.timestamp)).limit(maxLimit)
    : actorUserId
    ? db.select().from(auditLogTable).where(eq(auditLogTable.actorUserId, parseInt(actorUserId, 10))).orderBy(desc(auditLogTable.timestamp)).limit(maxLimit)
    : db.select().from(auditLogTable).orderBy(desc(auditLogTable.timestamp)).limit(maxLimit));

  const users = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable);
  const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));

  res.json(rows.map(r => ({
    id: r.id,
    entityType: r.entityType,
    entityId: r.entityId,
    action: r.action,
    actorUserId: r.actorUserId,
    actorName: r.actorUserId ? (userMap[r.actorUserId] ?? `User ${r.actorUserId}`) : "System",
    description: r.description,
    timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : r.timestamp,
  })));
});

export default router;
