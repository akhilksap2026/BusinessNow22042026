import { pgTable, serial, text, integer, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { effortEntriesTable } from "./effortEntries";
import { proxyDelegationsTable } from "./proxyDelegations";

export const effortAuditLogTable = pgTable("effort_audit_log", {
  id: serial("id").primaryKey(),
  effortEntryId: integer("effort_entry_id")
    .notNull()
    .references(() => effortEntriesTable.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  performedById: integer("performed_by_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "restrict" }),
  proxyDelegationId: integer("proxy_delegation_id")
    .references(() => proxyDelegationsTable.id, { onDelete: "set null" }),
  performedAt: timestamp("performed_at", { withTimezone: true }).notNull().defaultNow(),
  previousValue: jsonb("previous_value"),
  newValue: jsonb("new_value"),
  fieldChanges: jsonb("field_changes"),
  notes: text("notes"),
  isImmutable: boolean("is_immutable").notNull().default(true),
}, (t) => ({
  entryIdx: index("idx_effort_audit_log_effort_entry_id").on(t.effortEntryId),
  performedByIdx: index("idx_effort_audit_log_performed_by_id").on(t.performedById),
  actionIdx: index("idx_effort_audit_log_action").on(t.action),
  performedAtIdx: index("idx_effort_audit_log_performed_at").on(t.performedAt),
  proxyIdx: index("idx_effort_audit_log_proxy_delegation_id").on(t.proxyDelegationId),
}));

export const insertEffortAuditLogSchema = createInsertSchema(effortAuditLogTable).omit({ id: true, performedAt: true });
export type InsertEffortAuditLog = z.infer<typeof insertEffortAuditLogSchema>;
export type EffortAuditLog = typeof effortAuditLogTable.$inferSelect;
