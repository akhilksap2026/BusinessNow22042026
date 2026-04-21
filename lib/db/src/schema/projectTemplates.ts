import { pgTable, serial, text, integer, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectTemplatesTable = pgTable("project_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  billingType: text("billing_type").notNull().default("Fixed Fee"),
  durationDays: integer("duration_days").notNull().default(30),
  phases: json("phases").$type<{
    name: string;
    order: number;
    tasks: { name: string; effort: number; billable: boolean; daysFromStart: number; durationDays: number }[];
  }[]>().default([]),
  createdByUserId: integer("created_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectTemplateSchema = createInsertSchema(projectTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProjectTemplate = z.infer<typeof insertProjectTemplateSchema>;
export type ProjectTemplate = typeof projectTemplatesTable.$inferSelect;
