# Admin Module — Functional Narrative

**Document type:** Business Analyst functional specification  
**Audience:** Developers and QA engineers  
**Source file:** `artifacts/businessnow/src/pages/admin.tsx` (3 647 lines)  
**Platform:** BusinessNow PSA — KSAP Technology  
**Date:** May 2026

---

## 1. Overview

The Admin module is the system configuration hub of the BusinessNow PSA platform. It is accessible only to users whose system role resolves to `account_admin`. The page renders a two-column layout: a left-side vertical tab list and a right-side content panel. All data mutations emit toast notifications on success or failure; no inline confirmation prompts are used (all destructive actions use modal dialogs).

The module contains **seventeen distinct functional areas**, eleven of which are currently exposed as active navigation tabs. Six additional areas — Custom Fields, Activity Defaults, Placeholders, Audit Log, Company Settings, and Archived Projects — have complete backend and frontend implementations but are intentionally hidden from the tab navigation at the UI layer pending further review. Their content panels remain in the component tree and are documented below for completeness.

---

## 2. Navigation Structure

The left-hand tab rail presents the following items in order:

| Tab label | `value` key | Visible |
|-----------|-------------|---------|
| Users | `users` | Yes |
| Project Templates | `templates` | Yes |
| Document Templates | `documenttemplates` | Yes |
| Skills Matrix | `skills` | Yes |
| Job Roles | `jobroles` | Yes |
| Tax Codes | `taxcodes` | Yes |
| Time Categories | `timecategories` | Yes |
| Task Statuses | `taskstatuses` | Yes |
| Time Settings | `timesettings` | Yes |
| Holiday Calendars | `holidays` | Yes |
| Rate Cards | `ratecards` | Yes |
| Custom Fields | `customfields` | Hidden |
| Activity Defaults | `activitydefaults` | Hidden |
| Placeholders | `placeholders` | Hidden |
| Audit Log | `auditlog` | Hidden |
| Company Settings | `settings` | Hidden |
| Archived Projects | `archived` | Hidden |

---

## 3. Active Tabs

### 3.1 Users

**Data source:** `GET /api/users`

The Users tab contains two inner sub-tabs: **User Management** and **User Configuration**.

#### 3.1.1 User Management

This sub-tab renders a searchable, full-roster table of all platform users. A search input filters rows in real time by name or email. An **Add User** button opens the Add/Edit User dialog (section 3.1.3).

**Table columns:**

| Column | Content |
|--------|---------|
| User | 36 px circular avatar with two-letter initials (colour derived from name hash). Name in medium weight below; email in muted text. |
| Email | Plain text (duplicated from avatar cell for copy convenience). |
| Role | For `account_admin` viewers: an inline `<Select>` populated from the role hierarchy; the mutation calls `PATCH /api/users/:id` with the new canonical role value. For all other viewers: a read-only `<StatusBadge>`. The set of roles a viewer may assign to others is governed by the `ALLOWED_ASSIGNMENTS` map in `lib/roles.ts` — an admin may assign any role at or below their own level. |
| Department / Region | Two lines of muted secondary text. |
| Status | `<StatusBadge>` rendering `active` (green), `inactive` (grey), or `on_leave` (amber). |
| Cost Rate/hr | Numeric, formatted as `$N/hr`; blank when unset. |
| Skills | A ghost button showing a count badge ("3 skills") that opens the **UserSkillsDialog**. |
| Actions | A `…` dropdown menu with **Edit** (opens the user dialog pre-populated) and **Delete** (opens a confirmation dialog). |

**UserSkillsDialog** opens as a modal. It displays the user's current assigned skills as a table with columns: Skill Name, Category, Proficiency (badge, 1–5), Note, and a delete (×) button per row. Below the table is an inline **Add Skill** row: a select populated from all defined skills, a numeric proficiency input (1–5), a text note input, and an **Add** button. Mutations: `POST /api/users/:id/skills`, `DELETE /api/users/:id/skills/:skillId`.

