# Risk Register — BusinessNow PSA

| | |
|---|---|
| **Product** | BusinessNow PSA |
| **Owner** | PM |
| **Version** | 1.0 — Living |
| **Date** | 2026-04-24 |
| **Status** | Living document — reviewed weekly (High) / bi-weekly (full) |

> Severity: **High** = imminent or material; **Medium** = real but bounded; **Low** = monitored. Probability and impact are 1 (low) → 5 (high). Score = P × I. The register is reviewed weekly for High items by PM + Tech Lead and bi-weekly in full at sprint review.

---

## 1. Open Risks

### Operational

| ID | Risk | Severity | P | I | Score | Mitigation | Owner |
|---|---|---|---|---|---|---|---|
| R-O-01 | Capacity-Planning queries slow at 52 weeks as data grows. | Medium | 3 | 4 | 12 | Endpoint already capped at 52 weeks; index review; monitor p95; trip-wire to data-warehouse offload (doc 10 §5). | Tech Lead |
| R-O-02 | OLTP outage during business hours (Replit-managed Postgres). | Medium | 2 | 5 | 10 | Daily snapshots + PITR; quarterly off-Replit copy held by KSAP IT (doc 17 §3). Status: tested 2026-04. | Tech Lead |
| R-O-03 | Audit log grows unbounded and slows the audit-log endpoint. | Low | 3 | 2 | 6 | Cursor pagination already in place; secondary index on `(entity_type, entity_id)`. Re-evaluate at 12 months of data. | Backend |

### Security

| ID | Risk | Severity | P | I | Score | Mitigation | Owner |
|---|---|---|---|---|---|---|---|
| R-S-01 | Header-based auth (`x-user-role`) — no SSO; depends on deployment front door + role switcher. | **High** (accepted) | 3 | 4 | 12 | Documented honestly in doc 05 §2; SSO on the LATER track (doc 10 §4.1). Mitigations: front door, role switcher, audit log. | Tech Lead (Security Lead) |
| R-S-02 | GET endpoints do not row-filter by role — Viewer / Consultant see all rows. | **High** (accepted) | 4 | 3 | 12 | Codebase-wide pattern; backlog item per the 2026-04-23 audit. Mitigation: deployment front door restricts who sees the app at all. | Tech Lead |
| R-S-03 | Privileged credentials leaked via dev tools on a privileged user's machine. | Low | 2 | 4 | 8 | Standard endpoint security on KSAP staff laptops; audit log exposes actor / role per write. | KSAP IT |
| R-S-04 | Supply-chain attack via npm dependency. | Medium | 2 | 5 | 10 | pnpm lockfile; dependency scanning in CI; security-scan playbook pre-release. | Tech Lead |
| R-S-05 | Replacement Requests not blocked server-side for auto-allocate projects. | Medium | 3 | 2 | 6 | UI hides the option today; server-side gate scoped for Sprint 14 / 15 (story C5). | Backend |
| R-S-06 | `resourceRequests.ts` write routes are currently (a) **un-gated** by RBAC middleware (no `requirePM` / `requireAdmin` wrapper; relies on the `blockPortalRoles` global only — any non-portal role can write) and (b) **un-audited** (no `logAudit()` calls on the write routes — `POST` / `PATCH` / status changes / comments do not produce `audit_log` rows). Combined: internal-role misuse is possible **and** untraceable. | **High** | 4 | 3 | 12 | Add `requirePM` to `POST/PATCH/DELETE/status/comments`; instrument the same routes with `logAudit()`. Sprint 14, alongside C5. | Backend |
| R-S-07 | Residual hardcoded `"x-user-role"` literals outside `auth-headers.ts`: `pages/project-detail.tsx` (6 sites of `"PM"`), `components/project-gantt.tsx` (6 sites of `"PM"`), `pages/admin.tsx` (1 site of `"PM"` at ~line 3410), `contexts/current-user.tsx` (bootstrap default `"Admin"` before `/api/me` resolves), and dynamic-but-non-helper construction in `components/tracked-time-tab.tsx` (3 sites built from the `viewerRole` prop). The portal pages' (`portal-dashboard.tsx`, `portal-project.tsx`) hardcoded `"Customer"` header is intentional and **out of scope** — the portal does not use the role switcher. | Medium | 4 | 2 | 8 | Story A1.1 in doc 11 (Epic A); closes when all the in-scope literals are migrated to `authHeaders()` and the bootstrap header in `current-user.tsx` is the only allowed exception. | Frontend |

### Product & Programme

| ID | Risk | Severity | P | I | Score | Mitigation | Owner |
|---|---|---|---|---|---|---|---|
| R-Pr-01 | Scope creep from PM/Finance feature requests outside the agreed module surface. | Medium | 4 | 3 | 12 | Office hours filter; backlog discipline; charter §4 explicit on out-of-scope. | PM |
| R-Pr-02 | Density / scale redesign regresses one page while improving another. | Medium | 3 | 3 | 9 | Side-by-side per page; UX research RQ2; rollback gate per page. | UX Designer |
| R-Pr-03 | UI/UX audit US-1 (project-detail TDZ) blocks PMs from a high-value page. | **High** | 4 | 4 | 16 | Sprint 14 top item (story C4 / L1); QA smoke-test extended; status: in flight. | Frontend |
| R-Pr-04 | Parallel spreadsheets persist post-Phase-3 because they're "easier". | Medium | 3 | 3 | 9 | Quarterly spreadsheet retirement audit by Delivery Lead; named owner per file. | Delivery Lead |
| R-Pr-05 | Dashboard v1 read incorrectly by leadership at-a-glance (danger band missed). | Medium | 3 | 3 | 9 | UX research RQ3 / H2; v2 may add motion or count badge. | UX + PM |
| R-Pr-06 | Capacity-Planning report not adopted by RM / leadership. | Medium | 2 | 4 | 8 | UX research RQ5 timing study; promote on Resources page (E4); office hours demo. | PM |

