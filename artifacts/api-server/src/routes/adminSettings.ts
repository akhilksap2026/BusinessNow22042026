import { Router, type IRouter } from "express";
import { eq, asc, inArray } from "drizzle-orm";
import { db, taxCodesTable, timeCategoriesTable, companySettingsTable, timeSettingsTable, activityDefaultsTable } from "@workspace/db";
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

router.post("/tax-codes", requireAdmin, async (req, res): Promise<void> => {
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

router.put("/tax-codes/:id", requireAdmin, async (req, res): Promise<void> => {
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

router.delete("/tax-codes/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(taxCodesTable).where(eq(taxCodesTable.id, id));
  res.status(204).send();
});

router.get("/time-categories", async (_req, res): Promise<void> => {
  const rows = await db.select().from(timeCategoriesTable).orderBy(asc(timeCategoriesTable.sortOrder), asc(timeCategoriesTable.id));
  res.json(rows.map(mapTimeCategory));
});

router.post("/time-categories", requireAdmin, async (req, res): Promise<void> => {
  const { name, description, isActive, defaultBillable, sortOrder } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  // Append at end if no sortOrder supplied
  let nextOrder = sortOrder;
  if (nextOrder === undefined) {
    const existing = await db.select().from(timeCategoriesTable);
    nextOrder = existing.reduce((m, r) => Math.max(m, r.sortOrder ?? 0), 0) + 1;
  }
  const [row] = await db.insert(timeCategoriesTable).values({
    name,
    description: description ?? null,
    isActive: isActive ?? 1,
    defaultBillable: defaultBillable ?? true,
    sortOrder: Number(nextOrder),
  } as any).returning();
  res.status(201).json(mapTimeCategory(row));
});

router.put("/time-categories/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, description, isActive, defaultBillable, sortOrder } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (isActive !== undefined) updates.isActive = isActive;
  if (defaultBillable !== undefined) updates.defaultBillable = !!defaultBillable;
  if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder);
  const [row] = await db.update(timeCategoriesTable).set(updates as any).where(eq(timeCategoriesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Time category not found" }); return; }
  res.json(mapTimeCategory(row));
});

// Bulk reorder. Accepts {ids: number[]}; assigns sortOrder = index+1 for each id.
// Categories not in the list keep their current sortOrder. Deletion of a
// category does NOT delete historical time_entries — they retain the original
// categoryId pointer and the (now-deleted) name is shown via reports' join
// fallback. We do not enforce FK cascade for that reason.
router.put("/time-categories/reorder", requireAdmin, async (req, res): Promise<void> => {
  const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map((x: any) => Number(x)).filter(Boolean) : [];
  if (ids.length === 0) { res.status(400).json({ error: "ids array required" }); return; }
  for (let i = 0; i < ids.length; i++) {
    await db.update(timeCategoriesTable).set({ sortOrder: i + 1 } as any).where(eq(timeCategoriesTable.id, ids[i]));
  }
  res.json({ reordered: ids.length });
});

router.delete("/time-categories/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(timeCategoriesTable).where(eq(timeCategoriesTable.id, id));
  res.status(204).send();
});

// ─── Activity Defaults ───────────────────────────────────────────────────────
function mapActivityDefault(r: typeof activityDefaultsTable.$inferSelect) {
  let parsed: Record<string, string> = {};
  try { parsed = r.defaultFieldValues ? JSON.parse(r.defaultFieldValues) : {}; } catch { parsed = {}; }
  return {
    ...r,
    defaultFieldValues: parsed,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

router.get("/activity-defaults", async (_req, res): Promise<void> => {
  const rows = await db.select().from(activityDefaultsTable).orderBy(asc(activityDefaultsTable.activityName));
  res.json(rows.map(mapActivityDefault));
});

router.post("/activity-defaults", requireAdmin, async (req, res): Promise<void> => {
  const { activityName, billable, categoryId, defaultFieldValues, isActive } = req.body;
  if (!activityName) { res.status(400).json({ error: "activityName required" }); return; }
  const [row] = await db.insert(activityDefaultsTable).values({
    activityName: String(activityName).trim(),
    billable: !!billable,
    categoryId: categoryId === null || categoryId === undefined ? null : Number(categoryId),
    defaultFieldValues: defaultFieldValues ? JSON.stringify(defaultFieldValues) : null,
    isActive: isActive === undefined ? true : !!isActive,
  } as any).returning();
  res.status(201).json(mapActivityDefault(row));
});

router.put("/activity-defaults/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { activityName, billable, categoryId, defaultFieldValues, isActive } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (activityName !== undefined) updates.activityName = String(activityName).trim();
  if (billable !== undefined) updates.billable = !!billable;
  if (categoryId !== undefined) updates.categoryId = categoryId === null ? null : Number(categoryId);
  if (defaultFieldValues !== undefined) updates.defaultFieldValues = defaultFieldValues ? JSON.stringify(defaultFieldValues) : null;
  if (isActive !== undefined) updates.isActive = !!isActive;
  const [row] = await db.update(activityDefaultsTable).set(updates as any).where(eq(activityDefaultsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Activity default not found" }); return; }
  res.json(mapActivityDefault(row));
});

router.delete("/activity-defaults/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(activityDefaultsTable).where(eq(activityDefaultsTable.id, id));
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

function mapTimeSettings(r: typeof timeSettingsTable.$inferSelect) {
  return { ...r, updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt };
}

router.get("/time-settings", async (_req, res): Promise<void> => {
  const rows = await db.select().from(timeSettingsTable).limit(1);
  if (rows.length === 0) {
    const [row] = await db.insert(timeSettingsTable).values({}).returning();
    res.json(mapTimeSettings(row));
    return;
  }
  res.json(mapTimeSettings(rows[0]));
});

router.put("/time-settings", requireAdmin, async (req, res): Promise<void> => {
  const b = req.body ?? {};
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (b.weeklyCapacityHours !== undefined) updates.weeklyCapacityHours = b.weeklyCapacityHours;
  if (b.workingDays !== undefined) updates.workingDays = b.workingDays;
  if (b.timesheetDueDay !== undefined) updates.timesheetDueDay = b.timesheetDueDay;
  if (b.approvalMode !== undefined) updates.approvalMode = b.approvalMode;
  if (b.globalLockEnabled !== undefined) updates.globalLockEnabled = b.globalLockEnabled;
  if (b.lockBeforeDate !== undefined) updates.lockBeforeDate = b.lockBeforeDate || null;
  if (b.weekStartDay !== undefined) updates.weekStartDay = Number(b.weekStartDay);
  if (b.minSubmitHours !== undefined) updates.minSubmitHours = Number(b.minSubmitHours);
  if (b.approverRoutingMode !== undefined) updates.approverRoutingMode = String(b.approverRoutingMode);
  if (b.lockOnApprovalEnabled !== undefined) updates.lockOnApprovalEnabled = !!b.lockOnApprovalEnabled;
  if (b.statusLockEnabled !== undefined) updates.statusLockEnabled = !!b.statusLockEnabled;
  if (b.dateLockEditOverrideRoles !== undefined) updates.dateLockEditOverrideRoles = String(b.dateLockEditOverrideRoles);
  if (b.dateLockStatusOverrideRoles !== undefined) updates.dateLockStatusOverrideRoles = String(b.dateLockStatusOverrideRoles);
  // Configuration flexibility additions
  if (b.moduleEnabled !== undefined) updates.moduleEnabled = !!b.moduleEnabled;
  if (b.timesheetDueTime !== undefined) updates.timesheetDueTime = String(b.timesheetDueTime);
  if (b.reminderDaysBefore !== undefined) updates.reminderDaysBefore = Number(b.reminderDaysBefore);
  if (b.reminderDaysAfter !== undefined) updates.reminderDaysAfter = Number(b.reminderDaysAfter);
  if (b.trackTimeAgainst !== undefined) updates.trackTimeAgainst = String(b.trackTimeAgainst);
  if (b.reportingScope !== undefined) updates.reportingScope = String(b.reportingScope);
  if (b.maxSubmitHours !== undefined) updates.maxSubmitHours = b.maxSubmitHours === null || b.maxSubmitHours === "" ? null : Number(b.maxSubmitHours);
  if (b.exactSubmitHours !== undefined) updates.exactSubmitHours = b.exactSubmitHours === null || b.exactSubmitHours === "" ? null : Number(b.exactSubmitHours);
  if (b.defaultBillable !== undefined) updates.defaultBillable = !!b.defaultBillable;
  if (b.rejectedHoursBehavior !== undefined) updates.rejectedHoursBehavior = String(b.rejectedHoursBehavior);

  const existing = await db.select().from(timeSettingsTable).limit(1);
  let row;
  if (existing.length === 0) {
    [row] = await db.insert(timeSettingsTable).values(updates as any).returning();
  } else {
    [row] = await db.update(timeSettingsTable).set(updates as any).where(eq(timeSettingsTable.id, existing[0].id)).returning();
  }
  res.json(mapTimeSettings(row));
});

export default router;
