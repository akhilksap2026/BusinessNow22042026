# BusinessNow PSA — Discovery Inventory
> Generated: 2026-05-15 | Analyst: Senior BA (AI-assisted codebase scan)
> Codebase root: `/home/runner/workspace`

---

## OUTPUT 1 — MODULE LIST

| # | Module Name | Description | Key Files |
|---|-------------|-------------|-----------|
| 1 | **Dashboard** | Personal KPI overview, activity feed, at-risk projects, overdue invoices, admin onboarding checklist | `pages/dashboard.tsx`, `routes/dashboard.ts` |
| 2 | **Projects** | Full project lifecycle — create, list, detail, archive, restore, template application | `pages/projects.tsx`, `pages/project-detail.tsx`, `routes/projects.ts` |
| 3 | **Tasks** | Hierarchical task and phase management within projects; milestones; kanban and list views | `components/task-detail-sheet.tsx`, `components/project-phases.tsx`, `routes/tasks.ts` |
| 4 | **Accounts** | Client account management; CRM-lite fields (tier, region, contact); internal account flag | `pages/accounts.tsx`, `routes/accounts.ts`, `schema/accounts.ts` |
| 5 | **Prospects** | Pre-account lead tracking; convert prospect to account | `pages/prospects.tsx`, `routes/prospects.ts` |
| 6 | **Opportunities** | Sales pipeline (kanban + list); stage-gated probability; convert Won opportunity to Project | `pages/opportunities.tsx`, `routes/opportunities.ts` |
| 7 | **Time Tracking** | Manual/timer time entry logging; weekly timesheet grid; approval workflow; time-off requests; AI assist | `pages/time.tsx`, `routes/timesheets.ts`, `routes/timeEntries.ts`, `routes/timeOff.ts` |
| 8 | **Resources** | Capacity utilisation heatmap; resource timeline; skills matrix; bench tracking; resource requests | `pages/resources.tsx`, `routes/allocations.ts`, `routes/resourceRequests.ts` |
| 9 | **Finance** | Invoice lifecycle; billing schedules; revenue recognition; contracts; change orders | `pages/finance.tsx`, `routes/invoices.ts`, `routes/contracts.ts`, `routes/changeOrders.ts` |
| 10 | **Reports** | 9-tab analytics: Performance, Operations, CSAT Trend, Interval IQ, Budget vs Actuals, Burn-Down, Revenue, Utilisation, Project Health | `pages/reports.tsx`, `routes/reports.ts` |
| 11 | **Admin** | User management, skills matrix, project templates, document templates, tax codes, time categories, holiday calendars, rate cards, custom fields, audit log, company settings, archived projects | `pages/admin.tsx`, `routes/users.ts`, `routes/adminSettings.ts` |
| 12 | **Notifications** | System-wide notification feed; unread badge; mark-all-read | `pages/notifications.tsx`, `routes/notifications.ts` |
| 13 | **CSAT** | Per-project customer satisfaction star ratings + distribution | `routes/csat.ts`, project detail CSAT tab |
| 14 | **Portfolio / Command Centre** | Cross-project portfolio health, KPI roll-up, resource alerts | `pages/command-center.tsx` |
| 15 | **Documents** | Project document store; versioning; approval status; document templates | `components/project-documents.tsx`, `routes/documents.ts`, `schema/documents.ts` |
| 16 | **Audit Log** | Immutable record of all entity mutations with actor, timestamp, before/after values | `routes/auditLog.ts`, `schema/auditLog.ts`, `lib/audit.ts` |
| 17 | **Assets** | Physical/digital asset register; project bookings | `routes/assets.ts`, `schema/assets.ts` |

---

## OUTPUT 2 — ENTITY INVENTORY

### Projects
| Business Name | Key Attributes | Relationships |
|---------------|----------------|---------------|
| Project | Name, status, health, billing type (Fixed Fee / T&M / Retainer), budget, budgeted hours, start date, due date, description, internal/external flag, customer champion, auto-allocate flag, budget locked flag, soft-delete timestamp | Belongs to Account; owned by User (PM); linked to Opportunity; linked to Rate Card; linked to Project Group |
| Project Group | Name, description | Groups many Projects |
| Change Order | Title, description, monetary amount, additional hours, status, CR number, document link, linked task titles | Belongs to Project; submitted and approved by Users |
| Contract | Name, status, start/end dates, value, document URL, notes | Belongs to Project |
| Budget Entry | Entry date, description, type (SOW or Adjustment), amount, hours | Belongs to Project |
| Project Update | Subject, body, type (internal/external), sent-at timestamp | Belongs to Project; delivered to Update Recipients |
| Project Template | Name, description, billing type, total duration days | Has many Template Phases → Template Tasks |
| RAID Item | Type (Risk/Assumption/Issue/Dependency), title, description, probability, impact, mitigation, status, target date | Belongs to Project |
| Project Health Stats | On-time rate, tasks overdue, budget burn %, completion % | Computed from Project + Tasks + Time Entries |

