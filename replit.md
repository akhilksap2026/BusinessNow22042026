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
