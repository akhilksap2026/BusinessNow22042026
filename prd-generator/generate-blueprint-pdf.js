'use strict';

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'output', 'blueprint.pdf');
const SS = path.join(__dirname, 'screenshots');

const BRAND_PURPLE = '#6B46C1';
const BRAND_DARK   = '#1E1B4B';
const BRAND_LIGHT  = '#EDE9FE';
const GRAY         = '#6B7280';
const LIGHT_GRAY   = '#F3F4F6';
const DARK_TEXT    = '#111827';
const GREEN        = '#059669';
const AMBER        = '#D97706';
const RED          = '#DC2626';
const BLUE         = '#2563EB';
const WHITE        = '#FFFFFF';

const PAGE_W = 841.89;
const PAGE_H = 595.28;
const MARGIN = 45;
const CONTENT_W = PAGE_W - MARGIN * 2;

const doc = new PDFDocument({
  size: 'A4',
  layout: 'landscape',
  margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
  info: {
    Title: 'BusinessNow PSA – Frontend Blueprint',
    Author: 'KSAP Technology',
    Subject: 'UI/UX Blueprint Document with Live Screenshots',
    Creator: 'BusinessNow Blueprint Generator',
  },
  autoFirstPage: false,
});

doc.pipe(fs.createWriteStream(OUT));

// ─── helpers ────────────────────────────────────────────────────────────────

function hex2rgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

function fillRect(x, y, w, h, color) {
  doc.save().rect(x, y, w, h).fill(color).restore();
}

function roundRect(x, y, w, h, r, fill, stroke) {
  doc.save().roundedRect(x, y, w, h, r);
  if (fill)   doc.fillColor(fill).fill();
  if (stroke) doc.strokeColor(stroke).stroke();
  doc.restore();
}

function badge(x, y, text, bg, fg) {
  const pad = 6;
  doc.font('Helvetica-Bold').fontSize(8);
  const tw = doc.widthOfString(text);
  roundRect(x, y, tw + pad * 2, 16, 4, bg);
  doc.fillColor(fg || WHITE).text(text, x + pad, y + 3, { lineBreak: false });
}

function statusBadge(x, y, text) {
  const colors = {
    'In Progress': ['#DBEAFE', '#1D4ED8'],
    'Completed':   ['#D1FAE5', '#065F46'],
    'At Risk':     ['#FEF3C7', '#92400E'],
    'Not Started': ['#F3F4F6', '#374151'],
    'Admin':       [BRAND_PURPLE, WHITE],
    'All Roles':   [BRAND_LIGHT, BRAND_DARK],
    'PM + Admin':  ['#DBEAFE', '#1D4ED8'],
    'account_admin': [BRAND_PURPLE, WHITE],
    'project_manager': ['#DBEAFE', '#1D4ED8'],
    'consultant':  ['#D1FAE5', '#065F46'],
  };
  const [bg, fg] = colors[text] || [LIGHT_GRAY, DARK_TEXT];
  badge(x, y, text, bg, fg);
}

function sectionDivider(num, title, subtitle, color) {
  doc.addPage();
  fillRect(0, 0, PAGE_W, PAGE_H, color);
  fillRect(0, 0, PAGE_W, 6, WHITE);
  fillRect(0, PAGE_H - 6, PAGE_W, 6, WHITE);

  doc.fillColor(WHITE).font('Helvetica').fontSize(14)
     .text(`Section ${String(num).padStart(2,'0')}`, MARGIN, PAGE_H / 2 - 60, { width: CONTENT_W });
  doc.font('Helvetica-Bold').fontSize(38)
     .text(title, MARGIN, PAGE_H / 2 - 40, { width: CONTENT_W });
  doc.font('Helvetica').fontSize(14).fillColor('rgba(255,255,255,0.8)')
     .text(subtitle, MARGIN, PAGE_H / 2 + 14, { width: CONTENT_W * 0.75 });

  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(11)
     .text('BusinessNow PSA  ·  Frontend Blueprint', MARGIN, PAGE_H - MARGIN - 14);
}

