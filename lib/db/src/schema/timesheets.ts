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
  submittedByUserId: integer("submitted_by_user_id"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedByUserId: integer("approved_by_user_id"),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  rejectedByUserId: integer("rejected_by_user_id"),
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
  weekStartDay: integer("week_start_day").notNull().default(1),
  minSubmitHours: integer("min_submit_hours").notNull().default(0),
  approverRoutingMode: text("approver_routing_mode").notNull().default("admin_default"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const timesheetMessagesTable = pgTable("timesheet_messages", {
  id: serial("id").primaryKey(),
  timesheetId: integer("timesheet_id").notNull(),
  userId: integer("user_id").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTimesheetMessageSchema = createInsertSchema(timesheetMessagesTable).omit({ id: true, createdAt: true });
export type InsertTimesheetMessage = z.infer<typeof insertTimesheetMessageSchema>;
export type TimesheetMessage = typeof timesheetMessagesTable.$inferSelect;

export const notificationPreferencesTable = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  emailEnabled: boolean("email_enabled").notNull().default(true),
  inAppEnabled: boolean("in_app_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferencesTable).omit({ id: true, updatedAt: true });
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;
export type NotificationPreference = typeof notificationPreferencesTable.$inferSelect;

export const insertTimeSettingsSchema = createInsertSchema(timeSettingsTable).omit({ id: true, updatedAt: true });
export type InsertTimeSettings = z.infer<typeof insertTimeSettingsSchema>;
export type TimeSettings = typeof timeSettingsTable.$inferSelect;

export const timesheetRowsTable = pgTable("timesheet_rows", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  projectId: integer("project_id"),
  taskId: integer("task_id"),
  activityName: text("activity_name"),
  isNonProject: boolean("is_non_project").notNull().default(false),
  billable: boolean("billable").notNull().default(true),
  categoryId: integer("category_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTimesheetRowSchema = createInsertSchema(timesheetRowsTable).omit({ id: true, createdAt: true });
export type InsertTimesheetRow = z.infer<typeof insertTimesheetRowSchema>;
export type TimesheetRow = typeof timesheetRowsTable.$inferSelect;
