import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, projectStatusConfigsTable } from "@workspace/db";
import { requireAdmin } from "../middleware/rbac";

const router: IRouter = Router();

router.get("/project-status-configs", async (_req, res): Promise<void> => {
  const configs = await db.select()
    .from(projectStatusConfigsTable)
    .orderBy(projectStatusConfigsTable.sortOrder);
  res.json(configs);
});

router.patch("/project-status-configs/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id as string);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const updates: Record<string, unknown> = {};
  if (req.body.displayLabel !== undefined) updates.displayLabel = req.body.displayLabel;
  if (req.body.color !== undefined) updates.color = req.body.color;
  if (req.body.description !== undefined) updates.description = req.body.description;
  const [row] = await db.update(projectStatusConfigsTable)
    .set(updates)
    .where(eq(projectStatusConfigsTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Status config not found" }); return; }
  res.json(row);
});

export default router;
