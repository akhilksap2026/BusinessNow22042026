import { Router, type IRouter } from "express";
import { db, revenueEntriesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  ListRevenueEntriesQueryParams,
  CreateRevenueEntryBody,
  DeleteRevenueEntryParams,
} from "@workspace/api-zod";
import { z } from "zod";
import { requireFinance } from "../middleware/rbac";

const UpdateRevenueEntryBody = z.object({
  period: z.string().optional(),
  amount: z.number().optional(),
  method: z.string().optional(),
  notes: z.string().nullable().optional(),
  recognizedAt: z.string().optional(),
});

const router: IRouter = Router();

function mapEntry(r: typeof revenueEntriesTable.$inferSelect) {
  return {
    ...r,
    amount: Number(r.amount),
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  };
}

router.get("/revenue-entries", requireFinance, async (req, res): Promise<void> => {
  const qp = ListRevenueEntriesQueryParams.safeParse(req.query);
  let rows;
  if (qp.success && qp.data.projectId) {
    rows = await db.select().from(revenueEntriesTable).where(eq(revenueEntriesTable.projectId, qp.data.projectId));
  } else {
    rows = await db.select().from(revenueEntriesTable);
  }
  res.json(rows.map(mapEntry));
});

router.post("/revenue-entries", requireFinance, async (req, res): Promise<void> => {
  const parsed = CreateRevenueEntryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(revenueEntriesTable).values(parsed.data as any).returning();
  res.status(201).json(mapEntry(row));
});

router.patch("/revenue-entries/:id", requireFinance, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateRevenueEntryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updates: any = { ...parsed.data };
  if (updates.amount !== undefined) updates.amount = String(updates.amount);
  const [row] = await db.update(revenueEntriesTable).set(updates).where(eq(revenueEntriesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Revenue entry not found" }); return; }
  res.json(mapEntry(row));
});

router.delete("/revenue-entries/:id", requireFinance, async (req, res): Promise<void> => {
  const params = DeleteRevenueEntryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(revenueEntriesTable).where(eq(revenueEntriesTable.id, params.data.id));
  res.status(204).send();
});

router.get("/reports/revenue-by-period", requireFinance, async (_req, res): Promise<void> => {
  const entries = await db.select().from(revenueEntriesTable);

  const periodMap = new Map<string, { total: number; byMethod: Record<string, number> }>();
  const methodSet = new Set<string>();

  for (const e of entries) {
    const amt = Number(e.amount);
    const period = e.period;
    const method = e.method;
    methodSet.add(method);

    if (!periodMap.has(period)) {
      periodMap.set(period, { total: 0, byMethod: {} });
    }
    const p = periodMap.get(period)!;
    p.total += amt;
    p.byMethod[method] = (p.byMethod[method] || 0) + amt;
  }

  const periods = Array.from(periodMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => ({ period, total: Math.round(data.total * 100) / 100, byMethod: data.byMethod }));

  const totalRecognized = entries.reduce((s, e) => s + Number(e.amount), 0);

  res.json({
    periods,
    totalRecognized: Math.round(totalRecognized * 100) / 100,
    methods: Array.from(methodSet),
  });
});

export default router;
