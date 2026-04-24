# UX Research Brief

| | |
|---|---|
| **Research Phase** | Prototype Validation |
| **Product** | [PRODUCT NAME] |
| **UX Lead** | [NAME] |
| **Dates** | [START DATE] — [END DATE] |
| **Version** | v0.1 — Draft |
| **Status** | Draft |

---

## 1. Research Objectives

**Primary objective:** Validate that the [PRODUCT NAME] prototype enables our target users to complete the core workflow successfully and confidently before we commit engineering effort to full build-out.

### Secondary objectives

- Identify the highest-friction moments in **onboarding** and **first-use**.
- Test whether the proposed information architecture and core navigation match users' mental models.
- Surface unmet needs and competitive comparisons that should influence the MVP scope.
- Establish a usability baseline (task success, time-on-task, SUS) to compare against future iterations.

### Key questions this research must answer

1. Can a new user complete onboarding and reach first value within **[10 minutes]** without assistance?
2. Do users understand the purpose of **`[RESOURCE_A]`** and **`[RESOURCE_B]`** as named in the prototype?
3. Where do users hesitate, ask "what does this do?", or attempt the wrong action?
4. Do users naturally find settings, invitations, and account-management surfaces when they need them?
5. How do users describe the value of the product in their own words — does it match our positioning?
6. What workflows / tools would [PRODUCT NAME] need to replace or coexist with for them to adopt it?
7. Are there perceived blockers (security, pricing, integrations, missing features) that would stop a purchase decision?
8. What is the System Usability Scale (SUS) score, and how does it compare to the **[≥ 70]** target?

---

## 2. Research Methods

| Method | Participants | Duration | Tools | Owner |
|---|---|---|---|---|
| Moderated usability testing (1:1, remote) | **[8]** per segment | **60 min** | [Figma prototype] + [VIDEO CALL TOOL] + [SESSION RECORDING TOOL] | [UX Researcher] |
| Semi-structured user interviews | **[6]** per segment | **45 min** | [VIDEO CALL TOOL] + [TRANSCRIPTION TOOL] | [UX Researcher] |
| Quantitative survey (post-test + cold) | **[≥ 80]** total | **8–10 min** | [SURVEY TOOL] | [UX Researcher] |
| Analytics & funnel review of prototype clicks | All test sessions | Async | [PROTOTYPE ANALYTICS / HOTJAR] | [Product Analyst] |
| Competitive heuristic walk-through | n/a | 1 day per competitor | [Competitor accounts] + Nielsen 10 heuristics | [UX Lead] |

---

## 3. Participant Criteria

### Target profile

- **Role:** [OPERATIONS MANAGER / TEAM LEAD] (primary), [INDIVIDUAL CONTRIBUTOR] (secondary)
- **Industry:** [INDUSTRY / VERTICAL]
- **Company size:** **[50–500]** employees (with a smaller **[10–50]** secondary cohort)
- **Geography:** [NORTH AMERICA + UK / EU]
- **Tech familiarity:** Daily user of at least **[2]** modern SaaS tools ([CRM / WORKSPACE / COMMS])

### Inclusion criteria

- Currently responsible for, or actively involved in, [CORE WORKFLOW] at least weekly.
- Has authority or influence over tool selection or daily use.
- Comfortable using web-based tools without IT assistance.
- English-speaking (for this round).

### Exclusion criteria

- Works at [PRODUCT NAME], a direct competitor, or a parent/subsidiary thereof.
- Participated in a prior [PRODUCT NAME] research session in the last **[60 days]** (avoid bias).
- Works in market research, design consulting, or competitive intelligence (professional respondent risk).
- Cannot complete the session on a desktop/laptop (mobile-only is out of scope this round).

### Number of participants

- **n = [8] per primary segment** (moderated usability) → [16] sessions across primary + secondary.
- **n = [6] per segment** for in-depth interviews → [12] sessions.
- **n ≥ [80] total** for the quantitative survey.

### Recruitment plan

