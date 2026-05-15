/**
 * Effort Replication Service
 *
 * Provides "copy last week" functionality for effort entries, with explicit
 * user confirmation required before replicated batches may be submitted.
 *
 * Implements: FR-416.1, FR-416.2
 */

import { eq, and, sql } from "drizzle-orm";
import { createHmac } from "node:crypto";
import {
  db as defaultDb,
  effortEntriesTable,
  projectsTable,
} from "@workspace/db";
import { getWeekStart } from "./effortValidationService";

type Db = typeof defaultDb;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReplicatedEntry = {
  entryId: number;
  projectId: number;
  taskId: number;
  entryDate: string;
  durationHours: number;
};

export type SkippedEntry = {
  originalEntryId: number;
  projectId: number;
  projectName: string;
  reason: string;
};

export type ReplicationResult = {
  created: ReplicatedEntry[];
  skipped: SkippedEntry[];
};

export type ReplicationConfirmation = {
  resourceId: number;
  weekStartDate: string;
  confirmedByUserId: number;
  confirmedAt: string;
  token: string;
};

// ─── Token helpers ────────────────────────────────────────────────────────────

const TOKEN_SECRET = process.env.REPLICATION_TOKEN_SECRET ?? "dev-replication-secret";

/**
 * Generates a signed confirmation token.
 * Format: `{resourceId}:{weekStart}:{userId}:{ts}` signed with HMAC-SHA256.
 */
function generateConfirmationToken(
  resourceId: number,
  weekStartDate: string,
  userId: number,
  ts: number,
): string {
  const payload = `${resourceId}:${weekStartDate}:${userId}:${ts}`;
  const sig = createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

/**
 * Validates a token returned by `confirmReplicatedSubmission`.
 * Returns the decoded payload or null if invalid / tampered.
 */
export function validateConfirmationToken(token: string): {
  resourceId: number;
  weekStartDate: string;
  userId: number;
  ts: number;
} | null {
  try {
    const [encodedPayload, sig] = token.split(".");
    const payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const expectedSig = createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
    if (sig !== expectedSig) return null;

    const [resourceId, weekStartDate, userId, ts] = payload.split(":");
    return {
      resourceId:    Number(resourceId),
      weekStartDate,
      userId:        Number(userId),
      ts:            Number(ts),
    };
  } catch {
    return null;
  }
}

// ─── Previous week date range ─────────────────────────────────────────────────

function prevWeekRange(currentWeekStart: string): { start: string; end: string } {
  const mon = new Date(`${getWeekStart(currentWeekStart)}T00:00:00Z`);
  const prevMon = new Date(mon);
  prevMon.setUTCDate(mon.getUTCDate() - 7);
  const prevSun = new Date(prevMon);
  prevSun.setUTCDate(prevMon.getUTCDate() + 6);
  return {
    start: prevMon.toISOString().slice(0, 10),
    end:   prevSun.toISOString().slice(0, 10),
  };
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ─── 1. replicatePreviousWeek ────────────────────────────────────────────────

/**
 * Copies all finalisable entries from the previous week into the current week.
 *
 * Eligibility: previous-week entries with status in Draft, Submitted, or Approved
 *   (Rejected / Processed are excluded — they are either rejected work or already billed).
 * Projects that are no longer Active are skipped and reported in `skipped`.
 * New entries are created as Draft with is_replicated = true.
 * Dates are shifted exactly +7 days.
 */
export async function replicatePreviousWeek(
  resourceId: number,
  currentWeekStart: string,
  userId: number,
  dbInstance: Db = defaultDb,
): Promise<ReplicationResult> {
  const { start: prevStart, end: prevEnd } = prevWeekRange(currentWeekStart);

  // Fetch eligible previous-week entries with project status
  const rows = await dbInstance
    .select({
      id:              effortEntriesTable.id,
      projectId:       effortEntriesTable.projectId,
      taskId:          effortEntriesTable.taskId,
      entryDate:       effortEntriesTable.entryDate,
      durationHours:   effortEntriesTable.durationHours,
      billableCategory: effortEntriesTable.billableCategory,
      narrative:       effortEntriesTable.narrative,
      financialPeriodId: effortEntriesTable.financialPeriodId,
      projectStatus:   projectsTable.status,
      projectName:     projectsTable.name,
    })
    .from(effortEntriesTable)
    .innerJoin(projectsTable, eq(projectsTable.id, effortEntriesTable.projectId))
    .where(
      and(
        eq(effortEntriesTable.resourceId, resourceId),
        sql`${effortEntriesTable.entryDate} >= ${prevStart}`,
        sql`${effortEntriesTable.entryDate} <= ${prevEnd}`,
        sql`${effortEntriesTable.status} IN ('Draft', 'Submitted', 'Approved')`,
      ),
    );

  const created: ReplicatedEntry[] = [];
  const skipped: SkippedEntry[]   = [];
  const currentWeekMon = getWeekStart(currentWeekStart);

  for (const row of rows) {
    // Skip closed projects
    if (row.projectStatus !== "Active") {
      skipped.push({
        originalEntryId: row.id,
        projectId:       row.projectId,
        projectName:     row.projectName,
        reason:          `Project is '${row.projectStatus}' — cannot log time against it.`,
      });
      continue;
    }

    const newDate = shiftDate(row.entryDate, 7);

    const [inserted] = await dbInstance
      .insert(effortEntriesTable)
      .values({
        resourceId,
        enteredById:      userId,
        projectId:        row.projectId,
        taskId:           row.taskId,
        entryDate:        newDate,
        durationHours:    row.durationHours,
        billableCategory: row.billableCategory,
        narrative:        row.narrative,
        isReplicated:     true,
        status:           "Draft",
        weekStartDate:    currentWeekMon,
        financialPeriodId: row.financialPeriodId,
      } as any)
      .returning({ entryId: effortEntriesTable.id });

    created.push({
      entryId:       inserted.entryId,
      projectId:     row.projectId,
      taskId:        row.taskId,
      entryDate:     newDate,
      durationHours: Number(row.durationHours),
    });
  }

  return { created, skipped };
}

// ─── 2. confirmReplicatedSubmission ──────────────────────────────────────────

/**
 * Records that a user has explicitly confirmed the accuracy of replicated
 * entries before submission.  The returned token must be passed to the
 * submit endpoint to gate replicated-batch submissions.
 *
 * `timesheetId` is used as a semantic grouping identifier (not a DB FK);
 * it should be the resource_id or a client-generated batch ID.
 */
export async function confirmReplicatedSubmission(
  timesheetId: number,
  userId: number,
): Promise<ReplicationConfirmation> {
  // Derive weekStartDate from the replicated entries for this "timesheet"
  // (timesheetId treated as resourceId for the current confirmation context)
  const confirmedAt = new Date();
  const ts = confirmedAt.getTime();

  // Use timesheetId as resourceId for the token payload — the caller maps
  // the batch by whichever identifier is meaningful in their context.
  const weekStartDate = getWeekStart(confirmedAt.toISOString().slice(0, 10));
  const token = generateConfirmationToken(timesheetId, weekStartDate, userId, ts);

  return {
    resourceId:    timesheetId,
    weekStartDate,
    confirmedByUserId: userId,
    confirmedAt:   confirmedAt.toISOString(),
    token,
  };
}
