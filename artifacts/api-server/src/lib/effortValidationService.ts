/**
 * Effort Validation Service
 *
 * Server-side validation for the Time Tracking module (effort_entries).
 * Each validator returns a structured result and is dependency-injected
 * with the database client so it can be tested in isolation.
 *
 * Implements: FR-336.1, FR-336.2, FR-337.1, FR-337.2, FR-356.2,
 *             FR-376.1, FR-377.1, FR-377.2, FR-378.1, FR-436.1,
 *             FR-436.2, FR-516.1
 */

import { eq, and, sql, or } from "drizzle-orm";
import {
  db as defaultDb,
  projectsTable,
  tasksTable,
  effortEntriesTable,
  contractRulesTable,
  financialPeriodsTable,
  exceptionalEffortRulesTable,
  proxyDelegationsTable,
} from "@workspace/db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ValidationResult = {
  valid: boolean;
  errorCode: string | null;
  errorMessage: string | null;
};

export type ExceptionalResult = {
  isExceptional: boolean;
  reason: string;
};

export type EffortError = {
  field: string;
  errorCode: string;
  errorMessage: string;
};

export type OrchestratorResult = {
  valid: boolean;
  errors: EffortError[];
};

export type EffortEntryPayload = {
  projectId: number;
  taskId: number;
  resourceId: number;
  entryDate: string;           // "YYYY-MM-DD"
  durationHours: number;
  billableCategory: "Billable" | "Non-Billable";
  narrative?: string | null;
  isExceptional?: boolean;
  exceptionalJustification?: string | null;
  excludeEntryId?: number;     // for edit flows
};

type Db = typeof defaultDb;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Return the Monday of the ISO week that contains `dateStr` ("YYYY-MM-DD"). */
export function getWeekStart(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay(); // 0 = Sun
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() + diffToMon);
  return mon.toISOString().slice(0, 10);
}

/** Return today as "YYYY-MM-DD" in UTC. */
export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

const ok: ValidationResult = { valid: true, errorCode: null, errorMessage: null };

function fail(errorCode: string, errorMessage: string): ValidationResult {
  return { valid: false, errorCode, errorMessage };
}

// ─── 1. validateProjectTaskActive ─────────────────────────────────────────────
// FR-336.1, FR-377.1

export async function validateProjectTaskActive(
  projectId: number,
  taskId: number,
  dbInstance: Db = defaultDb,
): Promise<ValidationResult> {
  const [project] = await dbInstance
    .select({ status: projectsTable.status })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .limit(1);

  if (!project) {
    return fail("PROJECT_NOT_FOUND", "The selected project/task is not available for time entry.");
  }

  if (project.status === "Closed" || project.status === "Financially_Reconciled") {
    return fail("PROJECT_CLOSED", "The selected project/task is not available for time entry.");
  }

  const [task] = await dbInstance
    .select({ status: tasksTable.status })
    .from(tasksTable)
    .where(and(eq(tasksTable.id, taskId), eq(tasksTable.projectId, projectId)))
    .limit(1);

  if (!task) {
    return fail("TASK_NOT_FOUND", "The selected project/task is not available for time entry.");
  }

  if (task.status === "Closed") {
    return fail("TASK_CLOSED", "The selected project/task is not available for time entry.");
  }

  return ok;
}

// ─── 2. validateEffortIncrement ────────────────────────────────────────────────
// FR-336.2

export async function validateEffortIncrement(
  durationHours: number,
  projectId: number,
  dbInstance: Db = defaultDb,
): Promise<ValidationResult> {
  const [rule] = await dbInstance
    .select({ incrementMinutes: contractRulesTable.incrementMinutes })
    .from(contractRulesTable)
    .where(eq(contractRulesTable.projectId, projectId))
    .limit(1);

  const increment = rule?.incrementMinutes ?? 15;
  const totalMinutes = Math.round(durationHours * 60);

  if (totalMinutes % increment !== 0) {
    return fail(
      "INVALID_INCREMENT",
      `Duration must be in ${increment}-minute increments as required by this project's contract.`,
    );
  }

  return ok;
}

// ─── 3. validateDailyHoursCap ─────────────────────────────────────────────────
// FR-376.1

