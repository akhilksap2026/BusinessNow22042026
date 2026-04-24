# Sprint Plan — Phase 1 (MVP Development)

| | |
|---|---|
| **Phase** | 1 — MVP Development |
| **Duration** | [START DATE] — [END DATE] (12 weeks / 6 sprints of 2 weeks) |
| **Team capacity** | **[4]** developers (2 FE + 2 BE), **[1]** designer, **[1]** QA, plus **[0.5]** DevOps |
| **Velocity assumption** | **[25] story points / sprint** (steady state from Sprint 3 onwards) |
| **Owner** | [PM / Delivery Lead — NAME] |
| **Version** | v0.1 — Draft |
| **Status** | Draft |

---

## 1. Phase 1 Goals

**Primary goal:** Ship a deployable, secure, and instrumented MVP of [PRODUCT NAME] that lets a new organization sign up, complete onboarding, manage `[RESOURCE_A]` and `[RESOURCE_B]`, pay for a subscription, and stay informed via notifications — ready for Public Beta at the end of Sprint 6.

### Definition of "Phase 1 Complete"

- [ ] All P0 user stories from EP-001 → EP-005 are merged, tested, and deployed to production behind feature flags as needed.
- [ ] Activation funnel (signup → first key action) is instrumented end-to-end and visible on the team dashboard.
- [ ] Payments flow is live in [PAYMENTS PROVIDER] with at least the **Free** and **Pro** plans purchasable.
- [ ] Production observability (logs, metrics, alerts) and on-call rotation are operational.
- [ ] Security baseline met: RBAC enforced server-side on every endpoint, audit log emitted on every state-changing action, secrets in [SECRET MANAGER].
- [ ] At least **[10]** design partners onboarded into Public Beta with a documented feedback loop.

### What we are **NOT** building in Phase 1

- Native mobile apps (iOS / Android) — web-responsive only.
- Workflow automations, templates marketplace, or public REST/GraphQL API for third parties.
- SAML SSO, custom roles, or regional data residency (Phase 2 candidates).
- Advanced reporting / BI dashboards — only the basic activity dashboard ships.

---

## 2. Sprint Breakdown

> **Note on velocity:** Sprints 1–2 carry foundational ramp-up work and are sized at **[20]** points. Sprints 3–5 run at the steady-state **[25]** points. Sprint 6 is intentionally smaller (**[18]** points) to leave slack for hardening and Public Beta launch.

---

### Sprint 1 — *Project Setup & Auth Foundation*

- **Sprint Goal:** A new visitor can register, verify their email, and reset a forgotten password against a hardened, deployable backend running in staging.
- **Dates:** Week 1 — Week 2 ([SPRINT 1 START] — [SPRINT 1 END])
- **Capacity:** **[20] story points**

| Story ID | Story | Points | Owner | Status |
|---|---|---|---|---|
| INFRA-01 | Provision dev / staging environments and base IaC | 5 | DevOps | Planned |
| INFRA-02 | CI/CD pipeline with lint, test, build, deploy-to-staging | 3 | DevOps | Planned |
| INFRA-03 | Centralised logging + error tracking wired up | 2 | DevOps | Planned |
| US-001 | User registration | 3 | BE Dev 1 | Planned |
| US-002 | Email verification | 2 | BE Dev 1 | Planned |
| US-004 | Forgotten password | 3 | BE Dev 2 | Planned |
| FE-FOUND | App shell, routing, design-system bootstrap | 2 | FE Dev 1 | Planned |

- **Key deliverable by end of sprint:** Working auth (register / verify / reset) deployed to staging behind a public URL; CI green on `main`.
- **Risks this sprint:** Cloud account setup or DNS delays; design-system decisions taking longer than the spike budget.

---

### Sprint 2 — *Core Data Model & API Skeleton*

- **Sprint Goal:** Stand up the multi-tenant data model and the API skeleton for `[RESOURCE_A]` / `[RESOURCE_B]`, with SSO and team invites available on the auth surface.
- **Dates:** Week 3 — Week 4 ([SPRINT 2 START] — [SPRINT 2 END])
- **Capacity:** **[20] story points**

| Story ID | Story | Points | Owner | Status |
|---|---|---|---|---|
| US-003 | SSO login ([GOOGLE / MICROSOFT]) | 5 | BE Dev 1 | Planned |
| US-005 | Invite teammates by email | 3 | BE Dev 2 | Planned |
| DATA-01 | `organizations`, `users`, `audit_logs` migrations + seed data | 3 | BE Dev 1 | Planned |
| DATA-02 | `[RESOURCE_A]` / `[RESOURCE_B]` migrations + repositories | 3 | BE Dev 2 | Planned |
| API-01 | API skeleton: error envelope, pagination, auth middleware | 3 | BE Dev 1 | Planned |
| FE-AUTH | Login / register / SSO UI wired to the API | 3 | FE Dev 1 | Planned |

