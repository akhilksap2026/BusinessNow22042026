import { pgTable, text, integer, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { accountsTable } from "./accounts";
import { timesheetsTable } from "./timesheets";

export const invoicesTable = pgTable("invoices", {
  id: text("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "restrict" }),
  accountId: integer("account_id")
    .notNull()
    .references(() => accountsTable.id, { onDelete: "restrict" }),
  // Idempotency key for timesheet → invoice flow.  Nullable because most
  // invoices are not derived from a timesheet (billing schedules, manual).
  // When set, POST /timesheets/:id/invoice returns the existing invoice
  // instead of creating a duplicate.
  timesheetId: integer("timesheet_id").references(() => timesheetsTable.id, { onDelete: "set null" }),
  issueDate: text("issue_date").notNull(),
  dueDate: text("due_date").notNull(),
  status: text("status").notNull().default("Draft"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  billTo: text("bill_to"),
  notes: text("notes"),
  // INV-5 — Payment tracking fields. Set when payment is received.
  paymentDate: text("payment_date"),
  paymentAmount: numeric("payment_amount", { precision: 12, scale: 2 }),
  paymentReference: text("payment_reference"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  projectIdx: index("idx_invoices_project_id").on(t.projectId),
  accountIdx: index("idx_invoices_account_id").on(t.accountId),
  statusIdx: index("idx_invoices_status").on(t.status),
  timesheetIdx: index("idx_invoices_timesheet_id").on(t.timesheetId),
}));

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ createdAt: true, updatedAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
