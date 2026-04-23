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

### Sprint 6 Complete
- T001: Project Phases — "Edit Phase" and "Delete Phase" menu items now fully wired; `useUpdatePhase`/`useDeletePhase` mutations; Edit dialog (name/status/startDate/dueDate); Delete confirm dialog
- T002: Time Tracking — "Log Time" button opens dialog (project/date/hours/description/billable); `useCreateTimeEntry` mutation; "Start Timer" stopwatch button counts up in header and auto-fills hours when stopped
- T003: Resources Capacity — search bar (filters by name/role) + department dropdown filter above capacity table; IIFE-rendered filtered results
- T004: Notification Bell — replaced bare `<Link>` with `<Popover>`; shows last 6 notifications (unread highlighted, blue dot, timestamp via `timeAgo()`); "Mark all read" button; "View all notifications" footer link; `useMarkNotificationRead` + `getListNotificationsQueryKey` for cache invalidation
- T005: Finance Invoices — per-row `⋮` DropdownMenu with "View Details" + "Mark as [next-status]" (Draft→In Review→Approved→Paid); `useUpdateInvoice` mutation; `e.stopPropagation()` prevents row click from also opening detail
