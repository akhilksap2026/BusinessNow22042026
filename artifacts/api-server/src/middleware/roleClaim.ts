import { type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { resolveRole, type RoleValue } from "../constants/roles";

const BOOTSTRAP_PATHS = new Set<string>(["/me", "/healthz"]);

export interface AuthenticatedRequest extends Request {
  authUserId?: number;
  authRole?: RoleValue;
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
    res.status(401).json({ error: "Authentication required (missing x-user-id)" });
    return;
  }
  const userId = Number(userIdHeader);
  if (!Number.isFinite(userId) || userId <= 0) {
    res.status(401).json({ error: "Invalid x-user-id" });
    return;
  }

  const [user] = await db
    .select({
      id: usersTable.id,
      role: usersTable.role,
      secondaryRoles: usersTable.secondaryRoles,
      activeStatus: usersTable.activeStatus,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  if (user.activeStatus !== "active") {
    res.status(401).json({ error: "Account deactivated" });
    return;
  }

  const claimedRole = String(req.headers["x-user-role"] ?? "");
  if (!claimedRole) {
    res.status(401).json({ error: "Missing x-user-role header" });
    return;
  }
  const claimedCanonical = resolveRole(claimedRole);
  const allowedCanonical = new Set<RoleValue>([
    resolveRole(user.role),
    ...(user.secondaryRoles ?? []).map(resolveRole),
  ]);

  if (!allowedCanonical.has(claimedCanonical)) {
    res.status(403).json({
      error: `Role "${claimedRole}" is not assigned to user ${user.id}`,
    });
    return;
  }

  req.authUserId = user.id;
  req.authRole = claimedCanonical;
  next();
}
