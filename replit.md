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

### UI Polish — Low Priority (April 2026 Audit §6.5)
- **Sidebar section grouping** (VH-8): NAV_ITEMS split into `WORKSPACE_NAV` (Dashboard→Resources) and `ADMIN_NAV` (Finance/Reports/Admin); section labels + thin dividers in both desktop sidebar and mobile sheet drawer.
- **Sidebar collapse to icon rail** (US-14): Toggle button (ChevronLeft/Right) at top-right edge of sidebar. Collapsed state: 56px wide, icon-only nav with Tooltip labels on right hover; persisted in `localStorage("sidebarCollapsed")`. Full expanded state: 224px as before.
- **Tooltip-on-truncate component** (US-13): `artifacts/businessnow/src/components/ui/tooltip-cell.tsx` — `<TooltipCell value maxWidth />` wraps any text cell with truncation + tooltip on hover. Applied to Accounts domain column; em-dash fallback for null.
- **Resource Capacity skills column** (VH-6): `UserSkillsCell` truncated from top-4 to top-2 skills + "+N more" overflow pill (`resources.tsx`).
- **Dialog form section dividers** (US-10): Resource Request dialog (`add_member` flow) now has "Role & Skills" / "Schedule" / "Priority" horizontal rule + h3 section separators.
- **Bulk row actions** (US-8): Projects desktop table has a leading checkbox column (select-all header + per-row). When ≥1 row selected, a sticky floating action bar appears at the bottom: selected count · Export CSV · Archive · ✕ clear. CSV export downloads `projects.csv` with all visible columns.

### UI Polish (April 2026 Audit Quick Wins)
- **Shared StatusBadge** (`artifacts/businessnow/src/components/ui/status-badge.tsx`): single component with documented color map for all status types — project status, project health, account status, invoice status, resource request status, timesheet status, billing schedule status. Replaces all ad-hoc inline badge classes across pages.
- **Consistent page titles**: all page h1 elements use `text-2xl font-bold tracking-tight` (was `text-3xl`) across dashboard, admin, finance, accounts, projects, time, notifications, reports, resources, project-detail.
- **Projects list: clickable rows** — entire table row navigates to project detail; action cell stops propagation.
- **Route alias**: `/time-tracking` renders the same page as `/time` (nav label and URL now match).
- **User-friendly 404**: polished centered layout with helpful copy and "Back to Dashboard" button (removed developer-facing "did you forget to add the page?" message).
- **Global error toasts**: `artifacts/businessnow/src/lib/queryClient.ts` — QueryClient with `QueryCache.onError` handler shows a destructive toast for page-load failures; imported in App.tsx.
- **Tooltips on icon-only buttons**: added to MoreHorizontal/MoreVertical dropdown triggers in projects, accounts, finance; Previous/Next week nav and Edit/Delete entry buttons in time tracking.

### Roles & Permissions System

**Canonical four-role model** (Rocketlane-style, added April 2026):

| Canonical value | Level | Description | Legacy equivalents |
|-----------------|-------|-------------|--------------------|
| `account_admin` | 4 | Full access — account settings, user mgmt, cost rates | `Admin` |
| `super_user` | 3 | Broad project access; no core admin | `PM`, `Super User`, `Finance`, `Developer`, `Designer`, `QA` |
| `collaborator` | 2 | Limited internal user; no project creation / admin | `Collaborator`, `Viewer` |
| `customer` | 1 | External / portal-only; project-scoped read access | `Customer`, `Partner` |

**Key files:**
- `artifacts/api-server/src/constants/roles.ts` — `ROLES`, `ROLE_HIERARCHY`, `LEGACY_ROLE_MAP`, `resolveRole()`, `hasRole()` — source of truth for backend
- `artifacts/api-server/src/constants/permissions.ts` — `ACCOUNT_PERMISSIONS` (58 keys), `PROJECT_PERMISSIONS` (34 keys), `can(role, perm)`, `canOnProject(projectRole, perm)`, `requirePermission(perm)` Express middleware factory
- `artifacts/businessnow/src/lib/roles.ts` — identical role constants for the frontend; also exports `usePermissions(activeRole)` (coarse named booleans, kept for existing callers)
- `artifacts/businessnow/src/lib/permissions.ts` — full permission matrix mirror; exports `can()`, `canOnProject()`, `useAccountPermissions(activeRole)` (returns a bound checker function for clean JSX)
- `artifacts/api-server/src/middleware/rbac.ts` — `requireRole(minRole)`, `requireCanonicalRole(...roles)`, `requireAnyRole(...roles)` (legacy compat), named shortcuts: `requireAdmin`, `requirePM`, `requireFinance`, `requireCostRateAccess`, `blockPortalRoles`

**Transport:** role is sent as the `x-user-role` HTTP header on every request; injected via `setDefaultHeaders()` in the API client. Both legacy Title-Case values (`Admin`) and canonical snake_case values (`account_admin`) are accepted — `resolveRole()` normalises them at the middleware layer.

**User schema additions (April 2026):**
- `accountId` (integer, nullable) — tenant/org reference for future multi-account deployments; NULL = default single-tenant workspace
- DB column: `account_id` — added via `pnpm --filter @workspace/db run push`

**Project membership:** tracked via the `allocations` table (userId + projectId relation), not a stored array on users. Use the `listAllocations` API filtered by userId to get a user's projects.

**Important:** The RBAC middleware validates the `x-user-role` header value but does NOT verify it against a session — authentication is trust-based in the current dev setup. A real session layer (login form, JWT / cookie session) is not yet implemented.

### Key Pitfalls
- `lib/api-zod/src/index.ts` must only export `./generated/api` (Zod schemas) — re-exporting `./generated/types` causes duplicate name errors
- Drizzle returns JS `Date` objects for timestamp columns; all `map*` functions in API routes must convert these to ISO strings via `instanceof Date ? .toISOString() : value`
- Invoice `id` is a text PK with format "INV-YYYY-NNN"
- Express route ordering: specific sub-paths (e.g. `/projects/deleted`) MUST be declared before parameterised routes (e.g. `/projects/:id`) or they will be shadowed
- When adding fields to the API contract, update all four places: `lib/api-zod/src/generated/api.ts` + `types/createXBody.ts`, `lib/api-client-react/src/generated/api.schemas.ts`, then rebuild both dists (`tsc --build --force`)
- `lib/api-client-react/dist/index.d.ts` is the compiled declaration output — must rebuild after editing `custom-fetch.ts` or any generated schema file

### Phase 7 Complete — Reports Module Expansion (4 New Report Types)
- **New DB tables**: `key_events` (project_id, name, event_date, event_type) + `intervals` (project_id, name, start_event_id, end_event_id, benchmark_days); auto-backfilled from milestone tasks + project dates on first `/reports/interval-iq` call
- **Schema**: `lib/db/src/schema/intervalIq.ts`, exported from schema index
- **4 new API endpoints** appended to `artifacts/api-server/src/routes/reports.ts`:
  - `GET /reports/project-performance` — per-project: on-time rate (completed / completed+overdue), CSAT avg (from csat_surveys + csat_responses), template name, non-template task count, planned days, account name
  - `GET /reports/operations-insights` — grouped by template: on-time %, non-template ratio (scope creep %), CSAT avg, avg duration, project/completed counts
  - `GET /reports/csat-trend` — monthly avg rating trend from both csat_surveys (completedAt) + csat_responses (submittedAt), by-project breakdown, overall avg
  - `GET /reports/interval-iq` — intervals with actual vs benchmark days, overrun flag, delta; backfills key_events + intervals from existing data on first load
  - `POST /reports/interval-iq/events` + `POST /reports/interval-iq/intervals` — manual event/interval creation
- **Frontend** (`artifacts/businessnow/src/pages/reports.tsx`): 4 new tabs prepend the existing 5 (now 9 total):
  - **Performance tab** (default): 4 summary KPI cards + filterable table (search, status, health, template filter) + Export CSV; progress bars for on-time %, star ratings for CSAT, amber highlight for non-template tasks
  - **Operations tab**: Bar chart (on-time % vs scope creep % by template) + comparison table with % formatting and color thresholds
  - **CSAT Trend tab**: 3 summary cards + line chart with 4★ reference line + by-project breakdown table; empty state message
  - **Interval IQ tab**: 4 summary cards (overruns, on-time, avg delta) + bar chart (actual vs benchmark, red for overrun/green for on-time) + detail table with overrun badges
- **Shared utilities**: `downloadCSV()` function for browser-triggered CSV export; `StarRating` component; color constants for health/status

### Phase 6 Complete — Project Overview Health Stats + Updates Feature
- **DB**: Two new tables `project_updates` (id, project_id, subject, body, type, created_by_user_id, sent_at, created_at) and `update_recipients` (id, update_id, user_id, delivered_at)
- **Schema** (`lib/db/src/schema/projectUpdates.ts`): Drizzle schema for both tables; exported from schema index
- **Backend** (`artifacts/api-server/src/routes/projectUpdates.ts`):
  - `GET /projects/:id/health-stats` — returns overdue/blocked/at-risk/on-track counts + per-phase progress (completionPct, overdueTasks, totalTasks)
    - Overdue: tasks with `dueDate < today AND status != 'Completed' AND !isMilestone`
    - Blocked: tasks with `status = 'Blocked'`
    - At Risk: milestones with `dueDate > today` and due within 7 days and not Completed
    - On Track: non-milestone tasks `In Progress` with no overdue date
  - `GET /projects/:id/updates` — list updates (reverse-chron) with creator name + recipientCount
  - `POST /projects/:id/updates` — create update, auto-resolve template placeholders, insert `update_recipients` for team members, fire in-app notifications
  - Template placeholders: `{{milestones}}`, `{{overdue_tasks}}`, `{{pending_approvals}}` — resolved at send time from live DB data