### Tasks
| Business Name | Key Attributes | Relationships |
|---------------|----------------|---------------|
| Task | Name, status, priority, billable flag, planned hours, estimate hours, start/end dates, milestone type, approval status, completion %, phase flag, sort order | Belongs to Project; can nest under parent Task (phases are level-1 tasks); assigned to many Users |
| Task Note | Content, timestamp | Belongs to Task; authored by User |
| Milestone | Milestone type (Payment / Review), triggers invoice on completion | Sub-type of Task |

### People & Resources
| Business Name | Key Attributes | Relationships |
|---------------|----------------|---------------|
| User | Name, email, role, department, region, capacity (hrs/week), cost rate, skills array, secondary roles, active/inactive, resource type, manager, holiday calendar | Belongs to Account; manages Timesheets; has Allocations |
| Allocation | Project role, start/end dates, hours per week, soft/hard flag, approver flags (timesheet, leave), status (at_risk), override reason, required skill + proficiency | Links User to Project |
| Resource Request | Requested role/skill, notes, status, rejection reason | Belongs to Project; fulfilled by Allocation |
| Skill | Name, skill type, proficiency levels | Many-to-many with Users |
| Rate Card | Name, description, effective date | Has many Rate Card Roles (role name + bill rate) |
| Holiday Calendar | Name, region, entries (date + name) | Assigned to Users |

### Time
| Business Name | Key Attributes | Relationships |
|---------------|----------------|---------------|
| Time Entry | Date, hours, notes, billable flag, task link, guardrail flags | Belongs to User; Belongs to Project; optionally linked to Task; grouped into Timesheet |
| Timesheet | Week start date, status (Draft/Submitted/Approved/Rejected), submitted/approved timestamps, rate snapshot, escalated-at timestamp | Belongs to User; has many Time Entries; approved by User (manager/PM) |
| Time-Off Request | Start date, end date, type, notes, status (Pending/Approved/Rejected) | Belongs to User (requester); approved by manager |
| Time Setting | Min hours, max hours, escalation days threshold | Organisation-scoped singleton |

### Finance
| Business Name | Key Attributes | Relationships |
|---------------|----------------|---------------|
| Invoice | ID (INV-YYYY-NNN), issue date, due date, status, amount, tax, total, bill-to, notes, payment date/amount/reference | Belongs to Project and Account; optionally linked to Timesheet |
| Invoice Line Item | Description, quantity, unit price, amount | Belongs to Invoice |
| Invoice Payment | Amount, date, reference | Belongs to Invoice |
| Revenue Entry | Month, amount, recognised flag | Belongs to Project |
| Tax Code | Name, rate percentage, description | Organisation-scoped; applied to Invoices |

### CRM
| Business Name | Key Attributes | Relationships |
|---------------|----------------|---------------|
| Account | Name, domain, tier, region, status, contract value, billing address, contact name/email/phone, source, notes, internal flag | Has many Projects, Opportunities, Invoices |
| Prospect | Name, company, email, phone, source, estimated value, status, notes | Can convert to Account |
| Opportunity | Name, stage, probability %, amount, close date, notes | Belongs to Account; can convert to Project |

### Admin & Config
| Business Name | Key Attributes | Relationships |
|---------------|----------------|---------------|
| Custom Field Definition | Entity type, name, field type, required flag, options, section, population method | Belongs to Custom Field Section; has many Custom Field Values |
| Document Template | Name, description, document type, content | Created by User |
| Audit Log Entry | Entity type, entity ID, action, actor, previous/new values, description, timestamp | Global; references any entity |
| Asset | Name, type, capacity, org | Has many Asset Bookings |
| Notification | Type, title, message, entity reference, read flag | Belongs to User |
| Interval / Key Event | Interval IQ benchmarking data (milestone dates, actual vs benchmark days) | Belongs to Project |

---

## OUTPUT 3 — ROLE INVENTORY

