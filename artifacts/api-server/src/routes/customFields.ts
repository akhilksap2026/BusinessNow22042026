import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, customFieldDefinitionsTable, customFieldValuesTable } from "@workspace/db";

const router: IRouter = Router();

function mapDef(r: typeof customFieldDefinitionsTable.$inferSelect) {
  return {
    ...r,
    isRequired: Boolean(r.isRequired),
    options: (r.options as string[]) ?? [],
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  };
}

function mapVal(r: typeof customFieldValuesTable.$inferSelect) {
  return {
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

router.get("/custom-field-definitions", async (req, res): Promise<void> => {
  const { entityType } = req.query as Record<string, string>;
  const rows = entityType
    ? await db.select().from(customFieldDefinitionsTable).where(eq(customFieldDefinitionsTable.entityType, entityType))
    : await db.select().from(customFieldDefinitionsTable);
  res.json(rows.map(mapDef));
});

router.post("/custom-field-definitions", async (req, res): Promise<void> => {
  const { entityType, name, fieldType, isRequired, options, order, isActive } = req.body;
  if (!entityType || !name || !fieldType) { res.status(400).json({ error: "entityType, name and fieldType required" }); return; }
  const [row] = await db.insert(customFieldDefinitionsTable).values({
    entityType, name, fieldType,
    isRequired: isRequired ?? false,
    options: options ?? [],
    order: order ?? 0,
    isActive: isActive ?? 1,
  } as any).returning();
  res.status(201).json(mapDef(row));
});

router.put("/custom-field-definitions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { entityType, name, fieldType, isRequired, options, order, isActive } = req.body;
  const updates: Record<string, unknown> = {};
  if (entityType !== undefined) updates.entityType = entityType;
  if (name !== undefined) updates.name = name;
  if (fieldType !== undefined) updates.fieldType = fieldType;
  if (isRequired !== undefined) updates.isRequired = isRequired;
  if (options !== undefined) updates.options = options;
  if (order !== undefined) updates.order = order;
  if (isActive !== undefined) updates.isActive = isActive;
  const [row] = await db.update(customFieldDefinitionsTable).set(updates as any).where(eq(customFieldDefinitionsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapDef(row));
});

router.delete("/custom-field-definitions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(customFieldDefinitionsTable).where(eq(customFieldDefinitionsTable.id, id));
  res.sendStatus(204);
});

router.get("/custom-field-values", async (req, res): Promise<void> => {
  const { entityType, entityId } = req.query as Record<string, string>;
  if (!entityType || !entityId) { res.status(400).json({ error: "entityType and entityId required" }); return; }
  const eid = parseInt(entityId, 10);
  if (isNaN(eid)) { res.status(400).json({ error: "Invalid entityId" }); return; }
  const rows = await db.select().from(customFieldValuesTable).where(
    and(eq(customFieldValuesTable.entityType, entityType), eq(customFieldValuesTable.entityId, eid))
  );
  res.json(rows.map(mapVal));
});

router.put("/custom-field-values", async (req, res): Promise<void> => {
  const { fieldDefinitionId, entityType, entityId, value } = req.body;
  if (!fieldDefinitionId || !entityType || entityId === undefined) { res.status(400).json({ error: "fieldDefinitionId, entityType and entityId required" }); return; }
  const eid = typeof entityId === "string" ? parseInt(entityId, 10) : entityId;
  const existing = await db.select().from(customFieldValuesTable).where(
    and(
      eq(customFieldValuesTable.fieldDefinitionId, fieldDefinitionId),
      eq(customFieldValuesTable.entityType, entityType),
      eq(customFieldValuesTable.entityId, eid)
    )
  );
  const now = new Date();
  let row;
  if (existing.length > 0) {
    [row] = await db.update(customFieldValuesTable)
      .set({ value: value ?? null, updatedAt: now })
      .where(eq(customFieldValuesTable.id, existing[0].id))
      .returning();
  } else {
    [row] = await db.insert(customFieldValuesTable)
      .values({ fieldDefinitionId, entityType, entityId: eid, value: value ?? null })
      .returning();
  }
  res.json(mapVal(row));
});

export default router;
