import { pgTable, serial, integer, text, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resourceCostRatesTable = pgTable("resource_cost_rates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  country: text("country").notNull(),
  currency: text("currency").notNull().default("USD"),
  rate: numeric("rate", { precision: 10, scale: 2 }).notNull(),
  effectiveDate: text("effective_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index("idx_resource_cost_rates_user").on(t.userId),
}));

export const insertResourceCostRateSchema = createInsertSchema(resourceCostRatesTable)
  .omit({ id: true, createdAt: true });

export const updateResourceCostRateSchema = z.object({
  country: z.string().min(1).optional(),
  currency: z.string().min(1).optional(),
  rate: z.number().positive().optional(),
  effectiveDate: z.string().min(1).optional(),
});

export type InsertResourceCostRate = z.infer<typeof insertResourceCostRateSchema>;
export type UpdateResourceCostRate = z.infer<typeof updateResourceCostRateSchema>;
export type ResourceCostRate = typeof resourceCostRatesTable.$inferSelect;
