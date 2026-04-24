# BusinessNow PSA — Documentation Hub

**Version:** 1.0 &nbsp;|&nbsp; **Status:** Approved &nbsp;|&nbsp; **Last Updated:** 2026-04-24

This documentation suite is the single source of truth for the **BusinessNow PSA** platform — KSAP Technology's internal Professional Services Automation system. It spans technical architecture, product scope, delivery operations, business model, and the legal/financial frame around the project. Use it to onboard new team members, align stakeholders before key decisions, ground sprint and release work in the agreed scope, and trace every commitment back to a written, owned, dated artefact. Each document is a living working document with an explicit owner and review cadence — start with the registry below, then jump to the documents most relevant to your role.

For deep technical reference, the canonical architecture and module-flow document is [`BusinessNow-PSA-Architecture.md`](./BusinessNow-PSA-Architecture.md). The two most recent system audits are [`comprehensive-audit-2026-04.md`](./comprehensive-audit-2026-04.md) (Resource Management & Capacity Planning, 2026-04-23) and [`ui-ux-audit-2026-04.md`](./ui-ux-audit-2026-04.md) (UI/UX, 2026-04).

---

## 1. Document Registry

| Doc ID | Document Name | Audience | Status | Owner | Last Updated | Path |
|---|---|---|---|---|---|---|
| 01 | System Architecture | Engineering | Approved | Tech Lead | 2026-04-24 | [`technical/01_system_architecture.md`](./technical/01_system_architecture.md) |
| 02 | API Documentation | Engineering, Integrators | Approved | Backend Lead | 2026-04-24 | [`technical/02_api_documentation.md`](./technical/02_api_documentation.md) |
| 03 | Database Schema | Engineering, Data | Approved | Backend Lead | 2026-04-24 | [`technical/03_database_schema.md`](./technical/03_database_schema.md) |
| 04 | Dev Environment Setup | Engineering | Approved | DevOps Lead | 2026-04-24 | [`technical/04_dev_environment_setup.md`](./technical/04_dev_environment_setup.md) |
| 05 | Security & Compliance | Engineering, Security, Legal | Approved | Security Lead | 2026-04-24 | [`technical/05_security_and_compliance.md`](./technical/05_security_and_compliance.md) |
| 06 | Product Requirements Document | Product, Engineering, Design | Approved | PM | 2026-04-24 | [`business/06_product_requirements_document.md`](./business/06_product_requirements_document.md) |
| 07 | Go-to-Market Strategy | GTM, Leadership | Approved | GM, KSAP Technology | 2026-04-24 | [`business/07_go_to_market_strategy.md`](./business/07_go_to_market_strategy.md) |
| 08 | Business Model Canvas | Leadership, Strategy | Approved | GM, KSAP Technology | 2026-04-24 | [`business/08_business_model_canvas.md`](./business/08_business_model_canvas.md) |
| 09 | Competitive Analysis | Product, Leadership | Approved | PM | 2026-04-24 | [`business/09_competitive_analysis.md`](./business/09_competitive_analysis.md) |
| 10 | Product Roadmap | Product, Engineering | Approved | PM | 2026-04-24 | [`product/10_product_roadmap.md`](./product/10_product_roadmap.md) |
| 11 | User Stories & Epics | Product, Engineering, QA | Approved | PM | 2026-04-24 | [`product/11_user_stories_and_epics.md`](./product/11_user_stories_and_epics.md) |
| 12 | UX Research Brief | Design, Product | Approved | UX Lead | 2026-04-24 | [`product/12_ux_research_brief.md`](./product/12_ux_research_brief.md) |
| 13 | Team Structure & RACI | Delivery, Operations, Leadership | Approved | Delivery Lead | 2026-04-24 | [`operations/13_team_structure_and_raci.md`](./operations/13_team_structure_and_raci.md) |
| 14 | Sprint Plan — Phase 1 (MVP) | Delivery, Engineering, Product | Approved | Delivery Lead | 2026-04-24 | [`operations/14_sprint_plan_phase1.md`](./operations/14_sprint_plan_phase1.md) |
| 15 | Risk Register | PM, Leadership | Living | PM | 2026-04-24 | [`operations/15_risk_register.md`](./operations/15_risk_register.md) |
| 16 | Project Charter | Sponsors, Leadership | Approved | Executive Sponsor | 2026-04-24 | [`legal-finance/16_project_charter.md`](./legal-finance/16_project_charter.md) |
| 17 | Budget Estimate | Finance, Leadership | Approved | Finance Lead | 2026-04-24 | [`legal-finance/17_budget_estimate.md`](./legal-finance/17_budget_estimate.md) |

