# User Stories & Epics — BusinessNow PSA

| | |
|---|---|
| **Product** | BusinessNow PSA |
| **Owner** | PM |
| **Version** | 1.0 — Approved |
| **Date** | 2026-04-24 |
| **Status** | Approved |

> Format: epics group related stories. Each story is **As a [role], I want [action] so that [outcome]**, with explicit acceptance criteria. Stories are tagged **SHIPPED** (in production), **NOW** (in flight), **NEXT** (this quarter), **LATER** (next 1–2 quarters). Status mirrors `10_product_roadmap.md`.

---

## 1. Definition of Done (applies to every story)

A story is Done when **all** of:

- Acceptance criteria pass.
- Server-side RBAC middleware applied to any new write route — one of `requireAdmin` / `requirePM` / `requireFinance` / `requireCostRateAccess`, or a hand-rolled `requireCanonicalRole(...)` / `requireRole(...)` / `requireAnyRole(...)` against the canonical 4-role model.
- `logAudit()` emits a row from any new write path.
- Zod validation on the request boundary (generated from OpenAPI).
- Generated React Query hooks regenerated and committed (`pnpm --filter @workspace/api-spec run codegen`).
- SPA call-sites use `authHeaders()` (no hardcoded `x-user-role` strings).
- Type-check (`pnpm typecheck`) green.
- No regression in the UI/UX audit's §6.1 baseline.
- Audit-log row visible in the Admin audit view.
- Revision log updated in the relevant doc(s).

---

## 2. Epic A — Identity & Access

### A1 (SHIPPED, partial) — `authHeaders()` as the central helper for role

**As an** engineer, **I want** a single helper that constructs request headers from `localStorage.activeRole`, **so that** I don't hardcode `x-user-role: Admin` across the codebase.

**AC**

- 6 SPA pages migrated to `artifacts/businessnow/src/lib/auth-headers.ts`: `finance.tsx`, `admin.tsx`, `resources.tsx`, `projects.tsx`, `project-detail.tsx`, `opportunities.tsx`.
- Helper itself is **fail-closed**: no `activeRole` → no `x-user-role` header → API rejects writes.
- Role header is spread **last** so caller-supplied `extra` headers cannot override it.
- 22 hardcoded admin headers replaced.

**Residual / follow-up (A1.1 — NOW):**

- `pages/project-detail.tsx` still has 6 hardcoded `"x-user-role": "PM"` literals (closes with US-1 work).
- `components/project-gantt.tsx` still has 6 hardcoded `"x-user-role": "PM"` literals.
- `pages/admin.tsx` has 1 hardcoded `"x-user-role": "PM"` literal (~line 3410); the rest of `admin.tsx` correctly threads `activeRole`.
- `components/tracked-time-tab.tsx` has 3 sites that build the role header inline from the `viewerRole` prop instead of going through `authHeaders()`.
- `contexts/current-user.tsx` defaults `activeRole` to `"Admin"` before `/api/me` resolves; bootstrap fetch uses a hardcoded `"Admin"` header.
- Done = zero `"x-user-role"` literals outside `auth-headers.ts`, `current-user.tsx` (bootstrap only), and the portal-specific `"Customer"` headers (which are intentional — the portal does not use the role switcher).

### A2 (LATER) — Replace header-based auth with SSO

**As a** KSAP IT admin, **I want** users to sign in via the corporate IdP, **so that** access is governed by the central identity system rather than `localStorage.activeRole`.

**AC**

- The API gains a verified-role middleware that does not trust the `x-user-role` header in production.
- The SPA's `authHeaders()` is the only migration point on the client.
- Audit log captures the verified role claim, not the cookie/header.

### A3 (LATER) — Row-level filtering on GET endpoints for Viewer / Consultant

**As a** Consultant, **I want** the projects / allocations / tasks lists to default to "mine", **so that** I am not exposed to the entire portfolio when I only need my work.

**AC**

- `GET` endpoints filter by calling user when role is `Viewer` or `Consultant`.
- A query string `?scope=all` lets `Admin`/`PM`/`RM` opt out for their own use.
- Audit log records the filter applied.

---

## 3. Epic B — CRM (Accounts, Prospects, Opportunities)

### B1 (SHIPPED) — Account, Prospect, Opportunity CRUD

**As a** PM/Sales user, **I want** to manage accounts, prospects, and opportunities in one place, **so that** the pipeline lives in the same DB as the projects it produces.

**AC**

- Lists with filter chips (tier, region, status); detail surfaces; standard CRUD.
- Generated React Query hooks; Zod validation; RBAC.

### B2 (SHIPPED) — Probability ≥ 70 % auto-creates a soft allocation

