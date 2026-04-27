"use strict";

/**
 * PRD content for BusinessNow PSA — derived from real codebase exploration.
 * Edit this file to update the document; everything else regenerates.
 */

module.exports = {
  meta: {
    productName:   "BusinessNow PSA",
    productTagline:"Single-tenant Professional Services Automation platform",
    documentTitle: "Product Requirements Document",
    version:       "1.0",
    status:        "Approved",
    classification:"Internal — Confidential",
    documentId:    "PRD-BN-2026-001",
    owner:         "Product Management",
    author:        "Product Team",
    approver:      "VP Product",
    date:          "27 April 2026",
    nextReview:    "27 July 2026",
  },

  vision: {
    statement: "BusinessNow PSA is the operational backbone for KSAP Technology's professional services business — unifying CRM, project delivery, resource planning, time tracking, and finance into a single source of truth that eliminates spreadsheets, prevents revenue leakage, and gives leaders real-time visibility from sales pipeline through cash collection.",
    goals: [
      { id: "G1", goal: "Eliminate manual handoffs between sales and delivery", metric: "100% of won opportunities convert to projects in < 1 click", target: "Q2 2026" },
      { id: "G2", goal: "Achieve > 75% organisation-wide billable utilisation",  metric: "Billable hours / total available hours per consultant",  target: "Q3 2026" },
      { id: "G3", goal: "Reduce timesheet approval cycle from 5 days to 24 hours", metric: "Median time from submit → approve",                    target: "Q2 2026" },
      { id: "G4", goal: "Auto-draft invoices on milestone completion",            metric: "% of invoices created without manual data entry",      target: "Q2 2026" },
      { id: "G5", goal: "Surface project health degradation within 48 hours",     metric: "% of At Risk / Off Track projects flagged on dashboard",target: "Q3 2026" },
      { id: "G6", goal: "Capacity-plan 12 weeks ahead with < 5% forecast error",  metric: "Planned hours vs actual hours, rolling 12-week",       target: "Q4 2026" },
    ],
    nonGoals: [
      "Multi-tenant SaaS — this is a single-tenant deployment for KSAP only.",
      "General-ledger accounting — we hand off to NetSuite for GL, AR, AP.",
      "Payroll calculation — we provide approved timesheet exports only.",
      "Customer-facing project portal beyond read-only status views.",
      "Mobile-native apps — responsive web is in scope; native iOS/Android is not.",
    ],
  },

  personas: [
    {
      id: "P1",
      name: "Account Admin",
      systemRole: "account_admin",
      example: "Tom Bridges — Operations Director",
      jobs: [
        "Configure org-wide settings, rate cards, and project templates",
        "Manage user accounts, roles, and access provisioning",
        "View raw cost rates and full financial data",
        "Audit any change in the system via the audit log",
      ],
      pains: [
        "Onboarding a new consultant currently takes 4 systems and 30 minutes",
        "No single view of who has access to what",
        "Spreadsheet rate cards drift out of sync with invoicing",
      ],
    },
    {
      id: "P2",
      name: "Super User (PM / Finance)",
      systemRole: "super_user",
      example: "Marcus Webb — Project Manager",
      jobs: [
        "Plan projects: phases, tasks, dependencies, baselines",
        "Allocate consultants to project phases (hard / soft)",
        "Approve timesheets weekly for direct reports",
        "Raise invoices and revenue entries against milestones",
        "Monitor project health and run reports",
      ],
      pains: [
        "Can't see consultant capacity vs allocation in one place",
        "Manual invoice creation is error-prone and slow",
        "Health flags get spotted too late — usually post-budget overrun",
      ],
    },
    {
      id: "P3",
      name: "Collaborator (Consultant / Engineer)",
      systemRole: "collaborator",
      example: "Amara Diallo — Consultant",
      jobs: [
        "Log time daily against assigned project tasks",
        "View my allocations for the next 4 weeks",
        "Submit my weekly timesheet for approval",
        "Request time off and see my balance",
        "Update task status (To Do / In Progress / Done)",
      ],
      pains: [
        "Forget to log time, then have to recreate the week from memory",
        "No visibility on what's coming up after my current allocation",
        "Time-off approvals get stuck without escalation",
      ],
    },
    {
      id: "P4",
      name: "Customer (Client Stakeholder)",
      systemRole: "customer",
      example: "External — TechNova client lead",
      jobs: [
        "View read-only status of projects I'm a stakeholder on",
        "See milestone completion and upcoming deliverables",
        "Download project status reports",
        "Submit CSAT surveys at project close",
      ],
      pains: [
        "Status reports arrive late, in inconsistent formats",
        "No self-service way to see if my project is on track",
      ],
    },
  ],

  modules: [
    {
      id: "M1", name: "CRM",
      colour: "#7C3AED",
      icon: "users",
      purpose: "Manage the full sales funnel — from first-touch prospects through to won opportunities ready for delivery.",
      pages: [
        { route: "/accounts",      name: "Accounts",      description: "Client organisation registry. Tier, region, status, primary contact." },
        { route: "/prospects",     name: "Prospects",     description: "Early-stage leads not yet qualified into the pipeline." },
        { route: "/opportunities", name: "Opportunities", description: "Qualified pipeline with stage, probability, value, expected close." },
      ],
      keyFeatures: [
        "Probability ≥ 70% auto-creates a soft allocation to reserve resources",
        "One-click conversion: Won opportunity → live Project with template applied",
        "Account hierarchy with parent / subsidiary relationships",
        "Pipeline weighted forecast on dashboard",
      ],
      apis: [
        "GET/POST/PATCH /api/accounts",
        "GET/POST/PATCH /api/opportunities",
        "POST /api/opportunities/:id/convert  → creates Project",
      ],
    },
    {
      id: "M2", name: "Project Delivery",
      colour: "#2563EB",
      icon: "briefcase",
      purpose: "Plan, execute, and govern project delivery — the central spine of the platform.",
      pages: [
        { route: "/projects",            name: "Projects List",   description: "All active and archived projects with health filters." },
        { route: "/projects/:id",        name: "Project Detail",  description: "Tabs: Overview, Phases, Tasks, Allocations, Documents, Updates." },
        { route: "/projects/:id/phases", name: "Phase Plan",      description: "WBS phases with dates, owner, and milestone flags." },
        { route: "/projects/:id/tasks",  name: "Task Board",      description: "Kanban + table view, dependencies, baselines." },
      ],
      keyFeatures: [
        "Project health: On Track / At Risk / Off Track (auto-calculated + manual override)",
        "Project templates: clone phases, tasks, allocations from a master",
        "Baselines: snapshot the plan and track variance over time",
        "Change orders: formal scope-change record with approval flow",
        "Soft delete (deletedAt) for full audit trail",
      ],
      apis: [
        "GET/POST/PATCH /api/projects",
        "POST /api/projects/from-template",
        "POST /api/projects/:id/baselines",
        "GET/POST /api/change-orders",
        "PATCH /api/tasks/bulk  (bulk status / assignee / priority updates)",
      ],
    },
    {
      id: "M3", name: "Resource Management",
      colour: "#059669",
      icon: "calendar",
      purpose: "Match supply (consultant capacity) to demand (project allocations) with forward-looking visibility.",
      pages: [
        { route: "/resources",          name: "Resources",          description: "Roster of consultants with skills, capacity, allocations." },
        { route: "/resources?tab=plan", name: "Capacity Planning",  description: "Demand vs supply chart, up to 52 weeks ahead." },
        { route: "/resources?tab=req",  name: "Resource Requests",  description: "Workflow for requesting new staff, role changes, or removals." },
      ],
      keyFeatures: [
        "Hard vs Soft allocations (committed vs probable)",
        "Placeholder roles for unassigned demand",
        "Skills matrix with proficiency levels",
        "AI Suggestions: 0.7×skill + 0.3×capacity composite score",
        "Resource request types: New, Replace, Extend, Reduce, Change Role, Remove",
        "Time-off and holiday calendar integration",
      ],
      apis: [
        "GET/POST/PATCH /api/allocations",
        "GET/POST /api/resource-requests",
        "POST /api/resources/suggest  → ranked candidates with reasons",
        "GET /api/reports/capacity-planning",
      ],
    },
    {
      id: "M4", name: "Time & Attendance",
      colour: "#D97706",
      icon: "clock",
      purpose: "Capture billable and non-billable hours, route through approval, and feed downstream invoicing.",
      pages: [
        { route: "/time",                  name: "Time Tracking",      description: "Weekly grid: rows = projects, columns = days." },
        { route: "/time?tab=timeoff",      name: "Time Off",           description: "Request, approve, view balance." },
        { route: "/time?tab=approvals",    name: "Approvals (PM)",     description: "Queue of timesheets awaiting approval." },
      ],
      keyFeatures: [
        "Import allocations into timesheet (one-click pre-fill)",
        "AI Time Assistant: suggest time entries from calendar / activity",
        "Submit / Approve / Reject workflow with comments",
        "Holiday calendar — auto-marks public holidays per region",
        "Lock approved entries to prevent retroactive edits",
      ],
      apis: [
        "GET/POST/PATCH /api/time-entries",
        "POST /api/timesheets/:id/submit",
        "POST /api/timesheets/:id/approve",
        "POST /api/timesheets/import-allocations",
        "GET/POST /api/time-off",
      ],
    },
    {
      id: "M5", name: "Finance",
      colour: "#DC2626",
      icon: "dollar-sign",
      purpose: "Manage rate cards, raise invoices, and capture revenue against milestones — without becoming a GL.",
      pages: [
        { route: "/finance",                  name: "Finance Hub",       description: "KPI tiles: revenue, AR, margin, leakage." },
        { route: "/finance?tab=ratecards",    name: "Rate Cards",        description: "Bill rate / cost rate per role per project." },
        { route: "/finance?tab=invoices",     name: "Invoices",          description: "Draft, sent, paid, overdue. Line items per milestone." },
        { route: "/finance?tab=schedules",    name: "Billing Schedules", description: "Recurring or milestone-based billing rules." },
        { route: "/finance?tab=revenue",      name: "Revenue Entries",   description: "Recognised revenue per period, per project." },
      ],
      keyFeatures: [
        "Auto-draft invoice when a milestone task is marked Done",
        "Rate cards inherited from project template, override-able",
        "Revenue entries decoupled from invoice timing (recognition vs billing)",
        "NetSuite export hand-off (CSV / API)",
      ],
      apis: [
        "GET/POST/PATCH /api/invoices",
        "GET/POST /api/invoice-line-items",
        "GET/POST /api/rate-cards",
        "GET/POST /api/billing-schedules",
        "GET/POST /api/revenue-entries",
      ],
    },
    {
      id: "M6", name: "Reports & Analytics",
      colour: "#0891B2",
      icon: "bar-chart",
      purpose: "Operational and financial reports for PMs, Finance, and Leadership.",
      pages: [
        { route: "/reports", name: "Reports Hub", description: "Catalogue of 10+ pre-built reports, exportable." },
      ],
      keyFeatures: [
        "Capacity Planning (supply vs demand, 52-week horizon)",
        "Utilisation by Consultant / Department / Region",
        "Project Health snapshot",
        "Revenue Recognition by month / project",
        "Pipeline Forecast (weighted)",
        "Budget vs Actual",
        "Time-off Liability",
        "Skills Coverage gaps",
        "CSAT trend",
        "Export: CSV, XLSX, PDF",
      ],
      apis: [
        "GET /api/reports/capacity-planning",
        "GET /api/reports/utilisation",
        "GET /api/reports/project-health",
        "GET /api/reports/revenue",
      ],
    },
    {
      id: "M7", name: "Admin & Governance",
      colour: "#475569",
      icon: "settings",
      purpose: "User and role management, system settings, templates, audit log.",
      pages: [
        { route: "/admin",                          name: "Admin Hub",            description: "Tabs for each admin function." },
        { route: "/admin?tab=users",                name: "Users & Roles",        description: "Provision users, assign roles, deactivate." },
        { route: "/admin?tab=templates",            name: "Project Templates",    description: "Create / edit master project templates." },
        { route: "/admin?tab=document-templates",   name: "Document Templates",   description: "SOP / handover / status report templates." },
        { route: "/admin?tab=settings",             name: "System Settings",      description: "Org name, regions, branding, holidays." },
        { route: "/admin?tab=audit",                name: "Audit Log",            description: "Every write action with user, time, before/after." },
      ],
      keyFeatures: [
        "4-role canonical RBAC (account_admin / super_user / collaborator / customer)",
        "Server-side enforcement (requireAdmin / requirePM middleware)",
        "Audit log on every write — immutable, queryable",
        "Custom fields per entity",
        "Saved views (per user, per page)",
      ],
      apis: [
        "GET/POST/PATCH /api/users",
        "GET/POST/PATCH /api/admin-settings",
        "GET /api/audit-log",
        "GET/POST /api/custom-fields",
        "GET/POST /api/saved-views",
      ],
    },
  ],

  userStories: [
    // CRM
    { id: "US-CRM-01", module: "CRM", role: "Super User",     story: "As a PM, I want to convert a Won opportunity into a Project in one click so the delivery team can start without rekeying data.",     priority: "Must", criteria: "Project is created with name, account, value, dates pre-filled. Soft allocation from opportunity is upgraded to hard." },
    { id: "US-CRM-02", module: "CRM", role: "Super User",     story: "As a PM, I want a soft allocation auto-created when an opportunity hits 70% probability so I can reserve consultants before the deal closes.", priority: "Must", criteria: "Allocation is created with type=soft, sourceOpportunityId set, dates from opportunity." },
    { id: "US-CRM-03", module: "CRM", role: "Account Admin",  story: "As an Admin, I want to view all accounts with pipeline value rolled up so I can prioritise relationship investment.",                       priority: "Should", criteria: "Account list shows count + sum of open opportunities per account." },

    // Projects
    { id: "US-PRJ-01", module: "Projects", role: "Super User",     story: "As a PM, I want to clone a project from a template so I don't manually re-create phase / task structures.",                priority: "Must", criteria: "POST /api/projects/from-template clones phases, tasks, baseline allocations." },
    { id: "US-PRJ-02", module: "Projects", role: "Super User",     story: "As a PM, I want to bulk-update task status / assignee / priority so I can rebalance a sprint quickly.",                    priority: "Should", criteria: "Bulk action bar appears when ≥1 row selected; PATCH /api/tasks/bulk persists; success toast shows count." },
    { id: "US-PRJ-03", module: "Projects", role: "Super User",     story: "As a PM, I want a baseline of the project plan so I can track variance over time.",                                       priority: "Must", criteria: "Snapshot stored on POST /api/projects/:id/baselines; variance % visible in tasks view." },
    { id: "US-PRJ-04", module: "Projects", role: "Collaborator",   story: "As a consultant, I want to see my assigned tasks across all projects in one view so I know what to work on.",             priority: "Must", criteria: "Dashboard 'My Tasks' card lists open tasks where assigneeId = current user." },
    { id: "US-PRJ-05", module: "Projects", role: "Customer",       story: "As a client stakeholder, I want a read-only status page for my project so I can self-serve health and milestones.",        priority: "Could", criteria: "Read-only portal route /portal/:projectId; no edit affordances visible." },

    // Resources
    { id: "US-RES-01", module: "Resources", role: "Super User",   story: "As a PM, I want AI suggestions for who to allocate so I match skills and respect capacity.",                                priority: "Must", criteria: "POST /api/resources/suggest returns ≥3 candidates with compositeScore, reasons, skill match details." },
    { id: "US-RES-02", module: "Resources", role: "Super User",   story: "As a PM, I want to see capacity vs demand for the next 12 weeks so I can spot bench / overload.",                           priority: "Must", criteria: "Capacity Planning chart renders weekly bars per person; over-allocation highlighted red." },
    { id: "US-RES-03", module: "Resources", role: "Super User",   story: "As a PM, I want to raise a Resource Request for a missing skill so a Resource Manager can fulfil it.",                       priority: "Must", criteria: "Request types: New / Replace / Extend / Reduce / Change Role / Remove; status workflow Open → Fulfilled / Rejected." },
    { id: "US-RES-04", module: "Resources", role: "Collaborator", story: "As a consultant, I want to see my upcoming allocations 4 weeks ahead so I can plan.",                                       priority: "Should", criteria: "Personal calendar view shows confirmed + soft allocations." },

    // Time
    { id: "US-TME-01", module: "Time", role: "Collaborator", story: "As a consultant, I want a weekly timesheet grid so I can log time efficiently.",                                                  priority: "Must", criteria: "Rows = active project allocations; columns = Mon–Sun; total row at bottom." },
    { id: "US-TME-02", module: "Time", role: "Collaborator", story: "As a consultant, I want to import my allocations into the timesheet so I don't re-add projects each week.",                       priority: "Must", criteria: "POST /api/timesheets/import-allocations adds one zero-hours row per overlapping project; dedupes." },
    { id: "US-TME-03", module: "Time", role: "Collaborator", story: "As a consultant, I want AI to suggest time entries based on my activity so I don't forget.",                                       priority: "Could", criteria: "AI Time Assistant returns suggested rows; user can accept/dismiss." },
    { id: "US-TME-04", module: "Time", role: "Super User",   story: "As a PM, I want to approve / reject timesheets with a comment so I can correct mistakes.",                                         priority: "Must", criteria: "POST /api/timesheets/:id/approve locks entries; POST .../reject reopens with required comment." },
    { id: "US-TME-05", module: "Time", role: "Collaborator", story: "As a consultant, I want to request time off and see my remaining balance so I can plan leave.",                                    priority: "Must", criteria: "Time-off form validates against balance; status: Requested / Approved / Rejected." },

    // Finance
    { id: "US-FIN-01", module: "Finance", role: "Super User", story: "As a PM, I want a draft invoice auto-created when I mark a milestone task Done so I don't forget to bill.",                       priority: "Must", criteria: "On task.status = Done AND task.isMilestone, POST /api/invoices created with status=Draft, line items from milestone value." },
    { id: "US-FIN-02", module: "Finance", role: "Account Admin", story: "As an Admin, I want to maintain rate cards (bill / cost) per role per project so invoicing and margin are accurate.",          priority: "Must", criteria: "Rate card editor; effective date ranges; new project inherits org default." },
    { id: "US-FIN-03", module: "Finance", role: "Super User", story: "As a Finance Lead, I want to record revenue separately from billing so recognition follows policy not invoice timing.",            priority: "Must", criteria: "Revenue entries entity with project, period, amount, recognition method." },

    // Reports
    { id: "US-RPT-01", module: "Reports", role: "Super User",     story: "As a leader, I want a Utilisation report by consultant so I can identify bench and overload.",                                priority: "Must", criteria: "Report shows billable / total / utilisation % per consultant per month; CSV export." },
    { id: "US-RPT-02", module: "Reports", role: "Super User",     story: "As a leader, I want a Project Health snapshot across the portfolio so I can intervene early.",                                priority: "Must", criteria: "Single page: count by health, top 5 At Risk, recent flag changes." },

    // Admin / Onboarding
    { id: "US-ADM-01", module: "Admin", role: "Account Admin",   story: "As an Admin, I want a guided onboarding checklist on the dashboard so I can stand up the org without docs.",                   priority: "Should", criteria: "4 step cards visible to admins only: add users / create project / allocate / submit timesheet; auto-dismiss when done." },
    { id: "US-ADM-02", module: "Admin", role: "Account Admin",   story: "As an Admin, I want every write action recorded in an immutable audit log so I can investigate any change.",                    priority: "Must", criteria: "logAudit() called on every POST/PATCH/DELETE; entries show actor, time, entity, before, after." },
    { id: "US-ADM-03", module: "Admin", role: "Account Admin",   story: "As an Admin, I want to manage Document Templates (SOPs, handover notes) so teams reuse approved content.",                     priority: "Should", criteria: "CRUD on document_templates table; 'From Template' button on Project Documents page applies template content." },
  ],

  workflows: [
    {
      id: "WF1",
      name: "Sales → Delivery (Opportunity to Project)",
      description: "How a qualified opportunity becomes a delivered project, with resourcing reserved early.",
      steps: [
        { actor: "Sales", action: "Create Opportunity",       detail: "Account, value, expected close, stage" },
        { actor: "Sales", action: "Update probability",       detail: "When ≥ 70%, system auto-creates a Soft Allocation" },
        { actor: "PM",    action: "Review soft allocation",   detail: "Confirm proposed consultants on Resources page" },
        { actor: "Sales", action: "Mark opportunity Won",     detail: "Triggers conversion eligibility" },
        { actor: "PM",    action: "Convert → Project",        detail: "POST /api/opportunities/:id/convert with template" },
        { actor: "System",action: "Hard-allocate resources",  detail: "Soft allocations promoted to Hard" },
        { actor: "PM",    action: "Kick off delivery",        detail: "Phase plan, task assignment, baseline snapshot" },
      ],
    },
    {
      id: "WF2",
      name: "Time → Approval → Invoice",
      description: "From a logged hour through approval into a draft invoice.",
      steps: [
        { actor: "Consultant", action: "Open weekly timesheet", detail: "Import allocations to pre-fill rows" },
        { actor: "Consultant", action: "Log hours daily",       detail: "Optional: AI Time Assistant suggests entries" },
        { actor: "Consultant", action: "Submit for approval",   detail: "POST /api/timesheets/:id/submit" },
        { actor: "PM",         action: "Review queue",          detail: "/time?tab=approvals shows pending" },
        { actor: "PM",         action: "Approve or Reject",     detail: "Reject requires a comment" },
        { actor: "System",     action: "Lock approved entries", detail: "Audit-locked; no further edits" },
        { actor: "System",     action: "Roll into invoice",     detail: "Time-and-materials invoices include approved hours × bill rate" },
      ],
    },
    {
      id: "WF3",
      name: "Resource Request → Allocation",
      description: "How unmet demand on a project is fulfilled.",
      steps: [
        { actor: "PM",               action: "Identify gap",       detail: "Capacity Planning shows red over-allocation or empty role" },
        { actor: "PM",               action: "Raise request",      detail: "Type: New / Replace / Extend / Reduce / Change Role / Remove" },
        { actor: "Resource Manager", action: "Triage request",     detail: "Open queue grouped by project / urgency" },
        { actor: "Resource Manager", action: "Get AI suggestions", detail: "POST /api/resources/suggest — top 3 by composite score" },
        { actor: "Resource Manager", action: "Confirm allocation", detail: "Hard allocation created; consultant notified" },
        { actor: "PM",               action: "Acknowledge",        detail: "Request status → Fulfilled" },
      ],
    },
    {
      id: "WF4",
      name: "Milestone → Auto-Draft Invoice",
      description: "Milestone completion creates a billable event.",
      steps: [
        { actor: "Consultant",  action: "Complete milestone task", detail: "Mark task with isMilestone = true as Done" },
        { actor: "System",      action: "Detect milestone",        detail: "Trigger fires on status change" },
        { actor: "System",      action: "Create draft invoice",    detail: "POST /api/invoices with line items from milestone value" },
        { actor: "Finance",     action: "Review draft",            detail: "Edit line items, attach PO if needed" },
        { actor: "Finance",     action: "Send invoice",            detail: "Status: Draft → Sent; due date set" },
        { actor: "Finance",     action: "Mark Paid",               detail: "On payment receipt; Revenue Entry recognised per policy" },
      ],
    },
  ],

  acceptance: [
    "All 7 modules accessible from the sidebar with role-appropriate visibility",
    "Server-side RBAC enforced on every write endpoint (verified by automated tests)",
    "Audit log entry created on every POST/PATCH/DELETE",
    "Onboarding checklist auto-dismisses when all 4 conditions are met",
    "Capacity Planning report renders within 2 seconds for 52-week × 50-person dataset",
    "Timesheet import and submit work end-to-end without page refresh",
    "Opportunity conversion creates project, allocations, and audit entry atomically",
    "Auto-draft invoice fires within 5 seconds of milestone completion",
    "Document Templates 'From Template' button populates fields correctly",
    "All forms have proper validation and error messages",
  ],

  risks: [
    { id: "R1", risk: "Single-tenant scope creep into multi-tenant",                  prob: "Medium", impact: "High",     mitigation: "Architecture review gate on any tenant-scoping PR; product steering reaffirms single-tenant." },
    { id: "R2", risk: "Auto-invoice misfires on accidentally-completed milestones",   prob: "Medium", impact: "Medium",   mitigation: "Drafts are always editable; PMs receive notification before invoice is sent." },
    { id: "R3", risk: "AI resource suggestions perceived as biased / opaque",         prob: "Low",    impact: "Medium",   mitigation: "Always show 'reasons' array; allow PMs to override; log overrides for analysis." },
    { id: "R4", risk: "Audit log volume degrades query performance",                  prob: "Medium", impact: "Medium",   mitigation: "Partition by month; archive > 18 months to cold storage." },
    { id: "R5", risk: "Timesheet rejection comments not actioned",                    prob: "Low",    impact: "Low",      mitigation: "Notification to consultant on reject; SLA dashboard for unresolved rejections." },
  ],
};
