# BusinessNow PSA — Functional UI/UX Specification

**Version:** 1.0
**Date:** May 2026
**Owner:** Product / Engineering
**Audience:** Frontend, Backend, QA, UI/UX, Product

---

## 0. Document Conventions

| Token | Meaning |
|-------|---------|
| **R** | Read |
| **C** | Create |
| **U** | Update |
| **D** | Delete |
| **A** | Approve / Reject |
| `acct_admin` | account_admin (level 4) |
| `super_user` | super_user (level 3) |
| `collab` | collaborator (level 2) |
| `customer` | customer (level 1, blocked from internal API) |
| `—` | Not visible / not applicable |

All endpoints are prefixed with `/api/`. All requests carry `x-user-id` + `x-user-role` headers (validated by `roleClaim` middleware). Field names use camelCase; database columns use snake_case (Drizzle ORM handles mapping).

---

## 1. Application Overview

### 1.1 Purpose
BusinessNow PSA is a Professional Services Automation platform for service-delivery organizations. It manages the full sell-to-cash lifecycle: prospect → opportunity → project → resource allocation → time/expense → invoice → revenue recognition.

### 1.2 Top-level Modules
1. Dashboard
2. Projects
3. Accounts
4. Prospects
5. Opportunities
6. Time Tracking
7. Resources
8. Finance (Invoices · Billing Schedules · Revenue Recognition · Contracts)
9. Reports
10. Admin
11. Notifications
12. CSAT

### 1.3 Tech Stack
- **Frontend:** React 18 · Vite · Wouter (router) · TanStack Query · Tailwind · shadcn/ui · Recharts · DM Sans
- **Backend:** Express 5 · PostgreSQL · Drizzle ORM · Zod
- **Contract:** OpenAPI → Orval → React Query hooks + Zod schemas
- **Auth (dev):** trust-based via `x-user-role` + `x-user-id` headers; `GET /api/me` bootstraps identity
- **Theme:** indigo / violet, light + dark

### 1.4 Roles & Hierarchy

| Canonical role | Level | Can switch to |
|----------------|-------|---------------|
| `account_admin` | 4 | any role assigned to user |
| `super_user`    | 3 | super_user, collaborator |
| `collaborator`  | 2 | collaborator |
| `customer`      | 1 | blocked from internal API entirely |

`roleClaim` middleware rejects any request whose `x-user-role` is not in the user's assigned role set (401/403).

---

## 2. Global UI Patterns

### 2.1 Layout Shell (`<Layout>`)
| Region | Behavior |
|--------|----------|
| Sidebar | 56 px icon rail when collapsed, 240 px when expanded. State persisted in `localStorage("sidebarCollapsed")`. Section dividers: **Workspace** / **Admin**. |
| Topbar | Page title (`text-2xl font-bold tracking-tight`), breadcrumb, notification bell with unread badge, role-switch avatar menu. |
| Main | `max-w-screen-2xl mx-auto px-6 py-6`, uses `<PageHeader>` for title + actions. |
| Footer | None (chromeless). |

### 2.2 Shared Components
| Component | Purpose |
|-----------|---------|
| `<StatusBadge>` | Unified status pill — variants: `default`, `success`, `warn`, `danger`, `info`, `muted`. |
| `<TooltipCell>` | Truncated cell with full text on hover. |
| `<TreeToggle>` | Caret toggle for collapsible task tree rows. |
| `<RequirePermission>` | Route + element guard. Renders 403 page if predicate fails. |
| `<AuthGate>` | Blocks queries until `GET /me` resolves. |
| `<OnboardingChecklist>` | Dashboard-only; admin-dismissible. |

### 2.3 Global Toasts
| Trigger | Variant | Source |
|---------|---------|--------|
| Mutation success | success | per-mutation `onSuccess` |
| Mutation 4xx | warn | `QueryCache.onError` global handler |
| Mutation 5xx | danger | `QueryCache.onError` global handler |
| Validation 422 | warn (with field-level inline errors) | per-form |

### 2.4 Keyboard Shortcuts (global)
| Key | Action |
|-----|--------|
| `g d` | Go to Dashboard |
| `g p` | Go to Projects |
| `g t` | Go to Time Tracking |
| `?`   | Show shortcut palette |
| `Esc` | Close active modal / sheet |

### 2.5 Permissions Matrix (high-level)

| Module | acct_admin | super_user | collab | customer |
|--------|:----------:|:----------:|:------:|:--------:|
| Dashboard | R | R | R | — |
| Projects | CRUD | CRU (own) | R (assigned) | — |
| Accounts | CRUD | R | R | — |
| Prospects | CRUD | CRU | R | — |
| Opportunities | CRUD | CRU | R | — |
| Time Tracking — own | CRUD | CRUD | CRUD | — |
| Time Tracking — others | RUA | R (team) | — | — |
| Time Off — submit | C | C | C | — |
| Time Off — approve | A | A (team) | — | — |
| Resources — capacity | R | R | R | — |
| Resources — allocate | CRUD | CRU | — | — |
| Finance | CRUD | R | — | — |
| Reports | R | R | — | — |
| Admin | CRUD | — | — | — |

---

## 3. Module: Dashboard

### 3.1 Screen Overview
- **Purpose:** Single-glance health of the workspace.
- **Business objective:** Surface attention items (at-risk projects, overdue invoices) and KPIs.
- **Roles:** `acct_admin`, `super_user`, `collab`.

