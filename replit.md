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

### Sprint 8 Complete (Wave 1 BRD gap-closure — 9 features)
- **BR-RA-01/02 Soft vs Hard allocation** — `isSoftAllocation` boolean now exposed in API response (added to `ListAllocationsResponseItem` Zod schema); Soft/Hard badge (amber/blue) added to Team Allocations table column; "Soft allocation" checkbox added to Create/Edit Allocation dialog; allocation route PATCH/POST now persists `isSoftAllocation` from request body (bypasses auto-generated Zod body)
- **BR-RA-03 Resource Utilisation Heat Map** — New `UtilisationHeatmap` component (`components/utilisation-heatmap.tsx`); 12-week lookahead, rows = active users, cells = allocated% vs capacity; green/amber/red colour coding; soft-only weeks shown italic; tooltip with details; "Heat Map" tab added to Resources page
- **BR-OP-08 Probability-triggered soft allocation** — `PATCH /opportunities/:id` now checks if probability crosses ≥70% threshold; when it does and a project is linked, auto-inserts a soft allocation for the opportunity owner + logs audit
- **BR-PM-05 Change Orders** — New `changeOrdersTable` DB schema (title, description, amount, status, requestedDate, approvedDate); `GET/POST /projects/:id/change-orders` + `PATCH/DELETE /change-orders/:id`; Change Orders section added to project Financials tab with inline status select + delete; New Change Order dialog with title/description/amount/date fields
- **BR-TM-04 Task Dependencies** — New API routes: `GET /tasks/:id/dependencies`, `POST /tasks/:id/dependencies`, `DELETE /task-dependencies/:id`; Dependencies section added to task-detail-sheet between Checklist and Comments; shows predecessor/successor name, FS/SS/FF/SF type, lag days; Add Dependency form with task picker + type + lag input
- **PRD-AD-06 Audit Trail write hooks** — New `logAudit()` helper (`artifacts/api-server/src/lib/audit.ts`); called from: task create/update/delete/status-change, project create/update, opportunity stage/probability change, allocation auto-create, milestone invoice auto-create, change order create/update
- **BR-INV-05 Milestone-triggered invoice** — Task PATCH route now detects `status→Completed` transition on tasks with `isMilestone=true` AND `milestoneType` containing "Payment"; auto-creates draft invoice with the project's budget as total; logged to audit trail
- **BR-RM-03 Project Margin** — Financials tab enhanced: shows Base Budget + Approved COs + Total Revenue + Est. Resource Cost (from allocations × weeks × user.costRate) + Gross Margin ($ and %) with green/amber/red colour coding based on margin %
- **DB** — `change_orders` table added and pushed; `isSoftAllocation` field already existed in schema

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

### P3 Time Tracking Polish (Quick Wins + Approvals Tab)
- **QW-5 Time categories seeded** — 8 categories inserted via API on first run: Implementation, Consulting, Analysis, Testing & QA, Documentation, Project Management, Training, Internal. Category picker in Log Time dialog is now functional.
- **QW-2 Daily totals row** — `<TableFooter>` row added at the bottom of the timesheet grid. Shows per-day column totals and grand total. Renders only when rows exist.
- **QW-3 Billable + category badges** — Each grid row now shows a green "Billable" or gray "Non-billable" chip, plus a violet category chip (when a categoryId is set). Chips sit below the project/task name in the first column.
- **QW-4 Task name resolution** — `useListTasks({})` (all tasks, no projectId filter) added to grid. Row info column now resolves `taskId → task.name`; falls back to description text if no task.
- **QW-1 Inline cell editing** — Each day cell is now a clickable button. Clicking opens a focused `<input type="number">` (step 0.5, max 24). On blur or Enter: creates, updates, or deletes the entry. Escape cancels. Locked for approved/submitted timesheets or cells with multiple overlapping entries.
- **QW-6 Lock on submit/approve** — `isLocked = status === "Submitted" || "Approved"` blocks cell editing. Lock is labeled in the footer ("Awaiting approval — withdraw to make changes" / "✓ Approved & locked"). **Withdraw** button (with `Undo2` icon) appears for Submitted state and PATCHes status back to Draft.
- **M-1 Approvals tab** — New "Approvals" tab in Time Tracking page (second position, with a blue badge showing pending count). Features:
  - Independent week navigation (prev/next)
  - Per-user table: avatar, name, department, submission status chip, total hours, capacity, utilization %, billable %
  - Utilization colored green ≥80%, amber ≥50%, red <50%
  - **Approve** / **Reject** inline buttons for Submitted timesheets
  - **Remind** button (toast) for Not Submitted / Draft users
  - **Eye** icon + name click opens detail Sheet (520px) showing summary cards, sorted entries table, approve/reject actions from within sheet
- **Log Time dialog enhanced** — Category dropdown now populated from `useListTimeCategories()`. Category selected is persisted to the time entry.