- **Frontend** (`project-detail.tsx`):
  - **4 mini health stat cards** (Overdue/Blocked/At Risk/On Track) — clickable; clicking filters Tasks tab to show matching tasks; active card gets ring highlight; click again to clear
  - **Phase Progress** collapsible section in Tasks tab header — shows per-phase completion bar, task counts, overdue badge
  - **Active filter banner** in Tasks tab — shows filtered task list with clear button when a health card is active
  - **Updates tab** (9th tab, bell icon, count badge):
    - Compose form: subject, body (monospaced with template hint), audience selector (Internal/Client-facing)
    - Update history: reverse-chron list with audience badge, sender, timestamp, recipient count, body preview (monospaced)
  - Tab is now controlled (`value={activeTab}`) to allow programmatic switching via stat card clicks

### Phase 5 Complete — Authenticated Client Portal (`/portal/*`)
- **DB**: Added `portal_theme JSONB` to `accounts` table (primaryColor, accentColor, logoUrl, tabVisibility)
- **Backend** (`artifacts/api-server/src/routes/portalAuth.ts`):
  - `GET /portal-auth/projects` — returns projects where `x-user-id` is allocated; requires `x-user-role: Customer`
  - `GET /portal-auth/projects/:id` — customer-filtered detail (phases with `is_shared_with_client=true`, tasks with `visible_to_client=true`, milestones, documents); 403 if not allocated
  - `PATCH /portal-auth/tasks/:id/complete` — customer completes their own assigned task only
  - `GET /portal-auth/accounts/:id/branding` — read portal theme for an account
  - `PATCH /portal-auth/accounts/:id/branding` — update portal theme (Admin)
- **Role switching & header sync** (`current-user.tsx`):
  - `applyRoleHeaders(role, userId)` — updates `x-user-role` (and `x-user-id` for Customer) default headers whenever role switches
  - "Customer" added to `availableRoles` for all users
- **Route guard** (`App.tsx`):
  - `activeRole === "Customer"` + non-portal path → `<Redirect to="/portal/dashboard" />`
  - `activeRole !== "Customer"` + `/portal/dashboard` or `/portal/projects/*` → `<Redirect to="/" />`
- **Portal Dashboard** (`/portal/dashboard`): branded project cards with health badge, progress bar, dates; empty state if no projects
- **Portal Project** (`/portal/projects/:id`): collapsible phases, task list with "Assigned to you" badge + "Mark Done" button, milestone list, documents, color from portalTheme
- **Role redirect in sidebar** (`layout.tsx`): switching to Customer navigates to `/portal/dashboard`; switching away from Customer navigates to `/`
- **Admin portal branding** (`admin.tsx` → Settings tab): account selector, primary + accent color pickers (native `<input type="color">` + hex field), logo URL, tab visibility checkboxes, live swatch preview, save button

### Phase 4 Complete — Milestone CSAT Surveys (Auto-Trigger, Submit, Toggle)
- **DB**: Added `csat_enabled boolean` to `tasks` (default true); new `csat_surveys` table (`id, milestone_task_id, project_id, recipient_user_id, sent_at, rating, comment, completed_at, token UUID`)
- **Auto-trigger**: When any milestone task is marked Completed AND `csat_enabled=true` → `csat_surveys` record created + in-app notification sent to first project allocation member; duplicate-safe (one survey per milestone)
- **`GET /projects/:id/csat-surveys`** — list surveys with task name, status (pending/completed), rating, dates
- **`POST /csat-surveys/:id/submit { rating, comment }`** — submit 1–5 star rating; marks completedAt; sends "csat_submitted" notification
- **`PATCH /tasks/:id/csat-enabled { csatEnabled }`** — toggle per-milestone (Admin role)
- **`GET /projects/:id/csat-summary`** — now aggregates from both `csat_responses` + completed `csat_surveys`; adds `pendingSurveys` + `completedSurveys` counts
- **Enhanced CSAT tab**:
  - 4-card summary row: Average Score / Surveys Pending / Surveys Completed / Distribution
  - Milestone surveys list — green/amber dot, sent date, completion date, rating stars
  - "Submit Rating" button → dialog with interactive star picker + comment → submits survey
  - "CSAT On/Off" toggle per survey row (Admin action, fires `PATCH /tasks/:id/csat-enabled`)
  - Recent comments section shows written feedback from submitted responses
- **Verification**: regular task completion → no survey; milestone completion → survey created; disable CSAT → no survey on next completion; duplicate milestone completion → idempotent (no second survey)

### Phase 3 Complete — Interactive Timeline (Gantt) with Dependencies, Baselines & Shift Dates
- **`baselines` table** — `id, project_id, name, notes, snapshot_date, phase_snapshot JSONB, task_snapshot JSONB`; `GET/POST /projects/:id/baselines`, `DELETE /baselines/:id`
- **Circular dependency detection** — BFS from successorId; rejects with error before insert if a cycle would be created
- **Date cascade on dependency create** — when predecessor has a due_date, successor start_date/due_date pushed forward by 1+lagDays automatically
- **`POST /projects/:id/shift-dates { days, fromTaskId? }`** — shifts all tasks (or downstream only from a task), recalculates phase dates, optionally shifts project dates; requires PM role
- **Enhanced `/projects/:id/gantt`** — now returns `dependencies[]` array alongside rows for SVG arrows
- **Enhanced `project-gantt.tsx`** — full rewrite:
  - Zoom toolbar (Quarter / Month / Week / Day) with pixel-per-day scaling
  - SVG cubic-bezier dependency arrows (indigo) with arrowhead markers
  - Collapsible phase rows (click chevron to expand/collapse)
  - Today red-line marker
  - Baseline panel: "Baselines" toggle → baseline picker → grey overlay bars on task rows for comparison
  - "Save Baseline" dialog with custom name
  - "Shift Dates" modal: enter ±days, checkbox "Save baseline before shifting" auto-creates pre-shift snapshot
  - Rich tooltips on bars (name, dates, status, completion%, baseline dates)

### Phase 2 Complete — Template Engine with Relative Dates
- **Normalized schema**: Replaced JSON-blob `project_templates.phases` column with 3 normalized tables: `template_phases` (relativeStartOffset, relativeEndOffset, privacyDefault, order) and `template_tasks` (relativeDueDateOffset, effort, billableDefault, priority, assigneeRolePlaceholder, order)
- **tasks table**: Added `from_template boolean` and `applied_template_id integer` columns — all template-derived tasks are flagged for scope-creep tracking
- **Template API — full CRUD**:
  - `GET/POST /project-templates`, `GET/PUT/DELETE /project-templates/:id` (returns full nested phases+tasks)
  - `GET/POST /project-templates/:id/phases`, `PUT/DELETE /template-phases/:phaseId`
  - `GET/POST /template-phases/:phaseId/tasks`, `PUT/DELETE /template-tasks/:taskId`
  - `POST /project-templates/:id/apply { projectId, startDate }` — applies template to existing project, supports multi-template composition (call multiple times)
  - `POST /projects/from-template` — creates new project + phases + tasks from normalized template
- **Date logic**: `absolute_date = project.startDate + offset_days` (UTC calendar arithmetic, no timezone/weekend handling — documented gap)
- **Template editor UI** (Admin > Project Templates): Full slide-out Sheet editor with inline-edit template name/description, billing type, total duration, collapsible phase cards with offset sliders, add/edit/delete phases and tasks, assignee role placeholders, archive/restore
- **Apply Template modal** (Project detail header): Pick template → preview calculated dates for all phases and tasks → apply; supports multi-template composition
- **fromTemplate badge**: Purple "Template" badge shown on Kanban board task cards when `fromTemplate=true`
- **Create Project Wizard**: Updated to filter archived templates and use `totalDurationDays`
- **OpenAPI + codegen**: Added TemplatePhase, TemplateTask, ApplyTemplateBody, ApplyTemplateResult schemas; added `fromTemplate` + `appliedTemplateId` to Task schema; 8 new React Query hooks generated
- **Known gap**: No weekend/timezone handling in offset calculation (future sprint)

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

### Audit pass — Resource Mgmt & Capacity Planning (2026-04-23)
Ran the comprehensive audit checklist (`docs/comprehensive-audit-2026-04.md`). Critical/high gaps fixed:
- **Capacity-planning report (NEW)** — `GET /api/reports/capacity-planning?weeks=N` (max 52). Returns weekly buckets with `availableFTE`, `assignedDemandFTE` (named users), `unassignedDemandFTE` (placeholders), `totalDemandFTE`, `surplusFTE`, plus per-role `byRole[]`. New "Capacity Planning" tab on Reports page renders a stacked Demand-vs-Supply chart (ComposedChart: Available area + Assigned/Unassigned bars), CSV export, and a Role-level Surplus/Deficit table sorted worst-first.
- **Archived projects excluded from utilization** — `/resources/capacity` now filters allocations by `projects.deletedAt IS NULL`.
- **Resources page tab persisted** — `localStorage["resources.activeTab"]` (defaultValue, uncontrolled).
- False-positive in audit corrected: template allocations DO carry over (`projectTemplates.ts:642–696`).
- Backlog (documented in audit doc): per-placeholder Find Team Member, blocking Replacement Requests on auto-allocate projects, configurable FTE workweek, row-level GET ownership for Team Member role.
- Files: `artifacts/api-server/src/routes/allocations.ts`, `artifacts/api-server/src/routes/reports.ts`, `artifacts/businessnow/src/pages/reports.tsx`, `artifacts/businessnow/src/pages/resources.tsx`, `docs/comprehensive-audit-2026-04.md`.

