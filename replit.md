# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Project: BusinessNow PSA Platform

A full-stack Professional Services Automation (PSA) platform for KSAP Technology consulting firm. Modeled after Rocketlane-style tools.

### Modules
- **Dashboard** — KPI summary cards (all clickable: Projects→/projects, Revenue→/finance, Hours→/time, Utilization→/reports), activity feed, "Needs Attention" section (live data: at-risk projects + overdue invoices from API), quick actions
- **Projects** — Project list with search bar + status/health filter chips; project detail with tasks, allocations, financials; Edit Project modal (name/status/health/budget); Request Resource button in Team tab
- **Accounts** — Client account management with Status column (Active/Inactive/At Risk/etc.); click-through detail sheet with Opportunities + Projects sub-tabs
- **Prospects** — Sales prospect list (New/Qualified/Proposal/Negotiation/Lost/Converted); detail sheet with status update; Convert to Customer action (creates Account)
- **Opportunities** — Deals list with Kanban board (drag-drop by stage) + list view; 6-stage pipeline (Discovery→Won/Lost); Create Project from Won opportunity; linked to Account detail sheet
- **Time Tracking** — Log time entries, summary by project/user, weekly Timesheet grid, Time Off requests (submit/approve/reject); **Time Entries tab** has inline edit (date/hours/description/billable) + delete per row
- **Resources** — Team capacity grid with skill badges per member + Resource Requests tab (approve/reject/fulfill workflow)
- **Finance** — Invoice management with **search bar** (filter by ID or description) + status sub-tabs (All/Draft/In Review/Approved/Paid/Overdue) + Billing Schedules (date/milestone triggered) + Revenue Recognition
- **Reports** — 5 tabs: Budget vs Actuals, Burn-Down, Revenue, Utilization, Project Health (count cards + detailed per-project table)
- **Admin** — Users tab with **per-user Skills button** (dialog to add/remove skills from skill library) + Project Templates + Skills Matrix + Tax Codes + Time Categories + Holiday Calendars + Rate Cards + Custom Fields + Audit Log + Company Settings + Archived Projects recovery
- **Notifications** — Notification feed with mark-as-read; live unread count badge in sidebar bell; "Mark all read" bulk action
- **CSAT** — Per-project satisfaction tracking tab with star ratings, distribution chart, recent feedback

### Tech Stack
- **Frontend**: React + Vite + Wouter (routing) + Recharts + DM Sans font; indigo/violet accent theme
- **Backend**: Express 5 + PostgreSQL + Drizzle ORM + Zod validation
- **API contract**: OpenAPI spec → Orval codegen → React Query hooks + Zod schemas
- **Packages**: `@workspace/api-spec`, `@workspace/api-zod`, `@workspace/db`, `@workspace/api-server`, `@workspace/businessnow`

### Key Pitfalls
- `lib/api-zod/src/index.ts` must only export `./generated/api` (Zod schemas) — re-exporting `./generated/types` causes duplicate name errors
- Drizzle returns JS `Date` objects for timestamp columns; all `map*` functions in API routes must convert these to ISO strings via `instanceof Date ? .toISOString() : value`
- Invoice `id` is a text PK with format "INV-YYYY-NNN"
- Express route ordering: specific sub-paths (e.g. `/projects/deleted`) MUST be declared before parameterised routes (e.g. `/projects/:id`) or they will be shadowed
- When adding fields to the API contract, update all four places: `lib/api-zod/src/generated/api.ts` + `types/createXBody.ts`, `lib/api-client-react/src/generated/api.schemas.ts`, then rebuild both dists (`tsc --build --force`)
- `lib/api-client-react/dist/index.d.ts` is the compiled declaration output — must rebuild after editing `custom-fetch.ts` or any generated schema file

