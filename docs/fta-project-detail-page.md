# Functional & Technical Analysis: Project Detail Page (`/projects/:id`)

**Platform:** BusinessNow PSA — KSAP Technology  
**Document type:** BRD + FSD + Technical Design (Consolidated)  
**Page URL pattern:** `/projects/1` (parametric — works for any integer project ID)  
**Reference project:** FrostLine WMS Implementation (project ID 1)  
**Framework:** 16-Point Element Analysis  
**Date:** May 2026  

---

## Table of Contents

1. [Page Architecture & Bootstrap](#1-page-architecture--bootstrap)  
2. [Page Header — Breadcrumb](#2-page-header--breadcrumb)  
3. [Page Header — Title, Status Badge & Health Badge](#3-page-header--title-status-badge--health-badge)  
4. [Page Header — Description](#4-page-header--description)  
5. [Page Header — Action Buttons (Apply Template / Edit Project)](#5-page-header--action-buttons)  
6. [KPI Card — Revised Budget](#6-kpi-card--revised-budget)  
7. [KPI Card — Hours Used](#7-kpi-card--hours-used)  
8. [KPI Card — Completion](#8-kpi-card--completion)  
9. [KPI Card — Timeline](#9-kpi-card--timeline)  
10. [Health Stat Cards (Overdue / Blocked / At Risk / On Track)](#10-health-stat-cards)  
11. [Tab Navigation Bar](#11-tab-navigation-bar)  
12. [Tasks Tab — ProjectPhases Component](#12-tasks-tab)  
13. [Team & Allocations Tab](#13-team--allocations-tab)  
14. [Allocation Dialog (Add / Edit)](#14-allocation-dialog)  
15. [Financials Tab — Budget Ledger Sub-section](#15-financials-tab--budget-ledger)  
16. [Financials Tab — Cost Entries Sub-section](#16-financials-tab--cost-entries)  
17. [Financials Tab — Asset Bookings Sub-section](#17-financials-tab--asset-bookings)  
18. [Change Requests Tab](#18-change-requests-tab)  
19. [CSAT Tab](#19-csat-tab)  
20. [Documents Tab](#20-documents-tab)  
21. [Timeline / Gantt Tab](#21-timeline--gantt-tab)  
22. [Time Tab](#22-time-tab)  
23. [Updates Tab](#23-updates-tab)  
24. [RAID Tab](#24-raid-tab)  
25. [Edit Project Dialog (incl. Status Change Reason Intercept)](#25-edit-project-dialog)  
26. [Global Error, Loading & Empty States](#26-global-error-loading--empty-states)  

---

## 1. Page Architecture & Bootstrap

### 1.1 Element Name & UI Type
Server-rendered React SPA page (`pages/project-detail.tsx`, 3 592 lines). Single-component shell that owns all tab state, dialog state, and query orchestration for the entire project context.

### 1.2 Business Purpose
Serves as the single pane of glass for a project — consolidating financial health, task progress, resource allocation, change control, CSAT, and communication into one authenticated, permission-aware view. All downstream project work surfaces here rather than in separate module pages.

### 1.3 User Interaction Behaviour
On navigation to `/projects/:id`, the component:
1. Reads `projectId` from the Wouter route parameter via `useParams()`.
2. Fires parallel React Query fetches for project base record, summary metrics, and health stats.
3. Renders a spinner/skeleton until the project base record resolves.
4. Renders the full chrome (header + KPI row + health row + tab bar) and lazy-renders the active tab's content.
5. The URL hash `?tab=<name>` is read on mount and drives the initial active tab; tab clicks push a new query string entry without a full page reload.

### 1.4 Triggered Actions & Navigation Flow
- Entering `/projects/1` → parallel fetch of `GET /api/projects/1`, `GET /api/projects/1/summary`, `GET /api/projects/1/health-stats`.
- Any tab click → `setActiveTab(tab)` + `router.push` with `?tab=` param.
- Browser back/forward → tab state restored from URL.
- 404 from `GET /api/projects/:id` → user redirected to `/projects` with an error toast.

### 1.5 Exact Source of Data
| Query | Endpoint | Cache key |
|---|---|---|
| Project record | `GET /api/projects/:id` | `["project", projectId]` |
| Summary metrics | `GET /api/projects/:id/summary` | `["project-summary", projectId]` |
| Health stats | `GET /api/projects/:id/health-stats` | `["health-stats", projectId]` |

### 1.6 Upstream / Downstream Dependencies
**Upstream:** Auth bootstrap (`GET /me`) must complete before any project fetch; blocked by `AuthGate` in `App.tsx`. Active role (`x-user-role`) must be included in every request header.  
**Downstream:** Every tab component within the page depends on `projectId` and `viewerRole` props drilled from this parent.

### 1.7 Calculation Logic
`isPM` boolean is computed once at the page level:
```
isPM = hasRole(viewerRole, "super_user")
```
`hasRole` uses the `ROLE_HIERARCHY` map (account_admin=4, super_user=3, collaborator=2, customer=1). The check is `ROLE_HIERARCHY[viewerRole] >= ROLE_HIERARCHY["super_user"]` — i.e. both `super_user` and `account_admin` pass.

### 1.8 Event Chain
Bootstrap race: `AuthGate` polls `GET /me` every 60 s. On first success it sets `currentUser` in React context, which unblocks React Query's `enabled` flags across all child queries.

### 1.9 Data Modification Logic
The page shell itself performs no writes. All mutations are delegated to dialog components or inline tab controls.

### 1.10 Connected Menus / Modules / Workflows
- Global notification bell (layout) refreshes on project status change (server-side push via `project_status_changed` notification type).
- Sidebar nav link `Projects` stays highlighted when on any `/projects/*` route (via Wouter `useRoute`).
- Command palette (`Cmd/Ctrl-K`) can navigate here via "Open project" quick action.

### 1.11 Permissions & Visibility
`customer` role → blocked globally by `denyCustomerRole` middleware before request reaches the route handler (HTTP 403). `collaborator` → read-only (no add/edit/delete buttons rendered). `super_user`/`account_admin` → full UI.

### 1.12 Validation & Exception Handling
- Non-integer `:id` in URL → 400 from API; React Query `onError` fires global error toast.
- Deleted project (`deletedAt` set) → `GET /api/projects/:id` still returns the record (soft-delete pattern) but `PATCH` returns 409 `"Project is deleted"`.
- `staleTime: 30 000` ms on all project queries to avoid over-fetching during tab switching.

### 1.13 Backend / API / DB Assumptions
- `projectsTable` PK is integer, auto-increment.
- All timestamp columns return ISO strings (Drizzle `Date` objects serialised via `instanceof Date ? .toISOString() : value` mapper in `mapProject`).
- `GET /api/projects/:id` uses `mapProject(p, trackedHours)` which computes `health` auto-colour if `p.health` is null (green/amber/red based on days-to-due).

### 1.14 Audit Trail
No direct audit write at page load. All mutations within the page log to `audit_log` with `entityType: "project"` and `entityId: projectId`.

### 1.15 UI/UX Behaviour
- Full-page loading spinner (`<Loader2 className="animate-spin">`) centred in viewport while base project fetch is in-flight.
- Error state: `<Card>` with destructive title + "Back to Projects" button if project fetch fails.
- Page title (`document.title`) is set to `"${project.name} — BusinessNow"` after load.

### 1.16 Testing Scenarios
| ID | Scenario | Expected |
|---|---|---|
| PA-01 | Navigate to `/projects/1` as `account_admin` | Full page renders with all tabs visible |
| PA-02 | Navigate to `/projects/9999` (non-existent) | API 404 → error card with back button |
| PA-03 | Navigate as `customer` | `denyCustomerRole` returns 403 before page loads |
| PA-04 | Navigate to `/projects/1?tab=finance` | Financials tab is active on mount |
| PA-05 | Auth token expires mid-session | 60-s re-validation poll re-bootstraps identity silently |
| PA-06 | Navigate as `collaborator` | Page loads; all write buttons hidden |

---

## 2. Page Header — Breadcrumb

### 2.1 Element Name & UI Type
Breadcrumb navigation — horizontal text link chain rendered inside `<PageHeader>` component, above the project title.

### 2.2 Business Purpose
Provides spatial orientation and one-click return to the Projects list without using the browser back button, supporting non-linear navigation patterns common in project managers who jump between project detail and the list view frequently.

### 2.3 User Interaction Behaviour
Clicking the "Projects" crumb navigates to `/projects` (the project list). Clicking the project name crumb (current page) is a no-op (it is a non-linked span). The breadcrumb is always visible regardless of which tab is active.

### 2.4 Triggered Actions & Navigation Flow
`<Link to="/projects">` rendered by Wouter — no API call. Instant client-side navigation. React Query cache for the project list is already warm if the user arrived via the list, so the list re-renders from cache without a network round trip.

### 2.5 Exact Source of Data
`project.name` from the `GET /api/projects/:id` response. The "Projects" label is a hard-coded string. Rendered as: `Projects / {project.name}`.

### 2.6 Upstream / Downstream Dependencies
Depends on `project` query resolving (shows placeholder `"..."` while loading). No downstream effect on data.

### 2.7 Calculation Logic
None — pure display.

### 2.8 Event Chain
Project name resolves → `<PageHeader breadcrumbs={[…]}/>` re-renders with actual name replacing the placeholder.

### 2.9 Data Modification Logic
None.

### 2.10 Connected Menus / Modules / Workflows
The "Projects" crumb links to the same view as the sidebar "Projects" nav item.

### 2.11 Permissions & Visibility
Visible to all authenticated roles. Breadcrumb text is read-only for all users.

### 2.12 Validation & Exception Handling
If `project.name` is undefined (fetch still pending), the crumb renders an em-dash placeholder. If the project name is very long, CSS `truncate` prevents layout overflow.

### 2.13 Backend / API / DB Assumptions
`project.name` is a `varchar(255)` NOT NULL column in `projectsTable`.

### 2.14 Audit Trail
None.

### 2.15 UI/UX Behaviour
Separator character `/` rendered between crumbs. Current page (project name) rendered in a muted, non-clickable style. Crumbs are rendered inside `<PageHeader>` which applies `text-sm text-muted-foreground` styling.

### 2.16 Testing Scenarios
| ID | Scenario | Expected |
|---|---|---|
| BC-01 | Click "Projects" crumb | Navigate to `/projects` |
| BC-02 | Project name is 200 chars | Crumb truncates with ellipsis, no layout break |
| BC-03 | Project fetch pending | Em-dash placeholder in crumb |

---

## 3. Page Header — Title, Status Badge & Health Badge

### 3.1 Element Name & UI Type
Compound header row: `<h1>` title text + `<StatusBadge status={project.status}>` + `<StatusBadge status={project.health}>` (both inline pill badges). Rendered inside `<PageHeader>`.

### 3.2 Business Purpose
Instant at-a-glance project identity. Status badge communicates lifecycle state (Draft / Active / On Hold / Completed / Cancelled) while health badge communicates risk posture (Green / Amber / Red) — two orthogonal dimensions that drive different stakeholder actions.

### 3.3 User Interaction Behaviour
Title and badges are purely informational — no click action. Status can only be changed through the Edit Project dialog (element 25). Health can only be changed through the Edit Project dialog or resets automatically on next `GET /api/projects/:id` if `health` column is null.

### 3.4 Triggered Actions & Navigation Flow
None — display only.

### 3.5 Exact Source of Data
- Title: `project.name` — `projectsTable.name`
- Status: `project.status` — `projectsTable.status` (text column; values: `Draft`, `Active`, `On Hold`, `Completed`, `Cancelled`)
- Health: `project.health` — `projectsTable.health` (nullable text; values: `Green`, `Amber`, `Red`, or null → auto-computed)

### 3.6 Upstream / Downstream Dependencies
Health auto-computation in `mapProject` (server-side): if `p.health` is null, the server derives it:
- `daysLeft <= 0` → `"Red"`
- `daysLeft <= 14` → `"Amber"`
- `else` → `"Green"`
where `daysLeft = ceil((dueDate - now) / 86 400 000)`.

### 3.7 Calculation Logic
Health auto-colour (server, `mapProject`, line 48–60 of `projects.ts`):
```
if health is null:
  daysLeft = ceil((project.dueDate - now) / 86400000)
  if daysLeft <= 0  → health = "Red"
  else if daysLeft <= 14 → health = "Amber"
  else → health = "Green"
```
When `project.health` is explicitly set (non-null), the stored value takes precedence.

### 3.8 Event Chain
Project PATCH with new `health` value → `projectsTable` updated → `GET /api/projects/:id` refetch triggered by React Query `invalidateQueries(["project", projectId])` → badge re-renders with new colour.

### 3.9 Data Modification Logic
`health` is updated via `PATCH /api/projects/:id` body `{ health: "Red" }`. `status` is updated via `PATCH /api/projects/:id` body `{ status: "Active", statusChangeReason: "…" }` (status change intercept — see element 25).

### 3.10 Connected Menus / Modules / Workflows
- Health badge colour is the same `<StatusBadge>` component used in the Projects list, ensuring visual consistency.
- Status change fires `project_status_changed` notification to all allocated users (fire-and-forget async worker in the PATCH route).

### 3.11 Permissions & Visibility
Title: visible to all. Badges: visible to all. Neither badge is interactive — mutation is gated behind the Edit Project dialog which requires `super_user` or higher.

### 3.12 Validation & Exception Handling
`<StatusBadge>` handles unknown status/health strings gracefully with a neutral grey pill rather than throwing. Missing `project.health` is server-resolved before the response reaches the client.

### 3.13 Backend / API / DB Assumptions
`health` column: `text`, nullable, no DB enum constraint — validation is purely application-level. `status` column: `text`, NOT NULL, default `"Draft"`.

### 3.14 Audit Trail
Status changes are logged with `action: "status_changed"`, `previousValue: { status: old }`, `newValue: { status: new, reason }`. Health changes are logged as part of the general `action: "updated"` audit row on PATCH.

### 3.15 UI/UX Behaviour
`<StatusBadge>` renders coloured pills:
- Status → `Draft`: grey, `Active`: indigo, `On Hold`: amber, `Completed`: green, `Cancelled`: red
- Health → `Green`: green, `Amber`: amber, `Red`: red
Badges sit inline with the `<h1>` in a flex row with `gap-2`.

### 3.16 Testing Scenarios
| ID | Scenario | Expected |
|---|---|---|
| SH-01 | project.health is null; dueDate is past | Server returns health "Red" |
| SH-02 | project.health is null; dueDate is 10 days away | Server returns health "Amber" |
| SH-03 | project.health = "Green" explicitly set | Stored value returned regardless of due date proximity |
| SH-04 | project.status = "Completed" | Green "Completed" badge displayed |
| SH-05 | Unknown status value "Archived" | StatusBadge renders neutral grey pill, no crash |

---

## 4. Page Header — Description

### 4.1 Element Name & UI Type
Single-line or multi-line plain text paragraph (`<p>` element) rendered below the title/badge row in the page header.

### 4.2 Business Purpose
Provides the project's elevator pitch — scope, client context, or delivery mandate — giving visitors immediate context without opening the Edit dialog. Acts as a living description that PMs update as scope evolves.

### 4.3 User Interaction Behaviour
Read-only in the header. Clicking "Edit Project" opens the edit dialog where the description field is an editable `<Textarea>`.

### 4.4 Triggered Actions & Navigation Flow
None directly from the description display. Edit flow described in element 25.

### 4.5 Exact Source of Data
`project.description` — `projectsTable.description` (text, nullable).

### 4.6 Upstream / Downstream Dependencies
No downstream computed fields depend on description. It is a pure descriptive attribute.

### 4.7 Calculation Logic
None.

### 4.8 Event Chain
Project edit PATCH with `{ description: "…" }` → React Query invalidation → `GET /api/projects/:id` refetch → description paragraph re-renders.

### 4.9 Data Modification Logic
Updated via `PATCH /api/projects/:id`. No length enforced at DB level; Zod schema on the API validates `description` is a string if provided.

### 4.10 Connected Menus / Modules / Workflows
Description appears in the project context sent to the AI resource-suggestion endpoint (`POST /api/resources/suggest`) as background context.

### 4.11 Permissions & Visibility
Visible to all. If `description` is null, the paragraph is omitted (no "No description" placeholder).

### 4.12 Validation & Exception Handling
No minimum length. If null/undefined, the header renders without the `<p>` element (conditional render).

### 4.13 Backend / API / DB Assumptions
`projectsTable.description` is `text` nullable. No full-text index.

### 4.14 Audit Trail
Description changes are included in the general `action: "updated"` audit row.

### 4.15 UI/UX Behaviour
`text-muted-foreground text-sm` styling. No character limit shown in header. Long descriptions wrap naturally.

### 4.16 Testing Scenarios
| ID | Scenario | Expected |
|---|---|---|
| DE-01 | description is null | Header renders without a description paragraph |
| DE-02 | description is 2 000 chars | Wraps, no truncation in header display |
| DE-03 | Update description via Edit dialog | Saved value appears in header on next render |

---

## 5. Page Header — Action Buttons

### 5.1 Element Name & UI Type
Two `<Button>` elements in the top-right corner of the page header:
- "Apply Template" — outline variant
- "Edit Project" — default (filled) variant

### 5.2 Business Purpose
- **Apply Template:** Allows a PM to apply a project template (phases + tasks) to a project without having to create tasks manually — accelerating project initialisation for recurring engagement types.
- **Edit Project:** Opens the full project edit dialog covering all editable fields (name, description, dates, owner, account, budget, health, status).

### 5.3 User Interaction Behaviour
- "Apply Template" → opens `<ApplyTemplateModal>` (full-screen dialog with a template selector dropdown + confirmation).
- "Edit Project" → opens `<EditProjectDialog>` (sheet/dialog with form fields, save/cancel).
Both buttons are hidden entirely when `isPM === false`.

### 5.4 Triggered Actions & Navigation Flow
**Apply Template:**
1. User selects a template from dropdown.
2. Confirm → `POST /api/project-templates/:templateId/apply` with `{ projectId }`.
3. On success → `invalidateQueries(["tasks", projectId])` and toast "Template applied".

**Edit Project:**
1. Dialog mounts, pre-populates form with `project.*` values.
2. Save → `PATCH /api/projects/:id` with changed fields.
3. Status-change intercept (see element 25) fires if `status` field changed.
4. On success → `invalidateQueries(["project", projectId])` + toast.

### 5.5 Exact Source of Data
Template list: `GET /api/project-templates` → `{ id, name, description }[]`.  
Current project values pre-populated from `project` query cache.

### 5.6 Upstream / Downstream Dependencies
Apply Template downstream: creates child tasks (and phases) in `tasksTable` linked to `projectId`. Tasks tab re-fetches after invalidation. Health stats update as new tasks are created.

### 5.7 Calculation Logic
None on the button itself. Template application logic is server-side: for each `template_phase`, a phase task is inserted; for each `template_task` under that phase, a child task is inserted with the phase as `parentTaskId`.

### 5.8 Event Chain
Apply Template: `POST /api/project-templates/:templateId/apply` → server inserts tasks in bulk → 200 JSON `{ applied: N }` → React Query invalidates tasks cache → Tasks tab re-renders with new task tree.

### 5.9 Data Modification Logic
Apply Template: inserts rows into `tasksTable`. Edit Project: updates row in `projectsTable`.

### 5.10 Connected Menus / Modules / Workflows
Edit Project dialog is also reachable from the Projects list row context menu ("Edit"). Apply Template is only accessible from this page.

### 5.11 Permissions & Visibility
Both buttons are conditionally rendered: `{isPM && <Button>…</Button>}`. `collaborator` and `customer` never see these buttons. `account_admin` always sees them.

### 5.12 Validation & Exception Handling
- Apply Template with no template selected → button stays disabled; confirm disabled.
- Edit Project with `dueDate < startDate` → API returns 400 `"dueDate must be on or after startDate"` → form-level error toast.
- Budget locked → PATCH of budget fields returns 403 `budget_locked` → dialog shows inline error with link to Change Orders tab.

### 5.13 Backend / API / DB Assumptions
`POST /api/project-templates/:templateId/apply` is behind `requirePM`. Template tasks are copied with null `startDate`/`dueDate` unless the template stores relative-day offsets (not yet implemented — offset fields planned).

### 5.14 Audit Trail
Edit Project: `action: "updated"` (or `"status_changed"` if status field changed).  
Apply Template: `action: "created"` per inserted task batch (bulk audit row: `"Applied template X to project Y"`).

### 5.15 UI/UX Behaviour
Both buttons sit right-aligned in the header flex row. On mobile viewports they stack vertically. "Apply Template" has secondary styling to visually subordinate it to "Edit Project". Buttons show a spinner icon (`<Loader2>`) in their loading state during mutation.

### 5.16 Testing Scenarios
| ID | Scenario | Expected |
|---|---|---|
| AB-01 | collaborator visits page | Both buttons not rendered |
| AB-02 | Apply Template, no templates exist | Dropdown shows "No templates available" |
| AB-03 | Apply Template successfully | Tasks appear in Tasks tab; toast confirms |
| AB-04 | Edit Project, change dueDate before startDate | 400 error, form highlights date fields |
| AB-05 | Edit Project with budgetLocked=true, change budget | 403 shown; link to Change Orders tab |
| AB-06 | Edit Project mid-flight network error | Error toast; dialog stays open; no data corruption |

---

## 6. KPI Card — Revised Budget

### 6.1 Element Name & UI Type
Metric card (`<Card>` with header, value, and progress bar). First in a horizontal row of four KPI cards. Positioned directly below the page header.

### 6.2 Business Purpose
Communicates the current authorised project budget — the original contract value adjusted upward by approved change orders — and shows both the percentage spent (invoiced) and the percentage invoiced as a progress bar, enabling financial health assessment without navigating to the Financials tab.

### 6.3 User Interaction Behaviour
Read-only display card. No click action on the card itself. The finance detail is accessible via the Financials tab.

### 6.4 Triggered Actions & Navigation Flow
None directly. Card is re-fetched on `staleTime` expiry or when `invalidateQueries(["project-summary", projectId])` fires after any financial mutation.

### 6.5 Exact Source of Data
`GET /api/projects/:id/summary` response fields:
- `invoicedAmount`: sum of `invoicesTable.total` where `status IN ('Paid', 'Approved')`
- `pendingAmount`: sum of `invoicesTable.total` where `status IN ('In Review', 'Draft')`
- `budgetUsedPercent`: `Math.min(100, Math.round((invoicedAmount / budget) * 100))`

The "Revised Budget" total itself is computed from the budget ledger (NOT the `summary` endpoint):
- Displayed as: `project.budget` base + sum of approved change-order `additionalBudget` values
- This computation happens in the Financials sub-section; the KPI card displays `project.budget` as the headline figure (which is auto-updated by the change-order approval flow).

### 6.6 Upstream / Downstream Dependencies
`project.budget` is updated by `PATCH /api/projects/:id` (direct edit, if budget unlocked) or automatically by the change-order approval handler (`PATCH /api/change-orders/:id` with `status: "Approved"` adds `additionalBudget` to `project.budget`). The KPI card reflects this updated value after cache invalidation.

### 6.7 Calculation Logic
```
revisedBudget = project.budget  (updated by CO approval)
budgetUsedPercent = budget > 0
  ? Math.min(100, Math.round((invoicedAmount / budget) * 100))
  : 0
invoicedAmount = SUM(invoices.total WHERE status IN ('Paid','Approved'))
pendingAmount  = SUM(invoices.total WHERE status IN ('In Review','Draft'))
```
Currency: `project.budgetCurrency` (default `"USD"`). Formatting: `Intl.NumberFormat` with currency style.

### 6.8 Event Chain
Change Order approved → `project.budget` incremented → `GET /api/projects/:id` cache invalidated → KPI card re-renders with new budget. Invoice status changed to Paid → `invoicedAmount` recalculated → `GET /api/projects/:id/summary` invalidated → progress bar updates.

### 6.9 Data Modification Logic
No direct modification from this card. Budget changes flow through the Edit Project dialog (if budget unlocked) or via change-order approval.

### 6.10 Connected Menus / Modules / Workflows
- Budget lock: once a project moves from Draft → Active, `budgetLocked` is set to `true`. Any attempt to edit `budget` directly returns 403.
- Financials tab shows the full budget ledger breakdown; this card is a summary view.
- Invoices module updates `invoicedAmount`.

### 6.11 Permissions & Visibility
Visible to all authenticated non-customer roles. No write interaction.

### 6.12 Validation & Exception Handling
If `budget` is 0 or null → `budgetUsedPercent` returns 0 and progress bar renders empty. Currency formatting falls back to raw number if `Intl.NumberFormat` is unsupported (rare).

### 6.13 Backend / API / DB Assumptions
`project.budget` is stored as `numeric(15,2)` in the DB. Returned as string by Drizzle; `Number(project.budget)` cast applied in `mapProject`. `invoicesTable.total` is also `numeric(15,2)`.

### 6.14 Audit Trail
Budget changes logged as `action: "updated"` on the project entity. Change-order approvals logged with `action: "approved"` on the change-order entity plus a secondary `action: "updated"` on the project entity.

### 6.15 UI/UX Behaviour
Progress bar fills proportionally to `budgetUsedPercent`. Colour thresholds: `< 80%` → indigo, `80–99%` → amber, `100%` → red. Below the main figure, two small annotations: `${invoicedAmount} invoiced` and `${pendingAmount} pending`. Budget currency symbol precedes all amounts.

### 6.16 Testing Scenarios
| ID | Scenario | Expected |
|---|---|---|
| KB-01 | No invoices exist | 0% progress bar, $0 invoiced label |
| KB-02 | Invoiced amount equals budget | Progress bar at 100%, red colour |
| KB-03 | Invoiced amount exceeds budget (over-run) | Clamped at 100%, red colour |
| KB-04 | Budget is 0 | Progress bar empty, 0% shown |
| KB-05 | Change order approved; budget increases | Card refetches and displays new total |
| KB-06 | Budget locked; PM tries to edit directly | 403 returned, card unaffected |

---

## 7. KPI Card — Hours Used

### 7.1 Element Name & UI Type
Metric card — second in the KPI row. Shows tracked hours vs budgeted hours with a percentage progress bar.

### 7.2 Business Purpose
Signals labour efficiency. If hours are being consumed faster than budget is being consumed, it can indicate under-billing or scope creep. PMs use this card to trigger a conversation about change orders before the project goes into the red.

### 7.3 User Interaction Behaviour
Read-only. No click action.

### 7.4 Triggered Actions & Navigation Flow
Re-fetched when `["project-summary", projectId]` is invalidated — triggered by any timesheet approval that creates or updates `time_entries` for this project.

### 7.5 Exact Source of Data
`GET /api/projects/:id/summary` response:
- `hoursUsedPercent`: `Math.min(100, Math.round((trackedHours / budgetedHours) * 100))`
- `trackedHours`: computed by `getTrackedHours(projectId)` — `SELECT SUM(hours) FROM time_entries WHERE projectId = :id`
- `budgetedHours`: `project.budgetedHours` from `projectsTable`

### 7.6 Upstream / Downstream Dependencies
`trackedHours` is computed from the `time_entries` table. Every approved time entry (directly posted or via timesheet approval) affects this figure. The `time_entries` table has an index on `project_id` (Sprint 1 Phase 1.2 hardening).

### 7.7 Calculation Logic
```
trackedHours    = SELECT SUM(hours) FROM time_entries WHERE project_id = :id
hoursUsedPercent = budgetedHours > 0
  ? Math.min(100, Math.round((trackedHours / budgetedHours) * 100))
  : 0
```
The `getTrackedHours` helper (`lib/trackedHours.ts`) executes a single aggregate query. No N+1.

### 7.8 Event Chain
Time entry posted/approved → `time_entries` row inserted → next `GET /api/projects/:id/summary` call recomputes `trackedHours` → `hoursUsedPercent` updates → card re-renders. Effort-overrun check fires asynchronously after timesheet approval at `OVERRUN_ALERT_THRESHOLD = 0.9` (90%) of `task.estimateHours` per task.

### 7.9 Data Modification Logic
No write from this card. Hours accumulate through the Time Tracking module.

### 7.10 Connected Menus / Modules / Workflows
- Effort Overrun Detection helper (`lib/effortOverrunCheck.ts`) triggers `overrun_alert` notification when a task reaches 90% of its estimated hours. The notification links back to this project.
- Time tab on this page also shows raw time entries per person.

### 7.11 Permissions & Visibility
Visible to all authenticated non-customer roles.

### 7.12 Validation & Exception Handling
`budgetedHours = 0` or null → `hoursUsedPercent = 0`; card shows `"0 / 0 hrs"`. Negative values impossible (time entry validation enforces `0 < hours <= 24`).

### 7.13 Backend / API / DB Assumptions
`time_entries.hours` is `numeric(5,2)`. `project.budgetedHours` is `numeric(10,2)`. Both stored as DB numeric; cast to `Number` in application code.

### 7.14 Audit Trail
No audit at the KPI card level. Time entries have their own audit rows (`action: "created"` on `time_entry` entity).

### 7.15 UI/UX Behaviour
Progress bar same colour logic as budget card: `< 80%` indigo, `80–99%` amber, `≥ 100%` red. Sub-label shows `"${trackedHours} / ${budgetedHours} hrs"`.

### 7.16 Testing Scenarios
| ID | Scenario | Expected |
|---|---|---|
| KH-01 | No time entries exist | 0 hrs, 0% |
| KH-02 | trackedHours = 0.9 × budgetedHours | ~90%, amber progress bar |
| KH-03 | trackedHours > budgetedHours | 100% clamped, red bar |
| KH-04 | budgetedHours = 0 | 0%, "0 / 0 hrs" label |

---

## 8. KPI Card — Completion

### 8.1 Element Name & UI Type
Metric card — third in the KPI row. Displays overall task completion percentage with a circular or linear progress indicator.

### 8.2 Business Purpose
Provides a single-number summary of delivery progress. Used in client-facing status meetings and executive dashboards to communicate "how done" a project is relative to its total task scope.

### 8.3 User Interaction Behaviour
Read-only. Clicking the card has no action — detailed breakdown is in the Tasks tab and Health Stat Cards.

### 8.4 Triggered Actions & Navigation Flow
Invalidated by `["health-stats", projectId]` query (which is also what the health stat cards use). Both re-fetch together after any task status change.

### 8.5 Exact Source of Data
`GET /api/projects/:id/health-stats` response field `completionPct`:
```
completionPct = total > 0 ? Math.round((completed / total) * 100) : 0
```
where `total` = count of non-milestone tasks, `completed` = count where `status === "Completed"`.

Also `project.completion` from `GET /api/projects/:id` — a manually-set percentage override field on the project record. The KPI card uses the computed `completionPct` from health-stats, not the manual field.

### 8.6 Upstream / Downstream Dependencies
Every task status update (`PATCH /api/tasks/:id` with `status: "Completed"`) affects this metric. Task creation also reduces the percentage temporarily (denominator grows). Milestone tasks are excluded from the denominator.

### 8.7 Calculation Logic
```
nonMilestones = tasks WHERE isMilestone = false
total     = COUNT(nonMilestones)
completed = COUNT(nonMilestones WHERE status = 'Completed')
completionPct = total > 0 ? ROUND((completed / total) * 100) : 0
```

### 8.8 Event Chain
Task marked Completed → `PATCH /api/tasks/:id { status: "Completed" }` → `invalidateQueries(["tasks", projectId])` + `invalidateQueries(["health-stats", projectId])` → Completion card re-renders.

### 8.9 Data Modification Logic
None from this card.

### 8.10 Connected Menus / Modules / Workflows
`project.completion` (manual override) is editable in the Edit Project dialog. If set, it is used in the project list view's completion column. The KPI card on this detail page uses the computed `completionPct` for accuracy.

### 8.11 Permissions & Visibility
Visible to all authenticated non-customer roles.

### 8.12 Validation & Exception Handling
No tasks → `completionPct = 0`, card shows "0%". Milestones correctly excluded — their status does not move this metric.

### 8.13 Backend / API / DB Assumptions
`tasks.status` is a text column; valid values include `"Not Started"`, `"In Progress"`, `"Completed"`, `"Blocked"`, `"On Hold"`. `tasks.isMilestone` is boolean, default false.

### 8.14 Audit Trail
None at the card level. Task status changes have audit rows.

### 8.15 UI/UX Behaviour
Percentage displayed in large bold font `text-3xl font-bold`. Progress bar below. No colour threshold — always indigo (completion is always positive).

### 8.16 Testing Scenarios
| ID | Scenario | Expected |
|---|---|---|
| KC-01 | Zero tasks | 0% |
| KC-02 | All tasks completed | 100% |
| KC-03 | Milestone tasks completed, no non-milestones | 0% (milestones excluded) |
| KC-04 | New task created (adds to denominator) | Percentage drops proportionally |

---

## 9. KPI Card — Timeline

### 9.1 Element Name & UI Type
Metric card — fourth in the KPI row. Displays calendar days remaining until the project due date.

### 9.2 Business Purpose
The simplest and most urgent indicator: how many days until the deadline. At-a-glance signal for urgency that drives prioritisation decisions.

### 9.3 User Interaction Behaviour
Read-only. Due date editable through "Edit Project" dialog.

### 9.4 Triggered Actions & Navigation Flow
Invalidated when `["project-summary", projectId]` refreshes (staleTime-based or after project edit).

### 9.5 Exact Source of Data
`GET /api/projects/:id/summary` response field `daysRemaining`:
```
daysRemaining = Math.max(0, Math.ceil((dueDate - now) / 86_400_000))
```

Also displays the formatted due date from `project.dueDate`.

### 9.6 Upstream / Downstream Dependencies
`project.dueDate` updated via `PATCH /api/projects/:id`. Date shift via `POST /api/projects/:id/shift-dates` also updates `project.dueDate`.

### 9.7 Calculation Logic
```
due          = new Date(project.dueDate)
daysRemaining = Math.max(0, Math.ceil((due.getTime() - Date.now()) / 86_400_000))
```
Floor of 0 — overdue projects show "0 days" not negative numbers.

### 9.8 Event Chain
Project due date edited → PATCH → React Query invalidation → `summary` re-fetched → card re-renders. `shift-dates` endpoint shifts tasks and project dates atomically; same invalidation flow.

### 9.9 Data Modification Logic
None from this card. Changed via Edit Project.

### 9.10 Connected Menus / Modules / Workflows
`shift-dates` endpoint also shifts all task dates (BFS traversal for downstream tasks if `fromTaskId` provided). The Gantt tab visualises the same date data.

### 9.11 Permissions & Visibility
Visible to all authenticated non-customer roles.

### 9.12 Validation & Exception Handling
Past due date → shows "0 days" and the health badge auto-computes to Red (server-side). The date sub-label shows the actual formatted due date so users can see it is overdue.

### 9.13 Backend / API / DB Assumptions
`project.dueDate` is stored as a `date` string (`YYYY-MM-DD`). `Date` constructor handles timezone UTC offset; calculation uses `.getTime()` milliseconds.

### 9.14 Audit Trail
Due date changes logged in the general `action: "updated"` project audit row.

### 9.15 UI/UX Behaviour
`daysRemaining > 30` → value shown in default text colour. `7–30` → amber text. `0–7` → red text with destructive badge. Due date shown as formatted short date below the main number.

### 9.16 Testing Scenarios
| ID | Scenario | Expected |
|---|---|---|
| KT-01 | dueDate is 60 days out | Shows 60, default colour |
| KT-02 | dueDate is 5 days out | Shows 5, red text |
| KT-03 | dueDate is yesterday | Shows 0, red text |
| KT-04 | shift-dates by 30 days | Card updates to daysRemaining + 30 |

---

## 10. Health Stat Cards

### 10.1 Element Name & UI Type
Four clickable metric chips / mini-cards in a horizontal sub-row below the KPI row:
- **Overdue** (red) — tasks past due that are not completed
- **Blocked** (orange) — tasks with status "Blocked"
- **At Risk** (amber) — milestone tasks due within 7 days that are not yet completed
- **On Track** (green) — in-progress tasks with a future or no due date

### 10.2 Business Purpose
Drillable health indicators. Each chip acts as both a metric and a filter: clicking a chip navigates to the Tasks tab with a pre-applied status filter, letting PMs jump directly to the problem tasks without scrolling through the full task list.

### 10.3 User Interaction Behaviour
- Clicking any chip: `setActiveTab("tasks")` + `setTaskFilter(chipKey)` where `chipKey` ∈ `["overdue", "blocked", "atRisk", "onTrack"]`.
- The Tasks tab renders with that filter chip pre-selected, showing only matching tasks.
- Clicking the same chip again on the Tasks tab clears the filter.

### 10.4 Triggered Actions & Navigation Flow
1. User clicks "Overdue (3)" chip.
2. `setActiveTab("tasks")` fires → Tasks tab becomes active.
3. `setTaskFilter("overdue")` passes a filter prop to `<ProjectPhases>`.
4. `<ProjectPhases>` filters rendered tasks client-side to those where `task.dueDate < today && task.status !== "Completed"`.
5. Filter chip is highlighted in the Tasks tab's filter row.

### 10.5 Exact Source of Data
`GET /api/projects/:id/health-stats` response:
```json
{
  "total": 18,
  "completed": 7,
  "overdue": 3,
  "blocked": 2,
  "atRisk": 1,
  "onTrack": 5,
  "completionPct": 39,
  "phases": [{ "id": 1, "name": "Phase 1", "completionPct": 50, … }]
}
```

### 10.6 Upstream / Downstream Dependencies
Any `PATCH /api/tasks/:id` that changes `status` or `dueDate` will affect these counts. Query is invalidated on task mutations.

### 10.7 Calculation Logic
All computed server-side in `GET /api/projects/:id/health-stats`:
```
today       = new Date().toISOString().slice(0, 10)   // YYYY-MM-DD
overdue     = nonMilestones WHERE dueDate < today AND status != 'Completed'
blocked     = nonMilestones WHERE status = 'Blocked'
atRisk      = milestones   WHERE dueDate > today AND status != 'Completed'
                             AND (dueDate - now) < 7 days
onTrack     = nonMilestones WHERE status = 'In Progress' AND (dueDate IS NULL OR dueDate >= today)
```
Note: `atRisk` uses milestone tasks; all other chips use non-milestone tasks. This is intentional — milestones are delivery gates and their proximity triggers a distinct risk signal.

### 10.8 Event Chain
Task due date updated → `PATCH /api/tasks/:id` → `invalidateQueries(["health-stats", projectId])` → chips re-render with new counts.

### 10.9 Data Modification Logic
None from the chips. Clicking navigates and filters; no data is written.

### 10.10 Connected Menus / Modules / Workflows
- **Tasks tab:** receives filter state from these chips.
- **Reports → Project Health report:** uses the same health-stats API for the organisation-wide health dashboard.
- **Dashboard Needs Attention widget:** queries health-stats across all projects and surfaces projects with `overdue > 0`.

### 10.11 Permissions & Visibility
Visible to all authenticated non-customer roles. Chips are always rendered (even if count is 0). Zero-count chips are greyed out and not clickable.

### 10.12 Validation & Exception Handling
If `health-stats` fetch fails, chips render with `—` instead of counts and are non-clickable. Error state is shown inline below the KPI row.

### 10.13 Backend / API / DB Assumptions
`tasks.dueDate` is stored as a `date` string (`YYYY-MM-DD`). The `< today` comparison is string-lexicographic but valid because ISO date strings sort correctly. Tasks without a `dueDate` are excluded from `overdue` (only tasks with a set due date can be overdue).

### 10.14 Audit Trail
None — read-only display and navigation element.

### 10.15 UI/UX Behaviour
Each chip: `<button>` with left-aligned icon + count badge + label. Hover: slightly elevated shadow. Active (filter applied): solid background with white text. Inactive: outline border. Zero count: `opacity-50 cursor-not-allowed`.

### 10.16 Testing Scenarios
| ID | Scenario | Expected |
|---|---|---|
| HS-01 | Task dueDate was yesterday, status "In Progress" | Overdue count increments |
| HS-02 | Milestone dueDate in 3 days, not completed | At Risk count increments |
| HS-03 | All tasks completed | Overdue=0, Blocked=0, At Risk=0 |
| HS-04 | Click "Blocked (2)" chip | Tasks tab active, only blocked tasks shown |
| HS-05 | overdue count = 0 | Chip greyed, not clickable |
| HS-06 | health-stats fetch returns 500 | Chips show "—", no crash |

---

## 11. Tab Navigation Bar

### 11.1 Element Name & UI Type
Horizontal scrollable tab strip using shadcn `<Tabs>` component. Ten tabs:
`Tasks | Team & Allocations | Financials | Change Requests [N] | CSAT [N] | Documents | Forms | Timeline | Time | Updates [N] | RAID`

Count badges are shown on `Change Requests`, `CSAT`, and `Updates` tabs when the respective counts are non-zero.

### 11.2 Business Purpose
Primary navigation within the project context. Allows users to switch between functional domains (delivery, resourcing, finance, communication) without leaving the project page, keeping the project identity (header, KPIs, health stats) always visible.

### 11.3 User Interaction Behaviour
Clicking a tab: instantly renders that tab's content. URL query string is updated to `?tab=<name>` for deep-linking. Tab scroll: on narrow viewports the tab bar is horizontally scrollable (CSS `overflow-x: auto`).

### 11.4 Triggered Actions & Navigation Flow
- Tab click → `setActiveTab(value)` + `navigate(pathname + "?tab=" + value)`.
- On mount, `useEffect` reads `?tab=` from URL and calls `setActiveTab` if found and valid; defaults to `"tasks"`.
- Each tab panel lazy-fetches its own data (queries are `enabled` only when that tab is active, using an `isActive` derived boolean).

### 11.5 Exact Source of Data
Badge counts:
- Change Requests: `changeOrders?.length` from `GET /api/projects/:id/change-orders`
- CSAT: `csatSurveys?.length` from `GET /api/projects/:id/csat-surveys`
- Updates: `updates?.length` from `GET /api/projects/:id/updates`

These are pre-fetched lazily when the user first visits the relevant tab (or eagerly if the data is already in cache from a prior visit this session).

### 11.6 Upstream / Downstream Dependencies
Tab content queries are conditional on the active tab. Switching tabs re-enables previously disabled queries, which re-fetch from cache or network. `staleTime` prevents redundant re-fetches within 30 s.

### 11.7 Calculation Logic
None — tab counts are raw array lengths from API responses.

### 11.8 Event Chain
User creates a new Change Request → `invalidateQueries(["change-orders", projectId])` → Change Requests badge count increments.

### 11.9 Data Modification Logic
None from the tab bar itself.

### 11.10 Connected Menus / Modules / Workflows
The "Forms" tab is a placeholder / future module — it renders an empty state with "Coming soon" text. All other tabs have full implementations.

### 11.11 Permissions & Visibility
All tabs visible to all authenticated non-customer roles. Tab content within each tab has its own permission checks for write actions.

### 11.12 Validation & Exception Handling
Unknown `?tab=` query string value → defaults to `"tasks"` tab. Tab API fetch errors render an inline error within the tab panel, not a full-page error.

### 11.13 Backend / API / DB Assumptions
All tab-specific queries use the project's integer ID as the filter parameter. The tab bar itself makes no direct API calls.

### 11.14 Audit Trail
None.

### 11.15 UI/UX Behaviour
Active tab: underline indicator, slightly bolder font. Count badge: small rounded pill in indigo. Tab bar is sticky within the page scroll so it remains visible when scrolling through long tab content.

### 11.16 Testing Scenarios
| ID | Scenario | Expected |
|---|---|---|
| TB-01 | Navigate to `/projects/1?tab=finance` | Financials tab active on load |
| TB-02 | Create a change order | Change Requests badge increments |
| TB-03 | Navigate to invalid tab `?tab=xyz` | Defaults to Tasks tab |
| TB-04 | Viewport < 768px | Tab bar scrolls horizontally |

---

## 12. Tasks Tab

### 12.1 Element Name & UI Type
Full-width tab panel rendered by `<ProjectPhases>` component (`components/project-phases.tsx`). Displays a hierarchical collapsible task tree: Phase rows (level-1 tasks with `isPhase=true`) with nested child tasks, followed by any unphased top-level tasks. Each row has inline status/date/assignee columns plus row action menus.

### 12.2 Business Purpose
The primary delivery tracking surface. PMs and team members track task progress, due dates, assignees, hours, and status. The phase/task hierarchy models the SOW structure. Inline edits reduce friction for daily status updates.

### 12.3 User Interaction Behaviour
- **Collapse/Expand phase rows:** `<TreeToggle>` chevron on phase rows toggles children visibility. State persisted in `useExpandedIds` hook (localStorage key: `"expanded-phases-${projectId}"`).
- **Filter chips:** Overdue / Blocked / At Risk / On Track filters (activated by health stat card clicks or by clicking filter chips in this tab's own filter bar).
- **Search:** Inline search input filters task names client-side.
- **Add Phase button:** Opens "Add Phase" dialog (if `isPM`).
- **Add Task button:** Opens "Add Task" dialog (if `isPM`), with optional parent phase selector.
- **Row context menu:** Edit task, Delete task, Add sub-task, Log Time against task.
- **Status dropdown:** Inline single-cell dropdown for task status update.
- **Bulk select:** Checkbox per row; bulk action bar appears when ≥ 1 row selected: Bulk status update, Bulk assignee change, Bulk delete.

### 12.4 Triggered Actions & Navigation Flow
- Add Phase → `POST /api/tasks` with `{ projectId, name, isPhase: true }` → tasks re-fetched.
- Add Task → `POST /api/tasks` with parent fields → tasks re-fetched.
- Edit task → `PATCH /api/tasks/:id` with changed fields → task row re-renders.
- Delete task → `DELETE /api/tasks/:id` (soft-delete: sets `deletedAt`) → task removed from list.
- Bulk status → `PATCH /api/tasks/bulk` with `{ taskIds, status }`.
- Log Time → opens Log Time dialog pre-filled with `taskId`.
- Status dropdown change → `PATCH /api/tasks/:id { status: newValue }`.

### 12.5 Exact Source of Data
`GET /api/tasks?projectId=:id` — returns flat array of all tasks for the project including phases and non-phases. Client-side `buildTreeFromFlat(tasks)` constructs the hierarchical display structure:
1. Identify phase tasks: `task.isPhase === true && task.parentTaskId === null`.
2. Nest child tasks under their parent phase.
3. Unphased tasks (`parentTaskId === null && !isPhase`) appear as top-level nodes after phases.

### 12.6 Upstream / Downstream Dependencies
- **Upstream:** Allocations (assignee list for the assignee dropdown populated from `GET /api/allocations?projectId=:id`).
- **Downstream:** Time tracking (`time_entries.taskId`), Health stats (task `status` + `dueDate` feed health-stats endpoint), Effort overrun check (task `estimateHours`), Gantt tab (same task data rendered as Gantt bars).
- Phase progress bars in the health-stats response (`phases[].completionPct`) are derived from child task completion ratios.

### 12.7 Calculation Logic
Phase completion (client-rendered progress bar under each phase row):
```
phaseCompletion = childTasks.filter(t => t.status === 'Completed').length
               / childTasks.length * 100
```
Also shown from the `health-stats` `phases[]` array for accuracy.

EAC (Estimate at Completion) per task — displayed in task row if `estimateHours` is set:
```
EAC = actualHours + (estimateHours - actualHours)
    = estimateHours  (if no overrun)
```
Actual hours per task are computed from `SUM(time_entries.hours WHERE taskId = task.id)` — done in a batch `getTrackedHoursMap` call.

### 12.8 Event Chain
Task status changed → `PATCH /api/tasks/:id` → `invalidateQueries(["tasks", projectId])` + `invalidateQueries(["health-stats", projectId])` → task tree re-renders + health stat chips update + completion KPI card updates.

### 12.9 Data Modification Logic
All task mutations go through the tasks router (`artifacts/api-server/src/routes/tasks.ts`). Key rules:
- `isPhase` tasks cannot have their own `parentTaskId` set (they are the parent level).
- Deleting a phase task cascade-deletes its child tasks (`ON DELETE CASCADE` on `tasks.parentTaskId` FK).
- Bulk status update: `PATCH /api/tasks/bulk` validates each `taskId` belongs to the project before updating (ownership check).

### 12.10 Connected Menus / Modules / Workflows
- Gantt tab reads the same task data and renders it as a bar chart timeline.
- Time Tracking module: `time_entries.taskId` links hours to tasks.
- Templates: Apply Template creates tasks in this list.
- Effort Overrun: fires notification when a task hits 90% of `estimateHours`.

### 12.11 Permissions & Visibility
- `collaborator`: can view tasks and update own task status. Cannot create/delete tasks.
- `super_user`/`account_admin`: full CRUD.
- Add Phase / Add Task buttons: `{isPM && <Button>}`.
- Delete button in row context menu: `{isPM && <DropdownMenuItem>}`.

### 12.12 Validation & Exception Handling
- `POST /api/tasks` requires `name` (non-empty string), `projectId` (must match an active project).
- Status transition: any value in the tasks status enum (`Not Started`, `In Progress`, `Completed`, `Blocked`, `On Hold`) is valid — no state machine enforced at task level (unlike projects).
- Deleting a phase with children: cascade delete is confirmed via a destructive confirm dialog warning that all child tasks will also be deleted.
- Bulk operations with 0 tasks selected: bulk action bar is hidden; no API call made.

### 12.13 Backend / API / DB Assumptions
`tasksTable` FK: `parentTaskId → tasks.id ON DELETE CASCADE`. Index on `(projectId)`. `isMilestone` and `isPhase` are separate boolean columns. A task can be a milestone but not a phase (or vice versa). Milestone tasks render with a diamond icon instead of a checkbox.

### 12.14 Audit Trail
`POST /api/tasks` → `action: "created"` on `task` entity.  
`PATCH /api/tasks/:id` → `action: "updated"`.  
`PATCH /api/tasks/bulk` → single `action: "updated"` row per task in the batch.  
`DELETE /api/tasks/:id` → `action: "deleted"`.

### 12.15 UI/UX Behaviour
- Phase rows: indigo left border, bold name, phase completion progress bar inline.
- Task rows: indented under phase, lighter weight.
- Milestone rows: diamond `◆` icon, no checkbox.
- Sticky `<TableHeader>` (Sprint 3.1 — backdrop blur, always sticky).
- Tree expansion persisted in localStorage so collapsing phases survives page reload.
- Bulk action floating bar appears at bottom of viewport when ≥ 1 task selected.

### 12.16 Testing Scenarios
| ID | Scenario | Expected |
|---|---|---|
| TK-01 | Add a phase | New phase row appears at top of list |
| TK-02 | Add task under phase | Task nested under the phase |
| TK-03 | Delete phase with 3 child tasks | Confirm dialog shown; on confirm all 4 rows removed |
| TK-04 | Bulk select 2 tasks, change status to Completed | Both tasks update, health stats recalculate |
| TK-05 | Click "Overdue" health chip | Tasks tab active, only overdue tasks visible |
| TK-06 | Search for task name | Non-matching tasks hidden client-side |
| TK-07 | collaborator tries to delete task | Delete menu item not rendered |
| TK-08 | Apply Template with 5 tasks | 5 new task rows appear |

---

## 13. Team & Allocations Tab

### 13.1 Element Name & UI Type
Tab panel with a data table of project allocations (one row per allocation record). Each row shows user name/avatar, role, allocation input method, hours, date range, utilisation pill, and action buttons. Header toolbar has "Add Member" button.

### 13.2 Business Purpose
Manages the project team — who is assigned, for how many hours, and over what period. The allocation record is the source of truth for project membership (`project_members` concept is implemented via the `allocations` table, not a separate join table). Allocations drive timesheet import, capacity utilisation, and resource planning.

### 13.3 User Interaction Behaviour
- **Add Member** → opens Allocation Dialog (element 14).
- **Row Edit icon** → opens Allocation Dialog pre-filled with existing allocation.
- **Row Delete icon** → opens confirm dialog → `DELETE /api/allocations/:id`.
- **Utilisation pill** → tooltip shows weekly breakdown percentages on hover.
- **Fill Placeholder** button → appears for allocations where `userId` is null (TBD/placeholder) → opens a user-selector dialog to assign a real person.
- **Resource Request** button → opens Resource Request modal for requesting a resource via HR/resource management workflow.

### 13.4 Triggered Actions & Navigation Flow
Delete allocation: `DELETE /api/allocations/:id` → `invalidateQueries(["allocations", projectId])` → row removed from table.  
Fill Placeholder: `PATCH /api/allocations/:id { userId: selectedUserId }` → row updates with real user.

### 13.5 Exact Source of Data
`GET /api/allocations?projectId=:id` — returns all allocations including placeholder (null userId) rows.  
User list for the Fill Placeholder / Add Member dropdowns: `GET /api/users` (filtered to active users).  
Resource requests: `GET /api/resource-requests?projectId=:id`.

### 13.6 Upstream / Downstream Dependencies
- **Downstream — Timesheets:** `POST /api/timesheets/import-allocations` creates draft time entries from allocations. Only users with active allocations can import.
- **Downstream — Capacity check:** `POST /api/allocations/preview` (called from Allocation Dialog) returns utilisation impact.
- **Downstream — Time-off conflict:** When a time-off request is approved, `lib/timeOffAllocationConflict.ts` checks for overlapping allocations on this project and sets `allocation.status = 'at_risk'`.
- **Downstream — Out-of-range check:** When project dates change, `lib/outOfRangeAllocationCheck.ts` fires to detect allocations whose date range falls outside the new project window.
- **Upstream — Manager approval:** Time-off approvals for resources allocated to this project are now scoped to the resource's `managerId` (Sprint 2 Phase 8.1).

### 13.7 Calculation Logic
Allocation hours are stored and displayed in the units chosen during creation (hours/day, % capacity, or total hours). The dialog converts between units using:
```
totalHours = hoursPerDay × workingDays(startDate, endDate)
totalHours = (percentCapacity / 100) × 8 × workingDays(startDate, endDate)
```
`workingDays` excludes weekends and public holidays from the organisation's holiday calendar.

### 13.8 Event Chain
Time-off approved → `lib/timeOffAllocationConflict.ts` runs → overlapping allocation gets `status = 'at_risk'` → PM notified via `leave_allocation_conflict` notification → on next tab visit, at-risk allocation row shows amber warning indicator.

### 13.9 Data Modification Logic
`POST /api/allocations`: creates allocation. Validates `requiredSkillId + requiredProficiencyLevel` if provided (Sprint Guard 2). Returns 422 `skill_mismatch` if user lacks the skill at the required proficiency; bypass via `skillOverrideReason`.  
`PATCH /api/allocations/:id`: updates allocation fields.  
`DELETE /api/allocations/:id`: hard deletes (no soft delete on allocations).

### 13.10 Connected Menus / Modules / Workflows
- Resources module: Capacity Grid shows aggregate utilisation across all projects — allocations here feed into that view.
- Resource Requests tab (on this page) and Resources → Resource Requests tab are the same underlying data.
- Timesheet Import: only allocations for the requesting user are imported.
- Notifications: `leave_allocation_conflict` type links to this tab.

### 13.11 Permissions & Visibility
"Add Member", Edit icon, Delete icon, Fill Placeholder: `{isPM && ...}`.  
Resource Request button: visible to all non-customer roles.  
Utilisation pill: visible to all.  
`isSoftAllocation` flag — soft allocations show a dashed border on the row (planning/tentative mode).

### 13.12 Validation & Exception Handling
- `startDate > endDate` → 400 from API.
- Allocating a user who is already allocated to this project for overlapping dates: API does not block (no unique constraint), but the capacity preview will show > 100% utilisation warning.
- Skill mismatch without override: 422 response surfaces as inline error in the dialog.
- Allocation outside project date range: `outOfRangeAllocationCheck` fires asynchronously (does not block creation) and notifies PM.

### 13.13 Backend / API / DB Assumptions
`allocationsTable` columns: `userId` (nullable int FK), `projectId`, `startDate`, `endDate`, `hoursPerDay` (numeric), `percentCapacity` (numeric), `totalHours` (numeric), `requiredSkillId`, `requiredProficiencyLevel`, `isSoftAllocation` (bool), `isOverride` (bool), `overrideReason` (text), `status` (text nullable — `'at_risk'`). No unique constraint on `(userId, projectId)`.

### 13.14 Audit Trail
`POST /api/allocations` → `action: "created"` on `allocation` entity + optional skill-mismatch-override note.  
`DELETE /api/allocations/:id` → `action: "deleted"`.  
Skill override → additional audit row: `action: "updated"` with `overrideReason`.

### 13.15 UI/UX Behaviour
Placeholder rows (null userId) display "TBD" with a grey avatar. At-risk rows (`status = 'at_risk'`) display an amber warning badge on the utilisation pill. Soft allocation rows: dashed left border. Capacity utilisation pill colour: green < 80%, amber 80–99%, red ≥ 100%.

### 13.16 Testing Scenarios
| ID | Scenario | Expected |
|---|---|---|
| AL-01 | Add allocation with valid user and dates | Row appears in table |
| AL-02 | Add allocation with skill mismatch, no override | 422 error in dialog |
| AL-03 | Add allocation with skill mismatch + override reason | Allocation created, audit row with override note |
| AL-04 | Delete allocation | Confirm dialog; on confirm row removed |
| AL-05 | Fill Placeholder | Null-userId row updated with real user |
| AL-06 | Time-off approved overlapping this allocation | Row shows at-risk indicator |
| AL-07 | collaborator visits tab | No Add/Edit/Delete buttons rendered |

---

## 14. Allocation Dialog

### 14.1 Element Name & UI Type
Modal dialog (`<Dialog>`) opened by "Add Member" or row-edit button in Team & Allocations tab. Contains a form with user selector, date range pickers, input-method toggle (Hours/Day | % Capacity | Total Hours), live capacity preview indicator, optional skill requirement fields, and soft-allocation checkbox.

### 14.2 Business Purpose
Structured resource commitment entry. The three input methods (hours/day, percentage, total) accommodate how different organisations express resourcing commitments. The live capacity preview prevents over-allocation without leaving the dialog.

### 14.3 User Interaction Behaviour
1. Select user from dropdown (searched by name).
2. Set start/end dates.
3. Choose input method (radio/toggle).
4. Enter value (hours, percent, or total).
5. Optional: set required skill + proficiency level.
6. Optional: check "Soft Allocation" for tentative/planning allocations.
7. Click "Save" → mutation fires.

Live capacity preview: after user + dates + value are set, a debounced `POST /api/allocations/preview` is fired (300 ms debounce). Response `{ weeklyUtilisation: [{ weekStart, utilPct }] }` renders as a sparkline or coloured bar. Green < 80%, amber 80–99%, red ≥ 100%.

### 14.4 Triggered Actions & Navigation Flow
Save (create): `POST /api/allocations` → on success → dialog closes → `invalidateQueries(["allocations", projectId])`.  
Save (edit): `PATCH /api/allocations/:id` → same invalidation.  
Preview: `POST /api/allocations/preview` (read-only, not persisted).

### 14.5 Exact Source of Data
User dropdown: `GET /api/users` (filtered `active = true`).  
Skills dropdown (for required skill): `GET /api/skills`.  
Capacity preview: `POST /api/allocations/preview` with `{ userId, projectId, startDate, endDate, hoursPerDay | percentCapacity | totalHours }`.

### 14.6 Upstream / Downstream Dependencies
Preview endpoint (`POST /api/allocations/preview`) reads existing `allocations` + `time_off_requests` for the user and projects forward utilisation without writing anything. It is a pure read-compute endpoint.

### 14.7 Calculation Logic
Unit conversion (client-side, for display and for sending canonical `hoursPerDay` to API):
```
workingDays = count of weekdays in [startDate, endDate]
  excluding org holidays from GET /api/holiday-calendars/active

if input = "hours/day":    hoursPerDay = inputValue
if input = "% capacity":   hoursPerDay = (inputValue / 100) × 8
if input = "total hours":  hoursPerDay = inputValue / workingDays
```
All three are stored as `hoursPerDay` in the DB for canonical representation. `totalHours` and `percentCapacity` are derived columns in the API response.

### 14.8 Event Chain
User changes dates → workingDays recalculates → derived values update → debounced preview fires → utilisation indicator updates. User saves → `POST /api/allocations` validates skill → either 201 (success) or 422 (skill_mismatch) → dialog shows inline error or closes.

### 14.9 Data Modification Logic
`POST /api/allocations` body schema (after `.strict()` parse):
```
{
  userId: number | null,
  projectId: number,
  startDate: string (YYYY-MM-DD),
  endDate: string (YYYY-MM-DD),
  hoursPerDay: number (≥ 0),
  isSoftAllocation?: boolean,
  requiredSkillId?: number,
  requiredProficiencyLevel?: string,
  skillOverrideReason?: string
}
```

### 14.10 Connected Menus / Modules / Workflows
Capacity preview feeds into the same utilisation view used by the Resources → Capacity Grid module.

### 14.11 Permissions & Visibility
Dialog is only openable by `isPM` users. Non-PM users cannot trigger it.

### 14.12 Validation & Exception Handling
- `endDate < startDate` → client-side validation before API call; Save button disabled.
- No user selected → Save button disabled.
- Skill mismatch (422) → inline error below form: "User does not have the required skill. Add an override reason to proceed."
- Override reason field appears conditionally on 422 error; re-submit with reason → 201.
- Preview API error → preview indicator shows `—` with a neutral colour; does not block save.

### 14.13 Backend / API / DB Assumptions
`POST /api/allocations/preview` is behind `requirePM`. It does not write to any table. Returns `{ weeklyUtilisation: Array<{ weekStart: string, utilPct: number }> }`.

### 14.14 Audit Trail
On successful `POST /api/allocations`: `action: "created"`, `entityType: "allocation"`, includes override reason if used.

### 14.15 UI/UX Behaviour
Input method toggle: three pill buttons (Hours/Day | % Capacity | Total Hours). Selected method highlighted. Derived equivalents shown in muted text below the input (e.g., "≈ 40 hrs total"). Capacity sparkline or coloured badge animates on update. Skill section collapsed by default; expands on "Set Skill Requirement" chevron click.

### 14.16 Testing Scenarios
| ID | Scenario | Expected |
|---|---|---|
| AD-01 | Fill all fields, save | Allocation created; table row appears |
| AD-02 | endDate before startDate | Save button disabled |
| AD-03 | % capacity = 120% | Preview shows red; save proceeds (warning, not block) |
| AD-04 | Skill required, user lacks it | 422, override reason field appears |
| AD-05 | Override reason provided, re-submit | Allocation created with `isOverride=true` |
| AD-06 | Toggle input method mid-form | Derived values recalculate; preview refires |

---

## 15. Financials Tab — Budget Ledger

### 15.1 Element Name & UI Type
Sub-section within the Financials tab. Data table of budget entries (SOW + Adjustment + CO rows) with a running-total column. Header toolbar has "Add Budget Entry" button (PM only). Above the table: summary cards for Total Budget and Total Hours.

### 15.2 Business Purpose
Provides a full audit-grade financial ledger of how the project budget has evolved — from the original SOW baseline through adjustments and approved change orders. The running total makes it immediately clear what the authorised budget is at any point in time.

### 15.3 User Interaction Behaviour
- **Add Budget Entry** → opens Add Budget Entry dialog. Limited to types `"SOW"` and `"Adjustment"`. `"CO"` type rows are inserted automatically by the change-order approval flow.
- **Running total column** → read-only, visually shows cumulative budget at each row.
- **Document link** → clickable hyperlink if `documentLink` is set on the entry.
- No edit of existing entries (budget ledger is append-only for audit integrity). SOW row is unique per project.

### 15.4 Triggered Actions & Navigation Flow
Add Budget Entry: `POST /api/projects/:id/budget-entries` → `invalidateQueries(["budget-entries", projectId])` → table re-renders with new row + updated running totals.

### 15.5 Exact Source of Data
`GET /api/projects/:id/budget-entries` returns:
```json
{
  "totalAmount": 150000.00,
  "totalHours": 2000,
  "entries": [
    { "id": 1, "type": "SOW", "amount": 120000, "hours": 1600,
      "runningAmount": 120000, "runningHours": 1600, ... },
    { "id": 2, "type": "CO",  "amount": 30000, "hours": 400,
      "runningAmount": 150000, "runningHours": 2000, ... }
  ]
}
```

### 15.6 Upstream / Downstream Dependencies
CO entries are written here by the change-order approval handler. The `totalAmount` from this endpoint is the source of truth for the "Revised Budget" KPI card's headline figure.

### 15.7 Calculation Logic
Server-side running totals computed on read:
```
rows ordered by (entryDate ASC, id ASC)
runningAmount[n] = SUM(amount[0..n])
runningHours[n]  = SUM(hours[0..n])
```
Both rounded to 2 decimal places (`Number(runningAmount.toFixed(2))`).

### 15.8 Event Chain
Change order approved → `PATCH /api/change-orders/:id { status: "Approved" }` → CO handler inserts `budgetEntriesTable` row with `type: "CO"` → `project.budget` incremented by `additionalBudget` → `invalidateQueries(["budget-entries", projectId])` + `invalidateQueries(["project", projectId])` → ledger table re-renders + KPI card updates.

### 15.9 Data Modification Logic
`POST /api/projects/:id/budget-entries` body:
```
{ entryDate, type: "SOW" | "Adjustment", description, amount, hours, documentLink? }
```
Validations:
- `type === "SOW"` and SOW already exists → 409 `"An SOW entry already exists"`.
- Race condition (concurrent POSTs for SOW) handled by partial unique index `budget_entries_sow_per_project_uq` → pg error `23505` caught and returned as 409.
- `description` required (non-empty).
- `type === "CO"` not allowed from this endpoint (returns 400).

### 15.10 Connected Menus / Modules / Workflows
- Change Requests tab: approved COs write a row here automatically.
- Finance → Invoices: `invoicedAmount` (from summary endpoint) is compared against `totalAmount` to compute `budgetUsedPercent`.
- Revised Budget KPI card: headline figure = `budgetEntriesTable` total.

### 15.11 Permissions & Visibility
Table visible to all non-customer roles. "Add Budget Entry" button: `{isPM && ...}`.

### 15.12 Validation & Exception Handling
SOW already exists → 409 with clear message. CO type blocked → 400. `amount` not a number → coerced via `Number(amount) || 0` (fallback to 0). Negative amounts: not explicitly blocked (adjustments can be negative to correct overbilling).

### 15.13 Backend / API / DB Assumptions
`budget_entries` table: `id` (serial), `projectId`, `entryDate` (date), `type` (text), `description` (text), `amount` (numeric), `hours` (numeric), `documentLink` (text nullable). Partial unique index: `CREATE UNIQUE INDEX … WHERE type='SOW'`. No soft-delete on budget entries.

### 15.14 Audit Trail
`POST /api/projects/:id/budget-entries` → `action: "updated"` on project entity (Phase 3.7 correction — budget entries are an extension of the project financial record). CO auto-insertion → `action: "updated"` on project + `action: "approved"` on change-order.

### 15.15 UI/UX Behaviour
Entries table columns: Date | Type (pill badge) | Description | Amount | Hours | Running Total | Link. SOW row has a subtle indigo left border as the baseline indicator. CO rows have a teal border. Adjustment rows have an orange border. Running total cells right-aligned in monospace font.

### 15.16 Testing Scenarios
| ID | Scenario | Expected |
|---|---|---|
| BL-01 | Add SOW entry | Row inserted; running total starts from SOW amount |
| BL-02 | Add second SOW entry | 409 error returned |
| BL-03 | Concurrent duplicate SOW POST | One succeeds, second gets 409 from DB index |
| BL-04 | Approve change order | CO row auto-inserted; totalAmount increases |
| BL-05 | Add Adjustment entry (negative) | Running total decreases |
| BL-06 | collaborator visits Financials tab | Table visible, no Add button |

---

## 16. Financials Tab — Cost Entries

### 16.1 Element Name & UI Type
Sub-section within Financials tab. Table of direct project costs (non-labour expenses). "Add Cost Entry" button (PM only). Rows display vendor, cost category, amount, date, and description.

### 16.2 Business Purpose
Tracks non-labour costs against the project (software licences, travel, subcontractors, hardware). Combined with invoiced amounts, provides a full picture of project profitability: `margin = invoicedAmount - totalCosts - labourCosts`.

### 16.3 User Interaction Behaviour
- "Add Cost Entry" → inline form or dialog with: date, category (dropdown), vendor (text), amount, description.
- Row delete icon → `DELETE /api/cost-entries/:id` after confirm.
- No edit of existing cost entries (append-only for audit).

### 16.4 Triggered Actions & Navigation Flow
`POST /api/cost-entries` with `{ projectId, date, category, vendor, amount, description }` → `invalidateQueries(["cost-entries", projectId])`.  
`DELETE /api/cost-entries/:id` → same invalidation.

### 16.5 Exact Source of Data
`GET /api/cost-entries?projectId=:id` — filtered by `projectId`. Returns array of cost entry objects.

### 16.6 Upstream / Downstream Dependencies
No downstream computed metrics currently aggregate cost entries into the KPI cards (future: profitability reporting). The Revenue Recognition report tab reads `cost-entries` to compute project margin.

### 16.7 Calculation Logic
Client-side total: `SUM(entries.map(e => e.amount))` shown in a footer row of the table.

### 16.8 Event Chain
Add cost entry → table re-renders → footer total updates. No cross-module invalidation currently.

### 16.9 Data Modification Logic
`POST /api/cost-entries`:
```
{ projectId, date (YYYY-MM-DD), category (text), vendor (text), amount (numeric), description (text) }
```
Phase 2.1 validation: `amount >= 0` enforced server-side.  
`DELETE /api/cost-entries/:id`: hard delete.

### 16.10 Connected Menus / Modules / Workflows
Revenue Recognition report reads cost entries for margin computation. No other cross-module links currently.

### 16.11 Permissions & Visibility
Table visible to all non-customer roles. Add/Delete: `requirePM` middleware server-side; buttons hidden client-side for `collaborator`.

### 16.12 Validation & Exception Handling
`amount < 0` → 422 from API (Phase 2.1 floor).  
`date` missing or non-date string → 400.  
Category dropdown: free-text OR enumerated list from `GET /api/cost-categories` if configured.

### 16.13 Backend / API / DB Assumptions
`cost_entries` table: `id`, `projectId`, `date`, `category`, `vendor`, `amount` (numeric), `description`, `createdAt`. No soft delete. Index on `(projectId)`.

### 16.14 Audit Trail
`POST /api/cost-entries` → `action: "created"` on `cost_entry` entity.  
`DELETE /api/cost-entries/:id` → `action: "deleted"`.

### 16.15 UI/UX Behaviour
Table footer row shows "Total: $X,XXX". Category column uses `<StatusBadge>` for visual grouping. Delete button is destructive red icon, requires confirm dialog.

### 16.16 Testing Scenarios
| ID | Scenario | Expected |
|---|---|---|
| CE-01 | Add cost entry with amount 0 | Accepted (floor is ≥ 0) |
| CE-02 | Add cost entry with amount -100 | 422 returned |
| CE-03 | Delete cost entry | Row removed, footer total recalculates |
| CE-04 | collaborator tries to delete | Button not rendered client-side; 403 if called directly |

---

## 17. Financials Tab — Asset Bookings

### 17.1 Element Name & UI Type
Sub-section within Financials tab. Table of equipment/asset bookings against this project. "Book Asset" button (PM only). Columns: Asset name, type, booking period, rate/day, total cost.

### 17.2 Business Purpose
Tracks equipment, vehicle, or tool reservations charged to the project. Integrates with the Assets module to prevent double-booking of physical resources.

### 17.3 User Interaction Behaviour
- "Book Asset" → dialog: select asset from dropdown, set booking start/end date. Asset availability is checked at save time.
- Delete booking → `DELETE /api/asset-bookings/:id`.

### 17.4 Triggered Actions & Navigation Flow
`POST /api/asset-bookings` with `{ assetId, projectId, startDate, endDate }` → `invalidateQueries(["asset-bookings", projectId])`.

### 17.5 Exact Source of Data
Assets dropdown: `GET /api/assets` (all assets with availability info).  
Bookings table: `GET /api/asset-bookings?projectId=:id`.

### 17.6 Upstream / Downstream Dependencies
Asset availability is checked by the assets router — overlapping bookings for the same asset across different projects are rejected at the API level.

### 17.7 Calculation Logic
Total cost per booking: `asset.dailyRate × workingDays(startDate, endDate)`.

### 17.8 Event Chain
Book Asset → POST → assets availability recalculated → booking row appears. Asset module's availability indicator updates across any other project viewing the same asset.

### 17.9 Data Modification Logic
`POST /api/asset-bookings` validates no overlapping booking exists for `assetId` in the given date range. Overlap → 409 `"Asset is already booked for this period"`.

### 17.10 Connected Menus / Modules / Workflows
Admin → Assets page manages the asset catalogue. Resource planning can view asset utilisation.

### 17.11 Permissions & Visibility
Table visible to all non-customer roles. Book Asset / Delete: `requirePM`.

### 17.12 Validation & Exception Handling
Overlapping booking → 409. `endDate < startDate` → 400. Asset not found → 404.

### 17.13 Backend / API / DB Assumptions
`asset_bookings` table: `id`, `assetId` (FK → assets), `projectId`, `startDate`, `endDate`, `createdAt`. No soft delete. Unique constraint: no overlap on `assetId + date range` (enforced by application-level check, not DB constraint).

### 17.14 Audit Trail
`action: "created"` on `asset_booking` entity when booked. `action: "deleted"` on unbooking.

### 17.15 UI/UX Behaviour
Daily rate column formatted as currency. Total cost calculated and shown inline. Conflicting availability shown as a warning on the asset in the dropdown (greyed, labelled "Unavailable [dates]").

### 17.16 Testing Scenarios
| ID | Scenario | Expected |
|---|---|---|
| AB-01 | Book an available asset | Booking row appears |
| AB-02 | Book same asset for overlapping dates | 409 shown in dialog |
| AB-03 | Delete booking | Asset becomes available again in the dropdown |

---

## 18. Change Requests Tab

### 18.1 Element Name & UI Type
Tab panel with Kanban-style card columns or list view of change orders (COs): Draft | Submitted | Approved | Rejected. "New Change Request" button (PM only). Count badge in tab label.

### 18.2 Business Purpose
Formal scope-change governance. Change orders record scope additions, timeline extensions, or budget adjustments that require explicit approval before they affect the project baseline. Approved COs automatically update the budget ledger.

### 18.3 User Interaction Behaviour
- **New Change Request** → dialog: title, description, impact (budget `additionalBudget`, hours `additionalHours`), requested by, requested date.
- **Submit CO** (PM) → `PATCH /api/change-orders/:id { status: "Submitted" }`.
- **Approve CO** (account_admin only) → `PATCH /api/change-orders/:id { status: "Approved" }`.
- **Reject CO** (account_admin only) → `PATCH /api/change-orders/:id { status: "Rejected" }`.
- Self-approval blocked: user who created the CO cannot approve it (same self-approval guard as timesheets).

### 18.4 Triggered Actions & Navigation Flow
CO Approved → `PATCH /api/change-orders/:id { status: "Approved" }`:
1. CO `status` updated to `"Approved"`.
2. `project.budget` incremented by `additionalBudget`.
3. `project.budgetedHours` incremented by `additionalHours`.
4. `budgetEntriesTable` row inserted with `type: "CO"`.
5. `invalidateQueries(["change-orders", projectId])` + `invalidateQueries(["project", projectId])` + `invalidateQueries(["budget-entries", projectId])`.

### 18.5 Exact Source of Data
`GET /api/projects/:id/change-orders` — returns all COs for the project with status, amounts, timestamps, and `requestedByUserId`.

### 18.6 Upstream / Downstream Dependencies
**Downstream (on approval):** `project.budget` + `project.budgetedHours` updated → KPI cards re-render → budget ledger gains a new CO row.  
**Self-approval guard:** `actorUserId !== co.requestedByUserId || actorRole === 'account_admin'`.

### 18.7 Calculation Logic
Phase 2.1 validation on CO creation:
```
additionalBudget  >= 0
additionalHours   >= 0
```
Both enforced server-side (400 if violated).

### 18.8 Event Chain
CO approved → project budget ledger updated → KPI Revised Budget card re-renders → Hours KPI card re-renders (budgetedHours increased).

### 18.9 Data Modification Logic
`POST /api/change-orders`: creates CO with `status: "Draft"`.  
`PATCH /api/change-orders/:id`: status transitions. Approval side-effects: budget fields incremented on `projectsTable`; `budgetEntriesTable` row inserted.  
`DELETE /api/change-orders/:id`: only for Draft status; Submitted/Approved/Rejected cannot be deleted.

### 18.10 Connected Menus / Modules / Workflows
Budget Ledger sub-section of Financials tab. If `budgetLocked`, a direct budget edit is blocked and the error response includes `changeOrderUrl: /projects/:id?tab=changes`.

### 18.11 Permissions & Visibility
New CO / Submit: `isPM`. Approve / Reject: `requireAdmin` (`account_admin` only). Self-approval blocked for all roles.

### 18.12 Validation & Exception Handling
- `additionalBudget < 0` → 400 (Phase 2.1).
- Self-approval attempt → 403 with `error: "self_approval"`.
- Already Approved/Rejected CO cannot be re-submitted → 422 `"invalid_transition"`.
- Delete Approved CO → 403 `"Cannot delete an approved change order"`.

### 18.13 Backend / API / DB Assumptions
`change_orders` table: `id`, `projectId`, `title`, `description`, `status` (text), `additionalBudget` (numeric), `additionalHours` (numeric), `requestedByUserId`, `requestedDate`, `approvedByUserId`, `approvedAt`, `createdAt`. The approval side-effects are transactional (both the CO status update and the budget increment happen in one DB transaction).

### 18.14 Audit Trail
CO created: `action: "created"` on `change_order`.  
CO approved: `action: "approved"` on `change_order` + `action: "updated"` on `project` (budget fields).  
CO rejected: `action: "rejected"` on `change_order`.

### 18.15 UI/UX Behaviour
Status columns in Kanban board or list. CO cards show title, requested amount, status badge, requested-by user avatar. Approved COs have a green left border; rejected have red. Approve/Reject buttons only visible to `account_admin` users.

### 18.16 Testing Scenarios
| ID | Scenario | Expected |
|---|---|---|
| CR-01 | Create CO with additionalBudget = -1000 | 400 returned |
| CR-02 | PM submits CO | Status → Submitted |
| CR-03 | Admin approves CO | Status → Approved; project.budget increases; budget ledger CO row added |
| CR-04 | Requestor tries to approve own CO | 403 self_approval error |
| CR-05 | Attempt to delete Approved CO | 403 returned |
| CR-06 | Second approval of same CO (idempotency) | No double budget write (idempotency test in `idempotency.test.ts`) |

---

## 19. CSAT Tab

### 19.1 Element Name & UI Type
Tab panel displaying CSAT (Customer Satisfaction) survey ratings per milestone or delivery checkpoint. Shows a distribution chart (star ratings 1–5), average score, and a list of individual survey responses. "Request CSAT" button (PM only). Count badge on tab label.

### 19.2 Business Purpose
Captures client satisfaction at key project checkpoints without leaving the PSA platform. CSAT data feeds the CSAT Trend report and the global CSAT dashboard.

### 19.3 User Interaction Behaviour
- **Request CSAT** → dialog: select milestone/event, recipient email, custom message → `POST /api/projects/:id/csat-surveys` sends a survey link.
- **Submit Rating** (customer role via portal — separate flow) → `PATCH /api/csat-surveys/:id { rating, comment }`.
- Distribution chart: bar chart of rating counts.
- Individual response cards: star rating, comment, date, respondent name.

### 19.4 Triggered Actions & Navigation Flow
Request CSAT: `POST /api/projects/:id/csat-surveys` → creates survey record in `csat_surveys` table → email notification sent.  
Response submitted: `PATCH /api/csat-surveys/:id { rating, comment }` → survey marked complete → CSAT tab re-fetches.

### 19.5 Exact Source of Data
`GET /api/projects/:id/csat-surveys` — returns all surveys with `rating`, `comment`, `submittedAt`, `respondentName`.

### 19.6 Upstream / Downstream Dependencies
**Downstream:** CSAT Trend report aggregates ratings over time. Project Health report uses average CSAT as a health input. Dashboard can surface low-CSAT projects.

### 19.7 Calculation Logic
```
averageRating = SUM(surveys.rating WHERE rating IS NOT NULL) / COUNT(surveys WHERE rating IS NOT NULL)
distribution[star] = COUNT(surveys WHERE rating = star)
```
Both computed client-side from the surveys array.

### 19.8 Event Chain
Survey submitted by respondent → `PATCH /api/csat-surveys/:id` → `invalidateQueries(["csat", projectId])` → average score updates.

### 19.9 Data Modification Logic
`POST /api/projects/:id/csat-surveys`: creates survey in `Pending` state.  
`PATCH /api/csat-surveys/:id { rating (1–5), comment (text) }`: marks survey `Completed`.

### 19.10 Connected Menus / Modules / Workflows
Reports → CSAT Trend. Dashboard → Needs Attention (low-CSAT projects surfaced there).

### 19.11 Permissions & Visibility
Request CSAT: `{isPM && ...}`. CSAT list: visible to all non-customer roles. `customer` role cannot access the project detail page at all (denyCustomerRole middleware); they respond via a standalone survey URL.

### 19.12 Validation & Exception Handling
`rating` must be integer 1–5; outside this range → 422.  
Duplicate submission on same survey ID → 409.

### 19.13 Backend / API / DB Assumptions
`csat_surveys` table: `id`, `projectId`, `milestoneId` (nullable FK → tasks), `respondentEmail`, `respondentName`, `rating` (int nullable), `comment` (text), `status` (`Pending`/`Completed`), `sentAt`, `submittedAt`.

### 19.14 Audit Trail
Survey requested: `action: "created"` on `csat_survey`.  
Rating submitted: `action: "updated"` on `csat_survey` with `previousValue: { rating: null }`.

### 19.15 UI/UX Behaviour
Distribution: horizontal bar chart with star icons. Average score: large number with a star icon. Pending surveys (no rating yet) shown in a separate "Awaiting Response" section with days-since-sent indicator.

### 19.16 Testing Scenarios
| ID | Scenario | Expected |
|---|---|---|
| CS-01 | Request CSAT for a milestone | Survey row appears in Pending section |
| CS-02 | Submit rating of 4 | Average score updates; distribution bar for 4★ increments |
| CS-03 | Submit rating of 6 | 422 returned |
| CS-04 | Submit rating to already-completed survey | 409 returned |

---

## 20. Documents Tab

### 20.1 Element Name & UI Type
Tab panel rendered by `<ProjectDocuments>` component. Two sub-sections: **Project Documents** (uploaded files linked to this project) and **From Template** (apply a document template to generate a new document). Table columns: name, type, uploaded by, date, download link.

### 20.2 Business Purpose
Centralises all project artefacts (SOW, requirements, contracts, deliverables) in one place, eliminating the need to search shared drives. Document Templates allow standardised document generation (e.g., status report template, sign-off form).

### 20.3 User Interaction Behaviour
- **Upload Document** → file picker → `POST /api/documents` (multipart upload) with `projectId`.
- **From Template** → select a document template from dropdown → `POST /api/documents/from-template { templateId, projectId }` → generates a document from the template's content, substituting `{{projectName}}`, `{{clientName}}`, etc. placeholders.
- **Delete Document** → `DELETE /api/documents/:id` (PM only).
- **Download / Open** → link to stored file URL.

### 20.4 Triggered Actions & Navigation Flow
Upload: `POST /api/documents` → `invalidateQueries(["documents", projectId])`.  
From Template: `POST /api/documents/from-template` → new document row with template-substituted content.

### 20.5 Exact Source of Data
`GET /api/documents?projectId=:id` — list of documents linked to this project.  
Templates dropdown: `GET /api/document-templates` — all admin-configured document templates.

### 20.6 Upstream / Downstream Dependencies
Document templates (Admin → Document Templates) seed the dropdown. The `document_templates.content` field uses Handlebars-style placeholders (`{{projectName}}`, `{{clientName}}`, `{{startDate}}`, `{{dueDate}}`).

### 20.7 Calculation Logic
Placeholder substitution (server-side on `POST /api/documents/from-template`):
```
content.replace("{{projectName}}", project.name)
       .replace("{{clientName}}",  account.name)
       .replace("{{startDate}}",   project.startDate)
       .replace("{{dueDate}}",     project.dueDate)
```

### 20.8 Event Chain
From Template: `POST` → server fetches template, substitutes placeholders, inserts `documents` row with `content` field → response returns document URL → `invalidateQueries(["documents", projectId])` → new row in table.

### 20.9 Data Modification Logic
`POST /api/documents`: `{ projectId, name, type, fileUrl, description }`. No file storage in DB — `fileUrl` is an external storage URL (e.g., S3 presigned URL).  
`DELETE /api/documents/:id`: soft or hard delete (implementation-dependent).

### 20.10 Connected Menus / Modules / Workflows
Admin → Document Templates manages the template catalogue. Budget Entry can attach a `documentLink` to reference a document from the ledger.

### 20.11 Permissions & Visibility
Document list visible to all non-customer roles. Upload / From Template / Delete: `{isPM && ...}`.

### 20.12 Validation & Exception Handling
File type not allowed → client-side file input `accept` filter + server-side MIME type check → 415.  
Max file size: enforced by Express `multer` configuration.  
Template not found → 404.

### 20.13 Backend / API / DB Assumptions
`documents` table: `id`, `projectId`, `name`, `documentType`, `fileUrl` (text), `description`, `uploadedByUserId`, `createdAt`. `document_templates` table: `id`, `name`, `documentType`, `content` (text), `createdByUserId`.

### 20.14 Audit Trail
`action: "created"` on `document` entity when uploaded or generated.  
`action: "deleted"` on document removal.

### 20.15 UI/UX Behaviour
Documents table: icon per document type (PDF, Word, spreadsheet). File name as clickable link. "From Template" uses a secondary button style to distinguish from the primary upload action.

### 20.16 Testing Scenarios
| ID | Scenario | Expected |
|---|---|---|
| DO-01 | Upload a PDF | Document row appears with PDF icon |
| DO-02 | Generate from template | Row appears with substituted name |
| DO-03 | Template placeholders replaced | {{projectName}} → "FrostLine WMS Implementation" |
| DO-04 | Delete document (PM) | Row removed |
| DO-05 | collaborator tries to delete | Button not rendered |

---

## 21. Timeline / Gantt Tab

### 21.1 Element Name & UI Type
Tab panel rendering a horizontal Gantt bar chart. Phase rows as group headers; task bars spanning their `startDate`–`dueDate`. Toolbar: "Shift All Dates" button (date offset input + direction) and "Shift from Task" button.

### 21.2 Business Purpose
Visual timeline representation of the project task schedule. Allows PMs to spot schedule conflicts, gaps, and critical path issues at a glance, and to bulk-shift dates without editing each task individually.

### 21.3 User Interaction Behaviour
- Task bars rendered proportionally on a date axis.
- **Shift All Dates** → input: number of days (positive or negative) → `POST /api/projects/:id/shift-dates { days }`.
- **Shift from Task** → select a task → `POST /api/projects/:id/shift-dates { days, fromTaskId }` — shifts the selected task and all downstream dependents.
- Hover over bar → tooltip: task name, start, due, assignee, status.

### 21.4 Triggered Actions & Navigation Flow
`POST /api/projects/:id/shift-dates` → all tasks in scope shifted by `days` ms → project dates also shifted (if `fromTaskId` not provided) → `invalidateQueries(["tasks", projectId])` + `invalidateQueries(["project", projectId])`.

### 21.5 Exact Source of Data
`GET /api/projects/:id/gantt` — returns tasks with `id`, `name`, `startDate`, `dueDate`, `parentTaskId`, `isPhase`, `status`, `assigneeId`, `dependencies[]`.

### 21.6 Upstream / Downstream Dependencies
Task dependencies (`task_dependencies` table) determine which tasks are "downstream" of a given task for the BFS shift logic.

### 21.7 Calculation Logic
Shift BFS (server-side, `shift-dates` route):
```
if fromTaskId:
  taskIdsToShift = BFS from fromTaskId following task_dependencies.successorId edges
else:
  taskIdsToShift = ALL tasks for project

for each task in taskIdsToShift:
  task.startDate += shiftMs
  task.dueDate   += shiftMs

if !fromTaskId:
  project.startDate += shiftMs
  project.dueDate   += shiftMs
```
`shiftMs = days × 86_400_000`.

### 21.8 Event Chain
Shift Dates → POST → tasks + project updated → `invalidateQueries` → Gantt re-renders with new bar positions + KPI Timeline card updates.

### 21.9 Data Modification Logic
`POST /api/projects/:id/shift-dates` body: `{ days: integer (non-zero), fromTaskId?: integer }`. Requires `requirePM` middleware.

### 21.10 Connected Menus / Modules / Workflows
Task dates changed here are the same dates shown in the Tasks tab. Allocations outside the new project date range trigger `outOfRangeAllocationCheck` (fire-and-forget) when project dates are shifted.

### 21.11 Permissions & Visibility
Gantt view: all non-customer roles. Shift Dates button: `{isPM && ...}`.

### 21.12 Validation & Exception Handling
`days = 0` → 400 `"days must be a non-zero integer"`.  
`days` is not a number → 400.  
`fromTaskId` not found in project → 400.

### 21.13 Backend / API / DB Assumptions
`task_dependencies` table: `predecessorId`, `successorId`. Shift route fetches all deps in one query (`inArray(predecessorId, allTaskIds)`) then BFS in memory — no per-task query.

### 21.14 Audit Trail
`action: "updated"` on project entity: `"Shifted dates by N days"`.

### 21.15 UI/UX Behaviour
Gantt bar colours match task status (indigo = In Progress, green = Completed, red = Overdue, orange = Blocked). Today line rendered as a vertical dashed line. Phase rows rendered as a dark header bar spanning all child tasks. Dependencies rendered as arrows between task bars (if dependency data available).

### 21.16 Testing Scenarios
| ID | Scenario | Expected |
|---|---|---|
| GN-01 | Shift all dates by 7 | All tasks and project dates shift; KPI Timeline updates |
| GN-02 | Shift from task (BFS) | Only downstream tasks shift; upstream unchanged |
| GN-03 | Shift by 0 days | 400 returned |
| GN-04 | Shift by negative days (earlier) | Tasks move backward; project.startDate also moves back |

---

## 22. Time Tab

### 22.1 Element Name & UI Type
Tab panel rendered by `<TrackedTimeTab>` (`components/tracked-time-tab.tsx`). Table of time entries for this project: date, user, task, hours, category, billable flag, description. Toolbar: date range filter.

### 22.2 Business Purpose
Project-level time entry audit view. Allows PMs to review who has logged time, against which tasks, and how many hours — without navigating away from the project. Feeds into invoicing decisions.

### 22.3 User Interaction Behaviour
- Date range filter → refetches with `?startDate=&endDate=` params.
- Row hover → tooltip with full description.
- No inline editing on this tab (time entries are edited via Time Tracking module).

### 22.4 Triggered Actions & Navigation Flow
Date range change → `GET /api/time-entries?projectId=:id&startDate=&endDate=` refetch.

### 22.5 Exact Source of Data
`GET /api/time-entries?projectId=:id` with optional date range params. Returns entries for all users on this project.

### 22.6 Upstream / Downstream Dependencies
Time entries here are the same records that drive the Hours Used KPI card (`trackedHours`). Approving a timesheet creates time entries that appear in this tab.

### 22.7 Calculation Logic
Client-side totals: `SUM(entries.hours)` grouped by user or task in footer row.

### 22.8 Event Chain
Timesheet approved → `time_entries` rows created → `invalidateQueries(["time-entries", projectId])` → Time tab table updates.

### 22.9 Data Modification Logic
Read-only on this tab. Mutations happen in Time Tracking module.

### 22.10 Connected Menus / Modules / Workflows
Finance → Invoices: invoice line items reference time entries. AI timesheet assistant creates time entries that appear here.

### 22.11 Permissions & Visibility
Visible to all non-customer roles. No write actions on this tab.

### 22.12 Validation & Exception Handling
Empty date range → all entries returned. Invalid date format → React Query `onError` fires toast.

### 22.13 Backend / API / DB Assumptions
`time_entries` table index on `(project_id)`. Pagination: opt-in via `?limit=&offset=` (Sprint 2 Phase 6 — paginated envelope returned when `limit` param present).

### 22.14 Audit Trail
None on read. Time entry mutations have their own audit trail in the Time Tracking module.

### 22.15 UI/UX Behaviour
Billable entries marked with a green `$` badge. Non-billable shown in muted text. Sticky table header. Footer row shows total hours for filtered view.

### 22.16 Testing Scenarios
| ID | Scenario | Expected |
|---|---|---|
| TT-01 | No time entries | Empty state with "No time logged" message |
| TT-02 | Filter by date range | Only entries in range shown |
| TT-03 | 50 time entries | Paginated if limit param provided |
| TT-04 | Timesheet approved | New entries appear in tab |

---

## 23. Updates Tab

### 23.1 Element Name & UI Type
Tab panel for project status updates (narrative updates, equivalent to "standup notes" or "client reports"). Card list of update posts. "Post Update" button (PM only). Count badge on tab label.

### 23.2 Business Purpose
Creates a chronological project communication log. PMs post updates to keep stakeholders informed. Updates can be sent to named recipients (tracked via `update_recipients` table).

### 23.3 User Interaction Behaviour
- **Post Update** → dialog: title, body (rich text), template selector (pre-fills body from a template), recipient list (multi-select from allocated users + account contacts).
- Posted updates appear in reverse-chronological card list.
- Update cards: title, body, posted by, posted at, recipients.

### 23.4 Triggered Actions & Navigation Flow
`POST /api/projects/:id/updates` with `{ title, body, recipientUserIds[] }` → update created → `invalidateQueries(["updates", projectId])`.

### 23.5 Exact Source of Data
`GET /api/projects/:id/updates` — returns updates with nested `recipients` array from `update_recipients` join.

### 23.6 Upstream / Downstream Dependencies
`update_recipients` table tracks delivery status per recipient (read/delivered). The recipient list is seeded from `GET /api/allocations?projectId=:id` (allocated users) plus the account's primary contacts.

### 23.7 Calculation Logic
None — pure content display.

### 23.8 Event Chain
Update posted → `project_updates` row inserted + `update_recipients` rows inserted → notification sent to each recipient (type `project_update_posted`) → tab count badge increments.

### 23.9 Data Modification Logic
`POST /api/projects/:id/updates` body: `{ title, body, recipientUserIds: number[] }`. Server inserts one row in `project_updates` and one row per recipient in `update_recipients`.

### 23.10 Connected Menus / Modules / Workflows
Notifications feed: each recipient gets a `project_update_posted` notification. Update templates are maintained in Admin → Document Templates (type `"status_update"`).

### 23.11 Permissions & Visibility
Read: all non-customer roles. Post Update button: `{isPM && ...}`.

### 23.12 Validation & Exception Handling
Empty `title` or `body` → client-side required field validation; Save disabled.  
No recipients selected → allowed (update is logged but no notifications sent).

### 23.13 Backend / API / DB Assumptions
`project_updates` table: `id`, `projectId`, `title`, `body` (text), `postedByUserId`, `createdAt`.  
`update_recipients` table: `id`, `updateId`, `userId`, `sentAt`, `readAt`.

### 23.14 Audit Trail
`action: "created"` on `project_update` entity when posted.

### 23.15 UI/UX Behaviour
Update cards rendered in a card list with posted-by avatar, relative timestamp ("3 days ago"), recipients shown as avatar stack. Body text supports Markdown rendering. Long bodies truncated with "Read more" expander.

### 23.16 Testing Scenarios
| ID | Scenario | Expected |
|---|---|---|
| UP-01 | Post update with recipients | Update appears in list; recipients notified |
| UP-02 | Post update with no recipients | Update appears; no notifications sent |
| UP-03 | Post update with empty title | Save button disabled |
| UP-04 | collaborator visits | Can read updates; no Post button |

---

## 24. RAID Tab

### 24.1 Element Name & UI Type
Tab panel for RAID log (Risks, Assumptions, Issues, Dependencies). Sectioned table with one section per RAID category. "Add Risk / Add Assumption / Add Issue / Add Dependency" buttons (PM only). Each row: title, description, impact (High/Medium/Low), status (Open/Mitigated/Closed), owner.

### 24.2 Business Purpose
Structured risk and issue management for the project. RAID is a standard PMO artefact required for enterprise delivery governance. Keeping it in the PSA platform creates a single audit trail rather than a separate spreadsheet.

### 24.3 User Interaction Behaviour
- **Add entry** → dialog: select type (Risk/Assumption/Issue/Dependency), title, description, impact, probability (for risks), owner (user dropdown), mitigation plan (text).
- **Edit row** → same dialog pre-filled → `PATCH /api/project-risks/:id`.
- **Delete row** → `DELETE /api/project-risks/:id` (PM only).
- **Status toggle** → inline dropdown for quick Open → Mitigated / Closed transitions.

### 24.4 Triggered Actions & Navigation Flow
`POST /api/project-risks` → `invalidateQueries(["risks", projectId])`.  
`PATCH /api/project-risks/:id { status: "Mitigated" }` → row updates inline.

### 24.5 Exact Source of Data
`GET /api/project-risks?projectId=:id` — all RAID entries for the project.

### 24.6 Upstream / Downstream Dependencies
RAID entries linked to `projectId`. Owner field references `users.id`. No downstream computed metrics currently depend on RAID data (future: risk-weighted project health score).

### 24.7 Calculation Logic
None — pure CRUD display.

### 24.8 Event Chain
Risk status changed → `PATCH` → query invalidation → row re-renders.

### 24.9 Data Modification Logic
`POST /api/project-risks` body: `{ projectId, type ("Risk"|"Assumption"|"Issue"|"Dependency"), title, description, impact ("High"|"Medium"|"Low"), status ("Open"|"Mitigated"|"Closed"), ownerId?, mitigationPlan?, probability? }`.

### 24.10 Connected Menus / Modules / Workflows
No current cross-module links. Planned: risk heatmap on the Reports page.

### 24.11 Permissions & Visibility
RAID table: visible to all non-customer roles. Add/Edit/Delete: `{isPM && ...}`.

### 24.12 Validation & Exception Handling
`title` required (non-empty). `type` must be one of four valid values. `impact` must be one of three valid values. Invalid values → 400.

### 24.13 Backend / API / DB Assumptions
`project_risks` table: `id`, `projectId`, `type` (text), `title`, `description`, `impact` (text), `status` (text), `ownerId` (nullable FK → users), `mitigationPlan` (text), `probability` (numeric nullable), `createdAt`. Route: `artifacts/api-server/src/routes/risks.ts`.

### 24.14 Audit Trail
`action: "created"` / `action: "updated"` / `action: "deleted"` on `project_risk` entity.

### 24.15 UI/UX Behaviour
Four collapsible sections (one per RAID type). Impact badge: red = High, amber = Medium, blue = Low. Status badge: red = Open, amber = Mitigated, green = Closed. Row count per section shown in section header.

### 24.16 Testing Scenarios
| ID | Scenario | Expected |
|---|---|---|
| RD-01 | Add a Risk with High impact | Row appears in Risks section |
| RD-02 | Update status to Mitigated | Row badge changes to amber Mitigated |
| RD-03 | Delete an Issue | Row removed from Issues section |
| RD-04 | Add entry with invalid type | 400 returned |
| RD-05 | collaborator visits | Can read; no Add/Edit/Delete |

---

## 25. Edit Project Dialog

### 25.1 Element Name & UI Type
Full `<Dialog>` / `<Sheet>` component opened by the "Edit Project" button. Contains a multi-field form: Name, Description, Status (dropdown), Health (dropdown), Account (searchable dropdown), Owner (PM user dropdown), Start Date, Due Date, Budget (numeric), Budgeted Hours (numeric), Currency (dropdown). Save and Cancel buttons.

### 25.2 Business Purpose
Single control surface for all project master-data fields. Supports the full project lifecycle through status transitions (Draft → Active → On Hold → Completed / Cancelled) with mandatory rationale capture to maintain audit integrity.

### 25.3 User Interaction Behaviour
1. Dialog opens with all fields pre-filled from `project` query cache.
2. User edits any field.
3. If the **Status** field is changed to a different value: a secondary "Status Change Reason" modal intercepts before save, requiring the user to enter a rationale (min meaningful text, no explicit char minimum but field is `required`).
4. User submits rationale → primary save fires → `PATCH /api/projects/:id`.
5. On success → dialog closes → `invalidateQueries(["project", projectId])`.

### 25.4 Triggered Actions & Navigation Flow
Save (non-status change): `PATCH /api/projects/:id { name, description, … }`.  
Save (status change): 
1. Status Change Reason modal appears.
2. User enters reason and confirms.
3. `PATCH /api/projects/:id { status: newStatus, statusChangeReason: reason }`.

If `Draft → Active` transition: server sets `budgetLocked = true` automatically (no UI control needed).

### 25.5 Exact Source of Data
Form initial values: `project` from `["project", projectId]` cache.  
Account dropdown: `GET /api/accounts`.  
Owner dropdown: `GET /api/users?role=super_user` (PMs only).

### 25.6 Upstream / Downstream Dependencies
Status change → `project_status_changed` notifications sent to all allocated users + project owner (fire-and-forget async worker).  
Date change → `outOfRangeAllocationCheck` fires (fire-and-forget).  
`Draft → Active` → `budgetLocked = true` → budget fields locked until explicitly unlocked by `account_admin`.

### 25.7 Calculation Logic
**Status transition matrix** (server-side, `ALLOWED_TRANSITIONS`):
```
not_started → [draft, active]
draft       → [active]
active      → [on_hold, completed, cancelled]
on_hold     → [active, cancelled]
completed   → []   (terminal)
cancelled   → []   (terminal)
```
Both `from` and `to` status values are normalised via `normaliseStatus(s)` before lookup.

**Date guard:** merged `{ …existing, …body }` checked: `dueDate >= startDate` else 400.

### 25.8 Event Chain
Status change PATCH:
1. `statusChangeReason` validated (non-empty string; 400 `reason_required` if missing).
2. Transition matrix checked (422 `invalid_transition` if not allowed).
3. Audit row written (`action: "status_changed"`).
4. DB row updated.
5. Fire-and-forget notification to allocated users.
6. React Query invalidation: `["project", projectId]`, `["project-summary", projectId]`.
7. Header status badge re-renders.

### 25.9 Data Modification Logic
`PATCH /api/projects/:id` body parsed by `UpdateProjectBody` Zod schema (`.strict()` mode — Phase 2.2). Fields include: `name?`, `description?`, `status?`, `statusChangeReason?`, `health?`, `accountId?`, `ownerId?`, `startDate?`, `dueDate?`, `budget?`, `budgetedHours?`, `budgetCurrency?`.

Forbidden when `budgetLocked = true`: `budget`, `budgetedHours`, `budgetCurrency` → 403 `budget_locked` with `changeOrderUrl`.

Forbidden on soft-deleted project: any PATCH → 409 `"Project is deleted; restore it before editing."`.

### 25.10 Connected Menus / Modules / Workflows
- Budget lock interacts with Change Requests tab (locked budget must be modified via CO).
- Status change notifications link to the notification feed.
- Owner change: `project.ownerId` is the `pmUserId` referenced by `outOfRangeAllocationCheck`.
- Account change: links to a different account in the Accounts module.

### 25.11 Permissions & Visibility
Dialog opener: `{isPM && <Button>}`. All fields within the dialog editable by `super_user`+. `account_admin` additionally has access to the "Unlock Budget" workflow (separate button/endpoint). `collaborator` cannot open the dialog.

### 25.12 Validation & Exception Handling
| Error | HTTP | Trigger |
|---|---|---|
| `reason_required` | 400 | Status change with no reason |
| `invalid_transition` | 422 | Status change not in matrix |
| `budget_locked` | 403 | Editing budget fields while locked |
| `dueDate before startDate` | 400 | Date cross-validation |
| `"Project is deleted"` | 409 | Editing a soft-deleted project |

All API errors surface as inline form alerts within the dialog. The dialog does not close on error.

### 25.13 Backend / API / DB Assumptions
`PATCH /api/projects/:id` is behind `requirePM`. The status transition guard, budget lock guard, date guard, and soft-delete guard all run before the DB update. They are sequential (not parallelised) to allow early returns with appropriate status codes.

### 25.14 Audit Trail
Non-status edits: single `action: "updated"` row, `entityType: "project"`.  
Status change: `action: "status_changed"` row with `previousValue: { status: old }`, `newValue: { status: new, reason: "…" }`.  
Both include `actorUserId` from `x-user-id` header.

### 25.15 UI/UX Behaviour
Status Change Reason intercept: secondary modal (nested dialog) with a `<Textarea>` for rationale, "Confirm Status Change" and "Cancel" buttons. The Cancel in the reason modal returns to the edit dialog (does not close it). Form validation highlights empty required fields on attempted save. Budget fields render with a lock icon when `project.budgetLocked === true`; they are disabled (greyed) and a tooltip explains the lock.

### 25.16 Testing Scenarios
| ID | Scenario | Expected |
|---|---|---|
| EP-01 | Edit name only | Name updated; no status intercept |
| EP-02 | Change status Draft → Active | Reason modal appears; on confirm → status updated; budgetLocked=true |
| EP-03 | Change status Active → Draft (invalid) | 422 invalid_transition |
| EP-04 | Change status Active → Completed with empty reason | 400 reason_required |
| EP-05 | Edit budget with budgetLocked=true | Budget fields disabled; 403 if bypassed via API |
| EP-06 | Set dueDate before startDate | 400 date guard |
| EP-07 | Status change → allocated users notified | Notification row created per user |
| EP-08 | collaborator accesses dialog via direct API call | 403 requirePM middleware |

---

## 26. Global Error, Loading & Empty States

### 26.1 Element Name & UI Type
Shared UI patterns applied across all elements on the page.

### 26.2 Business Purpose
Prevents the page from silently failing or showing stale/partial data. Consistent error and empty state presentation maintains user trust.

### 26.3 Loading States
- **Page-level loading:** Full-viewport centred `<Loader2 className="animate-spin h-12 w-12 text-primary">` while base project query is in-flight.
- **Tab-level loading:** Skeleton rows (`<Skeleton className="h-4 w-full">`) in each tab panel while tab-specific queries load.
- **Mutation loading:** Button spinner + `disabled` attribute during any in-flight mutation (add, edit, delete).

### 26.4 Error States
- **Page 404:** `<Card>` with destructive header "Project not found" + "Back to Projects" `<Link>`.
- **Page 500:** Same card pattern with "An error occurred loading this project".
- **Tab-level error:** Inline `<Alert variant="destructive">` within the tab panel; "Retry" button re-triggers the query.
- **Mutation error:** `toast({ variant: "destructive", title: "Error", description: apiError.message })`.

### 26.5 Empty States
Each tab has a tailored empty state:
- Tasks: "No tasks yet. Add a phase to get started." (with Add Phase button if PM)
- Team: "No team members yet. Add your first allocation."
- Financials: "No budget entries. Add an SOW entry to set the baseline."
- Change Requests: "No change requests."
- CSAT: "No CSAT surveys yet."
- Documents: "No documents attached."
- Time: "No time entries logged for this project."
- Updates: "No updates posted."
- RAID: "No RAID items recorded."

### 26.6 Global Error Handler
React Query `QueryCache.onError` (configured in `App.tsx`) fires a global error toast for any unhandled query error, so even new tab queries get consistent error surfacing without each tab needing its own error handler.

### 26.7 Permissions Intersection
When `isPM === false`, any write-action buttons (Add, Edit, Delete, Save) are not rendered. Attempting the same mutations via direct API calls returns 403 (`requirePM` middleware). The UI never reaches an inconsistent state where a button appears but the API denies the action.

---

*End of Functional & Technical Analysis — Project Detail Page*  
*BusinessNow PSA Platform — KSAP Technology*  
*Generated: May 2026*
