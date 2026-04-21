import { pgTable, serial, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const allocationsTable = pgTable("allocations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  userId: integer("user_id"),
  placeholderRole: text("placeholder_role"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  hoursPerWeek: numeric("hours_per_week", { precision: 6, scale: 2 }).notNull().default("0"),
  allocationMethod: text("allocation_method").notNull().default("hours"),
  percentOfCapacity: numeric("percent_of_capacity", { precision: 5, scale: 2 }),
  role: text("role").notNull(),
  isSoftAllocation: boolean("is_soft_allocation").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAllocationSchema = createInsertSchema(allocationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAllocation = z.infer<typeof insertAllocationSchema>;
export type Allocation = typeof allocationsTable.$inferSelect;
