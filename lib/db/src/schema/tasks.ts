import { pgTable, serial, text, integer, numeric, boolean, timestamp, jsonb, index, type AnyPgColumn } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  phaseId: integer("phase_id"),
  parentTaskId: integer("parent_task_id").references((): AnyPgColumn => tasksTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  status: text("status").notNull().default("Not Started"),
  priority: text("priority").notNull().default("Medium"),
  assigneeIds: integer("assignee_ids").array().notNull().default([]),
  startDate: text("start_date"),
  dueDate: text("due_date"),
  effort: numeric("effort", { precision: 8, scale: 2 }).notNull().default("0"),
  plannedHours: numeric("planned_hours", { precision: 8, scale: 2 }).notNull().default("0"),
  estimateHours: numeric("estimate_hours", { precision: 8, scale: 2 }).notNull().default("0"),
  billable: boolean("billable").notNull().default(true),
  categoryId: integer("category_id"),
  isMilestone: boolean("is_milestone").notNull().default(false),
  milestoneType: text("milestone_type"),
  taskRoles: jsonb("task_roles").$type<Record<string, string>>().default({}),
  approvalStatus: text("approval_status").default("none"),
  fromTemplate: boolean("from_template").notNull().default(false),
  appliedTemplateId: integer("applied_template_id"),
  privateNotes: text("private_notes"),
  isPhase: boolean("is_phase").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  overrunAlertSentAt: timestamp("overrun_alert_sent_at", { withTimezone: true }),
  etcOverride: numeric("etc_override", { precision: 8, scale: 2 }),
  completionPct: integer("completion_pct").notNull().default(0),
  defaultBillableCategory: text("default_billable_category").notNull().default("Non-Billable"),
  budgetHours: numeric("budget_hours", { precision: 6, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  projectIdx: index("idx_tasks_project_id").on(t.projectId),
  parentIdx: index("idx_tasks_parent_task_id").on(t.parentTaskId),
  projectStatusIdx: index("idx_tasks_project_status").on(t.projectId, t.status),
}));

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;

export const taskNotesTable = pgTable("task_notes", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasksTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  taskIdx: index("idx_task_notes_task_id").on(t.taskId),
}));

export const insertTaskNoteSchema = createInsertSchema(taskNotesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTaskNote = z.infer<typeof insertTaskNoteSchema>;
export type TaskNote = typeof taskNotesTable.$inferSelect;
