# Risk Register

| | |
|---|---|
| **Product** | [PRODUCT NAME] |
| **Owner** | [PM NAME] |
| **Reviewed** | [YYYY-MM-DD] |
| **Version** | v0.1 — Draft |
| **Status** | Living document |

> A living register of risks that could affect the success of [PRODUCT NAME]. Reviewed at the cadence defined in §5; escalated per the rules in §5 and `docs/operations/13_team_structure_and_raci.md`.

---

## 1. Risk Rating Matrix

Each risk is scored as **Likelihood × Impact**, on a 1–5 scale per axis, giving a composite score from **1** to **25**.

- **Likelihood:** 1 = Rare · 2 = Unlikely · 3 = Possible · 4 = Likely · 5 = Almost certain
- **Impact:** 1 = Negligible · 2 = Minor · 3 = Moderate · 4 = Major · 5 = Severe

|              | **Impact 1** | **Impact 2** | **Impact 3** | **Impact 4** | **Impact 5** |
|---|---|---|---|---|---|
| **Likelihood 5** | 5 (L)  | 10 (M) | 15 (H) | 20 (H) | 25 (H) |
| **Likelihood 4** | 4 (L)  | 8 (M)  | 12 (M) | 16 (H) | 20 (H) |
| **Likelihood 3** | 3 (L)  | 6 (M)  | 9 (M)  | 12 (M) | 15 (H) |
| **Likelihood 2** | 2 (L)  | 4 (L)  | 6 (M)  | 8 (M)  | 10 (M) |
| **Likelihood 1** | 1 (L)  | 2 (L)  | 3 (L)  | 4 (L)  | 5 (L)  |

**Severity bands** (no colour available in plain Markdown — use these labels):

- **Low (L)** — score **1–5**: monitor; no immediate action required.
- **Medium (M)** — score **6–12**: active mitigation required; reviewed at every register cadence.
- **High (H)** — score **13–25**: escalated to leadership; weekly review until score drops below 13.

---

## 2. Active Risk Register

