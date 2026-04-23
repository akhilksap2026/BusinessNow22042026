import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const placeholdersTable = pgTable("placeholders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  roleId: text("role_id"),
  createdBy: integer("created_by"),
  isDefault: boolean("is_default").notNull().default(false),
  accountId: integer("account_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPlaceholderSchema = createInsertSchema(placeholdersTable).omit({ id: true, createdAt: true });
export type InsertPlaceholder = z.infer<typeof insertPlaceholderSchema>;
export type Placeholder = typeof placeholdersTable.$inferSelect;