function screenshotPage(opts) {
  // opts: { title, route, roles[], file, purpose, callouts[], features[] }
  doc.addPage();

  // header bar
  fillRect(0, 0, PAGE_W, 52, BRAND_DARK);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(16)
     .text(opts.title, MARGIN, 16, { width: CONTENT_W * 0.55 });
  doc.font('Helvetica').fontSize(9).fillColor('rgba(255,255,255,0.65)')
     .text(opts.route, MARGIN, 34, { lineBreak: false });

  // role badges
  let bx = MARGIN + doc.widthOfString(opts.route) + 16;
  (opts.roles || []).forEach(r => {
    statusBadge(bx, 30, r);
    bx += doc.widthOfString(r) + 28;
  });

  // page number hint top-right
  doc.fillColor('rgba(255,255,255,0.5)').font('Helvetica').fontSize(8)
     .text('BusinessNow PSA – Frontend Blueprint', PAGE_W - MARGIN - 240, 20, { width: 240, align: 'right' });

  const imgFile = path.join(SS, opts.file);
  const ssExists = fs.existsSync(imgFile);

  // layout: left = screenshot, right = annotations
  const leftW   = CONTENT_W * 0.62;
  const rightW  = CONTENT_W * 0.36;
  const leftX   = MARGIN;
  const rightX  = MARGIN + leftW + CONTENT_W * 0.02;
  const topY    = 62;
  const availH  = PAGE_H - topY - MARGIN;

  if (ssExists) {
    // screenshot with subtle shadow border
    roundRect(leftX - 2, topY - 2, leftW + 4, availH + 4, 4, '#E5E7EB');
    doc.image(imgFile, leftX, topY, { width: leftW, height: availH, cover: [leftW, availH] });
    // thin border over image
    doc.save().roundedRect(leftX, topY, leftW, availH, 3).stroke('#D1D5DB').restore();
  } else {
    roundRect(leftX, topY, leftW, availH, 4, LIGHT_GRAY);
    doc.fillColor(GRAY).font('Helvetica').fontSize(12)
       .text('Screenshot not available', leftX, topY + availH / 2 - 8, { width: leftW, align: 'center' });
  }

  // right panel
  let ry = topY;

  // purpose
  if (opts.purpose) {
    roundRect(rightX, ry, rightW, 0, 0, null);
    doc.fillColor(BRAND_DARK).font('Helvetica-Bold').fontSize(10).text('PURPOSE', rightX, ry);
    ry += 14;
    doc.fillColor(DARK_TEXT).font('Helvetica').fontSize(9)
       .text(opts.purpose, rightX, ry, { width: rightW });
    ry += doc.heightOfString(opts.purpose, { width: rightW }) + 10;
    // divider
    doc.moveTo(rightX, ry).lineTo(rightX + rightW, ry).strokeColor('#E5E7EB').lineWidth(0.5).stroke();
    ry += 8;
  }

  // callouts
  if (opts.callouts && opts.callouts.length) {
    doc.fillColor(BRAND_DARK).font('Helvetica-Bold').fontSize(10).text('UI ELEMENTS', rightX, ry);
    ry += 14;

    opts.callouts.forEach((c, i) => {
      const even = i % 2 === 0;
      const el   = c[0];
      const desc = c[1];
      const elH  = Math.max(doc.heightOfString(desc, { width: rightW - 80 }) + 4, 14);

      if (ry + elH > PAGE_H - MARGIN - 4) return; // skip if overflow

      if (even) fillRect(rightX, ry, rightW, elH + 4, LIGHT_GRAY);

      // bullet circle
      const [r2,g2,b2] = hex2rgb(BRAND_PURPLE);
      doc.save().circle(rightX + 6, ry + elH / 2 + 2, 5)
         .fillColor(BRAND_PURPLE).fill().restore();
      doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(7)
         .text(String(i+1), rightX + 3, ry + elH / 2 - 2, { lineBreak: false });

      doc.fillColor(BRAND_DARK).font('Helvetica-Bold').fontSize(8)
         .text(el, rightX + 15, ry + 2, { width: 65, lineBreak: false });
      doc.fillColor(GRAY).font('Helvetica').fontSize(8)
         .text(desc, rightX + 82, ry + 2, { width: rightW - 82 });
      ry += elH + 4;
    });
    ry += 6;
    if (ry < PAGE_H - MARGIN - 4) {
      doc.moveTo(rightX, ry).lineTo(rightX + rightW, ry).strokeColor('#E5E7EB').lineWidth(0.5).stroke();
      ry += 8;
    }
  }

  // key features
  if (opts.features && opts.features.length && ry < PAGE_H - MARGIN - 30) {
    doc.fillColor(BRAND_DARK).font('Helvetica-Bold').fontSize(10).text('KEY FEATURES', rightX, ry);
    ry += 14;
    opts.features.forEach(f => {
      if (ry > PAGE_H - MARGIN - 12) return;
      doc.save().circle(rightX + 4, ry + 5, 3).fillColor(GREEN).fill().restore();
      doc.fillColor(DARK_TEXT).font('Helvetica').fontSize(8.5)
         .text(f, rightX + 12, ry, { width: rightW - 12 });
      ry += doc.heightOfString(f, { width: rightW - 12 }) + 5;
    });
  }
}

// ─── COVER PAGE ──────────────────────────────────────────────────────────────

doc.addPage();

// deep purple gradient background
fillRect(0, 0, PAGE_W, PAGE_H, BRAND_DARK);
fillRect(0, 0, PAGE_W * 0.55, PAGE_H, BRAND_PURPLE);

// decorative circles
doc.save().opacity(0.08).circle(PAGE_W * 0.5, 0, 300).fill(WHITE).restore();
doc.save().opacity(0.06).circle(PAGE_W * 0.5, PAGE_H, 250).fill(WHITE).restore();
doc.save().opacity(0.05).circle(0, PAGE_H * 0.5, 180).fill(WHITE).restore();

// logo area
doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(28).text('BusinessNow', MARGIN, 80);
doc.font('Helvetica').fontSize(11).fillColor('rgba(255,255,255,0.6)')
   .text('Professional Services Automation', MARGIN, 116);

// main title
doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(46)
   .text('Frontend', MARGIN, PAGE_H / 2 - 80, { width: 380 })
   .text('Blueprint', MARGIN, PAGE_H / 2 - 26, { width: 380 });
doc.font('Helvetica').fontSize(14).fillColor('rgba(255,255,255,0.75)')
   .text('Document', MARGIN, PAGE_H / 2 + 36, { width: 380 });

// subtitle
doc.font('Helvetica').fontSize(12).fillColor('rgba(255,255,255,0.6)')
   .text('Comprehensive UI specification with live application screenshots,\nmodule-by-module annotations, and developer reference data.', MARGIN, PAGE_H / 2 + 70, { width: 340 });

// right side info box
const infoX = PAGE_W * 0.65;
const infoY = PAGE_H / 2 - 100;
roundRect(infoX, infoY, 210, 200, 8, 'rgba(255,255,255,0.07)');

const infoItems = [
  ['Version',       'v1.0 – May 2026'],
  ['Platform',      'BusinessNow PSA'],
  ['Tech Stack',    'React · Vite · Tailwind'],
  ['Screens',       '14 live screenshots'],
  ['Modules',       '13 product modules'],
  ['Auth',          'Role-based (RBAC)'],
];
let iy = infoY + 16;
infoItems.forEach(([k, v]) => {
  doc.fillColor('rgba(255,255,255,0.5)').font('Helvetica').fontSize(8).text(k.toUpperCase(), infoX + 16, iy);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(10).text(v, infoX + 16, iy + 11);
  iy += 28;
});

// bottom bar
fillRect(0, PAGE_H - 48, PAGE_W, 48, 'rgba(0,0,0,0.3)');
doc.fillColor('rgba(255,255,255,0.4)').font('Helvetica').fontSize(8)
   .text('CONFIDENTIAL · KSAP Technology · Internal Use Only', MARGIN, PAGE_H - 28);
doc.fillColor('rgba(255,255,255,0.4)').font('Helvetica').fontSize(8)
   .text('Generated May 2026', PAGE_W - MARGIN - 120, PAGE_H - 28);

// ─── TABLE OF CONTENTS ───────────────────────────────────────────────────────

