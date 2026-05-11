/**
 * Time-off / allocation conflict check.
 *
 * Called after a time-off request is approved.  Finds every hard allocation
 * for the resource whose date range overlaps the approved leave, notifies the
 * project PM, and marks the allocation as 'at_risk' for human review.
 *
 * No allocations are cancelled or reassigned automatically (Rule 2).
 */

import { eq, and, lte, gte } from "drizzle-orm";
import {
  db,
  allocationsTable,
  projectsTable,
  usersTable,
  notificationsTable,
} from "@workspace/db";

export async function checkTimeOffAllocationConflicts(opts: {
  resourceUserId: number;
  startDate: string;   // YYYY-MM-DD (inclusive)
  endDate: string;     // YYYY-MM-DD (inclusive)
}): Promise<void> {
  const { resourceUserId, startDate, endDate } = opts;

  // 1. Find all hard allocations for this user that overlap the leave range.
  //    Overlap condition: alloc.startDate <= leave.endDate AND alloc.endDate >= leave.startDate
  const conflicts = await db
    .select({
      id: allocationsTable.id,
      projectId: allocationsTable.projectId,
    })
    .from(allocationsTable)
    .where(and(
      eq(allocationsTable.userId, resourceUserId),
      eq(allocationsTable.isSoftAllocation, false),
      lte(allocationsTable.startDate, endDate),
      gte(allocationsTable.endDate, startDate),
    ));

  if (conflicts.length === 0) return;

  // 2. Fetch the resource's display name once.
  const [resourceUser] = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, resourceUserId));
  const resourceName = resourceUser?.name ?? `User #${resourceUserId}`;

  // 3. For each conflicting allocation: notify the PM + mark at_risk.
  for (const alloc of conflicts) {
    const [project] = await db
      .select({ id: projectsTable.id, name: projectsTable.name, ownerId: projectsTable.ownerId })
      .from(projectsTable)
      .where(eq(projectsTable.id, alloc.projectId));

    if (!project?.ownerId) continue;

    await Promise.all([
      db.insert(notificationsTable).values({
        type: "leave_allocation_conflict",
        message: `${resourceName}'s approved leave (${startDate}–${endDate}) overlaps their allocation on ${project.name}. Please review staffing.`,
        userId: project.ownerId,
        entityType: "allocation",
        entityId: String(alloc.id),
        read: false,
      }),
      db.update(allocationsTable)
        .set({ status: "at_risk" } as any)
        .where(eq(allocationsTable.id, alloc.id)),
    ]);
  }
}
