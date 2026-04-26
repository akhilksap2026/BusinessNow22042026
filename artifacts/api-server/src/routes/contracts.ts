import { Router, type IRouter } from "express";
import { db, contractsTable, projectsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requireFinance, requirePM } from "../middleware/rbac";

const router: IRouter = Router();

function mapContract(r: typeof contractsTable.$inferSelect) {
  return {
    ...r,
    value: r.value === null || r.value === undefined ? null : Number(r.value),
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

const CreateBody = z.object({
  projectId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  status: z.string().min(1).max(40).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  value: z.union([z.number(), z.string()]).nullable().optional(),
  documentUrl: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const UpdateBody = z.object({
  projectId: z.number().int().positive().optional(),
  name: z.string().min(1).max(200).optional(),
  status: z.string().min(1).max(40).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  value: z.union([z.number(), z.string()]).nullable().optional(),
  documentUrl: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

router.get("/contracts", requireFinance, async (_req, res): Promise<void> => {
  const rows = await db.select().from(contractsTable).orderBy(desc(contractsTable.createdAt));
  res.json(rows.map(mapContract));
});

router.post("/contracts", requireFinance, async (req, res): Promise<void> => {
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(eq(projectsTable.id, parsed.data.projectId));
  if (!project) {
    res.status(400).json({ error: `Project ${parsed.data.projectId} does not exist` });
    return;
  }
  const valueStr = parsed.data.value === null || parsed.data.value === undefined
    ? null
    : String(parsed.data.value);
  const [row] = await db
    .insert(contractsTable)
    .values({
      projectId: parsed.data.projectId,
      name: parsed.data.name,
      status: parsed.data.status ?? "Draft",
      startDate: parsed.data.startDate ?? null,
      endDate: parsed.data.endDate ?? null,
      value: valueStr,
      documentUrl: parsed.data.documentUrl ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning();
  res.status(201).json(mapContract(row));
});

router.patch("/contracts/:id", requireFinance, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Partial<typeof contractsTable.$inferInsert> = { updatedAt: new Date() };
  if (parsed.data.projectId !== undefined) updates.projectId = parsed.data.projectId;
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.startDate !== undefined) updates.startDate = parsed.data.startDate;
  if (parsed.data.endDate !== undefined) updates.endDate = parsed.data.endDate;
  if (parsed.data.value !== undefined) {
    updates.value = parsed.data.value === null ? null : String(parsed.data.value);
  }
  if (parsed.data.documentUrl !== undefined) updates.documentUrl = parsed.data.documentUrl;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
  const [row] = await db
    .update(contractsTable)
    .set(updates)
    .where(eq(contractsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Contract not found" });
    return;
  }
  res.json(mapContract(row));
});

router.delete("/contracts/:id", requirePM, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db.delete(contractsTable).where(eq(contractsTable.id, id)).returning();
  if (!row) {
    res.status(404).json({ error: "Contract not found" });
    return;
  }
  res.status(204).end();
});

export default router;
