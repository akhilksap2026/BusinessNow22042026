# User Stories & Epics

| | |
|---|---|
| **Product** | [PRODUCT NAME] |
| **Owner** | [HEAD OF PRODUCT / NAME] |
| **Version** | v0.1 — Draft |
| **Last Updated** | [YYYY-MM-DD] |
| **Status** | Draft |

---

## 1. How to Use This Document

This document is the source of truth for **epics** and **user stories** that feed into sprint planning. Stories are owned by the PM, refined with engineering and design during grooming, and only pulled into a sprint after acceptance criteria, story points, and dependencies are agreed.

### Story format

Every user story follows the standard Agile template:

> **As a** [persona],
> **I want to** [action],
> **so that** [benefit].

### Definition of Done (DoD)

The following checklist applies to **every** user story before it can be marked **Done**:

- [ ] Code merged to `main` behind a feature flag (where applicable).
- [ ] Unit tests written and passing (coverage ≥ project threshold).
- [ ] Integration tests cover the new behaviour and edge cases.
- [ ] All acceptance criteria demonstrably met in a staging environment.
- [ ] Authorization, validation, and rate-limit rules enforced server-side.
- [ ] Audit-log entries emitted for all state-changing actions.
- [ ] Telemetry (events / metrics) added; dashboards updated where relevant.
- [ ] Accessibility checked against **WCAG 2.1 AA** for new UI.
- [ ] Internationalization keys externalised (no hard-coded user-facing strings).
- [ ] Documentation updated (in-app help, public docs, changelog).
- [ ] Product Manager sign-off recorded on the ticket.
- [ ] Released to production and verified post-deploy.

---

## 2. Epics Overview

| Epic ID | Epic Name | Description | Priority | Owner | Status | Estimated Stories |
|---|---|---|---|---|---|---|
| **EP-001** | Onboarding & Authentication | Sign-up, login, SSO, email verification, invite flow. | P0 | [PM NAME] | In progress | 5 |
| **EP-002** | Core [Feature A] — `[RESOURCE_A]` Management | Create / view / edit / archive primary domain entities. | P0 | [PM NAME] | In progress | 4 |
| **EP-003** | Core [Feature B] — `[RESOURCE_B]` Management | Create / assign / reorder / complete child entities. | P0 | [PM NAME] | In progress | 4 |
| **EP-004** | User Settings & Profile | Personal profile, password, notification preferences, sessions. | P1 | [PM NAME] | Planned | 4 |
| **EP-005** | Billing & Subscriptions | Plan selection, payment method, invoices, seat management. | P0 | [PM NAME] | In progress | 4 |
| **EP-006** | Reporting & Analytics | Dashboards, exports, and admin-facing usage analytics. | P1 | [PM NAME] | Planned | 4 |

---

## 3. Detailed User Stories by Epic

---

### EP-001: Onboarding & Authentication

#### US-001: User registration

- **As a** [new USER]
- **I want to** register with my email and a password
- **So that** I can access [PRODUCT NAME]
- **Acceptance Criteria:**
  - [ ] AC1: A unique email + valid password creates an account and sends a verification email.
  - [ ] AC2: Re-registering with an existing email returns a friendly "sign in instead" message (no enumeration leak).
  - [ ] AC3: Password must meet the documented policy (length, character classes, breached-password check).
  - [ ] AC4: A successful registration redirects the user to the email-verification screen.
- **Priority:** P0
- **Story Points:** 3
- **Dependencies:** None
- **Notes:** Throttle by IP and email; lock account after [N] consecutive failed attempts.

#### US-002: Email verification

- **As a** [new USER]
- **I want to** verify my email address via a one-time link
- **So that** [PRODUCT NAME] knows my email is real before I can take destructive actions
- **Acceptance Criteria:**
  - [ ] AC1: A verification link valid for **[24 hours]** is emailed on registration.
  - [ ] AC2: Clicking the link marks the user as verified and signs them in.
  - [ ] AC3: An expired link offers a one-click resend without re-entering credentials.
  - [ ] AC4: Unverified users cannot perform any write action and see a persistent banner with a resend link.
