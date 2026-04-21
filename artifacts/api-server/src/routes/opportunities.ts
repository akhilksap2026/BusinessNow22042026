import { Router } from "express";
import { db, opportunitiesTable, projectsTable, accountsTable, usersTable, allocationsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requirePM } from "../middleware/rbac";
import { logAudit } from "../lib/audit";

const router = Router();

const STAGE_PROBABILITY: Record<string, number> = {
  Discovery: 10,
  Qualified: 25,
  Proposal: 50,
  Negotiation: 75,
  Won: 100,
  Lost: 0,
};

async function mapOpportunity(row: typeof opportunitiesTable.$inferSelect) {
  let accountName: string | null = null;
  let ownerName: string | null = null;
  if (row.accountId) {
    const [acc] = await db.select().from(accountsTable).where(eq(accountsTable.id, row.accountId));
    accountName = acc?.name ?? null;
  }
  if (row.ownerId) {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, row.ownerId));
    ownerName = u?.name ?? null;
  }
  return {
    id: row.id,
    accountId: row.accountId,
    name: row.name,
    stage: row.stage,
    probability: row.probability,
    value: Number(row.value),
    description: row.description,
    closeDate: row.closeDate,
    ownerId: row.ownerId,
    projectId: row.projectId,
    accountName,
    ownerName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

router.get("/opportunities", async (req, res) => {
  const { accountId, stage, ownerId } = req.query;
  const rows = await db.select().from(opportunitiesTable).orderBy(desc(opportunitiesTable.createdAt));
  const filtered = rows.filter(r => {
    if (accountId && r.accountId !== Number(accountId)) return false;
    if (stage && r.stage !== stage) return false;
    if (ownerId && r.ownerId !== Number(ownerId)) return false;
    return true;
  });
  const mapped = await Promise.all(filtered.map(mapOpportunity));
  return res.json(mapped);
});

router.post("/opportunities", requirePM, async (req, res) => {
  const { accountId, name, stage, probability, value, description, closeDate, ownerId } = req.body;
  if (!accountId || !name) return res.status(400).json({ error: "accountId and name required" });
  const stg = stage || "Discovery";
  const prob = probability !== undefined ? Number(probability) : (STAGE_PROBABILITY[stg] ?? 10);
  const [row] = await db.insert(opportunitiesTable).values({
    accountId: Number(accountId),
    name,
    stage: stg,
    probability: prob,
    value: String(value || 0),
    description: description || null,
    closeDate: closeDate || null,
    ownerId: ownerId ? Number(ownerId) : null,
  }).returning();
  return res.status(201).json(await mapOpportunity(row));
});

router.get("/opportunities/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.select().from(opportunitiesTable).where(eq(opportunitiesTable.id, id));
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(await mapOpportunity(row));
});

router.patch("/opportunities/:id", requirePM, async (req, res) => {
  const id = Number(req.params.id);

  // Load existing for transition checks
  const [existing] = await db.select().from(opportunitiesTable).where(eq(opportunitiesTable.id, id));
  if (!existing) return res.status(404).json({ error: "Not found" });

  const { accountId, name, stage, probability, value, description, closeDate, ownerId } = req.body;
  const updates: Partial<typeof opportunitiesTable.$inferInsert> = { updatedAt: new Date() };
  if (accountId !== undefined) updates.accountId = Number(accountId);
  if (name !== undefined) updates.name = name;
  if (stage !== undefined) {
    updates.stage = stage;
    if (probability === undefined) updates.probability = STAGE_PROBABILITY[stage] ?? 10;
  }
  if (probability !== undefined) updates.probability = Number(probability);
  if (value !== undefined) updates.value = String(value);
  if (description !== undefined) updates.description = description;
  if (closeDate !== undefined) updates.closeDate = closeDate;
  if (ownerId !== undefined) updates.ownerId = ownerId ? Number(ownerId) : null;

  const [row] = await db.update(opportunitiesTable).set(updates).where(eq(opportunitiesTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });

  // Probability-triggered soft allocation: if probability crosses ≥70 threshold AND a project is linked
  const SOFT_ALLOC_THRESHOLD = 70;
  const wasBelow = (existing.probability ?? 0) < SOFT_ALLOC_THRESHOLD;
  const isNowAbove = (row.probability ?? 0) >= SOFT_ALLOC_THRESHOLD;
  if (wasBelow && isNowAbove && row.projectId && row.ownerId) {
    try {
      // Check for existing soft allocation for owner on this project
      const existingAllocs = await db.select().from(allocationsTable).where(
        and(eq(allocationsTable.projectId, row.projectId), eq(allocationsTable.userId, row.ownerId))
      );
      if (existingAllocs.length === 0) {
        const today = new Date().toISOString().slice(0, 10);
        const threeMonths = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
        await db.insert(allocationsTable).values({
          projectId: row.projectId,
          userId: row.ownerId,
          role: "Owner",
          startDate: today,
          endDate: threeMonths,
          hoursPerWeek: 20,
          isSoftAllocation: true,
        });
        await logAudit({
          entityType: "allocation",
          entityId: row.projectId,
          action: "created",
          description: `Soft allocation auto-created for opportunity "${row.name}" reaching ${row.probability}% probability`,
        });
      }
    } catch (err) {
      console.error("Soft alloc auto-creation failed:", err);
    }
  }

  // Audit stage/probability changes
  if (row.stage !== existing.stage || row.probability !== existing.probability) {
    await logAudit({
      entityType: "opportunity",
      entityId: row.id,
      action: "updated",
      previousValue: { stage: existing.stage, probability: existing.probability },
      newValue: { stage: row.stage, probability: row.probability },
      description: `Opportunity "${row.name}" updated`,
    });
  }

  return res.json(await mapOpportunity(row));
});

router.delete("/opportunities/:id", requirePM, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(opportunitiesTable).where(eq(opportunitiesTable.id, id));
  return res.status(204).send();
});

router.post("/opportunities/:id/convert-to-project", requirePM, async (req, res) => {
  const id = Number(req.params.id);
  const { name, billingType, startDate, dueDate, ownerId } = req.body;
  if (!name || !startDate || !dueDate) return res.status(400).json({ error: "name, startDate, dueDate required" });

  const [opp] = await db.select().from(opportunitiesTable).where(eq(opportunitiesTable.id, id));
  if (!opp) return res.status(404).json({ error: "Opportunity not found" });

  const [project] = await db.insert(projectsTable).values({
    accountId: opp.accountId,
    name,
    status: "Not Started",
    ownerId: ownerId ? Number(ownerId) : (opp.ownerId ?? 1),
    startDate,
    dueDate,
    billingType: billingType || "Fixed Fee",
    budget: opp.value,
    internalExternal: "External",
    opportunityId: id,
  }).returning();

  await db.update(opportunitiesTable).set({
    stage: "Won",
    probability: 100,
    projectId: project.id,
    updatedAt: new Date(),
  }).where(eq(opportunitiesTable.id, id));

  return res.status(201).json({ project, opportunityId: id });
});

export default router;
