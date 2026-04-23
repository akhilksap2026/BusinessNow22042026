import { pgTable, serial, text, integer, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type PortalTheme = {
  primaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  tabVisibility: { plan: boolean; updates: boolean; spaces: boolean };
};

export const DEFAULT_PORTAL_THEME: PortalTheme = {
  primaryColor: "#4f46e5",
  accentColor: "#7c3aed",
  logoUrl: null,
  tabVisibility: { plan: true, updates: true, spaces: false },
};

export const accountsTable = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  domain: text("domain").notNull(),
  tier: text("tier").notNull(),
  region: text("region").notNull(),
  status: text("status").notNull().default("Active"),
  contractValue: numeric("contract_value", { precision: 12, scale: 2 }).notNull().default("0"),
  billingAddress: text("billing_address"),
  logoUrl: text("logo_url"),
  convertedFromProspectId: integer("converted_from_prospect_id"),
  portalTheme: jsonb("portal_theme").$type<PortalTheme>().default(DEFAULT_PORTAL_THEME),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAccountSchema = createInsertSchema(accountsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accountsTable.$inferSelect;
