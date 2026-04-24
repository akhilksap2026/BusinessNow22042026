# UX Research Brief — BusinessNow PSA (Q2 2026)

| | |
|---|---|
| **Product** | BusinessNow PSA |
| **Owner** | UX Lead |
| **Version** | 1.0 — Approved |
| **Date** | 2026-04-24 |
| **Status** | Approved |

> This brief frames the **current** UX research round, which has two objectives that lock together: validate the **density / scale redesign** without regressing the dashboards and tables, and prioritise the remaining **UI/UX audit follow-ups** (`docs/ui-ux-audit-2026-04.md`) by the friction they actually cause. Recruiting is **internal-only** — KSAP staff in the relevant roles.

---

## 1. Background

BusinessNow PSA is a dense, desktop-first internal platform. The 2026-04 UI/UX audit and the 2026-04-23 functional audit produced a prioritised fix list. Two recent changes — **dashboard v1** and the **`authHeaders()` consolidation** — cleared the way for a deeper density pass without risking regressions in role-based behaviour. We now need user-grounded evidence on:

1. **Where density helps** vs **where it hurts** (e.g. KPI tile shrink may help the projects table but hurt the dashboard).
2. **Which audit items to do first** based on the friction users actually experience (audit severity is our prior; observed friction is the trump).

---

## 2. Research Questions

| # | Question | Why we're asking |
|---|---|---|
| RQ1 | Where do PMs / consultants / Resource Managers / Finance lose the most minutes per day in the current UI? | Re-baselines the UI/UX audit prioritisation with observed cost-of-delay. |
| RQ2 | Does the proposed density redesign improve or hurt task completion on the dashboard, projects list, resources tabs, time entry, and reports? | Direct validation of the in-flight design work. |
| RQ3 | Are the dashboard v1 KPI tiles (with status borders) read correctly by leadership at-a-glance, including the "danger" band (now reachable post-clamp removal)? | Validates the central design decision. |
| RQ4 | Is the period selector ("This Month" only in v1) **felt** as a constraint, or does the existing period match how users actually think? | De-risks dashboard v2 scope. |
| RQ5 | Does the Capacity-Planning report change how RM / leadership answer "do we have the people?" (was multi-day, now meant to be < 1 minute)? | Quantifies the most recent shipped feature. |
| RQ6 | What does the project-detail page need to look like once US-1 (TDZ crash) is fixed, given the audit's broader observations on that page? | Sequences C4 → §6.2 → §6.3 work. |
| RQ7 | Is the role switcher discoverable for users with secondary roles, or do they forget they can switch? | Validates the role model UX. |
| RQ8 | Where in the UI do failed queries silently render an empty list (US-11 is the wiring story; we need the prioritised inventory)? | Closes a class of trust-eroding bugs. |

---

## 3. Hypotheses

| Hypothesis | If true, we'll… |
|---|---|
| H1 — A 25 % density increase improves PM and RM tasks by ≥ 15 % time-on-task, with no regression on Finance/Leadership. | Ship the density default. |
| H2 — Status-border "danger" tiles are missed by leadership in passing scans. | Add motion or count badge in v2. |
| H3 — Most users don't miss the period selector beyond "This Month" — it's leadership only. | De-prioritise dashboard v2 period work behind per-role widgets. |
| H4 — Capacity-Planning report cuts time-to-answer by >5×. | Promote it on the Resources page (Epic E4). |
| H5 — US-1 fix alone takes the project-detail page from "broken" to "usable but slow". | Sequence §6.2 quick wins right after US-1. |
| H6 — The role switcher is forgotten by ~30 % of users with secondary roles. | Add a contextual nudge on first under-privileged action. |
| H7 — At least 4 page-level lists silently swallow errors. | Wire US-11 with a target list, not a generic global handler. |

---

## 4. Methods

| Method | Sample | What it measures |
|---|---|---|
| **Moderated usability sessions** (60 min, screen share) | 2 PMs · 2 consultants · 2 Resource Managers · 2 Finance users · 1 leadership stakeholder = **9 sessions** | RQ1, RQ2, RQ4, RQ6, RQ7. Tasks scripted per role. |
| **Five-second test on dashboard v1 KPI tiles** | 8 leadership / management staff | RQ3 — at-a-glance comprehension; danger-band recall. |
| **Diary study (1 week)** | 4 consultants, 2 PMs | RQ1, RQ8. Self-reported friction; screenshots of empty/error states they hit. |
| **Capacity-Planning before/after timing** | 3 RMs / leadership | RQ5 — wall-clock time to answer "do we have the people for [X]?". |
| **Analytics passive read** | All users | Period selector usage (will be zero except for "This Month" by construction); page-level error rates; tab persistence on Resources. |

