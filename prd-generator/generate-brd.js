#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const HTMLtoDOCX = require("html-to-docx");

const data = require("./src/data");
const svg = require("./src/svg");

const OUT_DIR = path.join(__dirname, "output");
const DOCX_OUT = path.join(OUT_DIR, "brd.docx");
const HTML_OUT = path.join(OUT_DIR, "brd.html");
const TMP_DIR = path.join(OUT_DIR, "_brd_tmp");

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// ── Render an SVG string to PNG and return base64 data URI ───────────────────
async function svgToDataUri(svgStr, label) {
  const buf = Buffer.from(svgStr, "utf8");
  const png = await sharp(buf, { density: 144 })
    .resize({ width: 1400, withoutEnlargement: true })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(TMP_DIR, `${label}.png`), png);
  return `data:image/png;base64,${png.toString("base64")}`;
}

// ── Build flow diagrams (vertical swimlane-style flowcharts) ─────────────────
function buildFlowDiagram(title, steps, colorScheme) {
  const W = 1200;
  const STEP_W = 320;
  const STEP_H = 88;
  const GAP_X = 40;
  const GAP_Y = 30;
  const PER_ROW = 3;
  const rows = Math.ceil(steps.length / PER_ROW);
  const H = 80 + rows * (STEP_H + GAP_Y);
  const startX = (W - (PER_ROW * STEP_W + (PER_ROW - 1) * GAP_X)) / 2;

  const actorColors = {
    Sales: "#7c3aed", PM: "#0ea5e9", Consultant: "#10b981",
    System: "#64748b", Finance: "#ef4444", "Resource Manager": "#f59e0b",
  };

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Inter, Arial, sans-serif">`;
  s += `<rect width="${W}" height="${H}" fill="#ffffff"/>`;
  s += `<rect x="0" y="0" width="${W}" height="50" fill="${colorScheme}"/>`;
  s += `<text x="${W/2}" y="32" fill="#ffffff" font-size="20" font-weight="700" text-anchor="middle">${escapeXml(title)}</text>`;

  steps.forEach((step, i) => {
    const row = Math.floor(i / PER_ROW);
    const col = i % PER_ROW;
    const x = startX + col * (STEP_W + GAP_X);
    const y = 70 + row * (STEP_H + GAP_Y);
    const fill = actorColors[step.actor] || "#64748b";

    // step box
    s += `<rect x="${x}" y="${y}" width="${STEP_W}" height="${STEP_H}" rx="8" fill="#ffffff" stroke="${fill}" stroke-width="2"/>`;
    // actor pill
    s += `<rect x="${x+10}" y="${y+8}" width="${Math.max(60, step.actor.length*8)}" height="20" rx="10" fill="${fill}"/>`;
    s += `<text x="${x+10+Math.max(60, step.actor.length*8)/2}" y="${y+22}" fill="#ffffff" font-size="11" font-weight="700" text-anchor="middle">${escapeXml(step.actor)}</text>`;
    // step number
    s += `<text x="${x+STEP_W-18}" y="${y+22}" fill="#94a3b8" font-size="14" font-weight="700" text-anchor="end">${i+1}</text>`;
    // action
    s += `<text x="${x+12}" y="${y+50}" fill="#0f172a" font-size="14" font-weight="600">${escapeXml(truncate(step.action, 38))}</text>`;
    // detail
    s += `<text x="${x+12}" y="${y+72}" fill="#475569" font-size="11">${escapeXml(truncate(step.detail, 50))}</text>`;

    // arrow to next step
    if (i < steps.length - 1) {
      const isRowEnd = (col === PER_ROW - 1) || (i === steps.length - 1);
      if (!isRowEnd) {
        const ax = x + STEP_W;
        const ay = y + STEP_H/2;
        s += `<path d="M${ax} ${ay} L${ax+GAP_X} ${ay}" stroke="#94a3b8" stroke-width="2" fill="none" marker-end="url(#arr)"/>`;
      } else {
        const nextRow = row + 1;
        const nextCol = (i + 1) % PER_ROW;
        const nextX = startX + nextCol * (STEP_W + GAP_X);
        const nextY = 70 + nextRow * (STEP_H + GAP_Y);
        // down then back to start
        s += `<path d="M${x+STEP_W/2} ${y+STEP_H} L${x+STEP_W/2} ${y+STEP_H+10} L${nextX+STEP_W/2} ${y+STEP_H+10} L${nextX+STEP_W/2} ${nextY}" stroke="#94a3b8" stroke-width="2" fill="none" marker-end="url(#arr)"/>`;
      }
    }
  });

  s += `<defs><marker id="arr" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0, 10 3, 0 6" fill="#94a3b8"/></marker></defs>`;
  s += `</svg>`;
  return s;
}

