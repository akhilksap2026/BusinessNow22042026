/**
 * Billable Categorization Service
 *
 * Handles auto-categorization, authorized overrides, and weekly
 * billable summary calculations for effort entries.
 *
 * Implements: FR-356.1, FR-357.1, FR-357.2, FR-397.1, FR-397.2
 */

import { eq, and, sql, inArray } from "drizzle-orm";
import {
  db as defaultDb,
  tasksTable,
  usersTable,
  effortEntriesTable,
  effortAuditLogTable,
} from "@workspace/db";
import { getWeekStart } from "./effortValidationService";

type Db = typeof defaultDb;

/** Roles permitted to override billable category. */
const OVERRIDE_ROLES = new Set(["account_admin", "super_user", "Authorized_Approver"]);

/** Standard weekly hours (configurable via env). */
const STANDARD_WEEKLY_HOURS = Number(process.env.STANDARD_WEEKLY_HOURS ?? 40);

// ─── 1. autoCategorizEntry ───────────────────────────────────────────────────

/**
 * Returns the default billable category for a task.
 * Called when creating a new effort entry to pre-fill billable_category.
 */
export async function autoCategorizEntry(
  taskId: number,
  dbInstance: Db = defaultDb,
): Promise<"Billable" | "Non-Billable"> {
  const [task] = await dbInstance
    .select({ defaultBillableCategory: tasksTable.defaultBillableCategory })
    .from(tasksTable)
    .where(eq(tasksTable.id, taskId))
    .limit(1);

  const cat = task?.defaultBillableCategory ?? "Non-Billable";
  return cat === "Billable" ? "Billable" : "Non-Billable";
}

// ─── 2. overrideBillableCategory ─────────────────────────────────────────────

export type BillableCategoryOverrideResult = {
  entryId: number;
  previousCategory: string;
  newCategory: string;
  overriddenByUserId: number;
  overriddenAt: string;
};

/**
 * Overrides the billable category of an effort entry.
 * Requires the acting user to have an authorized approver role.
 * Preserves the original value in original_billable_category.
 * Writes an immutable Override_Billable audit record.
 */
export async function overrideBillableCategory(
  entryId: number,
  newCategory: "Billable" | "Non-Billable",
  overridingUserId: number,
  dbInstance: Db = defaultDb,
): Promise<BillableCategoryOverrideResult> {
  // Role check
  const [user] = await dbInstance
    .select({ role: usersTable.role, secondaryRoles: usersTable.secondaryRoles })
    .from(usersTable)
    .where(eq(usersTable.id, overridingUserId))
    .limit(1);

  if (!user) throw new Error(`User ${overridingUserId} not found.`);

  const allRoles = [user.role, ...(user.secondaryRoles ?? [])];
  const canOverride = allRoles.some(r => OVERRIDE_ROLES.has(r));

  if (!canOverride) {
    throw new Error(
      `User ${overridingUserId} does not have permission to override billable category.`,
    );
  }

  // Fetch entry
  const [entry] = await dbInstance
    .select({
      id: effortEntriesTable.id,
      billableCategory: effortEntriesTable.billableCategory,
      originalBillableCategory: effortEntriesTable.originalBillableCategory,
    })
    .from(effortEntriesTable)
    .where(eq(effortEntriesTable.id, entryId))
    .limit(1);

  if (!entry) throw new Error(`Effort entry ${entryId} not found.`);

  const previousCategory = entry.billableCategory;

  // Preserve original only on first override
  const originalCategory = entry.originalBillableCategory ?? previousCategory;

  const overriddenAt = new Date();

  await dbInstance
    .update(effortEntriesTable)
    .set({
      billableCategory: newCategory,
      originalBillableCategory: originalCategory,
      updatedAt: overriddenAt,
    })
    .where(eq(effortEntriesTable.id, entryId));

  // Immutable audit record
  await dbInstance.insert(effortAuditLogTable).values({
    effortEntryId: entryId,
    action: "Override_Billable",
    performedById: overridingUserId,
    performedAt: overriddenAt,
    previousValue: { billableCategory: previousCategory } as any,
    newValue: { billableCategory: newCategory } as any,
    notes: `Override by user ${overridingUserId}: '${previousCategory}' → '${newCategory}'`,
    isImmutable: true,
  } as any);

  return {
    entryId,
    previousCategory,
    newCategory,
    overriddenByUserId: overridingUserId,
    overriddenAt: overriddenAt.toISOString(),
  };
}

// ─── 3. getBillableSummaryForWeek ────────────────────────────────────────────

export type WeekBillableSummary = {
  resourceId: number;
  weekStartDate: string;
  totalBillable: number;
  totalNonBillable: number;
  utilizationRate: number;       // percentage, 0–100+
  standardWeeklyHours: number;
  holidayHours: number;
};

/**
 * Summarises billable vs non-billable hours for a resource in a given week.
 * Only counts entries with status Submitted, Approved, or Processed.
 * utilizationRate = totalBillable / (standardWeeklyHours - holidayHours) * 100
 */
export async function getBillableSummaryForWeek(
  resourceId: number,
  weekStartDate: string,
  dbInstance: Db = defaultDb,
): Promise<WeekBillableSummary> {
  const weekStart = getWeekStart(weekStartDate);
  const weekEndDate = (() => {
    const d = new Date(`${weekStart}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 6);
    return d.toISOString().slice(0, 10);
  })();

  const rows = await dbInstance
    .select({
      billableCategory: effortEntriesTable.billableCategory,
      durationHours: effortEntriesTable.durationHours,
    })
    .from(effortEntriesTable)
    .where(
      and(
        eq(effortEntriesTable.resourceId, resourceId),
        sql`${effortEntriesTable.entryDate} >= ${weekStart}`,
        sql`${effortEntriesTable.entryDate} <= ${weekEndDate}`,
        sql`${effortEntriesTable.status} IN ('Submitted', 'Approved', 'Processed')`,
      ),
    );

  let totalBillable = 0;
  let totalNonBillable = 0;

  for (const r of rows) {
    const h = Number(r.durationHours ?? 0);
    if (r.billableCategory === "Billable") totalBillable += h;
    else totalNonBillable += h;
  }

  // Holiday hours: fetch from user's holiday calendar if linked (stub: 0 unless extended)
  const holidayHours = 0;

  const effective = Math.max(STANDARD_WEEKLY_HOURS - holidayHours, 1);
  const utilizationRate = (totalBillable / effective) * 100;

  return {
    resourceId,
    weekStartDate: weekStart,
    totalBillable: Math.round(totalBillable * 100) / 100,
    totalNonBillable: Math.round(totalNonBillable * 100) / 100,
    utilizationRate: Math.round(utilizationRate * 100) / 100,
    standardWeeklyHours: STANDARD_WEEKLY_HOURS,
    holidayHours,
  };
}
