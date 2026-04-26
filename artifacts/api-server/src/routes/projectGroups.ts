import { Router, type IRouter } from "express";
import {
  db,
  projectGroupsTable,
  projectsTable,
} from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAdmin } from "../middleware/rbac";

const router: IRouter = Router();

function mapGroup(r: typeof projectGroupsTable.$inferSelect) {
  return {
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

const CreateBody = z.object({
  name: z.string().min(1).max(120),
  color: z.string().max(20).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

const UpdateBody = z.object({
  name: z.string().min(1).max(120).optional(),
  color: z.string().max(20).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

router.get("/project-groups", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(projectGroupsTable)
    .orderBy(asc(projectGroupsTable.sortOrder), asc(projectGroupsTable.id));
  res.json(rows.map(mapGroup));
});

router.post("/project-groups", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  // If sortOrder is omitted, append to the end so new groups don't overlap
  // existing ones. Cheap because the table is tiny.
  let nextOrder = parsed.data.sortOrder;
  if (nextOrder === undefined) {
    const all = await db.select({ sortOrder: projectGroupsTable.sortOrder }).from(projectGroupsTable);
    nextOrder = all.reduce((m, r) => Math.max(m, r.sortOrder), -1) + 1;
  }
  const [row] = await db
    .insert(projectGroupsTable)
    .values({
      name: parsed.data.name,
      color: parsed.data.color ?? null,
      sortOrder: nextOrder,
    })
    .returning();
  res.status(201).json(mapGroup(row));
});

router.patch("/project-groups/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Partial<typeof projectGroupsTable.$inferInsert> = { updatedAt: new Date() };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.color !== undefined) updates.color = parsed.data.color;
  if (parsed.data.sortOrder !== undefined) updates.sortOrder = parsed.data.sortOrder;

  const [row] = await db
    .update(projectGroupsTable)
    .set(updates)
    .where(eq(projectGroupsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Project group not found" });
    return;
  }
  res.json(mapGroup(row));
});

router.delete("/project-groups/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  // Detach affected projects first so we never leave dangling projectGroupId
  // references. This matches the spec ("set projectGroupId = null on
  // affected projects") and keeps clients consistent.
  await db
    .update(projectsTable)
    .set({ projectGroupId: null, updatedAt: new Date() })
    .where(eq(projectsTable.projectGroupId, id));
  await db.delete(projectGroupsTable).where(eq(projectGroupsTable.id, id));
  res.sendStatus(204);
});

export default router;
