/**
 * Build request headers carrying the caller's active RBAC identity.
 *
 * Source of truth is localStorage, written by `CurrentUserProvider` in
 * `contexts/current-user.tsx` whenever the user logs in, switches role,
 * or is revalidated. This lets non-React code paths (mutation functions,
 * raw `fetch` calls, query functions) issue requests without hardcoding
 * credentials and without taking a React dependency.
 *
 * Fails closed: when nothing is in storage (e.g. very early boot before
 * `/api/me` has resolved, or after `logout()`), both headers are omitted
 * and the server's RBAC middleware will reject with 401. This is the
 * correct least-privilege behavior — silently defaulting to "Admin" / "1"
 * would recreate the privilege-escalation bug this helper exists to fix.
 *
 * Caller-supplied `extra` headers cannot override `x-user-role` or
 * `x-user-id`: both are spread last to make tampering impossible by
 * construction.
 */
export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const role = typeof localStorage !== "undefined" ? localStorage.getItem("activeRole") : null;
  const userId = typeof localStorage !== "undefined" ? localStorage.getItem("activeUserId") : null;
  const headers: Record<string, string> = { ...extra };
  if (role) headers["x-user-role"] = role;
  if (userId) headers["x-user-id"] = userId;
  return headers;
}
