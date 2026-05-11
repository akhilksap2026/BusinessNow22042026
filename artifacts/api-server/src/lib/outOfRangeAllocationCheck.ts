/**
 * Out-of-range allocation detection.
 *
 * Called after PATCH /api/projects/:id when startDate or dueDate changes.
 * Finds hard allocations whose date range falls (partially or wholly) outside
 * the updated project timeline, marks them 'needs_review', and sends one
 * consolidated notification to the project PM.
 *
 * Fire-and-forget: errors must never propagate back to the HTTP response.
 */

import { eq, and, or, gt, lt } from "drizzle-orm";
import { db, allocationsTable, notificationsTable } from "@workspace/db";

export async function checkOutOfRangeAllocations(opts: {
  projectId: number;
  projectName: string;
  newStartDate: string;
  newDueDate: string;
  pmUserId: number;
}): Promise<void> {
  try {
    const { projectId, projectName, newStartDate, newDueDate, pmUserId } = opts;

    // Hard allocations only — soft allocations are planning drafts, not commitments.
    const outOfRange = await db
      .select({ id: allocationsTable.id })
      .from(allocationsTable)
      .where(and(
        eq(allocationsTable.projectId, projectId),
        eq(allocationsTable.isSoftAllocation, false),
        or(
          gt(allocationsTable.endDate, newDueDate),
          lt(allocationsTable.startDate, newStartDate),
        ),
      ));

    if (outOfRange.length === 0) return;

    const ids = outOfRange.map(r => r.id);

    // Mark each allocation 'needs_review' (parallel updates).
    await Promise.all(
      ids.map(id =>
        db.update(allocationsTable)
          .set({ status: "needs_review" })
          .where(eq(allocationsTable.id, id)),
      ),
    );

    // One consolidated notification to the PM.
    const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    await db.insert(notificationsTable).values({
      type: "out_of_range_allocation",
      message: `${ids.length} allocation${ids.length === 1 ? "" : "s"} on "${projectName}" fall outside the updated timeline (${fmt(newStartDate)}–${fmt(newDueDate)}). Please review the Team tab.`,
      userId: pmUserId,
      entityType: "project",
      entityId: String(projectId),
      read: false,
    });
  } catch {
    // Audit helpers must never break the main response.
  }
}
