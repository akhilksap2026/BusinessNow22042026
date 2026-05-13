import { type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { resolveRole, type RoleValue } from "../constants/roles";
import { logAuthEvent } from "../lib/authAudit";

const BOOTSTRAP_PATHS = new Set<string>([
  "/me",
  "/healthz",
  "/auth/users-for-login",
]);

export interface AuthenticatedRequest extends Request {
  authUserId?: number;
  authRole?: RoleValue;
  /** MT-1: resolved tenant account ID for the authenticated user. NULL = platform admin. */
  authAccountId?: number | null;
}

export async function verifyRoleClaim(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (BOOTSTRAP_PATHS.has(req.path)) {
    next();
    return;
  }

  const userIdHeader = req.headers["x-user-id"];
  if (!userIdHeader) {
    void logAuthEvent({ req, eventType: "missing_user_id" });
    res.status(401).json({ error: "Authentication required (missing x-user-id)" });
    return;
  }
  const userId = Number(userIdHeader);
  if (!Number.isFinite(userId) || userId <= 0) {
    void logAuthEvent({ req, eventType: "invalid_user_id", description: String(userIdHeader) });
    res.status(401).json({ error: "Invalid x-user-id" });
    return;
  }

  const [user] = await db
    .select({
      id: usersTable.id,
      role: usersTable.role,
      secondaryRoles: usersTable.secondaryRoles,
      activeStatus: usersTable.activeStatus,
      accountId: usersTable.accountId,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) {
    void logAuthEvent({ req, eventType: "user_not_found", userId });
    res.status(401).json({ error: "User not found" });
    return;
  }
  if (user.activeStatus !== "active") {
    void logAuthEvent({ req, eventType: "user_deactivated", userId: user.id });
    res.status(401).json({ error: "Account deactivated" });
    return;
  }

  const claimedRole = String(req.headers["x-user-role"] ?? "");
  if (!claimedRole) {
    void logAuthEvent({ req, eventType: "missing_role_header", userId: user.id });
    res.status(401).json({ error: "Missing x-user-role header" });
    return;
  }
  const claimedCanonical = resolveRole(claimedRole);
  const allowedCanonical = new Set<RoleValue>([
    resolveRole(user.role),
    ...(user.secondaryRoles ?? []).map(resolveRole),
  ]);

  if (!allowedCanonical.has(claimedCanonical)) {
    void logAuthEvent({
      req,
      eventType: "role_mismatch",
      userId: user.id,
      description: `claimed=${claimedRole}`,
    });
    res.status(403).json({
      error: `Role "${claimedRole}" is not assigned to user ${user.id}`,
    });
    return;
  }

  req.authUserId = user.id;
  req.authRole = claimedCanonical;
  // MT-1: propagate tenant ID so route handlers can scope queries without
  // trusting query-param accountId from the client.
  req.authAccountId = user.accountId ?? null;
  next();
}
