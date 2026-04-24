# Product Roadmap — BusinessNow PSA

| | |
|---|---|
| **Product** | BusinessNow PSA |
| **Owner** | PM |
| **Version** | 1.0 — Approved |
| **Date** | 2026-04-24 |
| **Status** | Approved |

> Format: **NOW (in-flight) → NEXT (this quarter) → LATER (next 1–2 quarters) → BACKLOG / WATCHING.** Items are referenced from the audits in `docs/comprehensive-audit-2026-04.md` and `docs/ui-ux-audit-2026-04.md`, and from the open items in `docs/operations/15_risk_register.md`.

---

## 1. Theme Map (Q2 → Q4 2026)

| Theme | Why it matters | Status |
|---|---|---|
| **Density & scale** | Dense desktop UI is what KSAP staff actually use; current default zoom wastes pixels. | NOW |
| **Audit follow-ups** | Recent audits surfaced fixable defects; close them to maintain trust. | NOW |
| **Resource intelligence** | Capacity-Planning report unlocked a new question; deepen the answer. | NEXT |
| **Dashboard v2** | Period selector beyond "This Month"; widgets per role. | NEXT |
| **Auth modernisation** | Move from `x-user-role` header to SSO / OIDC. | LATER |
| **Read-side RBAC** | Row-level filtering on GETs for Viewer / Consultant. | LATER |
| **Reports scale** | If OLTP latency degrades, plan a warehouse offload. | WATCHING |

---

## 2. NOW — In flight (Q2 2026)

### 2.1 Density & scale redesign

- Reduce default UI scale from the current zoom; target ≥ 25 % more rows visible on a 1440-line desktop.
- Touched globally — sidebar, page padding, table row heights, KPI tile sizes.
- Done = no scroll on the dashboard at 1440×900 with no zoom; tables show ≥ 25 % more rows; no regression in the UI/UX audit's §6.1 baseline.

### 2.2 UI/UX audit follow-ups

- **US-1 (Critical)** — `project-detail.tsx` TDZ on `users` referenced before init. Fix in flight.
- **§6.2 quick wins** — smaller table row heights, consistent column widths, status pills standardised across pages.
- **US-11** — wire global error toast/banner so failed queries do not silently render empty lists.

### 2.3 Dashboard v1 polish

- Hero KPI tiles with status borders — **shipped**.
- Portfolio Health stacked bar — **shipped**.
- Recent Activity demoted to a 1/3-column right rail card — **shipped**.
- Period selector locked to "This Month"; Last 30 / Quarter / Year disabled pending v2 — **shipped**.
- `Math.min(100, …)` clamp on `teamUtilization` removed so the danger band is reachable — **shipped**.

### 2.4 `authHeaders()` consolidation

- Single helper for role propagation across all 6 page files (22 hardcoded headers replaced) — **shipped**.

### 2.5 Capacity-Planning report

- `GET /api/reports/capacity-planning?weeks=N` (capped at 52) with role-level surplus/deficit, CSV export — **shipped 2026-04-23**.

---

## 3. NEXT — This quarter (Q3 2026)

### 3.1 Dashboard v2

- Enable Last 30 / Quarter / Year period selector (server-side already accepts `period`).
- Per-role widget set (Finance dashboard variant emphasising rate cards / invoices / cash position).
- Done = period selector functional and persisted; PM / Finance / RM each see a tuned default widget set; analytics show ≥ 70 % retention vs v1.

### 3.2 Resource Requests inbox widget