- **Priority:** P0
- **Story Points:** 2
- **Dependencies:** US-001
- **Notes:** Emails delivered via [EMAIL PROVIDER]; bounces flagged in admin tools.

#### US-003: SSO login

- **As a** [new or returning USER]
- **I want to** sign in with [GOOGLE / MICROSOFT] SSO
- **So that** I don't have to remember another password
- **Acceptance Criteria:**
  - [ ] AC1: SSO buttons appear on login and registration; flow completes without leaving the browser tab.
  - [ ] AC2: First-time SSO users have an account auto-provisioned into the matching organization (if invited) or land in org creation.
  - [ ] AC3: Returning SSO users land on the dashboard.
  - [ ] AC4: SSO failures show a clear, actionable error and offer email/password fallback.
- **Priority:** P0
- **Story Points:** 5
- **Dependencies:** US-001
- **Notes:** SAML SSO is **out of scope** for this story (tracked in EPIC-006 of the roadmap).

#### US-004: Forgotten password

- **As a** [USER]
- **I want to** reset my password via a one-time link
- **So that** I can regain access to my account if I forget it
- **Acceptance Criteria:**
  - [ ] AC1: Requesting a reset always returns the same response, regardless of whether the email exists.
  - [ ] AC2: Reset links expire in **[60 minutes]** and are single-use.
  - [ ] AC3: Successful reset invalidates all existing sessions and refresh tokens.
  - [ ] AC4: New password must meet the documented policy.
- **Priority:** P0
- **Story Points:** 3
- **Dependencies:** US-001
- **Notes:** Notify the user by email on successful reset.

#### US-005: Invite teammates by email

- **As an** [ADMIN]
- **I want to** invite teammates to my organization by email with a chosen role
- **So that** they can collaborate inside our workspace
- **Acceptance Criteria:**
  - [ ] AC1: Admin selects a role (`admin`, `member`, `viewer`) at invite time.
  - [ ] AC2: Invitees receive an email with a tokenised link valid for **[7 days]**.
  - [ ] AC3: Accepting the invite lands the user in the correct organization with the assigned role.
  - [ ] AC4: An invite is single-use; reuse or expiry shows a clear error and offers re-request.
- **Priority:** P0
- **Story Points:** 3
- **Dependencies:** US-001, US-002
- **Notes:** Audit-log entries on invite sent / accepted / revoked.

---

### EP-002: Core [Feature A] — `[RESOURCE_A]` Management

#### US-006: Create a `[RESOURCE_A]`

- **As a** [TEAM MEMBER]
- **I want to** create a new `[RESOURCE_A]` with a name, description, and status
- **So that** I have a place to organize related work
- **Acceptance Criteria:**
  - [ ] AC1: A modal accepts name (required), description (optional), and initial status.
  - [ ] AC2: On save, the user lands on the new `[RESOURCE_A]` detail page.
  - [ ] AC3: An audit-log entry is recorded with actor and payload.
  - [ ] AC4: Validation errors are shown inline; submit is disabled until the form is valid.
- **Priority:** P0
- **Story Points:** 3
- **Dependencies:** US-001
- **Notes:** Default status = `draft`.

#### US-007: List and filter `[RESOURCE_A]`

- **As a** [TEAM MEMBER]
- **I want to** view a list of all `[RESOURCE_A]` I can access, with search, filter, and sort
- **So that** I can quickly find what I need
- **Acceptance Criteria:**
  - [ ] AC1: List paginates at **[25]** rows per page; defaults to most-recent activity.
  - [ ] AC2: Filter by status; search by name; sort by name, created date, or last activity.
  - [ ] AC3: Archived items are hidden by default and can be revealed with a toggle.
  - [ ] AC4: Empty state offers a primary "Create [RESOURCE_A]" CTA.
