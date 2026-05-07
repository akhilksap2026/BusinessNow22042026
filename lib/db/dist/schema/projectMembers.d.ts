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
export declare const projectMembersTable: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "project_members";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "project_members";
            dataType: "number";
            columnType: "PgSerial";
            data: number;
            driverParam: number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        projectId: import("drizzle-orm/pg-core").PgColumn<{
            name: "project_id";
            tableName: "project_members";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        userId: import("drizzle-orm/pg-core").PgColumn<{
            name: "user_id";
            tableName: "project_members";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        projectRole: import("drizzle-orm/pg-core").PgColumn<{
            name: "project_role";
            tableName: "project_members";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        joinedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "joined_at";
            tableName: "project_members";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
/** The three valid project-level roles. */
export declare const PROJECT_ROLES: readonly ["admin", "collaborator", "customer"];
export type ProjectRoleValue = (typeof PROJECT_ROLES)[number];
/**
 * Insert schema — `projectRole` is restricted to the canonical enum so callers
 * cannot persist arbitrary strings.  The DB column itself is `text` (no check
 * constraint) for forward-compat; this zod gate is the application-level guard.
 */
export declare const insertProjectMemberSchema: z.ZodObject<{
    projectId: z.ZodInt;
    userId: z.ZodInt;
    projectRole: z.ZodEnum<{
        collaborator: "collaborator";
        admin: "admin";
        customer: "customer";
    }>;
}, {
    out: {};
    in: {};
}>;
export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type ProjectMember = typeof projectMembersTable.$inferSelect;
//# sourceMappingURL=projectMembers.d.ts.map