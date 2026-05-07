import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { Account, ActivityItem, AddUserSkillBody, Allocation, ApplyTemplateAsSegmentBody, ApplyTemplateAsSegmentResult, ApplyTemplateBody, ApplyTemplateResult, ApproveTimesheetBody, AuditLogEntry, BillingSchedule, BudgetEntry, BudgetVsActualsReport, BurnDownReport, ConvertOpportunityBody, ConvertOpportunityResult, ConvertProspectBody, ConvertProspectResult, CreateAccountBody, CreateAllocationBody, CreateBillingScheduleBody, CreateBudgetEntryBody, CreateCsatResponseBody, CreateCustomFieldDefinitionBody, CreateDocumentBody, CreateFormBody, CreateFormFieldBody, CreateHolidayCalendarBody, CreateHolidayDateBody, CreateInvoiceBody, CreateInvoiceLineItemBody, CreateOpportunityBody, CreateProjectBody, CreateProjectBudgetEntry409, CreateProjectFromTemplateBody, CreateProjectGroupBody, CreateProjectTemplateBody, CreateProspectBody, CreateRateCardBody, CreateResourceRequestBody, CreateRevenueEntryBody, CreateSavedViewBody, CreateSkillBody, CreateSkillCategoryBody, CreateTaskBody, CreateTaskChecklistItemBody, CreateTaskCommentBody, CreateTaskNoteBody, CreateTaxCodeBody, CreateTemplateAllocationBody, CreateTemplatePhaseBody, CreateTemplateTaskBody, CreateTimeCategoryBody, CreateTimeEntryBody, CreateTimeOffRequestBody, CreateTimesheetBody, CreateUserBody, CsatResponse, CsatSummary, CustomFieldDefinition, CustomFieldValue, DashboardSummary, DocumentVersion, DuplicateSavedViewBody, FinanceSummary, FormField, FormResponse, GanttData, GetDashboardSummaryParams, HealthStatus, HolidayCalendar, HolidayDate, Invoice, InvoiceLineItem, ListAccountsParams, ListAllocationsParams, ListAuditLogParams, ListBillingSchedulesParams, ListCsatResponsesParams, ListCustomFieldDefinitionsParams, ListCustomFieldValuesParams, ListDocumentsParams, ListFormsParams, ListInvoicesParams, ListOpportunitiesParams, ListProjectsParams, ListProspectsParams, ListResourceRequestsParams, ListRevenueEntriesParams, ListSavedViewsParams, ListSkillsParams, ListTasksParams, ListTimeEntriesParams, ListTimeOffRequestsParams, ListTimesheetsParams, Notification, Opportunity, Project, ProjectBudgetEntries, ProjectDocument, ProjectForm, ProjectFormDetail, ProjectGroup, ProjectHealthReport, ProjectSummary, ProjectTemplate, Prospect, RateCard, RejectTimesheetBody, ReorderTaskStatusDefinitionsBody, ReorderTasksBody, ReorderTasksResponse, ResourceRequest, RevenueByPeriodReport, RevenueEntry, RevenueReport, SavedView, Skill, SkillCategory, SubmitFormResponseBody, Task, TaskChecklistItem, TaskComment, TaskNote, TaskStatusDefinition, TaxCode, TemplateAllocation, TemplateAllocationsSummary, TemplatePhase, TemplateTask, TimeCategory, TimeEntry, TimeOffRequest, TimeSummary, Timesheet, TriggerBillingScheduleResponse, UpdateAccountBody, UpdateAllocationBody, UpdateBillingScheduleBody, UpdateDocumentBody, UpdateInvoiceBody, UpdateInvoiceLineItemBody, UpdateOpportunityBody, UpdateProjectBody, UpdateProjectGroupBody, UpdateProjectTemplateBody, UpdateProspectBody, UpdateRateCardBody, UpdateResourceRequestBody, UpdateResourceRequestStatusBody, UpdateSavedViewBody, UpdateTaskBody, UpdateTaskChecklistItemBody, UpdateTemplateAllocationBody, UpdateTimeEntryBody, UpdateTimeOffRequestStatusBody, UpdateTimesheetBody, UpdateUserBody, UpsertCustomFieldValueBody, User, UserCapacity, UserSkillWithDetails, UtilizationReport } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get dashboard KPIs and summary data
 */
