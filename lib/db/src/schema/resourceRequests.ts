import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resourceRequestsTable = pgTable("resource_requests", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  requestedByUserId: integer("requested_by_user_id").notNull(),
  role: text("role").notNull(),
  requiredSkills: text("required_skills").array().notNull().default([]),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  hoursPerWeek: numeric("hours_per_week", { precision: 6, scale: 2 }).notNull(),
  priority: text("priority").notNull().default("Medium"),
  notes: text("notes"),
  status: text("status").notNull().default("Pending"),
  assignedUserId: integer("assigned_user_id"),
  assignedPlaceholder: text("assigned_placeholder"),
  fulfilledByUserId: integer("fulfilled_by_user_id"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertResourceRequestSchema = createInsertSchema(resourceRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResourceRequest = z.infer<typeof insertResourceRequestSchema>;
export type ResourceRequest = typeof resourceRequestsTable.$inferSelect;
