import { pgTable, serial, text, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customFieldDefinitionsTable = pgTable("custom_field_definitions", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  name: text("name").notNull(),
  fieldType: text("field_type").notNull(),
  isRequired: boolean("is_required").notNull().default(false),
  options: json("options").$type<string[]>().default([]),
  order: integer("order").notNull().default(0),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCustomFieldDefinitionSchema = createInsertSchema(customFieldDefinitionsTable).omit({ id: true, createdAt: true });
export type InsertCustomFieldDefinition = z.infer<typeof insertCustomFieldDefinitionSchema>;
export type CustomFieldDefinition = typeof customFieldDefinitionsTable.$inferSelect;

export const customFieldValuesTable = pgTable("custom_field_values", {
  id: serial("id").primaryKey(),
  fieldDefinitionId: integer("field_definition_id").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  value: text("value"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCustomFieldValueSchema = createInsertSchema(customFieldValuesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomFieldValue = z.infer<typeof insertCustomFieldValueSchema>;
export type CustomFieldValue = typeof customFieldValuesTable.$inferSelect;
