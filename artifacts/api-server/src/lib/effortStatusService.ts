/**
 * Effort Status Service
 *
 * Implements the effort_entry lifecycle state machine.
 * Every transition is validated, audited, and typed.
 *
 * Valid transitions:
 *   Draft       → Submitted  (submitEffort)
 *   Submitted   → Approved   (approveEffort)
 *   Submitted   → Rejected   (rejectEffort)
 *   Submitted   → Draft      (recallEffort)
 *   Rejected    → Submitted  (resubmitEffort)
 *   Approved    → Processed  (markProcessed — invoicing service only)
 *
 * Implements: FR-456.1, FR-456.2, FR-457.1, FR-457.2,
 *             FR-476.1, FR-476.2, FR-476.3, FR-496.1, FR-496.2
 */

import { eq, inArray, and, sql } from "drizzle-orm";
import {
  db as defaultDb,
  effortEntriesTable,
  effortAuditLogTable,
} from "@workspace/db";
import { validateProxyAuthorization, todayUTC } from "./effortValidationService";

type Db = typeof defaultDb;

// ─── Typed error ─────────────────────────────────────────────────────────────

export class EffortTransitionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "EffortTransitionError";
  }
}

// ─── Allowed transitions (guard table) ───────────────────────────────────────

const ALLOWED_FROM: Record<string, string[]> = {
  Submitted: ["Draft"],
  Approved:  ["Submitted"],
  Rejected:  ["Submitted"],
  Draft:     ["Submitted"],   // Recall: Submitted → Draft
  Processed: ["Approved"],
};

function assertTransition(current: string, target: string, entryId: number): void {
  const allowed = ALLOWED_FROM[target] ?? [];
  if (!allowed.includes(current)) {
    throw new EffortTransitionError(
      "INVALID_TRANSITION",
      `Entry ${entryId}: cannot move from '${current}' to '${target}'.`,
    );
  }
}

// ─── Audit helper ─────────────────────────────────────────────────────────────

async function writeAudit(
  entryId: number,
  action: string,
  performedById: number,
  previousValue: unknown,
  newValue: unknown,
  notes: string | null,
  dbInstance: Db,
): Promise<void> {
  await dbInstance.insert(effortAuditLogTable).values({
    effortEntryId: entryId,
    action,
    performedById,
    previousValue: previousValue as any,
    newValue: newValue as any,
    notes,
    isImmutable: true,
  } as any);
}

// ─── Proxy check helper ───────────────────────────────────────────────────────

async function assertCanActFor(
  actingUserId: number,
  resourceId: number,
  dbInstance: Db,
): Promise<void> {
  if (actingUserId === resourceId) return;
  const r = await validateProxyAuthorization(actingUserId, resourceId, dbInstance);
  if (!r.valid) {
    throw new EffortTransitionError("PROXY_DENIED", r.errorMessage!);
  }
}

// ─── 1. submitEffort ──────────────────────────────────────────────────────────

export async function submitEffort(
  entryIds: number[],
  submittingUserId: number,
  dbInstance: Db = defaultDb,
): Promise<void> {
  if (entryIds.length === 0) return;

  const entries = await dbInstance
    .select({ id: effortEntriesTable.id, status: effortEntriesTable.status, resourceId: effortEntriesTable.resourceId })
    .from(effortEntriesTable)
    .where(inArray(effortEntriesTable.id, entryIds));

  for (const e of entries) {
    assertTransition(e.status, "Submitted", e.id);
    await assertCanActFor(submittingUserId, e.resourceId, dbInstance);
  }

  await dbInstance
    .update(effortEntriesTable)
    .set({ status: "Submitted", updatedAt: new Date() })
    .where(inArray(effortEntriesTable.id, entryIds));

  const isProxy = entries.some(e => e.resourceId !== submittingUserId);

  for (const e of entries) {
    await writeAudit(
      e.id, isProxy ? "Proxy_Entry" : "Submitted", submittingUserId,
      { status: e.status }, { status: "Submitted" }, null, dbInstance,
    );
  }
}

// ─── 2. recallEffort ──────────────────────────────────────────────────────────

export async function recallEffort(
  entryIds: number[],
  userId: number,
  dbInstance: Db = defaultDb,
): Promise<void> {
  if (entryIds.length === 0) return;

  const entries = await dbInstance
    .select({ id: effortEntriesTable.id, status: effortEntriesTable.status, resourceId: effortEntriesTable.resourceId })
    .from(effortEntriesTable)
    .where(inArray(effortEntriesTable.id, entryIds));

  for (const e of entries) {
    assertTransition(e.status, "Draft", e.id);
    await assertCanActFor(userId, e.resourceId, dbInstance);
  }

  await dbInstance
    .update(effortEntriesTable)
    .set({ status: "Draft", updatedAt: new Date() })
    .where(inArray(effortEntriesTable.id, entryIds));

  for (const e of entries) {
    await writeAudit(
      e.id, "Recalled", userId,
      { status: "Submitted" }, { status: "Draft" }, null, dbInstance,
    );
  }
}

// ─── 3. approveEffort ─────────────────────────────────────────────────────────