- **Priority:** P0
- **Story Points:** 5
- **Dependencies:** US-006
- **Notes:** Respect tenant isolation; never return rows from another organization.

#### US-008: Edit a `[RESOURCE_A]`

- **As an** [ADMIN] **or owner of the** `[RESOURCE_A]`
- **I want to** edit the name, description, status, and metadata
- **So that** I can keep it accurate as work evolves
- **Acceptance Criteria:**
  - [ ] AC1: Inline edits save on blur with optimistic UI.
  - [ ] AC2: Concurrent edits to the same field show a last-write-wins notice.
  - [ ] AC3: Audit-log entries record before/after values.
  - [ ] AC4: Members and viewers see a read-only UI.
- **Priority:** P0
- **Story Points:** 3
- **Dependencies:** US-006
- **Notes:** Status transitions are validated server-side.

#### US-009: Archive and restore a `[RESOURCE_A]`

- **As an** [ADMIN]
- **I want to** archive a `[RESOURCE_A]` and later restore it
- **So that** I can clean up the workspace without losing data
- **Acceptance Criteria:**
  - [ ] AC1: Archive sets `deleted_at` and removes the item from default views.
  - [ ] AC2: Restore is admin-only and clears `deleted_at`.
  - [ ] AC3: Archived items remain readable in audit-log entries and exports.
  - [ ] AC4: Hard delete after **[N days]** is performed by a scheduled job, with notice surfaced in the UI.
- **Priority:** P1
- **Story Points:** 3
- **Dependencies:** US-006
- **Notes:** Cascade behaviour for child `[RESOURCE_B]` is documented in the data model.

---

### EP-003: Core [Feature B] — `[RESOURCE_B]` Management

#### US-010: Create a `[RESOURCE_B]` inside a `[RESOURCE_A]`

- **As a** [TEAM MEMBER]
- **I want to** add a `[RESOURCE_B]` to a `[RESOURCE_A]`
- **So that** I can capture and track a unit of work
- **Acceptance Criteria:**
  - [ ] AC1: Title is required; description, assignee, and due date are optional.
  - [ ] AC2: Default status = `todo`.
  - [ ] AC3: New items appear at the top of the parent's list with smooth animation.
  - [ ] AC4: Audit-log entry recorded with actor and payload.
- **Priority:** P0
- **Story Points:** 3
- **Dependencies:** US-006
- **Notes:** Inline "quick add" supported from the parent list view.

#### US-011: Assign and reassign a `[RESOURCE_B]`

- **As a** [TEAM MEMBER]
- **I want to** assign or reassign a `[RESOURCE_B]` to a teammate
- **So that** ownership is explicit
- **Acceptance Criteria:**
  - [ ] AC1: Assignee picker shows only members of the current organization.
  - [ ] AC2: New assignee receives an in-app notification within 5 seconds.
  - [ ] AC3: Reassignment is allowed and recorded in the audit log.
  - [ ] AC4: Removing an assignee is supported and recorded.
- **Priority:** P0
- **Story Points:** 2
- **Dependencies:** US-010
- **Notes:** Email notification is sent based on the assignee's preferences.

#### US-012: Reorder `[RESOURCE_B]` within a `[RESOURCE_A]`

- **As a** [TEAM MEMBER]
- **I want to** drag-and-drop `[RESOURCE_B]` to reorder them
- **So that** I can express priority visually
- **Acceptance Criteria:**
  - [ ] AC1: Drag-and-drop updates the `position` field and persists on drop.
  - [ ] AC2: Order is consistent across users and sessions.
  - [ ] AC3: Keyboard reordering is available for accessibility.
  - [ ] AC4: Reorder events are throttled to avoid excessive write traffic.
- **Priority:** P1
- **Story Points:** 5
- **Dependencies:** US-010
- **Notes:** Use a fractional-index strategy to avoid mass renumbering.

#### US-013: Bulk update `[RESOURCE_B]`

