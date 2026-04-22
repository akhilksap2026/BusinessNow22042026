import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const ROLES = ["Admin", "PM", "Resource Manager", "Finance", "Viewer"] as const;
export type AppRole = typeof ROLES[number];

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
          const stored = localStorage.getItem("activeRole");
          const available = [data.role, ...(data.secondaryRoles ?? [])];
          if (!stored || !available.includes(stored)) {
            setActiveRole(data.role);
            localStorage.setItem("activeRole", data.role);
          }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  function switchRole(role: string) {
    setActiveRole(role);
    localStorage.setItem("activeRole", role);
  }

  const availableRoles = currentUser
    ? [currentUser.role, ...(currentUser.secondaryRoles ?? []).filter(r => r !== currentUser.role)]
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
