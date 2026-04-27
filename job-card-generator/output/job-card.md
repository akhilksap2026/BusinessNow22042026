---
title: "Phoenix — Enterprise CRM Modernisation Programme"
documentId: "MAG-JC-2026-0047"
version: "v3.1"
status: "APPROVED"
classification: "CONFIDENTIAL"
client: "TechNova Corporation"
firm: "Meridian Advisory Group"
generated: "27 April 2026"
---

# Phoenix — Enterprise CRM Modernisation Programme

> **Job Card Document** · Meridian Advisory Group  
> MAG-JC-2026-0047 · v3.1 · **APPROVED** · **CONFIDENTIAL**  
> Client: TechNova Corporation · Generated: 27 April 2026

---

## Table of Contents

- 01. Document Control & Version History
- 02. Executive Summary
- 03. Job Overview
- 04. Scope
- 05. Stakeholder Matrix
- 06. RACI Matrix
- 07. Workflow & Process Flow
- 08. Screenshots & Artefacts
- 09. Standard Operating Procedures (SOP)
- 10. Inputs
- 11. Outputs & Deliverables
- 12. Tools & Technology
- 13. Responsibilities
- 14. Timeline & Milestones
- 15. Risk Register
- 16. Issue Log
- 17. Quality Checklist
- 18. Testing Summary
- 19. Acceptance Criteria
- 20. Communication Plan
- 21. Handover Notes
- 22. Approval Sign-off
- A.  Glossary
- B.  References

---

## 01. Document Control & Version History

| Field | Value |
| ----- | ----- |
| **Document Owner** | Nathaniel Ashford |
| **Approver** | Dr. Priya Ramasamy |
| **Classification** | CONFIDENTIAL |
| **Last Updated** | 22 April 2026 |
| **Next Review** | 01 July 2026 |

### Version History

| Version | Date             | Author            | Changes                                                                            |
| ------- | ---------------- | ----------------- | ---------------------------------------------------------------------------------- |
| v1.0    | 15 January 2026  | Nathaniel Ashford | Initial draft — Initiation phase                                                   |
| v2.0    | 28 February 2026 | Saoirse Gallagher | Design phase complete; scope, RACI, and SDD references added                       |
| v3.0    | 31 March 2026    | Nathaniel Ashford | Sprint 1–3 complete; risk register updated; issues I-001, I-003 resolved           |
| v3.1    | 22 April 2026    | Linh Tran         | Sprint 4 in-progress; Issue I-002 raised; defect summary updated; QC items updated |


---

## 02. Executive Summary

> **Programme Status: 🟢 GREEN — On Track**

TechNova Corporation is executing a USD 4.8M, 9-month programme to replace its legacy Siebel CRM with Salesforce Sales Cloud, Service Cloud, and a bespoke Analytics Hub, decommissioning 14 satellite systems and consolidating 3.2M customer records.

| Metric | Value |
| ------ | ----- |
| Total Budget | $4,800,000 |
| Consumed | $2,116,000 (44.1%) |
| Remaining | $2,684,000 |

### Strategic Alignment

- FY26 Digital Transformation Strategy — Pillar 2: Customer 360
- Board mandate to reduce operational cost by 18% over 3 years
- Regulatory compliance — CCPA, GDPR data residency requirements
- Net Promoter Score (NPS) improvement target from 42 to 68 by Q4 FY27

### Key Risks

- ⚠️ Data quality issues in legacy Siebel — 340K orphaned records identified
- ⚠️ Third-party middleware vendor (IntelliConnect) resource constraint in Sprint 5

### Recommendation

> Proceed to Sprint 5 (Integration & Data Migration). Initiate Parallel Run protocol by 2026-07-01. Board sign-off on Acceptance Criteria v2.3 required by 2026-05-15.


---

## 03. Job Overview

| Field | Value | Field | Value |
| ----- | ----- | ----- | ----- |
| Project Name | Phoenix — Enterprise CRM Modernisation Programme | Project Code | PHX-2026 |
| Client | TechNova Corporation | Engagement Ref | MAG-ENG-2026-0047 |
| Type | Digital Transformation | Methodology | Hybrid Agile-Waterfall |
| Start Date | 06 January 2026 | End Date | 30 September 2026 |
| Billing Type | Time & Materials (T&M) with Fixed-Fee Milestones | Currency | USD |
| Programme Manager | Nathaniel Ashford | Delivery Lead | Saoirse Gallagher |
| Solution Architect | Yusuf Okonkwo | QA Lead | Linh Tran |
| Sponsor | Dr. Priya Ramasamy (TechNova VP Operations) | Phase | Execution — Sprint 4 of 6 |


