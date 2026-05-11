# Workspace

## Overview

pnpm workspace monorepo, TypeScript throughout. Each package manages its own dependencies.

**Packages:** `@workspace/api-spec` · `@workspace/api-zod` · `@workspace/db` · `@workspace/api-server` · `@workspace/businessnow`

**Workflows:**
- `API Server` — `PORT=8080 pnpm --filter @workspace/api-server run dev`
- `Start application` — `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/businessnow run dev`
- (The two `artifacts/…` duplicate workflows are auto-generated and cannot be removed; ignore port-conflict errors from them.)

**Test runner:** `pnpm --filter @workspace/api-server test` (node:test built-in, `node --import tsx --test`)
**DB migration:** `pnpm --filter @workspace/db run push`
**Codegen:** `pnpm --filter @workspace/api-spec run codegen`

---

## Project: BusinessNow PSA Platform

Full-stack Professional Services Automation platform for KSAP Technology. Modeled after Rocketlane.

### Tech Stack
- **Frontend**: React + Vite + Wouter + Recharts + DM Sans; indigo/violet theme
- **Backend**: Express 5 + PostgreSQL + Drizzle ORM + Zod
- **API contract**: OpenAPI spec → Orval codegen → React Query hooks + Zod schemas

### Modules
- **Dashboard** — KPI cards (clickable), activity feed, Needs Attention (at-risk projects + overdue invoices), onboarding checklist (admin-only, dismissible)
- **Projects** — List (search + filter chips, bulk select/export/archive), project detail (Tasks/Team/Finance/Documents/Updates/CSAT tabs), Edit modal, bulk task updates
- **Accounts** — Status column, click-through detail sheet (Opportunities + Projects sub-tabs)
- **Prospects** — Pipeline list + Convert to Customer
- **Opportunities** — Kanban + list; Create Project from Won opportunity
- **Time Tracking** — Time entries (inline edit/delete), weekly Timesheet grid (collapsible hierarchy), Time Off requests (submit/approve/reject with guardrails), AI assistant (NL / auto-suggest / wizard)
- **Resources** — Capacity grid (skill badges), Resource Requests tab, AI resource suggestions (composite score)
- **Finance** — Invoices (search + status tabs), Billing Schedules, Revenue Recognition, Contracts (full CRUD)
- **Reports** — 9 tabs: Performance, Operations, CSAT Trend, Interval IQ, Budget vs Actuals, Burn-Down, Revenue, Utilization, Project Health
- **Admin** — Users (skills, secondary roles), Project Templates, Skills Matrix, Document Templates, Tax Codes, Time Categories, Holiday Calendars, Rate Cards, Custom Fields, Audit Log, Company Settings, Archived Projects
- **Notifications** — Feed, unread badge, mark-all-read
- **CSAT** — Per-project star ratings + distribution

---

## Roles & Permissions

| Canonical value | Level | Description |
|-----------------|-------|-------------|
| `account_admin` | 4 | Full access |
| `super_user` | 3 | Broad project access; no core admin |
| `collaborator` | 2 | Limited internal user |
| `customer` | 1 | Blocked from all internal API (403 via `denyCustomerRole` middleware) |

**Key files:**
- `artifacts/api-server/src/constants/roles.ts` — `ROLES`, `ROLE_HIERARCHY`, `resolveRole()`, `hasRole()`
- `artifacts/api-server/src/constants/permissions.ts` — 58 account + 34 project permission keys; `can()`, `requirePermission()`
- `artifacts/api-server/src/middleware/rbac.ts` — `requireAdmin`, `requirePM`, `requireFinance`, `blockPortalRoles`, `denyCustomerRole`
- `artifacts/api-server/src/middleware/roleClaim.ts` — validates `x-user-role` is in the user's assigned set; 401/403 otherwise
- `artifacts/businessnow/src/lib/roles.ts` / `permissions.ts` — frontend mirrors

**Transport:** `x-user-role` + `x-user-id` headers on every request via `setDefaultHeaders()` in the API client. Legacy Title-Case roles (e.g. `Admin`) normalised via `resolveRole()`.

