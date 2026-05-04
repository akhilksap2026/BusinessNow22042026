# Business Requirements Document (BRD)
## BusinessNow PSA — Professional Services Automation Platform

| Field | Value |
|-------|-------|
| **Document Title** | BusinessNow PSA — Business Requirements Document |
| **Version** | 1.0 |
| **Status** | Draft for Review |
| **Date** | May 2026 |
| **Author** | Business Analyst, BusinessNow Product Team |
| **Approver** | Head of Professional Services, CFO, CIO |
| **Classification** | Internal — Confidential |

---

## 1. Executive Summary

BusinessNow PSA is an end-to-end Professional Services Automation platform designed to run a consulting / professional services business from sales through to cash. Today our delivery teams operate across disconnected tools — CRM in one system, project plans in spreadsheets, timesheets in a separate app, invoicing in the finance ERP — leading to revenue leakage, late billing, poor utilisation visibility, and reactive resource decisions.

BusinessNow PSA consolidates the full lifecycle into a single platform: opportunities convert into projects with one click, resources are auto-reserved when deals reach 70% probability, time is logged against real allocations, and invoices are auto-drafted the moment a milestone completes. Leadership gets real-time portfolio health and capacity insight without chasing spreadsheets.

**High-Level Goals**
- Eliminate revenue leakage between milestone completion and invoice issue
- Increase billable utilisation by 5–8 percentage points through better resource visibility
- Compress the sales-to-delivery handover from days to minutes
- Provide a single source of truth for project, resource, and financial data

---

## 2. Business Objectives

| # | Objective | Target | Baseline | Measurement Window |
|---|-----------|--------|----------|--------------------|
| O1 | Reduce time from milestone complete → invoice issued | ≤ 2 business days | 9 days | Quarterly |
| O2 | Increase consultant billable utilisation | 75% | 67% | Monthly |
| O3 | Reduce unbilled revenue (WIP) ageing > 30 days | ≤ 5% of WIP | 18% | Monthly |
| O4 | Cut time spent on weekly timesheet entry per consultant | ≤ 8 minutes | ~25 minutes | Quarterly |
| O5 | Improve forecast accuracy for revenue 90 days out | ± 5% variance | ± 18% variance | Quarterly |
| O6 | Reduce average resource staffing turn-around | ≤ 24 hours | 4–5 days | Monthly |
| O7 | Achieve 95% on-time project delivery (against baseline) | ≥ 95% | 78% | Quarterly |

---

## 3. Scope

### 3.1 In-Scope
- **CRM** — Account, prospect, and opportunity management; pipeline forecasting; one-click conversion of won deals into projects
- **Project Delivery** — Project planning (phases, tasks, dependencies, milestones), baselines, change orders, project templates, project health tracking
- **Resource Management** — Capacity planning (12–52 weeks), AI-assisted staffing suggestions, resource request workflows, skills matrix
- **Time & Attendance** — Weekly timesheets (pre-filled from allocations), AI Time Assistant, approval workflows, time-off and holiday tracking
- **Finance** — Rate cards, milestone-triggered auto-draft invoicing, billing schedules, revenue recognition, GL export to NetSuite
- **Reports & Analytics** — 12+ pre-built reports (utilisation, capacity, project health, revenue, pipeline, CSAT, budget vs actual), CSV/XLSX export
- **Administration** — Role-based access control (4 roles), audit logging, custom fields, project/document templates, system configuration
- **Integrations** — NetSuite (GL export), Microsoft 365 / Google Workspace calendar (for AI Time Assistant), SSO via SAML/OIDC

### 3.2 Out-of-Scope (Phase 1)
- Customer-facing project portal beyond view-only access
- Mobile native apps (responsive web only in Phase 1)
- Expense management and reimbursement
- Procurement / vendor invoicing
- Recruitment / applicant tracking
- Payroll integration
- Multi-currency consolidation reporting (single reporting currency in Phase 1)
- Fixed-asset tracking
- HR core (leave types beyond PTO, performance management, learning)

---

## 4. Stakeholders

