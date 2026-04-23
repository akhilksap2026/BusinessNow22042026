# Time Tracking Module — Enhanced MVP Requirements & Replit Build Prompt

> **Source Reference:** Rocketlane Time Tracking Documentation  
> **Document Purpose:** Define what a Time Tracking module must include, how it should flow, and provide an incremental Replit-ready build prompt for an enhanced MVP.

---

## Part 1: What a Time Tracking Software Must Include

### 1.1 Core Concepts

A time tracking module exists to help teams — especially service-based businesses — record time spent on work, classify it as billable or non-billable, submit it for approval, and use it for project reporting and client invoicing.

**Key actors:**
- **Team Member / Submitter** — logs time, submits timesheets
- **Manager / Approver** — reviews, approves, or rejects timesheets
- **Admin** — configures settings, manages users, overrides locks

---

### 1.2 Configuration & Setup

The system must be configurable before any team member starts logging time.

| Setting | Purpose |
|---|---|
| Enable/Disable time tracking | Global toggle per account |
| Team member capacity (hrs/week) | Sets baseline for utilization calculation |
| Working days | Defines which days count for capacity |
| Timesheet due day & time | Weekly submission deadline |
| Automated reminders | Pre- and post-due-date nudges to submitters |
| Time entry categories | Classify type of work (e.g., Development, Consulting) |
| Approval settings | Who approves — project owner, designated approver, or admin |
| Hours per timesheet (min/max) | Enforce reporting completeness |
| Lock settings | Prevent edits post-approval or before a set lock date |
| Timesheet exclusion list | Exempt specific users from submission requirements |
| Rejected hours toggle | Control whether rejected entries impact project metrics |

---

### 1.3 Time Entry — What Users Can Log Against

A time entry must be linkable to:

- **A project task** (structured work)
- **An ad hoc activity** (unplanned/ad hoc work, linked or unlinked to a project)
- **A non-project activity** (internal admin, training, etc.)

Each time entry must capture:

| Field | Notes |
|---|---|
| Date | Which day the work happened |
| Hours | Duration in hours/minutes |
| Project | Which project it belongs to |
| Task / Phase / Milestone | Granular work item within the project |
| Category | Type of work classification |
| Billable flag | Yes/No — critical for invoicing |
| Notes | Free-text description of work done |
| Submission status | Draft → Submitted → Approved / Rejected |

---

### 1.4 Timesheet View (Weekly Grid)

The primary interface for team members is a **weekly timesheet** — a grid where:

- Rows = tasks or activities
- Columns = days of the week
- Cells = hours entered per day

Users can:
- Add tasks from existing projects (filtered by status: In Progress, Completed, All)
- Add activities (with name, project, category, billable flag)
- Click any day cell to enter hours
- Submit the entire week for approval
- Withdraw and re-submit if changes are needed (before approval)

---

### 1.5 Approval Workflow

The approval flow must support:

```
[Draft] → [Submitted] → [Approved]
                      → [Rejected] → [Withdrawn] → [Re-submitted] → [Approved]
```

**Approver capabilities:**
- View all timesheets for their team/scope
- Approve individual or bulk entries
- Reject with optional message
- Send reminders to team members who haven't submitted
- Message the submitter inline (contextual conversation)
- View total tracked hours, capacity, and billable % per person

**Post-approval lock:**  
Once approved, the team member cannot modify the entry. The approver or admin can unlock it explicitly.

---

### 1.6 Notifications & Reminders

| Notification | Recipient | Trigger |
|---|---|---|
| Timesheet due soon | Submitter | Configurable days before due date |
| Timesheet overdue | Submitter | After due date |
| Submission received | Approver | When submitter submits |
| Approved | Submitter | When approver approves |
| Rejected | Submitter | When approver rejects |

Users should be able to opt out of individual notifications.

---

### 1.7 Project-Level Time View (Tracked Time Tab)

Beyond the weekly personal timesheet, managers need a **project-level table view** of all time entries:

- Each row = one time entry
- Columns: Team member, Task, Date, Hours, Billable, Category, Approval Status, Role
- Filter by: status, billability, category, date range
- Group by: team member, task, phase, role, status
- Inline editing of fields (notes, billable flag, category)
- Bulk approve / reject / delete
- Export filtered results

---

### 1.8 Billable vs Non-Billable Tracking

The system must distinguish:

- **Billable hours** — chargeable to the client
- **Non-billable hours** — internal, overhead, or excluded

