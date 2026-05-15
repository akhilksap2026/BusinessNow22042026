import { pgTable, serial, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const exceptionalEffortRulesTable = pgTable("exceptional_effort_rules", {
  id: serial("id").primaryKey(),
  ruleName: text("rule_name").notNull(),
  dailyOvertimeThresholdHours: numeric("daily_overtime_threshold_hours", { precision: 4, scale: 2 }).notNull().default("8"),
  weeklyOvertimeThresholdHours: numeric("weekly_overtime_threshold_hours", { precision: 5, scale: 2 }).notNull().default("40"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertExceptionalEffortRuleSchema = createInsertSchema(exceptionalEffortRulesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertExceptionalEffortRule = z.infer<typeof insertExceptionalEffortRuleSchema>;
export type ExceptionalEffortRule = typeof exceptionalEffortRulesTable.$inferSelect;
