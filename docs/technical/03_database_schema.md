# Database Schema — BusinessNow PSA

| | |
|---|---|
| **Product** | BusinessNow PSA |
| **Owner** | Backend Lead |
| **Version** | 1.0 — Approved |
| **Date** | 2026-04-24 |
| **Status** | Approved |

> The **per-table** definitions (columns, types, indexes, foreign keys) are codified in the Drizzle schema files at `lib/db/src/schema/*.ts`, which is the source of truth. Per-table prose with notes and key API endpoints lives in [`../BusinessNow-PSA-Architecture.md`](../BusinessNow-PSA-Architecture.md) §4. **This document is the schema-level overview** — module groupings, key relationships, and operational rules.

---

## 1. Database

| | |
|---|---|
| Engine | PostgreSQL (Replit-managed) |
| Connection | `DATABASE_URL` env var |
| ORM | Drizzle (`lib/db/src/schema/*.ts`) |
| Migrations | `drizzle-kit push` for additive changes; planned migration window for destructive ones |
| Snapshots | Replit-managed daily snapshots; PITR available |
| Off-site backup | Quarterly export held by KSAP IT (per doc 17) |

---

## 2. Schema at a Glance

- **~60 tables** across **11 domain modules**.
- Primary keys are `serial` integers (do not change to UUID — see DB safety rules).
- Soft delete on **`projects.deleted_at`** (and a small set of related tables); other domains hard-delete and rely on `audit_log`.
- Universal `created_at` / `updated_at` timestamps on most tables.
- Single tenant — there is no `organization_id` column. Do not introduce one without an architecture review.
- All write paths must emit a row in **`audit_log`** via `logAudit()` (see doc 02 §6 for triggers).

---

## 3. Module Map

| # | Module | Tables (representative) | Schema files |
|---|---|---|---|
| 1 | **Users & Access** | `users`, `user_skills` | `users.ts`, `skills.ts` |
| 2 | **CRM** | `accounts`, `prospects`, `opportunities` | `accounts.ts`, `prospects.ts`, `opportunities.ts` |
| 3 | **Project Management** | `projects`, `phases`, `project_members`, `project_updates`, `update_recipients`, `baselines`, `change_orders`, `key_events` | `projects.ts`, `phases.ts`, `projectMembers.ts`, `projectUpdates.ts`, `changeOrders.ts` |
| 4 | **Task Management** | `tasks`, `task_dependencies`, `task_comments`, `task_attachments`, `task_checklists` | `tasks.ts`, `taskRelations.ts` |
| 5 | **Time Tracking** | `time_entries`, `timesheets`, `timesheet_rows`, `timesheet_messages`, `time_off_requests`, `time_categories`, `time_settings`, `activity_defaults`, `intervals`, `holiday_calendars`, `holiday_dates` | `timeEntries.ts`, `timesheets.ts`, `intervalIq.ts` |
| 6 | **Resource Management** | `allocations`, `placeholders`, `resource_requests`, `resource_request_comments` | `allocations.ts`, `placeholders.ts`, `resourceRequests.ts` |
| 7 | **Finance & Billing** | `invoices`, `invoice_line_items`, `billing_schedules`, `revenue_entries`, `tax_codes`, `rate_cards`, `job_roles` | `invoices.ts`, `financials.ts`, `rateCards.ts` |
| 8 | **Skills & Templates** | `skills`, `skill_categories`, `user_skills`, `project_templates`, `template_phases`, `template_tasks`, `template_allocations` | `skills.ts`, `projectTemplates.ts` |
| 9 | **Notifications & Audit** | `notifications`, `notification_preferences`, `audit_log` | `notifications.ts`, `auditLog.ts` |
| 10 | **Admin & Configuration** | `company_settings`, `tax_codes`, `time_settings`, `time_categories`, `holiday_calendars`, `holiday_dates`, `custom_field_definitions`, `custom_field_sections`, `custom_field_values`, `saved_views` | `companySettings.ts`, `customFields.ts`, `savedViews.ts` |
| 11 | **Client Portal & Forms** | `client_portal_access`, `documents`, `document_versions`, `forms`, `form_fields`, `form_responses`, `csat_surveys`, `csat_responses` | `clientPortal.ts`, `documents.ts`, `forms.ts`, `csat.ts` |

---

## 4. Key Relationships

### CRM → Project lifecycle

```
accounts ─┬─► prospects ─► opportunities ─► projects
          │
          └─► (direct project assignment for known accounts)
```

When an opportunity reaches **probability ≥ 70 %**, the API creates a **soft allocation** so resourcing can plan against likely-won work. When the project is created, template allocations (if any) are copied (gated by `template.autoAllocate`), mapping `relativeStartDay` → absolute project dates.

### Project structure

```
projects ─┬─► phases ─► tasks ─┬─► task_dependencies (M:N)
          │                    ├─► task_comments
          │                    ├─► task_attachments
          │                    └─► task_checklists
          ├─► project_members
          ├─► project_updates ─► update_recipients
          ├─► baselines
          ├─► change_orders
          └─► key_events
```

### Resource & capacity

```
users (or placeholders) ─► allocations ──► projects
                                  ▲
                                  │
                    resource_requests (Fulfilled → auto-create allocation)
```

`/resources/capacity` and `/reports/capacity-planning` both filter `projects.deleted_at IS NULL` so archived projects do not consume capacity.

