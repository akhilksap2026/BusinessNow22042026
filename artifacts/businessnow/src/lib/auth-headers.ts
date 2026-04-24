/**
 * Build request headers carrying the caller's active RBAC role.
 *
 * Source of truth is `localStorage.activeRole`, written by
 * `CurrentUserProvider` in `contexts/current-user.tsx` whenever the user
 * logs in or switches role. This lets non-React code paths (mutation
 * functions, raw `fetch` calls) issue requests without hardcoding a role
 * and without taking a React dependency.
 *
 * Fails closed: when no role is in storage (e.g. very early boot before
 * `/api/me` has resolved, or after `logout()`), `x-user-role` is omitted
 * and the server's RBAC middleware will reject with 401/403. This is the
 * correct least-privilege behavior — silently defaulting to "Admin" would
 * recreate the privilege-escalation bug this helper exists to fix.
 *
 * Caller-supplied `extra` headers cannot override `x-user-role`: the role
 * is spread last to make tampering impossible by construction.
 */
export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const role = typeof localStorage !== "undefined" ? localStorage.getItem("activeRole") : null;
  const headers: Record<string, string> = { ...extra };
  if (role) headers["x-user-role"] = role;
  return headers;
}
