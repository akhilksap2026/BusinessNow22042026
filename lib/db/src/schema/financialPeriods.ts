import { pgTable, serial, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const financialPeriodsTable = pgTable("financial_periods", {
  id: serial("id").primaryKey(),
  periodName: text("period_name").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  status: text("status").notNull().default("Open"),
  cfoOverrideActive: boolean("cfo_override_active").notNull().default(false),
  cfoOverrideUserId: integer("cfo_override_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusIdx: index("idx_financial_periods_status").on(t.status),
}));

export const insertFinancialPeriodSchema = createInsertSchema(financialPeriodsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFinancialPeriod = z.infer<typeof insertFinancialPeriodSchema>;
export type FinancialPeriod = typeof financialPeriodsTable.$inferSelect;