---

## 04. Scope

### In-Scope

- Migration of 3.2M customer records from Siebel CRM 8.1 to Salesforce Sales Cloud
- Salesforce Service Cloud implementation — Case Management, Knowledge Base, Live Chat
- Custom Analytics Hub (React + Power BI Embedded) replacing 4 legacy BI tools
- API gateway layer (MuleSoft Anypoint) integrating 6 downstream systems
- Single Sign-On (SSO) via Azure AD B2C for 1,200 internal users and 480 partners
- Data Quality Remediation — deduplication and enrichment of customer master data
- User training for 1,200 internal users across 8 business units
- Hypercare support — 90-day post-go-live monitoring and L1/L2 ticket handling
- Decommission of 14 legacy satellite CRM systems
- UAT coordination with 3 external partner organisations

### Out-of-Scope

- 🚫 ERP integration (SAP S/4HANA) — covered under separate programme PHX-ERP-2026
- 🚫 Legacy billing system replacement — deferred to FY27 roadmap
- 🚫 Mobile application development — separate workstream governed by IT PMO
- 🚫 Third-party vendor contract renegotiation
- 🚫 Hardware procurement or data centre reconfiguration

### Assumptions

- Client IT team will provide dedicated DBA resource (2 FTE) for data migration windows
- Salesforce licences (1,200 Sales Cloud, 800 Service Cloud) procured by 2026-03-01
- Azure AD B2C tenant provisioned and configured by client IT by 2026-04-15
- All source system API documentation current and accessible by 2026-02-01
- Business SMEs available minimum 40% of sprint capacity for UAT and sign-off

### Constraints

- Go-live window restricted to 2026-09-27–2026-09-28 (regulatory freeze avoidance)
- MuleSoft environment must remain on-premises due to data sovereignty requirements
- No production environment access for consultants — all deployments via client DevOps
- SOX compliance — all financial data fields require dual approval workflow

### Exclusions

- Meridian Advisory Group will not provide permanent technical operations staff
- Consultant firm does not assume liability for pre-existing data quality defects


---

## 05. Stakeholder Matrix

| Name               | Title                     | Organisation            | Role                           | Influence | Interest | Engagement |
| ------------------ | ------------------------- | ----------------------- | ------------------------------ | --------- | -------- | ---------- |
| Dr. Priya Ramasamy | VP Operations             | TechNova Corporation    | Executive Sponsor              | High      | High     | Champion   |
| Brendan Mwangi     | Chief Information Officer | TechNova Corporation    | Technology Owner               | High      | Medium   | Supportive |
| Candice Ofoegbu    | Head of Sales Operations  | TechNova Corporation    | Business Process Owner         | High      | High     | Champion   |
| James Kowalski     | Group Compliance Officer  | TechNova Corporation    | Compliance Authority           | High      | Medium   | Neutral    |
| Nathaniel Ashford  | Senior Manager            | Meridian Advisory Group | Programme Manager (Consultant) | Medium    | High     | Lead       |
| IntelliConnect PM  | Project Manager           | IntelliConnect Ltd      | Third-Party Middleware Vendor  | Medium    | Low      | Monitor    |


---

## 06. RACI Matrix

**Legend:** R = Responsible · A = Accountable · C = Consulted · I = Informed

| Activity                             | Exec Sponsor | PMO | Dev Lead | Arch Lead | QA Lead | Change Mgr | Client IT | Compliance |
| ------------------------------------ | ------------ | --- | -------- | --------- | ------- | ---------- | --------- | ---------- |
| Programme Governance & Steering      | A            | R   | C        | C         | I       | I          | I         | I          |
| Sprint Planning & Backlog Refinement | I            | R   | C        | C         | I       | C          | I         | I          |
| Salesforce Configuration & Build     | I            | I   | R        | C         | C       | I          | C         | I          |
| MuleSoft API Development             | I            | I   | C        | R         | I       | I          | A         | I          |
| Data Migration Execution             | I            | A   | C        | C         | R       | I          | R         | I          |
| UAT Coordination & Sign-off          | A            | I   | I        | I         | I       | R          | I         | C          |
| Security & Compliance Review         | I            | I   | I        | C         | I       | I          | C         | R          |
| Go-Live Authorisation                | R            | C   | I        | I         | I       | C          | C         | C          |
| Hypercare Monitoring                 | I            | A   | R        | C         | I       | C          | R         | I          |
| Decommission of Legacy Systems       | A            | C   | I        | I         | C       | I          | R         | I          |


