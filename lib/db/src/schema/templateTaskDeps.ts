import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const templateTaskDependenciesTable = pgTable("template_task_dependencies", {
  id: serial("id").primaryKey(),
  predecessorId: integer("predecessor_id").notNull(),
  successorId: integer("successor_id").notNull(),
  dependencyType: text("dependency_type").notNull().default("FS"),
  lagDays: integer("lag_days").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniq: unique().on(t.predecessorId, t.successorId),
}));

export const insertTemplateTaskDependencySchema = createInsertSchema(templateTaskDependenciesTable)
  .omit({ id: true, createdAt: true });

export type InsertTemplateTaskDependency = z.infer<typeof insertTemplateTaskDependencySchema>;
export type TemplateTaskDependency = typeof templateTaskDependenciesTable.$inferSelect;
