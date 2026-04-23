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
  // Configuration flexibility additions
  description: text("description"),
  sectionId: integer("section_id"),
  populationMethod: text("population_method").notNull().default("manual"),
  inheritFromEntity: text("inherit_from_entity"),
  inheritFromFieldId: integer("inherit_from_field_id"),
  fallbackValue: text("fallback_value"),
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

// Sections group custom fields and carry view/edit role permissions.
// Mandatory fields ALWAYS bypass section permissions and are visible to
// every user submitting an entry.
export const customFieldSectionsTable = pgTable("custom_field_sections", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  // Comma-separated role names. Empty string => visible/editable to all.
  viewRoles: text("view_roles").notNull().default(""),
  editRoles: text("edit_roles").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCustomFieldSectionSchema = createInsertSchema(customFieldSectionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomFieldSection = z.infer<typeof insertCustomFieldSectionSchema>;
export type CustomFieldSection = typeof customFieldSectionsTable.$inferSelect;