---

## 07. Workflow & Process Flow

_Note: See the HTML/PDF version for the full SVG process flow diagram._

```
INITIATION → DISCOVERY → DESIGN → BUILD (6 Sprints) → TEST → DEPLOY → HYPERCARE
                                      ↓
                              [Change Request?]
                            Yes ↓         ↓ No
                       [Change Board]  [Continue]
```

| Step | Phase      | Activity                                   | Owner                         | Duration | Gate                                              |
| ---- | ---------- | ------------------------------------------ | ----------------------------- | -------- | ------------------------------------------------- |
| 1    | Initiation | Engagement Kick-off                        | Programme Manager             | 1 week   | Steering Committee Approval                       |
| 2    | Discovery  | Current-State Assessment & Gap Analysis    | Solution Architect            | 3 weeks  | Business Sign-off on Gap Analysis                 |
| 3    | Design     | Solution Architecture & Design             | Solution Architect + Dev Lead | 4 weeks  | Architecture Review Board Approval                |
| 4    | Build      | Iterative Development (6 × 2-week Sprints) | Delivery Lead                 | 12 weeks | Sprint Review Acceptance per Iteration            |
| 5    | Test       | System Integration Testing & UAT           | QA Lead + Business SMEs       | 5 weeks  | UAT Sign-off with <5 Critical Defects Outstanding |
| 6    | Deploy     | Go-Live & Cutover                          | Programme Manager + Client IT | 3 days   | Exec Sponsor Go-Live Authorisation                |
| 7    | Hypercare  | Post-Go-Live Support (90 days)             | Delivery Lead + QA Lead       | 90 days  | Formal Acceptance Criteria Met — Client Sign-off  |


---

## 08. Screenshots & Artefacts

Screenshot files are located in the `screenshots/` directory.

- `screenshots/01-salesforce-accounts.png` — Salesforce Sales Cloud: Accounts View
- `screenshots/02-analytics-hub.png` — Analytics Hub: Executive KPI Dashboard
- `screenshots/03-mulesoft-console.png` — MuleSoft Anypoint: API Management Console
- `screenshots/04-jira-board.png` — JIRA Board: Sprint 4 Kanban
- `screenshots/05-service-cloud.png` — Salesforce Service Cloud: Case Management
- `screenshots/06-migration-dashboard.png` — Data Migration: Reconciliation Dashboard

_Screenshots captured automatically via wkhtmltoimage. Run `npm run screenshot` to regenerate._


---

## 09. Standard Operating Procedures

### SOP-001 — Weekly Sprint Ceremony Protocol

**Purpose:** Ensure consistent sprint cadence and stakeholder visibility

1. Monday 09:00: Sprint Planning — Dev Lead runs backlog refinement, selects committed stories
2. Daily 09:15: Stand-up — Each team member reports: Done / Doing / Blocked (15 min max)
3. Wednesday 14:00: Mid-sprint check — PM reviews burn-down, escalates blockers
4. Friday 15:00: Sprint Review — Demo to business stakeholders; collect acceptance
5. Friday 16:00: Retrospective — Team reviews process; action items logged in Confluence
6. PM updates RAID Log, Risk Register, and Status Report before Monday 08:00

### SOP-002 — Change Request Management

**Purpose:** Control scope changes through a governed approval process

1. Requester submits Change Request (CR) via Jira using CR template (min 72 hrs before sprint start)
2. PM assesses impact on scope, timeline, and budget within 48 hours
3. CR categorised: Minor (<1 day effort) — PM approval only; Major (>1 day) — Change Board required
4. Change Board meets bi-weekly; quorum: Exec Sponsor + CIO + PM
5. Approved CRs added to next sprint backlog; rejected CRs logged with rationale
6. PM updates Project Charter and SOW amendment if budget impact >$25,000

