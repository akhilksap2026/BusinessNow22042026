import { pgTable, serial, text, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const formsTable = pgTable("forms", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: integer("is_active").notNull().default(1),
  submissionCount: integer("submission_count").notNull().default(0),
  createdByUserId: integer("created_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFormSchema = createInsertSchema(formsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertForm = z.infer<typeof insertFormSchema>;
export type Form = typeof formsTable.$inferSelect;

export const formFieldsTable = pgTable("form_fields", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").notNull(),
  label: text("label").notNull(),
  fieldType: text("field_type").notNull(),
  isRequired: boolean("is_required").notNull().default(false),
  options: json("options").$type<string[]>().default([]),
  order: integer("order").notNull().default(0),
  conditionalLogic: json("conditional_logic"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFormFieldSchema = createInsertSchema(formFieldsTable).omit({ id: true, createdAt: true });
export type InsertFormField = z.infer<typeof insertFormFieldSchema>;
export type FormField = typeof formFieldsTable.$inferSelect;

export const formResponsesTable = pgTable("form_responses", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").notNull(),
  submittedByUserId: integer("submitted_by_user_id"),
  submitterEmail: text("submitter_email"),
  responses: json("responses").notNull().$type<Record<string, string>>().default({}),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFormResponseSchema = createInsertSchema(formResponsesTable).omit({ id: true, submittedAt: true });
export type InsertFormResponse = z.infer<typeof insertFormResponseSchema>;
export type FormResponse = typeof formResponsesTable.$inferSelect;
