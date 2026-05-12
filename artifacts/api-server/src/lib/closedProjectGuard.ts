/**
 * Closed-project guard
 *
 * Reusable check for any mutation route that accepts a projectId.
 * If the project status is 'completed' OR the project has been soft-deleted,
 * the entry is blocked with 403.
 *
 * Admin override: header X-Admin-Override: true + role account_admin
 * bypasses the *closed* block (not deleted) and writes an audit log entry instead.
 *
 * Usage:
 *   const block = await checkProjectNotClosed(projectId, req);
 *   if (block) { res.status(block.status).json(block.body); return; }
 */

import type { Request } from "express";
import { eq } from "drizzle-orm";
import { db, projectsTable, auditLogTable } from "@workspace/db";
import type { AuthenticatedRequest } from "../middleware/roleClaim";

export interface GuardBlock {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Returns null when the caller may proceed, or a { status, body } object
 * that the route handler must send as the response before returning.
 */
export async function checkProjectNotClosed(
  projectId: number | null | undefined,
  req: Request,
): Promise<GuardBlock | null> {
  if (!projectId) return null;

  const [project] = await db
    .select({
      id: projectsTable.id,
      status: projectsTable.status,
      name: projectsTable.name,
      deletedAt: projectsTable.deletedAt,
    })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));

  if (!project) return null; // let the caller's own 404 handle missing projects

  // Soft-deleted projects can never be written to — admin override does NOT apply.
  if (project.deletedAt) {
    return {
      status: 403,
      body: {
        error: "project_deleted",
        message: "This project has been deleted. No new entries are allowed.",
      },
    };
  }

  if (project.status !== "completed") return null;

  // Project is completed — check for admin override using the verified
  // identity from roleClaim middleware (NOT the raw headers, which can be
  // spoofed when the middleware order is wrong).
  const authReq = req as AuthenticatedRequest;
  const overrideHeader = String(req.headers["x-admin-override"] ?? "").toLowerCase();
  const role = authReq.authRole;
  const actorUserId = authReq.authUserId;

  if (overrideHeader === "true" && role === "account_admin") {
    // Allowed — log the override (raw insert: action enum doesn't include
    // admin_override but the description carries the semantic meaning) and
    // let the caller proceed.
    try {
      await db.insert(auditLogTable).values({
        entityType: "project",
        entityId: String(project.id),
        action: "status_changed",
        actorUserId: actorUserId ?? null,
        description: `Admin override: entry permitted on completed project "${project.name}"`,
        previousValue: { status: "completed" },
        newValue: { override: "admin_override_closed_project" },
      });
    } catch {
      // never break the flow on audit failure
    }
    return null;
  }

  return {
    status: 403,
    body: {
      error: "project_closed",
      message: "This project is closed. No new time entries are allowed.",
    },
  };
}
