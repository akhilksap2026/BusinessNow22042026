import { Router, type IRouter } from "express";
import { db, resourceRequestsTable, resourceRequestCommentsTable, allocationsTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListResourceRequestsQueryParams,
  CreateResourceRequestBody,
  UpdateResourceRequestBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapRR(r: typeof resourceRequestsTable.$inferSelect) {
  return {
    ...r,
    hoursPerWeek: Number(r.hoursPerWeek),
    methodValue: r.methodValue !== null && r.methodValue !== undefined ? Number(r.methodValue) : null,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

function mapComment(c: typeof resourceRequestCommentsTable.$inferSelect) {
  return {
    ...c,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
  };
}

// Working-days counter for allocation creation
function workingDaysBetween(start: string, end: string): number {
  let count = 0;
  const cur = new Date(start);
  const endD = new Date(end);
  while (cur <= endD) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count || 1;
}

// ─── Resource Requests CRUD ───────────────────────────────────────────────────

router.get("/resource-requests", async (req, res): Promise<void> => {
  const qp = ListResourceRequestsQueryParams.safeParse(req.query);
  const conditions: any[] = [];
  if (qp.success) {
    if (qp.data.projectId) conditions.push(eq(resourceRequestsTable.projectId, qp.data.projectId));
    if (qp.data.status) conditions.push(eq(resourceRequestsTable.status, qp.data.status));
    if (qp.data.requestedByUserId) conditions.push(eq(resourceRequestsTable.requestedByUserId, qp.data.requestedByUserId));
  }
  const rows = conditions.length
    ? await db.select().from(resourceRequestsTable).where(and(...conditions))
    : await db.select().from(resourceRequestsTable);
  res.json(rows.map(mapRR));
});

router.post("/resource-requests", async (req, res): Promise<void> => {
  const parsed = CreateResourceRequestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { type, region, allocationMethod, methodValue, targetResourceId, ...rest } = req.body;
  const [row] = await db.insert(resourceRequestsTable).values({
    ...parsed.data,
    hoursPerWeek: String(parsed.data.hoursPerWeek),
    requiredSkills: parsed.data.requiredSkills ?? [],
    priority: parsed.data.priority ?? "Medium",
    type: type ?? "add_member",
    region: region ?? null,
    allocationMethod: allocationMethod ?? null,
    methodValue: methodValue !== undefined && methodValue !== null ? String(methodValue) : null,
    targetResourceId: targetResourceId ?? null,
  }).returning();
  res.status(201).json(mapRR(row));
});

router.patch("/resource-requests/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const parsed = UpdateResourceRequestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updates: any = { ...parsed.data, updatedAt: new Date() };
  if (updates.hoursPerWeek !== undefined) updates.hoursPerWeek = String(updates.hoursPerWeek);
  const extra = req.body as any;
  if (extra.type !== undefined) updates.type = extra.type;
  if (extra.region !== undefined) updates.region = extra.region;
  if (extra.allocationMethod !== undefined) updates.allocationMethod = extra.allocationMethod;
  if (extra.methodValue !== undefined) updates.methodValue = extra.methodValue !== null ? String(extra.methodValue) : null;
  if (extra.targetResourceId !== undefined) updates.targetResourceId = extra.targetResourceId;
  if (extra.approverId !== undefined) updates.approverId = extra.approverId;
  const [row] = await db.update(resourceRequestsTable).set(updates).where(eq(resourceRequestsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapRR(row));
});

router.delete("/resource-requests/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(resourceRequestCommentsTable).where(eq(resourceRequestCommentsTable.requestId, id));
  await db.delete(resourceRequestsTable).where(eq(resourceRequestsTable.id, id));
  res.status(204).end();
});

// ─── Status transitions ───────────────────────────────────────────────────────

router.patch("/resource-requests/:id/status", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { status, assignedUserId, rejectionReason, blockedReason, ignoresSoftAllocations } = req.body;
  if (!status) { res.status(400).json({ error: "status required" }); return; }

  const callerRole = (req.headers["x-user-role"] as string) ?? "";
  const isAdmin = callerRole === "Admin" || callerRole === "Super User";

  const [existing] = await db.select().from(resourceRequestsTable).where(eq(resourceRequestsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const updates: any = { status, updatedAt: new Date() };
  if (assignedUserId !== undefined) updates.assignedUserId = assignedUserId;
  if (rejectionReason !== undefined) updates.rejectionReason = rejectionReason;
  if (blockedReason !== undefined) updates.blockedReason = blockedReason;
  if (status === "Fulfilled" && assignedUserId) updates.fulfilledByUserId = assignedUserId;
  // On Approved or Fulfilled: record approver
  if ((status === "Approved" || status === "Fulfilled") && req.body.approverId) {
    updates.approverId = req.body.approverId;
  }

  const [row] = await db.update(resourceRequestsTable).set(updates).where(eq(resourceRequestsTable.id, id)).returning();

  // ── Auto-create allocation when request transitions to Fulfilled with an assigned user ──
  if (status === "Fulfilled" && assignedUserId && row) {
    try {
      const hpw = Number(row.hoursPerWeek);
      const days = workingDaysBetween(row.startDate, row.endDate);
      const hpd = Math.round((hpw / 5) * 100) / 100;
      const totalHours = Math.round(hpd * days * 100) / 100;
      await db.insert(allocationsTable).values({
        projectId: row.projectId,
        userId: assignedUserId,
        startDate: row.startDate,
        endDate: row.endDate,
        hoursPerWeek: String(hpw),
        hoursPerDay: String(hpd),
        totalHours: String(totalHours),
        allocationMethod: row.allocationMethod ?? "hours_per_week",
        methodValue: String(hpw),
        role: row.role,
        isSoftAllocation: false,
      } as any);
    } catch (e) {
      // Non-fatal — allocation creation failure should not block the status update response
      console.error("Auto-allocation creation failed:", e);
    }
  }

  // ── Notify requester on status change ──
  try {
    const notifyMessages: Record<string, string> = {
      Approved: `Your resource request for "${row.role}" on project #${row.projectId} has been approved.`,
      Fulfilled: `Your resource request for "${row.role}" on project #${row.projectId} has been fulfilled and an allocation has been created.`,
      Rejected: `Your resource request for "${row.role}" on project #${row.projectId} was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`,
      Blocked: `Your resource request for "${row.role}" on project #${row.projectId} is blocked pending further information.${blockedReason ? ` Reason: ${blockedReason}` : ""}`,
    };
    const msg = notifyMessages[status];
    if (msg) {
      await db.insert(notificationsTable).values({
        type: status === "Approved" || status === "Fulfilled" ? "task_assigned" : "project_alert",
        message: msg,
        userId: row.requestedByUserId,
        projectId: row.projectId,
        entityType: "resource_request",
        entityId: String(row.id),
      });
    }
  } catch (e) {
    console.error("Notification send failed:", e);
  }

  res.json(mapRR(row));
});

// ─── Comments (approver ↔ requester chat) ────────────────────────────────────

router.get("/resource-requests/:id/comments", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const rows = await db
    .select()
    .from(resourceRequestCommentsTable)
    .where(eq(resourceRequestCommentsTable.requestId, id));
  res.json(rows.map(mapComment));
});

router.post("/resource-requests/:id/comments", async (req, res): Promise<void> => {
  const requestId = parseInt(req.params.id, 10);
  const { userId, message } = req.body;
  if (!userId || !message) { res.status(400).json({ error: "userId and message required" }); return; }
  const [row] = await db.insert(resourceRequestCommentsTable).values({ requestId, userId, message }).returning();
  res.status(201).json(mapComment(row));
});

export default router;
