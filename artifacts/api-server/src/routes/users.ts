import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAdmin } from "../middleware/rbac";
import { validateInviteRole } from "../middleware/inviteValidation";
import { resolveRole } from "../constants/roles";
import { logAudit } from "../lib/audit";
import {
  ListUsersResponse,
  CreateUserBody,
  GetUserParams,
  GetUserResponse,
  UpdateUserParams,
  UpdateUserBody,
  UpdateUserResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapUser(u: typeof usersTable.$inferSelect) {
  return {
    ...u,
    costRate: Number(u.costRate),
    skills: u.skills ?? [],
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
    updatedAt: u.updatedAt instanceof Date ? u.updatedAt.toISOString() : u.updatedAt,
  };
}

router.get("/me", async (req, res): Promise<void> => {
  // Identity bootstrap. Bypassed by `verifyRoleClaim` so the route must do its
  // own validation: read the verified `x-user-id` header, ensure the user
  // exists and is active, and only then return the profile. Falls back to user
  // 1 only when no header is present (legacy unauthenticated dev calls).
  const headerId = req.headers["x-user-id"];
  const userId = headerId !== undefined ? Number(headerId) : 1;
  if (!Number.isFinite(userId) || userId <= 0) {
    res.status(401).json({ error: "Invalid x-user-id" });
    return;
  }
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!u) { res.status(404).json({ error: "User not found" }); return; }
  if (u.activeStatus !== "active") {
    res.status(401).json({ error: "Account deactivated" });
    return;
  }
  res.json(mapUser(u));
});

router.get("/users", async (_req, res): Promise<void> => {
  const rows = await db.select().from(usersTable).orderBy(usersTable.name);
  res.json(ListUsersResponse.parse(rows.map(mapUser)));
});

router.post("/users", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const initials = parsed.data.name.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2);
  const [row] = await db.insert(usersTable).values({ ...parsed.data, initials, skills: parsed.data.skills ?? [], costRate: String(parsed.data.costRate ?? 0) } as any).returning();
  res.status(201).json(GetUserResponse.parse(mapUser(row)));
});

/**
 * POST /users/invite
 *
 * Email-based invite flow. Enforces the role-assignment matrix via
 * validateInviteRole middleware. Body:
 *   { email: string; name?: string; role: string; projectId?: number }
 *
 * Notes:
 *   - This endpoint is additive — POST /users continues to work for the
 *     existing "Add User" admin form. Use /users/invite for the email-flow.
 *   - Token/email delivery is intentionally a no-op stub here; the response
 *     includes an `invite` payload describing what would be sent.
 *   - Both legacy and canonical role strings on the inviter's header and
 *     in the body are accepted (resolveRole normalises them).
 */
router.post("/users/invite", validateInviteRole, async (req, res): Promise<void> => {
  const { email, name, role, projectId } = req.body ?? {};

  if (typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "Body field 'email' must be a valid email" });
    return;
  }

  const canonicalRole = resolveRole(role);
  const displayName: string =
    typeof name === "string" && name.length > 0
      ? name
      : email.split("@")[0];
  const initials = displayName
    .split(/\s+/)
    .map((p: string) => p[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  // Persist the invited user as a pending row so they appear in the team list.
  // accountId is set when present on the inviter's auth context (future hook).
  const [row] = await db
    .insert(usersTable)
    .values({
      name: displayName,
      email,
      role: canonicalRole,
      department: "",
      initials,
      skills: [],
      costRate: "0",
      activeStatus: "invited",
      isInternal: canonicalRole !== "customer",
    } as any)
    .returning();

  res.status(201).json({
    user: mapUser(row),
    invite: {
      email,
      role: canonicalRole,
      projectId: projectId ?? null,
      // Stub — a real implementation would enqueue an email with a signed token.
      tokenSent: false,
    },
  });
});

router.get("/users/:id", async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "User not found" }); return; }
  res.json(GetUserResponse.parse(mapUser(row)));
});

