import { pgTable, serial, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectTemplatesTable = pgTable("project_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  billingType: text("billing_type").notNull().default("Fixed Fee"),
  totalDurationDays: integer("total_duration_days").notNull().default(30),
  accountId: integer("account_id"),
  isArchived: boolean("is_archived").notNull().default(false),
  createdByUserId: integer("created_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectTemplateSchema = createInsertSchema(projectTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProjectTemplate = z.infer<typeof insertProjectTemplateSchema>;
export type ProjectTemplate = typeof projectTemplatesTable.$inferSelect;

export const templatePhasesTable = pgTable("template_phases", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull(),
  name: text("name").notNull(),
  relativeStartOffset: integer("relative_start_offset").notNull().default(0),
  relativeEndOffset: integer("relative_end_offset").notNull().default(7),
  privacyDefault: text("privacy_default").notNull().default("shared"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTemplatePhasesSchema = createInsertSchema(templatePhasesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTemplatePhase = z.infer<typeof insertTemplatePhasesSchema>;
export type TemplatePhase = typeof templatePhasesTable.$inferSelect;

export const templateTasksTable = pgTable("template_tasks", {
  id: serial("id").primaryKey(),
  templatePhaseId: integer("template_phase_id").notNull(),
  templateId: integer("template_id").notNull(),
  name: text("name").notNull(),
  relativeDueDateOffset: integer("relative_due_date_offset").notNull().default(7),
  effort: numeric("effort", { precision: 8, scale: 2 }).notNull().default("0"),
  billableDefault: boolean("billable_default").notNull().default(true),
  priority: text("priority").notNull().default("Medium"),
  assigneeRolePlaceholder: text("assignee_role_placeholder"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTemplateTaskSchema = createInsertSchema(templateTasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTemplateTask = z.infer<typeof insertTemplateTaskSchema>;
export type TemplateTask = typeof templateTasksTable.$inferSelect;
