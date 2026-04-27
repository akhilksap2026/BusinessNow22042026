import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { setDefaultHeaders } from "@workspace/api-client-react";
import { toast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const REVALIDATE_INTERVAL_MS = 60_000;

export interface CurrentUser {
  id: number;
  name: string;
  initials: string;
  email: string;
  role: string;
  department: string;
  secondaryRoles: string[];
  avatarUrl?: string | null;
  activeStatus?: string;
}

interface CurrentUserCtx {
  currentUser: CurrentUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  activeRole: string;
  availableRoles: string[];
  switchRole: (role: string) => void;
  loginAs: (userId: number, role: string) => Promise<void>;
  logout: () => Promise<void>;
}

const CurrentUserContext = createContext<CurrentUserCtx>({
  currentUser: null,
  isLoading: true,
  isAuthenticated: false,
  activeRole: "collaborator",
  availableRoles: ["collaborator"],
  switchRole: () => {},
  loginAs: async () => {},
  logout: async () => {},
});

function applyRoleHeaders(role: string, userId?: number) {
  const headers: Record<string, string> = { "x-user-role": role };
  if (userId) {
    headers["x-user-id"] = String(userId);
    localStorage.setItem("activeUserId", String(userId));
  }
  setDefaultHeaders(headers);
}

function clearRoleHeaders() {
  // Clear both client-side default headers so subsequent fetches go out
  // unauthenticated and the server returns 401 (instead of accidentally
  // reusing stale credentials).
  setDefaultHeaders({});
}

async function logRoleSwitch(from: string, to: string, userId?: number) {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json", "x-user-role": to };
    if (userId) headers["x-user-id"] = String(userId);
    await fetch(`${BASE}/api/audit/role-switch`, {
      method: "POST",
      headers,
      body: JSON.stringify({ from, to }),
    });
  } catch {
    /* audit failures must never break the UI */
  }
}

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<string>(() => {
    return localStorage.getItem("activeRole") ?? "collaborator";
  });
  const activeRoleRef = useRef(activeRole);
  useEffect(() => {
    activeRoleRef.current = activeRole;
  }, [activeRole]);

  const fetchMe = useCallback(async (userId: number, role: string): Promise<CurrentUser | null> => {
    try {
      const r = await fetch(`${BASE}/api/me`, {
        headers: { "x-user-id": String(userId), "x-user-role": role },
      });
      if (!r.ok) return null;
      return (await r.json()) as CurrentUser;
    } catch {
      return null;
    }
  }, []);

  // Initial bootstrap. Only attempts to rehydrate a session if BOTH
  // activeUserId and activeRole are present in localStorage; otherwise the
  // app is considered logged-out and the AuthGate will redirect to /login.
  useEffect(() => {
    const storedUserId = localStorage.getItem("activeUserId");
    const storedRole = localStorage.getItem("activeRole");
    if (!storedUserId || !storedRole) {
      setIsLoading(false);
      return;
    }
    const userId = Number(storedUserId);
    if (!Number.isFinite(userId) || userId <= 0) {
      localStorage.removeItem("activeUserId");
      localStorage.removeItem("activeRole");
      setIsLoading(false);
      return;
    }
    applyRoleHeaders(storedRole, userId);
    fetchMe(userId, storedRole)
      .then((data) => {
        if (data) {
          setCurrentUser(data);
          const available = [data.role, ...(data.secondaryRoles ?? [])];
          // Self-heal: if the stored role is no longer assigned, fall back
          // to the user's primary role.
          if (!available.includes(storedRole)) {
            setActiveRole(data.role);
            localStorage.setItem("activeRole", data.role);
            applyRoleHeaders(data.role, data.id);
          } else {
            setActiveRole(storedRole);
          }
        } else {
          // Stored credentials are stale (user deleted, deactivated, etc.).
          // Clear and force a fresh login.
          localStorage.removeItem("activeUserId");
          localStorage.removeItem("activeRole");
          clearRoleHeaders();
        }
      })
      .finally(() => setIsLoading(false));
  }, [fetchMe]);

  // Mid-session re-validation: every 60s confirm the user still exists, is
  // active, and that the currently-active role is still in the assigned set.
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(async () => {
      const fresh = await fetchMe(currentUser.id, activeRoleRef.current);
      // /api/me returns non-2xx (and fetchMe → null) when the user has been
      // deleted, deactivated, or had their assigned roles changed in a way
      // that makes the current role-claim invalid. Treat any of those as a
      // forced sign-out so the UI doesn't keep firing failing requests under
      // a stale identity.
      if (!fresh) {
        toast({
          title: "Your session has ended",
          description: "Please sign in again.",
          variant: "destructive",
        });
        localStorage.removeItem("activeRole");
        localStorage.removeItem("activeUserId");
        setCurrentUser(null);
        clearRoleHeaders();
        window.location.href = `${BASE}/login`;
        return;
      }
      // Account deactivated → clear local state and bounce to login.
      if (fresh.activeStatus && fresh.activeStatus !== "active") {
        toast({
          title: "Your account was deactivated",
          description: "Contact your administrator for access.",
          variant: "destructive",
        });
        localStorage.removeItem("activeRole");
        localStorage.removeItem("activeUserId");
        setCurrentUser(null);
        clearRoleHeaders();
        window.location.href = `${BASE}/login`;
        return;
      }
      setCurrentUser(fresh);
      const available = [fresh.role, ...(fresh.secondaryRoles ?? [])];
      if (!available.includes(activeRoleRef.current)) {
        toast({
          title: "Your role was changed by an administrator",
          description: `Switched to ${fresh.role}.`,
        });
        setActiveRole(fresh.role);
        localStorage.setItem("activeRole", fresh.role);
        applyRoleHeaders(fresh.role, fresh.id);
      }
    }, REVALIDATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [currentUser, fetchMe]);

  function switchRole(role: string) {
    const prev = activeRoleRef.current;
    setActiveRole(role);
    localStorage.setItem("activeRole", role);
    applyRoleHeaders(role, currentUser?.id);
    if (prev && prev !== role) {
      void logRoleSwitch(prev, role, currentUser?.id);
    }
  }

  async function loginAs(userId: number, role: string): Promise<void> {
    setIsLoading(true);
    applyRoleHeaders(role, userId);
    const data = await fetchMe(userId, role);
    if (!data) {
      clearRoleHeaders();
      localStorage.removeItem("activeUserId");
      localStorage.removeItem("activeRole");
      setIsLoading(false);
      throw new Error("Login failed: user not found or inactive.");
    }
    setCurrentUser(data);
    setActiveRole(role);
    localStorage.setItem("activeRole", role);
    setIsLoading(false);
  }

  async function logout() {
    try {
      await fetch(`${BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      /* ignore — frontend state is the source of truth in dev */
    }
    localStorage.removeItem("activeRole");
    localStorage.removeItem("activeUserId");
    setCurrentUser(null);
    setActiveRole("collaborator");
    clearRoleHeaders();
  }

  const availableRoles = currentUser
    ? [
        currentUser.role,
        ...(currentUser.secondaryRoles ?? []).filter(r => r !== currentUser.role),
      ]
    : [activeRole];

  return (
    <CurrentUserContext.Provider
      value={{
        currentUser,
        isLoading,
        isAuthenticated: currentUser !== null,
        activeRole,
        availableRoles,
        switchRole,
        loginAs,
        logout,
      }}
    >
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(CurrentUserContext);
}
