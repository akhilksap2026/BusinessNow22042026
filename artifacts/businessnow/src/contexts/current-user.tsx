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
  activeRole: string;
  availableRoles: string[];
  switchRole: (role: string) => void;
  logout: () => Promise<void>;
}

const CurrentUserContext = createContext<CurrentUserCtx>({
  currentUser: null,
  isLoading: true,
  activeRole: "Admin",
  availableRoles: ["Admin"],
  switchRole: () => {},
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
    return localStorage.getItem("activeRole") ?? "Admin";
  });
  const activeRoleRef = useRef(activeRole);
  useEffect(() => {
    activeRoleRef.current = activeRole;
  }, [activeRole]);

  const fetchMe = useCallback(async (): Promise<CurrentUser | null> => {
    try {
      const r = await fetch(`${BASE}/api/me`, { headers: { "x-user-role": "Admin" } });
      if (!r.ok) return null;
      return (await r.json()) as CurrentUser;
    } catch {
      return null;
    }
  }, []);

  // Initial bootstrap.
  useEffect(() => {
    fetchMe()
      .then((data) => {
        if (data) {
          setCurrentUser(data);
          const stored = localStorage.getItem("activeRole");
          const available = [data.role, ...(data.secondaryRoles ?? [])];
          // Auto-pick when the user has only one role.
          if (available.length === 1) {
            const only = data.role;
            setActiveRole(only);
            localStorage.setItem("activeRole", only);
            applyRoleHeaders(only, data.id);
          } else if (stored && available.includes(stored)) {
            setActiveRole(stored);
            applyRoleHeaders(stored, data.id);
          } else {
            // Multi-role first-visit: leave activeRole as default header but DO NOT
            // persist to localStorage — the RoleSelectorModal will open and the
            // user's pick will write the value.
            applyRoleHeaders(data.role, data.id);
          }
        }
      })
      .finally(() => setIsLoading(false));
  }, [fetchMe]);

  // Mid-session re-validation: every 60s confirm the user still exists, is
  // active, and that the currently-active role is still in the assigned set.
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(async () => {
      const fresh = await fetchMe();
      if (!fresh) return;
      // Account deactivated → clear local state and redirect to root.
      if (fresh.activeStatus && fresh.activeStatus !== "active") {
        toast({
          title: "Your account was deactivated",
          description: "Contact your administrator for access.",
          variant: "destructive",
        });
        localStorage.removeItem("activeRole");
        setCurrentUser(null);
        applyRoleHeaders("Admin");
        window.location.href = BASE || "/";
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
    setActiveRole("Admin");
    applyRoleHeaders("Admin");
  }

  const availableRoles = currentUser
    ? [
        currentUser.role,
        ...(currentUser.secondaryRoles ?? []).filter(r => r !== currentUser.role),
      ]
    : [activeRole];

  return (
    <CurrentUserContext.Provider value={{ currentUser, isLoading, activeRole, availableRoles, switchRole, logout }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(CurrentUserContext);
}