#### 3.1.2 User Configuration

This sub-tab displays the same user list, but the action column is replaced by a **Secondary Roles** editing cell that implements a three-state draft flow:

1. **Read state** — current secondary roles are rendered as small `<Badge>` chips. A pencil icon button sits at the far right of the row.  
2. **Edit state** — clicking the pencil button activates draft mode for that row only. The secondary roles column expands to a scrollable list of all available roles; currently-assigned roles are highlighted in blue. The pencil button is replaced by two icon buttons: a red × (cancel, reverts to read state without saving) and a green ✓ (confirm, calls `PATCH /api/users/:id/secondary-roles` with the draft selection).  
3. **Saving** — the confirm button shows a loading spinner until the mutation settles. On success, the row returns to read state with updated badges.

Only one row can be in edit mode at a time.

#### 3.1.3 Add / Edit User Dialog

Fields:

| Field | Type | Notes |
|-------|------|-------|
| Name | Text input | Required |
| Email | Email input | Required |
| Role | Select (from job roles list) or text input if no job roles defined | |
| Department | Text input | |
| Region | Text input | e.g. APAC, EMEA, US-East |
| Weekly Capacity (hrs) | Numeric input | Used in capacity calculations |
| Cost Rate ($/hr) | Numeric input | Used in margin and budget reporting |
| Status | Select: `active`, `inactive`, `on_leave` | |
| Member Type | Select: `Internal Employee` / `External / Client Contact` | Maps to `isInternal` boolean |
| Holiday Calendar | Select from defined calendars (or "No calendar") | Assigns a holiday calendar for capacity deductions and timesheet visual indicators |

Mutations: `POST /api/users` (create), `PATCH /api/users/:id` (edit). The save button is disabled if Name or Email is blank.

**Delete User** dialog states: "This will permanently remove the team member. Time entries and assignments will remain." Mutation: `DELETE /api/users/:id`.

---

### 3.2 Project Templates

**Data source:** `GET /api/templates`

Displays a card containing a table of all project templates. An **Add Template** button in the card header opens the Create Template dialog.

**Table columns:**

| Column | Content |
|--------|---------|
| Name | Template name in medium weight. Description in muted text below, if present. |
| Billing Type | Plain text: `Fixed Fee`, `Time & Materials`, or `Retainer`. |
| Duration | Integer (days). |
| Actions | Pencil icon — opens the **Template Editor** side sheet. Trash icon — opens a delete confirmation dialog. |

**Create Template dialog** fields:

| Field | Type | Notes |
|-------|------|-------|
| Template Name | Text input | Required |
| Description | Textarea | Optional |
| Billing Type | Select: Fixed Fee / Time & Materials / Retainer | |
| Duration (days) | Numeric input | |

Mutation: `POST /api/templates`.

**Delete Template dialog** warning: "Projects created from it will not be affected." Mutation: `DELETE /api/templates/:id`.

**Template Editor** opens as a right-side sheet (`max-w-2xl`). It renders the `<TemplateEditor templateId={id} />` component, which manages phases and tasks within the template. The sheet closes without saving changes unless the embedded component issues its own save mutations.

---

### 3.3 Document Templates

**Data source:** `GET /api/document-templates`

This tab contains two inner sub-tabs: **Templates** and (implicitly) its management view. The Templates sub-tab lists all document templates.

**Table columns:**

| Column | Content |
|--------|---------|
| Name | Template name; description in muted text below. |
| Type | Document type badge (Proposal, Statement of Work, Project Plan, Status Report, Invoice, Other). |
| Author | Display name of the creating user. |
| Created | Relative or absolute date of creation. |
| Actions | Edit (pencil) and Delete (trash) icon buttons. |

**Create / Edit Document Template dialog** fields:

| Field | Type | Notes |
|-------|------|-------|
| Name | Text input | Required |
| Description | Text input | Optional |
| Document Type | Select: Proposal / Statement of Work / Project Plan / Status Report / Invoice / Other | |
| Content | Textarea (large) | The template body; supports free-text with placeholder tokens |

Mutations: `POST /api/document-templates` (create), `PATCH /api/document-templates/:id` (edit), `DELETE /api/document-templates/:id` (delete, with confirmation dialog).

Document templates are also surfaced within the Project Documents tab, where a "From Template" action pre-fills a new document with the selected template's content.

---

### 3.4 Skills Matrix

**Data sources:** `GET /api/skills/categories`, `GET /api/skills`

This tab renders a two-panel layout:

**Left panel — Categories list:**  
Each row shows the category name and a trash icon. Clicking the trash opens a deletion confirmation dialog ("All skills in this category will be orphaned"). An **Add Category** button opens a dialog with a single required Name field. Mutation: `POST /api/skills/categories`, `DELETE /api/skills/categories/:id`.

**Right panel — Skills within selected category:**  
When a category is selected, the right panel shows a table of skills in that category. An **Add Skill** button opens the Add Skill dialog.

**Skills table columns:**

| Column | Content |
|--------|---------|
| Name | Skill name in medium weight. |
| Type | Badge: `Level` (Beginner–Expert), `Yes-No`, `Number`, `Single-Choice`, `Multiple-Choice`. |
| Section | Optional grouping label within the category. |
| Description | Optional helper text. |
| Actions | Trash icon opens delete confirmation ("This skill will be removed from all team members."). |

**Add Skill dialog** fields:

| Field | Type | Notes |
|-------|------|-------|
| Skill Name | Text input | Required |
| Category | Select from existing categories | |
| Type | Select: Level / Yes-No / Number / Single-Choice / Multiple-Choice | |
| Section | Text input | Optional sub-grouping within the category |
| Description | Text input | Optional |

Mutation: `POST /api/skills`.

---

### 3.5 Job Roles

**Data source:** `GET /api/job-roles`

A simple card containing a table of job role definitions used throughout the platform (primarily as the **Role** field on users and as allocation role labels).

**Table columns:**

| Column | Content |
|--------|---------|
| Role Name | The display name of the role. |
| People | Count of users currently assigned this role (derived from the users list). |
| Actions | Trash icon; deletion is blocked if the role is in use (server returns 409). |

An **Add Job Role** button opens a dialog with a single required Name field. Mutation: `POST /api/job-roles`, `DELETE /api/job-roles/:id`.

---

### 3.6 Tax Codes

**Data source:** `GET /api/tax-codes`

Tax codes are applied to invoices and billing line items. The table lists all defined codes.

**Table columns:**

| Column | Content |
|--------|---------|
| Name | e.g. "GST 10%". |
| Rate | Percentage, formatted as `N%`. |
| Description | Optional description in muted text. |
| Default | A star icon for the default code; a dash otherwise. Only one code may be marked default. |
| Actions | Pencil (edit) and trash (delete with confirmation). |

**Add / Edit Tax Code dialog** fields:

| Field | Type | Notes |
|-------|------|-------|
| Name | Text input | Required |
| Rate (%) | Numeric input (step 0.01) | Required |
| Description | Text input | Optional |
| Set as default | Checkbox | Replaces any existing default |

Mutations: `POST /api/tax-codes`, `PATCH /api/tax-codes/:id`, `DELETE /api/tax-codes/:id`.

---

### 3.7 Time Categories

**Data source:** `GET /api/time-categories`

Time categories classify individual time entries (e.g. Development, Design, Meetings) and carry a default billable flag that propagates to new time entries unless overridden by task-level or activity-level defaults.

**Table columns:**

| Column | Content |
|--------|---------|
| Name | Category name. |
| Description | Optional description in muted text. |
| Default Billable | Green check icon if billable by default; dash otherwise. |
| Actions | Pencil (edit) and trash (delete). |

**Add / Edit Time Category dialog** fields:

| Field | Type | Notes |
|-------|------|-------|
| Name | Text input | Required |
| Description | Textarea | Optional |
| Billable by default | Checkbox | "Entries using this category are marked billable unless overridden by task or activity defaults." |

Mutations: `POST /api/time-categories`, `PATCH /api/time-categories/:id`, `DELETE /api/time-categories/:id`. Delete dialog note: "This category will no longer be available for new time entries."

---

### 3.8 Task Statuses

**Data source:** `GET /api/task-statuses`

This panel manages the set of statuses available for tasks across all projects. The list supports drag-to-reorder (display order is persisted).

**Table columns:**

| Column | Content |
|--------|---------|
| Status Name | Display label for the status. |
| Colour | A small circular swatch showing the associated hex colour. |
| Terminal | Check icon if this status represents a terminal/closed state; dash otherwise. Terminal statuses affect progress calculations. |
| Order | Integer display order (reflects drag position). |
| Actions | Pencil (edit) and trash (delete). |

**Add / Edit Task Status dialog** fields: Status Name (required), Colour picker, Terminal checkbox.

Mutations: `POST /api/task-statuses`, `PATCH /api/task-statuses/:id`, `DELETE /api/task-statuses/:id`. Reorder mutation: `PATCH /api/task-statuses/reorder` (array of IDs in new order).

---

### 3.9 Time Settings

**Data source:** `GET /api/time-settings`  
**Save mutation:** `PUT /api/time-settings`

This tab contains a single settings card. All fields are controlled inputs; the **Save Settings** button is enabled only when the form is dirty.

**Standard settings:**

| Field | Type | Description |
|-------|------|-------------|
| Default Work Hours / Day | Numeric | Standard hours used for capacity and weekly grid calculations. |
| Work Week (days) | Numeric | Number of working days per week (e.g. 5). |
| Overtime Threshold — Daily | Numeric | Hours per day above which a time entry is considered overtime. |
| Overtime Threshold — Weekly | Numeric | Hours per week above which entries are considered overtime. |
| Lock timesheets after (days) | Numeric | Number of days after a period end before timesheets are locked from further editing. |
| Require Approval | Toggle | When enabled, submitted timesheets must be approved before they count as finalised. |
| Billable by default | Toggle | New time entries default to billable unless overridden by category or activity. |
| Allow future entries | Toggle | Controls whether users may log time against future dates. |

**Advanced Settings** section (collapsed by default, toggled by a chevron button):

| Field | Type | Description |
|-------|------|-------------|
| Minimum entry (minutes) | Numeric | Hard floor on the duration of a single time entry. |
| Maximum entry (hours) | Numeric | Hard ceiling on the duration of a single time entry (hard block, not soft warning). |
| Timesheet reminder day | Select (day of week) | Day on which weekly timesheet reminder notifications are triggered. |
| Billable anomaly AI check | Toggle | When enabled, the AI billable-anomaly check fires on timesheet submission. |

---

### 3.10 Holiday Calendars

**Data sources:** `GET /api/holiday-calendars` (calendar list), `GET /api/holiday-calendars/:id/dates` (dates for selected calendar)

The panel uses a two-column layout. The left column shows the calendar list; the right column shows the holiday dates for whichever calendar is currently selected.

**Left panel — Calendar list:**

Each row shows the calendar name, an optional description in muted text, and a trash icon. Clicking a row selects it (highlighted background) and loads its dates in the right panel. An **Add Calendar** button opens a dialog.

**Add Calendar dialog** fields:

| Field | Type | Notes |
|-------|------|-------|
| Calendar Name | Text input | Required |
| Description | Text input | Optional |

Mutation: `POST /api/holiday-calendars`. Delete: `DELETE /api/holiday-calendars/:id`. Delete dialog warning: "All holiday dates in this calendar will also be removed."

**Right panel — Holiday dates:**

Displays the dates belonging to the selected calendar. An **Add Holiday** button opens a date-entry dialog. Each date row shows:

| Column | Content |
|--------|---------|
| Holiday Name | e.g. "Christmas Day". |
| Date | Formatted date string. |
| Actions | Trash icon. |

**Add Holiday Date dialog** fields: Holiday Name (required), Date (date picker, required). Mutation: `POST /api/holiday-calendars/:id/dates`. Delete: `DELETE /api/holiday-calendars/:id/dates/:dateId`.

Holiday calendars are assignable to individual users (via the Add/Edit User dialog) and are used by the capacity grid to deduct non-working days and by the timesheet view to surface visual indicators on holiday dates.

---

### 3.11 Rate Cards

**Access control:** Only visible to users with the `financials.viewRateCards` permission. Users without this permission do not see the tab.

**Data source:** `GET /api/rate-cards`

Rate cards define billable hourly rates by role. They are referenced when generating invoices or pricing projects.

**Table columns:**

| Column | Content |
|--------|---------|
| Name | Rate card name (e.g. "Standard 2025"). |
| Currency | ISO currency code badge. |
| Effective Date | The date from which the card applies, formatted as a locale date string. |
| Status | `<StatusBadge>` rendering `Active` (green), `Draft` (grey), or `Archived` (muted). |
| Roles | Count of role–rate pairs defined on this card (e.g. "4 roles"). |
| Actions | Pencil (edit) and trash (delete with confirmation). |

**Create / Edit Rate Card dialog** fields:

| Field | Type | Notes |
|-------|------|-------|
| Name | Text input | Required |
| Currency | Select: USD / AUD / EUR / GBP / SGD | |
| Status | Select: Active / Draft / Archived | |
| Effective Date | Date input | |
| Role Rates | Inline editable list | Each entry is a role name + hourly rate pair. New pairs are added via an inline input row (role name text + rate numeric + Add button). Existing pairs can be removed with a × button. |

Mutations: `POST /api/rate-cards` (create), `PATCH /api/rate-cards/:id` (edit), `DELETE /api/rate-cards/:id` (delete). Delete dialog note: "Projects using it will not be affected."

---

## 4. Hidden Tabs (Implemented, Not Yet Navigable)

The following six areas are fully implemented but their tab triggers have been removed from the navigation. They are documented here for QA coverage and future enablement.

### 4.1 Custom Fields

This area is itself a two-sub-tab panel: **Sections** and **Fields**.

#### 4.1.1 Sections

**Data source:** `GET /api/custom-field-sections`

Sections group custom fields and carry role-based visibility and edit permissions. A field may belong to one section; if it does, the section's `viewRoles` and `editRoles` determine which platform roles can see or edit it. Mandatory fields apply regardless of section visibility.

**Table columns:**

| Column | Content |
|--------|---------|
| Entity | Outline badge: `project`, `task`, `time_entry`, or `account`. |
| Section | Name in medium weight; description in muted text below. |
| View Roles | Comma-separated role list, or "All" if blank. |
| Edit Roles | Comma-separated role list, or "All" if blank. |
| Status | `Active` or `Inactive` badge. |
| Actions | Pencil (edit) and trash (delete). Delete note: "Fields in this section will be detached (kept, but un-grouped)." |

**Add / Edit Section dialog** fields:

| Field | Type | Notes |
|-------|------|-------|
| Entity Type | Select: Time Entry / Project / Task / Account | Locked after creation |
| Section Name | Text input | Required |
| Description | Text input | Optional |
| View Roles | Text input | Comma-separated; blank = all roles |
| Edit Roles | Text input | Comma-separated; blank = all viewers |
| Active | Checkbox | |

Mutations: `POST /api/custom-field-sections`, `PATCH /api/custom-field-sections/:id`, `DELETE /api/custom-field-sections/:id`.

#### 4.1.2 Fields

**Data source:** `GET /api/custom-field-definitions`

