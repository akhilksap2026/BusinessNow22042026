━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUSINESSNOW PSA
Business Rules & Functional Specification
Prepared by: KSAP Technology
Version: 1.0 | Confidential
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## SECTION 0 — EXECUTIVE SUMMARY

BusinessNow PSA is a Professional Services Automation platform developed by KSAP Technology. It is designed to help professional services organisations — consulting firms, implementation partners, managed service providers, and technology agencies — plan, deliver, and invoice client engagements from a single integrated workspace. The platform addresses the core operational challenge faced by these organisations: the need to coordinate project delivery, team capacity, time recording, and client invoicing simultaneously, without information becoming siloed across disconnected spreadsheets, email threads, and separate billing tools.

BusinessNow PSA is built for organisations that sell and deliver knowledge work to external clients or manage complex internal programmes. It supports the complete services delivery lifecycle: from the moment a sales lead is first recorded as a prospect, through opportunity qualification and project creation, to resource staffing, day-to-day task execution, time approval, and final invoicing. The platform is equally suited to organisations that bill clients on a fixed-fee basis, on time-and-materials rates, or on a recurring retainer arrangement.

The platform is organised into seventeen functional modules. The core delivery modules — Projects, Tasks, Time Tracking, and Resources — form the operational heart of the system. These are complemented by a Finance module covering the full invoicing and revenue recognition lifecycle, a CRM layer spanning Accounts, Prospects, and Opportunities, and a suite of analytical tools in the Reports and Portfolio modules. Administrative control of the organisation's configuration — users, skills, rate cards, templates, and calendars — is managed through the Admin module. All activity across every module is captured in an immutable Audit Log.

The platform defines four distinct roles that reflect the access hierarchy typical of a professional services firm. The Account Admin holds full organisational authority and is responsible for system configuration, user management, and financial governance. The Super User (also referred to as Project Manager or Finance role) carries out day-to-day delivery management — creating projects, approving timesheets, managing resources, and processing invoices. The Collaborator is the practitioner: a team member who logs time, tracks their allocations, and contributes to project work without access to financial or administrative functions. The Customer role is provisioned for external stakeholders and is currently restricted from all internal platform operations.

The primary business value delivered by BusinessNow PSA is operational visibility and control. Delivery leaders gain a real-time view of project health, budget consumption, and team utilisation. Finance teams can generate accurate invoices directly from approved timesheets, with rate snapshots that lock in billing rates at the moment of approval. Resource managers can balance capacity across projects, detect conflicts before they arise, and respond to staffing gaps through a structured request and fulfilment workflow. Together, these capabilities reduce revenue leakage, improve on-time delivery rates, and give leadership the data they need to make informed decisions about their professional services operations.

---

## SECTION 1 — SYSTEM OVERVIEW

### 1.1 Purpose of the System

BusinessNow PSA exists to give professional services organisations a single authoritative source of truth for every engagement they run. It replaces fragmented, manual approaches to project tracking, capacity planning, and client billing with integrated, rule-enforced workflows. The system enforces business rules at the point of data entry rather than after the fact, preventing errors such as over-allocation of team members, unapproved time being invoiced, or budget changes being made without a proper change order.

### 1.2 Intended Users

| User Type | Description |
|-----------|-------------|
| Account Admin | Senior operational or finance leader responsible for system configuration, user access, and financial governance |
| Super User | Project manager, practice lead, or finance officer responsible for running engagements and processing financial transactions |
| Collaborator | Practitioner (consultant, analyst, developer) who works on projects and records time |
| Customer | External client stakeholder (currently restricted; provisioned for future portal access) |

### 1.3 Scope

**In scope:**
- Client account and contact management
- Sales pipeline management (prospects and opportunities)
- Project creation, planning, and lifecycle management
- Task and phase management within projects
- Team resource allocation and capacity planning
- Time entry logging, timesheet submission, and approval
- Leave and time-off management
- Invoice creation, approval, and payment recording
- Revenue recognition and billing schedule management
- Contract management per project
- Budget governance including change orders and budget locking
- Document management and versioning per project
- Customer satisfaction (CSAT) ratings per project
- RAID (Risk, Assumption, Issue, Dependency) tracking
- Reporting and analytics across all operational dimensions
- Audit logging of all system mutations
- Skills management and AI-assisted resource matching
- Project templates for repeatable engagement structures
- Custom fields for organisation-specific data capture
- Asset registration and project booking

**Out of scope:**
- External client portal access (Customer role is provisioned but currently restricted)
- Payroll and HR system integration
- General ledger or accounting system integration
- Project-level profitability reporting beyond what is computed from time entries and invoices
- Multi-currency support (single currency organisation)
- Real-time video or communication tooling

### 1.4 Key Concepts & Terminology

**Professional Services Automation (PSA):** A category of software that integrates the core operational functions of a professional services firm — project management, resource planning, time tracking, and invoicing — into a single platform.

**Project:** The primary unit of work in the system. A project represents a client engagement or internal initiative, has a defined scope, dates, budget, owner, and team. Every financial and operational transaction in the system is ultimately linked to a project.

**Phase:** A high-level grouping of tasks within a project, used to organise work into logical stages such as Discovery, Build, and Delivery. Phases are modelled as a special category of task rather than a separate object, which means they participate fully in task management workflows.

**Task:** A discrete unit of deliverable work within a project. Tasks can be nested under phases and can themselves have child tasks, forming a hierarchy. Tasks carry priority, status, planned and estimated hours, and can be assigned to one or more team members.

**Milestone:** A specific type of task that marks a significant event in the project lifecycle. A Payment Milestone, when marked complete, automatically generates a draft invoice. A Review Milestone marks a formal client review point.

**Allocation:** A formal commitment of a team member's time to a project for a defined period at a specified number of hours per week. Allocations can be soft (provisional, used for planning) or hard (firm, contractual commitments). A team member's bill rate at approval time is read from their allocation.

**Timesheet:** A weekly record of all time a team member has logged. Timesheets follow a structured approval workflow: they are drafted, submitted by the team member, and then approved or rejected by that person's manager or an Account Admin.

**Rate Card:** A pricing schedule that lists the bill rate (charge-out rate) for each project role. Rate cards are assigned to projects and are used to calculate the billable value of approved timesheets.

**Change Order:** A formally tracked request to modify a project's approved budget or scope. Change orders follow an approval workflow and are the only compliant mechanism for increasing a locked project budget.

**Budget Lock:** A governance control that prevents direct edits to a project's financial figures once the project moves from Draft to Active status. Changes to a locked budget must be made through a Change Order.

**CSAT (Customer Satisfaction Score):** A star rating submitted by a project stakeholder to indicate their satisfaction with a project or phase of delivery. CSAT scores are collected per project and contribute to performance reporting.

**RAID:** An acronym for Risk, Assumption, Issue, and Dependency. RAID items are tracked per project to surface potential threats and dependencies that a project manager needs to monitor.

**Capacity:** The maximum number of hours per week a team member is available to work. Capacity is set at the user level and is used by the system to detect and prevent over-allocation.

**Soft Allocation:** A provisional allocation used for planning purposes, typically created during the sales or pre-project phase. Soft allocations do not count as firm commitments and can be created without triggering full capacity validation.

**Hard Allocation:** A confirmed allocation representing a contractual commitment of a team member's time to a project. Hard allocations trigger over-allocation checks and are used in conflict detection when leave is approved.

**Escalation:** An automated notification sent to a team member's manager when a submitted timesheet remains unapproved beyond a configurable number of days. The escalation threshold is set in the organisation's time settings.

**Revenue Recognition:** The process of recording when project revenue is considered earned, typically month by month. Revenue entries are tracked per project and contribute to revenue reporting.

**SOW (Statement of Work):** The initial budget baseline for a project, recorded as a budget entry of type SOW at project creation. Only one SOW entry is permitted per project.

---

## SECTION 2 — ROLES & ACCESS CONTROL

### 2.1 — Account Admin

**Definition:** The Account Admin is the highest-privilege user in the organisation. This role is typically held by a managing director, operations director, head of finance, or senior systems administrator. The Account Admin has full visibility and control over every aspect of the platform, including configuration, user management, and financial governance.

**Scope of Access:** Global — all modules, all projects, all financial data, all user records, all configuration settings.

**Permissions Table:**

| Capability | Allowed? | Conditions |
|------------|----------|------------|
| Create, edit, and delete user accounts | Yes | None |
| Assign and change user roles | Yes | None |
| Deactivate and reactivate users | Yes | None |
| View all projects (including archived) | Yes | None |
| Create and edit projects | Yes | None |
| Archive and restore projects | Yes | None |
| Unlock a locked project budget | Yes | Only role permitted to do this |
| View and manage all invoices | Yes | None |
| Approve timesheets | Yes | Cannot approve own timesheet |
| Approve time-off requests | Yes | Cannot approve own request |
| Approve change orders | Yes | Cannot approve change orders they submitted |
| Approve resource requests | Yes | Cannot approve own request |
| Manage rate cards | Yes | None |
| Manage skills and skills matrix | Yes | None |
| Manage project templates | Yes | None |
| Manage holiday calendars | Yes | None |
| Manage tax codes | Yes | None |
| Manage custom fields | Yes | None |
| View the audit log | Yes | None |
| View raw cost rates for all users | Yes | None |
| Manage company-wide settings | Yes | None |
| Invite users at any role level | Yes | None |

**Hard Restrictions:**
- An Account Admin cannot approve a timesheet they personally submitted.
- An Account Admin cannot approve a change order they personally submitted.
- An Account Admin cannot approve a time-off request they personally submitted.
- An Account Admin cannot approve a resource request they personally submitted.

**Business Rules:**

BR-ROLE-001: Every organisation must have at least one Account Admin to maintain governance continuity.

BR-ROLE-002: An Account Admin is the only role permitted to unlock a project budget that has been locked following transition to Active status.

BR-ROLE-003: An Account Admin is the only role permitted to create, edit, or delete user accounts.

BR-ROLE-004: An Account Admin is the only role permitted to assign or modify a user's primary role or secondary roles.

BR-ROLE-005: An Account Admin is the only role permitted to view raw cost rates for team members.

BR-ROLE-006: An Account Admin is the only role permitted to access the full audit log.

BR-ROLE-007: An Account Admin is the only role permitted to view the list of archived (soft-deleted) projects.

---

### 2.2 — Super User

**Definition:** The Super User is the primary operational role in the platform. It is held by project managers, practice leads, delivery managers, and finance officers. Super Users have broad access to all delivery and financial functions but cannot manage user accounts or view individual cost rates.

**Scope of Access:** Global across projects and finance modules. Cannot access user administration, cost rate data, or the audit log.

**Permissions Table:**

| Capability | Allowed? | Conditions |
|------------|----------|------------|
| Create and edit projects | Yes | None |
| Archive projects | Yes | None |
| Restore archived projects | Yes | None |
| Manage tasks and phases | Yes | None |
| Create and manage allocations | Yes | None |
| Approve timesheets | Yes | Cannot approve own timesheet; must be manager of submitter or Account Admin |
| Reject timesheets | Yes | Cannot reject own timesheet |
| Approve change orders | Yes | Cannot approve change orders they submitted |
| Approve resource requests | Yes | Cannot approve own request |
| Approve time-off requests | Yes | Only if they are the requester's designated manager |
| Create and manage invoices | Yes | None |
| Manage contracts | Yes | None |
| Create and manage opportunities | Yes | None |
| Convert opportunities to projects | Yes | Only Won opportunities |
| Create and manage prospects | Yes | None |
| Convert prospects to accounts | Yes | None |
| View resource capacity and utilisation | Yes | None |
| Use AI resource suggestions | Yes | None |
| Post project updates | Yes | None |
| Manage RAID items | Yes | None |
| Invite users | Yes | Can only invite Collaborators and Customers |
| Unlock a locked budget | No | Account Admin only |
| View raw cost rates | No | Account Admin only |
| Create or delete user accounts | No | Account Admin only |
| Access the audit log | No | Account Admin only |

**Hard Restrictions:**
- A Super User cannot approve a timesheet they personally submitted.
- A Super User cannot approve a change order they personally submitted.
- A Super User cannot approve a resource request they personally initiated.
- A Super User cannot approve a time-off request for a team member who is not under their management.
- A Super User cannot unlock a locked project budget.
- A Super User cannot view individual team member cost rates.

**Business Rules:**

BR-ROLE-008: A Super User may approve a timesheet only if they are the recorded manager of the submitting team member, or if they hold Account Admin role simultaneously via secondary role assignment.

BR-ROLE-009: A Super User may approve a time-off request only if they are the designated manager of the requester.

BR-ROLE-010: A Super User cannot approve any item they personally created or submitted, regardless of context.

BR-ROLE-011: A Super User may invite new users but is limited to assigning the Collaborator or Customer roles; they may not grant Super User or Account Admin access.

---

### 2.3 — Collaborator

**Definition:** The Collaborator is the practitioner-level role, typically held by consultants, analysts, developers, and other team members who perform the billable work on projects. Collaborators interact primarily with the Time Tracking module and have read access to projects they are allocated to.

**Scope of Access:** Limited to own timesheets, own time entries, own allocations, own time-off requests, and read access to projects and tasks. No access to financial modules, resource management, or administrative functions.

**Permissions Table:**

| Capability | Allowed? | Conditions |
|------------|----------|------------|
| Log time entries | Yes | Only on projects they are allocated to |
| Submit own timesheets | Yes | None |
| Withdraw own submitted timesheet | Yes | Before it is approved |
| View own timesheets | Yes | None |
| View own allocations | Yes | None |
| Submit a time-off request | Yes | None |
| View projects | Yes | Limited to projects they are allocated to |
| View tasks on allocated projects | Yes | None |
| Add notes to tasks | Yes | None |
| Delete own task notes | Yes | None |
| Submit a CSAT rating | Yes | None |
| Invite users | Yes | Can only invite Customers |
| Approve timesheets | No | Super User and above only |
| Create or edit projects | No | Super User and above only |
| Create or edit tasks | No | Super User and above only |
| Create or manage allocations | No | Super User and above only |
| View or manage invoices | No | Super User and above only |
| View raw cost rates | No | Account Admin only |
| View other users' timesheets | No | Own only |

