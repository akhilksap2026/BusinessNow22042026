import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const taskDependenciesTable = pgTable("task_dependencies", {
  id: serial("id").primaryKey(),
  predecessorId: integer("predecessor_id").notNull(),
  successorId: integer("successor_id").notNull(),
  dependencyType: text("dependency_type").notNull().default("FS"),
  lagDays: integer("lag_days").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTaskDependencySchema = createInsertSchema(taskDependenciesTable).omit({ id: true, createdAt: true });
export type InsertTaskDependency = z.infer<typeof insertTaskDependencySchema>;
export type TaskDependency = typeof taskDependenciesTable.$inferSelect;

export const taskCommentsTable = pgTable("task_comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  isPrivate: boolean("is_private").notNull().default(false),
  parentCommentId: integer("parent_comment_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTaskCommentSchema = createInsertSchema(taskCommentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;
export type TaskComment = typeof taskCommentsTable.$inferSelect;

export const taskChecklistsTable = pgTable("task_checklists", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  name: text("name").notNull(),
  completed: boolean("completed").notNull().default(false),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTaskChecklistSchema = createInsertSchema(taskChecklistsTable).omit({ id: true, createdAt: true });
export type InsertTaskChecklist = z.infer<typeof insertTaskChecklistSchema>;
export type TaskChecklist = typeof taskChecklistsTable.$inferSelect;

export const taskAttachmentsTable = pgTable("task_attachments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  uploadedByUserId: integer("uploaded_by_user_id").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTaskAttachmentSchema = createInsertSchema(taskAttachmentsTable).omit({ id: true, createdAt: true });
export type InsertTaskAttachment = z.infer<typeof insertTaskAttachmentSchema>;
export type TaskAttachment = typeof taskAttachmentsTable.$inferSelect;