### SOP-003 — Defect Management & Escalation

**Purpose:** Ensure defects are triaged, tracked, and resolved within agreed SLAs

1. Tester logs defect in Jira with severity (P1/P2/P3/P4), description, steps to reproduce, and evidence
2. QA Lead triages within 4 hours; assigns to owner and sets target fix date
3. P1 (Critical): Fix within 24 hours; automatic escalation to PM and Exec Sponsor
4. P2 (Major): Fix within 3 business days; weekly review in Sprint standup
5. P3/P4: Scheduled into subsequent sprint; closure requires QA Lead re-test
6. Defect closure logged in Test Completion Report; pattern analysis done at Sprint Retro


---

## 10. Inputs

| ID     | Type     | Source              | Description                                      | Format               | Frequency                          | Volume                   |
| ------ | -------- | ------------------- | ------------------------------------------------ | -------------------- | ---------------------------------- | ------------------------ |
| IN-001 | System   | Siebel CRM 8.1      | Full customer master data export (CSV/XML)       | CSV + XML            | One-time migration                 | 3.2M records             |
| IN-002 | System   | SAP ERP (read-only) | Customer purchase history and contract data      | REST API             | Real-time sync post go-live        | 12M transactions         |
| IN-003 | Document | Legal / Compliance  | Data retention policies and consent flags        | Excel + PDF          | One-time input + quarterly updates | N/A                      |
| IN-004 | Human    | Business SMEs       | Process validation, UAT test execution, sign-off | Confluence, Jira     | Per sprint (2-week cycles)         | Approx. 40% SME capacity |
| IN-005 | System   | Azure AD B2C        | User identity and role provisioning for SSO      | SAML 2.0 / OAuth 2.0 | Real-time on login                 | 1,680 users              |


---

## 11. Outputs & Deliverables

| ID      | Type     | Destination            | Description                                          | Format             | SLA                                     |
| ------- | -------- | ---------------------- | ---------------------------------------------------- | ------------------ | --------------------------------------- |
| OUT-001 | System   | Salesforce Sales Cloud | Migrated and enriched customer master                | Salesforce Records | 99.5% record accuracy post-migration    |
| OUT-002 | Document | Client IT + PMO        | Weekly Status Report (RAG)                           | PDF + Confluence   | Every Friday by 17:00 EST               |
| OUT-003 | System   | Analytics Hub          | Real-time KPI dashboards via Power BI Embedded       | REST API JSON      | < 3 seconds dashboard load time         |
| OUT-004 | Document | Steering Committee     | Monthly Executive Summary (Steering Pack)            | PowerPoint + PDF   | 5 business days before Steering meeting |
| OUT-005 | Document | Compliance / Audit     | Data Migration Audit Trail and Reconciliation Report | PDF + Excel        | Within 10 business days post-migration  |


---

## 12. Tools & Technology Stack

| Category           | Tool                                   | Version                 | Purpose                                       | Licences                   | Owner       |
| ------------------ | -------------------------------------- | ----------------------- | --------------------------------------------- | -------------------------- | ----------- |
| CRM Platform       | Salesforce Sales Cloud + Service Cloud | Winter '26              | Core CRM replacement                          | 1,200 Sales + 800 Service  | TechNova IT |
| Integration        | MuleSoft Anypoint Platform             | 4.6.x                   | API gateway and middleware orchestration      | Platinum On-Premises       | TechNova IT |
| Project Management | Jira Software                          | 9.4 Cloud               | Sprint management, defect tracking            | Enterprise (unlimited)     | Meridian AG |
| Documentation      | Confluence                             | 7.19 Cloud              | Knowledge base, runbooks, SOP library         | Enterprise (unlimited)     | Meridian AG |
| Analytics          | Power BI Embedded (A4 SKU)             | 2026-03                 | Embedded analytics in custom React portal     | A4 Capacity (per-node)     | TechNova IT |
| DevOps             | GitHub + GitHub Actions                | Enterprise Cloud        | Source control, CI/CD pipelines               | Enterprise (300 seats)     | TechNova IT |
| Testing            | Jira Zephyr Scale                      | 9.x                     | Test case management, execution tracking      | Commercial (150 seats)     | Meridian AG |
| Identity           | Azure Active Directory B2C             | P2 tier                 | SSO and MFA for all users                     | P2 per-user (1,680)        | TechNova IT |
| Monitoring         | Datadog APM + Log Management           | Enterprise              | Post-go-live performance and error monitoring | Annual enterprise contract | TechNova IT |
| Collaboration      | Microsoft Teams + Miro                 | M365 E5 + Miro Business | Remote collaboration, workshop facilitation   | M365 E5 (bundled)          | Shared      |


