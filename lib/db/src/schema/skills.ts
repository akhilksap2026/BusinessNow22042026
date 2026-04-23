import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const skillCategoriesTable = pgTable("skill_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSkillCategorySchema = createInsertSchema(skillCategoriesTable).omit({ id: true, createdAt: true });
export type InsertSkillCategory = z.infer<typeof insertSkillCategorySchema>;
export type SkillCategory = typeof skillCategoriesTable.$inferSelect;

export const skillsTable = pgTable("skills", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id"),
  name: text("name").notNull(),
  skillType: text("skill_type").notNull().default("Level"),
  section: text("section"),
  associatedRoles: text("associated_roles").array().notNull().default([]),
  description: text("description"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSkillSchema = createInsertSchema(skillsTable).omit({ id: true, createdAt: true });
export type InsertSkill = z.infer<typeof insertSkillSchema>;
export type Skill = typeof skillsTable.$inferSelect;

export const userSkillsTable = pgTable("user_skills", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  skillId: integer("skill_id").notNull(),
  proficiencyLevel: text("proficiency_level").notNull().default("Independent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSkillSchema = createInsertSchema(userSkillsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserSkill = z.infer<typeof insertUserSkillSchema>;
export type UserSkill = typeof userSkillsTable.$inferSelect;

export const jobRolesTable = pgTable("job_roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertJobRoleSchema = createInsertSchema(jobRolesTable).omit({ id: true, createdAt: true });
export type InsertJobRole = z.infer<typeof insertJobRoleSchema>;
export type JobRole = typeof jobRolesTable.$inferSelect;
