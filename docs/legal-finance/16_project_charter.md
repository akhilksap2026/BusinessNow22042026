# Project Charter — BusinessNow PSA

| | |
|---|---|
| **Project** | BusinessNow PSA Platform |
| **Sponsor** | Executive Sponsor, KSAP Technology |
| **Project Manager** | Delivery Lead, BusinessNow PSA |
| **Tech Lead** | Tech Lead, BusinessNow PSA |
| **Charter Version** | 1.0 — Approved |
| **Date** | 2026-04-24 |
| **Status** | Approved |

---

## 1. Project Purpose

BusinessNow PSA exists to give KSAP Technology a **single, governed system of record** for the full professional-services lifecycle: CRM (accounts, prospects, opportunities), project delivery (phases, tasks, change orders), time and timesheets, resource planning (allocations, requests, capacity), finance (rate cards, invoices, revenue), and the client portal. It replaces a patchwork of spreadsheets, Jira-style trackers, and ad-hoc finance workbooks that had grown brittle as the firm scaled past ~50 active engagements.

The platform is built **internally for KSAP Technology**. It is not a commercial SaaS product. The "customers" are KSAP's own delivery, sales, finance, resource-management, and client portal users.

---

## 2. Business Justification

The pre-existing tooling could not answer the day-to-day questions a services firm needs to run safely:

- **Cash visibility** — billable hours sat in one tool, invoices in another; finance reconciled by hand each month.
- **Capacity** — over-allocations were caught only when a consultant told their PM they were on three projects.
- **Margin** — cost rate, billable rate, change orders, and tracked time lived in different places, so per-project margin was an estimate, not a number.
- **Audit** — there was no single, trustworthy log of who changed what when (a recurring blocker on internal compliance reviews).
- **Client experience** — the client portal was a static export that lagged the internal state by days.

BusinessNow PSA collapses these into one platform with one schema, one audit log, and one set of role-gated workflows.

### Expected internal ROI

- **~30%** reduction in finance-month-close effort (target; tracked as a Risk Register dependency).
- **Sub-day** resolution of capacity questions at the leadership review (was multi-day, multi-spreadsheet).
- **Zero** parallel finance/operations spreadsheets within two quarters of GA-internal.

---

## 3. Project Objectives

| # | Objective | Measure of success |
|---|---|---|
| O1 | One operational platform for the KSAP services lifecycle. | Spreadsheets retired across CRM, allocations, timesheets, and invoicing. |
| O2 | Server-side RBAC on every write endpoint. | Audit shows zero write routes without one of the named middleware shortcuts (`requireAdmin` / `requirePM` / `requireFinance` / `requireCostRateAccess`) or a canonical-role check (see doc 05 §3). Known gap: `resourceRequests.ts` is un-gated and on the backlog. |
| O3 | Append-only audit log of state changes. | `audit_log` rows present for every write path; verified by sampling each release. |
| O4 | Capacity planning answers "do we have the people?" in-product. | New `GET /api/reports/capacity-planning` endpoint and Reports tab; surplus/deficit by role visible. |
| O5 | Internal client portal updated in real time. | Portal reads the same DB as internal users; no nightly export. |
| O6 | Predictable delivery cadence (2-week sprints). | Sprint commitment vs delivery tracked by Delivery Lead; baseline ≥ 80 %. |

---

## 4. Scope Statement

### In scope

- Full CRM (accounts, prospects, opportunities) with auto-trigger to soft allocation at probability ≥ 70 %.
- Projects, phases, tasks (with dependencies, attachments, comments, checklists), baselines, change orders, milestone-driven draft invoicing.
- Time tracking — daily entries, timesheets, approvals, time off, holiday calendars.
- Resource management — allocations (hard/soft), placeholders, resource requests (six types), capacity calculations including time-off and holidays, capacity-planning report.
- Finance — rate cards, billing schedules, invoices, invoice line items, revenue entries.
- Skills matrix, project templates with template phases / tasks / allocations.
- Documents and document versioning, custom fields, saved views, forms.
- Client portal (`/portal/*`) — read-only project status for client users.
- Notifications and notification preferences.
- Admin surface — users, project templates, skills matrix, tax codes, time categories, time settings, holiday calendars.

### Out of scope (explicit)

- External commercial sale or multi-tenant white-labelling of the platform.
- Native mobile apps.
- SAML SSO / advanced enterprise IdP — current model uses a `x-user-role` header from the SPA; see doc 05.
- Real-time collaboration (live cursors / live editing).
- Externally hosted analytics warehouse — Reports run off the OLTP DB.
- Built-in expense management beyond the scope of `revenue_entries` and invoice line items.

---

## 5. High-Level Deliverables