This distinction must flow into:
- Project financial dashboards
- Revenue calculations (Time & Material, Fixed Fee, Subscription models)
- Team utilization metrics
- Invoicing

---

### 1.9 Calendar Integration

Team members should be able to pull time from connected calendars:

- **Google Calendar** integration
- **Outlook Calendar** integration

How it works:
1. User authorizes calendar access from Settings
2. On the timesheet page, user clicks "Add from Calendar"
3. All calendar events for the week are listed
4. User selects which events to import
5. Duration is auto-filled based on event length
6. User maps the event to a project/task/activity
7. Entry is added to the timesheet

---

### 1.10 Import from Allocations

If a user has pre-planned allocations (scheduled hours per project), they should be able to **import those into their timesheet** for the week rather than re-entering manually. They can then edit details (category, notes, billable) before saving.

---

### 1.11 Custom Time Entry Fields

Admins must be able to define **additional fields** on time entries beyond the standard set:

- Field types: Text, Dropdown, Date, Number
- Mandatory vs optional
- Value source: Manual input OR inherited from task/project/account field
- Fallback values when inherited source is empty
- Section-level view/edit permissions per role

---

### 1.12 Audit Trail

Every time entry must maintain:

| Audit Field | Set When |
|---|---|
| Submitted On / By | Entry is submitted |
| Approved On / By | Entry is approved |
| Rejected On / By | Entry is rejected |

These fields auto-clear when actions are reversed (e.g., approval withdrawn clears "Approved On/By").

---

### 1.13 Role-Based Access Control (RBAC)

| Role | Access |
|---|---|
| Admin | All timesheets, all projects, override locks, manage settings |
| Project Owner / Manager | Timesheets for their projects and project members |
| Approver | Timesheets for their assigned team |
| Team Member | Own timesheets only |
| External / Partner | Restricted — as configured |

Permissions must control: view, submit, approve, reject, withdraw, edit locked, delete.

---

### 1.14 Reporting

A time tracking report must show:
- Hours per team member, per project, per category
- Billable vs non-billable breakdown
- Capacity utilization percentage
- Submission and approval status at a glance
- Filterable by date range, project, team member, status

---

## Part 2: User Flow Diagram

```
ADMIN SETUP
    └── Enable Time Tracking
    └── Set capacity, working days, due date, reminders
    └── Define categories
    └── Configure approval rules
    └── (Optional) Set lock rules, exclusions, custom fields

TEAM MEMBER FLOW
    └── Open My Timesheet (weekly grid)
    └── Add tasks (from projects) OR Add activities (ad hoc)
    └── Fill in hours per day per row
    └── Mark entries as billable/non-billable
    └── Submit week for approval
          └── Receive confirmation notification

APPROVER FLOW
    └── Receive notification of submission
    └── Open Approvals tab
    └── Review team members' timesheets
    └── View hours, capacity, billable %
    └── Approve OR Reject (with message)
    └── Can send reminder to non-submitters
    └── Approved → entries locked for submitter

POST-APPROVAL
    └── Locked entries feed into:
          └── Project financials
          └── Invoicing
          └── Utilization reports
```

---

## Part 3: Incremental Replit Build Prompt (Enhanced MVP)

> **Goal:** Build a functional Time Tracking MVP web app. Use React + Node.js (or Next.js). Use a simple SQLite or in-memory store for data persistence in Replit. The prompts below are incremental — run each one in sequence.

---

### Prompt 1 — Project Scaffold & Data Models

```
Build a Time Tracking web app using Next.js with Tailwind CSS.

Set up the following data models (use SQLite via better-sqlite3 or a JSON file store):

1. Users: id, name, email, role (admin | manager | member), weeklyCapacityHours
2. Projects: id, name, status (active | completed | cancelled)
3. Tasks: id, projectId, name, status (in_progress | completed)
4. TimeEntries: id, userId, projectId, taskId (nullable), activityName (nullable), date, hours, isbillable (boolean), category, notes, status (draft | submitted | approved | rejected)
5. Categories: id, name

Seed the database with:
- 2 users (1 admin, 1 member)
- 2 projects with 3 tasks each
- 3 categories: Development, Consulting, Internal

Display a simple homepage that lists all users and projects to confirm the setup is working.
```

---

### Prompt 2 — Timesheet Weekly Grid (Team Member View)

