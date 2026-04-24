# API Documentation — BusinessNow PSA

| | |
|---|---|
| **Product** | BusinessNow PSA |
| **Owner** | Backend Lead |
| **Version** | 1.0 — Approved |
| **Date** | 2026-04-24 |
| **Status** | Approved |

> The **machine-readable** source of truth is `lib/api-spec/openapi.yaml`. This document is the human-readable index and onboarding reference. Do not hand-edit generated files in `lib/api-zod/` or `lib/api-client-react/`.

---

## 1. Base URLs & Conventions

| Environment | Base URL |
|---|---|
| Local (dev) | `http://localhost:8080` (workflow `API Server`, `PORT=8080`) |
| Production | Replit deployment URL (see deployment skill) |

- All routes are prefixed with **`/api`**.
- Request and response bodies are **JSON** (`Content-Type: application/json`).
- All timestamps are **ISO 8601** with timezone (`2026-04-24T10:30:00.000Z`).
- Pagination, where applicable, is `?limit=N&offset=N` with results in a top-level array; cursor pagination is used by `audit_log` reads only.

---

## 2. Authentication & Authorisation

The current model is **header-based** and single-tenant:

| Header | Purpose |
|---|---|
| `x-user-role` | The active role of the caller. Canonical values: `account_admin` / `super_user` / `collaborator` / `customer`. The legacy 11-role string union (`Admin`, `PM`, `Super User`, `Finance`, `Developer`, `Designer`, `QA`, `Collaborator`, `Viewer`, `Customer`, `Partner`) is still accepted; `LEGACY_ROLE_MAP` resolves to the canonical role. |
| `x-user-id` | (Optional) The numeric user id for the caller. Used by `/api/me` and write paths to attribute audit log entries. |

The SPA constructs these headers via the **`authHeaders()`** helper in `artifacts/businessnow/src/lib/auth-headers.ts`. The helper:

- Reads the active role from `localStorage.activeRole`.
- **Fails closed** — if no role is present, the role header is omitted, and writes are rejected by RBAC middleware.
- Spreads the role header **last**, so caller-supplied headers cannot override it.

> **Honesty note.** There is no JWT, OAuth, or SSO today. SSO is on the LATER track of the roadmap (doc 10). Doc 05 documents this without dressing it up.

### RBAC middleware (server-side)

| Middleware | Roles allowed |
|---|---|
| `requireAdmin` | `account_admin` only. |
| `requirePM` | `account_admin` or `super_user` (`requireRole("super_user")`). |
| `requireFinance` | `account_admin` or `super_user` (`requireCanonicalRole("account_admin","super_user")`). |
| `requireCostRateAccess` | Legacy `Admin`, `Finance`, or `PM` only — Super Users excluded. |
| `blockPortalRoles` | Globally applied to `/api/*` (except `/api/portal-auth/*`); rejects `customer` / `Customer` / `Partner`. |

Building blocks `requireRole(min)`, `requireCanonicalRole(...)`, `requireAnyRole(...)` are also available. There is **no `requireRM`** — capacity / staffing approval routes use `requirePM`. The `resourceRequests.ts` write routes are currently **not gated** by middleware (a known gap).

Read endpoints (`GET`) are generally permissive (do not gate on role beyond the standard role header presence). Row-level filtering for `Viewer` / `Consultant` is a known backlog item.

---

## 3. Error Envelope

| HTTP | Meaning | Body |
|---|---|---|
| `200 OK` | Read OK | Resource or array. |
| `201 Created` | Create OK | New resource (with `id`). |
| `204 No Content` | Delete OK | Empty body. |
| `400 Bad Request` | Validation failed (Zod). | `{ "error": "...", "details": [...] }` |
| `401 Unauthorized` | Missing role header. | `{ "error": "Missing role" }` |
| `403 Forbidden` | RBAC reject. | `{ "error": "Forbidden" }` |
| `404 Not Found` | Unknown resource id. | `{ "error": "Not found" }` |
| `409 Conflict` | Constraint violation (e.g. unique). | `{ "error": "...", "details": [...] }` |
| `500 Internal Server Error` | Unhandled exception. | `{ "error": "Internal server error" }` (logged server-side) |

Write paths emit an `audit_log` row before returning 2xx (the `resourceRequests.ts` un-gating issue tracked as R-S-06 also calls out auditing as part of the same sweep).

---

## 4. Route Files (40)

The API server is organised one file per domain in `artifacts/api-server/src/routes/` (39 domain files + `index.ts` aggregator = 40 files total):

