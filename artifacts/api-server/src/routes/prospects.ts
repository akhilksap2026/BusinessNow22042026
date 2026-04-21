import { Router } from "express";
import { db, prospectsTable, accountsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

function mapProspect(row: typeof prospectsTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    status: row.status,
    source: row.source,
    estimatedValue: row.estimatedValue ? Number(row.estimatedValue) : null,
    notes: row.notes,
    convertedAccountId: row.convertedAccountId,
    convertedAt: row.convertedAt,
    ownerId: row.ownerId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

router.get("/prospects", async (req, res) => {
  const { status, ownerId } = req.query;
  let query = db.select().from(prospectsTable).$dynamic();
  if (status) query = query.where(eq(prospectsTable.status, status as string));
  const rows = await db.select().from(prospectsTable).orderBy(desc(prospectsTable.createdAt));
  const filtered = rows.filter(r => {
    if (status && r.status !== status) return false;
    if (ownerId && r.ownerId !== Number(ownerId)) return false;
    return true;
  });
  return res.json(filtered.map(mapProspect));
});

router.post("/prospects", async (req, res) => {
  const { name, contactName, contactEmail, contactPhone, status, source, estimatedValue, notes, ownerId } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  const [row] = await db.insert(prospectsTable).values({
    name,
    contactName: contactName || null,
    contactEmail: contactEmail || null,
    contactPhone: contactPhone || null,
    status: status || "New",
    source: source || null,
    estimatedValue: estimatedValue ? String(estimatedValue) : null,
    notes: notes || null,
    ownerId: ownerId ? Number(ownerId) : null,
  }).returning();
  return res.status(201).json(mapProspect(row));
});

router.get("/prospects/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.select().from(prospectsTable).where(eq(prospectsTable.id, id));
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(mapProspect(row));
});

router.patch("/prospects/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, contactName, contactEmail, contactPhone, status, source, estimatedValue, notes, ownerId } = req.body;
  const updates: Partial<typeof prospectsTable.$inferInsert> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (contactName !== undefined) updates.contactName = contactName;
  if (contactEmail !== undefined) updates.contactEmail = contactEmail;
  if (contactPhone !== undefined) updates.contactPhone = contactPhone;
  if (status !== undefined) updates.status = status;
  if (source !== undefined) updates.source = source;
  if (estimatedValue !== undefined) updates.estimatedValue = estimatedValue ? String(estimatedValue) : null;
  if (notes !== undefined) updates.notes = notes;
  if (ownerId !== undefined) updates.ownerId = ownerId ? Number(ownerId) : null;
  const [row] = await db.update(prospectsTable).set(updates).where(eq(prospectsTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(mapProspect(row));
});

router.delete("/prospects/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(prospectsTable).where(eq(prospectsTable.id, id));
  return res.status(204).send();
});

router.post("/prospects/:id/convert", async (req, res) => {
  const id = Number(req.params.id);
  const { tier, region, domain, contractValue } = req.body;
  if (!tier || !region || !domain) return res.status(400).json({ error: "tier, region, domain required" });

  const [prospect] = await db.select().from(prospectsTable).where(eq(prospectsTable.id, id));
  if (!prospect) return res.status(404).json({ error: "Prospect not found" });
  if (prospect.convertedAccountId) return res.status(400).json({ error: "Prospect already converted" });

  const [account] = await db.insert(accountsTable).values({
    name: prospect.name,
    domain,
    tier,
    region,
    status: "Active",
    contractValue: String(contractValue || 0),
    convertedFromProspectId: id,
  }).returning();

  await db.update(prospectsTable).set({
    status: "Converted",
    convertedAccountId: account.id,
    convertedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(prospectsTable.id, id));

  return res.json({ account, prospectId: id });
});

export default router;