export declare const getGetDashboardSummaryUrl: (params?: GetDashboardSummaryParams) => string;
export declare const getDashboardSummary: (params?: GetDashboardSummaryParams, options?: RequestInit) => Promise<DashboardSummary>;
export declare const getGetDashboardSummaryQueryKey: (params?: GetDashboardSummaryParams) => readonly ["/api/dashboard/summary", ...GetDashboardSummaryParams[]];
export declare const getGetDashboardSummaryQueryOptions: <TData = Awaited<ReturnType<typeof getDashboardSummary>>, TError = ErrorType<unknown>>(params?: GetDashboardSummaryParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboardSummary>>>;
export type GetDashboardSummaryQueryError = ErrorType<unknown>;
/**
 * @summary Get dashboard KPIs and summary data
 */
export declare function useGetDashboardSummary<TData = Awaited<ReturnType<typeof getDashboardSummary>>, TError = ErrorType<unknown>>(params?: GetDashboardSummaryParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get recent activity feed
 */
export declare const getGetDashboardActivityUrl: () => string;
export declare const getDashboardActivity: (options?: RequestInit) => Promise<ActivityItem[]>;
export declare const getGetDashboardActivityQueryKey: () => readonly ["/api/dashboard/activity"];
export declare const getGetDashboardActivityQueryOptions: <TData = Awaited<ReturnType<typeof getDashboardActivity>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardActivity>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboardActivity>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardActivityQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboardActivity>>>;
export type GetDashboardActivityQueryError = ErrorType<unknown>;
/**
 * @summary Get recent activity feed
 */
export declare function useGetDashboardActivity<TData = Awaited<ReturnType<typeof getDashboardActivity>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardActivity>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List all client accounts
 */
export declare const getListAccountsUrl: (params?: ListAccountsParams) => string;
export declare const listAccounts: (params?: ListAccountsParams, options?: RequestInit) => Promise<Account[]>;
export declare const getListAccountsQueryKey: (params?: ListAccountsParams) => readonly ["/api/accounts", ...ListAccountsParams[]];
export declare const getListAccountsQueryOptions: <TData = Awaited<ReturnType<typeof listAccounts>>, TError = ErrorType<unknown>>(params?: ListAccountsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAccounts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listAccounts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListAccountsQueryResult = NonNullable<Awaited<ReturnType<typeof listAccounts>>>;
export type ListAccountsQueryError = ErrorType<unknown>;
/**
 * @summary List all client accounts
 */
export declare function useListAccounts<TData = Awaited<ReturnType<typeof listAccounts>>, TError = ErrorType<unknown>>(params?: ListAccountsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAccounts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a new account
 */
export declare const getCreateAccountUrl: () => string;
export declare const createAccount: (createAccountBody: CreateAccountBody, options?: RequestInit) => Promise<Account>;
export declare const getCreateAccountMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAccount>>, TError, {
        data: BodyType<CreateAccountBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createAccount>>, TError, {
    data: BodyType<CreateAccountBody>;
}, TContext>;
export type CreateAccountMutationResult = NonNullable<Awaited<ReturnType<typeof createAccount>>>;
export type CreateAccountMutationBody = BodyType<CreateAccountBody>;
export type CreateAccountMutationError = ErrorType<unknown>;
/**
 * @summary Create a new account
 */
export declare const useCreateAccount: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAccount>>, TError, {
        data: BodyType<CreateAccountBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createAccount>>, TError, {
    data: BodyType<CreateAccountBody>;
}, TContext>;
/**
 * @summary Get account by ID
 */
export declare const getGetAccountUrl: (id: number) => string;
export declare const getAccount: (id: number, options?: RequestInit) => Promise<Account>;
export declare const getGetAccountQueryKey: (id: number) => readonly [`/api/accounts/${number}`];
export declare const getGetAccountQueryOptions: <TData = Awaited<ReturnType<typeof getAccount>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAccount>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAccount>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAccountQueryResult = NonNullable<Awaited<ReturnType<typeof getAccount>>>;
export type GetAccountQueryError = ErrorType<void>;
/**
 * @summary Get account by ID
 */
export declare function useGetAccount<TData = Awaited<ReturnType<typeof getAccount>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAccount>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update account
 */
export declare const getUpdateAccountUrl: (id: number) => string;
export declare const updateAccount: (id: number, updateAccountBody: UpdateAccountBody, options?: RequestInit) => Promise<Account>;
export declare const getUpdateAccountMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAccount>>, TError, {
        id: number;
        data: BodyType<UpdateAccountBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateAccount>>, TError, {
    id: number;
    data: BodyType<UpdateAccountBody>;
}, TContext>;
export type UpdateAccountMutationResult = NonNullable<Awaited<ReturnType<typeof updateAccount>>>;
export type UpdateAccountMutationBody = BodyType<UpdateAccountBody>;
export type UpdateAccountMutationError = ErrorType<unknown>;
/**
 * @summary Update account
 */
export declare const useUpdateAccount: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAccount>>, TError, {
        id: number;
        data: BodyType<UpdateAccountBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateAccount>>, TError, {
    id: number;
    data: BodyType<UpdateAccountBody>;
}, TContext>;
/**
 * @summary Delete account
 */
export declare const getDeleteAccountUrl: (id: number) => string;
export declare const deleteAccount: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteAccountMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAccount>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteAccount>>, TError, {
    id: number;
}, TContext>;
export type DeleteAccountMutationResult = NonNullable<Awaited<ReturnType<typeof deleteAccount>>>;
export type DeleteAccountMutationError = ErrorType<unknown>;
/**
 * @summary Delete account
 */
export declare const useDeleteAccount: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAccount>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteAccount>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List all projects
 */
export declare const getListProjectsUrl: (params?: ListProjectsParams) => string;
export declare const listProjects: (params?: ListProjectsParams, options?: RequestInit) => Promise<Project[]>;
export declare const getListProjectsQueryKey: (params?: ListProjectsParams) => readonly ["/api/projects", ...ListProjectsParams[]];
export declare const getListProjectsQueryOptions: <TData = Awaited<ReturnType<typeof listProjects>>, TError = ErrorType<unknown>>(params?: ListProjectsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProjects>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listProjects>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListProjectsQueryResult = NonNullable<Awaited<ReturnType<typeof listProjects>>>;
export type ListProjectsQueryError = ErrorType<unknown>;
/**
 * @summary List all projects
 */
export declare function useListProjects<TData = Awaited<ReturnType<typeof listProjects>>, TError = ErrorType<unknown>>(params?: ListProjectsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProjects>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a new project
 */
export declare const getCreateProjectUrl: () => string;
export declare const createProject: (createProjectBody: CreateProjectBody, options?: RequestInit) => Promise<Project>;
export declare const getCreateProjectMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProject>>, TError, {
        data: BodyType<CreateProjectBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createProject>>, TError, {
    data: BodyType<CreateProjectBody>;
}, TContext>;
export type CreateProjectMutationResult = NonNullable<Awaited<ReturnType<typeof createProject>>>;
export type CreateProjectMutationBody = BodyType<CreateProjectBody>;
export type CreateProjectMutationError = ErrorType<unknown>;
/**
 * @summary Create a new project
 */
export declare const useCreateProject: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProject>>, TError, {
        data: BodyType<CreateProjectBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createProject>>, TError, {
    data: BodyType<CreateProjectBody>;
}, TContext>;
/**
 * @summary Get project by ID
 */
export declare const getGetProjectUrl: (id: number) => string;
export declare const getProject: (id: number, options?: RequestInit) => Promise<Project>;
export declare const getGetProjectQueryKey: (id: number) => readonly [`/api/projects/${number}`];
export declare const getGetProjectQueryOptions: <TData = Awaited<ReturnType<typeof getProject>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProject>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getProject>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetProjectQueryResult = NonNullable<Awaited<ReturnType<typeof getProject>>>;
export type GetProjectQueryError = ErrorType<void>;
/**
 * @summary Get project by ID
 */
export declare function useGetProject<TData = Awaited<ReturnType<typeof getProject>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProject>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update project
 */
export declare const getUpdateProjectUrl: (id: number) => string;
export declare const updateProject: (id: number, updateProjectBody: UpdateProjectBody, options?: RequestInit) => Promise<Project>;
export declare const getUpdateProjectMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProject>>, TError, {
        id: number;
        data: BodyType<UpdateProjectBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateProject>>, TError, {
    id: number;
    data: BodyType<UpdateProjectBody>;
}, TContext>;
export type UpdateProjectMutationResult = NonNullable<Awaited<ReturnType<typeof updateProject>>>;
export type UpdateProjectMutationBody = BodyType<UpdateProjectBody>;
export type UpdateProjectMutationError = ErrorType<unknown>;
/**
 * @summary Update project
 */
export declare const useUpdateProject: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProject>>, TError, {
        id: number;
        data: BodyType<UpdateProjectBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateProject>>, TError, {
    id: number;
    data: BodyType<UpdateProjectBody>;
}, TContext>;
/**
 * @summary Delete project
 */
export declare const getDeleteProjectUrl: (id: number) => string;
export declare const deleteProject: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteProjectMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProject>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteProject>>, TError, {
    id: number;
}, TContext>;
export type DeleteProjectMutationResult = NonNullable<Awaited<ReturnType<typeof deleteProject>>>;
export type DeleteProjectMutationError = ErrorType<unknown>;
/**
 * @summary Delete project
 */
export declare const useDeleteProject: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProject>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteProject>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Get project health summary with hours and budget breakdown
 */
export declare const getGetProjectSummaryUrl: (id: number) => string;
export declare const getProjectSummary: (id: number, options?: RequestInit) => Promise<ProjectSummary>;
export declare const getGetProjectSummaryQueryKey: (id: number) => readonly [`/api/projects/${number}/summary`];
export declare const getGetProjectSummaryQueryOptions: <TData = Awaited<ReturnType<typeof getProjectSummary>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProjectSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getProjectSummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetProjectSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getProjectSummary>>>;
export type GetProjectSummaryQueryError = ErrorType<unknown>;
/**
 * @summary Get project health summary with hours and budget breakdown
 */
export declare function useGetProjectSummary<TData = Awaited<ReturnType<typeof getProjectSummary>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProjectSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List budget entries for a project with running totals
 */
export declare const getListProjectBudgetEntriesUrl: (id: number) => string;
export declare const listProjectBudgetEntries: (id: number, options?: RequestInit) => Promise<ProjectBudgetEntries>;
export declare const getListProjectBudgetEntriesQueryKey: (id: number) => readonly [`/api/projects/${number}/budget-entries`];
export declare const getListProjectBudgetEntriesQueryOptions: <TData = Awaited<ReturnType<typeof listProjectBudgetEntries>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProjectBudgetEntries>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listProjectBudgetEntries>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListProjectBudgetEntriesQueryResult = NonNullable<Awaited<ReturnType<typeof listProjectBudgetEntries>>>;
export type ListProjectBudgetEntriesQueryError = ErrorType<unknown>;
/**
 * @summary List budget entries for a project with running totals
 */
export declare function useListProjectBudgetEntries<TData = Awaited<ReturnType<typeof listProjectBudgetEntries>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProjectBudgetEntries>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * Accepts `type: "SOW"` or `type: "Adjustment"`. SOW entries seed the
project's baseline and are limited to one per project — a partial
unique index `budget_entries_sow_per_project_uq` enforces this at
the DB level, so a duplicate SOW (including concurrent requests)
returns `409 Conflict`. CO entries are inserted automatically by
the change-order approval flow and cannot be created here.

 * @summary Create a manual SOW or Adjustment budget entry for a project. CO entries are auto-recorded by the change-order approval flow.
 */
export declare const getCreateProjectBudgetEntryUrl: (id: number) => string;
export declare const createProjectBudgetEntry: (id: number, createBudgetEntryBody: CreateBudgetEntryBody, options?: RequestInit) => Promise<BudgetEntry>;
export declare const getCreateProjectBudgetEntryMutationOptions: <TError = ErrorType<CreateProjectBudgetEntry409>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProjectBudgetEntry>>, TError, {
        id: number;
        data: BodyType<CreateBudgetEntryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createProjectBudgetEntry>>, TError, {
    id: number;
    data: BodyType<CreateBudgetEntryBody>;
}, TContext>;
export type CreateProjectBudgetEntryMutationResult = NonNullable<Awaited<ReturnType<typeof createProjectBudgetEntry>>>;
export type CreateProjectBudgetEntryMutationBody = BodyType<CreateBudgetEntryBody>;
export type CreateProjectBudgetEntryMutationError = ErrorType<CreateProjectBudgetEntry409>;
/**
 * @summary Create a manual SOW or Adjustment budget entry for a project. CO entries are auto-recorded by the change-order approval flow.
 */
export declare const useCreateProjectBudgetEntry: <TError = ErrorType<CreateProjectBudgetEntry409>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProjectBudgetEntry>>, TError, {
        id: number;
        data: BodyType<CreateBudgetEntryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createProjectBudgetEntry>>, TError, {
    id: number;
    data: BodyType<CreateBudgetEntryBody>;
}, TContext>;
/**
 * @summary List tasks
 */
export declare const getListTasksUrl: (params?: ListTasksParams) => string;
export declare const listTasks: (params?: ListTasksParams, options?: RequestInit) => Promise<Task[]>;
export declare const getListTasksQueryKey: (params?: ListTasksParams) => readonly ["/api/tasks", ...ListTasksParams[]];
export declare const getListTasksQueryOptions: <TData = Awaited<ReturnType<typeof listTasks>>, TError = ErrorType<unknown>>(params?: ListTasksParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTasks>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTasks>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListTasksQueryResult = NonNullable<Awaited<ReturnType<typeof listTasks>>>;
export type ListTasksQueryError = ErrorType<unknown>;
/**
 * @summary List tasks
 */
export declare function useListTasks<TData = Awaited<ReturnType<typeof listTasks>>, TError = ErrorType<unknown>>(params?: ListTasksParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTasks>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a task
 */
export declare const getCreateTaskUrl: () => string;
export declare const createTask: (createTaskBody: CreateTaskBody, options?: RequestInit) => Promise<Task>;
export declare const getCreateTaskMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTask>>, TError, {
        data: BodyType<CreateTaskBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createTask>>, TError, {
    data: BodyType<CreateTaskBody>;
}, TContext>;
export type CreateTaskMutationResult = NonNullable<Awaited<ReturnType<typeof createTask>>>;
export type CreateTaskMutationBody = BodyType<CreateTaskBody>;
export type CreateTaskMutationError = ErrorType<unknown>;
/**
 * @summary Create a task
 */
export declare const useCreateTask: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTask>>, TError, {
        data: BodyType<CreateTaskBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createTask>>, TError, {
    data: BodyType<CreateTaskBody>;
}, TContext>;
/**
 * @summary Bulk reorder tasks (sortOrder + parentTaskId) in a single transaction
 */
export declare const getReorderTasksUrl: () => string;
export declare const reorderTasks: (reorderTasksBody: ReorderTasksBody, options?: RequestInit) => Promise<ReorderTasksResponse>;
export declare const getReorderTasksMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof reorderTasks>>, TError, {
        data: BodyType<ReorderTasksBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof reorderTasks>>, TError, {
    data: BodyType<ReorderTasksBody>;
}, TContext>;
export type ReorderTasksMutationResult = NonNullable<Awaited<ReturnType<typeof reorderTasks>>>;
export type ReorderTasksMutationBody = BodyType<ReorderTasksBody>;
export type ReorderTasksMutationError = ErrorType<unknown>;
/**
 * @summary Bulk reorder tasks (sortOrder + parentTaskId) in a single transaction
 */
export declare const useReorderTasks: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof reorderTasks>>, TError, {
        data: BodyType<ReorderTasksBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof reorderTasks>>, TError, {
    data: BodyType<ReorderTasksBody>;
}, TContext>;
/**
 * @summary Get task by ID
 */
export declare const getGetTaskUrl: (id: number) => string;
export declare const getTask: (id: number, options?: RequestInit) => Promise<Task>;
export declare const getGetTaskQueryKey: (id: number) => readonly [`/api/tasks/${number}`];
export declare const getGetTaskQueryOptions: <TData = Awaited<ReturnType<typeof getTask>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTask>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getTask>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetTaskQueryResult = NonNullable<Awaited<ReturnType<typeof getTask>>>;
export type GetTaskQueryError = ErrorType<unknown>;
/**
 * @summary Get task by ID
 */
export declare function useGetTask<TData = Awaited<ReturnType<typeof getTask>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTask>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update task
 */
export declare const getUpdateTaskUrl: (id: number) => string;
export declare const updateTask: (id: number, updateTaskBody: UpdateTaskBody, options?: RequestInit) => Promise<Task>;
export declare const getUpdateTaskMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTask>>, TError, {
        id: number;
        data: BodyType<UpdateTaskBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateTask>>, TError, {
    id: number;
    data: BodyType<UpdateTaskBody>;
}, TContext>;
export type UpdateTaskMutationResult = NonNullable<Awaited<ReturnType<typeof updateTask>>>;
export type UpdateTaskMutationBody = BodyType<UpdateTaskBody>;
export type UpdateTaskMutationError = ErrorType<unknown>;
/**
 * @summary Update task
 */
export declare const useUpdateTask: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTask>>, TError, {
        id: number;
        data: BodyType<UpdateTaskBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateTask>>, TError, {
    id: number;
    data: BodyType<UpdateTaskBody>;
}, TContext>;
/**
 * @summary Delete task
 */
export declare const getDeleteTaskUrl: (id: number) => string;
export declare const deleteTask: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteTaskMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTask>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteTask>>, TError, {
    id: number;
}, TContext>;
export type DeleteTaskMutationResult = NonNullable<Awaited<ReturnType<typeof deleteTask>>>;
export type DeleteTaskMutationError = ErrorType<unknown>;
/**
 * @summary Delete task
 */
export declare const useDeleteTask: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTask>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteTask>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List all users / team members
 */
export declare const getListUsersUrl: () => string;
export declare const listUsers: (options?: RequestInit) => Promise<User[]>;
export declare const getListUsersQueryKey: () => readonly ["/api/users"];
export declare const getListUsersQueryOptions: <TData = Awaited<ReturnType<typeof listUsers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListUsersQueryResult = NonNullable<Awaited<ReturnType<typeof listUsers>>>;
export type ListUsersQueryError = ErrorType<unknown>;
/**
 * @summary List all users / team members
 */
export declare function useListUsers<TData = Awaited<ReturnType<typeof listUsers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a user
 */
export declare const getCreateUserUrl: () => string;
export declare const createUser: (createUserBody: CreateUserBody, options?: RequestInit) => Promise<User>;
export declare const getCreateUserMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createUser>>, TError, {
        data: BodyType<CreateUserBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createUser>>, TError, {
    data: BodyType<CreateUserBody>;
}, TContext>;
export type CreateUserMutationResult = NonNullable<Awaited<ReturnType<typeof createUser>>>;
export type CreateUserMutationBody = BodyType<CreateUserBody>;
export type CreateUserMutationError = ErrorType<unknown>;
/**
 * @summary Create a user
 */
export declare const useCreateUser: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createUser>>, TError, {
        data: BodyType<CreateUserBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createUser>>, TError, {
    data: BodyType<CreateUserBody>;
}, TContext>;
/**
 * @summary Get user by ID
 */
export declare const getGetUserUrl: (id: number) => string;
export declare const getUser: (id: number, options?: RequestInit) => Promise<User>;
export declare const getGetUserQueryKey: (id: number) => readonly [`/api/users/${number}`];
export declare const getGetUserQueryOptions: <TData = Awaited<ReturnType<typeof getUser>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUser>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getUser>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetUserQueryResult = NonNullable<Awaited<ReturnType<typeof getUser>>>;
export type GetUserQueryError = ErrorType<unknown>;
/**
 * @summary Get user by ID
 */
export declare function useGetUser<TData = Awaited<ReturnType<typeof getUser>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUser>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update user
 */
export declare const getUpdateUserUrl: (id: number) => string;
export declare const updateUser: (id: number, updateUserBody: UpdateUserBody, options?: RequestInit) => Promise<User>;
export declare const getUpdateUserMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateUser>>, TError, {
        id: number;
        data: BodyType<UpdateUserBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateUser>>, TError, {
    id: number;
    data: BodyType<UpdateUserBody>;
}, TContext>;
export type UpdateUserMutationResult = NonNullable<Awaited<ReturnType<typeof updateUser>>>;
export type UpdateUserMutationBody = BodyType<UpdateUserBody>;
export type UpdateUserMutationError = ErrorType<unknown>;
/**
 * @summary Update user
 */
export declare const useUpdateUser: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateUser>>, TError, {
        id: number;
        data: BodyType<UpdateUserBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateUser>>, TError, {
    id: number;
    data: BodyType<UpdateUserBody>;
}, TContext>;
/**
 * @summary List time entries
 */
export declare const getListTimeEntriesUrl: (params?: ListTimeEntriesParams) => string;
export declare const listTimeEntries: (params?: ListTimeEntriesParams, options?: RequestInit) => Promise<TimeEntry[]>;
export declare const getListTimeEntriesQueryKey: (params?: ListTimeEntriesParams) => readonly ["/api/time-entries", ...ListTimeEntriesParams[]];
export declare const getListTimeEntriesQueryOptions: <TData = Awaited<ReturnType<typeof listTimeEntries>>, TError = ErrorType<unknown>>(params?: ListTimeEntriesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTimeEntries>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTimeEntries>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListTimeEntriesQueryResult = NonNullable<Awaited<ReturnType<typeof listTimeEntries>>>;
export type ListTimeEntriesQueryError = ErrorType<unknown>;
/**
 * @summary List time entries
 */
export declare function useListTimeEntries<TData = Awaited<ReturnType<typeof listTimeEntries>>, TError = ErrorType<unknown>>(params?: ListTimeEntriesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTimeEntries>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Log a time entry
 */
export declare const getCreateTimeEntryUrl: () => string;
export declare const createTimeEntry: (createTimeEntryBody: CreateTimeEntryBody, options?: RequestInit) => Promise<TimeEntry>;
export declare const getCreateTimeEntryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTimeEntry>>, TError, {
        data: BodyType<CreateTimeEntryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createTimeEntry>>, TError, {
    data: BodyType<CreateTimeEntryBody>;
}, TContext>;
export type CreateTimeEntryMutationResult = NonNullable<Awaited<ReturnType<typeof createTimeEntry>>>;
export type CreateTimeEntryMutationBody = BodyType<CreateTimeEntryBody>;
export type CreateTimeEntryMutationError = ErrorType<unknown>;
/**
 * @summary Log a time entry
 */
export declare const useCreateTimeEntry: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTimeEntry>>, TError, {
        data: BodyType<CreateTimeEntryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createTimeEntry>>, TError, {
    data: BodyType<CreateTimeEntryBody>;
}, TContext>;
/**
 * @summary Update a time entry
 */
export declare const getUpdateTimeEntryUrl: (id: number) => string;
export declare const updateTimeEntry: (id: number, updateTimeEntryBody: UpdateTimeEntryBody, options?: RequestInit) => Promise<TimeEntry>;
export declare const getUpdateTimeEntryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTimeEntry>>, TError, {
        id: number;
        data: BodyType<UpdateTimeEntryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateTimeEntry>>, TError, {
    id: number;
    data: BodyType<UpdateTimeEntryBody>;
}, TContext>;
export type UpdateTimeEntryMutationResult = NonNullable<Awaited<ReturnType<typeof updateTimeEntry>>>;
export type UpdateTimeEntryMutationBody = BodyType<UpdateTimeEntryBody>;
export type UpdateTimeEntryMutationError = ErrorType<unknown>;
/**
 * @summary Update a time entry
 */
export declare const useUpdateTimeEntry: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTimeEntry>>, TError, {
        id: number;
        data: BodyType<UpdateTimeEntryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateTimeEntry>>, TError, {
    id: number;
    data: BodyType<UpdateTimeEntryBody>;
}, TContext>;
/**
 * @summary Delete a time entry
 */
export declare const getDeleteTimeEntryUrl: (id: number) => string;
export declare const deleteTimeEntry: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteTimeEntryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTimeEntry>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteTimeEntry>>, TError, {
    id: number;
}, TContext>;
export type DeleteTimeEntryMutationResult = NonNullable<Awaited<ReturnType<typeof deleteTimeEntry>>>;
export type DeleteTimeEntryMutationError = ErrorType<unknown>;
/**
 * @summary Delete a time entry
 */
export declare const useDeleteTimeEntry: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTimeEntry>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteTimeEntry>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Get hours summary grouped by project and user
 */
export declare const getGetTimeEntrySummaryUrl: () => string;
export declare const getTimeEntrySummary: (options?: RequestInit) => Promise<TimeSummary>;
export declare const getGetTimeEntrySummaryQueryKey: () => readonly ["/api/time-entries/summary"];
export declare const getGetTimeEntrySummaryQueryOptions: <TData = Awaited<ReturnType<typeof getTimeEntrySummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTimeEntrySummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getTimeEntrySummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetTimeEntrySummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getTimeEntrySummary>>>;
export type GetTimeEntrySummaryQueryError = ErrorType<unknown>;
/**
 * @summary Get hours summary grouped by project and user
 */
export declare function useGetTimeEntrySummary<TData = Awaited<ReturnType<typeof getTimeEntrySummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTimeEntrySummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List all invoices
 */
export declare const getListInvoicesUrl: (params?: ListInvoicesParams) => string;
export declare const listInvoices: (params?: ListInvoicesParams, options?: RequestInit) => Promise<Invoice[]>;
export declare const getListInvoicesQueryKey: (params?: ListInvoicesParams) => readonly ["/api/invoices", ...ListInvoicesParams[]];
export declare const getListInvoicesQueryOptions: <TData = Awaited<ReturnType<typeof listInvoices>>, TError = ErrorType<unknown>>(params?: ListInvoicesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listInvoices>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listInvoices>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListInvoicesQueryResult = NonNullable<Awaited<ReturnType<typeof listInvoices>>>;
export type ListInvoicesQueryError = ErrorType<unknown>;
/**
 * @summary List all invoices
 */
export declare function useListInvoices<TData = Awaited<ReturnType<typeof listInvoices>>, TError = ErrorType<unknown>>(params?: ListInvoicesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listInvoices>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create an invoice
 */
export declare const getCreateInvoiceUrl: () => string;
export declare const createInvoice: (createInvoiceBody: CreateInvoiceBody, options?: RequestInit) => Promise<Invoice>;
export declare const getCreateInvoiceMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createInvoice>>, TError, {
        data: BodyType<CreateInvoiceBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createInvoice>>, TError, {
    data: BodyType<CreateInvoiceBody>;
}, TContext>;
export type CreateInvoiceMutationResult = NonNullable<Awaited<ReturnType<typeof createInvoice>>>;
export type CreateInvoiceMutationBody = BodyType<CreateInvoiceBody>;
export type CreateInvoiceMutationError = ErrorType<unknown>;
/**
 * @summary Create an invoice
 */
export declare const useCreateInvoice: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createInvoice>>, TError, {
        data: BodyType<CreateInvoiceBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createInvoice>>, TError, {
    data: BodyType<CreateInvoiceBody>;
}, TContext>;
/**
 * @summary Get invoice by ID
 */
export declare const getGetInvoiceUrl: (id: string) => string;
export declare const getInvoice: (id: string, options?: RequestInit) => Promise<Invoice>;
export declare const getGetInvoiceQueryKey: (id: string) => readonly [`/api/invoices/${string}`];
export declare const getGetInvoiceQueryOptions: <TData = Awaited<ReturnType<typeof getInvoice>>, TError = ErrorType<unknown>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getInvoice>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getInvoice>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetInvoiceQueryResult = NonNullable<Awaited<ReturnType<typeof getInvoice>>>;
export type GetInvoiceQueryError = ErrorType<unknown>;
/**
 * @summary Get invoice by ID
 */
export declare function useGetInvoice<TData = Awaited<ReturnType<typeof getInvoice>>, TError = ErrorType<unknown>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getInvoice>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update invoice status
 */
export declare const getUpdateInvoiceUrl: (id: string) => string;
export declare const updateInvoice: (id: string, updateInvoiceBody: UpdateInvoiceBody, options?: RequestInit) => Promise<Invoice>;
export declare const getUpdateInvoiceMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateInvoice>>, TError, {
        id: string;
        data: BodyType<UpdateInvoiceBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateInvoice>>, TError, {
    id: string;
    data: BodyType<UpdateInvoiceBody>;
}, TContext>;
export type UpdateInvoiceMutationResult = NonNullable<Awaited<ReturnType<typeof updateInvoice>>>;
export type UpdateInvoiceMutationBody = BodyType<UpdateInvoiceBody>;
export type UpdateInvoiceMutationError = ErrorType<unknown>;
/**
 * @summary Update invoice status
 */
export declare const useUpdateInvoice: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateInvoice>>, TError, {
        id: string;
        data: BodyType<UpdateInvoiceBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateInvoice>>, TError, {
    id: string;
    data: BodyType<UpdateInvoiceBody>;
}, TContext>;
/**
 * @summary Get revenue, outstanding, and pipeline totals
 */
export declare const getGetFinanceSummaryUrl: () => string;
export declare const getFinanceSummary: (options?: RequestInit) => Promise<FinanceSummary>;
export declare const getGetFinanceSummaryQueryKey: () => readonly ["/api/invoices/finance-summary"];
export declare const getGetFinanceSummaryQueryOptions: <TData = Awaited<ReturnType<typeof getFinanceSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFinanceSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getFinanceSummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetFinanceSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getFinanceSummary>>>;
export type GetFinanceSummaryQueryError = ErrorType<unknown>;
/**
 * @summary Get revenue, outstanding, and pipeline totals
 */
export declare function useGetFinanceSummary<TData = Awaited<ReturnType<typeof getFinanceSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFinanceSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List rate cards
 */
export declare const getListRateCardsUrl: () => string;
export declare const listRateCards: (options?: RequestInit) => Promise<RateCard[]>;
export declare const getListRateCardsQueryKey: () => readonly ["/api/rate-cards"];
export declare const getListRateCardsQueryOptions: <TData = Awaited<ReturnType<typeof listRateCards>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listRateCards>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listRateCards>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListRateCardsQueryResult = NonNullable<Awaited<ReturnType<typeof listRateCards>>>;
export type ListRateCardsQueryError = ErrorType<unknown>;
/**
 * @summary List rate cards
 */
export declare function useListRateCards<TData = Awaited<ReturnType<typeof listRateCards>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listRateCards>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a rate card
 */
export declare const getCreateRateCardUrl: () => string;
export declare const createRateCard: (createRateCardBody: CreateRateCardBody, options?: RequestInit) => Promise<RateCard>;
export declare const getCreateRateCardMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createRateCard>>, TError, {
        data: BodyType<CreateRateCardBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createRateCard>>, TError, {
    data: BodyType<CreateRateCardBody>;
}, TContext>;
export type CreateRateCardMutationResult = NonNullable<Awaited<ReturnType<typeof createRateCard>>>;
export type CreateRateCardMutationBody = BodyType<CreateRateCardBody>;
export type CreateRateCardMutationError = ErrorType<unknown>;
/**
 * @summary Create a rate card
 */
export declare const useCreateRateCard: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createRateCard>>, TError, {
        data: BodyType<CreateRateCardBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createRateCard>>, TError, {
    data: BodyType<CreateRateCardBody>;
}, TContext>;
/**
 * @summary Update rate card
 */
export declare const getUpdateRateCardUrl: (id: number) => string;
export declare const updateRateCard: (id: number, updateRateCardBody: UpdateRateCardBody, options?: RequestInit) => Promise<RateCard>;
export declare const getUpdateRateCardMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateRateCard>>, TError, {
        id: number;
        data: BodyType<UpdateRateCardBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateRateCard>>, TError, {
    id: number;
    data: BodyType<UpdateRateCardBody>;
}, TContext>;
export type UpdateRateCardMutationResult = NonNullable<Awaited<ReturnType<typeof updateRateCard>>>;
export type UpdateRateCardMutationBody = BodyType<UpdateRateCardBody>;
export type UpdateRateCardMutationError = ErrorType<unknown>;
/**
 * @summary Update rate card
 */
export declare const useUpdateRateCard: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateRateCard>>, TError, {
        id: number;
        data: BodyType<UpdateRateCardBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateRateCard>>, TError, {
    id: number;
    data: BodyType<UpdateRateCardBody>;
}, TContext>;
/**
 * @summary Delete rate card
 */
export declare const getDeleteRateCardUrl: (id: number) => string;
export declare const deleteRateCard: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteRateCardMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteRateCard>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteRateCard>>, TError, {
    id: number;
}, TContext>;
export type DeleteRateCardMutationResult = NonNullable<Awaited<ReturnType<typeof deleteRateCard>>>;
export type DeleteRateCardMutationError = ErrorType<unknown>;
/**
 * @summary Delete rate card
 */
export declare const useDeleteRateCard: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteRateCard>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteRateCard>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List resource allocations
 */
export declare const getListAllocationsUrl: (params?: ListAllocationsParams) => string;
export declare const listAllocations: (params?: ListAllocationsParams, options?: RequestInit) => Promise<Allocation[]>;
export declare const getListAllocationsQueryKey: (params?: ListAllocationsParams) => readonly ["/api/allocations", ...ListAllocationsParams[]];
export declare const getListAllocationsQueryOptions: <TData = Awaited<ReturnType<typeof listAllocations>>, TError = ErrorType<unknown>>(params?: ListAllocationsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAllocations>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listAllocations>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListAllocationsQueryResult = NonNullable<Awaited<ReturnType<typeof listAllocations>>>;
export type ListAllocationsQueryError = ErrorType<unknown>;
/**
 * @summary List resource allocations
 */
export declare function useListAllocations<TData = Awaited<ReturnType<typeof listAllocations>>, TError = ErrorType<unknown>>(params?: ListAllocationsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAllocations>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create resource allocation
 */
export declare const getCreateAllocationUrl: () => string;
export declare const createAllocation: (createAllocationBody: CreateAllocationBody, options?: RequestInit) => Promise<Allocation>;
export declare const getCreateAllocationMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAllocation>>, TError, {
        data: BodyType<CreateAllocationBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createAllocation>>, TError, {
    data: BodyType<CreateAllocationBody>;
}, TContext>;
export type CreateAllocationMutationResult = NonNullable<Awaited<ReturnType<typeof createAllocation>>>;
export type CreateAllocationMutationBody = BodyType<CreateAllocationBody>;
export type CreateAllocationMutationError = ErrorType<unknown>;
/**
 * @summary Create resource allocation
 */
export declare const useCreateAllocation: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAllocation>>, TError, {
        data: BodyType<CreateAllocationBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createAllocation>>, TError, {
    data: BodyType<CreateAllocationBody>;
}, TContext>;
/**
 * @summary Update allocation
 */
export declare const getUpdateAllocationUrl: (id: number) => string;
export declare const updateAllocation: (id: number, updateAllocationBody: UpdateAllocationBody, options?: RequestInit) => Promise<Allocation>;
export declare const getUpdateAllocationMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAllocation>>, TError, {
        id: number;
        data: BodyType<UpdateAllocationBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateAllocation>>, TError, {
    id: number;
    data: BodyType<UpdateAllocationBody>;
}, TContext>;
export type UpdateAllocationMutationResult = NonNullable<Awaited<ReturnType<typeof updateAllocation>>>;
export type UpdateAllocationMutationBody = BodyType<UpdateAllocationBody>;
export type UpdateAllocationMutationError = ErrorType<unknown>;
/**
 * @summary Update allocation
 */
export declare const useUpdateAllocation: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAllocation>>, TError, {
        id: number;
        data: BodyType<UpdateAllocationBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateAllocation>>, TError, {
    id: number;
    data: BodyType<UpdateAllocationBody>;
}, TContext>;
/**
 * @summary Delete allocation
 */
export declare const getDeleteAllocationUrl: (id: number) => string;
export declare const deleteAllocation: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteAllocationMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAllocation>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteAllocation>>, TError, {
    id: number;
}, TContext>;
export type DeleteAllocationMutationResult = NonNullable<Awaited<ReturnType<typeof deleteAllocation>>>;
export type DeleteAllocationMutationError = ErrorType<unknown>;
/**
 * @summary Delete allocation
 */
export declare const useDeleteAllocation: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAllocation>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteAllocation>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Get team capacity and utilization overview
 */
export declare const getGetCapacityOverviewUrl: () => string;
export declare const getCapacityOverview: (options?: RequestInit) => Promise<UserCapacity[]>;
export declare const getGetCapacityOverviewQueryKey: () => readonly ["/api/resources/capacity"];
export declare const getGetCapacityOverviewQueryOptions: <TData = Awaited<ReturnType<typeof getCapacityOverview>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCapacityOverview>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCapacityOverview>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCapacityOverviewQueryResult = NonNullable<Awaited<ReturnType<typeof getCapacityOverview>>>;
export type GetCapacityOverviewQueryError = ErrorType<unknown>;
/**
 * @summary Get team capacity and utilization overview
 */
export declare function useGetCapacityOverview<TData = Awaited<ReturnType<typeof getCapacityOverview>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCapacityOverview>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Team utilization report
 */
export declare const getGetUtilizationReportUrl: () => string;
export declare const getUtilizationReport: (options?: RequestInit) => Promise<UtilizationReport>;
export declare const getGetUtilizationReportQueryKey: () => readonly ["/api/reports/utilization"];
export declare const getGetUtilizationReportQueryOptions: <TData = Awaited<ReturnType<typeof getUtilizationReport>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUtilizationReport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getUtilizationReport>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetUtilizationReportQueryResult = NonNullable<Awaited<ReturnType<typeof getUtilizationReport>>>;
export type GetUtilizationReportQueryError = ErrorType<unknown>;
/**
 * @summary Team utilization report
 */
export declare function useGetUtilizationReport<TData = Awaited<ReturnType<typeof getUtilizationReport>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUtilizationReport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Revenue by month and project
 */
export declare const getGetRevenueReportUrl: () => string;
export declare const getRevenueReport: (options?: RequestInit) => Promise<RevenueReport>;
export declare const getGetRevenueReportQueryKey: () => readonly ["/api/reports/revenue"];
export declare const getGetRevenueReportQueryOptions: <TData = Awaited<ReturnType<typeof getRevenueReport>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRevenueReport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRevenueReport>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRevenueReportQueryResult = NonNullable<Awaited<ReturnType<typeof getRevenueReport>>>;
export type GetRevenueReportQueryError = ErrorType<unknown>;
/**
 * @summary Revenue by month and project
 */
export declare function useGetRevenueReport<TData = Awaited<ReturnType<typeof getRevenueReport>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRevenueReport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Project health status breakdown
 */
export declare const getGetProjectHealthReportUrl: () => string;
export declare const getProjectHealthReport: (options?: RequestInit) => Promise<ProjectHealthReport>;
export declare const getGetProjectHealthReportQueryKey: () => readonly ["/api/reports/project-health"];
export declare const getGetProjectHealthReportQueryOptions: <TData = Awaited<ReturnType<typeof getProjectHealthReport>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProjectHealthReport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getProjectHealthReport>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetProjectHealthReportQueryResult = NonNullable<Awaited<ReturnType<typeof getProjectHealthReport>>>;
export type GetProjectHealthReportQueryError = ErrorType<unknown>;
/**
 * @summary Project health status breakdown
 */
export declare function useGetProjectHealthReport<TData = Awaited<ReturnType<typeof getProjectHealthReport>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProjectHealthReport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List notifications for current user
 */
export declare const getListNotificationsUrl: () => string;
export declare const listNotifications: (options?: RequestInit) => Promise<Notification[]>;
export declare const getListNotificationsQueryKey: () => readonly ["/api/notifications"];
export declare const getListNotificationsQueryOptions: <TData = Awaited<ReturnType<typeof listNotifications>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listNotifications>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listNotifications>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListNotificationsQueryResult = NonNullable<Awaited<ReturnType<typeof listNotifications>>>;
export type ListNotificationsQueryError = ErrorType<unknown>;
/**
 * @summary List notifications for current user
 */
export declare function useListNotifications<TData = Awaited<ReturnType<typeof listNotifications>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listNotifications>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Mark notification as read
 */
export declare const getMarkNotificationReadUrl: (id: number) => string;
export declare const markNotificationRead: (id: number, options?: RequestInit) => Promise<Notification>;
export declare const getMarkNotificationReadMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markNotificationRead>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof markNotificationRead>>, TError, {
    id: number;
}, TContext>;
export type MarkNotificationReadMutationResult = NonNullable<Awaited<ReturnType<typeof markNotificationRead>>>;
export type MarkNotificationReadMutationError = ErrorType<unknown>;
/**
 * @summary Mark notification as read
 */
export declare const useMarkNotificationRead: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markNotificationRead>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof markNotificationRead>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List timesheets
 */
export declare const getListTimesheetsUrl: (params?: ListTimesheetsParams) => string;
export declare const listTimesheets: (params?: ListTimesheetsParams, options?: RequestInit) => Promise<Timesheet[]>;
export declare const getListTimesheetsQueryKey: (params?: ListTimesheetsParams) => readonly ["/api/timesheets", ...ListTimesheetsParams[]];
export declare const getListTimesheetsQueryOptions: <TData = Awaited<ReturnType<typeof listTimesheets>>, TError = ErrorType<unknown>>(params?: ListTimesheetsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTimesheets>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTimesheets>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListTimesheetsQueryResult = NonNullable<Awaited<ReturnType<typeof listTimesheets>>>;
export type ListTimesheetsQueryError = ErrorType<unknown>;
/**
 * @summary List timesheets
 */
export declare function useListTimesheets<TData = Awaited<ReturnType<typeof listTimesheets>>, TError = ErrorType<unknown>>(params?: ListTimesheetsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTimesheets>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create or get timesheet for a week
 */
export declare const getCreateTimesheetUrl: () => string;
export declare const createTimesheet: (createTimesheetBody: CreateTimesheetBody, options?: RequestInit) => Promise<Timesheet>;
export declare const getCreateTimesheetMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTimesheet>>, TError, {
        data: BodyType<CreateTimesheetBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createTimesheet>>, TError, {
    data: BodyType<CreateTimesheetBody>;
}, TContext>;
export type CreateTimesheetMutationResult = NonNullable<Awaited<ReturnType<typeof createTimesheet>>>;
export type CreateTimesheetMutationBody = BodyType<CreateTimesheetBody>;
export type CreateTimesheetMutationError = ErrorType<unknown>;
/**
 * @summary Create or get timesheet for a week
 */
export declare const useCreateTimesheet: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTimesheet>>, TError, {
        data: BodyType<CreateTimesheetBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createTimesheet>>, TError, {
    data: BodyType<CreateTimesheetBody>;
}, TContext>;
/**
 * @summary Get timesheet by ID
 */
export declare const getGetTimesheetUrl: (id: number) => string;
export declare const getTimesheet: (id: number, options?: RequestInit) => Promise<Timesheet>;
export declare const getGetTimesheetQueryKey: (id: number) => readonly [`/api/timesheets/${number}`];
export declare const getGetTimesheetQueryOptions: <TData = Awaited<ReturnType<typeof getTimesheet>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTimesheet>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getTimesheet>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetTimesheetQueryResult = NonNullable<Awaited<ReturnType<typeof getTimesheet>>>;
export type GetTimesheetQueryError = ErrorType<void>;
/**
 * @summary Get timesheet by ID
 */
export declare function useGetTimesheet<TData = Awaited<ReturnType<typeof getTimesheet>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTimesheet>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update timesheet
 */
export declare const getUpdateTimesheetUrl: (id: number) => string;
export declare const updateTimesheet: (id: number, updateTimesheetBody: UpdateTimesheetBody, options?: RequestInit) => Promise<Timesheet>;
export declare const getUpdateTimesheetMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTimesheet>>, TError, {
        id: number;
        data: BodyType<UpdateTimesheetBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateTimesheet>>, TError, {
    id: number;
    data: BodyType<UpdateTimesheetBody>;
}, TContext>;
export type UpdateTimesheetMutationResult = NonNullable<Awaited<ReturnType<typeof updateTimesheet>>>;
export type UpdateTimesheetMutationBody = BodyType<UpdateTimesheetBody>;
export type UpdateTimesheetMutationError = ErrorType<unknown>;
/**
 * @summary Update timesheet
 */
export declare const useUpdateTimesheet: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTimesheet>>, TError, {
        id: number;
        data: BodyType<UpdateTimesheetBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateTimesheet>>, TError, {
    id: number;
    data: BodyType<UpdateTimesheetBody>;
}, TContext>;
/**
 * @summary Submit timesheet for approval
 */
export declare const getSubmitTimesheetUrl: (id: number) => string;
export declare const submitTimesheet: (id: number, options?: RequestInit) => Promise<Timesheet>;
export declare const getSubmitTimesheetMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof submitTimesheet>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof submitTimesheet>>, TError, {
    id: number;
}, TContext>;
export type SubmitTimesheetMutationResult = NonNullable<Awaited<ReturnType<typeof submitTimesheet>>>;
export type SubmitTimesheetMutationError = ErrorType<unknown>;
/**
 * @summary Submit timesheet for approval
 */
export declare const useSubmitTimesheet: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof submitTimesheet>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof submitTimesheet>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Approve a submitted timesheet
 */
export declare const getApproveTimesheetUrl: (id: number) => string;
export declare const approveTimesheet: (id: number, approveTimesheetBody?: ApproveTimesheetBody, options?: RequestInit) => Promise<Timesheet>;
export declare const getApproveTimesheetMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof approveTimesheet>>, TError, {
        id: number;
        data: BodyType<ApproveTimesheetBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof approveTimesheet>>, TError, {
    id: number;
    data: BodyType<ApproveTimesheetBody>;
}, TContext>;
export type ApproveTimesheetMutationResult = NonNullable<Awaited<ReturnType<typeof approveTimesheet>>>;
export type ApproveTimesheetMutationBody = BodyType<ApproveTimesheetBody>;
export type ApproveTimesheetMutationError = ErrorType<unknown>;
/**
 * @summary Approve a submitted timesheet
 */
export declare const useApproveTimesheet: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof approveTimesheet>>, TError, {
        id: number;
        data: BodyType<ApproveTimesheetBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof approveTimesheet>>, TError, {
    id: number;
    data: BodyType<ApproveTimesheetBody>;
}, TContext>;
/**
 * @summary Reject a submitted timesheet
 */
export declare const getRejectTimesheetUrl: (id: number) => string;
export declare const rejectTimesheet: (id: number, rejectTimesheetBody: RejectTimesheetBody, options?: RequestInit) => Promise<Timesheet>;
export declare const getRejectTimesheetMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof rejectTimesheet>>, TError, {
        id: number;
        data: BodyType<RejectTimesheetBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof rejectTimesheet>>, TError, {
    id: number;
    data: BodyType<RejectTimesheetBody>;
}, TContext>;
export type RejectTimesheetMutationResult = NonNullable<Awaited<ReturnType<typeof rejectTimesheet>>>;
export type RejectTimesheetMutationBody = BodyType<RejectTimesheetBody>;
export type RejectTimesheetMutationError = ErrorType<unknown>;
/**
 * @summary Reject a submitted timesheet
 */
export declare const useRejectTimesheet: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof rejectTimesheet>>, TError, {
        id: number;
        data: BodyType<RejectTimesheetBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof rejectTimesheet>>, TError, {
    id: number;
    data: BodyType<RejectTimesheetBody>;
}, TContext>;
/**
 * @summary List line items for an invoice
 */
export declare const getListInvoiceLineItemsUrl: (id: string) => string;
export declare const listInvoiceLineItems: (id: string, options?: RequestInit) => Promise<InvoiceLineItem[]>;
export declare const getListInvoiceLineItemsQueryKey: (id: string) => readonly [`/api/invoices/${string}/line-items`];
export declare const getListInvoiceLineItemsQueryOptions: <TData = Awaited<ReturnType<typeof listInvoiceLineItems>>, TError = ErrorType<unknown>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listInvoiceLineItems>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listInvoiceLineItems>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListInvoiceLineItemsQueryResult = NonNullable<Awaited<ReturnType<typeof listInvoiceLineItems>>>;
export type ListInvoiceLineItemsQueryError = ErrorType<unknown>;
/**
 * @summary List line items for an invoice
 */
export declare function useListInvoiceLineItems<TData = Awaited<ReturnType<typeof listInvoiceLineItems>>, TError = ErrorType<unknown>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listInvoiceLineItems>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Add a line item to an invoice
 */
export declare const getCreateInvoiceLineItemUrl: (id: string) => string;
export declare const createInvoiceLineItem: (id: string, createInvoiceLineItemBody: CreateInvoiceLineItemBody, options?: RequestInit) => Promise<InvoiceLineItem>;
export declare const getCreateInvoiceLineItemMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createInvoiceLineItem>>, TError, {
        id: string;
        data: BodyType<CreateInvoiceLineItemBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createInvoiceLineItem>>, TError, {
    id: string;
    data: BodyType<CreateInvoiceLineItemBody>;
}, TContext>;
export type CreateInvoiceLineItemMutationResult = NonNullable<Awaited<ReturnType<typeof createInvoiceLineItem>>>;
export type CreateInvoiceLineItemMutationBody = BodyType<CreateInvoiceLineItemBody>;
export type CreateInvoiceLineItemMutationError = ErrorType<unknown>;
/**
 * @summary Add a line item to an invoice
 */
export declare const useCreateInvoiceLineItem: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createInvoiceLineItem>>, TError, {
        id: string;
        data: BodyType<CreateInvoiceLineItemBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createInvoiceLineItem>>, TError, {
    id: string;
    data: BodyType<CreateInvoiceLineItemBody>;
}, TContext>;
/**
 * @summary Update a line item
 */
export declare const getUpdateInvoiceLineItemUrl: (id: string, lineItemId: number) => string;
export declare const updateInvoiceLineItem: (id: string, lineItemId: number, updateInvoiceLineItemBody: UpdateInvoiceLineItemBody, options?: RequestInit) => Promise<InvoiceLineItem>;
export declare const getUpdateInvoiceLineItemMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateInvoiceLineItem>>, TError, {
        id: string;
        lineItemId: number;
        data: BodyType<UpdateInvoiceLineItemBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateInvoiceLineItem>>, TError, {
    id: string;
    lineItemId: number;
    data: BodyType<UpdateInvoiceLineItemBody>;
}, TContext>;
export type UpdateInvoiceLineItemMutationResult = NonNullable<Awaited<ReturnType<typeof updateInvoiceLineItem>>>;
export type UpdateInvoiceLineItemMutationBody = BodyType<UpdateInvoiceLineItemBody>;
export type UpdateInvoiceLineItemMutationError = ErrorType<unknown>;
/**
 * @summary Update a line item
 */
export declare const useUpdateInvoiceLineItem: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateInvoiceLineItem>>, TError, {
        id: string;
        lineItemId: number;
        data: BodyType<UpdateInvoiceLineItemBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateInvoiceLineItem>>, TError, {
    id: string;
    lineItemId: number;
    data: BodyType<UpdateInvoiceLineItemBody>;
}, TContext>;
/**
 * @summary Delete a line item
 */
export declare const getDeleteInvoiceLineItemUrl: (id: string, lineItemId: number) => string;
export declare const deleteInvoiceLineItem: (id: string, lineItemId: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteInvoiceLineItemMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteInvoiceLineItem>>, TError, {
        id: string;
        lineItemId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteInvoiceLineItem>>, TError, {
    id: string;
    lineItemId: number;
}, TContext>;
export type DeleteInvoiceLineItemMutationResult = NonNullable<Awaited<ReturnType<typeof deleteInvoiceLineItem>>>;
export type DeleteInvoiceLineItemMutationError = ErrorType<unknown>;
/**
 * @summary Delete a line item
 */
export declare const useDeleteInvoiceLineItem: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteInvoiceLineItem>>, TError, {
        id: string;
        lineItemId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteInvoiceLineItem>>, TError, {
    id: string;
    lineItemId: number;
}, TContext>;
/**
 * @summary Auto-fill line items from approved time entries (T&M)
 */
export declare const getAutofillInvoiceLineItemsUrl: (id: string) => string;
export declare const autofillInvoiceLineItems: (id: string, options?: RequestInit) => Promise<InvoiceLineItem[]>;
export declare const getAutofillInvoiceLineItemsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof autofillInvoiceLineItems>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof autofillInvoiceLineItems>>, TError, {
    id: string;
}, TContext>;
export type AutofillInvoiceLineItemsMutationResult = NonNullable<Awaited<ReturnType<typeof autofillInvoiceLineItems>>>;
export type AutofillInvoiceLineItemsMutationError = ErrorType<unknown>;
/**
 * @summary Auto-fill line items from approved time entries (T&M)
 */
export declare const useAutofillInvoiceLineItems: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof autofillInvoiceLineItems>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof autofillInvoiceLineItems>>, TError, {
    id: string;
}, TContext>;
/**
 * @summary List resource requests
 */
export declare const getListResourceRequestsUrl: (params?: ListResourceRequestsParams) => string;
export declare const listResourceRequests: (params?: ListResourceRequestsParams, options?: RequestInit) => Promise<ResourceRequest[]>;
export declare const getListResourceRequestsQueryKey: (params?: ListResourceRequestsParams) => readonly ["/api/resource-requests", ...ListResourceRequestsParams[]];
export declare const getListResourceRequestsQueryOptions: <TData = Awaited<ReturnType<typeof listResourceRequests>>, TError = ErrorType<unknown>>(params?: ListResourceRequestsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listResourceRequests>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listResourceRequests>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListResourceRequestsQueryResult = NonNullable<Awaited<ReturnType<typeof listResourceRequests>>>;
export type ListResourceRequestsQueryError = ErrorType<unknown>;
/**
 * @summary List resource requests
 */
export declare function useListResourceRequests<TData = Awaited<ReturnType<typeof listResourceRequests>>, TError = ErrorType<unknown>>(params?: ListResourceRequestsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listResourceRequests>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a resource request
 */
export declare const getCreateResourceRequestUrl: () => string;
export declare const createResourceRequest: (createResourceRequestBody: CreateResourceRequestBody, options?: RequestInit) => Promise<ResourceRequest>;
export declare const getCreateResourceRequestMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createResourceRequest>>, TError, {
        data: BodyType<CreateResourceRequestBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createResourceRequest>>, TError, {
    data: BodyType<CreateResourceRequestBody>;
}, TContext>;
export type CreateResourceRequestMutationResult = NonNullable<Awaited<ReturnType<typeof createResourceRequest>>>;
export type CreateResourceRequestMutationBody = BodyType<CreateResourceRequestBody>;
export type CreateResourceRequestMutationError = ErrorType<unknown>;
/**
 * @summary Create a resource request
 */
export declare const useCreateResourceRequest: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createResourceRequest>>, TError, {
        data: BodyType<CreateResourceRequestBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createResourceRequest>>, TError, {
    data: BodyType<CreateResourceRequestBody>;
}, TContext>;
/**
 * @summary Update a resource request
 */
export declare const getUpdateResourceRequestUrl: (id: number) => string;
export declare const updateResourceRequest: (id: number, updateResourceRequestBody: UpdateResourceRequestBody, options?: RequestInit) => Promise<ResourceRequest>;
export declare const getUpdateResourceRequestMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateResourceRequest>>, TError, {
        id: number;
        data: BodyType<UpdateResourceRequestBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateResourceRequest>>, TError, {
    id: number;
    data: BodyType<UpdateResourceRequestBody>;
}, TContext>;
export type UpdateResourceRequestMutationResult = NonNullable<Awaited<ReturnType<typeof updateResourceRequest>>>;
export type UpdateResourceRequestMutationBody = BodyType<UpdateResourceRequestBody>;
export type UpdateResourceRequestMutationError = ErrorType<unknown>;
/**
 * @summary Update a resource request
 */
export declare const useUpdateResourceRequest: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateResourceRequest>>, TError, {
        id: number;
        data: BodyType<UpdateResourceRequestBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateResourceRequest>>, TError, {
    id: number;
    data: BodyType<UpdateResourceRequestBody>;
}, TContext>;
/**
 * @summary Delete a resource request
 */
export declare const getDeleteResourceRequestUrl: (id: number) => string;
export declare const deleteResourceRequest: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteResourceRequestMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteResourceRequest>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteResourceRequest>>, TError, {
    id: number;
}, TContext>;
export type DeleteResourceRequestMutationResult = NonNullable<Awaited<ReturnType<typeof deleteResourceRequest>>>;
export type DeleteResourceRequestMutationError = ErrorType<unknown>;
/**
 * @summary Delete a resource request
 */
export declare const useDeleteResourceRequest: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteResourceRequest>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteResourceRequest>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Approve, reject, or fulfill a resource request
 */
export declare const getUpdateResourceRequestStatusUrl: (id: number) => string;
export declare const updateResourceRequestStatus: (id: number, updateResourceRequestStatusBody: UpdateResourceRequestStatusBody, options?: RequestInit) => Promise<ResourceRequest>;
export declare const getUpdateResourceRequestStatusMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateResourceRequestStatus>>, TError, {
        id: number;
        data: BodyType<UpdateResourceRequestStatusBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateResourceRequestStatus>>, TError, {
    id: number;
    data: BodyType<UpdateResourceRequestStatusBody>;
}, TContext>;
export type UpdateResourceRequestStatusMutationResult = NonNullable<Awaited<ReturnType<typeof updateResourceRequestStatus>>>;
export type UpdateResourceRequestStatusMutationBody = BodyType<UpdateResourceRequestStatusBody>;
export type UpdateResourceRequestStatusMutationError = ErrorType<unknown>;
/**
 * @summary Approve, reject, or fulfill a resource request
 */
export declare const useUpdateResourceRequestStatus: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateResourceRequestStatus>>, TError, {
        id: number;
        data: BodyType<UpdateResourceRequestStatusBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateResourceRequestStatus>>, TError, {
    id: number;
    data: BodyType<UpdateResourceRequestStatusBody>;
}, TContext>;
/**
 * @summary Budget vs actuals across all projects
 */
export declare const getGetBudgetVsActualsReportUrl: () => string;
export declare const getBudgetVsActualsReport: (options?: RequestInit) => Promise<BudgetVsActualsReport>;
export declare const getGetBudgetVsActualsReportQueryKey: () => readonly ["/api/reports/budget-vs-actuals"];
export declare const getGetBudgetVsActualsReportQueryOptions: <TData = Awaited<ReturnType<typeof getBudgetVsActualsReport>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBudgetVsActualsReport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getBudgetVsActualsReport>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetBudgetVsActualsReportQueryResult = NonNullable<Awaited<ReturnType<typeof getBudgetVsActualsReport>>>;
export type GetBudgetVsActualsReportQueryError = ErrorType<unknown>;
/**
 * @summary Budget vs actuals across all projects
 */
export declare function useGetBudgetVsActualsReport<TData = Awaited<ReturnType<typeof getBudgetVsActualsReport>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBudgetVsActualsReport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Burn-down data for a specific project
 */
export declare const getGetProjectBurnDownUrl: (projectId: number) => string;
export declare const getProjectBurnDown: (projectId: number, options?: RequestInit) => Promise<BurnDownReport>;
export declare const getGetProjectBurnDownQueryKey: (projectId: number) => readonly [`/api/reports/burn-down/${number}`];
export declare const getGetProjectBurnDownQueryOptions: <TData = Awaited<ReturnType<typeof getProjectBurnDown>>, TError = ErrorType<unknown>>(projectId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProjectBurnDown>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getProjectBurnDown>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetProjectBurnDownQueryResult = NonNullable<Awaited<ReturnType<typeof getProjectBurnDown>>>;
export type GetProjectBurnDownQueryError = ErrorType<unknown>;
/**
 * @summary Burn-down data for a specific project
 */
export declare function useGetProjectBurnDown<TData = Awaited<ReturnType<typeof getProjectBurnDown>>, TError = ErrorType<unknown>>(projectId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProjectBurnDown>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List project templates (with nested phases and tasks)
 */
export declare const getListProjectTemplatesUrl: () => string;
export declare const listProjectTemplates: (options?: RequestInit) => Promise<ProjectTemplate[]>;
export declare const getListProjectTemplatesQueryKey: () => readonly ["/api/project-templates"];
export declare const getListProjectTemplatesQueryOptions: <TData = Awaited<ReturnType<typeof listProjectTemplates>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProjectTemplates>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listProjectTemplates>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListProjectTemplatesQueryResult = NonNullable<Awaited<ReturnType<typeof listProjectTemplates>>>;
export type ListProjectTemplatesQueryError = ErrorType<unknown>;
/**
 * @summary List project templates (with nested phases and tasks)
 */
export declare function useListProjectTemplates<TData = Awaited<ReturnType<typeof listProjectTemplates>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProjectTemplates>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a project template
 */
export declare const getCreateProjectTemplateUrl: () => string;
export declare const createProjectTemplate: (createProjectTemplateBody: CreateProjectTemplateBody, options?: RequestInit) => Promise<ProjectTemplate>;
export declare const getCreateProjectTemplateMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProjectTemplate>>, TError, {
        data: BodyType<CreateProjectTemplateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createProjectTemplate>>, TError, {
    data: BodyType<CreateProjectTemplateBody>;
}, TContext>;
export type CreateProjectTemplateMutationResult = NonNullable<Awaited<ReturnType<typeof createProjectTemplate>>>;
export type CreateProjectTemplateMutationBody = BodyType<CreateProjectTemplateBody>;
export type CreateProjectTemplateMutationError = ErrorType<unknown>;
/**
 * @summary Create a project template
 */
export declare const useCreateProjectTemplate: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProjectTemplate>>, TError, {
        data: BodyType<CreateProjectTemplateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createProjectTemplate>>, TError, {
    data: BodyType<CreateProjectTemplateBody>;
}, TContext>;
/**
 * @summary Get a project template with phases and tasks
 */
export declare const getGetProjectTemplateUrl: (id: number) => string;
export declare const getProjectTemplate: (id: number, options?: RequestInit) => Promise<ProjectTemplate>;
export declare const getGetProjectTemplateQueryKey: (id: number) => readonly [`/api/project-templates/${number}`];
export declare const getGetProjectTemplateQueryOptions: <TData = Awaited<ReturnType<typeof getProjectTemplate>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProjectTemplate>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getProjectTemplate>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetProjectTemplateQueryResult = NonNullable<Awaited<ReturnType<typeof getProjectTemplate>>>;
export type GetProjectTemplateQueryError = ErrorType<unknown>;
/**
 * @summary Get a project template with phases and tasks
 */
export declare function useGetProjectTemplate<TData = Awaited<ReturnType<typeof getProjectTemplate>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProjectTemplate>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update a project template
 */
export declare const getUpdateProjectTemplateUrl: (id: number) => string;
export declare const updateProjectTemplate: (id: number, updateProjectTemplateBody: UpdateProjectTemplateBody, options?: RequestInit) => Promise<ProjectTemplate>;
export declare const getUpdateProjectTemplateMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProjectTemplate>>, TError, {
        id: number;
        data: BodyType<UpdateProjectTemplateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateProjectTemplate>>, TError, {
    id: number;
    data: BodyType<UpdateProjectTemplateBody>;
}, TContext>;
export type UpdateProjectTemplateMutationResult = NonNullable<Awaited<ReturnType<typeof updateProjectTemplate>>>;
export type UpdateProjectTemplateMutationBody = BodyType<UpdateProjectTemplateBody>;
export type UpdateProjectTemplateMutationError = ErrorType<unknown>;
/**
 * @summary Update a project template
 */
export declare const useUpdateProjectTemplate: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProjectTemplate>>, TError, {
        id: number;
        data: BodyType<UpdateProjectTemplateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateProjectTemplate>>, TError, {
    id: number;
    data: BodyType<UpdateProjectTemplateBody>;
}, TContext>;
/**
 * @summary Delete a project template (cascades phases and tasks)
 */
export declare const getDeleteProjectTemplateUrl: (id: number) => string;
export declare const deleteProjectTemplate: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteProjectTemplateMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProjectTemplate>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteProjectTemplate>>, TError, {
    id: number;
}, TContext>;
export type DeleteProjectTemplateMutationResult = NonNullable<Awaited<ReturnType<typeof deleteProjectTemplate>>>;
export type DeleteProjectTemplateMutationError = ErrorType<unknown>;
/**
 * @summary Delete a project template (cascades phases and tasks)
 */
export declare const useDeleteProjectTemplate: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProjectTemplate>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteProjectTemplate>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List phases for a template
 */
export declare const getListTemplatePhasesUrl: (id: number) => string;
export declare const listTemplatePhases: (id: number, options?: RequestInit) => Promise<TemplatePhase[]>;
export declare const getListTemplatePhasesQueryKey: (id: number) => readonly [`/api/project-templates/${number}/phases`];
export declare const getListTemplatePhasesQueryOptions: <TData = Awaited<ReturnType<typeof listTemplatePhases>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTemplatePhases>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTemplatePhases>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListTemplatePhasesQueryResult = NonNullable<Awaited<ReturnType<typeof listTemplatePhases>>>;
export type ListTemplatePhasesQueryError = ErrorType<unknown>;
/**
 * @summary List phases for a template
 */
export declare function useListTemplatePhases<TData = Awaited<ReturnType<typeof listTemplatePhases>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTemplatePhases>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Add a phase to a template
 */
export declare const getCreateTemplatePhaseUrl: (id: number) => string;
export declare const createTemplatePhase: (id: number, createTemplatePhaseBody: CreateTemplatePhaseBody, options?: RequestInit) => Promise<TemplatePhase>;
export declare const getCreateTemplatePhaseMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTemplatePhase>>, TError, {
        id: number;
        data: BodyType<CreateTemplatePhaseBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createTemplatePhase>>, TError, {
    id: number;
    data: BodyType<CreateTemplatePhaseBody>;
}, TContext>;
export type CreateTemplatePhaseMutationResult = NonNullable<Awaited<ReturnType<typeof createTemplatePhase>>>;
export type CreateTemplatePhaseMutationBody = BodyType<CreateTemplatePhaseBody>;
export type CreateTemplatePhaseMutationError = ErrorType<unknown>;
/**
 * @summary Add a phase to a template
 */
export declare const useCreateTemplatePhase: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTemplatePhase>>, TError, {
        id: number;
        data: BodyType<CreateTemplatePhaseBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createTemplatePhase>>, TError, {
    id: number;
    data: BodyType<CreateTemplatePhaseBody>;
}, TContext>;
/**
 * @summary Update a template phase
 */
export declare const getUpdateTemplatePhaseUrl: (phaseId: number) => string;
export declare const updateTemplatePhase: (phaseId: number, createTemplatePhaseBody: CreateTemplatePhaseBody, options?: RequestInit) => Promise<TemplatePhase>;
export declare const getUpdateTemplatePhaseMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTemplatePhase>>, TError, {
        phaseId: number;
        data: BodyType<CreateTemplatePhaseBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateTemplatePhase>>, TError, {
    phaseId: number;
    data: BodyType<CreateTemplatePhaseBody>;
}, TContext>;
export type UpdateTemplatePhaseMutationResult = NonNullable<Awaited<ReturnType<typeof updateTemplatePhase>>>;
export type UpdateTemplatePhaseMutationBody = BodyType<CreateTemplatePhaseBody>;
export type UpdateTemplatePhaseMutationError = ErrorType<unknown>;
/**
 * @summary Update a template phase
 */
export declare const useUpdateTemplatePhase: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTemplatePhase>>, TError, {
        phaseId: number;
        data: BodyType<CreateTemplatePhaseBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateTemplatePhase>>, TError, {
    phaseId: number;
    data: BodyType<CreateTemplatePhaseBody>;
}, TContext>;
/**
 * @summary Delete a template phase (cascades tasks)
 */
export declare const getDeleteTemplatePhaseUrl: (phaseId: number) => string;
export declare const deleteTemplatePhase: (phaseId: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteTemplatePhaseMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTemplatePhase>>, TError, {
        phaseId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteTemplatePhase>>, TError, {
    phaseId: number;
}, TContext>;
export type DeleteTemplatePhaseMutationResult = NonNullable<Awaited<ReturnType<typeof deleteTemplatePhase>>>;
export type DeleteTemplatePhaseMutationError = ErrorType<unknown>;
/**
 * @summary Delete a template phase (cascades tasks)
 */
export declare const useDeleteTemplatePhase: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTemplatePhase>>, TError, {
        phaseId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteTemplatePhase>>, TError, {
    phaseId: number;
}, TContext>;
/**
 * @summary List tasks for a template phase
 */
export declare const getListTemplateTasksForPhaseUrl: (phaseId: number) => string;
export declare const listTemplateTasksForPhase: (phaseId: number, options?: RequestInit) => Promise<TemplateTask[]>;
export declare const getListTemplateTasksForPhaseQueryKey: (phaseId: number) => readonly [`/api/template-phases/${number}/tasks`];
export declare const getListTemplateTasksForPhaseQueryOptions: <TData = Awaited<ReturnType<typeof listTemplateTasksForPhase>>, TError = ErrorType<unknown>>(phaseId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTemplateTasksForPhase>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTemplateTasksForPhase>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListTemplateTasksForPhaseQueryResult = NonNullable<Awaited<ReturnType<typeof listTemplateTasksForPhase>>>;
export type ListTemplateTasksForPhaseQueryError = ErrorType<unknown>;
/**
 * @summary List tasks for a template phase
 */
export declare function useListTemplateTasksForPhase<TData = Awaited<ReturnType<typeof listTemplateTasksForPhase>>, TError = ErrorType<unknown>>(phaseId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTemplateTasksForPhase>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Add a task to a template phase
 */
export declare const getCreateTemplateTaskUrl: (phaseId: number) => string;
export declare const createTemplateTask: (phaseId: number, createTemplateTaskBody: CreateTemplateTaskBody, options?: RequestInit) => Promise<TemplateTask>;
export declare const getCreateTemplateTaskMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTemplateTask>>, TError, {
        phaseId: number;
        data: BodyType<CreateTemplateTaskBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createTemplateTask>>, TError, {
    phaseId: number;
    data: BodyType<CreateTemplateTaskBody>;
}, TContext>;
export type CreateTemplateTaskMutationResult = NonNullable<Awaited<ReturnType<typeof createTemplateTask>>>;
export type CreateTemplateTaskMutationBody = BodyType<CreateTemplateTaskBody>;
export type CreateTemplateTaskMutationError = ErrorType<unknown>;
/**
 * @summary Add a task to a template phase
 */
export declare const useCreateTemplateTask: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTemplateTask>>, TError, {
        phaseId: number;
        data: BodyType<CreateTemplateTaskBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createTemplateTask>>, TError, {
    phaseId: number;
    data: BodyType<CreateTemplateTaskBody>;
}, TContext>;
/**
 * @summary Update a template task
 */
export declare const getUpdateTemplateTaskUrl: (taskId: number) => string;
export declare const updateTemplateTask: (taskId: number, createTemplateTaskBody: CreateTemplateTaskBody, options?: RequestInit) => Promise<TemplateTask>;
export declare const getUpdateTemplateTaskMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTemplateTask>>, TError, {
        taskId: number;
        data: BodyType<CreateTemplateTaskBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateTemplateTask>>, TError, {
    taskId: number;
    data: BodyType<CreateTemplateTaskBody>;
}, TContext>;
export type UpdateTemplateTaskMutationResult = NonNullable<Awaited<ReturnType<typeof updateTemplateTask>>>;
export type UpdateTemplateTaskMutationBody = BodyType<CreateTemplateTaskBody>;
export type UpdateTemplateTaskMutationError = ErrorType<unknown>;
/**
 * @summary Update a template task
 */
export declare const useUpdateTemplateTask: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTemplateTask>>, TError, {
        taskId: number;
        data: BodyType<CreateTemplateTaskBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateTemplateTask>>, TError, {
    taskId: number;
    data: BodyType<CreateTemplateTaskBody>;
}, TContext>;
/**
 * @summary Delete a template task
 */
export declare const getDeleteTemplateTaskUrl: (taskId: number) => string;
export declare const deleteTemplateTask: (taskId: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteTemplateTaskMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTemplateTask>>, TError, {
        taskId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteTemplateTask>>, TError, {
    taskId: number;
}, TContext>;
export type DeleteTemplateTaskMutationResult = NonNullable<Awaited<ReturnType<typeof deleteTemplateTask>>>;
export type DeleteTemplateTaskMutationError = ErrorType<unknown>;
/**
 * @summary Delete a template task
 */
export declare const useDeleteTemplateTask: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTemplateTask>>, TError, {
        taskId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteTemplateTask>>, TError, {
    taskId: number;
}, TContext>;
/**
 * @summary List allocations for a template
 */
export declare const getListTemplateAllocationsUrl: (id: number) => string;
export declare const listTemplateAllocations: (id: number, options?: RequestInit) => Promise<TemplateAllocation[]>;
export declare const getListTemplateAllocationsQueryKey: (id: number) => readonly [`/api/project-templates/${number}/allocations`];
export declare const getListTemplateAllocationsQueryOptions: <TData = Awaited<ReturnType<typeof listTemplateAllocations>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTemplateAllocations>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTemplateAllocations>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListTemplateAllocationsQueryResult = NonNullable<Awaited<ReturnType<typeof listTemplateAllocations>>>;
export type ListTemplateAllocationsQueryError = ErrorType<unknown>;
/**
 * @summary List allocations for a template
 */
export declare function useListTemplateAllocations<TData = Awaited<ReturnType<typeof listTemplateAllocations>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTemplateAllocations>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Add a resource allocation to a template (relative-day)
 */
export declare const getCreateTemplateAllocationUrl: (id: number) => string;
export declare const createTemplateAllocation: (id: number, createTemplateAllocationBody: CreateTemplateAllocationBody, options?: RequestInit) => Promise<TemplateAllocation>;
export declare const getCreateTemplateAllocationMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTemplateAllocation>>, TError, {
        id: number;
        data: BodyType<CreateTemplateAllocationBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createTemplateAllocation>>, TError, {
    id: number;
    data: BodyType<CreateTemplateAllocationBody>;
}, TContext>;
export type CreateTemplateAllocationMutationResult = NonNullable<Awaited<ReturnType<typeof createTemplateAllocation>>>;
export type CreateTemplateAllocationMutationBody = BodyType<CreateTemplateAllocationBody>;
export type CreateTemplateAllocationMutationError = ErrorType<unknown>;
/**
 * @summary Add a resource allocation to a template (relative-day)
 */
export declare const useCreateTemplateAllocation: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTemplateAllocation>>, TError, {
        id: number;
        data: BodyType<CreateTemplateAllocationBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createTemplateAllocation>>, TError, {
    id: number;
    data: BodyType<CreateTemplateAllocationBody>;
}, TContext>;
/**
 * @summary Update a template allocation
 */
export declare const getUpdateTemplateAllocationUrl: (allocId: number) => string;
export declare const updateTemplateAllocation: (allocId: number, updateTemplateAllocationBody: UpdateTemplateAllocationBody, options?: RequestInit) => Promise<TemplateAllocation>;
export declare const getUpdateTemplateAllocationMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTemplateAllocation>>, TError, {
        allocId: number;
        data: BodyType<UpdateTemplateAllocationBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateTemplateAllocation>>, TError, {
    allocId: number;
    data: BodyType<UpdateTemplateAllocationBody>;
}, TContext>;
export type UpdateTemplateAllocationMutationResult = NonNullable<Awaited<ReturnType<typeof updateTemplateAllocation>>>;
export type UpdateTemplateAllocationMutationBody = BodyType<UpdateTemplateAllocationBody>;
export type UpdateTemplateAllocationMutationError = ErrorType<unknown>;
/**
 * @summary Update a template allocation
 */
export declare const useUpdateTemplateAllocation: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTemplateAllocation>>, TError, {
        allocId: number;
        data: BodyType<UpdateTemplateAllocationBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateTemplateAllocation>>, TError, {
    allocId: number;
    data: BodyType<UpdateTemplateAllocationBody>;
}, TContext>;
/**
 * @summary Delete a template allocation
 */
export declare const getDeleteTemplateAllocationUrl: (allocId: number) => string;
export declare const deleteTemplateAllocation: (allocId: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteTemplateAllocationMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTemplateAllocation>>, TError, {
        allocId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteTemplateAllocation>>, TError, {
    allocId: number;
}, TContext>;
export type DeleteTemplateAllocationMutationResult = NonNullable<Awaited<ReturnType<typeof deleteTemplateAllocation>>>;
export type DeleteTemplateAllocationMutationError = ErrorType<unknown>;
/**
 * @summary Delete a template allocation
 */
export declare const useDeleteTemplateAllocation: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTemplateAllocation>>, TError, {
        allocId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteTemplateAllocation>>, TError, {
    allocId: number;
}, TContext>;
/**
 * @summary Aggregate template allocation totals (per role + grand totals)
 */
export declare const getGetTemplateAllocationsSummaryUrl: (id: number) => string;
export declare const getTemplateAllocationsSummary: (id: number, options?: RequestInit) => Promise<TemplateAllocationsSummary>;
export declare const getGetTemplateAllocationsSummaryQueryKey: (id: number) => readonly [`/api/project-templates/${number}/allocations/summary`];
export declare const getGetTemplateAllocationsSummaryQueryOptions: <TData = Awaited<ReturnType<typeof getTemplateAllocationsSummary>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTemplateAllocationsSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getTemplateAllocationsSummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetTemplateAllocationsSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getTemplateAllocationsSummary>>>;
export type GetTemplateAllocationsSummaryQueryError = ErrorType<unknown>;
/**
 * @summary Aggregate template allocation totals (per role + grand totals)
 */
export declare function useGetTemplateAllocationsSummary<TData = Awaited<ReturnType<typeof getTemplateAllocationsSummary>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTemplateAllocationsSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Apply a template to an existing project (supports multi-template composition)
 */
export declare const getApplyTemplateToProjectUrl: (id: number) => string;
export declare const applyTemplateToProject: (id: number, applyTemplateBody: ApplyTemplateBody, options?: RequestInit) => Promise<ApplyTemplateResult>;
export declare const getApplyTemplateToProjectMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof applyTemplateToProject>>, TError, {
        id: number;
        data: BodyType<ApplyTemplateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof applyTemplateToProject>>, TError, {
    id: number;
    data: BodyType<ApplyTemplateBody>;
}, TContext>;
export type ApplyTemplateToProjectMutationResult = NonNullable<Awaited<ReturnType<typeof applyTemplateToProject>>>;
export type ApplyTemplateToProjectMutationBody = BodyType<ApplyTemplateBody>;
export type ApplyTemplateToProjectMutationError = ErrorType<unknown>;
/**
 * @summary Apply a template to an existing project (supports multi-template composition)
 */
export declare const useApplyTemplateToProject: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof applyTemplateToProject>>, TError, {
        id: number;
        data: BodyType<ApplyTemplateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof applyTemplateToProject>>, TError, {
    id: number;
    data: BodyType<ApplyTemplateBody>;
}, TContext>;
/**
 * @summary Create a new project from a template
 */
export declare const getCreateProjectFromTemplateUrl: () => string;
export declare const createProjectFromTemplate: (createProjectFromTemplateBody: CreateProjectFromTemplateBody, options?: RequestInit) => Promise<Project>;
export declare const getCreateProjectFromTemplateMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProjectFromTemplate>>, TError, {
        data: BodyType<CreateProjectFromTemplateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createProjectFromTemplate>>, TError, {
    data: BodyType<CreateProjectFromTemplateBody>;
}, TContext>;
export type CreateProjectFromTemplateMutationResult = NonNullable<Awaited<ReturnType<typeof createProjectFromTemplate>>>;
export type CreateProjectFromTemplateMutationBody = BodyType<CreateProjectFromTemplateBody>;
export type CreateProjectFromTemplateMutationError = ErrorType<unknown>;
/**
 * @summary Create a new project from a template
 */
export declare const useCreateProjectFromTemplate: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProjectFromTemplate>>, TError, {
        data: BodyType<CreateProjectFromTemplateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createProjectFromTemplate>>, TError, {
    data: BodyType<CreateProjectFromTemplateBody>;
}, TContext>;
/**
 * @summary Apply a template to a project as a single segment (one phase task with all template tasks nested under it).
 */
export declare const getApplyTemplateAsSegmentUrl: (id: number) => string;
export declare const applyTemplateAsSegment: (id: number, applyTemplateAsSegmentBody: ApplyTemplateAsSegmentBody, options?: RequestInit) => Promise<ApplyTemplateAsSegmentResult>;
export declare const getApplyTemplateAsSegmentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof applyTemplateAsSegment>>, TError, {
        id: number;
        data: BodyType<ApplyTemplateAsSegmentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof applyTemplateAsSegment>>, TError, {
    id: number;
    data: BodyType<ApplyTemplateAsSegmentBody>;
}, TContext>;
export type ApplyTemplateAsSegmentMutationResult = NonNullable<Awaited<ReturnType<typeof applyTemplateAsSegment>>>;
export type ApplyTemplateAsSegmentMutationBody = BodyType<ApplyTemplateAsSegmentBody>;
export type ApplyTemplateAsSegmentMutationError = ErrorType<unknown>;
/**
 * @summary Apply a template to a project as a single segment (one phase task with all template tasks nested under it).
 */
export declare const useApplyTemplateAsSegment: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof applyTemplateAsSegment>>, TError, {
        id: number;
        data: BodyType<ApplyTemplateAsSegmentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof applyTemplateAsSegment>>, TError, {
    id: number;
    data: BodyType<ApplyTemplateAsSegmentBody>;
}, TContext>;
/**
 * @summary List CSAT responses
 */
export declare const getListCsatResponsesUrl: (params?: ListCsatResponsesParams) => string;
export declare const listCsatResponses: (params?: ListCsatResponsesParams, options?: RequestInit) => Promise<CsatResponse[]>;
export declare const getListCsatResponsesQueryKey: (params?: ListCsatResponsesParams) => readonly ["/api/csat-responses", ...ListCsatResponsesParams[]];
export declare const getListCsatResponsesQueryOptions: <TData = Awaited<ReturnType<typeof listCsatResponses>>, TError = ErrorType<unknown>>(params?: ListCsatResponsesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCsatResponses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listCsatResponses>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListCsatResponsesQueryResult = NonNullable<Awaited<ReturnType<typeof listCsatResponses>>>;
export type ListCsatResponsesQueryError = ErrorType<unknown>;
/**
 * @summary List CSAT responses
 */
export declare function useListCsatResponses<TData = Awaited<ReturnType<typeof listCsatResponses>>, TError = ErrorType<unknown>>(params?: ListCsatResponsesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCsatResponses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Submit a CSAT response
 */
export declare const getCreateCsatResponseUrl: () => string;
export declare const createCsatResponse: (createCsatResponseBody: CreateCsatResponseBody, options?: RequestInit) => Promise<CsatResponse>;
export declare const getCreateCsatResponseMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCsatResponse>>, TError, {
        data: BodyType<CreateCsatResponseBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createCsatResponse>>, TError, {
    data: BodyType<CreateCsatResponseBody>;
}, TContext>;
export type CreateCsatResponseMutationResult = NonNullable<Awaited<ReturnType<typeof createCsatResponse>>>;
export type CreateCsatResponseMutationBody = BodyType<CreateCsatResponseBody>;
export type CreateCsatResponseMutationError = ErrorType<unknown>;
/**
 * @summary Submit a CSAT response
 */
export declare const useCreateCsatResponse: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCsatResponse>>, TError, {
        data: BodyType<CreateCsatResponseBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createCsatResponse>>, TError, {
    data: BodyType<CreateCsatResponseBody>;
}, TContext>;
/**
 * @summary Get CSAT summary for a project
 */
export declare const getGetProjectCsatSummaryUrl: (id: number) => string;
export declare const getProjectCsatSummary: (id: number, options?: RequestInit) => Promise<CsatSummary>;
export declare const getGetProjectCsatSummaryQueryKey: (id: number) => readonly [`/api/projects/${number}/csat-summary`];
export declare const getGetProjectCsatSummaryQueryOptions: <TData = Awaited<ReturnType<typeof getProjectCsatSummary>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProjectCsatSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getProjectCsatSummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetProjectCsatSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getProjectCsatSummary>>>;
export type GetProjectCsatSummaryQueryError = ErrorType<unknown>;
/**
 * @summary Get CSAT summary for a project
 */
export declare function useGetProjectCsatSummary<TData = Awaited<ReturnType<typeof getProjectCsatSummary>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProjectCsatSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List billing schedules
 */
export declare const getListBillingSchedulesUrl: (params?: ListBillingSchedulesParams) => string;
export declare const listBillingSchedules: (params?: ListBillingSchedulesParams, options?: RequestInit) => Promise<BillingSchedule[]>;
export declare const getListBillingSchedulesQueryKey: (params?: ListBillingSchedulesParams) => readonly ["/api/billing-schedules", ...ListBillingSchedulesParams[]];
export declare const getListBillingSchedulesQueryOptions: <TData = Awaited<ReturnType<typeof listBillingSchedules>>, TError = ErrorType<unknown>>(params?: ListBillingSchedulesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBillingSchedules>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listBillingSchedules>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListBillingSchedulesQueryResult = NonNullable<Awaited<ReturnType<typeof listBillingSchedules>>>;
export type ListBillingSchedulesQueryError = ErrorType<unknown>;
/**
 * @summary List billing schedules
 */
export declare function useListBillingSchedules<TData = Awaited<ReturnType<typeof listBillingSchedules>>, TError = ErrorType<unknown>>(params?: ListBillingSchedulesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBillingSchedules>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a billing schedule
 */
export declare const getCreateBillingScheduleUrl: () => string;
export declare const createBillingSchedule: (createBillingScheduleBody: CreateBillingScheduleBody, options?: RequestInit) => Promise<BillingSchedule>;
export declare const getCreateBillingScheduleMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBillingSchedule>>, TError, {
        data: BodyType<CreateBillingScheduleBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createBillingSchedule>>, TError, {
    data: BodyType<CreateBillingScheduleBody>;
}, TContext>;
export type CreateBillingScheduleMutationResult = NonNullable<Awaited<ReturnType<typeof createBillingSchedule>>>;
export type CreateBillingScheduleMutationBody = BodyType<CreateBillingScheduleBody>;
export type CreateBillingScheduleMutationError = ErrorType<unknown>;
/**
 * @summary Create a billing schedule
 */
export declare const useCreateBillingSchedule: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBillingSchedule>>, TError, {
        data: BodyType<CreateBillingScheduleBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createBillingSchedule>>, TError, {
    data: BodyType<CreateBillingScheduleBody>;
}, TContext>;
/**
 * @summary Get a billing schedule
 */
export declare const getGetBillingScheduleUrl: (id: number) => string;
export declare const getBillingSchedule: (id: number, options?: RequestInit) => Promise<BillingSchedule>;
export declare const getGetBillingScheduleQueryKey: (id: number) => readonly [`/api/billing-schedules/${number}`];
export declare const getGetBillingScheduleQueryOptions: <TData = Awaited<ReturnType<typeof getBillingSchedule>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBillingSchedule>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getBillingSchedule>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetBillingScheduleQueryResult = NonNullable<Awaited<ReturnType<typeof getBillingSchedule>>>;
export type GetBillingScheduleQueryError = ErrorType<unknown>;
/**
 * @summary Get a billing schedule
 */
export declare function useGetBillingSchedule<TData = Awaited<ReturnType<typeof getBillingSchedule>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBillingSchedule>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update a billing schedule
 */
export declare const getUpdateBillingScheduleUrl: (id: number) => string;
export declare const updateBillingSchedule: (id: number, updateBillingScheduleBody: UpdateBillingScheduleBody, options?: RequestInit) => Promise<BillingSchedule>;
export declare const getUpdateBillingScheduleMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateBillingSchedule>>, TError, {
        id: number;
        data: BodyType<UpdateBillingScheduleBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateBillingSchedule>>, TError, {
    id: number;
    data: BodyType<UpdateBillingScheduleBody>;
}, TContext>;
export type UpdateBillingScheduleMutationResult = NonNullable<Awaited<ReturnType<typeof updateBillingSchedule>>>;
export type UpdateBillingScheduleMutationBody = BodyType<UpdateBillingScheduleBody>;
export type UpdateBillingScheduleMutationError = ErrorType<unknown>;
/**
 * @summary Update a billing schedule
 */
export declare const useUpdateBillingSchedule: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateBillingSchedule>>, TError, {
        id: number;
        data: BodyType<UpdateBillingScheduleBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateBillingSchedule>>, TError, {
    id: number;
    data: BodyType<UpdateBillingScheduleBody>;
}, TContext>;
/**
 * @summary Delete a billing schedule
 */
export declare const getDeleteBillingScheduleUrl: (id: number) => string;
export declare const deleteBillingSchedule: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteBillingScheduleMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteBillingSchedule>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteBillingSchedule>>, TError, {
    id: number;
}, TContext>;
export type DeleteBillingScheduleMutationResult = NonNullable<Awaited<ReturnType<typeof deleteBillingSchedule>>>;
export type DeleteBillingScheduleMutationError = ErrorType<unknown>;
/**
 * @summary Delete a billing schedule
 */
export declare const useDeleteBillingSchedule: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteBillingSchedule>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteBillingSchedule>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Manually trigger a billing schedule
 */
export declare const getTriggerBillingScheduleUrl: (id: number) => string;
export declare const triggerBillingSchedule: (id: number, options?: RequestInit) => Promise<TriggerBillingScheduleResponse>;
export declare const getTriggerBillingScheduleMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof triggerBillingSchedule>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof triggerBillingSchedule>>, TError, {
    id: number;
}, TContext>;
export type TriggerBillingScheduleMutationResult = NonNullable<Awaited<ReturnType<typeof triggerBillingSchedule>>>;
export type TriggerBillingScheduleMutationError = ErrorType<unknown>;
/**
 * @summary Manually trigger a billing schedule
 */
export declare const useTriggerBillingSchedule: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof triggerBillingSchedule>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof triggerBillingSchedule>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List revenue entries
 */
export declare const getListRevenueEntriesUrl: (params?: ListRevenueEntriesParams) => string;
export declare const listRevenueEntries: (params?: ListRevenueEntriesParams, options?: RequestInit) => Promise<RevenueEntry[]>;
export declare const getListRevenueEntriesQueryKey: (params?: ListRevenueEntriesParams) => readonly ["/api/revenue-entries", ...ListRevenueEntriesParams[]];
export declare const getListRevenueEntriesQueryOptions: <TData = Awaited<ReturnType<typeof listRevenueEntries>>, TError = ErrorType<unknown>>(params?: ListRevenueEntriesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listRevenueEntries>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listRevenueEntries>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListRevenueEntriesQueryResult = NonNullable<Awaited<ReturnType<typeof listRevenueEntries>>>;
export type ListRevenueEntriesQueryError = ErrorType<unknown>;
/**
 * @summary List revenue entries
 */
export declare function useListRevenueEntries<TData = Awaited<ReturnType<typeof listRevenueEntries>>, TError = ErrorType<unknown>>(params?: ListRevenueEntriesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listRevenueEntries>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a revenue entry
 */
export declare const getCreateRevenueEntryUrl: () => string;
export declare const createRevenueEntry: (createRevenueEntryBody: CreateRevenueEntryBody, options?: RequestInit) => Promise<RevenueEntry>;
export declare const getCreateRevenueEntryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createRevenueEntry>>, TError, {
        data: BodyType<CreateRevenueEntryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createRevenueEntry>>, TError, {
    data: BodyType<CreateRevenueEntryBody>;
}, TContext>;
export type CreateRevenueEntryMutationResult = NonNullable<Awaited<ReturnType<typeof createRevenueEntry>>>;
export type CreateRevenueEntryMutationBody = BodyType<CreateRevenueEntryBody>;
export type CreateRevenueEntryMutationError = ErrorType<unknown>;
/**
 * @summary Create a revenue entry
 */
export declare const useCreateRevenueEntry: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createRevenueEntry>>, TError, {
        data: BodyType<CreateRevenueEntryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createRevenueEntry>>, TError, {
    data: BodyType<CreateRevenueEntryBody>;
}, TContext>;
/**
 * @summary Delete a revenue entry
 */
export declare const getDeleteRevenueEntryUrl: (id: number) => string;
export declare const deleteRevenueEntry: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteRevenueEntryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteRevenueEntry>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteRevenueEntry>>, TError, {
    id: number;
}, TContext>;
export type DeleteRevenueEntryMutationResult = NonNullable<Awaited<ReturnType<typeof deleteRevenueEntry>>>;
export type DeleteRevenueEntryMutationError = ErrorType<unknown>;
/**
 * @summary Delete a revenue entry
 */
export declare const useDeleteRevenueEntry: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteRevenueEntry>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteRevenueEntry>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Revenue recognition by period
 */
export declare const getGetRevenueByPeriodReportUrl: () => string;
export declare const getRevenueByPeriodReport: (options?: RequestInit) => Promise<RevenueByPeriodReport>;
export declare const getGetRevenueByPeriodReportQueryKey: () => readonly ["/api/reports/revenue-by-period"];
export declare const getGetRevenueByPeriodReportQueryOptions: <TData = Awaited<ReturnType<typeof getRevenueByPeriodReport>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRevenueByPeriodReport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRevenueByPeriodReport>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRevenueByPeriodReportQueryResult = NonNullable<Awaited<ReturnType<typeof getRevenueByPeriodReport>>>;
export type GetRevenueByPeriodReportQueryError = ErrorType<unknown>;
/**
 * @summary Revenue recognition by period
 */
export declare function useGetRevenueByPeriodReport<TData = Awaited<ReturnType<typeof getRevenueByPeriodReport>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRevenueByPeriodReport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List time-off requests
 */
export declare const getListTimeOffRequestsUrl: (params?: ListTimeOffRequestsParams) => string;
export declare const listTimeOffRequests: (params?: ListTimeOffRequestsParams, options?: RequestInit) => Promise<TimeOffRequest[]>;
export declare const getListTimeOffRequestsQueryKey: (params?: ListTimeOffRequestsParams) => readonly ["/api/time-off-requests", ...ListTimeOffRequestsParams[]];
export declare const getListTimeOffRequestsQueryOptions: <TData = Awaited<ReturnType<typeof listTimeOffRequests>>, TError = ErrorType<unknown>>(params?: ListTimeOffRequestsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTimeOffRequests>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTimeOffRequests>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListTimeOffRequestsQueryResult = NonNullable<Awaited<ReturnType<typeof listTimeOffRequests>>>;
export type ListTimeOffRequestsQueryError = ErrorType<unknown>;
/**
 * @summary List time-off requests
 */
export declare function useListTimeOffRequests<TData = Awaited<ReturnType<typeof listTimeOffRequests>>, TError = ErrorType<unknown>>(params?: ListTimeOffRequestsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTimeOffRequests>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a time-off request
 */
export declare const getCreateTimeOffRequestUrl: () => string;
export declare const createTimeOffRequest: (createTimeOffRequestBody: CreateTimeOffRequestBody, options?: RequestInit) => Promise<TimeOffRequest>;
export declare const getCreateTimeOffRequestMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTimeOffRequest>>, TError, {
        data: BodyType<CreateTimeOffRequestBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createTimeOffRequest>>, TError, {
    data: BodyType<CreateTimeOffRequestBody>;
}, TContext>;
export type CreateTimeOffRequestMutationResult = NonNullable<Awaited<ReturnType<typeof createTimeOffRequest>>>;
export type CreateTimeOffRequestMutationBody = BodyType<CreateTimeOffRequestBody>;
export type CreateTimeOffRequestMutationError = ErrorType<unknown>;
/**
 * @summary Create a time-off request
 */
export declare const useCreateTimeOffRequest: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTimeOffRequest>>, TError, {
        data: BodyType<CreateTimeOffRequestBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createTimeOffRequest>>, TError, {
    data: BodyType<CreateTimeOffRequestBody>;
}, TContext>;
/**
 * @summary Update time-off request status
 */
export declare const getUpdateTimeOffRequestStatusUrl: (id: number) => string;
export declare const updateTimeOffRequestStatus: (id: number, updateTimeOffRequestStatusBody: UpdateTimeOffRequestStatusBody, options?: RequestInit) => Promise<TimeOffRequest>;
export declare const getUpdateTimeOffRequestStatusMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTimeOffRequestStatus>>, TError, {
        id: number;
        data: BodyType<UpdateTimeOffRequestStatusBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateTimeOffRequestStatus>>, TError, {
    id: number;
    data: BodyType<UpdateTimeOffRequestStatusBody>;
}, TContext>;
export type UpdateTimeOffRequestStatusMutationResult = NonNullable<Awaited<ReturnType<typeof updateTimeOffRequestStatus>>>;
export type UpdateTimeOffRequestStatusMutationBody = BodyType<UpdateTimeOffRequestStatusBody>;
export type UpdateTimeOffRequestStatusMutationError = ErrorType<unknown>;
/**
 * @summary Update time-off request status
 */
export declare const useUpdateTimeOffRequestStatus: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTimeOffRequestStatus>>, TError, {
        id: number;
        data: BodyType<UpdateTimeOffRequestStatusBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateTimeOffRequestStatus>>, TError, {
    id: number;
    data: BodyType<UpdateTimeOffRequestStatusBody>;
}, TContext>;
/**
 * @summary Delete a time-off request
 */
export declare const getDeleteTimeOffRequestUrl: (id: number) => string;
export declare const deleteTimeOffRequest: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteTimeOffRequestMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTimeOffRequest>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteTimeOffRequest>>, TError, {
    id: number;
}, TContext>;
export type DeleteTimeOffRequestMutationResult = NonNullable<Awaited<ReturnType<typeof deleteTimeOffRequest>>>;
export type DeleteTimeOffRequestMutationError = ErrorType<unknown>;
/**
 * @summary Delete a time-off request
 */
export declare const useDeleteTimeOffRequest: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTimeOffRequest>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteTimeOffRequest>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List skill categories
 */
export declare const getListSkillCategoriesUrl: () => string;
export declare const listSkillCategories: (options?: RequestInit) => Promise<SkillCategory[]>;
export declare const getListSkillCategoriesQueryKey: () => readonly ["/api/skill-categories"];
export declare const getListSkillCategoriesQueryOptions: <TData = Awaited<ReturnType<typeof listSkillCategories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSkillCategories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSkillCategories>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSkillCategoriesQueryResult = NonNullable<Awaited<ReturnType<typeof listSkillCategories>>>;
export type ListSkillCategoriesQueryError = ErrorType<unknown>;
/**
 * @summary List skill categories
 */
export declare function useListSkillCategories<TData = Awaited<ReturnType<typeof listSkillCategories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSkillCategories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a skill category
 */
export declare const getCreateSkillCategoryUrl: () => string;
export declare const createSkillCategory: (createSkillCategoryBody: CreateSkillCategoryBody, options?: RequestInit) => Promise<SkillCategory>;
export declare const getCreateSkillCategoryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSkillCategory>>, TError, {
        data: BodyType<CreateSkillCategoryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createSkillCategory>>, TError, {
    data: BodyType<CreateSkillCategoryBody>;
}, TContext>;
export type CreateSkillCategoryMutationResult = NonNullable<Awaited<ReturnType<typeof createSkillCategory>>>;
export type CreateSkillCategoryMutationBody = BodyType<CreateSkillCategoryBody>;
export type CreateSkillCategoryMutationError = ErrorType<unknown>;
/**
 * @summary Create a skill category
 */
export declare const useCreateSkillCategory: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSkillCategory>>, TError, {
        data: BodyType<CreateSkillCategoryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createSkillCategory>>, TError, {
    data: BodyType<CreateSkillCategoryBody>;
}, TContext>;
/**
 * @summary Delete a skill category
 */
export declare const getDeleteSkillCategoryUrl: (id: number) => string;
export declare const deleteSkillCategory: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteSkillCategoryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSkillCategory>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteSkillCategory>>, TError, {
    id: number;
}, TContext>;
export type DeleteSkillCategoryMutationResult = NonNullable<Awaited<ReturnType<typeof deleteSkillCategory>>>;
export type DeleteSkillCategoryMutationError = ErrorType<unknown>;
/**
 * @summary Delete a skill category
 */
export declare const useDeleteSkillCategory: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSkillCategory>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteSkillCategory>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List task status definitions (ordered by position)
 */
export declare const getListTaskStatusDefinitionsUrl: () => string;
export declare const listTaskStatusDefinitions: (options?: RequestInit) => Promise<TaskStatusDefinition[]>;
export declare const getListTaskStatusDefinitionsQueryKey: () => readonly ["/api/task-status-definitions"];
export declare const getListTaskStatusDefinitionsQueryOptions: <TData = Awaited<ReturnType<typeof listTaskStatusDefinitions>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTaskStatusDefinitions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTaskStatusDefinitions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListTaskStatusDefinitionsQueryResult = NonNullable<Awaited<ReturnType<typeof listTaskStatusDefinitions>>>;
export type ListTaskStatusDefinitionsQueryError = ErrorType<unknown>;
/**
 * @summary List task status definitions (ordered by position)
 */
export declare function useListTaskStatusDefinitions<TData = Awaited<ReturnType<typeof listTaskStatusDefinitions>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTaskStatusDefinitions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Reorder task status definitions
 */
export declare const getReorderTaskStatusDefinitionsUrl: () => string;
export declare const reorderTaskStatusDefinitions: (reorderTaskStatusDefinitionsBody: ReorderTaskStatusDefinitionsBody, options?: RequestInit) => Promise<TaskStatusDefinition[]>;
export declare const getReorderTaskStatusDefinitionsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof reorderTaskStatusDefinitions>>, TError, {
        data: BodyType<ReorderTaskStatusDefinitionsBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof reorderTaskStatusDefinitions>>, TError, {
    data: BodyType<ReorderTaskStatusDefinitionsBody>;
}, TContext>;
export type ReorderTaskStatusDefinitionsMutationResult = NonNullable<Awaited<ReturnType<typeof reorderTaskStatusDefinitions>>>;
export type ReorderTaskStatusDefinitionsMutationBody = BodyType<ReorderTaskStatusDefinitionsBody>;
export type ReorderTaskStatusDefinitionsMutationError = ErrorType<unknown>;
/**
 * @summary Reorder task status definitions
 */
export declare const useReorderTaskStatusDefinitions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof reorderTaskStatusDefinitions>>, TError, {
        data: BodyType<ReorderTaskStatusDefinitionsBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof reorderTaskStatusDefinitions>>, TError, {
    data: BodyType<ReorderTaskStatusDefinitionsBody>;
}, TContext>;
/**
 * @summary List project groups (ordered by sortOrder)
 */
export declare const getListProjectGroupsUrl: () => string;
export declare const listProjectGroups: (options?: RequestInit) => Promise<ProjectGroup[]>;
export declare const getListProjectGroupsQueryKey: () => readonly ["/api/project-groups"];
export declare const getListProjectGroupsQueryOptions: <TData = Awaited<ReturnType<typeof listProjectGroups>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProjectGroups>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listProjectGroups>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListProjectGroupsQueryResult = NonNullable<Awaited<ReturnType<typeof listProjectGroups>>>;
export type ListProjectGroupsQueryError = ErrorType<unknown>;
/**
 * @summary List project groups (ordered by sortOrder)
 */
export declare function useListProjectGroups<TData = Awaited<ReturnType<typeof listProjectGroups>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProjectGroups>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a project group
 */
export declare const getCreateProjectGroupUrl: () => string;
export declare const createProjectGroup: (createProjectGroupBody: CreateProjectGroupBody, options?: RequestInit) => Promise<ProjectGroup>;
export declare const getCreateProjectGroupMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProjectGroup>>, TError, {
        data: BodyType<CreateProjectGroupBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createProjectGroup>>, TError, {
    data: BodyType<CreateProjectGroupBody>;
}, TContext>;
export type CreateProjectGroupMutationResult = NonNullable<Awaited<ReturnType<typeof createProjectGroup>>>;
export type CreateProjectGroupMutationBody = BodyType<CreateProjectGroupBody>;
export type CreateProjectGroupMutationError = ErrorType<unknown>;
/**
 * @summary Create a project group
 */
export declare const useCreateProjectGroup: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProjectGroup>>, TError, {
        data: BodyType<CreateProjectGroupBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createProjectGroup>>, TError, {
    data: BodyType<CreateProjectGroupBody>;
}, TContext>;
/**
 * @summary Update (rename / reorder / recolor) a project group
 */
export declare const getUpdateProjectGroupUrl: (id: number) => string;
export declare const updateProjectGroup: (id: number, updateProjectGroupBody: UpdateProjectGroupBody, options?: RequestInit) => Promise<ProjectGroup>;
export declare const getUpdateProjectGroupMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProjectGroup>>, TError, {
        id: number;
        data: BodyType<UpdateProjectGroupBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateProjectGroup>>, TError, {
    id: number;
    data: BodyType<UpdateProjectGroupBody>;
}, TContext>;
export type UpdateProjectGroupMutationResult = NonNullable<Awaited<ReturnType<typeof updateProjectGroup>>>;
export type UpdateProjectGroupMutationBody = BodyType<UpdateProjectGroupBody>;
export type UpdateProjectGroupMutationError = ErrorType<unknown>;
/**
 * @summary Update (rename / reorder / recolor) a project group
 */
export declare const useUpdateProjectGroup: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProjectGroup>>, TError, {
        id: number;
        data: BodyType<UpdateProjectGroupBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateProjectGroup>>, TError, {
    id: number;
    data: BodyType<UpdateProjectGroupBody>;
}, TContext>;
/**
 * @summary Delete a project group (sets projectGroupId=null on affected projects)
 */
export declare const getDeleteProjectGroupUrl: (id: number) => string;
export declare const deleteProjectGroup: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteProjectGroupMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProjectGroup>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteProjectGroup>>, TError, {
    id: number;
}, TContext>;
export type DeleteProjectGroupMutationResult = NonNullable<Awaited<ReturnType<typeof deleteProjectGroup>>>;
export type DeleteProjectGroupMutationError = ErrorType<unknown>;
/**
 * @summary Delete a project group (sets projectGroupId=null on affected projects)
 */
export declare const useDeleteProjectGroup: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProjectGroup>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteProjectGroup>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List skills
 */
export declare const getListSkillsUrl: (params?: ListSkillsParams) => string;
export declare const listSkills: (params?: ListSkillsParams, options?: RequestInit) => Promise<Skill[]>;
export declare const getListSkillsQueryKey: (params?: ListSkillsParams) => readonly ["/api/skills", ...ListSkillsParams[]];
export declare const getListSkillsQueryOptions: <TData = Awaited<ReturnType<typeof listSkills>>, TError = ErrorType<unknown>>(params?: ListSkillsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSkills>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSkills>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSkillsQueryResult = NonNullable<Awaited<ReturnType<typeof listSkills>>>;
export type ListSkillsQueryError = ErrorType<unknown>;
/**
 * @summary List skills
 */
export declare function useListSkills<TData = Awaited<ReturnType<typeof listSkills>>, TError = ErrorType<unknown>>(params?: ListSkillsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSkills>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a skill
 */
export declare const getCreateSkillUrl: () => string;
export declare const createSkill: (createSkillBody: CreateSkillBody, options?: RequestInit) => Promise<Skill>;
export declare const getCreateSkillMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSkill>>, TError, {
        data: BodyType<CreateSkillBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createSkill>>, TError, {
    data: BodyType<CreateSkillBody>;
}, TContext>;
export type CreateSkillMutationResult = NonNullable<Awaited<ReturnType<typeof createSkill>>>;
export type CreateSkillMutationBody = BodyType<CreateSkillBody>;
export type CreateSkillMutationError = ErrorType<unknown>;
/**
 * @summary Create a skill
 */
export declare const useCreateSkill: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSkill>>, TError, {
        data: BodyType<CreateSkillBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createSkill>>, TError, {
    data: BodyType<CreateSkillBody>;
}, TContext>;
/**
 * @summary Delete a skill
 */
export declare const getDeleteSkillUrl: (id: number) => string;
export declare const deleteSkill: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteSkillMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSkill>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteSkill>>, TError, {
    id: number;
}, TContext>;
export type DeleteSkillMutationResult = NonNullable<Awaited<ReturnType<typeof deleteSkill>>>;
export type DeleteSkillMutationError = ErrorType<unknown>;
/**
 * @summary Delete a skill
 */
export declare const useDeleteSkill: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSkill>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteSkill>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Get user skills
 */
export declare const getGetUserSkillsUrl: (id: number) => string;
export declare const getUserSkills: (id: number, options?: RequestInit) => Promise<UserSkillWithDetails[]>;
export declare const getGetUserSkillsQueryKey: (id: number) => readonly [`/api/users/${number}/skills`];
export declare const getGetUserSkillsQueryOptions: <TData = Awaited<ReturnType<typeof getUserSkills>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUserSkills>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getUserSkills>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetUserSkillsQueryResult = NonNullable<Awaited<ReturnType<typeof getUserSkills>>>;
export type GetUserSkillsQueryError = ErrorType<unknown>;
/**
 * @summary Get user skills
 */
export declare function useGetUserSkills<TData = Awaited<ReturnType<typeof getUserSkills>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUserSkills>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Add skill to user
 */
export declare const getAddUserSkillUrl: (id: number) => string;
export declare const addUserSkill: (id: number, addUserSkillBody: AddUserSkillBody, options?: RequestInit) => Promise<UserSkillWithDetails>;
export declare const getAddUserSkillMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addUserSkill>>, TError, {
        id: number;
        data: BodyType<AddUserSkillBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof addUserSkill>>, TError, {
    id: number;
    data: BodyType<AddUserSkillBody>;
}, TContext>;
export type AddUserSkillMutationResult = NonNullable<Awaited<ReturnType<typeof addUserSkill>>>;
export type AddUserSkillMutationBody = BodyType<AddUserSkillBody>;
export type AddUserSkillMutationError = ErrorType<unknown>;
/**
 * @summary Add skill to user
 */
export declare const useAddUserSkill: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addUserSkill>>, TError, {
        id: number;
        data: BodyType<AddUserSkillBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof addUserSkill>>, TError, {
    id: number;
    data: BodyType<AddUserSkillBody>;
}, TContext>;
/**
 * @summary Remove skill from user
 */
export declare const getRemoveUserSkillUrl: (id: number, skillId: number) => string;
export declare const removeUserSkill: (id: number, skillId: number, options?: RequestInit) => Promise<void>;
export declare const getRemoveUserSkillMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof removeUserSkill>>, TError, {
        id: number;
        skillId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof removeUserSkill>>, TError, {
    id: number;
    skillId: number;
}, TContext>;
export type RemoveUserSkillMutationResult = NonNullable<Awaited<ReturnType<typeof removeUserSkill>>>;
export type RemoveUserSkillMutationError = ErrorType<unknown>;
/**
 * @summary Remove skill from user
 */
export declare const useRemoveUserSkill: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof removeUserSkill>>, TError, {
        id: number;
        skillId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof removeUserSkill>>, TError, {
    id: number;
    skillId: number;
}, TContext>;
/**
 * @summary List task comments
 */
export declare const getListTaskCommentsUrl: (id: number) => string;
export declare const listTaskComments: (id: number, options?: RequestInit) => Promise<TaskComment[]>;
export declare const getListTaskCommentsQueryKey: (id: number) => readonly [`/api/tasks/${number}/comments`];
export declare const getListTaskCommentsQueryOptions: <TData = Awaited<ReturnType<typeof listTaskComments>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTaskComments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTaskComments>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListTaskCommentsQueryResult = NonNullable<Awaited<ReturnType<typeof listTaskComments>>>;
export type ListTaskCommentsQueryError = ErrorType<unknown>;
/**
 * @summary List task comments
 */
export declare function useListTaskComments<TData = Awaited<ReturnType<typeof listTaskComments>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTaskComments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create task comment
 */
export declare const getCreateTaskCommentUrl: (id: number) => string;
export declare const createTaskComment: (id: number, createTaskCommentBody: CreateTaskCommentBody, options?: RequestInit) => Promise<TaskComment>;
export declare const getCreateTaskCommentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTaskComment>>, TError, {
        id: number;
        data: BodyType<CreateTaskCommentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createTaskComment>>, TError, {
    id: number;
    data: BodyType<CreateTaskCommentBody>;
}, TContext>;
export type CreateTaskCommentMutationResult = NonNullable<Awaited<ReturnType<typeof createTaskComment>>>;
export type CreateTaskCommentMutationBody = BodyType<CreateTaskCommentBody>;
export type CreateTaskCommentMutationError = ErrorType<unknown>;
/**
 * @summary Create task comment
 */
export declare const useCreateTaskComment: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTaskComment>>, TError, {
        id: number;
        data: BodyType<CreateTaskCommentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createTaskComment>>, TError, {
    id: number;
    data: BodyType<CreateTaskCommentBody>;
}, TContext>;
/**
 * @summary Delete task comment
 */
export declare const getDeleteTaskCommentUrl: (id: number, commentId: number) => string;
export declare const deleteTaskComment: (id: number, commentId: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteTaskCommentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTaskComment>>, TError, {
        id: number;
        commentId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteTaskComment>>, TError, {
    id: number;
    commentId: number;
}, TContext>;
export type DeleteTaskCommentMutationResult = NonNullable<Awaited<ReturnType<typeof deleteTaskComment>>>;
export type DeleteTaskCommentMutationError = ErrorType<unknown>;
/**
 * @summary Delete task comment
 */
export declare const useDeleteTaskComment: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTaskComment>>, TError, {
        id: number;
        commentId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteTaskComment>>, TError, {
    id: number;
    commentId: number;
}, TContext>;
/**
 * @summary List task notes
 */
export declare const getListTaskNotesUrl: (id: number) => string;
export declare const listTaskNotes: (id: number, options?: RequestInit) => Promise<TaskNote[]>;
export declare const getListTaskNotesQueryKey: (id: number) => readonly [`/api/tasks/${number}/notes`];
export declare const getListTaskNotesQueryOptions: <TData = Awaited<ReturnType<typeof listTaskNotes>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTaskNotes>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTaskNotes>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListTaskNotesQueryResult = NonNullable<Awaited<ReturnType<typeof listTaskNotes>>>;
export type ListTaskNotesQueryError = ErrorType<unknown>;
/**
 * @summary List task notes
 */
export declare function useListTaskNotes<TData = Awaited<ReturnType<typeof listTaskNotes>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTaskNotes>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Add a task note
 */
export declare const getCreateTaskNoteUrl: (id: number) => string;
export declare const createTaskNote: (id: number, createTaskNoteBody: CreateTaskNoteBody, options?: RequestInit) => Promise<TaskNote>;
export declare const getCreateTaskNoteMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTaskNote>>, TError, {
        id: number;
        data: BodyType<CreateTaskNoteBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createTaskNote>>, TError, {
    id: number;
    data: BodyType<CreateTaskNoteBody>;
}, TContext>;
export type CreateTaskNoteMutationResult = NonNullable<Awaited<ReturnType<typeof createTaskNote>>>;
export type CreateTaskNoteMutationBody = BodyType<CreateTaskNoteBody>;
export type CreateTaskNoteMutationError = ErrorType<unknown>;
/**
 * @summary Add a task note
 */
export declare const useCreateTaskNote: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTaskNote>>, TError, {
        id: number;
        data: BodyType<CreateTaskNoteBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createTaskNote>>, TError, {
    id: number;
    data: BodyType<CreateTaskNoteBody>;
}, TContext>;
/**
 * @summary Delete task note
 */
export declare const getDeleteTaskNoteUrl: (taskId: number, noteId: number) => string;
export declare const deleteTaskNote: (taskId: number, noteId: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteTaskNoteMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTaskNote>>, TError, {
        taskId: number;
        noteId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteTaskNote>>, TError, {
    taskId: number;
    noteId: number;
}, TContext>;
export type DeleteTaskNoteMutationResult = NonNullable<Awaited<ReturnType<typeof deleteTaskNote>>>;
export type DeleteTaskNoteMutationError = ErrorType<unknown>;
/**
 * @summary Delete task note
 */
export declare const useDeleteTaskNote: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTaskNote>>, TError, {
        taskId: number;
        noteId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteTaskNote>>, TError, {
    taskId: number;
    noteId: number;
}, TContext>;
/**
 * @summary List task checklist items
 */
export declare const getListTaskChecklistUrl: (id: number) => string;
export declare const listTaskChecklist: (id: number, options?: RequestInit) => Promise<TaskChecklistItem[]>;
export declare const getListTaskChecklistQueryKey: (id: number) => readonly [`/api/tasks/${number}/checklist`];
export declare const getListTaskChecklistQueryOptions: <TData = Awaited<ReturnType<typeof listTaskChecklist>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTaskChecklist>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTaskChecklist>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListTaskChecklistQueryResult = NonNullable<Awaited<ReturnType<typeof listTaskChecklist>>>;
export type ListTaskChecklistQueryError = ErrorType<unknown>;
/**
 * @summary List task checklist items
 */
export declare function useListTaskChecklist<TData = Awaited<ReturnType<typeof listTaskChecklist>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTaskChecklist>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Add checklist item
 */
export declare const getCreateTaskChecklistItemUrl: (id: number) => string;
export declare const createTaskChecklistItem: (id: number, createTaskChecklistItemBody: CreateTaskChecklistItemBody, options?: RequestInit) => Promise<TaskChecklistItem>;
export declare const getCreateTaskChecklistItemMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTaskChecklistItem>>, TError, {
        id: number;
        data: BodyType<CreateTaskChecklistItemBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createTaskChecklistItem>>, TError, {
    id: number;
    data: BodyType<CreateTaskChecklistItemBody>;
}, TContext>;
export type CreateTaskChecklistItemMutationResult = NonNullable<Awaited<ReturnType<typeof createTaskChecklistItem>>>;
export type CreateTaskChecklistItemMutationBody = BodyType<CreateTaskChecklistItemBody>;
export type CreateTaskChecklistItemMutationError = ErrorType<unknown>;
/**
 * @summary Add checklist item
 */
export declare const useCreateTaskChecklistItem: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTaskChecklistItem>>, TError, {
        id: number;
        data: BodyType<CreateTaskChecklistItemBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createTaskChecklistItem>>, TError, {
    id: number;
    data: BodyType<CreateTaskChecklistItemBody>;
}, TContext>;
/**
 * @summary Update checklist item
 */
export declare const getUpdateTaskChecklistItemUrl: (id: number, itemId: number) => string;
export declare const updateTaskChecklistItem: (id: number, itemId: number, updateTaskChecklistItemBody: UpdateTaskChecklistItemBody, options?: RequestInit) => Promise<TaskChecklistItem>;
export declare const getUpdateTaskChecklistItemMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTaskChecklistItem>>, TError, {
        id: number;
        itemId: number;
        data: BodyType<UpdateTaskChecklistItemBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateTaskChecklistItem>>, TError, {
    id: number;
    itemId: number;
    data: BodyType<UpdateTaskChecklistItemBody>;
}, TContext>;
export type UpdateTaskChecklistItemMutationResult = NonNullable<Awaited<ReturnType<typeof updateTaskChecklistItem>>>;
export type UpdateTaskChecklistItemMutationBody = BodyType<UpdateTaskChecklistItemBody>;
export type UpdateTaskChecklistItemMutationError = ErrorType<unknown>;
/**
 * @summary Update checklist item
 */
export declare const useUpdateTaskChecklistItem: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTaskChecklistItem>>, TError, {
        id: number;
        itemId: number;
        data: BodyType<UpdateTaskChecklistItemBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateTaskChecklistItem>>, TError, {
    id: number;
    itemId: number;
    data: BodyType<UpdateTaskChecklistItemBody>;
}, TContext>;
/**
 * @summary Delete checklist item
 */
export declare const getDeleteTaskChecklistItemUrl: (id: number, itemId: number) => string;
export declare const deleteTaskChecklistItem: (id: number, itemId: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteTaskChecklistItemMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTaskChecklistItem>>, TError, {
        id: number;
        itemId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteTaskChecklistItem>>, TError, {
    id: number;
    itemId: number;
}, TContext>;
export type DeleteTaskChecklistItemMutationResult = NonNullable<Awaited<ReturnType<typeof deleteTaskChecklistItem>>>;
export type DeleteTaskChecklistItemMutationError = ErrorType<unknown>;
/**
 * @summary Delete checklist item
 */
export declare const useDeleteTaskChecklistItem: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTaskChecklistItem>>, TError, {
        id: number;
        itemId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteTaskChecklistItem>>, TError, {
    id: number;
    itemId: number;
}, TContext>;
/**
 * @summary List tax codes
 */
export declare const getListTaxCodesUrl: () => string;
export declare const listTaxCodes: (options?: RequestInit) => Promise<TaxCode[]>;
export declare const getListTaxCodesQueryKey: () => readonly ["/api/tax-codes"];
export declare const getListTaxCodesQueryOptions: <TData = Awaited<ReturnType<typeof listTaxCodes>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTaxCodes>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTaxCodes>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListTaxCodesQueryResult = NonNullable<Awaited<ReturnType<typeof listTaxCodes>>>;
export type ListTaxCodesQueryError = ErrorType<unknown>;
/**
 * @summary List tax codes
 */
export declare function useListTaxCodes<TData = Awaited<ReturnType<typeof listTaxCodes>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTaxCodes>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create tax code
 */
export declare const getCreateTaxCodeUrl: () => string;
export declare const createTaxCode: (createTaxCodeBody: CreateTaxCodeBody, options?: RequestInit) => Promise<TaxCode>;
export declare const getCreateTaxCodeMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTaxCode>>, TError, {
        data: BodyType<CreateTaxCodeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createTaxCode>>, TError, {
    data: BodyType<CreateTaxCodeBody>;
}, TContext>;
export type CreateTaxCodeMutationResult = NonNullable<Awaited<ReturnType<typeof createTaxCode>>>;
export type CreateTaxCodeMutationBody = BodyType<CreateTaxCodeBody>;
export type CreateTaxCodeMutationError = ErrorType<unknown>;
/**
 * @summary Create tax code
 */
export declare const useCreateTaxCode: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTaxCode>>, TError, {
        data: BodyType<CreateTaxCodeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createTaxCode>>, TError, {
    data: BodyType<CreateTaxCodeBody>;
}, TContext>;
/**
 * @summary Update tax code
 */
export declare const getUpdateTaxCodeUrl: (id: number) => string;
export declare const updateTaxCode: (id: number, createTaxCodeBody: CreateTaxCodeBody, options?: RequestInit) => Promise<TaxCode>;
export declare const getUpdateTaxCodeMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTaxCode>>, TError, {
        id: number;
        data: BodyType<CreateTaxCodeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateTaxCode>>, TError, {
    id: number;
    data: BodyType<CreateTaxCodeBody>;
}, TContext>;
export type UpdateTaxCodeMutationResult = NonNullable<Awaited<ReturnType<typeof updateTaxCode>>>;
export type UpdateTaxCodeMutationBody = BodyType<CreateTaxCodeBody>;
export type UpdateTaxCodeMutationError = ErrorType<unknown>;
/**
 * @summary Update tax code
 */
export declare const useUpdateTaxCode: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTaxCode>>, TError, {
        id: number;
        data: BodyType<CreateTaxCodeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateTaxCode>>, TError, {
    id: number;
    data: BodyType<CreateTaxCodeBody>;
}, TContext>;
/**
 * @summary Delete tax code
 */
export declare const getDeleteTaxCodeUrl: (id: number) => string;
export declare const deleteTaxCode: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteTaxCodeMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTaxCode>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteTaxCode>>, TError, {
    id: number;
}, TContext>;
export type DeleteTaxCodeMutationResult = NonNullable<Awaited<ReturnType<typeof deleteTaxCode>>>;
export type DeleteTaxCodeMutationError = ErrorType<unknown>;
/**
 * @summary Delete tax code
 */
export declare const useDeleteTaxCode: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTaxCode>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteTaxCode>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List time categories
 */
export declare const getListTimeCategoriesUrl: () => string;
export declare const listTimeCategories: (options?: RequestInit) => Promise<TimeCategory[]>;
export declare const getListTimeCategoriesQueryKey: () => readonly ["/api/time-categories"];
export declare const getListTimeCategoriesQueryOptions: <TData = Awaited<ReturnType<typeof listTimeCategories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTimeCategories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTimeCategories>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListTimeCategoriesQueryResult = NonNullable<Awaited<ReturnType<typeof listTimeCategories>>>;
export type ListTimeCategoriesQueryError = ErrorType<unknown>;
/**
 * @summary List time categories
 */
export declare function useListTimeCategories<TData = Awaited<ReturnType<typeof listTimeCategories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTimeCategories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create time category
 */
export declare const getCreateTimeCategoryUrl: () => string;
export declare const createTimeCategory: (createTimeCategoryBody: CreateTimeCategoryBody, options?: RequestInit) => Promise<TimeCategory>;
export declare const getCreateTimeCategoryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTimeCategory>>, TError, {
        data: BodyType<CreateTimeCategoryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createTimeCategory>>, TError, {
    data: BodyType<CreateTimeCategoryBody>;
}, TContext>;
export type CreateTimeCategoryMutationResult = NonNullable<Awaited<ReturnType<typeof createTimeCategory>>>;
export type CreateTimeCategoryMutationBody = BodyType<CreateTimeCategoryBody>;
export type CreateTimeCategoryMutationError = ErrorType<unknown>;
/**
 * @summary Create time category
 */
export declare const useCreateTimeCategory: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTimeCategory>>, TError, {
        data: BodyType<CreateTimeCategoryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createTimeCategory>>, TError, {
    data: BodyType<CreateTimeCategoryBody>;
}, TContext>;
/**
 * @summary Update time category
 */
export declare const getUpdateTimeCategoryUrl: (id: number) => string;
export declare const updateTimeCategory: (id: number, createTimeCategoryBody: CreateTimeCategoryBody, options?: RequestInit) => Promise<TimeCategory>;
export declare const getUpdateTimeCategoryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTimeCategory>>, TError, {
        id: number;
        data: BodyType<CreateTimeCategoryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateTimeCategory>>, TError, {
    id: number;
    data: BodyType<CreateTimeCategoryBody>;
}, TContext>;
export type UpdateTimeCategoryMutationResult = NonNullable<Awaited<ReturnType<typeof updateTimeCategory>>>;
export type UpdateTimeCategoryMutationBody = BodyType<CreateTimeCategoryBody>;
export type UpdateTimeCategoryMutationError = ErrorType<unknown>;
/**
 * @summary Update time category
 */
export declare const useUpdateTimeCategory: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTimeCategory>>, TError, {
        id: number;
        data: BodyType<CreateTimeCategoryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateTimeCategory>>, TError, {
    id: number;
    data: BodyType<CreateTimeCategoryBody>;
}, TContext>;
/**
 * @summary Delete time category
 */
export declare const getDeleteTimeCategoryUrl: (id: number) => string;
export declare const deleteTimeCategory: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteTimeCategoryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTimeCategory>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteTimeCategory>>, TError, {
    id: number;
}, TContext>;
export type DeleteTimeCategoryMutationResult = NonNullable<Awaited<ReturnType<typeof deleteTimeCategory>>>;
export type DeleteTimeCategoryMutationError = ErrorType<unknown>;
/**
 * @summary Delete time category
 */
export declare const useDeleteTimeCategory: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTimeCategory>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteTimeCategory>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List holiday calendars
 */
export declare const getListHolidayCalendarsUrl: () => string;
export declare const listHolidayCalendars: (options?: RequestInit) => Promise<HolidayCalendar[]>;
export declare const getListHolidayCalendarsQueryKey: () => readonly ["/api/holiday-calendars"];
export declare const getListHolidayCalendarsQueryOptions: <TData = Awaited<ReturnType<typeof listHolidayCalendars>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listHolidayCalendars>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listHolidayCalendars>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListHolidayCalendarsQueryResult = NonNullable<Awaited<ReturnType<typeof listHolidayCalendars>>>;
export type ListHolidayCalendarsQueryError = ErrorType<unknown>;
/**
 * @summary List holiday calendars
 */
export declare function useListHolidayCalendars<TData = Awaited<ReturnType<typeof listHolidayCalendars>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listHolidayCalendars>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create holiday calendar
 */
export declare const getCreateHolidayCalendarUrl: () => string;
export declare const createHolidayCalendar: (createHolidayCalendarBody: CreateHolidayCalendarBody, options?: RequestInit) => Promise<HolidayCalendar>;
export declare const getCreateHolidayCalendarMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createHolidayCalendar>>, TError, {
        data: BodyType<CreateHolidayCalendarBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createHolidayCalendar>>, TError, {
    data: BodyType<CreateHolidayCalendarBody>;
}, TContext>;
export type CreateHolidayCalendarMutationResult = NonNullable<Awaited<ReturnType<typeof createHolidayCalendar>>>;
export type CreateHolidayCalendarMutationBody = BodyType<CreateHolidayCalendarBody>;
export type CreateHolidayCalendarMutationError = ErrorType<unknown>;
/**
 * @summary Create holiday calendar
 */
export declare const useCreateHolidayCalendar: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createHolidayCalendar>>, TError, {
        data: BodyType<CreateHolidayCalendarBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createHolidayCalendar>>, TError, {
    data: BodyType<CreateHolidayCalendarBody>;
}, TContext>;
/**
 * @summary Delete holiday calendar
 */
export declare const getDeleteHolidayCalendarUrl: (id: number) => string;
export declare const deleteHolidayCalendar: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteHolidayCalendarMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteHolidayCalendar>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteHolidayCalendar>>, TError, {
    id: number;
}, TContext>;
export type DeleteHolidayCalendarMutationResult = NonNullable<Awaited<ReturnType<typeof deleteHolidayCalendar>>>;
export type DeleteHolidayCalendarMutationError = ErrorType<unknown>;
/**
 * @summary Delete holiday calendar
 */
export declare const useDeleteHolidayCalendar: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteHolidayCalendar>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteHolidayCalendar>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List dates for a calendar
 */
export declare const getListHolidayDatesUrl: (id: number) => string;
export declare const listHolidayDates: (id: number, options?: RequestInit) => Promise<HolidayDate[]>;
export declare const getListHolidayDatesQueryKey: (id: number) => readonly [`/api/holiday-calendars/${number}/dates`];
export declare const getListHolidayDatesQueryOptions: <TData = Awaited<ReturnType<typeof listHolidayDates>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listHolidayDates>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listHolidayDates>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListHolidayDatesQueryResult = NonNullable<Awaited<ReturnType<typeof listHolidayDates>>>;
export type ListHolidayDatesQueryError = ErrorType<unknown>;
/**
 * @summary List dates for a calendar
 */
export declare function useListHolidayDates<TData = Awaited<ReturnType<typeof listHolidayDates>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listHolidayDates>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Add holiday date
 */
export declare const getCreateHolidayDateUrl: (id: number) => string;
export declare const createHolidayDate: (id: number, createHolidayDateBody: CreateHolidayDateBody, options?: RequestInit) => Promise<HolidayDate>;
export declare const getCreateHolidayDateMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createHolidayDate>>, TError, {
        id: number;
        data: BodyType<CreateHolidayDateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createHolidayDate>>, TError, {
    id: number;
    data: BodyType<CreateHolidayDateBody>;
}, TContext>;
export type CreateHolidayDateMutationResult = NonNullable<Awaited<ReturnType<typeof createHolidayDate>>>;
export type CreateHolidayDateMutationBody = BodyType<CreateHolidayDateBody>;
export type CreateHolidayDateMutationError = ErrorType<unknown>;
/**
 * @summary Add holiday date
 */
export declare const useCreateHolidayDate: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createHolidayDate>>, TError, {
        id: number;
        data: BodyType<CreateHolidayDateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createHolidayDate>>, TError, {
    id: number;
    data: BodyType<CreateHolidayDateBody>;
}, TContext>;
/**
 * @summary Delete holiday date
 */
export declare const getDeleteHolidayDateUrl: (id: number, dateId: number) => string;
export declare const deleteHolidayDate: (id: number, dateId: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteHolidayDateMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteHolidayDate>>, TError, {
        id: number;
        dateId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteHolidayDate>>, TError, {
    id: number;
    dateId: number;
}, TContext>;
export type DeleteHolidayDateMutationResult = NonNullable<Awaited<ReturnType<typeof deleteHolidayDate>>>;
export type DeleteHolidayDateMutationError = ErrorType<unknown>;
/**
 * @summary Delete holiday date
 */
export declare const useDeleteHolidayDate: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteHolidayDate>>, TError, {
        id: number;
        dateId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteHolidayDate>>, TError, {
    id: number;
    dateId: number;
}, TContext>;
/**
 * @summary Get Gantt data for a project
 */
export declare const getGetProjectGanttUrl: (id: number) => string;
export declare const getProjectGantt: (id: number, options?: RequestInit) => Promise<GanttData>;
export declare const getGetProjectGanttQueryKey: (id: number) => readonly [`/api/projects/${number}/gantt`];
export declare const getGetProjectGanttQueryOptions: <TData = Awaited<ReturnType<typeof getProjectGantt>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProjectGantt>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getProjectGantt>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetProjectGanttQueryResult = NonNullable<Awaited<ReturnType<typeof getProjectGantt>>>;
export type GetProjectGanttQueryError = ErrorType<unknown>;
/**
 * @summary Get Gantt data for a project
 */
export declare function useGetProjectGantt<TData = Awaited<ReturnType<typeof getProjectGantt>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProjectGantt>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List prospects
 */
export declare const getListProspectsUrl: (params?: ListProspectsParams) => string;
export declare const listProspects: (params?: ListProspectsParams, options?: RequestInit) => Promise<Prospect[]>;
export declare const getListProspectsQueryKey: (params?: ListProspectsParams) => readonly ["/api/prospects", ...ListProspectsParams[]];
export declare const getListProspectsQueryOptions: <TData = Awaited<ReturnType<typeof listProspects>>, TError = ErrorType<unknown>>(params?: ListProspectsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProspects>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listProspects>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListProspectsQueryResult = NonNullable<Awaited<ReturnType<typeof listProspects>>>;
export type ListProspectsQueryError = ErrorType<unknown>;
/**
 * @summary List prospects
 */
export declare function useListProspects<TData = Awaited<ReturnType<typeof listProspects>>, TError = ErrorType<unknown>>(params?: ListProspectsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProspects>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create prospect
 */
export declare const getCreateProspectUrl: () => string;
export declare const createProspect: (createProspectBody: CreateProspectBody, options?: RequestInit) => Promise<Prospect>;
export declare const getCreateProspectMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProspect>>, TError, {
        data: BodyType<CreateProspectBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createProspect>>, TError, {
    data: BodyType<CreateProspectBody>;
}, TContext>;
export type CreateProspectMutationResult = NonNullable<Awaited<ReturnType<typeof createProspect>>>;
export type CreateProspectMutationBody = BodyType<CreateProspectBody>;
export type CreateProspectMutationError = ErrorType<unknown>;
/**
 * @summary Create prospect
 */
export declare const useCreateProspect: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProspect>>, TError, {
        data: BodyType<CreateProspectBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createProspect>>, TError, {
    data: BodyType<CreateProspectBody>;
}, TContext>;
/**
 * @summary Get prospect
 */
export declare const getGetProspectUrl: (id: number) => string;
export declare const getProspect: (id: number, options?: RequestInit) => Promise<Prospect>;
export declare const getGetProspectQueryKey: (id: number) => readonly [`/api/prospects/${number}`];
export declare const getGetProspectQueryOptions: <TData = Awaited<ReturnType<typeof getProspect>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProspect>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getProspect>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetProspectQueryResult = NonNullable<Awaited<ReturnType<typeof getProspect>>>;
export type GetProspectQueryError = ErrorType<unknown>;
/**
 * @summary Get prospect
 */
export declare function useGetProspect<TData = Awaited<ReturnType<typeof getProspect>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProspect>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update prospect
 */
export declare const getUpdateProspectUrl: (id: number) => string;
export declare const updateProspect: (id: number, updateProspectBody: UpdateProspectBody, options?: RequestInit) => Promise<Prospect>;
export declare const getUpdateProspectMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProspect>>, TError, {
        id: number;
        data: BodyType<UpdateProspectBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateProspect>>, TError, {
    id: number;
    data: BodyType<UpdateProspectBody>;
}, TContext>;
export type UpdateProspectMutationResult = NonNullable<Awaited<ReturnType<typeof updateProspect>>>;
export type UpdateProspectMutationBody = BodyType<UpdateProspectBody>;
export type UpdateProspectMutationError = ErrorType<unknown>;
/**
 * @summary Update prospect
 */
export declare const useUpdateProspect: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProspect>>, TError, {
        id: number;
        data: BodyType<UpdateProspectBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateProspect>>, TError, {
    id: number;
    data: BodyType<UpdateProspectBody>;
}, TContext>;
/**
 * @summary Delete prospect
 */
export declare const getDeleteProspectUrl: (id: number) => string;
export declare const deleteProspect: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteProspectMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProspect>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteProspect>>, TError, {
    id: number;
}, TContext>;
export type DeleteProspectMutationResult = NonNullable<Awaited<ReturnType<typeof deleteProspect>>>;
export type DeleteProspectMutationError = ErrorType<unknown>;
/**
 * @summary Delete prospect
 */
export declare const useDeleteProspect: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProspect>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteProspect>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Convert prospect to customer account
 */
export declare const getConvertProspectUrl: (id: number) => string;
export declare const convertProspect: (id: number, convertProspectBody: ConvertProspectBody, options?: RequestInit) => Promise<ConvertProspectResult>;
export declare const getConvertProspectMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof convertProspect>>, TError, {
        id: number;
        data: BodyType<ConvertProspectBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof convertProspect>>, TError, {
    id: number;
    data: BodyType<ConvertProspectBody>;
}, TContext>;
export type ConvertProspectMutationResult = NonNullable<Awaited<ReturnType<typeof convertProspect>>>;
export type ConvertProspectMutationBody = BodyType<ConvertProspectBody>;
export type ConvertProspectMutationError = ErrorType<unknown>;
/**
 * @summary Convert prospect to customer account
 */
export declare const useConvertProspect: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof convertProspect>>, TError, {
        id: number;
        data: BodyType<ConvertProspectBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof convertProspect>>, TError, {
    id: number;
    data: BodyType<ConvertProspectBody>;
}, TContext>;
/**
 * @summary List opportunities
 */
export declare const getListOpportunitiesUrl: (params?: ListOpportunitiesParams) => string;
export declare const listOpportunities: (params?: ListOpportunitiesParams, options?: RequestInit) => Promise<Opportunity[]>;
export declare const getListOpportunitiesQueryKey: (params?: ListOpportunitiesParams) => readonly ["/api/opportunities", ...ListOpportunitiesParams[]];
export declare const getListOpportunitiesQueryOptions: <TData = Awaited<ReturnType<typeof listOpportunities>>, TError = ErrorType<unknown>>(params?: ListOpportunitiesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listOpportunities>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listOpportunities>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListOpportunitiesQueryResult = NonNullable<Awaited<ReturnType<typeof listOpportunities>>>;
export type ListOpportunitiesQueryError = ErrorType<unknown>;
/**
 * @summary List opportunities
 */
export declare function useListOpportunities<TData = Awaited<ReturnType<typeof listOpportunities>>, TError = ErrorType<unknown>>(params?: ListOpportunitiesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listOpportunities>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create opportunity
 */
export declare const getCreateOpportunityUrl: () => string;
export declare const createOpportunity: (createOpportunityBody: CreateOpportunityBody, options?: RequestInit) => Promise<Opportunity>;
export declare const getCreateOpportunityMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createOpportunity>>, TError, {
        data: BodyType<CreateOpportunityBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createOpportunity>>, TError, {
    data: BodyType<CreateOpportunityBody>;
}, TContext>;
export type CreateOpportunityMutationResult = NonNullable<Awaited<ReturnType<typeof createOpportunity>>>;
export type CreateOpportunityMutationBody = BodyType<CreateOpportunityBody>;
export type CreateOpportunityMutationError = ErrorType<unknown>;
/**
 * @summary Create opportunity
 */
export declare const useCreateOpportunity: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createOpportunity>>, TError, {
        data: BodyType<CreateOpportunityBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createOpportunity>>, TError, {
    data: BodyType<CreateOpportunityBody>;
}, TContext>;
/**
 * @summary Get opportunity
 */
export declare const getGetOpportunityUrl: (id: number) => string;
export declare const getOpportunity: (id: number, options?: RequestInit) => Promise<Opportunity>;
export declare const getGetOpportunityQueryKey: (id: number) => readonly [`/api/opportunities/${number}`];
export declare const getGetOpportunityQueryOptions: <TData = Awaited<ReturnType<typeof getOpportunity>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOpportunity>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getOpportunity>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetOpportunityQueryResult = NonNullable<Awaited<ReturnType<typeof getOpportunity>>>;
export type GetOpportunityQueryError = ErrorType<unknown>;
/**
 * @summary Get opportunity
 */
export declare function useGetOpportunity<TData = Awaited<ReturnType<typeof getOpportunity>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOpportunity>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update opportunity
 */
export declare const getUpdateOpportunityUrl: (id: number) => string;
export declare const updateOpportunity: (id: number, updateOpportunityBody: UpdateOpportunityBody, options?: RequestInit) => Promise<Opportunity>;
export declare const getUpdateOpportunityMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateOpportunity>>, TError, {
        id: number;
        data: BodyType<UpdateOpportunityBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateOpportunity>>, TError, {
    id: number;
    data: BodyType<UpdateOpportunityBody>;
}, TContext>;
export type UpdateOpportunityMutationResult = NonNullable<Awaited<ReturnType<typeof updateOpportunity>>>;
export type UpdateOpportunityMutationBody = BodyType<UpdateOpportunityBody>;
export type UpdateOpportunityMutationError = ErrorType<unknown>;
/**
 * @summary Update opportunity
 */
export declare const useUpdateOpportunity: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateOpportunity>>, TError, {
        id: number;
        data: BodyType<UpdateOpportunityBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateOpportunity>>, TError, {
    id: number;
    data: BodyType<UpdateOpportunityBody>;
}, TContext>;
/**
 * @summary Delete opportunity
 */
export declare const getDeleteOpportunityUrl: (id: number) => string;
export declare const deleteOpportunity: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteOpportunityMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteOpportunity>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteOpportunity>>, TError, {
    id: number;
}, TContext>;
export type DeleteOpportunityMutationResult = NonNullable<Awaited<ReturnType<typeof deleteOpportunity>>>;
export type DeleteOpportunityMutationError = ErrorType<unknown>;
/**
 * @summary Delete opportunity
 */
export declare const useDeleteOpportunity: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteOpportunity>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteOpportunity>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Create a project from a Won opportunity
 */
export declare const getConvertOpportunityToProjectUrl: (id: number) => string;
export declare const convertOpportunityToProject: (id: number, convertOpportunityBody: ConvertOpportunityBody, options?: RequestInit) => Promise<ConvertOpportunityResult>;
export declare const getConvertOpportunityToProjectMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof convertOpportunityToProject>>, TError, {
        id: number;
        data: BodyType<ConvertOpportunityBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof convertOpportunityToProject>>, TError, {
    id: number;
    data: BodyType<ConvertOpportunityBody>;
}, TContext>;
export type ConvertOpportunityToProjectMutationResult = NonNullable<Awaited<ReturnType<typeof convertOpportunityToProject>>>;
export type ConvertOpportunityToProjectMutationBody = BodyType<ConvertOpportunityBody>;
export type ConvertOpportunityToProjectMutationError = ErrorType<unknown>;
/**
 * @summary Create a project from a Won opportunity
 */
export declare const useConvertOpportunityToProject: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof convertOpportunityToProject>>, TError, {
        id: number;
        data: BodyType<ConvertOpportunityBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof convertOpportunityToProject>>, TError, {
    id: number;
    data: BodyType<ConvertOpportunityBody>;
}, TContext>;
/**
 * @summary List documents for a project
 */
export declare const getListDocumentsUrl: (params: ListDocumentsParams) => string;
export declare const listDocuments: (params: ListDocumentsParams, options?: RequestInit) => Promise<ProjectDocument[]>;
export declare const getListDocumentsQueryKey: (params?: ListDocumentsParams) => readonly ["/api/documents", ...ListDocumentsParams[]];
export declare const getListDocumentsQueryOptions: <TData = Awaited<ReturnType<typeof listDocuments>>, TError = ErrorType<unknown>>(params: ListDocumentsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listDocuments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listDocuments>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListDocumentsQueryResult = NonNullable<Awaited<ReturnType<typeof listDocuments>>>;
export type ListDocumentsQueryError = ErrorType<unknown>;
/**
 * @summary List documents for a project
 */
export declare function useListDocuments<TData = Awaited<ReturnType<typeof listDocuments>>, TError = ErrorType<unknown>>(params: ListDocumentsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listDocuments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create document
 */
export declare const getCreateDocumentUrl: () => string;
export declare const createDocument: (createDocumentBody: CreateDocumentBody, options?: RequestInit) => Promise<ProjectDocument>;
export declare const getCreateDocumentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createDocument>>, TError, {
        data: BodyType<CreateDocumentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createDocument>>, TError, {
    data: BodyType<CreateDocumentBody>;
}, TContext>;
export type CreateDocumentMutationResult = NonNullable<Awaited<ReturnType<typeof createDocument>>>;
export type CreateDocumentMutationBody = BodyType<CreateDocumentBody>;
export type CreateDocumentMutationError = ErrorType<unknown>;
/**
 * @summary Create document
 */
export declare const useCreateDocument: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createDocument>>, TError, {
        data: BodyType<CreateDocumentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createDocument>>, TError, {
    data: BodyType<CreateDocumentBody>;
}, TContext>;
/**
 * @summary Get document with content
 */
export declare const getGetDocumentUrl: (id: number) => string;
export declare const getDocument: (id: number, options?: RequestInit) => Promise<ProjectDocument>;
export declare const getGetDocumentQueryKey: (id: number) => readonly [`/api/documents/${number}`];
export declare const getGetDocumentQueryOptions: <TData = Awaited<ReturnType<typeof getDocument>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDocument>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDocument>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDocumentQueryResult = NonNullable<Awaited<ReturnType<typeof getDocument>>>;
export type GetDocumentQueryError = ErrorType<unknown>;
/**
 * @summary Get document with content
 */
export declare function useGetDocument<TData = Awaited<ReturnType<typeof getDocument>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDocument>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update document content
 */
export declare const getUpdateDocumentUrl: (id: number) => string;
export declare const updateDocument: (id: number, updateDocumentBody: UpdateDocumentBody, options?: RequestInit) => Promise<ProjectDocument>;
export declare const getUpdateDocumentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateDocument>>, TError, {
        id: number;
        data: BodyType<UpdateDocumentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateDocument>>, TError, {
    id: number;
    data: BodyType<UpdateDocumentBody>;
}, TContext>;
export type UpdateDocumentMutationResult = NonNullable<Awaited<ReturnType<typeof updateDocument>>>;
export type UpdateDocumentMutationBody = BodyType<UpdateDocumentBody>;
export type UpdateDocumentMutationError = ErrorType<unknown>;
/**
 * @summary Update document content
 */
export declare const useUpdateDocument: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateDocument>>, TError, {
        id: number;
        data: BodyType<UpdateDocumentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateDocument>>, TError, {
    id: number;
    data: BodyType<UpdateDocumentBody>;
}, TContext>;
/**
 * @summary Delete document
 */
export declare const getDeleteDocumentUrl: (id: number) => string;
export declare const deleteDocument: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteDocumentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteDocument>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteDocument>>, TError, {
    id: number;
}, TContext>;
export type DeleteDocumentMutationResult = NonNullable<Awaited<ReturnType<typeof deleteDocument>>>;
export type DeleteDocumentMutationError = ErrorType<unknown>;
/**
 * @summary Delete document
 */
export declare const useDeleteDocument: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteDocument>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteDocument>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Get document version history
 */
export declare const getListDocumentVersionsUrl: (id: number) => string;
export declare const listDocumentVersions: (id: number, options?: RequestInit) => Promise<DocumentVersion[]>;
export declare const getListDocumentVersionsQueryKey: (id: number) => readonly [`/api/documents/${number}/versions`];
export declare const getListDocumentVersionsQueryOptions: <TData = Awaited<ReturnType<typeof listDocumentVersions>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listDocumentVersions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listDocumentVersions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListDocumentVersionsQueryResult = NonNullable<Awaited<ReturnType<typeof listDocumentVersions>>>;
export type ListDocumentVersionsQueryError = ErrorType<unknown>;
/**
 * @summary Get document version history
 */
export declare function useListDocumentVersions<TData = Awaited<ReturnType<typeof listDocumentVersions>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listDocumentVersions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List forms for a project
 */
export declare const getListFormsUrl: (params: ListFormsParams) => string;
export declare const listForms: (params: ListFormsParams, options?: RequestInit) => Promise<ProjectForm[]>;
export declare const getListFormsQueryKey: (params?: ListFormsParams) => readonly ["/api/forms", ...ListFormsParams[]];
export declare const getListFormsQueryOptions: <TData = Awaited<ReturnType<typeof listForms>>, TError = ErrorType<unknown>>(params: ListFormsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listForms>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listForms>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListFormsQueryResult = NonNullable<Awaited<ReturnType<typeof listForms>>>;
export type ListFormsQueryError = ErrorType<unknown>;
/**
 * @summary List forms for a project
 */
export declare function useListForms<TData = Awaited<ReturnType<typeof listForms>>, TError = ErrorType<unknown>>(params: ListFormsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listForms>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create form
 */
export declare const getCreateFormUrl: () => string;
export declare const createForm: (createFormBody: CreateFormBody, options?: RequestInit) => Promise<ProjectForm>;
export declare const getCreateFormMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createForm>>, TError, {
        data: BodyType<CreateFormBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createForm>>, TError, {
    data: BodyType<CreateFormBody>;
}, TContext>;
export type CreateFormMutationResult = NonNullable<Awaited<ReturnType<typeof createForm>>>;
export type CreateFormMutationBody = BodyType<CreateFormBody>;
export type CreateFormMutationError = ErrorType<unknown>;
/**
 * @summary Create form
 */
export declare const useCreateForm: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createForm>>, TError, {
        data: BodyType<CreateFormBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createForm>>, TError, {
    data: BodyType<CreateFormBody>;
}, TContext>;
/**
 * @summary Get form with fields
 */
export declare const getGetFormUrl: (id: number) => string;
export declare const getForm: (id: number, options?: RequestInit) => Promise<ProjectFormDetail>;
export declare const getGetFormQueryKey: (id: number) => readonly [`/api/forms/${number}`];
export declare const getGetFormQueryOptions: <TData = Awaited<ReturnType<typeof getForm>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getForm>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getForm>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetFormQueryResult = NonNullable<Awaited<ReturnType<typeof getForm>>>;
export type GetFormQueryError = ErrorType<unknown>;
/**
 * @summary Get form with fields
 */
export declare function useGetForm<TData = Awaited<ReturnType<typeof getForm>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getForm>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Delete form
 */
export declare const getDeleteFormUrl: (id: number) => string;
export declare const deleteForm: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteFormMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteForm>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteForm>>, TError, {
    id: number;
}, TContext>;
export type DeleteFormMutationResult = NonNullable<Awaited<ReturnType<typeof deleteForm>>>;
export type DeleteFormMutationError = ErrorType<unknown>;
/**
 * @summary Delete form
 */
export declare const useDeleteForm: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteForm>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteForm>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Add field to form
 */
export declare const getCreateFormFieldUrl: (id: number) => string;
export declare const createFormField: (id: number, createFormFieldBody: CreateFormFieldBody, options?: RequestInit) => Promise<FormField>;
export declare const getCreateFormFieldMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createFormField>>, TError, {
        id: number;
        data: BodyType<CreateFormFieldBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createFormField>>, TError, {
    id: number;
    data: BodyType<CreateFormFieldBody>;
}, TContext>;
export type CreateFormFieldMutationResult = NonNullable<Awaited<ReturnType<typeof createFormField>>>;
export type CreateFormFieldMutationBody = BodyType<CreateFormFieldBody>;
export type CreateFormFieldMutationError = ErrorType<unknown>;
/**
 * @summary Add field to form
 */
export declare const useCreateFormField: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createFormField>>, TError, {
        id: number;
        data: BodyType<CreateFormFieldBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createFormField>>, TError, {
    id: number;
    data: BodyType<CreateFormFieldBody>;
}, TContext>;
/**
 * @summary Remove field from form
 */
export declare const getDeleteFormFieldUrl: (id: number, fieldId: number) => string;
export declare const deleteFormField: (id: number, fieldId: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteFormFieldMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteFormField>>, TError, {
        id: number;
        fieldId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteFormField>>, TError, {
    id: number;
    fieldId: number;
}, TContext>;
export type DeleteFormFieldMutationResult = NonNullable<Awaited<ReturnType<typeof deleteFormField>>>;
export type DeleteFormFieldMutationError = ErrorType<unknown>;
/**
 * @summary Remove field from form
 */
export declare const useDeleteFormField: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteFormField>>, TError, {
        id: number;
        fieldId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteFormField>>, TError, {
    id: number;
    fieldId: number;
}, TContext>;
/**
 * @summary List form responses
 */
export declare const getListFormResponsesUrl: (id: number) => string;
export declare const listFormResponses: (id: number, options?: RequestInit) => Promise<FormResponse[]>;
export declare const getListFormResponsesQueryKey: (id: number) => readonly [`/api/forms/${number}/responses`];
export declare const getListFormResponsesQueryOptions: <TData = Awaited<ReturnType<typeof listFormResponses>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listFormResponses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listFormResponses>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListFormResponsesQueryResult = NonNullable<Awaited<ReturnType<typeof listFormResponses>>>;
export type ListFormResponsesQueryError = ErrorType<unknown>;
/**
 * @summary List form responses
 */
export declare function useListFormResponses<TData = Awaited<ReturnType<typeof listFormResponses>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listFormResponses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Submit form response
 */
export declare const getSubmitFormResponseUrl: (id: number) => string;
export declare const submitFormResponse: (id: number, submitFormResponseBody: SubmitFormResponseBody, options?: RequestInit) => Promise<FormResponse>;
export declare const getSubmitFormResponseMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof submitFormResponse>>, TError, {
        id: number;
        data: BodyType<SubmitFormResponseBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof submitFormResponse>>, TError, {
    id: number;
    data: BodyType<SubmitFormResponseBody>;
}, TContext>;
export type SubmitFormResponseMutationResult = NonNullable<Awaited<ReturnType<typeof submitFormResponse>>>;
export type SubmitFormResponseMutationBody = BodyType<SubmitFormResponseBody>;
export type SubmitFormResponseMutationError = ErrorType<unknown>;
/**
 * @summary Submit form response
 */
export declare const useSubmitFormResponse: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof submitFormResponse>>, TError, {
        id: number;
        data: BodyType<SubmitFormResponseBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof submitFormResponse>>, TError, {
    id: number;
    data: BodyType<SubmitFormResponseBody>;
}, TContext>;
/**
 * @summary List custom field definitions
 */
export declare const getListCustomFieldDefinitionsUrl: (params?: ListCustomFieldDefinitionsParams) => string;
export declare const listCustomFieldDefinitions: (params?: ListCustomFieldDefinitionsParams, options?: RequestInit) => Promise<CustomFieldDefinition[]>;
export declare const getListCustomFieldDefinitionsQueryKey: (params?: ListCustomFieldDefinitionsParams) => readonly ["/api/custom-field-definitions", ...ListCustomFieldDefinitionsParams[]];
export declare const getListCustomFieldDefinitionsQueryOptions: <TData = Awaited<ReturnType<typeof listCustomFieldDefinitions>>, TError = ErrorType<unknown>>(params?: ListCustomFieldDefinitionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCustomFieldDefinitions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listCustomFieldDefinitions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListCustomFieldDefinitionsQueryResult = NonNullable<Awaited<ReturnType<typeof listCustomFieldDefinitions>>>;
export type ListCustomFieldDefinitionsQueryError = ErrorType<unknown>;
/**
 * @summary List custom field definitions
 */
export declare function useListCustomFieldDefinitions<TData = Awaited<ReturnType<typeof listCustomFieldDefinitions>>, TError = ErrorType<unknown>>(params?: ListCustomFieldDefinitionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCustomFieldDefinitions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create custom field definition
 */
export declare const getCreateCustomFieldDefinitionUrl: () => string;
export declare const createCustomFieldDefinition: (createCustomFieldDefinitionBody: CreateCustomFieldDefinitionBody, options?: RequestInit) => Promise<CustomFieldDefinition>;
export declare const getCreateCustomFieldDefinitionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCustomFieldDefinition>>, TError, {
        data: BodyType<CreateCustomFieldDefinitionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createCustomFieldDefinition>>, TError, {
    data: BodyType<CreateCustomFieldDefinitionBody>;
}, TContext>;
export type CreateCustomFieldDefinitionMutationResult = NonNullable<Awaited<ReturnType<typeof createCustomFieldDefinition>>>;
export type CreateCustomFieldDefinitionMutationBody = BodyType<CreateCustomFieldDefinitionBody>;
export type CreateCustomFieldDefinitionMutationError = ErrorType<unknown>;
/**
 * @summary Create custom field definition
 */
export declare const useCreateCustomFieldDefinition: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCustomFieldDefinition>>, TError, {
        data: BodyType<CreateCustomFieldDefinitionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createCustomFieldDefinition>>, TError, {
    data: BodyType<CreateCustomFieldDefinitionBody>;
}, TContext>;
/**
 * @summary Update custom field definition
 */
export declare const getUpdateCustomFieldDefinitionUrl: (id: number) => string;
export declare const updateCustomFieldDefinition: (id: number, createCustomFieldDefinitionBody: CreateCustomFieldDefinitionBody, options?: RequestInit) => Promise<CustomFieldDefinition>;
export declare const getUpdateCustomFieldDefinitionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateCustomFieldDefinition>>, TError, {
        id: number;
        data: BodyType<CreateCustomFieldDefinitionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateCustomFieldDefinition>>, TError, {
    id: number;
    data: BodyType<CreateCustomFieldDefinitionBody>;
}, TContext>;
export type UpdateCustomFieldDefinitionMutationResult = NonNullable<Awaited<ReturnType<typeof updateCustomFieldDefinition>>>;
export type UpdateCustomFieldDefinitionMutationBody = BodyType<CreateCustomFieldDefinitionBody>;
export type UpdateCustomFieldDefinitionMutationError = ErrorType<unknown>;
/**
 * @summary Update custom field definition
 */
export declare const useUpdateCustomFieldDefinition: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateCustomFieldDefinition>>, TError, {
        id: number;
        data: BodyType<CreateCustomFieldDefinitionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateCustomFieldDefinition>>, TError, {
    id: number;
    data: BodyType<CreateCustomFieldDefinitionBody>;
}, TContext>;
/**
 * @summary Delete custom field definition
 */
export declare const getDeleteCustomFieldDefinitionUrl: (id: number) => string;
export declare const deleteCustomFieldDefinition: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteCustomFieldDefinitionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteCustomFieldDefinition>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteCustomFieldDefinition>>, TError, {
    id: number;
}, TContext>;
export type DeleteCustomFieldDefinitionMutationResult = NonNullable<Awaited<ReturnType<typeof deleteCustomFieldDefinition>>>;
export type DeleteCustomFieldDefinitionMutationError = ErrorType<unknown>;
/**
 * @summary Delete custom field definition
 */
export declare const useDeleteCustomFieldDefinition: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteCustomFieldDefinition>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteCustomFieldDefinition>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Get custom field values for an entity
 */
export declare const getListCustomFieldValuesUrl: (params: ListCustomFieldValuesParams) => string;
export declare const listCustomFieldValues: (params: ListCustomFieldValuesParams, options?: RequestInit) => Promise<CustomFieldValue[]>;
export declare const getListCustomFieldValuesQueryKey: (params?: ListCustomFieldValuesParams) => readonly ["/api/custom-field-values", ...ListCustomFieldValuesParams[]];
export declare const getListCustomFieldValuesQueryOptions: <TData = Awaited<ReturnType<typeof listCustomFieldValues>>, TError = ErrorType<unknown>>(params: ListCustomFieldValuesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCustomFieldValues>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listCustomFieldValues>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListCustomFieldValuesQueryResult = NonNullable<Awaited<ReturnType<typeof listCustomFieldValues>>>;
export type ListCustomFieldValuesQueryError = ErrorType<unknown>;
/**
 * @summary Get custom field values for an entity
 */
export declare function useListCustomFieldValues<TData = Awaited<ReturnType<typeof listCustomFieldValues>>, TError = ErrorType<unknown>>(params: ListCustomFieldValuesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCustomFieldValues>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Upsert custom field value
 */
export declare const getUpsertCustomFieldValueUrl: () => string;
export declare const upsertCustomFieldValue: (upsertCustomFieldValueBody: UpsertCustomFieldValueBody, options?: RequestInit) => Promise<CustomFieldValue>;
export declare const getUpsertCustomFieldValueMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof upsertCustomFieldValue>>, TError, {
        data: BodyType<UpsertCustomFieldValueBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof upsertCustomFieldValue>>, TError, {
    data: BodyType<UpsertCustomFieldValueBody>;
}, TContext>;
export type UpsertCustomFieldValueMutationResult = NonNullable<Awaited<ReturnType<typeof upsertCustomFieldValue>>>;
export type UpsertCustomFieldValueMutationBody = BodyType<UpsertCustomFieldValueBody>;
export type UpsertCustomFieldValueMutationError = ErrorType<unknown>;
/**
 * @summary Upsert custom field value
 */
export declare const useUpsertCustomFieldValue: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof upsertCustomFieldValue>>, TError, {
        data: BodyType<UpsertCustomFieldValueBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof upsertCustomFieldValue>>, TError, {
    data: BodyType<UpsertCustomFieldValueBody>;
}, TContext>;
/**
 * @summary List audit log entries
 */
export declare const getListAuditLogUrl: (params?: ListAuditLogParams) => string;
export declare const listAuditLog: (params?: ListAuditLogParams, options?: RequestInit) => Promise<AuditLogEntry[]>;
export declare const getListAuditLogQueryKey: (params?: ListAuditLogParams) => readonly ["/api/audit-log", ...ListAuditLogParams[]];
export declare const getListAuditLogQueryOptions: <TData = Awaited<ReturnType<typeof listAuditLog>>, TError = ErrorType<unknown>>(params?: ListAuditLogParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAuditLog>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listAuditLog>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListAuditLogQueryResult = NonNullable<Awaited<ReturnType<typeof listAuditLog>>>;
export type ListAuditLogQueryError = ErrorType<unknown>;
/**
 * @summary List audit log entries
 */
export declare function useListAuditLog<TData = Awaited<ReturnType<typeof listAuditLog>>, TError = ErrorType<unknown>>(params?: ListAuditLogParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAuditLog>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List saved views for an entity
 */
export declare const getListSavedViewsUrl: (params: ListSavedViewsParams) => string;
export declare const listSavedViews: (params: ListSavedViewsParams, options?: RequestInit) => Promise<SavedView[]>;
export declare const getListSavedViewsQueryKey: (params?: ListSavedViewsParams) => readonly ["/api/saved-views", ...ListSavedViewsParams[]];
export declare const getListSavedViewsQueryOptions: <TData = Awaited<ReturnType<typeof listSavedViews>>, TError = ErrorType<unknown>>(params: ListSavedViewsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSavedViews>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSavedViews>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSavedViewsQueryResult = NonNullable<Awaited<ReturnType<typeof listSavedViews>>>;
export type ListSavedViewsQueryError = ErrorType<unknown>;
/**
 * @summary List saved views for an entity
 */
export declare function useListSavedViews<TData = Awaited<ReturnType<typeof listSavedViews>>, TError = ErrorType<unknown>>(params: ListSavedViewsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSavedViews>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a saved view
 */
export declare const getCreateSavedViewUrl: () => string;
export declare const createSavedView: (createSavedViewBody: CreateSavedViewBody, options?: RequestInit) => Promise<SavedView>;
export declare const getCreateSavedViewMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSavedView>>, TError, {
        data: BodyType<CreateSavedViewBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createSavedView>>, TError, {
    data: BodyType<CreateSavedViewBody>;
}, TContext>;
export type CreateSavedViewMutationResult = NonNullable<Awaited<ReturnType<typeof createSavedView>>>;
export type CreateSavedViewMutationBody = BodyType<CreateSavedViewBody>;
export type CreateSavedViewMutationError = ErrorType<unknown>;
/**
 * @summary Create a saved view
 */
export declare const useCreateSavedView: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSavedView>>, TError, {
        data: BodyType<CreateSavedViewBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createSavedView>>, TError, {
    data: BodyType<CreateSavedViewBody>;
}, TContext>;
/**
 * @summary Update a saved view
 */
export declare const getUpdateSavedViewUrl: (id: number) => string;
export declare const updateSavedView: (id: number, updateSavedViewBody: UpdateSavedViewBody, options?: RequestInit) => Promise<SavedView>;
export declare const getUpdateSavedViewMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSavedView>>, TError, {
        id: number;
        data: BodyType<UpdateSavedViewBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateSavedView>>, TError, {
    id: number;
    data: BodyType<UpdateSavedViewBody>;
}, TContext>;
export type UpdateSavedViewMutationResult = NonNullable<Awaited<ReturnType<typeof updateSavedView>>>;
export type UpdateSavedViewMutationBody = BodyType<UpdateSavedViewBody>;
export type UpdateSavedViewMutationError = ErrorType<unknown>;
/**
 * @summary Update a saved view
 */
export declare const useUpdateSavedView: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSavedView>>, TError, {
        id: number;
        data: BodyType<UpdateSavedViewBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateSavedView>>, TError, {
    id: number;
    data: BodyType<UpdateSavedViewBody>;
}, TContext>;
/**
 * @summary Delete a saved view
 */
export declare const getDeleteSavedViewUrl: (id: number) => string;
export declare const deleteSavedView: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteSavedViewMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSavedView>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteSavedView>>, TError, {
    id: number;
}, TContext>;
export type DeleteSavedViewMutationResult = NonNullable<Awaited<ReturnType<typeof deleteSavedView>>>;
export type DeleteSavedViewMutationError = ErrorType<unknown>;
/**
 * @summary Delete a saved view
 */
export declare const useDeleteSavedView: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSavedView>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteSavedView>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Duplicate a saved view as a private copy owned by current user
 */
export declare const getDuplicateSavedViewUrl: (id: number) => string;
export declare const duplicateSavedView: (id: number, duplicateSavedViewBody?: DuplicateSavedViewBody, options?: RequestInit) => Promise<SavedView>;
export declare const getDuplicateSavedViewMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof duplicateSavedView>>, TError, {
        id: number;
        data: BodyType<DuplicateSavedViewBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof duplicateSavedView>>, TError, {
    id: number;
    data: BodyType<DuplicateSavedViewBody>;
}, TContext>;
export type DuplicateSavedViewMutationResult = NonNullable<Awaited<ReturnType<typeof duplicateSavedView>>>;
export type DuplicateSavedViewMutationBody = BodyType<DuplicateSavedViewBody>;
export type DuplicateSavedViewMutationError = ErrorType<unknown>;
/**
 * @summary Duplicate a saved view as a private copy owned by current user
 */
export declare const useDuplicateSavedView: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof duplicateSavedView>>, TError, {
        id: number;
        data: BodyType<DuplicateSavedViewBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof duplicateSavedView>>, TError, {
    id: number;
    data: BodyType<DuplicateSavedViewBody>;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map