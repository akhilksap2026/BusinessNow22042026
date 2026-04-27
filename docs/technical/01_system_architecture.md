# System Architecture — BusinessNow PSA

| | |
|---|---|
| **Product** | BusinessNow PSA (KSAP Technology, internal) |
| **Owner** | Tech Lead |
| **Version** | 1.0 — Approved |
| **Date** | 2026-04-24 |
| **Status** | Approved |

> The canonical architecture reference (with full per-table schema and module flows) is [`../BusinessNow-PSA-Architecture.md`](../BusinessNow-PSA-Architecture.md). This document is the high-level summary that gates onboarding and release reviews.

---

## 1. Overview

BusinessNow PSA is a **single-tenant Professional Services Automation platform** for KSAP Technology. It is delivered as a single-page React app talking to an Express 5 API over HTTP/JSON, backed by PostgreSQL via Drizzle ORM. The codebase is a pnpm monorepo with shared libraries between the API and the SPA.

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser                                                         │
│    React + Vite SPA  (port 5000)                                 │
│    Wouter · React Query · Zod · Recharts                         │
│    Orval-generated API hooks  ◄── lib/api-spec/openapi.yaml      │
└─────────────────────────────────┬────────────────────────────────┘
                                  │  HTTP/JSON  (BASE_URL prefix)
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  Express 5 API server  (port 8080)                               │
│    RBAC middleware (requireAdmin / requirePM / requireFinance /  │
│      requireCostRateAccess, blockPortalRoles)                    │
│    Zod validation at the boundary                                │
│    logAudit() on every write path                                │
│    Auto-triggers (probability ≥ 70 → soft alloc;                 │
│      milestone done → draft invoice;                             │
│      timesheet approve/reject → notification)                    │
└─────────────────────────────────┬────────────────────────────────┘
                                  │  Drizzle ORM
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  PostgreSQL                                                      │
│  ~60 tables across 11 domain modules                             │
│  Soft-delete on projects via deletedAt                           │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Architecture Pattern

**Layered, contract-first, monorepo.** A single REST contract (OpenAPI) is the source of truth — both the SPA's React Query hooks and the API's boundary Zod schemas are generated from it. The SPA never reaches into the DB; the API never trusts the client.

| Layer | Responsibility |
|---|---|
| Browser SPA | Render, validate input, call generated hooks, manage cache via React Query. |
| API server | Authenticate by header, authorise by RBAC middleware, validate by Zod, mutate via Drizzle, audit via `logAudit()`, fire any auto-triggers. |
| ORM (Drizzle) | Type-safe SQL; schemas live in `lib/db/src/schema/*.ts`. |
| PostgreSQL | Single source of truth for application data. |

---

## 3. Monorepo Layout

```
workspace/
├── lib/
│   ├── db/                  @workspace/db          ← Drizzle schemas (~60 tables)
│   ├── api-spec/            @workspace/api-spec    ← openapi.yaml (single source of truth)
│   ├── api-zod/             @workspace/api-zod     ← generated Zod schemas
│   └── api-client-react/    @workspace/api-client-react  ← generated React Query hooks
├── artifacts/
│   ├── api-server/          @workspace/api-server  ← Express 5 (40 route files)
│   └── businessnow/         @workspace/businessnow ← React + Vite SPA (16 page files / 13 logical modules)
├── docs/                    ← This documentation suite
└── scripts/                 ← Operational scripts (db, codegen, deploy)
```

Codegen pipeline (`pnpm --filter @workspace/api-spec run codegen`):

```
lib/api-spec/openapi.yaml
        │
        ▼
lib/api-zod/src/generated/api.ts          ← Zod schemas
lib/api-client-react/src/generated/       ← React Query hooks
```

---

## 4. Tech Stack

### Backend

| | |
|---|---|
| Runtime | Node.js 20+ (managed via pnpm) |
| Framework | Express 5 |
| ORM | Drizzle ORM |
| DB | PostgreSQL (Replit-managed; `DATABASE_URL` env var) |
| Validation | Zod (generated from OpenAPI via Orval) |
| Process | Single Node process per workflow; `PORT=8080` for the API server |

### Frontend

| | |
|---|---|
| Framework | React 18 + TypeScript |
| Bundler | Vite |
| Router | Wouter (lightweight client-side routing) |
| Server-state | React Query |
| Forms / validation | Zod (shared with API) |
| Charts | Recharts |
| Process | Vite dev server on `PORT=5000`; `BASE_PATH=/` |