### Sprint 14 — Saved Views (filter configurations)
- **DB**: New `saved_views` table (id, name, entity enum projects/people/resource_requests, filters JSONB, visibility private/public, createdByUserId, createdAt, updatedAt) with indexes on (entity) and (createdByUserId). Filters JSON shape: `{ matchMode: "all"|"any", conditions: [{ field, operator, value }] }`. Pushed via `cd lib/db && pnpm run push-force`.
- **API endpoints** (`savedViews.ts`): `GET /saved-views?entity=` (returns own private + all public, with `isOwner` flag), `POST /saved-views`, `PUT /saved-views/:id`, `DELETE /saved-views/:id`, `POST /saved-views/:id/duplicate` (creates a private copy owned by caller). All write routes require PM+. Permission model: owner can edit/delete their views; Admin/Super User can edit/delete public views. Current user identified via `x-user-id` header.
- **Header change**: `current-user.tsx` now sends `x-user-id` for ALL roles (previously only for Customer) so the server can attribute view ownership.
- **Filter engine** (`lib/filter-evaluator.ts`): pure helper module. `FieldDef` declares supported entity fields with type (text/enum/number/date/boolean) + options. `OPERATORS_BY_TYPE` maps each type to its valid operators (text: contains/equals/starts_with/is_empty…, enum: equals/not_equals, number: =/≠/>/≥/</≤, date: before/after/on, boolean: is_true/is_false). `evaluateFilters(items, fields, filter)` applies multi-condition filtering with Match All (AND) or Match Any (OR) logic.
- **SavedViewsBar component** (`components/saved-views-bar.tsx`): single reusable bar with view selector dropdown (My Views / Shared Views sections + "All items" + "Manage views…"), Filters button (opens condition builder dialog with stackable rows: field selector, operator selector, value input adapted to type, with Add/Remove condition + Match All/Any selector), Save / Save as new buttons (visibility = Private/Public dialog), and Manage Views dialog (rename via save, duplicate, delete with confirm). Modified-view indicator (•) shown when current filter diverges from active saved view. Hidden Save controls for Customer role.
- **Wired into**: Projects page (`pages/projects.tsx`, fields: name/status/health/internalExternal/startDate/endDate/budget) — additive to existing search + chip filters; People tab (`pages/resources.tsx → capacity tab`, fields: userName/department/role/utilizationPercent/capacity/available — department options computed dynamically from data); Resource Requests tab (`pages/resources.tsx → requests tab`, fields: status/role/skillName/hours/neededByDate). Saved view conditions compose with the page's existing inline filters (search box, status dropdown) — they intersect, never replace.
- **Performance note**: All filter evaluation happens client-side after initial list fetch (consistent with Projects/People/Requests pre-existing client-side filter pattern). Complex AND/OR stacks of 5–10 conditions on lists of <5k items run in a single render pass without measurable lag (single-pass O(items × conditions)). For larger lists or when conditions stack with computed-column conditions (e.g. utilization %), filter evaluation remains in-memory and fast because all per-row data is already memoized in the list query result. If list sizes grow beyond ~10k rows or filters move to columns the API doesn't return, the recommended evolution is to push selected condition kinds (status equals, date range) to the server via query params while keeping client-side evaluation for the rest.
- Files: `lib/db/src/schema/savedViews.ts` (new), `lib/db/src/schema/index.ts` (export), `artifacts/api-server/src/routes/savedViews.ts` (new), `artifacts/api-server/src/routes/index.ts` (mount), `lib/api-spec/openapi.yaml` (5 paths + SavedView/Filters/Condition/Create/Update schemas + savedViews tag), `artifacts/businessnow/src/lib/filter-evaluator.ts` (new), `artifacts/businessnow/src/components/saved-views-bar.tsx` (new), `artifacts/businessnow/src/contexts/current-user.tsx` (header change), `artifacts/businessnow/src/pages/projects.tsx` (wire bar), `artifacts/businessnow/src/pages/resources.tsx` (wire two bars).

### Sprint 13 — Project Templates: Resource Allocations
- **DB**: New `template_allocations` table (id, templateId, templatePhaseId, placeholderId, userId, role, relativeStartDay, relativeEndDay, hoursPerDay, allocationMethod, methodValue, isSoftAllocation). Uses 1-based inclusive day range (Day 1 = project start). Added `autoAllocate` boolean to `project_templates`. Pushed via `cd lib/db && pnpm run push-force`.
- **API endpoints** (`projectTemplates.ts`): `GET/POST /project-templates/:id/allocations`, `PUT/DELETE /template-allocations/:allocId`, `GET /project-templates/:id/allocations/summary` (per-role totalHours/personDays/allocations + grand totals). Validation: exactly one of placeholderId/userId required, end ≥ start, hpd > 0, integer days.
- **Auto-allocation on project creation**: `POST /projects/from-template` reads template.autoAllocate, sets project.autoAllocate, then converts each template_allocation → real allocation with absolute dates (Day N → startDate + (N−1) days). Placeholders copied as-is; named users skipped if inactive (warning collected). Returns `templateApplied: { allocationsCreated, allocationsSkipped, warnings }`.
- **Allocation response schema fix**: `Allocation` OpenAPI schema corrected to make `userId` nullable and add missing fields (`placeholderId`, `placeholderRole`, `hoursPerDay`, `totalHours`, `allocationMethod`, `methodValue`, `percentOfCapacity`, `isSoftAllocation`, etc.) so placeholder allocations no longer break `GET /allocations?projectId=`.
- **TemplateEditor UI** (`template-editor.tsx`): Added auto-allocate toggle to metadata grid (4 cols). New "Resource Allocations" section at bottom of editor with: Day-axis ruler (D1..DN with adaptive ticks), per-allocation rows showing assignee badge (purple=placeholder, secondary=user), role, day range, hpd, total, soft/hard, with a horizontal day-range bar visualization. Add form supports placeholder/named-user, role, day range, hpd, hard/soft. Inline edit + delete per row. Footer shows per-role summary badges (`Role: Xh (Ypd)`) plus grand totals from `/allocations/summary` endpoint.
- Files: `lib/db/src/schema/projectTemplates.ts` (new table + autoAllocate), `artifacts/api-server/src/routes/projectTemplates.ts` (5 new routes + project-from-template hook), `lib/api-spec/openapi.yaml` (TemplateAllocation schemas + 3 paths + Allocation fix), `artifacts/businessnow/src/components/template-editor.tsx` (AllocationsSection)

### Sprint 12 — Skills Competency Matrix & Skill-Based Search
- **Skills Matrix grid** (`Resources → Skills Matrix` tab): Full cross-tab grid — rows=team members (grouped by role), columns=skills (grouped by category). Cell shows color-coded proficiency badge (Beginner/Intermediate/Advanced/Expert). Click any cell → inline dropdown to set/update/remove proficiency. Group by toggle (Role / Category). Column category show/hide toggles. Name/role search filter. Live data from new `GET /user-skills` bulk endpoint. Refresh button.
- **PATCH /users/:id/skills/:skillId** (new): Upsert proficiency — updates if exists, inserts if new. Body: `{ proficiencyLevel }`.
- **GET /user-skills** (new): Bulk endpoint returning all user_skills with skill metadata (name, skillType, categoryId, categoryName) — avoids N+1 per-user fetches for the matrix.
- **Find Availability skill filter** (`Resources → People Timeline → Find Availability`): Added "Required Skills" chip-toggle multi-select — click skills to require them. Added "Min Proficiency" dropdown (Beginner+ / Intermediate+ / Advanced+ / Expert+). `runAvailSearch` enforces: user must have ALL selected skills with proficiency ≥ min threshold using PROFICIENCY_RANK map (Beginner=1, Intermediate=2, Advanced=3, Expert=4).
- **Skill-based candidate sorting** (`Resources → Resource Requests`): Candidate panel now loads all user-skills via `GET /user-skills`. For requests with `requiredSkills[]`, computes `matchScore` (count of matched skill names). Sorts: match score desc, then utilization pct asc. Shows `X/Y skills` badge per candidate — green=all, amber=partial, red=none. Legend row below panel when skills filter is active.
- **Required skills multi-select** (`Project detail → Request Resource dialog`): Replaced comma-separated text input with chip-toggle pill buttons loaded from `GET /skills`. Selected skills stored as `skillIds[]`, mapped to names on submit. Count indicator shows selection count.
- **Proficiency comparison logic**: `Beginner < Intermediate < Advanced < Expert` enforced numerically via PROFICIENCY_RANK in both Find Availability and candidate panel matching.
- **Skill type support**: Matrix renders Level (4-tier), Yes-No (Yes/No only), and Number (1–10) proficiency options based on skill's `skillType` field.
- Files: `artifacts/businessnow/src/components/skills-matrix.tsx` (new), `artifacts/api-server/src/routes/skills.ts`, `artifacts/businessnow/src/components/resource-timeline.tsx`, `artifacts/businessnow/src/pages/resources.tsx`, `artifacts/businessnow/src/pages/project-detail.tsx`