```
Build the core timesheet UI for a logged-in team member.

Requirements:
- Weekly grid view: rows = tasks/activities, columns = Mon–Sun
- Show the current week by default with prev/next week navigation
- Each cell is an editable input for hours (0–24, decimals allowed)
- Auto-save hours on blur
- Show row totals (right side) and daily totals (bottom row)
- Add a "Add Task" button: opens a modal to select project → filter tasks → select task to add as a row
- Add an "Add Activity" button: opens a form with fields: project (or non-project), activity name, category, billable checkbox
- Each row shows: task/activity name, project name, category, billable badge
- Show a "Submit Week" button that marks all entries for that week as submitted
- Disable editing after submission (show a "Submitted" badge)
```

---

### Prompt 3 — Approval Workflow (Manager View)

```
Build the Approvals page for managers/admins.

Requirements:
- List all team members with: name, submission status (not submitted | submitted | approved), total hours for the week, capacity hours, billable %
- For submitted timesheets, show an "Approve" and "Reject" button per row (quick action)
- Clicking a team member's name opens a detailed side panel showing their full weekly timesheet
- In the detail view, the approver can approve or reject individual entries or the full week
- Rejected entries show a status badge "Rejected"
- Approved entries become read-only for the submitter
- Show a "Send Reminder" button for members who haven't submitted
- All approval actions update the entry status in the database
```

---

### Prompt 4 — Project-Level Tracked Time Table

```
Build a "Tracked Time" tab inside the project detail page.

Requirements:
- Table view of all time entries for the project
- Columns: Team Member, Task/Activity, Date, Hours, Billable, Category, Status
- Filter bar: filter by status (all | submitted | approved | rejected), billable (all | yes | no)
- Group by dropdown: team member, task, status
- Inline editing for: notes, billable flag, category (for entries not yet approved)
- Checkbox per row for bulk actions
- Bulk action bar (appears when rows selected): Approve, Reject, Delete
- Row-level totals when grouped (e.g., total hours per team member group)
- Export button: downloads the filtered/grouped view as CSV
- Show summary stats at top: Total Hours, Billable Hours, Non-Billable Hours
```

---

### Prompt 5 — Notifications, Settings & Reminders

```
Build the admin Settings page for Time Tracking configuration and add a basic notification system.

Settings page must include:
- Toggle to enable/disable time tracking globally
- Weekly capacity hours input (per user, default value)
- Working days checkboxes (Mon–Sun)
- Timesheet due: day-of-week dropdown + time picker
- Reminder settings: "Send reminder X days before due" and "Send reminder X days after due"
- Time entry categories manager: add/delete categories, set as active/inactive
- Approval setting: radio — "Project owner approves" | "Designated approver" | "Admin approves"
- Min/max hours per week enforcement (optional inputs)
- Lock entries once approved: toggle
- Timesheet exclusion list: multi-select users to exclude from submission requirements

Notification system:
- In-app notification bell icon in the navbar
- On submission, create a notification for the approver: "John submitted their timesheet for Apr 14–20"
- On approval, create a notification for the submitter: "Your timesheet for Apr 14–20 was approved"
- On rejection, create a notification for the submitter: "Your timesheet for Apr 14–20 was rejected"
- Show unread count badge on the bell icon
- Mark all as read button
```

---

### Prompt 6 — Billable/Non-Billable Dashboard & Reports

```
Build a Time Tracking Reports/Dashboard page.

Requirements:
- Date range picker (default: current month)
- Summary cards: Total Hours Logged, Billable Hours, Non-Billable Hours, Billable %
- Bar chart: Hours by team member (billable vs non-billable stacked)
- Bar chart: Hours by project
- Table: Per-user breakdown with columns — Name, Total Hours, Billable, Non-Billable, Submitted %, Approval Status
- Filter by: project, team member, category, date range
- Each row in the table is expandable to show entries for that user in the date range
- Export report as CSV
- Use recharts or chart.js for visualizations
```

---

### MVP Feature Checklist

| Feature | Priority | Prompt |
|---|---|---|
| Data models & seed data | Critical | 1 |
| Weekly timesheet grid | Critical | 2 |
| Add task / activity to timesheet | Critical | 2 |
| Submit week for approval | Critical | 2 |
| Approval workflow (approve/reject) | Critical | 3 |
| Send reminder to non-submitters | High | 3 |
| Project-level tracked time table | High | 4 |
| Bulk approve/reject | High | 4 |
| Filter & group time entries | High | 4 |
| CSV export | High | 4 |
| Admin settings configuration | High | 5 |
| In-app notifications | High | 5 |
| Billable vs non-billable tracking | Critical | Throughout |
| Reports dashboard with charts | Medium | 6 |
| Lock entries post-approval | Medium | 5 |

---