| Role | Canonical Value | Level | Where Defined | Scope |
|------|-----------------|-------|---------------|-------|
| Account Admin | `account_admin` | 4 | `artifacts/api-server/src/constants/roles.ts` | Global — full access including org settings, cost rates, user management, budget unlock |
| Super User (PM / Finance) | `super_user` | 3 | `artifacts/api-server/src/constants/roles.ts` | Global — broad project and financial access; cannot view raw cost rates or manage users |
| Collaborator | `collaborator` | 2 | `artifacts/api-server/src/constants/roles.ts` | Self/project — can log time, view own allocations, limited project read; cannot access finance |
| Customer | `customer` | 1 | `artifacts/api-server/src/constants/roles.ts` | Blocked — global `denyCustomerRole` middleware returns 403 on all internal API calls |

**Legacy role mapping** (normalised via `resolveRole()` in `roles.ts`):
- `Admin` → `account_admin`
- `PM`, `Finance`, `Developer` → `super_user`
- `Viewer` → `collaborator`

**Secondary roles**: Users can hold additional roles beyond their primary. The `roleClaim` middleware validates the claimed `x-user-role` header is in the user's assigned role set.

**Frontend mirrors**: `artifacts/businessnow/src/lib/roles.ts` and `permissions.ts` replicate the same hierarchy for UI gating.

---

## OUTPUT 4 — OPERATIONS INVENTORY

### Accounts
| Module | Operation | Method | Route | Roles Permitted |
|--------|-----------|--------|-------|-----------------|
| Accounts | List all accounts | GET | `/api/accounts` | All authenticated |
| Accounts | Create account | POST | `/api/accounts` | super_user+ |
| Accounts | Get account detail | GET | `/api/accounts/:id` | All authenticated |
| Accounts | Update account | PATCH | `/api/accounts/:id` | super_user+ |
| Accounts | Delete account | DELETE | `/api/accounts/:id` | super_user+ |

### Projects
| Module | Operation | Method | Route | Roles Permitted |
|--------|-----------|--------|-------|-----------------|
| Projects | List projects | GET | `/api/projects` | All authenticated (scoped by role) |
| Projects | Create project | POST | `/api/projects` | super_user+ |
| Projects | List archived projects | GET | `/api/projects/deleted` | account_admin |
| Projects | Get project | GET | `/api/projects/:id` | All authenticated |
| Projects | Edit project | PATCH | `/api/projects/:id` | super_user+ |
| Projects | Unlock budget | PATCH | `/api/projects/:id/unlock-budget` | account_admin |
| Projects | Archive project | DELETE | `/api/projects/:id` | super_user+ |
| Projects | Restore project | POST | `/api/projects/:id/restore` | super_user+ |
| Projects | Get project KPIs | GET | `/api/projects/:id/summary` | All authenticated |
| Projects | Get quoted vs actual | GET | `/api/projects/:id/quoted-vs-actual` | All authenticated |
| Projects | Get burn chart | GET | `/api/projects/:id/burn-chart` | All authenticated |
| Projects | Get health stats | GET | `/api/projects/:id/health-stats` | All authenticated |
| Projects | List budget entries | GET | `/api/projects/:id/budget-entries` | All authenticated |
| Projects | Create budget entry | POST | `/api/projects/:id/budget-entries` | super_user+ |
| Projects | Get change orders | GET | `/api/projects/:id/change-orders` | All authenticated |
| Projects | Create change order | POST | `/api/projects/:id/change-orders` | super_user+ |
| Projects | Update change order | PATCH | `/api/change-orders/:id` | super_user+ |
| Projects | Approve change order | POST | `/api/change-orders/:id/approve` | super_user+ (not self) |
| Projects | Apply template to project | POST | `/api/project-templates/:id/apply` | super_user+ |
| Projects | Create from template | POST | `/api/project-templates/create-from` | super_user+ |
| Projects | Get project updates | GET | `/api/projects/:id/updates` | All authenticated |
| Projects | Post project update | POST | `/api/projects/:id/updates` | super_user+ |
| Projects | Get CSAT | GET | `/api/projects/:id/csat` | All authenticated |
| Projects | Submit CSAT rating | POST | `/api/projects/:id/csat` | All authenticated |

### Tasks
| Module | Operation | Method | Route | Roles Permitted |
|--------|-----------|--------|-------|-----------------|
| Tasks | List tasks | GET | `/api/tasks` | All authenticated |
| Tasks | Create task | POST | `/api/tasks` | super_user+ |
| Tasks | Get task | GET | `/api/tasks/:id` | All authenticated |
| Tasks | Update task | PATCH | `/api/tasks/:id` | super_user+ |
| Tasks | Bulk update tasks | PATCH | `/api/tasks/bulk` | super_user+ |
| Tasks | Reorder tasks | PATCH | `/api/tasks/reorder` | super_user+ |
| Tasks | List task notes | GET | `/api/tasks/:id/notes` | All authenticated |
| Tasks | Add task note | POST | `/api/tasks/:id/notes` | All authenticated |
| Tasks | Delete task note | DELETE | `/api/tasks/:id/notes/:noteId` | Note owner or super_user+ |