### Sprint 11 — Enhanced Resource Request Approval Workflow
- **6 request types**: `add_member`, `add_hours`, `assign_placeholder`, `replacement`, `shift_allocations`, `delete_allocation` — selectable in project-detail form with conditional field rendering per type
- **Candidate panel** (Resources → Requests): on Pending cards shows up to 5 team members matching role keyword with color-coded forecasted utilization (current hpw + proposed hpw vs capacity)
- **Ignore-soft toggle**: checkbox in requests toolbar excludes soft allocations from all utilization calculations across candidate panel and Assign dialog
- **Status filter**: dropdown filters request list by Pending/Approved/Blocked/Rejected/Fulfilled/Cancelled
- **Block action**: new "Block" button on Pending cards → dialog captures reason → PATCH `/api/resource-requests/:id/status` sets status=Blocked, stores `blockedReason`; notifies requester
- **Resubmit action**: "Resubmit" button on Blocked/Rejected cards → resets status to Pending
- **Chat thread**: "Chat" button on Pending/Blocked cards → inline thread using `resource_request_comments` table; GET/POST `/api/resource-requests/:id/comments`; real-time send on Enter
- **Enhanced Assign dialog**: shows forecasted utilization preview for selected candidate; confirm button disabled until user is selected
- **Auto-create allocation on Fulfill**: PATCH status→Fulfilled with assignedUserId → API auto-inserts allocation record using request dates/hoursPerWeek; toast says "allocation automatically created"
- **Relevant Matches panel** (project-detail dialog): filters existing users by role keyword → shows up to 3 matches already on the organization with capacity info
- **Type badge**: non-default request types shown as a small badge on each request card
- **Color-coded card borders**: amber=Pending, blue=Approved, red=Blocked
- DB: `resource_request_comments` table (id, requestId, userId, message, createdAt); extended `resource_requests` with type, region, blockedReason, targetResourceId, approverId, allocationMethod, methodValue
- Files: `artifacts/businessnow/src/pages/resources.tsx`, `artifacts/businessnow/src/pages/project-detail.tsx`, `artifacts/api-server/src/routes/resourceRequests.ts`, `lib/db/src/schema/resourceRequests.ts`

### Sprint 10 — Resource Management Timeline
- **Projects Timeline tab** (`Resources → Projects Timeline`): Gantt-style grid listing all projects that have allocations. Expand a project row → sub-rows per team member/placeholder each showing their allocation bars. Quarter/Month/Week/Day zoom. Thin summary bar on parent rows shows total active span.
- **People Timeline tab** (`Resources → People Timeline`): Same grid but person-centric. Expand a team member → project sub-rows. Shows current utilization % on parent row label. Over-allocated members marked with red dot.
- **Drag-to-move**: grab a bar body → shift start/end dates; releases PATCH `/api/allocations/:id` to persist.
- **Drag-to-resize**: grab left/right edge handle → extend or shrink duration; recalculate dates on release.
- **Click bar → edit panel**: right-side sheet with role, start/end, hpw fields + Save.
- **Split allocation**: scissors button on hover (or in edit panel) → deletes bar and POST two halves.
- **Color coding**: green ≤80%, amber 81–100%, red >100% capacity; soft allocations use diagonal stripe pattern; red threshold line at bottom of over-allocated people rows.
- **Find Availability** (People tab toolbar): enter date range + min hrs/day + role → highlights matching members, dims others; Clear Focus to reset.
- **Today marker**: vertical indigo line on both timeline tabs.
- Component: `src/components/resource-timeline.tsx` (~400 lines, pure React + TanStack Query).

### Sprint 9 (audit gap fills — Allocations & Placeholders)
- **Allocations module extensions** — `allocations` table now has `placeholderId` (FK), `hoursPerDay`, `totalHours`, `methodValue` columns; default `allocationMethod` is `"hours_per_week"`. POST/PATCH `/allocations` auto-derive hpd/hpw/total from `(allocationMethod, methodValue, dateRange, user.capacity)`: supported methods `total_hours`, `hours_per_day`, `hours_per_week`, `percentage_capacity`. Validation rejects (a) both userId+placeholder set, (b) neither set, (c) endDate < startDate.
- **Placeholders catalog** — new `placeholders` table (id, name, roleId, isDefault, accountId, createdBy); `GET/POST/PATCH /placeholders` (PM) and `DELETE /placeholders/:id` (Admin, blocks default rows). Admin > Placeholders tab provides catalog UI for create/list/delete.
- **Project auto-allocate** — `projects.autoAllocate` boolean (default false). When true, PATCH `/tasks/:id` adding new assignees auto-creates a soft allocation per newly-assigned user spanning task or project dates (skips users with overlapping active allocation). Toggle exposed in Project Edit dialog.
- **Cascade remove from project** — new `DELETE /projects/:projectId/users/:userId/allocations` endpoint removes all allocations for a user on a project (membership is implicit via allocations).

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

### Security Audit Complete (CRITICAL/HIGH/MEDIUM fixes)
- **CRITICAL — Customer/Partner portal-role block**: Global `blockPortalRoles` middleware applied to all `/api/*` routes (except `/api/portal-auth/*`). `x-user-role: Customer` or `Partner` now returns `403` on any internal endpoint; those roles can only call `/api/portal-auth/` routes.
- **CRITICAL — Rate cards authentication**: All 4 rate-card endpoints previously had zero auth. Now `GET/PATCH /rate-cards` requires Admin/Finance/PM (`requireCostRateAccess`); `POST/DELETE /rate-cards` requires Admin only (`requireAdmin`). Super Users are explicitly excluded per spec.
- **HIGH — Invoice GET endpoints**: `GET /invoices`, `GET /invoices/finance-summary`, and `GET /invoices/:id` now all require `requireFinance` (Admin or Finance). Previously any role could read financial data.
- **HIGH — Baseline delete guard**: `DELETE /baselines/:id` now requires `requirePM`. Previously unguarded — any internal user could destroy baseline snapshots.
- **HIGH — New RBAC roles**: `Super User` (level 75, PM-equivalent minus account settings/cost rates), `Collaborator` (level 45, Developer-equivalent without project creation rights), `Partner` (level 5, blocked from internal APIs like Customer) added to `AppRole` type and hierarchy.
- **MEDIUM — Document privacy by role**: `GET /documents`, `GET /documents/:id`, `PATCH /documents/:id`, `DELETE /documents/:id`, and `POST /documents` now enforce `spaceType=private` visibility. Only Admin/PM/Super User/Finance/Developer/Designer/QA may access private documents; Viewer and Collaborator see shared documents only.
- **MEDIUM — Task `privateNotes` field**: New `private_notes TEXT` column added to `tasks` table (SQL migration applied). Schema updated. `GET /tasks` and `GET /tasks/:id` redact `privateNotes → null` for non-PM roles (Viewer, Collaborator, etc.). All mutation routes already require PM+ so writes are already protected. Zod schemas (`ListTasksResponseItem`, `GetTaskResponse`, `UpdateTaskBody`, `UpdateTaskResponse`) updated with optional nullable `privateNotes` field.
- **DB** — `private_notes` column added to `tasks` table via direct SQL `ALTER TABLE`.

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

### M-2, M-3, L-2 — Project Time Tab, Admin Time Settings, Notification Wiring

**M-2: Project-level Tracked Time tab**
- Added "Time" tab to `project-detail.tsx` (after Timeline in the tab list)
- Fetches all time entries for the project via `useListTimeEntries({ projectId })`
- Shows 4 summary cards: Total Hours, Billable Hours, Billable Ratio %, Contributors
- "By Team Member" table: avatar, name, dept, total hours, billable hours, billable %, # entries (color-coded green/amber/red)
- "By Task / Work Item" table: resolves taskId → task.name, then falls back to description; same metrics

**M-3: Admin Time Settings**
- Added `timeSettingsTable` to DB schema (`lib/db/src/schema/timesheets.ts`): weeklyCapacityHours, workingDays, timesheetDueDay, approvalMode, globalLockEnabled, lockBeforeDate
- `drizzle-kit push` applied to PostgreSQL
- Added GET/PUT routes for `/api/admin/time-settings` in `adminSettings.ts` (upsert pattern, same as company-settings)
- Added "Time Settings" tab to Admin page with:
  - Weekly Capacity (number input)
  - Timesheet Due Day (dropdown Mon–Sun)
  - Approval Mode (Manual vs Auto)
  - Lock Periods Before Date (date picker)
  - Working Days (toggle buttons Mon–Sun, indigo for active)
  - Global Lock switch (inline toggle)
  - Save Changes button (disabled until dirty), shows last saved timestamp

**L-2: Notification Wiring**
- Added POST `/api/notifications` endpoint — accepts `{ type, message, userId, projectId, entityType, entityId }`
- Approve timesheet endpoint now inserts a `timesheet_approved` notification for the timesheet owner
- Reject timesheet endpoint now inserts a `timesheet_rejected` notification (with rejection note if provided) for the timesheet owner
- Remind button in Approvals tab now POSTs a `timesheet_reminder` notification to the target user before showing the toast; gracefully falls back to toast-only if the POST fails

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

### P3 Tier 3 Feature Completions

**P3-A: Won Opportunity — Linked Project Display**
- `mapOpportunity()` in `opportunities.ts` now fetches `projectName` from `projectsTable` when `projectId` is set
- `projectName` field added to `Opportunity` interface in `api.schemas.ts`
- Opportunity detail sheet: "Project ID" raw text replaced with a green card showing the project name and an arrow icon; clicking navigates to the project
- `convertMut.onSuccess` now stays on the sheet (no `setSelected(null)`); instead refetches the opportunity from `/api/opportunities/:id` and updates `selected` with fresh `projectId`+`projectName`