**As a** Resource Manager, **I want** likely-won opportunities to show up as soft demand on the resourcing surface, **so that** I can plan against them before the contract is signed.

**AC**

- `PATCH /api/opportunities/:id` setting probability ≥ 70 % triggers a soft allocation.
- Soft allocations render with a distinct style on the Resources timelines.
- Auto-trigger emits `audit_log` row.

---

## 4. Epic C — Project Management

### C1 (SHIPPED) — Project lifecycle

Standard CRUD on projects with phases, tasks, members, baselines, change orders, project updates, key events.

### C2 (SHIPPED) — Soft delete + restore

**As a** PM, **I want** to archive a project safely, **so that** I can restore it without data loss.

**AC**

- `DELETE` sets `deleted_at`; default list filters by `deleted_at IS NULL`.
- `POST /api/projects/:id/restore` clears `deleted_at`.
- Capacity calculations exclude soft-deleted projects (fixed 2026-04-23).

### C3 (SHIPPED) — Milestone task complete drafts an invoice

**As a** Finance user, **I want** completing a milestone to draft the invoice automatically, **so that** I don't lose milestone billing to manual oversight.

**AC**

- `PATCH /api/projects/:id/tasks/:taskId` setting `status=Complete` on a milestone task drafts an invoice for the milestone amount.
- Draft invoice is editable by Finance before sending.
- Auto-trigger emits `audit_log` row.

### C4 (NOW, Critical — UI/UX audit US-1) — Fix project-detail TDZ

**As a** PM, **I want** the project-detail page to load without a JS crash, **so that** I can use it.

**AC**

- The `users` reference-before-init in `project-detail.tsx` is fixed.
- Page loads under the standard typecheck and the smoke test.
- No console errors on a fresh load.

### C5 (NEXT) — Replacement Requests blocked server-side for auto-allocate projects

**As a** Resource Manager, **I want** the API to reject Replacement Requests against projects flagged `autoAllocate`, **so that** the rule isn't only enforced in the UI.

**AC**

- `requirePM` write returns **409 Conflict** with a clear error when the project's `autoAllocate=true`.
- UI continues to hide the option; the API now also enforces.
- Tested with a payload that bypasses the UI.

---

## 5. Epic D — Time Tracking

### D1 (SHIPPED) — Daily entries + weekly timesheet + approval flow

Standard time-tracking surface with submit / approve / reject; messages on rejection.

### D2 (SHIPPED) — Notifications on submit/approve/reject

**As a** consultant, **I want** to be notified when my timesheet is approved or rejected, **so that** I act on it.

**AC**

- Each timesheet `submit` / `approve` / `reject` writes a notification for the relevant party.
- Notification is visible in `/notifications` and respects the user's `notification_preferences`.

### D3 (SHIPPED) — Time-off + holiday-calendar awareness

**As a** consultant, **I want** time-off requests to integrate with the holiday calendar, **so that** capacity calculations are correct.

**AC**

- Time-off rows reduce the `availableFTE` in capacity calculations.
- Holiday dates count towards the same reduction.

---

## 6. Epic E — Resource Management

### E1 (SHIPPED) — Hard / soft allocations with placeholders

**As a** Resource Manager, **I want** to plan with placeholders before names are assigned, **so that** I can size demand.

**AC**

- Allocations link to either a `user_id` or a `placeholder_id`.
- Default placeholders cannot be renamed; user-created placeholders can.
- Hard vs soft styling distinct on timelines.

### E2 (SHIPPED) — Six resource-request types with approval

**As a** PM, **I want** to raise New / Replace / Extend / Reduce / Change Role / Remove requests, **so that** the resourcing workflow is explicit.

**AC**

- All six types accepted by `POST /api/resource-requests`.
- Approval intended to be gated by `requirePM`. (Note: `resourceRequests.ts` write routes are currently **un-gated** at the middleware level — closing that gap is a P-1 audit follow-up.)
- Marking a request **Fulfilled** auto-creates the corresponding allocation.

### E3 (SHIPPED) — Capacity-Planning report

**As a** Resource Manager / leadership, **I want** a Demand-vs-Supply chart with role-level surplus/deficit, **so that** I can answer "do we have the people?" in under a minute.

**AC**

- `GET /api/reports/capacity-planning?weeks=N` capped at 52.
- Returns weekly buckets: `totalCapacityFTE`, `timeOffFTE`, `holidayFTE`, `availableFTE`, `assignedDemandFTE`, `unassignedDemandFTE`, `totalDemandFTE`, `surplusFTE`, plus per-role `byRole[]`.
- Excludes soft-deleted projects.
- Reports tab renders ComposedChart (Available area + stacked Assigned/Unassigned demand) with horizon selector (4/8/12/26/52 weeks), CSV export, and role-level surplus/deficit table sorted worst-first.

