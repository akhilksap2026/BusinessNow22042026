import { pgTable, serial, integer, text, numeric, timestamp, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const taskDailyAllocationsTable = pgTable("task_daily_allocations", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(),
  hours: numeric("hours", { precision: 6, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  taskIdx: index("idx_task_daily_alloc_task").on(t.taskId),
  userIdx: index("idx_task_daily_alloc_user").on(t.userId),
  uniq: unique().on(t.taskId, t.userId, t.date),
}));

export const insertTaskDailyAllocationSchema = createInsertSchema(taskDailyAllocationsTable)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const updateTaskDailyAllocationSchema = z.object({
  hours: z.number().min(0).max(24).optional(),
  notes: z.string().optional(),
});

export type InsertTaskDailyAllocation = z.infer<typeof insertTaskDailyAllocationSchema>;
export type UpdateTaskDailyAllocation = z.infer<typeof updateTaskDailyAllocationSchema>;
export type TaskDailyAllocation = typeof taskDailyAllocationsTable.$inferSelect;