**Hard Restrictions:**
- A Collaborator cannot view, create, edit, or delete any invoice.
- A Collaborator cannot view, create, or delete any allocation.
- A Collaborator cannot approve timesheets, change orders, resource requests, or time-off requests.
- A Collaborator cannot view time entries or timesheets belonging to other users.
- A Collaborator cannot view the rate card rates.

**Business Rules:**

BR-ROLE-012: A Collaborator may only log time against projects to which they have an active allocation.

BR-ROLE-013: A Collaborator may only view their own timesheet records; they may not access timesheet data belonging to other team members.

BR-ROLE-014: A Collaborator may delete a task note only if they authored it; deleting another user's note requires Super User or above.

BR-ROLE-015: A Collaborator may invite new users but may only assign the Customer role.

---

### 2.4 — Customer

**Definition:** The Customer role is provisioned for external client stakeholders. This role is currently restricted from all internal platform operations. It is preserved in the role hierarchy for future client portal functionality.

**Scope of Access:** None — all internal API operations return an access denied response for this role.

**Permissions Table:**

| Capability | Allowed? | Conditions |
|------------|----------|------------|
| Access any internal module | No | Globally blocked |

**Hard Restrictions:**
- A Customer cannot access any internal data, module, or operation.
- The Customer role cannot be self-assigned or escalated to any internal role by a Super User or Collaborator.

**Business Rules:**

BR-ROLE-016: Any request made using the Customer role to an internal platform operation is rejected with an access denied response, without exception.

BR-ROLE-017: A Customer role assignment may only be granted by a Super User, Account Admin, or Collaborator within the permitted invite matrix.

---

## SECTION 3 — MODULE BUSINESS RULES

---

### ━━━━━━━━━━━━━━━━━━━━━
### MODULE 1: DASHBOARD
### ━━━━━━━━━━━━━━━━━━━━━

#### 3.1.1 Purpose
The Dashboard provides each user with a personalised, at-a-glance view of their operational environment when they first open the platform. It surfaces personal performance indicators, highlights projects and invoices that need attention, and presents a real-time activity feed. For Account Admins, it also presents an onboarding checklist to guide initial platform setup.

#### 3.1.2 Who Uses This Module
All authenticated roles access the Dashboard upon login. Account Admins see the onboarding checklist in addition to the shared views. Super Users and Collaborators see the standard KPI and activity feed view.

#### 3.1.3 Key Entities Managed
**KPI Summary:** A computed set of headline figures including active project count, total tracked hours for the current period, overdue invoice value, and personal task completion rate. These figures are calculated on request and are not stored independently.

**Activity Feed:** A chronological list of recent events across projects the user is involved in — status changes, timesheet approvals, new tasks assigned, and similar events.

**Needs Attention Panel:** A curated list of items requiring immediate action — projects marked as at-risk or off-track, and invoices that have passed their due date without payment.

**Onboarding Checklist:** A step-by-step guide visible only to Account Admins that tracks whether key configuration steps have been completed, such as adding team members, creating a rate card, and setting up a holiday calendar. This checklist can be permanently dismissed by the Account Admin once it is no longer needed.

#### 3.1.4 Core Functionality
- Any authenticated user can view their own KPI summary upon login.
- Any authenticated user can view the activity feed relevant to their projects.
- Any authenticated user can view the Needs Attention panel for projects and invoices relevant to them.
- An Account Admin can dismiss the onboarding checklist permanently.

#### 3.1.5 Workflow & State Transitions
The Dashboard is a read-only view with no formal workflow. The onboarding checklist has two states:

**Visible** → (Account Admin clicks Dismiss) → **Permanently Hidden**

Once dismissed, the checklist cannot be re-shown through normal user interface actions.

#### 3.1.6 Business Rules

**DISPLAY RULES**

BR-DASH-001: The Dashboard KPI summary is computed at the time of page load and reflects the current state of the data; it is not cached or pre-aggregated.

BR-DASH-002: The Needs Attention panel displays only projects where the health status is At Risk or Off Track, and invoices whose due date has passed while the invoice status remains Sent.

BR-DASH-003: The onboarding checklist is displayed only to users holding the Account Admin role. It is not visible to Super Users or Collaborators.

BR-DASH-004: Once an Account Admin dismisses the onboarding checklist, it does not reappear for that user, even after a new login session.

#### 3.1.7 Integration Points
The Dashboard reads data from Projects (for health status), Invoices (for overdue detection), Tasks (for personal task counts), and Notifications (for the activity feed). It does not write to any of these modules.

#### 3.1.8 Restrictions & Exceptions
The Dashboard has no write operations other than the onboarding checklist dismissal. All displayed figures are computed on demand and are not guaranteed to reflect changes made within the same second.

---

### ━━━━━━━━━━━━━━━━━━━━━
### MODULE 2: PROJECTS
### ━━━━━━━━━━━━━━━━━━━━━

#### 3.2.1 Purpose
The Projects module is the operational core of the platform. It manages the full lifecycle of every client engagement or internal initiative, from initial creation through active delivery to completion or cancellation. Projects serve as the organisational container for all tasks, allocations, time entries, invoices, contracts, and documents.

#### 3.2.2 Who Uses This Module
Super Users and Account Admins create and manage projects. All authenticated users can view projects relevant to them. Collaborators can view only the projects to which they are allocated.

#### 3.2.3 Key Entities Managed
**Project:** Defined by a name, status, health indicator, billing type, budget, budgeted hours, start and end dates, project owner, linked account, and an internal or external designation. A project may be linked to a specific opportunity and a rate card. An auto-allocate flag determines whether assigning a task to a team member automatically creates a soft allocation for that person on the project.

**Project Group:** A named grouping that can contain multiple projects, used for portfolio-level organisation.

**Budget Entry:** A dated financial record attached to a project. The initial budget is recorded as a Statement of Work (SOW) entry at project creation. Subsequent adjustments are recorded as Adjustment entries. Only one SOW entry is permitted per project.

**Change Order:** A formal, workflow-governed request to increase or modify a project's approved budget or scope. Change orders carry a reference number, title, description, monetary value, and an additional hours figure.

**Contract:** A legal or commercial agreement attached to a project, with a name, status, start and end dates, value, and a link to the relevant document.

**Project Update:** A message posted to a project's stakeholder list. Updates can be internal (visible only to the delivery team) or external (intended for client distribution).

**RAID Item:** A tracked item classified as a Risk, Assumption, Issue, or Dependency. RAID items have a probability and impact rating, a mitigation plan, a status, and a target resolution date.

**Project Template:** A reusable project structure that includes predefined phases and tasks. Templates can be applied at project creation or applied to an existing project to generate the phase and task structure.

#### 3.2.4 Core Functionality
- A Super User or Account Admin can create a new project from scratch, specifying all core attributes.
- A Super User or Account Admin can create a new project from a template, inheriting the template's phase and task structure.
- A Super User or Account Admin can edit all project attributes, subject to budget lock rules.
- A Super User or Account Admin can archive (soft-delete) a project, removing it from active lists.
- A Super User or Account Admin can restore an archived project to active status.
- An Account Admin can view and manage all archived projects.
- A Super User or Account Admin can create, edit, and manage change orders on a project.
- A Super User or Account Admin can approve a change order that another Super User submitted.
- A Super User or Account Admin can create and manage contracts on a project.
- A Super User or Account Admin can post internal or external project updates.
- Any authenticated user can view project health statistics, burn chart data, and quoted-versus-actual comparisons.
- Any authenticated user can submit a CSAT rating for a project.

#### 3.2.5 Workflow & State Transitions

**Project Lifecycle:**

**Draft** → (Super User promotes with reason) → **Active**
**Draft** → (Super User promotes with reason) → **Not Started**
**Not Started** → (Super User promotes with reason) → **Draft**
**Not Started** → (Super User promotes with reason) → **Active**
**Active** → (Super User promotes with reason) → **On Hold**
**Active** → (Super User promotes with reason) → **Completed**
**Active** → (Super User promotes with reason) → **Cancelled**
**On Hold** → (Super User promotes with reason) → **Active**
**On Hold** → (Super User promotes with reason) → **Cancelled**

**Completed** and **Cancelled** are terminal states. No further transitions are permitted once a project reaches either of these statuses.

The transition from Draft to Active automatically locks the project's budget. Budget lock prevents any direct edit to the budget amount, budgeted hours, or budget currency.

**Change Order Lifecycle:**

**Draft** → (Super User submits) → **Submitted**
**Submitted** → (Super User or Admin approves, not submitter) → **Approved**
**Submitted** → (Super User or Admin rejects, not submitter) → **Rejected**

#### 3.2.6 Business Rules

**CREATION RULES**

BR-PROJ-001: A project must have a name, an account, a project owner, a start date, a due date, and a billing type before it can be saved.

BR-PROJ-002: When a project is created, the system automatically creates one Statement of Work budget entry recording the initial budget value.

BR-PROJ-003: A project created from a template inherits the template's phase and task structure, with tasks dated relative to the project's start date.

BR-PROJ-004: Every new project is assigned a status of Draft at the time of creation.

BR-PROJ-005: A project designated as External must be linked to a client account. A project designated as Internal should be linked to an internal account.

**EDITING RULES**

BR-PROJ-006: The project's budget amount, budgeted hours, and budget currency cannot be edited directly while the budget is locked. All edits to these fields must be made through an approved Change Order.

BR-PROJ-007: A project that has been archived (soft-deleted) cannot be edited until it is first restored. Any attempt to edit an archived project is rejected.

BR-PROJ-008: Changing a project's status requires the user to provide a written reason explaining the change. The reason is recorded in the audit log.

**DATE VALIDATION RULES**

BR-PROJ-009: A project's due date must be on or after its start date. The system rejects any combination where the due date falls before the start date, whether set at creation or updated later.

BR-PROJ-010: When a project's timeline is changed, the system checks whether any existing allocations fall outside the new date range and notifies the project owner if conflicts are found.

**STATUS TRANSITION RULES**

BR-PROJ-011: Project status changes must follow the permitted transition matrix. Arbitrary jumps between non-adjacent states are rejected.

BR-PROJ-012: The transition from Draft to Active automatically locks the project's budget. This lock is applied by the system and cannot be prevented.

BR-PROJ-013: A written reason is mandatory for every project status change, regardless of the direction of the transition.

BR-PROJ-014: When a project status changes, all team members with active allocations on the project, plus the project owner, are notified automatically.

**BUDGET LOCK RULES**

BR-PROJ-015: Once a project's budget is locked, the only permitted path to modifying the budget is through a formally approved Change Order, or through a budget unlock action performed by an Account Admin.

BR-PROJ-016: Only an Account Admin can unlock a locked project budget.

BR-PROJ-017: Unlocking a budget does not automatically re-lock it. The budget remains unlocked until the project transitions to Active again through a subsequent status change, at which point it is re-locked.

**CHANGE ORDER RULES**

BR-PROJ-018: A Change Order must have a title, a monetary amount of zero or more, and additional hours of zero or more. Negative values are not permitted.

BR-PROJ-019: A Change Order cannot be approved by the user who submitted it. Self-approval is rejected by the system.

BR-PROJ-020: A Change Order may only be approved when it is in the Submitted status. Approving a Draft or already-decided change order is not permitted.

**ARCHIVING RULES**

BR-PROJ-021: Archiving a project does not permanently delete it. The project and all its associated data remain in the system and can be restored.

BR-PROJ-022: Archived projects do not appear in standard project listings. They are accessible only through the dedicated archived projects view, which is restricted to Account Admins.

**DELETION RULES**

BR-PROJ-023: Projects are never permanently deleted through normal user interface operations. Archiving (soft-delete) is the only removal mechanism available.

#### 3.2.7 Integration Points
Projects are linked to Accounts (every project belongs to one account), to Opportunities (a project may originate from a won opportunity), to Rate Cards (for billing rate lookups), and to Project Groups (for portfolio organisation). Projects contain Tasks, Allocations, Budget Entries, Contracts, Documents, RAID Items, and Project Updates. Invoices are issued against a Project and its Account. Time Entries and Timesheets are always associated with a Project.

#### 3.2.8 Restrictions & Exceptions
A project template can only be applied to a project that does not already have tasks. Applying a template to a project that already contains tasks is not supported through the standard template application flow. The auto-allocate feature on a project applies only when tasks are assigned to a team member through the task management interface; it does not retroactively create allocations for existing task assignments.

---

### ━━━━━━━━━━━━━━━━━━━━━
### MODULE 3: TASKS
### ━━━━━━━━━━━━━━━━━━━━━

#### 3.3.1 Purpose
The Tasks module manages all unit-level work within a project. It allows project managers to define, assign, and track the granular steps of delivery, organised into a hierarchy of phases and sub-tasks. Task management connects project planning to actual delivery by linking planned hours, estimated hours, and actual logged time in one view.

#### 3.3.2 Who Uses This Module
Super Users and Account Admins create, edit, and manage tasks. All authenticated users can view tasks on projects they are associated with. Any authenticated user can add notes to tasks and delete their own notes.

#### 3.3.3 Key Entities Managed
**Task:** A unit of work with a name, status, priority, billable flag, planned hours, estimate hours, start and end dates, and one or more assigned team members. Tasks can be nested: a Phase is a special top-level task, and regular tasks sit beneath phases or directly on a project.

**Phase:** A first-level grouping task within a project (represented by a task with the phase flag set to true). Phases organise the project into logical stages and provide a rollup view of progress across their child tasks.

**Milestone:** A task designated as a key project event. A Payment Milestone, when marked complete, automatically triggers the creation of a draft invoice. A Review Milestone marks a formal governance checkpoint.

**Task Note:** A comment attached to a task, authored by any authenticated user and timestamped. Notes are used for contextual commentary, decisions, and status updates at the task level.