### Cross-cutting

| | |
|---|---|
| Package manager | pnpm (enforced via `preinstall`) |
| Type checking | `tsc --build` across all libs + `pnpm -r --filter "./artifacts/**" typecheck` |
| API contract | OpenAPI 3.x in `lib/api-spec/openapi.yaml`; codegen via Orval |
| Auth model (current) | `x-user-role` request header read from `localStorage.activeRole` via the `authHeaders` helper in `artifacts/businessnow/src/lib/auth-headers.ts` |
| Audit | `logAudit()` helper → `audit_log` table |

---

## 5. Component Diagram

```
┌─────────────── React + Vite SPA ───────────────┐
│                                                 │
│   pages/ (13)              components/          │
│   ├── dashboard.tsx        ├── ui/ (shadcn)     │
│   ├── projects.tsx         ├── allocation-…     │
│   ├── project-detail.tsx   ├── resource-…       │
│   ├── accounts.tsx         └── …                │
│   ├── prospects.tsx                             │
│   ├── opportunities.tsx    contexts/            │
│   ├── time.tsx             └── current-user…    │
│   ├── resources.tsx                             │
│   ├── finance.tsx          lib/                 │
│   ├── reports.tsx          ├── auth-headers.ts  │
│   ├── admin.tsx            └── format.ts        │
│   ├── notifications.tsx                         │
│   ├── portal*.tsx          generated hooks      │
│                              (from api-client-…) │
└──────────┬──────────────────────────────────────┘
           │
           ▼  HTTP /api/*  (via React Query + Zod-validated payloads)
           │
┌─────────────── Express 5 API server ──────────────────────┐
│                                                            │
│   src/routes/ (40 files; one per domain)                   │
│   ├── projects.ts        ├── time-entries.ts               │
│   ├── tasks.ts           ├── timesheets.ts                 │
│   ├── allocations.ts     ├── resource-requests.ts          │
│   ├── opportunities.ts   ├── invoices.ts                   │
│   ├── change-orders.ts   ├── revenue-entries.ts            │
│   ├── dashboard.ts       ├── reports.ts                    │
│   ├── …                                                    │
│                                                            │
│   middleware: rbac (requireAdmin / requirePM /             │
│      requireFinance / requireCostRateAccess)               │
│   helpers: logAudit(), auto-triggers                       │
└──────────┬─────────────────────────────────────────────────┘
           │  Drizzle ORM
           ▼
┌─────────────── PostgreSQL ────────────────────────────────┐
│                                                            │
│   ~60 tables · 11 modules                                  │
│   Soft delete on projects (deletedAt)                      │
│   Audit log (audit_log)                                    │
└────────────────────────────────────────────────────────────┘
```

---

## 6. Data Flow Examples

### Read

```
SPA           API                 DB
 │— GET /api/projects ─►│
 │                      │— SELECT projects WHERE deletedAt IS NULL ─►│
 │                      │◄— rows ─────────────────────────────────────│
 │                      │— mapProject() · Zod parse ──────────────────│
 │◄— JSON ───────────────│
```

### Write (with RBAC, audit, auto-trigger)

```
SPA (PM role)        API                          DB
 │— POST /api/tasks ─►│
 │  (x-user-role: PM) │— requirePM() ✔            │
 │                    │— Zod body validate ✔      │
 │                    │— Drizzle INSERT  ───────────►│
 │                    │— logAudit(...)            │
 │                    │  (if milestone & complete: │
 │                    │   draft invoice trigger)  │
 │◄— 201 Created ─────│
```

### SPA `authHeaders` (single source of role)

`artifacts/businessnow/src/lib/auth-headers.ts` is the helper used by the migrated SPA call-sites to construct request headers. The helper itself is fail-closed: if `localStorage.activeRole` is unset, the role header is omitted (the API then rejects writes via RBAC). The role header is spread **last** so caller-supplied `extra` headers cannot override it. The 2026-04 migration introduced `authHeaders()` as the **single helper** and replaced 22 hardcoded `x-user-role: Admin` headers across 6 page files (`finance.tsx`, `admin.tsx`, `resources.tsx`, `projects.tsx`, `project-detail.tsx`, `opportunities.tsx`). Cleanup is **partial**: a small number of hardcoded `x-user-role: PM` strings remain in `project-detail.tsx` (in flight as part of US-1) and `components/project-gantt.tsx` (component-level, on the backlog), and `current-user.tsx` defaults `activeRole` to `"Admin"` at boot before `/api/me` resolves.