export async function approveEffort(
  entryIds: number[],
  approverId: number,
  dbInstance: Db = defaultDb,
): Promise<void> {
  if (entryIds.length === 0) return;

  const entries = await dbInstance
    .select({ id: effortEntriesTable.id, status: effortEntriesTable.status })
    .from(effortEntriesTable)
    .where(inArray(effortEntriesTable.id, entryIds));

  for (const e of entries) {
    assertTransition(e.status, "Approved", e.id);
  }

  await dbInstance
    .update(effortEntriesTable)
    .set({ status: "Approved", updatedAt: new Date() })
    .where(inArray(effortEntriesTable.id, entryIds));

  for (const e of entries) {
    await writeAudit(
      e.id, "Approved", approverId,
      { status: "Submitted" }, { status: "Approved" }, null, dbInstance,
    );
  }
}

// ─── 4. rejectEffort ──────────────────────────────────────────────────────────

export type RejectionNotificationPayload = {
  entryId: number;
  resourceId: number;
  approverId: number;
  rejectionReason: string;
  rejectedAt: string;
};

export async function rejectEffort(
  entryId: number,
  approverId: number,
  rejectionReason: string,
  dbInstance: Db = defaultDb,
): Promise<RejectionNotificationPayload> {
  if (!rejectionReason || rejectionReason.trim().length === 0) {
    throw new EffortTransitionError(
      "REJECTION_REASON_REQUIRED",
      "A rejection reason is required.",
    );
  }

  const [entry] = await dbInstance
    .select({ id: effortEntriesTable.id, status: effortEntriesTable.status, resourceId: effortEntriesTable.resourceId })
    .from(effortEntriesTable)
    .where(eq(effortEntriesTable.id, entryId));

  if (!entry) throw new EffortTransitionError("NOT_FOUND", `Entry ${entryId} not found.`);
  assertTransition(entry.status, "Rejected", entry.id);

  const rejectedAt = new Date();

  await dbInstance
    .update(effortEntriesTable)
    .set({
      status: "Rejected",
      rejectionReason: rejectionReason.trim(),
      originalRejectorId: approverId,
      updatedAt: rejectedAt,
    } as any)
    .where(eq(effortEntriesTable.id, entryId));

  await writeAudit(
    entryId, "Rejected", approverId,
    { status: "Submitted" },
    { status: "Rejected", rejectionReason: rejectionReason.trim() },
    rejectionReason.trim(),
    dbInstance,
  );

  return {
    entryId,
    resourceId: entry.resourceId,
    approverId,
    rejectionReason: rejectionReason.trim(),
    rejectedAt: rejectedAt.toISOString(),
  };
}

// ─── 5. resubmitEffort ────────────────────────────────────────────────────────

export async function resubmitEffort(
  entryId: number,
  userId: number,
  dbInstance: Db = defaultDb,
): Promise<{ originalRejectorId: number | null }> {
  const [entry] = await dbInstance
    .select({
      id: effortEntriesTable.id,
      status: effortEntriesTable.status,
      resourceId: effortEntriesTable.resourceId,
      originalRejectorId: (effortEntriesTable as any).originalRejectorId,
    })
    .from(effortEntriesTable)
    .where(eq(effortEntriesTable.id, entryId));

  if (!entry) throw new EffortTransitionError("NOT_FOUND", `Entry ${entryId} not found.`);
  assertTransition(entry.status, "Submitted", entryId);
  await assertCanActFor(userId, entry.resourceId, dbInstance);

  await dbInstance
    .update(effortEntriesTable)
    .set({ status: "Submitted", rejectionReason: null, updatedAt: new Date() })
    .where(eq(effortEntriesTable.id, entryId));

  await writeAudit(
    entryId, "Resubmitted", userId,
    { status: "Rejected" },
    { status: "Submitted", routedTo: entry.originalRejectorId },
    entry.originalRejectorId ? `Routed to approver id=${entry.originalRejectorId}` : null,
    dbInstance,
  );

  return { originalRejectorId: entry.originalRejectorId ?? null };
}

// ─── 6. markProcessed ─────────────────────────────────────────────────────────

const INVOICING_TOKEN = process.env.INVOICING_SERVICE_TOKEN ?? "dev-invoicing-token";

export async function markProcessed(
  entryIds: number[],
  callerToken: string,
  dbInstance: Db = defaultDb,
): Promise<void> {
  if (callerToken !== INVOICING_TOKEN) {
    throw new EffortTransitionError(
      "UNAUTHORIZED_CALLER",
      "markProcessed may only be called by the invoicing service.",
    );
  }

  if (entryIds.length === 0) return;

  const entries = await dbInstance
    .select({ id: effortEntriesTable.id, status: effortEntriesTable.status })
    .from(effortEntriesTable)
    .where(inArray(effortEntriesTable.id, entryIds));

  for (const e of entries) {
    assertTransition(e.status, "Processed", e.id);
  }

  await dbInstance
    .update(effortEntriesTable)
    .set({ status: "Processed", updatedAt: new Date() })
    .where(inArray(effortEntriesTable.id, entryIds));

  // System-level audit — performer = 0 (sentinel for invoicing system)
  for (const e of entries) {
    await writeAudit(
      e.id, "Processed", 0,
      { status: "Approved" }, { status: "Processed" },
      "Marked processed by invoicing service.", dbInstance,
    );
  }
}
