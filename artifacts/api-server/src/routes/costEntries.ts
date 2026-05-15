import { Router, type IRouter } from "express";
import { db, costEntriesTable, COST_CATEGORIES } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { requirePM } from "../middleware/rbac";

const router: IRouter = Router();

const CreateCostEntryBody = z.object({
  projectId:             z.number().int().positive(),
  entryDate:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "entryDate must be YYYY-MM-DD"),
  description:           z.string().min(1, "description is required"),
  amount:                z.union([z.number(), z.string()]).transform(v => Number(v)),
  costCategory:          z.enum(COST_CATEGORIES as [string, ...string[]], {
                           message: `costCategory must be one of: ${COST_CATEGORIES.join(", ")}`,
                         }),
  externalTransactionId: z.string().optional(),
  notes:                 z.string().optional(),
});

function mapEntry(r: typeof costEntriesTable.$inferSelect) {
  return {
    ...r,
    amount: Number(r.amount),
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  };
}

// GET /api/cost-entries?projectId=N[&costCategory=xxx]
// Project cost data restricted to PM-level and above.
router.get("/cost-entries", requirePM, async (req, res): Promise<void> => {
  const projectId = req.query.projectId ? parseInt(String(req.query.projectId), 10) : NaN;
  const categoryFilter = typeof req.query.costCategory === "string" ? req.query.costCategory : undefined;

  let rows = await db
    .select()
    .from(costEntriesTable)
    .orderBy(sql`${costEntriesTable.entryDate} DESC`, sql`${costEntriesTable.id} DESC`);

  if (!isNaN(projectId)) rows = rows.filter(r => r.projectId === projectId);
  if (categoryFilter)    rows = rows.filter(r => r.costCategory === categoryFilter);

  res.json(rows.map(mapEntry));
});

// POST /api/cost-entries
router.post("/cost-entries", requirePM, async (req, res): Promise<void> => {
  const parsed = CreateCostEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { projectId, entryDate, description, amount, costCategory, externalTransactionId, notes } = parsed.data;

  // ── Duplicate detection ─────────────────────────────────────────────────
  // Only fires when externalTransactionId is provided (Rule 2b).
  if (externalTransactionId) {
    const [dupe] = await db
      .select({ id: costEntriesTable.id })
      .from(costEntriesTable)
      .where(
        and(
          eq(costEntriesTable.projectId,             projectId),
          eq(costEntriesTable.externalTransactionId, externalTransactionId),
          eq(costEntriesTable.entryDate,             entryDate),
          sql`ROUND(${costEntriesTable.amount}::numeric, 2) = ROUND(${amount}::numeric, 2)`,
        ),
      );

    if (dupe) {
      res.status(409).json({ error: "duplicate_cost_entry", existingId: dupe.id });
      return;
    }
  }

  const createdByUserId = Number(req.headers["x-user-id"]) || null;

  const [row] = await db.insert(costEntriesTable).values({
    projectId,
    entryDate,
    description,
    amount:                String(amount),
    costCategory:          costCategory ?? null,
    externalTransactionId: externalTransactionId ?? null,
    notes:                 notes ?? null,
    createdByUserId,
  }).returning();

  res.status(201).json(mapEntry(row));
});

// DELETE /api/cost-entries/:id
router.delete("/cost-entries/:id", requirePM, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db
    .select({ id: costEntriesTable.id })
    .from(costEntriesTable)
    .where(eq(costEntriesTable.id, id));

  if (!existing) { res.status(404).json({ error: "Cost entry not found" }); return; }

  await db.delete(costEntriesTable).where(eq(costEntriesTable.id, id));
  res.sendStatus(204);
});

export default router;
