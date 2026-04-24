/**
 * Centralized permission matrix — Rocketlane-style architecture.
 *
 * Two layers:
 *   ACCOUNT_PERMISSIONS  – coarse-grained, evaluated against the user's global role
 *   PROJECT_PERMISSIONS  – fine-grained, evaluated against the user's role within
 *                          a specific project (admin | collaborator | customer)
 *
 * Role resolution:
 *   Both legacy Title-Case strings ("Admin", "PM", …) and canonical snake_case
 *   strings ("account_admin", "super_user", …) are accepted by `can()` and
 *   `canOnProject()` — they are resolved via LEGACY_ROLE_MAP before lookup.
 *
 * Existing coarse helpers from middleware/rbac.ts map to these permissions:
 *   requireAdmin           → 'settings.manageAdvanced', 'settings.manageIntegrations', …
 *   requirePM / requireFinance → 'projects.create', 'invoicing.view', …
 *   requireCostRateAccess  → 'financials.viewCostRates'
 *   blockPortalRoles       → any permission where customer: false
 *
 * Do not duplicate checks — prefer can() in new route handlers and keep the
 * named shortcuts in rbac.ts for backward-compatible existing routes.
 */

import { resolveRole, type RoleValue } from "./roles";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AccountRoleMap = {
  account_admin: boolean;
  super_user: boolean;
  collaborator: boolean;
  customer: boolean;
};

type ProjectRoleMap = {
  admin: boolean;
  collaborator: boolean;
  customer: boolean;
};

export type AccountPermission = keyof typeof ACCOUNT_PERMISSIONS;
export type ProjectPermission = keyof typeof PROJECT_PERMISSIONS;

// ---------------------------------------------------------------------------
// ACCOUNT-LEVEL permissions
// Evaluated against the user's global canonical role.
// ---------------------------------------------------------------------------