**P3-B: Projects List — Archive Recovery on Projects Page**
- Added "Show Archived" toggle button in Projects page header (top-right alongside New Project)
- When toggled, fetches `GET /api/projects/deleted` and renders an "Archived Projects" card below the main table
- Each archived row shows project name, archived date, and a "Restore" button that calls `POST /api/projects/:id/restore`
- Invalidates both `projects` and `projects-deleted` query keys on restore

**P3-C: Session Context — Replace Hardcoded CURRENT_USER_ID**
- New `src/contexts/current-user.tsx` — `CurrentUserProvider` fetches `GET /api/me` on mount, stores result in context; exposes `currentUser`, `isLoading`, `activeRole`, `availableRoles`, `switchRole`
- `GET /api/me` route added to `users.ts` — returns user with ID=1 (hydrated via `mapUser()`)
- `App.tsx` wrapped with `CurrentUserProvider` inside `QueryClientProvider`
- `layout.tsx` — user chip reads from `useCurrentUser()` for name, initials, email, role instead of hardcoded "Ops Leader"/"Admin"
- `time.tsx` — `const CURRENT_USER_ID = 1` removed; `currentUserId = currentUser?.id ?? 1` used in form resets and approval handler
- `task-detail-sheet.tsx` — `const CURRENT_USER_ID = 1` removed; `currentUserId = currentUser?.id ?? 1` used in comment creation

**P3-D: Sidebar User Chip — Role Switcher**
- `CurrentUserContext` exposes `activeRole` (persisted to `localStorage`) + `availableRoles` (primary + secondaryRoles) + `switchRole(role)` function
- Sidebar user chip dropdown shows "Switch Role" submenu (only when `availableRoles.length > 1`) with checkmark on current role
- `secondaryRoles: text("secondary_roles").array()` column added to `usersTable` schema and pushed to DB
- `Zod schemas updated`: `ListUsersResponseItem`, `GetUserResponse`, `UpdateUserResponse` now include `secondaryRoles`
- New `PATCH /api/users/:id/secondary-roles` endpoint in `users.ts` (Admin only) — accepts `{ secondaryRoles: string[] }` and persists array
- Admin → Users → **User Configuration** sub-tab: table of all users with their primary role badge + toggle buttons for each secondary role; clicking a role calls the new PATCH endpoint; saves immediately with toast feedback

### Documentation refresh — 2026-04-24

- Rewrote all 22 docs in `docs/` from template placeholders to real BusinessNow PSA content. All set to v1.0 / Approved (Risk Register marked Living) / 2026-04-24.
- `docs/index.md` — full registry rebuilt with real owners, paths, and current-phase summary; added pointers to `BusinessNow-PSA-Architecture.md` and the two 2026-04 audits.
- `docs/technical/01_system_architecture.md` — high-level summary of contract-first stack, RBAC roles, `authHeaders()` helper, dashboard v1, soft-delete capacity rule.
- `docs/technical/02_api_documentation.md` — full route inventory (30 files), auto-triggers, capacity-planning endpoint, codegen workflow.
- `docs/technical/03_database_schema.md` — 11-module map, ~60-table count, soft-delete + audit-log rules, schema-change workflow.
- `docs/technical/04_dev_environment_setup.md` — pnpm-only, the two active workflows (`API Server` :8080 and `Start application` :5000), troubleshooting.
- `docs/technical/05_security_and_compliance.md` — honest header-based auth posture, RBAC middleware, known gaps (no SSO, GET row-level filtering), incident-response.
- `docs/business/06_product_requirements_document.md` — current product surface (13 pages), functional + non-functional requirements, dashboard v1, success metrics.
- `docs/business/07_go_to_market_strategy.md` — internal rollout plan (not external GTM); adoption funnel, comms cadence, onboarding plan.
- `docs/business/08_business_model_canvas.md` — internal operating-model canvas; no external monetisation.
- `docs/business/09_competitive_analysis.md` — build-vs-buy rationale; categories not vendor names; re-evaluation triggers.
- `docs/product/10_product_roadmap.md` — NOW/NEXT/LATER/BACKLOG with recently shipped (60-day) summary.
- `docs/product/11_user_stories_and_epics.md` — 12 epics, stories tagged SHIPPED / NOW / NEXT / LATER; DoD aligned to RBAC + audit + codegen + `authHeaders()`.
- `docs/product/12_ux_research_brief.md` — Q2 2026 round: density redesign + audit prioritisation, internal-only recruiting.
- `docs/operations/13_team_structure_and_raci.md` — real 8.5 FTE shape (no dedicated DevOps/BA), RACI per work area.
- `docs/operations/14_sprint_plan_phase1.md` — repurposed to active Phase-2 plan (Sprints 13–17); Phase-1 (MVP) summarised in §9.
- `docs/operations/15_risk_register.md` — open + closed risks; recently-resolved items captured (clamp removal, capacity-planning, soft-delete capacity fix, `authHeaders` consolidation, period-selector lock, Resources tab persistence).
- `docs/legal-finance/16_project_charter.md` — first approved charter with sponsor sign-off; scope, deliverables, risks aligned with current state.
- `docs/legal-finance/17_budget_estimate.md` — first approved FY 2026 budget; $1.55M total incl. 15% contingency; aligned with the actual team in doc 13.

### Sprint 6 Complete
- T001: Project Phases — "Edit Phase" and "Delete Phase" menu items now fully wired; `useUpdatePhase`/`useDeletePhase` mutations; Edit dialog (name/status/startDate/dueDate); Delete confirm dialog
- T002: Time Tracking — "Log Time" button opens dialog (project/date/hours/description/billable); `useCreateTimeEntry` mutation; "Start Timer" stopwatch button counts up in header and auto-fills hours when stopped
- T003: Resources Capacity — search bar (filters by name/role) + department dropdown filter above capacity table; IIFE-rendered filtered results
- T004: Notification Bell — replaced bare `<Link>` with `<Popover>`; shows last 6 notifications (unread highlighted, blue dot, timestamp via `timeAgo()`); "Mark all read" button; "View all notifications" footer link; `useMarkNotificationRead` + `getListNotificationsQueryKey` for cache invalidation
- T005: Finance Invoices — per-row `⋮` DropdownMenu with "View Details" + "Mark as [next-status]" (Draft→In Review→Approved→Paid); `useUpdateInvoice` mutation; `e.stopPropagation()` prevents row click from also opening detail

### 2026-04-24 — Module 2 Remediation (PSA Audit 2.2 / 2.3 / 2.5)
- 2.2 Block time-logging on parent tasks
  - `routes/timeEntries.ts`: added `taskHasChildren()` helper; POST + PATCH return 400 with message "Cannot log time on a parent task. Log against an individual child task." when `taskId` has any child.
  - `components/timesheet-grid.tsx` + `components/tracked-time-tab.tsx`: parent tasks filtered out of all four task pickers (timesheet add/edit + tracked-time edit/add-on-behalf).
- 2.3 Logged-time rollup on parent tasks
  - `components/project-phases.tsx`: added `useListTimeEntries({ projectId })` + `hoursByTaskId` Map + `calcLoggedHours(node)` recursive sum; effort cell widened to `w-28` and now shows planned + logged hours stacked, both with extended "Auto-calculated" tooltip.
- 2.5 Drop separate Phases entity — Level-1 tasks ARE phases
  - DB: added `tasks.is_phase boolean DEFAULT false`; backfilled 18 Level-1 phase tasks from `phases`; re-parented 33 child tasks; finally dropped `tasks.phase_id` and the entire `phases` table.
  - Schema: deleted `lib/db/src/schema/phases.ts` + export; removed `phaseId` from `tasksTable`.
  - API: deleted `routes/phases.ts` + router registration; removed `/phases` and `/phases/{id}` paths from `openapi.yaml`; deleted `Phase` / `CreatePhaseBody` / `UpdatePhaseBody` schemas; `phaseId` swapped for `isPhase: boolean` (+ `parentTaskId`) on Task / CreateTaskBody / UpdateTaskBody; codegen re-run.
  - Server callsites switched off `phasesTable`: `baselines.ts`, `reports.ts`, `portalAuth.ts`, `projectUpdates.ts`, `projects.ts`, `projectTemplates.ts` (both apply-template and from-template instantiation paths now create Level-1 `is_phase=true` tasks and parent child tasks under them).
  - Frontend: `tracked-time-tab.tsx` no longer fetches `/api/phases`; "Phase" group-by now derives the top-level ancestor task. `project-phases.tsx` shows a "Phase" badge on rows where `task.isPhase === true`.
  - `template_phases` table (template-only concept) untouched.

