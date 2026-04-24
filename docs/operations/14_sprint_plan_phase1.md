# Sprint Plan — Phase 2 (Operational Maturity, Q2 2026)

| | |
|---|---|
| **Product** | BusinessNow PSA |
| **Owner** | Delivery Lead |
| **Version** | 1.0 — Approved |
| **Date** | 2026-04-24 |
| **Status** | Approved |

> **Phase 1 (MVP) is complete and in production.** The "Phase 1 sprint plan" template was retained; this document repurposes it as the **active Phase-2** plan, which is what the team is currently delivering. The historic Phase-1 sprint log (S1–S12, Jan–Apr 2026) lives in §9.

---

## 1. Phase Goals

Phase 2 ("Operational Maturity") covers Q2 2026 (April → June). Its goals:

| # | Goal | Measure of success |
|---|---|---|
| G1 | Ship Dashboard v1 and lock period selector. | Live in production by mid-April. ✅ |
| G2 | Ship Capacity-Planning report. | `GET /api/reports/capacity-planning` live; Reports tab live. ✅ |
| G3 | Consolidate role propagation in the SPA via `authHeaders()`. | 22 hardcoded headers removed across 6 page files. ✅ |
| G4 | Density / scale redesign default flipped. | ≥ 25 % more rows visible at 1440×900 with no UI/UX audit §6.1 regression. |
| G5 | Close UI/UX audit Critical (US-1) + §6.2 quick wins. | 0 Critical remaining; ≥ 80 % of §6.2 closed. |
| G6 | Close 2026-04-23 functional audit High items that are in scope. | Per the audit's "Gaps remaining" table — Replacement-Request server-side gating delivered. |
| G7 | Wire global error toast/banner (US-11). | Page-level lists no longer silently render empty on query failure. |

---

## 2. Cadence

- 2-week sprints, Monday → Friday two weeks later.
- Standup daily, sprint planning Monday week 1, review Friday week 2 morning, retro Friday week 2 afternoon.
- Holidays observed per the company holiday calendar (which the platform itself uses for capacity).

---

## 3. Capacity (per sprint)

Headcount × 80 % focus factor (meetings + 20 % buffer).

| Role | Headcount × allocation | Hours per sprint (2 weeks @ 80 %) |
|---|---|---|
| Backend Engineer | 2 × 100 % | 128 h |
| Frontend Engineer | 2 × 100 % | 128 h |
| Tech Lead | 1 × 60 % delivery | 38 h |
| QA Engineer | 1 × 50 % | 32 h |
| UX Designer | 1 × 50 % | 32 h |
| PM | 1 × 50 % | 32 h |
| **Total team** | — | **390 h / sprint** |

The remaining capacity (Tech Lead's other 40 %, PM/UX's other 50 %) is for design, planning, reviews, and stakeholder work tracked outside the sprint board.

---

## 4. Sprint Goals (Phase 2)

### Sprint 13 — `2026-04-13 → 2026-04-24` (closing now)

**Goal:** Land the Capacity-Planning report and the `authHeaders()` consolidation; ship dashboard v1.

| Story | Points | Status |
|---|---|---|
| E3 — `GET /api/reports/capacity-planning` (capped at 52 weeks) | 8 | **Done** (2026-04-23) |
| E3 — Reports tab UI (ComposedChart + horizon selector + CSV + role-level table) | 8 | **Done** |
| E3 — Capacity excludes soft-deleted projects | 3 | **Done** |
| H1 — Dashboard v1 (KPI tiles + status borders + Portfolio Health + Recent Activity demote) | 8 | **Done** |
| H1 — Period selector lock to "This Month" | 2 | **Done** |
| H1 — Remove `Math.min(100, …)` clamp | 1 | **Done** |
| A1 — `authHeaders()` helper + 22 hardcoded headers replaced across 6 pages | 5 | **Done** |
| Resources tab persistence to `localStorage` | 2 | **Done** |
| Remove empty `middlewares/` folder | 1 | **Done** |
| Docs refresh (this round) | 5 | **Done** |
| **Sprint total** | **43** | |

### Sprint 14 — `2026-04-27 → 2026-05-08`

**Goal:** Fix US-1 (project-detail TDZ); start density / scale redesign; first UX research sessions.

| Story | Points | Owner |
|---|---|---|
| C4 / L1 — US-1: project-detail TDZ fix + smoke test | 5 | Frontend |
| L4 — Density / scale redesign — sidebar + dashboard | 8 | Frontend + UX |
| L3 — US-11: global error toast/banner wired to React Query error handler | 5 | Frontend |
| L2 — §6.2 quick wins: status pills standardisation across pages | 5 | Frontend + UX |
| C5 — Replacement Request server-side gating for `autoAllocate` projects (start) | 3 | Backend |
| UX research — first 5 of 9 sessions; 5-second test prep | 5 | UX + PM |
| **Sprint total** | **31** | |

### Sprint 15 — `2026-05-11 → 2026-05-22`

**Goal:** Density rollout to projects + resources + reports; finish C5; finish UX research.