### 3.2 Screen Layout
```
┌─ PageHeader: "Dashboard" ─────────────────────────────────┐
│                                                           │
├─ Onboarding Checklist (admin only, dismissible) ─────────┤
│                                                           │
├─ KPI Row (4 cards, clickable) ───────────────────────────┤
│  Active Projects │ Billable Util │ Open Invoices │ CSAT  │
│                                                           │
├─ Two-column ──────────────────────────────────────────────┤
│  ┌─ Needs Attention ────┐  ┌─ Activity Feed ───────────┐ │
│  │ • At-risk projects   │  │ • last 50 events          │ │
│  │ • Overdue invoices   │  │ • paginated 20 at a time  │ │
│  └──────────────────────┘  └───────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

### 3.3 UI Components

| Component | Type | Mandatory | Editable | Visibility | Default | Validation |
|-----------|------|-----------|----------|------------|---------|------------|
| KpiCard | card | yes | no | all roles | live | — |
| OnboardingChecklist | accordion | no | dismiss | `acct_admin` && `!user.onboardingDismissed` | open | — |
| NeedsAttentionList | list | yes | navigate-only | all | top 10 | — |
| ActivityFeed | list | yes | navigate-only | all | last 50 | — |

### 3.4 Buttons & Actions

| Button | Position | Visibility | Enabled when | Action | API | Success | Error |
|--------|----------|------------|--------------|--------|-----|---------|-------|
| Dismiss onboarding | top-right of checklist | admin | always | sets `user.onboardingDismissed=true` | `PATCH /me` | hide checklist | toast danger |
| KPI tile | each tile | all | always | navigate to filtered list | — | route push | — |

### 3.5 Tables
N/A — uses cards + lists.

### 3.6 Forms
N/A.

### 3.7 Workflow & Navigation
- **Entry:** root `/` after login.
- **Exits:** KPI click → `/projects?status=active`, `/invoices?status=open`, `/reports?tab=utilization`, `/reports?tab=csat`. NeedsAttention items → respective detail pages.

### 3.8 Data Relationships
KPIs aggregate from `projects`, `time_entries`, `invoices`, `csat_responses`. NeedsAttention reads `projects` (status=at_risk) ∪ `invoices` (status=overdue).

### 3.9 API Integration

| Hook | Endpoint | Loading | Error |
|------|----------|---------|-------|
| `useGetMe` | `GET /me` | spinner in shell | retry 1× then `<AuthGate>` blocks |
| `useGetDashboardKpis` | `GET /dashboard/kpis` | skeleton tiles | toast |
| `useGetActivity` | `GET /activity?limit=50` | skeleton list | inline empty state |
| `useGetNeedsAttention` | `GET /dashboard/needs-attention` | skeleton list | inline empty |

### 3.10 State Management
- KPIs cached for 60 s.
- Onboarding-dismissed state mirrored from server; optimistic on dismiss.

### 3.11 Validation
None (read-only screen).

### 3.12 RBAC
| Component | acct_admin | super_user | collab |
|-----------|:----------:|:----------:|:------:|
| Onboarding checklist | ✓ | — | — |
| KPI cards | ✓ | ✓ | ✓ |
| All other panels | ✓ | ✓ | ✓ |

### 3.13 Notifications & Alerts
- Onboarding dismissed → toast "Onboarding hidden. Re-enable in Profile."

### 3.14 Audit & Logging
- Onboarding-dismiss writes audit row `entity=user, action=updated, field=onboardingDismissed`.

### 3.15 Edge Cases
- Empty workspace: each panel renders friendly empty illustration + CTA ("Create your first project").
- API failure: panels independently fail-soft (one panel error doesn't block others).

### 3.16 Responsive
- ≥1280 px: 4-col KPIs, 2-col panels.
- 768–1279 px: 2-col KPIs, stacked panels.
- <768 px: 1-col stack, sidebar collapses to drawer.

### 3.17 Accessibility
- KPI tiles `role="link"`, focusable, Enter activates.
- Activity feed live-region polite for new items.

### 3.18 Performance
- KPIs server-aggregated (single query). Activity feed paginated (20/page).

### 3.19 Frontend Architecture
```
pages/dashboard.tsx
  ├ components/kpi-card.tsx
  ├ components/needs-attention.tsx
  ├ components/activity-feed.tsx
  └ components/onboarding-checklist.tsx
