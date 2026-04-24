# Go-to-Market — BusinessNow PSA (Internal Rollout Plan)

| | |
|---|---|
| **Product** | BusinessNow PSA |
| **Owner** | GM, KSAP Technology |
| **Version** | 1.0 — Approved |
| **Date** | 2026-04-24 |
| **Status** | Approved |

> **BusinessNow PSA is not sold externally.** It is an **internal platform** used only by KSAP Technology employees, contractors, and a controlled set of client-portal accounts. This document is therefore an **internal rollout, adoption, and change-management** plan — the equivalent of a GTM for an internal product. It is filed in the `business/` folder for consistency with the docs index.

---

## 1. Audience

| Audience | Surface they touch |
|---|---|
| KSAP delivery PMs | Projects, Tasks, Change Orders, Resource Requests, Reports, Dashboard. |
| KSAP consultants | Time tracking, my-tasks, my-allocations, time-off. |
| KSAP Finance | Rate Cards, Invoices, Line Items, Revenue Entries, Dashboard CR-Impact. |
| KSAP Resource Manager | Allocations, Placeholders, Resource Requests, Capacity-Planning report. |
| KSAP leadership | Dashboard, Reports (Performance, Project Health, Revenue, Utilization). |
| KSAP Sales / CRM | Accounts, Prospects, Opportunities. |
| Selected client accounts | Client Portal (read-only project status, documents, CSAT). |

There is **no external marketing audience**.

---

## 2. Positioning (Internal)

> **"One platform to run KSAP's services business — from first prospect call to final invoice — with capacity and margin visible at all times."**

The pitch is delivered to internal teams via onboarding, not to external buyers. The "competitive set" the platform displaces is internal: the spreadsheets, the second-class CRM tool, the standalone time tracker, the finance workbook.

---

## 3. Adoption Funnel

The "GTM" funnel for an internal platform is **awareness → onboarding → habituation → advocacy**.

| Stage | What good looks like |
|---|---|
| **Awareness** | Every KSAP team member knows what the platform does and where to find it. |
| **Onboarding** | New joiners are walked through their role-specific surface in their first week. |
| **Habituation** | Day-to-day work is done in BusinessNow PSA, not the parallel spreadsheet. |
| **Advocacy** | Team leads escalate gaps via the Risk Register, not by maintaining a private workaround. |

---

## 4. Rollout Phases

The platform is **post-MVP** and in production use. The remaining rollout work is about retiring parallel tools and broadening adoption.

### Phase 1 — MVP (complete)

CRM + Projects + Time + Allocations + Finance + basic Reports + Admin + Client Portal. See `BusinessNow-PSA-Architecture.md` for the shipped surface.

### Phase 2 — Operational maturity (in flight, Q2 2026)

- Dashboard v1 (live).
- Capacity-Planning report (live).
- `authHeaders()` consolidation (live).
- UI density / scale redesign (in flight).
- UI/UX audit follow-ups: US-1 (project-detail TDZ), §6.2 quick wins.
- Spreadsheet retirement audit (Delivery Lead).

### Phase 3 — Adoption deepening (Q3 2026)

- 100 % timesheet adoption across consultant population.
- 100 % rate-card / invoice flow on KSAP-side billing (no parallel finance workbook).
- All pending change orders captured in-platform.

### Phase 4 — Forward roadmap (Q4 2026 → 2027)

- Dashboard v2 (period selector beyond "This Month").
- SSO / OIDC integration (replaces `x-user-role` header).
- Row-level GET filtering for Viewer / Consultant.
- Possibly: data-warehouse offload for Reports if OLTP query latency degrades.

---

## 5. Communication Plan

| Audience | Channel | Cadence |
|---|---|---|
| All KSAP staff | Internal monthly newsletter | Monthly — what's new, what's in flight. |
| Delivery PMs | Weekly 30-min "PSA office hours" | Weekly — open Q&A; backlog triage. |
| Finance | Bi-weekly 15-min huddle | Bi-weekly — month-close health; rate-card / invoice issues. |
| Resource Managers | Monthly capacity review | Monthly — pulled from the Capacity-Planning report. |
| Leadership | Quarterly steering review | Quarterly — Dashboard, Reports, Risk Register. |
| Client portal accounts | In-product notice on portal updates | Per-update. |

---

## 6. Onboarding & Training

### New KSAP joiner (week 1)

| Day | Activity |
|---|---|
| Day 1 | Account provisioned by Admin (Users + secondary roles). Role-switcher walkthrough. |
| Day 2 | Role-specific surface tour (Consultant: time + my-tasks; PM: projects + change orders; Finance: invoices + rate cards). |
| Day 3 | First real action in the platform (consultant: log time; PM: open a project; Finance: open dashboard CR-impact card). |
| Day 5 | Office-hours session — bring questions. |

### Refresher training

Every quarter the PM publishes a 15-minute "what's new in PSA" video and walks through any major change at the next office hours.

---

## 7. Adoption Metrics

| Metric | Target | Source |
|---|---|---|
| Daily active users (KSAP staff) | ≥ 70 % of in-office staff | Analytics |
| % consultants logging time in-platform (vs spreadsheet) | 100 % within 1 quarter of Phase 3 start | Time-entry audit |
| % of change orders captured in-platform | 100 % | PM survey + audit |
| % of invoices generated through Finance module | 100 % | Finance team self-report |
| Capacity-Planning report monthly opens by RM / leadership | ≥ 4 / month | Analytics |
| Open backlog items per quarter from Risk Register | Trending down | Risk Register |

---

## 8. Risks to Adoption

| Risk | Mitigation |
|---|---|
| **Parallel spreadsheets persist** because they're "easier" than the platform. | Spreadsheet retirement audit (Delivery Lead) every quarter; named owner for retirement of each file. |
| **PMs avoid raising change orders** because of the friction. | UI/UX audit follow-ups specifically target the change-order surface. |
| **Finance distrusts the dashboard CR-Impact number.** | Cross-check against `audit_log`-backed change-order rows; weekly Finance huddle. |
| **Consultants resent timesheet friction.** | Quick-fill from previous week; UI/UX audit US-9 (calendar nav) is on the queue. |
| **Resource Manager keeps a private capacity spreadsheet.** | Capacity-Planning report covers their use case; revisit if not. |

---

## 9. Internal Pricing & Cost Recovery

There is **no internal recharge** for FY 2026. The platform is funded centrally from the IT budget per doc 17. If the platform expands to support a second business unit at KSAP, the GM and Finance Lead will revisit cost-recovery.

---

## 10. Decision Log (key GTM-equivalent decisions)

| Date | Decision | Rationale |
|---|---|---|
| 2026-Q1 | Build, not buy. | Doc 09 — competitive analysis. |
| 2026-Q1 | Internal-only; no commercial productisation. | Charter §4 — out of scope. |
| 2026-Q2 | Lock dashboard v1; defer period-selector v2. | Reduce scope to ship a usable dashboard fast. |
| 2026-Q2 | Land `authHeaders()` consolidation before density redesign. | Removes a class of regressions. |

---

## 11. Revision Log

| Date | Version | Changed By | What Changed |
|---|---|---|---|
| 2026-04-24 | 1.0 | GM, KSAP Technology | Replaced template with the real internal-rollout plan. The platform is internal, not commercially sold; this document is the GTM-equivalent for internal adoption. |
