import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * P15 — PMO-configurable display labels and colors for project statuses.
 * The underlying status keys and state-machine transitions remain hardcoded;
 * this table only controls how they are displayed in the UI.
 */
export const projectStatusConfigsTable = pgTable("project_status_configs", {
  id: serial("id").primaryKey(),
  statusKey: text("status_key").notNull().unique(),
  displayLabel: text("display_label").notNull(),
  color: text("color").notNull().default("default"),
  sortOrder: integer("sort_order").notNull().default(0),
  description: text("description"),
});

export const insertProjectStatusConfigSchema = createInsertSchema(projectStatusConfigsTable).omit({ id: true });
export type InsertProjectStatusConfig = z.infer<typeof insertProjectStatusConfigSchema>;
export type ProjectStatusConfig = typeof projectStatusConfigsTable.$inferSelect;