- **Channels:** [RESEARCH RECRUITER, e.g. UserInterviews / Respondent.io], waitlist signups, customer-of-record referrals from design partners, targeted [LINKEDIN] outreach.
- **Incentive:** **[$100]** gift card per usability/interview session; **[$10]** gift card for survey completers (capped at **[100]**).
- **Screener:** **[10–12]** questions in [SCREENER TOOL]; aim for **[3:1]** screen-to-book ratio.
- **Scheduling:** Self-serve booking via [CALENDAR TOOL] inside the screener confirmation.

---

## 4. Prototype Testing Plan

### Tasks to observe

Each participant attempts the tasks below in order, thinking aloud. Moderator does **not** assist unless the participant is stuck for more than **2 minutes** or becomes frustrated.

1. **Task 1 — Complete onboarding.** Starting from the signup screen, create an account, set up an organization, and reach the dashboard.
2. **Task 2 — Perform the core action.** Create a `[RESOURCE_A]`, add at least two `[RESOURCE_B]` to it, assign one to a teammate, and mark one complete.
3. **Task 3 — Find settings.** Locate where you would change your notification preferences and your timezone.
4. **Task 4 — Invite a team member.** Invite a teammate by email with the role you think most appropriate.
5. **Task 5 (stretch) — Understand pricing.** Find the pricing page, identify which plan you would choose for a team of [25], and explain why.

### Metrics captured per task

- **Completion rate** — *Completed unaided / Completed with help / Did not complete.*
- **Time-on-task** — measured from "Begin" to first observable success state.
- **Error rate** — count of misclicks, wrong-path attempts, or undo actions per task.
- **Confidence rating** — post-task self-rating (1–5): "How confident are you that you completed this correctly?"
- **System Usability Scale (SUS)** — administered at the end of the session; target **≥ 70**.
- **Verbatim quotes** — captured against tagged moments for the affinity map.

### Scoring rubric

| Outcome | Definition |
|---|---|
| **Pass — unaided** | Participant completes the task without prompts or hints. |
| **Pass — with prompt** | Completed after one moderator hint or after rereading on-screen guidance. |
| **Fail — assisted recovery** | Completed only after explicit moderator help. |
| **Fail — abandoned** | Participant gave up or could not proceed within the time limit. |

---

## 5. Interview Discussion Guide

### 5.1 Intro script

> "Thanks for joining us today. I'm [NAME] from [PRODUCT NAME]. We're testing an early prototype, so we're looking for your honest reactions — including the things that don't work. There are no right or wrong answers, and you can't break anything. With your permission, we'll record the session for our notes only; nothing will be shared externally. Ready to begin?"

### 5.2 Warm-up questions (≈ 5 min)

1. Tell me a little about your role and the team you work with day-to-day.
2. Walk me through the last time you did [CORE WORKFLOW]. What tools did you use?
3. What part of that process is most frustrating, and what's actually working well?

### 5.3 Core questions (≈ 30 min, interleaved with the prototype tasks)

1. When you see the dashboard for the first time, what do you think this product is for?
2. In your own words, what is a `[RESOURCE_A]`? What about a `[RESOURCE_B]`?
3. If you were going to roll this out to your team next week, what's the first thing you'd want to do? What's the first thing you'd be nervous about?
4. Where in this product would you go to [SPECIFIC ACTION — e.g. change billing details]? Why there?
5. Looking at this screen, what would you click first, and what do you expect to happen?
6. Compared to what you use today, what would [PRODUCT NAME] need to do to be a clear improvement?
7. Are there any words, labels, or icons here that confuse you or that you'd describe differently?
8. If your manager asked, "should we adopt this?", what would your honest answer be — and what would change your mind?

### 5.4 Closing questions (≈ 5 min)

1. If you could change one thing about the product right now, what would it be?
2. Is there anything we didn't ask about that you think we should know?
3. Would you be open to participating again in a future round, including a paid pilot if relevant?

---

## 6. Success Metrics for Research

