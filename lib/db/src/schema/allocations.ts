import { pgTable, serial, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const allocationsTable = pgTable("allocations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  userId: integer("user_id"),
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
  // Lifecycle status. NULL = normal. 'at_risk' is set automatically when an
  // approved time-off request overlaps this allocation.  Additional values may
  // be added in future without a migration (text column, not a pg enum).
  status: text("status"),
  // Over-allocation override: set to true when a PM/admin bypasses the capacity guard.
  isOverride: boolean("is_override").notNull().default(false),
  overrideReason: text("override_reason"),
  // Skill requirement (optional). When set, POST /api/allocations validates the
  // resource has the required skill at or above the numeric proficiency level (1–5).
  requiredSkillId: integer("required_skill_id"),
  requiredProficiencyLevel: integer("required_proficiency_level"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAllocationSchema = createInsertSchema(allocationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAllocation = z.infer<typeof insertAllocationSchema>;
export type Allocation = typeof allocationsTable.$inferSelect;