doc.addPage();
fillRect(0, 0, PAGE_W, 70, BRAND_DARK);
doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(24).text('Table of Contents', MARGIN, 22);
doc.fillColor('rgba(255,255,255,0.5)').font('Helvetica').fontSize(10)
   .text('BusinessNow PSA · Frontend Blueprint Document', MARGIN, 50);

const tocSections = [
  ['01', 'Authentication & Login',         'Login, session management, role selection'],
  ['02', 'Dashboard & Overview',           'KPI cards, portfolio health, quick actions'],
  ['03', 'Projects – List View',           'Project table, filters, status/health badges'],
  ['04', 'Project Detail',                 'Tasks, team, financials, change requests, CSAT'],
  ['05', 'Client Accounts',                'Account hierarchy, contacts, contract values'],
  ['06', 'Prospects',                      'Pre-sales pipeline, lead qualification'],
  ['07', 'Opportunities',                  'Kanban pipeline, deal tracking, win/loss'],
  ['08', 'Time Tracking',                  'Timesheet grid, approvals, time-off requests'],
  ['09', 'Team Resources',                 'Capacity view, heat map, skills matrix'],
  ['10', 'Finance & Invoicing',            'Invoices, billing schedules, revenue recognition'],
  ['11', 'Reports & Analytics',            'Performance, utilisation, CSAT, budget reports'],
  ['12', 'Command Center',                 'Executive portfolio dashboard, consolidated view'],
  ['13', 'Admin Settings',                 'Users, templates, job roles, tax codes, config'],
  ['14', 'Notifications',                  'Activity feed, read/unread, project linking'],
];

let ty = 90;
const colW = (CONTENT_W - 20) / 2;
tocSections.forEach(([num, title, desc], i) => {
  const col  = i < 7 ? 0 : 1;
  const row  = i < 7 ? i : i - 7;
  const tx   = MARGIN + col * (colW + 20);
  const rowY = ty + row * 64;

  roundRect(tx, rowY, colW, 56, 6, LIGHT_GRAY);
  fillRect(tx, rowY, 4, 56, BRAND_PURPLE);

  doc.fillColor(GRAY).font('Helvetica').fontSize(8)
     .text(`SECTION ${num}`, tx + 14, rowY + 8);
  doc.fillColor(BRAND_DARK).font('Helvetica-Bold').fontSize(11)
     .text(title, tx + 14, rowY + 20, { width: colW - 24 });
  doc.fillColor(GRAY).font('Helvetica').fontSize(8)
     .text(desc, tx + 14, rowY + 36, { width: colW - 24 });
});

// ─── SECTION 01 – AUTHENTICATION ─────────────────────────────────────────────

sectionDivider(1, 'Authentication\n& Login', 'Secure access gateway with role-based user sessions, localStorage-persisted authentication, and redirect logic.', BRAND_PURPLE);

screenshotPage({
  title:   'Login Page',
  route:   '/login',
  roles:   ['All Roles'],
  file:    '02-dashboard.jpg',
  purpose: 'Entry point for all users. Validates credentials against the API, sets localStorage session (activeUserId + activeRole), then redirects to the Dashboard.',
  callouts: [
    ['Logo',       'BusinessNow brand header with purple theme'],
    ['Email',      'Input with validation and auto-focus'],
    ['Password',   'Masked input with show/hide toggle'],
    ['Sign In',    'Primary CTA, triggers POST /api/auth/login'],
    ['Role Select','Dropdown pre-populated from user record'],
    ['Error Toast','Red dismissable banner on auth failure'],
  ],
  features: [
    'JWT-style session stored in localStorage',
    'Role persisted: account_admin, project_manager, consultant, client_user',
    'Auto-redirect to / on valid session',
    'Protected routes redirect to /login when unauthenticated',
  ],
});

// ─── SECTION 02 – DASHBOARD ───────────────────────────────────────────────────

sectionDivider(2, 'Dashboard\n& Overview', 'Real-time portfolio summary with KPI cards, portfolio health, needs-attention alerts, and quick-action shortcuts.', '#3B82F6');

screenshotPage({
  title:   'Dashboard – Overview',
  route:   '/',
  roles:   ['account_admin', 'project_manager'],
  file:    '02-dashboard.jpg',
  purpose: 'Central hub showing live portfolio metrics. Auto-refreshes on navigation. Surfaces at-risk projects, overdue invoices, and team utilisation warnings without requiring drill-down.',
  callouts: [
    ['KPI Cards',     '4-up metric row: Active Projects, Revenue, Billable Hours, Team Utilisation'],
    ['Portfolio Bar', 'Stacked health bar — Green=On Track, Amber=At Risk, Red=Off Track'],
    ['Needs Attention','Prioritised alert cards for at-risk projects and overdue invoices'],
    ['Quick Actions', '4-button shortcut row: Log Time, Create Invoice, Assign Resource, View Projects'],
    ['Budget Card',   'Total portfolio budget incl. approved change requests'],
    ['Recent Activity','Last 5 system events with timestamps and project links'],
    ['Period Filter', 'This Month / This Quarter / This Year date-range picker'],
    ['New Project',   'Top-right CTA opens the project creation wizard'],
  ],
  features: [
    '4 active KPI cards with real-time data from API',
    'Portfolio health bar: On Track 5 (83%), At Risk 1 (17%), Off Track 0',
    '$3,400,000 total portfolio budget',
    '109% team utilisation — triggers over-allocation warning',
    'Needs Attention widget: 1 at-risk project + 1 overdue invoice ($198,000)',
    'Quick Actions for most frequent workflows',
  ],
});

// ─── SECTION 03 – PROJECTS LIST ──────────────────────────────────────────────

sectionDivider(3, 'Projects\nList View', 'Sortable, filterable project registry with status badges, health indicators, and bulk-action support.', '#059669');

