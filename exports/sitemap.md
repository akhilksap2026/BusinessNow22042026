# BusinessNow PSA — Sitemap
**KSAP Technology · Generated: May 2026 · Sprint 3**

---

## Top-Level Routes

| Path | Page | Access |
|------|------|--------|
| `/login` | Login | Public |
| `/` | Dashboard | All roles |
| `/projects` | Projects List | All roles |
| `/projects/:id` | Project Detail | All roles |
| `/accounts` | Accounts | All roles |
| `/prospects` | Prospects | All roles |
| `/opportunities` | Opportunities | All roles |
| `/time` | Time Tracking | All roles |
| `/resources` | Resources | All roles |
| `/finance` | Finance | `invoicing.view` |
| `/reports` | Reports | `reports.viewStandard` |
| `/command-center` | Command Center | `settings.manageTeam` |
| `/admin` | Admin | `settings.manageTeam` |
| `/notifications` | Notifications | All roles |
| `/forbidden` | 403 Forbidden | System |
| `*` | 404 Not Found | System |

---

## Redirects

| From | To |
|------|----|
| `/time-tracking` | `/time` |
| `/admin/portfolio` | `/command-center` |
| `/rate-cards` | `/admin?tab=ratecards` |
| `/admin/rate-cards` | `/admin?tab=ratecards` |

---

## Project Detail (`/projects/:id`) — Tabs

| Tab | Contents |
|-----|----------|
| Tasks | Tree view, Kanban, Gantt chart |
| RAID | Risks, Actions, Issues, Decisions |
| Resources | Allocations, requests, placeholders |
| Financials | Budget history, change orders, cost entries, asset bookings |
| Documents | Project documents, form submissions |
| Updates | Project update posts, recipients |
| CSAT | Star ratings and distribution |

---

## Finance (`/finance`) — Tabs

| Tab | Contents |
|-----|----------|
| Invoices | List, send, record payment, print |
| Billing Schedules | Milestone-based billing |
| Revenue Recognition | Monthly revenue entries |
| Contracts | Contract CRUD per project |

---

## Time Tracking (`/time`) — Tabs

| Tab | Contents |
|-----|----------|
| Time Entries | Log and manage individual entries |
| Timesheets | Weekly grid, submit and approve flow |
| Time Off | Submit and manage leave requests |
| AI Assistant | NL entry, auto-suggest, wizard |

---

## Resources (`/resources`) — Tabs

| Tab | Contents |
|-----|----------|
| Capacity | Utilisation grid, skill badges |
| Bench | Unallocated team members |
| Resource Requests | Open requests, status tracking |

---

## Reports (`/reports`) — Tabs

| Tab |
|-----|
| Performance |
| Operations |
| CSAT Trend |
| Interval IQ |
| Budget vs Actuals |
| Burn-Down |
| Revenue |
| Utilisation |
| Project Health |

---

## Admin (`/admin`) — Tabs

| Tab | Contents |
|-----|----------|
| Users | Roles, skills, secondary roles |
| Project Templates | Template phases and tasks |
| Document Templates | Reusable document content |
| Skills Matrix | Skill definitions |
| Tax Codes | Tax rate management |
| Rate Cards | Billing rate configuration |
| Custom Fields | Global field definitions |
| Holiday Calendars | Org-wide calendar management |
| Archived Projects | Soft-deleted project list |
| Audit Log | System activity log with action and date filters |
| Company Settings | Name, logo, colour, timezone, currency |

---

## Global / Layout-Level Features

| Feature | Access |
|---------|--------|
| Sidebar navigation (collapsible to icon rail) | All roles |
| Command palette — Cmd / Ctrl + K | All roles |
| Notification bell with unread badge | All roles |
| Role selector modal (multi-role users) | All roles |
| Global error toasts | All roles |
| Onboarding checklist (dismissible) | account_admin only |

---

*BusinessNow PSA Platform — KSAP Technology — Confidential*
