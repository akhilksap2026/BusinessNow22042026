# Competitive Analysis — Build vs Buy for KSAP's PSA Needs

| | |
|---|---|
| **Product** | BusinessNow PSA |
| **Owner** | PM |
| **Version** | 1.0 — Approved |
| **Date** | 2026-04-24 |
| **Status** | Approved |

> BusinessNow PSA is **internal**, so this is not a market-competitive analysis for a product KSAP sells. It is the **build-vs-buy** rationale: why we built BusinessNow PSA in-house instead of adopting a commercial PSA, and how the build holds up against the alternatives we evaluated.

---

## 1. Why This Document Exists

In Q4 2025, KSAP leadership asked the question: *"Why are we building this rather than buying one of the commercial PSAs?"* This document captures the analysis that grounded the build decision and re-states it against the platform we now have in production.

The decision is **revisited annually** (per the doc index §3 cadence). Material change in any of the alternatives (e.g. a commercial PSA shipping a feature that closes a key gap) is a trigger for re-evaluation.

---

## 2. The Alternative Set Evaluated

| Category | Examples (representative; not endorsed) | Notes |
|---|---|---|
| Established PSA SaaS (full-stack: CRM + projects + time + finance) | Multiple mature commercial PSAs in the mid-market and enterprise tiers. | Strong out-of-the-box surface; weak fit for KSAP's specific delivery model and rate-card structure. |
| CRM + add-ons | Salesforce / HubSpot + a PSA plugin (PSA Cloud, Certinia, etc.). | Powerful CRM; PSA tier sits on top and inherits the licence overhead. |
| Best-of-breed mix | Jira + Harvest + QuickBooks + Spreadsheet. | The status quo we were trying to leave. |
| Build in-house | BusinessNow PSA. | The chosen path. |

We deliberately do **not** name vendors here — the analysis is about the **categories** and how they fit KSAP, not about endorsing or impugning specific products. The full vendor-by-vendor comparison is held by the GM and reviewed annually.

---

## 3. Evaluation Criteria & Weights

| Criterion | Weight | Why it mattered to KSAP |
|---|---|---|
| Fit to KSAP's services workflow | 25 % | KSAP has a specific way it runs engagements (templates with phases / tasks / allocations; auto-allocate flag; six resource-request types). Out-of-the-box PSAs assumed a different shape. |
| Total cost of ownership over 3 years | 20 % | At KSAP's headcount, mid-market PSA seat licences add up; build cost amortises. |
| Time to value | 15 % | We needed something usable inside one quarter. |
| Customisability without consultants | 15 % | KSAP's process changes too often to rely on vendor-side customisation cycles. |
| Audit / RBAC posture | 10 % | Internal compliance reviews wanted a write-by-write audit log. |
| Data ownership / portability | 10 % | KSAP wanted full DB access (we run reports off OLTP today). |
| Real-time client portal | 5 % | Eliminates a recurring complaint. |

---

## 4. Scoring Summary (qualitative)

| Criterion | Established PSA SaaS | CRM + PSA add-on | Best-of-breed mix | **Build (BusinessNow PSA)** |
|---|---|---|---|---|
| Fit to KSAP's workflow | ★★★ | ★★★ | ★★ | **★★★★★** |
| 3-year TCO | ★★★ | ★★ | ★★★ | **★★★★** |
| Time to value | ★★★★★ | ★★★★ | ★★ | ★★★ |
| Customisability without consultants | ★★ | ★★ | ★★★ | **★★★★★** |
| Audit / RBAC posture | ★★★★ | ★★★★ | ★★ | **★★★★★** |
| Data ownership / portability | ★★★ | ★★★ | ★★★ | **★★★★★** |
| Real-time client portal | ★★★★ | ★★★ | ★ | **★★★★★** |
| **Verdict** | Solid generalist | Best CRM but heavy stack | Status quo, retired | **Best fit for KSAP's specific shape** |

The build path lost on **time-to-value** (any commercial SaaS would have been in production faster). It won on every other axis that mattered to KSAP, and the time-to-value gap closed once Phase 1 shipped.

---

## 5. Where the Build Decisively Wins

- **Workflow fit.** The auto-triggers (probability ≥ 70 → soft alloc; milestone task done → draft invoice; timesheet approve/reject → notification) and the six resource-request types match exactly how KSAP runs engagements. Configuring an off-the-shelf PSA to do the same was estimated at ~6 months of vendor consulting.
- **Audit & RBAC.** `logAudit()` is invoked from write paths; `audit_log` is append-only and queryable by `account_admin`. Server-side RBAC via `requireAdmin` / `requirePM` / `requireFinance` / `requireCostRateAccess` / `blockPortalRoles` against a canonical 4-role model (`account_admin` / `super_user` / `collaborator` / `customer`) with legacy 11-role string compatibility on the `x-user-role` header. Internal compliance reviews can sample any write back to its actor and role. (One known gap is `resourceRequests.ts` — see ops doc 15, R-S-06.)
- **Capacity-Planning fit.** Our `GET /api/reports/capacity-planning` endpoint returns per-week buckets with `availableFTE`, `assignedDemandFTE`, `unassignedDemandFTE`, and per-role `byRole[]`. Out-of-the-box PSAs typically reported one or the other, not both, and rarely surfaced **role-level surplus/deficit**.
- **Data ownership.** Our Reports tab queries OLTP directly — no per-feature data-export limits, no per-row API quotas.
- **Real-time client portal.** `/portal/*` reads the same DB as internal users; no nightly export pipeline.

## 6. Where the Build Loses (and how we mitigate)

| Loss | Mitigation |
|---|---|
| **No mature mobile app.** | Web-responsive only; phone is not a primary surface. Roadmap LATER. |
| **No SSO / OIDC today.** | Header-based auth + Replit deployment front door + role switcher + audit log. SSO on the LATER track. |
| **No native data warehouse.** | Reports run off OLTP; capped at 52 weeks in Capacity Planning. Trip-wire for change. |
| **Engineering capacity is finite.** | Sprint cadence; backlog discipline; explicit out-of-scope list (doc 06 §7). |
| **Time-to-value lag.** | Resolved post-Phase-1; non-issue today. |

---

## 7. Triggers for Re-evaluation

We commit to re-running this analysis when **any** of the following happens:

- A commercial PSA closes the workflow-fit gap (specifically: configurable auto-triggers and configurable resource-request types).
- KSAP's headcount or engagement count grows past **3×** today's level (operationally cheaper to buy at very large scale).
- A material compliance regime requires SOC 2 / ISO 27001 / similar (cheaper to buy a certified product than to certify ours).
- The platform's run-cost (per doc 17) materially exceeds the seat-cost of a comparable SaaS.

---

## 8. Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2025-Q4 | Build BusinessNow PSA in-house. | Workflow fit, audit posture, data ownership, customisability. |
| 2026-Q2 | Re-confirmed build at first annual review. | No commercial PSA closed the workflow-fit / capacity-planning gap; build is in production. |
| 2027-Q2 | Next scheduled re-evaluation. | Annual cadence per doc index §3. |

---

## 9. Revision Log

| Date | Version | Changed By | What Changed |
|---|---|---|---|
| 2026-04-24 | 1.0 | PM | Replaced template with the real build-vs-buy analysis grounding BusinessNow PSA's existence. |
