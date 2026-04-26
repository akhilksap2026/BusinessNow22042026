import { pgTable, serial, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("Not Started"),
  ownerId: integer("owner_id").notNull(),
  startDate: text("start_date").notNull(),
  dueDate: text("due_date").notNull(),
  billingType: text("billing_type").notNull().default("Fixed Fee"),
  budget: numeric("budget", { precision: 12, scale: 2 }).notNull().default("0"),
  trackedHours: numeric("tracked_hours", { precision: 8, scale: 2 }).notNull().default("0"),
  allocatedHours: numeric("allocated_hours", { precision: 8, scale: 2 }).notNull().default("0"),
  budgetedHours: numeric("budgeted_hours", { precision: 8, scale: 2 }).notNull().default("0"),
  completion: integer("completion").notNull().default(0),
  health: text("health").notNull().default("On Track"),
  description: text("description"),
  rateCardId: integer("rate_card_id"),
  customerChampion: text("customer_champion"),
  templateId: integer("template_id"),
  internalExternal: text("internal_external").notNull().default("External"),
  isAdminProject: integer("is_admin_project").notNull().default(0),
  autoAllocate: boolean("auto_allocate").notNull().default(false),
  opportunityId: integer("opportunity_id"),
  projectGroupId: integer("project_group_id"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