- **Key deliverable by end of sprint:** Authenticated users can create an organization and invite teammates; `[RESOURCE_A]` / `[RESOURCE_B]` endpoints exist (CRUD scaffolding) with auth + tenant isolation tests in CI.
- **Risks this sprint:** SSO integration interop issues with the chosen provider; multi-tenant isolation edge cases surfacing late.

---

### Sprint 3 — *Core Feature A — `[RESOURCE_A]` Management (MVP)*

- **Sprint Goal:** End users can create, find, edit, and archive `[RESOURCE_A]` from a polished web UI, with audit logs and RBAC enforced.
- **Dates:** Week 5 — Week 6 ([SPRINT 3 START] — [SPRINT 3 END])
- **Capacity:** **[25] story points**

| Story ID | Story | Points | Owner | Status |
|---|---|---|---|---|
| US-006 | Create a `[RESOURCE_A]` | 3 | FE Dev 1 + BE Dev 1 | Planned |
| US-007 | List and filter `[RESOURCE_A]` | 5 | FE Dev 1 + BE Dev 1 | Planned |
| US-008 | Edit a `[RESOURCE_A]` | 3 | FE Dev 2 + BE Dev 2 | Planned |
| US-009 | Archive and restore a `[RESOURCE_A]` | 3 | FE Dev 2 + BE Dev 2 | Planned |
| RBAC-01 | RBAC enforcement on `[RESOURCE_A]` endpoints + tests | 3 | BE Dev 1 | Planned |
| AUDIT-01 | Audit-log writes on `[RESOURCE_A]` state changes | 2 | BE Dev 2 | Planned |
| QA-01 | Build first integration + E2E tests for `[RESOURCE_A]` flows | 3 | QA | Planned |
| UX-01 | Visual QA + accessibility pass on `[RESOURCE_A]` screens | 3 | UX Designer | Planned |

- **Key deliverable by end of sprint:** End-to-end `[RESOURCE_A]` flow live in staging; first measurable activation funnel data flowing.
- **Risks this sprint:** Filter / sort performance at realistic data volumes; tenant-isolation regressions if test coverage is thin.

---

### Sprint 4 — *Core Feature B — `[RESOURCE_B]` Management (MVP)*

- **Sprint Goal:** Inside any `[RESOURCE_A]`, users can create, assign, reorder, and complete `[RESOURCE_B]`, with notifications firing on key events.
- **Dates:** Week 7 — Week 8 ([SPRINT 4 START] — [SPRINT 4 END])
- **Capacity:** **[25] story points**

| Story ID | Story | Points | Owner | Status |
|---|---|---|---|---|
| US-010 | Create a `[RESOURCE_B]` inside a `[RESOURCE_A]` | 3 | FE Dev 1 + BE Dev 1 | Planned |
| US-011 | Assign and reassign a `[RESOURCE_B]` | 2 | FE Dev 1 + BE Dev 2 | Planned |
| US-012 | Reorder `[RESOURCE_B]` within a `[RESOURCE_A]` | 5 | FE Dev 2 + BE Dev 2 | Planned |
| US-013 | Bulk update `[RESOURCE_B]` | 5 | FE Dev 2 + BE Dev 1 | Planned |
| NOTIF-01 | In-app notifications service + bell menu | 3 | BE Dev 1 + FE Dev 1 | Planned |
| NOTIF-02 | Daily email digest (timezone-aware) | 3 | BE Dev 2 | Planned |
| QA-02 | Integration + E2E tests for `[RESOURCE_B]` flows | 3 | QA | Planned |
| UX-02 | Visual QA + accessibility pass on `[RESOURCE_B]` screens | 1 | UX Designer | Planned |

- **Key deliverable by end of sprint:** Full `[RESOURCE_A]` + `[RESOURCE_B]` workflow demoable end-to-end with notifications.
- **Risks this sprint:** Drag-and-drop reorder UX (mobile-web behaviour) and write-amplification at scale; email deliverability setup with [EMAIL PROVIDER] (SPF/DKIM/DMARC).

---

### Sprint 5 — *UI Polish, Integrations & QA Depth*

- **Sprint Goal:** Ship the remaining MVP surfaces (settings, billing-lite, audit-log viewer), close usability issues from internal testing, and harden the test pyramid.
- **Dates:** Week 9 — Week 10 ([SPRINT 5 START] — [SPRINT 5 END])
- **Capacity:** **[25] story points**