| Story | Points | Owner |
|---|---|---|
| L4 — Density rollout to projects, resources, reports tabs | 8 | Frontend + UX |
| L2 — §6.2 quick wins: smaller table row heights, consistent column widths | 5 | Frontend |
| C5 — Replacement Request server-side gating (finish + tests) | 3 | Backend + QA |
| E4 — Resource Requests inbox widget on the Resources page (start) | 5 | Frontend + Backend |
| UX research — sessions 6–9; diary study collection; synthesis start | 5 | UX + PM |
| **Sprint total** | **26** | |

### Sprint 16 — `2026-05-25 → 2026-06-05`

**Goal:** Finish E4 inbox widget; start E5 placeholder link; UX research synthesis output → backlog updates.

| Story | Points | Owner |
|---|---|---|
| E4 — Resource Requests inbox widget (finish) | 5 | Frontend |
| E5 — Per-placeholder "Find Team Member" inline link | 3 | Frontend |
| UI/UX audit §6.3 medium items — top 3 by observed friction | 8 | Frontend + UX |
| UX research — synthesis doc + re-prioritisation workshop output → docs 06, 10, 11 | 3 | PM + UX |
| **Sprint total** | **19** | |

### Sprint 17 — `2026-06-08 → 2026-06-19`

**Goal:** Phase-2 consolidation; Dashboard v2 design lock; security-scan playbook pre-release.

| Story | Points | Owner |
|---|---|---|
| H2 — Dashboard v2 design lock (period selector + per-role widgets) | 5 | UX + PM |
| H2 — Dashboard v2 backend (period server-side already accepts; widgets schema) | 5 | Backend |
| Security-scan playbook + dependency-audit pre-release | 3 | Tech Lead + Backend |
| Phase-2 release notes + documentation refresh | 3 | PM |
| Buffer for residual UI/UX audit items | 5 | Whole team |
| **Sprint total** | **21** | |

---

## 5. Definition of Ready (story enters sprint)

- Acceptance criteria written.
- Mocks attached for any UI work (UX).
- API surface specified in `lib/api-spec/openapi.yaml` for any backend work.
- RBAC middleware identified for any new write route.
- Audit-log emission identified for any new write path.
- Design tokens / component spec referenced for any new UI.

---

## 6. Definition of Done (story exits sprint)

See doc 11 §1. Summary:

- Acceptance criteria pass.
- RBAC + `logAudit()` + Zod validation on any new write surface.
- Codegen committed.
- `authHeaders()` used at every new SPA call-site.
- Type-check (`pnpm typecheck`) green.
- Audit-log row visible in Admin audit view.
- Revision log updated.

---

## 7. Sprint Artefacts

| Artefact | Owner | Where it lives |
|---|---|---|
| Sprint board | Delivery Lead | Project tracker |
| Sprint goals | PM | Sprint planning notes |
| Burn-down | Delivery Lead | Sprint review pack |
| Release notes | PM | `docs/operations/` (one file per phase) |
| Retro action items | Delivery Lead | Sprint retro doc; tracked to closure |

---

## 8. Risks & Mitigations (Phase 2)

| Risk | Mitigation |
|---|---|
| Density redesign regresses one page while improving another | Side-by-side test per page; UX-led review; rollback gate per page. |
| US-1 fix uncovers downstream issues on project-detail | QA smoke test extended; UI/UX audit §6.2 sequenced right after. |
| UX research findings invalidate dashboard v2 design | Ship period selector at minimum; defer per-role widgets if needed. |
| Capacity-Planning queries slow at 52 weeks | Already capped; monitor p95; add index if needed. |
| Off-cycle Sponsor request derails sprint scope | PM negotiates; Delivery Lead escalates if charter-impacting. |

---

## 9. Phase 1 Summary (Historic — for reference)

Phase 1 ran from January through mid-April 2026 across **12 two-week sprints** and delivered the MVP surface that is now in production:

| Phase 1 deliverable | Sprint window |
|---|---|
| Monorepo bootstrap; OpenAPI + codegen pipeline | S1 |
| Drizzle schema for users, accounts, projects | S2 |
| Express 5 + RBAC middleware + audit log | S3 |
| Tasks, phases, project members, baselines | S4 |
| Time entries + timesheets | S5 |
| Allocations + placeholders | S6 |
| Opportunities + auto-trigger to soft alloc | S7 |
| Change orders + milestone-complete → draft invoice | S8 |
| Rate cards + invoices + line items + revenue entries | S9 |
| Reports tab with first 5 reports | S10 |
| Resource requests + skills matrix | S11 |
| Client portal + CSAT + documents + Phase 1 stabilisation | S12 |

Phase 1 retro outputs were captured in the team's retrospective archive and informed the Phase-2 sprint shaping above.

---

## 10. Revision Log

| Date | Version | Changed By | What Changed |
|---|---|---|---|
| 2026-04-24 | 1.0 | Delivery Lead | Replaced template with the real Phase-2 sprint plan. Phase 1 (MVP) is complete; sprints 13–17 are scoped against Q2 2026 outcomes including the density redesign, UI/UX audit follow-ups, and the recently-shipped Capacity-Planning report. |