---

## 13. Responsibilities

### Programme Manager (Meridian) — Nathaniel Ashford

- Overall programme delivery, governance, and stakeholder management
- Weekly status reporting and Steering Committee facilitation
- RAID Log ownership and risk escalation
- Budget tracking and forecasting (monthly ±5% variance reporting)
- Change Request assessment and Change Board coordination
- Final quality gate approval before each phase transition

### Solution Architect (Meridian) — Yusuf Okonkwo

- End-to-end technical design authority — Salesforce, MuleSoft, Analytics Hub
- Architecture Review Board preparation and presentation
- Vendor technical liaison (Salesforce AE, MuleSoft CSM, IntelliConnect PM)
- Data model governance and API contract management
- Security architecture and SOX compliance technical review

### Delivery Lead (Meridian) — Saoirse Gallagher

- Sprint planning, backlog management, and velocity tracking
- Day-to-day team coordination across 6 development squads
- Jira configuration, board health, and burn-down reporting
- Escalation point for development and integration blockers
- Hypercare lead during 90-day post-go-live period

### QA Lead (Meridian) — Linh Tran

- Test strategy, test plan, and test case design across all workstreams
- UAT coordination with business SMEs and partner organisations
- Defect triage, SLA management, and trend analysis
- Test completion report authorship and sign-off facilitation
- Regression suite maintenance and automation framework ownership

### Change Manager (Meridian) — Marcus Delacroix

- Organisational change management strategy and impact assessment
- Training needs analysis and delivery plan for 1,200 users
- Stakeholder engagement plan execution and sentiment tracking
- Communication plan management and content review
- Benefits realisation framework and post-go-live adoption monitoring


---

## 14. Timeline & Milestones

_See HTML/PDF version for the full Gantt chart SVG._

| Phase                             | Start             | End               | Milestone                | Status      |
| --------------------------------- | ----------------- | ----------------- | ------------------------ | ----------- |
| Discovery & Analysis              | 06 January 2026   | 30 January 2026   | Gap Analysis Approved    | Complete    |
| Solution Design                   | 27 January 2026   | 27 February 2026  | Architecture Sign-off    | Complete    |
| Sprint 1 — Core CRM Config        | 02 March 2026     | 13 March 2026     | Sales Cloud MVP          | Complete    |
| Sprint 2 — Service Cloud          | 16 March 2026     | 27 March 2026     | Service Cloud MVP        | Complete    |
| Sprint 3 — API Layer              | 30 March 2026     | 10 April 2026     | API Gateway Live         | Complete    |
| Sprint 4 — Data Migration Dry Run | 13 April 2026     | 24 April 2026     | DM Reconciliation Report | In Progress |
| Sprint 5 — Analytics Hub          | 27 April 2026     | 08 May 2026       | Analytics Dashboard Demo | Planned     |
| Sprint 6 — UAT & Hardening        | 11 May 2026       | 05 June 2026      | UAT Sign-off             | Planned     |
| Go-Live Preparation & Cutover     | 14 September 2026 | 28 September 2026 | Production Go-Live       | Planned     |
| Hypercare (90 days)               | 29 September 2026 | 28 December 2026  | Formal Acceptance        | Planned     |


---

## 15. Risk Register

**Summary:** 1 Critical · 2 High · 3 Open

| ID    | Category   | Description                                                   | Prob.  | Impact | Rating   | Owner             | Status    |
| ----- | ---------- | ------------------------------------------------------------- | ------ | ------ | -------- | ----------------- | --------- |
| R-001 | Data       | 340K orphaned customer records in Siebel with no owner mappi… | High   | High   | Critical | Yusuf Okonkwo     | Open      |
| R-002 | Resource   | IntelliConnect vendor has indicated potential 3-week resourc… | Medium | High   | High     | Nathaniel Ashford | Escalated |
| R-003 | Technical  | MuleSoft on-premises version 4.6.x known bug (MULE-19482) af… | Medium | Medium | Medium   | Yusuf Okonkwo     | Mitigated |
| R-004 | Scope      | Sales Operations requesting addition of CPQ module — not in … | High   | Medium | High     | Nathaniel Ashford | Open      |
| R-005 | Compliance | GDPR right-to-erasure requests during migration window could… | Low    | High   | Medium   | Marcus Delacroix  | Mitigated |