screenshotPage({
  title:   'Projects – All Projects',
  route:   '/projects',
  roles:   ['account_admin', 'project_manager', 'consultant'],
  file:    '03-projects-list.jpg',
  purpose: 'Central project registry. Supports multi-criteria filtering (status + health), free-text search, bulk selection, and quick access to individual project dashboards.',
  callouts: [
    ['Search Bar',     'Live search across project name and account'],
    ['Status Filters', 'Pill toggles: All / Not Started / In Progress / At Risk / Completed'],
    ['Health Filters', 'All Health / On Track / At Risk / Off Track'],
    ['Column Headers', 'Sortable: Project Name, Account, Owner, Type, Status, Health, Hours'],
    ['Status Badge',   'Colour-coded pill: In Progress (blue), Completed (green), At Risk (amber)'],
    ['Health Badge',   'On Track (green), At Risk (amber), Off Track (red)'],
    ['Hours Columns',  'Tracked Hrs vs Allocated Hrs per project'],
    ['Row Menu (⋯)',   'Context menu: Edit, Archive, Duplicate, Delete'],
    ['New Project',    'Opens multi-step creation wizard'],
    ['Show Archived',  'Toggles soft-deleted projects into view'],
  ],
  features: [
    '6 projects displayed with real data',
    'Type column: External / Internal / Internal Support',
    'Checkbox multi-select for bulk operations',
    'All Items / Bookmarked filter dropdown',
    'Persistent filter state across navigation',
  ],
});

// ─── SECTION 04 – PROJECT DETAIL ─────────────────────────────────────────────

sectionDivider(4, 'Project\nDetail', 'Deep-dive project workspace with 10 sub-tabs covering tasks, financials, team allocations, change requests, CSAT, documents, forms, timeline, time logs, and updates.', '#7C3AED');

screenshotPage({
  title:   'Project Detail – Tasks Tab (FrostLine WMS)',
  route:   '/projects/:id',
  roles:   ['account_admin', 'project_manager', 'consultant'],
  file:    '04-project-detail.jpg',
  purpose: 'Primary project workspace. The hero card row summarises budget burn, hours used, completion %, and timeline at a glance. Below, 10 tabs expose every project dimension.',
  callouts: [
    ['Status Badges',  'In Progress + On Track shown inline with project title'],
    ['Hero Cards',     '4 metric cards: Revised Budget, Hours Used %, Completion %, Timeline remaining'],
    ['Alert Cards',    'Overdue (7), Blocked (0), At Risk (0), On Track (0) task counts'],
    ['Tab Bar',        '10 tabs: Tasks, Team & Allocations, Financials, Change Requests, CSAT, Documents, Forms, Timeline, Time, Updates'],
    ['Task List',      'List view with Name, Status, Priority, Assigned Resource, Due Date, Planned/Actual hours'],
    ['List/Board',     'Toggle between tabular list and Kanban board views'],
    ['Add Task',       'Inline task creation with auto-populate project/phase'],
    ['Columns',        'Configurable column visibility for the task table'],
    ['Apply Template', 'Import task structure from saved project templates'],
    ['Edit Project',   'Open project settings form (budget, dates, team, billing type)'],
  ],
  features: [
    '10-tab project workspace',
    'Budget card: $1,250,000 revised, 50% used, $625,000 invoiced',
    'Completion 45% based on task completion',
    '11 tasks tracked with planned vs actual hours',
    'List + Board (Kanban) dual view for tasks',
    'Context-aware breadcrumb navigation',
  ],
});

screenshotPage({
  title:   'Project Detail – At Risk Project (VeloFreight TMS)',
  route:   '/projects/2',
  roles:   ['account_admin', 'project_manager'],
  file:    '04b-project-detail-at-risk.jpg',
  purpose: 'Demonstrates the at-risk project state. The "At Risk" health badge, amber colouring, and elevated overdue/blocked task counts draw immediate attention to projects needing intervention.',
  callouts: [
    ['At Risk Badge',  'Amber "At Risk" badge displayed beside "In Progress"'],
    ['Budget Card',    '$780,000 SOW, only 20% used — pacing risk visible'],
    ['Hours Card',     '24% hours used (340/1400) — under-tracked'],
    ['Completion',     '28% task completion — behind schedule'],
    ['Overdue Count',  '5 overdue tasks highlighted in red'],
    ['Blocked Count',  '1 blocked task highlighted in orange'],
    ['Task Priority',  'High-priority tasks shown first in default sort'],
    ['Milestone Row',  'Special milestone task type with distinct icon'],
  ],
  features: [
    'Health status drives visual treatment across the entire page',
    'Overdue counter triggers red alert in hero row',
    'Budget pacing: $156,000 invoiced of $780,000 budget',
    '340h tracked of 1,400h planned (24%)',
  ],
});

// ─── SECTION 05 – CLIENT ACCOUNTS ────────────────────────────────────────────

sectionDivider(5, 'Client\nAccounts', 'CRM-lite account management with contract values, tier classification, and expandable contact/project sub-rows.', '#0891B2');

screenshotPage({
  title:   'Client Accounts',
  route:   '/accounts',
  roles:   ['account_admin', 'project_manager'],
  file:    '06-accounts.jpg',
  purpose: 'Master list of client organisations. Shows contract value, account tier (Enterprise / Mid-Market / Internal), status, and geographic region. Expandable rows reveal contacts and linked projects.',
  callouts: [
    ['Account Name',   'Linked to account detail view with expand chevron'],
    ['Domain',         'Client website domain for quick reference'],
    ['Status Badge',   'Active (green), At Risk (amber), Churned (red)'],
    ['Tier Badge',     'Enterprise (purple), Mid-Market (blue), Internal (gray)'],
    ['Region',         'North America / Asia Pacific / Europe geography'],
    ['Contract Value', 'Total contracted ARR/project value'],
    ['Expand Row (›)', 'Reveals contacts, linked projects, and recent activity'],
    ['Row Menu (⋯)',   'Edit account, archive, view history'],
    ['New Account',    'Opens account creation form'],
    ['Search',         'Free-text search across account name and domain'],
  ],
  features: [
    '7 accounts: 6 Active, 1 At Risk',
    '3 Enterprise accounts (HarbourLink $1.85M, VeloFreight $2.1M, FrostLine $1.25M)',
    'KSAP internal account at $0 for internal projects',
    'Expandable rows for contact and project sub-views',
    'Total portfolio value visible at a glance',
  ],
});

// ─── SECTION 06 – PROSPECTS ──────────────────────────────────────────────────