export async function validateDailyHoursCap(
  resourceId: number,
  entryDate: string,
  newDurationHours: number,
  projectId: number,
  excludeEntryId?: number,
  dbInstance: Db = defaultDb,
): Promise<ValidationResult> {
  const [rule] = await dbInstance
    .select({ maxDailyHours: contractRulesTable.maxDailyHours })
    .from(contractRulesTable)
    .where(eq(contractRulesTable.projectId, projectId))
    .limit(1);

  const maxDaily = Number(rule?.maxDailyHours ?? 24);

  const conditions = [
    eq(effortEntriesTable.resourceId, resourceId),
    eq(effortEntriesTable.entryDate, entryDate),
  ];

  if (excludeEntryId !== undefined) {
    conditions.push(sql`${effortEntriesTable.id} != ${excludeEntryId}` as any);
  }

  const [sumRow] = await dbInstance
    .select({
      total: sql<string>`COALESCE(SUM(${effortEntriesTable.durationHours}), 0)`,
    })
    .from(effortEntriesTable)
    .where(and(...conditions));

  const existingTotal = Number(sumRow?.total ?? 0);

  if (existingTotal + newDurationHours > maxDaily) {
    return fail(
      "DAILY_CAP_EXCEEDED",
      `This entry would exceed the maximum of ${maxDaily} hours allowed in a single day.`,
    );
  }

  return ok;
}

// ─── 4. validateFinancialPeriod ────────────────────────────────────────────────
// FR-377.2

export async function validateFinancialPeriod(
  entryDate: string,
  userId: number,
  dbInstance: Db = defaultDb,
): Promise<ValidationResult> {
  const [period] = await dbInstance
    .select({
      status: financialPeriodsTable.status,
      cfoOverrideActive: financialPeriodsTable.cfoOverrideActive,
      cfoOverrideUserId: financialPeriodsTable.cfoOverrideUserId,
    })
    .from(financialPeriodsTable)
    .where(
      and(
        sql`${financialPeriodsTable.startDate} <= ${entryDate}`,
        sql`${financialPeriodsTable.endDate} >= ${entryDate}`,
      ),
    )
    .limit(1);

  if (!period) {
    // No period defined for this date — allow by default.
    return ok;
  }

  if (period.status === "Closed") {
    const hasOverride =
      period.cfoOverrideActive && period.cfoOverrideUserId === userId;

    if (!hasOverride) {
      return fail(
        "PERIOD_CLOSED",
        "Time cannot be logged in a closed financial period.",
      );
    }
  }

  return ok;
}

// ─── 5. validateFutureDateBuffer ──────────────────────────────────────────────
// FR-378.1

export async function validateFutureDateBuffer(
  entryDate: string,
  projectId: number,
  dbInstance: Db = defaultDb,
): Promise<ValidationResult> {
  const [rule] = await dbInstance
    .select({ futureDateBufferDays: contractRulesTable.futureDateBufferDays })
    .from(contractRulesTable)
    .where(eq(contractRulesTable.projectId, projectId))
    .limit(1);

  const bufferDays = rule?.futureDateBufferDays ?? 7;

  const today = new Date(`${todayUTC()}T00:00:00Z`);
  const maxAllowed = new Date(today);
  maxAllowed.setUTCDate(today.getUTCDate() + bufferDays);

  const entry = new Date(`${entryDate}T00:00:00Z`);

  if (entry > maxAllowed) {
    return fail(
      "FUTURE_DATE_EXCEEDED",
      `Time cannot be logged more than ${bufferDays} days in the future.`,
    );
  }

  return ok;
}

// ─── 6. validateFixedBidCap ───────────────────────────────────────────────────
// FR-356.2

