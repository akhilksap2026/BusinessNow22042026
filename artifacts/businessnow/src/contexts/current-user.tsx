import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { setDefaultHeaders } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export interface CurrentUser {
  id: number;
  name: string;
  initials: string;
  email: string;
  role: string;
  department: string;
  secondaryRoles: string[];
  avatarUrl?: string | null;
}

interface CurrentUserCtx {
  currentUser: CurrentUser | null;
  isLoading: boolean;
  activeRole: string;
  availableRoles: string[];
  switchRole: (role: string) => void;
}

const CurrentUserContext = createContext<CurrentUserCtx>({
  currentUser: null,
  isLoading: true,
  activeRole: "Admin",
  availableRoles: ["Admin"],
  switchRole: () => {},
});

function applyRoleHeaders(role: string, userId?: number) {
  const headers: Record<string, string> = { "x-user-role": role };
  if (userId) headers["x-user-id"] = String(userId);
  setDefaultHeaders(headers);
}

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<string>(() => {
    return localStorage.getItem("activeRole") ?? "Admin";
  });

  useEffect(() => {
    fetch(`${BASE}/api/me`, { headers: { "x-user-role": "Admin" } })
      .then(r => r.ok ? r.json() : null)
      .then((data: CurrentUser | null) => {
        if (data) {
          setCurrentUser(data);
          const stored = localStorage.getItem("activeRole") ?? "Admin";
          applyRoleHeaders(stored, data.id);
          const available = [data.role, ...(data.secondaryRoles ?? []), "Customer"];
          if (!available.includes(stored)) {
            setActiveRole(data.role);
            localStorage.setItem("activeRole", data.role);
            applyRoleHeaders(data.role, data.id);
          }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  function switchRole(role: string) {
    setActiveRole(role);
    localStorage.setItem("activeRole", role);
    applyRoleHeaders(role, currentUser?.id);
  }

  const availableRoles = currentUser
    ? [
        currentUser.role,
        ...(currentUser.secondaryRoles ?? []).filter(r => r !== currentUser.role),
        ...(!currentUser.role.includes("Customer") ? ["Customer"] : []),
      ]
    : [activeRole];

  return (
    <CurrentUserContext.Provider value={{ currentUser, isLoading, activeRole, availableRoles, switchRole }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(CurrentUserContext);
}
