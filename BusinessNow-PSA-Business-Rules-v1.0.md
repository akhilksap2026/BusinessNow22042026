# BusinessNow PSA — Business Rules v1.0

**Platform:** BusinessNow PSA (KSAP Technology)
**Document version:** 1.0
**Date:** May 2026

---

## Table of Contents

1. [Roles & Access Control](#1-roles--access-control)
2. [Account-Level Permissions](#2-account-level-permissions)
3. [Project-Level Permissions](#3-project-level-permissions)
4. [Project Rules](#4-project-rules)
5. [Task & Phase Rules](#5-task--phase-rules)
6. [Time Entry Rules](#6-time-entry-rules)
7. [Timesheet Lifecycle Rules](#7-timesheet-lifecycle-rules)
8. [Timesheet Escalation Rules](#8-timesheet-escalation-rules)
9. [Effort Overrun Detection](#9-effort-overrun-detection)
10. [Time-Off Rules](#10-time-off-rules)
11. [Allocation & Resource Rules](#11-allocation--resource-rules)
12. [Invoice & Financial Rules](#12-invoice--financial-rules)
13. [Revenue Recognition Rules](#13-revenue-recognition-rules)
14. [Contract Rules](#14-contract-rules)
15. [Change Order Rules](#15-change-order-rules)
16. [Audit Log Rules](#16-audit-log-rules)
17. [Notification Rules](#17-notification-rules)
18. [Self-Approval Prohibition](#18-self-approval-prohibition)
19. [Pagination Rules](#19-pagination-rules)
20. [Data Integrity Rules](#20-data-integrity-rules)

---

## 1. Roles & Access Control

### 1.1 Canonical Role Model

The platform uses four canonical roles. All legacy role strings are normalized to these four on every request.

| Canonical Value | Level | Description |
|-----------------|-------|-------------|
| `account_admin` | 4 | Full access to all surfaces including account settings, cost rates, and user management. |
| `super_user` | 3 | Broad access to all project work surfaces. Cannot manage core account settings or view raw cost rates. |
| `collaborator` | 2 | Limited internal user. Can view and contribute to assigned projects. Cannot create projects or access admin surfaces. |
| `customer` | 1 | External read-only user. Blocked from every internal API route (HTTP 403 globally). |

### 1.2 Legacy Role Mapping

Legacy role strings (used in older records or by external systems) are normalized automatically to their canonical equivalent via `resolveRole()`.

| Legacy Role(s) | Resolves To |
|----------------|-------------|
| `Admin` | `account_admin` |
| `PM`, `Super User`, `Finance`, `Developer`, `Designer`, `QA`, `Project Manager`, `Resource Manager`, `Solutions Architect`, `Change Management Lead` | `super_user` |
| `Collaborator`, `Viewer`, `Consultant`, `Business Analyst`, `Data Engineer`, `Integration Engineer`, `QA Engineer` | `collaborator` |
| `Customer`, `Partner` | `customer` |

### 1.3 Customer Role Global Block

The `customer` role is blocked globally at the API router level. Any request arriving with role `customer` (or legacy `Customer`/`Partner`) receives **HTTP 403** regardless of the endpoint. There is no opt-out.

### 1.4 Project-Level Role Resolution

Within a project, users have a project role (`admin`, `collaborator`, `customer`). The account role acts as a ceiling:

- `account_admin` or `super_user` → always `admin` on every project.
- `collaborator` → uses their assigned project role (`collaborator` or `customer`). Cannot be promoted to project `admin`.
- `customer` → always `customer` on every project; cannot be promoted.

### 1.5 Role Transport

Every API request must include:
- `x-user-role` header — the role string (legacy or canonical).
- `x-user-id` header — the numeric user ID.

Requests missing `x-user-id` return **HTTP 401**. Requests where the supplied `x-user-role` is not in the user's assigned role set return **HTTP 403** (enforced by `roleClaim` middleware).

---

## 2. Account-Level Permissions

Evaluated against the user's global canonical role. `Y` = permitted, `N` = denied.

| Permission | account_admin | super_user | collaborator | customer |
|---|:---:|:---:|:---:|:---:|
| **Projects** | | | | |
| projects.create | Y | Y | N | N |
| projects.view | Y | Y | Y | N |
| projects.edit | Y | Y | N | N |
| projects.delete | Y | Y | N | N |
| projects.archive.view | Y | Y | N | N |
| projects.invite.team | Y | Y | Y | N |
| projects.invite.customer | Y | Y | Y | N |
| projects.setVisibility | Y | Y | N | N |
| projects.addPartners | Y | Y | N | N |
| **Tasks** | | | | |
| tasks.create | Y | Y | Y | N |
| tasks.view | Y | Y | Y | N |
| tasks.edit | Y | Y | Y | N |
| tasks.delete | Y | Y | Y | N |
| tasks.convertToMilestone | Y | Y | N | N |
| tasks.markPrivate | Y | Y | Y | N |
| **Accounts (CRM)** | | | | |
| accounts.view | Y | Y | Y | N |
| accounts.create | Y | Y | N | N |
| accounts.edit | Y | Y | N | N |
| accounts.delete | Y | Y | N | N |
| accounts.merge | Y | Y | N | N |
| **Templates** | | | | |
| templates.create | Y | Y | N | N |
| templates.manage | Y | Y | N | N |
| **Reports** | | | | |
| reports.view / viewStandard | Y | Y | N | N |
| reports.viewCustom | Y | N | N | N |
| reports.createCustom | Y | N | N | N |
| **Settings** | | | | |
| settings.manageTeam | Y | Y | N | N |
| settings.manageRoles | Y | Y | N | N |
| settings.manageBilling | Y | Y | N | N |
| settings.manageIntegrations | Y | N | N | N |
| settings.manageAdvanced | Y | N | N | N |
| **Time Tracking** | | | | |
| timeTracking.view | Y | Y | Y | N |
| timeTracking.submit | Y | Y | Y | N |
| timeTracking.approve | Y | Y | N | N |
| timeTracking.viewAll | Y | Y | N | N |
| timeTracking.logForOthers | Y | Y | N | N |
| **Resources** | | | | |
| resources.viewPlans | Y | Y | Y | N |
| resources.manageAllocations | Y | Y | N | N |
| resources.capacityPlanning | Y | Y | N | N |
| resources.raiseRequests | Y | Y | N | N |
| resources.approveRequests | Y | Y | N | N |
| **Financials** | | | | |
| financials.viewBudgets | Y | Y | Y | N |
| financials.viewRateCards | Y | Y | N | N |
| financials.viewCostRates | Y | N | N | N |
| financials.manageRateCards | Y | N | N | N |
| financials.viewProfitMargins | Y | N | N | N |
| **Invoicing** | | | | |
| invoicing.view | Y | Y | N | N |
| invoicing.create | Y | Y | N | N |
| invoicing.approve | Y | Y | N | N |
| invoicing.void | Y | Y | N | N |
| **CRM — Prospects & Opportunities** | | | | |
| prospects.view / manage | Y | Y | N | N |
| opportunities.view / manage | Y | Y | N | N |
| **Time Off** | | | | |
| timeOff.viewAll | Y | Y | N | N |
| timeOff.manageCalendars | Y | N | N | N |
| **Revenue** | | | | |
| revenue.view / manage | Y | Y | N | N |
| **System** | | | | |
| notifications.inject | Y | Y | N | N |
| webhooks.view / manage | Y | N | N | N |
| marketplace.manage | Y | N | N | N |

---

## 3. Project-Level Permissions

Evaluated against the user's resolved project role (`admin`, `collaborator`, `customer`).

| Permission | admin | collaborator | customer |
|---|:---:|:---:|:---:|
| **Project Management** | | | |
| project.changeName / changeDates / changeOwner / changeChampion | Y | N | N |
| project.updateCustomFields | Y | N | N |
| project.setVisibility / updateStatus / delete | Y | N | N |
| project.addVendorMembers | Y | Y | N |
| project.addCustomerMembers | Y | Y | Y |
| project.removeSelf | Y | Y | Y |
| project.removeVendor | Y | N | N |
| project.removeCustomer | Y | N | Y |
| **Phases** | | | |
| phase.create / updateStatus / updateDates / delete | Y | N | N |
| phase.createPrivate | Y | N | N |
| phase.viewPrivate | Y | Y | N |
| phase.addTask | Y | Y | N |
| **Tasks** | | | |
| task.create / updateFields / delete / updateCustomFields | Y | Y | Y |
| task.createPrivate | Y | Y | N |
| task.convertToMilestone | Y | N | N |
| **Milestones** | | | |
| milestone.updateFields | Y | Y | N |
| milestone.delete / convertToTask | Y | N | N |
| milestone.rate (CSAT) | N | N | Y |
| milestone.viewRating | Y | Y | N |
| **Status Updates** | | | |
| status.createShared / createPrivate / publish | Y | Y | Y (shared only) |
| **Spaces** | | | |
| space.create / delete | Y | Y | Y |
| space.createPrivate | Y | Y | N |

---

## 4. Project Rules

### 4.1 Project Status

Valid statuses: `Not Started`, `In Progress`, `At Risk`, `On Hold`, `Completed`.

- A `Completed` project blocks further time entry submissions and new allocations (unless an admin override header is provided).
- A soft-deleted project (`deleted_at` set) blocks all mutations unconditionally — no admin override applies.

### 4.2 Project Archiving

- Archiving sets `deleted_at` to the current timestamp (soft delete).
- Archive is undoable for a short window via `POST /api/projects/:id/restore` (undo toast UI).
- Bulk archive follows the same rule; each project is individually restorable.

### 4.3 Project Membership

Project membership is tracked via the `allocations` table (`userId` + `projectId`). There is no stored membership array on the project or user record. Removing the last allocation for a user from a project removes their access.

### 4.4 Opportunity → Project Conversion

A project can only be created from an Opportunity that is in `Won` status. Converting sets the project's linked `accountId` from the opportunity's account.

---

## 5. Task & Phase Rules

### 5.1 Phases are Tasks

Phases are level-1 tasks with `isPhase = true`. There is no separate phases table. Phase-specific operations (create, update dates/status, delete) require `admin` project role.

### 5.2 Task Hours Model

Each task carries three hour fields:
- `plannedHours` — original estimate (budget baseline).
- `estimateHours` — current revised estimate (EAC).
- Actual hours are computed from approved time entries (never stored directly on the task).

### 5.3 Effort Overrun

When actual logged hours reach **90%** of `plannedHours`, the project PM receives a single `effort_overrun` notification. The alert fires once per task lifetime (`overrunAlertSentAt` stamp prevents repeats). See [Section 9](#9-effort-overrun-detection).

### 5.4 Bulk Task Updates

Bulk status/field changes require `super_user` or above. Each task in the bulk request is updated individually; partial failure does not roll back successful updates.

---

## 6. Time Entry Rules

### 6.1 Numeric Validation

| Field | Rule | HTTP Error |
|-------|------|------------|
| `hours` | Must be `> 0` and `<= 24` per entry | 400 |
| Invoice `amount` | Must be `>= 0` | 400 |
| Invoice `tax` | Must be `>= 0` | 400 |
| Change order `amount` | Must be `>= 0` | 400 |
| Change order `additionalHours` | Must be `>= 0` | 400 |

### 6.2 Daily Cap (Soft Guard)

Configurable `maxDailyHours` (default uncapped). If a new entry would push a user's total for that calendar day above the cap, the request is rejected with **HTTP 409** (soft guardrail — shown as a warning that the user must acknowledge).

### 6.3 Weekend / Holiday Guard

Entries logged against a weekend date or a date that falls within the user's assigned holiday calendar are blocked unless the user explicitly acknowledges the warning.

### 6.4 Inactive Project Block

Logging time against a `Completed` or soft-deleted project is blocked with **HTTP 403**. Admin override does not bypass this for deleted projects.

### 6.5 Duplicate Detection

Duplicate entries (same user, same date, same task) are flagged as a soft warning. The user must confirm intent before the entry is saved.

### 6.6 Billable Anomaly Check

A billable anomaly check (`POST /api/ai/billable-anomaly-check`) uses AI to evaluate whether time entries marked billable appear inconsistent with the task or project context. Results are advisory only; they do not block submission.

### 6.7 Logging on Behalf of Others

A `super_user` or `account_admin` may create time entries for a different `userId` (the `timeTracking.logForOthers` permission). Collaborators may only log against their own `userId`.

### 6.8 Invoiced Entry Lock

A time entry linked to an active (non-void) invoice cannot be moved to a different project. Attempting this returns **HTTP 409**.

---

## 7. Timesheet Lifecycle Rules

### 7.1 Status Machine

```
Draft → Submitted → Approved
         ↓             ↓
        Draft        Submitted (unapprove)
```

- **Submit** (Draft → Submitted): Any authenticated internal user can submit their own timesheet. Minimum/maximum hours gates apply (configurable in `time_settings`).
- **Approve** (Submitted → Approved): Requires `super_user` or above. Self-approval is unconditionally blocked (**HTTP 403**).
- **Reject** (Submitted → Draft): Requires `super_user` or above. A non-empty rejection note is mandatory (**HTTP 400** if omitted).
- **Unapprove** (Approved → Submitted): Allowed for `super_user` or above; re-arms escalation logic (clears `escalatedAt`).
- **Withdraw** (Submitted → Draft via PATCH): Wrapped in a database transaction; re-reads status inside the transaction to prevent race conditions. Clears `submittedAt`, `submittedById`, and `escalatedAt`.

Every status transition resets `escalatedAt` to NULL so escalation re-arms correctly on resubmission.

### 7.2 Governance Locks

| Lock Type | Condition | Override |
|-----------|-----------|---------|
| Approval lock | Timesheet is `Approved` and governance lock-on-approval is enabled | `account_admin` only |
| Date-based lock | Entry date is on or before `lockBeforeDate` | Configurable override roles in `time_settings` |

Attempts to edit or change status on locked timesheets return **HTTP 423**.

### 7.3 Hours Gates

- `minSubmitHours` (default 0): Submission blocked with **HTTP 400** if total hours are below this threshold.
- `maxSubmitHours` (configurable): Submission blocked with **HTTP 400** if total hours exceed this threshold.

### 7.4 Rate Snapshot Concurrency

When a timesheet is approved, billing rates are snapshotted into `time_entries.appliedBillRate`. This operation is wrapped in a database transaction with a PostgreSQL advisory lock (`pg_advisory_xact_lock`) keyed on `timesheetId`. This prevents concurrent approve handlers from double-writing rates. Per-row updates use `isNull(appliedBillRate)` as an additional safeguard.

### 7.5 Bulk Approve

`POST /api/timesheets/bulk-approve` and `POST /api/time-entries/bulk-approve` return a breakdown:
- `approved` — count of successfully approved items.
- `skippedSelf` — items the actor cannot approve because they own them (self-approval rule).
- `skippedOther` — items skipped for other reasons (already approved, locked, etc.).

Self-approval entries are silently skipped; they do not abort the batch. The legacy `skipped` field is preserved on the timesheet bulk-approve response for backward compatibility.

### 7.6 Import from Allocations

`POST /api/timesheets/import-allocations` pre-populates a Draft timesheet with time entries inferred from the user's active allocations for the week. Existing entries are not overwritten.

### 7.7 Copy Last Week

A "Copy last week" function in the timesheet grid fetches all entries from the previous calendar week and re-creates them on the corresponding day of the current week. Entries belonging to a locked week are skipped.

---

## 8. Timesheet Escalation Rules

### 8.1 Trigger

A daily cron (runs at **09:00** in the organisation's configured timezone) scans for timesheets in `Submitted` status whose `submittedAt` is older than the configured stale threshold.

### 8.2 Stale Threshold

Configured in `time_settings.escalation_days_after` (default **5 days**). Setting this value to `0` or less disables escalation entirely.

### 8.3 Manager Notification

When a stale timesheet is found:
1. The timesheet submitter's `managerId` is read from the `users` table.
2. If no `managerId` is set, escalation is skipped for that timesheet (no fallback to an org-wide admin).
3. A `timesheet_escalation` notification is created for the manager.
4. `timesheets.escalatedAt` is stamped to prevent re-notification on subsequent cron runs.

### 8.4 Re-arming

Any status transition (approve, unapprove, reject, withdraw, resubmit) resets `escalatedAt` to NULL. A withdrawn-and-resubmitted timesheet will trigger escalation again if it remains stale.

---

## 9. Effort Overrun Detection

### 9.1 Trigger

Runs automatically after `POST /api/timesheets/:id/approve` (fire-and-forget — never blocks the HTTP response).

### 9.2 Threshold

**90%** of `plannedHours` (`OVERRUN_ALERT_THRESHOLD = 0.9`). Tasks with no `plannedHours` set (null or 0) are excluded from the check.

### 9.3 Notification

- One `effort_overrun` notification is sent to the project PM (project `ownerId`).
- `tasks.overrunAlertSentAt` is stamped immediately after the notification is created.
- Subsequent approvals will not re-trigger the alert for the same task — the stamp is permanent for the task's lifetime.

### 9.4 Scope

The check covers all tasks referenced by time entries in the approved timesheet. Each task is evaluated independently.

---

## 10. Time-Off Rules

### 10.1 Submission

Any internal user (`collaborator` or above) may submit a time-off request for themselves. The request carries a `startDate`, `endDate`, and optional notes.

### 10.2 Approval / Rejection Scoping

Only two actors may approve or reject a time-off request:
1. The requester's assigned `managerId`.
2. A user with `account_admin` role.

A `super_user` who is not the requester's manager is rejected with **HTTP 403**.

### 10.3 Self-Approval Block

A user cannot approve or reject their own time-off request regardless of role (**HTTP 403**).

### 10.4 Holiday Conflict Guard

If every calendar day within the requested date range is already a holiday in the user's assigned holiday calendar, the request is rejected with **HTTP 409** (requesting leave on days that are already off is not permitted).

### 10.5 Allocation Conflict (Post-Approval)

After a time-off request is approved, the system runs a conflict check (fire-and-forget):
1. Finds all hard allocations (`isSoftAllocation = false`) for the user where the allocation date range overlaps the approved leave.
2. For each conflict:
   - Creates a `leave_allocation_conflict` notification for the project PM.
   - Sets `allocation.status = 'at_risk'`.
3. No automatic cancellation or reassignment occurs — human review is mandatory.

### 10.6 Visibility

- Collaborators can view only their own time-off requests (`timeOff.viewAll = false`).
- `super_user` and `account_admin` can view all requests company-wide.

---

## 11. Allocation & Resource Rules

### 11.1 Capacity Calculation

Daily capacity for a user = `user.capacity / 5` (weekly capacity divided by 5 working days).

### 11.2 Over-Allocation Guard

Before creating a hard allocation (`isSoftAllocation = false`), the system checks every working day (Monday–Friday) in the allocation date range:
- Working days exclude public holidays in the user's assigned holiday calendar and any approved time-off.
- If `existingAllocatedHours + requestedHours > dailyCapacity` on any single day, the request is rejected with **HTTP 409** (`error: "over_allocation"`).

Override: `account_admin` or `super_user` may pass `forceOverride: true` with a mandatory `overrideReason`. The override is logged to the audit trail.

### 11.3 Soft Allocations

Soft allocations (`isSoftAllocation = true`) bypass the over-allocation guard and are not considered in conflict checks with time-off requests. They are treated as provisional bookings only.

### 11.4 Skill Validation

When `requiredSkillId` and `requiredProficiencyLevel` are provided on an allocation:
- The system validates that the assigned user holds the skill at or above the required proficiency.
- Mismatch returns **HTTP 422** with `error: "skill_mismatch"`.
- Override: pass `skillOverrideReason`; the override is logged to the audit trail.

### 11.5 Project Timeline Guard

If a project's `startDate` or `dueDate` is updated and existing hard allocations fall outside the new range, those allocations are marked `needs_review` and the project PM is notified.

### 11.6 Allocation Status Values

| Status | Meaning |
|--------|---------|
| _(null)_ | Normal active allocation |
| `at_risk` | Overlapping approved time-off detected — human review required |
| `needs_review` | Project dates changed; allocation may be out of range |

### 11.7 Capacity Preview

`POST /api/allocations/preview` returns projected utilisation percentages per week for a proposed allocation without committing any changes. The UI displays green (≤80%), amber (81–100%), or red (>100%) indicators.

### 11.8 Resource Requests

Resource requests follow the statuses: `Pending` → `Approved` → `Filled` / `Blocked`. Approving a resource request does not automatically create an allocation — that step is manual.

---

## 12. Invoice & Financial Rules

### 12.1 Invoice ID Format

Invoice IDs follow the format `INV-YYYY-NNN` (e.g., `INV-2026-001`). This is the primary key — it is a text field, not a numeric sequence.

### 12.2 Invoice State Machine

Valid status transitions:

| From | To (allowed) |
|------|-------------|
| `Draft` | `In Review`, `Void` |
| `In Review` | `Approved`, `Draft`, `Void` |
| `Approved` | `Sent`, `In Review`, `Void` |
| `Sent` | `Paid`, `Overdue`, `Void` |
| `Paid` | `Void` |
| `Overdue` | `Void` |
| `Void` | _(terminal — no further transitions)_ |

Attempts to make an invalid transition return **HTTP 422**.

### 12.3 Automatic Overdue Transition

Invoices in `Sent` status with a `dueDate` in the past are automatically transitioned to `Overdue` during list and view operations. This is a read-time side effect — no explicit cron is required.

### 12.4 Tax Calculation

If a `taxCodeId` is provided when creating or updating an invoice, the tax amount is auto-computed as `amount × taxCode.rate`. Explicitly supplied tax values take precedence.

### 12.5 Numeric Floors

- `amount` must be `>= 0`.
- `tax` must be `>= 0`.
- Payment amounts must be `> 0`.

Violations return **HTTP 400**.

### 12.6 Void Restrictions

Voiding an invoice that has associated time entries in an approved timesheet does not re-open or unlock those time entries. The invoice link on those entries is preserved for audit purposes.

---

## 13. Revenue Recognition Rules

Revenue entries are associated with a project and represent monthly recognized amounts. They are managed manually (no automated recognition engine). The Finance module displays a running total vs. contract value. Only `super_user` and above can view or manage revenue entries.

---

## 14. Contract Rules

- Contracts are linked to a project via `project_id` (cascades on project delete).
- Each project may have multiple contracts.
- Contract fields: name, status, start/end dates, value, document URL, and notes.
- No automated enforcement is applied to contract dates or values — they are informational records.

---

## 15. Change Order Rules

### 15.1 Numeric Floors

- `amount` must be `>= 0`.
- `additionalHours` must be `>= 0`.

### 15.2 Self-Approval Block

A user cannot approve a change order they created. **HTTP 403** is returned.

### 15.3 Idempotency

Re-approving an already-approved change order does not create a duplicate record or a second audit entry. The operation is a no-op if the current status is already `Approved`.

### 15.4 Budget Ledger

The `budget_entries` table maintains a ledger for each project with two entry types:
- `SOW` — Statement of Work baseline. At most one SOW entry per project (partial unique index enforces this).
- `Adjustment` — Any subsequent budget adjustment (change orders, scope changes). Multiple allowed.

---

## 16. Audit Log Rules

### 16.1 Mandatory Audit on Key Mutations

The following actions are always logged to the audit trail:

- Project created, updated, status changed, deleted.
- Task created, updated, deleted.
- Invoice status changed.
- Timesheet submitted, approved, rejected.
- Change order approved.
- Allocation skill override used.
- Role switches (`POST /api/audit/role-switch`).

### 16.2 Valid Action Enum

The `action` field accepts only:

```
"created" | "updated" | "deleted" | "status_changed" | "submitted" | "approved" | "rejected"
```

Any other value will fail schema validation at the database layer.

### 16.3 Audit Log Visibility

Audit log is visible to `account_admin` only (Admin module).

---

## 17. Notification Rules

### 17.1 Notification Types

| Type | Trigger |
|------|---------|
| `effort_overrun` | Task actual hours reach 90% of planned hours (on timesheet approval) |
| `leave_allocation_conflict` | Approved time-off overlaps a hard allocation |
| `timesheet_escalation` | Submitted timesheet stale beyond the configured SLA threshold |

### 17.2 Deduplication

- `effort_overrun` — one per task lifetime (`overrunAlertSentAt` stamp).
- `timesheet_escalation` — one per Submitted cycle (`escalatedAt` stamp; resets on status change).
- `leave_allocation_conflict` — one per allocation per approved leave request (no dedup across separate approvals).

### 17.3 Notification Injection

Users with `notifications.inject` permission (`super_user` or above) may create notifications targeting any `userId` directly via the API.

---

## 18. Self-Approval Prohibition

Self-approval is blocked across all approval workflows. The rule is enforced at the API layer regardless of the user's role:

| Entity | Error |
|--------|-------|
| Timesheet | HTTP 403 — actor `userId` equals timesheet `userId` |
| Time entry (bulk approve) | Silently skipped; counted in `skippedSelf` |
| Change order | HTTP 403 — actor `userId` equals change order creator |
| Time-off request | HTTP 403 — actor `userId` equals requester `userId` |
| Resource request | HTTP 403 — actor `userId` equals requester |

---

## 19. Pagination Rules

Pagination is opt-in via `?limit` and `?offset` query parameters on list endpoints (`GET /projects`, `/accounts`, `/time-entries`, `/allocations`).

| Parameter | Default | Maximum | Behaviour on invalid input |
|-----------|---------|---------|---------------------------|
| `limit` | 100 | 500 | Garbage values fall back to default (100); values > 500 are clamped to 500 |
| `offset` | 0 | — | Must be a non-negative integer |

When `limit` or `offset` is supplied, the response is wrapped in a pagination envelope:

```json
{
  "data": [...],
  "total": 142,
  "limit": 50,
  "offset": 0
}
```

When neither parameter is supplied, the response is a plain array (backward-compatible).

---

## 20. Data Integrity Rules

### 20.1 Strict Request Body Parsing

POST and PATCH handlers use `.strict()` Zod schema parsing. Any unrecognized fields in the request body return **HTTP 400**. This prevents silent field injection.

### 20.2 Timestamp Handling

All timestamp columns return `Date` objects from the ORM. These are always converted to ISO 8601 strings before being included in API responses. Callers must not assume a raw `Date` type.

### 20.3 Tracked Hours Computation

The `trackedHours` field on a project is not stored as a column. It is computed from the `time_entries` table on each read using a batched aggregate query. All project read paths must explicitly pass the computed value through.

### 20.4 Foreign Key Integrity

All foreign key relationships are enforced at the database level. There are no orphaned FK references in the current schema.

### 20.5 Process-Level Error Handling

The API server registers handlers for both `unhandledRejection` and `uncaughtException` at process startup. These log the error and allow the process manager to restart the service. A global Express error handler is also mounted as the last middleware in `app.ts`.

---

*End of document — BusinessNow PSA Business Rules v1.0*
