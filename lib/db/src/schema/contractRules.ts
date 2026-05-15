import { pgTable, serial, text, integer, numeric, boolean, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const contractRulesTable = pgTable("contract_rules", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  contractType: text("contract_type").notNull().default("Time_And_Materials"),
  incrementMinutes: integer("increment_minutes").notNull().default(15),
  maxBillableHours: numeric("max_billable_hours", { precision: 8, scale: 2 }),
  narrativeRequired: boolean("narrative_required").notNull().default(false),
  futureDateBufferDays: integer("future_date_buffer_days").notNull().default(7),
  maxDailyHours: numeric("max_daily_hours", { precision: 4, scale: 2 }).notNull().default("24"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  projectUniq: uniqueIndex("idx_contract_rules_project_id_uniq").on(t.projectId),
  contractTypeIdx: index("idx_contract_rules_contract_type").on(t.contractType),
}));

export const insertContractRuleSchema = createInsertSchema(contractRulesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContractRule = z.infer<typeof insertContractRuleSchema>;
export type ContractRule = typeof contractRulesTable.$inferSelect;
