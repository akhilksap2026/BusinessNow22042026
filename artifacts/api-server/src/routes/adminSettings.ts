import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, taxCodesTable, timeCategoriesTable } from "@workspace/db";

const router: IRouter = Router();

function mapTaxCode(r: typeof taxCodesTable.$inferSelect) {
  return {
    ...r,
    rate: Number(r.rate),
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  };
}

function mapTimeCategory(r: typeof timeCategoriesTable.$inferSelect) {
  return {
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  };
}

router.get("/tax-codes", async (_req, res): Promise<void> => {
  const rows = await db.select().from(taxCodesTable);
  res.json(rows.map(mapTaxCode));
});

router.post("/tax-codes", async (req, res): Promise<void> => {
  const { name, rate, description, isDefault, isActive } = req.body;
  if (!name || rate === undefined) { res.status(400).json({ error: "name and rate required" }); return; }
  const [row] = await db.insert(taxCodesTable).values({
    name,
    rate: String(rate),
    description: description ?? null,
    isDefault: isDefault ?? false,
    isActive: isActive ?? 1,
  } as any).returning();
  res.status(201).json(mapTaxCode(row));
});

router.put("/tax-codes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, rate, description, isDefault, isActive } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (rate !== undefined) updates.rate = String(rate);
  if (description !== undefined) updates.description = description;
  if (isDefault !== undefined) updates.isDefault = isDefault;
  if (isActive !== undefined) updates.isActive = isActive;
  const [row] = await db.update(taxCodesTable).set(updates as any).where(eq(taxCodesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Tax code not found" }); return; }
  res.json(mapTaxCode(row));
});

router.delete("/tax-codes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(taxCodesTable).where(eq(taxCodesTable.id, id));
  res.status(204).send();
});

router.get("/time-categories", async (_req, res): Promise<void> => {
  const rows = await db.select().from(timeCategoriesTable);
  res.json(rows.map(mapTimeCategory));
});

router.post("/time-categories", async (req, res): Promise<void> => {
  const { name, description, isActive } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const [row] = await db.insert(timeCategoriesTable).values({
    name,
    description: description ?? null,
    isActive: isActive ?? 1,
  }).returning();
  res.status(201).json(mapTimeCategory(row));
});

router.put("/time-categories/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, description, isActive } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (isActive !== undefined) updates.isActive = isActive;
  const [row] = await db.update(timeCategoriesTable).set(updates as any).where(eq(timeCategoriesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Time category not found" }); return; }
  res.json(mapTimeCategory(row));
});

router.delete("/time-categories/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(timeCategoriesTable).where(eq(timeCategoriesTable.id, id));
  res.status(204).send();
});

export default router;