```

### 3.20 Screen Matrix (Dashboard)
| Source | Action | Destination | Data passed | Pre-nav validation |
|--------|--------|-------------|-------------|---------------------|
| Dashboard | KPI: Active Projects | `/projects?status=active` | querystring | — |
| Dashboard | KPI: Billable Util | `/reports?tab=utilization` | querystring | — |
| Dashboard | NeedsAttention row | `/projects/:id` | id | — |
| Dashboard | NeedsAttention invoice | `/invoices/:id` | id | — |

---

## 4. Module: Projects

### 4.1 Screen Overview — Projects List
- **Purpose:** Find, filter, and bulk-act on projects.
- **Business objective:** Project-portfolio operations.
- **Roles:** `acct_admin` (all), `super_user` (all), `collab` (assigned only — server-filtered via allocations).

### 4.2 Layout — Projects List
```
┌─ PageHeader: "Projects"  [+ New Project] [Saved Views ▾] ┐
│ Search [______]  Status:[All▾] Health:[All▾] PM:[All▾]   │
│ [Bulk: 3 selected ▾ Export CSV · Archive]                 │
├──────────────────────────────────────────────────────────┤
│ ☐ │ Name │ Account │ PM │ Status │ Health │ % Done │ EAC │
│ ☐ │ ...row clickable → /projects/:id...                   │
└───────────────────────────────────────────────────────────┘
```

### 4.3 UI Components — Projects List

| Component | Type | Mandatory | Editable | Visibility | Default | Validation |
|-----------|------|-----------|----------|------------|---------|------------|
| Search input | text | no | yes | all | "" | trims |
| Status filter | chip-select | no | yes | all | All | enum |
| Health filter | chip-select | no | yes | all | All | enum |
| PM filter | combobox | no | yes | all | All | userId |
| Saved Views | dropdown | no | yes | all | None | — |
| Bulk-select bar | sticky bar | no | yes | when ≥1 row selected | hidden | — |

### 4.4 Buttons — Projects List

| Button | Position | Visibility | Enabled | Action | API | Success | Error |
|--------|----------|------------|---------|--------|-----|---------|-------|
| + New Project | top-right | `projects.create` | always | open create modal | `POST /projects` | toast + push to `/projects/:id` | inline 422 |
| Export CSV | bulk bar | ≥1 selected | always | download CSV | `POST /projects/export` | file download | toast danger |
| Archive | bulk bar | ≥1 selected | always | confirm modal → bulk PATCH | `PATCH /projects/bulk` `{status:"archived"}` | refetch list, toast | toast danger |
| Row click | row | all | always | navigate | — | `/projects/:id` | — |

### 4.5 Table — Projects List

| Column | Type | Sortable | Filterable | Searchable | Source | Click |
|--------|------|:--------:|:----------:|:----------:|--------|-------|
| Select | checkbox | — | — | — | client state | toggle |
| Name | text | ✓ | — | ✓ | `projects.name` | open detail |
| Account | text | ✓ | ✓ | ✓ | `accounts.name` | open account |
| PM | avatar+text | ✓ | ✓ | ✓ | `users.name` | open user |
| Status | StatusBadge | ✓ | ✓ | — | `projects.status` | filter |
| Health | StatusBadge | ✓ | ✓ | — | `projects.health` | filter |
| % Done | progress | ✓ | — | — | computed | — |
| EAC | currency | ✓ | — | — | `projects.eac` | — |

### 4.6 Form — Create / Edit Project

| Field | Type | Max | Validation | Required | Depends on | Source | Conditional |
|-------|------|-----|------------|----------|-----------|--------|-------------|
| name | text | 120 | non-empty | ✓ | — | — | — |
| accountId | combobox | — | exists | ✓ | — | `GET /accounts` | — |
| pmUserId | combobox | — | exists, role≥super_user | ✓ | — | `GET /users?role=pm` | — |
| startDate | date | — | ≤ endDate | ✓ | endDate | — | — |
| endDate | date | — | ≥ startDate | ✓ | startDate | — | — |
| billingType | select | — | enum | ✓ | — | `["TM","FF","Retainer"]` | — |
| budget | currency | — | ≥0 | ✓ if FF | billingType | — | hidden if TM |
| templateId | combobox | — | exists | no | — | `GET /project-templates` | shown only on Create |
| notes | textarea | 4000 | — | no | — | — | — |

### 4.7 Workflow
- **Entry:** sidebar "Projects".
- **Exits:** row click → `/projects/:id`. New → modal → on success route to detail. Bulk archive → modal confirm → toast.
- **State transitions:** `Draft → Active → On Hold → Active → Closed → Archived`.

### 4.8 Data Relationships
- `projects.accountId → accounts.id` (cascade restrict)
- `projects.pmUserId → users.id`
- `tasks.projectId → projects.id` (cascade delete)
- `allocations.projectId → projects.id`
- `invoices.projectId → projects.id`
- `contracts.projectId → projects.id` (cascade delete)

### 4.9 API

| Action | Endpoint | Payload | Response |
|--------|----------|---------|----------|
| List | `GET /projects?status&health&pm&q&page` | querystring | `{items, total, page}` |
| Create | `POST /projects` | `CreateProjectBody` | `Project` |
| Bulk update | `PATCH /projects/bulk` | `{ids:[], patch:{}}` | `{updated:n}` |
| Export | `POST /projects/export` | `{ids:[]}` | `text/csv` |

### 4.10 State Management
- TanStack Query key: `["projects", filters]`. `staleTime: 30s`.
- Selected-rows state: `useState<Set<number>>`, cleared on filter change.
- Saved-views: persisted server-side via `/saved-views`.

### 4.11 Validation
- Frontend: zod schema mirrored from `lib/api-zod`.
- Backend: same schema; date-overlap check; `accountId` & `pmUserId` existence.

### 4.12 RBAC

| Element | acct_admin | super_user | collab |
|---------|:----------:|:----------:|:------:|
| + New Project | ✓ | ✓ | — |
| Bulk Archive | ✓ | — | — |
| Edit Project | ✓ | ✓ (own PM) | — |
| Row visibility | all | all | only assigned |

### 4.13 Notifications & Alerts
- Create success → toast "Project created" + auto-route.
- Bulk archive → confirm modal "Archive N projects? This is reversible."
- Validation 422 → inline messages under fields.

### 4.14 Audit
- `projects` create/update/delete → `audit_log` row with diff.
- Bulk archive → one audit row per project.

### 4.15 Edge Cases
- Empty list → empty illustration "No projects match these filters" + Reset.
- 0 projects in workspace → CTA "Create your first project".
- Concurrent edit → server returns 409 with `currentRowVersion`; UI shows merge-or-overwrite dialog.

### 4.16 Responsive
- ≥1024 px: full table with all 8 columns.
- 768–1023 px: hide "EAC" + "% Done"; show inline below name.
- <768 px: card list, swipe-action archive.

### 4.17 Accessibility
- Table `role="grid"`, rows `role="row"`, cells `role="gridcell"`.
- Bulk-select checkbox has `aria-label="Select project {name}"`.

### 4.18 Performance
- Server-side pagination 50/page.
- Filter changes debounced 250 ms.

### 4.19 Frontend Architecture
```
pages/projects.tsx
  ├ components/projects-list-toolbar.tsx
  ├ components/projects-bulk-bar.tsx
  ├ components/projects-table.tsx
  └ components/project-create-modal.tsx
