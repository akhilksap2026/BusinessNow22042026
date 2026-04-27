import { Router } from "express";
import { db, documentsTable, documentVersionsTable, documentTemplatesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

// Roles that can see and manage private-space documents.
const PRIVILEGED_ROLES = new Set(["Admin", "PM", "Super User", "Finance", "Developer", "Designer", "QA"]);

function canSeePrivateDocs(role: string): boolean {
  return PRIVILEGED_ROLES.has(role);
}

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
  const role = (req.headers["x-user-role"] as string) ?? "Viewer";
  const rows = await db.select().from(documentsTable)
    .where(eq(documentsTable.projectId, projectId))
    .orderBy(desc(documentsTable.updatedAt));
  const filtered = canSeePrivateDocs(role) ? rows : rows.filter(r => r.spaceType !== "private");
  return res.json(filtered.map(mapDoc));
});

router.post("/documents", async (req, res) => {
  const role = (req.headers["x-user-role"] as string) ?? "Viewer";
  const { projectId, name, spaceType, documentType, content, createdByUserId } = req.body;
  if (!projectId || !name) return res.status(400).json({ error: "projectId and name required" });
  const resolvedSpaceType = spaceType || "private";
  if (resolvedSpaceType === "private" && !canSeePrivateDocs(role)) {
    return res.status(403).json({ error: "Insufficient permissions to create private documents" });
  }
  const [row] = await db.insert(documentsTable).values({
    projectId: Number(projectId),
    name,
    spaceType: resolvedSpaceType,
    documentType: documentType || "rich_text",
    content: content || "",
    createdByUserId: createdByUserId ? Number(createdByUserId) : null,
  }).returning();
  return res.status(201).json(mapDoc(row));
});

router.get("/documents/:id", async (req, res) => {
  const id = Number(req.params.id);
  const role = (req.headers["x-user-role"] as string) ?? "Viewer";
  const [row] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
  if (!row) return res.status(404).json({ error: "Not found" });
  if (row.spaceType === "private" && !canSeePrivateDocs(role)) {
    return res.status(403).json({ error: "This document is private" });
  }
  return res.json(mapDoc(row));
});

router.patch("/documents/:id", async (req, res) => {
  const id = Number(req.params.id);
  const role = (req.headers["x-user-role"] as string) ?? "Viewer";
  const { name, content, approvalStatus } = req.body;

  const [existing] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (existing.spaceType === "private" && !canSeePrivateDocs(role)) {
    return res.status(403).json({ error: "This document is private" });
  }

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
  const role = (req.headers["x-user-role"] as string) ?? "Viewer";
  const [existing] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (existing.spaceType === "private" && !canSeePrivateDocs(role)) {
    return res.status(403).json({ error: "This document is private" });
  }
  await db.delete(documentVersionsTable).where(eq(documentVersionsTable.documentId, id));
  await db.delete(documentsTable).where(eq(documentsTable.id, id));
  return res.status(204).send();
});

// ── Document templates (admin-managed, project-agnostic) ─────────────────
//
// Templates let admins seed reusable document content (SOWs, kickoff docs,
// status report skeletons, etc.). When a PM creates a project document
// they can pick a template, and the new document is initialised with the
// template's content + documentType.
function mapTemplate(row: typeof documentTemplatesTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    documentType: row.documentType,
    content: row.content,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

router.get("/document-templates", async (_req, res) => {
  const rows = await db.select().from(documentTemplatesTable).orderBy(desc(documentTemplatesTable.updatedAt));
  return res.json(rows.map(mapTemplate));
});

router.post("/document-templates", async (req, res) => {
  const role = (req.headers["x-user-role"] as string) ?? "Viewer";
  // Admins manage the template library — everyone else is read-only.
  if (role !== "Admin" && role !== "account_admin") return res.status(403).json({ error: "Admin access required" });
  const { name, description, documentType, content, createdByUserId } = req.body ?? {};
  if (!name) return res.status(400).json({ error: "name required" });
  const [row] = await db.insert(documentTemplatesTable).values({
    name: String(name),
    description: description ?? null,
    documentType: documentType || "rich_text",
    content: content ?? "",
    createdByUserId: createdByUserId ? Number(createdByUserId) : null,
  }).returning();
  return res.status(201).json(mapTemplate(row));
});

router.patch("/document-templates/:id", async (req, res) => {
  const role = (req.headers["x-user-role"] as string) ?? "Viewer";
  if (role !== "Admin" && role !== "account_admin") return res.status(403).json({ error: "Admin access required" });
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const { name, description, documentType, content } = req.body ?? {};
  const updates: Partial<typeof documentTemplatesTable.$inferInsert> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = String(name);
  if (description !== undefined) updates.description = description;
  if (documentType !== undefined) updates.documentType = String(documentType);
  if (content !== undefined) updates.content = content;
  const [row] = await db.update(documentTemplatesTable).set(updates).where(eq(documentTemplatesTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(mapTemplate(row));
});

router.delete("/document-templates/:id", async (req, res) => {
  const role = (req.headers["x-user-role"] as string) ?? "Viewer";
  if (role !== "Admin" && role !== "account_admin") return res.status(403).json({ error: "Admin access required" });
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  await db.delete(documentTemplatesTable).where(eq(documentTemplatesTable.id, id));
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