### Time Tracking
| Module | Operation | Method | Route | Roles Permitted |
|--------|-----------|--------|-------|-----------------|
| Time | List time entries | GET | `/api/time-entries` | All authenticated (collaborator: own only) |
| Time | Log time entry | POST | `/api/time-entries` | All authenticated |
| Time | Update time entry | PATCH | `/api/time-entries/:id` | Entry owner or super_user+ |
| Time | Delete time entry | DELETE | `/api/time-entries/:id` | Entry owner or super_user+ |
| Time | Get guardrail context | GET | `/api/time-entries/guardrail-context` | All authenticated |
| Time | Bulk approve time entries | POST | `/api/time-entries/bulk-approve` | super_user+ |
| Timesheets | List timesheets | GET | `/api/timesheets` | All authenticated (collaborator: own only) |
| Timesheets | Create/get weekly timesheet | POST | `/api/timesheets` | All authenticated |
| Timesheets | Get timesheet | GET | `/api/timesheets/:id` | Owner or super_user+ |
| Timesheets | Update timesheet | PATCH | `/api/timesheets/:id` | Owner or super_user+ |
| Timesheets | Submit timesheet | POST | `/api/timesheets/:id/submit` | Owner |
| Timesheets | Approve timesheet | POST | `/api/timesheets/:id/approve` | super_user+ (not self; manager or admin) |
| Timesheets | Unapprove timesheet | POST | `/api/timesheets/:id/unapprove` | super_user+ |
| Timesheets | Reject timesheet | POST | `/api/timesheets/:id/reject` | super_user+ (not self) |
| Timesheets | Bulk approve | POST | `/api/timesheets/bulk-approve` | super_user+ |
| Timesheets | Import allocations | POST | `/api/timesheets/import-allocations` | All authenticated |
| Timesheets | Copy last week | POST | `/api/timesheets/copy-last-week` | All authenticated |
| Time Off | List requests | GET | `/api/time-off-requests` | All authenticated (collaborator: own) |
| Time Off | Submit request | POST | `/api/time-off-requests` | All authenticated |
| Time Off | Approve/Reject request | PATCH | `/api/time-off-requests/:id` | Manager of requester or account_admin |

### Resources
| Module | Operation | Method | Route | Roles Permitted |
|--------|-----------|--------|-------|-----------------|
| Resources | List allocations | GET | `/api/allocations` | All authenticated |
| Resources | Preview allocation impact | POST | `/api/allocations/preview` | super_user+ |
| Resources | Bulk preview | POST | `/api/allocations/bulk-preview` | super_user+ |
| Resources | Create allocation | POST | `/api/allocations` | super_user+ |
| Resources | Update allocation | PATCH | `/api/allocations/:id` | super_user+ |
| Resources | Delete allocation | DELETE | `/api/allocations/:id` | super_user+ |
| Resources | Bulk update allocations | POST | `/api/allocations/bulk-update` | super_user+ |
| Resources | List resource requests | GET | `/api/resource-requests` | All authenticated |
| Resources | Create resource request | POST | `/api/resource-requests` | super_user+ |
| Resources | Update resource request | PATCH | `/api/resource-requests/:id` | super_user+ |
| Resources | Update request status | PATCH | `/api/resource-requests/:id/status` | super_user+ (not self) |
| Resources | Lifecycle action on request | POST | `/api/resource-requests/:id/action` | super_user+ |
| Resources | AI resource suggestions | POST | `/api/resources/suggest` | super_user+ |