### Features Excluded from Enhanced MVP (Post-MVP Roadmap)

- Calendar integration (Google / Outlook)
- Import from allocations
- Custom time entry fields with inheritance
- Audit trail fields (Submitted By, Approved By timestamps)
- Approver hierarchy (multi-level reporting chain)
- Move time entries between projects
- Revenue recognition based on tracked time
- Client portal time tracking
- Public API for time entries

---

*Document compiled from Rocketlane Time Tracking Help Documentation. Structured for product/engineering reference.*

---

## Part 4: Addenda (April 2026)

> The following sections extend the original specification with features and settings not covered in the initial MVP definition. Each addendum is self-contained and references the original section it extends. **Do not re-implement content already covered in Parts 1–3.**

---

### Addendum A — Client Portal: External User Time Logging

*Extends: Part 1 → Section 1.13 Role-Based Access Control / Client Portal integration*

#### Client Portal — External User Time Logging

Rocketlane's Customer Portal V2 supports time tracking for external (customer-side) users, enabling clients to log time directly within the portal interface — not just view budgeted vs tracked hours.

**Admin configuration**

Admins configure per-project whether time tracking is exposed in the customer portal. This is a project-level toggle, not a global setting. When enabled, the relevant portal users gain access to a timesheet view scoped to that project.

**Customer-facing experience**

Customers access their own timesheet from within the portal interface. The UI follows the same weekly grid concept (rows = tasks, columns = days) but is scoped to the customer's portal view. Customers may only log time against project tasks they are explicitly responsible for within the portal.

**Approval workflow integration**

Time entries submitted by portal/external users flow through the **same approval workflow** as internal team members. They are NOT auto-approved. Portal-submitted entries appear in:
- The standard **Approvals** tab (visible to project owners and designated approvers)
- The **Tracked Time** tab at the project level

This is distinct from the read-only Time Tracking Widget (which displays budgeted vs tracked hours for context). This feature enables active time logging by the customer, not passive viewing.

**Data model implications**

The `Team Member` field on a `TimeEntry` record must support portal/external user types in addition to internal users. External user time entries carry a user type flag (e.g., `userType: "portal"`) to distinguish them in reporting and filtering without separate storage.

**RBAC implications**

Portal users have a separate role type. Their permissions are limited to:
- Log time against tasks in their project scope
- Submit their own timesheet
- Withdraw and re-submit (before approval)

They cannot: approve others' entries, view other team members' timesheets, or access project financials.

| Role | Timesheet Access |
|---|---|
| Portal User (external) | Own entries only, scoped to enabled portal project(s) |
| Project Owner / Manager | Can view and approve portal user entries via Approvals tab |
| Admin | Full access including portal user entries |

---

### Addendum B — Time Tracking in Project Templates

*Extends: Part 1 → Section 1.2 Configuration & Setup → new sub-section*

#### Template-Level Time Tracking Configuration

When time tracking is enabled account-wide, project templates gain time tracking configuration options at the task level. These settings eliminate the need to configure each task individually in every project created from the template.

**Navigation path**

Templates → select a project template → click any task → locate the **Time Entry Settings** section in the task detail panel.

**Per-task configurable settings**

| Setting | Options | Effect |
|---|---|---|
| Mark task as Billable | Yes / No | Becomes the billable default when team members log time against this task in any project created from this template |
| Time Entry Category | Select from active categories | Pre-assigns the category for time entries on this task |

**Behaviour and overrides**

- Template-level billable and category defaults carry forward to **all projects created from this template**.
- At log time, team members can override both the billable flag and the category on any individual time entry. Template defaults are starting values, not locked values.

**Allocation placeholders**

Resource allocation placeholders defined in templates (roles + estimated hours per role) serve as the starting allocation baseline when a new project is created from the template. These placeholder allocations feed directly into the **Import from Allocations** feature (see Section 1.10), allowing team members to pull pre-planned hours into their weekly timesheet without re-entering manually.

---

### Addendum C — Two Missing Global Settings

*Extends: Part 1 → Section 1.2 Configuration & Setup — Global Settings table*

The following two settings are missing from the Global Settings table defined in Section 1.2. They should be treated as additions to that table:

| Setting | Options | Default | Notes |
|---|---|---|---|
| Billable Default | Billable / Non-Billable | Billable | Account-wide default for the billable flag on new tasks. Applies when no task-level or template-level billable setting is configured. Can be overridden per task or per time entry at log time. |
| Calendar Start Day | Monday / Sunday | Monday | Sets which day is rendered as the first column in the weekly timesheet grid. Affects week boundary calculations for submission deadlines and weekly total aggregation. |

