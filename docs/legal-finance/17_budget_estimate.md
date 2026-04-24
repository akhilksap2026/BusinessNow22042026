# Budget Estimate — BusinessNow PSA

| | |
|---|---|
| **Project** | BusinessNow PSA Platform |
| **Owner** | Finance Lead, KSAP Technology |
| **Period covered** | FY 2026 (12 months: 2026-01 → 2026-12) |
| **Version** | 1.0 — Approved |
| **Date** | 2026-04-24 |
| **Status** | Approved |
| **Currency** | USD |

> Internal-build numbers. BusinessNow PSA is **not** sold externally; this budget covers the platform team and its run-cost only. Customer-acquisition / marketing lines are intentionally absent.

---

## 1. Summary

| Category | FY 2026 budget | % of total |
|---|---|---|
| People (engineering + product + design + QA) | **$1,140,000** | 73 % |
| Cloud & infrastructure (Replit deployment, PostgreSQL, observability) | **$72,000** | 5 % |
| Third-party services (email, error tracking, analytics, security tools) | **$48,000** | 3 % |
| Tooling (developer tools, design tools, code-quality, project tracking) | **$36,000** | 2 % |
| Security & compliance (penetration test, dependency scanning, audit) | **$45,000** | 3 % |
| Contingency (15 % of all categories above, rounded) | **$210,000** | 14 % |
| **Total FY 2026** | **$1,551,000** | 100 % |

Run-rate (steady state) is approximately **$1.34M / year** before contingency once the team and platform stabilise.

---

## 2. People

The team allocations match doc 13 (Team Structure & RACI). Costs are **fully loaded** (salary + benefits + employer taxes + standard equipment) at KSAP Technology's internal rate cards.

| Role | Allocation | FY 2026 cost |
|---|---|---|
| Tech Lead | 100 % | $220,000 |
| Backend Engineer (1) | 100 % | $180,000 |
| Backend Engineer (2) | 100 % | $180,000 |
| Frontend Engineer (1) | 100 % | $180,000 |
| Frontend Engineer (2) | 100 % | $170,000 |
| QA Engineer | 50 % | $80,000 |
| UX Designer | 50 % | $75,000 |
| Product Manager | 50 % | $55,000 |
| **People subtotal** | — | **$1,140,000** |

> Reductions vs initial 2026 plan: the dedicated DevOps role was descoped (covered by Tech Lead + KSAP IT) and the Business Analyst role was consolidated into PM, reflecting the team that has actually been delivering the platform.

---

## 3. Cloud & Infrastructure

| Item | FY 2026 cost | Notes |
|---|---|---|
| Replit deployment (production: API + SPA) | $24,000 | Always-on deployment with autoscaling. |
| PostgreSQL (managed, production + staging) | $18,000 | Includes daily snapshots and PITR. |
| Replit checkpoints / dev environments | $9,000 | Workspace-level cost for the team. |
| Object storage (documents, uploads, exports) | $9,000 | `documents` table content storage. |
| Observability (logs / metrics / errors) | $12,000 | See §4 — error tracking is split out. |
| **Subtotal** | **$72,000** | |

Cloud cost scales with active users; the budget assumes the current ~150 internal users (consultants + PMs + finance + RM + admin + portal users) with ~20 % growth headroom.

---

## 4. Third-Party Services

| Item | FY 2026 cost | Notes |
|---|---|---|
| Email transactional (notification emails) | $6,000 | Volume capped by notification preferences. |
| Error tracking + APM | $14,000 | Backend + frontend. |
| Analytics (product usage) | $9,000 | Page-level only, no user-PII. |
| Status page (internal) | $3,000 | |
| Security tooling (SAST + dependency scanning + secret scanning) | $12,000 | Wired into CI per doc 05. |
| Backups (additional off-Replit copy) | $4,000 | Quarterly off-site copy held by KSAP IT. |
| **Subtotal** | **$48,000** | |

---

## 5. Tooling

| Item | FY 2026 cost | Notes |
|---|---|---|
| IDE / developer-tool licences | $14,000 | Whole team. |
| Design tooling (component design, prototypes) | $6,000 | UX seat + prototyping. |
| Project tracking + roadmap | $9,000 | Whole team. |
| Documentation hosting (this docs/ folder + private wiki) | $4,000 | |
| Linters / formatters / CI add-ons | $3,000 | |
| **Subtotal** | **$36,000** | |

---

## 6. Security & Compliance

| Item | FY 2026 cost | Notes |
|---|---|---|
| External penetration test (annual) | $25,000 | One full pass + remediation re-test. |
| Dependency-vulnerability monitoring | $6,000 | Dovetails with the security tooling above. |
| Internal compliance review (annual) | $8,000 | Internal audit team time, recovered. |
| Privacy / DPA legal counsel | $6,000 | For client-portal accounts. |
| **Subtotal** | **$45,000** | |

---

## 7. Contingency

A flat **15 %** is held against the total of all categories above ($1,341,000), rounded to **$210,000**. The contingency is the **PM's reserve** and is drawn against approved variances — it is not pre-allocated to any line.

Triggers for drawing on the contingency:

- Unplanned schema migration that requires DB upsizing.
- Externally driven change (e.g. updated tax-code requirements affecting `tax_codes` and invoicing).
- Replacement hiring outside the allocations in §2.
- Unbudgeted vendor cost (new error-tracking tier, new compliance tool).

---

## 8. Variance Tracking

The Finance Lead reports actual-vs-budget monthly to the Executive Sponsor as part of the standard KSAP finance pack. The triggers for an off-cycle review are:

| Event | Action |
|---|---|
| Monthly burn ≥ **+10 %** above plan in any single category | Notify Sponsor; assess cause; agree mitigation. |
| Quarterly burn ≥ **+10 %** above total plan | Re-baseline; doc 16 Charter version bump. |
| New hire that pushes the People line above the §2 envelope | Sponsor approval required *before* offer extended. |
| Cumulative drawdown of contingency ≥ **50 %** by Q3 | Risk Register entry; mitigation plan to Sponsor. |

---

## 9. Funding Source

The platform is funded from KSAP Technology's **internal-systems IT budget**, allocated annually in the FY plan. There is no external investment, no customer revenue, and no inter-company recharge for FY 2026.

---

## 10. Out-of-Scope Costs

The following are intentionally **not** in this budget:

- Marketing, sales, GTM (the platform is not commercially sold).
- Customer-success / support headcount (internal users escalate via internal IT).
- Office / facilities (covered by the parent KSAP cost centre).
- Data-warehouse / BI infrastructure (current Reports run off OLTP).
- Native mobile app development (out of charter).
- SOC 2 audit (not pursued for an internal platform; reviewed at every charter version).

---

## 11. Revision Log

| Date | Version | Changed By | What Changed |
|---|---|---|---|
| 2026-04-24 | 1.0 | Finance Lead + Sponsor | First approved budget. Reflects actual team composition delivering the platform; descoped the standalone DevOps and BA roles vs the original 2026 plan. |