---

## 5. Tasks (moderated sessions)

The same **role-specific** task list runs for the current build and the density-redesign prototype.

### PM script

1. Open the dashboard. Tell me, without scrolling, the three things you'd act on today.
2. Find a project that's currently At Risk and explain why.
3. From the project, raise a Change Order with a +$10k revenue delta.
4. Approve a pending timesheet for one of your team.
5. Raise a Replace request for a consultant rolling off in 4 weeks.

### Consultant script

1. Log time for yesterday across two projects.
2. Submit this week's timesheet.
3. Open "my allocations" and find the project with the most hours next week.
4. File a 2-day time-off request next month.

### Resource Manager script

1. Open the Capacity-Planning report. Answer: in 6 weeks' time, do we have the people for a +3 FTE engagement?
2. Find a placeholder that has been open ≥ 2 weeks and assign a real person.
3. Approve / reject the oldest open resource request.

### Finance script

1. From the dashboard, open the CR-Impact card and explain what it tells you.
2. Find the most recent draft invoice (auto-generated from a milestone) and review it.
3. Update the rate card for one of the job roles.

### Leadership script (5-second test + 5-min interview)

1. (5-second) — show dashboard. Ask: what stands out?
2. Ask: which of these tiles is currently in danger?
3. Open the Portfolio Health bar and walk me through the three buckets.

---

## 6. Recruiting

- **Internal-only.** No external recruiting; all participants are KSAP staff in the relevant roles.
- The PM coordinates with team leads to release time for sessions.
- No incentive (internal users); thank-you note from the GM.

---

## 7. Logistics

| Item | Plan |
|---|---|
| Sessions | Remote, screen share, recorded with consent (KSAP-internal storage). |
| Prototype | Density-redesign branch deployed to the staging Replit URL with role switcher. |
| Diary study | Lightweight Slack DM thread per participant + shared screenshot folder. |
| Analytics | Standard product analytics already in place; new events for period selector, Capacity-Planning load, and page-level error renders. |
| Note-taking | UX Lead + 1 PM observer per session. |
| Synthesis | Affinity diagram on a shared canvas; one summary doc per RQ. |

---

## 8. Timeline

| Week | Work |
|---|---|
| Week 1 | Recruit; finalise task scripts; deploy density prototype to staging. |
| Week 2 | Run 5 of 9 moderated sessions; start diary study; run 5-second test. |
| Week 3 | Run remaining 4 sessions; finish diary study; collect Capacity-Planning timings. |
| Week 4 | Synthesis; prioritisation workshop with PM + UX Lead + Tech Lead; output → updates to docs 06, 10, 11 and Risk Register entries. |

---

## 9. Success Criteria for the Round

- All 9 moderated sessions completed.
- 5-second test ≥ 8 responses.
- Diary study ≥ 4 of 6 participants completed the full week.
- Each of RQ1–RQ8 has a written, evidenced answer in the synthesis doc.
- The hypotheses in §3 are each marked **Confirmed**, **Refuted**, or **Inconclusive** with the evidence cited.
- Concrete output: a re-prioritised list of UI/UX audit items by **observed friction × audit severity**, fed into doc 11.

---

## 10. What This Round is Not

- Not a generative discovery round — we are validating known designs and prioritising known gaps.
- Not external usability — there are no external customers in scope.
- Not a perf benchmark — perf is tracked separately.
- Not a survey — per-user qualitative depth matters more than n.

---

## 11. Risks to the Round

| Risk | Mitigation |
|---|---|
| Internal participants under-report friction (politeness bias). | Diary study + analytics counter the in-session bias. |
| Density prototype regresses something we don't notice. | Side-by-side with current build per script; analytics rate of error renders. |
| RM availability for Capacity-Planning timing low. | Backstop with 1 leadership timing if RM count slips below 2. |

---

## 12. Revision Log

| Date | Version | Changed By | What Changed |
|---|---|---|---|
| 2026-04-24 | 1.0 | UX Lead | Replaced template with the real Q2 2026 research brief targeting density redesign + audit prioritisation, with internal-only recruiting. |
