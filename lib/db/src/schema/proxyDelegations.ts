import { pgTable, serial, integer, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const proxyDelegationsTable = pgTable("proxy_delegations", {
  id: serial("id").primaryKey(),
  proxyUserId: integer("proxy_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "restrict" }),
  targetUserId: integer("target_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "restrict" }),
  grantedById: integer("granted_by_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "restrict" }),
  validFrom: text("valid_from").notNull(),
  validUntil: text("valid_until").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  proxyIdx: index("idx_proxy_delegations_proxy_user_id").on(t.proxyUserId),
  targetIdx: index("idx_proxy_delegations_target_user_id").on(t.targetUserId),
  activeIdx: index("idx_proxy_delegations_is_active").on(t.isActive),
}));

export const insertProxyDelegationSchema = createInsertSchema(proxyDelegationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProxyDelegation = z.infer<typeof insertProxyDelegationSchema>;
export type ProxyDelegation = typeof proxyDelegationsTable.$inferSelect;
