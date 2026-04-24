/**
 * Frontend role constants — mirrors artifacts/api-server/src/constants/roles.ts.
 *
 * Four canonical roles (Rocketlane-style):
 *   ACCOUNT_ADMIN  – Full access including account settings and user management.
 *   SUPER_USER     – Broad project access; no core admin capabilities.
 *   COLLABORATOR   – Limited internal user; no admin or project-creation access.
 *   CUSTOMER       – External / portal-only; project-scoped read access.
 */

export const ROLES = {
  ACCOUNT_ADMIN: "account_admin",
  SUPER_USER: "super_user",
  COLLABORATOR: "collaborator",
  CUSTOMER: "customer",
} as const;

export type RoleKey = keyof typeof ROLES;
export type RoleValue = (typeof ROLES)[RoleKey];

/** Numeric hierarchy — higher = broader access. */
export const ROLE_HIERARCHY: Record<RoleValue, number> = {
  account_admin: 4,
  super_user: 3,
  collaborator: 2,
  customer: 1,
};

/**
 * Maps legacy Title-Case role strings (and canonical snake_case) to their
 * canonical RoleValue.  Used when the `role` field on a user record or the
 * x-user-role header still carries an old value.
 */
export const LEGACY_ROLE_MAP: Record<string, RoleValue> = {
  Admin: "account_admin",
  PM: "super_user",
  "Super User": "super_user",
  Finance: "super_user",
  Developer: "super_user",
  Designer: "super_user",
  QA: "super_user",
  Collaborator: "collaborator",
  Viewer: "collaborator",
  Customer: "customer",
  Partner: "customer",
  // Demo job-title roles (legacy seed data — pending a dedicated jobRole field)
  "Project Manager": "super_user",
  "Solutions Architect": "super_user",
  "Change Management Lead": "super_user",
  Consultant: "collaborator",
  "Business Analyst": "collaborator",
  "Data Engineer": "collaborator",
  "Integration Engineer": "collaborator",
  "QA Engineer": "collaborator",
  account_admin: "account_admin",
  super_user: "super_user",
  collaborator: "collaborator",
  customer: "customer",
};

/** Human-readable label for display in the UI. */
export const ROLE_LABELS: Record<RoleValue, string> = {
  account_admin: "Account Admin",
  super_user: "Super User",
  collaborator: "Collaborator",
  customer: "Customer",
};

/**
 * Resolve any role string (legacy or canonical) to its canonical RoleValue.
 * Falls back to "collaborator" for unknown values (safe minimum).
 */
export function resolveRole(role: string): RoleValue {
  return (LEGACY_ROLE_MAP[role] as RoleValue) ?? "collaborator";
}

/** Return the numeric hierarchy level for any role string. */
export function getRoleLevel(role: string): number {
  return ROLE_HIERARCHY[resolveRole(role)] ?? 0;
}

/**
 * The three valid project-level roles.  Lower granularity than account roles —
 * an "admin" project role implies full per-project authority, not account-wide.
 */
export const PROJECT_ROLES = ["admin", "collaborator", "customer"] as const;
export type ProjectRoleValue = (typeof PROJECT_ROLES)[number];

/**
 * resolveProjectRole(accountRole, projectRole)
 *
 * Compute the effective role a user has at a given project.  The account role
 * is a ceiling — projectRole cannot escalate beyond it:
 *  - account_admin / super_user → 'admin' at every project
 *  - collaborator               → uses projectRole (defaults to 'collaborator')
 *  - customer                   → always 'customer'
 */
export function resolveProjectRole(
  accountRole: string,
  projectRole?: string | null,
): ProjectRoleValue {
  const canonical = resolveRole(accountRole);
  if (canonical === "account_admin" || canonical === "super_user") return "admin";
  if (canonical === "customer") return "customer";
  const pr = (projectRole ?? "collaborator") as ProjectRoleValue;
  // Account role is the ceiling — collaborator-on-account cannot be admin-on-project.
  if (pr === "admin") return "collaborator";
  return PROJECT_ROLES.includes(pr) ? pr : "collaborator";
}

/**
 * Return true when the user's role meets or exceeds the required minimum.
 *
 * @example
 *   hasRole(activeRole, "super_user")  // true for account_admin and super_user
 */
export function hasRole(userRole: string, minimumRole: RoleValue): boolean {
  return getRoleLevel(userRole) >= ROLE_HIERARCHY[minimumRole];
}

/**
 * React hook helper — call with the activeRole from useCurrentUser().
 *
 * @example
 *   const { activeRole } = useCurrentUser();
 *   const can = usePermissions(activeRole);
 *   if (can.manageUsers) { … }
 */
export function usePermissions(activeRole: string) {
  const level = getRoleLevel(activeRole);
  const isAccountAdmin = level >= ROLE_HIERARCHY.account_admin;
  const isSuperUserOrAbove = level >= ROLE_HIERARCHY.super_user;
  const isCollaboratorOrAbove = level >= ROLE_HIERARCHY.collaborator;
  const isCustomer = resolveRole(activeRole) === "customer";

  return {
    /** Can access Admin Settings, User Management, company-wide config */
    manageAccount: isAccountAdmin,

    /** Can create / edit / delete projects */
    manageProjects: isSuperUserOrAbove,

    /** Can approve / reject timesheets and resource requests */
    approveWork: isSuperUserOrAbove,

    /** Can view Finance / Invoices tabs */
    viewFinance: isSuperUserOrAbove,

    /** Can create / edit invoices and billing schedules */
    manageFinance: isAccountAdmin,

    /** Can view cost rates and rate cards */
    viewCostRates: isAccountAdmin,

    /** Can view and log time entries */
    logTime: isCollaboratorOrAbove && !isCustomer,

    /** Can view project details they are allocated to */
    viewProjects: isCollaboratorOrAbove || isCustomer,

    /** Is a portal / external user — no internal routes */
    isPortalUser: isCustomer,

    /** Raw resolved canonical role */
    role: resolveRole(activeRole) as RoleValue,
  };
}
