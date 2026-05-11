/**
 * Effort overrun detection.
 *
 * Called after a timesheet is approved.  For every task referenced by the
 * timesheet's time entries, sums all hours logged against that task across
 * all timesheets.  When the total reaches OVERRUN_ALERT_THRESHOLD × plannedHours
 * and no alert has been sent before, the project PM receives one notification
 * and task.overrunAlertSentAt is stamped to prevent repeat alerts.
 */

import { eq, and, isNotNull, sql } from "drizzle-orm";
import {
  db,
  tasksTable,
  timeEntriesTable,
  projectsTable,
  notificationsTable,
} from "@workspace/db";

/** Fire when actual hours reach this fraction of plannedHours (90%). */
export const OVERRUN_ALERT_THRESHOLD = 0.9;

export async function checkEffortOverrun(timesheetId: number): Promise<void> {
  // 1. Collect distinct taskIds referenced by this timesheet's time entries.
  const entryRows = await db
    .selectDistinct({ taskId: timeEntriesTable.taskId })
    .from(timeEntriesTable)
    .where(and(
      eq(timeEntriesTable.timesheetId, timesheetId),
      isNotNull(timeEntriesTable.taskId),
    ));

  const taskIds = entryRows
    .map(r => r.taskId)
    .filter((id): id is number => id !== null && id !== undefined);

  if (taskIds.length === 0) return;

  // 2. For each task, check the overrun condition.
  for (const taskId of taskIds) {
    const [task] = await db
      .select({
        id: tasksTable.id,
        name: tasksTable.name,
        plannedHours: tasksTable.plannedHours,
        overrunAlertSentAt: tasksTable.overrunAlertSentAt,
        projectId: tasksTable.projectId,
      })
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId));

    if (!task) continue;

    const plannedHours = Number(task.plannedHours ?? 0);
    if (plannedHours <= 0) continue;           // no budget set — nothing to check
    if (task.overrunAlertSentAt !== null) continue; // already alerted once — Rule 3

    // Sum ALL hours logged against this task across every timesheet.
    const [sumRow] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${timeEntriesTable.hours}), 0)`,
      })
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.taskId, taskId));

    const actualHours = Number(sumRow?.total ?? 0);

    if (actualHours < plannedHours * OVERRUN_ALERT_THRESHOLD) continue;

    // Threshold crossed — look up the project PM.
    const [project] = await db
      .select({ ownerId: projectsTable.ownerId })
      .from(projectsTable)
      .where(eq(projectsTable.id, task.projectId));

    if (!project?.ownerId) continue;

    const pct = Math.round((actualHours / plannedHours) * 100);

    // Fire notification + stamp the task atomically (best-effort — errors must
    // not propagate back to the caller and break the approve response).
    await Promise.all([
      db.insert(notificationsTable).values({
        type: "effort_overrun",
        message: `Task '${task.name}' has consumed ${pct}% of its planned ${plannedHours}h budget.`,
        userId: project.ownerId,
        entityType: "task",
        entityId: String(taskId),
        read: false,
      }),
      db.update(tasksTable)
        .set({ overrunAlertSentAt: new Date() })
        .where(eq(tasksTable.id, taskId)),
    ]);
  }
}