A filter select (All / Project / Task / Time Entry / Account) narrows the displayed list. An **Add Field** button opens the field dialog defaulting to the current filter.

**Table columns:**

| Column | Content |
|--------|---------|
| Entity | Outline badge: entity type. |
| Field Name | Medium-weight label. |
| Type | Secondary badge: `text`, `number`, `date`, `boolean`, `select`, `textarea`. |
| Required | Green check icon if mandatory; dash otherwise. |
| Options | Comma-joined options string for `select` type fields; dash otherwise. |
| Actions | Pencil (edit) and trash (delete). Delete warning: "All values stored for this field will also be removed." |

**Add / Edit Custom Field dialog** fields:

| Field | Type | Notes |
|-------|------|-------|
| Entity Type | Select: Project / Task / Time Entry / Account | Required; changing entity clears Section |
| Field Type | Select: Text / Number / Date / Yes/No / Dropdown / Long Text | Required |
| Field Name | Text input | Required |
| Description | Text input | Shown as helper text next to the field on its host entity |
| Section | Select (filtered to sections matching the chosen entity type, or "No section") | |
| Population | Select: Manual entry / Inherited from another entity | |
| Options | Text input (comma-separated) | Only shown when Field Type = Dropdown |
| Inheritance block | Shown only when Population = Inherited: "From Entity" select, "From Field" select (filtered by chosen entity), "Fallback Value" text | |
| Mandatory | Checkbox | "Applies even when the section is hidden for the user's role." |

Mutations: `POST /api/custom-field-definitions`, `PATCH /api/custom-field-definitions/:id`, `DELETE /api/custom-field-definitions/:id`.

---

### 4.2 Activity Defaults

**Data source:** `GET /api/activity-defaults` (resolved against `GET /api/time-categories` for category name lookup)

Activity defaults are named activity labels (e.g. "Internal Meeting", "Training") that pre-fill the billable flag and category on a time entry when the user selects that activity name. They apply when neither the task nor the project has already set those fields.

**Table columns:**

| Column | Content |
|--------|---------|
| Activity Name | The activity label. |
| Billable | `Billable` (outline) or `Non-Billable` (secondary) badge. |
| Default Category | Resolved category name from time categories; dash if unset. |
| Status | `Active` or `Inactive` badge. |
| Actions | Pencil (edit) and trash (delete). Delete note: "Existing time entries that used this activity name retain their saved values." |

**Add / Edit Activity Default dialog** fields:

| Field | Type | Notes |
|-------|------|-------|
| Activity Name | Text input | Required |
| Default Category | Select from time categories (or "No category") | |
| Billable by default | Checkbox | |
| Active | Checkbox | |

Mutations: `POST /api/activity-defaults`, `PATCH /api/activity-defaults/:id`, `DELETE /api/activity-defaults/:id`.

---

### 4.3 Placeholders

**Data source:** `GET /api/placeholders`

Placeholders represent unfilled resource slots used in project allocations before a real team member is assigned (e.g. "Senior Consultant Slot"). They carry an optional role label and an `isDefault` flag. Default placeholders are seeded by the system and cannot be deleted.

**Table columns:**

| Column | Content |
|--------|---------|
| Name | Placeholder display name. |
| Role | Optional role label string; dash if unset. |
| Default | `Default` secondary badge if system-seeded; dash otherwise. |
| Actions | Delete button; disabled and non-functional for default placeholders (server also blocks deletion). |

**Add Placeholder inline form** (above the table, not a modal):

| Field | Type | Notes |
|-------|------|-------|
| Name | Text input (w-64) | Required |
| Role | Text input (w-48) | Optional |

Mutation: `POST /api/placeholders`. Delete: `DELETE /api/placeholders/:id` (returns 204 on success; toast on failure). Deletion of a default placeholder triggers a destructive toast; the `isDefault` check is enforced both client-side and server-side.

---

### 4.4 Audit Log

**Data source:** `GET /api/audit`

