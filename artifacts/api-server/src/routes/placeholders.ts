import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, placeholdersTable } from "@workspace/db";
import { requirePM, requireAdmin } from "../middleware/rbac";
import { hasRole } from "../constants/roles";
import type { AuthenticatedRequest } from "../middleware/roleClaim";

const router: IRouter = Router();

function mapPlaceholder(p: typeof placeholdersTable.$inferSelect) {
  return {
    ...p,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
}

router.get("/placeholders", async (_req, res): Promise<void> => {
  const rows = await db.select().from(placeholdersTable).orderBy(placeholdersTable.name);
  res.json(rows.map(mapPlaceholder));
});

router.post("/placeholders", requirePM, async (req, res): Promise<void> => {
  const { name, roleId, isDefault, accountId } = req.body ?? {};
  if (!name || typeof name !== "string") { res.status(400).json({ error: "name required" }); return; }
  const callerRole = (req as AuthenticatedRequest).authRole ?? "collaborator";
  const isAdmin = hasRole(callerRole, "account_admin");
  // isDefault and accountId are admin-controlled — silently ignore from non-admin callers
  // rather than letting a PM create undeletable rows or attach arbitrary account scope.
  const createdBy = (req as any).user?.id ?? null;
  const [row] = await db.insert(placeholdersTable).values({
    name,
    roleId: roleId ?? null,
    isDefault: isAdmin ? !!isDefault : false,
    accountId: isAdmin ? (accountId ?? null) : null,
    createdBy,
  }).returning();
  res.status(201).json(mapPlaceholder(row));
});

router.patch("/placeholders/:id", requirePM, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [existing] = await db.select().from(placeholdersTable).where(eq(placeholdersTable.id, id));
  if (!existing) { res.status(404).json({ error: "Placeholder not found" }); return; }
  if (existing.isDefault && req.body.name && req.body.name !== existing.name) {
    res.status(400).json({ error: "Default placeholder names are locked" });
    return;
  }
  const update: any = {};
  if (req.body.name !== undefined && !existing.isDefault) update.name = req.body.name;
  if (req.body.roleId !== undefined) update.roleId = req.body.roleId;
  const [row] = await db.update(placeholdersTable).set(update).where(eq(placeholdersTable.id, id)).returning();
  res.json(mapPlaceholder(row));
});

router.delete("/placeholders/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [existing] = await db.select().from(placeholdersTable).where(eq(placeholdersTable.id, id));
  if (!existing) { res.status(404).json({ error: "Placeholder not found" }); return; }
  if (existing.isDefault) { res.status(400).json({ error: "Cannot delete default placeholder" }); return; }
  await db.delete(placeholdersTable).where(eq(placeholdersTable.id, id));
  res.status(204).send();
});

export default router;
