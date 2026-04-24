import { pgTable, serial, text, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Canonical four-role values stored in the `role` column.
 * Legacy title-case strings ("Admin", "PM", …) are still accepted at the API
 * layer and resolved via LEGACY_ROLE_MAP in constants/roles.ts.
 *
 * role enum:
 *   account_admin  – Full access (maps from "Admin")
 *   super_user     – Broad project access (maps from "PM", "Finance", "Developer", …)
 *   collaborator   – Limited internal user (maps from "Collaborator", "Viewer")
 *   customer       – External read-only role (maps from "Customer", "Partner")
 */
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  /**
   * Primary role. Accepts both canonical snake_case ("account_admin") and
   * legacy Title-Case ("Admin") values — resolution happens at the API layer.
   */
  role: text("role").notNull(),
  email: text("email").notNull().unique(),
  /**
   * Tenant / organisation reference for multi-account deployments.
   * NULL means the user belongs to the default (single-tenant) workspace.
   */
  accountId: integer("account_id"),
  capacity: integer("capacity").notNull().default(40),
  department: text("department").notNull(),
  region: text("region"),
  costRate: numeric("cost_rate", { precision: 8, scale: 2 }).notNull().default("0"),
  costRateEffectiveDate: text("cost_rate_effective_date"),
  skills: text("skills").array().notNull().default([]),
  /**
   * Additional roles this user may act as (used by the role-switcher in the UI).
   * Stored as text[] of canonical or legacy role strings.
   */
  secondaryRoles: text("secondary_roles").array().notNull().default([]),
  avatarUrl: text("avatar_url"),
  /**
   * 1 = active, 0 = inactive. Use `activeStatus` for richer state ("active",
   * "inactive", "archived"). `isActive` is kept as integer for compatibility.
   */
  isActive: integer("is_active").notNull().default(1),
  isInternal: boolean("is_internal").notNull().default(true),
  activeStatus: text("active_status").notNull().default("active"),
  timesheetApproverUserId: integer("timesheet_approver_user_id"),
  holidayCalendarId: integer("holiday_calendar_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
