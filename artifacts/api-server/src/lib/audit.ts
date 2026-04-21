import { db, auditLogTable } from "@workspace/db";

export async function logAudit(opts: {
  entityType: string;
  entityId: string | number;
  action: "created" | "updated" | "deleted" | "status_changed" | "submitted" | "approved" | "rejected";
  actorUserId?: number;
  description?: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}) {
  try {
    await db.insert(auditLogTable).values({
      entityType: opts.entityType,
      entityId: String(opts.entityId),
      action: opts.action,
      actorUserId: opts.actorUserId ?? null,
      description: opts.description ?? null,
      previousValue: opts.previousValue ?? null,
      newValue: opts.newValue ?? null,
    });
  } catch {
    // Audit log failures must never break the main flow
  }
}
