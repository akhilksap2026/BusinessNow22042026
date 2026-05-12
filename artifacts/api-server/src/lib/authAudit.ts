import type { Request } from "express";
import { db, auditLogTable } from "@workspace/db";

export type AuthEventType =
  | "missing_user_id"
  | "invalid_user_id"
  | "user_not_found"
  | "user_deactivated"
  | "missing_role_header"
  | "role_mismatch"
  | "role_denied"
  | "role_switch";

export async function logAuthEvent(opts: {
  req: Request;
  eventType: AuthEventType;
  userId?: number | null;
  description?: string;
}): Promise<void> {
  try {
    const ip =
      (opts.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      opts.req.socket.remoteAddress ||
      null;
    await db.insert(auditLogTable).values({
      entityType: "auth_event",
      entityId: String(opts.userId ?? "unknown"),
      action: "status_changed",
      actorUserId: opts.userId ?? null,
      description: `${opts.eventType}${opts.description ? ` — ${opts.description}` : ""}`,
      newValue: {
        eventType: opts.eventType,
        path: opts.req.path,
        method: opts.req.method,
        ip,
        userAgent: opts.req.headers["user-agent"] ?? null,
      },
    });
  } catch {
    // never break request flow
  }
}