| Deliverable | Status |
|---|---|
| Express 5 API server with 40 route files (`artifacts/api-server`). | **Live** |
| React + Vite SPA with 13 logical page modules / 16 page files (`artifacts/businessnow`). | **Live** |
| Drizzle schema (~60 tables across 11 modules) on PostgreSQL. | **Live** |
| OpenAPI spec (`lib/api-spec/openapi.yaml`) with Orval codegen → Zod + React Query. | **Live** |
| RBAC middleware (`requireAdmin`, `requirePM`, `requireFinance`, `requireCostRateAccess`, `blockPortalRoles`) over a canonical 4-role model with legacy 11-role compatibility. | **Live** |
| `logAudit()` instrumentation across all write paths. | **Live** |
| Capacity-planning report (FTE supply/demand, role-level surplus/deficit). | **Live (2026-04-23)** |
| Dashboard v1 (KPI tiles + Portfolio Health + period selector). | **Live (2026-04)** |
| `authHeaders` helper (single source of role for SPA → API requests). | **Live (2026-04)** |
| UI density / scale redesign. | In progress |
| UI/UX audit follow-ups (project-detail TDZ fix US-1; §6.2 quick wins). | In progress |

---

## 6. Stakeholders

| Stakeholder | Role | Interest |
|---|---|---|
| Executive Sponsor (KSAP Technology leadership) | Project authoriser; budget owner; final escalation. | Margin visibility; one platform; risk reduction. |
| Delivery Lead | Day-to-day program owner. | On-time delivery; sprint health; cross-team coordination. |
| Tech Lead | Architecture & code quality owner. | System integrity; release safety; performance. |
| Engineering team | Builds and operates the platform. | Clear scope; sustainable pace; good tooling. |
| PMs (delivery) | Daily users of project, time, resource, change-order surfaces. | Accurate forecast; minimal admin friction. |
| Finance team | Daily users of invoices, rate cards, revenue, dashboard CR-impact. | Trustworthy numbers; clean month-close. |
| Resource Manager | Daily user of allocations, resource requests, capacity-planning report. | Visibility of surplus/deficit by role. |
| Consultants (Viewer/Consultant role) | Daily users of timesheets, my-tasks, my-allocations. | Speed; clarity on what's mine; few clicks. |
| Client portal users | External users; read-only access to project status. | Up-to-date status; documents; surveys. |

---

## 7. Key Assumptions

- The canonical 4-role model (`account_admin`, `super_user`, `collaborator`, `customer`) — with legacy 11-role string compatibility — remains stable through the planning horizon.
- The platform stays single-tenant (one KSAP Technology workspace).
- PostgreSQL on Replit's managed database remains the production datastore.
- Orval-driven codegen continues as the single source of truth for the API contract.
- The 2-week sprint cadence and current team allocations hold (see doc 13).

---

## 8. Constraints

- **No commercial productisation.** All decisions optimise for KSAP's internal usage.
- **Replit-hosted runtime.** Workflows: API server on `:8080`, SPA on `:5000`. Deployment uses Replit's deployment surface (see `.local/skills/deployment`).
- **No native mobile.** Web-responsive only; the dense UI shell is desktop-first.
- **Backward compatibility on schema.** Migrations are additive-only against the OLTP DB; destructive changes go via a planned migration window (see doc 04).
- **Single auth header (`x-user-role`).** This is honestly described in doc 05 — no JWT/OAuth surface today; an SSO upgrade is on the LATER track of the roadmap.

---

## 9. High-Level Risks

The full register lives in **15 — Risk Register**. The five highest-impact open risks at this charter version are:

1. **R-O-01 — Capacity / scaling of the OLTP DB** as report queries widen. Mitigated by query-level limits and the new capacity-planning endpoint capping at 52 weeks.
2. **R-S-01 — Auth model is header-based.** No SSO; mitigated by network controls and Replit's auth front; SSO is on the roadmap.
3. **R-Pr-01 — Scope creep** from PM/Finance feature requests outside the agreed module surface.
4. **R-Pr-02 — UI density / scale** changes touching every page; risk of regressions tracked via the `ui-ux-audit-2026-04.md` follow-up.
5. **R-T-01 — Single-developer concentration** on backend route files; mitigated by pair-review and the OpenAPI contract enforcement.

---

## 10. Authorisation

This charter authorises the BusinessNow PSA team to operate against the scope statement in §4 and the deliverables in §5, within the constraints in §8 and against the budget envelope in **17 — Budget Estimate**. Material scope changes are routed through the Executive Sponsor and reflected in a charter version bump.

| Role | Sign-off |
|---|---|
| Executive Sponsor (KSAP Technology) | **Approved — 2026-04-24** |
| Tech Lead | **Approved — 2026-04-24** |
| Delivery Lead | **Approved — 2026-04-24** |
| Finance Lead | **Approved — 2026-04-24** |
| Security Lead | **Approved — 2026-04-24** |

---

## 11. Revision Log

| Date | Version | Changed By | What Changed |
|---|---|---|---|
| 2026-04-24 | 1.0 | Executive Sponsor + PM | First approved charter. Documents post-MVP, in-production state of the platform; scope, deliverables, risks reflect the 2026-04 audits and dashboard v1 rollout. |
