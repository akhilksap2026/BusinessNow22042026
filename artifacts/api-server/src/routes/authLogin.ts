import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";

const router: IRouter = Router();

/**
 * GET /api/auth/users-for-login
 *
 * Public endpoint (bootstrap-exempt in roleClaim middleware) that returns
 * the minimal set of fields required by the /login picker UI. No sensitive
 * fields (costRate, email, etc.) are exposed beyond what's already public
 * in the avatar/name surface throughout the app.
 *
 * This is the only auth-free read of the users table — it intentionally
 * does NOT proxy /api/users (which carries cost rates and other
 * RBAC-protected data).
 */
router.get("/auth/users-for-login", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      initials: usersTable.initials,
      role: usersTable.role,
      secondaryRoles: usersTable.secondaryRoles,
      department: usersTable.department,
      avatarUrl: usersTable.avatarUrl,
      activeStatus: usersTable.activeStatus,
    })
    .from(usersTable)
    .orderBy(usersTable.name);

  const visible = rows
    .filter((r) => r.activeStatus === "active")
    .map((r) => ({
      id: r.id,
      name: r.name,
      initials: r.initials,
      role: r.role,
      secondaryRoles: r.secondaryRoles ?? [],
      department: r.department,
      avatarUrl: r.avatarUrl,
    }));

  res.json(visible);
});

export default router;