| File | Domain | Notable endpoints |
|---|---|---|
| `users.ts` | Users, secondary roles, skills membership | `GET/POST /api/users`, `GET /api/me`, `PATCH /api/users/:id/secondary-roles` (Admin) |
| `accounts.ts` | Client accounts | `GET/POST/PATCH/DELETE /api/accounts[/:id]` |
| `prospects.ts` | Prospect pipeline | `GET/POST/PATCH /api/prospects` |
| `opportunities.ts` | Opportunities | `GET/POST/PATCH /api/opportunities` (auto-trigger soft alloc at probability ≥ 70 %) |
| `projects.ts` | Projects + soft-delete restore | `GET/POST/PATCH /api/projects`, `POST /api/projects/:id/restore` |
| `phases.ts` | Project phases | `GET/POST/PATCH/DELETE /api/projects/:id/phases` |
| `tasks.ts` | Project tasks | `GET/POST/PATCH/DELETE /api/projects/:id/tasks` (milestone done → draft invoice) |
| `taskDependencies.ts` | Task dependency graph | `GET/POST/DELETE /api/tasks/:id/dependencies` |
| `taskDetails.ts` | Comments, attachments, checklists | `GET/POST /api/tasks/:id/{comments,attachments,checklists}` |
| `projectTemplates.ts` | Templates with phases / tasks / allocations | `GET/POST/PATCH /api/project-templates`; copy on project create when `autoAllocate` |
| `projectUpdates.ts` | Status updates published to recipients | `GET/POST /api/projects/:id/updates` |
| `baselines.ts` | Project baselines | `GET/POST /api/projects/:id/baselines` |
| `changeOrders.ts` | Scope changes | `GET/POST/PATCH /api/projects/:id/change-orders` |
| `allocations.ts` | Hard / soft allocations + capacity | `GET/POST/PATCH/DELETE /api/allocations`, `GET /api/resources/capacity` |
| `placeholders.ts` | Allocation placeholders | `GET/POST/PATCH/DELETE /api/placeholders` (defaults non-renamable) |
| `resourceRequests.ts` | Six request types + comments | `GET/POST/PATCH /api/resource-requests`, `POST /api/resource-requests/:id/comments` |
| `skills.ts` | Skill catalog + categories | `GET/POST/PATCH /api/skills`, `GET /api/skill-categories` |
| `rateCards.ts` | Rate cards (cost vs billable) | `GET/POST/PATCH /api/rate-cards` |
| `timeEntries.ts` | Daily entries | `GET/POST/PATCH/DELETE /api/time-entries` |
| `timesheets.ts` | Weekly approvals + messages | `GET/POST /api/timesheets`, `POST /api/timesheets/:id/{submit,approve,reject}` (notification trigger) |
| `timeOff.ts` | Time-off requests + holidays integration | `GET/POST/PATCH /api/time-off-requests` |
| `invoices.ts` | Invoices | `GET/POST/PATCH /api/invoices` |
| `invoiceLineItems.ts` | Invoice line items | `GET/POST/PATCH/DELETE /api/invoices/:id/line-items` |
| `billingSchedules.ts` | Billing schedules | `GET/POST/PATCH /api/billing-schedules` |
| `revenueEntries.ts` | Revenue recognition entries | `GET/POST/PATCH /api/revenue-entries` |
| `csat.ts`, `csatSurveys.ts` | CSAT surveys + responses | `GET/POST /api/csat-surveys`, `GET /api/csat/responses` |
| `customFields.ts` | Custom field defs / sections / values | `GET/POST/PATCH /api/custom-fields/*` |
| `documents.ts` | Documents + versioning | `GET/POST /api/documents`, `GET/POST /api/documents/:id/versions` |
| `forms.ts` | Forms + responses | `GET/POST /api/forms`, `GET/POST /api/forms/:id/responses` |
| `savedViews.ts` | Persisted list filters | `GET/POST/PATCH/DELETE /api/saved-views` |
| `notifications.ts` | Notifications + preferences | `GET/POST/PATCH /api/notifications`, `GET/PATCH /api/notification-preferences` |
| `auditLog.ts` | Read-only audit feed | `GET /api/audit-log?cursor=...` |
| `adminSettings.ts` | Tax codes, time categories, time settings, holiday calendars | `GET/POST/PATCH /api/admin/{tax-codes,time-categories,time-settings,holiday-calendars}` |
| `dashboard.ts` | Aggregated KPIs | `GET /api/dashboard/{summary,cr-impact,activity}` |
| `reports.ts` | Reports for the Reports page | `GET /api/reports/{performance,capacity-planning,operations,csat-trend,interval-iq,budget-vs-actuals,burn-down,revenue,utilization,project-health}` |
| `portal.ts`, `portalAuth.ts` | Client portal (read-only project status) | `GET /api/portal/*`, `POST /api/portal/auth/*` |
| `health.ts` | Liveness / readiness | `GET /api/health` |
| `index.ts` | Router aggregator (mounts all of the above under `/api/*`); not a domain route file. | n/a |

---

## 5. Dashboard & Reports — Notable Endpoints

These endpoints power the Dashboard and the Reports page, so they are often the first surfaces a new engineer touches.

### Dashboard

