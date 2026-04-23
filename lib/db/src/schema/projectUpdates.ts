import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const projectUpdatesTable = pgTable("project_updates", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  body: text("body").notNull().default(""),
  type: text("type").notNull().default("internal"),
  createdByUserId: integer("created_by_user_id").references(() => usersTable.id),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const updateRecipientsTable = pgTable("update_recipients", {
  id: serial("id").primaryKey(),
  updateId: integer("update_id").notNull().references(() => projectUpdatesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProjectUpdate = typeof projectUpdatesTable.$inferSelect;
export type UpdateRecipient = typeof updateRecipientsTable.$inferSelect;