- Surface unassigned demand directly on the Resources page (today it's only on the Capacity-Planning report tab).
- Done = inbox shows open requests by status, with quick-fulfil action; matches the approach the 2026-04-23 audit accepted as backlog.

### 3.3 Replacement-Request server-side gating for auto-allocate projects

- Block the request type on the API for projects flagged `autoAllocate` (today only the UI hides it).
- Done = `requirePM` write fails with 409 when conditions are met; tested.

### 3.4 Per-placeholder "Find Team Member" link

- Inline contextual entry into Find Availability from each placeholder row.
- Done = placeholder rows in Resources tabs gain a one-click link that pre-fills the search.

### 3.5 UI/UX audit §6.3 medium-priority items

- Whatever §6.3 has open after the §6.2 sweep — re-prioritised at sprint planning.

---

## 4. LATER — Next 1–2 quarters (Q4 2026 → Q1 2027)

### 4.1 SSO / OIDC

- Replace the `x-user-role` header with a verified role claim from KSAP's identity provider.
- `authHeaders()` becomes the SPA-side migration point; API gains a verified-role middleware.
- Out: 2FA (handled by IdP); rotating session tokens.

### 4.2 Row-level RBAC on GETs

- Filter list endpoints by the calling user when role is `Viewer` or `Consultant`.
- Open question: does Consultant see **all** projects they're allocated to, or only projects with active assignment?

### 4.3 FTE configurability

- Expose `time_settings` to make the 40 h/week assumption configurable per-tenant.
- Done = capacity calculations honour the configured weekly hours; default remains 40.

### 4.4 Mobile-friendly time entry

- Phone-acceptable time entry (not full mobile app) — quick-log a time entry from a phone.
- Out: full responsive rebuild; native app.

---

## 5. BACKLOG / WATCHING

| Item | Note |
|---|---|
| Reports → data-warehouse offload | Trip-wire is OLTP latency on Capacity Planning at 52 weeks. |
| Native mobile app | Out of charter. |
| Real-time collaboration on tasks | Not committed. |
| Externally hosted analytics warehouse | Not committed. |
| Built-in expense management | Out of charter. |
| Multi-tenant white-labelling | Out of charter. |
| Per-row CSV export limits | Probably never needed; OLTP exports are fine today. |

---

## 6. Recently Shipped (last 60 days)

| Item | When |
|---|---|
| `authHeaders()` helper across 6 page files (22 hardcoded headers replaced) | 2026-04 |
| Dashboard v1 (KPI tiles + status borders, Portfolio Health, Recent Activity 1/3 col) | 2026-04 |
| Removed `Math.min(100, …)` clamp on `teamUtilization` | 2026-04 |
| Period selector locked to "This Month" pending v2 | 2026-04 |
| Capacity-Planning endpoint + Reports tab + role-level surplus/deficit | 2026-04-23 |
| Capacity calculations exclude soft-deleted projects | 2026-04-23 |
| Resources page tab persistence (`localStorage["resources.activeTab"]`) | 2026-04-23 |
| Removed empty `middlewares/` folder | 2026-04 |

---

## 7. Themes Not on the Roadmap (and Why)

| Theme | Why it isn't here |
|---|---|
| Public marketing site | The platform is internal; no external buyers. |
| Multi-tenant | Charter constraint (single-tenant). |
| Native mobile | Charter constraint. |
| Built-in chat / messaging | Notification surface + KSAP's chat tool already cover this. |
| AI auto-staffing | Premature; capacity-planning report needs adoption time first. |

---

## 8. Roadmap Cadence & Governance

- **Bi-weekly** at sprint review, the PM moves items between NOW / NEXT / LATER as warranted.
- **Quarterly** the PM does a full refresh, syncs with doc 06 (PRD), doc 11 (Stories & Epics), and doc 14 (Sprint Plan).
- **Off-cycle update triggers**: any new committed initiative, scope change, or P1 incident.
- All changes are reflected in the revision log below and in the Risk Register if they shift exposure.

---

## 9. Revision Log

| Date | Version | Changed By | What Changed |
|---|---|---|---|
| 2026-04-24 | 1.0 | PM | Replaced template with the real BusinessNow PSA roadmap. NOW/NEXT/LATER reflect the in-flight density redesign, audit follow-ups, dashboard v1, and the recently-shipped capacity-planning report. |
