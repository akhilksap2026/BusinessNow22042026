import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, phasesTable } from "@workspace/db";
import {
  ListPhasesQueryParams,
  ListPhasesResponse,
  CreatePhaseBody,
  GetPhaseParams,
  GetPhaseResponse,
  UpdatePhaseParams,
  UpdatePhaseBody,
  UpdatePhaseResponse,
  DeletePhaseParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapPhase(p: typeof phasesTable.$inferSelect) {
  return {
    ...p,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
  };
}

router.get("/phases", async (req, res): Promise<void> => {
  const qp = ListPhasesQueryParams.safeParse(req.query);
  if (!qp.success) { res.status(400).json({ error: qp.error.message }); return; }
  const rows = await db.select().from(phasesTable).where(eq(phasesTable.projectId, qp.data.projectId));
  res.json(ListPhasesResponse.parse(rows.map(mapPhase)));
});

router.post("/phases", async (req, res): Promise<void> => {
  const parsed = CreatePhaseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(phasesTable).values(parsed.data as any).returning();
  res.status(201).json(GetPhaseResponse.parse(mapPhase(row)));
});

router.get("/phases/:id", async (req, res): Promise<void> => {
  const params = GetPhaseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.select().from(phasesTable).where(eq(phasesTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Phase not found" }); return; }
  res.json(GetPhaseResponse.parse(mapPhase(row)));
});

router.patch("/phases/:id", async (req, res): Promise<void> => {
  const params = UpdatePhaseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdatePhaseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(phasesTable).set(parsed.data as any).where(eq(phasesTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Phase not found" }); return; }
  res.json(UpdatePhaseResponse.parse(mapPhase(row)));
});

router.delete("/phases/:id", async (req, res): Promise<void> => {
  const params = DeletePhaseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(phasesTable).where(eq(phasesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
