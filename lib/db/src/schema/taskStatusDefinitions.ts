import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const taskStatusDefinitionsTable = pgTable("task_status_definitions", {
  id: serial("id").primaryKey(),
  label: text("label").notNull().unique(),
  position: integer("position").notNull().default(0),
  isTerminal: boolean("is_terminal").notNull().default(false),
  isDefault: boolean("is_default").notNull().default(false),
  color: text("color"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTaskStatusDefinitionSchema = createInsertSchema(
  taskStatusDefinitionsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTaskStatusDefinition = z.infer<typeof insertTaskStatusDefinitionSchema>;
export type TaskStatusDefinition = typeof taskStatusDefinitionsTable.$inferSelect;