### Finance
| Module | Operation | Method | Route | Roles Permitted |
|--------|-----------|--------|-------|-----------------|
| Finance | List invoices | GET | `/api/invoices` | super_user+ (Finance) |
| Finance | Create invoice | POST | `/api/invoices` | super_user+ (Finance) |
| Finance | Finance summary KPIs | GET | `/api/invoices/finance-summary` | super_user+ (Finance) |
| Finance | Project invoice summary | GET | `/api/invoices/project-summary/:id` | super_user+ (Finance) |
| Finance | Get invoice | GET | `/api/invoices/:id` | super_user+ (Finance) |
| Finance | Update invoice | PATCH | `/api/invoices/:id` | super_user+ (Finance) |
| Finance | Delete invoice | DELETE | `/api/invoices/:id` | super_user+ (Finance) |
| Finance | Generate from timesheet | POST | `/api/invoices/from-timesheet/:id` | super_user+ (Finance) |
| Finance | List payments | GET | `/api/invoices/:id/payments` | super_user+ (Finance) |
| Finance | Record payment | POST | `/api/invoices/:id/payments` | super_user+ (Finance) |
| Finance | List billing schedules | GET | `/api/billing-schedules` | super_user+ |
| Finance | Manage revenue entries | GET/POST | `/api/revenue-entries` | super_user+ |
| Finance | List contracts | GET | `/api/contracts` | super_user+ |
| Finance | Create contract | POST | `/api/contracts` | super_user+ |
| Finance | Update contract | PATCH | `/api/contracts/:id` | super_user+ |
| Finance | Delete contract | DELETE | `/api/contracts/:id` | super_user+ |

### CRM
| Module | Operation | Method | Route | Roles Permitted |
|--------|-----------|--------|-------|-----------------|
| Opportunities | List opportunities | GET | `/api/opportunities` | All authenticated |
| Opportunities | Create opportunity | POST | `/api/opportunities` | super_user+ |
| Opportunities | Update opportunity | PATCH | `/api/opportunities/:id` | super_user+ |
| Opportunities | Convert to project | POST | `/api/opportunities/:id/convert-to-project` | super_user+ |
| Prospects | List prospects | GET | `/api/prospects` | All authenticated |
| Prospects | Create prospect | POST | `/api/prospects` | super_user+ |
| Prospects | Update prospect | PATCH | `/api/prospects/:id` | super_user+ |
| Prospects | Delete prospect | DELETE | `/api/prospects/:id` | super_user+ |
| Prospects | Convert to account | POST | `/api/prospects/:id/convert` | super_user+ |

### Users & Admin
| Module | Operation | Method | Route | Roles Permitted |
|--------|-----------|--------|-------|-----------------|
| Users | Get own profile | GET | `/api/me` | All authenticated |
| Users | List users | GET | `/api/users` | All authenticated |
| Users | Create user | POST | `/api/users` | account_admin |
| Users | Invite user | POST | `/api/users/invite` | super_user+ (role-matrix gated) |
| Users | Get user | GET | `/api/users/:id` | Own profile or super_user+ |
| Users | Update user | PATCH | `/api/users/:id` | account_admin |
| Users | Dismiss onboarding | PATCH | `/api/users/:id/onboarding-dismissed` | Own user |
| Users | Update secondary roles | PATCH | `/api/users/:id/secondary-roles` | account_admin |
| Users | Deactivate user | DELETE | `/api/users/:id` | account_admin |
| Users | Reactivate user | POST | `/api/users/:id/reactivate` | account_admin |
| Admin | List skills | GET | `/api/skills` | All authenticated |
| Admin | Create skill | POST | `/api/skills` | account_admin |
| Admin | List rate cards | GET | `/api/rate-cards` | super_user+ |
| Admin | Create rate card | POST | `/api/rate-cards` | account_admin |
| Admin | List project templates | GET | `/api/project-templates` | All authenticated |
| Admin | Create project template | POST | `/api/project-templates` | account_admin |
| Admin | List audit log | GET | `/api/audit` | account_admin |
| Admin | List holiday calendars | GET | `/api/holiday-calendars` | All authenticated |
| Admin | Manage tax codes | GET/POST | `/api/tax-codes` | account_admin |
| Admin | Manage custom fields | GET/POST | `/api/custom-fields` | account_admin |

---

## OUTPUT 5 — VALIDATION & CONSTRAINT INVENTORY