| Story ID | Story | Points | Owner | Status |
|---|---|---|---|---|
| US-014 | Edit personal profile | 2 | FE Dev 1 + BE Dev 1 | Planned |
| US-015 | Change password | 2 | FE Dev 1 + BE Dev 2 | Planned |
| US-016 | Manage notification preferences | 3 | FE Dev 2 + BE Dev 1 | Planned |
| US-017 | View and revoke active sessions | 3 | FE Dev 2 + BE Dev 2 | Planned |
| US-018 | Choose a plan and start a subscription | 5 | BE Dev 1 + FE Dev 1 | Planned |
| US-025 | View audit log with filters (admin) | 5 | FE Dev 2 + BE Dev 2 | Planned |
| QA-03 | Cross-browser pass + E2E hardening | 3 | QA | Planned |
| UX-03 | Empty states, error states, loading states pass | 2 | UX Designer | Planned |

- **Key deliverable by end of sprint:** All P0 stories code-complete; staging considered "feature-complete" for Phase 1.
- **Risks this sprint:** [PAYMENTS PROVIDER] webhook reconciliation edge cases; usability findings forcing late design changes.

---

### Sprint 6 — *Hardening, Beta Onboarding & Docs*

- **Sprint Goal:** Productionise [PRODUCT NAME] for Public Beta — stabilise, document, onboard design partners, and close release-criteria items.
- **Dates:** Week 11 — Week 12 ([SPRINT 6 START] — [SPRINT 6 END])
- **Capacity:** **[18] story points** (intentionally lower; reserve for hardening)

| Story ID | Story | Points | Owner | Status |
|---|---|---|---|---|
| HARD-01 | Performance pass: P95 budgets met for read & write paths | 3 | BE Dev 1 | Planned |
| HARD-02 | Load test (Public Beta scenario) and remediation | 3 | DevOps + BE Dev 2 | Planned |
| HARD-03 | Security review checklist closure (see `docs/technical/05_*`) | 3 | BE Dev 2 | Planned |
| OBS-01 | Production dashboards, alerts, and on-call runbooks | 3 | DevOps | Planned |
| BETA-01 | Beta onboarding kit (welcome, agreements, feedback channels) | 2 | PM | Planned |
| DOCS-01 | Public help centre seed (10 articles) and changelog | 2 | PM + UX | Planned |
| QA-04 | Final regression + go/no-go test report | 2 | QA | Planned |

- **Key deliverable by end of sprint:** Public Beta launched with **[≥ 10]** design partners onboarded; release-criteria checklist (§7) signed off.
- **Risks this sprint:** Late-discovered defects forcing scope cuts; beta partner communications slipping past launch day.

---

## 3. Milestones & Gates

| Milestone | Target Date | Criteria | Owner |
|---|---|---|---|
| M1 — Auth foundation deployed to staging | End of Sprint 1 | Register / verify / reset live in staging; CI green on `main`. | Tech Lead |
| M2 — Multi-tenant skeleton ready | End of Sprint 2 | Org + invite + tenant-isolated `[RESOURCE_A]`/`[RESOURCE_B]` endpoints. | Tech Lead |
| M3 — `[RESOURCE_A]` MVP demoable | End of Sprint 3 | All P0 `[RESOURCE_A]` stories complete with audit + RBAC. | PM |
| M4 — End-to-end workflow demoable | End of Sprint 4 | `[RESOURCE_A]` + `[RESOURCE_B]` + notifications working end-to-end. | PM |
| M5 — Feature-complete in staging | End of Sprint 5 | All Phase 1 P0 stories merged; payments live in test mode. | PM + Tech Lead |
| M6 — Public Beta launch | End of Sprint 6 | Release criteria (§7) all green; design partners onboarded. | PM |

---

## 4. Dependencies Between Sprints

- **Sprint 1 → Sprint 2:** CI/CD and base IaC must be live before feature work can deploy reliably.
- **Sprint 1 → Sprint 2:** Auth (US-001/002/004) must merge before SSO and invites build on top.
- **Sprint 2 → Sprint 3:** Multi-tenant data model and API skeleton must exist before `[RESOURCE_A]` endpoints can pass tenant-isolation tests.
- **Sprint 3 → Sprint 4:** `[RESOURCE_A]` must exist before `[RESOURCE_B]` can be created scoped to it.
- **Sprint 3 → Sprint 4:** Audit-log infrastructure (AUDIT-01) is reused by `[RESOURCE_B]` mutations and the notifications service.
- **Sprint 4 → Sprint 5:** Notifications service (NOTIF-01) is required for the notification-preferences UI (US-016).
- **Sprint 5 → Sprint 6:** Payments (US-018) must be live in test mode before beta partner onboarding.
- **Cross-cutting:** The design system (FE-FOUND, Sprint 1) underpins every UI story; design-system gaps trigger blocking debt before they cascade.
- **Cross-cutting:** Observability (INFRA-03, OBS-01) underpins on-call readiness for Public Beta.

