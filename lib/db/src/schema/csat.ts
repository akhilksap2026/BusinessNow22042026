import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
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

export const csatSurveysTable = pgTable("csat_surveys", {
  id: serial("id").primaryKey(),
  milestoneTaskId: integer("milestone_task_id").notNull(),
  projectId: integer("project_id").notNull(),
  recipientUserId: integer("recipient_user_id"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  rating: integer("rating"),
  comment: text("comment"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  token: text("token").notNull(),
});

export const insertCsatSurveySchema = createInsertSchema(csatSurveysTable).omit({ id: true, sentAt: true });
export type InsertCsatSurvey = z.infer<typeof insertCsatSurveySchema>;
export type CsatSurvey = typeof csatSurveysTable.$inferSelect;
