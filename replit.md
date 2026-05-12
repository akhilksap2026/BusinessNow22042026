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

**Test suite:** 111 tests / 35 suites — all passing.

### 5. Sprint 1 Hardening (current)
- Phase 1.1.0 orphan FK scan run on dev DB — all-zero (clean).
- Phase 1.1.2 `phases` table dropped (schema + DB).
- Phase 1.2 hot-path indexes already present across tasks/time_entries/allocations/invoices/notifications/audit_log.
- Phase 1.3 `tracked_hours` column dropped (Branch A — under 10K rows). Helper `lib/trackedHours.ts` with `getTrackedHoursMap` (batch) + `getTrackedHours` (single) computes from `time_entries`. `mapProject(p, trackedHours=0)` signature requires explicit pass-through; all read sites updated.
- Phase 2.1 numeric floors on POST `/time-entries` (0 < hours <= 24), `/invoices` (amount/tax >= 0), `/projects/:id/change-orders` (amount/additionalHours >= 0).
- Phase 2.2 `.strict()` body parse added on the same POST handlers + PATCH `/timesheets/:id` (extended schema to allow `status` enum).
- Phase 3.7 budget-entry audit action `created` → `updated`.
- Phase 3.8 PATCH `/timesheets/:id` withdraw flow wrapped in `db.transaction` with re-read inside txn.
- Phase 3.9 `denyCustomerRole` mounted globally at `routes/index.ts`.
- Phase 4.3 process-level catchers (`unhandledRejection`, `uncaughtException`) added in `index.ts`; global error handler already mounted in `app.ts`.

**New tests (Sprint 1 / Phase 9A):**
- `numericValidation.test.ts` — hours / amount / additionalHours floors.
- `authBoundary.test.ts` — customer-role 403, missing `x-user-id` 401, admin baseline 200.
- `statusTransitions.test.ts` — invoice status_changed audit row, timesheet withdraw clears submittedAt/By.
- `idempotency.test.ts` — change-order re-approval no-double-write, timesheet withdraw idempotent.
- (CR self-approval race covered by existing `sprint1Hardening` test 4.)

### 6. Sprint 2 (current)
- **Phase 6 — Pagination envelope** (`lib/pagination.ts`): opt-in via `?limit` / `?offset`; envelope `{data, total, limit, offset}` when present, plain array otherwise (back-compat). Default 100, max 500. Applied to `GET /projects`, `/accounts`, `/time-entries`, `/allocations`. Garbage limits fall back to default; >500 is clamped.
- **Phase 8.1 — Manager-scoped time-off approval**: new `users.managerId` (nullable int FK conceptually; column added, FK constraint deferred). PATCH `/time-off-requests/:id` to `Approved`/`Rejected` requires `actorId === requester.managerId` OR `account_admin`; super_user without manager link → 403.
- **Phase 8.2 — Bulk-approve skip breakdown**: `POST /time-entries/bulk-approve` and `POST /timesheets/bulk-approve` now return `{approved, skippedSelf, skippedOther}` (timesheets keeps legacy `skipped` for compat). Self-approval entries are silently skipped instead of aborting the batch.
- **Phase 8.3 — Rate snapshot concurrency**: `snapshotRatesForTimesheet` now wraps reads + writes in a single `db.transaction` and acquires `pg_advisory_xact_lock(timesheetId)` so concurrent approve handlers serialize per timesheet. Per-row UPDATE keeps `isNull(appliedBillRate)` predicate as belt-and-braces.
- **Phase 8.4 — Daily timesheet escalation cron**: `lib/timesheetEscalation.ts` finds Submitted timesheets > 5 days old whose user has a `managerId` and notifies that manager (`timesheet_escalation` notification type). Dedup via new `timesheets.escalatedAt` column. Wired into `lib/scheduler.ts` at `0 9 * * *` org timezone.

**New tests (Sprint 2 / Phase 9B):**
- `paginationEnvelope.test.ts` — array vs envelope, clamp at 500, default fallback on garbage.
- `timeOffManagerScoping.test.ts` — stranger super_user 403, requester's manager 200, account_admin 200.
- `bulkApproveSkipped.test.ts` — `time-entries/bulk-approve` returns split counts; self-entry silently skipped.
- `rateSnapshotConcurrency.test.ts` — three parallel snapshot calls produce exactly one snapshot per entry; re-run is no-op.
- `escalationLifecycle.test.ts` — once escalated, no re-fire while escalatedAt set; after Draft → resubmit (clears escalatedAt) the next stale-check escalates again.

**Sprint 2 architect-fix follow-up:** `escalatedAt` is now reset to NULL on every status transition (approve, unapprove, reject, bulk-approve, withdraw-to-Draft via PATCH, and resubmit) so escalation properly re-arms across the timesheet lifecycle.

**Sprint 2 gap closures (May 2026):**
- Gap 3: `time_settings.escalation_days_after` int (default 5) — `timesheetEscalation.ts` reads it; ≤0 disables escalation cron.
- Gap 1: `tests/fullLifecycle.test.ts` — Opportunity → Project → Task → Time → Timesheet (submit/approve) → Invoice → RevRec end-to-end.
- Gap 5: EXPLAIN ANALYZE on `GET /projects` confirms 3 queries, no N+1 (batched tracked-hours HashAggregate).

**Test suite:** 125 tests / 41 suites — all passing.

### Demo data enrichment (May 2026)

Additive SQL run against dev DB to fill previously-empty modules. All inserts are idempotent (`WHERE NOT EXISTS`); the canonical `scripts/src/seed.ts` is unchanged and still truncating — do not re-run it.

Filled tables (target = projects 1–6 only): `tax_codes` (4), `project_groups` (4, projects tagged), `contracts` (7), `budget_entries` (9: SOW + adjustments), `change_orders` (5: Draft/Submitted/Approved/Rejected mix), `project_updates` (10), `resource_requests` (5: Pending/Approved/Filled/Blocked), `documents` (11), `document_templates` (4), `project_templates` + `template_phases` (11) + `template_tasks` (21), `invoice_line_items` (9, one per legacy invoice), `revenue_entries` (18: monthly across projects 1–5), `task_notes` (7), plus 4 demo notifications. Junk `TEST_NUMERIC_PROJECT` rows soft-archived (`deleted_at` set) and their draft invoices voided.

### 7. Sprint 3 — UX polish (current)
- **7.1** Sticky table headers — `TableHeader` (`components/ui/table.tsx`) sticky-by-default with backdrop blur; opt-out via `sticky={false}`.
- **7.3** Undo toasts replace ConfirmDialog for project archive (single + bulk) in `pages/projects.tsx` via `useUndoableMutation` + `POST /api/projects/:id/restore`.
- **7.4** "Copy last week" button in `timesheet-grid.tsx` week nav — fetches prev-week entries and re-creates them on the matching day of the current week (skips locked weeks).
- **7.5** Breadcrumbs already shipped via `PageHeader` auto-derive (Admin/Finance/Resources).
- **7.8** Command palette (`components/command-palette.tsx`) mounted in `layout.tsx`; Cmd/Ctrl-K toggles. Navigate + quick-action commands (cmdk).
- 7.2 / 7.6 / 7.7 deferred.

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