sectionDivider(6, 'Prospects', 'Pre-sales pipeline management covering lead qualification, source tracking, and conversion to account/opportunity.', '#D97706');

screenshotPage({
  title:   'Prospects Pipeline',
  route:   '/prospects',
  roles:   ['account_admin', 'project_manager'],
  file:    '07-prospects.jpg',
  purpose: 'Manages inbound and outbound sales prospects before they become formal opportunities. Tracks source channel, qualification status, contact details, and estimated deal value.',
  callouts: [
    ['Summary Line',   '5 prospects · $3,600,000 total pipeline value'],
    ['Company',        'Prospect company name (pre-account)'],
    ['Contact',        'Primary contact name and email address'],
    ['Status Badge',   'New / Qualified / Proposal / Negotiation / Converted'],
    ['Source',         'Lead origin: Trade Show, Referral, Inbound, LinkedIn, Conference'],
    ['Est. Value',     'Estimated deal value for pipeline sizing'],
    ['Status Filter',  'Dropdown to filter by lifecycle stage'],
    ['Search Bar',     'Free-text search across company and contact'],
    ['Add Prospect',   'Opens prospect creation form'],
    ['Row Menu (⋯)',   'Convert to Opportunity, Edit, Archive'],
  ],
  features: [
    '5 prospects totalling $3,600,000 pipeline value',
    'Status flow: New → Qualified → Proposal → Negotiation → Converted',
    'IronRoad Rail Logistics at Negotiation stage: $1,400,000',
    'UrbanCrate already converted to active account',
    'Source attribution for marketing ROI tracking',
  ],
});

// ─── SECTION 07 – OPPORTUNITIES ──────────────────────────────────────────────

sectionDivider(7, 'Opportunities', 'Kanban-style deal pipeline from Discovery through to Won/Lost, with probability weighting and account linking.', '#7C3AED');

screenshotPage({
  title:   'Opportunities – Kanban Board',
  route:   '/opportunities',
  roles:   ['account_admin', 'project_manager'],
  file:    '08-opportunities.jpg',
  purpose: 'Visual sales pipeline for formal opportunities. Cards display account, value, probability, and close date. Column totals show weighted pipeline by stage. Toggle between Kanban and List views.',
  callouts: [
    ['Kanban Toggle',  'List / Kanban view switcher top-right'],
    ['Stage Columns',  'Discovery, Qualified, Proposal, Negotiation, Won (scrollable)'],
    ['Deal Card',      'Title, Account, Amount, Probability %, Close Date'],
    ['Column Total',   'Sum of deal values per stage at column footer'],
    ['Probability %',  'Win probability shown on each card (25%–80%)'],
    ['Close Date',     'Target close date for pipeline forecast'],
    ['Add Opportunity','Opens opportunity creation form'],
    ['Won Column',     'Closed-won deals with green styling'],
  ],
  features: [
    '6 deals · $1,980,000 in pipeline · $830,000 won',
    'Discovery: $560,000 (25% prob) — Customs & Compliance Automation',
    'Negotiation: $780,000 (80% prob) — European TMS Rollout',
    'Won: Oracle WMS Upgrade $340,000 + Last-Mile Platform $490,000',
    'Horizontal scroll reveals all 5 stages',
  ],
});

// ─── SECTION 08 – TIME TRACKING ──────────────────────────────────────────────

sectionDivider(8, 'Time\nTracking', 'Weekly timesheet grid, approval workflows, time-off requests, and by-project / by-user aggregation views.', '#059669');

screenshotPage({
  title:   'Time Tracking – Timesheet',
  route:   '/time',
  roles:   ['account_admin', 'project_manager', 'consultant'],
  file:    '09-time-tracking.jpg',
  purpose: 'Primary time entry interface. The weekly grid rows expand per project/task with a billable tag. Timesheets flow through Draft → Submitted → Approved. Earlier unsubmitted weeks block new entries.',
  callouts: [
    ['KPI Row',        'This Week total, This Month total, Billable Ratio %'],
    ['Tabs',           '5 tabs: Timesheet, Approvals, Time Entries, By Project, By User'],
    ['Week Nav',       '‹ / › arrows navigate calendar weeks with date range label'],
    ['Submission State','Submitted (blue) / Draft (gray) / Approved (green) status badge'],
    ['Withdraw',       'Allows recall of submitted timesheet before approval'],
    ['Warning Banner', 'Yellow alert when an earlier draft blocks new time entries'],
    ['Project Row',    'Collapsible project group with task-level sub-rows'],
    ['Billable Tag',   'Green "Billable" badge on rows that count toward revenue'],
    ['Daily Cells',    'Mon–Sun input cells with entered hours'],
    ['Row Total',      'Sum of hours for the project/task across the week'],
    ['Timer',          'Start Timer button for live time capture'],
    ['AI Log',         '"Log Time with Assistant" for natural-language entry'],
  ],
  features: [
    'Weekly timesheet grid (Mon–Sun)',
    '5 tabs: Timesheet, Approvals, Time Entries, By Project, By User',
    'Billable vs non-billable classification per entry',
    'Submit / Withdraw / Approve flow with PM approval',
    'Time Off requests with balance tracking',
    'AI-assisted time logging via natural language',
  ],
});

// ─── SECTION 09 – RESOURCES ──────────────────────────────────────────────────

sectionDivider(9, 'Team\nResources', 'Capacity planning hub with utilisation heat map, project/people timelines, resource request management, and skills matrix.', '#DC2626');