| Risk ID | Category | Description | Likelihood | Impact | Score | Status | Owner | Mitigation Strategy | Contingency Plan | Review Date |
|---|---|---|---|---|---|---|---|---|---|---|
| **R-T-01** | Technical | Architecture cannot scale to projected load (≥ [5,000] concurrent users at GA). | 3 | 5 | **15 (H)** | Open | Tech Lead | Quarterly load tests against GA targets; document scale-out path; track P95 latency in CI. | Auto-scale group + emergency capacity reservation; enable read-replica fan-out; rate-limit non-critical traffic. | [DATE] |
| **R-T-02** | Technical | Critical third-party API ([PAYMENTS PROVIDER] / [EMAIL PROVIDER] / [SSO PROVIDER]) outage or breaking change. | 3 | 4 | **12 (M)** | Open | Tech Lead | Vendor SLA review; webhook idempotency + retries; abstraction layer for swap-out; pin SDK versions. | Failover to secondary provider behind feature flag; queue and replay impacted traffic. | [DATE] |
| **R-T-03** | Technical | Security breach — credential leak, injection, or token theft. | 2 | 5 | **10 (M)** | Open | Security Lead | SAST/DAST in CI; dependency scanning; quarterly penetration test; secrets in [SECRET MANAGER]. | Incident-response runbook (`docs/technical/05_security_and_compliance.md`); rotate credentials; customer notice within regulatory window. | [DATE] |
| **R-T-04** | Technical | Data migration during a major schema change causes data loss or extended downtime. | 2 | 5 | **10 (M)** | Open | Tech Lead | Additive-only migrations; pre-prod dry-run; backups verified; staged rollout with feature flags. | Roll back to prior schema; restore from PITR backup; dedicated war-room. | [DATE] |
| **R-T-05** | Technical | Performance degradation under realistic load (P95 latency exceeds budget). | 4 | 3 | **12 (M)** | Open | Tech Lead | Performance budgets in CI; APM dashboards + alerts; load tests in Sprint 6 of every phase. | Hot-path caching; query optimisation; scale the bottleneck tier; defer non-critical features. | [DATE] |
| **R-B-01** | Business | A direct competitor launches a similar product or undercuts pricing during our launch window. | 4 | 4 | **16 (H)** | Open | PM + Marketing Lead | Quarterly competitive intel refresh; differentiated positioning on TTV + governance; reference customers ready. | Adjust messaging within [2 weeks]; introduce promotional pricing or annual incentives; accelerate top differentiating roadmap items. | [DATE] |
| **R-B-02** | Business | Project budget overrun beyond approved envelope. | 3 | 4 | **12 (M)** | Open | PM + [Finance] | Monthly burn vs. plan review; vendor cost controls; right-size cloud usage; staged hiring. | Re-baseline scope; defer non-P0 work; pause discretionary spend; request additional budget with justification. | [DATE] |
| **R-B-03** | Business | Market demand at GA is materially lower than forecast (waitlist conversion ≪ target). | 3 | 5 | **15 (H)** | Open | PM + Marketing Lead | Continuous discovery; design-partner program; pre-launch waitlist signal tracking; pricing tests. | Reposition to a sharper niche; reset GTM plan; extend runway via cost controls; pivot if signal persists across [2 quarters]. | [DATE] |
| **R-B-04** | Business | Key stakeholder change (executive sponsor exits or sponsor priorities shift). | 2 | 4 | **8 (M)** | Open | PM | Bi-weekly stakeholder updates; document strategic intent and decisions; broaden internal sponsorship. | Re-secure sponsorship at next leadership review; adjust scope to align with new priorities. | [DATE] |
| **R-P-01** | People | Key engineer (Tech Lead or sole expert in a critical area) leaves the team. | 2 | 5 | **10 (M)** | Open | Engineering Manager | Cross-training and pairing; documented runbooks; second engineer shadowing critical systems; competitive comp + retention plan. | Backfill via internal mobility or contractor; reprioritise to absorb capacity loss; postpone affected milestones by one sprint. | [DATE] |
| **R-P-02** | People | Team burnout from sustained crunch around launch. | 4 | 3 | **12 (M)** | Engineering Manager + Scrum Master | Sustainable pace policy; sprint capacity ≤ steady-state velocity; monthly health survey; mandatory time-off after launch. | Reduce next-sprint commitment; bring in temporary capacity; cancel non-essential meetings. | [DATE] |
| **R-P-03** | People | Skill gap in a required area (e.g. infra security, mobile, ML) blocks roadmap items. | 3 | 3 | **9 (M)** | Engineering Manager | Skill-matrix audit per quarter; targeted training budget; hiring plan aligned with roadmap; vetted contractors on standby. | Engage specialist contractor; partner with a vetted vendor; descope or defer the affected initiative. | [DATE] |
| **R-Pr-01** | Product | Scope creep — late additions inflate Phase 1 beyond capacity. | 4 | 4 | **16 (H)** | PM | Locked Phase 1 scope; new requests routed through change-control; visible roadmap and parking lot. | Defer to Phase 2; trade scope 1-for-1 within sprint capacity; surface trade-offs to sponsors. | [DATE] |
| **R-Pr-02** | Product | Requirements ambiguous — stories not refined enough to estimate or build. | 3 | 3 | **9 (M)** | PM | Definition-of-Ready; weekly refinement; UX prototypes for ambiguous flows; PM office hours. | Spike to clarify within the sprint; pull a refined story instead; extend sprint goal narrative if necessary. | [DATE] |
| **R-Pr-03** | Product | UX usability issues found late in testing force costly redesign. | 3 | 4 | **12 (M)** | UX Lead + PM | UX research brief executed pre-build (`docs/product/12_ux_research_brief.md`); prototype validation in Sprint 1–2. | Hotfix critical issues; phase non-critical UX changes into Sprint 5–6 polish; communicate trade-offs. | [DATE] |
| **R-Pr-04** | Product | MVP fails user validation — activation, conversion, or retention below threshold. | 3 | 5 | **15 (H)** | PM | Instrumented funnel from day one; weekly cohort review; design-partner program; opinionated onboarding. | Launch a focused activation sprint; re-segment ICP; revisit pricing/packaging; pivot core flow if signal persists. | [DATE] |
| **R-O-01** | Operations | Production infrastructure downtime exceeds the **99.9%** SLA. | 3 | 4 | **12 (M)** | DevOps | Multi-AZ deployment; alerting; on-call rotation; quarterly DR drill; documented runbooks. | Failover to standby; communicate via status page; post-incident review within [5 business days]. | [DATE] |
| **R-O-02** | Operations | CI/CD pipeline failure blocks deploys for an extended window. | 3 | 3 | **9 (M)** | DevOps | Pipeline observability + alerts; minimal viable deploy path documented; backup runner capacity. | Manual emergency deploy via documented break-glass procedure; rebuild pipeline in a parallel environment. | [DATE] |
| **R-L-01** | Legal / Compliance | GDPR / privacy violation (e.g. data export, retention, or sub-processor breach). | 2 | 5 | **10 (M)** | Security Lead + Legal | DPA in place; data-mapping maintained; sub-processor list public; deletion + export tooling; quarterly privacy review. | Legal counsel engaged; notify affected users within **72 hours**; remediate root cause; report to authority where required. | [DATE] |
| **R-L-02** | Legal / Compliance | IP dispute — claim against trademark, copyright, or patent involving [PRODUCT NAME]. | 1 | 4 | **4 (L)** | Legal | Trademark and domain searches before naming; OSS licence audit; contributor IP assignment; brand guidelines. | Engage IP counsel; rebrand affected element if required; license or design around the disputed claim. | [DATE] |

