import { pgTable, serial, text, integer, numeric, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { projectsTable } from "./projects";
import { tasksTable } from "./tasks";
import { financialPeriodsTable } from "./financialPeriods";
import { proxyDelegationsTable } from "./proxyDelegations";
import { leaveTypesTable } from "./leaveTypes";

export const effortEntriesTable = pgTable("effort_entries", {
  id: serial("id").primaryKey(),
  resourceId: integer("resource_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "restrict" }),
  enteredById: integer("entered_by_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "restrict" }),
  proxyDelegationId: integer("proxy_delegation_id")
    .references(() => proxyDelegationsTable.id, { onDelete: "set null" }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  taskId: integer("task_id")
    .references(() => tasksTable.id, { onDelete: "restrict" }),
  leaveTypeId: integer("leave_type_id")
    .references(() => leaveTypesTable.id, { onDelete: "restrict" }),
  entryDate: text("entry_date").notNull(),
  durationHours: numeric("duration_hours", { precision: 5, scale: 2 }).notNull(),
  billableCategory: text("billable_category").notNull().default("Non-Billable"),
  originalBillableCategory: text("original_billable_category"),
  narrative: text("narrative"),
  isLeave: boolean("is_leave").notNull().default(false),
  isExceptional: boolean("is_exceptional").notNull().default(false),
  exceptionalJustification: text("exceptional_justification"),
  isReplicated: boolean("is_replicated").notNull().default(false),
  status: text("status").notNull().default("Draft"),
  rejectionReason: text("rejection_reason"),
  rejectedById: integer("rejected_by_id")
    .references(() => usersTable.id, { onDelete: "set null" }),
  originalRejectorId: integer("original_rejector_id")
    .references(() => usersTable.id, { onDelete: "set null" }),
  resubmissionType: text("resubmission_type"),
  weekStartDate: text("week_start_date"),
  financialPeriodId: integer("financial_period_id")
    .references(() => financialPeriodsTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  resourceDateIdx: index("idx_effort_entries_resource_date").on(t.resourceId, t.entryDate),
  projectIdx: index("idx_effort_entries_project_id").on(t.projectId),
  taskIdx: index("idx_effort_entries_task_id").on(t.taskId),
  statusIdx: index("idx_effort_entries_status").on(t.status),
  weekStartIdx: index("idx_effort_entries_week_start").on(t.weekStartDate),
  periodIdx: index("idx_effort_entries_financial_period_id").on(t.financialPeriodId),
  proxyIdx: index("idx_effort_entries_proxy_delegation_id").on(t.proxyDelegationId),
  leaveTypeIdx: index("idx_effort_entries_leave_type_id").on(t.leaveTypeId),
  isLeaveIdx: index("idx_effort_entries_is_leave").on(t.isLeave),
}));

export const insertEffortEntrySchema = createInsertSchema(effortEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEffortEntry = z.infer<typeof insertEffortEntrySchema>;
export type EffortEntry = typeof effortEntriesTable.$inferSelect;