### Sprint 7 Progress (Wave 1 BRD gap-closure)
- **T001 RBAC** — `requirePM` added to accounts, prospects, timeEntries, allocations routes
- **T002 Project Creation Wizard** — 4-step wizard already existed at `create-project-wizard.tsx`
- **T003 Milestone types + sub-tasks** — `milestoneType` (Payment/Project/External) column in tasks DB + UI selector conditional on isMilestone; sub-tasks rendered indented with `↳` arrow; "Add Sub-task" in task dropdown; `parentTaskId` wired through form
- **T004 Task Resource with project role** — Assignee list in task form now shows each user's project allocation role badge (role inherited from allocationsTable)
- **T005 Task comments + @-tagging** — Already built in `task-detail-sheet.tsx`
- **T006 Kanban board view** — List/Board toggle in project Tasks tab; 4-column Kanban (Not Started → In Progress → Blocked → Completed) with task cards, priority badges, assignee avatars, sub-task counts; quick status advance via hover button
- **T007 Time categories in Log Time** — Category dropdown added to Log Time dialog using `useListTimeCategories`; `categoryId` passed through to createTimeEntry
- **T008 Timesheet submit → PM approval → Draft Invoice** — Full workflow: Submit for Approval button in timesheet grid; PM approval queue shows Submitted timesheets; Approved timesheets section with "Generate Invoice" button calls `POST /api/invoices/from-timesheet/:id` → creates draft invoice
- **T009 Holiday Calendar capacity subtraction** — `/resources/capacity` now fetches this week's holidays from `holidayDatesTable` and subtracts 8h per holiday day from each user's weekly capacity
- **DB** — `milestoneType` column (text) + `task_roles` column (jsonb) added to tasks table and pushed to production DB

### Sprint 1 Complete (Wave 1)
- RBAC middleware on projects routes (requirePM for create/update/delete, requireAdmin for restore/deleted list)
- Soft-delete on projects (deletedAt column; filter on list; restore endpoint)
- Internal/External flag on projects list (badge) and create wizard (toggle)
- Admin Project type hidden from standard project list
- Win probability auto-fill by opportunity stage
- Standardised 8-role taxonomy seeded
- Company Settings table + Admin Settings tab (connected to GET/PUT /api/company-settings)
- Archived Projects recovery tab in Admin

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

### Sprint 4 Complete
- T001: Dashboard "Needs Attention" → live data from `useGetProjectHealthReport` + `useListInvoices`; shows at-risk project names + overdue invoice totals; "All clear" state when nothing flagged
- T002: Dashboard KPI cards all wrapped in `<Link>` for clickable navigation (Projects/Finance/Time/Reports)
- T003: Finance invoice search bar (filter by ID or description); added "Overdue" sub-tab; result count badge on "All" tab
- T004: Admin Users → per-row "Skills" button opens `UserSkillsDialog` (add/remove skills per user; hooks: `useGetUserSkills`, `useAddUserSkill`, `useRemoveUserSkill`)
- T005: Time Entries table → inline edit dialog (date/hours/description/billable) + delete confirmation per row

### Sprint 5 Complete
- T001: Accounts — per-row `⋯` dropdown (Edit + Delete); Edit dialog (all fields: name/domain/tier/region/status/contractValue); Delete confirm dialog; `deleteAccount` mutation wired
- T002: Prospects — "Edit" added to row dropdown; Edit dialog (all fields: name/contactName/email/phone/status/source/estimatedValue/notes); `editMut` calls `updateProspect`
- T003: Opportunities — "Edit" button in detail sheet header; Edit dialog (all fields: name/stage/probability/value/description/closeDate); `editMut` calls `updateOpportunity`
- T004: Reports — year filter dropdowns in Revenue and Utilization tabs; auto-populated from data months; filters `byMonth` arrays by selected year prefix (YYYY-MM format)
- T005: Account detail sheet Opportunities and Projects items wrapped in `<Link>` with hover states for navigation

### Sprint 6 Complete
- T001: Project Phases — "Edit Phase" and "Delete Phase" menu items now fully wired; `useUpdatePhase`/`useDeletePhase` mutations; Edit dialog (name/status/startDate/dueDate); Delete confirm dialog
- T002: Time Tracking — "Log Time" button opens dialog (project/date/hours/description/billable); `useCreateTimeEntry` mutation; "Start Timer" stopwatch button counts up in header and auto-fills hours when stopped
- T003: Resources Capacity — search bar (filters by name/role) + department dropdown filter above capacity table; IIFE-rendered filtered results
- T004: Notification Bell — replaced bare `<Link>` with `<Popover>`; shows last 6 notifications (unread highlighted, blue dot, timestamp via `timeAgo()`); "Mark all read" button; "View all notifications" footer link; `useMarkNotificationRead` + `getListNotificationsQueryKey` for cache invalidation
- T005: Finance Invoices — per-row `⋮` DropdownMenu with "View Details" + "Mark as [next-status]" (Draft→In Review→Approved→Paid); `useUpdateInvoice` mutation; `e.stopPropagation()` prevents row click from also opening detail