| Module | Constraint | Where Enforced | Roles Affected |
|--------|------------|----------------|----------------|
| All | `x-user-id` header required on every non-bootstrap request | `middleware/roleClaim.ts` | All |
| All | `x-user-role` must be a role actually assigned to that user | `middleware/roleClaim.ts` | All |
| All | `customer` role blocked from all internal API routes | `middleware/rbac.ts` → `denyCustomerRole` (global) | customer |
| All | Cannot approve own resources (timesheets, change orders, time-off, resource requests) | `middleware/rbac.ts` → `assertNotSelfApproval`; route handlers | All |
| Projects | Project name is required | `CreateProjectBody` Zod schema | super_user+ |
| Projects | Start date and due date are required at creation | `CreateProjectBody` Zod schema | super_user+ |
| Projects | Due date must be on or after start date | Route handler cross-field validation; frontend pre-check | super_user+ |
| Projects | Status change requires a written reason | `PATCH /projects/:id` route handler | super_user+ |
| Projects | Status can only move through allowed transitions (state machine) | `PATCH /projects/:id` route handler, `ALLOWED_TRANSITIONS` constant | super_user+ |
| Projects | Cannot edit a soft-deleted project without restoring it first | `PATCH /projects/:id` route handler | super_user+ |
| Projects | Budget, budgeted hours, and budget currency cannot be edited when budget is locked | `PATCH /projects/:id` budget lock guard | super_user+ |
| Projects | Budget is automatically locked when project moves from Draft to Active | `PATCH /projects/:id` status machine | super_user+ |
| Projects | Budget unlock requires Account Admin | `PATCH /projects/:id/unlock-budget` — `requireAdmin` middleware | account_admin only |
| Tasks | Due date must be on or after start date | `CreateTaskBody` / `UpdateTaskBody` Zod schemas + route handler | super_user+ |
| Tasks | Task priority must be one of: Low, Medium, High, Critical | Zod enum in `CreateTaskBody` | super_user+ |
| Tasks | Completing a Payment-type milestone triggers automatic draft invoice creation | Task PATCH route handler | super_user+ |
| Tasks | Cycle detection prevents circular parent-child relationships on reorder | `PATCH /tasks/reorder` route handler | super_user+ |
| Time Entries | Hours per entry must be greater than 0 and no more than 24 | `POST /time-entries` numeric floor guard (Phase 2.1) | All |
| Time Entries | Logged hours checked against daily capacity cap (soft 409 guardrail) | `POST /time-entries` guardrail | All |
| Time Entries | Duplicate entry detection (same user, same date, same project) | Time entry guardrail | All |
| Time Entries | Time entry blocked on weekends and holidays | `POST /time-entries` guardrail | All |
| Time Entries | Time entry blocked on inactive/closed projects | `closedProjectGuard.ts` | All |
| Time Entries | Budget overrun blocks entry at 100%; soft warning at 90% | `POST /time-entries` guardrail | All |
| Time Entries | AI billable anomaly check on entry creation | `POST /time-entries` AI guardrail | All |
| Timesheets | Cannot submit timesheet outside min/max hours defined in time settings | `POST /timesheets/:id/submit` | All |
| Timesheets | Rejection requires a mandatory written note | `POST /timesheets/:id/reject` | super_user+ |
| Timesheets | Only the requester's manager or an admin can approve/reject time-off requests | `PATCH /time-off-requests/:id` | super_user+ (scoped) |
| Timesheets | Time-off request blocked if the entire date range is already covered by a holiday | `POST /time-off-requests` | All |
| Timesheets | Timesheet withdrawal wrapped in DB transaction with re-read to prevent race conditions | `PATCH /timesheets/:id` withdraw flow | All |
| Timesheets | Bulk approve skips self-entries silently; returns split counts (approved / skippedSelf / skippedOther) | `POST /timesheets/bulk-approve` | super_user+ |
| Timesheets | Rate snapshot for approved timesheets serialised per-timesheet with advisory lock | `POST /timesheets/:id/approve` | super_user+ |
| Timesheets | Escalation cron notifies manager when timesheet stays Submitted > N days (configurable) | `lib/timesheetEscalation.ts` cron | System |
| Resources | Allocation blocked if user's daily hours would exceed capacity (over-allocation guard) | `POST /allocations` route handler | super_user+ |
| Resources | Skill mismatch on allocation returns 422 with bypass-via-override option | `POST /allocations` skill validation | super_user+ |
| Resources | Resource request auto-creates allocation when status moves to Fulfilled | `PATCH /resource-requests/:id/status` | super_user+ |
| Resources | Approving time-off checks for conflicting hard allocations; flags them at-risk and notifies PM | `lib/timeOffAllocationConflict.ts` (fire-and-forget) | System |
| Resources | Effort overrun detected on timesheet approval; one notification per task lifetime | `lib/effortOverrunCheck.ts` (fire-and-forget) | System |
| Finance | Invoice amount and tax must be ≥ 0 | `POST /invoices` numeric floor guard | super_user+ |
| Finance | Invoice status follows strict lifecycle (no arbitrary jumps) | `PATCH /invoices/:id` status machine | super_user+ |
| Finance | Change order amount and additional hours must be ≥ 0 | `POST /projects/:id/change-orders` numeric floor guard | super_user+ |
| Finance | SOW budget entry: only one per project (partial unique index) | DB partial unique index on `budget_entries(project_id) WHERE type='SOW'` | super_user+ |
| Invites | Role assignment matrix: admin can invite any role; super_user can invite collaborator/customer; collaborator can only invite customer | `middleware/inviteValidation.ts` | super_user+, collaborator |
| Opportunities | Crossing 70% probability auto-triggers soft allocations for proposed team members | `PATCH /opportunities/:id` route handler | System |
| Admin | Request body is strictly parsed (`.strict()`) on all write endpoints — unknown fields rejected | Route-level Zod `.strict()` parsing (Phase 2.2) | All |

