import { sql, inArray } from "drizzle-orm";
import { db, timeEntriesTable } from "@workspace/db";

/**
 * Sprint 1 / Phase 1.3 (Branch A) — compute tracked hours from time_entries.
 *
 * The denormalised projects.tracked_hours column was dropped after the
 * volume gate confirmed all projects have < 10K entries (max 49 in
 * production-mirror). All callers go through this helper instead of
 * reading a stale aggregate off the projects row.
 */
export async function getTrackedHoursMap(projectIds: number[]): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  if (projectIds.length === 0) return map;
  const rows = await db
    .select({
      projectId: timeEntriesTable.projectId,
      total: sql<string>`coalesce(sum(${timeEntriesTable.hours}), 0)`,
    })
    .from(timeEntriesTable)
    .where(inArray(timeEntriesTable.projectId, projectIds))
    .groupBy(timeEntriesTable.projectId);
  for (const r of rows) {
    if (r.projectId != null) map.set(r.projectId, Number(r.total));
  }
  for (const id of projectIds) if (!map.has(id)) map.set(id, 0);
  return map;
}

export async function getTrackedHours(projectId: number): Promise<number> {
  const m = await getTrackedHoursMap([projectId]);
  return m.get(projectId) ?? 0;
}
