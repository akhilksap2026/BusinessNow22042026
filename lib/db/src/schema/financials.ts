import { pgTable, serial, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const taxCodesTable = pgTable("tax_codes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  rate: numeric("rate", { precision: 5, scale: 2 }).notNull(),
  description: text("description"),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTaxCodeSchema = createInsertSchema(taxCodesTable).omit({ id: true, createdAt: true });
export type InsertTaxCode = z.infer<typeof insertTaxCodeSchema>;
export type TaxCode = typeof taxCodesTable.$inferSelect;

export const invoiceLineItemsTable = pgTable("invoice_line_items", {
  id: serial("id").primaryKey(),
  invoiceId: text("invoice_id").notNull(),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 8, scale: 2 }).notNull().default("1"),
  unitRate: numeric("unit_rate", { precision: 10, scale: 2 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  taxCodeId: integer("tax_code_id"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  billable: boolean("billable").notNull().default(true),
  timeEntryId: integer("time_entry_id"),
  userId: integer("user_id"),
  role: text("role"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInvoiceLineItemSchema = createInsertSchema(invoiceLineItemsTable).omit({ id: true, createdAt: true });
export type InsertInvoiceLineItem = z.infer<typeof insertInvoiceLineItemSchema>;
export type InvoiceLineItem = typeof invoiceLineItemsTable.$inferSelect;

export const billingSchedulesTable = pgTable("billing_schedules", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull(),
  triggerType: text("trigger_type").notNull().default("date"),
  triggerValue: text("trigger_value"),
  taskId: integer("task_id"),
  action: text("action").notNull().default("create_draft"),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  percentOfBudget: numeric("percent_of_budget", { precision: 5, scale: 2 }),
  status: text("status").notNull().default("Active"),
  lastFiredAt: timestamp("last_fired_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBillingScheduleSchema = createInsertSchema(billingSchedulesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBillingSchedule = z.infer<typeof insertBillingScheduleSchema>;
export type BillingSchedule = typeof billingSchedulesTable.$inferSelect;

export const revenueEntriesTable = pgTable("revenue_entries", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  period: text("period").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  method: text("method").notNull().default("manual"),
  notes: text("notes"),
  recognizedAt: text("recognized_at").notNull(),
  createdByUserId: integer("created_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRevenueEntrySchema = createInsertSchema(revenueEntriesTable).omit({ id: true, createdAt: true });
export type InsertRevenueEntry = z.infer<typeof insertRevenueEntrySchema>;
export type RevenueEntry = typeof revenueEntriesTable.$inferSelect;

export const budgetEntriesTable = pgTable("budget_entries", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  entryDate: text("entry_date").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  hours: numeric("hours", { precision: 10, scale: 2 }).notNull().default("0"),
  documentLink: text("document_link"),
  changeOrderId: integer("change_order_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBudgetEntrySchema = createInsertSchema(budgetEntriesTable).omit({ id: true, createdAt: true });
export type InsertBudgetEntry = z.infer<typeof insertBudgetEntrySchema>;
export type BudgetEntry = typeof budgetEntriesTable.$inferSelect;
