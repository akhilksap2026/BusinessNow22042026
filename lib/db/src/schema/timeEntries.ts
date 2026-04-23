import { pgTable, serial, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const timeEntriesTable = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  userId: integer("user_id").notNull(),
  taskId: integer("task_id"),
  timesheetId: integer("timesheet_id"),
  categoryId: integer("category_id"),
  date: text("date").notNull(),
  hours: numeric("hours", { precision: 6, scale: 2 }).notNull(),
  description: text("description"),
  activityName: text("activity_name"),
  billable: boolean("billable").notNull().default(true),
  approved: boolean("approved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTimeEntrySchema = createInsertSchema(timeEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntriesTable.$inferSelect;
