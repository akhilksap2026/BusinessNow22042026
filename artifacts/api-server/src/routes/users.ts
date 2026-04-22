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
  const [row] = await db.update(usersTable).set(userUpdates).where(eq(usersTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "User not found" }); return; }
  res.json(UpdateUserResponse.parse(mapUser(row)));
});

router.delete("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.delete(usersTable).where(eq(usersTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "User not found" }); return; }
  res.status(204).end();
});

export default router;
