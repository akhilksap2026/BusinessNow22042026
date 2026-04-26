import { Router, type IRouter } from "express";
import { db, taskStatusDefinitionsTable } from "@workspace/db";
import { asc, eq, inArray } from "drizzle-orm";
import { requireAdmin } from "../middleware/rbac";
import { z } from "zod/v4";

const router: IRouter = Router();

const ReorderBody = z.object({ order: z.array(z.number().int().positive()).min(1) });

function mapStatus(r: typeof taskStatusDefinitionsTable.$inferSelect) {
  return {
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

router.get("/task-status-definitions", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(taskStatusDefinitionsTable)
    .orderBy(asc(taskStatusDefinitionsTable.position));
  res.json(rows.map(mapStatus));
});

router.patch(
  "/task-status-definitions/reorder",
  requireAdmin,
  async (req, res): Promise<void> => {
    const parsed = ReorderBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const ids = parsed.data.order;

    // Reject duplicate ids in payload — silent dupes would otherwise leave
    // gaps when paired with the full-permutation check below.
    if (new Set(ids).size !== ids.length) {
      res.status(400).json({ error: "Duplicate status ids in order payload" });
      return;
    }

    // Require a full permutation of every existing status id. Partial
    // payloads would corrupt position ordering (gaps + duplicate positions),
    // so we 400 instead of silently rewriting only the submitted subset.
    const allRows = await db
      .select({ id: taskStatusDefinitionsTable.id })
      .from(taskStatusDefinitionsTable);
    const existingIds = new Set(allRows.map((r) => r.id));
    if (ids.length !== existingIds.size || !ids.every((id) => existingIds.has(id))) {
      res.status(400).json({
        error:
          "Reorder payload must include every existing status id exactly once",
      });
      return;
    }

    // Apply new positions in declared order. Sequential to keep this simple
    // — the table is small (typically <20 rows) so the perf impact is moot.
    for (let i = 0; i < ids.length; i++) {
      await db
        .update(taskStatusDefinitionsTable)
        .set({ position: i, updatedAt: new Date() })
        .where(eq(taskStatusDefinitionsTable.id, ids[i]));
    }

    const rows = await db
      .select()
      .from(taskStatusDefinitionsTable)
      .orderBy(asc(taskStatusDefinitionsTable.position));
    res.json(rows.map(mapStatus));
  },
);

export default router;