#### 3.3.4 Core Functionality
- A Super User or Account Admin can create a task within any project, optionally nesting it under a phase.
- A Super User or Account Admin can edit any attribute of a task, including reassigning it to different team members.
- A Super User or Account Admin can bulk update multiple tasks simultaneously, such as changing status or reassigning across a selection.
- A Super User or Account Admin can reorder tasks within a project.
- A Super User or Account Admin can mark a task as a phase, milestone, or standard task.
- Any authenticated user can add a note to any visible task.
- A Collaborator can delete a note they authored; a Super User or Account Admin can delete any note.
- Any authenticated user can view tasks on projects they are associated with.
- The system automatically rolls up completion and effort metrics from child tasks to their parent phases.

#### 3.3.5 Workflow & State Transitions
Tasks follow a configurable status progression. Default states are:

**Not Started** → (assigned team member begins work) → **Started**
**Started** → (work paused) → **On Hold**
**Started** → (work finished) → **Completed**
**Started** → (work abandoned) → **Cancelled**

When a **Payment Milestone** is marked **Completed**, the system automatically creates a draft invoice for the associated project, without requiring manual finance action.

#### 3.3.6 Business Rules

**CREATION RULES**

BR-TASK-001: A task must have a name, a status, a priority, and a billable designation before it can be saved.

BR-TASK-002: Task priority must be one of four values: Low, Medium, High, or Critical. No other values are accepted.

BR-TASK-003: A task can be created as a child of a phase (level-1 task). Phases cannot be nested beneath other phases.

BR-TASK-004: When a project has the auto-allocate feature enabled, assigning a team member to a task automatically creates a soft allocation for that person on the project, dated for the full project duration.

**DATE VALIDATION RULES**

BR-TASK-005: A task's due date must be on or after its start date. The system rejects any task where the due date precedes the start date.

**MILESTONE RULES**

BR-TASK-006: When a task designated as a Payment Milestone is marked as Completed, the system automatically creates a draft invoice for the project. This invoice is created without requiring manual action from a finance user.

BR-TASK-007: A Review Milestone marks a formal client review checkpoint but does not trigger any automatic financial action.

**REORDERING RULES**

BR-TASK-008: The system prevents circular parent-child relationships during task reordering. A task cannot be moved to become a descendant of itself.

BR-TASK-009: Only a Super User or Account Admin can reorder tasks. Collaborators cannot change the structure of the task list.

**NOTE RULES**

BR-TASK-010: Any authenticated user can add a note to a task visible to them.

BR-TASK-011: A Collaborator can only delete a note that they personally authored. Deleting another user's note requires Super User or Account Admin access.

**DELETION RULES**

BR-TASK-012: Deleting a parent task or phase also removes all child tasks associated with it. This deletion is permanent and cannot be undone.

#### 3.3.7 Integration Points
Tasks are contained within Projects and organised under Phases. Assigning team members to tasks triggers Allocation creation when auto-allocate is active. Time Entries are linked to Tasks, and logged hours roll up to the task's actual hours figures. Completing a Payment Milestone triggers Invoice creation in the Finance module. Task completion percentages and effort data feed into Project health statistics and the Burn-Down report.

#### 3.3.8 Restrictions & Exceptions
Private notes on tasks are visible only to Super Users and Account Admins; Collaborators cannot see notes marked as private. The completion percentage of a parent task or phase is automatically calculated from its children and cannot be manually overridden at the phase level through standard user interface actions.

---

### ━━━━━━━━━━━━━━━━━━━━━
### MODULE 4: ACCOUNTS
### ━━━━━━━━━━━━━━━━━━━━━

#### 3.4.1 Purpose
The Accounts module manages the organisation's roster of client relationships and internal organisational entities. Each account serves as the parent record for all projects, opportunities, and invoices associated with a given client. Accounts also carry key commercial and contact information.

#### 3.4.2 Who Uses This Module
All authenticated users can view accounts. Super Users and Account Admins can create and edit accounts.

#### 3.4.3 Key Entities Managed
**Account:** A record representing a client organisation or an internal business unit. Key attributes include the account name, domain, tier (Enterprise, Mid-Market, SMB, or Startup), geographic region, contract value, billing address, primary contact details, lead status, source, and notes. An account may be flagged as internal, which designates it as representing the operating organisation itself, for use in internal projects.

#### 3.4.4 Core Functionality
- Any authenticated user can view the list of accounts and individual account details.
- A Super User or Account Admin can create a new account.
- A Super User or Account Admin can edit an existing account.
- A Super User or Account Admin can delete an account.
- An account can be viewed as a drill-through from the accounts list to see its associated projects and opportunities.

#### 3.4.5 Workflow & State Transitions
Accounts do not have a formal approval workflow. They are active records by default. An account converted from a prospect carries a reference to the originating prospect record.

#### 3.4.6 Business Rules

**CREATION RULES**

BR-ACCT-001: An account must have a name and a domain before it can be saved.

BR-ACCT-002: An account tier must be one of: Enterprise, Mid-Market, SMB, or Startup.

BR-ACCT-003: An account designated as internal represents the operating organisation and is used as the account for internal projects.

**EDITING RULES**

BR-ACCT-004: Any field on an account can be edited by a Super User or Account Admin without restriction.

**DELETION RULES**

BR-ACCT-005: Deleting an account is a permanent operation. The system does not prevent deletion of accounts that have associated projects or invoices, but this action should be treated with care as the linked records will lose their account reference.

#### 3.4.7 Integration Points
Accounts are linked to Projects (every project belongs to one account), to Opportunities (every opportunity belongs to one account), and to Invoices (every invoice is addressed to one account). An account may originate from the conversion of a Prospect record.

#### 3.4.8 Restrictions & Exceptions
There is no duplicate-prevention rule at the account level. Two accounts with the same name can coexist. It is the user's responsibility to avoid creating duplicate records.

---

### ━━━━━━━━━━━━━━━━━━━━━
### MODULE 5: PROSPECTS
### ━━━━━━━━━━━━━━━━━━━━━

#### 3.5.1 Purpose
The Prospects module manages pre-qualified sales leads before they are elevated to full account status. It captures basic contact and company information for individuals or organisations that have expressed interest in the firm's services but have not yet become clients.

#### 3.5.2 Who Uses This Module
All authenticated users can view prospects. Super Users and Account Admins can create, edit, delete, and convert prospects.

#### 3.5.3 Key Entities Managed
**Prospect:** A lead record containing the prospect's name, company name, email address, phone number, source (how they were acquired), estimated value of the potential engagement, current status, and any additional notes.

#### 3.5.4 Core Functionality
- Any authenticated user can view the prospect list.
- A Super User or Account Admin can create a new prospect.
- A Super User or Account Admin can edit or delete a prospect record.
- A Super User or Account Admin can convert a prospect into a full client account, at which point the prospect record is marked as Converted.

#### 3.5.5 Workflow & State Transitions

**New** → (Super User or Account Admin converts) → **Converted**

Once a prospect is converted, it remains in the system as a historical record with the Converted status. The conversion action creates a new Account record linked to this prospect.

#### 3.5.6 Business Rules

**CREATION RULES**

BR-PROS-001: A prospect record must have at least a name before it can be saved. All other fields are optional.

**CONVERSION RULES**

BR-PROS-002: Converting a prospect creates a new Account record and marks the prospect as Converted. The new account carries a reference to the originating prospect.

BR-PROS-003: A prospect can only be converted once. Once a prospect is in the Converted status, it cannot be converted again.

**DELETION RULES**

BR-PROS-004: Deleting a prospect permanently removes it from the system. Converted prospects can still be deleted, but doing so removes the historical reference from the linked account.

#### 3.5.7 Integration Points
Converting a Prospect creates an Account in the Accounts module. The account retains the prospect's ID as a reference to the conversion source.

#### 3.5.8 Restrictions & Exceptions
There is no automatic deduplication for prospects. Users should manually check for existing records before creating a new prospect.

---

### ━━━━━━━━━━━━━━━━━━━━━
### MODULE 6: OPPORTUNITIES
### ━━━━━━━━━━━━━━━━━━━━━

#### 3.6.1 Purpose
The Opportunities module manages the firm's sales pipeline. Each opportunity represents a potential engagement with a client, and the module tracks the progress of that potential from initial discovery through to a final win or loss. Won opportunities can be directly converted into projects, creating a seamless handover from sales to delivery.

#### 3.6.2 Who Uses This Module
All authenticated users can view opportunities. Super Users and Account Admins can create, edit, and manage opportunities and convert them to projects.

#### 3.6.3 Key Entities Managed
**Opportunity:** A sales record linked to a client account. Key attributes include the opportunity name, the sales stage, the probability of winning (expressed as a percentage), the estimated contract value, the expected close date, and notes. The stage and probability move together through a defined sequence.

#### 3.6.4 Core Functionality
- Any authenticated user can view the list of opportunities in either a kanban or list view.
- A Super User or Account Admin can create a new opportunity and link it to an account.
- A Super User or Account Admin can update the stage, probability, and other attributes of an opportunity.
- A Super User or Account Admin can convert a Won opportunity into a project, transferring relevant data to the new project record.
- The system automatically creates soft allocations for proposed team members when an opportunity's probability crosses 70%.

#### 3.6.5 Workflow & State Transitions

**Discovery (10%)** → **Qualified (25%)** → **Proposal (50%)** → **Negotiation (75%)** → **Won (100%)** or **Lost (0%)**

At the point an opportunity crosses 70% probability (typically when entering the Negotiation stage), the system automatically creates soft allocations for any team members proposed against this opportunity. This allows capacity planning to begin before a final commitment is made.

When an opportunity reaches the Won stage, a Super User or Account Admin may convert it into a project. The conversion is a single transaction that creates the project record and links it to the winning opportunity.

#### 3.6.6 Business Rules

**CREATION RULES**

BR-OPP-001: An opportunity must be linked to a client account before it can be saved.

BR-OPP-002: Every opportunity is created at the Discovery stage with a 10% probability.

**STAGE RULES**

BR-OPP-003: Stage progression is tracked through the six defined stages: Discovery, Qualified, Proposal, Negotiation, Won, and Lost. Stages can be moved forward or backward.

BR-OPP-004: When an opportunity's probability crosses 70%, the system automatically creates soft allocations for any proposed team members. This is a system-initiated action and does not require confirmation from the user.

**CONVERSION RULES**

BR-OPP-005: Only a Won opportunity can be converted into a project. Opportunities in any other stage cannot be converted.

BR-OPP-006: Converting an opportunity to a project is a single, atomic operation. It creates the project record, links it to the account and opportunity, and transfers the proposed start date and budget.

BR-OPP-007: Once an opportunity is converted into a project, the opportunity record remains in the system and the project is linked back to it. The opportunity is not deleted.

**DELETION RULES**

BR-OPP-008: An opportunity can be deleted by a Super User or Account Admin. Deleting an opportunity does not affect any project that may have been created from it.

#### 3.6.7 Integration Points
Opportunities are linked to Accounts (one account per opportunity). When converted, an opportunity creates a Project and the project retains the opportunity reference. When probability crosses 70%, the system interacts with the Allocations module to create soft resource assignments.

#### 3.6.8 Restrictions & Exceptions
The 70% auto-allocation trigger only creates soft allocations. These do not carry over automatically as hard allocations when the project is created from the converted opportunity. Hard allocations must be created separately by a resource manager.

---

### ━━━━━━━━━━━━━━━━━━━━━
### MODULE 7: TIME TRACKING
### ━━━━━━━━━━━━━━━━━━━━━

#### 3.7.1 Purpose
The Time Tracking module captures every hour worked by every team member on every project. It provides the data foundation for project cost tracking, client invoicing, and resource utilisation reporting. The module enforces a structured submission and approval workflow, with a set of automated guardrails that prevent common time entry errors before they propagate into financial records.

#### 3.7.2 Who Uses This Module
All authenticated internal users (Account Admins, Super Users, and Collaborators) log time and manage timesheets. Super Users and Account Admins manage the approval workflow. Leave requests are submitted by all internal users and approved by designated managers or Account Admins.

#### 3.7.3 Key Entities Managed
**Time Entry:** A single record of time worked. Each entry records the date, the number of hours, a note, a project, an optional task, and a billable flag. Time entries belong to a weekly timesheet.

**Timesheet:** A weekly container for all time entries logged by a single team member in a given week. Timesheets carry a status (Draft, Submitted, Approved, or Rejected), submission and approval timestamps, and a rate snapshot that locks in billing rates at the moment of approval.

**Time-Off Request:** A formal request for leave, submitted by a team member and directed to their designated manager for approval. Each request has a start date, end date, leave type, and notes.

**Time Setting:** An organisation-level configuration record that sets the minimum and maximum hours allowed on a submitted timesheet, and the number of days after submission at which an unreviewed timesheet triggers a manager escalation notification.

#### 3.7.4 Core Functionality
- Any authenticated user can log a time entry against a project they are allocated to.
- Any authenticated user can submit their weekly timesheet for approval.
- Any authenticated user can withdraw a submitted timesheet (returning it to Draft) before it is approved.
- A Super User or Account Admin can approve, unapprove, or reject a timesheet.
- A Super User or Account Admin can bulk approve multiple timesheets in a single action.
- Any authenticated user can copy the previous week's time entries into the current week.
- Any authenticated user can populate a timesheet from their current project allocations.
- Any authenticated user can submit a time-off request.
- A designated manager or Account Admin can approve or reject a time-off request.
- A Super User or Account Admin can generate an invoice directly from an approved timesheet.

#### 3.7.5 Workflow & State Transitions

**Time Entry Guardrail Flow:**
When a time entry is submitted, the system checks it against a series of guardrails before accepting it. If a hard guardrail is triggered, the entry is rejected. If a soft guardrail is triggered, a warning is returned and the user may proceed.

Hard rejection triggers: hours outside the 0–24 range, time logged on a closed or inactive project, budget fully exhausted (100% of budget consumed by existing entries).

