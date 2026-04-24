# Product Requirements Document (PRD) — BusinessNow PSA

| | |
|---|---|
| **Product** | BusinessNow PSA |
| **Owner** | Product Manager |
| **Version** | 1.0 — Approved |
| **Date** | 2026-04-24 |
| **Status** | Approved |

> BusinessNow PSA is an **internal** Professional Services Automation platform for **KSAP Technology**. This PRD describes the product as it exists today (post-MVP, in production use) and the work in flight for the next quarter. It is not a sales document.

---

## 1. Problem Statement

KSAP Technology runs a growing services business. Before BusinessNow PSA, the operational picture lived in a patchwork:

- CRM in one tool, projects in another, time in a third, finance in spreadsheets.
- Capacity questions ("can we take this engagement?") took multiple days and multiple owners to answer.
- Margin per project was an estimate built once a quarter, not a live number.
- Finance month-close required manual reconciliation across three systems.
- The client portal was a static export that lagged the internal state by days.

The cost was twofold: **(1)** leadership made staffing and pricing decisions on stale data; **(2)** PMs and consultants spent administrative hours on what should be one click.

---

## 2. Vision & Goals

**Vision.** A single, governed system of record for the entire services lifecycle at KSAP — from prospect to invoice, with capacity and margin visible in real time.

**Goals (1-year horizon).**

| # | Goal | Measure |
|---|---|---|
| G1 | Retire all parallel spreadsheets in CRM, allocations, timesheets, invoicing. | Zero in regular use within two quarters of GA-internal. |
| G2 | Answer "do we have the people?" in under a minute. | Capacity-Planning report on the Reports page. |
| G3 | Show margin per project as a live number. | Dashboard KPIs + project-detail page. |
| G4 | Cut finance month-close effort by ~30 %. | Finance-team timing tracked quarterly. |
| G5 | A real-time client portal — no nightly export. | `/portal/*` reads the same DB as internal users. |

---

## 3. Users & Roles

The role-switcher feature lets a user act in any of their **secondary roles** during a session.

| Role | Primary jobs to be done |
|---|---|
| **Admin** | Provision users, manage templates, run audit log, configure tax codes / time settings / holiday calendars / skills matrix. |
| **PM** | Create and run projects, manage phases / tasks / change orders, raise resource requests, approve timesheets, track margin. |
| **Finance** | Maintain rate cards and tax codes, generate and send invoices, reconcile revenue entries, watch the dashboard CR-impact card. |
| **Resource Manager** *(job function)* | Approve resource requests, manage allocations and placeholders, run the capacity-planning report. RBAC-wise this is performed by an `account_admin` or `super_user` user; "Resource Manager" is **not** a role in the system. |
| **Consultant** | Log time, manage personal timesheets, request time off, see "my work" and "my allocations". |
| **Viewer** | Read-only stakeholder access. |
| **Client portal user** | Read-only access to their account's projects, status updates, documents, CSAT surveys. |

---

## 4. Current Product Surface (April 2026)

The SPA has **13 logical page modules** (16 `.tsx` files in `src/pages/`, including the 3 portal pages and a 404). The API has **40 route files** under `artifacts/api-server/src/routes/`. The DB has **~60 tables** across **11 modules**.

### 4.1 Dashboard (`/`)

**Dashboard v1** (shipped April 2026):

- **KPI tiles** — Active Projects, Total Revenue, Billable Hours WTD, Team Utilization. Each tile carries a status border (good / warning / danger).
- **Portfolio Health** — Stacked bar across On Track / At Risk / Off Track.
- **CR Impact** — Pending change-order count, revenue delta, effort delta.
- **Period selector** — Locked to "This Month" in v1; Last 30 / Quarter / Year are visible but disabled pending v2.
- **Recent Activity** — Demoted from full-width to a 1/3-column card on the right rail.
- The previous `Math.min(100, …)` clamp on `teamUtilization` was removed so the danger band is genuinely reachable (it was hiding over-utilisation).

### 4.2 CRM (`/accounts`, `/prospects`, `/opportunities`)

