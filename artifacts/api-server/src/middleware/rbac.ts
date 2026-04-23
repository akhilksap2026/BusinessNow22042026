import { type Request, type Response, type NextFunction } from "express";

// Role names and their hierarchy levels.
// Super User = PM-equivalent but cannot manage account settings or see cost rates.
// Collaborator = Developer-equivalent but cannot create projects or see archived projects.
export type AppRole =
  | "Admin"
  | "PM"
  | "Super User"
  | "Finance"
  | "Developer"
  | "Designer"
  | "QA"
  | "Collaborator"
  | "Viewer"
  | "Customer"
  | "Partner";

const ROLE_HIERARCHY: Record<AppRole, number> = {
  Admin: 100,
  PM: 80,
  "Super User": 75,   // PM-level access minus account settings and cost rates
  Finance: 70,
  Developer: 50,
  Designer: 50,
  QA: 50,
  Collaborator: 45,   // Cannot create projects; cannot view archived projects
  Viewer: 10,
  Customer: 5,        // Portal-only — must NOT access internal APIs
  Partner: 5,         // Project-scoped — treated like Customer for internal routes
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

// Cost rates (rate cards) are visible only to Admin, Finance and PM.
// Super Users do NOT see cost rates per spec.
export const requireCostRateAccess = requireAnyRole("Admin", "Finance", "PM");

// Block Customer and Partner roles from all internal API routes.
// They must use /portal-auth/* exclusively.
export function blockPortalRoles(req: Request, res: Response, next: NextFunction): void {
  const role = (req.headers["x-user-role"] as string) ?? "";
  if (role === "Customer" || role === "Partner") {
    res.status(403).json({
      error: "Access denied. Client portal users must use /api/portal-auth/* endpoints.",
    });
    return;
  }
  next();
}