**Implementation note — Calendar Start Day**

This setting has a cascading effect on several calculations:
- The weekly grid renders `startDay` as column 1 and `startDay − 1` as column 7
- "Week submission due" deadlines are calculated relative to the configured end-of-week boundary
- Weekly total aggregations (capacity, tracked hours, billable %) use the configured week boundaries

---

### Addendum D — Operations Insights: Tracked vs Planned Tab

*Extends: Part 1 → Section 1.14 Reporting → new sub-section*

#### Operations Insights — Tracked vs Planned Tab

**Path:** Reporting → Operations Insights → Tracked vs Planned tab  
**Plan availability:** All plans

**Purpose**

Compares tracked time entries against planned (budgeted) hours at the task, phase, and project level within a selected project template. Surfaces over-burning and under-burning patterns to help delivery teams refine future effort estimates in templates.

**Scope**

Scoped to a **selected template** — the report aggregates data across all projects that were created from that template, enabling pattern detection across the portfolio of similar deliveries.

**Drill-down levels**

```
Project level
  └── Phase level
        └── Task level
```

Users start at the project level summary and drill down into specific phases or tasks to identify where time variance is occurring.

**Key columns**

| Column | Description |
|---|---|
| Planned Hours | Template task effort estimates (the "planned" baseline) |
| Tracked Hours | Timesheet actuals logged against matching tasks across all projects from this template |
| Variance | Planned Hours − Tracked Hours |
| Variance % | (Variance ÷ Planned Hours) × 100 |

**Visual highlighting**

| State | Condition | Display |
|---|---|---|
| Over-burning | Tracked > Planned | Red or amber highlight |
| Under-burning | Tracked < Planned | Green highlight |
| On track | Tracked ≈ Planned | Neutral |

**Primary use case**

If "Customer Onboarding" tasks consistently burn 40% more than planned across 20 projects created from the same template, this tab surfaces the pattern — enabling the delivery team to update the template task estimates before the next project kicks off. This closes the feedback loop between time tracking actuals and delivery planning.

**Why it matters**

This report connects time tracking data directly to delivery operations improvement. It is one of the highest-value reports for a Professional Services team because it translates logged hours into actionable template refinements — reducing mis-estimation over time.

---

### Addendum E — People Performance Report: Time-Tracking Columns

*Extends: Part 1 → Section 1.14 Reporting → new sub-section*

#### People Performance Report — Time Tracking Fields

**Path:** Reporting → People Performance  
**Plan availability:** All plans

**Purpose**

The People Performance report is the only foundational report that combines task completion speed, collaboration activity, and billable utilization in a single view — making it the primary report for performance reviews and capacity planning conversations.

**Time-tracking-specific columns**

The following fields are sourced from time tracking data and appear alongside task performance metrics:

| Field | Description | Formula / Source |
|---|---|---|
| Capacity | Total available hours in the reporting period, excluding approved time-off and holidays | Calendar working hours × working days − time-off hours − holiday hours |
| Hours Tracked | Total hours logged in timesheets (billable + non-billable combined) | Timesheet data |
| Billable Hours | Hours logged with the Billable flag set to Yes | Timesheet data |
| Non-Billable Hours | Hours logged with the Billable flag set to No | Timesheet data |
| Billable Utilization | Percentage of capacity spent on billable work | (Billable Hours ÷ Capacity) × 100 |

**Capacity formula (shared across all time-tracking reports)**

```
Capacity = Total working hours in period
         − Time-Off hours (approved absences)
         − Holiday hours (from Holiday Calendar)
```

This formula is consistent across the People Performance report, the Tracked vs Planned tab (Addendum D), and the approver summary view in Section 1.5.

**KPI spotlight cards (top of report)**

Three "Top Performer" cards appear above the main table, each highlighting the top 3 team members by a specific metric:

| Card | Metric | Calculation |
|---|---|---|
| Top Performers: Task Completion | Highest % of assigned tasks marked Completed in the period | Completed tasks ÷ Total assigned tasks |
| Top Performers: Billable Utilization | Highest billable utilization % | Billable Hours ÷ Capacity × 100 |
| Top Performers: Collaboration | Highest total messages + comments sent | Activity data from project conversations |

**Implementation priority note**

This addendum is additive to an existing report surface — no data model changes are required beyond ensuring the billable flag and capacity calculations are already being computed (covered in Sections 1.2, 1.8, and Addendum C). Low complexity, high visibility for managers running performance reviews.