- Accounts (tier, region, status), with a real-time list and detail surface.
- Prospect pipeline.
- Opportunities with **auto-trigger**: when probability reaches **≥ 70 %**, a soft allocation is created automatically so resourcing can plan against likely-won work.

### 4.3 Project Management (`/projects`, `/projects/:id`)

- Projects list with status / health filter chips.
- Project detail: phases, tasks (with dependencies, comments, attachments, checklists), baselines, change orders, project members, project updates with recipient routing, key events.
- **Auto-trigger:** marking a milestone task complete drafts an invoice for the milestone amount.
- **Soft delete** on projects via `deleted_at`; restore endpoint available; capacity calculations exclude soft-deleted projects.
- **Known active issue (US-1):** project-detail page can hit a TDZ error referencing `users` before init; fix in flight.

### 4.4 Time Tracking (`/time`)

- Daily entries; weekly timesheet; submit / approve / reject flow; messages on rejection.
- Time-off requests with holiday-calendar awareness.
- **Auto-trigger:** every submit / approve / reject inserts a notification for the relevant party.
- Sidebar label is "Time Tracking"; `/time-tracking` is **not** an alias today (UI/UX audit NV-1).

### 4.5 Resources (`/resources`)

Six tabs:

- **Capacity** — Per-person utilisation; 100 % is the line, anything above is over-allocation (red).
- **Heat Map** — Calendar of utilisation densities.
- **Projects Timeline** — Project-centric Gantt-like view of allocations.
- **People Timeline** — Person-centric view of allocations.
- **Resource Requests** — Six request types (New, Replace, Extend, Reduce, Change Role, Remove); approval workflow; auto-creates the corresponding allocation when a request is marked Fulfilled.
- **Skills Matrix** — Configurable skill types; proficiency ratings; filterable in Find Availability.

Active tab is persisted to `localStorage["resources.activeTab"]`. Capacity calculations correctly exclude soft-deleted projects (fix landed 2026-04-23).

### 4.6 Finance (`/finance`)

- Rate cards (cost vs billable, by job role).
- Invoices and invoice line items.
- Billing schedules; revenue entries.
- Tax codes (admin-configured).

### 4.7 Reports (`/reports`)

Tabs:

- Performance
- **Capacity Planning** — Demand-vs-Supply chart (Available area + stacked Assigned / Unassigned demand bars), 4 / 8 / 12 / 26 / 52-week horizon, CSV export, role-level surplus/deficit table sorted worst-first. Powered by `GET /api/reports/capacity-planning`. Excludes soft-deleted projects.
- Operations
- CSAT Trend
- Interval IQ (utilisation analysis bucketed by interval)
- Budget vs Actuals
- Burn-Down
- Revenue
- Utilization
- Project Health

### 4.8 Admin (`/admin`)

- Users (with secondary roles for the role switcher).
- Project Templates (with template phases / tasks / allocations; `autoAllocate` flag controls whether allocations copy on project create).
- Skills Matrix (skills + categories).
- Tax Codes, Time Categories, Time Settings, Holiday Calendars.

### 4.9 Notifications (`/notifications`)

- In-app notification feed.
- Per-user notification preferences.

### 4.10 Client Portal (`/portal`, `/portal/:projectId`, etc.)

- Read-only project status for client users.
- Documents and document versions.
- CSAT surveys at milestones.
- Reads the same DB as internal users — no export pipeline.

---

## 5. Functional Requirements (Status)

