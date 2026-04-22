import { pgTable, serial, text, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const timesheetsTable = pgTable("timesheets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  weekStart: text("week_start").notNull(),
  status: text("status").notNull().default("Draft"),
  totalHours: numeric("total_hours", { precision: 8, scale: 2 }).notNull().default("0"),
  billableHours: numeric("billable_hours", { precision: 8, scale: 2 }).notNull().default("0"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedByUserId: integer("approved_by_user_id"),
  rejectionNote: text("rejection_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTimesheetSchema = createInsertSchema(timesheetsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;
export type Timesheet = typeof timesheetsTable.$inferSelect;

export const timeCategoriesTable = pgTable("time_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTimeCategorySchema = createInsertSchema(timeCategoriesTable).omit({ id: true, createdAt: true });
export type InsertTimeCategory = z.infer<typeof insertTimeCategorySchema>;
export type TimeCategory = typeof timeCategoriesTable.$inferSelect;

export const timeOffRequestsTable = pgTable("time_off_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull().default("PTO"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  status: text("status").notNull().default("Pending"),
  notes: text("notes"),
  approvedByUserId: integer("approved_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTimeOffRequestSchema = createInsertSchema(timeOffRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTimeOffRequest = z.infer<typeof insertTimeOffRequestSchema>;
export type TimeOffRequest = typeof timeOffRequestsTable.$inferSelect;

export const holidayCalendarsTable = pgTable("holiday_calendars", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHolidayCalendarSchema = createInsertSchema(holidayCalendarsTable).omit({ id: true, createdAt: true });
export type InsertHolidayCalendar = z.infer<typeof insertHolidayCalendarSchema>;
export type HolidayCalendar = typeof holidayCalendarsTable.$inferSelect;

export const holidayDatesTable = pgTable("holiday_dates", {
  id: serial("id").primaryKey(),
  calendarId: integer("calendar_id").notNull(),
  name: text("name").notNull(),
  date: text("date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHolidayDateSchema = createInsertSchema(holidayDatesTable).omit({ id: true, createdAt: true });
export type InsertHolidayDate = z.infer<typeof insertHolidayDateSchema>;
export type HolidayDate = typeof holidayDatesTable.$inferSelect;

export const timeSettingsTable = pgTable("time_settings", {
  id: serial("id").primaryKey(),
  weeklyCapacityHours: integer("weekly_capacity_hours").notNull().default(40),
  workingDays: text("working_days").notNull().default("Mon,Tue,Wed,Thu,Fri"),
  timesheetDueDay: text("timesheet_due_day").notNull().default("Monday"),
  approvalMode: text("approval_mode").notNull().default("Manual"),
  globalLockEnabled: boolean("global_lock_enabled").notNull().default(false),
  lockBeforeDate: text("lock_before_date"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTimeSettingsSchema = createInsertSchema(timeSettingsTable).omit({ id: true, updatedAt: true });
export type InsertTimeSettings = z.infer<typeof insertTimeSettingsSchema>;
export type TimeSettings = typeof timeSettingsTable.$inferSelect;