export const ACCOUNT_PERMISSIONS = {
  // ── PROJECTS ──────────────────────────────────────────────────────────────
  // Alias: requirePM covers create/edit/delete on API routes
  "projects.create":           { account_admin: true,  super_user: true,  collaborator: false, customer: false },
  "projects.view":             { account_admin: true,  super_user: true,  collaborator: true,  customer: false },
  "projects.edit":             { account_admin: true,  super_user: true,  collaborator: false, customer: false },
  "projects.delete":           { account_admin: true,  super_user: true,  collaborator: false, customer: false },
  "projects.archive.view":     { account_admin: true,  super_user: true,  collaborator: false, customer: false },
  "projects.invite.team":      { account_admin: true,  super_user: true,  collaborator: true,  customer: false },
  "projects.invite.customer":  { account_admin: true,  super_user: true,  collaborator: true,  customer: false },
  "projects.setVisibility":    { account_admin: true,  super_user: true,  collaborator: false, customer: false },
  "projects.addPartners":      { account_admin: true,  super_user: true,  collaborator: false, customer: false },

  // ── TASKS ─────────────────────────────────────────────────────────────────
  "tasks.create":              { account_admin: true,  super_user: true,  collaborator: true,  customer: false },
  "tasks.view":                { account_admin: true,  super_user: true,  collaborator: true,  customer: false },
  "tasks.edit":                { account_admin: true,  super_user: true,  collaborator: true,  customer: false },
  "tasks.delete":              { account_admin: true,  super_user: true,  collaborator: true,  customer: false },
  "tasks.convertToMilestone":  { account_admin: true,  super_user: true,  collaborator: false, customer: false },
  "tasks.markPrivate":         { account_admin: true,  super_user: true,  collaborator: true,  customer: false },

  // ── ACCOUNTS (CRM) ────────────────────────────────────────────────────────
  // Alias: requirePM covers create/edit/delete on accounts API routes
  "accounts.view":             { account_admin: true,  super_user: true,  collaborator: true,  customer: false },
  "accounts.create":           { account_admin: true,  super_user: true,  collaborator: false, customer: false },
  "accounts.edit":             { account_admin: true,  super_user: true,  collaborator: false, customer: false },
  "accounts.delete":           { account_admin: true,  super_user: true,  collaborator: false, customer: false },
  "accounts.merge":            { account_admin: true,  super_user: true,  collaborator: false, customer: false },

  // ── TEMPLATES ─────────────────────────────────────────────────────────────
  "templates.create":          { account_admin: true,  super_user: true,  collaborator: false, customer: false },
  "templates.manage":          { account_admin: true,  super_user: true,  collaborator: false, customer: false },

  // ── DASHBOARDS ────────────────────────────────────────────────────────────
  "dashboards.view":           { account_admin: true,  super_user: true,  collaborator: false, customer: false },
  "dashboards.manage":         { account_admin: true,  super_user: true,  collaborator: false, customer: false },

  // ── REPORTS ───────────────────────────────────────────────────────────────
  "reports.viewStandard":      { account_admin: true,  super_user: true,  collaborator: false, customer: false },
  "reports.viewCustom":        { account_admin: true,  super_user: false, collaborator: false, customer: false },
  "reports.createCustom":      { account_admin: true,  super_user: false, collaborator: false, customer: false },

  // ── SETTINGS ──────────────────────────────────────────────────────────────
  // Alias: requireAdmin covers manageIntegrations and manageAdvanced
  "settings.manageTeam":       { account_admin: true,  super_user: true,  collaborator: false, customer: false },
  "settings.manageRoles":      { account_admin: true,  super_user: true,  collaborator: false, customer: false },
  "settings.manageBilling":    { account_admin: true,  super_user: true,  collaborator: false, customer: false },
  "settings.manageIntegrations": { account_admin: true, super_user: false, collaborator: false, customer: false },
  "settings.manageAdvanced":   { account_admin: true,  super_user: false, collaborator: false, customer: false },

  // ── TIME TRACKING ─────────────────────────────────────────────────────────
  "timeTracking.view":         { account_admin: true,  super_user: true,  collaborator: true,  customer: false },
  "timeTracking.submit":       { account_admin: true,  super_user: true,  collaborator: true,  customer: false },
  "timeTracking.approve":      { account_admin: true,  super_user: true,  collaborator: false, customer: false },

  // ── RESOURCE MANAGEMENT ───────────────────────────────────────────────────
  "resources.viewPlans":       { account_admin: true,  super_user: true,  collaborator: true,  customer: false },
  "resources.manageAllocations": { account_admin: true, super_user: true, collaborator: false, customer: false },
  "resources.capacityPlanning":  { account_admin: true, super_user: true, collaborator: false, customer: false },
  "resources.raiseRequests":   { account_admin: true,  super_user: true,  collaborator: false, customer: false },
  "resources.approveRequests": { account_admin: true,  super_user: true,  collaborator: false, customer: false },

  // ── FINANCIALS ────────────────────────────────────────────────────────────
  // Alias: requireCostRateAccess → 'financials.viewCostRates'
  //        requireFinance        → 'financials.viewRateCards', 'invoicing.*'
  "financials.viewBudgets":    { account_admin: true,  super_user: true,  collaborator: true,  customer: false },
  "financials.viewRateCards":  { account_admin: true,  super_user: true,  collaborator: false, customer: false },
  "financials.viewCostRates":  { account_admin: true,  super_user: false, collaborator: false, customer: false },
  "financials.manageRateCards":  { account_admin: true, super_user: false, collaborator: false, customer: false },
  "financials.viewProfitMargins":{ account_admin: true, super_user: false, collaborator: false, customer: false },

  // ── INVOICING ─────────────────────────────────────────────────────────────
  // Alias: requireFinance covers all invoicing routes
  "invoicing.view":            { account_admin: true,  super_user: true,  collaborator: false, customer: false },
  "invoicing.create":          { account_admin: true,  super_user: true,  collaborator: false, customer: false },
  "invoicing.approve":         { account_admin: true,  super_user: true,  collaborator: false, customer: false },
  "invoicing.void":            { account_admin: true,  super_user: true,  collaborator: false, customer: false },

  // ── SPRINTS / EPICS / BACKLOGS ────────────────────────────────────────────
  "sprints.manage":            { account_admin: true,  super_user: true,  collaborator: false, customer: false },
  "epics.manage":              { account_admin: true,  super_user: true,  collaborator: false, customer: false },
  "backlogs.manage":           { account_admin: true,  super_user: true,  collaborator: false, customer: false },

  // ── WEBHOOKS ──────────────────────────────────────────────────────────────
  "webhooks.view":             { account_admin: true,  super_user: false, collaborator: false, customer: false },
  "webhooks.manage":           { account_admin: true,  super_user: false, collaborator: false, customer: false },

  // ── MARKETPLACE ───────────────────────────────────────────────────────────
  "marketplace.manage":        { account_admin: true,  super_user: false, collaborator: false, customer: false },
} satisfies Record<string, AccountRoleMap>;

// ---------------------------------------------------------------------------
// PROJECT-LEVEL permissions
// Evaluated against the user's role within a specific project.
// Project roles: admin (project manager/owner), collaborator, customer.
// ---------------------------------------------------------------------------