router.patch("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const userUpdates: any = { ...parsed.data };
  if (userUpdates.costRate !== undefined) userUpdates.costRate = String(userUpdates.costRate);
  // Pass through fields not yet in the generated Zod schema
  if (req.body.region !== undefined) userUpdates.region = req.body.region;
  if (req.body.isInternal !== undefined) userUpdates.isInternal = Boolean(req.body.isInternal);
  if (req.body.activeStatus !== undefined) userUpdates.activeStatus = req.body.activeStatus;
  if (req.body.holidayCalendarId !== undefined) userUpdates.holidayCalendarId = req.body.holidayCalendarId === null || req.body.holidayCalendarId === "" ? null : Number(req.body.holidayCalendarId);
  const [previous] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  const [row] = await db.update(usersTable).set(userUpdates).where(eq(usersTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "User not found" }); return; }
  if (previous) {
    const sensitive = ["role", "secondaryRoles", "activeStatus", "isActive", "costRate"] as const;
    const changed: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of sensitive) {
      const before = (previous as any)[key];
      const after = (row as any)[key];
      const beforeJson = JSON.stringify(before);
      const afterJson = JSON.stringify(after);
      if (beforeJson !== afterJson) changed[key] = { from: before, to: after };
    }
    if (Object.keys(changed).length > 0) {
      await logAudit({
        entityType: "user",
        entityId: row.id,
        action: "updated",
        actorUserId: Number(req.headers["x-user-id"] ?? 0) || undefined,
        description: `User "${row.name}" updated: ${Object.keys(changed).join(", ")}`,
        previousValue: Object.fromEntries(Object.entries(changed).map(([k, v]) => [k, v.from])),
        newValue: Object.fromEntries(Object.entries(changed).map(([k, v]) => [k, v.to])),
      });
    }
  }
  res.json(UpdateUserResponse.parse(mapUser(row)));
});

// Toggle the per-user dismissal flag for the dashboard onboarding checklist.
// The user can only change their own flag (no admin escalation needed),
// since this is purely a UI-affordance preference.
router.patch("/users/:id/onboarding-dismissed", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const actor = Number(req.headers["x-user-id"] ?? 0);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!actor || actor !== id) { res.status(403).json({ error: "Can only update your own onboarding state" }); return; }
  const dismissed = Boolean(req.body?.dismissed);
  const [row] = await db.update(usersTable).set({ onboardingDismissed: dismissed } as any).where(eq(usersTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ id: row.id, onboardingDismissed: (row as any).onboardingDismissed });
});

router.patch("/users/:id/secondary-roles", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { secondaryRoles } = req.body;
  if (!Array.isArray(secondaryRoles)) { res.status(400).json({ error: "secondaryRoles must be an array" }); return; }
  const [previous] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  const [row] = await db.update(usersTable).set({ secondaryRoles } as any).where(eq(usersTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "User not found" }); return; }
  await logAudit({
    entityType: "user",
    entityId: row.id,
    action: "updated",
    actorUserId: Number(req.headers["x-user-id"] ?? 0) || undefined,
    description: `User "${row.name}" secondary roles changed`,
    previousValue: { secondaryRoles: previous?.secondaryRoles ?? [] },
    newValue: { secondaryRoles: row.secondaryRoles ?? [] },
  });
  res.json(mapUser(row));
});

// Soft-delete: deactivate user (preserves all historical entries, approvals, audit records).
// User is removed from active dropdowns via isActive=0 / activeStatus="deactivated"
// but remains visible in reports referencing their userId.
router.delete("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.update(usersTable)
    .set({ isActive: 0, activeStatus: "deactivated", updatedAt: new Date() } as any)
    .where(eq(usersTable.id, params.data.id))
    .returning();
  if (!row) { res.status(404).json({ error: "User not found" }); return; }
  await logAudit({
    entityType: "user",
    entityId: row.id,
    action: "deleted",
    actorUserId: Number(req.headers["x-user-id"] ?? 0) || undefined,
    description: `User "${row.name}" deactivated`,
    newValue: { activeStatus: "deactivated" },
  });
  res.status(204).end();
});

// Reactivate a soft-deleted user.
router.post("/users/:id/reactivate", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.update(usersTable)
    .set({ isActive: 1, activeStatus: "active", updatedAt: new Date() } as any)
    .where(eq(usersTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "User not found" }); return; }
  await logAudit({
    entityType: "user",
    entityId: row.id,
    action: "updated",
    actorUserId: Number(req.headers["x-user-id"] ?? 0) || undefined,
    description: `User "${row.name}" reactivated`,
    newValue: { activeStatus: "active" },
  });
  res.json(mapUser(row));
});

export default router;
