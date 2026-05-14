import { z } from "zod/v4";
export declare const savedViewConditionSchema: z.ZodObject<{
    field: z.ZodString;
    operator: z.ZodString;
    value: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>;
export declare const savedViewFiltersSchema: z.ZodObject<{
    matchMode: z.ZodDefault<z.ZodEnum<{
        all: "all";
        any: "any";
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
                matchMode: "all" | "any";
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
                matchMode: "all" | "any";
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
        widgetConfig: import("drizzle-orm/pg-core").PgColumn<{
            name: "widget_config";
            tableName: "saved_views";
            dataType: "json";
            columnType: "PgJsonb";
            data: Record<string, unknown>;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: Record<string, unknown>;
        }>;
        roleDefault: import("drizzle-orm/pg-core").PgColumn<{
            name: "role_default";
            tableName: "saved_views";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
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
    entity: z.ZodString;
    filters: z.ZodObject<{
        matchMode: z.ZodDefault<z.ZodEnum<{
            all: "all";
            any: "any";
        }>>;
        conditions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            field: z.ZodString;
            operator: z.ZodString;
            value: z.ZodOptional<z.ZodUnknown>;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
    visibility: z.ZodOptional<z.ZodString>;
    createdByUserId: z.ZodInt;
    widgetConfig: z.ZodOptional<z.ZodNullable<z.ZodType<Record<string, unknown>, Record<string, unknown>, z.core.$ZodTypeInternals<Record<string, unknown>, Record<string, unknown>>>>>;
    roleDefault: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, {
    out: {};
    in: {};
}>;
export declare const updateSavedViewSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    filters: z.ZodOptional<z.ZodObject<{
        matchMode: z.ZodDefault<z.ZodEnum<{
            all: "all";
            any: "any";
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
    widgetConfig: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    roleDefault: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type InsertSavedView = z.infer<typeof insertSavedViewSchema>;
export type UpdateSavedView = z.infer<typeof updateSavedViewSchema>;
export type SavedView = typeof savedViewsTable.$inferSelect;
export declare const SAVED_VIEW_ENTITIES: readonly ["projects", "people", "resource_requests", "dashboard"];
export type SavedViewEntity = typeof SAVED_VIEW_ENTITIES[number];
export declare const listSavedViewsQuerySchema: z.ZodObject<{
    entity: z.ZodEnum<{
        projects: "projects";
        people: "people";
        resource_requests: "resource_requests";
        dashboard: "dashboard";
    }>;
}, z.core.$strip>;
export declare const duplicateSavedViewBodySchema: z.ZodOptional<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
}, z.core.$strip>>;
//# sourceMappingURL=savedViews.d.ts.map