| Stakeholder | Role | Key Responsibilities |
|-------------|------|---------------------|
| **Executive Sponsor** (CEO / COO) | Decision authority, budget owner | Approves scope, funding, go-live decision |
| **Head of Professional Services** | Business owner | Defines delivery process, owns adoption |
| **CFO / Finance Controller** | Finance owner | Owns billing, revenue recognition, GL integration |
| **Resource / Talent Manager** | Operations owner | Owns staffing process, capacity planning |
| **Project Managers (PMs)** | Primary user | Plan, staff, track, and bill projects |
| **Consultants / Delivery Team** | Primary user | Log time, view allocations, raise time-off |
| **Sales Leadership** | Pipeline owner | Owns CRM data quality, conversion flow |
| **IT / Security** | Technical owner | Owns SSO, integrations, data security review |
| **Customer Account Owners** | External stakeholder | View project status via customer portal |
| **Internal Audit** | Compliance | Reviews audit log, access controls, SoD |
| **Product / BA Team** | Solution owner | Requirements, configuration, change management |

---

## 5. Functional Requirements

### 5.1 CRM
- FR-CRM-01: Capture and maintain accounts with hierarchy (parent/child)
- FR-CRM-02: Track prospects with source, stage, owner, value
- FR-CRM-03: Manage opportunities with weighted pipeline, stage probability, expected close date
- FR-CRM-04: Auto-create soft resource reservations when an opportunity reaches ≥ 70% probability
- FR-CRM-05: One-click "Convert to Project" — copies team, dates, value, contacts to a new project record
- FR-CRM-06: Roll-up pipeline value by account, owner, region, service line

### 5.2 Project Delivery
- FR-PRJ-01: Create projects from templates or from scratch
- FR-PRJ-02: Plan with phases, tasks, dependencies, and milestones
- FR-PRJ-03: Snapshot a baseline plan and track variance vs current
- FR-PRJ-04: Compute and display project health (On Track / At Risk / Off Track) using rules on schedule, budget, and CSAT
- FR-PRJ-05: Raise, route, and approve change orders (scope, value, dates) with audit trail
- FR-PRJ-06: Bulk-update task status, owner, dates, priority
- FR-PRJ-07: Attach documents and forms to projects, with version history
- FR-PRJ-08: Capture project status updates (weekly RAG report) visible to the customer portal

### 5.3 Resource Management
- FR-RES-01: Show capacity vs demand on a heatmap, 12 to 52 weeks ahead
- FR-RES-02: Distinguish hard (committed) and soft (probable) allocations
- FR-RES-03: Maintain a skills matrix with proficiency level and last-used date per skill
- FR-RES-04: Suggest top-3 candidates for any open role based on skill match, availability, region, and cost rate, with a clear "why" for each
- FR-RES-05: Support resource request types: New, Replace, Extend, Reduce, Change Role, Remove
- FR-RES-06: Factor approved time-off and public holidays into capacity automatically

### 5.4 Time & Attendance
- FR-TIM-01: Render a weekly grid pre-filled from active allocations
- FR-TIM-02: Provide an AI Time Assistant that proposes entries from calendar events and activity signals
- FR-TIM-03: Allow submission for PM approval with comments on rejection
- FR-TIM-04: Lock approved entries from retroactive edits (admin override with audit trail)
- FR-TIM-05: Capture time-off requests against a configured PTO balance and approval chain
- FR-TIM-06: Enforce per-region time policies (max hours/day, mandatory comments, billable rules)

### 5.5 Finance
- FR-FIN-01: Maintain rate cards (bill rate, cost rate) per role per project, with effective dates
- FR-FIN-02: Auto-draft an invoice when a milestone is marked complete
- FR-FIN-03: Support recurring (monthly, quarterly) and milestone-based billing schedules
- FR-FIN-04: Recognise revenue separately from invoicing (percent-complete, milestone, or as-billed methods)
- FR-FIN-05: Export approved invoices and journals to NetSuite via batch file or API
- FR-FIN-06: Calculate and display margin (revenue − cost) at project, account, and portfolio level

### 5.6 Reports & Analytics
- FR-RPT-01: Provide 12+ pre-built reports: Performance, Utilization, Utilization Grid, Capacity Planning, Project Health, Revenue, Budget vs Actual, Burn-Down, Timesheet Submissions, CSAT Trend, Interval IQ, Operations
- FR-RPT-02: Allow export to CSV, XLSX, and PDF
- FR-RPT-03: Allow saved views and scheduled email distribution
- FR-RPT-04: Support filtering by date range, region, account, project, role, person

### 5.7 Administration
- FR-ADM-01: Enforce 4-role RBAC: Account Admin, Super User (PM/Finance), Collaborator (Consultant), Customer
- FR-ADM-02: Capture an audit log of every create/update/delete with actor, timestamp, before/after values
- FR-ADM-03: Configure custom fields on accounts, projects, tasks
- FR-ADM-04: Maintain project and document templates
- FR-ADM-05: Configure regions, holiday calendars, branding, tax codes

