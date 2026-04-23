import { pgTable, serial, text, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const keyEventsTable = pgTable("key_events", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  eventDate: text("event_date").notNull(),
  eventType: text("event_type").notNull().default("manual"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const intervalsTable = pgTable("intervals", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startEventId: integer("start_event_id").references(() => keyEventsTable.id),
  endEventId: integer("end_event_id").references(() => keyEventsTable.id),
  benchmarkDays: integer("benchmark_days").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type KeyEvent = typeof keyEventsTable.$inferSelect;
export type Interval = typeof intervalsTable.$inferSelect;