screenshotPage({
  title:   'Team Resources – Capacity View',
  route:   '/resources',
  roles:   ['account_admin', 'project_manager'],
  file:    '10-resources.jpg',
  purpose: 'Portfolio-wide capacity dashboard. Shows real-time utilisation per team member, highlights over-allocated staff (>100%), and surfaces capacity gaps for resource planning.',
  callouts: [
    ['Period Header',  'RESOURCE KPIs · MAY 2026 with working-days count'],
    ['KPI Cards',      'Total Capacity (1,512h), Total Allocated (1,579h), Utilisation (104.4%), Over-Allocated (4 members)'],
    ['Over-Alloc Card','Red card with count of employees over 100% allocation'],
    ['Tab Bar',        '6 tabs: Capacity, Heat Map, Projects Timeline, People Timeline, Resource Requests, Skills Matrix'],
    ['Search',         'Filter by name, role, or skill'],
    ['Dept Filter',    'Dropdown: All Departments, Delivery, Engineering, etc.'],
    ['Team Table',     'Columns: Member, Department, Role, Utilisation bar, Capacity (hrs), Available (hrs), Skills'],
    ['Utilisation Bar','Progress bar — blue normal, red when over 100%'],
    ['Skills Chips',   'Primary skills shown with "+N more" overflow badge'],
    ['All Items',      'Bookmark/filter dropdown for saved views'],
  ],
  features: [
    'Portfolio at 104.4% utilisation — 4 over-allocated members',
    '1,512h total capacity vs 1,579h allocated in May 2026',
    'Heat Map tab for date-range capacity visualisation',
    'Projects Timeline and People Timeline Gantt views',
    'Resource Requests queue for approval workflow',
    'Skills Matrix for capability gap analysis',
  ],
});

// ─── SECTION 10 – FINANCE ────────────────────────────────────────────────────

sectionDivider(10, 'Finance &\nInvoicing', 'Full invoice lifecycle management with billing schedules, revenue recognition tracking, and contract document storage.', '#0891B2');

screenshotPage({
  title:   'Finance & Invoicing – Invoices',
  route:   '/finance',
  roles:   ['account_admin'],
  file:    '11-finance.jpg',
  purpose: 'Centralised finance hub for creating, tracking, and managing invoices across all client projects. Surfaces outstanding and overdue amounts with drill-down per invoice.',
  callouts: [
    ['KPI Row',        '4 cards: Total Invoiced, Total Paid, Outstanding, Overdue (red)'],
    ['Tab Bar',        '4 tabs: Invoices, Billing Schedules, Revenue Recognition, Contracts'],
    ['Project Filter', 'Dropdown to scope invoices to a single project'],
    ['Search',         'Cross-tab search across invoice ID, description, amount'],
    ['Invoice Table',  'Invoice ID, Description, Issue Date, Due Date, Status, Amount'],
    ['Status Badges',  'Draft / In Review / Approved / Paid / Overdue'],
    ['New Invoice',    'Opens invoice creation form with line-item builder'],
    ['New Contract',   'Upload or create contract documents'],
    ['Overdue Alert',  '$198,000 overdue shown in red in KPI card'],
    ['Row Menu (⋯)',   'Download PDF, Send to client, Mark paid, Edit, Void'],
  ],
  features: [
    'Total Invoiced: $1,745,500 | Total Paid: $1,043,500',
    'Outstanding: $440,000 | Overdue: $198,000',
    '9 invoices across all projects',
    'Billing Schedules for milestone-based revenue planning',
    'Revenue Recognition tab for ASC 606/IFRS 15 compliance',
    'Contract storage with linked project association',
  ],
});

// ─── SECTION 11 – REPORTS ────────────────────────────────────────────────────

sectionDivider(11, 'Reports &\nAnalytics', 'Multi-tab reporting suite covering project performance, team utilisation, timesheet compliance, CSAT trends, and budget variance.', '#7C3AED');

screenshotPage({
  title:   'Reports – Project Performance',
  route:   '/reports',
  roles:   ['account_admin', 'project_manager'],
  file:    '12-reports.jpg',
  purpose: 'Executive and operational reporting hub. The Performance tab provides project-by-project on-time delivery rate, CSAT score, non-template tasks, and planned days — all exportable to CSV.',
  callouts: [
    ['Tab Bar',         '7 tabs: Performance, Utilisation Grid, Timesheet Submissions, Capacity Planning, Operations, CSAT Trend, Budget (scrollable)'],
    ['KPI Row',         '4 summary cards: Projects (6), Avg On-Time Rate (36%), Avg CSAT (4.7), Template Projects (0)'],
    ['Performance Table','Project, Account, Status, Health, Template, Tasks, On-Time %, Non-Template Tasks, CSAT, Days Planned'],
    ['On-Time Bar',     'Progress bar per project: green at 100%, red at low %'],
    ['CSAT Stars',      '★★★★★ star rating with numeric score'],
    ['Filters',         'All Statuses, All Health, All Projects dropdowns'],
    ['Export CSV',      'Downloads current view as spreadsheet'],
    ['Project Link',    'Project name is a hyperlink to the project detail'],
  ],
  features: [
    '7 report tabs: Performance, Utilisation Grid, Timesheet Submissions, Capacity Planning, Operations, CSAT Trend, Budget',
    '36% avg on-time rate across 6 projects',
    '4.7 avg CSAT score (out of 5)',
    'Per-project CSAT, on-time %, and non-template task counts',
    'Export to CSV for BI tool integration',
    'Interval IQ tab for advanced time analytics',
  ],
});

// ─── SECTION 12 – COMMAND CENTER ─────────────────────────────────────────────

sectionDivider(12, 'Command\nCenter', 'Executive-grade portfolio operations dashboard with consolidated project health, financial burn, and resource over-allocation signals.', BRAND_DARK);

screenshotPage({
  title:   'Command Center – Portfolio Overview',
  route:   '/command-center',
  roles:   ['account_admin'],
  file:    '13-command-center.jpg',
  purpose: 'Admin/exec read-only view of all projects in one table. Shows EAC, ETC, billing type, and financial burn rate. Refreshes every 5 minutes. Critical for cross-project resource and budget governance.',
  callouts: [
    ['Refresh Status',  'Timestamp "Last refreshed May 5, 1:37 PM" with Refresh button'],
    ['KPI Banner',      '6 metric cards: Portfolio Budget, Hours Burn %, Billed to Date, At Risk/Red count, Over-Allocated count, Open Resource Reqs'],
    ['At Risk Card',    'Red "1" clickable card — filters consolidated table to at-risk projects'],
    ['Over-Alloc Card', 'Amber "4 employees > 100%" trigger card'],
    ['Project Table',   'All projects: Account, PM, Status, Health, Total Budget, Spent %, Planned h, Actual h, ETC, EAC, Billing Type'],
    ['ETC / EAC',       'Estimate to Complete and Estimate at Completion financial forecasting'],
    ['Billing Type',    'Fixed Fee / T&M / Materials shown per project'],
    ['Grouping',        '"No grouping" dropdown for Account/PM/Status grouping'],
    ['Filters',         '4 filter dropdowns: Status, Health, Account, PM'],
    ['Export CSV',      'Full portfolio export for executive reporting'],
  ],
  features: [
    'Portfolio Budget: $3,400,000 across 6 projects',
    'Hours Burn: 43% (2,745h of 6,360h)  ',
    'Billed to Date: $1,356,000 ($191,500 pending)',
    'Auto-refreshes every 5 minutes',
    'Consolidated ETC and EAC financial projections',
    'Clickable KPI cards filter the consolidated project table',
  ],
});

