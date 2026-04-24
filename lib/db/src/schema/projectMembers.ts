import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * projectMembers — Phase 5 of the RBAC rollout.
 *
 * Per-project role overlay for a user.  The effective role at a project is
 * resolved by `resolveProjectRole(accountRole, projectRole)`:
 *  - account_admin / super_user always get 'admin' at every project
 *  - collaborator at the account level gets their projectRole here (defaults
 *    to 'collaborator' when no row exists)
 *  - customer at the account level is always 'customer'
 *
 * The account role is therefore a ceiling — projectRole cannot escalate
 * beyond the account role.
 */
export const projectMembersTable = pgTable(
  "project_members",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull(),
    userId: integer("user_id").notNull(),
    /** 'admin' | 'collaborator' | 'customer' — see resolveProjectRole. */
    projectRole: text("project_role").notNull().default("collaborator"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    /** A user has at most one membership row per project. */
    projectUserUnique: uniqueIndex("project_members_project_user_uq").on(
      table.projectId,
      table.userId,
    ),
  }),
);

/** The three valid project-level roles. */
export const PROJECT_ROLES = ["admin", "collaborator", "customer"] as const;
export type ProjectRoleValue = (typeof PROJECT_ROLES)[number];

/**
 * Insert schema — `projectRole` is restricted to the canonical enum so callers
 * cannot persist arbitrary strings.  The DB column itself is `text` (no check
 * constraint) for forward-compat; this zod gate is the application-level guard.
 */
export const insertProjectMemberSchema = createInsertSchema(projectMembersTable, {
  projectRole: z.enum(PROJECT_ROLES),
}).omit({
  id: true,
  joinedAt: true,
});
export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type ProjectMember = typeof projectMembersTable.$inferSelect;
