import { pgTable, serial, text, integer, numeric, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { usersTable } from "./users";
import { tasksTable } from "./tasks";
import { timesheetsTable } from "./timesheets";

export const timeEntriesTable = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "restrict" }),
  taskId: integer("task_id").references(() => tasksTable.id, { onDelete: "set null" }),
  timesheetId: integer("timesheet_id").references(() => timesheetsTable.id, { onDelete: "set null" }),
  categoryId: integer("category_id"),
  date: text("date").notNull(),
  hours: numeric("hours", { precision: 6, scale: 2 }).notNull(),
  description: text("description"),
  activityName: text("activity_name"),
  billable: boolean("billable").notNull().default(true),
  approved: boolean("approved").notNull().default(false),
  rejected: boolean("rejected").notNull().default(false),
  rejectionNote: text("rejection_note"),
  role: text("role"),
  appliedBillRate: numeric("applied_bill_rate", { precision: 8, scale: 2 }),
  appliedCostRate: numeric("applied_cost_rate", { precision: 8, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userDateIdx: index("idx_time_entries_user_date").on(t.userId, t.date),
  projectIdx: index("idx_time_entries_project_id").on(t.projectId),
  timesheetIdx: index("idx_time_entries_timesheet_id").on(t.timesheetId),
  taskIdx: index("idx_time_entries_task_id").on(t.taskId),
}));

export const insertTimeEntrySchema = createInsertSchema(timeEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntriesTable.$inferSelect;
