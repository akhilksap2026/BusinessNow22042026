---
name: Effort Entries System
description: Two parallel time-entry systems exist — legacy time_entries and the newer effort_entries. The Time Tracking UI uses effort_entries only.
---

## Rule
The app has two time entry tables: `time_entries` (legacy, used by old `/api/time-entries` routes and seed script) and `effort_entries` (new, used by `/api/time/*` routes and the Time Tracking UI). The seed script ONLY seeds `time_entries`. On a fresh DB, `effort_entries` will be empty and the Time Tracking page will show nothing.

**Why:** The effort entries system was added after the initial seed script was written, creating a drift between seed data and what the UI actually reads.

**How to apply:** After running `pnpm --filter @workspace/scripts run seed`, also run the backfill SQL to copy `time_entries` → `effort_entries`. Additionally seed: `leave_types`, `financial_periods`, `contract_rules` (all empty after seed script).

## Backfill SQL (run after seed)
```sql
-- Leave types
INSERT INTO leave_types (code, name, is_active) VALUES
  ('PTO','Paid Time Off',true),('SICK','Sick Leave',true),
  ('PH','Public Holiday',true),('UNPAID','Unpaid Leave',true),
  ('BEREAVEMENT','Bereavement Leave',true),('STUDY','Study / Professional Development',true)
ON CONFLICT (code) DO NOTHING;

-- Financial periods (adjust range as needed)
INSERT INTO financial_periods (period_name, start_date, end_date, status) VALUES
  ('Jan 2025','2025-01-01','2025-01-31','Closed'),
  ('Feb 2025','2025-02-01','2025-02-28','Closed'),
  ('Mar 2025','2025-03-01','2025-03-31','Closed'),
  ('Apr 2025','2025-04-01','2025-04-30','Closed'),
  ('Jun 2026','2026-06-01','2026-06-30','Open');

-- Contract rules per project
INSERT INTO contract_rules (project_id, contract_type, increment_minutes, narrative_required, future_date_buffer_days, max_daily_hours)
SELECT id, CASE billing_type WHEN 'Fixed Fee' THEN 'Fixed_Bid' ELSE 'Time_And_Materials' END, 15, false, 7, 24
FROM projects WHERE NOT EXISTS (SELECT 1 FROM contract_rules cr WHERE cr.project_id = projects.id);

-- Backfill effort_entries from time_entries
INSERT INTO effort_entries (resource_id, entered_by_id, project_id, entry_date, duration_hours, billable_category, status, narrative, week_start_date, is_leave, is_exceptional, is_replicated, financial_period_id)
SELECT te.user_id, te.user_id, te.project_id, te.date, te.hours::numeric,
  CASE WHEN te.billable THEN 'Billable' ELSE 'Non-Billable' END,
  CASE WHEN te.approved THEN 'Approved' ELSE 'Draft' END,
  te.description, te.date, false, false, false, fp.id
FROM time_entries te
LEFT JOIN financial_periods fp ON te.date >= fp.start_date AND te.date <= fp.end_date
WHERE NOT EXISTS (SELECT 1 FROM effort_entries ee WHERE ee.resource_id = te.user_id AND ee.entry_date = te.date AND ee.project_id = te.project_id);
```

## Bug Fixed
`weeklyAggregationService.ts` used `innerJoin(tasksTable, ...)` which drops rows with null taskId. Changed to `leftJoin` with `taskName ?? "General"` fallback.
