# BusinessNow PSA — Complete Site Map

---

## Entry Points

| Route | Page |
|-------|------|
| `/login` | Login |
| `/` | Dashboard |

---

## CRM

**Routes:** `/accounts` · `/prospects` · `/opportunities`

- Accounts
- Prospects
- Opportunities

---

## Project Delivery

**Routes:** `/projects` · `/projects/:id`

- Projects List
- **Project Detail** (`/projects/:id`)
  - Tasks
  - Team & Allocations
  - Financials
  - Change Orders
  - CSAT
  - Documents
  - Forms
  - Gantt
  - Time
  - Updates

---

## Resource Management

**Route:** `/resources`

- Capacity
- Heatmap
- Projects Timeline
- People Timeline
- Requests
- Skills Matrix

---

## Time & Attendance

**Route:** `/time`

- Timesheet
- Approvals
- Time Entries
- By Project
- By User
- Time Off

---

## Finance

**Route:** `/finance`

- Invoices
- Billing Schedules
- Revenue Recognition
- Contracts

---

## Reports & Analytics

**Route:** `/reports`

- Performance
- Utilization Grid
- Timesheet Submissions
- Capacity Planning
- Operations
- CSAT Trend
- Interval IQ
- Budget vs Actuals
- Burn-Down
- Revenue
- Utilization
- Project Health

---

## Admin

**Route:** `/admin`

- Users
- Project Templates
- Document Templates
- Skills
- Job Roles
- Tax Codes
- Time Categories
- Task Statuses
- Time Settings
- Holidays
- Rate Cards
- Custom Fields
- Activity Defaults
- Placeholders
- Audit Log
- Settings
- Archived

---

## Command Center

**Route:** `/command-center`

- Portfolio Overview
- Over-Allocated Resources
- Resource Requests

---

## Notifications

**Route:** `/notifications`

- Notification Inbox

---

## Redirects

| From | To |
|------|----|
| `/time-tracking` | `/time` |
| `/admin/portfolio` | `/command-center` |
| `/rate-cards` | `/admin?tab=ratecards` |
| `/admin/rate-cards` | `/admin?tab=ratecards` |

---

## Access Control

| Module | Required Permission |
|--------|-------------------|
| Finance | `invoicing.view` |
| Reports & Analytics | `reports.viewStandard` |
| Admin | `settings.manageTeam` |
| Command Center | `settings.manageTeam` |
| All others | Authenticated user (any role) |
