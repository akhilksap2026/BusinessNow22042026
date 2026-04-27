"use strict";

const path = require("path");
const fs   = require("fs");
const SVG  = require("./svg");

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function imgDataUri(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function generateHTML(data, opts = {}) {
  const screenshotsDir = opts.screenshotsDir || path.join(__dirname, "..", "screenshots");
  const loginShot = imgDataUri(path.join(screenshotsDir, "01-dashboard.jpg"));

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${esc(data.meta.productName)} — ${esc(data.meta.documentTitle)}</title>
<style>
  /* ====== Design tokens ====== */
  :root {
    --navy: #0F172A;
    --blue: #2563EB;
    --blue-lite: #DBEAFE;
    --green: #059669;
    --amber: #D97706;
    --red:   #DC2626;
    --purple:#7C3AED;
    --cyan:  #0891B2;
    --slate: #475569;
    --grey:  #94A3B8;
    --light: #F1F5F9;
    --border:#CBD5E1;
    --text:  #1E293B;
    --bg:    #FFFFFF;
  }

  @page {
    size: A4;
    margin: 18mm 14mm 18mm 14mm;
  }

  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    color: var(--text);
    background: var(--bg);
    font-size: 10.5pt;
    line-height: 1.55;
  }

  /* ====== Layout ====== */
  .page {
    max-width: 920px;
    margin: 0 auto;
    padding: 0 8px;
  }
  section { page-break-inside: avoid; margin-bottom: 28px; }
  h1, h2, h3, h4 { color: var(--navy); margin: 0 0 8px 0; line-height: 1.25; }
  h1 { font-size: 26pt; font-weight: 800; letter-spacing: -0.5px; }
  h2 { font-size: 18pt; font-weight: 700; padding-bottom: 6px; border-bottom: 3px solid var(--blue); margin-top: 36px; }
  h3 { font-size: 13pt; font-weight: 700; margin-top: 22px; color: var(--navy); }
  h4 { font-size: 11pt; font-weight: 700; color: var(--blue); margin-top: 14px; }
  p  { margin: 0 0 10px 0; }

  /* ====== Cover Page ====== */
  .cover {
    page-break-after: always;
    background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 60%, #2563EB 100%);
    color: white;
    min-height: 260mm;
    padding: 60px 50px;
    margin: -8px -8px 28px -8px;
    position: relative;
    overflow: hidden;
  }
  .cover::before {
    content: "";
    position: absolute; top: -100px; right: -100px;
    width: 400px; height: 400px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
  }
  .cover::after {
    content: "";
    position: absolute; bottom: -150px; left: -150px;
    width: 500px; height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%);
  }
  .cover-brand {
    display: flex; align-items: center; gap: 12px;
    font-size: 14pt; font-weight: 700; letter-spacing: 1px;
    text-transform: uppercase; opacity: 0.9;
  }
  .cover-brand .logo {
    width: 44px; height: 44px;
    background: white; color: var(--navy);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 22pt; font-weight: 800;
  }
  .cover-classification {
    position: absolute; top: 60px; right: 50px;
    background: rgba(220, 38, 38, 0.95);
    color: white;
    padding: 6px 16px; border-radius: 4px;
    font-size: 9pt; font-weight: 700; letter-spacing: 1px;
    text-transform: uppercase;
  }
  .cover-title {
    margin-top: 200px;
    font-size: 48pt; font-weight: 800;
    color: white; letter-spacing: -1px;
    line-height: 1.05;
  }
  .cover-subtitle {
    font-size: 18pt; font-weight: 300;
    color: rgba(255,255,255,0.85);
    margin-top: 12px; max-width: 600px;
  }
  .cover-rule {
    width: 100px; height: 4px;
    background: #C9A84C;
    margin: 36px 0 24px 0;
  }
  .cover-product {
    font-size: 24pt; font-weight: 700;
    color: white;
  }
  .cover-tagline {
    font-size: 12pt; color: rgba(255,255,255,0.8);
    margin-top: 4px;
  }
  .cover-meta {
    position: absolute; bottom: 60px; left: 50px; right: 50px;
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 24px;
    border-top: 1px solid rgba(255,255,255,0.2);
    padding-top: 20px;
  }
  .cover-meta div .lbl { font-size: 8pt; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; }
  .cover-meta div .val { font-size: 12pt; font-weight: 600; margin-top: 2px; }

  /* ====== TOC ====== */
  .toc {
    page-break-after: always;
    padding: 20px 0;
  }
  .toc h2 { border: none; padding: 0; }
  .toc ol { list-style: none; padding: 0; counter-reset: toc; }
  .toc li {
    counter-increment: toc;
    display: flex; align-items: baseline;
    padding: 6px 0;
    border-bottom: 1px dotted var(--border);
    font-size: 11pt;
  }
  .toc li::before {
    content: counter(toc, decimal-leading-zero) ".";
    color: var(--blue); font-weight: 700; margin-right: 12px;
    min-width: 28px;
  }
  .toc li .dots { flex: 1; border-bottom: 1px dotted var(--grey); margin: 0 8px; transform: translateY(-3px); }
  .toc li .sec { color: var(--slate); font-size: 9pt; min-width: 80px; text-align: right; font-family: monospace; }

  /* ====== Doc control table ====== */
  table {
    width: 100%; border-collapse: collapse;
    margin: 8px 0 14px 0;
    font-size: 9.5pt;
  }
  th, td {
    border: 1px solid var(--border);
    padding: 7px 10px; text-align: left; vertical-align: top;
  }
  th {
    background: var(--navy); color: white;
    font-weight: 700; font-size: 9pt;
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  tbody tr:nth-child(even) td { background: #F8FAFC; }

  /* ====== Section number ribbon ====== */
  .section-marker {
    display: inline-block;
    background: var(--blue); color: white;
    font-size: 8pt; font-weight: 700;
    padding: 3px 10px; border-radius: 12px;
    text-transform: uppercase; letter-spacing: 1px;
    margin-bottom: 6px;
  }

  /* ====== Callouts ====== */
  .callout {
    border-left: 4px solid var(--blue);
    background: var(--blue-lite);
    padding: 12px 16px;
    margin: 14px 0;
    border-radius: 0 6px 6px 0;
    font-size: 10pt;
  }
  .callout.warn { border-color: var(--amber); background: #FEF3C7; }
  .callout.danger { border-color: var(--red); background: #FEE2E2; }
  .callout.success { border-color: var(--green); background: #D1FAE5; }
  .callout strong { color: var(--navy); }

  /* ====== Persona cards ====== */
  .persona-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .persona {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px;
    background: white;
    page-break-inside: avoid;
  }
  .persona-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .persona-avatar {
    width: 44px; height: 44px; border-radius: 50%;
    background: var(--blue); color: white;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 14pt;
  }
  .persona h4 { margin: 0; color: var(--navy); font-size: 12pt; }
  .persona-role {
    display: inline-block;
    background: var(--light); color: var(--slate);
    padding: 2px 8px; border-radius: 10px;
    font-size: 8.5pt; font-weight: 600;
    font-family: monospace;
  }
  .persona-example { font-size: 9pt; color: var(--slate); font-style: italic; margin: 4px 0 8px 0; }
  .persona ul { margin: 4px 0; padding-left: 18px; font-size: 9.5pt; }
  .persona ul li { margin: 2px 0; }
  .persona .lbl { font-size: 8pt; font-weight: 700; color: var(--blue); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 8px; }

  /* ====== Module cards ====== */
  .module {
    border: 1px solid var(--border);
    border-radius: 10px;
    margin: 16px 0;
    overflow: hidden;
    background: white;
    page-break-inside: avoid;
  }
  .module-head {
    padding: 14px 18px;
    color: white;
    display: flex; align-items: baseline; justify-content: space-between;
  }
  .module-head h3 { color: white; margin: 0; font-size: 14pt; }
  .module-head .id { opacity: 0.8; font-size: 10pt; font-family: monospace; }
  .module-body { padding: 16px 18px; }
  .module-body .purpose { font-size: 10.5pt; color: var(--text); font-style: italic; margin-bottom: 12px; }
  .module-body .sub { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--slate); margin: 14px 0 6px 0; }
  .pages-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .page-card {
    background: var(--light); padding: 8px 10px; border-radius: 4px;
    border-left: 3px solid var(--slate);
    font-size: 9.5pt;
  }
  .page-card code { font-family: 'Consolas', monospace; color: var(--blue); font-size: 9pt; }
  .feature-list { columns: 2; column-gap: 24px; font-size: 9.5pt; }
  .feature-list li { margin: 4px 0; break-inside: avoid; }
  .api-list { font-family: 'Consolas', monospace; font-size: 9pt; background: var(--navy); color: #94CCFF; padding: 10px 14px; border-radius: 4px; }
  .api-list div { margin: 2px 0; }

  /* ====== User stories ====== */
  .story-table th { background: var(--navy); }
  .story-table td.id { font-family: monospace; font-size: 9pt; color: var(--blue); font-weight: 700; }
  .priority { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 8.5pt; font-weight: 700; }
  .priority.Must   { background: #FEE2E2; color: var(--red); }
  .priority.Should { background: #FEF3C7; color: var(--amber); }
  .priority.Could  { background: var(--blue-lite); color: var(--blue); }
  .priority.Wont   { background: var(--light); color: var(--slate); }

  /* ====== Diagrams ====== */
  .diagram-wrap, .wireframe-wrap {
    margin: 16px 0;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: white;
    padding: 8px;
    page-break-inside: avoid;
  }
  .diagram-wrap svg, .wireframe-wrap svg { width: 100%; height: auto; display: block; }
  .diagram-caption {
    font-size: 9pt; color: var(--slate); text-align: center;
    margin-top: 6px; font-style: italic;
  }

  /* ====== Workflow detail tables ====== */
  .wf-card {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px 18px;
    background: white;
    margin: 14px 0;
    page-break-inside: avoid;
  }
  .wf-card h4 { color: var(--navy); margin: 0 0 4px 0; font-size: 13pt; }
  .wf-card .desc { color: var(--slate); font-size: 10pt; margin-bottom: 8px; }

  /* ====== Risk table ====== */
  .risk-table .prob, .risk-table .impact { font-weight: 700; text-align: center; }
  .risk-table .prob.High,   .risk-table .impact.High   { background: #FEE2E2; color: var(--red); }
  .risk-table .prob.Medium, .risk-table .impact.Medium { background: #FEF3C7; color: var(--amber); }
  .risk-table .prob.Low,    .risk-table .impact.Low    { background: #D1FAE5; color: var(--green); }

  /* ====== Acceptance ====== */
  .acceptance-list { font-size: 10pt; }
  .acceptance-list li { padding: 6px 0; border-bottom: 1px solid var(--light); }
  .acceptance-list li::marker { color: var(--green); }

  /* ====== Real screenshot frame ====== */
  .real-shot {
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
    margin: 14px 0;
    page-break-inside: avoid;
  }
  .real-shot .chrome {
    background: var(--light);
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    font-size: 9pt; color: var(--slate);
    display: flex; align-items: center; gap: 8px;
  }
  .real-shot .dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
  .real-shot img { width: 100%; display: block; }
  .real-shot .caption {
    background: white;
    padding: 8px 12px;
    border-top: 1px solid var(--border);
    font-size: 9pt; color: var(--text);
  }
  .real-shot .caption strong { color: var(--navy); }

  /* ====== Print-only watermark ====== */
  @media print {
    .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<!-- ============================================================
     COVER PAGE
     ============================================================ -->
<div class="cover">
  <div class="cover-brand">
    <div class="logo">B</div>
    <div>${esc(data.meta.productName)}</div>
  </div>
  <div class="cover-classification">${esc(data.meta.classification)}</div>

  <div class="cover-title">Product<br/>Requirements<br/>Document</div>
  <div class="cover-subtitle">${esc(data.vision.statement.slice(0, 140))}…</div>

  <div class="cover-rule"></div>
  <div class="cover-product">${esc(data.meta.productName)}</div>
  <div class="cover-tagline">${esc(data.meta.productTagline)}</div>

  <div class="cover-meta">
    <div><div class="lbl">Document ID</div><div class="val">${esc(data.meta.documentId)}</div></div>
    <div><div class="lbl">Version</div><div class="val">v${esc(data.meta.version)} · ${esc(data.meta.status)}</div></div>
    <div><div class="lbl">Date</div><div class="val">${esc(data.meta.date)}</div></div>
    <div><div class="lbl">Owner</div><div class="val">${esc(data.meta.owner)}</div></div>
  </div>
</div>

<div class="page">

<!-- ============================================================
     TABLE OF CONTENTS
     ============================================================ -->
<section class="toc">
  <h2>Table of Contents</h2>
  <ol>
    <li>Document Control<span class="dots"></span><span class="sec">§ 01</span></li>
    <li>Executive Summary<span class="dots"></span><span class="sec">§ 02</span></li>
    <li>Product Vision &amp; Goals<span class="dots"></span><span class="sec">§ 03</span></li>
    <li>Personas &amp; Roles<span class="dots"></span><span class="sec">§ 04</span></li>
    <li>Modules Overview<span class="dots"></span><span class="sec">§ 05</span></li>
    <li>Screen Flow Map<span class="dots"></span><span class="sec">§ 06</span></li>
    <li>Module Deep-Dives<span class="dots"></span><span class="sec">§ 07</span></li>
    <li>Workflows &amp; Process Flows<span class="dots"></span><span class="sec">§ 08</span></li>
    <li>User Stories<span class="dots"></span><span class="sec">§ 09</span></li>
    <li>Screen Wireframes<span class="dots"></span><span class="sec">§ 10</span></li>
    <li>Real Application Screenshots<span class="dots"></span><span class="sec">§ 11</span></li>
    <li>Acceptance Criteria<span class="dots"></span><span class="sec">§ 12</span></li>
    <li>Risks &amp; Assumptions<span class="dots"></span><span class="sec">§ 13</span></li>
    <li>Out of Scope<span class="dots"></span><span class="sec">§ 14</span></li>
  </ol>
</section>

<!-- ============================================================
     1. DOCUMENT CONTROL
     ============================================================ -->
<section>
  <span class="section-marker">Section 01</span>
  <h2>Document Control</h2>
  <table>
    <tbody>
      <tr><th style="width:30%">Document Title</th><td>${esc(data.meta.documentTitle)} — ${esc(data.meta.productName)}</td></tr>
      <tr><th>Document ID</th><td>${esc(data.meta.documentId)}</td></tr>
      <tr><th>Version</th><td>v${esc(data.meta.version)}</td></tr>
      <tr><th>Status</th><td><span class="priority Must">${esc(data.meta.status)}</span></td></tr>
      <tr><th>Classification</th><td>${esc(data.meta.classification)}</td></tr>
      <tr><th>Author</th><td>${esc(data.meta.author)}</td></tr>
      <tr><th>Owner</th><td>${esc(data.meta.owner)}</td></tr>
      <tr><th>Approver</th><td>${esc(data.meta.approver)}</td></tr>
      <tr><th>Date Issued</th><td>${esc(data.meta.date)}</td></tr>
      <tr><th>Next Review</th><td>${esc(data.meta.nextReview)}</td></tr>
    </tbody>
  </table>

  <h3>Version History</h3>
  <table>
    <thead><tr><th>Version</th><th>Date</th><th>Author</th><th>Summary</th></tr></thead>
    <tbody>
      <tr><td>0.1</td><td>05 Mar 2026</td><td>Product Team</td><td>Initial draft after stakeholder workshops</td></tr>
      <tr><td>0.5</td><td>22 Mar 2026</td><td>Product Team</td><td>Persona research integrated; module structure finalised</td></tr>
      <tr><td>0.9</td><td>11 Apr 2026</td><td>Product Team</td><td>User stories prioritised (MoSCoW); workflows added</td></tr>
      <tr><td>1.0</td><td>27 Apr 2026</td><td>Product Team</td><td>Approved baseline. Distributed to engineering for build sign-off.</td></tr>
    </tbody>
  </table>
</section>

<!-- ============================================================
     2. EXECUTIVE SUMMARY
     ============================================================ -->
<section>
  <span class="section-marker">Section 02</span>
  <h2>Executive Summary</h2>
  <div class="callout">
    <strong>BusinessNow PSA</strong> is the operational system of record for KSAP Technology's professional services
    business. It replaces a fragmented landscape of spreadsheets, email-based approvals, and disconnected
    point-tools with a single, role-aware platform that covers the full lifecycle from sales prospect
    through cash collection.
  </div>

  <h3>The Opportunity</h3>
  <p>KSAP currently loses an estimated <strong>4–6% of annual revenue</strong> to billing leakage caused by
    untracked time, late invoices, and scope-change drift. Resource utilisation sits at 64% against a
    target of 75%, primarily because PMs cannot see capacity vs demand without manually consolidating
    data from three systems. Project health degradation is typically detected 2–3 weeks late, after
    budget overrun has occurred.</p>

  <h3>The Solution</h3>
  <p>A unified PSA built on modern web foundations (React, Express, PostgreSQL) with seven integrated
    modules: <strong>CRM, Project Delivery, Resource Management, Time &amp; Attendance, Finance,
    Reports, and Admin</strong>. Cross-module automation (auto-allocation on opportunity probability,
    auto-invoice on milestone completion, AI-ranked resource suggestions) eliminates the manual
    handoffs that produce errors and delay.</p>

  <h3>Success Metrics</h3>
  <table>
    <thead><tr><th>Metric</th><th>Baseline</th><th>Target</th><th>By</th></tr></thead>
    <tbody>
      <tr><td>Billable utilisation</td><td>64%</td><td>75%+</td><td>Q3 2026</td></tr>
      <tr><td>Timesheet approval cycle</td><td>5 days</td><td>&lt; 24 hrs</td><td>Q2 2026</td></tr>
      <tr><td>Invoice cycle (milestone → sent)</td><td>9 days</td><td>&lt; 2 days</td><td>Q2 2026</td></tr>
      <tr><td>Health flag latency</td><td>2–3 weeks</td><td>&lt; 48 hrs</td><td>Q3 2026</td></tr>
      <tr><td>Revenue leakage</td><td>4–6%</td><td>&lt; 1%</td><td>Q4 2026</td></tr>
    </tbody>
  </table>
</section>

<!-- ============================================================
     3. PRODUCT VISION & GOALS
     ============================================================ -->
<section>
  <span class="section-marker">Section 03</span>
  <h2>Product Vision &amp; Goals</h2>

  <h3>Vision Statement</h3>
  <div class="callout success">
    <em>"${esc(data.vision.statement)}"</em>
  </div>

  <h3>Strategic Goals</h3>
  <table>
    <thead><tr><th style="width:8%">ID</th><th>Goal</th><th>Success Metric</th><th style="width:14%">Target</th></tr></thead>
    <tbody>
      ${data.vision.goals.map(g => `
      <tr>
        <td><strong>${esc(g.id)}</strong></td>
        <td>${esc(g.goal)}</td>
        <td>${esc(g.metric)}</td>
        <td>${esc(g.target)}</td>
      </tr>`).join("")}
    </tbody>
  </table>

  <h3>Non-Goals</h3>
  <p>The following are explicitly <strong>out of scope</strong> for this product:</p>
  <ul>
    ${data.vision.nonGoals.map(g => `<li>${esc(g)}</li>`).join("")}
  </ul>
</section>

<!-- ============================================================
     4. PERSONAS & ROLES
     ============================================================ -->
<section>
  <span class="section-marker">Section 04</span>
  <h2>Personas &amp; Roles</h2>

  <p>BusinessNow PSA serves four canonical user types, mapped to a server-enforced RBAC model.
    Roles are hierarchical: an Account Admin can perform any Super User action; a Super User cannot
    access cost rates or org settings.</p>

  <div class="diagram-wrap">${SVG.rbacDiagram()}</div>

  <h3>Personas</h3>
  <div class="persona-grid">
    ${data.personas.map(p => `
    <div class="persona">
      <div class="persona-header">
        <div class="persona-avatar">${esc(p.name[0])}</div>
        <div>
          <h4>${esc(p.name)}</h4>
          <span class="persona-role">${esc(p.systemRole)}</span>
        </div>
      </div>
      <div class="persona-example">${esc(p.example)}</div>
      <div class="lbl">Jobs to be done</div>
      <ul>${p.jobs.map(j => `<li>${esc(j)}</li>`).join("")}</ul>
      <div class="lbl">Pain points</div>
      <ul>${p.pains.map(j => `<li>${esc(j)}</li>`).join("")}</ul>
    </div>`).join("")}
  </div>
</section>

<!-- ============================================================
     5. MODULES OVERVIEW
     ============================================================ -->
<section>
  <span class="section-marker">Section 05</span>
  <h2>Modules Overview</h2>
  <p>BusinessNow PSA is composed of seven integrated modules accessible via a single navigation.
    Each module is independently deployable but shares a common data model, authentication, and
    audit infrastructure.</p>

  <table>
    <thead><tr><th>Module</th><th>Purpose</th><th>Primary Users</th></tr></thead>
    <tbody>
      ${data.modules.map(m => `
      <tr>
        <td><strong style="color:${m.colour}">${esc(m.name)}</strong></td>
        <td>${esc(m.purpose)}</td>
        <td>${
          m.id === "M1" ? "Sales, PMs" :
          m.id === "M2" ? "PMs, Consultants" :
          m.id === "M3" ? "PMs, Resource Mgrs" :
          m.id === "M4" ? "Consultants, PMs" :
          m.id === "M5" ? "Finance, PMs" :
          m.id === "M6" ? "All staff (role-filtered)" :
          "Admins"
        }</td>
      </tr>`).join("")}
    </tbody>
  </table>
</section>

<!-- ============================================================
     6. SCREEN FLOW MAP
     ============================================================ -->
<section>
  <span class="section-marker">Section 06</span>
  <h2>Screen Flow Map</h2>
  <p>The diagram below shows every top-level route, grouped by module, with the navigation paths
    and cross-module data flows. Solid arrows indicate primary navigation; dashed arrows indicate
    cross-module triggers (e.g. opportunity conversion, milestone-driven invoicing).</p>

  <div class="diagram-wrap">${SVG.screenFlow()}</div>
  <div class="diagram-caption">Figure 1 — Screen Flow Map: 7 modules, ~20 routes, 4 cross-module data flows</div>
</section>

<!-- ============================================================
     7. MODULE DEEP-DIVES
     ============================================================ -->
<section>
  <span class="section-marker">Section 07</span>
  <h2>Module Deep-Dives</h2>
  <p>Each module is described below with its purpose, the screens (routes) it owns, the key
    features it ships, and the API endpoints that back it.</p>

  ${data.modules.map(m => `
  <div class="module">
    <div class="module-head" style="background:${m.colour}">
      <h3>${esc(m.name)}</h3>
      <span class="id">${esc(m.id)}</span>
    </div>
    <div class="module-body">
      <p class="purpose">${esc(m.purpose)}</p>

      <div class="sub">Screens / Routes</div>
      <div class="pages-list">
        ${m.pages.map(p => `
        <div class="page-card">
          <code>${esc(p.route)}</code> — <strong>${esc(p.name)}</strong><br/>
          <span style="color:var(--slate);font-size:9pt">${esc(p.description)}</span>
        </div>`).join("")}
      </div>

      <div class="sub">Key Features</div>
      <ul class="feature-list">
        ${m.keyFeatures.map(f => `<li>${esc(f)}</li>`).join("")}
      </ul>

      <div class="sub">API Endpoints</div>
      <div class="api-list">
        ${m.apis.map(a => `<div>${esc(a)}</div>`).join("")}
      </div>
    </div>
  </div>`).join("")}
</section>

<!-- ============================================================
     8. WORKFLOWS
     ============================================================ -->
<section>
  <span class="section-marker">Section 08</span>
  <h2>Workflows &amp; Process Flows</h2>
  <p>The four workflows below describe the cross-module business processes that BusinessNow PSA
    automates. Each diagram shows the actor responsible for each step, colour-coded by role.</p>

  ${data.workflows.map((wf, i) => `
  <div class="wf-card">
    <h4>${esc(wf.name)}</h4>
    <div class="desc">${esc(wf.description)}</div>
    <div class="diagram-wrap">${SVG.workflowDiagram(wf, i)}</div>
    <table>
      <thead><tr><th style="width:5%">#</th><th style="width:18%">Actor</th><th style="width:25%">Action</th><th>Detail</th></tr></thead>
      <tbody>
        ${wf.steps.map((s, j) => `
        <tr>
          <td><strong>${j+1}</strong></td>
          <td>${esc(s.actor)}</td>
          <td><strong>${esc(s.action)}</strong></td>
          <td>${esc(s.detail)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>`).join("")}
</section>

<!-- ============================================================
     9. USER STORIES
     ============================================================ -->
<section>
  <span class="section-marker">Section 09</span>
  <h2>User Stories</h2>
  <p>${data.userStories.length} user stories prioritised using MoSCoW (Must / Should / Could / Won't).
    Each story follows the pattern <em>"As a [role], I want [feature] so that [benefit]"</em> with
    explicit acceptance criteria.</p>

  ${["CRM","Projects","Resources","Time","Finance","Reports","Admin"].map(mod => {
    const stories = data.userStories.filter(s => s.module === mod);
    if (!stories.length) return "";
    return `
    <h3>${esc(mod)} — ${stories.length} stor${stories.length === 1 ? "y" : "ies"}</h3>
    <table class="story-table">
      <thead><tr><th style="width:9%">ID</th><th style="width:11%">Role</th><th>User Story</th><th style="width:9%">Priority</th><th style="width:30%">Acceptance Criteria</th></tr></thead>
      <tbody>
        ${stories.map(s => `
        <tr>
          <td class="id">${esc(s.id)}</td>
          <td>${esc(s.role)}</td>
          <td>${esc(s.story)}</td>
          <td><span class="priority ${esc(s.priority)}">${esc(s.priority)}</span></td>
          <td style="font-size:9pt">${esc(s.criteria)}</td>
        </tr>`).join("")}
      </tbody>
    </table>`;
  }).join("")}
</section>

<!-- ============================================================
     10. WIREFRAMES
     ============================================================ -->
<section>
  <span class="section-marker">Section 10</span>
  <h2>Screen Wireframes</h2>
  <p>The following wireframes illustrate the structure and key elements of the four most-used screens.
    These are <strong>annotated wireframes</strong>, not pixel-perfect designs — final visual design is
    delivered separately by the design system.</p>

  <h3>10.1 Dashboard</h3>
  <div class="wireframe-wrap">${SVG.wireframe(
    { url: "/", title: "Dashboard", subtitle: "Welcome back, Marcus · Project Manager", activeNav: "Dashboard" },
    SVG.dashboardWireframe(),
  )}</div>
  <div class="diagram-caption">Figure 2 — Dashboard wireframe: KPI tiles, portfolio chart, admin onboarding card, recent activity</div>

  <h3>10.2 Projects List</h3>
  <div class="wireframe-wrap">${SVG.wireframe(
    { url: "/projects", title: "Projects", subtitle: "47 active · 12 archived", activeNav: "Projects" },
    SVG.projectsWireframe(),
  )}</div>
  <div class="diagram-caption">Figure 3 — Projects list with health filter, search, and inline progress</div>

  <h3>10.3 Resources — Capacity Planning</h3>
  <div class="wireframe-wrap">${SVG.wireframe(
    { url: "/resources?tab=plan", title: "Resources — Capacity Planning", subtitle: "12-week horizon · 7 consultants + 1 placeholder", activeNav: "Resources" },
    SVG.resourcesWireframe(),
  )}</div>
  <div class="diagram-caption">Figure 4 — Capacity heat-map (red ≥ 100%, amber ≥ 85%, green ≥ 60%) with AI suggestions panel</div>

  <h3>10.4 Time Tracking</h3>
  <div class="wireframe-wrap">${SVG.wireframe(
    { url: "/time", title: "Time Tracking", subtitle: "Week of 20 Apr 2026 · Draft", activeNav: "Time" },
    SVG.timesheetWireframe(),
  )}</div>
  <div class="diagram-caption">Figure 5 — Weekly timesheet grid with import-allocations action and AI Time Assistant</div>
</section>

<!-- ============================================================
     11. REAL APPLICATION SCREENSHOTS
     ============================================================ -->
<section>
  <span class="section-marker">Section 11</span>
  <h2>Real Application Screenshots</h2>
  <p>The screenshot below is captured from the live BusinessNow PSA development build. It shows
    the user-selection login screen — the entry point to the demo workspace, where each user has
    pre-configured roles available without password.</p>

  ${loginShot ? `
  <div class="real-shot">
    <div class="chrome">
      <span class="dot" style="background:#FF5F57"></span>
      <span class="dot" style="background:#FEBC2E"></span>
      <span class="dot" style="background:#28C840"></span>
      <span style="margin-left:12px">businessnow.ksap.io/login</span>
    </div>
    <img src="${loginShot}" alt="Login screen"/>
    <div class="caption">
      <strong>Figure 6 — Login screen.</strong> Demo workspace with 9 pre-configured users covering all four
      RBAC roles. Search by name, role, or department. Multi-role users (e.g. Admin User) show available
      role count. Sessions persist locally in the browser.
    </div>
  </div>` : `
  <div class="callout warn">
    Live screenshot was unavailable at document generation time.
    Re-run the generator after starting the application to embed it.
  </div>`}

  <div class="callout">
    <strong>Note:</strong> Screenshots of authenticated screens (Dashboard, Projects, Resources, Time)
    require a logged-in session. The wireframes in Section 10 illustrate the layout and content of these
    screens. Live screenshots will be added to v1.1 of this document once the demo session bootstrap is
    finalised.
  </div>
</section>

<!-- ============================================================
     12. ACCEPTANCE CRITERIA
     ============================================================ -->
<section>
  <span class="section-marker">Section 12</span>
  <h2>Acceptance Criteria</h2>
  <p>The following criteria define "done" for v1.0 of BusinessNow PSA. All must be met before sign-off.</p>
  <ol class="acceptance-list">
    ${data.acceptance.map(a => `<li>${esc(a)}</li>`).join("")}
  </ol>
</section>

<!-- ============================================================
     13. RISKS
     ============================================================ -->
<section>
  <span class="section-marker">Section 13</span>
  <h2>Risks &amp; Assumptions</h2>
  <table class="risk-table">
    <thead><tr><th style="width:6%">ID</th><th>Risk</th><th style="width:9%">Probability</th><th style="width:9%">Impact</th><th style="width:42%">Mitigation</th></tr></thead>
    <tbody>
      ${data.risks.map(r => `
      <tr>
        <td><strong>${esc(r.id)}</strong></td>
        <td>${esc(r.risk)}</td>
        <td class="prob ${esc(r.prob)}">${esc(r.prob)}</td>
        <td class="impact ${esc(r.impact)}">${esc(r.impact)}</td>
        <td>${esc(r.mitigation)}</td>
      </tr>`).join("")}
    </tbody>
  </table>
</section>

<!-- ============================================================
     14. OUT OF SCOPE
     ============================================================ -->
<section>
  <span class="section-marker">Section 14</span>
  <h2>Out of Scope</h2>
  <div class="callout warn">
    The following items are explicitly <strong>excluded</strong> from this PRD and will not be delivered
    as part of BusinessNow PSA v1.0. They may be reconsidered in future releases via the standard
    product roadmap process.
  </div>
  <ul>
    ${data.vision.nonGoals.map(g => `<li>${esc(g)}</li>`).join("")}
  </ul>

  <h3>Approval Sign-Off</h3>
  <table>
    <thead><tr><th>Role</th><th>Name</th><th>Signature</th><th>Date</th></tr></thead>
    <tbody>
      <tr><td>VP Product</td><td>____________________</td><td>____________________</td><td>__________</td></tr>
      <tr><td>VP Engineering</td><td>____________________</td><td>____________________</td><td>__________</td></tr>
      <tr><td>Head of Delivery</td><td>____________________</td><td>____________________</td><td>__________</td></tr>
      <tr><td>CFO</td><td>____________________</td><td>____________________</td><td>__________</td></tr>
    </tbody>
  </table>

  <p style="text-align:center;margin-top:48px;font-size:9pt;color:var(--slate)">
    — End of Document —<br/>
    ${esc(data.meta.documentId)} · v${esc(data.meta.version)} · ${esc(data.meta.classification)}
  </p>
</section>

</div><!-- /.page -->

</body>
</html>`;
}

module.exports = { generateHTML };
