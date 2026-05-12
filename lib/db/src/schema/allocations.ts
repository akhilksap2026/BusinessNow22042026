import { pgTable, serial, text, integer, numeric, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const allocationsTable = pgTable("allocations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  placeholderRole: text("placeholder_role"),
  placeholderId: integer("placeholder_id"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  hoursPerWeek: numeric("hours_per_week", { precision: 6, scale: 2 }).notNull().default("0"),
  hoursPerDay: numeric("hours_per_day", { precision: 5, scale: 2 }).notNull().default("0"),
  totalHours: numeric("total_hours", { precision: 8, scale: 2 }).notNull().default("0"),
  allocationMethod: text("allocation_method").notNull().default("hours_per_week"),
  methodValue: numeric("method_value", { precision: 8, scale: 2 }),
  percentOfCapacity: numeric("percent_of_capacity", { precision: 5, scale: 2 }),
  role: text("role").notNull(),
  isSoftAllocation: boolean("is_soft_allocation").notNull().default(false),
  source: text("source").notNull().default("manual"),
  isTimesheetApprover: boolean("is_timesheet_approver").notNull().default(false),
  isLeaveApprover: boolean("is_leave_approver").notNull().default(false),
  status: text("status"),
  isOverride: boolean("is_override").notNull().default(false),
  overrideReason: text("override_reason"),
  requiredSkillId: integer("required_skill_id"),
  requiredProficiencyLevel: integer("required_proficiency_level"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index("idx_allocations_user_id").on(t.userId),
  projectIdx: index("idx_allocations_project_id").on(t.projectId),
  dateRangeIdx: index("idx_allocations_date_range").on(t.startDate, t.endDate),
}));

export const insertAllocationSchema = createInsertSchema(allocationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAllocation = z.infer<typeof insertAllocationSchema>;
export type Allocation = typeof allocationsTable.$inferSelect;
