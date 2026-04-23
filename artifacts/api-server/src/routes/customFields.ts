import { Router, type IRouter } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, customFieldDefinitionsTable, customFieldValuesTable, customFieldSectionsTable } from "@workspace/db";

const router: IRouter = Router();

function mapDef(r: typeof customFieldDefinitionsTable.$inferSelect) {
  return {
    ...r,
    isRequired: Boolean(r.isRequired),
    options: (r.options as string[]) ?? [],
    sectionId: r.sectionId ?? null,
    populationMethod: r.populationMethod ?? "manual",
    inheritFromEntity: r.inheritFromEntity ?? null,
    inheritFromFieldId: r.inheritFromFieldId ?? null,
    fallbackValue: r.fallbackValue ?? null,
    description: r.description ?? null,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  };
}

function mapSection(r: typeof customFieldSectionsTable.$inferSelect) {
  return {
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
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
  const b = req.body ?? {};
  if (!b.entityType || !b.name || !b.fieldType) { res.status(400).json({ error: "entityType, name and fieldType required" }); return; }
  const [row] = await db.insert(customFieldDefinitionsTable).values({
    entityType: b.entityType, name: b.name, fieldType: b.fieldType,
    isRequired: b.isRequired ?? false,
    options: b.options ?? [],
    order: b.order ?? 0,
    isActive: b.isActive ?? 1,
    description: b.description ?? null,
    sectionId: b.sectionId === null || b.sectionId === undefined ? null : Number(b.sectionId),
    populationMethod: b.populationMethod ?? "manual",
    inheritFromEntity: b.inheritFromEntity ?? null,
    inheritFromFieldId: b.inheritFromFieldId === null || b.inheritFromFieldId === undefined ? null : Number(b.inheritFromFieldId),
    fallbackValue: b.fallbackValue ?? null,
  } as any).returning();
  res.status(201).json(mapDef(row));
});

router.put("/custom-field-definitions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const b = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (b.entityType !== undefined) updates.entityType = b.entityType;
  if (b.name !== undefined) updates.name = b.name;
  if (b.fieldType !== undefined) updates.fieldType = b.fieldType;
  if (b.isRequired !== undefined) updates.isRequired = b.isRequired;
  if (b.options !== undefined) updates.options = b.options;
  if (b.order !== undefined) updates.order = b.order;
  if (b.isActive !== undefined) updates.isActive = b.isActive;
  if (b.description !== undefined) updates.description = b.description;
  if (b.sectionId !== undefined) updates.sectionId = b.sectionId === null ? null : Number(b.sectionId);
  if (b.populationMethod !== undefined) updates.populationMethod = b.populationMethod;
  if (b.inheritFromEntity !== undefined) updates.inheritFromEntity = b.inheritFromEntity || null;
  if (b.inheritFromFieldId !== undefined) updates.inheritFromFieldId = b.inheritFromFieldId === null ? null : Number(b.inheritFromFieldId);
  if (b.fallbackValue !== undefined) updates.fallbackValue = b.fallbackValue === null ? null : String(b.fallbackValue);
  const [row] = await db.update(customFieldDefinitionsTable).set(updates as any).where(eq(customFieldDefinitionsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapDef(row));
});

// ─── Custom Field Sections ───────────────────────────────────────────────────
router.get("/custom-field-sections", async (req, res): Promise<void> => {
  const { entityType } = req.query as Record<string, string>;
  const rows = entityType
    ? await db.select().from(customFieldSectionsTable).where(eq(customFieldSectionsTable.entityType, entityType)).orderBy(asc(customFieldSectionsTable.sortOrder), asc(customFieldSectionsTable.id))
    : await db.select().from(customFieldSectionsTable).orderBy(asc(customFieldSectionsTable.entityType), asc(customFieldSectionsTable.sortOrder));
  res.json(rows.map(mapSection));
});

router.post("/custom-field-sections", async (req, res): Promise<void> => {
  const b = req.body ?? {};
  if (!b.entityType || !b.name) { res.status(400).json({ error: "entityType and name required" }); return; }
  // Append at end if no sortOrder supplied
  let nextOrder = b.sortOrder;
  if (nextOrder === undefined) {
    const existing = await db.select().from(customFieldSectionsTable).where(eq(customFieldSectionsTable.entityType, b.entityType));
    nextOrder = existing.reduce((m, r) => Math.max(m, r.sortOrder ?? 0), 0) + 1;
  }
  const [row] = await db.insert(customFieldSectionsTable).values({
    entityType: b.entityType,
    name: b.name,
    description: b.description ?? null,
    sortOrder: Number(nextOrder),
    viewRoles: b.viewRoles ?? "",
    editRoles: b.editRoles ?? "",
    isActive: b.isActive === undefined ? true : !!b.isActive,
  } as any).returning();
  res.status(201).json(mapSection(row));
});

router.put("/custom-field-sections/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const b = req.body ?? {};
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (b.name !== undefined) updates.name = b.name;
  if (b.description !== undefined) updates.description = b.description;
  if (b.sortOrder !== undefined) updates.sortOrder = Number(b.sortOrder);
  if (b.viewRoles !== undefined) updates.viewRoles = String(b.viewRoles);
  if (b.editRoles !== undefined) updates.editRoles = String(b.editRoles);
  if (b.isActive !== undefined) updates.isActive = !!b.isActive;
  const [row] = await db.update(customFieldSectionsTable).set(updates as any).where(eq(customFieldSectionsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapSection(row));
});

router.delete("/custom-field-sections/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  // Detach fields that reference this section (set sectionId=null)
  await db.update(customFieldDefinitionsTable).set({ sectionId: null } as any).where(eq(customFieldDefinitionsTable.sectionId, id));
  await db.delete(customFieldSectionsTable).where(eq(customFieldSectionsTable.id, id));
  res.sendStatus(204);
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