export async function validateFixedBidCap(
  projectId: number,
  newBillableHours: number,
  excludeEntryId?: number,
  dbInstance: Db = defaultDb,
): Promise<ValidationResult> {
  const [rule] = await dbInstance
    .select({
      contractType: contractRulesTable.contractType,
      maxBillableHours: contractRulesTable.maxBillableHours,
    })
    .from(contractRulesTable)
    .where(eq(contractRulesTable.projectId, projectId))
    .limit(1);

  if (!rule || rule.contractType !== "Fixed_Bid") {
    return ok; // not applicable for T&M or unconfigured projects
  }

  const cap = Number(rule.maxBillableHours ?? 0);
  if (cap <= 0) return ok; // no cap configured

  const conditions = [
    eq(effortEntriesTable.projectId, projectId),
    eq(effortEntriesTable.billableCategory, "Billable"),
    sql`${effortEntriesTable.status} IN ('Submitted', 'Approved', 'Processed')`,
  ];

  if (excludeEntryId !== undefined) {
    conditions.push(sql`${effortEntriesTable.id} != ${excludeEntryId}` as any);
  }

  const [sumRow] = await dbInstance
    .select({
      total: sql<string>`COALESCE(SUM(${effortEntriesTable.durationHours}), 0)`,
    })
    .from(effortEntriesTable)
    .where(and(...conditions));

  const existingBillable = Number(sumRow?.total ?? 0);

  if (existingBillable + newBillableHours > cap) {
    return fail(
      "FIXED_BID_CAP_EXCEEDED",
      `This project has reached its maximum billable hours cap of ${cap} hours.`,
    );
  }

  return ok;
}

// ─── 7. validateNarrative ─────────────────────────────────────────────────────
// FR-337.1, FR-337.2

const PII_PATTERNS: RegExp[] = [
  /\b\d{3}-\d{2}-\d{4}\b/,                       // SSN format
  /\b(?:\d[ -]?){15,16}\b/,                       // credit card 15-16 digit sequence
  /\b(?:ssn|social[\s-]?security|credit[\s-]?card|password|passwd|dob|date[\s-]?of[\s-]?birth)\b/i,
];

export function validateNarrative(
  narrative: string | null | undefined,
  _projectId: number,
  contractMandatesNarrative: boolean,
): ValidationResult {
  const text = narrative?.trim() ?? "";

  if (contractMandatesNarrative && text.length === 0) {
    return fail("NARRATIVE_REQUIRED", "A work description is required for this project.");
  }

  if (text.length > 0) {
    for (const pattern of PII_PATTERNS) {
      if (pattern.test(text)) {
        return fail(
          "PII_DETECTED",
          "Narrative contains sensitive information. Please remove personal data.",
        );
      }
    }
  }

  return ok;
}

// ─── 8. validateExceptionalEffort ────────────────────────────────────────────
// FR-436.1 — soft flag only, not a hard block