// ─── SECTION 13 – ADMIN ──────────────────────────────────────────────────────

sectionDivider(13, 'Admin\nSettings', '17-tab administration module covering user management, project/document templates, skills, job roles, tax codes, time categories, and workspace configuration.', '#374151');

screenshotPage({
  title:   'Admin Settings – User Management',
  route:   '/admin',
  roles:   ['account_admin'],
  file:    '14-admin.jpg',
  purpose: 'Account-admin-only configuration panel. The Users tab manages team members, assigns roles, sets cost rates, and configures user-level permissions. Additional tabs govern all system-wide reference data.',
  callouts: [
    ['Tab Bar',        '7 visible tabs: Users, Project Templates, Document Templates, Skills Matrix, Job Roles, Tax Codes, Time Categories, Task… (scrollable to 17 total)'],
    ['Sub-tabs',       'Users tab has User Management + User Configuration sub-tabs'],
    ['User Table',     'Columns: Avatar, User, Email, Role, Department, Status, Cost Rate, Skills, ⋯ menu'],
    ['Role Column',    'System role assignment: account_admin, Project Manager, Consultant, etc.'],
    ['Cost Rate',      'Billable cost rate per hour for margin calculations'],
    ['Skills Button',  'Opens skill assignment modal per user'],
    ['Status Badge',   'Active (green) / Inactive (gray) per user'],
    ['Invite Email',   'Send email invitation to new team member'],
    ['Add User',       'Direct user creation with role and department assignment'],
    ['Row Menu (⋯)',   'Edit user, deactivate, reset password, view audit log'],
  ],
  features: [
    '17-tab admin module',
    '9 team members shown with cost rates ($80–$115/hr)',
    'Role-based access controlled at account_admin level',
    'Project Templates for standardised project structures',
    'Document Templates for contracts and reports',
    'Skills Matrix, Job Roles, Tax Codes configuration',
    'Time Categories for billing classification setup',
  ],
});

// ─── SECTION 14 – NOTIFICATIONS ──────────────────────────────────────────────

sectionDivider(14, 'Notifications', 'In-app notification centre aggregating system events from all modules — invoices, health changes, timesheet approvals, milestone completions.', '#0891B2');

screenshotPage({
  title:   'Notifications Centre',
  route:   '/notifications',
  roles:   ['All Roles'],
  file:    '15-notifications.jpg',
  purpose: 'Aggregated activity feed for the authenticated user. Events are auto-generated by API triggers (health change, invoice overdue, timesheet approval, milestone complete). Supports bulk-read and selective clear.',
  callouts: [
    ['Page Header',    '"Notifications" with unread count badge (15) on bell icon'],
    ['Mark All Read',  'Marks all 15 notifications as read in one click'],
    ['Clear Read (3)', 'Removes the 3 already-read notifications from the list'],
    ['Bell Icon',      'Unread indicator — white text on purple badge in sidebar'],
    ['Notification Row','Bell icon, message text, timestamp, project hyperlink'],
    ['Read/Unread',    'Dimmed rows = read; bold rows = unread with "Read" toggle'],
    ['Project Link',   'Inline hyperlink to the related project (e.g., VeloFreight TMS)'],
    ['Timestamp',      'Relative time shown (e.g., 4/26/2026, 3:58:35 PM)'],
  ],
  features: [
    '15 unread notifications shown in chronological order',
    'Event types: invoice overdue, health change, task blocked, invoice approved, milestone complete, project closed, draft invoice created',
    'Every notification links directly to the related project',
    'Mark all read / Clear read controls',
    'Badge count visible on sidebar bell icon across all pages',
  ],
});

// ─── APPENDIX: RBAC MATRIX ───────────────────────────────────────────────────

doc.addPage();
fillRect(0, 0, PAGE_W, 70, BRAND_DARK);
doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(20).text('Appendix A – RBAC Permission Matrix', MARGIN, 18);
doc.fillColor('rgba(255,255,255,0.5)').font('Helvetica').fontSize(10)
   .text('Role-based access control per module and action type', MARGIN, 48);

const roles  = ['account_admin', 'project_manager', 'consultant', 'client_user'];
const mods   = [
  ['Dashboard',       ['✓','✓','✓ (own)','✓ (limited)']],
  ['Projects List',   ['✓','✓ (own)','✓ (assigned)','✗']],
  ['Project Detail',  ['✓','✓ (own)','Read + Time','Read only']],
  ['Accounts',        ['✓','Read','✗','✗']],
  ['Prospects',       ['✓','Read','✗','✗']],
  ['Opportunities',   ['✓','Read','✗','✗']],
  ['Time Tracking',   ['✓ (all)','✓ (approve)','✓ (own)','✗']],
  ['Resources',       ['✓','✓','Read','✗']],
  ['Finance',         ['✓','Read','✗','✗']],
  ['Reports',         ['✓','✓','Read','✗']],
  ['Command Center',  ['✓','✗','✗','✗']],
  ['Admin',           ['✓','✗','✗','✗']],
  ['Notifications',   ['✓','✓','✓','✓']],
];

const colW2  = (CONTENT_W - 160) / 4;
const labelW = 160;
let rx = MARGIN;
let ry2 = 80;

// header row
fillRect(rx, ry2, labelW, 22, BRAND_PURPLE);
doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8).text('MODULE', rx + 6, ry2 + 7);
roles.forEach((r, i) => {
  fillRect(rx + labelW + i * colW2, ry2, colW2, 22, BRAND_DARK);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(7)
     .text(r, rx + labelW + i * colW2 + 4, ry2 + 7, { width: colW2 - 8 });
});
ry2 += 22;

