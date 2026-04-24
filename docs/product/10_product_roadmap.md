# Product Roadmap

| | |
|---|---|
| **Product** | [PRODUCT NAME] |
| **Version** | 1.0 |
| **Last Updated** | [YYYY-MM-DD] |
| **Roadmap Horizon** | 12 months |
| **Owner** | [HEAD OF PRODUCT / NAME] |
| **Status** | Living document |

> This is a **living strategic document**. Items in **NOW** are committed; items in **NEXT** are planned but may shift; items in **LATER** are strategic bets and **subject to change**. Update at least quarterly.

---

## 1. Vision & Strategy

**Product vision (1 sentence):**
> *"To be the **[CATEGORY]** for **[TARGET USER]** so that **[CORE OUTCOME]** becomes the default, not the exception."*

### Strategic themes for the year

1. **Activation & Time-to-Value** — every new organization reaches first value within **10 minutes**, with no services-led implementation.
2. **Trust & Governance** — ship the security, compliance, and admin controls that unblock mid-market and enterprise procurement (SOC 2, SAML, audit).
3. **Workflow Depth** — extend `[RESOURCE_A]` and `[RESOURCE_B]` from "manageable" to "automatable", closing the gap with the incumbent.
4. **Ecosystem & Extensibility** — public API, webhooks, and a small but high-leverage integration set so that [PRODUCT NAME] becomes the system-of-record, not a silo.

---

## 2. Now / Next / Later Framework

### NOW — Current Quarter ([Q? YYYY])

| Initiative | Theme | Priority | Status | Team | Notes |
|---|---|---|---|---|---|
| Onboarding wizard v1 | Activation & TTV | P0 | In progress | Product + Growth | 3-step guided setup; instrumented funnel. |
| RBAC & audit log | Trust & Governance | P0 | In progress | Platform | Fixed roles + immutable log; admin UI. |
| Billing & subscriptions GA | Workflow Depth | P0 | In progress | Billing | Two paid tiers + free; self-serve upgrade. |
| Notifications v1 (in-app + email) | Workflow Depth | P1 | In progress | Product | Bell menu + daily digest. |
| Production observability | Trust & Governance | P0 | In progress | Platform | Logs, metrics, alerts; on-call rotation. |
| Public marketing site + waitlist | Activation & TTV | P1 | In progress | Marketing | Pricing page + demo + waitlist form. |

### NEXT — Next Quarter ([Q? YYYY])

| Initiative | Theme | Priority | Status | Team | Notes |
|---|---|---|---|---|---|
| SAML SSO | Trust & Governance | P0 | Planned | Platform | Unblocks enterprise deals. |
| SOC 2 Type I readiness | Trust & Governance | P0 | Planned | Security | Evidence collection in [COMPLIANCE TOOL]. |
| Workflow automations v1 | Workflow Depth | P1 | Planned | Product | Triggers + conditions + actions. |
| Public REST API (read) | Ecosystem | P1 | Planned | Platform | Read-only; rate-limited; documented. |
| Integration: [WORKSPACE PROVIDER] | Ecosystem | P1 | Planned | Integrations | Bi-directional sync with consent. |
| Integration: [COMMS PROVIDER] | Ecosystem | P1 | Planned | Integrations | Notifications and slash commands. |

### LATER — 6–12 Months ([Q? + Q? YYYY])

| Initiative | Theme | Priority | Status | Team | Notes |
|---|---|---|---|---|---|
| SOC 2 Type II audit window | Trust & Governance | P0 | Bet | Security | Begins after Type I close. |
| Mobile (iOS / Android native) | Activation & TTV | P1 | Bet | Mobile (TBD) | Subject to MVP retention signal. |
| AI-assisted [WORKFLOW] suggestions | Workflow Depth | P1 | Bet | Product + ML | Built on usage data; opt-in. |
| Public REST API (write) + webhooks v2 | Ecosystem | P1 | Bet | Platform | Granular scopes; signed delivery. |
| Integrations marketplace v1 | Ecosystem | P2 | Bet | Platform | Partner-built apps; revenue share. |
| Data residency (EU) | Trust & Governance | P1 | Bet | Platform | Region-isolated tenants. |

---

## 3. Quarterly Milestones

### Q1 [YYYY] — *Foundations & Private Beta*