### R-001 — Data [Critical]

**Description:** 340K orphaned customer records in Siebel with no owner mapping — risk of data loss or duplication post-migration

**Mitigation:** Data Quality Sprint (2 weeks) prior to final migration window; automated deduplication rules in migration pipeline

**Owner:** Yusuf Okonkwo · **Status:** Open · **Review:** 01 May 2026

### R-002 — Resource [High]

**Description:** IntelliConnect vendor has indicated potential 3-week resource constraint starting Sprint 5; API completion may slip

**Mitigation:** Escalation to IntelliConnect account executive; parallel resource sourcing via Salesforce partner network

**Owner:** Nathaniel Ashford · **Status:** Escalated · **Review:** 30 April 2026

### R-003 — Technical [Medium]

**Description:** MuleSoft on-premises version 4.6.x known bug (MULE-19482) affecting large payload routing — patch not yet GA

**Mitigation:** Applied MuleSoft engineering workaround (payload chunking < 50MB); monitoring open ticket with MuleSoft support

**Owner:** Yusuf Okonkwo · **Status:** Mitigated · **Review:** 15 May 2026

### R-004 — Scope [High]

**Description:** Sales Operations requesting addition of CPQ module — not in original SOW; potential scope creep

**Mitigation:** Formal CR raised (CR-2026-014); Change Board review scheduled 2026-04-29; budget impact assessed at $340K

**Owner:** Nathaniel Ashford · **Status:** Open · **Review:** 29 April 2026

### R-005 — Compliance [Medium]

**Description:** GDPR right-to-erasure requests during migration window could corrupt migration state if not handled

**Mitigation:** Erasure request freeze policy agreed with DPO for 7-day migration window; compensating controls in migration script

**Owner:** Marcus Delacroix · **Status:** Mitigated · **Review:** 01 August 2026


---

## 16. Issue Log

| ID    | Description                                         | Owner                         | Status      | Resolution                                          |
| ----- | --------------------------------------------------- | ----------------------------- | ----------- | --------------------------------------------------- |
| I-001 | Azure AD B2C tenant provisioning delayed 2 weeks d… | Brendan Mwangi (TechNova CIO) | Resolved    | Emergency CAB approval secured; tenant provisioned… |
| I-002 | Salesforce API Governor Limits hit during bulk mig… | Yusuf Okonkwo                 | In Progress | Bulk API v2 chunking strategy being implemented; E… |
| I-003 | Business SME availability below 40% commitment in … | Candice Ofoegbu               | Resolved    | Formal escalation to Dr. Ramasamy; dedicated SME c… |


---

## 17. Quality Checklist

- ✅ **[Documentation]** Project Charter approved by Exec Sponsor — *Done*
- ✅ **[Documentation]** Solution Design Document signed off by Architecture Review Board — *Done*
- ✅ **[Documentation]** Data Dictionary v2.0 reviewed and approved — *Done*
- ✅ **[Documentation]** Test Strategy reviewed by QA Lead and Client — *Done*
- ⬜ **[Documentation]** Go-Live Runbook and Rollback Plan approved — *Pending*
- ✅ **[Technical]** All Salesforce configuration peer-reviewed before deployment to UAT — *Done*
- ✅ **[Technical]** API contracts validated against OpenAPI 3.0 specification — *Done*
- 🔄 **[Technical]** Security penetration test completed and findings remediated (P1/P2) — *In Progress*
- ⬜ **[Technical]** Performance test: 1,000 concurrent users at <2s response time — *Pending*
- ⬜ **[Technical]** Data migration reconciliation: >99.5% record count and field accuracy — *Pending*
- ✅ **[Compliance]** GDPR Data Protection Impact Assessment (DPIA) completed — *Done*
- 🔄 **[Compliance]** SOX dual-approval workflow verified for all financial data flows — *In Progress*
- ⬜ **[Compliance]** Accessibility audit (WCAG 2.1 AA) on Analytics Hub — *Pending*
- 🔄 **[Training]** Training materials reviewed and approved by business leads — *In Progress*
- ⬜ **[Training]** Train-the-trainer sessions completed for 8 super-user champions — *Pending*