| Endpoint | Purpose |
|---|---|
| `GET /api/dashboard/summary` | Active projects, total revenue, billable hours WTD, team utilisation, etc. **Note:** the previous `Math.min(100, …)` clamp on `teamUtilization` was removed in 2026-04 so the danger band is reachable. |
| `GET /api/dashboard/cr-impact` | Pending change-order count, revenue delta, effort delta. |
| `GET /api/dashboard/activity` | Recent audit-log slice for the Recent Activity card. |
| `GET /api/reports/project-health` | Drives the Portfolio Health stacked bar on dashboard v1. |

The SPA's period selector is **locked to "This Month"** in v1; the API still accepts the period query param but the SPA disables Last 30 / Quarter / Year pending dashboard v2.

### Reports

| Endpoint | Purpose |
|---|---|
| `GET /api/reports/performance` | Performance tab. |
| `GET /api/reports/capacity-planning?weeks=N` | Demand vs Supply chart. **Capped at 52 weeks.** Returns weekly buckets with `totalCapacityFTE`, `timeOffFTE`, `holidayFTE`, `availableFTE`, `assignedDemandFTE`, `unassignedDemandFTE`, `totalDemandFTE`, `surplusFTE`, plus per-role `byRole[]` for surplus/deficit. **Excludes soft-deleted projects.** |
| `GET /api/reports/operations` | Operations tab. |
| `GET /api/reports/csat-trend` | CSAT trend over time. |
| `GET /api/reports/interval-iq` | Time-utilisation analysis bucketed by interval. |
| `GET /api/reports/budget-vs-actuals` | Budget vs actuals per project. |
| `GET /api/reports/burn-down` | Burn-down. |
| `GET /api/reports/revenue` | Revenue rollup. |
| `GET /api/reports/utilization` | Per-person utilisation. |
| `GET /api/reports/project-health` | Project health buckets (On Track / At Risk / Off Track). |

---

## 6. Auto-Triggers (server-side side effects)

| Trigger | Where | Effect |
|---|---|---|
| Opportunity probability ≥ 70 % | `opportunities.ts` (PATCH) | Creates a **soft allocation** tied to the opportunity. |
| Milestone task marked complete | `tasks.ts` (PATCH) | Creates a **draft invoice** for the milestone amount. |
| Timesheet `submit` / `approve` / `reject` | `timesheets.ts` | Inserts notification rows for the submitter / approver. |
| Resource request status → `Fulfilled` | `resourceRequests.ts` | Auto-creates the corresponding allocation. |

All triggers also emit `audit_log` entries (the `resourceRequests.ts` auto-allocation trigger is the exception until R-S-06 is closed — that route file is not currently calling `logAudit()`).

---

## 7. Pagination, Filtering, Sorting

- List endpoints accept `?limit=N&offset=N` (default `limit=50`, hard cap `200`).
- Where lists power dense UI tables (e.g. `accounts`, `projects`), free-text `?q=…` is supported and matches across name + a small set of indexed columns.
- The audit log uses **cursor pagination** (`?cursor=...`) for stable pagination on an append-only stream.
- Sort is `?sort=field&order=asc|desc` where supported. The OpenAPI spec lists sortable fields per endpoint.

---

## 8. Codegen Workflow

1. Edit `lib/api-spec/openapi.yaml`.
2. Run `pnpm --filter @workspace/api-spec run codegen`.
3. Commit the regenerated files in `lib/api-zod/src/generated/` and `lib/api-client-react/src/generated/`.
4. Restart `API Server` and `Start application` workflows.

CI rejects PRs whose generated files are out of sync with `openapi.yaml`.

---

## 9. SPA Consumption Pattern

Pages call generated React Query hooks rather than raw `fetch`:

```ts
import { useListProjects, useUpdateProject } from "@workspace/api-client-react";
import { authHeaders } from "@/lib/auth-headers";

const { data } = useListProjects({ request: { headers: authHeaders() } });
const update = useUpdateProject({ request: { headers: authHeaders() } });
```

`authHeaders()` is the **only** way pages should construct request headers.

---

## 10. Testing the API Locally

```bash
# Start the API
PORT=8080 pnpm --filter @workspace/api-server run dev

# Start the SPA
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/businessnow run dev

# Hit the API directly (set a role)
curl -H "x-user-role: Admin" http://localhost:8080/api/health
curl -H "x-user-role: PM" http://localhost:8080/api/projects
```

Use `$REPLIT_DEV_DOMAIN` instead of `localhost` when working through the Replit preview.

---

## 11. Revision Log

| Date | Version | Changed By | What Changed |
|---|---|---|---|
| 2026-04-24 | 1.0 | Backend Lead | Replaced template with the real BusinessNow PSA API surface: 40 route files, canonical 4-role + legacy 11-role RBAC model, named middleware shortcuts (`requireAdmin` / `requirePM` / `requireFinance` / `requireCostRateAccess` / `blockPortalRoles`), auto-triggers, capacity-planning endpoint, dashboard v1 endpoints, `authHeaders()` helper, codegen pipeline. |