- **As an** [ADMIN]
- **I want to** select multiple `[RESOURCE_B]` and apply a status change, assignment, or delete
- **So that** I can manage them efficiently at scale
- **Acceptance Criteria:**
  - [ ] AC1: Selection persists across pagination within a single session.
  - [ ] AC2: Bulk action confirms before executing; destructive actions require typed confirmation.
  - [ ] AC3: A summary toast reports per-item success/failure counts.
  - [ ] AC4: Audit-log entry recorded per affected item.
- **Priority:** P1
- **Story Points:** 5
- **Dependencies:** US-010, US-011
- **Notes:** Bulk delete capped at **[N]** items per request; larger batches queued.

---

### EP-004: User Settings & Profile

#### US-014: Edit personal profile

- **As a** [USER]
- **I want to** update my display name, avatar, and timezone
- **So that** my account reflects who I am and surfaces times correctly
- **Acceptance Criteria:**
  - [ ] AC1: Avatar upload accepts JPG/PNG up to **[2 MB]**, cropped to a square.
  - [ ] AC2: Display name is required; timezone defaults to the browser's value on first load.
  - [ ] AC3: Changes persist immediately and propagate to mentions and activity feeds.
  - [ ] AC4: Validation errors are shown inline.
- **Priority:** P1
- **Story Points:** 2
- **Dependencies:** US-001
- **Notes:** Strip EXIF metadata from uploaded images.

#### US-015: Change password

- **As a** [USER]
- **I want to** change my password from the settings page
- **So that** I can rotate it on my own schedule
- **Acceptance Criteria:**
  - [ ] AC1: Current password is required.
  - [ ] AC2: New password must meet the documented policy.
  - [ ] AC3: All other active sessions are invalidated on success.
  - [ ] AC4: User receives a confirmation email.
- **Priority:** P1
- **Story Points:** 2
- **Dependencies:** US-001
- **Notes:** Disabled for SSO-only accounts with a clear message.

#### US-016: Manage notification preferences

- **As a** [USER]
- **I want to** choose which events notify me in-app, by email, or not at all
- **So that** I'm not overwhelmed by noise
- **Acceptance Criteria:**
  - [ ] AC1: Per-channel toggles for assignments, mentions, status changes, and digests.
  - [ ] AC2: Daily-digest send time respects the user's timezone.
  - [ ] AC3: Preferences are versioned; new event types default to "in-app on, email off".
  - [ ] AC4: Changes apply within 60 seconds of save.
- **Priority:** P1
- **Story Points:** 3
- **Dependencies:** US-014
- **Notes:** Future channels (Slack, Teams) reuse this surface.

#### US-017: View and revoke active sessions

- **As a** [USER]
- **I want to** see my active sessions and sign out of any of them
- **So that** I can secure my account if I lose a device
- **Acceptance Criteria:**
  - [ ] AC1: List shows device, location (approx), and last-active time.
  - [ ] AC2: User can sign out a single session or "all other sessions" in one click.
  - [ ] AC3: Revocation invalidates the matching refresh token immediately.
  - [ ] AC4: An audit-log entry is recorded for each revocation.
- **Priority:** P1
- **Story Points:** 3
- **Dependencies:** US-001
- **Notes:** Reuses the auth-token revocation primitives.

---

### EP-005: Billing & Subscriptions

#### US-018: Choose a plan and start a subscription

- **As an** [ADMIN]
- **I want to** select a paid plan and add a payment method
- **So that** my organization can use the paid features
- **Acceptance Criteria:**
  - [ ] AC1: Plan selector lists Free, Pro, Business with feature highlights.
  - [ ] AC2: Card or wallet payment is collected via [PAYMENTS PROVIDER]'s secure surface (no PAN touches our servers).
  - [ ] AC3: On success, the org is upgraded immediately and a receipt is emailed.
  - [ ] AC4: Failures show a clear error and preserve form state.
- **Priority:** P0
- **Story Points:** 5
- **Dependencies:** US-001
- **Notes:** Sandbox plans available in non-prod environments.

#### US-019: Add, remove, and reassign seats

