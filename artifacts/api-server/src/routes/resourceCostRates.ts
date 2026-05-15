import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, resourceCostRatesTable, usersTable } from "@workspace/db";
import { requireAdmin } from "../middleware/rbac";
import { z } from "zod";

const router = Router();

const CreateBody = z.object({
  userId: z.number().int().positive(),
  country: z.string().min(1),
  currency: z.string().min(1).default("USD"),
  rate: z.number().positive(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "effectiveDate must be YYYY-MM-DD"),
});

const UpdateBody = z.object({
  country: z.string().min(1).optional(),
  currency: z.string().min(1).optional(),
  rate: z.number().positive().optional(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function mapRow(r: typeof resourceCostRatesTable.$inferSelect) {
  return {
    ...r,
    rate: Number(r.rate),
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  };
}

// GET /api/resource-cost-rates?userId=N
// Cost rates are salary proxies — restricted to account_admin only.
router.get("/resource-cost-rates", requireAdmin, async (req, res): Promise<void> => {
  const userId = req.query.userId ? parseInt(String(req.query.userId), 10) : null;
  const rows = userId
    ? await db.select().from(resourceCostRatesTable)
        .where(eq(resourceCostRatesTable.userId, userId))
        .orderBy(desc(resourceCostRatesTable.effectiveDate))
    : await db.select().from(resourceCostRatesTable)
        .orderBy(desc(resourceCostRatesTable.effectiveDate));
  res.json(rows.map(mapRow));
});

// POST /api/resource-cost-rates
router.post("/resource-cost-rates", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [user] = await db.select({ id: usersTable.id }).from(usersTable)
    .where(eq(usersTable.id, parsed.data.userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [row] = await db.insert(resourceCostRatesTable)
    .values({
      userId: parsed.data.userId,
      country: parsed.data.country,
      currency: parsed.data.currency,
      rate: String(parsed.data.rate),
      effectiveDate: parsed.data.effectiveDate,
    })
    .returning();

  res.status(201).json(mapRow(row));
});

// PATCH /api/resource-cost-rates/:id
router.patch("/resource-cost-rates/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updates: Record<string, unknown> = {};
  if (parsed.data.country !== undefined) updates.country = parsed.data.country;
  if (parsed.data.currency !== undefined) updates.currency = parsed.data.currency;
  if (parsed.data.rate !== undefined) updates.rate = String(parsed.data.rate);
  if (parsed.data.effectiveDate !== undefined) updates.effectiveDate = parsed.data.effectiveDate;

  const [row] = await db.update(resourceCostRatesTable)
    .set(updates as any)
    .where(eq(resourceCostRatesTable.id, id))
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapRow(row));
});

// DELETE /api/resource-cost-rates/:id
router.delete("/resource-cost-rates/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(resourceCostRatesTable)
    .where(eq(resourceCostRatesTable.id, id));
  res.status(204).end();
});

export default router;
