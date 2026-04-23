import { pgTable, serial, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const savedViewConditionSchema = z.object({
  field: z.string().min(1),
  operator: z.string().min(1),
  value: z.unknown().optional(),
});

export const savedViewFiltersSchema = z.object({
  matchMode: z.enum(["all", "any"]).default("all"),
  conditions: z.array(savedViewConditionSchema).default([]),
});

export type SavedViewCondition = z.infer<typeof savedViewConditionSchema>;
export type SavedViewFilters = z.infer<typeof savedViewFiltersSchema>;

export const savedViewsTable = pgTable("saved_views", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  entity: text("entity").notNull(),
  filters: jsonb("filters").$type<SavedViewFilters>().notNull(),
  visibility: text("visibility").notNull().default("private"),
  createdByUserId: integer("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  entityIdx: index("idx_saved_views_entity").on(t.entity),
  ownerIdx: index("idx_saved_views_owner").on(t.createdByUserId),
}));

export const insertSavedViewSchema = createInsertSchema(savedViewsTable, {
  filters: savedViewFiltersSchema,
}).omit({ id: true, createdAt: true, updatedAt: true });

export const updateSavedViewSchema = z.object({
  name: z.string().min(1).optional(),
  filters: savedViewFiltersSchema.optional(),
  visibility: z.enum(["private", "public"]).optional(),
});

export type InsertSavedView = z.infer<typeof insertSavedViewSchema>;
export type UpdateSavedView = z.infer<typeof updateSavedViewSchema>;
export type SavedView = typeof savedViewsTable.$inferSelect;

export const SAVED_VIEW_ENTITIES = ["projects", "people", "resource_requests"] as const;
export type SavedViewEntity = typeof SAVED_VIEW_ENTITIES[number];

export const listSavedViewsQuerySchema = z.object({
  entity: z.enum(SAVED_VIEW_ENTITIES),
});

export const duplicateSavedViewBodySchema = z.object({
  name: z.string().min(1).optional(),
}).optional();