---

## 18. Testing Summary

Risk-based testing approach aligned to ISO 29119. Coverage tiers: Unit (dev-owned), Integration, System, Regression, UAT, Performance, Security, and Accessibility.

### Defect Summary

| Priority | Count | Status |
| -------- | ----- | ------ |
| P1 Critical | 3 | 🔴 Attention Required |
| P2 Major | 14 | 🟡 Monitor |
| P3 Minor | 42 | 🔵 Scheduled |
| P4 Trivial | 30 | ⬜ Backlog |
| **Total** | **89** | **71 Closed · 18 Open** |

### Test Types

| Type                         | Owner                              | Tool                                 | Coverage                                 | Status      |
| ---------------------------- | ---------------------------------- | ------------------------------------ | ---------------------------------------- | ----------- |
| Unit Testing                 | Development Team                   | Jest / Apex Tests                    | 85% code coverage minimum                | In Progress |
| System Integration Testing   | QA Lead                            | Postman + Jira Zephyr                | All 47 API endpoints; 218 test cases     | In Progress |
| User Acceptance Testing      | Business SMEs + QA Lead            | Jira Zephyr + Excel                  | 127 business scenarios; 3 business units | Planned     |
| Regression Testing           | QA Lead                            | Selenium WebDriver + GitHub Actions  | Full smoke pack after every deployment   | Planned     |
| Performance Testing          | QA Lead                            | Apache JMeter                        | 1,000 concurrent users, 4-hour soak test | Planned     |
| Security Penetration Testing | TechNova InfoSec (external vendor) | Burp Suite Pro, OWASP ZAP            | OWASP Top 10, SANS 25                    | In Progress |
| Data Migration Testing       | QA Lead + Client DBA               | Custom Python reconciliation scripts | 100% record count; 99.5% field accuracy  | Planned     |


---

## 19. Acceptance Criteria

| ID     | Deliverable                  | Criterion                                                     | Verified By                       | Status      |
| ------ | ---------------------------- | ------------------------------------------------------------- | --------------------------------- | ----------- |
| AC-001 | Salesforce CRM Configuration | All 127 UAT scenarios pass with zero P1 defects outstanding…  | QA Lead + Business SMEs           | Pending     |
| AC-002 | Data Migration               | ≥99.5% record count accuracy; ≥99.0% field-level accuracy; z… | Client DBA + QA Lead              | Pending     |
| AC-003 | MuleSoft API Layer           | All 47 API endpoints return correct responses per OpenAPI sp… | Solution Architect                | In Progress |
| AC-004 | Analytics Hub                | All 12 dashboards load in <3 seconds; data refreshes within … | QA Lead + TechNova Analytics Team | Pending     |
| AC-005 | SSO & Access Management      | All 1,680 users able to authenticate within 3 seconds; MFA e… | TechNova IT Security              | In Progress |
| AC-006 | Training & Readiness         | ≥80% of users score ≥75% on post-training assessment; all su… | Change Manager                    | Pending     |
| AC-007 | Legacy Decommission          | 14 legacy systems formally decommissioned; no active data wr… | TechNova CIO                      | Pending     |
| AC-008 | Overall Programme            | Budget variance ≤10%; schedule variance ≤15 days; formal acc… | Executive Sponsor                 | Pending     |


---

## 20. Communication Plan

| Audience                     | Format                     | Frequency       | Owner              | Channel                   |
| ---------------------------- | -------------------------- | --------------- | ------------------ | ------------------------- |
| Executive Steering Committee | Steering Pack (PPT + PDF)  | Bi-monthly      | PM                 | In-person / Video         |
| Programme Core Team          | Weekly Status Report (PDF) | Weekly (Friday) | PM                 | Email + Confluence        |
| Sprint Team                  | Daily Stand-up (15 min)    | Daily           | Delivery Lead      | MS Teams                  |
| Business Stakeholders        | Sprint Review Demo         | Bi-weekly       | Delivery Lead      | Video + Jira              |
| End Users                    | Change Newsletter          | Monthly         | Change Manager     | Email + Intranet          |
| External Vendors             | Technical Workgroup Call   | Weekly          | Solution Architect | MS Teams                  |
| Compliance / Audit           | Compliance Gate Report     | Monthly         | PM + Change Mgr    | Formal email + SharePoint |