### P2 Tier 2 Feature Completions
- **P2-A/B Admin Users CRUD** — `+ Add User` button opens a dialog (name, email, role, dept, capacity, costRate). Each user row now has a `⋮` dropdown with Edit (pre-fills form) and Delete (confirm dialog). Both call backend `POST /api/users`, `PATCH /api/users/:id`, `DELETE /api/users/:id`. The ★ Skills button remains alongside the new ⋮.
- **P2-C Invoice edit/delete** — Invoice `⋮` dropdown now has two new items: **Edit** (opens dialog for description, amount, dueDate, status via `PATCH /api/invoices/:id`) and **Delete** (confirm dialog → `DELETE /api/invoices/:id`). Both backend routes added (`DELETE` was missing).
- **P2-D Projects Account Owner** — `useListUsers` added to projects.tsx; "Account Owner" column now resolves `ownerId → user.name` (was showing "—" for all rows).
- **P2-E Resources profile side-sheet** — Team member rows in Capacity tab are now clickable. Opens a `<Sheet>` with avatar, name, role, dept, email, three stat cards (capacity/utilization/available), cost rate, and skills via the existing `UserSkillsCell` component.
- **P2-F Timesheet last active week** — `TimesheetGrid` now auto-navigates to the last week with data on mount. Checks timesheets first (latest `weekStart`), then falls back to the latest time entry date if no timesheets exist. User 1 (Ops Leader) has entries through 2025-04-07, so the grid opens at "Apr 7 – Apr 13, 2025".
- **Backend DELETE routes added** — `DELETE /api/users/:id` (requireAdmin), `DELETE /api/invoices/:id` (requireFinance). Raw `fetch()` calls include `x-user-role: Admin` header to match the RBAC middleware.

### P1 UX Gap Closure (Quick Wins)
- **P1-A Logout button** — Sidebar user chip (bottom of sidebar) is now a `<DropdownMenu>`. Shows user name + email header, then a red "Log Out" item that reloads the app. `ChevronDown` arrow appears on hover. Wired to `window.location.href = "/"` (ready for real auth swap)
- **P1-B Notification links** — Bell popover rows and `/notifications` page rows are now clickable. Navigates to project (`/projects/:id`), finance (`/finance`), or time (`/time`) based on notification type + `projectId`. Marks read automatically on click. Added `notificationLink()` helper shared by both `layout.tsx` and `notifications.tsx`
- **P1-C Dismiss notifications** — `DELETE /api/notifications/:id` added to backend. Bell popover rows show a `✕` button on hover that dismisses instantly. Notifications page rows show a `✕` dismiss button on hover. Added "Clear read (N)" bulk button at the top of `/notifications` page
- **P1-D Converted prospect → account link** — `useListAccounts` added to prospects page. Dropdown `⋮` menu for Converted rows now has "View Account →" item. Detail sheet shows a green card "Converted Account" with the resolved account name + "View Account" button linking to `/accounts`
- **P1-E (already done)** — Time-off delete (trash icon per row) was already wired via `useDeleteTimeOffRequest`

### E2E Bug Fixes (Post-Seed Audit)
- **time.tsx timer crash** — `<SelectItem value="">None</SelectItem>` in Log Time category dropdown caused Radix to throw on empty string; replaced sentinel `"__none"` throughout initial state, SelectItem value, submission guard (`!== "__none"`), and form reset
- **Revenue report blank chart** — `reports.ts /reports/revenue` was limited to rolling 6-month window; expanded to 24 months so seeded Dec 2024–Apr 2025 invoices appear
- **Month format mismatch** — Both utilization and revenue `byMonth` were formatted as "MMM YYYY" (e.g. "Nov 2024") but frontend expected "YYYY-MMM" (e.g. "2024-Nov") for year-prefix extraction (`substring(0,4)`) and `startsWith` year filtering; fixed format to "YYYY-MMM" in both routes
- Revenue confirmed: $1,043,500 collected across Dec 2024–Apr 2025; `revenueYears` dropdown correctly extracts "2024"/"2025"; XAxis labels show "Dec", "Feb", etc. via `substring(5)`

### Sprint 6 Complete
- T001: Project Phases — "Edit Phase" and "Delete Phase" menu items now fully wired; `useUpdatePhase`/`useDeletePhase` mutations; Edit dialog (name/status/startDate/dueDate); Delete confirm dialog
- T002: Time Tracking — "Log Time" button opens dialog (project/date/hours/description/billable); `useCreateTimeEntry` mutation; "Start Timer" stopwatch button counts up in header and auto-fills hours when stopped
- T003: Resources Capacity — search bar (filters by name/role) + department dropdown filter above capacity table; IIFE-rendered filtered results
- T004: Notification Bell — replaced bare `<Link>` with `<Popover>`; shows last 6 notifications (unread highlighted, blue dot, timestamp via `timeAgo()`); "Mark all read" button; "View all notifications" footer link; `useMarkNotificationRead` + `getListNotificationsQueryKey` for cache invalidation
- T005: Finance Invoices — per-row `⋮` DropdownMenu with "View Details" + "Mark as [next-status]" (Draft→In Review→Approved→Paid); `useUpdateInvoice` mutation; `e.stopPropagation()` prevents row click from also opening detail
