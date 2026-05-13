/**
 * PM-17 — RAID Log (Risks, Assumptions, Issues, Decisions).
 * Full CRUD scoped to a project.
 */

import { Router, type IRouter } from "express";
import { db, projectRisksTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod/v4";
import { requirePM } from "../middleware/rbac";
import { logAudit } from "../lib/audit";
import type { AuthenticatedRequest } from "../middleware/roleClaim";

const router: IRouter = Router();

const RAID_TYPES = ["Risk", "Assumption", "Issue", "Decision"] as const;

const CreateRiskBody = z.object({
  projectId: z.number().int().positive(),
  type: z.enum(RAID_TYPES).default("Risk"),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  probability: z.string().optional(),
  impact: z.string().optional(),
  mitigation: z.string().optional(),
  status: z.string().optional(),
  ownerId: z.number().int().positive().optional(),
  targetDate: z.string().optional(),
});

const UpdateRiskBody = z.object({
  type: z.enum(RAID_TYPES).optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  probability: z.string().nullable().optional(),
  impact: z.string().nullable().optional(),
  mitigation: z.string().nullable().optional(),
  status: z.string().optional(),
  ownerId: z.number().int().positive().nullable().optional(),
  targetDate: z.string().nullable().optional(),
});

function mapRisk(r: typeof projectRisksTable.$inferSelect) {
  return {
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

// GET /projects/:projectId/risks  — list RAID items for a project (optionally filter by type)
router.get("/projects/:projectId/risks", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId, 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }
  const typeFilter = typeof req.query.type === "string" ? req.query.type : undefined;
  const conditions = [eq(projectRisksTable.projectId, projectId)];
  if (typeFilter && RAID_TYPES.includes(typeFilter as any)) {
    conditions.push(eq(projectRisksTable.type, typeFilter));
  }
  const rows = await db
    .select()
    .from(projectRisksTable)
    .where(and(...conditions))
    .orderBy(desc(projectRisksTable.createdAt));
  res.json(rows.map(mapRisk));
});

// POST /project-risks  — create a new RAID item
router.post("/project-risks", requirePM, async (req, res): Promise<void> => {
  const parsed = CreateRiskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const authReq = req as AuthenticatedRequest;
  const [row] = await db
    .insert(projectRisksTable)
    .values({ ...parsed.data, createdByUserId: authReq.authUserId } as any)
    .returning();
  await logAudit({
    entityType: "project_risk",
    entityId: row.id,
    action: "created",
    actorUserId: authReq.authUserId,
    description: `[${row.type}] "${row.title}" created on project ${row.projectId}`,
  });
  res.status(201).json(mapRisk(row));
});

// PATCH /project-risks/:id  — update a RAID item
router.patch("/project-risks/:id", requirePM, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid risk id" }); return; }
  const parsed = UpdateRiskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [existing] = await db.select().from(projectRisksTable).where(eq(projectRisksTable.id, id));
  if (!existing) { res.status(404).json({ error: "RAID item not found" }); return; }
  const [row] = await db
    .update(projectRisksTable)
    .set({ ...parsed.data as any, updatedAt: new Date() })
    .where(eq(projectRisksTable.id, id))
    .returning();
  const authReq = req as AuthenticatedRequest;
  await logAudit({
    entityType: "project_risk",
    entityId: row.id,
    action: "updated",
    actorUserId: authReq.authUserId,
    description: `[${row.type}] "${row.title}" updated`,
  });
  res.json(mapRisk(row));
});

// DELETE /project-risks/:id
router.delete("/project-risks/:id", requirePM, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid risk id" }); return; }
  const [row] = await db.delete(projectRisksTable).where(eq(projectRisksTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "RAID item not found" }); return; }
  const authReq = req as AuthenticatedRequest;
  await logAudit({
    entityType: "project_risk",
    entityId: id,
    action: "deleted",
    actorUserId: authReq.authUserId,
    description: `[${row.type}] "${row.title}" deleted`,
  });
  res.sendStatus(204);
});

export default router;
