import { type Request, type Response, type NextFunction } from "express";

export type AppRole = "Admin" | "PM" | "Developer" | "Designer" | "QA" | "Finance" | "Viewer";

const ROLE_HIERARCHY: Record<AppRole, number> = {
  Admin: 100,
  PM: 80,
  Finance: 70,
  Developer: 50,
  Designer: 50,
  QA: 50,
  Viewer: 10,
};

function getRoleLevel(role: string): number {
  return ROLE_HIERARCHY[role as AppRole] ?? 0;
}

export function requireRole(minimumRole: AppRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req.headers["x-user-role"] as string) ?? "Viewer";
    if (getRoleLevel(userRole) >= getRoleLevel(minimumRole)) {
      next();
    } else {
      res.status(403).json({ error: "Insufficient permissions" });
    }
  };
}

export function requireAnyRole(...roles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req.headers["x-user-role"] as string) ?? "Viewer";
    if (roles.includes(userRole as AppRole)) {
      next();
    } else {
      res.status(403).json({ error: "Insufficient permissions" });
    }
  };
}

export const requireAdmin = requireRole("Admin");
export const requirePM = requireRole("PM");
export const requireFinance = requireAnyRole("Admin", "Finance");