### Team

| ID | Risk | Severity | P | I | Score | Mitigation | Owner |
|---|---|---|---|---|---|---|---|
| R-T-01 | Single-developer concentration on backend route files. | Medium | 3 | 3 | 9 | Pair-review; OpenAPI contract enforcement; story rotation. | Tech Lead |
| R-T-02 | UX Designer at 50 % allocation is the bottleneck for density redesign + research round in same quarter. | Medium | 4 | 3 | 12 | Sprint 14 explicitly sequences density + research; PM backstops where research artefacts can be PM-owned. | Delivery Lead |
| R-T-03 | QA at 50 % insufficient for density-redesign regression sweep. | Medium | 3 | 3 | 9 | Engineers self-test per page; smoke-test scripts extended; QA prioritises dashboard + projects + resources. | Tech Lead |

### Finance

| ID | Risk | Severity | P | I | Score | Mitigation | Owner |
|---|---|---|---|---|---|---|---|
| R-F-01 | Cloud cost grows faster than headcount as documents storage expands. | Low | 3 | 2 | 6 | Quarterly review against doc 17 §3; storage-tier review when documents > 100 GB. | Finance Lead |
| R-F-02 | Contingency drawdown ≥ 50 % by Q3 (per doc 17 §8 trigger). | Low | 2 | 3 | 6 | Standing item at quarterly steering review; mitigation plan to Sponsor on trigger. | Finance Lead |

---

## 2. Closed / Resolved Risks (last 90 days)

| ID | Risk | Resolution | Resolved |
|---|---|---|---|
| R-Pr-00 | `Math.min(100, …)` clamp on `teamUtilization` was hiding over-utilisation in the dashboard. | Clamp removed; danger band reachable. | 2026-04 |
| R-O-00 | Capacity calculations included soft-deleted projects. | `/resources/capacity` filters `projects.deleted_at IS NULL`. | 2026-04-23 |
| R-Pr-09 | 22 hardcoded `x-user-role: Admin` headers across 6 page files; risk of role propagation drift. | `authHeaders()` helper introduced; the 22 admin headers replaced; 6 page files migrated. **Residual** (tracked as R-S-07): hardcoded `"x-user-role": "PM"` literals remain in `pages/project-detail.tsx` (6 sites; closes with US-1), `components/project-gantt.tsx` (6 sites), and one site in `pages/admin.tsx` (~line 3410); the bootstrap `Admin` default in `contexts/current-user.tsx`; and dynamic-but-non-helper header construction in `components/tracked-time-tab.tsx` (3 sites, variable-based). The portal pages (`portal-dashboard.tsx`, `portal-project.tsx`) use a hardcoded `"Customer"` header by design — the customer portal does not use the role switcher. See story A1.1 in doc 11. | 2026-04 (partial) |
| R-Pr-10 | Dashboard period selector accepted invalid combinations. | Locked to "This Month" pending v2; Last 30 / Quarter / Year disabled in the SPA. | 2026-04 |
| R-Pr-11 | Resources page tab reset on every navigation. | Active tab persisted to `localStorage["resources.activeTab"]`. | 2026-04-23 |
| R-Pr-12 | Capacity-Planning gap (Demand vs Supply unanswered in-product). | New `GET /api/reports/capacity-planning` endpoint + Reports tab + role-level surplus/deficit. | 2026-04-23 |

---

## 3. Risk Heatmap (current)

```
Impact ▲
   5 │     R-S-04                    R-O-02
   4 │     R-S-03                    R-S-01            R-Pr-03
   3 │     R-Pr-06                   R-S-02 R-Pr-01    R-T-02
   2 │     R-O-03 R-F-01 R-F-02      R-S-05 R-Pr-02 R-Pr-04 R-Pr-05 R-T-01 R-T-03
   1 │
     └──────────────────────────────────────────────────────────────►  Probability
        1            2            3            4            5
```

(Approximate placement — see numeric scores above for the truth.)

---

## 4. Trigger Events

The following events trigger an off-cycle full register review:

- A **High**-severity risk materialises (e.g. R-Pr-03 if not closed in Sprint 14).
- A new audit lands (functional or UI/UX) — register reviewed against the audit's gaps.
- A charter-version bump (doc 16 §11) — register reviewed against the new scope.
- A budget variance ≥ ±10 % (doc 17 §8) — financial risks reviewed.
- A security-scan finding rated High or Critical.

---

## 5. Cadence

- **Weekly** — PM + Tech Lead review High items only (15 minutes); update probabilities, scores, mitigations.
- **Bi-weekly** — Sprint review includes a full register sweep; status changes recorded here.
- **Quarterly** — Full re-baselining alongside the doc-index review cadence (doc index §3).

---

## 6. Revision Log

| Date | Version | Changed By | What Changed |
|---|---|---|---|
| 2026-04-24 | 1.0 | PM | Replaced template with the real BusinessNow PSA risk register. Captures the open risks against the post-MVP, in-production state and the resolved risks from the recent 2026-04 work (clamp removal, capacity-planning report, soft-delete fix, `authHeaders()` consolidation, period-selector lock, Resources tab persistence). |