// ── Build a screen-flow / sitemap diagram ────────────────────────────────────
function buildScreenFlow() {
  const W = 1400, H = 800;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Inter, Arial, sans-serif">`;
  s += `<rect width="${W}" height="${H}" fill="#f8fafc"/>`;
  s += `<rect x="0" y="0" width="${W}" height="50" fill="#0f172a"/>`;
  s += `<text x="${W/2}" y="32" fill="#ffffff" font-size="20" font-weight="700" text-anchor="middle">Screen Flow — User Journey Through BusinessNow PSA</text>`;

  // Login at top
  drawNode(s = addNode(s, 600, 80, 200, 50, "/login", "Login", "#94a3b8"));
  // Dashboard
  s = addArrow(s, 700, 130, 700, 170);
  s = addNode(s, 600, 170, 200, 50, "/", "Dashboard", "#0ea5e9");

  // Branch into 7 modules
  const modules = [
    { x: 60,   label: "CRM",          route: "/accounts", color: "#7c3aed" },
    { x: 250,  label: "Projects",     route: "/projects", color: "#10b981" },
    { x: 440,  label: "Resources",    route: "/resources", color: "#f59e0b" },
    { x: 630,  label: "Time",         route: "/time", color: "#eab308" },
    { x: 820,  label: "Finance",      route: "/finance", color: "#ef4444" },
    { x: 1010, label: "Reports",      route: "/reports", color: "#a78bfa" },
    { x: 1200, label: "Admin",        route: "/admin", color: "#64748b" },
  ];
  modules.forEach(m => {
    s = addArrow(s, 700, 220, m.x + 70, 320);
    s = addNode(s, m.x, 320, 140, 50, m.route, m.label, m.color);
  });

  // Sub-pages for each module
  const subPages = {
    CRM: ["Accounts", "Prospects", "Opportunities"],
    Projects: ["List", "Detail", "Tasks", "Team", "Financials", "Gantt"],
    Resources: ["Capacity", "Heatmap", "Requests", "Skills"],
    Time: ["Timesheet", "Approvals", "Time Off"],
    Finance: ["Invoices", "Schedules", "Revenue", "Contracts"],
    Reports: ["Performance", "Utilization", "Health", "Revenue"],
    Admin: ["Users", "Templates", "Rate Cards", "Audit Log"],
  };
  modules.forEach(m => {
    const pages = subPages[m.label] || [];
    s = addArrow(s, m.x + 70, 370, m.x + 70, 410);
    pages.forEach((p, j) => {
      const py = 410 + j * 32;
      s += `<rect x="${m.x+10}" y="${py}" width="120" height="26" rx="4" fill="#ffffff" stroke="${m.color}" stroke-width="1"/>`;
      s += `<text x="${m.x+70}" y="${py+17}" font-size="11" fill="#0f172a" text-anchor="middle">${escapeXml(p)}</text>`;
    });
  });

  // Cross-module flow indicators
  s += `<rect x="40" y="720" width="${W-80}" height="60" rx="6" fill="#fef3c7" stroke="#f59e0b" stroke-width="1"/>`;
  s += `<text x="60" y="745" fill="#92400e" font-size="13" font-weight="700">Cross-module flows:</text>`;
  s += `<text x="60" y="765" fill="#92400e" font-size="12">• CRM Opportunity (≥70%) → Soft Allocation in Resources  • Won Opp → 1-click Project  • Time Approval → Invoice Line  • Milestone Done → Auto-Draft Invoice</text>`;

  s += `</svg>`;
  return s;

  function addNode(svgStr, x, y, w, h, route, label, color) {
    return svgStr +
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#ffffff" stroke="${color}" stroke-width="2"/>` +
      `<text x="${x+w/2}" y="${y+22}" fill="${color}" font-size="11" font-weight="600" text-anchor="middle">${escapeXml(route)}</text>` +
      `<text x="${x+w/2}" y="${y+40}" fill="#0f172a" font-size="14" font-weight="700" text-anchor="middle">${escapeXml(label)}</text>`;
  }
  function addArrow(svgStr, x1, y1, x2, y2) {
    return svgStr + `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="#94a3b8" stroke-width="1.5" fill="none"/>`;
  }
  function drawNode(s) { return s; }
}

