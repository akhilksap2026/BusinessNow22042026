# Team Structure & RACI — BusinessNow PSA

| | |
|---|---|
| **Product** | BusinessNow PSA |
| **Owner** | Delivery Lead |
| **Version** | 1.0 — Approved |
| **Date** | 2026-04-24 |
| **Status** | Approved |

> The team that actually delivers BusinessNow PSA is small. RACI is documented per **work area**, not per individual, so it survives reasonable team movement. Names are held in the GM's roster.

---

## 1. Team Composition (FY 2026)

| Role | Headcount | Allocation | Reports to |
|---|---|---|---|
| Tech Lead | 1 | 100 % | GM, KSAP Technology |
| Backend Engineer | 2 | 100 % | Tech Lead |
| Frontend Engineer | 2 | 100 % | Tech Lead |
| QA Engineer | 1 | 50 % | Tech Lead |
| UX Designer | 1 | 50 % | Delivery Lead |
| Product Manager | 1 | 50 % | Delivery Lead |
| Delivery Lead (PM of the platform team) | 1 | 100 % | GM, KSAP Technology |

The **Executive Sponsor** sits on the KSAP Technology leadership team and holds the budget and charter authority.

The team is intentionally **without a dedicated DevOps engineer or BA** — Replit covers the deployment surface, the Tech Lead owns DevOps responsibilities, and the PM covers BA scope. This is the team that actually delivers and operates the platform; doc 17 §2 reflects the same shape.

---

## 2. Org Diagram

```
                                Executive Sponsor (KSAP Technology)
                                          │
                                  GM, KSAP Technology
                                  /                \
                          Delivery Lead         Tech Lead
                            /     \              /    |    \
                          PM     UX           BE × 2  FE × 2  QA (½)
```

Day-to-day lines: PM ↔ UX ↔ Engineering work directly together at sprint cadence. The Delivery Lead covers cross-team coordination, sprint health, and stakeholder management.

---

## 3. RACI

**R**esponsible — does the work · **A**ccountable — single owner · **C**onsulted — input before · **I**nformed — told after.

### 3.1 Engineering work

| Activity | Tech Lead | Backend | Frontend | QA | UX | PM | Delivery Lead | Sponsor |
|---|---|---|---|---|---|---|---|---|
| Architecture decisions / ADR | A | C | C | I | I | I | I | I |
| New API route (incl. RBAC + audit) | C | **R** / A | C | C | I | I | I | — |
| OpenAPI spec edit + codegen | A | R | R | I | I | I | I | — |
| New SPA page or section | C | C | **R** / A | C | C | I | I | — |
| Drizzle schema change | A | R | I | I | I | I | I | I |
| Production deploy | A | C | C | C | I | I | I | I |
| Hotfix / S1 incident response | A | R | R | C | I | I | I | I |
| Dependency upgrades | A | R | R | I | I | I | I | — |

### 3.2 Product & design

| Activity | PM | UX | Delivery Lead | Tech Lead | Sponsor |
|---|---|---|---|---|---|
| PRD updates (doc 06) | A / R | C | C | C | I |
| Roadmap maintenance (doc 10) | A / R | C | C | C | I |
| Stories & acceptance criteria (doc 11) | A / R | C | C | C | — |
| UX research round (doc 12) | C | A / R | C | C | I |
| Mocks / canvas explorations | C | A / R | I | C | — |
| Design system / component spec | C | A / R | I | C | — |

### 3.3 Delivery & operations

| Activity | Delivery Lead | PM | Tech Lead | Sponsor |
|---|---|---|---|---|
| Sprint planning | A / R | C | C | I |
| Daily standup | A / R | C | C | — |
| Sprint review | A / R | C | C | I |
| Retro | A / R | C | C | — |
| Risk Register weekly review | A / R | C | C | I |
| Stakeholder updates (monthly newsletter) | A / R | C | I | I |
| Quarterly steering review | C | C | C | A / R |

### 3.4 Security & compliance

| Activity | Tech Lead (Security Lead) | Backend | PM | Delivery Lead | Sponsor |
|---|---|---|---|---|---|
| RBAC middleware coverage | A | R | I | I | I |
| `logAudit()` coverage on writes | A | R | I | I | I |
| Annual external pen-test | A / R | C | I | I | I |
| Security-scan playbook (pre-release) | A | R | I | I | I |
| Incident comms (S1/S2) | C | I | I | A / R | I |

