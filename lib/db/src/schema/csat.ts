import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const csatResponsesTable = pgTable("csat_responses", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  taskId: integer("task_id").notNull(),
  submittedByUserId: integer("submitted_by_user_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCsatResponseSchema = createInsertSchema(csatResponsesTable).omit({ id: true, submittedAt: true });
export type InsertCsatResponse = z.infer<typeof insertCsatResponseSchema>;
export type CsatResponse = typeof csatResponsesTable.$inferSelect;
