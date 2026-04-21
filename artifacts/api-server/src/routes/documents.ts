import { Router } from "express";
import { db, documentsTable, documentVersionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

function mapDoc(row: typeof documentsTable.$inferSelect) {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    spaceType: row.spaceType,
    documentType: row.documentType,
    content: row.content,
    approvalStatus: row.approvalStatus,
    version: row.version,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

router.get("/documents", async (req, res) => {
  const projectId = Number(req.query.projectId);
  if (!projectId) return res.status(400).json({ error: "projectId required" });
  const rows = await db.select().from(documentsTable)
    .where(eq(documentsTable.projectId, projectId))
    .orderBy(desc(documentsTable.updatedAt));
  return res.json(rows.map(mapDoc));
});

router.post("/documents", async (req, res) => {
  const { projectId, name, spaceType, documentType, content, createdByUserId } = req.body;
  if (!projectId || !name) return res.status(400).json({ error: "projectId and name required" });
  const [row] = await db.insert(documentsTable).values({
    projectId: Number(projectId),
    name,
    spaceType: spaceType || "private",
    documentType: documentType || "rich_text",
    content: content || "",
    createdByUserId: createdByUserId ? Number(createdByUserId) : null,
  }).returning();
  return res.status(201).json(mapDoc(row));
});

router.get("/documents/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(mapDoc(row));
});

router.patch("/documents/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, content, approvalStatus } = req.body;

  const [existing] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
  if (!existing) return res.status(404).json({ error: "Not found" });

  const newVersion = existing.version + 1;

  await db.insert(documentVersionsTable).values({
    documentId: id,
    version: existing.version,
    content: existing.content,
    editedByUserId: null,
  });

  const updates: Partial<typeof documentsTable.$inferInsert> = {
    updatedAt: new Date(),
    version: newVersion,
  };
  if (name !== undefined) updates.name = name;
  if (content !== undefined) updates.content = content;
  if (approvalStatus !== undefined) updates.approvalStatus = approvalStatus;

  const [row] = await db.update(documentsTable).set(updates).where(eq(documentsTable.id, id)).returning();
  return res.json(mapDoc(row));
});

router.delete("/documents/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(documentVersionsTable).where(eq(documentVersionsTable.documentId, id));
  await db.delete(documentsTable).where(eq(documentsTable.id, id));
  return res.status(204).send();
});

router.get("/documents/:id/versions", async (req, res) => {
  const id = Number(req.params.id);
  const rows = await db.select().from(documentVersionsTable)
    .where(eq(documentVersionsTable.documentId, id))
    .orderBy(desc(documentVersionsTable.version));
  return res.json(rows.map((r: typeof documentVersionsTable.$inferSelect) => ({
    id: r.id,
    documentId: r.documentId,
    version: r.version,
    content: r.content,
    editedByUserId: r.editedByUserId,
    createdAt: r.createdAt,
  })));
});

export default router;
