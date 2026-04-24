/**
 * validateInviteRole
 *
 * Enforces the role-assignment matrix described in the canonical four-role
 * model. Applied to POST /users/invite (and may be reused on any future
 * role-change endpoint).
 *
 * Matrix:
 *   account_admin → any role (account_admin, super_user, collaborator, customer)
 *   super_user    → collaborator, customer
 *   collaborator  → customer (only inside a project — projectId required)
 *   customer      → nothing
 *
 * Customer invites must always be scoped to a project (projectId required).
 */

import { type Request, type Response, type NextFunction } from "express";
import { resolveRole, type RoleValue } from "../constants/roles";

const ALLOWED_ASSIGNMENTS: Record<RoleValue, RoleValue[]> = {
  account_admin: ["account_admin", "super_user", "collaborator", "customer"],
  super_user:    ["collaborator", "customer"],
  collaborator:  ["customer"],
  customer:      [],
};

export function validateInviteRole(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const headerRole = (req.headers["x-user-role"] as string) ?? "";
  const inviterRole = resolveRole(headerRole);

  const rawTarget = req.body?.role;
  if (typeof rawTarget !== "string" || rawTarget.length === 0) {
    res.status(400).json({ error: "Body field 'role' is required" });
    return;
  }
  const targetRole = resolveRole(rawTarget);

  const allowed = ALLOWED_ASSIGNMENTS[inviterRole] ?? [];
  if (!allowed.includes(targetRole)) {
    res.status(403).json({
      error: `A ${inviterRole} cannot assign the ${targetRole} role`,
    });
    return;
  }

  // Customers must always be scoped to a project.
  if (targetRole === "customer" && !req.body?.projectId) {
    res.status(400).json({
      error: "Customer invites require a projectId",
    });
    return;
  }

  // Collaborators may only add users (customers) inside a project context.
  if (inviterRole === "collaborator" && !req.body?.projectId) {
    res.status(403).json({
      error: "Collaborators may only add users within a project context (projectId required)",
    });
    return;
  }

  next();
}