export async function validateExceptionalEffort(
  durationHours: number,
  _taskId: number,
  resourceId: number,
  entryDate: string,
  dbInstance: Db = defaultDb,
): Promise<ExceptionalResult> {
  const [rule] = await dbInstance
    .select({
      dailyThreshold: exceptionalEffortRulesTable.dailyOvertimeThresholdHours,
      weeklyThreshold: exceptionalEffortRulesTable.weeklyOvertimeThresholdHours,
    })
    .from(exceptionalEffortRulesTable)
    .where(eq(exceptionalEffortRulesTable.isActive, true))
    .limit(1);

  if (!rule) {
    return { isExceptional: false, reason: "" };
  }

  const dailyThreshold = Number(rule.dailyThreshold ?? 8);
  const weeklyThreshold = Number(rule.weeklyThreshold ?? 40);

  if (durationHours > dailyThreshold) {
    return {
      isExceptional: true,
      reason: `Daily hours (${durationHours}h) exceed the ${dailyThreshold}h threshold.`,
    };
  }

  const weekStart = getWeekStart(entryDate);
  const weekEnd = (() => {
    const d = new Date(`${weekStart}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 6);
    return d.toISOString().slice(0, 10);
  })();

  const [weekRow] = await dbInstance
    .select({
      total: sql<string>`COALESCE(SUM(${effortEntriesTable.durationHours}), 0)`,
    })
    .from(effortEntriesTable)
    .where(
      and(
        eq(effortEntriesTable.resourceId, resourceId),
        sql`${effortEntriesTable.entryDate} >= ${weekStart}`,
        sql`${effortEntriesTable.entryDate} <= ${weekEnd}`,
      ),
    );

  const weeklyExisting = Number(weekRow?.total ?? 0);

  if (weeklyExisting + durationHours > weeklyThreshold) {
    return {
      isExceptional: true,
      reason: `Weekly hours (${(weeklyExisting + durationHours).toFixed(2)}h) exceed the ${weeklyThreshold}h threshold.`,
    };
  }

  return { isExceptional: false, reason: "" };
}

// ─── 9. validateExceptionalJustification ────────────────────────────────────
// FR-436.2

export function validateExceptionalJustification(
  isExceptional: boolean,
  justification: string | null | undefined,
): ValidationResult {
  if (isExceptional && (justification ?? "").trim().length === 0) {
    return fail(
      "JUSTIFICATION_REQUIRED",
      "A justification is required for exceptional effort entries.",
    );
  }
  return ok;
}

// ─── 10. validateProxyAuthorization ─────────────────────────────────────────
// FR-516.1

export async function validateProxyAuthorization(
  proxyUserId: number,
  targetUserId: number,
  dbInstance: Db = defaultDb,
): Promise<ValidationResult> {
  const today = todayUTC();

  const [delegation] = await dbInstance
    .select({ id: proxyDelegationsTable.id })
    .from(proxyDelegationsTable)
    .where(
      and(
        eq(proxyDelegationsTable.proxyUserId, proxyUserId),
        eq(proxyDelegationsTable.targetUserId, targetUserId),
        eq(proxyDelegationsTable.isActive, true),
        sql`${proxyDelegationsTable.validFrom} <= ${today}`,
        sql`${proxyDelegationsTable.validUntil} >= ${today}`,
      ),
    )
    .limit(1);

  if (!delegation) {
    return fail(
      "PROXY_NOT_AUTHORIZED",
      "You are not authorized to enter time on behalf of this user.",
    );
  }

  return ok;
}

// ─── Master Orchestrator ─────────────────────────────────────────────────────

export async function validateEffortEntry(
  payload: EffortEntryPayload,
  userId: number,
  isProxy: boolean,
  dbInstance: Db = defaultDb,
): Promise<OrchestratorResult> {
  const errors: EffortError[] = [];

  const push = (field: string, result: ValidationResult) => {
    if (!result.valid) {
      errors.push({
        field,
        errorCode: result.errorCode!,
        errorMessage: result.errorMessage!,
      });
    }
  };

  // 1. Proxy authorization (check before anything else)
  if (isProxy) {
    const r = await validateProxyAuthorization(userId, payload.resourceId, dbInstance);
    push("resourceId", r);
    if (errors.length) return { valid: false, errors };
  }

  // 2. Project + task active
  const r1 = await validateProjectTaskActive(payload.projectId, payload.taskId, dbInstance);
  push("projectId", r1);
  if (errors.length) return { valid: false, errors };

  // 3. Financial period
  const r2 = await validateFinancialPeriod(payload.entryDate, userId, dbInstance);
  push("entryDate", r2);

  // 4. Future date buffer
  const r3 = await validateFutureDateBuffer(payload.entryDate, payload.projectId, dbInstance);
  push("entryDate", r3);

  // 5. Effort increment
  const r4 = await validateEffortIncrement(payload.durationHours, payload.projectId, dbInstance);
  push("durationHours", r4);

  // 6. Daily hours cap
  const r5 = await validateDailyHoursCap(
    payload.resourceId, payload.entryDate, payload.durationHours,
    payload.projectId, payload.excludeEntryId, dbInstance,
  );
  push("durationHours", r5);

  // 7. Fixed-bid cap (only for billable entries)
  if (payload.billableCategory === "Billable") {
    const r6 = await validateFixedBidCap(
      payload.projectId, payload.durationHours, payload.excludeEntryId, dbInstance,
    );
    push("durationHours", r6);
  }

  // 8. Narrative
  const [rule] = await dbInstance
    .select({ narrativeRequired: contractRulesTable.narrativeRequired })
    .from(contractRulesTable)
    .where(eq(contractRulesTable.projectId, payload.projectId))
    .limit(1);

  const r7 = validateNarrative(
    payload.narrative ?? null,
    payload.projectId,
    rule?.narrativeRequired ?? false,
  );
  push("narrative", r7);

  // 9. Exceptional effort flag (soft — populates isExceptional, not an error)
  const exceptional = await validateExceptionalEffort(
    payload.durationHours, payload.taskId, payload.resourceId,
    payload.entryDate, dbInstance,
  );

  // 10. Exceptional justification (hard block if exceptional and no justification)
  const isExceptional = payload.isExceptional || exceptional.isExceptional;
  const r9 = validateExceptionalJustification(isExceptional, payload.exceptionalJustification ?? null);
  push("exceptionalJustification", r9);

  return { valid: errors.length === 0, errors };
}