### 2026-04-24 — Client Portal Removal
- Frontend deleted: `pages/portal.tsx`, `pages/portal-dashboard.tsx`, `pages/portal-project.tsx`. `App.tsx` rewritten — no portal imports, no `/portal/*` routes, no `isCustomer` redirect logic.
- Frontend touch-ups: `layout.tsx` `handleSwitchRole` no longer redirects Customer to `/portal/dashboard`; `page-header.tsx` dropped the `portal: "Customer Portal"` breadcrumb label; `task-detail-sheet.tsx` "Visible to Client" checkbox removed; `lib/roles.ts` `isPortalUser` permission helper removed; `pages/project-detail.tsx` removed `Share2`/`Copy`/`Check` imports, `listPortalTokens`/`createPortalToken` imports, `shareOpen`/`copied`/`creatingToken` state, the portal-tokens query + `handleCreateToken`/`handleCopyLink`, the "Share with Client" header button, and the entire share dialog.
- Admin: `pages/admin.tsx` "Client Portal Branding" Card + state (`portalBrandingAccountId`, `portalBrandingForm`, `portalBrandingDirty`) + queries + `savePortalBrandingMut` removed; Company Information description no longer mentions portal.
- Backend deleted: `routes/portal.ts` (token CRUD + `/portal/{token}` public endpoint) and `routes/portalAuth.ts` (Customer-scoped `/portal-auth/*` endpoints).
- Backend wiring: `routes/index.ts` no longer imports/mounts `portalRouter`/`portalAuthRouter` and the `/portal-auth/*` bypass + `blockPortalRoles` middleware are gone. `middleware/rbac.ts` `blockPortalRoles` function removed; `constants/permissions.ts` reference cleaned.
- Schema: deleted `lib/db/src/schema/clientPortal.ts` (`client_portal_access` table dropped); removed `clientPortal` export from `schema/index.ts`; dropped `accounts.portal_theme` column + `PortalTheme` type + `DEFAULT_PORTAL_THEME` constant + `jsonb` import from `accounts.ts`; dropped `tasks.visible_to_client` column from `tasks.ts`. Pushed via `pnpm --filter @workspace/db run push-force`.
- Templates: `routes/projectTemplates.ts` no longer writes `visibleToClient` on instantiated tasks (4 sites).
- API spec: removed `/projects/{id}/portal-tokens` (POST + GET), `/projects/{id}/portal-tokens/{tokenId}` (DELETE), `/portal/{token}` (GET) paths and `PortalToken` / `CreatePortalTokenBody` / `PortalMilestone` / `PortalDocument` / `PortalData` schemas; dropped `visibleToClient` from `Task`. Codegen re-run cleanly (`@workspace/api-client-react` + `@workspace/api-zod`).
- Verification: `/api/projects` 200; `/api/portal/abc123` 404; `/api/portal-auth/projects` 404; `/api/projects/1/portal-tokens` 404; `\d accounts` shows no `portal_theme`; `\d tasks` shows no `visible_to_client`; `\dt client_portal*` returns no relations. Customer role is no longer special-cased — header `x-user-role: Customer` now reaches `/api/projects` like any other role (the role enum is preserved as a vestigial value, but all portal-specific routing/blocking is gone).

### 2026-04-24 — Portal Removal Architect Remediation
Architect review (`evaluate_task` over portal-removal git diff) flagged one Critical and two Medium issues; all fixed in same session.
- **Critical — `customer` role no longer blocked from internal API.** Removing the global `blockPortalRoles` left no deny layer for Customer. Added `denyCustomerRole` middleware in `middleware/rbac.ts` (resolves header role → canonical, returns 403 if `customer`). Mounted globally in `routes/index.ts` immediately after `healthRouter` so health stays public but every other route is gated. Verified: `Customer`/`customer`/`Partner` → 403; `PM`/`Admin`/`Collaborator` → 200.
- **Medium — Customer still offered in role switcher.** `contexts/current-user.tsx` was force-adding `"Customer"` to `availableRoles` in two places. Removed both; switcher now only shows the user's primary + secondary roles.
- **Medium — `templatePhases.privacyDefault` became dead semantics** once `tasks.visible_to_client` and the portal were removed. Dropped column from `lib/db/src/schema/projectTemplates.ts` (DB pushed); removed `privacyDefault` field from `TemplatePhase` + `CreateTemplatePhaseBody` in `openapi.yaml` (codegen re-run); removed parsing/persistence in `routes/projectTemplates.ts` POST + PUT for `/template-phases`; removed Privacy Badge + Privacy Select + dialog Select + `phaseForm.privacyDefault` state + `PRIVACY_OPTIONS` constant from `components/template-editor.tsx`. `\d template_phases` confirms no `privacy_default`; `/api/project-templates` still returns 200.

### 2026-04-24 — Dynamic Role-Based Identity & Permission System (8-step Plan + Validation Audit Fixes)
- **T001 Role-claim middleware** (`middleware/roleClaim.ts`): for every request that isn't `/healthz` or `/me`, loads the user by `x-user-id`, returns 401 if missing/not-found/deactivated, 403 if `x-user-role` is not in `[primary, ...secondaryRoles]` (after legacy mapping). Mounted in `routes/index.ts` after `denyCustomerRole`. Verified: spoof on `/api/users` → 403 `Role "account_admin" is not assigned to user 1`; legitimate → 200; missing headers → 401.
- **T002 Self-approval guards**: `routes/timesheets.ts` `/approve` + `/bulk-approve`; `routes/changeOrders.ts` PATCH (status→approved); `routes/timeOff.ts` PATCH; `routes/resourceRequests.ts` `/status`. Each compares actor to requester/createdBy and returns 403 with a clear error before any state change.
- **T003 Audit-log expansion**: added `logAudit` to `users.ts` PATCH (role + secondaryRoles deltas) + DELETE; `projects.ts` DELETE + restore; `invoices.ts` status changes; `rateCards.ts` writes; `allocations.ts` DELETE. New `POST /api/audit/role-switch` endpoint (mounted in `routes/auditLog.ts`, open to any auth user) records `{from, to}` via `logAudit({entityType:"role_switch",...})`.
- **T004 Frontend route guard + Forbidden page**: `components/require-permission.tsx` wraps a route; if `!can(activeRole, permission)` renders `<Forbidden />`. `pages/forbidden.tsx` provides "Switch Role" (dispatches `open-role-selector` CustomEvent) + back-to-dashboard. `App.tsx` wraps `/admin`, `/finance`, `/reports`.
- **T005 Post-login role selector modal**: `components/role-selector-modal.tsx` (Dialog listing `availableRoles`); opens in `current-user.tsx` when `availableRoles.length > 1 AND !localStorage.activeRole`. UserChip dropdown gained "Switch Role" item that re-emits the event.
- **T006 Mid-session re-validation**: `current-user.tsx` polls `/api/me` every 60s via `setInterval`; if `activeRole` not in new `availableRoles` → reset to primary + toast "Your role was changed by an administrator"; if `activeStatus === "deactivated"` → clear localStorage + reload to landing.
- **T007 Permission matrix codification** (`lib/permissions.ts`): added self-scoped entries (`time.logOwn`, `time.viewOwn`, `tasks.viewAssigned`, `notifications.viewOwn`, `profile.editOwn`) to all 4 roles; comment block clarifies "never self-action" rule is enforced server-side (T002), not via the matrix.
- **T008 Validation-audit fixes**:
  - `routes/prospects.ts` POST/PATCH: Zod (name required, email format if present, ownerId int).
  - `routes/projectTemplates.ts` POST/PUT for templates + phases + tasks: minimal Zod (required name; numeric `effort`/`hoursPerDay` >= 0; phase `relativeEndOffset >= relativeStartOffset` enforced via `checkPhaseDateOrder` helper to avoid `.refine()` after `.partial()`); 3 PUT `.set()` calls cast `as any` to reconcile zod `.nullish()` with drizzle column types.
  - `routes/projects.ts` PATCH: 409 if `project.deletedAt` is set (soft-delete leak); POST/PATCH enforce `dueDate >= startDate`.
  - `routes/tasks.ts` POST/PATCH: enforce `dueDate >= startDate`.
  - `task-detail-sheet.tsx`: Effort input `min={0}` + clamp on commit.
  - `timesheet-grid.tsx`: hours cell clamped to `[0, 24]` in `handleCellSave`.
  - `accounts.tsx`: all 4 mutations now have `onError` destructive toasts + success toasts (added `import { toast } from "@/hooks/use-toast"`).
  - `create-project-wizard.tsx`: Zod `.refine()` for `dueDate >= startDate`.
- Build/runtime fixes folded in: added missing `import { logAudit } from "../lib/audit"` to `invoices.ts`; added `import { requirePM } from "../middleware/rbac"` to `timesheets.ts` (was throwing `ReferenceError: requirePM is not defined` on boot); added `"zod": "catalog:"` to `artifacts/api-server/package.json`; `Forbidden` route in `App.tsx` wrapped as `<Route path="/forbidden"><Forbidden /></Route>` (children form).

### 2026-04-24 — Identity & Permission Architect Remediation
Architect review of the 8-step plan flagged one critical and three high-severity issues; all fixed in same session.
- **Critical — `GET /me` returned hardcoded user 1.** Bypassed by `verifyRoleClaim`, the route then ignored `x-user-id` and always responded with user 1, undermining identity bootstrap and deactivation enforcement. Now reads `x-user-id`, validates `Number.isFinite > 0`, returns 401 if user not found or `activeStatus !== "active"`.
- **High — Self-approval guard ran AFTER `.update()` in `routes/changeOrders.ts` PATCH.** A self-approver could persist status changes (and project budget side-effects) even when the API responded 403. Moved the actor === submittedByUserId check to before the `db.update(...)` call.
- **High — Approval status PATCH endpoints lacked role authz.** `PATCH /time-off-requests/:id` and `PATCH /resource-requests/:id/status` were globally authenticated but anyone could approve/reject. Both now wrapped in `requirePM`. Added `import { requirePM } from "../middleware/rbac"` to `timeOff.ts` (already imported in `resourceRequests.ts`).
- **Medium — Role-switch audit integrity.** `POST /api/audit/role-switch` now resolves the actor via `x-user-id`, loads `role + secondaryRoles`, canonicalises both the request's `from` and `to` via `resolveRole`, and returns 403 if either is not in the actor's assigned set — preventing semantically false audit rows.
- Verified with curl: `/me` echoes the requested user; spoof on `/api/users` → 403; legitimate → 200; role-switch with foreign roles → 403, with assigned roles → 204; `/time-off-requests/1` PATCH without PM → 403 "Insufficient permissions".