- Close **Private Beta** with **[10–15]** design partners; collect win/loss signal and 3 case studies.
- Ship **RBAC**, **audit log**, and **billing GA** as the trust + monetisation foundation.
- Land **onboarding wizard v1**; first measurable activation funnel in production.
- Stand up **production observability** (logs, metrics, alerts) and on-call rotation.

### Q2 [YYYY] — *Public Beta & GA*

- Open **Public Beta** with waitlist; reach **[≥ 500]** signups and **[≥ 200]** activated organizations.
- Ship **GA launch** of [PRODUCT NAME]; activate paid plans and full marketing motion.
- Ship **SAML SSO** and complete **SOC 2 Type I** readiness assessment.
- Hit **[≥ 35%]** activation and **[≥ 99.5%]** uptime ahead of GA.

### Q3 [YYYY] — *Depth & Ecosystem*

- Ship **workflow automations v1** and the first wave of templates.
- Ship **public REST API (read)** and **[2]** flagship integrations ([WORKSPACE PROVIDER], [COMMS PROVIDER]).
- Reach **$[Y]** new MRR and **[X]** paying organizations by quarter end.
- Begin **SOC 2 Type II observation window**.

### Q4 [YYYY] — *Scale & Expansion*

- Ship **integrations marketplace v1** with **[5]** launch partner apps.
- Ship **public REST API (write)** + **webhooks v2** with signed delivery.
- Decide on **mobile native** investment based on retention and usage data.
- Hit **[≥ 110%]** NRR and **[≥ 95%]** logo retention at month 12.

---

## 4. Epic Summary

| Epic ID | Epic Name | Theme | Quarter | Status | Owner |
|---|---|---|---|---|---|
| EPIC-001 | Onboarding wizard & activation funnel | Activation & TTV | Q1 | In progress | [PM NAME] |
| EPIC-002 | RBAC & audit log | Trust & Governance | Q1 | In progress | [PM NAME] |
| EPIC-003 | Billing & subscriptions GA | Workflow Depth | Q1 | In progress | [PM NAME] |
| EPIC-004 | Notifications v1 (in-app + email) | Workflow Depth | Q1 | In progress | [PM NAME] |
| EPIC-005 | Production observability & on-call | Trust & Governance | Q1 | In progress | [TECH LEAD] |
| EPIC-006 | SAML SSO | Trust & Governance | Q2 | Planned | [PM NAME] |
| EPIC-007 | SOC 2 Type I readiness | Trust & Governance | Q2 | Planned | [SECURITY LEAD] |
| EPIC-008 | Workflow automations v1 | Workflow Depth | Q2 | Planned | [PM NAME] |
| EPIC-009 | Public REST API (read) | Ecosystem | Q2 | Planned | [TECH LEAD] |
| EPIC-010 | Integration: [WORKSPACE PROVIDER] | Ecosystem | Q2 | Planned | [PM NAME] |
| EPIC-011 | Integration: [COMMS PROVIDER] | Ecosystem | Q2 | Planned | [PM NAME] |
| EPIC-012 | Integrations marketplace v1 | Ecosystem | Q4 | Bet | [PM NAME] |

---

## 5. MVP Definition

### In MVP

- Email + password and **[GOOGLE / MICROSOFT]** SSO authentication.
- Multi-tenant **organization** workspace with fixed roles (`owner`, `admin`, `member`, `viewer`).
- `[RESOURCE_A]` management — create / view / edit / archive.
- `[RESOURCE_B]` management — create / assign / reorder / complete inside `[RESOURCE_A]`.
- In-app notifications and a daily email digest.
- Self-serve billing via **[PAYMENTS PROVIDER]** with at least two paid tiers + free.
- Audit log of state-changing actions, viewable by admins.
- Web-responsive UI on modern evergreen browsers.

### Explicitly deferred post-MVP

- Native mobile apps (iOS / Android).
- Custom roles and granular permission editor.
- Public REST/GraphQL API for third parties.
- Workflow automations and templates marketplace.
- Advanced reporting / BI dashboards / data warehouse exports.
- SAML SSO and regional data residency.
- White-label or custom-domain hosting for customer tenants.

### MVP success criteria

- **[≥ 200]** activated organizations during Public Beta.
- **[≥ 35%]** activation rate (signup → first key action within 7 days).
- **[≥ 15%]** trial → paid conversion in the first 90 days post-GA.
- **[≥ 99.5%]** production uptime during the beta window.
- **NPS ≥ [30]** at the close of Public Beta.