**Auth:** Trust-based dev setup (no session/JWT). `GET /me` bootstraps identity; `AuthGate` in `App.tsx` blocks queries until bootstrap completes. 60-second re-validation poll in `current-user.tsx`.

---

## Key Pitfalls

- `lib/api-zod/src/index.ts` — export only `./generated/api`; re-exporting `./generated/types` causes duplicate-name errors
- Drizzle returns `Date` objects for timestamp columns — always convert: `instanceof Date ? .toISOString() : value`
- Invoice PK is text format `"INV-YYYY-NNN"`
- Express route ordering: specific paths (`/projects/deleted`) MUST come before param routes (`/projects/:id`)
- Adding API fields: update all four places — `lib/api-zod/src/generated/api.ts` + `types/createXBody.ts`, `lib/api-client-react/src/generated/api.schemas.ts`, then `tsc --build --force` both dists
- `logAudit` action enum: `"created" | "updated" | "deleted" | "status_changed" | "submitted" | "approved" | "rejected"` — no other values
- `getProjectName/getTaskName/getCategoryName` in `timesheet-grid.tsx` must be declared **before** the `displayRows` useMemo (they are closed over by it)
- Project membership is tracked via `allocations` table (userId + projectId), not a stored array on users

---

## Schema — Notable Columns & Tables

| Table | Notable additions |
|-------|-------------------|
| `allocations` | `requiredSkillId`, `requiredProficiencyLevel`, `isOverride`, `overrideReason`, `status` (text, nullable — `'at_risk'` set on time-off conflict) |
| `tasks` | `isPhase bool`, `plannedHours`, `estimateHours`, `overrunAlertSentAt` (timestamp) |
| `users` | `accountId`, `onboardingDismissed` |
| `timesheets` | (standard) |
| `time_off_requests` | standard leave request; `status` Pending/Approved/Rejected |
| `task_notes` | `task_id → tasks`, `user_id`, `content` |
| `contracts` | `project_id → projects` (cascade), name/status/dates/value/documentUrl/notes |
| `document_templates` | name/description/documentType/content/createdByUserId |
| `project_updates` + `update_recipients` | project update drafts + delivery tracking |
| `key_events` + `intervals` | Interval IQ report data |
| `budget_entries` | SOW + Adjustment types; partial unique index on `(project_id) WHERE type='SOW'` |

**Phases are Level-1 tasks** (`tasks.isPhase = true`). The old `phases` table is gone. `template_phases` is the template-only concept (untouched).

---

## Guard / Validation Features (current sprint series)

### 1. Allocation Capacity Preview
- `POST /api/allocations/preview` — read-only capacity impact; returns utilisation% per week
- Allocation dialog shows green/amber/red utilisation indicator

### 2. Skill Validation on Allocations
- `POST /api/allocations` validates `requiredSkillId + requiredProficiencyLevel`
- Returns 422 `skill_mismatch`; bypass via `skillOverrideReason`; logged to audit
- Schema: `requiredSkillId`, `requiredProficiencyLevel` on `allocationsTable`

### 3. Effort Overrun Detection
- Helper: `artifacts/api-server/src/lib/effortOverrunCheck.ts`
- Fires after `POST /api/timesheets/:id/approve`
- `OVERRUN_ALERT_THRESHOLD = 0.9` — one notification per task per lifetime (`overrunAlertSentAt` column)
- Test: `artifacts/api-server/tests/effortOverrun.test.ts`

### 4. Time-Off / Allocation Conflict Check ← most recent
- Helper: `artifacts/api-server/src/lib/timeOffAllocationConflict.ts`
- Fires after `PATCH /api/time-off-requests/:id` when `status === "Approved"` (fire-and-forget, never blocks response)
- Finds hard allocations (`isSoftAllocation = false`) for the resource where dates overlap
- For each conflict: notifies project PM (`leave_allocation_conflict` notification type) + sets `allocation.status = 'at_risk'`
- No auto-cancel / auto-reassign — human review only
- Test: `artifacts/api-server/tests/timeOffAllocationConflict.test.ts`

