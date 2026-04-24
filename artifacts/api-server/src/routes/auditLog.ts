import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, auditLogTable, usersTable } from "@workspace/db";
import { requireAdmin } from "../middleware/rbac";
import { logAudit } from "../lib/audit";
import { resolveRole } from "../constants/roles";

const router: IRouter = Router();

// Role-switch logging — fires when a user changes their active role in the UI.
// Open to any authenticated user (anyone can switch their own role); the
// `actorUserId` is taken from the verified x-user-id header. We validate
// `from` and `to` against the actor's assigned roles so the audit trail
// can't be poisoned with semantically false transitions.
router.post("/audit/role-switch", async (req, res): Promise<void> => {
  const { from, to } = (req.body ?? {}) as { from?: string; to?: string };
  if (!from || !to || typeof from !== "string" || typeof to !== "string") {
    res.status(400).json({ error: "from and to are required strings" });
    return;
  }
  const actorId = Number(req.headers["x-user-id"] ?? 0) || undefined;
  if (!actorId) {
    res.status(401).json({ error: "Unauthenticated" });
    return;
  }
  const [user] = await db
    .select({ role: usersTable.role, secondaryRoles: usersTable.secondaryRoles })
    .from(usersTable)
    .where(eq(usersTable.id, actorId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  const allowed = new Set<string>([
    resolveRole(user.role),
    ...(user.secondaryRoles ?? []).map(resolveRole),
  ]);
  const fromCanon = resolveRole(from);
  const toCanon = resolveRole(to);
  if (!allowed.has(fromCanon) || !allowed.has(toCanon)) {
    res.status(403).json({ error: "Cannot log a role transition you are not assigned to" });
    return;
  }
  await logAudit({
    entityType: "role_switch",
    entityId: actorId,
    action: "updated",
    actorUserId: actorId,
    description: `Switched active role: ${from} → ${to}`,
    previousValue: { activeRole: from },
    newValue: { activeRole: to },
  });
  res.status(204).end();
});

router.get("/audit-log", requireAdmin, async (req, res): Promise<void> => {
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