---

## 6. Dependencies & Blockers

| Item | Depends On | Team | Risk | ETA |
|---|---|---|---|---|
| SAML SSO (EPIC-006) | Identity provider integrations + IdP test tenants | Platform | Medium — interop complexity | [Q2 YYYY] |
| SOC 2 Type I (EPIC-007) | Policy pack, evidence collection in [COMPLIANCE TOOL], external auditor engagement | Security | Medium — auditor lead times | [Q2 YYYY] |
| Workflow automations v1 (EPIC-008) | Internal job runner + audit-log instrumentation | Platform + Product | Medium — first complex async surface | [Q3 YYYY] |
| Public REST API read (EPIC-009) | Stable internal API contracts + rate-limit middleware | Platform | Low | [Q3 YYYY] |
| Integration: [WORKSPACE PROVIDER] (EPIC-010) | Vendor partner approval + OAuth scopes review | Integrations | Medium — partner timeline | [Q3 YYYY] |
| Integration: [COMMS PROVIDER] (EPIC-011) | App marketplace listing approval | Integrations | Medium — partner review | [Q3 YYYY] |
| Mobile native (LATER) | Retention + usage signal from web; mobile hire | Mobile (TBD) | High — staffing not in place | [Q4 YYYY] |
| Data residency EU (LATER) | Region-isolated infra + DPA template updates | Platform + Legal | High — significant infra work | [Q4 YYYY] |

---

## 7. Metrics Per Phase

| Phase | Key Metric | Target | Measurement |
|---|---|---|---|
| Private Beta (Q1) | Design-partner retention & feedback close-rate | [≥ 80%] of design partners stay engaged through end of phase | Weekly partner calls + CRM. |
| Public Beta (Q2 pre-GA) | Activation rate | [≥ 35%] | Product analytics funnel ([TOOL]). |
| Public Beta (Q2 pre-GA) | P95 API latency | < 300 ms (read) / < 800 ms (write) | APM ([TOOL]). |
| GA Launch (Q2 post-GA → Q3) | New paying organizations | [X] in first 90 days | Billing system ([PAYMENTS PROVIDER]). |
| GA Launch (Q2 post-GA → Q3) | Trial → paid conversion | [≥ 15%] | Billing joined to signup cohort. |
| Scale (Q3) | Time-to-first-value (TTFV) | [≤ 10 min] median | Product analytics. |
| Scale (Q3 → Q4) | Net Revenue Retention (NRR) | [≥ 110%] | Billing + CRM cohort. |
| Scale (Q4) | Logo retention at month 12 | [≥ 95%] | Billing + CRM cohort. |
| Ongoing | Uptime SLA | [≥ 99.9%] | Status page + APM. |
| Ongoing | NPS | [≥ 40] | Quarterly in-app survey. |

---

## 8. Roadmap Assumptions

- The chosen ICP (mid-market [INDUSTRY], **[50–500]** employees) holds across the year and remains willing to adopt bottom-up.
- Pricing tiers (Free / Pro / Business / Enterprise) survive contact with the market with no more than one revision.
- SOC 2 + SSO + audit log unlock a measurable share of paused / blocked deals as soon as they ship.
- Self-serve PLG remains the primary motion through GA; sales-assist is layered on top, not replaced.
- Engineering capacity scales according to plan ([N] hires by Q2, [N] by Q4); roadmap shifts right by one quarter for every 25% capacity miss.
- Cloud and third-party costs scale roughly linearly with paid seats; gross margin remains **≥ [75%]**.
- Major competitors do not materially change pricing or shipping cadence (we re-plan if they do).
- The funding runway covers the full **[12-month]** horizon at the planned hiring pace.

---

## 9. Revision Log

| Date | Version | Changed By | What Changed |
|---|---|---|---|
| [YYYY-MM-DD] | 1.0 | [HEAD OF PRODUCT] | Initial roadmap published. |
| [YYYY-MM-DD] | 1.1 | [PM NAME] | [Summary of changes — e.g. moved EPIC-009 from Q3 to Q2; added EPIC-012.] |
| [YYYY-MM-DD] | 1.2 | [PM NAME] | [Summary of changes.] |