Soft warning triggers: daily capacity cap exceeded (hours for that day across all projects exceeds the user's capacity), budget nearly exhausted (between 90% and 100% consumed), potential billable anomaly detected by AI review, duplicate entry on same day and project.

**Timesheet Lifecycle:**

**Draft** → (team member submits) → **Submitted**
**Submitted** → (manager or admin approves) → **Approved**
**Submitted** → (manager or admin rejects with note) → **Draft**
**Approved** → (Super User or Admin unapproves) → **Submitted**
**Draft or Submitted** → (owner withdraws) → **Draft**

On approval, the system captures a rate snapshot of each team member's billing rate from their allocation record. This snapshot is immutable after approval and forms the basis of invoice generation.

If a timesheet remains in Submitted status beyond the organisation's configured escalation threshold (number of days), the system automatically sends a notification to the submitter's manager.

**Time-Off Request Lifecycle:**

**Pending** → (manager or Account Admin approves) → **Approved**
**Pending** → (manager or Account Admin rejects) → **Rejected**

When a time-off request is approved, the system automatically checks for any hard allocations belonging to the same team member that overlap with the leave dates. If conflicts are found, the relevant project managers are notified and the conflicting allocations are flagged as at-risk.

#### 3.7.6 Business Rules

**TIME ENTRY CREATION RULES**

BR-TIME-001: A time entry must record more than zero hours and no more than twenty-four hours. Entries of exactly zero or more than twenty-four hours are rejected.

BR-TIME-002: A time entry cannot be logged against a project that is closed or marked as inactive. Such entries are rejected.

BR-TIME-003: A time entry cannot be logged on a weekend or on a date that falls on a public holiday defined in the team member's assigned holiday calendar.

BR-TIME-004: When the total hours logged against a project's budget reach one hundred percent, further time entries are rejected with a hard guardrail. No additional time can be logged until the budget is increased through a Change Order.

BR-TIME-005: When the total hours logged against a project's budget reach ninety percent, the system returns a soft warning. The team member may acknowledge the warning and proceed.

BR-TIME-006: If a team member attempts to log time on the same project on the same date as an existing entry, the system flags this as a potential duplicate and issues a soft warning.

BR-TIME-007: When a time entry is created, the system performs an AI-based check on whether the billable designation appears appropriate for the project type and task. If an anomaly is detected, a soft warning is returned.

BR-TIME-008: The total hours a team member logs in a day across all projects are checked against their configured weekly capacity divided by five working days. If this daily figure is exceeded, a soft warning is returned.

**TIMESHEET SUBMISSION RULES**

BR-TIME-009: A timesheet cannot be submitted if its total hours fall below the minimum hours threshold set in the organisation's time settings.

BR-TIME-010: A timesheet cannot be submitted if its total hours exceed the maximum hours threshold set in the organisation's time settings.

BR-TIME-011: A team member can withdraw a submitted timesheet (returning it to Draft status) at any point before it is approved.

**TIMESHEET APPROVAL RULES**

BR-TIME-012: A manager cannot approve a timesheet submitted by themselves. Self-approval is rejected.

BR-TIME-013: A timesheet may be approved only by the submitter's designated manager or by an Account Admin.

BR-TIME-014: At the moment a timesheet is approved, the system records a snapshot of each team member's bill rate from their allocation record. This rate snapshot is permanently associated with the timesheet and cannot be modified after approval.

BR-TIME-015: Rate snapshot writes for the same timesheet are serialised to prevent data inconsistencies when multiple approval actions are triggered simultaneously.

BR-TIME-016: Approving a timesheet triggers an automated effort overrun check. If the total logged hours on any task exceed ninety percent of that task's estimated hours, the project owner is notified. This notification is sent once per task per project lifetime; it does not repeat on subsequent approvals.

**TIMESHEET REJECTION RULES**

BR-TIME-017: A timesheet rejection must include a written note explaining the reason for rejection. A rejection without a note is not accepted.

BR-TIME-018: A manager cannot reject a timesheet they submitted themselves.

**BULK APPROVAL RULES**

BR-TIME-019: When a Super User or Account Admin bulk approves a set of timesheets, any timesheet submitted by that same user is silently skipped (not rejected with an error). The response indicates how many timesheets were approved, how many were skipped due to self-approval, and how many were skipped for other reasons.

**TIMESHEET ESCALATION RULES**

BR-TIME-020: If a timesheet remains in Submitted status for more days than the escalation threshold configured in the organisation's time settings, the system automatically sends a notification to the submitter's manager. The escalation threshold is configurable. Setting the threshold to zero or below disables escalation.

BR-TIME-021: If a timesheet transitions out of Submitted status for any reason (approved, rejected, or withdrawn), the escalation timer is reset. If the timesheet returns to Submitted status at a later date, the escalation clock starts fresh.

**TIME-OFF RULES**

BR-TIME-022: A time-off request cannot be submitted if the entire requested date range falls on public holidays already defined in the team member's holiday calendar. The system blocks the submission with a clear explanation.

BR-TIME-023: A time-off request may only be approved or rejected by the team member's designated manager or by an Account Admin. Other Super Users without a management relationship to the requester cannot approve or reject the request.

BR-TIME-024: When a time-off request is approved, the system automatically checks for any hard (confirmed) allocations belonging to the same team member that overlap with the leave dates. For each conflict found, the relevant project manager is notified, and the allocation is flagged with an at-risk status. This check runs automatically and does not block the approval response.

BR-TIME-025: A team member cannot approve their own time-off request.

**COPY AND IMPORT RULES**

BR-TIME-026: The copy last week feature recreates the previous week's time entries in the current week, mapped to the corresponding day of the new week. Entries from a locked week (an approved or closed period) are not copied.

BR-TIME-027: The import from allocations feature pre-populates a draft timesheet with time entries based on the team member's active allocations for that week. The user reviews and edits these entries before submitting.

#### 3.7.7 Integration Points
Time Entries are linked to Projects and optionally to Tasks. Approved Timesheets feed into the Finance module for invoice generation. The rate snapshot on an approved timesheet reads billing rates from the Allocations module. Time-off approval triggers conflict checks in the Allocations module and sends Notifications to project managers. The escalation cron interacts with the Notifications module.

#### 3.7.8 Restrictions & Exceptions
The time entry guardrail system operates at the point of entry creation. It does not retroactively invalidate previously accepted entries if project conditions change after the fact (e.g., a project is closed after time has been logged). All guardrail checks are applied in sequence; a hard block on any check prevents the entry from being saved regardless of other checks.

---

### ━━━━━━━━━━━━━━━━━━━━━
### MODULE 8: RESOURCES
### ━━━━━━━━━━━━━━━━━━━━━

#### 3.8.1 Purpose
The Resources module gives delivery leaders a real-time view of team capacity and project staffing. It manages the formal assignment of team members to projects (allocations), enables proactive capacity planning, handles structured staffing requests, and surfaces skill-based resource matching. The module prevents over-commitment of team members and provides the data foundation for utilisation reporting.

#### 3.8.2 Who Uses This Module
Super Users and Account Admins manage allocations and resource requests. All authenticated users can view allocation information. Super Users use the AI-assisted resource suggestion feature. Resource managers view the capacity heatmap, resource timeline, skills matrix, and bench tracking views.

#### 3.8.3 Key Entities Managed
**Allocation:** A formal record linking a team member to a project for a defined period, at a specified number of hours per week. Allocations can be soft (provisional, used for pipeline planning) or hard (confirmed commitments). Allocations carry a project role, optional skill requirements, approver flags (whether this person approves timesheets or leave for project-related matters), and a status that can be flagged as at-risk when a leave conflict is detected.

**Resource Request:** A request to staff a specific role or skill on a project. The request goes through a formal lifecycle including review, potential alternative proposals, approval, and fulfilment. When a resource request is fulfilled, the system automatically creates a hard allocation for the assigned team member.

**Skills Matrix:** An aggregated view of all team members' skills and proficiency levels, used to identify capability gaps and match talent to project needs.

#### 3.8.4 Core Functionality
- A Super User or Account Admin can create a new allocation, assigning a team member to a project with a defined start date, end date, and hours per week.
- A Super User or Account Admin can preview the capacity impact of a proposed allocation before committing it.
- A Super User or Account Admin can preview the impact of multiple allocation changes simultaneously.
- A Super User or Account Admin can update an existing allocation.
- A Super User or Account Admin can delete an allocation.
- A Super User or Account Admin can bulk update multiple allocations in a single transaction.
- A Super User or Account Admin can create a resource request for a role on a project.
- A Super User or Account Admin can advance a resource request through its lifecycle, including assigning a specific team member to fulfil it.
- A Super User or Account Admin can request AI-powered suggestions for the best-matched team members for a resource request, based on skill fit and available capacity.

#### 3.8.5 Workflow & State Transitions

**Allocation Lifecycle:**
Allocations do not follow a formal approval workflow. They are created directly by a Super User or Account Admin. The system validates capacity at the point of creation.

**Allocation Status:**
- **Normal:** The default state of an allocation in good standing.
- **At Risk:** The system flags an allocation as at-risk when it detects that the allocated team member has an approved time-off request overlapping with the allocation dates. This flag is set automatically and notifies the project manager. Human review is required; the system does not automatically cancel or reassign the allocation.

**Resource Request Lifecycle:**

**Pending** → (resource manager moves to review) → **In Review**
**In Review** → (alternative candidate proposed) → **Alternative Proposed**
**In Review** → (approved, not self) → **Approved**
**In Review** → (rejected, not self) → **Rejected**
**Approved** → (team member assigned) → **Fulfilled** (allocation auto-created)
**In Review** → (blocked by dependency) → **Blocked**

#### 3.8.6 Business Rules

**ALLOCATION CREATION RULES**

BR-RES-001: Creating an allocation requires a project, a team member, a start date, an end date, a role, and a weekly hours figure.

BR-RES-002: If the proposed allocation would cause the team member's daily committed hours (across all hard allocations and accounting for holidays and approved leave) to exceed their configured capacity, the system blocks the allocation with an over-allocation error. The project manager must resolve the conflict before proceeding.

BR-RES-003: Soft allocations are not subject to the same over-allocation check as hard allocations. They are used for planning and do not constitute firm commitments.

BR-RES-004: If an allocation specifies a required skill and proficiency level, the system checks whether the assigned team member holds that skill at or above the required proficiency. If the skill requirement is not met, the system returns a skill mismatch error.

BR-RES-005: A skill mismatch can be bypassed by a Super User or Account Admin who provides an explicit written override reason. The override is recorded in the audit log.

**CAPACITY PREVIEW RULES**

BR-RES-006: The capacity preview function calculates the utilisation percentage for each week within the proposed allocation period, accounting for existing allocations, holidays, and approved leave. This calculation is read-only and does not create or modify any allocation.

**RESOURCE REQUEST RULES**

BR-RES-007: A resource request cannot be approved by the person who created it. Self-approval is rejected.

BR-RES-008: When a resource request moves to Fulfilled status, the system automatically creates a hard allocation for the assigned team member, using the dates and role defined in the request. No separate allocation creation step is required.

**LEAVE CONFLICT RULES**

BR-RES-009: When a time-off request is approved, the system automatically checks all hard allocations for the same team member for date overlaps. For each overlap found, the allocation status is changed to at-risk and the relevant project manager is notified. This check runs without blocking the approval response.

BR-RES-010: The system does not automatically cancel or reassign allocations flagged as at-risk. Human review and manual resolution are required.

**AI SUGGESTION RULES**

BR-RES-011: The AI resource suggestion feature evaluates available team members using a composite score that combines skill match percentage and available capacity percentage. The top three candidates are presented to the resource manager.

#### 3.8.7 Integration Points
Allocations link Users to Projects. When a Resource Request is fulfilled, an Allocation is created in this module. Approved Time-Off Requests trigger conflict checks against Allocations. The rate snapshot on Timesheets reads billing rates from Allocation records. Skills information is read from the Admin module. The Allocations module feeds into utilisation calculations in the Reports module.

#### 3.8.8 Restrictions & Exceptions
Capacity preview and bulk preview are read-only operations; they do not create or modify allocations. The at-risk flagging process is fully automated and fire-and-forget — it runs after the approval response is sent and cannot block the approval. Only hard allocations trigger over-allocation checks; soft allocations are excluded from capacity validation.

---

### ━━━━━━━━━━━━━━━━━━━━━
### MODULE 9: FINANCE
### ━━━━━━━━━━━━━━━━━━━━━

#### 3.9.1 Purpose
The Finance module manages the complete client billing lifecycle, from invoice creation through to payment recording, as well as revenue recognition, contracts, and the financial governance of project budgets through Change Orders and billing schedules. It provides finance users with the tools to generate accurate, compliant invoices and track the firm's revenue in real time.

#### 3.9.2 Who Uses This Module
Super Users and Account Admins access all finance functions. Collaborators have no access to any finance module.

#### 3.9.3 Key Entities Managed
**Invoice:** A billing document addressed to a client account, linked to a project. Each invoice has a unique identifier in the format INV-YYYY-NNN, an issue date, a due date, a status, a total amount, a tax amount, a line item breakdown, and notes. Invoices can be created manually, generated from an approved timesheet, or generated automatically when a Payment Milestone is completed.

**Invoice Line Item:** A row on an invoice describing a specific item billed. Each line item has a description, quantity, unit price, and total amount.

**Invoice Payment:** A record of a payment received against an invoice. Multiple partial payments can be recorded against a single invoice.

**Revenue Entry:** A monthly record of recognised revenue for a project. Revenue entries contribute to the Revenue report and allow the firm to track when income is earned versus when it is invoiced.

**Contract:** A project-level legal agreement record. Each contract belongs to one project and tracks the contract name, status, start and end dates, total value, a link to the contract document, and notes.

**Billing Schedule:** A pre-agreed plan for when invoices will be raised against a project.

**Tax Code:** An organisation-wide tax rate configuration, identified by a name and percentage. Tax codes are applied to invoices to compute the tax component of the total.

#### 3.9.4 Core Functionality
- A Super User or Account Admin can create a draft invoice manually, specifying the project, account, amount, tax, due date, and line items.
- A Super User or Account Admin can generate a draft invoice directly from an approved timesheet, using the rate-snapshotted hours to calculate the billable amount.
- The system automatically creates a draft invoice when a Payment Milestone task is marked as Completed.
- A Super User or Account Admin can advance an invoice through its approval workflow.
- A Super User or Account Admin can record partial or full payments against a sent invoice.
- A Super User or Account Admin can void an invoice at any stage.
- A Super User or Account Admin can view finance summary KPIs across all invoices.
- A Super User or Account Admin can manage revenue entries for a project.
- A Super User or Account Admin can create, edit, and delete project contracts.
- A Super User or Account Admin can view and manage billing schedules.

#### 3.9.5 Workflow & State Transitions

**Invoice Lifecycle:**

**Draft** → (finance user submits for review) → **In Review**
**Draft** → (finance user voids) → **Void**
**In Review** → (finance user approves) → **Approved**
**In Review** → (finance user returns for revision) → **Draft**
**In Review** → (finance user voids) → **Void**
**Approved** → (finance user sends to client) → **Sent**
**Approved** → (finance user returns) → **In Review**
**Approved** → (finance user voids) → **Void**
**Sent** → (payment recorded in full) → **Paid**
**Sent** → (due date passes without payment) → **Overdue** (automatic)
**Sent** → (finance user voids) → **Void**
**Overdue** → (finance user voids) → **Void**
**Paid** → (finance user voids) → **Void**

**Void** is the only terminal state. Any invoice can be voided from any other status.

The transition from Sent to Overdue is automatic. When the system lists invoices, any invoice in Sent status whose due date has passed is automatically marked as Overdue.

#### 3.9.6 Business Rules

**INVOICE CREATION RULES**

BR-FIN-001: An invoice must be linked to both a project and a client account before it can be saved.

BR-FIN-002: The invoice amount must be zero or greater. Negative amounts are not accepted.

BR-FIN-003: The tax amount on an invoice must be zero or greater. Negative tax values are not accepted.

BR-FIN-004: Every invoice is assigned a unique identifier following the format INV-YYYY-NNN, where YYYY is the year of creation and NNN is a sequential number within that year. This identifier cannot be manually changed.

BR-FIN-005: An invoice generated from an approved timesheet uses the rate snapshot captured at timesheet approval time. The hours and rates from the snapshot form the basis of the invoice amount and are not subject to retrospective modification.

BR-FIN-006: When a Payment Milestone task is marked as Completed, the system automatically creates a draft invoice. This invoice creation requires no manual action from a finance user.

**INVOICE STATUS RULES**

BR-FIN-007: Invoices must follow the defined status transition sequence. Advancing an invoice to a status that is not a permitted next step from the current status is rejected.

BR-FIN-008: Any invoice can be voided from any status. Voiding is an irreversible action — a voided invoice cannot be reinstated.

BR-FIN-009: The system automatically transitions a Sent invoice to Overdue when its due date has passed. This happens without manual action at the time the invoice list is retrieved.

**PAYMENT RULES**

BR-FIN-010: Payments can only be recorded against an invoice that is in Sent or Overdue status.

BR-FIN-011: Multiple partial payments can be recorded against a single invoice. Each payment records the amount, date, and reference.

**CONTRACT RULES**

BR-FIN-012: A contract must be linked to a project before it can be saved.

BR-FIN-013: There is no enforced limit on the number of contracts that can be associated with a single project.

**BUDGET AND CHANGE ORDER RULES**

BR-FIN-014: A change order amount and its additional hours figure must each be zero or greater. Negative values are not accepted.

BR-FIN-015: Only one Statement of Work budget entry is permitted per project. Attempting to create a second SOW entry for the same project is rejected.

BR-FIN-016: Subsequent budget modifications must be recorded as Adjustment budget entries, not as additional SOW entries.

#### 3.9.7 Integration Points
Invoices are linked to Projects and Accounts. Invoice generation from timesheets reads the rate snapshot from the Timesheets module. Milestone completion in the Tasks module triggers automatic invoice creation in this module. Tax codes from the Admin module are applied to invoices. Revenue entries contribute to the Revenue report in the Reports module.

#### 3.9.8 Restrictions & Exceptions
Collaborators have zero access to any finance function — they cannot view, create, or modify any invoice, payment, contract, or revenue entry. Invoice deletion permanently removes the record; deletion should be used with care. Once a rate snapshot is recorded on an approved timesheet, it cannot be altered even if the underlying rate card or allocation rates are subsequently changed.

---

### ━━━━━━━━━━━━━━━━━━━━━
### MODULE 10: REPORTS
### ━━━━━━━━━━━━━━━━━━━━━

#### 3.10.1 Purpose
The Reports module provides analytical views across every operational dimension of the platform. It allows delivery leaders and finance teams to understand project performance, resource utilisation, revenue trends, and customer satisfaction without requiring manual data extraction. All reports are computed from live data.

#### 3.10.2 Who Uses This Module
Super Users and Account Admins have full access to all reports. Collaborators may access a restricted version of reports relevant to their own work, with sensitive financial data masked.

#### 3.10.3 Key Entities Managed
Reports do not manage or store their own data. They read from and aggregate data held in the Projects, Tasks, Time Entries, Timesheets, Invoices, Allocations, and CSAT modules.

#### 3.10.4 Core Functionality
The Reports module provides nine distinct analytical views:

**Performance Report:** Shows project on-time delivery rate and average CSAT scores across projects.

**Operations Report:** Highlights scope creep by comparing the number of tasks actually completed to the number originally planned, segmented by project template.

**CSAT Trend Report:** Displays customer satisfaction ratings over time as a line chart, enabling trend identification.

**Interval IQ Report:** Compares the actual duration of key project milestones to established benchmarks, identifying where engagements consistently run long or short.

**Budget vs Actuals Report:** Compares the approved budget to actual spend, and budgeted hours to actual tracked hours, for each project.

**Burn-Down Report:** Shows the rate at which a project's budget and hours are being consumed over time as a time-series chart.

**Revenue Report:** Shows the monthly revenue recognised across all projects, aggregated from revenue entry records.

**Utilisation Report:** Shows the percentage of each team member's capacity that is committed to billable projects, both by individual and across the team.

**Project Health Report:** Provides an at-a-glance health indicator for every active project, drawing on health status, budget burn, task completion, and CSAT.

#### 3.10.5 Workflow & State Transitions
Reports are read-only views. There are no workflow transitions in this module.

#### 3.10.6 Business Rules

**ACCESS RULES**

BR-RPT-001: The full set of reports is accessible to Super Users and Account Admins. Collaborators can view a restricted subset of report data that relates to their own work, with cost rate and financial figures masked.

**DATA RULES**

BR-RPT-002: All report data is computed at the time of viewing from live operational records. Reports are not pre-computed or cached independently.

BR-RPT-003: Utilisation percentages are calculated by dividing the total hard-allocated hours for a team member in a given period by their configured weekly capacity for the same period.

BR-RPT-004: The Interval IQ report compares actual elapsed time between recorded key events to the benchmark durations stored in the system. A positive variance indicates the actual duration exceeded the benchmark.

#### 3.10.7 Integration Points
Reports read data from all operational modules: Projects, Tasks, Time Entries, Timesheets, Invoices, Allocations, CSAT ratings, and Revenue Entries. Reports do not write to any module.

#### 3.10.8 Restrictions & Exceptions
Collaborators see a masked version of any report that contains financial figures such as cost rates, billing rates, or invoice amounts. The masking is enforced at the data layer and cannot be circumvented through the user interface.

---

### ━━━━━━━━━━━━━━━━━━━━━
### MODULE 11: ADMIN
### ━━━━━━━━━━━━━━━━━━━━━

#### 3.11.1 Purpose
The Admin module is the configuration control centre for the entire platform. It allows Account Admins to manage users, define organisational standards (skills, rate cards, templates, calendars), configure financial settings, and maintain the audit log. Proper configuration of this module is a prerequisite for most other modules to operate correctly.

#### 3.11.2 Who Uses This Module
The Admin module is primarily the domain of Account Admins. Super Users have read access to rate cards and project templates. All authenticated users can view the skills list and holiday calendars.

#### 3.11.3 Key Entities Managed
**User:** A person with access to the platform. Each user has a name, email address, primary role, optional secondary roles, weekly capacity in hours, cost rate, department, region, a designated manager, a holiday calendar assignment, and an active/inactive status.

**Skill:** A professional capability that can be assigned to team members and required by resource allocations.

**Rate Card:** A pricing schedule that lists the bill rate for each role type. Rate cards are assigned to projects and used to calculate the billable value of approved timesheets.

**Project Template:** A reusable project structure that defines the standard phases and tasks for a repeatable type of engagement.

**Document Template:** A pre-written document structure that can be applied when creating documents within a project.

**Tax Code:** An organisation-wide tax rate, applied when creating invoices.

**Holiday Calendar:** A named set of public holidays, assigned to individual team members. The platform uses this calendar to block time entries on holiday dates and to deduct holiday coverage from capacity calculations.

**Custom Field Definition:** An organisation-specific data field that extends the standard attributes of a system entity (such as a project or task) with additional information relevant to the business.

**Audit Log:** An immutable record of every create, update, delete, and status change action performed in the system, recording the actor, the timestamp, and the before-and-after values.

#### 3.11.4 Core Functionality
- An Account Admin can create, edit, deactivate, and reactivate user accounts.
- An Account Admin can assign and modify primary and secondary roles.
- An Account Admin can manage the full skills library and the skills matrix.
- An Account Admin can create and manage rate cards and their per-role bill rates.
- An Account Admin can create and manage project templates.
- An Account Admin can create and manage document templates.
- An Account Admin can create and manage holiday calendars.
- An Account Admin can create and manage tax codes.
- An Account Admin can define and manage custom fields for any supported entity type.
- An Account Admin can view the full audit log.
- An Account Admin can manage company-wide settings.
- An Account Admin can view and manage archived projects.

#### 3.11.5 Workflow & State Transitions

**User Lifecycle:**

**Active** → (Account Admin deactivates) → **Inactive**
**Inactive** → (Account Admin reactivates) → **Active**

Deactivation is a soft operation — the user record is retained in the system with all its history. The user simply loses the ability to log in.

#### 3.11.6 Business Rules

**USER MANAGEMENT RULES**

BR-ADM-001: Only an Account Admin can create a new user account.

BR-ADM-002: Only an Account Admin can modify a user's primary or secondary roles.

BR-ADM-003: Only an Account Admin can deactivate a user account.

BR-ADM-004: Only an Account Admin can reactivate a previously deactivated user.

BR-ADM-005: User deactivation does not permanently delete the user or any of their historical records. Time entries, timesheets, and allocations associated with a deactivated user remain in place.

BR-ADM-006: A user's weekly capacity must be recorded in hours and is used by the over-allocation guard when calculating whether a new allocation would exceed the team member's available time.

**RATE CARD RULES**

BR-ADM-007: Rate cards are created by Account Admins and can be viewed by Super Users and Account Admins. Collaborators do not have access to rate card information.

BR-ADM-008: A rate card specifies the bill rate for one or more named roles. The bill rate is the charge-out rate applied when calculating the billable value of approved timesheets.

**SKILL RULES**

BR-ADM-009: Skills are organisation-wide and can be assigned to any team member. Any authenticated user can view the skills list.

BR-ADM-010: Skills can be required on allocations at a specified proficiency level, triggering the skill mismatch validation when a team member is assigned.

**HOLIDAY CALENDAR RULES**

BR-ADM-011: Holiday calendars are assigned at the user level. A team member's calendar determines which dates the system treats as non-working days for time entry blocking and capacity calculations.

**AUDIT LOG RULES**

BR-ADM-012: The audit log is append-only. No entry in the audit log can be edited or deleted through any user interface operation.

BR-ADM-013: The audit log is accessible only to Account Admins.

BR-ADM-014: Every create, update, delete, and status change action across all modules generates an audit log entry recording the entity type, the entity identifier, the action performed, the actor's identity, the timestamp, and the before-and-after field values where applicable.

**INVITE RULES**

BR-ADM-015: An Account Admin can invite a user at any role level.

BR-ADM-016: A Super User can invite users at the Collaborator or Customer level only.

BR-ADM-017: A Collaborator can invite users at the Customer level only.

#### 3.11.7 Integration Points
The Admin module provides configuration data consumed by all other modules: user records (consumed by all), skills (consumed by Allocations), rate cards (consumed by Timesheets and Finance), holiday calendars (consumed by Time Tracking and Allocations), project templates (consumed by Projects), document templates (consumed by Documents), tax codes (consumed by Finance), and custom fields (consumed by any entity they are defined for). The Audit Log receives entries from all modules.

#### 3.11.8 Restrictions & Exceptions
Secondary roles allow a user to operate under multiple role levels (for example, a user whose primary role is Collaborator may hold Super User as a secondary role for specific management responsibilities). The system validates the claimed role against the full set of assigned roles (primary and secondary) at the time of each request.

---

### ━━━━━━━━━━━━━━━━━━━━━
### MODULE 12: NOTIFICATIONS
### ━━━━━━━━━━━━━━━━━━━━━

#### 3.12.1 Purpose
The Notifications module delivers real-time system alerts to individual users, ensuring that relevant events — such as timesheet approvals, project status changes, and resource conflicts — are brought to the attention of the right person without requiring them to actively check every module.

#### 3.12.2 Who Uses This Module
All authenticated users receive notifications relevant to their role and involvement in projects. There are no role restrictions on the notifications feed itself.

#### 3.12.3 Key Entities Managed
**Notification:** A message delivered to a specific user, categorised by type, linked to the entity that triggered it, carrying a read or unread status, and timestamped.

The following notification types are generated by the system:

- Project status changed (sent to all allocated team members and the project owner)
- Timesheet submitted, approved, rejected, or escalated
- Leave and allocation conflict detected (sent to affected project managers)
- Effort overrun detected on a task (sent to project owner)
- Resource request status updated

#### 3.12.4 Core Functionality
- Any authenticated user can view their own notification feed.
- Any authenticated user can mark individual notifications as read.
- Any authenticated user can mark all notifications as read in a single action.
- The notification feed shows an unread badge count reflecting unread items.

#### 3.12.5 Workflow & State Transitions

**Unread** → (user views or marks as read) → **Read**

Notifications cannot be deleted through the user interface. They remain as a permanent record of system events.

#### 3.12.6 Business Rules

BR-NOTF-001: Notifications are generated automatically by system events. Users cannot manually create notifications.

BR-NOTF-002: A notification is delivered only to the specific user or users directly affected by the triggering event. Notifications are never broadcast to all users.

BR-NOTF-003: All notification-generating processes run without blocking the primary operation that triggered them. A failure in notification delivery does not cause the triggering action to fail.

BR-NOTF-004: The unread count displayed in the interface reflects only notifications that have not yet been viewed or explicitly marked as read by the receiving user.

#### 3.12.7 Integration Points
Notifications are generated by: the Projects module (status changes), the Timesheets module (submission, approval, rejection, escalation), the Resources module (leave-allocation conflicts, effort overruns), and the Resource Requests module (status changes).

#### 3.12.8 Restrictions & Exceptions
Users cannot configure their own notification preferences in the current version. All system-generated notification types are always active. Notification delivery is fire-and-forget — if a notification fails to send due to a system error, it is not retried.

---

### ━━━━━━━━━━━━━━━━━━━━━
### MODULE 13: CSAT
### ━━━━━━━━━━━━━━━━━━━━━

#### 3.13.1 Purpose
The CSAT (Customer Satisfaction) module collects and displays satisfaction ratings for each project. These ratings provide delivery leaders with a direct measure of client sentiment and contribute to performance reporting.

#### 3.13.2 Who Uses This Module
Any authenticated user can submit a CSAT rating for a project. Super Users and Account Admins can view the CSAT distribution for each project and the aggregate CSAT trend in the Reports module.

#### 3.13.3 Key Entities Managed
**CSAT Rating:** A star rating (typically on a one-to-five scale) submitted for a specific project, accompanied by optional notes.

#### 3.13.4 Core Functionality
- Any authenticated user can submit a CSAT star rating for a project they are associated with.
- Super Users and Account Admins can view the CSAT rating distribution for each project.
- CSAT trend data is surfaced in the Reports module as a time-series view.

#### 3.13.5 Workflow & State Transitions
CSAT ratings do not follow an approval workflow. They are submitted directly and become immediately available in the project's CSAT view.

#### 3.13.6 Business Rules

BR-CSAT-001: A CSAT rating must be linked to a project. Unlinked ratings are not accepted.

BR-CSAT-002: CSAT ratings are read-only once submitted. They cannot be edited or retracted after submission.

#### 3.13.7 Integration Points
CSAT ratings are linked to Projects. Aggregate CSAT data feeds into the Performance Report and CSAT Trend Report in the Reports module.

#### 3.13.8 Restrictions & Exceptions
There is no enforced limit on the number of CSAT ratings that can be submitted for a single project. Multiple ratings from the same user for the same project are permitted.

---

### ━━━━━━━━━━━━━━━━━━━━━
### MODULE 14: PORTFOLIO / COMMAND CENTRE
### ━━━━━━━━━━━━━━━━━━━━━

#### 3.14.1 Purpose
The Portfolio Command Centre gives senior leaders and delivery managers a cross-project view of the organisation's entire project portfolio. It aggregates health indicators, budget burn, billing status, and resource alerts across all active engagements in a single dashboard, enabling portfolio-level decision making.

#### 3.14.2 Who Uses This Module
Account Admins and Super Users with team management permissions access the Command Centre. It is not available to Collaborators.

#### 3.14.3 Key Entities Managed
The Command Centre does not manage its own data. It displays aggregated data from Projects, Invoices, Allocations, Tasks, and Time Entries.

#### 3.14.4 Core Functionality
- A Super User or Account Admin can view the consolidated health status of all active projects.
- Budget burn percentages, tracked hours, and billing KPIs are visible across all projects simultaneously.
- Resource alerts (over-allocation, at-risk allocations) are surfaced at the portfolio level.

#### 3.14.5 Business Rules

BR-PORT-001: The Command Centre is restricted to users with the team management permission. It is not accessible to Collaborators.

BR-PORT-002: All figures displayed in the Command Centre are computed from live data at the time of viewing and are not pre-aggregated.

#### 3.14.7 Integration Points
The Command Centre reads from Projects, Tasks, Invoices, Allocations, and Time Entries. It does not write to any module.

---

### ━━━━━━━━━━━━━━━━━━━━━
### MODULE 15: DOCUMENTS
### ━━━━━━━━━━━━━━━━━━━━━

#### 3.15.1 Purpose
The Documents module provides a structured repository for all documents associated with a project. It supports versioned document storage, an approval workflow for documents that require sign-off, and the ability to create documents from pre-defined templates maintained in the Admin module.

#### 3.15.2 Who Uses This Module
Super Users and Account Admins create and manage documents. All authenticated users associated with a project can view documents. Account Admins manage the library of document templates.

#### 3.15.3 Key Entities Managed
**Document:** A project-level file or written artefact with a name, document type, content, an optional file attachment, an approval status, a version number, and a record of who created it.

**Document Version:** A historical snapshot of a document at a point in time, recording the content and the editor at each version.

**Document Template:** A reusable document structure maintained by an Account Admin. Templates can be applied when creating a new document, pre-populating standard sections and placeholder content.

#### 3.15.4 Core Functionality
- A Super User or Account Admin can create a document within a project, either from scratch or by applying a document template.
- A Super User or Account Admin can edit a document, generating a new version in the version history.
- All authenticated users associated with a project can view its documents.
- Super Users and Account Admins can manage the document approval status.

#### 3.15.5 Workflow & State Transitions

**Document Approval Lifecycle:**

**Pending** → (Super User or Account Admin approves) → **Approved**
**Pending** → (Super User or Account Admin rejects) → **Rejected**
**Rejected** → (document revised and resubmitted) → **Pending**

#### 3.15.6 Business Rules

BR-DOC-001: A document must be linked to a project before it can be saved.

BR-DOC-002: Every edit to a document creates a new version entry in the version history. Previous versions are retained.

BR-DOC-003: Document templates are managed by Account Admins. Super Users and Collaborators can apply templates but cannot create or modify them.

#### 3.15.7 Integration Points
Documents are linked to Projects. Document Templates are managed in the Admin module and applied in the Documents module.

---

### ━━━━━━━━━━━━━━━━━━━━━
### MODULE 16: AUDIT LOG
### ━━━━━━━━━━━━━━━━━━━━━

#### 3.16.1 Purpose
The Audit Log provides a complete, tamper-proof record of every significant action taken in the system. It supports compliance, governance, dispute resolution, and operational transparency by recording who did what, when, and what the data looked like before and after the change.

#### 3.16.2 Who Uses This Module
Only Account Admins can view the audit log. The log is populated automatically by all other modules; no user manually writes to it.

#### 3.16.3 Key Entities Managed
**Audit Log Entry:** An immutable record containing the entity type affected (e.g., project, invoice, user), the entity's unique identifier, the action performed (created, updated, deleted, status changed, submitted, approved, or rejected), the identity of the actor, the timestamp, and the field values before and after the change.

#### 3.16.4 Core Functionality
- An Account Admin can view the full audit log, filtered by entity type, action, actor, or date range.
- The system automatically generates an audit log entry for every create, update, delete, status change, submission, approval, and rejection across all modules.

#### 3.16.5 Business Rules

BR-AUD-001: The audit log is append-only. No audit entry can be edited, deleted, or modified through any means available in the user interface.

BR-AUD-002: An audit log entry is created for every creation, update, deletion, and status change of any entity in the system.

BR-AUD-003: The audit log is accessible only to users holding the Account Admin role.

BR-AUD-004: The valid action values recorded in the audit log are: created, updated, deleted, status changed, submitted, approved, and rejected. No other action types are recorded.

BR-AUD-005: Role switch events (a user changing their active role during a session) are recorded in the audit log as a distinct action type.

#### 3.16.7 Integration Points
The Audit Log receives entries from every module. It has no outbound integrations.

---

### ━━━━━━━━━━━━━━━━━━━━━
### MODULE 17: ASSETS
### ━━━━━━━━━━━━━━━━━━━━━

#### 3.17.1 Purpose
The Assets module maintains a register of physical or digital assets owned or managed by the organisation (such as equipment, licences, or facilities) and tracks how those assets are booked against projects.

#### 3.17.2 Who Uses This Module
Super Users and Account Admins create and manage assets and bookings. All authenticated users can view the asset register.

#### 3.17.3 Key Entities Managed
**Asset:** A named organisational resource with a type, capacity, and an organisational owner.

**Asset Booking:** A record linking an asset to a project for a defined date range, recording who made the booking.

#### 3.17.4 Core Functionality
- Any authenticated user can view the asset register.
- A Super User or Account Admin can create and manage assets.
- A Super User or Account Admin can create and manage asset bookings against projects.

#### 3.17.5 Business Rules

BR-AST-001: An asset booking must specify the asset, the project, the start date, the end date, and the user who made the booking.

BR-AST-002: There is no automated conflict detection for asset bookings. It is the user's responsibility to check availability before booking an asset.

#### 3.17.7 Integration Points
Asset Bookings are linked to Projects. Asset data is otherwise self-contained within this module.

---

## SECTION 4 — CROSS-MODULE BUSINESS RULES

### 4.1 Data Integrity Rules

BR-XMOD-001: Every project must be linked to a valid account. A project cannot exist without an associated account record.

BR-XMOD-002: Every invoice must be linked to both a project and a client account. An invoice without either of these links is not accepted.

BR-XMOD-003: Every time entry must be linked to a project. Time entries cannot float unattached to a project.

BR-XMOD-004: Every allocation must link a specific team member to a specific project with a defined date range and hours per week.

BR-XMOD-005: When a project is archived, all associated tasks, allocations, budget entries, contracts, and RAID items remain intact and accessible through the archived project view. They are not independently deleted.

BR-XMOD-006: Deleting a project task cascade-deletes all child tasks beneath it. This cascade is permanent.

BR-XMOD-007: Deleting a project (archiving) does not delete its invoices. Invoice records are preserved and remain linked to the account for billing history purposes.

### 4.2 Workflow Sequencing Rules

BR-XMOD-008: A project must exist before tasks can be created within it.

BR-XMOD-009: A project must be in Active status for time entries to be accepted against it. Time logging against a project in Draft, Completed, Cancelled, or On Hold status is blocked.

BR-XMOD-010: A timesheet must be in Approved status before an invoice can be generated from it. Generating an invoice from an unapproved timesheet is not permitted.

BR-XMOD-011: An opportunity must be in Won status before it can be converted into a project.

BR-XMOD-012: A resource request must be in Fulfilled status before the associated allocation is created. The allocation is created automatically at the point of fulfilment.

BR-XMOD-013: A change order must be in Approved status before its budget impact is reflected in the project's financial figures.

### 4.3 Financial Integrity Rules

BR-XMOD-014: The rate snapshot recorded on a timesheet at the point of approval is immutable. It cannot be changed retrospectively, even if the underlying rate card or allocation rates are subsequently modified.

BR-XMOD-015: Only one Statement of Work budget entry is permitted per project. All subsequent budget adjustments must use the Adjustment entry type.

BR-XMOD-016: The project budget is automatically locked when the project transitions from Draft to Active. While locked, no direct edits to budget figures are accepted; all changes must go through the Change Order process.

BR-XMOD-017: Invoice amounts and tax amounts must each be zero or greater. Negative financial figures are rejected by the system.

BR-XMOD-018: Change order monetary amounts and additional hours must each be zero or greater.

### 4.4 Audit & Compliance Rules

BR-XMOD-019: Every status change in the system — for projects, invoices, timesheets, change orders, resource requests, and time-off requests — generates an audit log entry regardless of who performs the change.

BR-XMOD-020: Every approval and rejection action generates an audit log entry recording the actor, the timestamp, and the entity affected.

BR-XMOD-021: Budget governance actions (creating a budget entry, approving a change order, locking or unlocking a budget) are recorded in the audit log with full before-and-after values.

BR-XMOD-022: Role switch events — when a user changes their active role during a session — are recorded in the audit log.

---

## SECTION 5 — SYSTEM-WIDE CONSTRAINTS

### 5.1 Hard System Limits (cannot be overridden by any role)

BR-SYS-001: A time entry must record more than zero hours. Zero-hour entries are never accepted.

BR-SYS-002: A time entry must record no more than twenty-four hours. Entries exceeding twenty-four hours are always rejected.

BR-SYS-003: Invoice amounts and tax amounts must be zero or greater. Negative monetary values are never accepted on invoices.

BR-SYS-004: Change order amounts and additional hours must be zero or greater. Negative values are never accepted.

BR-SYS-005: Project status transitions must follow the defined state machine. No role, including Account Admin, can bypass the transition matrix.

BR-SYS-006: A project's due date must be on or after its start date. This validation cannot be overridden.

BR-SYS-007: A task's due date must be on or after its start date. This validation cannot be overridden.

BR-SYS-008: The audit log is permanently append-only. No role can edit, delete, or suppress audit log entries.

BR-SYS-009: A timesheet status change requires a written reason when the change is a rejection. A rejection without a reason is always rejected, regardless of the actor's role.

BR-SYS-010: A project status change always requires a written reason. This applies to every role without exception.

BR-SYS-011: Unknown or unrecognised fields in data write requests are rejected. The system enforces strict data shapes on all creation and update operations.

BR-SYS-012: Pagination on list operations defaults to a maximum of one hundred records per page. The absolute maximum is five hundred records per page and cannot be exceeded regardless of the value requested.

### 5.2 Data Immutability Rules

BR-SYS-013: An approved timesheet's rate snapshot cannot be modified. The snapshot is written once at approval and is permanently immutable.

BR-SYS-014: Audit log entries cannot be edited or deleted by any means accessible through the user interface.

BR-SYS-015: A Converted prospect retains its historical record in the system. Conversion status cannot be reversed.

BR-SYS-016: A Void invoice cannot be reinstated to any other status. The Void status is terminal.

BR-SYS-017: Completed and Cancelled project statuses are terminal. No further status transitions are permitted from either of these states.

BR-SYS-018: A CSAT rating cannot be edited or retracted after submission.

### 5.3 Role Separation Rules (Segregation of Duties)

BR-SYS-019: No user can approve their own timesheet, regardless of their role. Self-approval is blocked at the system level and cannot be bypassed.

BR-SYS-020: No user can approve their own change order, regardless of their role.

BR-SYS-021: No user can approve their own time-off request, regardless of their role.

BR-SYS-022: No user can approve their own resource request, regardless of their role.

BR-SYS-023: Budget unlock capability is restricted exclusively to the Account Admin role. No other role, including Super User, can unlock a locked project budget.

BR-SYS-024: Access to raw cost rates is restricted exclusively to the Account Admin role.

BR-SYS-025: Access to the full audit log is restricted exclusively to the Account Admin role.

BR-SYS-026: User account creation, deactivation, and role assignment are restricted exclusively to the Account Admin role.

BR-SYS-027: Time-off request approval is restricted to the requester's designated manager or an Account Admin. Super Users without a management relationship to the requester cannot approve the request.

---

## SECTION 6 — GLOSSARY

**Account:** A record representing a client organisation or an internal business unit. The parent record for all projects, opportunities, and invoices associated with a given relationship.

**Account Admin:** The highest-privilege user role. Holds full authority over system configuration, user management, financial governance, and audit access.

**Allocation:** A formal assignment of a team member to a project for a defined period and hours per week. Can be soft (provisional) or hard (confirmed).

**Asset:** A physical or digital organisational resource that can be booked against projects.

**Asset Booking:** A record linking an asset to a project for a defined date range.

**Audit Log:** An immutable, append-only record of every significant action taken in the system.

**Auto-Allocate:** A project setting that automatically creates a soft allocation when a team member is assigned to a task on that project.

**Billable:** A designation on a time entry or task indicating that the time or work may be charged to the client.

**Billing Schedule:** A pre-agreed plan defining when invoices will be raised against a project.

**Billing Type:** The commercial model for a project: Fixed Fee (a single agreed price), Time and Materials (billed by hours worked at agreed rates), or Retainer (a recurring fixed fee for ongoing services).

**Budget Entry:** A dated financial record against a project. The initial entry is a Statement of Work; subsequent modifications are Adjustments.

**Budget Lock:** A governance control that prevents direct edits to a project's financial figures after the project moves from Draft to Active status.

**Burn-Down:** A time-series view of how quickly a project's budget and hours are being consumed.

**Capacity:** The maximum number of hours per week a team member is available to work.

**Change Order:** A formally governed request to modify a project's approved budget or scope.

**Collaborator:** The practitioner-level user role. Logs time and views projects; has no access to finance or administrative functions.

**Contract:** A project-level legal or commercial agreement record.

**CSAT (Customer Satisfaction Score):** A star rating submitted for a project to indicate client satisfaction with the engagement.

**Customer:** The external stakeholder role, currently restricted from all internal operations.

**Document:** A project-level file or written artefact with versioning and approval tracking.

**Document Template:** A reusable document structure used to pre-populate standard content when creating a new project document.

**Effort Overrun:** A condition where the actual hours logged against a task approach or exceed the task's estimated hours.

**Escalation:** An automated notification sent to a manager when a submitted timesheet remains unapproved beyond the configured threshold.

**Hard Allocation:** A confirmed allocation representing a contractual time commitment. Subject to full over-allocation validation.

**Health:** A manually set indicator of a project's delivery status: On Track, At Risk, or Off Track.

**Holiday Calendar:** A named set of public holiday dates assigned to a team member, used to block time entries and adjust capacity calculations.

**Invoice:** A billing document addressed to a client, linked to a project.

**Invoice Line Item:** A single billable item on an invoice with a description, quantity, unit price, and total.

**Invoice Payment:** A record of a payment received against an invoice.

**Key Event:** A recorded significant moment in a project's lifecycle, used in Interval IQ benchmarking.

**Milestone:** A task designated as a significant project event. A Payment Milestone triggers automatic invoice creation on completion.

**Notification:** A system-generated message delivered to a specific user to alert them to a relevant event.

**Opportunity:** A sales record representing a potential engagement with a client, tracked through defined pipeline stages.

**Over-Allocation:** A condition where a team member's total committed hours for a period exceed their configured weekly capacity.

**Phase:** A high-level grouping of tasks within a project, representing a logical stage of delivery.

**Portfolio:** The complete collection of active projects across the organisation.

**Proficiency Level:** A rating of a team member's depth of skill in a given capability, used in allocation skill validation.

**Project:** The primary organisational unit for client engagements or internal initiatives.

**Project Group:** A named grouping of multiple projects for portfolio organisation.

**Project Health:** See Health.

**Project Template:** A reusable structure defining standard phases and tasks for a repeatable type of engagement.

**Project Update:** A message posted to project stakeholders, either for internal team distribution or external client communication.

**Prospect:** A pre-qualified sales lead not yet elevated to full client account status.

**PSA (Professional Services Automation):** A category of integrated software for professional services firms, combining project management, resource planning, time tracking, and invoicing.

**RAID:** An acronym for Risk, Assumption, Issue, and Dependency — a structured framework for tracking project threats and dependencies.

**Rate Card:** A pricing schedule that lists the bill rate for each project role.

**Rate Snapshot:** An immutable copy of a team member's billing rate recorded at the moment a timesheet is approved.

**Resource Request:** A formal request to staff a specific role or skill on a project, subject to an approval and fulfilment workflow.

**Revenue Entry:** A monthly record of recognised revenue for a project.

**Revenue Recognition:** The accounting process of recording when project revenue is considered earned.

**Role:** A designation that determines what a user can see and do in the platform.

**Secondary Role:** An additional role assigned to a user beyond their primary role, granting them additional permissions.

**Skill:** A professional capability that can be attributed to team members and required by resource allocations.

**Skills Matrix:** An aggregated view of all team members' skills and proficiency levels across the organisation.

**Soft Allocation:** A provisional allocation used for planning purposes. Not subject to full over-allocation validation.

**SOW (Statement of Work):** The initial budget baseline for a project, recorded as the first budget entry at project creation. Only one SOW entry is permitted per project.

**Super User:** The primary operational role. Holds project management and financial authority; cannot manage user accounts or view cost rates.

**Task:** A discrete unit of deliverable work within a project.

**Task Note:** A comment attached to a task for contextual discussion.

**Tax Code:** An organisation-wide tax rate applied when creating invoices.

**Time Entry:** A single record of time worked on a specific date, project, and optionally a task.

**Time Setting:** Organisation-level configuration controlling minimum and maximum timesheet hours and the escalation threshold.

**Time-Off Request:** A formal leave request submitted by a team member and directed to their manager for approval.

**Timesheet:** A weekly container for all time entries logged by a team member.

**Utilisation:** The percentage of a team member's capacity committed to billable or allocated project work.

---

## SECTION 7 — BUSINESS RULES INDEX

| BR Code | One-Line Summary | Section |
|---------|-----------------|---------|
| BR-ROLE-001 | Every organisation must have at least one Account Admin | 2.1 |
| BR-ROLE-002 | Account Admin is the only role that can unlock a locked project budget | 2.1 |
| BR-ROLE-003 | Account Admin is the only role that can create, edit, or delete user accounts | 2.1 |
| BR-ROLE-004 | Account Admin is the only role that can assign or modify user roles | 2.1 |
| BR-ROLE-005 | Account Admin is the only role that can view raw cost rates | 2.1 |
| BR-ROLE-006 | Account Admin is the only role that can access the full audit log | 2.1 |
| BR-ROLE-007 | Account Admin is the only role that can view archived projects | 2.1 |
| BR-ROLE-008 | Super User may approve a timesheet only if they are the submitter's designated manager or hold Admin simultaneously | 2.2 |
| BR-ROLE-009 | Super User may approve a time-off request only if they are the requester's designated manager | 2.2 |
| BR-ROLE-010 | Super User cannot approve any item they personally created or submitted | 2.2 |
| BR-ROLE-011 | Super User can only invite Collaborators or Customers; cannot grant Super User or Admin access | 2.2 |
| BR-ROLE-012 | Collaborator may only log time against projects they are allocated to | 2.3 |
| BR-ROLE-013 | Collaborator may only view their own timesheet records | 2.3 |
| BR-ROLE-014 | Collaborator may delete a task note only if they authored it | 2.3 |
| BR-ROLE-015 | Collaborator can only invite users at the Customer role level | 2.3 |
| BR-ROLE-016 | Any request from a Customer role to an internal operation is rejected | 2.4 |
| BR-ROLE-017 | Customer role assignment may only be granted within the permitted invite matrix | 2.4 |
| BR-DASH-001 | Dashboard KPI summary is computed at page load; not cached or pre-aggregated | 3.1.6 |
| BR-DASH-002 | Needs Attention shows only At Risk / Off Track projects and overdue invoices | 3.1.6 |
| BR-DASH-003 | Onboarding checklist is visible only to Account Admins | 3.1.6 |
| BR-DASH-004 | Once dismissed, the onboarding checklist does not reappear for that user | 3.1.6 |
| BR-PROJ-001 | A project requires name, account, owner, start date, due date, and billing type | 3.2.6 |
| BR-PROJ-002 | Project creation auto-creates one SOW budget entry | 3.2.6 |
| BR-PROJ-003 | Project created from template inherits template's phase and task structure | 3.2.6 |
| BR-PROJ-004 | Every new project starts in Draft status | 3.2.6 |
| BR-PROJ-005 | External projects must be linked to a client account | 3.2.6 |
| BR-PROJ-006 | Budget amount, budgeted hours, and currency cannot be edited while budget is locked | 3.2.6 |
| BR-PROJ-007 | An archived project cannot be edited until it is restored | 3.2.6 |
| BR-PROJ-008 | Every status change requires a written reason | 3.2.6 |
| BR-PROJ-009 | Project due date must be on or after start date | 3.2.6 |
| BR-PROJ-010 | Timeline changes trigger an out-of-range allocation check and notification | 3.2.6 |
| BR-PROJ-011 | Project status changes must follow the permitted transition matrix | 3.2.6 |
| BR-PROJ-012 | Transition from Draft to Active automatically locks the budget | 3.2.6 |
| BR-PROJ-013 | Written reason is mandatory for every project status change | 3.2.6 |
| BR-PROJ-014 | Status change notifies all allocated team members and the project owner | 3.2.6 |
| BR-PROJ-015 | Budget can only be modified through a Change Order or Admin budget unlock | 3.2.6 |
| BR-PROJ-016 | Only an Account Admin can unlock a locked project budget | 3.2.6 |
| BR-PROJ-017 | Unlocked budgets remain unlocked until the project is re-activated | 3.2.6 |
| BR-PROJ-018 | Change Order amount and additional hours must each be zero or greater | 3.2.6 |
| BR-PROJ-019 | A Change Order cannot be approved by the person who submitted it | 3.2.6 |
| BR-PROJ-020 | A Change Order can only be approved when it is in Submitted status | 3.2.6 |
| BR-PROJ-021 | Archiving a project does not permanently delete it | 3.2.6 |
| BR-PROJ-022 | Archived projects do not appear in standard project listings | 3.2.6 |
| BR-PROJ-023 | Projects are never permanently deleted through normal user interface operations | 3.2.6 |
| BR-TASK-001 | A task requires name, status, priority, and billable designation | 3.3.6 |
| BR-TASK-002 | Task priority must be one of Low, Medium, High, or Critical | 3.3.6 |
| BR-TASK-003 | Phases cannot be nested beneath other phases | 3.3.6 |
| BR-TASK-004 | Auto-allocate creates a soft allocation when a team member is assigned to a task | 3.3.6 |
| BR-TASK-005 | Task due date must be on or after its start date | 3.3.6 |
| BR-TASK-006 | Completing a Payment Milestone automatically creates a draft invoice | 3.3.6 |
| BR-TASK-007 | A Review Milestone marks a governance checkpoint and triggers no financial action | 3.3.6 |
| BR-TASK-008 | Circular parent-child relationships are prevented during task reordering | 3.3.6 |
| BR-TASK-009 | Only Super Users and Account Admins can reorder tasks | 3.3.6 |
| BR-TASK-010 | Any authenticated user can add a note to a visible task | 3.3.6 |
| BR-TASK-011 | A Collaborator can only delete a note they personally authored | 3.3.6 |
| BR-TASK-012 | Deleting a parent task permanently removes all child tasks | 3.3.6 |
| BR-ACCT-001 | An account must have a name and domain before it can be saved | 3.4.6 |
| BR-ACCT-002 | Account tier must be Enterprise, Mid-Market, SMB, or Startup | 3.4.6 |
| BR-ACCT-003 | An internal account represents the operating organisation | 3.4.6 |
| BR-ACCT-004 | Any field on an account can be edited by Super User or Account Admin | 3.4.6 |
| BR-ACCT-005 | Deleting an account is permanent | 3.4.6 |
| BR-PROS-001 | A prospect record requires at least a name | 3.5.6 |
| BR-PROS-002 | Converting a prospect creates a new Account and marks the prospect as Converted | 3.5.6 |
| BR-PROS-003 | A prospect can only be converted once | 3.5.6 |
| BR-PROS-004 | Deleting a prospect is permanent | 3.5.6 |
| BR-OPP-001 | An opportunity must be linked to a client account | 3.6.6 |
| BR-OPP-002 | Every opportunity is created at the Discovery stage with 10% probability | 3.6.6 |
| BR-OPP-003 | Stage progression covers six defined stages | 3.6.6 |
| BR-OPP-004 | Crossing 70% probability auto-creates soft allocations for proposed team members | 3.6.6 |
| BR-OPP-005 | Only a Won opportunity can be converted into a project | 3.6.6 |
| BR-OPP-006 | Converting an opportunity to a project is a single atomic operation | 3.6.6 |
| BR-OPP-007 | The opportunity record is retained after project conversion | 3.6.6 |
| BR-OPP-008 | Deleting an opportunity does not affect any project created from it | 3.6.6 |
| BR-TIME-001 | Time entry must record more than 0 and no more than 24 hours | 3.7.6 |
| BR-TIME-002 | Time entry cannot be logged against a closed or inactive project | 3.7.6 |
| BR-TIME-003 | Time entry cannot be logged on a weekend or public holiday | 3.7.6 |
| BR-TIME-004 | When budget is fully exhausted, further time entries are rejected | 3.7.6 |
| BR-TIME-005 | When budget is at 90%, a soft warning is returned; entry may proceed | 3.7.6 |
| BR-TIME-006 | Duplicate entry on same project and date triggers a soft warning | 3.7.6 |
| BR-TIME-007 | AI check on billable designation triggers a soft warning if anomaly detected | 3.7.6 |
| BR-TIME-008 | Exceeding daily capacity cap triggers a soft warning | 3.7.6 |
| BR-TIME-009 | Timesheet cannot be submitted below the minimum hours threshold | 3.7.6 |
| BR-TIME-010 | Timesheet cannot be submitted above the maximum hours threshold | 3.7.6 |
| BR-TIME-011 | A team member can withdraw a submitted timesheet before it is approved | 3.7.6 |
| BR-TIME-012 | A manager cannot approve a timesheet they submitted themselves | 3.7.6 |
| BR-TIME-013 | A timesheet may be approved only by the submitter's manager or Account Admin | 3.7.6 |
| BR-TIME-014 | Rate snapshot is captured at approval and is immutable after that point | 3.7.6 |
| BR-TIME-015 | Rate snapshot writes for the same timesheet are serialised to prevent conflicts | 3.7.6 |
| BR-TIME-016 | Timesheet approval triggers an effort overrun check; notification sent once per task lifetime | 3.7.6 |
| BR-TIME-017 | Timesheet rejection must include a written note | 3.7.6 |
| BR-TIME-018 | A manager cannot reject a timesheet they submitted themselves | 3.7.6 |
| BR-TIME-019 | Bulk approval silently skips self-entries; response reports approved, skipped-self, and skipped-other counts | 3.7.6 |
| BR-TIME-020 | Timesheet escalation notification sent if Submitted status exceeds the configured threshold | 3.7.6 |
| BR-TIME-021 | Escalation timer resets when a timesheet changes status | 3.7.6 |
| BR-TIME-022 | Time-off request is blocked if the entire range is already covered by holidays | 3.7.6 |
| BR-TIME-023 | Time-off request can only be approved or rejected by the requester's manager or Account Admin | 3.7.6 |
| BR-TIME-024 | Approving time-off triggers an automatic conflict check against hard allocations | 3.7.6 |
| BR-TIME-025 | A team member cannot approve their own time-off request | 3.7.6 |
| BR-TIME-026 | Copy-last-week skips entries from locked or approved weeks | 3.7.6 |
| BR-TIME-027 | Import-from-allocations pre-populates a draft timesheet from active allocations | 3.7.6 |
| BR-RES-001 | Allocation requires project, team member, start date, end date, role, and weekly hours | 3.8.6 |
| BR-RES-002 | Over-allocation guard blocks allocation if daily committed hours would exceed capacity | 3.8.6 |
| BR-RES-003 | Soft allocations are not subject to over-allocation validation | 3.8.6 |
| BR-RES-004 | Skill mismatch check enforced when allocation specifies a required skill and proficiency | 3.8.6 |
| BR-RES-005 | Skill mismatch can be bypassed with a written override reason, recorded in the audit log | 3.8.6 |
| BR-RES-006 | Capacity preview is read-only and does not create or modify allocations | 3.8.6 |
| BR-RES-007 | A resource request cannot be approved by its creator | 3.8.6 |
| BR-RES-008 | Fulfilling a resource request auto-creates a hard allocation | 3.8.6 |
| BR-RES-009 | Approving time-off triggers at-risk flagging on conflicting hard allocations | 3.8.6 |
| BR-RES-010 | At-risk allocations require human review; system does not auto-cancel or auto-reassign | 3.8.6 |
| BR-RES-011 | AI suggestions rank candidates by composite skill-match and capacity score | 3.8.6 |
| BR-FIN-001 | Invoice must be linked to both a project and a client account | 3.9.6 |
| BR-FIN-002 | Invoice amount must be zero or greater | 3.9.6 |
| BR-FIN-003 | Tax amount must be zero or greater | 3.9.6 |
| BR-FIN-004 | Invoice identifier follows the format INV-YYYY-NNN and cannot be manually changed | 3.9.6 |
| BR-FIN-005 | Invoice from timesheet uses the immutable rate snapshot from approval | 3.9.6 |
| BR-FIN-006 | Completing a Payment Milestone automatically creates a draft invoice | 3.9.6 |
| BR-FIN-007 | Invoices must follow the defined status transition sequence | 3.9.6 |
| BR-FIN-008 | Voiding an invoice is irreversible | 3.9.6 |
| BR-FIN-009 | System automatically transitions Sent invoices to Overdue when due date passes | 3.9.6 |
| BR-FIN-010 | Payments can only be recorded against Sent or Overdue invoices | 3.9.6 |
| BR-FIN-011 | Multiple partial payments can be recorded against a single invoice | 3.9.6 |
| BR-FIN-012 | A contract must be linked to a project | 3.9.6 |
| BR-FIN-013 | No limit on the number of contracts per project | 3.9.6 |
| BR-FIN-014 | Change order amount and additional hours must be zero or greater | 3.9.6 |
| BR-FIN-015 | Only one SOW budget entry is permitted per project | 3.9.6 |
| BR-FIN-016 | All subsequent budget modifications must use the Adjustment entry type | 3.9.6 |
| BR-RPT-001 | Full reports are restricted to Super Users and Account Admins; Collaborators see a masked view | 3.10.6 |
| BR-RPT-002 | All report data is computed from live records at the time of viewing | 3.10.6 |
| BR-RPT-003 | Utilisation is calculated as total allocated hours divided by configured capacity for the period | 3.10.6 |
| BR-RPT-004 | Interval IQ compares actual milestone durations to stored benchmark durations | 3.10.6 |
| BR-ADM-001 | Only Account Admin can create a new user account | 3.11.6 |
| BR-ADM-002 | Only Account Admin can modify a user's primary or secondary roles | 3.11.6 |
| BR-ADM-003 | Only Account Admin can deactivate a user account | 3.11.6 |
| BR-ADM-004 | Only Account Admin can reactivate a previously deactivated user | 3.11.6 |
| BR-ADM-005 | User deactivation does not permanently delete user history | 3.11.6 |
| BR-ADM-006 | A user's weekly capacity is recorded in hours and used for over-allocation checks | 3.11.6 |
| BR-ADM-007 | Rate cards are created by Account Admins and viewable by Super Users | 3.11.6 |
| BR-ADM-008 | A rate card specifies bill rates per named role | 3.11.6 |
| BR-ADM-009 | Skills are organisation-wide and viewable by all authenticated users | 3.11.6 |
| BR-ADM-010 | Skills can be required on allocations at a specified proficiency level | 3.11.6 |
| BR-ADM-011 | Holiday calendars are assigned at the user level | 3.11.6 |
| BR-ADM-012 | The audit log is append-only and cannot be edited or deleted | 3.11.6 |
| BR-ADM-013 | The audit log is accessible only to Account Admins | 3.11.6 |
| BR-ADM-014 | Every create, update, delete, and status change generates an audit log entry | 3.11.6 |
| BR-ADM-015 | Account Admin can invite users at any role level | 3.11.6 |
| BR-ADM-016 | Super User can invite only Collaborators or Customers | 3.11.6 |
| BR-ADM-017 | Collaborator can invite only Customers | 3.11.6 |
| BR-NOTF-001 | Notifications are generated automatically by system events; users cannot manually create them | 3.12.6 |
| BR-NOTF-002 | Notifications are delivered only to the specific users affected by the triggering event | 3.12.6 |
| BR-NOTF-003 | Notification delivery failure does not cause the triggering action to fail | 3.12.6 |
| BR-NOTF-004 | Unread count reflects only notifications not yet viewed or marked read | 3.12.6 |
| BR-CSAT-001 | A CSAT rating must be linked to a project | 3.13.6 |
| BR-CSAT-002 | CSAT ratings are read-only once submitted | 3.13.6 |
| BR-PORT-001 | The Command Centre is restricted to users with team management permissions | 3.14.5 |
| BR-PORT-002 | Command Centre figures are computed from live data at the time of viewing | 3.14.5 |
| BR-DOC-001 | A document must be linked to a project | 3.15.6 |
| BR-DOC-002 | Every edit to a document creates a new version in the version history | 3.15.6 |
| BR-DOC-003 | Document templates are managed by Account Admins only | 3.15.6 |
| BR-AUD-001 | Audit log is append-only and cannot be modified by any means | 3.16.5 |
| BR-AUD-002 | An audit entry is created for every create, update, delete, and status change | 3.16.5 |
| BR-AUD-003 | The audit log is accessible only to Account Admins | 3.16.5 |
| BR-AUD-004 | Valid audit action values are: created, updated, deleted, status changed, submitted, approved, rejected | 3.16.5 |
| BR-AUD-005 | Role switch events are recorded in the audit log | 3.16.5 |
| BR-AST-001 | An asset booking must specify asset, project, start date, end date, and booking user | 3.17.5 |
| BR-AST-002 | No automated conflict detection for asset bookings | 3.17.5 |
| BR-XMOD-001 | Every project must be linked to a valid account | 4.1 |
| BR-XMOD-002 | Every invoice must be linked to both a project and a client account | 4.1 |
| BR-XMOD-003 | Every time entry must be linked to a project | 4.1 |
| BR-XMOD-004 | Every allocation must link a team member to a project with dates and hours | 4.1 |
| BR-XMOD-005 | Archiving a project retains all associated data | 4.1 |
| BR-XMOD-006 | Deleting a task cascade-deletes all child tasks permanently | 4.1 |
| BR-XMOD-007 | Archiving a project does not delete its invoices | 4.1 |
| BR-XMOD-008 | A project must exist before tasks can be created within it | 4.2 |
| BR-XMOD-009 | Time logging is only permitted against projects in Active status | 4.2 |
| BR-XMOD-010 | A timesheet must be Approved before an invoice can be generated from it | 4.2 |
| BR-XMOD-011 | An opportunity must be in Won status before it can be converted to a project | 4.2 |
| BR-XMOD-012 | A resource request must be Fulfilled before the associated allocation is created | 4.2 |
| BR-XMOD-013 | A change order must be Approved before its budget impact is reflected | 4.2 |
| BR-XMOD-014 | The rate snapshot on an approved timesheet is immutable | 4.3 |
| BR-XMOD-015 | Only one SOW budget entry is permitted per project | 4.3 |
| BR-XMOD-016 | Project budget is auto-locked on transition from Draft to Active | 4.3 |
| BR-XMOD-017 | Invoice amounts and tax must each be zero or greater | 4.3 |
| BR-XMOD-018 | Change order amounts and additional hours must each be zero or greater | 4.3 |
| BR-XMOD-019 | Every status change generates an audit log entry | 4.4 |
| BR-XMOD-020 | Every approval and rejection generates an audit log entry | 4.4 |
| BR-XMOD-021 | Budget governance actions are recorded in the audit log | 4.4 |
| BR-XMOD-022 | Role switch events are recorded in the audit log | 4.4 |
| BR-SYS-001 | Time entry must record more than zero hours — hard limit, no exceptions | 5.1 |
| BR-SYS-002 | Time entry must record no more than twenty-four hours — hard limit, no exceptions | 5.1 |
| BR-SYS-003 | Invoice amounts and tax amounts must be zero or greater — hard limit | 5.1 |
| BR-SYS-004 | Change order amounts and additional hours must be zero or greater — hard limit | 5.1 |
| BR-SYS-005 | Project status transitions must follow the state machine — no bypass for any role | 5.1 |
| BR-SYS-006 | Project due date must be on or after start date — no override | 5.1 |
| BR-SYS-007 | Task due date must be on or after start date — no override | 5.1 |
| BR-SYS-008 | Audit log is permanently append-only — no role can delete or edit entries | 5.1 |
| BR-SYS-009 | Timesheet rejection requires a written reason — mandatory with no exceptions | 5.1 |
| BR-SYS-010 | Project status change requires a written reason — mandatory with no exceptions | 5.1 |
| BR-SYS-011 | Unknown fields in data write requests are always rejected | 5.1 |
| BR-SYS-012 | List pagination defaults to 100 records; maximum is 500 regardless of requested value | 5.1 |
| BR-SYS-013 | Approved timesheet rate snapshot cannot be modified | 5.2 |
| BR-SYS-014 | Audit log entries cannot be edited or deleted | 5.2 |
| BR-SYS-015 | Converted prospect status cannot be reversed | 5.2 |
| BR-SYS-016 | A Void invoice is terminal and cannot be reinstated | 5.2 |
| BR-SYS-017 | Completed and Cancelled project statuses are terminal | 5.2 |
| BR-SYS-018 | A CSAT rating cannot be edited or retracted after submission | 5.2 |
| BR-SYS-019 | No user can approve their own timesheet — no exceptions | 5.3 |
| BR-SYS-020 | No user can approve their own change order — no exceptions | 5.3 |
| BR-SYS-021 | No user can approve their own time-off request — no exceptions | 5.3 |
| BR-SYS-022 | No user can approve their own resource request — no exceptions | 5.3 |
| BR-SYS-023 | Budget unlock is restricted exclusively to Account Admin | 5.3 |
| BR-SYS-024 | Access to raw cost rates is restricted exclusively to Account Admin | 5.3 |
| BR-SYS-025 | Access to the full audit log is restricted exclusively to Account Admin | 5.3 |
| BR-SYS-026 | User account creation, deactivation, and role assignment restricted to Account Admin | 5.3 |
| BR-SYS-027 | Time-off approval restricted to the requester's designated manager or Account Admin | 5.3 |

---

*End of Document*

**Total Business Rules Defined:** 215

---

DRAFT COMPLETE — Ready for Prompt 3