---

## 6. Non-Functional Requirements

### 6.1 Performance
| ID | Requirement | Target |
|----|-------------|--------|
| NFR-P-01 | Page load (P95) for primary screens | ≤ 2.0 s |
| NFR-P-02 | API response (P95) for read endpoints | ≤ 400 ms |
| NFR-P-03 | API response (P95) for write endpoints | ≤ 800 ms |
| NFR-P-04 | Concurrent active users supported | 1,500 |
| NFR-P-05 | Capacity heatmap render for 500 people × 52 weeks | ≤ 3.0 s |

### 6.2 Availability & Reliability
- NFR-A-01: Production uptime ≥ 99.9% measured monthly (excluding announced maintenance)
- NFR-A-02: RPO ≤ 15 minutes; RTO ≤ 4 hours
- NFR-A-03: Daily backups retained 30 days; weekly backups retained 12 months

### 6.3 Security
- NFR-S-01: Authentication via SSO (SAML 2.0 / OIDC) with MFA enforced
- NFR-S-02: All data in transit over TLS 1.2+; all data at rest encrypted (AES-256)
- NFR-S-03: Role-based access control enforced server-side, not just UI
- NFR-S-04: Annual penetration test and quarterly vulnerability scans
- NFR-S-05: Secrets managed via vault; no credentials in code or config files

### 6.4 Compliance
- NFR-C-01: GDPR — right to access, export, and erase personal data
- NFR-C-02: SOC 2 Type II controls, with annual audit
- NFR-C-03: Data residency — EU customer data hosted in EU region
- NFR-C-04: Audit log retention ≥ 7 years for financial records

### 6.5 Usability & Accessibility
- NFR-U-01: WCAG 2.1 Level AA conformance on primary user journeys
- NFR-U-02: Responsive web supporting desktop (1280+), tablet (768+), and mobile (≥ 375 px)
- NFR-U-03: Localisation for English (en-US, en-GB), German, French at launch; framework supports adding locales
- NFR-U-04: New PM can plan a 5-phase project from a template in ≤ 10 minutes (usability test target)

### 6.6 Maintainability & Extensibility
- NFR-M-01: Custom fields, templates, and report views configurable without code change
- NFR-M-02: Public REST API with OpenAPI spec for all primary entities
- NFR-M-03: Webhook events for invoice raised, milestone complete, project status change

---

## 7. Assumptions & Constraints

### 7.1 Assumptions
- A1: Existing CRM and timesheet data can be exported in CSV format suitable for migration
- A2: NetSuite is and will remain the system of record for the General Ledger
- A3: Identity provider (Azure AD / Okta) is in place for SSO
- A4: Stable network connectivity at all delivery offices and remote consultants
- A5: Business sponsors are available for weekly UAT during the validation phase

### 7.2 Constraints
- C1: Phase 1 launch must be complete before the start of fiscal year 2027
- C2: Total Phase 1 budget capped at the approved business case amount
- C3: Single reporting currency (USD) at launch; multi-currency deferred to Phase 2
- C4: NetSuite GL integration uses scheduled batch (every 4 hours), not real-time
- C5: Customer portal limited to view-only in Phase 1 (no document upload by customers)

### 7.3 Dependencies
- D1: Identity provider readiness (SSO configuration) — IT
- D2: NetSuite API credentials and sandbox access — Finance Systems
- D3: Skills taxonomy sign-off — Talent / HR
- D4: Rate-card data sign-off per region — Finance Controller
- D5: Legal review of customer-portal terms — Legal Counsel

---

## 8. Success Metrics (KPIs)

| KPI | Owner | Baseline | Target (12 mo post go-live) |
|-----|-------|----------|------------------------------|
| Days from milestone complete → invoice issued | CFO | 9 | ≤ 2 |
| Billable utilisation (firm-wide) | Head of PS | 67% | 75% |
| Unbilled WIP > 30 days (% of total WIP) | CFO | 18% | ≤ 5% |
| On-time project delivery (vs baseline) | Head of PS | 78% | ≥ 95% |
| Avg time spent on weekly timesheets (per consultant) | Head of PS | ~25 min | ≤ 8 min |
| Timesheet submission compliance by Monday EOD | Head of PS | 71% | ≥ 95% |
| Revenue forecast accuracy (90 days out, ± variance) | CFO | ± 18% | ± 5% |
| Resource staffing turn-around (request → assigned) | Resource Mgr | 4–5 days | ≤ 24 h |
| User adoption (active weekly users / licensed users) | Product | n/a | ≥ 90% |
| CSAT (project-end survey) | Head of PS | 7.8 / 10 | ≥ 8.5 / 10 |

