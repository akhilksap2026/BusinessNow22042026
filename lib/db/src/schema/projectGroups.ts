import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectGroupsTable = pgTable("project_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectGroupSchema = createInsertSchema(projectGroupsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProjectGroup = z.infer<typeof insertProjectGroupSchema>;
export type ProjectGroup = typeof projectGroupsTable.$inferSelect;