### Reference documents (not part of the numbered registry)

| Document | Description |
|---|---|
| [`BusinessNow-PSA-Architecture.md`](./BusinessNow-PSA-Architecture.md) | Canonical architecture & module flow with full per-table schema breakdown across all 11 domain modules. |
| [`comprehensive-audit-2026-04.md`](./comprehensive-audit-2026-04.md) | Most recent functional audit (Resource Management & Capacity Planning, 2026-04-23). |
| [`ui-ux-audit-2026-04.md`](./ui-ux-audit-2026-04.md) | Most recent UI/UX audit, prioritised fix list. |

---

## 2. How to Use This Documentation

Each team has a recommended starting set. Read your team's bundle first; jump into other sections as cross-team work demands.

### Engineering Team — Docs 01–05

- **Start with:** **01 — System Architecture** for the big picture, then **03 — Database Schema** and **02 — API Documentation** to ground concrete work.
- **Daily reference:** **04 — Dev Environment Setup** for local setup, commands, and troubleshooting.
- **Mandatory before any production change:** **05 — Security & Compliance** — every endpoint, secret, and dependency must align with the controls listed there.
- **Cross-link:** Keep **11 — User Stories & Epics** open during refinement and implementation so acceptance criteria stay in scope. The full per-table schema lives in `BusinessNow-PSA-Architecture.md` §4.

### Product Team — Docs 10–12

- **Start with:** **10 — Product Roadmap** for sequencing and themes.
- **For sprint-level work:** **11 — User Stories & Epics** for the backlog and acceptance criteria.
- **For discovery and validation:** **12 — UX Research Brief** for research methods and success metrics.
- **Cross-link:** Anchor decisions back to **06 — Product Requirements Document** and surface trade-offs through **15 — Risk Register**.

### Leadership / Business — Docs 06–09

- **Start with:** **06 — Product Requirements Document** for the agreed problem and scope.
- **For positioning:** **07 — Go-to-Market Strategy** (KSAP-internal rollout plan, not a public GTM).
- **For the operating model:** **08 — Business Model Canvas**.
- **For tooling decisions:** **09 — Competitive Analysis** — why we built rather than bought.

### Delivery / Operations — Docs 13–15

- **Start with:** **13 — Team Structure & RACI** so everyone knows who is Responsible, Accountable, Consulted, and Informed.
- **For execution:** **14 — Sprint Plan — Phase 1** for capacity, milestones, and sprint goals.
- **For risk surveillance:** **15 — Risk Register** — review weekly with the PM and Tech Lead.
- **Cross-link:** Use **04 — Dev Environment Setup** for onboarding new joiners and **05 — Security & Compliance** for release gates.

### Sponsors / Finance — Docs 16–17

- **Start with:** **16 — Project Charter** for authorisation, sponsors, scope statement, and success criteria.
- **For financial control:** **17 — Budget Estimate** for category breakdowns, contingency, and funding plan.
- **Cross-link:** Pair with **15 — Risk Register** for exposure tracking and **08 — Business Model Canvas** for unit-economics context.

---

## 3. Documentation Maintenance

### Review cadence by document type

| Document type | Documents | Review cadence | Trigger for off-cycle update |
|---|---|---|---|
| Technical (architecture, schema, API, dev setup) | 01, 02, 03, 04 | **Quarterly**, plus on every breaking change. | Any architectural decision (ADR), schema migration, or new API surface. |
| Security & compliance | 05 | **Quarterly**, plus on every audit finding. | New regulation, incident, vendor change, or sub-processor update. |
| Product strategy & business | 06, 07, 08, 09 | **Quarterly**, ahead of each planning cycle. | Pricing/scope change, ICP refinement, or major workflow redesign. |
| Roadmap & backlog | 10, 11 | **Bi-weekly** at sprint review; full refresh **quarterly**. | New committed initiative, scope change, or P1 incident. |
| Research | 12 | **Per research round**. | Start of any new study or pivot in research questions. |
| Delivery operations | 13, 14, 15 | RACI **quarterly**; sprint plan **per phase**; risk register **weekly (high) / bi-weekly (full)**. | Org change, milestone slip, or escalation per the rules in doc 15. |
| Charter & finance | 16, 17 | **Quarterly**, plus on any change in scope, sponsor, or funding. | Budget variance > ±10%, new investment round, or scope re-baseline. |

### Owner responsibility

- The named **Owner** in §1 is accountable for keeping their document current, accurate, and reviewed on cadence.
- Owners must update the document's **Version**, **Last Updated**, and (where present) **Revision Log** on every meaningful change.
- Owners are the single point of escalation for questions about their document and for requesting changes from contributors.
- A change of ownership is itself a change — record it in the document and in this index.

