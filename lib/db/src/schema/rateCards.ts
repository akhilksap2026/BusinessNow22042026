import { pgTable, serial, text, numeric, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rateCardsTable = pgTable("rate_cards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("Active"),
  effectiveDate: text("effective_date"),
  defaultRate: numeric("default_rate", { precision: 8, scale: 2 }).default("0"),
  roles: json("roles").notNull().$type<{ role: string; rate: number }[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRateCardSchema = createInsertSchema(rateCardsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRateCard = z.infer<typeof insertRateCardSchema>;
export type RateCard = typeof rateCardsTable.$inferSelect;
