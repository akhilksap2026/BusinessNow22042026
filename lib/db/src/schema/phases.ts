import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const phasesTable = pgTable("phases", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("Not Started"),
  startDate: text("start_date"),
  dueDate: text("due_date"),
  order: integer("order").notNull().default(0),
  isSharedWithClient: boolean("is_shared_with_client").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPhaseSchema = createInsertSchema(phasesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPhase = z.infer<typeof insertPhaseSchema>;
export type Phase = typeof phasesTable.$inferSelect;
