import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const assetsTable = pgTable("assets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  capacity: integer("capacity").notNull().default(1),
  orgId: integer("org_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assetBookingsTable = pgTable("asset_bookings", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").notNull(),
  projectId: integer("project_id").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  bookedById: integer("booked_by_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAssetSchema = createInsertSchema(assetsTable).omit({ id: true, createdAt: true });
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assetsTable.$inferSelect;

export const insertAssetBookingSchema = createInsertSchema(assetBookingsTable).omit({ id: true, createdAt: true });
export type InsertAssetBooking = z.infer<typeof insertAssetBookingSchema>;
export type AssetBooking = typeof assetBookingsTable.$inferSelect;