- **As an** [ADMIN]
- **I want to** add or remove seats and reassign them to teammates
- **So that** I'm only paying for the access we actually use
- **Acceptance Criteria:**
  - [ ] AC1: Seat changes are previewed with prorated cost before confirm.
  - [ ] AC2: Removing a seat from a user converts them to "viewer" until reassigned.
  - [ ] AC3: Adding seats is reflected within the user-management UI immediately.
  - [ ] AC4: Audit-log entries recorded for each change.
- **Priority:** P0
- **Story Points:** 5
- **Dependencies:** US-018
- **Notes:** Webhook from [PAYMENTS PROVIDER] reconciles state nightly.

#### US-020: View invoices and download receipts

- **As an** [ADMIN]
- **I want to** see all past invoices and download PDFs
- **So that** I can submit them for reimbursement and record-keeping
- **Acceptance Criteria:**
  - [ ] AC1: Invoices list shows date, amount, status, and download link.
  - [ ] AC2: PDFs include billing entity details and line items.
  - [ ] AC3: Filter by year and status.
  - [ ] AC4: Pagination at **[25]** rows per page.
- **Priority:** P1
- **Story Points:** 3
- **Dependencies:** US-018
- **Notes:** PDFs generated by [PAYMENTS PROVIDER]; cache locally for [N days].

#### US-021: Cancel or downgrade a subscription

- **As an** [ADMIN]
- **I want to** cancel my subscription or downgrade to a lower plan
- **So that** I'm in control of spend
- **Acceptance Criteria:**
  - [ ] AC1: Cancellation takes effect at period end; user retains access until then.
  - [ ] AC2: Downgrade preview clearly lists features/seats that will be lost.
  - [ ] AC3: A short, optional cancellation-reason survey is captured.
  - [ ] AC4: Reactivation within the grace period restores the previous state with no data loss.
- **Priority:** P0
- **Story Points:** 5
- **Dependencies:** US-018
- **Notes:** Failed-payment dunning flows are tracked separately.

---

### EP-006: Reporting & Analytics

#### US-022: View an organization-level activity dashboard

- **As an** [ADMIN]
- **I want to** see a dashboard of activity across `[RESOURCE_A]` and `[RESOURCE_B]`
- **So that** I can understand how the team is using [PRODUCT NAME]
- **Acceptance Criteria:**
  - [ ] AC1: Default view shows last **30 days** with comparison to the prior period.
  - [ ] AC2: Charts include active users, items created, items completed, and overdue items.
  - [ ] AC3: Filters by date range and `[RESOURCE_A]` are available.
  - [ ] AC4: P95 page load < **2.5 s**.
- **Priority:** P1
- **Story Points:** 8
- **Dependencies:** US-006, US-010
- **Notes:** Powered by aggregated reads; no raw-row exposure.

#### US-023: View per-user productivity report

- **As an** [ADMIN]
- **I want to** see per-user activity and completion rates
- **So that** I can support people who appear stuck and recognise contributors
- **Acceptance Criteria:**
  - [ ] AC1: Table lists users with assigned, completed, and overdue counts.
  - [ ] AC2: Drill-down opens a filtered list of the underlying items.
  - [ ] AC3: Data respects deletion / soft-delete rules.
  - [ ] AC4: Sortable by any column.
- **Priority:** P2
- **Story Points:** 5
- **Dependencies:** US-022
- **Notes:** Hidden from non-admin roles by default.

#### US-024: Export data as CSV

- **As an** [ADMIN]
- **I want to** export `[RESOURCE_A]` and `[RESOURCE_B]` data as CSV
- **So that** I can analyse it in external tools
- **Acceptance Criteria:**
  - [ ] AC1: Export is asynchronous; user is notified when the file is ready.
  - [ ] AC2: Files include all columns the user can see in the UI; PII is included only if the user has access.
  - [ ] AC3: Download links expire after **[7 days]**.
  - [ ] AC4: An audit-log entry records who exported what and when.
