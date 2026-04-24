import { Router } from "express";
import { db, formsTable, formFieldsTable, formResponsesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requirePM } from "../middleware/rbac";

const router = Router();

function mapForm(row: typeof formsTable.$inferSelect) {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
    submissionCount: row.submissionCount,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapField(row: typeof formFieldsTable.$inferSelect) {
  return {
    id: row.id,
    formId: row.formId,
    label: row.label,
    fieldType: row.fieldType,
    isRequired: row.isRequired,
    options: (row.options as string[]) || [],
    order: row.order,
    createdAt: row.createdAt,
  };
}

router.get("/forms", async (req, res) => {
  const projectId = Number(req.query.projectId);
  if (!projectId) return res.status(400).json({ error: "projectId required" });
  const rows = await db.select().from(formsTable)
    .where(eq(formsTable.projectId, projectId))
    .orderBy(desc(formsTable.createdAt));
  return res.json(rows.map(mapForm));
});

router.post("/forms", requirePM, async (req, res) => {
  const { projectId, name, description, createdByUserId } = req.body;
  if (!projectId || !name) return res.status(400).json({ error: "projectId and name required" });
  const [row] = await db.insert(formsTable).values({
    projectId: Number(projectId),
    name,
    description: description || null,
    createdByUserId: createdByUserId ? Number(createdByUserId) : null,
  }).returning();
  return res.status(201).json(mapForm(row));
});

router.get("/forms/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [form] = await db.select().from(formsTable).where(eq(formsTable.id, id));
  if (!form) return res.status(404).json({ error: "Not found" });
  const fields = await db.select().from(formFieldsTable)
    .where(eq(formFieldsTable.formId, id))
    .orderBy(formFieldsTable.order);
  return res.json({ ...mapForm(form), fields: fields.map(mapField) });
});

router.delete("/forms/:id", requirePM, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(formResponsesTable).where(eq(formResponsesTable.formId, id));
  await db.delete(formFieldsTable).where(eq(formFieldsTable.formId, id));
  await db.delete(formsTable).where(eq(formsTable.id, id));
  return res.status(204).send();
});

router.post("/forms/:id/fields", requirePM, async (req, res) => {
  const formId = Number(req.params.id);
  const { label, fieldType, isRequired, options, order } = req.body;
  if (!label || !fieldType) return res.status(400).json({ error: "label and fieldType required" });
  const [row] = await db.insert(formFieldsTable).values({
    formId,
    label,
    fieldType,
    isRequired: isRequired === true || isRequired === "true",
    options: options || [],
    order: order !== undefined ? Number(order) : 0,
  }).returning();
  return res.status(201).json(mapField(row));
});

router.delete("/forms/:id/fields/:fieldId", requirePM, async (req, res) => {
  const fieldId = Number(req.params.fieldId);
  await db.delete(formFieldsTable).where(eq(formFieldsTable.id, fieldId));
  return res.status(204).send();
});

router.get("/forms/:id/responses", async (req, res) => {
  const formId = Number(req.params.id);
  const rows = await db.select().from(formResponsesTable)
    .where(eq(formResponsesTable.formId, formId))
    .orderBy(desc(formResponsesTable.submittedAt));
  return res.json(rows.map((r: typeof formResponsesTable.$inferSelect) => ({
    id: r.id,
    formId: r.formId,
    submittedByUserId: r.submittedByUserId,
    submitterEmail: r.submitterEmail,
    responses: r.responses,
    submittedAt: r.submittedAt,
  })));
});

router.post("/forms/:id/responses", async (req, res) => {
  const formId = Number(req.params.id);
  const { submittedByUserId, submitterEmail, responses } = req.body;
  if (!responses) return res.status(400).json({ error: "responses required" });

  const [row] = await db.insert(formResponsesTable).values({
    formId,
    submittedByUserId: submittedByUserId ? Number(submittedByUserId) : null,
    submitterEmail: submitterEmail || null,
    responses,
  }).returning();

  const [existing] = await db.select().from(formsTable).where(eq(formsTable.id, formId));
  if (existing) {
    await db.update(formsTable)
      .set({ submissionCount: existing.submissionCount + 1 })
      .where(eq(formsTable.id, formId));
  }

  return res.status(201).json({
    id: row.id,
    formId: row.formId,
    submittedByUserId: row.submittedByUserId,
    submitterEmail: row.submitterEmail,
    responses: row.responses,
    submittedAt: row.submittedAt,
  });
});

export default router;