### 2026-04-24 — E2E Quality Pass: Auth-Header Sweep + Audit Fix + Auth Gate

**Auth-header sweep** — every raw `fetch()` call across the frontend that was missing auth credentials has been patched to pass `authHeaders()` (or `authHeaders({...extraHeaders})`). Files updated:
- `pages/dashboard.tsx` — cr-impact fetch
- `pages/reports.tsx` — 9 report endpoints + export-async + saved-views POST (removed hardcoded `"x-user-id": "1"`)
- `pages/time.tsx` — time-settings, timesheet messages GET/POST, unapprove, bulk-approve, notification reminder
- `pages/notifications.tsx` — dismiss DELETE
- `components/timesheet-grid.tsx` — timesheet-rows GET, time-settings, row DELETE, row POST
- `components/task-detail-sheet.tsx` — dependencies GET, dependency POST, dependency DELETE
- `components/tracked-time-tab.tsx` — time-categories, callApi helper (replaced hardcoded `x-user-role: viewerRole`), time-entries PATCH + POST
- `components/layout.tsx` — notification dismiss DELETE
- `components/utilisation-heatmap.tsx` — allocations GET
- `components/resource-timeline.tsx` — user-skills GET
- `components/template-editor.tsx` — placeholders GET

**Audit action-type fixes** — `routes/projects.ts` line 233: `"shift_dates"` → `"updated"`; `routes/tasks.ts` line 100: `"auto_created"` → `"created"`. Both now conform to the `logAudit` action enum.

**Auth gate** (`App.tsx`) — Added `<AuthGate>` wrapper (reads `isLoading` from `CurrentUserProvider`) that renders `null` until the `/me` bootstrap completes. Eliminates the startup race condition where React Query fired queries before `applyRoleHeaders()` had set the default auth headers, causing 401 noise on first paint.

**Smoke test results** (all green):
- Valid request with assigned role → 200
- Header spoof (unassigned role) → 403
- Missing `x-user-role` header → 401
- `/me` without role header → 200 (bootstrap-exempt)
- Non-existent user → 401
- Self-approve timesheet → 403 "You cannot approve your own timesheet."
- Cross-approve (different user) → 200
- Role-switch audit endpoint → 204
- Dashboard on fresh load → zero 401 errors in browser console; all metric cards populated

### 2026-04-24 — Dynamic Role-Based Identity & Permission System (verification pass)

Verified end-to-end completion of the 8-step Dynamic Role-Based Identity & Permission System. All implementation pieces from the approved plan are in place:

**Backend (api-server)**
- `middleware/roleClaim.ts` — loads `users.role + secondaryRoles + activeStatus` for the `x-user-id`; rejects 401 (missing/invalid id, deactivated user) or 403 (claimed role not in assigned set). Mounted globally in `routes/index.ts` after `denyCustomerRole`. `/me` and `/healthz` are bootstrap-exempt.
- `routes/timesheets.ts` `/approve` (line 187) + `/bulk-approve` (line 280) — reject 403 when actor === timesheet owner.
- `routes/changeOrders.ts` PATCH (line 108) — reject 403 when actor === createdByUserId on transition to Approved.
- `routes/timeOff.ts` PATCH (line 93) — reject 403 when actor === request.userId.
- `routes/resourceRequests.ts` `/status` (line 120) — reject 403 when actor === requestedByUserId on Approved/Fulfilled/Rejected.
- `routes/auditLog.ts` `POST /audit/role-switch` — validates `from`/`to` against the actor's assigned roles, writes `entityType: "role_switch"` audit row.
- Audit-log expansion: `users.ts` (PATCH role + secondary-roles + DELETE + reactivate), `projects.ts` (DELETE + restore + shift-dates), `invoices.ts` (status changes), `rateCards.ts` (POST/PATCH/DELETE), `allocations.ts` (DELETE + cascade-delete).

**Frontend (businessnow)**
- `components/require-permission.tsx` — wraps a route; if `!can(activeRole, permission)` → renders `<Forbidden permission=...>`.
- `pages/forbidden.tsx` — friendly 403 page with "Back to dashboard" + "Switch role" (dispatches `open-role-selector` event when `availableRoles.length > 1`).
- `App.tsx` — `/admin`, `/finance`, `/reports` wrapped in `<RequirePermission>`.
- `components/role-selector-modal.tsx` — opens automatically for multi-role users on first visit (no `localStorage.activeRole`); listens for `open-role-selector` event; lists each role with description.
- `contexts/current-user.tsx` — bootstraps `/me`, persists `activeRole` to localStorage, applies `x-user-id` + `x-user-role` headers via `setDefaultHeaders()`. Re-validates every 60 s: deactivated → clear + reload; revoked role → reset to primary + toast.
- `lib/permissions.ts` — full account + project permission matrices, including `self.*` codified entries (`time.logOwn`, `time.viewOwn`, `tasks.viewAssigned`, `notifications.viewOwn`, `profile.editOwn`, `timeOff.requestOwn`); explicit "never self-action" comment block documenting server-enforced rules.

**Validation-audit fixes (T008)**
- `routes/prospects.ts` POST/PATCH — `ProspectBodySchema` Zod (name required, email format, ownerId int).
- `routes/projectTemplates.ts` — `TemplateBodySchema` / `TemplatePhaseBodySchema` / `TemplateTaskBodySchema` Zod (name required, numeric `effort`/offsets ≥ 0).
- `routes/projects.ts` PATCH — soft-delete leak guard (line 88: 409 if `existing.deletedAt`).
- `routes/projects.ts` POST/PATCH (lines 58/96) + `routes/tasks.ts` POST/PATCH (lines 129/170) — `dueDate >= startDate`.
- `task-detail-sheet.tsx` Effort input — `min={0}` + clamp on blur (line 286-294).
- `timesheet-grid.tsx` hours cell — `min="0" max="24"` + `Math.min(24, Math.max(0, parsed))` clamp in `handleCellSave` (line 296).
- `pages/accounts.tsx` create / edit / status / delete mutations — `onError` toasts with destructive variant.
- `components/create-project-wizard.tsx` — Zod `.refine()` enforces `dueDate >= startDate` (line 41).

**Smoke test results (all green, 2026-04-24 16:30 UTC)**
- `/api/healthz` (no headers) → 200.
- `/api/me` (no headers) → 200 (bootstrap-exempt).
- `/api/projects` (no `x-user-id`) → 401 "Authentication required".
- `/api/projects` (user 5 spoofing role "Admin") → 403 `Role "Admin" is not assigned to user 5`.
- `/api/projects` (user 1 with assigned role "Project Manager") → 200.
- `POST /api/audit/role-switch` (legitimate self-transition) → 204.
- `POST /api/audit/role-switch` (user 1 to unassigned "Admin") → 403 "Cannot log a role transition you are not assigned to".

### 2026-04-25 — Phase 2: Hours Model + Task Notes + Time→Task Linking

**Database (lib/db/src/schema/tasks.ts)**
- Added `plannedHours` (numeric 12,2) and `estimateHours` (numeric 12,2) columns to `tasksTable`.
- Created `taskNotesTable` (`id serial`, `task_id → tasks.id ON DELETE CASCADE`, `user_id → users.id`, `content text`, `created_at`, `updated_at`).
- `taskId` already existed on `timeEntriesTable` — now actively used.
- Schema synced via `cd lib/db && pnpm run push --force`.

**Backend (artifacts/api-server)**
- `routes/tasks.ts`: `mapTask` now returns `plannedHours`, `estimateHours`, `actualHours`, `etc` (`estimate − actual`), `eac` (`actual + |etc|`), all 2-decimal numbers. `getActualHoursMap` aggregates `time_entries.hours` grouped by `task_id` for the rows being returned. POST mirrors `plannedHours → effort` (back-compat) and defaults `estimate = planned`. PATCH accepts `plannedHours` / `estimateHours` pass-through.
- `routes/taskDetails.ts`: New routes `GET /tasks/:id/notes` (with users JOIN for `userName`, ascending `created_at`), `POST /tasks/:id/notes` (validates `content` + `userId`), `DELETE /tasks/:taskId/notes/:noteId` (note owner OR PM/Admin/Super User only — 403 otherwise).

**API spec / codegen (lib/api-spec/openapi.yaml)**
- `Task` schema gained `plannedHours / estimateHours / actualHours / etc / eac` (all required). `CreateTaskBody` + `UpdateTaskBody` accept optional `plannedHours / estimateHours`.
- `CreateTimeEntryBody.taskId` is now nullable; `projectId / billable` removed from required (only `userId / date / hours / description` required). `UpdateTimeEntryBody` accepts `taskId`.
- New `TaskNote` + `CreateTaskNoteBody` schemas; new paths `/tasks/{id}/notes` (GET/POST) and `/tasks/{taskId}/notes/{noteId}` (DELETE).
- Regenerated via `pnpm --filter @workspace/api-spec run codegen` → fresh hooks (`useListTaskNotes`, `useCreateTaskNote`, `useDeleteTaskNote`) and Zod schemas.