---

## 21. Handover Notes

### Knowledge Transfer

- 12 Confluence spaces established with full runbooks, SOPs, and operational guides
- 4-week embedded handover period with TechNova IT team starting 2026-09-29
- Shadow sessions completed: Salesforce Admin (x3), MuleSoft Ops (x2), Analytics (x2)
- All custom code repositories transferred to TechNova GitHub Enterprise organisation
- Salesforce admin credentials transferred via approved secrets management process

### Operational Readiness

- TechNova Salesforce Admin team (3 FTE) trained and certified (ADM 201)
- MuleSoft operations runbook approved by TechNova IT Lead
- Datadog monitoring dashboards and PagerDuty alerting configured for TechNova on-call
- L1/L2 support desk scripts and escalation paths documented in Service Cloud Knowledge Base
- Monthly performance review cadence established (first: 2026-10-28)

### Open Items at Handover

- ⚠️ CPQ module scope decision pending Change Board (CR-2026-014) — 2026-04-29
- ⚠️ Power BI Embedded licence renewal due 2026-09-30 — TechNova procurement to action
- ⚠️ WCAG 2.1 AA remediation on Analytics Hub charts — estimated 3 dev-days
- ⚠️ Salesforce Summer '26 upgrade compatibility review required by 2026-07-15


---

## 22. Approval Sign-off

_All signatures required before Go-Live authorisation._

| Role                      | Name                 | Organisation            | Signature         | Date        | Status  |
| ------------------------- | -------------------- | ----------------------- | ----------------- | ----------- | ------- |
| Executive Sponsor         | Dr. Priya Ramasamy   | TechNova Corporation    | _________________ | ___________ | Pending |
| Chief Information Officer | Brendan Mwangi       | TechNova Corporation    | _________________ | ___________ | Pending |
| Programme Manager         | Nathaniel Ashford    | Meridian Advisory Group | _________________ | ___________ | Pending |
| Engagement Partner        | Victoria Osei-Mensah | Meridian Advisory Group | _________________ | ___________ | Pending |
| Compliance Officer        | James Kowalski       | TechNova Corporation    | _________________ | ___________ | Pending |


---

## Appendix A — Glossary

| Term | Definition                                                                               |
| ---- | ---------------------------------------------------------------------------------------- |
| API  | Application Programming Interface — a set of protocols enabling software communication   |
| CRM  | Customer Relationship Management — software managing company interactions with customers |
| DPIA | Data Protection Impact Assessment — GDPR-mandated analysis of privacy risks              |
| RAID | Risks, Assumptions, Issues, Dependencies — standard programme management log             |
| RACI | Responsible, Accountable, Consulted, Informed — responsibility assignment matrix         |
| SOX  | Sarbanes-Oxley Act — US federal law governing financial data controls                    |
| SOP  | Standard Operating Procedure — documented step-by-step process instruction               |
| SSO  | Single Sign-On — authentication allowing one login to access multiple systems            |
| T&M  | Time & Materials — billing model where client pays for actual hours and costs            |
| UAT  | User Acceptance Testing — end-user validation of system against business requirements    |
| WCAG | Web Content Accessibility Guidelines — international accessibility standard              |


---

## Appendix B — References

| Reference        | Description                                   | Date             |
| ---------------- | --------------------------------------------- | ---------------- |
| SOW-2026-0047    | Statement of Work — Phoenix CRM Modernisation | 05 January 2026  |
| PHX-SDD-v2.1     | Solution Design Document v2.1                 | 27 February 2026 |
| PHX-TS-v1.3      | Test Strategy Document v1.3                   | 15 March 2026    |
| PHX-DM-PLAN-v1.0 | Data Migration Plan v1.0                      | 28 March 2026    |
| PHX-DPIA-2026    | GDPR Data Protection Impact Assessment        | 10 February 2026 |
| PHX-SEC-RPT-001  | Penetration Test Interim Report               | 10 April 2026    |

---

_MAG-JC-2026-0047 · v3.1 · CONFIDENTIAL · Generated 27 April 2026_
_© 2026 Meridian Advisory Group. Prepared exclusively for TechNova Corporation._