---

## OUTPUT 6 — WORKFLOW & STATUS INVENTORY

### Project Status Machine
| Status | Triggered By | Who Can Trigger |
|--------|-------------|-----------------|
| Draft | Project creation (default or from template) | super_user+ |
| Not Started | Manual status change from Draft | super_user+ (with reason) |
| Active | Manual status change; auto-locks budget | super_user+ (with reason) |
| On Hold | Manual status change from Active | super_user+ (with reason) |
| Completed | Manual status change from Active | super_user+ (with reason) |
| Cancelled | Manual status change from Active or On Hold | super_user+ (with reason) |

**Allowed transitions:** Draft → Active; Not Started → Draft, Active; Active → On Hold, Completed, Cancelled; On Hold → Active, Cancelled. Completed and Cancelled are terminal.

### Invoice Status Machine
| Status | Triggered By | Who Can Trigger |
|--------|-------------|-----------------|
| Draft | Manual creation; auto-generated from approved timesheet; auto-generated on milestone completion | super_user+ (Finance) |
| In Review | Manual promotion from Draft | super_user+ (Finance) |
| Approved | Manual promotion from In Review | super_user+ (Finance) |
| Sent | Manual promotion from Approved | super_user+ (Finance) |
| Overdue | Automatic — system detects past due date while status is Sent | System cron / list endpoint |
| Paid | Manual recording of full payment | super_user+ (Finance) |
| Void | Manual void from any status | super_user+ (Finance) |

### Timesheet Status Machine
| Status | Triggered By | Who Can Trigger |
|--------|-------------|-----------------|
| Draft | Created automatically for week; or after rejection / withdrawal | System; User |
| Submitted | User explicitly submits | Timesheet owner |
| Approved | Manager or admin approves | Manager of submitter or account_admin (not self) |
| Rejected | Reviewer rejects with mandatory note | super_user+ (not self) |

Note: `escalatedAt` is reset to NULL on every transition so escalation re-arms correctly.

### Change Order Status Machine
| Status | Triggered By | Who Can Trigger |
|--------|-------------|-----------------|
| Draft | Creation | super_user+ |
| Submitted | Manual submission | super_user+ |
| Approved | Approval (not by submitter) | super_user+ (not self) |
| Rejected | Rejection | super_user+ (not self) |

### Resource Request Status Machine
| Status | Triggered By | Who Can Trigger |
|--------|-------------|-----------------|
| Pending | Creation | super_user+ |
| In Review | Lifecycle action | super_user+ |
| Alternative Proposed | Lifecycle action | super_user+ |
| Approved | Status update | super_user+ (not self) |
| Fulfilled | Status update; auto-creates allocation | super_user+ |
| Rejected | Status update | super_user+ (not self) |
| Blocked | Status update | super_user+ |

### Time-Off Request Status
| Status | Triggered By | Who Can Trigger |
|--------|-------------|-----------------|
| Pending | Submission | Any authenticated user |
| Approved | Manager/admin approval; triggers conflict check for allocations | Requester's manager or account_admin |
| Rejected | Manager/admin rejection | Requester's manager or account_admin |

### Opportunity Stage Machine
| Stage | Probability | Triggered By |
|-------|------------|--------------|
| Discovery | 10% | Creation |
| Qualified | 25% | Manual |
| Proposal | 50% | Manual |
| Negotiation | 75% | Manual; crossing 70% auto-creates soft allocations |
| Won | 100% | Manual; enables Convert to Project |
| Lost | 0% | Manual |

### Prospect Status
| Status | Triggered By |
|--------|-------------|
| New | Creation |
| Converted | Convert to Account action |

### Document Approval Status
| Status | Triggered By |
|--------|-------------|
| Pending | Upload / creation |
| Approved | Manual approval |
| Rejected | Manual rejection |

### Allocation Status
| Status | Triggered By |
|--------|-------------|
| (normal / null) | Creation |
| at_risk | System detects overlapping approved time-off on a hard allocation |

---