**Frontend (artifacts/businessnow)**
- `task-detail-sheet.tsx`: Replaced single "Planned Hours" input with a structured 5-field Hours section — two editable inputs (Planned, Estimate) over three readonly tiles (Actual / ETC / EAC). ETC tile turns red with an alert icon when negative. Each label/tile has a tooltip explaining the field. Parent/phase tasks show the auto-rollup banner instead of inputs. Added a new Notes section after Comments using the same layout pattern (Avatar + name + relative time + content) with delete (trash) visible to note owner or PM/Admin/Super User. Wired hooks + cache invalidation.
- `pages/time.tsx`: Log Time dialog now has an optional Task selector populated by `useListTasks({ projectId })`, filtered to leaf tasks only (no phases). Project change resets the task to "No task". `taskId` is sent to `createTimeEntry` only when a task is selected.
- `components/timesheet-grid.tsx`: Already had taskId support — no changes needed.

### 2026-04-25 — Phase 2 Architect Remediation

Fixes applied after architect code review:
- **PATCH /tasks/:id back-compat**: when a legacy client sends only `effort` (no `plannedHours`/`estimateHours`), the route now mirrors `effort` into both new fields so the hours model stays in sync. Verified: `PATCH {effort:99}` returns `effort:99, plannedHours:99, estimateHours:99`.
- **Notes POST identity binding**: `POST /tasks/:id/notes` now derives the author from the trusted `x-user-id` header (validated by `roleClaim` middleware) and ignores any `userId` in the request body, preventing impersonation. Returns 401 when missing.
- **Log Time leaf-task filter**: `time.tsx` was filtering using `parentId` but the task schema field is `parentTaskId`. Fixed the filter and also added an `isPhase` exclusion so phases never appear in the time-entry Task selector.
- **Stale task hours after time mutations**: `handleLogTime`, `handleSaveEntry`, and `handleDeleteEntry` in `time.tsx` now invalidate `["listTasks"]` (in addition to time-entry queries) so derived `actualHours/etc/eac` refresh in any open task views.

### 2026-04-25 — Phase 3: Budget Tracking (Revised Budget + Budget History)

**Database (lib/db/src/schema)**
- New `budgetEntriesTable` in `financials.ts` (`id serial`, `project_id integer`, `entry_date text`, `type text` ['SOW'|'CO'|'Adjustment'], `description text`, `amount numeric(15,2)`, `hours numeric(10,2)`, `document_link text`, `change_order_id integer`, `created_at timestamptz`).
- Added `documentLink text` column to `changeOrdersTable` for optional link to signed CR / SOW amendment.
- Schema synced via `cd lib/db && pnpm run push --force`.
- Backfill: one-time INSERT created an `'SOW'` row for every existing project with `budget > 0` (6 rows) using `start_date` and `budgeted_hours` so historical projects show correctly in Budget History.

**Backend (artifacts/api-server)**
- `routes/projects.ts`: new `GET /projects/:id/budget-entries` returns `{ totalAmount, totalHours, entries:[…] }` ordered by `entry_date, id` with cumulative `runningAmount` / `runningHours` per row. `POST /projects/:id/budget-entries` (requirePM) validates `entryDate / type / description`, stores with audit log entry. Negative amounts/hours allowed for Adjustments.
- `routes/changeOrders.ts`: PATCH approval block now also auto-inserts a budget entry of `type:'CO'` linked via `change_order_id` on the same approval transaction (alongside the existing project budget update, task creation, and resource request). Skipped only when both amount and hours are zero. Also added `documentLink` to POST + PATCH pass-through.

**API spec / codegen (lib/api-spec/openapi.yaml)**
- New `BudgetEntry`, `ProjectBudgetEntries`, `CreateBudgetEntryBody` schemas.
- New paths `/projects/{id}/budget-entries` (GET = `listProjectBudgetEntries`, POST = `createProjectBudgetEntry`).
- Regenerated via `pnpm --filter @workspace/api-spec run codegen`.

**Frontend (artifacts/businessnow/src/pages/project-detail.tsx)**
- Header **Budget Used** card replaced with **Revised Budget**: shows total revised budget as the headline, with a sub-line `SOW $X +COs $Y +Adj $Z` and `% used · $invoiced` underneath.
- New **Budget History** card in Financials tab — collapsible table of all entries with type badge (default/secondary/outline), date, description, signed amount, signed hours, running total, and document link. Footer row shows totals.
- New **Add Budget Entry** dialog (PM/Admin/Super User only) — date / type / description / amount / hours / optional document link. Defaults type to "Adjustment" since SOW/CO entries are auto-recorded.
- Change Request dialog gained an optional **Document Link** field (URL input, plumbed through `coForm` → payload → CO POST/PATCH). No "Project Name" or "Project ID" field existed to remove (project context is implicit from the URL).

**Phase 3 Architect Remediation (same day)**
- **Atomicity**: CO PATCH approval block now wraps project budget update + budget_entry insert + task creation + resource request creation in a single `db.transaction(...)` (drizzle-orm). All side-effects commit or roll back together.
- **Concurrent-approval idempotency**: The CO row update inside the transaction is conditional — `UPDATE … WHERE id=:id AND status != 'Approved' RETURNING …`. Only the winning request's update returns a row; losers skip the side-effects entirely. Verified by 5 concurrent PATCHes producing exactly one budget entry and one project budget delta.
- **Re-approval idempotency**: Added a unique constraint on `budget_entries.change_order_id` plus an explicit existence check at the top of the approval branch — if a budget entry already exists for this CO, all one-time side-effects (budget update, entry insert, task creation, resource request) are skipped. Crucially, the CO budget entry is now inserted **unconditionally** (even for zero amount/zero hours COs) so the row always exists to serve as the idempotency sentinel. Verified by both non-zero (`Approve → Submitted → Approve` leaves budget unchanged) and zero-value (`Approve → Submitted → Approve` produces exactly 1 budget entry, 1 task, 0 duplicate resource requests).
- **Manual budget-entry semantics**: `POST /projects/:id/budget-entries` now rejects any `type !== 'Adjustment'` with HTTP 400 (SOW seeded via backfill, CO inserted only by the changeOrders.ts transaction). The Add Budget Entry dialog locks the type field to "Adjustment" with helper text.
- **Frontend cache invalidation after CO mutations**: `handleSaveCR` and `handleUpdateCOStatus` in `project-detail.tsx` invalidate `getListProjectBudgetEntriesQueryKey`, `getGetProjectQueryKey`, and `getGetProjectSummaryQueryKey` so the Budget History card, Revised Budget header, and project summary refresh immediately when a CR is approved/edited. `handleUpdateCOStatus` also sends `approvedDate` when status flips to `Approved` so the budget entry's `entryDate` is correct.

### 2026-04-25 — Phase 4: Drag-and-Drop Task Reordering + Move-to Dialog

**Database (lib/db/src/schema/tasks.ts)**
- Added `sortOrder: integer("sort_order").notNull().default(0)` so siblings can have a deterministic ordering independent of insertion order. Pushed via `cd lib/db && pnpm run push --force`.

**Backend (artifacts/api-server/src/routes/tasks.ts)**
- `GET /tasks` now `.orderBy(asc(sortOrder), asc(id))` so the API returns tasks in user-controlled order.
- New `PATCH /tasks/reorder` (requirePM): accepts `{ updates:[{id,sortOrder,parentTaskId}] }`, wraps every per-row UPDATE in a single `db.transaction(...)`, audit-logs the bulk operation, returns `{ updated: N }`. Returns 400 for empty/invalid payloads, 403 for non-PM roles. Smoke-tested for all four cases (200/200/400/403).

**API spec / codegen (lib/api-spec/openapi.yaml)**
- Added `sortOrder` to `Task` (required), `CreateTaskBody`, and `UpdateTaskBody`.
- New `ReorderTasksBody` + `ReorderTasksResponse` schemas, new `/tasks/reorder` PATCH path with `reorderTasks` operationId.
- Regenerated → `useReorderTasks` hook now available (used via direct `fetch` in the front-end so we can pair it with `authHeaders`).

**Frontend (artifacts/businessnow/src/components/project-phases.tsx)**
- Installed `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` in the businessnow workspace.
- Each task row now has a leading ⠿ drag handle (lucide `GripVertical`) wired to `useSortable`. The visible flattened tree (respecting expand/collapse) is the `SortableContext` items list. A `DragOverlay` shows the row name as the drag preview.
- **Optimistic pending state**: `pendingChanges: Map<id,{sortOrder,parentTaskId}>` overlays the server task list via `applyPending()` so the UI updates immediately without waiting for the network. `changeHistory: PendingMap[]` snapshots each operation for undo.
- **Drop logic** (`computeReorderUpdates`): default new parent is the parent of the row above the drop position; if `delta.x ≥ 24` the dropped row becomes a child of the row above; if `delta.x ≤ -24` and the row above has a parent, the dropped row promotes to its grandparent. Cycle protection rejects any move that would make a task a descendant of itself. Both the new parent's sibling group and the old parent's sibling group are renumbered to sequential `sortOrder`s.
- **Sticky unsaved-changes bar**: amber pill showing `● N unsaved changes · K steps can be undone (⌘Z)` with `[Undo] [Discard] [Save]`. `Save` calls `PATCH /tasks/reorder` then invalidates `getListTasksQueryKey({projectId})`. `Discard` clears pending state and re-fetches. **Cmd/Ctrl+Z** (when not focused on input/textarea) pops the last snapshot.
- **"Move to…" context menu** (per-row dropdown): opens a Dialog with a `Command` palette (cmdk) for searchable parent picking. Per Step 5: query is invalidated before the dialog opens; "Top Level (no parent)" is the first option; the moving task and all its descendants are excluded. Per Step 6: remaining options are grouped under each ancestor `isPhase` task (or "Other"). Confirming queues a pending change that places the task at the end of the new parent group; the user then commits via the unsaved bar.