| Area | Capability | Status |
|---|---|---|
| Auth / RBAC | Server-side `require*` middleware on write routes. | Live (one known gap: `resourceRequests.ts` write routes are not yet middleware-gated — see R-S-06). |
| Auth / RBAC | SPA `authHeaders()` helper introduced; 22 hardcoded admin headers across 6 page files migrated. | Live (Apr 2026); residual hardcoded headers in `project-detail.tsx` and `components/project-gantt.tsx` still on the backlog. |
| Auth / RBAC | SSO / OIDC. | Roadmap LATER |
| CRM | Accounts, prospects, opportunities with probability auto-trigger. | Live |
| Projects | Phases, tasks, dependencies, baselines, change orders. | Live |
| Projects | Soft delete + restore. | Live |
| Tasks | Milestone-complete → draft invoice. | Live |
| Time | Daily entries, weekly timesheet, submit/approve/reject. | Live |
| Time | Notifications on submit/approve/reject. | Live |
| Time | Time off + holiday calendars. | Live |
| Resources | Hard / soft allocations with placeholders. | Live |
| Resources | Six resource-request types with approval. | Live |
| Resources | Capacity-planning report. | Live (Apr 2026) |
| Resources | Per-placeholder "Find Team Member" inline link. | Backlog (Low) |
| Finance | Rate cards, invoices, line items, billing schedules, revenue entries. | Live |
| Reports | Performance, Operations, CSAT, Interval IQ, Budget vs Actuals, Burn-Down, Revenue, Utilization, Project Health, Capacity Planning. | Live |
| Dashboard | v1 (KPIs + Portfolio Health + Recent Activity) | Live (Apr 2026) |
| Dashboard | Period selector beyond "This Month" | v2 backlog |
| Admin | Users, templates, skills, tax codes, time categories/settings, holiday calendars. | Live |
| Audit | `logAudit()` called from write paths; `audit_log` table is append-only and readable by `account_admin`. | Live (sweep follow-up: confirm `logAudit()` is called from `resourceRequests.ts` writes — see R-S-06). |
| Notifications | In-app feed + preferences. | Live |
| Client Portal | Read-only project status, documents, CSAT. | Live |

---

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance — page TTI | Dashboard, Projects list, Resources tabs ≤ **2 s** on a typical 5 Mbps connection from a warm cache. |
| Performance — API p95 latency | List endpoints ≤ **300 ms** at current data volumes; Reports ≤ **2 s**; Capacity Planning ≤ **3 s** at 52 weeks. |
| Availability | Internal SLO **99.5 %** during business hours (KSAP timezone). Unmonitored outside business hours. |
| Browsers | Latest 2 versions of Chrome, Edge, Safari, Firefox. Desktop-first; tablet acceptable; phone is **not** a primary surface. |
| Accessibility | WCAG 2.1 AA targets for keyboard navigation and contrast (tracked in the UI/UX audit). |
| Density | UI density / scale redesign in progress to fit more on a desktop screen (see UI/UX audit §6.4). |
| Audit | Every write produces an `audit_log` row. |
| Backup | Replit-managed daily snapshots; PITR; quarterly off-site copy held by KSAP IT. |

---

## 7. Out of Scope

- External commercial sale or multi-tenant white-labelling.
- Native mobile apps.
- SAML SSO / advanced enterprise IdP (LATER).
- Real-time collaboration (live cursors / live editing).
- Externally hosted analytics warehouse.
- Built-in expense management beyond `revenue_entries` and invoice line items.

---

## 8. Success Metrics (rolling)

| Metric | Target | Source |
|---|---|---|
| Spreadsheets retired across CRM / allocations / timesheets / invoicing | 100 % within two quarters of GA-internal | Audit by Delivery Lead |
| Median time to answer "do we have the people?" | < 1 minute | Capacity-Planning report adoption |
| Finance month-close effort reduction | ~30 % vs pre-PSA baseline | Finance team self-report |
| Audit-log coverage on write paths | 100 % | Code review checklist (doc 05 §13) |
| Dashboard daily active users (KSAP staff) | ≥ 70 % of in-office staff | Analytics |

---

## 9. Open Questions / Decisions Needed

1. **Density / scale rollout** — when to flip the global default vs gating per-page (active design work).
2. **SSO** — when to start; the `authHeaders()` consolidation has cleared the migration path.
3. **Row-level filtering on GETs** — accepted as backlog; revisit if a Viewer-role complaint arises.
4. **Data warehouse** — defer until reports out-grow OLTP; cap on capacity planning at 52 weeks is the trip-wire.

---

## 10. Revision Log

| Date | Version | Changed By | What Changed |
|---|---|---|---|
| 2026-04-24 | 1.0 | PM | Replaced template with the real BusinessNow PSA PRD. Documents the post-MVP, in-production product surface — 13 logical page modules (16 files), 40 API route files, ~60 tables — including dashboard v1, capacity-planning report, `authHeaders()` helper, and the active backlog. |
