import { pgTable, serial, text, integer, json, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const auditLogTable = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  actorUserId: integer("actor_user_id"),
  previousValue: json("previous_value"),
  newValue: json("new_value"),
  description: text("description"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  entityIdx: index("idx_audit_log_entity").on(t.entityType, t.entityId),
  actorIdx: index("idx_audit_log_actor").on(t.actorUserId, t.timestamp),
}));

export const insertAuditLogSchema = createInsertSchema(auditLogTable).omit({ id: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogTable.$inferSelect;