export const PROJECT_PERMISSIONS = {
  // ── PROJECT MANAGEMENT ────────────────────────────────────────────────────
  "project.updateCustomFields":  { admin: true,  collaborator: false, customer: false },
  "project.changeName":          { admin: true,  collaborator: false, customer: false },
  "project.changeDates":         { admin: true,  collaborator: false, customer: false },
  "project.changeOwner":         { admin: true,  collaborator: false, customer: false },
  "project.changeChampion":      { admin: true,  collaborator: false, customer: false },
  "project.addVendorMembers":    { admin: true,  collaborator: true,  customer: false },
  "project.addCustomerMembers":  { admin: true,  collaborator: true,  customer: true  },
  "project.removeSelf":          { admin: true,  collaborator: true,  customer: true  },
  "project.removeVendor":        { admin: true,  collaborator: false, customer: false },
  "project.removeCustomer":      { admin: true,  collaborator: false, customer: true  },
  "project.updateStatus":        { admin: true,  collaborator: false, customer: false },
  "project.delete":              { admin: true,  collaborator: false, customer: false },

  // ── PHASES ────────────────────────────────────────────────────────────────
  "phase.create":                { admin: true,  collaborator: false, customer: false },
  "phase.updateStatus":          { admin: true,  collaborator: false, customer: false },
  "phase.updateDates":           { admin: true,  collaborator: false, customer: false },
  "phase.delete":                { admin: true,  collaborator: false, customer: false },
  "phase.createPrivate":         { admin: true,  collaborator: false, customer: false },
  "phase.viewPrivate":           { admin: true,  collaborator: true,  customer: false },
  "phase.addTask":               { admin: true,  collaborator: true,  customer: false },

  // ── TASKS ─────────────────────────────────────────────────────────────────
  "task.create":                 { admin: true,  collaborator: true,  customer: true  },
  "task.updateFields":           { admin: true,  collaborator: true,  customer: true  },
  "task.convertToMilestone":     { admin: true,  collaborator: false, customer: false },
  "task.delete":                 { admin: true,  collaborator: true,  customer: true  },
  "task.updateCustomFields":     { admin: true,  collaborator: true,  customer: true  },
  "task.createPrivate":          { admin: true,  collaborator: true,  customer: false },

  // ── MILESTONES ────────────────────────────────────────────────────────────
  "milestone.convertToTask":     { admin: true,  collaborator: false, customer: false },
  "milestone.updateFields":      { admin: true,  collaborator: true,  customer: false },
  "milestone.delete":            { admin: true,  collaborator: false, customer: false },
  "milestone.enableCSAT":        { admin: true,  collaborator: false, customer: false },
  "milestone.rate":              { admin: false, collaborator: false, customer: true  },
  "milestone.viewRating":        { admin: true,  collaborator: true,  customer: false },

  // ── SPACES ────────────────────────────────────────────────────────────────
  "space.create":                { admin: true,  collaborator: true,  customer: true  },
  "space.createPrivate":         { admin: true,  collaborator: true,  customer: false },
  "space.delete":                { admin: true,  collaborator: true,  customer: true  },

  // ── STATUS UPDATES ────────────────────────────────────────────────────────
  "status.createShared":         { admin: true,  collaborator: true,  customer: true  },
  "status.createPrivate":        { admin: true,  collaborator: true,  customer: false },
  "status.publish":              { admin: true,  collaborator: true,  customer: true  },
} satisfies Record<string, ProjectRoleMap>;

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * can(role, permission)
 *
 * Check an account-level permission for a given role string.
 * Accepts both legacy ("Admin") and canonical ("account_admin") role strings.
 *
 * @example
 *   can("Admin", "financials.viewCostRates")   // true
 *   can("super_user", "financials.viewCostRates") // false
 *   can("PM", "projects.create")               // true (PM resolves to super_user)
 */
export function can(role: string, permission: AccountPermission): boolean {
  const canonical = resolveRole(role) as RoleValue;
  const row = ACCOUNT_PERMISSIONS[permission];
  return row[canonical as keyof AccountRoleMap] ?? false;
}

/**
 * canOnProject(projectRole, permission)
 *
 * Check a project-level permission.
 * projectRole should be one of: "admin" | "collaborator" | "customer"
 *
 * @example
 *   canOnProject("admin", "phase.create")       // true
 *   canOnProject("customer", "task.create")     // true
 *   canOnProject("collaborator", "project.delete") // false
 */
export function canOnProject(
  projectRole: "admin" | "collaborator" | "customer",
  permission: ProjectPermission,
): boolean {
  const row = PROJECT_PERMISSIONS[permission];
  return row[projectRole] ?? false;
}

/**
 * Express middleware factory — gates a route on an account-level permission.
 * Accepts both legacy and canonical role strings from the x-user-role header.
 *
 * @example
 *   router.post("/invoices", requirePermission("invoicing.create"), handler)
 */
export function requirePermission(permission: AccountPermission) {
  return (
    req: import("express").Request,
    res: import("express").Response,
    next: import("express").NextFunction,
  ): void => {
    const role = (req.headers["x-user-role"] as string) ?? "collaborator";
    if (can(role, permission)) {
      next();
    } else {
      res.status(403).json({
        error: `Permission denied: '${permission}' is not granted for role '${role}'.`,
      });
    }
  };
}