### Version control guidance

- Use a simple **`MAJOR.MINOR`** convention: bump **MINOR** for clarifications and additions; bump **MAJOR** when scope, structure, or commitments change materially.
- All documentation lives in the project repo under `/docs/` and is versioned with **Git** — every change is a pull request reviewed by at least one peer in the document's audience.
- Status values used across the suite: **Draft**, **In Review**, **Approved**, **Living**, **Deprecated**.
- Deprecated documents are not deleted — they are marked `Status: Deprecated`, dated, and replaced with a link to the successor document.

---

## 4. Glossary

| Term | Definition |
|---|---|
| **BusinessNow PSA** | KSAP Technology's Professional Services Automation platform — the product these docs describe. |
| **PSA** | Professional Services Automation — software that runs the lifecycle of a services business: CRM, projects, time, resources, finance. |
| **KSAP Technology** | The professional-services firm whose internal teams own, build, and operate BusinessNow PSA. |
| **Project** | A delivery engagement with a client account; the primary unit of work. Soft-deleted via `deletedAt` rather than hard-removed. |
| **Allocation** | A planned commitment of a person (or placeholder) to a project, in hours per week, classed as **hard** or **soft**. |
| **Placeholder** | An unfilled allocation slot used to plan capacity before a real person is assigned. |
| **Resource Request** | A workflow ticket asking the Resource Manager / Admin to fulfil an allocation gap, replace a person, extend, reduce, change role, or remove. |
| **Change Order** | A scope change against a project, with revenue and effort impact, requiring approval. |
| **Auto-allocate** | Project flag that, when enabled, automatically copies template allocations on create and (in some flows) reflects scope changes back into allocations. |
| **CR Impact** | "Change Request" impact — the dashboard summary of pending change orders' revenue and effort delta. |
| **CSAT** | Customer Satisfaction survey, sent at milestones; responses feed the Reports → CSAT Trend tab. |
| **Interval IQ** | Time-utilisation analysis tab on the Reports page that buckets time entries by interval to surface utilisation patterns. |
| **Saved View** | A persisted set of filters/sort on a list page (Projects, Resources, etc.). |
| **RBAC** | Role-Based Access Control. **Canonical 4-role model**: `account_admin`, `super_user`, `collaborator`, `customer`. The legacy 11-role string union (`Admin`, `PM`, `Super User`, `Finance`, `Developer`, `Designer`, `QA`, `Collaborator`, `Viewer`, `Customer`, `Partner`) is still accepted on the `x-user-role` request header — `LEGACY_ROLE_MAP` resolves to the canonical role. Server-side enforcement via named middleware shortcuts (see doc 05). "Resource Manager" is a **job function**, not a role. |
| **Audit log** | Append-only `audit_log` table. Every state-changing route calls `logAudit()`. |
| **Soft delete** | Pattern used by `projects.deletedAt` (and similar). Restored via dedicated endpoints; archived rows stay readable in audit log and exports. |
| **Auto-trigger** | Server-side side effect attached to a write (e.g. opportunity probability ≥ 70 % → soft allocation, milestone task done → draft invoice, timesheet approve/reject → notification). |
| **Drizzle** | The ORM used for all DB access in `lib/db`. |
| **Orval** | The OpenAPI codegen that turns `lib/api-spec/openapi.yaml` into Zod schemas (`lib/api-zod`) and React Query hooks (`lib/api-client-react`). |
| **DoD** | Definition of Done — see doc 11 §1. |

---

## 5. Current Phase & Active Work Streams

As of **2026-04-24** the platform is **post-MVP**, in production-equivalent internal use, with the following active work streams:

- **Density / scale** redesign of the UI shell (covered by the active "Increase density and reduce default UI scale" task; see `ui-ux-audit-2026-04.md` §6.4).
- **UI/UX audit follow-ups** — critical fix US-1 (project-detail TDZ crash) and the §6.2 quick-wins.
- **Dashboard v1** — recently shipped: hero KPI tiles with status borders, Portfolio Health stacked bar, period selector locked to "This Month", Recent Activity demoted to a 1/3 column. Documented in doc 06 §4 and doc 10 §2.
- **RBAC `authHeaders` consolidation** — a single helper now spreads the role from `localStorage.activeRole`, replacing 22 hardcoded admin headers across 6 page files.
- **Capacity Planning report** (Reports tab) — new endpoint `GET /api/reports/capacity-planning`; resolved the highest-priority gap from the 2026-04-23 audit.

The currently scoped backlog and forward plan live in **10 — Product Roadmap** and the open items in **15 — Risk Register**.
