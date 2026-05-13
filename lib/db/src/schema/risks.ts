/**
 * PM-17 — RAID Log (Risks, Assumptions, Issues, Decisions).
 *
 * One table per project entry; the `type` column discriminates between the
 * four RAID categories. The `status` column drives the lifecycle for each type:
 *
 *   Risk       → Open | Mitigated | Accepted | Closed
 *   Assumption → Open | Validated | Invalidated | Closed
 *   Issue      → Open | In Progress | Resolved | Closed
 *   Decision   → Pending | Made | Deferred | Closed
 */

import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const projectRisksTable = pgTable("project_risks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("Risk"),
  title: text("title").notNull(),
  description: text("description"),
  probability: text("probability"),
  impact: text("impact"),
  mitigation: text("mitigation"),
  status: text("status").notNull().default("Open"),
  ownerId: integer("owner_id").references(() => usersTable.id, { onDelete: "set null" }),
  targetDate: text("target_date"),
  createdByUserId: integer("created_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  projectIdx: index("idx_project_risks_project_id").on(t.projectId),
  typeIdx: index("idx_project_risks_type").on(t.type),
  statusIdx: index("idx_project_risks_status").on(t.status),
}));

export const insertProjectRiskSchema = createInsertSchema(projectRisksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProjectRisk = z.infer<typeof insertProjectRiskSchema>;
export type ProjectRisk = typeof projectRisksTable.$inferSelect;