```

---

### 4.20 Screen Overview — Project Detail
- **Purpose:** Operate a single project across Tasks, Team, Finance, Documents, Updates, CSAT.
- **Tabs:** Tasks · Team · Finance · Documents · Updates · CSAT.

### 4.21 Layout — Project Detail
```
┌ PageHeader: ProjectName  [Edit] [Archive] [···]          ┐
│ Mini-stats: Health · Budget Used · Schedule · CSAT       │
├ Tabs: Tasks | Team | Finance | Documents | Updates | CSAT┤
│  …active tab body…                                       │
└──────────────────────────────────────────────────────────┘
```

### 4.22 Tab: Tasks
**Layout:** Toolbar (search, filter, "+ Task", bulk bar) → Collapsible task tree (`<TaskTree>`).

| Column | Type | Sortable | Notes |
|--------|------|:--------:|-------|
| ↕ caret | toggle | — | expand/collapse children |
| Name | text | ✓ | inline-editable |
| Assignee | avatar | ✓ | inline reassign |
| Status | StatusBadge | ✓ | enum: Not Started, In Progress, Blocked, Done |
| Planned Hrs | number | ✓ | inline edit |
| Actual Hrs | number | — | computed from time_entries |
| ETC | number | — | computed |
| EAC | number | — | actual + ETC |
| Due | date | ✓ | inline edit |

**Tree rules:** `tasks.isPhase=true` are Level-1 (phases). Children = Level-2 tasks. Drag to re-parent. Bulk update via `PATCH /tasks/bulk`.

**Buttons:** + Task (modal), + Phase (modal), Bulk update (sticky bar), Notes (per-row icon → `task_notes` panel).

### 4.23 Tab: Team
**Grid:** Allocation rows (resource × period). Add Allocation modal triggers `POST /allocations/preview` for capacity preview (green/amber/red %), then `POST /allocations`. Skill mismatch returns 422 → modal asks for `skillOverrideReason`.

### 4.24 Tab: Finance
Sub-panels: Budget (SOW + Adjustment ledger with partial-unique SOW row), Invoices (table linked by `projectId`), Revenue Recognition (entries), Contracts (CRUD via `/contracts`).

### 4.25 Tab: Documents
List of project-documents; "From Template" button shows `document_templates`; download generates merged PDF.

### 4.26 Tab: Updates
Drafts of project updates with template placeholders → recipients selector → send. Tracked in `project_updates` + `update_recipients`.

### 4.27 Tab: CSAT
Star-rating histogram + responses list. Submit form gated to project-customer contacts (out-of-scope for internal app).

### 4.28 RBAC — Project Detail
| Action | acct_admin | super_user | collab |
|--------|:----------:|:----------:|:------:|
| Edit project | ✓ | PM only | — |
| Add task | ✓ | ✓ | ✓ if assigned |
| Allocate | ✓ | ✓ | — |
| Manage Finance tab | ✓ | — | — |
| Send updates | ✓ | ✓ | — |
| View CSAT | ✓ | ✓ | view-only |

### 4.29 Audit
Every task/allocation/budget/contract change → `audit_log` row with `entity, entityId, before, after, action`.

### 4.30 Edge Cases — Project Detail
- Closed project: time entries blocked at backend (hard 422 `closed_project`).
- Over-allocation in capacity preview: amber if 90–100 %, red if >100 %; user can still save (soft warning) unless budget cap reached.
- Concurrent task edits: optimistic update with rollback on 409.

---

## 5. Module: Accounts

### 5.1 Screen Overview
- **Purpose:** Customer accounts master with status column and click-through detail sheet.
- **Roles:** `acct_admin` CRUD; others R.

### 5.2 Layout — List
Table: Name · Industry · Owner · Status · # Active Projects · ARR.
Row click opens **Account Detail Sheet** (right-side `<Sheet>`) with sub-tabs **Opportunities** / **Projects**.

### 5.3 UI Components
| Component | Notes |
|-----------|-------|
| Status column | StatusBadge (`Lead`, `Customer`, `Churned`) |
| Detail sheet | Sub-tabs Opportunities + Projects |

### 5.4 Form — Account
| Field | Type | Validation |
|-------|------|------------|
| name | text | required, unique |
| industry | select | enum |
| ownerUserId | combobox | exists |
| status | select | enum |
| website | url | optional |

### 5.5 Edge Case
The "Account #N" display bug (caused by missing OpenAPI fields) is resolved — the spec must include `displayName` and `accountNumber` in the OpenAPI body and types.

### 5.6 RBAC
| Action | acct_admin | super_user | collab |
|--------|:----------:|:----------:|:------:|
| Create / Edit | ✓ | — | — |
| View detail | ✓ | ✓ | ✓ |

### 5.7 API
`GET /accounts`, `POST /accounts`, `PATCH /accounts/:id`, `DELETE /accounts/:id` (cascade to projects requires confirmation).

---

## 6. Module: Prospects

### 6.1 Overview
Pipeline list of unconverted leads with **Convert to Customer** action that creates an `accounts` row (status=Customer) and links existing opportunities.

### 6.2 Form — Prospect
| Field | Type | Validation |
|-------|------|------------|
| companyName | text | required |
| contactName | text | required |
| email | email | RFC 5322 |
| phone | phone | E.164 |
| source | select | enum |
| stage | select | enum |
| estValue | currency | ≥0 |

### 6.3 Convert Workflow
1. User clicks **Convert** → confirm modal.
2. `POST /prospects/:id/convert` creates account, marks prospect converted, returns new accountId.
3. Toast → route to `/accounts/:id`.

### 6.4 Audit
Convert action → audit row `action="status_changed"` on prospect + `action="created"` on account.

---

## 7. Module: Opportunities

### 7.1 Overview
Kanban + list views. Stages are dynamic (admin-configurable). Won opportunities expose **Create Project** action.

### 7.2 Layout — Kanban
Columns = stages (drag-to-move). Cards: name, account, value, close date, owner avatar.

### 7.3 Layout — List
Table with sortable columns; same data as kanban cards plus probability and weighted value.

### 7.4 Form — Opportunity
| Field | Validation |
|-------|------------|
| name | required |
| accountId | required |
| value | ≥0 |
| probability | 0–100 |
| stage | enum |
| closeDate | date |
| ownerUserId | exists |

### 7.5 Workflow
- Drag card across stage → `PATCH /opportunities/:id` `{stage}`. On stage=Won, action **Create Project** appears on card.
- **Create Project** → opens project create modal pre-filled with account + estimated value.

### 7.6 RBAC
| Action | acct_admin | super_user | collab |
|--------|:----------:|:----------:|:------:|
| Create / Edit | ✓ | ✓ | — |
| Drag-to-stage | ✓ | ✓ (own) | — |
| Create Project from Won | ✓ | ✓ | — |

---

## 8. Module: Time Tracking

The most complex module. Three sub-screens: **Time Entries**, **Timesheet Grid**, **Time Off**.

### 8.1 Sub-screen: Time Entries

#### Layout
Toolbar (date range, project filter, + Log Time, AI ▾) → Table (inline edit/delete).

#### Table Columns
| Column | Type | Sortable | Editable |
|--------|------|:--------:|:--------:|
| Date | date | ✓ | ✓ |
| Project | combobox | ✓ | ✓ |
| Task | combobox | ✓ | ✓ (filtered by project) |
| Category | select | ✓ | ✓ |
| Hours | number | ✓ | ✓ |
| Billable | toggle | — | ✓ |
| Notes | text | — | ✓ |
| ⋯ | menu | — | delete |

#### Form — Log Time
| Field | Validation |
|-------|------------|
| date | not in archived period; `holiday_calendars` warns |
| projectId | not closed (`closed_project` hard 422) |
| taskId | belongs to projectId |
| categoryId | from `time_categories` |
| hours | 0.25 ≤ h ≤ 24 (daily cap soft 409 if total >12) |
| billable | bool; AI anomaly check warns on inconsistent toggling |
| notes | ≤2000 chars; required if billable=false on billable category |

#### Guardrails (12 rules — fired on submit, in order)
1. **Inactive project** — hard block.
2. **Closed period** — hard block.
3. **Min hours** — < 0.25 → 422.
4. **Max hours** — > 24 → 422.
5. **Daily cap** — sum >12 → 409 soft (override flag).
6. **Weekly allocation overrun** — vs `allocations` capacity → soft.
7. **Budget overrun** — 90 % soft, 100 % hard 422.
8. **Duplicate entry** — same (user, date, project, task) → 409 soft.
9. **Weekend / holiday** — soft warn.
10. **Reminder banner** — if missing days last week.
11. **Self-approval block** — submitter ≠ approver hard.
12. **Mandatory rejection note** — approver must include note ≥ 10 chars on reject.

#### AI Hooks
| Action | Endpoint | Behavior |
|--------|----------|----------|
| NL day description | `POST /ai/timesheet-assist` | parses sentence into entry rows; user reviews before save |
| Auto-fill from allocations | `GET /ai/timesheet-suggestions` | returns suggested rows for week |
| Billable anomaly | `POST /ai/billable-anomaly-check` | run on submit; warning toast |

### 8.2 Sub-screen: Timesheet Grid

#### Layout
Weekly grid: rows = (Project → Task hierarchy, collapsible) × columns = 7 days. Footer row totals + status pill.

#### Critical Implementation Note
`getProjectName / getTaskName / getCategoryName` helpers MUST be declared **before** the `displayRows` `useMemo` — they are closed over by it. Violating this order causes `ReferenceError: Cannot access … before initialization` on first render.

#### Buttons
| Button | Action | API |
|--------|--------|-----|
| Submit Week | `POST /timesheets` `{weekStart}` | locks rows, sets status=Submitted |
| Approve | `POST /timesheets/:id/approve` | sets status=Approved, fires effort-overrun check |
| Reject | `POST /timesheets/:id/reject` | requires note; sets status=Rejected |
| Import from Allocations | `POST /timesheets/import-allocations` | seeds week from allocation hours |

#### Effort Overrun Detection
Helper `effortOverrunCheck.ts` fires post-approval. Threshold `0.9` of `tasks.plannedHours`. Notifies task owner + PM once per task lifetime (gated by `tasks.overrunAlertSentAt`).

### 8.3 Sub-screen: Time Off

#### Form — Submit Request
| Field | Validation |
|-------|------------|
| startDate | not in past |
| endDate | ≥ startDate |
| type | enum (Vacation, Sick, Personal) |
| notes | ≤500 |

#### Approval Flow
- `PATCH /time-off-requests/:id` `{status:"Approved"}` → fires `timeOffAllocationConflict` helper (fire-and-forget).
- For each hard allocation overlap: notify PM with `leave_allocation_conflict` notification + set `allocation.status='at_risk'`.
- **No auto-cancel / auto-reassign — human review only.**

#### Self-approval Guard
Submitter ≠ approver enforced server-side; UI hides Approve button when `request.userId === currentUser.id`.

---

## 9. Module: Resources

### 9.1 Sub-screen: Capacity Grid
Grid: rows = users (skill badges), columns = weeks. Cell shows allocated hrs / capacity hrs with color (green ≤ 80 %, amber 80–100 %, red >100 %). Click cell → allocation drawer.

### 9.2 Sub-screen: Resource Requests
Table: project, role, skills, hours/week, needed-by, status. Approver actions: Approve / Reject / Suggest. Reject requires note.

### 9.3 Sub-screen: AI Resource Suggestions
**Endpoint:** `POST /resources/suggest` `{requestId}`. Returns top-3 candidates with composite score (skill match × capacity × billable rate). Card UI for each candidate; accept = create allocation.

### 9.4 Sub-screen: Skills Matrix
**File:** `components/skills-matrix.tsx`. Matrix of users × skills with proficiency cell editor.

#### API
- `GET /user-skills` (auth headers required — was a recurring crash source)
- `POST /users/:userId/skills`
- `PATCH /users/:userId/skills/:skillId`
- `DELETE /users/:userId/skills/:skillId`

#### Client guards
- All `fetch` calls MUST include `authHeaders()` (the `roleClaim` middleware returns 401 without `x-user-role`).
- Always coerce list responses with `Array.isArray(data) ? data : []` to defend against error bodies.
- Fragments inside `.map()` MUST use `<Fragment key=…>` (never bare `<>` without key).

---

## 10. Module: Finance

### 10.1 Invoices

#### List Layout
Search + Status Tabs (Draft · Sent · Paid · Overdue · Void). Table: Number, Account, Project, Issue Date, Due, Total, Status.

#### PK convention
Invoice IDs are text in the format `"INV-YYYY-NNN"` (not numeric). All API paths use this string PK.

#### Form
| Field | Validation |
|-------|------------|
| accountId | required |
| projectId | optional, must belong to accountId |
| issueDate | required |
| dueDate | ≥ issueDate |
| lineItems[] | ≥1 row |
| line.description | required |
| line.qty | >0 |
| line.unitPrice | ≥0 |
| line.taxCodeId | optional, from `tax_codes` |
| notes | ≤4000 |

### 10.2 Billing Schedules
Recurrence rule (rrule-like) → generates `invoices` rows on cron. Pause / resume / skip-next actions.

### 10.3 Revenue Recognition
Schedule entries against `revenue_entries`. Approval flips `recognized=true`.

### 10.4 Contracts
Full CRUD on `contracts` (FK `project_id` cascade-delete). Fields: name, status, startDate, endDate, value, documentUrl, notes.

---

## 11. Module: Reports

Nine tabs. All consume `requirePermission("reports.view")` server-side; `acct_admin` + `super_user` only.

| Tab | Endpoint | Key fields |
|-----|----------|-----------|
| Performance | `GET /reports/performance` | on-time rate, CSAT |
| Operations | `GET /reports/operations` | scope-creep % by template |
| CSAT Trend | `GET /reports/csat-trend` | line chart over time |
| Interval IQ | `GET /reports/interval-iq` | actual vs benchmark days |
| Budget vs Actuals | `GET /reports/budget-actuals` | per project bar |
| Burn-Down | `GET /reports/burndown` | per project line |
| Revenue | `GET /reports/revenue` | period, account, project |
| Utilization | `GET /reports/utilization-grid` | per-cell `trackedHours`, `appliedCostRate`, `labourCost`; per-row totals |
| Project Health | `GET /reports/project-health` | composite indicators |

### 11.1 Cost Masking (frontend)
- `COST_FIELDS = ["costRate","appliedCostRate","labourCost","margin","internalCost"]`.
- `maskIfRestricted(value, role, field)` returns `"—"` when role ∈ {`collaborator`,`customer`} and field ∈ COST_FIELDS.
- The Utilization tab adds a **Labour Cost** column rendered through `maskIfRestricted` using `activeRole` from `useCurrentUser()`.
- Backend always returns full data to allowed callers; masking is presentation-layer only (defence-in-depth: backend gate by permission, frontend gate by role).

---

## 12. Module: Admin

12 sub-screens; all require `acct_admin`.

| Sub-screen | Entity | Notes |
|------------|--------|-------|
| Users | `users` | manage skills + secondary roles |
| Project Templates | `project_templates`, `template_phases` | seed projects |
| Skills Matrix | (see §9.4) | reuses skills matrix |
| Document Templates | `document_templates` | merged into project documents |
| Tax Codes | `tax_codes` | rate %, jurisdiction |
| Time Categories | `time_categories` | billable / non-billable |
| Holiday Calendars | `holiday_calendars` | per-region |
| Rate Cards | `rate_cards` | role × region × rate |
| Custom Fields | `custom_fields` | per-entity dynamic fields |
| Audit Log | `audit_log` | filter, export |
| Company Settings | `settings` | branding, timezone, week start |
| Archived Projects | `projects` (status=archived) | restore action |

---

## 13. Module: Notifications

### 13.1 Overview
Bell icon in topbar shows unread count. Click → dropdown with last 20. "Mark all read" + "View all" link to `/notifications`.

### 13.2 Notification Types
`leave_allocation_conflict`, `timesheet_submitted`, `timesheet_approved`, `timesheet_rejected`, `effort_overrun`, `resource_request`, `invoice_overdue`, `csat_received`, `budget_threshold`.

### 13.3 API
`GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`.

### 13.4 Real-time
Polling 30 s (no websocket in current sprint). Future: SSE channel.

---

## 14. Module: CSAT
Per-project star ratings + distribution histogram. Survey link sent via `project_updates`. Responses recorded against `csat_responses` (1–5 stars, optional comment, respondent contact).

---

## 15. Cross-cutting Specifications

### 15.1 Validation Library
- Frontend: Zod schemas generated by Orval (`lib/api-zod`).
- Backend: same Zod schemas via `zod-express`.
- Three-tier: field-level (immediate), form-level (on submit), business-level (server, returns 422 with `code` + `field`).

### 15.2 Drizzle Date Handling
Drizzle returns `Date` objects for timestamp columns. Always convert at API boundary:
```ts
date: value instanceof Date ? value.toISOString() : value
```
Failure to do so leaks `Date.toString()` ("Tue May 12 2026 …") into JSON, breaking client parsers.

### 15.3 Express Route Ordering Pitfall
Specific paths MUST come before param routes. Example:
```ts
router.get("/projects/deleted", listDeleted);   // correct: before
router.get("/projects/:id", getProject);
```
Reversing causes `/projects/deleted` to match `:id` and 404 with cast error.

### 15.4 Adding API fields — 4-place update
1. `lib/api-zod/src/generated/api.ts`
2. `lib/api-zod/src/generated/types/createXBody.ts`
3. `lib/api-client-react/src/generated/api.schemas.ts`
4. `tsc --build --force` both dists

### 15.5 logAudit Action Enum (whitelist)
`"created" | "updated" | "deleted" | "status_changed" | "submitted" | "approved" | "rejected"` — any other string fails Zod validation at the audit insert site.

### 15.6 Authentication Header Sweep
Every direct `fetch()` call from the frontend MUST include `authHeaders()` (or use the codegen React Query hooks which call `setDefaultHeaders()` automatically). Bare fetches return 401 from the `roleClaim` middleware and cause downstream object-vs-array crashes.

---

## 16. Notifications & Alerts (cross-screen)

| Event | Channel | Template token |
|-------|---------|----------------|
| Project created | toast + audit | `project.created` |
| Allocation overrun | toast warn + bell | `allocation.overrun` |
| Time entry submitted | bell (PM) | `timesheet.submitted` |
| Time entry approved | bell (user) | `timesheet.approved` |
| Time entry rejected | bell (user) + email | `timesheet.rejected` |
| Effort overrun | bell (PM, owner) | `effort.overrun` |
| Time-off conflict | bell (PM) | `leave_allocation_conflict` |
| Invoice overdue | bell + email | `invoice.overdue` |
| CSAT received | bell (PM) | `csat.received` |

---

## 17. Audit & Logging

### 17.1 audit_log columns
`id, userId, role, entity, entityId, action, before(jsonb), after(jsonb), ip, userAgent, createdAt`.

### 17.2 Tracked entities
`projects, tasks, allocations, time_entries, time_off_requests, invoices, contracts, accounts, prospects, opportunities, users, budget_entries, project_updates, csat_responses, rate_cards, settings, role-switches`.

### 17.3 Role-switch audit
Every role-switch posts to `POST /audit/role-switch` with `{fromRole, toRole}`.

### 17.4 Retention
24 months hot, 60 months cold (move to `audit_log_archive`).

---

## 18. Edge Cases & Exception Handling

| Case | Behavior |
|------|----------|
| Empty list | friendly empty state + primary CTA |
| Permission denied | inline "You don't have access" panel; 403 page only on direct URL load |
| Concurrent edit (409) | merge-or-overwrite dialog with field-level diff |
| API 5xx | global toast danger; row-level retry button |
| Session expired | `<AuthGate>` shows login redirect; queries paused |
| Customer role attempt | 403 globally via `denyCustomerRole` middleware |
| Archived project access | read-only mode, all mutations 422 `closed_project` |
| Network offline | banner; mutations queued (best-effort, last-write-wins) |

---

## 19. Responsive Design Matrix

| Breakpoint | Sidebar | Tables | Cards | Forms |
|------------|---------|--------|-------|-------|
| ≥1280 px | expanded 240 px | all columns | 4-col grid | 2-col |
| 1024–1279 px | expanded 240 px | hide secondary cols | 3-col | 2-col |
| 768–1023 px | icon rail 56 px | hide secondary cols | 2-col | 1-col |
| <768 px | drawer | card-list | 1-col | 1-col, full-width buttons |

---

## 20. Accessibility Requirements

| Area | Requirement |
|------|-------------|
| Color contrast | WCAG 2.1 AA (≥4.5:1 text, ≥3:1 UI) |
| Keyboard | every action reachable via Tab/Shift-Tab; focus visible ring |
| Screen reader | all interactive elements labelled; tables use `<th scope>`; status changes announced via `aria-live="polite"` |
| Forms | each field linked to `<label>`; errors via `aria-describedby` |
| Modals | focus trap, `aria-modal=true`, restore focus on close |
| Charts | data tables provided as accessible alternative |

---

## 21. Performance Requirements

| Concern | Requirement |
|---------|-------------|
| Initial bundle | ≤ 350 KB gz |
| Route bundle | ≤ 100 KB gz lazy chunk |
| Server pagination | default 50, max 200 per page |
| Lazy loading | code-split per route via Wouter + dynamic import |
| Query cache | `staleTime: 30s` for lists, `60s` for `/me`, `0` for KPIs |
| Debounce | 250 ms on search inputs |
| Optimistic UI | bulk actions + status toggles |
| Heavy reports | server-side aggregation; client receives summary + drill-down on click |

---

## 22. Suggested Frontend Architecture

```
artifacts/businessnow/src/
  ├ pages/                 # one file per route
  ├ components/
  │  ├ ui/                 # shadcn primitives only
  │  ├ <feature>-*.tsx     # composed feature components
  │  └ shared/             # cross-feature (StatusBadge, TooltipCell …)
  ├ contexts/              # CurrentUserProvider, SidebarProvider
  ├ hooks/                 # use-toast, use-undoable-mutation …
  ├ lib/
  │  ├ auth-headers.ts     # authHeaders()
  │  ├ roles.ts            # role constants + helpers
  │  ├ permissions.ts      # mirror of backend keys
  │  ├ filter-evaluator.ts # SavedView engine
  │  └ format.ts           # currency, date, hours
  └ App.tsx                # router + AuthGate + providers