### 3.5 Finance / charter

| Activity | Sponsor | Delivery Lead | Tech Lead | Finance Lead | PM |
|---|---|---|---|---|---|
| Charter approval / re-baseline (doc 16) | A / R | C | C | C | I |
| Budget approval / variance (doc 17) | A | C | C | R | I |
| Off-cycle scope change | A / R | C | C | I | C |

---

## 4. Communication Cadence

| Forum | Cadence | Attendees |
|---|---|---|
| Daily standup (15 min) | Daily | Engineering + PM + UX + Delivery Lead |
| Sprint planning (90 min) | Bi-weekly | Whole team |
| Sprint review (60 min) | Bi-weekly | Whole team + invited stakeholders |
| Retro (60 min) | Bi-weekly | Whole team |
| PSA office hours (30 min) | Weekly | Delivery PMs (KSAP delivery) + PM/Delivery Lead |
| Finance huddle (15 min) | Bi-weekly | Finance team + PM |
| Capacity review (30 min) | Monthly | RM + Delivery Lead + leadership |
| Internal newsletter | Monthly | All KSAP staff |
| Quarterly steering review (60 min) | Quarterly | Sponsor + GM + Delivery Lead + Tech Lead + PM |

---

## 5. Escalation Path

| Severity | First contact | Escalates to |
|---|---|---|
| Day-to-day question | Delivery Lead / PM | — |
| Backlog / scope change | PM | Delivery Lead → Sponsor (if charter-impacting) |
| S3 defect | QA / engineer | Tech Lead |
| S2 incident | Tech Lead | Delivery Lead → Sponsor (if customer-impacting) |
| S1 incident (data loss / outage / data exposure) | On-call engineer | Tech Lead → Delivery Lead → Sponsor → Legal (if PII) |
| Cross-team conflict / resource shortfall | Delivery Lead | GM / Sponsor |

S1 incidents follow the timing in doc 05 §10.

---

## 6. On-Call

The platform is **internally used during business hours**; out-of-hours support is best-effort. The Tech Lead and one Backend Engineer share an informal on-call rota for S1 incidents during business hours; out-of-hours pages go to the Tech Lead with the Delivery Lead as backup.

There is **no 24/7** on-call rota committed in FY 2026.

---

## 7. Decision Rights

| Decision | Owner |
|---|---|
| Sprint scope | PM (with engineering input) |
| Release go / no-go | Tech Lead |
| Architecture / ADR | Tech Lead |
| Schema migration window | Tech Lead + Delivery Lead |
| Charter / scope change | Sponsor |
| Budget reallocation within categories | Delivery Lead |
| Budget reallocation across categories | Finance Lead + Sponsor |
| Hire / replace headcount | Sponsor (with GM input) |
| Vendor / tooling spend | Delivery Lead up to **$2K/month**; above that → Finance Lead |

---

## 8. Definition of Roles (concise)

| Role | One-line definition |
|---|---|
| **Sponsor** | Authorises charter; owns budget; final escalation. |
| **GM, KSAP Technology** | Business owner of the platform's outcomes; chairs steering review. |
| **Delivery Lead** | Day-to-day program owner; sprint health; stakeholder comms; escalation hub. |
| **Tech Lead** | Architecture & code-quality owner; release authority; security lead; on-call lead. |
| **PM** | PRD / roadmap / stories owner; office hours; analytics; documentation cadence. |
| **UX Designer** | Design system; mocks; research rounds; UI/UX audit follow-ups. |
| **Backend Engineer** | API routes; Drizzle schema; codegen; auto-triggers; audit. |
| **Frontend Engineer** | SPA pages; React Query hooks usage; `authHeaders()` discipline; Recharts. |
| **QA Engineer** | Acceptance testing; regression sweep on density redesign; smoke tests post-deploy. |

---

## 9. Revision Log

| Date | Version | Changed By | What Changed |
|---|---|---|---|
| 2026-04-24 | 1.0 | Delivery Lead | Replaced template with the real BusinessNow PSA team & RACI: 8.5 FTE shape, no dedicated DevOps/BA, escalation path, decision rights. |
