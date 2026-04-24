import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, rateCardsTable } from "@workspace/db";
import {
  ListRateCardsResponse,
  CreateRateCardBody,
  UpdateRateCardParams,
  UpdateRateCardBody,
  UpdateRateCardResponse,
  DeleteRateCardParams,
} from "@workspace/api-zod";
import { requireCostRateAccess, requireAdmin } from "../middleware/rbac";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

function mapRateCard(r: typeof rateCardsTable.$inferSelect) {
  return {
    ...r,
    defaultRate: r.defaultRate != null ? Number(r.defaultRate) : null,
    roles: (r.roles as { role: string; rate: number }[]) ?? [],
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

// Cost rates visible to Admin, Finance and PM only — Super User excluded per spec.
router.get("/rate-cards", requireCostRateAccess, async (_req, res): Promise<void> => {
  const rows = await db.select().from(rateCardsTable).orderBy(rateCardsTable.name);
  res.json(ListRateCardsResponse.parse(rows.map(mapRateCard)));
});

router.post("/rate-cards", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateRateCardBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(rateCardsTable).values(parsed.data as any).returning();
  await logAudit({
    entityType: "rate_card",
    entityId: row.id,
    action: "created",
    actorUserId: Number(req.headers["x-user-id"] ?? 0) || undefined,
    description: `Rate card "${row.name}" created`,
    newValue: { name: row.name, defaultRate: row.defaultRate },
  });
  res.status(201).json(mapRateCard(row));
});

router.patch("/rate-cards/:id", requireCostRateAccess, async (req, res): Promise<void> => {
  const params = UpdateRateCardParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateRateCardBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [previous] = await db.select().from(rateCardsTable).where(eq(rateCardsTable.id, params.data.id));
  const [row] = await db.update(rateCardsTable).set(parsed.data as any).where(eq(rateCardsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Rate card not found" }); return; }
  await logAudit({
    entityType: "rate_card",
    entityId: row.id,
    action: "updated",
    actorUserId: Number(req.headers["x-user-id"] ?? 0) || undefined,
    description: `Rate card "${row.name}" updated`,
    previousValue: previous ? { defaultRate: previous.defaultRate, roles: previous.roles } : undefined,
    newValue: { defaultRate: row.defaultRate, roles: row.roles },
  });
  res.json(UpdateRateCardResponse.parse(mapRateCard(row)));
});

router.delete("/rate-cards/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteRateCardParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [previous] = await db.select().from(rateCardsTable).where(eq(rateCardsTable.id, params.data.id));
  await db.delete(rateCardsTable).where(eq(rateCardsTable.id, params.data.id));
  if (previous) {
    await logAudit({
      entityType: "rate_card",
      entityId: previous.id,
      action: "deleted",
      actorUserId: Number(req.headers["x-user-id"] ?? 0) || undefined,
      description: `Rate card "${previous.name}" deleted`,
    });
  }
  res.sendStatus(204);
});

export default router;
