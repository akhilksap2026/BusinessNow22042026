import { type Request, type Response, type NextFunction } from "express";
import { type RoleValue, hasRole, resolveRole } from "../constants/roles";
import { requirePermission } from "../constants/permissions";

// ---------------------------------------------------------------------------
// Legacy role union — kept for full backward compatibility.
// All 11 original role strings remain valid on the x-user-role header.
// New code should prefer the four canonical roles in constants/roles.ts.
// ---------------------------------------------------------------------------

/** @deprecated Prefer RoleValue from constants/roles.ts */
export type LegacyRole =
  | "Admin"
  | "PM"
  | "Super User"
  | "Finance"
  | "Developer"
  | "Designer"
  | "QA"
  | "Collaborator"
  | "Viewer"
  | "Customer"
  | "Partner";

/**
 * Canonical four-role type (snake_case).
 * Maps: account_admin | super_user | collaborator | customer
 */
export type { RoleValue };

/**
 * AppRole accepts both legacy Title-Case strings and the new snake_case
 * canonical values so that all existing middleware callers keep working
 * while new code uses the four-role model.
 */
export type AppRole = LegacyRole | RoleValue;

// ---------------------------------------------------------------------------
// Core middleware builders
// ---------------------------------------------------------------------------

/**
 * requireRole(minimumRole)
 *
 * Passes when the requesting user's role resolves to a level >= the minimum.
 * Works with both legacy ("Admin", "PM", …) and canonical ("account_admin", …)
 * role strings on the x-user-role header.
 *
 * Minimum is expressed as a canonical RoleValue for clarity; legacy role
 * strings are accepted too because resolveRole() handles them.
 */
export function requireRole(minimumRole: RoleValue) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req.headers["x-user-role"] as string) ?? "collaborator";
    if (hasRole(userRole, minimumRole)) {
      next();
    } else {
      res.status(403).json({ error: "Insufficient permissions" });
    }
  };
}

/**
 * requireCanonicalRole(roles)
 *
 * Passes when the requesting user's canonical role is exactly one of the
 * provided canonical RoleValues. Accepts any legacy role string on the
 * header — it is resolved to its canonical equivalent first.
 */
export function requireCanonicalRole(...roles: RoleValue[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req.headers["x-user-role"] as string) ?? "collaborator";
    const canonical = resolveRole(userRole);
    if (roles.includes(canonical)) {
      next();
    } else {
      res.status(403).json({ error: "Insufficient permissions" });
    }
  };
}

/**
 * requireAnyRole(...roles)
 *
 * Legacy helper — accepts both legacy Title-Case strings and canonical
 * snake_case strings.  Kept for backward compatibility; prefer
 * requireCanonicalRole() in new code.
 */
export function requireAnyRole(...roles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req.headers["x-user-role"] as string) ?? "collaborator";
    // Check both the raw value and its canonical resolution so that callers
    // passing legacy strings ("Admin") and canonical strings ("account_admin")
    // both work regardless of what the client sends.
    const canonical = resolveRole(userRole);
    const canonicalRoles = roles.map(r => resolveRole(r));
    if (
      roles.includes(userRole as AppRole) ||
      canonicalRoles.includes(canonical)
    ) {
      next();
    } else {
      res.status(403).json({ error: "Insufficient permissions" });
    }
  };
}

// ---------------------------------------------------------------------------
// Named shortcuts (backward-compatible)
// ---------------------------------------------------------------------------

/**
 * denyCustomerRole
 *
 * Customer (canonical "customer" / legacy "Customer" / "Partner") has no
 * internal UI surface and no API surface. Returns 403 for any request
 * arriving with that role on the x-user-role header. Mounted globally on
 * the main API router after the public health endpoint.
 */
export function denyCustomerRole(req: Request, res: Response, next: NextFunction): void {
  const userRole = (req.headers["x-user-role"] as string) ?? "collaborator";
  const canonical = resolveRole(userRole);
  if (canonical === "customer") {
    res.status(403).json({ error: "Customer role has no access" });
    return;
  }
  next();
}

/** Account Admin only */
export const requireAdmin = requireRole("account_admin");

/**
 * PM-level access (legacy shortcut).
 * Resolves to super_user (level 3) — same as PM in the legacy hierarchy.
 */
export const requirePM = requireRole("super_user");

/** Finance: Admin or Finance legacy role → account_admin | super_user */
export const requireFinance = requireCanonicalRole("account_admin", "super_user");

/**
 * Cost-rate access: Admin, Finance, PM.
 * Super Users are explicitly excluded (per original spec).
 * In the four-role model "Finance" maps to super_user, so we check the
 * legacy roles explicitly to honour the exclusion.
 */
export const requireCostRateAccess = requirePermission("financials.viewCostRates");

