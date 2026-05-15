import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import {
  savedViewsTable,
  insertSavedViewSchema,
  updateSavedViewSchema,
  savedViewFiltersSchema,
  listSavedViewsQuerySchema,
  SAVED_VIEW_ENTITIES,
} from "@workspace/db";
import { and, eq, or, desc } from "drizzle-orm";
import { requirePM } from "../middleware/rbac";
import { hasRole } from "../constants/roles";

export const savedViewsRouter = Router();

function getCurrentUserId(req: Request): number | null {
  const raw = req.headers["x-user-id"];
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isAdminLike(req: Request): boolean {
  const role = String(req.headers["x-user-role"] ?? "");
  return hasRole(role, "super_user");
}

savedViewsRouter.get("/saved-views", async (req: Request, res: Response): Promise<void> => {
  const parsed = listSavedViewsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query", issues: parsed.error.issues }); return;
  }
  const userId = getCurrentUserId(req);
  const { entity } = parsed.data;

  const where = userId
    ? and(
        eq(savedViewsTable.entity, entity),
        or(eq(savedViewsTable.visibility, "public"), eq(savedViewsTable.createdByUserId, userId)),
      )
    : and(eq(savedViewsTable.entity, entity), eq(savedViewsTable.visibility, "public"));

  const rows = await db.select().from(savedViewsTable).where(where).orderBy(desc(savedViewsTable.updatedAt));
  const out = rows.map((r) => ({ ...r, isOwner: userId !== null && r.createdByUserId === userId }));
  res.json(out);
});

savedViewsRouter.post("/saved-views", requirePM, async (req: Request, res: Response): Promise<void> => {
  const userId = getCurrentUserId(req);
  if (!userId) { res.status(400).json({ error: "x-user-id header required" }); return; }

  const body = insertSavedViewSchema.safeParse({ ...req.body, createdByUserId: userId });
  if (!body.success) { res.status(400).json({ error: "Invalid body", issues: body.error.issues }); return; }
  if (!SAVED_VIEW_ENTITIES.includes(body.data.entity as any)) {
    res.status(400).json({ error: "Invalid entity" }); return;
  }

  const [created] = await db.insert(savedViewsTable).values(body.data).returning();
  res.status(201).json({ ...created, isOwner: true });
});

savedViewsRouter.put("/saved-views/:id", requirePM, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const userId = getCurrentUserId(req);
  if (!userId) { res.status(400).json({ error: "x-user-id header required" }); return; }

  const body = updateSavedViewSchema.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid body", issues: body.error.issues }); return; }

  const [existing] = await db.select().from(savedViewsTable).where(eq(savedViewsTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const owner = existing.createdByUserId === userId;
  const adminOnPublic = isAdminLike(req) && existing.visibility === "public";
  if (!owner && !adminOnPublic) { res.status(403).json({ error: "Forbidden" }); return; }

  const [updated] = await db
    .update(savedViewsTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(savedViewsTable.id, id))
    .returning();
  res.json({ ...updated, isOwner: updated.createdByUserId === userId });
});

savedViewsRouter.delete("/saved-views/:id", requirePM, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const userId = getCurrentUserId(req);
  if (!userId) { res.status(400).json({ error: "x-user-id header required" }); return; }

  const [existing] = await db.select().from(savedViewsTable).where(eq(savedViewsTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const owner = existing.createdByUserId === userId;
  const adminOnPublic = isAdminLike(req) && existing.visibility === "public";
  if (!owner && !adminOnPublic) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(savedViewsTable).where(eq(savedViewsTable.id, id));
  res.status(204).send();
});

savedViewsRouter.post("/saved-views/:id/duplicate", requirePM, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const userId = getCurrentUserId(req);
  if (!userId) { res.status(400).json({ error: "x-user-id header required" }); return; }

  const [existing] = await db.select().from(savedViewsTable).where(eq(savedViewsTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const filtersValid = savedViewFiltersSchema.safeParse(existing.filters);
  if (!filtersValid.success) { res.status(500).json({ error: "Source view has invalid filters" }); return; }

  const newName = (req.body?.name as string | undefined)?.trim() || `${existing.name} (copy)`;
  const [created] = await db
    .insert(savedViewsTable)
    .values({
      name: newName,
      entity: existing.entity,
      filters: filtersValid.data,
      visibility: "private",
      createdByUserId: userId,
    })
    .returning();
  res.status(201).json({ ...created, isOwner: true });
});