---

## 7. Deployment & Runtime

| Aspect | Value |
|---|---|
| Hosting | Replit deployments |
| Workflows (dev) | `API Server` (`PORT=8080`) and `Start application` (`PORT=5000 BASE_PATH=/`) |
| Build | `pnpm build` (root) — runs `typecheck` then `pnpm -r --if-present run build` |
| Database | Replit-managed PostgreSQL via `DATABASE_URL` |
| Static assets | Served by Vite in dev; built bundle in production |
| Logs | Workflow console (dev) and Replit deployment logs (prod) |

---

## 8. Cross-Cutting Concerns

| Concern | Where it lives |
|---|---|
| RBAC enforcement | API middleware: `requireAdmin`, `requirePM`, `requireFinance`, `requireCostRateAccess`, `blockPortalRoles`. Canonical 4-role model (`account_admin` / `super_user` / `collaborator` / `customer`) with legacy 11-role string compatibility. Doc 05 §3. |
| Audit log | `logAudit()` in API; `audit_log` table; mandatory on every state-changing route. |
| Tenant isolation | Single-tenant — not applicable. |
| Soft delete | `projects.deletedAt`. Capacity calculations (`/resources/capacity`, `/reports/capacity-planning`) filter `projects.deletedAt IS NULL`. |
| Validation | Zod schemas generated from OpenAPI (`lib/api-zod`). |
| Generated SPA hooks | `lib/api-client-react` (Orval). |
| Period selector (dashboard) | Fixed to "This Month" in v1; Last 30 / Quarter / Year disabled in the SPA pending dashboard v2. |
| Fail-closed roles | The SPA's `authHeaders` helper omits the role header if `activeRole` is unset, so writes fail at RBAC rather than silently using a default role. |

---

## 9. Architectural Principles

1. **Contract-first.** The OpenAPI spec is the truth. Codegen runs in CI; manual edits to generated files are forbidden.
2. **Type safety end-to-end.** Drizzle infers DB types; Zod validates at the boundary; TypeScript is strict throughout.
3. **Server-side authorisation as the rule.** Write routes are wrapped in the right `require*` middleware. No client-only RBAC. (One known exception today: `resourceRequests.ts` write routes are not yet wrapped — tracked as R-S-06 in the risk register.)
4. **Audit every write.** `logAudit()` is part of the Definition of Done for any new write route.
5. **Soft delete.** Loss-of-data must be recoverable. Capacity, reports, exports filter soft-deleted rows; audit log retains them.
6. **Single helper for role propagation.** SPA call-sites must use `authHeaders()`; ad-hoc header construction is a code-review reject.
7. **No silent fallbacks.** A failed query surfaces an error toast (in progress per UI/UX audit US-11), not an empty list.
8. **Additive migrations.** Schema changes are additive-only against the OLTP DB; destructive changes go via a planned migration window (doc 04).

---

## 10. Known Gaps / Open Items

These are tracked formally in **15 — Risk Register** and the audits in `docs/`:

- **Auth model is header-only.** No SSO, no JWT today. SSO is a roadmap item; doc 05 documents this honestly.
- **GET-route row-level filtering** for the Viewer / Consultant role is permissive (returns all rows). Accepted backlog item per the 2026-04-23 audit.
- **Dashboard period selector** is locked to "This Month" pending v2.
- **Reports run off OLTP.** No data warehouse — capped at 52 weeks for capacity planning to keep queries safe.
- **Replacement Requests** for auto-allocate projects are not blocked server-side (medium-priority backlog).

See `BusinessNow-PSA-Architecture.md` for the canonical, fully-detailed architecture and `comprehensive-audit-2026-04.md` for the most recent functional audit.

---

## 11. Revision Log

| Date | Version | Changed By | What Changed |
|---|---|---|---|
| 2026-04-24 | 1.0 | Tech Lead | Replaced template with the real BusinessNow PSA architecture summary. Documents the contract-first stack, `authHeaders` helper, RBAC roles, dashboard v1, and the single-tenant constraint. |
