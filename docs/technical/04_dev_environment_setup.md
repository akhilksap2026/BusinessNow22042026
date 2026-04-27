# Dev Environment Setup — BusinessNow PSA

| | |
|---|---|
| **Product** | BusinessNow PSA |
| **Owner** | DevOps / Tech Lead |
| **Version** | 1.0 — Approved |
| **Date** | 2026-04-24 |
| **Status** | Approved |

> The platform is developed and deployed on **Replit**. This guide assumes a Replit workspace; deviations for off-Replit local clones are noted.

---

## 1. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | **20.x +** | Provided by Replit. |
| pnpm | **latest** | Enforced by the root `preinstall` script. **Do not use npm or yarn.** |
| PostgreSQL | provided | Replit-managed; access via `DATABASE_URL`. |
| Git | latest | Replit checkpoints handle most of this; manual `git` reads allowed (writes go via project tasks per the rules of engagement). |

Off-Replit clones additionally need: a local PostgreSQL 14+ instance with `DATABASE_URL` set, and write access to your shell profile to export env vars.

---

## 2. First-Time Setup

```bash
# 1. Install dependencies (pnpm only)
pnpm install

# 2. Generate Zod + React Query bindings from the OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# 3. Sync DB schema (additive only — never destructive in dev without taking a snapshot first)
pnpm --filter @workspace/db run db:push

# 4. Type-check across all packages
pnpm typecheck
```

After step 4 you should see no errors. If `typecheck` fails, fix before starting workflows — it is the most reliable signal that something is wrong.

---

## 3. Workflows

The Replit workspace runs everything through workflows. The two **active** workflows you will use day-to-day are:

| Workflow | Command | Purpose |
|---|---|---|
| **API Server** | `PORT=8080 pnpm --filter @workspace/api-server run dev` | Express 5 API on port 8080. |
| **Start application** | `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/businessnow run dev` | React + Vite SPA on port 5000 (visible in the preview pane). |

Two **legacy artifact-scoped** workflows show up in the workflow list (`artifacts/api-server: API Server` and `artifacts/businessnow: web`) — these are auto-generated from the artifacts and do not start cleanly in this configuration. Ignore them; the two workflows above are the ones to use.

### Restarting workflows

After any code or dependency change, restart the relevant workflow. From the chat interface use the workflow restart action; from a shell:

```bash
# (Replit handles this through workflow tools; no direct shell command is needed.)
```

---

## 4. Repository Layout

```
workspace/
├── lib/
│   ├── db/                  ← Drizzle schemas (~60 tables, 11 modules)
│   ├── api-spec/            ← openapi.yaml — single source of truth
│   ├── api-zod/             ← generated Zod schemas (do not edit)
│   └── api-client-react/    ← generated React Query hooks (do not edit)
├── artifacts/
│   ├── api-server/          ← Express 5 (40 route files in src/routes/)
│   └── businessnow/         ← React + Vite SPA (16 page files in src/pages/, 13 logical modules)
├── scripts/                 ← operational scripts (db, codegen, deploy)
├── docs/                    ← this documentation suite
└── replit.md                ← always-loaded project memory
```

The pnpm workspace is configured at the root `pnpm-workspace.yaml` — packages live under `lib/*` and `artifacts/*`.

---

## 5. Common Commands

```bash
# Type-check libs only (fast)
pnpm typecheck:libs

# Full type-check (libs + artifacts + scripts)
pnpm typecheck

# Build everything
pnpm build

# Re-run codegen after editing the OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Sync DB schema (additive)
pnpm --filter @workspace/db run db:push

# Inspect DB
psql "$DATABASE_URL"

# Filter to a specific package
pnpm --filter @workspace/api-server <command>
pnpm --filter @workspace/businessnow <command>
```

---

## 6. Environment Variables

| Variable | Required | Where it's used | Notes |
|---|---|---|---|
| `DATABASE_URL` | yes | API server (Drizzle) | Provided by Replit. |
| `PORT` | yes (per workflow) | API: 8080; SPA: 5000 | Set in the workflow command. |
| `BASE_PATH` | yes (SPA) | SPA Vite config | Set to `/` in the workflow command. |
| `REPLIT_DEV_DOMAIN` | auto | Useful for `curl` from the shell instead of `localhost` | Provided by Replit. |
| `NODE_ENV` | auto | Read by some dev-only branches in the SPA (e.g. the friendly 404 still allowed to show dev hints in `NODE_ENV !== "production"`). | |

> **Never** read or write secrets manually. Use the environment-secrets skill (see `<replit_environment>`).

---

## 7. Hitting the API During Development

