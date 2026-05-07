import { z } from "zod/v4";
export declare const savedViewConditionSchema: z.ZodObject<{
    field: z.ZodString;
    operator: z.ZodString;
    value: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>;
export declare const savedViewFiltersSchema: z.ZodObject<{
    matchMode: z.ZodDefault<z.ZodEnum<{
        any: "any";
        all: "all";
    }>>;
    conditions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        operator: z.ZodString;
        value: z.ZodOptional<z.ZodUnknown>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type SavedViewCondition = z.infer<typeof savedViewConditionSchema>;
export type SavedViewFilters = z.infer<typeof savedViewFiltersSchema>;
export declare const savedViewsTable: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "saved_views";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "saved_views";
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
        name: import("drizzle-orm/pg-core").PgColumn<{
            name: "name";
            tableName: "saved_views";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        entity: import("drizzle-orm/pg-core").PgColumn<{
            name: "entity";
            tableName: "saved_views";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        filters: import("drizzle-orm/pg-core").PgColumn<{
            name: "filters";
            tableName: "saved_views";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
                matchMode: "any" | "all";
                conditions: {
                    field: string;
                    operator: string;
                    value?: unknown;
                }[];
            };
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: {
                matchMode: "any" | "all";
                conditions: {
                    field: string;
                    operator: string;
                    value?: unknown;
                }[];
            };
        }>;
        visibility: import("drizzle-orm/pg-core").PgColumn<{
            name: "visibility";
            tableName: "saved_views";
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
        createdByUserId: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_by_user_id";
            tableName: "saved_views";
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
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "saved_views";
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
        updatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "updated_at";
            tableName: "saved_views";
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
export declare const insertSavedViewSchema: z.ZodObject<{
    name: z.ZodString;
    createdByUserId: z.ZodInt;
    entity: z.ZodString;
    filters: z.ZodObject<{
        matchMode: z.ZodDefault<z.ZodEnum<{
            any: "any";
            all: "all";
        }>>;
        conditions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            field: z.ZodString;
            operator: z.ZodString;
            value: z.ZodOptional<z.ZodUnknown>;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
    visibility: z.ZodOptional<z.ZodString>;
}, {
    out: {};
    in: {};
}>;
export declare const updateSavedViewSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    filters: z.ZodOptional<z.ZodObject<{
        matchMode: z.ZodDefault<z.ZodEnum<{
            any: "any";
            all: "all";
        }>>;
        conditions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            field: z.ZodString;
            operator: z.ZodString;
            value: z.ZodOptional<z.ZodUnknown>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
    visibility: z.ZodOptional<z.ZodEnum<{
        private: "private";
        public: "public";
    }>>;
}, z.core.$strip>;
export type InsertSavedView = z.infer<typeof insertSavedViewSchema>;
export type UpdateSavedView = z.infer<typeof updateSavedViewSchema>;
export type SavedView = typeof savedViewsTable.$inferSelect;
export declare const SAVED_VIEW_ENTITIES: readonly ["projects", "people", "resource_requests"];
export type SavedViewEntity = typeof SAVED_VIEW_ENTITIES[number];
export declare const listSavedViewsQuerySchema: z.ZodObject<{
    entity: z.ZodEnum<{
        projects: "projects";
        resource_requests: "resource_requests";
        people: "people";
    }>;
}, z.core.$strip>;
export declare const duplicateSavedViewBodySchema: z.ZodOptional<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
}, z.core.$strip>>;
//# sourceMappingURL=savedViews.d.ts.map