function escapeXml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function truncate(s, n) { s = String(s); return s.length > n ? s.slice(0, n-1) + "…" : s; }
function escapeHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ── Compose full HTML ────────────────────────────────────────────────────────
async function buildHtml() {
  // Render diagrams to PNG data-URIs
  const screenFlowSvg = buildScreenFlow();
  const screenFlowImg = await svgToDataUri(screenFlowSvg, "screen-flow");

  const wfImgs = [];
  const wfColors = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444"];
  for (let i = 0; i < data.workflows.length; i++) {
    const wf = data.workflows[i];
    const wfSvg = buildFlowDiagram(wf.name, wf.steps, wfColors[i % wfColors.length]);
    wfImgs.push(await svgToDataUri(wfSvg, `wf-${i+1}`));
  }

  // Roles & Permissions matrix
  const roles = ["Account Admin", "Super User", "Collaborator", "Customer"];
  const perms = [
    ["CRM — Manage Accounts/Opportunities",        ["✓","✓","View own","—"]],
    ["CRM — Convert Opportunity to Project",       ["✓","✓","—","—"]],
    ["Projects — Create & Edit",                   ["✓","✓","—","—"]],
    ["Projects — View Assigned",                   ["✓","✓","✓","Read-only own"]],
    ["Tasks — Create / Assign / Edit",             ["✓","✓","Edit own","—"]],
    ["Resources — Capacity & Heatmap",             ["✓","✓","Self only","—"]],
    ["Resources — Allocate / Request",             ["✓","✓","—","—"]],
    ["Time — Submit own Timesheet",                ["✓","✓","✓","—"]],
    ["Time — Approve / Reject",                    ["✓","✓ (PM)","—","—"]],
    ["Time — Time-off request & approve",          ["✓","✓ (mgr)","Self submit","—"]],
    ["Finance — View Invoices",                    ["✓","✓","—","Own project only"]],
    ["Finance — Edit Rate Cards",                  ["✓","—","—","—"]],
    ["Finance — Send Invoice / Mark Paid",         ["✓","✓ (Finance)","—","—"]],
    ["Reports — View Standard",                    ["✓","✓","Self KPIs","—"]],
    ["Reports — Export CSV / XLSX",                ["✓","✓","—","—"]],
    ["Admin — User & Role Management",             ["✓","—","—","—"]],
    ["Admin — Audit Log",                          ["✓","—","—","—"]],
    ["Admin — Templates / Custom Fields / Settings",["✓","Limited","—","—"]],
  ];

  const meta = {
    title: "Business Requirements Document",
    product: "BusinessNow PSA — Professional Services Automation Platform",
    version: "1.0",
    status: "Draft for Review",
    date: "May 2026",
  };

  const css = `
    body { font-family: 'Calibri', 'Helvetica', Arial, sans-serif; color: #1e293b; line-height: 1.45; font-size: 11pt; }
    h1 { color: #0f172a; font-size: 22pt; border-bottom: 3px solid #0ea5e9; padding-bottom: 6pt; margin-top: 24pt; }
    h2 { color: #0ea5e9; font-size: 16pt; margin-top: 20pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 4pt; }
    h3 { color: #0f172a; font-size: 13pt; margin-top: 16pt; }
    h4 { color: #475569; font-size: 11.5pt; margin-top: 12pt; }
    table { border-collapse: collapse; width: 100%; margin: 8pt 0 14pt; font-size: 10pt; }
    th { background: #e0f2fe; color: #0c4a6e; font-weight: 700; text-align: left; padding: 6pt 8pt; border: 1px solid #94a3b8; }
    td { padding: 5pt 8pt; border: 1px solid #cbd5e1; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    .meta-table td { border: 1px solid #cbd5e1; }
    ul, ol { margin: 4pt 0 10pt 18pt; }
    li { margin-bottom: 3pt; }
    .figure { margin: 10pt 0 16pt; text-align: center; }
    .figure img { max-width: 100%; }
    .figure .caption { font-style: italic; font-size: 9.5pt; color: #475569; margin-top: 4pt; }
    .pill { display: inline-block; padding: 1pt 6pt; border-radius: 8pt; font-size: 8.5pt; font-weight: 600; color: #ffffff; }
    .p-must { background: #ef4444; }
    .p-should { background: #f59e0b; }
    .p-could { background: #0ea5e9; }
    .check { color: #16a34a; font-weight: 700; text-align: center; }
    .dash  { color: #94a3b8; text-align: center; }
    .cover { text-align: center; padding: 80pt 0; }
    .cover h1 { border: none; font-size: 32pt; }
    .cover .sub { font-size: 16pt; color: #475569; margin-top: 8pt; }
    .cover .badge { display: inline-block; margin-top: 24pt; padding: 6pt 16pt; background: #fef3c7; color: #92400e; border-radius: 12pt; font-weight: 700; }
  `;

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${meta.title}</title><style>${css}</style></head><body>`;

  // ── Cover ──────────────────────────────────────────────────────────────────
  html += `<div class="cover">
    <h1>${meta.title}</h1>
    <div class="sub">${meta.product}</div>
    <div class="sub">Version ${meta.version} &middot; ${meta.status} &middot; ${meta.date}</div>
    <div class="badge">CONFIDENTIAL — INTERNAL USE</div>
  </div>`;

  // ── Document Control ───────────────────────────────────────────────────────
  html += `<h2>Document Control</h2>
  <table class="meta-table">
    <tr><th>Field</th><th>Value</th></tr>
    <tr><td>Document Title</td><td>${meta.product} — Business Requirements Document</td></tr>
    <tr><td>Version</td><td>${meta.version}</td></tr>
    <tr><td>Status</td><td>${meta.status}</td></tr>
    <tr><td>Date</td><td>${meta.date}</td></tr>
    <tr><td>Author</td><td>Business Analyst, BusinessNow Product Team</td></tr>
    <tr><td>Approver</td><td>Head of Professional Services, CFO, CIO</td></tr>
    <tr><td>Classification</td><td>Internal — Confidential</td></tr>
  </table>`;

  // ── Section 1: Executive Summary ───────────────────────────────────────────
  html += `<h2>1. Executive Summary</h2>
  <p>BusinessNow PSA is an end-to-end Professional Services Automation platform designed to run a consulting / professional services business from sales through to cash. Today our delivery teams operate across disconnected tools — CRM in one system, project plans in spreadsheets, timesheets in a separate app, invoicing in the finance ERP — leading to revenue leakage, late billing, poor utilisation visibility, and reactive resource decisions.</p>
  <p>BusinessNow PSA consolidates the full lifecycle into a single platform: opportunities convert into projects with one click, resources are auto-reserved when deals reach 70% probability, time is logged against real allocations, and invoices are auto-drafted the moment a milestone completes. Leadership gets real-time portfolio health and capacity insight without chasing spreadsheets.</p>
  <h4>High-Level Goals</h4>
  <ul>
    <li>Eliminate revenue leakage between milestone completion and invoice issue</li>
    <li>Increase billable utilisation by 5–8 percentage points through better resource visibility</li>
    <li>Compress the sales-to-delivery handover from days to minutes</li>
    <li>Provide a single source of truth for project, resource, and financial data</li>
  </ul>`;

  // ── Section 2: Business Objectives ─────────────────────────────────────────
  html += `<h2>2. Business Objectives</h2>
  <table>
    <tr><th>#</th><th>Objective</th><th>Target</th><th>Baseline</th><th>Window</th></tr>
    <tr><td>O1</td><td>Reduce time from milestone complete → invoice issued</td><td>≤ 2 business days</td><td>9 days</td><td>Quarterly</td></tr>
    <tr><td>O2</td><td>Increase consultant billable utilisation</td><td>75%</td><td>67%</td><td>Monthly</td></tr>
    <tr><td>O3</td><td>Reduce unbilled revenue (WIP) ageing > 30 days</td><td>≤ 5% of WIP</td><td>18%</td><td>Monthly</td></tr>
    <tr><td>O4</td><td>Cut weekly timesheet entry time per consultant</td><td>≤ 8 minutes</td><td>~25 minutes</td><td>Quarterly</td></tr>
    <tr><td>O5</td><td>Improve revenue forecast accuracy (90 days)</td><td>± 5% variance</td><td>± 18% variance</td><td>Quarterly</td></tr>
    <tr><td>O6</td><td>Reduce avg resource staffing turn-around</td><td>≤ 24 hours</td><td>4–5 days</td><td>Monthly</td></tr>
    <tr><td>O7</td><td>Achieve 95% on-time project delivery (vs baseline)</td><td>≥ 95%</td><td>78%</td><td>Quarterly</td></tr>
  </table>`;

  // ── Section 3: Scope ───────────────────────────────────────────────────────
  html += `<h2>3. Scope</h2>
  <h3>3.1 In-Scope</h3>
  <ul>
    <li><b>CRM</b> — Account, prospect, and opportunity management; pipeline forecasting; one-click opportunity → project</li>
    <li><b>Project Delivery</b> — Project planning, baselines, change orders, templates, project health</li>
    <li><b>Resource Management</b> — Capacity planning (12–52 weeks), AI-assisted staffing, request workflows, skills matrix</li>
    <li><b>Time &amp; Attendance</b> — Weekly timesheets, AI Time Assistant, approvals, time-off &amp; holidays</li>
    <li><b>Finance</b> — Rate cards, milestone-triggered auto-draft invoicing, billing schedules, revenue recognition, NetSuite GL export</li>
    <li><b>Reports &amp; Analytics</b> — 12+ pre-built reports; CSV / XLSX / PDF export</li>
    <li><b>Administration</b> — RBAC (4 roles), audit log, custom fields, project &amp; document templates, system config</li>
    <li><b>Integrations</b> — NetSuite (GL), Microsoft 365 / Google Calendar (AI Time Assistant), SAML/OIDC SSO</li>
  </ul>
  <h3>3.2 Out-of-Scope (Phase 1)</h3>
  <ul>
    <li>Customer-facing project portal beyond view-only access</li>
    <li>Mobile native apps (responsive web only)</li>
    <li>Expense management &amp; reimbursement</li>
    <li>Procurement / vendor invoicing</li>
    <li>Recruitment / applicant tracking</li>
    <li>Payroll integration</li>
    <li>Multi-currency consolidation reporting (single reporting currency)</li>
    <li>Fixed-asset tracking</li>
    <li>HR core (performance management, learning, advanced leave types)</li>
  </ul>`;

  // ── Section 4: Stakeholders ────────────────────────────────────────────────
  html += `<h2>4. Stakeholders</h2>
  <table>
    <tr><th>Stakeholder</th><th>Role</th><th>Key Responsibilities</th></tr>
    <tr><td>Executive Sponsor (CEO/COO)</td><td>Decision authority, budget owner</td><td>Approves scope, funding, go-live decision</td></tr>
    <tr><td>Head of Professional Services</td><td>Business owner</td><td>Defines delivery process, owns adoption</td></tr>
    <tr><td>CFO / Finance Controller</td><td>Finance owner</td><td>Owns billing, revenue recognition, GL integration</td></tr>
    <tr><td>Resource / Talent Manager</td><td>Operations owner</td><td>Owns staffing process, capacity planning</td></tr>
    <tr><td>Project Managers (PMs)</td><td>Primary user</td><td>Plan, staff, track, and bill projects</td></tr>
    <tr><td>Consultants / Delivery Team</td><td>Primary user</td><td>Log time, view allocations, raise time-off</td></tr>
    <tr><td>Sales Leadership</td><td>Pipeline owner</td><td>Owns CRM data quality, conversion flow</td></tr>
    <tr><td>IT / Security</td><td>Technical owner</td><td>Owns SSO, integrations, security review</td></tr>
    <tr><td>Customer Account Owners</td><td>External stakeholder</td><td>View project status via customer portal</td></tr>
    <tr><td>Internal Audit</td><td>Compliance</td><td>Reviews audit log, access controls, SoD</td></tr>
  </table>`;

  // ── Section 5: Functional Requirements ─────────────────────────────────────
  html += `<h2>5. Functional Requirements</h2>`;
  const frModules = [
    { name: "5.1 CRM", items: [
      "FR-CRM-01: Capture and maintain accounts with hierarchy (parent/child)",
      "FR-CRM-02: Track prospects with source, stage, owner, value",
      "FR-CRM-03: Manage opportunities with weighted pipeline, stage probability, expected close",
      "FR-CRM-04: Auto-create soft resource reservations when opportunity ≥ 70% probability",
      "FR-CRM-05: One-click 'Convert to Project' — copies team, dates, value, contacts",
      "FR-CRM-06: Roll-up pipeline value by account, owner, region, service line",
    ]},
    { name: "5.2 Project Delivery", items: [
      "FR-PRJ-01: Create projects from templates or from scratch",
      "FR-PRJ-02: Plan with phases, tasks, dependencies, milestones",
      "FR-PRJ-03: Snapshot a baseline plan and track variance vs current",
      "FR-PRJ-04: Compute project health (On Track / At Risk / Off Track) using rules on schedule, budget, CSAT",
      "FR-PRJ-05: Raise, route, approve change orders (scope, value, dates) with audit trail",
      "FR-PRJ-06: Bulk-update task status, owner, dates, priority",
      "FR-PRJ-07: Attach documents and forms to projects, with version history",
      "FR-PRJ-08: Capture project status updates (weekly RAG report) visible to customer portal",
    ]},
    { name: "5.3 Resource Management", items: [
      "FR-RES-01: Show capacity vs demand on a heatmap, 12–52 weeks ahead",
      "FR-RES-02: Distinguish hard (committed) and soft (probable) allocations",
      "FR-RES-03: Maintain a skills matrix with proficiency level and last-used date",
      "FR-RES-04: Suggest top-3 candidates for any open role, with a clear 'why' for each",
      "FR-RES-05: Support resource request types: New, Replace, Extend, Reduce, Change Role, Remove",
      "FR-RES-06: Factor approved time-off and public holidays into capacity automatically",
    ]},
    { name: "5.4 Time & Attendance", items: [
      "FR-TIM-01: Render a weekly grid pre-filled from active allocations",
      "FR-TIM-02: Provide an AI Time Assistant proposing entries from calendar &amp; activity",
      "FR-TIM-03: Allow submission for PM approval; comments required on rejection",
      "FR-TIM-04: Lock approved entries from retroactive edits (admin override with audit)",
      "FR-TIM-05: Capture time-off requests against PTO balance and approval chain",
      "FR-TIM-06: Enforce per-region time policies (max hours/day, mandatory comments, billable rules)",
    ]},
    { name: "5.5 Finance", items: [
      "FR-FIN-01: Maintain rate cards (bill / cost) per role per project, with effective dates",
      "FR-FIN-02: Auto-draft an invoice when a milestone is marked complete",
      "FR-FIN-03: Support recurring (monthly/quarterly) and milestone-based billing schedules",
      "FR-FIN-04: Recognise revenue separately from invoicing (percent-complete, milestone, as-billed)",
      "FR-FIN-05: Export approved invoices and journals to NetSuite via batch / API",
      "FR-FIN-06: Calculate and display margin (revenue − cost) at project, account, portfolio level",
    ]},
    { name: "5.6 Reports & Analytics", items: [
      "FR-RPT-01: Provide 12+ pre-built reports (Performance, Utilization, Capacity, Health, Revenue, Budget vs Actual, Burn-Down, Timesheet Submissions, CSAT, Interval IQ, Operations)",
      "FR-RPT-02: Allow export to CSV, XLSX, PDF",
      "FR-RPT-03: Allow saved views and scheduled email distribution",
      "FR-RPT-04: Support filtering by date range, region, account, project, role, person",
    ]},
    { name: "5.7 Administration", items: [
      "FR-ADM-01: Enforce 4-role RBAC: Account Admin, Super User, Collaborator, Customer",
      "FR-ADM-02: Capture an audit log of every create/update/delete with actor, timestamp, before/after",
      "FR-ADM-03: Configure custom fields on accounts, projects, tasks",
      "FR-ADM-04: Maintain project and document templates",
      "FR-ADM-05: Configure regions, holiday calendars, branding, tax codes",
    ]},
  ];
  frModules.forEach(m => {
    html += `<h3>${m.name}</h3><ul>${m.items.map(i => `<li>${i}</li>`).join("")}</ul>`;
  });

  // ── Section 6: Non-Functional Requirements ─────────────────────────────────
  html += `<h2>6. Non-Functional Requirements</h2>
  <h3>6.1 Performance</h3>
  <table>
    <tr><th>ID</th><th>Requirement</th><th>Target</th></tr>
    <tr><td>NFR-P-01</td><td>Page load (P95) primary screens</td><td>≤ 2.0 s</td></tr>
    <tr><td>NFR-P-02</td><td>API response (P95) reads</td><td>≤ 400 ms</td></tr>
    <tr><td>NFR-P-03</td><td>API response (P95) writes</td><td>≤ 800 ms</td></tr>
    <tr><td>NFR-P-04</td><td>Concurrent active users supported</td><td>1,500</td></tr>
    <tr><td>NFR-P-05</td><td>Capacity heatmap render (500 ppl × 52 wk)</td><td>≤ 3.0 s</td></tr>
  </table>
  <h3>6.2 Availability &amp; Reliability</h3>
  <ul>
    <li>NFR-A-01: Production uptime ≥ 99.9% measured monthly</li>
    <li>NFR-A-02: RPO ≤ 15 minutes; RTO ≤ 4 hours</li>
    <li>NFR-A-03: Daily backups retained 30 days; weekly backups 12 months</li>
  </ul>
  <h3>6.3 Security</h3>
  <ul>
    <li>NFR-S-01: SSO (SAML 2.0 / OIDC) with MFA enforced</li>
    <li>NFR-S-02: TLS 1.2+ in transit; AES-256 at rest</li>
    <li>NFR-S-03: RBAC enforced server-side, not just UI</li>
    <li>NFR-S-04: Annual pen-test; quarterly vulnerability scans</li>
    <li>NFR-S-05: Secrets in vault; no credentials in code/config</li>
  </ul>
  <h3>6.4 Compliance</h3>
  <ul>
    <li>NFR-C-01: GDPR — right to access, export, erase personal data</li>
    <li>NFR-C-02: SOC 2 Type II controls; annual audit</li>
    <li>NFR-C-03: Data residency — EU customer data hosted in EU region</li>
    <li>NFR-C-04: Audit log retention ≥ 7 years for financial records</li>
  </ul>
  <h3>6.5 Usability &amp; Accessibility</h3>
  <ul>
    <li>NFR-U-01: WCAG 2.1 Level AA on primary user journeys</li>
    <li>NFR-U-02: Responsive desktop / tablet / mobile (≥ 375 px)</li>
    <li>NFR-U-03: Localisation for en-US, en-GB, de-DE, fr-FR at launch</li>
    <li>NFR-U-04: New PM can plan a 5-phase project from template in ≤ 10 minutes</li>
  </ul>`;

  // ── Section 7: Screen Flow (NEW) ───────────────────────────────────────────
  html += `<h2>7. Screen Flow &amp; Site Map</h2>
  <p>The diagram below shows the primary navigation paths through BusinessNow PSA. All authenticated users land on the Dashboard, then branch into one of seven modules. Each module exposes a set of sub-pages or tabs. Cross-module flows (highlighted at the bottom) drive the most important business outcomes.</p>
  <div class="figure"><img src="${screenFlowImg}" alt="Screen flow diagram"/><div class="caption">Figure 7.1 — Primary screen flow and module hierarchy</div></div>
  <h3>7.1 Page Inventory</h3>
  <table>
    <tr><th>Module</th><th>Route</th><th>Sub-pages / Tabs</th></tr>
    <tr><td>Auth</td><td>/login</td><td>Login</td></tr>
    <tr><td>Dashboard</td><td>/</td><td>KPI cards, My Tasks, Onboarding checklist</td></tr>
    <tr><td>CRM</td><td>/accounts · /prospects · /opportunities</td><td>Accounts, Prospects, Opportunities</td></tr>
    <tr><td>Projects</td><td>/projects · /projects/:id</td><td>List + 10 Detail tabs (Tasks, Team, Financials, Changes, CSAT, Documents, Forms, Gantt, Time, Updates)</td></tr>
    <tr><td>Resources</td><td>/resources</td><td>Capacity, Heatmap, Projects Timeline, People Timeline, Requests, Skills Matrix</td></tr>
    <tr><td>Time</td><td>/time</td><td>Timesheet, Approvals, Time Entries, By Project, By User, Time Off</td></tr>
    <tr><td>Finance</td><td>/finance</td><td>Invoices, Billing Schedules, Revenue Recognition, Contracts</td></tr>
    <tr><td>Reports</td><td>/reports</td><td>12 reports (Performance, Utilization Grid, Capacity Planning, CSAT, Interval IQ, Budget vs Actual, Burn-Down, Revenue, Utilization, Project Health, Timesheet Submissions, Operations)</td></tr>
    <tr><td>Admin</td><td>/admin</td><td>17 tabs (Users, Templates, Skills, Job Roles, Tax Codes, Time Categories, Task Statuses, Time Settings, Holidays, Rate Cards, Custom Fields, Activity Defaults, Placeholders, Audit Log, Settings, Archived, Document Templates)</td></tr>
    <tr><td>Command Center</td><td>/command-center</td><td>Portfolio Overview, Over-Allocated Resources, Resource Requests</td></tr>
    <tr><td>Notifications</td><td>/notifications</td><td>Notification Inbox</td></tr>
  </table>`;

  // ── Section 8: Business Process Flows (Diagrams) ───────────────────────────
  html += `<h2>8. Business Process Flows</h2>
  <p>The four flows below cover the most critical end-to-end journeys in the platform. Together they describe how work moves from a sales prospect to recognised revenue without manual handoffs.</p>`;
  data.workflows.forEach((wf, i) => {
    html += `<h3>8.${i+1} ${escapeHtml(wf.name)}</h3>
    <p>${escapeHtml(wf.description)}</p>
    <div class="figure"><img src="${wfImgs[i]}" alt="${escapeHtml(wf.name)}"/><div class="caption">Figure 8.${i+1} — ${escapeHtml(wf.name)}</div></div>
    <table>
      <tr><th>#</th><th>Actor</th><th>Action</th><th>Detail</th></tr>
      ${wf.steps.map((st, j) => `<tr><td>${j+1}</td><td>${escapeHtml(st.actor)}</td><td>${escapeHtml(st.action)}</td><td>${escapeHtml(st.detail)}</td></tr>`).join("")}
    </table>`;
  });

  // ── Section 9: User Stories (NEW) ──────────────────────────────────────────
  html += `<h2>9. User Stories</h2>
  <p>Stories are grouped by module and prioritised using MoSCoW (<span class="pill p-must">Must</span> <span class="pill p-should">Should</span> <span class="pill p-could">Could</span>). All Must stories are in scope for Phase 1.</p>`;
  const storyByModule = {};
  data.userStories.forEach(s => {
    (storyByModule[s.module] = storyByModule[s.module] || []).push(s);
  });
  Object.keys(storyByModule).forEach(mod => {
    html += `<h3>9.${Object.keys(storyByModule).indexOf(mod)+1} ${escapeHtml(mod)}</h3>
    <table>
      <tr><th style="width:90px">ID</th><th style="width:90px">Role</th><th style="width:60px">Priority</th><th>Story</th><th>Acceptance Criteria</th></tr>
      ${storyByModule[mod].map(st => {
        const cls = st.priority === "Must" ? "p-must" : st.priority === "Should" ? "p-should" : "p-could";
        return `<tr><td>${escapeHtml(st.id)}</td><td>${escapeHtml(st.role)}</td><td><span class="pill ${cls}">${escapeHtml(st.priority)}</span></td><td>${escapeHtml(st.story)}</td><td>${escapeHtml(st.criteria)}</td></tr>`;
      }).join("")}
    </table>`;
  });

  // ── Section 10: Roles & Permissions (NEW) ──────────────────────────────────
  html += `<h2>10. Roles &amp; Permissions</h2>
  <h3>10.1 Role Definitions</h3>
  <table>
    <tr><th>Role</th><th>System ID</th><th>Description</th><th>Typical Title</th></tr>
    <tr><td>Account Admin</td><td>account_admin</td><td>Full administrative control over the org. Manages users, roles, settings, rate cards, audit log.</td><td>Operations Director, IT Admin</td></tr>
    <tr><td>Super User</td><td>super_user</td><td>Day-to-day operator. Manages projects, resources, finance approvals, and reports.</td><td>Project Manager, Finance Lead, Resource Manager</td></tr>
    <tr><td>Collaborator</td><td>collaborator</td><td>Delivery team member. Logs time, views own allocations, updates assigned tasks.</td><td>Consultant, Senior Consultant</td></tr>
    <tr><td>Customer</td><td>customer</td><td>External read-only. Views status of own projects.</td><td>Client Stakeholder, Sponsor</td></tr>
  </table>
  <h3>10.2 Permission Matrix</h3>
  <table>
    <tr><th>Capability</th>${roles.map(r => `<th style="text-align:center">${r}</th>`).join("")}</tr>
    ${perms.map(([cap, vals]) => `<tr><td>${cap}</td>${vals.map(v => {
      if (v === "✓") return `<td class="check">✓</td>`;
      if (v === "—") return `<td class="dash">—</td>`;
      return `<td style="text-align:center; font-size:9pt;">${v}</td>`;
    }).join("")}</tr>`).join("")}
  </table>
  <h3>10.3 RBAC Principles</h3>
  <ul>
    <li>Permissions are checked <b>server-side</b> on every write endpoint, not just hidden in the UI.</li>
    <li>Customers are scoped strictly to projects they are explicitly granted access to.</li>
    <li>Account Admin actions on users, roles, rate cards, and audit log are themselves audited.</li>
    <li>Approval permissions (timesheet, time-off) can be delegated per project / per team within Super User.</li>
    <li>Role changes take effect at next login; revocations are immediate.</li>
  </ul>`;

  // ── Section 11: Assumptions & Constraints ──────────────────────────────────
  html += `<h2>11. Assumptions, Constraints &amp; Dependencies</h2>
  <h3>11.1 Assumptions</h3>
  <ul>
    <li>A1: Existing CRM and timesheet data exportable in CSV for migration</li>
    <li>A2: NetSuite remains the system of record for the GL</li>
    <li>A3: Identity provider (Azure AD / Okta) in place for SSO</li>
    <li>A4: Stable network connectivity at all delivery offices and remote</li>
    <li>A5: Business sponsors available for weekly UAT during validation</li>
  </ul>
  <h3>11.2 Constraints</h3>
  <ul>
    <li>C1: Phase 1 launch must complete before fiscal year 2027 start</li>
    <li>C2: Total Phase 1 budget capped at approved business case</li>
    <li>C3: Single reporting currency (USD) at launch</li>
    <li>C4: NetSuite GL integration via 4-hour batch (not real-time)</li>
    <li>C5: Customer portal limited to view-only in Phase 1</li>
  </ul>
  <h3>11.3 Dependencies</h3>
  <ul>
    <li>D1: SSO configuration — IT</li>
    <li>D2: NetSuite API credentials &amp; sandbox — Finance Systems</li>
    <li>D3: Skills taxonomy sign-off — Talent / HR</li>
    <li>D4: Rate-card data sign-off per region — Finance Controller</li>
    <li>D5: Customer-portal terms — Legal Counsel</li>
  </ul>`;

  // ── Section 12: Success Metrics ────────────────────────────────────────────
  html += `<h2>12. Success Metrics (KPIs)</h2>
  <table>
    <tr><th>KPI</th><th>Owner</th><th>Baseline</th><th>Target (12 mo post go-live)</th></tr>
    <tr><td>Days from milestone complete → invoice issued</td><td>CFO</td><td>9</td><td>≤ 2</td></tr>
    <tr><td>Billable utilisation (firm-wide)</td><td>Head of PS</td><td>67%</td><td>75%</td></tr>
    <tr><td>Unbilled WIP > 30 days (% of total WIP)</td><td>CFO</td><td>18%</td><td>≤ 5%</td></tr>
    <tr><td>On-time project delivery (vs baseline)</td><td>Head of PS</td><td>78%</td><td>≥ 95%</td></tr>
    <tr><td>Avg time on weekly timesheets per consultant</td><td>Head of PS</td><td>~25 min</td><td>≤ 8 min</td></tr>
    <tr><td>Timesheet submission compliance (Mon EOD)</td><td>Head of PS</td><td>71%</td><td>≥ 95%</td></tr>
    <tr><td>Revenue forecast accuracy (90 days, ± variance)</td><td>CFO</td><td>± 18%</td><td>± 5%</td></tr>
    <tr><td>Resource staffing turn-around (request → assigned)</td><td>Resource Mgr</td><td>4–5 days</td><td>≤ 24 h</td></tr>
    <tr><td>User adoption (active weekly / licensed)</td><td>Product</td><td>n/a</td><td>≥ 90%</td></tr>
    <tr><td>CSAT (project-end survey)</td><td>Head of PS</td><td>7.8 / 10</td><td>≥ 8.5 / 10</td></tr>
  </table>`;

  // ── Section 13: Risks & Mitigation ─────────────────────────────────────────
  html += `<h2>13. Risks &amp; Mitigation</h2>
  <table>
    <tr><th>ID</th><th>Risk</th><th>Likelihood</th><th>Impact</th><th>Mitigation</th></tr>
    <tr><td>R1</td><td>Low user adoption (resistance to new timesheet flow)</td><td>Medium</td><td>High</td><td>Pre-launch champions, in-app guidance, AI Time Assistant, manager-level adoption dashboards</td></tr>
    <tr><td>R2</td><td>Migration data quality issues (stale CRM, dirty rate cards)</td><td>High</td><td>Medium</td><td>Pre-migration data audit, cleanse-and-validate sprint, dry-run to staging</td></tr>
    <tr><td>R3</td><td>NetSuite GL integration mapping errors</td><td>Medium</td><td>High</td><td>Joint design with Finance Systems, parallel-run for one billing cycle, reconciliation report</td></tr>
    <tr><td>R4</td><td>Scope creep (Phase 2 features pulled in)</td><td>High</td><td>Medium</td><td>Locked Phase 1 backlog, formal change-request process via Steering</td></tr>
    <tr><td>R5</td><td>SSO / identity readiness slips</td><td>Medium</td><td>High</td><td>Early IT engagement; fallback to local auth for pilot only</td></tr>
    <tr><td>R6</td><td>Performance under peak load (month-end billing)</td><td>Medium</td><td>High</td><td>Load test at 2× peak; auto-scaling infra; queue-based invoice generation</td></tr>
    <tr><td>R7</td><td>Data residency / GDPR compliance gap</td><td>Low</td><td>High</td><td>EU region deployment validated; DPIA before go-live</td></tr>
    <tr><td>R8</td><td>Key person dependency (single SME on resource model)</td><td>Medium</td><td>Medium</td><td>Pair-working, documented design decisions, knowledge-transfer</td></tr>
    <tr><td>R9</td><td>Customer portal exposes sensitive data unintentionally</td><td>Low</td><td>High</td><td>Field-level access review; pen-test on portal; default-deny posture</td></tr>
    <tr><td>R10</td><td>Sponsor turnover during programme</td><td>Low</td><td>High</td><td>Quarterly steering, documented decisions, broad sponsor coalition</td></tr>
  </table>`;

  // ── Section 14: Timeline & Milestones ──────────────────────────────────────
  html += `<h2>14. Timeline &amp; Milestones</h2>
  <h3>14.1 High-Level Schedule</h3>
  <table>
    <tr><th>Phase</th><th>Window</th><th>Key Deliverable</th></tr>
    <tr><td>Discovery &amp; Mobilisation</td><td>Weeks 1–4</td><td>Signed BRD, governance, env access</td></tr>
    <tr><td>Design</td><td>Weeks 5–10</td><td>Solution design, migration plan, integration design</td></tr>
    <tr><td>Build — Sprint 1 (CRM + Projects)</td><td>Weeks 11–14</td><td>CRM and Projects modules feature-complete</td></tr>
    <tr><td>Build — Sprint 2 (Resources + Time)</td><td>Weeks 15–18</td><td>Resources and Time modules feature-complete</td></tr>
    <tr><td>Build — Sprint 3 (Finance + Reports)</td><td>Weeks 19–22</td><td>Finance, Reporting, NetSuite integration</td></tr>
    <tr><td>Build — Sprint 4 (Admin + Polish)</td><td>Weeks 23–25</td><td>RBAC, audit, custom fields, templates</td></tr>
    <tr><td>System Integration Test (SIT)</td><td>Weeks 26–28</td><td>All defects ≤ Sev-2 closed</td></tr>
    <tr><td>User Acceptance Test (UAT)</td><td>Weeks 29–31</td><td>UAT sign-off by business owners</td></tr>
    <tr><td>Data Migration &amp; Cutover</td><td>Weeks 32–33</td><td>Production data loaded &amp; reconciled</td></tr>
    <tr><td>Pilot Go-Live (1 region)</td><td>Week 34</td><td>~50 users live, hypercare</td></tr>
    <tr><td>Phased Rollout</td><td>Weeks 35–40</td><td>Full firm live</td></tr>
    <tr><td>Post Go-Live Hypercare</td><td>Weeks 41–48</td><td>≤ 5 critical defects, KPI tracking starts</td></tr>
  </table>
  <h3>14.2 Key Milestones</h3>
  <table>
    <tr><th>#</th><th>Milestone</th><th>Target</th><th>Owner</th></tr>
    <tr><td>M1</td><td>BRD approved</td><td>End of Week 4</td><td>Sponsor</td></tr>
    <tr><td>M2</td><td>Solution design signed off</td><td>End of Week 10</td><td>BA + IT</td></tr>
    <tr><td>M3</td><td>Build complete</td><td>End of Week 25</td><td>Delivery Lead</td></tr>
    <tr><td>M4</td><td>UAT sign-off</td><td>End of Week 31</td><td>Business Owners</td></tr>
    <tr><td>M5</td><td>Pilot go-live</td><td>Week 34</td><td>Programme Manager</td></tr>
    <tr><td>M6</td><td>Full rollout complete</td><td>End of Week 40</td><td>Programme Manager</td></tr>
    <tr><td>M7</td><td>Phase 1 closure &amp; benefits review</td><td>End of Week 48</td><td>Sponsor</td></tr>
  </table>`;

  // ── Section 15: Sign-off ───────────────────────────────────────────────────
  html += `<h2>15. Approval &amp; Sign-Off</h2>
  <table>
    <tr><th>Name</th><th>Role</th><th>Decision</th><th>Date</th><th>Signature</th></tr>
    <tr><td>&nbsp;</td><td>Executive Sponsor (CEO/COO)</td><td>☐ Approve  ☐ Reject  ☐ Approve with comment</td><td>&nbsp;</td><td>&nbsp;</td></tr>
    <tr><td>&nbsp;</td><td>Head of Professional Services</td><td>☐ Approve  ☐ Reject  ☐ Approve with comment</td><td>&nbsp;</td><td>&nbsp;</td></tr>
    <tr><td>&nbsp;</td><td>Chief Financial Officer</td><td>☐ Approve  ☐ Reject  ☐ Approve with comment</td><td>&nbsp;</td><td>&nbsp;</td></tr>
    <tr><td>&nbsp;</td><td>Chief Information Officer</td><td>☐ Approve  ☐ Reject  ☐ Approve with comment</td><td>&nbsp;</td><td>&nbsp;</td></tr>
    <tr><td>&nbsp;</td><td>Head of IT Security</td><td>☐ Approve  ☐ Reject  ☐ Approve with comment</td><td>&nbsp;</td><td>&nbsp;</td></tr>
  </table>
  <p style="margin-top:24pt; color:#64748b; font-size:9pt; text-align:center;">— End of Business Requirements Document — BusinessNow PSA v1.0 —</p>`;

  html += `</body></html>`;
  return html;
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log("Building BRD HTML…");
  const html = await buildHtml();
  fs.writeFileSync(HTML_OUT, html);
  console.log(`HTML written: ${HTML_OUT} (${(fs.statSync(HTML_OUT).size/1024).toFixed(1)} KB)`);

  console.log("Converting to DOCX…");
  const docxBuf = await HTMLtoDOCX(html, null, {
    table: { row: { cantSplit: true } },
    footer: true,
    pageNumber: true,
    margins: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
    title: "BusinessNow PSA — Business Requirements Document",
    creator: "BusinessNow Product Team",
  });
  fs.writeFileSync(DOCX_OUT, docxBuf);
  console.log(`DOCX written: ${DOCX_OUT} (${(fs.statSync(DOCX_OUT).size/1024).toFixed(1)} KB)`);

  // Cleanup tmp PNGs
  try {
    fs.readdirSync(TMP_DIR).forEach(f => fs.unlinkSync(path.join(TMP_DIR, f)));
    fs.rmdirSync(TMP_DIR);
  } catch {}
  console.log("Done.");
})().catch(e => { console.error(e); process.exit(1); });
