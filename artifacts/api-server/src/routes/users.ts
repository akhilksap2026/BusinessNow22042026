import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAdmin } from "../middleware/rbac";
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

router.get("/me", async (_req, res): Promise<void> => {
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, 1));
  if (!u) { res.status(404).json({ error: "User not found" }); return; }
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
  const [row] = await db.update(usersTable).set(userUpdates).where(eq(usersTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "User not found" }); return; }
  res.json(UpdateUserResponse.parse(mapUser(row)));
});

router.patch("/users/:id/secondary-roles", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { secondaryRoles } = req.body;
  if (!Array.isArray(secondaryRoles)) { res.status(400).json({ error: "secondaryRoles must be an array" }); return; }
  const [row] = await db.update(usersTable).set({ secondaryRoles } as any).where(eq(usersTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "User not found" }); return; }
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
  res.json(mapUser(row));
});

export default router;