---

## 9. Risks & Mitigation

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|------------|--------|------------|
| R1 | Low user adoption (consultants resist new timesheet flow) | Medium | High | Pre-launch champions, in-app guidance, AI Time Assistant to reduce effort, manager-level adoption dashboards |
| R2 | Migration data quality issues (stale CRM, dirty rate cards) | High | Medium | Pre-migration data audit, cleanse-and-validate sprint, dry-run migration to staging |
| R3 | NetSuite GL integration mapping errors | Medium | High | Joint design workshop with Finance Systems, parallel-run for one billing cycle, reconciliation report |
| R4 | Scope creep during build (Phase 2 features pulled into Phase 1) | High | Medium | Locked Phase 1 backlog, formal change-request process via Steering Committee |
| R5 | SSO / identity readiness slips | Medium | High | Early IT engagement, fallback to local auth for pilot users only |
| R6 | Performance under peak load (month-end billing) | Medium | High | Load testing at 2× peak; auto-scaling infra; queue-based invoice generation |
| R7 | Data residency / compliance gap (GDPR) | Low | High | EU region deployment validated; DPIA completed before go-live |
| R8 | Key person dependency (single SME on resource model) | Medium | Medium | Pair-working, documented design decisions, knowledge-transfer sessions |
| R9 | Customer portal exposes sensitive data unintentionally | Low | High | Field-level access review; pen-test on portal endpoints; default-deny posture |
| R10 | Sponsor turnover during programme | Low | High | Quarterly steering review, documented decisions, broad sponsor coalition |

---

## 10. Timeline & Milestones

### 10.1 High-Level Schedule

| Phase | Window | Key Deliverable |
|-------|--------|-----------------|
| **Discovery & Mobilisation** | Weeks 1–4 | Signed BRD, governance setup, env access |
| **Design** | Weeks 5–10 | Solution design, data migration plan, integration design |
| **Build — Sprint 1 (CRM + Projects)** | Weeks 11–14 | CRM and Projects modules feature-complete |
| **Build — Sprint 2 (Resources + Time)** | Weeks 15–18 | Resources and Time modules feature-complete |
| **Build — Sprint 3 (Finance + Reports)** | Weeks 19–22 | Finance, Reporting, NetSuite integration feature-complete |
| **Build — Sprint 4 (Admin + Polish)** | Weeks 23–25 | RBAC, audit, custom fields, templates |
| **System Integration Test (SIT)** | Weeks 26–28 | All defects ≤ Sev-2 closed |
| **User Acceptance Test (UAT)** | Weeks 29–31 | UAT sign-off by business owners |
| **Data Migration & Cutover** | Weeks 32–33 | Production data loaded and reconciled |
| **Pilot Go-Live (1 region)** | Week 34 | Live for ~50 users, hypercare |
| **Phased Rollout (remaining regions)** | Weeks 35–40 | Full firm live |
| **Post-Go-Live Hypercare** | Weeks 41–48 | ≤ 5 critical defects, KPI tracking starts |

### 10.2 Key Milestones

| # | Milestone | Target Date | Owner |
|---|-----------|-------------|-------|
| M1 | BRD approved | End of Week 4 | Sponsor |
| M2 | Solution design signed off | End of Week 10 | BA + IT |
| M3 | Build complete | End of Week 25 | Delivery Lead |
| M4 | UAT sign-off | End of Week 31 | Business Owners |
| M5 | Pilot go-live | Week 34 | Programme Manager |
| M6 | Full rollout complete | End of Week 40 | Programme Manager |
| M7 | Phase 1 closure & benefits review | End of Week 48 | Sponsor |

---

## 11. Approval & Sign-Off

| Name | Role | Decision | Date | Signature |
|------|------|----------|------|-----------|
|  | Executive Sponsor (CEO/COO) | ☐ Approve  ☐ Reject  ☐ Approve with comment |  |  |
|  | Head of Professional Services | ☐ Approve  ☐ Reject  ☐ Approve with comment |  |  |
|  | Chief Financial Officer | ☐ Approve  ☐ Reject  ☐ Approve with comment |  |  |
|  | Chief Information Officer | ☐ Approve  ☐ Reject  ☐ Approve with comment |  |  |
|  | Head of IT Security | ☐ Approve  ☐ Reject  ☐ Approve with comment |  |  |

---

*End of Business Requirements Document — BusinessNow PSA v1.0*