### E4 (NEXT) — Resource Requests inbox widget on the Resources page

**As an** RM, **I want** unassigned demand surfaced directly on the Resources page, **so that** I don't have to leave the page to see what's open.

**AC**

- Inbox component on the Resources page shows open requests by status.
- Quick-fulfil action available.

### E5 (NEXT) — Per-placeholder "Find Team Member" link

**As an** RM, **I want** to jump from a placeholder row into Find Availability with the search pre-filled, **so that** the workflow is one click instead of three.

**AC**

- Each placeholder row in Resources tabs gains an inline link.
- Find Availability opens with role / skills pre-populated from the placeholder.

---

## 7. Epic F — Finance

### F1 (SHIPPED) — Rate cards (cost vs billable, by job role)

**As a** Finance user, **I want** maintainable rate cards with cost and billable rates, **so that** project margin is calculable.

### F2 (SHIPPED) — Invoices, line items, billing schedules, revenue entries

Standard finance surface with `requireFinance` write gating.

### F3 (SHIPPED) — Tax codes, time categories, time settings, holiday calendars (Admin)

---

## 8. Epic G — Reports

### G1 (SHIPPED) — Reports tabs

Performance, Capacity Planning, Operations, CSAT Trend, Interval IQ, Budget vs Actuals, Burn-Down, Revenue, Utilization, Project Health.

### G2 (SHIPPED) — CSV export on the Capacity-Planning tab

### G3 (WATCHING) — Reports off a data warehouse

Trip-wire is OLTP latency on Capacity Planning at 52 weeks. Not committed.

---

## 9. Epic H — Dashboard

### H1 (SHIPPED) — Dashboard v1

**As** any role, **I want** a single landing page with the KPIs that matter, **so that** I can act in seconds.

**AC**

- KPI tiles: Active Projects, Total Revenue, Billable Hours WTD, Team Utilization — each with a status border (good / warning / danger).
- Portfolio Health stacked bar (On Track / At Risk / Off Track).
- CR Impact card (count, revenue delta, effort delta).
- Period selector locked to "This Month"; Last 30 / Quarter / Year visible but disabled.
- Recent Activity demoted to a 1/3-column right rail card.
- `Math.min(100, …)` clamp on `teamUtilization` removed.

### H2 (NEXT) — Dashboard v2 (period selector + per-role widgets)

**As** Finance/PM/RM, **I want** the dashboard to adapt to my role and time horizon, **so that** the most relevant numbers are first.

**AC**

- Period selector enables Last 30 / Quarter / Year (server already accepts `period`).
- Per-role widget set selectable in user preferences.
- ≥ 70 % retention vs v1 in the analytics baseline.

---

## 10. Epic I — Admin

### I1 (SHIPPED) — Users + secondary roles + role switcher

### I2 (SHIPPED) — Project Templates with template phases / tasks / allocations

### I3 (SHIPPED) — Skills Matrix (configurable categories, proficiency)

### I4 (SHIPPED) — Tax Codes, Time Categories, Time Settings, Holiday Calendars

---

## 11. Epic J — Notifications

### J1 (SHIPPED) — In-app feed + per-user preferences

---

## 12. Epic K — Client Portal

### K1 (SHIPPED) — Read-only project status, documents, CSAT

**AC**

- Portal endpoints scoped to the granted account.
- Reads the same DB as internal users — no nightly export.
- No write paths to internal data.

---

## 13. Epic L — UI / UX Audit Follow-Ups

### L1 (NOW, Critical) — US-1: project-detail TDZ

(See C4.)

### L2 (NOW) — §6.2 quick wins

Smaller table row heights; consistent column widths; status pills standardised across pages.

### L3 (NOW) — US-11: Global error toast/banner

**As a** user, **I want** failed queries to surface an error rather than silently render an empty list, **so that** I know to retry / report.

**AC**

- React Query error handler wired to global toast/banner component.
- All page-level lists fall back to a non-empty error state on query failure.

### L4 (NOW) — Density / scale redesign

**AC**

- Default UI scale reduced; ≥ 25 % more rows visible at 1440×900.
- Side-by-side tested on dashboard, projects, resources tabs.
- No regression in §6.1 baseline.

### L5 (NEXT) — UI/UX audit §6.3 medium items

Re-prioritised at sprint planning.

---

## 14. Revision Log

| Date | Version | Changed By | What Changed |
|---|---|---|---|
| 2026-04-24 | 1.0 | PM | Replaced template with the real BusinessNow PSA epics and stories. Statuses reflect the production-deployed surface and the in-flight density / audit-follow-up work. |
