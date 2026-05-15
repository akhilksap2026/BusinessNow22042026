/**
 * Weekly Aggregation Service
 *
 * Provides grouped weekly timesheet views and invoice-ready extraction
 * for the effort tracking module.
 *
 * Implements: FR-396.1, FR-396.2, FR-397.1, FR-397.2, FR-537.1
 */

import { eq, and, sql } from "drizzle-orm";
import {
  db as defaultDb,
  effortEntriesTable,
  projectsTable,
  tasksTable,
} from "@workspace/db";
import { getWeekStart } from "./effortValidationService";

type Db = typeof defaultDb;

// ─── Types ────────────────────────────────────────────────────────────────────

export type DailyEntry = {
  entryId: number;
  entryDate: string;
  durationHours: number;
  billableCategory: string;
  status: string;
  narrative: string | null;
};

export type TaskGroup = {
  taskId: number;
  taskName: string;
  entries: DailyEntry[];
  taskTotal: number;
};

export type ProjectGroup = {
  projectId: number;
  projectName: string;
  tasks: TaskGroup[];
  projectTotal: number;
};

export type WeekBlock = {
  month: string;                  // "YYYY-MM"
  weekStart: string;
  weekEnd: string;
  projects: ProjectGroup[];
  dailyTotals: Record<string, number>;   // "YYYY-MM-DD" → total hours
  weekTotal: number;
  billableTotal: number;
  nonBillableTotal: number;
  utilizationRate: number;
};

export type WeeklyTimesheetView = {
  resourceId: number;
  weekStartDate: string;
  isCrossMonth: boolean;
  blocks: WeekBlock[];
};

