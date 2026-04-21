import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, taxCodesTable, timeCategoriesTable, companySettingsTable } from "@workspace/db";
import { requireAdmin } from "../middleware/rbac";

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

router.get("/company-settings", async (_req, res): Promise<void> => {
  const rows = await db.select().from(companySettingsTable).limit(1);
  if (rows.length === 0) {
    const [row] = await db.insert(companySettingsTable).values({}).returning();
    res.json({ ...row, updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt });
    return;
  }
  const row = rows[0];
  res.json({ ...row, updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt });
});

router.put("/company-settings", requireAdmin, async (req, res): Promise<void> => {
  const { name, address, logoUrl, timezone, currency, fiscalYearStart, website, phone } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (address !== undefined) updates.address = address;
  if (logoUrl !== undefined) updates.logoUrl = logoUrl;
  if (timezone !== undefined) updates.timezone = timezone;
  if (currency !== undefined) updates.currency = currency;
  if (fiscalYearStart !== undefined) updates.fiscalYearStart = fiscalYearStart;
  if (website !== undefined) updates.website = website;
  if (phone !== undefined) updates.phone = phone;

  const existing = await db.select().from(companySettingsTable).limit(1);
  let row;
  if (existing.length === 0) {
    [row] = await db.insert(companySettingsTable).values(updates as any).returning();
  } else {
    [row] = await db.update(companySettingsTable).set(updates as any).where(eq(companySettingsTable.id, existing[0].id)).returning();
  }
  res.json({ ...row, updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt });
});

export default router;