> **Each row's review date** is updated at every cadence (§5). When score crosses a band threshold, status is updated and the change is logged in the revision history.

---

## 3. Closed / Retired Risks

Risks that are no longer active, with the date and a one-line resolution. Move rows here from §2 instead of deleting.

| Risk ID | Description | Date Closed | Resolution |
|---|---|---|---|
| [R-X-XX] | [Short description of the closed risk.] | [YYYY-MM-DD] | [How it was resolved — e.g. mitigated to acceptable score, no longer applicable, fully implemented control.] |
| [R-X-XX] | [Short description of the closed risk.] | [YYYY-MM-DD] | [Resolution.] |
| [R-X-XX] | [Short description of the closed risk.] | [YYYY-MM-DD] | [Resolution.] |

---

## 4. Risk Monitoring Plan

### Cadence

- **Weekly:** PM + Tech Lead walk all **High (13–25)** risks; confirm owners and next checkpoint.
- **Bi-weekly:** Full register reviewed at the sprint review; new risks added, scores updated, mitigated risks moved to §3.
- **Monthly:** Risk summary reported to the executive sponsor as part of the stakeholder update.
- **Quarterly:** Full re-baseline of categories, scoring criteria, and contingency plans.
- **Ad-hoc:** Any P1 incident, material market event, or organisational change triggers an immediate register review within **[2 business days]**.

### Reviewers

| Cadence | Required attendees |
|---|---|
| Weekly review | PM, Tech Lead, Scrum Master |
| Bi-weekly review | PM, Tech Lead, UX Lead, QA Lead, DevOps, Security Lead |
| Monthly executive update | PM + Executive Sponsor |
| Quarterly re-baseline | PM, Tech Lead, Security Lead, Heads of Product / Engineering / GTM |

### Escalation triggers

A risk is **escalated to leadership within 1 business day** when **any** of the following becomes true:

- Composite score moves into the **High (13–25)** band.
- A risk previously rated **Medium** has its likelihood or impact increase by **≥ 1 step** between reviews.
- A linked **incident actually occurs** (the risk has materialised).
- The mitigation plan is blocked for **> 1 sprint** without an owner-led path forward.
- A new **regulatory or contractual obligation** introduces a risk not currently in the register.
- The same risk is **escalated by two or more team members** independently in the same week.

Escalation follows the path defined in `docs/operations/13_team_structure_and_raci.md` (§6) and the SLAs documented there.

---

## 5. Top 5 Priority Risks (Summary)

The five risks with the highest current composite score, sorted high → low. Refresh after every full register review.

### Card 1 — R-Pr-01: Scope creep in Phase 1

- **Score:** **16 (High)** — Likelihood 4 × Impact 4
- **Owner:** PM
- **Primary mitigation:** Phase 1 scope is locked; all new requests are routed through change-control with explicit trade-off against an existing P0 item; the parking lot is reviewed at every sprint review.

### Card 2 — R-B-01: Competitor launch or pricing undercut during our launch window

- **Score:** **16 (High)** — Likelihood 4 × Impact 4
- **Owner:** PM + Marketing Lead
- **Primary mitigation:** Quarterly competitive intel refresh and a positioning narrative anchored on **time-to-value** and **governance**; reference customers and case studies ready ahead of GA.

### Card 3 — R-T-01: Architecture scalability at GA load

- **Score:** **15 (High)** — Likelihood 3 × Impact 5
- **Owner:** Tech Lead
- **Primary mitigation:** Quarterly load tests against the GA target; documented scale-out path; performance budgets enforced in CI; APM dashboards and alerts in place before Public Beta.

### Card 4 — R-B-03: Demand at GA materially below forecast

- **Score:** **15 (High)** — Likelihood 3 × Impact 5
- **Owner:** PM + Marketing Lead
- **Primary mitigation:** Continuous discovery and pre-launch waitlist signal tracking; design-partner program proves the ICP; pricing tests pre-GA; contingency reposition plan ready if signal misses.

### Card 5 — R-Pr-04: MVP fails user validation

- **Score:** **15 (High)** — Likelihood 3 × Impact 5
- **Owner:** PM
- **Primary mitigation:** Funnel instrumented from Sprint 1; weekly cohort review of activation, trial-to-paid conversion, and retention; design-partner feedback loop drives an early activation sprint if metrics under-perform.

---

## 6. Revision Log

| Date | Version | Changed By | What Changed |
|---|---|---|---|
| [YYYY-MM-DD] | v0.1 | [PM NAME] | Initial register published. |
| [YYYY-MM-DD] | v0.2 | [PM NAME] | [Summary — e.g. R-X-XX moved to High; new R-X-XX added; R-X-XX retired.] |
| [YYYY-MM-DD] | v0.3 | [PM NAME] | [Summary of changes.] |