**Test suite:** 65 tests / 21 suites — all passing.

---

## Sprint Archive (pre-May 2026)

Condensed history — implementation is complete and in the codebase.

**UI & UX (Apr 2026):**
Sidebar collapse to icon rail (56 px, `localStorage("sidebarCollapsed")`); section grouping (Workspace / Admin dividers); `<TooltipCell>` truncation component; `<StatusBadge>` shared component across all status types; consistent `text-2xl font-bold tracking-tight` page titles; clickable project rows; `/time-tracking` alias; friendly 404 page; global error toasts via `QueryCache.onError`; tooltips on icon-only buttons; bulk project row actions (select-all, Export CSV, Archive); bulk task updates (`PATCH /api/tasks/bulk`); collapsible task tree (`task-tree.tsx` with `<TreeToggle />`, `buildTreeFromFlat`, `useExpandedIds`).

**Timesheet guardrails (12 rules, Apr 2026):**
Daily cap (soft 409), weekly allocation overrun (soft), budget overrun (hard 422 at 100%, soft at 90%), duplicate detection, weekend/holiday guard, reminder banner, min/max hours gates, inactive-project hard block, billable anomaly AI check, self-approval block, mandatory rejection note. Guardrail context endpoint: `GET /api/time-entries/guardrail-context`.

**AI features:**
`POST /api/ai/timesheet-assist` (NL day description → structured entries); `GET /api/ai/timesheet-suggestions` (auto-fill from allocations); `POST /api/ai/billable-anomaly-check`; `POST /api/resources/suggest` (composite skill×capacity score, top-3 card UI).

**Data model (Apr 2026):**
Phases merged into tasks (`isPhase bool`); `phases` table dropped. Client portal fully removed (routes, schema, frontend pages). `contracts` table + Finance Contracts tab. Budget ledger: SOW + Adjustment types, partial unique index, Budget History card. Change order FK hardening. Undoable mutation hook (`use-undoable-mutation.tsx`). Task notes (`task_notes` table, `GET/POST/DELETE /tasks/:id/notes`). Hours model on tasks (`plannedHours`, `estimateHours`, `actualHours`, `etc`, `eac`). Time→task linking in Log Time dialog.

**Reports (Apr 2026):**
4 new report tabs: Performance (on-time rate, CSAT), Operations (scope creep % by template), CSAT Trend (line chart), Interval IQ (actual vs benchmark days). `key_events` + `intervals` tables with auto-backfill.

**Auth & RBAC (Apr 2026):**
`roleClaim` middleware; self-approval guards on timesheets/change-orders/time-off/resource-requests; `denyCustomerRole` global middleware; `<RequirePermission>` route guard; role-selector modal; 60-second re-validation; `POST /api/audit/role-switch`; full audit-log expansion; auth-header sweep across all frontend fetch calls; `<AuthGate>` startup race fix.

**Onboarding & templates (Apr 2026):**
`onboardingDismissed` column; `<OnboardingChecklist />` in dashboard; Document Templates (admin CRUD + "From Template" in project documents); Timesheet "Import from Allocations" (`POST /api/timesheets/import-allocations`).

**Project features (Phase 6–7 complete):**
Health stats (`GET /projects/:id/health-stats`); project updates tab (`POST /projects/:id/updates` with template placeholders); CSAT tab; 4 mini health-stat cards with task filter; phase progress bars.

**Cleanup (Apr 2026):**
Deleted 110 MB junk files; removed 26 unused shadcn primitives; deleted `apply-template-segment-modal.tsx`; fixed Account #N display bug (missing OpenAPI fields).

**Docs (Apr 2026):**
22 docs in `docs/` rewritten from placeholders to real content. `job-card-generator/` standalone tool (HTML/PDF/DOCX/Markdown, 26 sections).

---

## User Preferences

- Keep responses concise and code-focused
- No emojis
- Fire-and-forget async helpers never block HTTP responses
- Human review required before auto-cancelling or auto-reassigning resources