A read-only log of all significant system changes. A filter select at the top right narrows entries by entity type: All / Projects / Tasks / Invoices / Timesheets / Allocations / Users.

**Table columns:**

| Column | Content |
|--------|---------|
| Timestamp | Locale-formatted date and time. |
| Entity | An outline badge with the entity type (e.g. `project`) and the entity ID prefixed with `#`. |
| Action | A badge: `CREATE` (secondary), `UPDATE` (outline), or `DELETE` (destructive red). |
| Actor | Display name of the acting user, or "System" for automated actions. |
| Description | Free-text description, truncated with a tooltip. |

No mutations are available on this panel. It is strictly read-only.

---

### 4.5 Company Settings

**Data source:** `GET /api/company-settings`  
**Save mutation:** `PUT /api/company-settings`

Fields in this panel are used on invoices and reports. The **Save Settings** button is disabled until the form is dirty.

**Company Information card fields:**

| Field | Type | Notes |
|-------|------|-------|
| Company Name | Text input | Required |
| Address | Textarea (2 rows) | Used on invoice letterheads |
| Website | Text input | e.g. `https://example.com` |
| Phone | Text input | e.g. `+1 416-555-0100` |
| Timezone | Select | Options: America/Toronto (ET), America/New_York (ET), America/Chicago (CT), America/Denver (MT), America/Los_Angeles (PT), America/Vancouver (PT), Europe/London (GMT/BST), Asia/Kolkata (IST), UTC |
| Currency | Select | Options: CAD, USD, EUR, GBP, INR, AUD |
| Fiscal Year Start | Select | Options: January 1, April 1, July 1, October 1 |

---

### 4.6 Archived Projects

**Data source:** `GET /api/projects/deleted`

A table of soft-deleted projects. This is a recovery panel; no creation or editing is possible here.

**Table columns:**

| Column | Content |
|--------|---------|
| Project Name | The project's display name. |
| Archived On | Locale date string of the `deletedAt` timestamp; dash if unavailable. |
| Actions | **Restore** button. Mutation: `PATCH /api/projects/:id/restore`. Restores the project to active status and removes the `deletedAt` timestamp. |

---

## 5. Supporting Dialogs and Shared Patterns

### 5.1 Role Assignment Constraints

The inline role `<Select>` on the User Management table enforces the `ALLOWED_ASSIGNMENTS` permission matrix defined in `lib/roles.ts`. The matrix controls which canonical roles an actor may assign to others:

| Actor role | May assign |
|------------|-----------|
| `account_admin` | `account_admin`, `super_user`, `collaborator`, `customer` |
| `super_user` | `super_user`, `collaborator`, `customer` |
| `collaborator` | `customer` |
| `customer` | (none) |

