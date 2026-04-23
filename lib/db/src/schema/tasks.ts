import { pgTable, serial, text, integer, numeric, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  phaseId: integer("phase_id"),
  parentTaskId: integer("parent_task_id"),
  name: text("name").notNull(),
  status: text("status").notNull().default("Not Started"),
  priority: text("priority").notNull().default("Medium"),
  assigneeIds: integer("assignee_ids").array().notNull().default([]),
  startDate: text("start_date"),
  dueDate: text("due_date"),
  effort: numeric("effort", { precision: 8, scale: 2 }).notNull().default("0"),
  billable: boolean("billable").notNull().default(true),
  isMilestone: boolean("is_milestone").notNull().default(false),
  milestoneType: text("milestone_type"),
  taskRoles: jsonb("task_roles").$type<Record<string, string>>().default({}),
  visibleToClient: boolean("visible_to_client").notNull().default(true),
  approvalStatus: text("approval_status").default("none"),
  fromTemplate: boolean("from_template").notNull().default(false),
  appliedTemplateId: integer("applied_template_id"),
  csatEnabled: boolean("csat_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