---

## 5. QA Strategy

### Per-sprint testing approach

| Sprint | Test focus | Output |
|---|---|---|
| Sprint 1 | Unit tests on auth flows; smoke tests in CI; manual exploratory on staging. | Auth regression suite seeded. |
| Sprint 2 | Tenant-isolation tests (negative + positive); contract tests on the API. | Isolation tests gating CI. |
| Sprint 3 | Integration + first E2E tests for `[RESOURCE_A]`; accessibility scan. | First green E2E pipeline. |
| Sprint 4 | E2E tests for `[RESOURCE_B]`; notification delivery tests; perf spot-checks. | Coverage on the core workflow. |
| Sprint 5 | Cross-browser pass; payments sandbox tests; usability validation. | Full regression suite + UX sign-off. |
| Sprint 6 | Load test, security review, final regression, go/no-go report. | Release readiness sign-off. |

**Standing practices:**

- Every PR requires unit tests for changed code and a passing CI suite (lint + types + unit + integration).
- E2E suite runs nightly on staging and on every PR touching the corresponding flow.
- All defects are logged in [TICKET TOOL] with severity, repro steps, and owner.
- Bug-bash session at the end of each sprint involving the whole team.

### Bug severity classification

| Severity | Definition | SLA to fix |
|---|---|---|
| **S1 — Critical** | Data loss, security exposure, full outage, or blocker for any P0 user story. | **Same day** (drop everything; hotfix to production). |
| **S2 — High** | Major feature broken; significant degradation; no acceptable workaround. | **Within 2 business days**; included in current sprint. |
| **S3 — Medium** | Functional bug with workaround, or regression on a non-critical flow. | **Within current or next sprint**, per PM prioritisation. |
| **S4 — Low** | Cosmetic / nice-to-have; minor copy or layout. | Backlog; addressed opportunistically. |

---

## 6. Release Criteria for Phase 1 Completion

The following must all be ticked before declaring Phase 1 complete and opening Public Beta:

- [ ] All P0 user stories from EP-001 → EP-005 are merged and deployed.
- [ ] All S1 and S2 defects are resolved; S3 backlog has explicit owners and target sprints.
- [ ] CI pipeline green on `main`; nightly E2E green for **[7]** consecutive nights.
- [ ] P95 API latency below **300 ms** (read) and **800 ms** (write) at the load-test target.
- [ ] Production uptime over the last **[7]** days **≥ 99.5%**.
- [ ] RBAC enforced server-side on every endpoint; tenant-isolation tests in CI.
- [ ] Audit-log entries emitted on every state-changing action; verified by sampling.
- [ ] Payments live in [PAYMENTS PROVIDER] (test → production cutover) with at least **Free** + **Pro** plans.
- [ ] Email sending domain verified ([SPF / DKIM / DMARC]) and bounce handling in place.
- [ ] Observability complete: dashboards, alerts, and on-call rotation operational.
- [ ] Security review checklist (`docs/technical/05_security_and_compliance.md`) closed for Phase 1 scope.
- [ ] Privacy notice, Terms of Service, and DPA published on the marketing site.
- [ ] Help-centre seed (≥ **10** articles) and changelog published.
- [ ] Beta onboarding kit delivered to **[≥ 10]** design partners with feedback loops live.
- [ ] Go/No-Go sign-off from **PM**, **Tech Lead**, **QA**, **Security Lead**, and **Executive Sponsor**.

---

## 7. Retrospective Template (per sprint)

Run a 60-minute retro at the end of every sprint. Output is captured in `docs/operations/retros/[SPRINT-N]-retro.md`.

### What went well?

- [Capture 3–5 positives — wins, smooth handoffs, helpful changes from the previous retro.]

### What didn't go well?

- [Capture 3–5 frictions — blockers, surprises, scope creep, hand-off gaps.]

### What will we change?

- [Capture concrete, owned experiments to try next sprint. Avoid generic resolutions.]

### Action items

| Action | Owner | Due |
|---|---|---|
| [ACTION 1 — concrete, observable change.] | [NAME] | [DATE] |
| [ACTION 2 — concrete, observable change.] | [NAME] | [DATE] |
| [ACTION 3 — concrete, observable change.] | [NAME] | [DATE] |

**Standing rules for the retro:**

- Blameless framing: focus on the system, not the person.
- Maximum **[3]** action items per retro — fewer, well-owned changes beat long lists.
- Carry-over actions from the previous retro are reviewed first; closed before new ones are added.
- Themes that recur across **[2]** retros are escalated to the Tech Lead and PM for a dedicated remediation epic.