### Time → Finance

```
time_entries ─► timesheets ─► (approve/reject) ─► notifications
                                              │
                                              ▼
              tasks (milestone complete) ─► invoices ─► invoice_line_items
                                                      │
                                                      ▼
                                              revenue_entries
```

### Notifications & audit

`notifications` and `audit_log` are written by the API across the board. `audit_log` is **append-only** (no UI write paths), and the `GET /api/audit-log` endpoint is cursor-paginated.

---

## 5. Soft Delete

| Table | Mechanism | Restore |
|---|---|---|
| `projects` | `deleted_at` column set; `GET /api/projects` filters by default. | `POST /api/projects/:id/restore` (Admin / PM). |

Other tables (`tasks`, `allocations`, etc.) are hard-deleted; the audit log is the post-hoc record.

**Operational rules:**

- Capacity calculations exclude soft-deleted projects (fix landed 2026-04-23).
- Reports (`/api/reports/*`) exclude soft-deleted projects unless the report explicitly opts in.
- The Project list UI hides soft-deleted projects behind a "Show Archived" toggle.

---

## 6. Audit Log

`audit_log` is written by `logAudit()` from inside every write route. Schema essentials:

| Column | Notes |
|---|---|
| `id` | serial PK |
| `actor_user_id` | nullable (system actions allowed) |
| `actor_role` | the `x-user-role` value at the time of the write |
| `entity_type` | e.g. `project`, `task`, `allocation`, `invoice`, `change_order` |
| `entity_id` | numeric id of the affected entity |
| `action` | `create`, `update`, `delete`, `restore`, `submit`, `approve`, `reject`, … |
| `payload_before` | JSONB; nullable on create |
| `payload_after` | JSONB; nullable on delete |
| `created_at` | timestamptz |

The Definition of Done for any new write route includes: an `audit_log` row is emitted with non-null actor and a meaningful `action`.

---

## 7. Indexing Notes

| Table | Index strategy |
|---|---|
| `projects` | Indexes on `account_id`, `status`, `deleted_at`. |
| `tasks` | Indexes on `project_id`, `phase_id`, `assignee_id`, `status`. |
| `allocations` | Indexes on `user_id`, `placeholder_id`, `project_id`, `start_date`, `end_date`. |
| `time_entries` | Composite index `(user_id, entry_date)`. |
| `timesheets` | Composite index `(user_id, week_start_date)`. |
| `audit_log` | Cursor-friendly index on `(id)`; secondary on `(entity_type, entity_id)` for entity history reads. |
| `notifications` | Composite index `(user_id, read_at, created_at desc)`. |
| `invoices` | Indexes on `project_id`, `status`, `issued_date`. |

If you add a list endpoint and it can return more than ~1k rows, add or extend an index before merging.

---

## 8. Schema Change Workflow

1. Edit the Drizzle schema in `lib/db/src/schema/*.ts`.
2. Run `pnpm --filter @workspace/db run db:push` (additive changes only).
3. If a destructive change (column drop, type change, PK change) is genuinely required:
   - Open an ADR / charter-version note.
   - Schedule a migration window outside business hours.
   - Take a snapshot before the migration.
4. Update the per-table reference in `BusinessNow-PSA-Architecture.md` §4.
5. Update the OpenAPI spec if the change is reflected at the API surface, then run codegen (doc 02 §8).

> **Never** change a primary-key column type (e.g. `serial` → `varchar`). See the platform's DB safety rules.

---

## 9. Sample Queries (operational)

```sql
-- Active projects (not soft-deleted) with effort consumed
SELECT p.id, p.name, p.status,
       COALESCE(SUM(te.minutes), 0) / 60.0 AS hours_logged
FROM projects p
LEFT JOIN tasks t ON t.project_id = p.id
LEFT JOIN time_entries te ON te.task_id = t.id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.status
ORDER BY hours_logged DESC;

-- Pending change-order revenue / effort impact (powers /api/dashboard/cr-impact)
SELECT COUNT(*)              AS pending_count,
       SUM(revenue_delta)    AS revenue_delta,
       SUM(effort_delta_hrs) AS effort_delta_hrs
FROM change_orders
WHERE status = 'Pending';

-- Capacity-planning weekly bucket (sketch — production code is in routes/reports.ts)
SELECT date_trunc('week', d::date) AS week_start,
       SUM(u.capacity)            AS total_capacity_hrs
FROM generate_series(current_date, current_date + interval '12 weeks', interval '1 week') AS d
CROSS JOIN users u
WHERE u.is_active = 1
GROUP BY 1 ORDER BY 1;
```

---

## 10. Known Gaps

- **Row-level access** for the `Viewer` / `Consultant` role on GET endpoints is permissive (returns all rows). Tracked as a backlog item in `comprehensive-audit-2026-04.md`.
- **FTE = 40h/week** is hardcoded; `time_settings` could carry this per-tenant in future.
- **Reports run off OLTP.** No data warehouse — capacity-planning queries are capped at 52 weeks for safety.

---

## 11. Revision Log

| Date | Version | Changed By | What Changed |
|---|---|---|---|
| 2026-04-24 | 1.0 | Backend Lead | Replaced template with the real BusinessNow PSA schema overview. Documents the 11-module map, ~60-table count, soft-delete and audit-log rules, indexing strategy, and schema-change workflow. |
