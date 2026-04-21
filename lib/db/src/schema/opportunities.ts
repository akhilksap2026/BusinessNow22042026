import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const opportunitiesTable = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(),
  name: text("name").notNull(),
  stage: text("stage").notNull().default("Discovery"),
  probability: integer("probability").notNull().default(10),
  value: numeric("value", { precision: 12, scale: 2 }).notNull().default("0"),
  description: text("description"),
  closeDate: text("close_date"),
  ownerId: integer("owner_id"),
  projectId: integer("project_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOpportunitySchema = createInsertSchema(opportunitiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;
export type Opportunity = typeof opportunitiesTable.$inferSelect;
