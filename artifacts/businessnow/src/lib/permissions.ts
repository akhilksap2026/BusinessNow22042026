/**
 * Frontend permission matrix — mirrors artifacts/api-server/src/constants/permissions.ts.
 *
 * Usage:
 *   import { can, canOnProject } from "@/lib/permissions";
 *   const { activeRole } = useCurrentUser();
 *
 *   // Account-level check
 *   if (can(activeRole, "invoicing.view")) { … }
 *
 *   // Project-level check (pass the user's role within that project)
 *   if (canOnProject("collaborator", "task.create")) { … }
 *
 * Relationship to the existing `usePermissions()` in lib/roles.ts:
 *   usePermissions() provides coarse named booleans (manageProjects, viewFinance, …).
 *   This module provides the full granular matrix. Both are valid; prefer this
 *   module for new feature gates and keep usePermissions() for existing callers.
 *
 *   Mapping of coarse → fine-grained keys:
 *     manageAccount   → settings.manageAdvanced, settings.manageIntegrations
 *     manageProjects  → projects.create, projects.edit, projects.delete
 *     approveWork     → timeTracking.approve, resources.approveRequests
 *     viewFinance     → invoicing.view, financials.viewBudgets, financials.viewRateCards
 *     manageFinance   → invoicing.create, invoicing.approve, invoicing.void
 *     viewCostRates   → financials.viewCostRates
 *     logTime         → timeTracking.submit
 *     viewProjects    → projects.view
 */

import { resolveRole, type RoleValue } from "@/lib/roles";

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
// ACCOUNT-LEVEL permission matrix
// ---------------------------------------------------------------------------

export const ACCOUNT_PERMISSIONS = {
  // ── PROJECTS ──────────────────────────────────────────────────────────────
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
  "financials.viewBudgets":    { account_admin: true,  super_user: true,  collaborator: true,  customer: false },
  "financials.viewRateCards":  { account_admin: true,  super_user: true,  collaborator: false, customer: false },
  "financials.viewCostRates":  { account_admin: true,  super_user: false, collaborator: false, customer: false },
  "financials.manageRateCards":  { account_admin: true, super_user: false, collaborator: false, customer: false },
  "financials.viewProfitMargins":{ account_admin: true, super_user: false, collaborator: false, customer: false },

  // ── INVOICING ─────────────────────────────────────────────────────────────
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
// PROJECT-LEVEL permission matrix
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
 * Check an account-level permission for any role string (legacy or canonical).
 *
 * @example
 *   const { activeRole } = useCurrentUser();
 *   if (can(activeRole, "invoicing.view")) { … }
 *   if (can(activeRole, "financials.viewCostRates")) { … }
 */
export function can(role: string, permission: AccountPermission): boolean {
  const canonical = resolveRole(role) as RoleValue;
  const row = ACCOUNT_PERMISSIONS[permission];
  return row[canonical as keyof AccountRoleMap] ?? false;
}

/**
 * canOnProject(projectRole, permission)
 *
 * Check a project-level permission against the user's in-project role.
 *
 * @example
 *   canOnProject("admin",        "phase.create")    // true
 *   canOnProject("collaborator", "task.create")     // true
 *   canOnProject("customer",     "milestone.rate")  // true
 */
export function canOnProject(
  projectRole: "admin" | "collaborator" | "customer",
  permission: ProjectPermission,
): boolean {
  const row = PROJECT_PERMISSIONS[permission];
  return row[projectRole] ?? false;
}

/**
 * useAccountPermissions(activeRole)
 *
 * Returns a pre-resolved `can` function bound to the given role.
 * Call this once at the top of a component for cleaner JSX.
 *
 * @example
 *   const { activeRole } = useCurrentUser();
 *   const check = useAccountPermissions(activeRole);
 *   {check("projects.create") && <Button>New Project</Button>}
 */
export function useAccountPermissions(activeRole: string) {
  return (permission: AccountPermission) => can(activeRole, permission);
}