export type InvoiceEffortEntry = {
  entryId: number;
  resourceId: number;
  projectId: number;
  taskId: number;
  entryDate: string;
  durationHours: number;
  billableCategory: string;
  narrative: string | null;
  status: "Approved";
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function weekEndDate(weekStart: string): string {
  const d = new Date(`${weekStart}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

function monthOf(dateStr: string): string {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

const STANDARD_WEEKLY_HOURS = Number(process.env.STANDARD_WEEKLY_HOURS ?? 40);

// ─── 1. getWeeklyTimesheetView ────────────────────────────────────────────────

/**
 * Returns all effort_entries for a resource in the Mon–Sun week, grouped by
 * project → task → daily entry.
 *
 * Cross-month handling: when the 7-day window spans two calendar months the
 * result contains two separate WeekBlocks — one per month.
 */
export async function getWeeklyTimesheetView(
  resourceId: number,
  weekStartDate: string,
  dbInstance: Db = defaultDb,
): Promise<WeeklyTimesheetView> {
  const weekStart = getWeekStart(weekStartDate);
  const weekEnd   = weekEndDate(weekStart);

  // Fetch entries with project + task names in one round-trip
  const rows = await dbInstance
    .select({
      entryId:         effortEntriesTable.id,
      entryDate:       effortEntriesTable.entryDate,
      durationHours:   effortEntriesTable.durationHours,
      billableCategory: effortEntriesTable.billableCategory,
      status:          effortEntriesTable.status,
      narrative:       effortEntriesTable.narrative,
      projectId:       effortEntriesTable.projectId,
      taskId:          effortEntriesTable.taskId,
      projectName:     projectsTable.name,
      taskName:        tasksTable.name,
    })
    .from(effortEntriesTable)
    .innerJoin(projectsTable, eq(projectsTable.id, effortEntriesTable.projectId))
    .innerJoin(tasksTable,    eq(tasksTable.id,    effortEntriesTable.taskId))
    .where(
      and(
        eq(effortEntriesTable.resourceId, resourceId),
        sql`${effortEntriesTable.entryDate} >= ${weekStart}`,
        sql`${effortEntriesTable.entryDate} <= ${weekEnd}`,
      ),
    )
    .orderBy(effortEntriesTable.entryDate);

  const isCrossMonth = monthOf(weekStart) !== monthOf(weekEnd);

  // Partition rows into month buckets
  const buckets: Map<string, typeof rows> = new Map();
  for (const row of rows) {
    const m = monthOf(row.entryDate);
    if (!buckets.has(m)) buckets.set(m, []);
    buckets.get(m)!.push(row);
  }

  // If no cross-month, ensure we always have at least one block
  if (buckets.size === 0) {
    buckets.set(monthOf(weekStart), []);
  }

  const blocks: WeekBlock[] = [];

  for (const [month, monthRows] of buckets) {
    // Build project → task → entries map
    const projectMap = new Map<number, { name: string; tasks: Map<number, { name: string; entries: DailyEntry[] }> }>();

    const dailyTotals: Record<string, number> = {};
    let billableTotal    = 0;
    let nonBillableTotal = 0;

    for (const row of monthRows) {
      const hours = Number(row.durationHours ?? 0);

      // Daily totals
      dailyTotals[row.entryDate] = (dailyTotals[row.entryDate] ?? 0) + hours;

      if (row.billableCategory === "Billable") billableTotal    += hours;
      else                                     nonBillableTotal += hours;

      // Build hierarchy
      if (!projectMap.has(row.projectId)) {
        projectMap.set(row.projectId, { name: row.projectName, tasks: new Map() });
      }
      const proj = projectMap.get(row.projectId)!;

      if (!proj.tasks.has(row.taskId)) {
        proj.tasks.set(row.taskId, { name: row.taskName, entries: [] });
      }
      proj.tasks.get(row.taskId)!.entries.push({
        entryId:         row.entryId,
        entryDate:       row.entryDate,
        durationHours:   hours,
        billableCategory: row.billableCategory,
        status:          row.status,
        narrative:       row.narrative,
      });
    }

    const weekTotal = billableTotal + nonBillableTotal;
    const utilizationRate = Math.round((billableTotal / Math.max(STANDARD_WEEKLY_HOURS, 1)) * 100 * 100) / 100;

    const projects: ProjectGroup[] = [];

    for (const [projectId, proj] of projectMap) {
      const tasks: TaskGroup[] = [];
      for (const [taskId, task] of proj.tasks) {
        const taskTotal = task.entries.reduce((s, e) => s + e.durationHours, 0);
        tasks.push({ taskId, taskName: task.name, entries: task.entries, taskTotal });
      }
      const projectTotal = tasks.reduce((s, t) => s + t.taskTotal, 0);
      projects.push({ projectId, projectName: proj.name, tasks, projectTotal });
    }

    blocks.push({
      month,
      weekStart,
      weekEnd,
      projects,
      dailyTotals,
      weekTotal:       Math.round(weekTotal * 100) / 100,
      billableTotal:   Math.round(billableTotal * 100) / 100,
      nonBillableTotal: Math.round(nonBillableTotal * 100) / 100,
      utilizationRate,
    });
  }

  return { resourceId, weekStartDate: weekStart, isCrossMonth, blocks };
}

// ─── 2. getInvoiceExtractionPayload ───────────────────────────────────────────

/**
 * Returns ONLY Approved effort entries for a project within a date range.
 *
 * HARD FILTER — status = 'Approved' is always enforced regardless of any
 * other criteria passed by the caller. Draft, Submitted, Rejected, and
 * Processed records are never included.
 */
export async function getInvoiceExtractionPayload(
  projectId: number,
  startDate: string,
  endDate: string,
  dbInstance: Db = defaultDb,
): Promise<InvoiceEffortEntry[]> {
  const rows = await dbInstance
    .select({
      entryId:         effortEntriesTable.id,
      resourceId:      effortEntriesTable.resourceId,
      projectId:       effortEntriesTable.projectId,
      taskId:          effortEntriesTable.taskId,
      entryDate:       effortEntriesTable.entryDate,
      durationHours:   effortEntriesTable.durationHours,
      billableCategory: effortEntriesTable.billableCategory,
      narrative:       effortEntriesTable.narrative,
      status:          effortEntriesTable.status,
    })
    .from(effortEntriesTable)
    .where(
      and(
        eq(effortEntriesTable.projectId, projectId),
        // HARD FILTER — never relaxed
        sql`${effortEntriesTable.status} = 'Approved'`,
        sql`${effortEntriesTable.entryDate} >= ${startDate}`,
        sql`${effortEntriesTable.entryDate} <= ${endDate}`,
      ),
    )
    .orderBy(effortEntriesTable.entryDate, effortEntriesTable.resourceId);

  return rows.map(r => ({
    entryId:         r.entryId,
    resourceId:      r.resourceId,
    projectId:       r.projectId,
    taskId:          r.taskId,
    entryDate:       r.entryDate,
    durationHours:   Number(r.durationHours),
    billableCategory: r.billableCategory,
    narrative:       r.narrative,
    status:          "Approved" as const,
  }));
}