```

State strategy:
- Server cache: TanStack Query (single source of truth for API data).
- UI state: `useState`, lifted only when shared.
- Cross-route preferences: `localStorage` + small Zustand store (`sidebarCollapsed`, `lastVisitedProject`).
- Forms: `react-hook-form` + Zod resolver.

---

## 23. Screen-to-Screen Relationship Matrix

| Source | Action | Destination | Data passed | Pre-nav validation |
|--------|--------|-------------|-------------|---------------------|
| Dashboard | KPI tile | Projects / Reports / Invoices | querystring filter | — |
| Dashboard | NeedsAttention row | Project / Invoice detail | id | — |
| Projects List | row click | Project Detail | id | — |
| Projects List | + New | Project Create modal → detail | new id | form valid |
| Project Detail | tab switch | same route, ?tab= | tab key | — |
| Project Detail | Tasks → Notes icon | side panel | task id | — |
| Project Detail | Team → Add Allocation | modal → preview → save | payload | capacity preview ack |
| Account List | row click | Account Sheet | id | — |
| Account Sheet | Projects sub-tab → row | Project Detail | id | — |
| Prospects | Convert | Account Detail | new accountId | confirm modal |
| Opportunities (kanban) | drag → Won | Card menu shows "Create Project" | opp id | — |
| Opportunities | Create Project | Project Create modal | accountId, value | form valid |
| Time Entries | + Log Time | modal | — | guardrails 1–11 |
| Timesheet Grid | Submit Week | same route | weekStart | guardrails + completeness |
| Timesheet Grid | Approve | same row | tsId | self-approval block |
| Resources | Suggest | candidate cards | requestId | — |
| Resources | Accept candidate | Allocation create | payload | capacity ack |
| Invoices | Send | same row | invoiceId | status=Draft |
| Invoices | Mark Paid | same row | invoiceId | status=Sent |
| Reports | Utilization cell | drill-down sheet | userId, period | — |
| Admin Users | Edit | side sheet | userId | — |
| Notifications | item click | linked entity detail | entity, id | — |
| CSAT | response row | Project Detail (CSAT tab) | projectId | — |

---

## 24. Glossary

| Term | Definition |
|------|------------|
| Allocation | Planned assignment of a user to a project for a date range with hours/week |
| Phase | Level-1 task with `tasks.isPhase=true` (the legacy `phases` table is removed) |
| Hard allocation | `allocations.isSoftAllocation=false` — counts toward capacity |
| EAC | Estimate at Completion = actual + ETC |
| ETC | Estimate to Complete |
| Soft block | Backend returns 4xx with `override` field; frontend asks user to confirm |
| Hard block | Backend returns 4xx with no override path; frontend shows error and aborts |
| Composite score | Resource-suggest scoring: skill match × capacity × rate fit |
| Override reason | Free-text ≥ 10 chars required when bypassing skill or capacity guard; written to audit |

---

## 25. Open Items / Future Sprints

1. Real-time notifications via SSE (currently 30 s polling).
2. Mobile app (React Native) for time entry only.
3. Multi-currency invoicing with FX-rate snapshot.
4. Customer portal re-introduction (currently fully removed).
5. SSO integration (OIDC) replacing trust-based dev auth.
6. Granular per-field RBAC via policy DSL (replace mirrored constants).

---

*End of document.*
