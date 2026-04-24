/**
 * Canonical four-role model (Rocketlane-style architecture).
 *
 * These are the primary roles used for coarse-grained access control:
 *
 *   ACCOUNT_ADMIN  – Full access to everything including org/account settings,
 *                    cost rates, and user management. Maps to the legacy "Admin" role.
 *
 *   SUPER_USER     – Broad access to all project work surfaces. Cannot manage
 *                    core account settings or view raw cost rates.
 *                    Maps to legacy "PM", "Super User", "Finance", "Developer",
 *                    "Designer", "QA" roles.
 *
 *   COLLABORATOR   – Limited internal user. Can view and contribute to assigned
 *                    projects but cannot create projects, access admin surfaces,
 *                    or see archived content. Maps to legacy "Collaborator" / "Viewer".
 *
 *   CUSTOMER       – External read-only user. Project-scoped; cannot access
 *                    any internal API routes. Maps to legacy "Customer" / "Partner".
 *
 * Legacy roles (Admin, PM, Super User, Finance, Developer, Designer, QA,
 * Collaborator, Viewer, Customer, Partner) remain supported in rbac.ts for
 * backward compatibility; all new code should prefer these four constants.
 */

export const ROLES = {
  ACCOUNT_ADMIN: "account_admin",
  SUPER_USER: "super_user",
  COLLABORATOR: "collaborator",
  CUSTOMER: "customer",
} as const;

export type RoleKey = keyof typeof ROLES;
export type RoleValue = (typeof ROLES)[RoleKey];

/**
 * Numeric hierarchy — higher number = broader access.
 * Used to evaluate `requireRole(minimumRole)` checks:
 *   user.level >= required.level → access granted
 */
export const ROLE_HIERARCHY: Record<RoleValue, number> = {
  account_admin: 4,
  super_user: 3,
  collaborator: 2,
  customer: 1,
};

/**
 * Map each legacy role string to the corresponding canonical RoleValue.
 * Useful when reading the `role` column from older user records.
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
  // snake_case variants pass through unchanged
  account_admin: "account_admin",
  super_user: "super_user",
  collaborator: "collaborator",
  customer: "customer",
};

/**
 * Resolve any role string (legacy or canonical) to its canonical RoleValue.
 * Falls back to "collaborator" for unknown roles (safe minimum).
 */
export function resolveRole(role: string): RoleValue {
  return (LEGACY_ROLE_MAP[role] as RoleValue) ?? "collaborator";
}

/**
 * Return the numeric hierarchy level for any role string (legacy or canonical).
 */
export function getRoleLevel(role: string): number {
  const canonical = resolveRole(role);
  return ROLE_HIERARCHY[canonical] ?? 0;
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
 * is a ceiling — `projectRole` cannot escalate beyond it:
 *
 *  - account_admin / super_user → always 'admin' at every project
 *  - collaborator               → uses `projectRole` (defaults to 'collaborator')
 *  - customer                   → always 'customer' (cannot be promoted)
 *
 * Pass either canonical or legacy `accountRole` strings; the function resolves
 * them via LEGACY_ROLE_MAP.  Pass `undefined` for `projectRole` when no
 * membership row exists.
 */
export function resolveProjectRole(
  accountRole: string,
  projectRole?: string | null,
): ProjectRoleValue {
  const canonical = resolveRole(accountRole);
  if (canonical === "account_admin" || canonical === "super_user") return "admin";
  if (canonical === "customer") return "customer";
  // canonical === "collaborator"
  const pr = (projectRole ?? "collaborator") as ProjectRoleValue;
  // Defensive: a collaborator at the account level cannot be promoted to admin
  // at the project level — that would breach the account-role ceiling.
  if (pr === "admin") return "collaborator";
  return PROJECT_ROLES.includes(pr) ? pr : "collaborator";
}

/**
 * Return true when the supplied role meets or exceeds the required minimum.
 */
export function hasRole(userRole: string, minimumRole: RoleValue): boolean {
  return getRoleLevel(userRole) >= ROLE_HIERARCHY[minimumRole];
}