## OUTPUT 7 — CROSS-MODULE DEPENDENCIES

| From Module | To Module | Data Shared | Trigger |
|-------------|-----------|-------------|---------|
| Opportunities | Projects | Account ID, opportunity ID, name, owner, start date, budget | Convert to Project action |
| Opportunities | Allocations | Proposed team members auto-soft-allocated | Opportunity crosses 70% probability |
| Projects | Invoices | Project ID, account ID, budget context | Invoice creation; milestone completion triggers auto-draft |
| Projects | Allocations | Project ID, date range, owner ID | Allocation creation; timeline change triggers out-of-range check |
| Projects | Tasks | Project ID, phase structure, template tasks | Task creation from template; project date changes |
| Projects | Budget Entries | Project ID, SOW entry auto-created | Project creation |
| Projects | Notifications | Project ID, owner ID, allocated user IDs | Status change notifies all allocated users |
| Projects | Audit Log | Project entity, field changes, actor | Every PATCH, status change, budget entry |
| Timesheets | Invoices | Timesheet ID, approved hours, rate snapshot | Generate invoice from approved timesheet |
| Timesheets | Notifications | Manager/user IDs | Submission, approval, rejection, escalation |
| Timesheets | Allocations | Rate snapshot reads allocation bill rates on approval | Timesheet approval |
| Time Entries | Tasks | Task ID, hours | Logged hours roll up to task actual hours; triggers effort overrun check |
| Time Entries | Projects | Project ID, hours | Tracked hours computed from time entries across project |
| Time Off | Allocations | Overlapping date ranges; sets allocation status to at_risk | Time-off approval |
| Time Off | Notifications | PM user ID | Conflict notification on approval |
| Resource Requests | Allocations | Project ID, role, user ID, dates | Fulfilling a request auto-creates an allocation |
| Accounts | Projects | Account ID | Project scoped to account |
| Accounts | Prospects | Prospect ID (convertedFromProspectId) | Prospect conversion creates account |
| Accounts | Opportunities | Account ID | Opportunities scoped to account |
| Accounts | Invoices | Account ID | Invoices scoped to account |
| Tasks | Invoices | Milestone completion event | Payment milestone creates draft invoice |
| Tasks | Allocations | Assignee IDs | Auto-allocation when task assigned (if project autoAllocate=true) |
| Rate Cards | Timesheets | Bill rates per role | Rate snapshot on timesheet approval |
| Holiday Calendars | Time Entries | Holiday dates | Blocks time entry on holidays |
| Holiday Calendars | Time Off | Holiday coverage | Blocks time-off request if fully covered by holidays |
| Holiday Calendars | Allocations | Holiday deductions | Capacity impact calculation in preview |
| Skills | Allocations | Required skill + proficiency | Skill validation on allocation creation |
| Skills | Users | User skill set | Skill mismatch check against user skills |
| Audit Log | All modules | Entity type, ID, before/after values | Every create/update/delete/status_change action |

---

## NOTES FOR PROMPT 2

- **No `phases` table** — phases are level-1 tasks (`tasks.isPhase = true`). Template phases (`template_phases`) still exist for template design only.
- **`tracked_hours` column removed** — computed at read time from `time_entries` via `getTrackedHoursMap` helper.
- **Invoice PK** is text format `INV-YYYY-NNN`, not a serial integer.
- **Auth is trust-based** (dev) — `x-user-id` + `x-user-role` headers; no JWT/session. `GET /me` bootstraps identity.
- **Fire-and-forget pattern** used for all cross-module side effects (notifications, conflict checks, overrun checks) — they never block HTTP responses.
- **Pagination** is opt-in (`?limit`/`?offset`) on: GET /projects, /accounts, /time-entries, /allocations. Default 100, max 500.
- **Soft delete** on projects only — `deletedAt` timestamp. Users deactivated via `isActive=false`.
- **Budget governance**: SOW entry auto-created on project creation; budget locked on Draft→Active; unlock via admin-only endpoint; Change Orders provide the audit-safe path to budget modification.
- **Timesheet escalation cron**: `0 9 * * *` org timezone; reads `time_settings.escalation_days_after`; ≤0 disables it.
- **Scheduler** (`lib/scheduler.ts`) is the single entry point for all cron jobs.
- **OpenAPI spec** lives at `lib/api-spec/openapi.yaml`; Orval codegen produces React Query hooks + Zod schemas.
- **Test suite**: 132 tests / 28 suites (node:test built-in) — all passing at last verification.

---

DISCOVERY COMPLETE — Ready for Prompt 2