- **Priority:** P1
- **Story Points:** 5
- **Dependencies:** US-006, US-010
- **Notes:** Exports rate-limited per user.

#### US-025: View audit log with filters

- **As an** [ADMIN]
- **I want to** view and filter the audit log
- **So that** I can investigate changes and demonstrate compliance
- **Acceptance Criteria:**
  - [ ] AC1: Filters: actor, entity type, entity ID, action, date range.
  - [ ] AC2: Pagination at **[50]** rows per page; cursor-based for stability.
  - [ ] AC3: Export to CSV available for the last **[90 days]**.
  - [ ] AC4: Logs are read-only; no edit/delete actions are exposed.
- **Priority:** P1
- **Story Points:** 5
- **Dependencies:** US-006, US-010, US-018
- **Notes:** Long-term retention is governed by the data-retention policy.

---

## 4. Backlog Items (Future Consideration)

Ideas captured but not yet groomed into stories. They will be sized and prioritised in upcoming refinement sessions.

- Workflow automations: triggers, conditions, and actions (no-code).
- Templates library and shareable templates marketplace.
- Public REST API (read first, write next) with documented rate limits.
- Webhooks v2 with signed delivery and per-subscription retries.
- Slack / Teams two-way integration with slash commands.
- Native mobile apps (iOS / Android).
- Custom roles and granular permission editor.
- SAML SSO for enterprise customers.
- Regional data residency (EU + US) with per-tenant placement.
- AI-assisted summaries and next-step suggestions on `[RESOURCE_A]`.
- In-app commenting + mentions on `[RESOURCE_B]`.
- Public sharing of read-only `[RESOURCE_A]` views.
- White-label / custom-domain hosting for customer tenants.
- Two-factor authentication via TOTP and WebAuthn / passkeys.
- Bring-your-own-key (BYOK) encryption for enterprise.

---

## 5. Story Sizing Reference

We size stories on a **modified Fibonacci scale**. Sizes reflect *complexity, risk, and unknowns* — not strictly hours.

| Points | Complexity | Time Estimate (guideline) |
|---|---|---|
| 1 | Trivial — well-understood, isolated change. | < 0.5 day |
| 2 | Simple — small surface, one file/component, low risk. | 0.5–1 day |
| 3 | Moderate — touches a couple of layers; some review needed. | 1–2 days |
| 5 | Notable — cross-cutting; some unknowns; needs design + review. | 2–4 days |
| 8 | Large — multiple components; meaningful design decisions. | 4–7 days |
| 13 | Very large — likely needs to be split before pulling into a sprint. | > 1 week (split it!) |

> Stories estimated above 8 should be split during refinement. Anything 13+ is considered too risky to commit to in a single sprint.

---

## 6. Sprint Assignment Suggestion

A representative slicing assuming a **2-week sprint** and a steady velocity of **~25 points / sprint**. Adjust based on actual team capacity.

| Sprint | Stories | Goal |
|---|---|---|
| Sprint 1 | US-001, US-002, US-004 | Auth foundations: a user can register, verify, and recover. |
| Sprint 2 | US-003, US-005 | SSO + invites: teams can form and onboard end-to-end. |
| Sprint 3 | US-006, US-007, US-008 | `[RESOURCE_A]` create / list / edit. |
| Sprint 4 | US-009, US-010, US-011 | Archival + first `[RESOURCE_B]` flows. |
| Sprint 5 | US-012, US-013 | Drag-to-reorder + bulk actions for `[RESOURCE_B]`. |
| Sprint 6 | US-018, US-019 | Plan selection and seat management — start of monetisation. |
| Sprint 7 | US-020, US-021, US-014, US-015 | Invoices + cancellation + profile + password. |
| Sprint 8 | US-016, US-017, US-025 | Notification prefs, sessions, and audit-log UI. |
| Sprint 9 | US-022, US-024 | Activity dashboard + CSV exports. |
| Sprint 10 | US-023 + buffer / hardening | Per-user reporting and pre-GA hardening sprint. |
