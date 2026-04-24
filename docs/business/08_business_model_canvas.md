# Business Model Canvas — BusinessNow PSA

| | |
|---|---|
| **Product** | BusinessNow PSA |
| **Owner** | GM, KSAP Technology |
| **Version** | 1.0 — Approved |
| **Date** | 2026-04-24 |
| **Status** | Approved |

> BusinessNow PSA is an **internal** platform built and operated by KSAP Technology for its own services business. The canvas below is therefore framed as an **internal operating model** — what the platform delivers to KSAP, who pays for it (KSAP itself), and how cost vs value is tracked.

---

## 1. Customer Segments

The "customers" are KSAP-internal user populations and a small, controlled set of external client portal users.

| Segment | Description |
|---|---|
| **KSAP delivery teams** | PMs, consultants, Resource Managers running the engagement portfolio. |
| **KSAP Finance** | Rate-card maintenance, invoicing, revenue, month-close. |
| **KSAP leadership** | Dashboard + Reports for portfolio health, capacity, margin. |
| **KSAP Sales / CRM** | Accounts → Prospects → Opportunities → won-deal handoff to delivery. |
| **KSAP Admin / IT** | Users, roles, templates, tax codes, holiday calendars. |
| **Selected client accounts** | Read-only client portal users, scoped to their account. |

---

## 2. Value Propositions

| Segment | Value delivered |
|---|---|
| **Delivery PMs** | One surface for project, tasks, change orders, allocations, time, status updates. Auto-triggers (probability ≥ 70 → soft alloc; milestone done → draft invoice) remove manual steps. |
| **Consultants** | Fast time entry; clear "my tasks" / "my allocations"; transparent timesheet status. |
| **Resource Manager** | Capacity-Planning report (Demand vs Supply, role-level surplus/deficit, 4–52 week horizon); allocation/placeholder UI; six resource-request types with approvals. |
| **Finance** | Rate cards, invoices and line items, revenue entries, billing schedules, tax codes — all linked back to the projects and time entries that produced them. |
| **Leadership** | Live KPIs (Active Projects, Total Revenue, Billable Hours WTD, Team Utilization), Portfolio Health, CR-Impact card. |
| **Sales / CRM** | One pipeline; auto-handoff into Resource Management when an opportunity gets serious. |
| **Client portal accounts** | Real-time project status, documents, CSAT surveys — no nightly export lag. |

---

## 3. Channels

| Channel | Purpose |
|---|---|
| In-app SPA at the KSAP deployment URL | Primary surface for all internal users. |
| `/portal/*` routes | External client-portal access (read-only). |
| In-app notifications + email | Lightweight transactional alerts (timesheet approve/reject, milestone events, change-order status). |
| Internal monthly newsletter | Awareness and what's-new. |
| Office hours (weekly) | Direct support for delivery PMs. |
| `docs/` folder + private wiki | Documentation discoverability. |

There is no marketing site, no demo funnel, no paid acquisition.

---

## 4. Customer Relationships

| Segment | Relationship type |
|---|---|
| KSAP staff | Direct, daily — they live in the platform. PM and Tech Lead own the relationship via office hours and in-app feedback. |
| Client portal accounts | Indirect — the relationship is with the assigned KSAP delivery PM; the platform is the read-only window. |
| KSAP leadership | Periodic — quarterly steering review with Dashboard + Reports as the artefacts. |

---

## 5. Revenue Streams

There is **no external revenue stream** from BusinessNow PSA itself. The platform's "revenue" is the **operational efficiency it returns to KSAP**:

| "Revenue" stream | Measurement |
|---|---|
| Reduced finance month-close effort | Target ~30 % reduction vs pre-PSA baseline. |
| Faster capacity decisions | "Do we have the people?" answered in < 1 minute via the Capacity-Planning report. |
| Fewer parallel spreadsheets | 100 % retirement target across CRM / allocations / timesheets / invoicing within two quarters of GA-internal. |
| Improved margin visibility | Per-project margin available without a quarterly spreadsheet build. |

There is no internal recharge to other KSAP cost centres in FY 2026 (see doc 17 §9).

---

## 6. Key Resources

| Resource | Role |
|---|---|
| Engineering team | Tech Lead, 2 backend, 2 frontend, 0.5 QA. See doc 13 for RACI. |
| Product & design | 0.5 PM, 0.5 UX. |
| OpenAPI contract | `lib/api-spec/openapi.yaml` — single source of truth driving Zod + React Query codegen. |
| Drizzle schema | `lib/db/src/schema/*.ts` — ~60 tables across 11 modules. |
| Replit deployment | Hosting, managed Postgres, daily snapshots, deployment front door. |
| Documentation | This `docs/` suite + the canonical `BusinessNow-PSA-Architecture.md`. |
| Audit log | `audit_log` table — written from every write path. |

---

## 7. Key Activities

| Activity | Cadence |
|---|---|
| 2-week sprints | Continuous. |
| Weekly office hours for delivery PMs | Weekly. |
| Monthly stakeholder newsletter | Monthly. |
| Quarterly leadership steering review | Quarterly. |
| Quarterly UI/UX audit | Quarterly (most recent: 2026-04). |
| Quarterly functional audit | Quarterly (most recent: 2026-04-23 — Resource Management & Capacity Planning). |
| Annual external penetration test | Annually (per doc 17 §6). |
| Periodic security-scan playbook | Pre-release, on auth/RBAC/dependency changes. |

---

## 8. Key Partnerships

| Partner | Why |
|---|---|
| Replit | Hosting, managed Postgres, deployment surface, secrets, daily snapshots. |
| KSAP IT | Off-site backup; identity provisioning; deployment-URL access control; future SSO integration. |
| KSAP Legal | Client-portal DPA; PII handling for client contacts. |
| Internal audit (KSAP) | Annual review of the security & compliance doc. |

There is no third-party PSA SaaS dependency — the platform is the replacement.

---

## 9. Cost Structure

Detailed budget is in **17 — Budget Estimate**. Summary:

| Category | FY 2026 |
|---|---|
| People | $1.14M (73 %) |
| Cloud + infrastructure | $72K |
| Third-party services | $48K |
| Tooling | $36K |
| Security & compliance | $45K |
| Contingency (15 %) | $210K |
| **Total** | **$1.55M** |

Steady-state run-rate is approximately **$1.34M / year** before contingency.

---

## 10. Bottom Line

The business model is straightforward: **KSAP funds the build and run; KSAP captures all of the value back as operational efficiency, faster decisions, and clean data.** There is no external monetisation. The system's success is measured in spreadsheets retired, minutes saved, and decisions made on live numbers — not in ARR or pipeline.

---

## 11. Revision Log

| Date | Version | Changed By | What Changed |
|---|---|---|---|
| 2026-04-24 | 1.0 | GM, KSAP Technology | Replaced template with the real internal operating-model canvas for an internal-only platform. |