This constraint is enforced both client-side (the select options are filtered) and server-side (the `PATCH /api/users/:id` route validates the caller's role against the target role via `hasRole()`).

### 5.2 Invite Team Member Dialog

An **Invite via Email** dialog exists in the component tree (`POST /api/users/invite`). It is present but its trigger button has been removed from the UI. When accessible it fields: Email (required), Name (optional), Role (select, restricted to roles the inviter may assign). The dialog displays a contextual note about who the caller may invite and redirects customer invitations to the project-level invite flow.

### 5.3 Confirmation Pattern

All destructive actions (delete operations) use a modal `<Dialog>` with Cancel and a red destructive-variant **Delete** button. The dialogs are listed inline in the component with their opening state controlled by a dedicated state variable (e.g. `deleteDialogId`, `deleteTimeCategoryId`). No `window.confirm()` calls are used.

### 5.4 Loading States

All data-fetch panels render skeleton placeholder rows (three to five `<Skeleton>` items) while the React Query fetch is in-flight (`isLoading === true`). Empty states use the shared `<EmptyState>` component with a contextual icon, title, and description.

### 5.5 Toast Notifications

All mutations connect to the shared toast system via `useToast()`. Successful operations emit a success toast; failures emit a destructive-variant toast. The global `QueryCache.onError` handler provides a final fallback for uncaught query errors.

---

## 6. API Endpoint Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/users` | GET | Fetch all users |
| `/api/users` | POST | Create user |
| `/api/users/:id` | PATCH | Update user (including role) |
| `/api/users/:id` | DELETE | Delete user |
| `/api/users/:id/secondary-roles` | PATCH | Update secondary roles |
| `/api/users/:id/skills` | POST | Add skill to user |
| `/api/users/:id/skills/:skillId` | DELETE | Remove skill from user |
| `/api/users/invite` | POST | Send invite email |
| `/api/templates` | GET / POST | List / create project templates |
| `/api/templates/:id` | DELETE | Delete template |
| `/api/document-templates` | GET / POST | List / create document templates |
| `/api/document-templates/:id` | PATCH / DELETE | Edit / delete document template |
| `/api/skills/categories` | GET / POST | List / create skill categories |
| `/api/skills/categories/:id` | DELETE | Delete skill category |
| `/api/skills` | GET / POST | List / create skills |
| `/api/skills/:id` | DELETE | Delete skill |
| `/api/job-roles` | GET / POST | List / create job roles |
| `/api/job-roles/:id` | DELETE | Delete job role |
| `/api/tax-codes` | GET / POST | List / create tax codes |
| `/api/tax-codes/:id` | PATCH / DELETE | Edit / delete tax code |
| `/api/time-categories` | GET / POST | List / create time categories |
| `/api/time-categories/:id` | PATCH / DELETE | Edit / delete time category |
| `/api/task-statuses` | GET / POST | List / create task statuses |
| `/api/task-statuses/:id` | PATCH / DELETE | Edit / delete task status |
| `/api/task-statuses/reorder` | PATCH | Persist drag-to-reorder |
| `/api/time-settings` | GET | Fetch time settings |
| `/api/time-settings` | PUT | Save time settings |
| `/api/holiday-calendars` | GET / POST | List / create calendars |
| `/api/holiday-calendars/:id` | DELETE | Delete calendar (cascades dates) |
| `/api/holiday-calendars/:id/dates` | GET / POST | List / add holiday dates |
| `/api/holiday-calendars/:id/dates/:dateId` | DELETE | Delete holiday date |
| `/api/rate-cards` | GET / POST | List / create rate cards |
| `/api/rate-cards/:id` | PATCH / DELETE | Edit / delete rate card |
| `/api/custom-field-sections` | GET / POST | List / create CF sections |
| `/api/custom-field-sections/:id` | PATCH / DELETE | Edit / delete CF section |
| `/api/custom-field-definitions` | GET / POST | List / create CF definitions |
| `/api/custom-field-definitions/:id` | PATCH / DELETE | Edit / delete CF definition |
| `/api/activity-defaults` | GET / POST | List / create activity defaults |
| `/api/activity-defaults/:id` | PATCH / DELETE | Edit / delete activity default |
| `/api/placeholders` | GET / POST | List / create placeholders |
| `/api/placeholders/:id` | DELETE | Delete placeholder |
| `/api/audit` | GET | Fetch audit log entries |
| `/api/company-settings` | GET | Fetch company settings |
| `/api/company-settings` | PUT | Save company settings |
| `/api/projects/deleted` | GET | Fetch soft-deleted projects |
| `/api/projects/:id/restore` | PATCH | Restore archived project |

---

## 7. Access Control Summary

The Admin module page is route-guarded at the application level. Users whose resolved role is not `account_admin` are redirected away before the page renders. Within the page:

- The **Rate Cards** tab is additionally gated by the `financials.viewRateCards` permission. Users without it do not see the tab.
- The inline role assignment select is client-side filtered by `ALLOWED_ASSIGNMENTS`, and the server independently validates role assignment authority.
- All write endpoints on this module require `account_admin`; reads on most configuration endpoints permit `super_user` and above.

---

*End of document.*