```bash
# Health check
curl -H "x-user-role: Admin" http://localhost:8080/api/health

# Read projects as an Admin
curl -H "x-user-role: Admin" http://localhost:8080/api/projects | jq

# Try a write as an under-privileged role (should 403)
curl -X POST -H "x-user-role: Viewer" -H "content-type: application/json" \
  -d '{"name":"X","accountId":1}' http://localhost:8080/api/projects
```

For requests routed through Replit's proxy, use `$REPLIT_DEV_DOMAIN` instead of `localhost`. Inside the SPA, **always** use the generated React Query hooks with `authHeaders()` from `artifacts/businessnow/src/lib/auth-headers.ts`.

---

## 8. Working with the SPA

| Page route | File | Notes |
|---|---|---|
| `/` | `pages/dashboard.tsx` | Dashboard v1 — KPI tiles, Portfolio Health, Recent Activity (1/3 col). Period selector locked to "This Month". |
| `/projects` | `pages/projects.tsx` | Projects list with status / health filter chips. |
| `/projects/:id` | `pages/project-detail.tsx` | **Note:** US-1 in the UI/UX audit — TDZ crash; fix in flight. |
| `/accounts` | `pages/accounts.tsx` | |
| `/prospects` | `pages/prospects.tsx` | |
| `/opportunities` | `pages/opportunities.tsx` | Probability ≥ 70 % auto-creates a soft allocation. |
| `/time` | `pages/time.tsx` | Sidebar label says "Time Tracking" — note `/time-tracking` is not an alias today (UI/UX audit NV-1). |
| `/resources` | `pages/resources.tsx` | Tabs: Capacity, Heat Map, Projects Timeline, People Timeline, Resource Requests, Skills Matrix. |
| `/finance` | `pages/finance.tsx` | |
| `/reports` | `pages/reports.tsx` | Performance, Capacity Planning (new), Operations, CSAT Trend, Interval IQ, Budget vs Actuals, Burn-Down, Revenue, Utilization, Project Health. |
| `/admin` | `pages/admin.tsx` | Users, Project Templates, Skills Matrix, Tax Codes, Time Categories, Time Settings, Holiday Calendars. |
| `/notifications` | `pages/notifications.tsx` | |
| `/portal/*` | `pages/portal*.tsx` | Read-only client portal. |

Routing is via Wouter (`App.tsx`). Generated hooks live in `lib/api-client-react/src/generated/`.

---

## 9. Code Style & Standards

- **TypeScript strict.** No `any` without a comment justifying it.
- **No comments in code unless asked.** This is a project-wide rule.
- **Use the design system.** New shared components go under `components/ui/`.
- **Headers via `authHeaders()` only.** Do not hand-build `x-user-role` headers in pages.
- **No silent failures.** Failed queries should surface a toast or banner (US-11 in the UI/UX audit covers the global wiring).
- **One file per page; one file per route.** Keep page files thin — extract feature components.

Linting/formatting is via the standard pnpm scripts; CI runs `pnpm typecheck` on every push.

---

## 10. Troubleshooting

### Preview pane is blank

1. Check the `Start application` workflow is running.
2. Restart it after any code or dependency change.
3. Check the browser console for blocked-host errors — Vite must allow all hosts (it already does).
4. Hard-refresh; cache-control headers are disabled in dev.

### `403 Forbidden` on every write

`localStorage.activeRole` is unset. Open the role-switcher in the SPA and pick a role with the right permissions, or set it via DevTools:

```js
localStorage.setItem("activeRole", "Admin");
```

### `pnpm install` complains about npm

The `preinstall` script enforces pnpm. If you see "Use pnpm instead", make sure you really are running pnpm.

### Codegen drift in CI

Run `pnpm --filter @workspace/api-spec run codegen` and commit the regenerated files in `lib/api-zod/src/generated/` and `lib/api-client-react/src/generated/`.

### DB push wants a destructive change

`db:push` will warn before running an `ALTER` that drops or retypes a column. **Stop**. File the change as a planned migration with a snapshot first; never accept destructive prompts in dev for shared infra.

---

## 11. Deployment

Deployment is via Replit's deployment surface (see the deployment skill). The build command is `pnpm build`; the runtime serves the API on `:8080` and the SPA's built static bundle on the configured front door.

Production checklists and incident response live in doc 05.

---

## 12. Revision Log

| Date | Version | Changed By | What Changed |
|---|---|---|---|
| 2026-04-24 | 1.0 | DevOps Lead / Tech Lead | Replaced template with the real BusinessNow PSA dev environment guide: pnpm-only, the two active workflows, repo layout, codegen, role-header walkthrough, troubleshooting. |
