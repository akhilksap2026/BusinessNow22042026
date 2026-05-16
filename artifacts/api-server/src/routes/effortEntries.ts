/**
 * Time Tracking — Effort Entries API
 *
 * All routes are mounted under /api/time/*
 * Auth middleware (denyCustomerRole + verifyRoleClaim) applied globally upstream.
 *
 * IMPORTANT: static sub-paths (/submit, /weekly-view, etc.) must appear
 * BEFORE parameterised routes (/:id) to avoid Express mis-routing.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, inArray, sql, desc, asc, gte, lte, ilike, or } from "drizzle-orm";
import {
  db,
  effortEntriesTable,
  effortAuditLogTable,
  contractRulesTable,
  proxyDelegationsTable,
  notificationsTable,
  financialPeriodsTable,
  exceptionalEffortRulesTable,
  leaveTypesTable,
  projectsTable,
  tasksTable,
  allocationsTable,
  usersTable,
} from "@workspace/db";
import { requireAdmin, requireFinance } from "../middleware/rbac";
import type { AuthenticatedRequest } from "../middleware/roleClaim";
import { hasRole } from "../constants/roles";

import {
  validateEffortEntry,
  validateProxyAuthorization,
  validateExceptionalEffort,
  todayUTC,
  getWeekStart,
  type EffortEntryPayload,
} from "../lib/effortValidationService";
import {
  submitEffort,
  recallEffort,
  approveEffort,
  rejectEffort,
  resubmitEffort,
  markProcessed,
  EffortTransitionError,
} from "../lib/effortStatusService";
import {
  autoCategorizEntry,
  overrideBillableCategory,
  getBillableSummaryForWeek,
} from "../lib/billableCategorizationService";
import {
  getWeeklyTimesheetView,
  getInvoiceExtractionPayload,
} from "../lib/weeklyAggregationService";
import {
  replicatePreviousWeek,
  confirmReplicatedSubmission,
  validateConfirmationToken,
} from "../lib/effortReplicationService";

const router: IRouter = Router();

// ─── Error helper ─────────────────────────────────────────────────────────────

function apiErr(
  res: Response,
  status: number,
  code: string,
  message: string,
  fields?: { field: string; message: string }[],
): void {
  res.status(status).json({ error: { code, message, ...(fields ? { fields } : {}) } });
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function callerId(req: Request): number {
  const raw = req.headers["x-user-id"];
  return Number(Array.isArray(raw) ? raw[0] : raw) || 0;
}

function callerRole(req: Request): string {
  return String(req.headers["x-user-role"] ?? "");
}

function isApproverRole(req: Request): boolean {
  const role = callerRole(req);
  return hasRole(role, "super_user"); // account_admin + super_user
}

function isFinanceRole(req: Request): boolean {
  return hasRole(callerRole(req), "super_user");
}

// ─── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ────
// STATIC ROUTES FIRST — Express matches in registration order
// ─── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ────

// ─── GET /api/time/weekly-view ────────────────────────────────────────────────

router.get("/time/weekly-view", async (req: Request, res: Response): Promise<void> => {
  const resourceId = Number(req.query.resourceId);
  const weekStart  = String(req.query.weekStart ?? "");

  if (!resourceId || !weekStart) {
    apiErr(res, 400, "MISSING_PARAMS", "resourceId and weekStart are required."); return;
  }

  const uid = callerId(req);
  if (uid !== resourceId && !isApproverRole(req)) {
    apiErr(res, 403, "UNAUTHORIZED", "You can only view your own weekly timesheet."); return;
  }

  const view = await getWeeklyTimesheetView(resourceId, weekStart);
  res.json(view);
});

// ─── GET /api/time/weekly-summary ────────────────────────────────────────────

router.get("/time/weekly-summary", async (req: Request, res: Response): Promise<void> => {
  const resourceId = Number(req.query.resourceId);
  const weekStart  = String(req.query.weekStart ?? "");

  if (!resourceId || !weekStart) {
    apiErr(res, 400, "MISSING_PARAMS", "resourceId and weekStart are required."); return;
  }

  const uid = callerId(req);
  if (uid !== resourceId && !isApproverRole(req)) {
    apiErr(res, 403, "UNAUTHORIZED", "You can only view your own weekly summary."); return;
  }

  const summary = await getBillableSummaryForWeek(resourceId, weekStart);
  res.json(summary);
});

// ─── POST /api/time/replicate-week ────────────────────────────────────────────

router.post("/time/replicate-week", async (req: Request, res: Response): Promise<void> => {
  const { resourceId, currentWeekStart } = req.body ?? {};
  const uid = callerId(req);

  if (!resourceId || !currentWeekStart) {
    apiErr(res, 400, "MISSING_PARAMS", "resourceId and currentWeekStart are required."); return;
  }

  if (uid !== Number(resourceId) && !isApproverRole(req)) {
    apiErr(res, 403, "UNAUTHORIZED", "You may only replicate your own week."); return;
  }

  const result = await replicatePreviousWeek(Number(resourceId), currentWeekStart, uid);
  res.status(201).json(result);
});

// ─── POST /api/time/confirm-replication ──────────────────────────────────────

router.post("/time/confirm-replication", async (req: Request, res: Response): Promise<void> => {
  const uid = callerId(req);
  const { resourceId, weekStart } = req.body ?? {};

  if (!resourceId) {
    apiErr(res, 400, "MISSING_PARAMS", "resourceId is required."); return;
  }

  const confirmation = await confirmReplicatedSubmission(Number(resourceId), uid);
  res.json(confirmation);
});

// ─── GET /api/time/invoice-extraction (Finance-gated hard filter) ─────────────

router.get("/time/invoice-extraction", requireFinance, async (req: Request, res: Response): Promise<void> => {
  const projectId = Number(req.query.projectId);
  const startDate = String(req.query.startDate ?? "");
  const endDate   = String(req.query.endDate ?? "");

  if (!projectId || !startDate || !endDate) {
    apiErr(res, 400, "MISSING_PARAMS", "projectId, startDate, and endDate are required."); return;
  }

  // HARD FILTER — always Approved only; getInvoiceExtractionPayload enforces this at SQL level
  const payload = await getInvoiceExtractionPayload(projectId, startDate, endDate);
  res.json({ data: payload, total: payload.length, status: "Approved" });
});

// ─── POST /api/time/entries/submit (static — before /:id) ────────────────────

router.post("/time/entries/submit", async (req: Request, res: Response): Promise<void> => {
  const uid = callerId(req);
  const { entryIds, confirmationToken } = req.body ?? {};

  if (!Array.isArray(entryIds) || entryIds.length === 0) {
    apiErr(res, 400, "MISSING_PARAMS", "entryIds must be a non-empty array."); return;
  }

  // Check for replicated entries — require explicit confirmation token
  const replicatedEntries = await db
    .select({ id: effortEntriesTable.id })
    .from(effortEntriesTable)
    .where(and(inArray(effortEntriesTable.id, entryIds.map(Number)), eq(effortEntriesTable.isReplicated, true)));

  if (replicatedEntries.length > 0) {
    if (!confirmationToken) {
      apiErr(res, 422, "CONFIRMATION_REQUIRED",
        "Replicated entries require a confirmationToken. Call POST /api/time/confirm-replication first.",
        [{ field: "confirmationToken", message: "Token is required for replicated entries." }]); return;
    }
    const decoded = validateConfirmationToken(String(confirmationToken));
    if (!decoded) {
      apiErr(res, 422, "INVALID_TOKEN", "confirmationToken is invalid or tampered."); return;
    }
  }

  try {
    await submitEffort(entryIds.map(Number), uid);
    res.json({ submitted: entryIds.length });
  } catch (err) {
    if (err instanceof EffortTransitionError) {
      apiErr(res, 422, err.code, err.message); return;
    }
    throw err;
  }
});

// ─── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ────
// EFFORT ENTRY CRUD
// ─── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ────

// ─── POST /api/time/entries ───────────────────────────────────────────────────

router.post("/time/entries", async (req: Request, res: Response): Promise<void> => {
  const uid = callerId(req);
  const {
    resourceId,
    projectId,
    taskId,
    entryDate,
    durationHours,
    narrative,
    billableCategory,
    exceptionalJustification,
    leaveTypeId,
    isLeave: isLeaveBody,
  } = req.body ?? {};

  // taskId is optional for leave entries
  const isLeave = Boolean(isLeaveBody) || !!leaveTypeId;

  if (!resourceId || !projectId || !entryDate || !durationHours) {
    apiErr(res, 400, "MISSING_PARAMS", "resourceId, projectId, entryDate, and durationHours are required."); return;
  }
  if (!isLeave && !taskId) {
    apiErr(res, 400, "MISSING_PARAMS", "taskId is required for non-leave entries."); return;
  }

  // Validate leave type if provided
  if (leaveTypeId) {
    const [lt] = await db.select({ id: leaveTypesTable.id })
      .from(leaveTypesTable).where(eq(leaveTypesTable.id, Number(leaveTypeId))).limit(1);
    if (!lt) {
      apiErr(res, 422, "INVALID_LEAVE_TYPE", "The specified leave type does not exist or is inactive."); return;
    }
  }

  const isProxy = uid !== Number(resourceId);

  // Proxy check (validateEffortEntry's orchestrator also does this but we surface
  // the error before doing heavier validation)
  if (isProxy) {
    const pv = await validateProxyAuthorization(uid, Number(resourceId));
    if (!pv.valid) {
      apiErr(res, 403, pv.errorCode!, pv.errorMessage!); return;
    }
  }

  // Leave entries are always Non-Billable
  const resolvedCategory: "Billable" | "Non-Billable" = isLeave
    ? "Non-Billable"
    : (billableCategory ?? await autoCategorizEntry(Number(taskId)));

  // Exceptional effort check (skip for leave)
  const isExceptional = isLeave
    ? false
    : (await validateExceptionalEffort(
        Number(durationHours), Number(taskId), Number(resourceId), String(entryDate),
      )).isExceptional;

  const payload: EffortEntryPayload = {
    projectId:  Number(projectId),
    taskId:     taskId ? Number(taskId) : null,
    resourceId: Number(resourceId),
    entryDate:  String(entryDate),
    durationHours: Number(durationHours),
    billableCategory: resolvedCategory,
    narrative:  narrative ?? null,
    isExceptional,
    exceptionalJustification: exceptionalJustification ?? null,
    isLeave,
    leaveTypeId: leaveTypeId ? Number(leaveTypeId) : null,
  };

  // Full validation orchestrator
  const validation = await validateEffortEntry(payload, uid, isProxy, "save_single_row");
  if (!validation.valid) {
    apiErr(res, 422, "VALIDATION_FAILED", "One or more fields failed validation.",
      validation.errors.map(e => ({ field: e.field, message: e.errorMessage }))); return;
  }

  // Persist as Draft
  const weekStartDate = getWeekStart(String(entryDate));
  const [entry] = await db.insert(effortEntriesTable).values({
    resourceId:               Number(resourceId),
    enteredById:              uid,
    projectId:                Number(projectId),
    taskId:                   taskId ? Number(taskId) : null,
    entryDate:                String(entryDate),
    durationHours:            String(durationHours),
    billableCategory:         resolvedCategory,
    narrative:                narrative ?? null,
    isExceptional,
    exceptionalJustification: exceptionalJustification ?? null,
    isReplicated:             false,
    isLeave,
    leaveTypeId:              leaveTypeId ? Number(leaveTypeId) : null,
    status:                   "Draft",
    weekStartDate,
  } as any).returning();

  // Created audit record
  await db.insert(effortAuditLogTable).values({
    effortEntryId:  entry.id,
    action:         "Created",
    performedById:  uid,
    previousValue:  null,
    newValue:       { status: "Draft", durationHours, billableCategory: resolvedCategory, isLeave } as any,
    notes:          isProxy ? `Proxy entry by user ${uid}` : null,
    isImmutable:    true,
  } as any);

  res.status(201).json(entry);
});

// ─── GET /api/time/entries ────────────────────────────────────────────────────

router.get("/time/entries", async (req: Request, res: Response): Promise<void> => {
  const uid        = callerId(req);
  const resourceId = req.query.resourceId ? Number(req.query.resourceId) : undefined;
  const weekStart  = req.query.weekStart  ? String(req.query.weekStart)  : undefined;
  const status     = req.query.status     ? String(req.query.status)     : undefined;
  const projectId  = req.query.projectId  ? Number(req.query.projectId)  : undefined;

  const conditions: any[] = [];

  // Non-approvers can only see their own entries
  if (!isApproverRole(req)) {
    conditions.push(eq(effortEntriesTable.resourceId, uid));
  } else if (resourceId) {
    conditions.push(eq(effortEntriesTable.resourceId, resourceId));
  }

  if (weekStart) {
    const ws = getWeekStart(weekStart);
    const we = (() => {
      const d = new Date(`${ws}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 6);
      return d.toISOString().slice(0, 10);
    })();
    conditions.push(sql`${effortEntriesTable.entryDate} >= ${ws}`);
    conditions.push(sql`${effortEntriesTable.entryDate} <= ${we}`);
  }

  if (status) conditions.push(eq(effortEntriesTable.status, status));
  if (projectId) conditions.push(eq(effortEntriesTable.projectId, projectId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const entries = await db.select().from(effortEntriesTable).where(where)
    .orderBy(desc(effortEntriesTable.entryDate));

  res.json({ data: entries, total: entries.length });
});

// ─── LIFECYCLE ACTION ROUTES (must precede /:id) ──────────────────────────────

router.post("/time/entries/:id/recall", async (req: Request, res: Response): Promise<void> => {
  const uid = callerId(req);
  const id  = Number(req.params.id as string);
  const [entry] = await db.select({ id: effortEntriesTable.id })
    .from(effortEntriesTable).where(eq(effortEntriesTable.id, id)).limit(1);
  if (!entry) { apiErr(res, 404, "NOT_FOUND", "Effort entry not found."); return; }
  try {
    await recallEffort([id], uid);
    res.json({ recalled: true });
  } catch (err) {
    if (err instanceof EffortTransitionError) { apiErr(res, 422, err.code, err.message); return; }
    throw err;
  }
});

router.post("/time/entries/:id/approve", async (req: Request, res: Response): Promise<void> => {
  const uid = callerId(req);
  if (!isApproverRole(req)) {
    apiErr(res, 403, "UNAUTHORIZED", "Only Approvers or Managers may approve entries."); return;
  }
  const id = Number(req.params.id as string);
  const [entry] = await db.select({ id: effortEntriesTable.id })
    .from(effortEntriesTable).where(eq(effortEntriesTable.id, id)).limit(1);
  if (!entry) { apiErr(res, 404, "NOT_FOUND", "Effort entry not found."); return; }
  try {
    await approveEffort([id], uid);
    res.json({ approved: true });
  } catch (err) {
    if (err instanceof EffortTransitionError) { apiErr(res, 422, err.code, err.message); return; }
    throw err;
  }
});

router.post("/time/entries/:id/reject", async (req: Request, res: Response): Promise<void> => {
  const uid = callerId(req);
  if (!isApproverRole(req)) {
    apiErr(res, 403, "UNAUTHORIZED", "Only Approvers or Managers may reject entries."); return;
  }
  const id = Number(req.params.id as string);
  const { rejectionReason } = req.body ?? {};
  if (!rejectionReason || String(rejectionReason).trim().length === 0) {
    apiErr(res, 400, "MISSING_PARAMS", "rejectionReason is required."); return;
  }
  try {
    const notification = await rejectEffort(id, uid, String(rejectionReason));

    // Queue in-app rejection notification to the resource owner
    await db.insert(notificationsTable).values({
      type:       "effort_rejected",
      message:    `Your time entry on ${new Date().toISOString().slice(0, 10)} was rejected: ${notification.rejectionReason}`,
      userId:     notification.resourceId,
      entityType: "effort_entry",
      entityId:   String(id),
      read:       false,
    } as any).catch(() => {}); // fire-and-forget

    res.json({ rejected: true, notification });
  } catch (err) {
    if (err instanceof EffortTransitionError) { apiErr(res, 422, err.code, err.message); return; }
    throw err;
  }
});

router.post("/time/entries/:id/resubmit", async (req: Request, res: Response): Promise<void> => {
  const uid = callerId(req);
  const id  = Number(req.params.id as string);
  try {
    const result = await resubmitEffort(id, uid);
    res.json({ resubmitted: true, routedToApproverId: result.originalRejectorId });
  } catch (err) {
    if (err instanceof EffortTransitionError) { apiErr(res, 422, err.code, err.message); return; }
    throw err;
  }
});

router.post("/time/entries/:id/override-category", async (req: Request, res: Response): Promise<void> => {
  const uid = callerId(req);
  const id  = Number(req.params.id as string);
  const { newCategory } = req.body ?? {};

  if (newCategory !== "Billable" && newCategory !== "Non-Billable") {
    apiErr(res, 400, "INVALID_VALUE", "newCategory must be 'Billable' or 'Non-Billable'."); return;
  }

  try {
    const result = await overrideBillableCategory(id, newCategory, uid);
    res.json(result);
  } catch (err: any) {
    if (err.message?.includes("does not have permission")) {
      apiErr(res, 403, "UNAUTHORIZED", err.message); return;
    }
    if (err.message?.includes("not found")) {
      apiErr(res, 404, "NOT_FOUND", err.message); return;
    }
    throw err;
  }
});

// ─── GET /api/time/entries/:id/audit ─────────────────────────────────────────

router.get("/time/entries/:id/audit", async (req: Request, res: Response): Promise<void> => {
  const uid = callerId(req);
  const id  = Number(req.params.id as string);

  const [entry] = await db.select({ resourceId: effortEntriesTable.resourceId })
    .from(effortEntriesTable).where(eq(effortEntriesTable.id, id)).limit(1);

  if (!entry) { apiErr(res, 404, "NOT_FOUND", "Effort entry not found."); return; }

  // Only own entries or admins
  if (entry.resourceId !== uid && !isApproverRole(req)) {
    apiErr(res, 403, "UNAUTHORIZED", "You can only view audit history for your own entries."); return;
  }

  const log = await db.select().from(effortAuditLogTable)
    .where(eq(effortAuditLogTable.effortEntryId, id))
    .orderBy(asc(effortAuditLogTable.performedAt));

  res.json({ data: log, total: log.length });
});

// ─── GET /api/time/entries/:id ────────────────────────────────────────────────

router.get("/time/entries/:id", async (req: Request, res: Response): Promise<void> => {
  const uid = callerId(req);
  const id  = Number(req.params.id as string);

  const [entry] = await db.select().from(effortEntriesTable)
    .where(eq(effortEntriesTable.id, id)).limit(1);

  if (!entry) { apiErr(res, 404, "NOT_FOUND", "Effort entry not found."); return; }
  if (entry.resourceId !== uid && !isApproverRole(req)) {
    apiErr(res, 403, "UNAUTHORIZED", "Access denied."); return;
  }

  const auditLog = await db.select().from(effortAuditLogTable)
    .where(eq(effortAuditLogTable.effortEntryId, id))
    .orderBy(asc(effortAuditLogTable.performedAt));

  res.json({ ...entry, auditLog });
});

// ─── PATCH /api/time/entries/:id ──────────────────────────────────────────────

router.patch("/time/entries/:id", async (req: Request, res: Response): Promise<void> => {
  const uid = callerId(req);
  const id  = Number(req.params.id as string);

  const [entry] = await db.select().from(effortEntriesTable)
    .where(eq(effortEntriesTable.id, id)).limit(1);

  if (!entry) { apiErr(res, 404, "NOT_FOUND", "Effort entry not found."); return; }

  if (entry.status !== "Draft" && entry.status !== "Rejected") {
    apiErr(res, 403, "LOCKED", `Entry is locked in '${entry.status}' status and cannot be edited.`); return;
  }

  const {
    entryDate, durationHours, narrative, billableCategory,
    exceptionalJustification,
  } = req.body ?? {};

  const resolvedDate     = entryDate     ? String(entryDate)     : entry.entryDate;
  const resolvedDuration = durationHours ? Number(durationHours) : Number(entry.durationHours);
  const resolvedCategory = billableCategory ?? entry.billableCategory;
  const resolvedNarrative = narrative !== undefined ? narrative : entry.narrative;

  const payload: EffortEntryPayload = {
    projectId:     entry.projectId,
    taskId:        entry.taskId,
    resourceId:    entry.resourceId,
    entryDate:     resolvedDate,
    durationHours: resolvedDuration,
    billableCategory: resolvedCategory as "Billable" | "Non-Billable",
    narrative:     resolvedNarrative,
    isExceptional: entry.isExceptional,
    exceptionalJustification: exceptionalJustification ?? entry.exceptionalJustification,
    excludeEntryId: id,
  };

  const validation = await validateEffortEntry(payload, uid, uid !== entry.resourceId);
  if (!validation.valid) {
    apiErr(res, 422, "VALIDATION_FAILED", "One or more fields failed validation.",
      validation.errors.map(e => ({ field: e.field, message: e.errorMessage }))); return;
  }

  const [updated] = await db.update(effortEntriesTable).set({
    entryDate:                resolvedDate,
    durationHours:            String(resolvedDuration),
    billableCategory:         resolvedCategory,
    narrative:                resolvedNarrative,
    exceptionalJustification: exceptionalJustification ?? entry.exceptionalJustification,
    weekStartDate:            getWeekStart(resolvedDate),
    updatedAt:                new Date(),
  } as any).where(eq(effortEntriesTable.id, id)).returning();

  await db.insert(effortAuditLogTable).values({
    effortEntryId: id,
    action:        "Updated",
    performedById: uid,
    previousValue: { durationHours: entry.durationHours, entryDate: entry.entryDate, billableCategory: entry.billableCategory } as any,
    newValue:      { durationHours: resolvedDuration, entryDate: resolvedDate, billableCategory: resolvedCategory } as any,
    isImmutable:   true,
  } as any);

  res.json(updated);
});

// ─── DELETE /api/time/entries/:id ────────────────────────────────────────────

router.delete("/time/entries/:id", async (req: Request, res: Response): Promise<void> => {
  const uid = callerId(req);
  const id  = Number(req.params.id as string);

  const [entry] = await db.select().from(effortEntriesTable)
    .where(eq(effortEntriesTable.id, id)).limit(1);

  if (!entry) { apiErr(res, 404, "NOT_FOUND", "Effort entry not found."); return; }
  if (entry.resourceId !== uid && !isApproverRole(req)) {
    apiErr(res, 403, "UNAUTHORIZED", "Access denied."); return;
  }
  if (entry.status !== "Draft") {
    apiErr(res, 403, "LOCKED", "Only Draft entries may be deleted."); return;
  }

  await db.delete(effortEntriesTable).where(eq(effortEntriesTable.id, id));
  res.status(204).send();
});

// ─── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ────
// CONTRACT RULES (Admin-only)
// ─── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ────

router.get("/time/contract-rules/:projectId", async (req: Request, res: Response): Promise<void> => {
  const projectId = Number(req.params.projectId as string);
  const [rule] = await db.select().from(contractRulesTable)
    .where(eq(contractRulesTable.projectId, projectId)).limit(1);
  if (!rule) { apiErr(res, 404, "NOT_FOUND", "No contract rules found for this project."); return; }
  res.json(rule);
});

router.patch("/time/contract-rules/:projectId", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const projectId = Number(req.params.projectId as string);
  const {
    contractType, incrementMinutes, maxBillableHours,
    narrativeRequired, futureDateBufferDays, maxDailyHours,
  } = req.body ?? {};

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (contractType       !== undefined) updates.contractType       = contractType;
  if (incrementMinutes   !== undefined) updates.incrementMinutes   = Number(incrementMinutes);
  if (maxBillableHours   !== undefined) updates.maxBillableHours   = String(maxBillableHours);
  if (narrativeRequired  !== undefined) updates.narrativeRequired  = Boolean(narrativeRequired);
  if (futureDateBufferDays !== undefined) updates.futureDateBufferDays = Number(futureDateBufferDays);
  if (maxDailyHours      !== undefined) updates.maxDailyHours      = String(maxDailyHours);

  const [existing] = await db.select({ id: contractRulesTable.id })
    .from(contractRulesTable).where(eq(contractRulesTable.projectId, projectId)).limit(1);

  let rule;
  if (existing) {
    [rule] = await db.update(contractRulesTable).set(updates as any)
      .where(eq(contractRulesTable.projectId, projectId)).returning();
  } else {
    [rule] = await db.insert(contractRulesTable).values({
      projectId,
      contractType: contractType ?? "Time_And_Materials",
      incrementMinutes: incrementMinutes ? Number(incrementMinutes) : 15,
      futureDateBufferDays: futureDateBufferDays ? Number(futureDateBufferDays) : 7,
      maxDailyHours: maxDailyHours ? String(maxDailyHours) : "24",
      ...updates,
    } as any).returning();
  }
  res.json(rule);
});

// ─── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ────
// PROXY DELEGATIONS (Admin-managed)
// ─── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ────

router.get("/time/proxy-delegations", async (req: Request, res: Response): Promise<void> => {
  const userId = req.query.userId ? Number(req.query.userId) : undefined;
  const uid    = callerId(req);

  // Non-admins can only query their own delegations
  if (!isApproverRole(req) && userId && userId !== uid) {
    apiErr(res, 403, "UNAUTHORIZED", "Access denied."); return;
  }

  const conditions: any[] = [];
  if (userId) {
    conditions.push(
      sql`(${proxyDelegationsTable.proxyUserId} = ${userId} OR ${proxyDelegationsTable.targetUserId} = ${userId})`,
    );
  } else if (!isApproverRole(req)) {
    conditions.push(
      sql`(${proxyDelegationsTable.proxyUserId} = ${uid} OR ${proxyDelegationsTable.targetUserId} = ${uid})`,
    );
  }

  const rows = await db.select().from(proxyDelegationsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(proxyDelegationsTable.createdAt));

  res.json({ data: rows, total: rows.length });
});

router.post("/time/proxy-delegations", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const uid = callerId(req);
  const { proxyUserId, targetUserId, validFrom, validUntil } = req.body ?? {};

  if (!proxyUserId || !targetUserId || !validFrom || !validUntil) {
    apiErr(res, 400, "MISSING_PARAMS", "proxyUserId, targetUserId, validFrom, and validUntil are required."); return;
  }

  const [created] = await db.insert(proxyDelegationsTable).values({
    proxyUserId:  Number(proxyUserId),
    targetUserId: Number(targetUserId),
    grantedById:  uid,
    validFrom:    String(validFrom),
    validUntil:   String(validUntil),
    isActive:     true,
  } as any).returning();

  res.status(201).json(created);
});

router.delete("/time/proxy-delegations/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id as string);
  const [existing] = await db.select({ id: proxyDelegationsTable.id })
    .from(proxyDelegationsTable).where(eq(proxyDelegationsTable.id, id)).limit(1);

  if (!existing) { apiErr(res, 404, "NOT_FOUND", "Delegation not found."); return; }

  // Soft-deactivate rather than hard delete (preserve audit trail)
  await db.update(proxyDelegationsTable).set({ isActive: false, updatedAt: new Date() } as any)
    .where(eq(proxyDelegationsTable.id, id));

  res.status(204).send();
});

// ─── Financial Periods ────────────────────────────────────────────────────────

router.get("/time/financial-periods", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const rows = await db.select().from(financialPeriodsTable).orderBy(desc(financialPeriodsTable.startDate));
  res.json({ data: rows });
});

router.post("/time/financial-periods", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { periodName, startDate, endDate, status = "Open", cfoOverrideActive = false, cfoOverrideUserId } = req.body as any;
  if (!periodName || !startDate || !endDate) { apiErr(res, 400, "MISSING_FIELDS", "periodName, startDate and endDate are required."); return; }
  if (endDate <= startDate) { apiErr(res, 400, "INVALID_RANGE", "endDate must be after startDate."); return; }

  const [row] = await db.insert(financialPeriodsTable).values({
    periodName,
    startDate,
    endDate,
    status,
    cfoOverrideActive: Boolean(cfoOverrideActive),
    cfoOverrideUserId: cfoOverrideUserId ?? null,
    updatedAt: new Date(),
  } as any).returning();
  res.status(201).json({ data: row });
});

router.patch("/time/financial-periods/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id as string);
  const [existing] = await db.select().from(financialPeriodsTable).where(eq(financialPeriodsTable.id, id)).limit(1);
  if (!existing) { apiErr(res, 404, "NOT_FOUND", "Financial period not found."); return; }

  const { status, cfoOverrideActive, cfoOverrideUserId, periodName, startDate, endDate } = req.body as any;
  const patch: Record<string, any> = { updatedAt: new Date() };
  if (status !== undefined)           patch.status = status;
  if (cfoOverrideActive !== undefined) patch.cfoOverrideActive = Boolean(cfoOverrideActive);
  if (cfoOverrideUserId !== undefined) patch.cfoOverrideUserId = cfoOverrideUserId;
  if (periodName !== undefined)        patch.periodName = periodName;
  if (startDate !== undefined)         patch.startDate = startDate;
  if (endDate !== undefined)           patch.endDate = endDate;

  const [updated] = await db.update(financialPeriodsTable).set(patch).where(eq(financialPeriodsTable.id, id)).returning();
  res.json({ data: updated });
});

// ─── Exceptional Effort Rules ─────────────────────────────────────────────────

router.get("/time/exceptional-effort-rules", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const rows = await db.select().from(exceptionalEffortRulesTable).orderBy(desc(exceptionalEffortRulesTable.id));
  res.json({ data: rows });
});

router.patch("/time/exceptional-effort-rules/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id as string);
  const [existing] = await db.select().from(exceptionalEffortRulesTable).where(eq(exceptionalEffortRulesTable.id, id)).limit(1);
  if (!existing) { apiErr(res, 404, "NOT_FOUND", "Rule not found."); return; }

  const { dailyOvertimeThresholdHours, weeklyOvertimeThresholdHours, isActive } = req.body as any;
  const patch: Record<string, any> = { updatedAt: new Date() };
  if (dailyOvertimeThresholdHours !== undefined)  patch.dailyOvertimeThresholdHours = String(dailyOvertimeThresholdHours);
  if (weeklyOvertimeThresholdHours !== undefined) patch.weeklyOvertimeThresholdHours = String(weeklyOvertimeThresholdHours);
  if (isActive !== undefined)                     patch.isActive = Boolean(isActive);

  const [updated] = await db.update(exceptionalEffortRulesTable).set(patch).where(eq(exceptionalEffortRulesTable.id, id)).returning();
  res.json({ data: updated });
});

// ─── Supporting Data Endpoints ────────────────────────────────────────────────

// GET /api/time/leave-types
router.get("/time/leave-types", async (_req: Request, res: Response): Promise<void> => {
  const rows = await db.select().from(leaveTypesTable)
    .where(eq(leaveTypesTable.isActive, true))
    .orderBy(asc(leaveTypesTable.code));
  res.json({ data: rows });
});

// GET /api/time/financial-period/:date — resolve which period a date falls in
router.get("/time/financial-period/:date", async (req: Request, res: Response): Promise<void> => {
  const uid  = callerId(req);
  const date = String(req.params.date);

  const [period] = await db.select().from(financialPeriodsTable).where(
    and(
      sql`${financialPeriodsTable.startDate} <= ${date}`,
      sql`${financialPeriodsTable.endDate}   >= ${date}`,
    ),
  ).limit(1);

  if (!period) {
    res.json({ data: null, periodStatus: "NO_PERIOD_DEFINED" }); return;
  }

  const userHasOverride =
    Boolean(period.cfoOverrideActive) && period.cfoOverrideUserId === uid;

  res.json({ data: period, userHasOverride });
});

// GET /api/time/assigned-projects — projects where caller has an active allocation
router.get("/time/assigned-projects", async (req: Request, res: Response): Promise<void> => {
  const uid        = callerId(req);
  const resourceId = req.query.resourceId ? Number(req.query.resourceId) : uid;

  if (resourceId !== uid && !isApproverRole(req)) {
    apiErr(res, 403, "UNAUTHORIZED", "Access denied."); return;
  }

  const rows = await db
    .select({
      id:           projectsTable.id,
      name:         projectsTable.name,
      status:       projectsTable.status,
      billingType:  (projectsTable as any).billingType,
    })
    .from(projectsTable)
    .innerJoin(allocationsTable, eq(allocationsTable.projectId, projectsTable.id))
    .where(
      and(
        eq(allocationsTable.userId, resourceId),
        eq(projectsTable.status, "Active"),
        sql`${projectsTable.deletedAt} IS NULL`,
      ),
    )
    .orderBy(asc(projectsTable.name));

  // Deduplicate (a user can have multiple allocations on the same project)
  const seen = new Set<number>();
  const unique = rows.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });

  // Attach per-project contract rules
  const projectIds = unique.map(p => p.id);
  const rules = projectIds.length > 0
    ? await db.select().from(contractRulesTable)
        .where(inArray(contractRulesTable.projectId, projectIds))
    : [];
  const rulesMap = new Map(rules.map(r => [r.projectId, r]));

  res.json({
    data: unique.map(p => ({ ...p, contractRules: rulesMap.get(p.id) ?? null })),
    total: unique.length,
  });
});

// GET /api/time/assigned-tasks/:projectId — active, non-phase tasks for a project
router.get("/time/assigned-tasks/:projectId", async (req: Request, res: Response): Promise<void> => {
  const uid        = callerId(req);
  const projectId  = Number(req.params.projectId);
  const resourceId = req.query.resourceId ? Number(req.query.resourceId) : uid;

  if (resourceId !== uid && !isApproverRole(req)) {
    apiErr(res, 403, "UNAUTHORIZED", "Access denied."); return;
  }

  // Verify the resource has an allocation on this project (or caller is approver querying for someone)
  if (!isApproverRole(req)) {
    const [alloc] = await db.select({ id: allocationsTable.id })
      .from(allocationsTable)
      .where(and(eq(allocationsTable.userId, resourceId), eq(allocationsTable.projectId, projectId)))
      .limit(1);
    if (!alloc) {
      apiErr(res, 403, "NOT_ALLOCATED", "You do not have an active allocation on this project."); return;
    }
  }

  const rows = await db.select().from(tasksTable).where(
    and(
      eq(tasksTable.projectId, projectId),
      sql`${tasksTable.status} != 'Closed'`,
      eq((tasksTable as any).isPhase, false),
    ),
  ).orderBy(asc(tasksTable.name));

  res.json({ data: rows, total: rows.length });
});

// ─── Approval Queue ───────────────────────────────────────────────────────────

// GET /api/time/approval-queue — aggregated list of all submitted week-buckets
router.get("/time/approval-queue", async (req: Request, res: Response): Promise<void> => {
  if (!isApproverRole(req)) {
    apiErr(res, 403, "UNAUTHORIZED", "Only managers and approvers can access the approval queue."); return;
  }

  const submissions = await db
    .select({
      resourceId:       effortEntriesTable.resourceId,
      weekStartDate:    effortEntriesTable.weekStartDate,
      totalHours:       sql<string>`COALESCE(SUM(${effortEntriesTable.durationHours}), 0)`,
      billableHours:    sql<string>`COALESCE(SUM(CASE WHEN ${effortEntriesTable.billableCategory} = 'Billable' THEN ${effortEntriesTable.durationHours} ELSE 0 END), 0)`,
      exceptionalCount: sql<number>`COUNT(CASE WHEN ${effortEntriesTable.isExceptional} = true THEN 1 END)::int`,
      earliestUpdated:  sql<string>`MIN(${effortEntriesTable.updatedAt}::text)`,
      entryCount:       sql<number>`COUNT(*)::int`,
    })
    .from(effortEntriesTable)
    .where(eq(effortEntriesTable.status, "Submitted"))
    .groupBy(effortEntriesTable.resourceId, effortEntriesTable.weekStartDate)
    .orderBy(sql`MIN(${effortEntriesTable.updatedAt}) ASC`);

  const resourceIds = [...new Set(submissions.map(s => s.resourceId))];
  const users = resourceIds.length > 0
    ? await db.select({ id: usersTable.id, name: usersTable.name })
        .from(usersTable).where(inArray(usersTable.id, resourceIds))
    : [];
  const userMap = new Map(users.map(u => [u.id, u.name]));

  const now = new Date();
  const result = submissions.map(s => {
    const weekEnd = new Date(`${s.weekStartDate}T00:00:00Z`);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    const daysSinceSubmission = s.earliestUpdated
      ? Math.floor((now.getTime() - new Date(s.earliestUpdated).getTime()) / 86_400_000)
      : 0;
    return {
      resourceId:        s.resourceId,
      submitterName:     userMap.get(s.resourceId) ?? `User ${s.resourceId}`,
      weekStart:         s.weekStartDate,
      weekEnd:           weekEnd.toISOString().slice(0, 10),
      totalHours:        Number(s.totalHours),
      billableHours:     Number(s.billableHours),
      exceptionalCount:  s.exceptionalCount,
      entryCount:        s.entryCount,
      daysSinceSubmission,
      status:            "Submitted",
    };
  });

  res.json({ data: result, total: result.length });
});

// GET /api/time/approval-queue/:resourceId/:weekStart — drill-down into one bucket
router.get("/time/approval-queue/:resourceId/:weekStart", async (req: Request, res: Response): Promise<void> => {
  if (!isApproverRole(req)) {
    apiErr(res, 403, "UNAUTHORIZED", "Only managers and approvers can access the approval queue."); return;
  }

  const resourceId  = Number(req.params.resourceId);
  const weekStart   = String(req.params.weekStart);

  const entries = await db.select().from(effortEntriesTable).where(
    and(
      eq(effortEntriesTable.resourceId, resourceId),
      eq(effortEntriesTable.weekStartDate, weekStart),
    ),
  ).orderBy(asc(effortEntriesTable.entryDate));

  if (entries.length === 0) {
    apiErr(res, 404, "NOT_FOUND", "No entries found for this resource and week."); return;
  }

  // Attach per-entry audit history
  const entryIds = entries.map(e => e.id);
  const auditLogs = await db.select().from(effortAuditLogTable)
    .where(inArray(effortAuditLogTable.effortEntryId, entryIds))
    .orderBy(asc(effortAuditLogTable.performedAt));

  const auditByEntry = new Map<number, typeof auditLogs>();
  for (const log of auditLogs) {
    const existing = auditByEntry.get(log.effortEntryId) ?? [];
    existing.push(log);
    auditByEntry.set(log.effortEntryId, existing);
  }

  const [submitter] = await db.select({ name: usersTable.name }).from(usersTable)
    .where(eq(usersTable.id, resourceId)).limit(1);

  res.json({
    resourceId,
    submitterName: submitter?.name ?? `User ${resourceId}`,
    weekStart,
    entries: entries.map(e => ({ ...e, auditLog: auditByEntry.get(e.id) ?? [] })),
    total: entries.length,
  });
});

// ─── Audit Log Viewer ─────────────────────────────────────────────────────────

router.get("/time/audit-log", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { userId, action, dateFrom, dateTo, entryId, limit = "100", offset = "0" } = req.query as any;

  const conditions = [];
  if (userId)   conditions.push(eq(effortAuditLogTable.performedById, Number(userId)));
  if (action)   conditions.push(eq(effortAuditLogTable.action, action));
  if (entryId)  conditions.push(eq(effortAuditLogTable.effortEntryId, Number(entryId)));
  if (dateFrom) conditions.push(gte(effortAuditLogTable.performedAt, new Date(dateFrom)));
  if (dateTo)   conditions.push(lte(effortAuditLogTable.performedAt, new Date(dateTo + "T23:59:59Z")));

  const lim = Math.min(Number(limit) || 100, 500);
  const off = Number(offset) || 0;

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ count }]] = await Promise.all([
    db.select().from(effortAuditLogTable)
      .where(where)
      .orderBy(desc(effortAuditLogTable.performedAt))
      .limit(lim).offset(off),
    db.select({ count: sql<number>`count(*)::int` }).from(effortAuditLogTable).where(where),
  ]);

  res.json({ data: rows, total: count, limit: lim, offset: off });
});

export default router;