mods.forEach(([mod, perms], mi) => {
  const even = mi % 2 === 0;
  fillRect(rx, ry2, labelW, 22, even ? LIGHT_GRAY : WHITE);
  doc.fillColor(DARK_TEXT).font('Helvetica-Bold').fontSize(8.5).text(mod, rx + 6, ry2 + 7);
  perms.forEach((p, i) => {
    const bg = even ? LIGHT_GRAY : WHITE;
    fillRect(rx + labelW + i * colW2, ry2, colW2, 22, bg);
    const col = p === '✓' ? GREEN : p === '✗' ? RED : BRAND_DARK;
    doc.fillColor(col).font('Helvetica').fontSize(8)
       .text(p, rx + labelW + i * colW2 + 4, ry2 + 7, { width: colW2 - 8 });
  });
  ry2 += 22;
});

// footnote
ry2 += 10;
doc.fillColor(GRAY).font('Helvetica').fontSize(8)
   .text('✓ = Full access   ✓ (own/assigned) = Scoped to user\'s own records   Read = Read-only   ✗ = No access', MARGIN, ry2);

// ─── APPENDIX: TECH STACK ────────────────────────────────────────────────────

doc.addPage();
fillRect(0, 0, PAGE_W, 70, BRAND_PURPLE);
doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(20).text('Appendix B – Technology Stack & Architecture', MARGIN, 18);
doc.fillColor('rgba(255,255,255,0.5)').font('Helvetica').fontSize(10)
   .text('Frontend libraries, build tooling, and API integration patterns', MARGIN, 48);

const stackItems = [
  ['Framework',      'React 18',             'Component-based UI with hooks. Functional components throughout.'],
  ['Build Tool',     'Vite 5',               'Hot-module replacement, optimised production bundling.'],
  ['Routing',        'Wouter',               'Lightweight client-side routing — replaces React Router.'],
  ['State/Data',     'TanStack Query v5',    'Server-state caching, background refresh, optimistic updates.'],
  ['UI Components',  'shadcn/ui + Radix UI', 'Accessible, composable primitives with Tailwind styling.'],
  ['Styling',        'Tailwind CSS v3',      'Utility-first CSS. Custom theme extends Tailwind config.'],
  ['Forms',          'React Hook Form + Zod','Form state management with schema-based validation.'],
  ['Charts',         'Recharts',             'Responsive SVG charts for KPI cards and analytics tabs.'],
  ['Icons',          'Lucide React',         'Consistent icon set across all modules.'],
  ['Date/Time',      'date-fns',             'Immutable date formatting and manipulation.'],
  ['Drag & Drop',    '@hello-pangea/dnd',    'Kanban board drag-and-drop for Opportunities and Tasks.'],
  ['HTTP Client',    'Fetch API (native)',   'TanStack Query wraps fetch calls; no axios required.'],
  ['Auth',           'localStorage tokens',  'activeUserId + activeRole persisted; API validates on each request.'],
  ['API Server',     'Express + Drizzle ORM','REST API on port 8080; PostgreSQL via Drizzle query builder.'],
  ['Database',       'PostgreSQL',           'Hosted on Replit with env var DATABASE_URL; schema-first migrations.'],
  ['Language',       'TypeScript',           'Strict mode; shared types between frontend and API packages.'],
  ['Monorepo',       'pnpm workspaces',      '@workspace/businessnow (frontend), @workspace/api-server (backend).'],
];

let sy = 80;
stackItems.forEach((item, i) => {
  const even = i % 2 === 0;
  const colIdx = i < 9 ? 0 : 1;
  const rowIdx = i < 9 ? i : i - 9;
  const sx = MARGIN + colIdx * (CONTENT_W / 2 + 10);
  const itemY = sy + rowIdx * 48;

  roundRect(sx, itemY, CONTENT_W / 2 - 10, 42, 5, even ? LIGHT_GRAY : WHITE);
  fillRect(sx, itemY, 4, 42, BRAND_PURPLE);
  doc.fillColor(GRAY).font('Helvetica').fontSize(7).text(item[0].toUpperCase(), sx + 12, itemY + 5);
  doc.fillColor(BRAND_DARK).font('Helvetica-Bold').fontSize(10).text(item[1], sx + 12, itemY + 16);
  doc.fillColor(GRAY).font('Helvetica').fontSize(8).text(item[2], sx + 12, itemY + 28, { width: CONTENT_W / 2 - 28 });
});

// ─── BACK COVER ──────────────────────────────────────────────────────────────

doc.addPage();
fillRect(0, 0, PAGE_W, PAGE_H, BRAND_DARK);
fillRect(0, 0, PAGE_W, 8, BRAND_PURPLE);
fillRect(0, PAGE_H - 8, PAGE_W, 8, BRAND_PURPLE);

doc.save().opacity(0.04).circle(PAGE_W * 0.75, PAGE_H * 0.4, 300).fill(WHITE).restore();

doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(32)
   .text('BusinessNow PSA', MARGIN, PAGE_H / 2 - 60, { width: CONTENT_W, align: 'center' });
doc.font('Helvetica').fontSize(16).fillColor('rgba(255,255,255,0.6)')
   .text('Frontend Blueprint Document', MARGIN, PAGE_H / 2 - 14, { width: CONTENT_W, align: 'center' });
doc.font('Helvetica').fontSize(11).fillColor('rgba(255,255,255,0.35)')
   .text('14 Modules  ·  Live Screenshots  ·  RBAC Matrix  ·  Tech Stack Reference', MARGIN, PAGE_H / 2 + 20, { width: CONTENT_W, align: 'center' });

doc.fillColor('rgba(255,255,255,0.25)').font('Helvetica').fontSize(9)
   .text('CONFIDENTIAL · KSAP Technology · Generated May 2026 · Internal Use Only', MARGIN, PAGE_H - 40, { width: CONTENT_W, align: 'center' });

// ─── FINALISE ────────────────────────────────────────────────────────────────

doc.end();
console.log('PDF written to', OUT);
