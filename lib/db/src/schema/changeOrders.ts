import { pgTable, serial, text, integer, numeric, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const changeOrdersTable = pgTable("change_orders", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  crNumber: text("cr_number"),
  title: text("title").notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  additionalHours: numeric("additional_hours", { precision: 10, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("Draft"),
  submittedByUserId: integer("submitted_by_user_id"),
  approvedByUserId: integer("approved_by_user_id"),
  requestedDate: text("requested_date"),
  submittedDate: text("submitted_date"),
  decisionDate: text("decision_date"),
  approvedDate: text("approved_date"),
  newResourceRole: text("new_resource_role"),
  linkedTaskTitles: json("linked_task_titles").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertChangeOrderSchema = createInsertSchema(changeOrdersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChangeOrder = z.infer<typeof insertChangeOrderSchema>;
export type ChangeOrder = typeof changeOrdersTable.$inferSelect;