| Metric | Threshold | Current Estimate |
|---|---|---|
| Task 1 (Onboarding) — unaided completion rate | **≥ 80%** | [TBD — baseline this round] |
| Task 2 (Core action) — unaided completion rate | **≥ 75%** | [TBD] |
| Task 3 (Find settings) — unaided completion rate | **≥ 85%** | [TBD] |
| Task 4 (Invite teammate) — unaided completion rate | **≥ 90%** | [TBD] |
| Median time-on-task — Onboarding | **≤ 10 minutes** | [TBD] |
| Median time-on-task — Core action | **≤ 5 minutes** | [TBD] |
| System Usability Scale (SUS) | **≥ 70** | [TBD] |
| Post-test confidence (avg, 1–5) | **≥ 4.0** | [TBD] |
| Post-test "would recommend" (yes / probably) | **≥ 70%** | [TBD] |
| Critical (severity 1) usability issues identified and triaged | **100%** triaged within **[5] business days** | [TBD] |
| Recruitment fill rate (booked / target) | **≥ 95%** within window | [TBD] |

---

## 7. Deliverables

- [ ] Research report (executive summary, methodology, findings, recommendations).
- [ ] Usability issues log — prioritised by severity (S1–S4) with screenshots and timestamps.
- [ ] Affinity map of qualitative insights (digital board in [WHITEBOARD TOOL]).
- [ ] Top-insights deck — **5–7 slides** designed for a leadership audience.
- [ ] Recommended changes — backlog-ready items with proposed priority and effort estimate.
- [ ] Highlight reel — short clip of representative user moments per major finding.
- [ ] Updated personas and journey maps reflecting validated learnings.
- [ ] Raw artefacts archive — recordings, transcripts, survey CSV, and screener results stored in [RESEARCH REPOSITORY].

---

## 8. Timeline

| Phase | Activity | Owner | Date |
|---|---|---|---|
| Plan | Brief approval & discussion-guide review | [UX Lead] + PM | [DATE] |
| Plan | Prototype freeze for testing build | [Design Lead] | [DATE] |
| Recruit | Screener live; bookings open | [UX Researcher] | [DATE] |
| Recruit | Recruitment complete; sessions scheduled | [UX Researcher] | [DATE] |
| Pilot | Pilot sessions ([2]) and guide adjustments | [UX Researcher] | [DATE] |
| Field | Moderated usability sessions | [UX Researcher] | [START DATE] — [END DATE] |
| Field | Interviews | [UX Researcher] | [START DATE] — [END DATE] |
| Field | Survey live | [UX Researcher] | [START DATE] — [END DATE] |
| Analyse | Tagging, affinity mapping, severity scoring | [UX Researcher] + [Designer] | [DATE] |
| Synthesise | Draft findings & recommendations | [UX Lead] | [DATE] |
| Share | Stakeholder readout & deck | [UX Lead] | [DATE] |
| Close | Backlog handoff & archive | [UX Lead] + PM | [DATE] |

---

## 9. Stakeholder Review

| Stakeholder | Role in this research | Reviews | When |
|---|---|---|---|
| [Head of Product] | Decision-maker on scope changes from findings. | Draft report & top-insights deck. | T+[2] business days after fieldwork ends. |
| [Head of Design] | Owns design responses to usability issues. | Issues log + recommended changes. | Same day as report draft. |
| [Engineering Lead] | Sizes recommended changes; flags feasibility. | Recommended changes + affinity themes. | T+[3] business days. |
| [PM — Onboarding squad] | Owns onboarding-related actions. | Task 1 & 2 findings. | At findings readout. |
| [PM — Core squad] | Owns core-workflow actions. | Task 2 & 3 findings. | At findings readout. |
| [GTM / Marketing Lead] | Validates positioning and messaging signal. | Verbatims + positioning insights. | At findings readout. |
| [CEO / Executive Sponsor] | Confirms go/no-go to proceed to MVP build. | Top-insights deck (5–7 slides). | T+[5] business days. |

**Readout cadence:**
- **Daily:** Quick async note in `#ux-research` summarising the day's sessions and any critical (S1) issues.
- **Mid-fieldwork checkpoint:** 30-minute sync at the halfway point to flag emerging themes early.
- **Final readout:** 60-minute live session with all stakeholders; recording and deck distributed within 24 hours.
- **Decision log:** Every accepted recommendation is logged in the product backlog with a link back to this brief and to the supporting evidence.
