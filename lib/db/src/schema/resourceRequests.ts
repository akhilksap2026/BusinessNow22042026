import { pgTable, serial, text, integer, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type RequiredSkillWithLevel = {
  skillId: number;
  skillName: string;
  competencyLevel: "Needs Help" | "Independent" | "Can Lead";
};

export const resourceRequestsTable = pgTable("resource_requests", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  requestedByUserId: integer("requested_by_user_id").notNull(),
  type: text("type").notNull().default("add_member"),
  role: text("role").notNull(),
  requiredSkills: text("required_skills").array().notNull().default([]),
  requiredSkillsWithLevel: jsonb("required_skills_with_level").$type<RequiredSkillWithLevel[]>(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  hoursPerWeek: numeric("hours_per_week", { precision: 6, scale: 2 }).notNull(),
  priority: text("priority").notNull().default("Medium"),
  notes: text("notes"),
  status: text("status").notNull().default("Pending"),
  approverId: integer("approver_id"),
  targetResourceId: integer("target_resource_id"),
  region: text("region"),
  allocationMethod: text("allocation_method"),
  methodValue: numeric("method_value", { precision: 10, scale: 2 }),
  assignedUserId: integer("assigned_user_id"),
  assignedPlaceholder: text("assigned_placeholder"),
  fulfilledByUserId: integer("fulfilled_by_user_id"),
  rejectionReason: text("rejection_reason"),
  blockedReason: text("blocked_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const resourceRequestCommentsTable = pgTable("resource_request_comments", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  userId: integer("user_id").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertResourceRequestSchema = createInsertSchema(resourceRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResourceRequest = z.infer<typeof insertResourceRequestSchema>;
export type ResourceRequest = typeof resourceRequestsTable.$inferSelect;

export const insertResourceRequestCommentSchema = createInsertSchema(resourceRequestCommentsTable).omit({ id: true, createdAt: true });
export type InsertResourceRequestComment = z.infer<typeof insertResourceRequestCommentSchema>;
export type ResourceRequestComment = typeof resourceRequestCommentsTable.$inferSelect;
