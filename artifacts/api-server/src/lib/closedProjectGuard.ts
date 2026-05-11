/**
 * Closed-project guard
 *
 * Reusable check for any mutation route that accepts a projectId.
 * If the project status is 'completed' the entry is blocked with 403.
 *
 * Admin override: header X-Admin-Override: true + role account_admin
 * bypasses the block and writes an audit log entry instead.
 *
 * Usage:
 *   const block = await checkProjectNotClosed(projectId, req);
 *   if (block) { res.status(block.status).json(block.body); return; }
 */

import type { Request } from "express";
import { eq } from "drizzle-orm";
import { db, projectsTable } from "@workspace/db";
import { logAudit } from "./audit";
import { resolveRole } from "../constants/roles";

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
    .select({ id: projectsTable.id, status: projectsTable.status, name: projectsTable.name })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));

  if (!project) return null; // let the caller's own 404 handle missing projects

  if (project.status !== "completed") return null;

  // Project is completed — check for admin override.
  const overrideHeader = String(req.headers["x-admin-override"] ?? "").toLowerCase();
  const rawRole = String(req.headers["x-user-role"] ?? "");
  const role = resolveRole(rawRole);
  const actorUserId = Number(req.headers["x-user-id"] ?? 0) || undefined;

  if (overrideHeader === "true" && role === "account_admin") {
    // Allowed — log the override and let the caller proceed.
    await logAudit({
      entityType: "project",
      entityId: project.id,
      action: "admin_override_closed_project" as any,
      actorUserId,
      description: `Admin override: entry permitted on completed project "${project.name}"`,
      previousValue: { status: "completed" },
    });
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
