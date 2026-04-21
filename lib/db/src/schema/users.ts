import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  role: text("role").notNull(),
  email: text("email").notNull().unique(),
  capacity: integer("capacity").notNull().default(40),
  department: text("department").notNull(),
  costRate: numeric("cost_rate", { precision: 8, scale: 2 }).notNull().default("0"),
  costRateEffectiveDate: text("cost_rate_effective_date"),
  skills: text("skills").array().notNull().default([]),
  avatarUrl: text("avatar_url"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
