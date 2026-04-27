"use strict";

function fmtCurrency(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}
function raciColor(letter) {
  const map = { R: "#C9A84C", A: "#1B2A4A", C: "#2D6A9F", I: "#6B7280" };
  return map[letter] || "#E5E7EB";
}
function statusBadge(status) {
  const map = {
    Done: "badge-done", Complete: "badge-done", Resolved: "badge-done",
    "In Progress": "badge-progress", Escalated: "badge-progress",
    Pending: "badge-pending", Planned: "badge-pending", Open: "badge-pending",
    Mitigated: "badge-mitigated",
    GREEN: "badge-green", AMBER: "badge-amber", RED: "badge-red",
    APPROVED: "badge-done", CONFIDENTIAL: "badge-confidential",
  };
  return `<span class="badge ${map[status] || "badge-pending"}">${status}</span>`;
}
function ratingBadge(rating) {
  const map = { Critical: "badge-red", High: "badge-amber", Medium: "badge-progress", Low: "badge-done" };
  return `<span class="badge ${map[rating] || "badge-pending"}">${rating}</span>`;
}

function buildCSS() {
  return `
    /* System font stack — no external network requests needed for PDF rendering */

    :root {
      --navy:        #1B2A4A;
      --navy-light:  #253d6b;
      --gold:        #C9A84C;
      --gold-light:  #F0D898;
      --blue:        #2D6A9F;
      --blue-light:  #EBF3FB;
      --dark:        #0F172A;
      --body:        #1E293B;
      --grey:        #64748B;
      --light-grey:  #F8FAFC;
      --border:      #CBD5E1;
      --red:         #DC2626;
      --amber:       #D97706;
      --green:       #059669;
      --teal:        #0D9488;
      --white:       #FFFFFF;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html { font-size: 10pt; }

    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-weight: 400;
      color: var(--body);
      background: var(--white);
      line-height: 1.6;
    }

    /* ═══════════════════════════════ PAGE STRUCTURE ═══════════════════════════════ */
    .page-break { page-break-before: always; break-before: page; }
    .avoid-break { page-break-inside: avoid; break-inside: avoid; }

    @page {
      size: A4;
      margin: 18mm 16mm 22mm 16mm;
      @bottom-center {
        content: "CONFIDENTIAL — Meridian Advisory Group · TechNova Corporation · Phoenix CRM Programme";
        font-size: 7pt;
        color: #94A3B8;
        font-family: 'Segoe UI', Arial, sans-serif;
      }
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 7pt;
        color: #94A3B8;
      }
    }

    /* ═══════════════════════════════ COVER PAGE ═══════════════════════════════ */
    .cover {
      min-height: 100vh;
      background: var(--navy);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 0;
      position: relative;
      overflow: hidden;
      page-break-after: always;
    }
    .cover-accent-bar {
      height: 8px;
      background: linear-gradient(90deg, var(--gold) 0%, #E8C87A 40%, var(--gold-light) 100%);
    }
    .cover-pattern {
      position: absolute;
      right: -60px;
      top: 80px;
      width: 420px;
      height: 420px;
      opacity: 0.06;
    }
    .cover-body {
      padding: 60px 70px 40px;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      z-index: 1;
      position: relative;
    }
    .cover-firm {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 10pt;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: var(--gold);
      font-weight: 600;
      margin-bottom: 48px;
    }
    .cover-label {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 8.5pt;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: var(--gold);
      font-weight: 600;
      margin-bottom: 14px;
      opacity: 0.85;
    }
    .cover-title {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 30pt;
      font-weight: 900;
      color: var(--white);
      line-height: 1.15;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    .cover-subtitle {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 14pt;
      font-weight: 300;
      color: var(--gold-light);
      margin-bottom: 48px;
      letter-spacing: 0.3px;
    }
    .cover-divider {
      width: 80px;
      height: 3px;
      background: var(--gold);
      margin-bottom: 40px;
    }
    .cover-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 40px;
      margin-bottom: 60px;
    }
    .cover-meta-row {
      display: flex;
      flex-direction: column;
    }
    .cover-meta-label {
      font-size: 7pt;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--gold);
      font-weight: 600;
      opacity: 0.75;
      margin-bottom: 2px;
    }
    .cover-meta-value {
      font-size: 9.5pt;
      color: var(--white);
      font-weight: 400;
    }
    .cover-status-row {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .cover-badge {
      display: inline-block;
      padding: 4px 14px;
      border: 1px solid var(--gold);
      border-radius: 2px;
      font-size: 7.5pt;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--gold);
      font-weight: 700;
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    }
    .cover-footer {
      padding: 20px 70px;
      background: rgba(0,0,0,0.25);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .cover-footer-text {
      font-size: 7.5pt;
      color: rgba(255,255,255,0.45);
      letter-spacing: 0.5px;
    }

    /* ═══════════════════════════════ TABLE OF CONTENTS ═══════════════════════════════ */
    .toc-page { padding: 40px 0; }
    .toc-entry {
      display: flex;
      align-items: baseline;
      padding: 5px 0;
      border-bottom: 1px dotted var(--border);
    }
    .toc-number {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-weight: 700;
      color: var(--navy);
      font-size: 9pt;
      min-width: 32px;
    }
    .toc-title {
      font-size: 9.5pt;
      color: var(--body);
      flex: 1;
      padding: 0 8px;
    }
    .toc-subtitle {
      font-size: 8pt;
      color: var(--grey);
      margin-left: 32px;
      padding: 1px 0;
      border: none;
    }

    /* ═══════════════════════════════ SECTION LAYOUT ═══════════════════════════════ */
    .section { margin: 0 0 48px; }
    .section-header {
      display: flex;
      align-items: stretch;
      margin-bottom: 24px;
      gap: 0;
    }
    .section-number {
      background: var(--navy);
      color: var(--gold);
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 10pt;
      font-weight: 900;
      padding: 8px 14px;
      display: flex;
      align-items: center;
      min-width: 48px;
      justify-content: center;
      letter-spacing: 1px;
    }
    .section-title-block {
      background: var(--blue-light);
      border-left: 4px solid var(--gold);
      padding: 8px 16px;
      flex: 1;
    }
    .section-title {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 14pt;
      font-weight: 800;
      color: var(--navy);
      letter-spacing: -0.2px;
    }
    .section-subtitle {
      font-size: 8pt;
      color: var(--grey);
      margin-top: 1px;
      letter-spacing: 0.5px;
    }

    h2 {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      font-weight: 700;
      color: var(--navy);
      margin: 20px 0 10px;
      padding-bottom: 4px;
      border-bottom: 2px solid var(--blue-light);
    }
    h3 {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 10pt;
      font-weight: 700;
      color: var(--blue);
      margin: 16px 0 8px;
    }
    p { margin-bottom: 10px; font-size: 9.5pt; }
    ul, ol { padding-left: 20px; margin-bottom: 10px; }
    li { font-size: 9.5pt; margin-bottom: 3px; }

    /* ═══════════════════════════════ TABLES ═══════════════════════════════ */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 8.5pt;
    }
    thead tr {
      background: var(--navy);
      color: var(--white);
    }
    thead th {
      padding: 8px 10px;
      text-align: left;
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-weight: 600;
      font-size: 7.5pt;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      border: 1px solid var(--navy-light);
    }
    tbody tr { border-bottom: 1px solid var(--border); }
    tbody tr:nth-child(even) { background: #F8FAFC; }
    tbody tr:nth-child(odd) { background: var(--white); }
    tbody td {
      padding: 7px 10px;
      vertical-align: top;
      border-left: 1px solid var(--border);
      border-right: 1px solid var(--border);
      font-size: 8.5pt;
      color: var(--body);
    }
    .table-caption {
      font-size: 7.5pt;
      color: var(--grey);
      font-style: italic;
      text-align: right;
      margin-top: -12px;
      margin-bottom: 16px;
    }

    /* ═══════════════════════════════ BADGES ═══════════════════════════════ */
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 2px;
      font-size: 7pt;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      white-space: nowrap;
    }
    .badge-done    { background: #DCFCE7; color: #166534; }
    .badge-progress{ background: #DBEAFE; color: #1E40AF; }
    .badge-pending { background: #FEF3C7; color: #92400E; }
    .badge-mitigated{ background: #E0E7FF; color: #3730A3; }
    .badge-green   { background: #DCFCE7; color: #166534; }
    .badge-amber   { background: #FEF3C7; color: #92400E; }
    .badge-red     { background: #FEE2E2; color: #991B1B; }
    .badge-confidential { background: var(--navy); color: var(--gold); }

    /* ═══════════════════════════════ RACI ═══════════════════════════════ */
    .raci-table th, .raci-table td { font-size: 7.5pt; padding: 5px 6px; text-align: center; }
    .raci-table td:first-child { text-align: left; font-weight: 600; color: var(--navy); min-width: 160px; }
    .raci-cell {
      font-weight: 900;
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 9pt;
      border-radius: 2px;
      padding: 3px 6px;
      display: inline-block;
      min-width: 22px;
    }
    .raci-legend {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      margin-bottom: 12px;
      font-size: 8pt;
    }
    .raci-legend-item { display: flex; align-items: center; gap: 6px; }

    /* ═══════════════════════════════ INFO BOXES ═══════════════════════════════ */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    .info-grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    .info-card {
      background: var(--light-grey);
      border: 1px solid var(--border);
      border-left: 4px solid var(--navy);
      padding: 10px 14px;
      border-radius: 2px;
    }
    .info-card-label {
      font-size: 7pt;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: var(--grey);
      font-weight: 600;
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      margin-bottom: 3px;
    }
    .info-card-value {
      font-size: 10pt;
      font-weight: 700;
      color: var(--navy);
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    }
    .info-card-sub {
      font-size: 7.5pt;
      color: var(--grey);
      margin-top: 2px;
    }
    .highlight-card {
      background: var(--navy);
      border: none;
      border-left: 4px solid var(--gold);
      color: var(--white);
    }
    .highlight-card .info-card-label { color: var(--gold-light); }
    .highlight-card .info-card-value { color: var(--white); }
    .highlight-card .info-card-sub   { color: rgba(255,255,255,0.6); }

    /* ═══════════════════════════════ EXECUTIVE SUMMARY ═══════════════════════════════ */
    .exec-summary-box {
      background: var(--blue-light);
      border-left: 5px solid var(--navy);
      padding: 16px 20px;
      margin-bottom: 20px;
      border-radius: 0 4px 4px 0;
    }
    .exec-summary-box p {
      font-size: 10pt;
      line-height: 1.7;
      color: var(--dark);
      font-style: italic;
    }
    .status-indicator {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #DCFCE7;
      border: 1px solid #BBF7D0;
      border-left: 5px solid var(--green);
      padding: 10px 16px;
      border-radius: 2px;
      margin-bottom: 16px;
    }
    .status-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--green);
      flex-shrink: 0;
    }
    .status-dot.amber { background: var(--amber); }
    .status-dot.red   { background: var(--red); }

    /* ═══════════════════════════════ PROCESS FLOW ═══════════════════════════════ */
    .process-flow-container {
      background: var(--light-grey);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 24px;
      margin-bottom: 16px;
    }
    .process-flow-container svg { display: block; margin: 0 auto; }

    /* ═══════════════════════════════ TIMELINE ═══════════════════════════════ */
    .timeline-bar-container {
      background: var(--light-grey);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 16px;
      overflow-x: auto;
    }
    .gantt-label { font-size: 7.5pt; color: var(--body); white-space: nowrap; }
    .gantt-bar   { border-radius: 2px; height: 14px; }

    /* ═══════════════════════════════ SOP STEPS ═══════════════════════════════ */
    .sop-step {
      display: flex;
      gap: 14px;
      margin-bottom: 10px;
      align-items: flex-start;
    }
    .sop-step-number {
      background: var(--navy);
      color: var(--gold);
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-weight: 900;
      font-size: 9pt;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .sop-step-text {
      font-size: 9pt;
      color: var(--body);
      padding-top: 3px;
      line-height: 1.5;
    }

    /* ═══════════════════════════════ APPROVAL BOX ═══════════════════════════════ */
    .approval-box {
      border: 2px solid var(--navy);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    .approval-header {
      background: var(--navy);
      color: var(--white);
      padding: 8px 16px;
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-weight: 700;
      font-size: 9pt;
      letter-spacing: 1px;
    }
    .approval-body {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      padding: 14px 16px;
      gap: 8px;
    }
    .approval-field-label {
      font-size: 7pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--grey);
      font-weight: 600;
    }
    .approval-field-line {
      border-bottom: 1px solid var(--border);
      height: 28px;
      margin-top: 4px;
    }

    /* ═══════════════════════════════ WATERMARK ═══════════════════════════════ */
    @media print {
      .watermark {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-35deg);
        font-size: 72pt;
        color: rgba(200, 200, 200, 0.08);
        font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
        font-weight: 900;
        letter-spacing: 8px;
        z-index: 9999;
        pointer-events: none;
        white-space: nowrap;
      }
    }

    /* ═══════════════════════════════ FOOTER RULE ═══════════════════════════════ */
    .doc-footer {
      border-top: 2px solid var(--border);
      padding-top: 6px;
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      color: var(--grey);
    }

    /* ═══════════════════════════════ CHECKLIST ═══════════════════════════════ */
    .check-row td:first-child { font-weight: 600; font-size: 8pt; color: var(--navy); }
    .check-icon { font-size: 11pt; }

    /* ═══════════════════════════════ CALLOUT ═══════════════════════════════ */
    .callout {
      display: flex;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 3px;
      margin-bottom: 14px;
    }
    .callout-warn { background: #FFFBEB; border-left: 4px solid var(--amber); }
    .callout-info { background: var(--blue-light); border-left: 4px solid var(--blue); }
    .callout-danger { background: #FEF2F2; border-left: 4px solid var(--red); }
    .callout-icon { font-size: 14pt; flex-shrink: 0; }
    .callout-text { font-size: 8.5pt; line-height: 1.5; }

    /* ═══════════════════════════════ SCREENSHOTS ═══════════════════════════════ */
    .screenshot-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .screenshot-card {
      border: 1px solid var(--border);
      border-radius: 4px;
      overflow: hidden;
    }
    .screenshot-bar {
      background: var(--navy);
      padding: 6px 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .browser-dot { width: 8px; height: 8px; border-radius: 50%; }
    .screenshot-img { width: 100%; display: block; background: #EBF3FB; }
    .screenshot-caption {
      padding: 6px 12px;
      font-size: 7.5pt;
      color: var(--grey);
      background: var(--light-grey);
      border-top: 1px solid var(--border);
    }
  `;
}

function buildProcessFlowSVG() {
  return `
  <svg viewBox="0 0 760 280" xmlns="http://www.w3.org/2000/svg" width="100%" style="max-width:760px">
    <defs>
      <marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
        <polygon points="0 0, 8 3, 0 6" fill="#1B2A4A"/>
      </marker>
      <marker id="arr-gold" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
        <polygon points="0 0, 8 3, 0 6" fill="#C9A84C"/>
      </marker>
    </defs>

    <!-- Phase Boxes -->
    <!-- Initiation -->
    <rect x="10" y="110" width="90" height="50" rx="4" fill="#1B2A4A"/>
    <text x="55" y="131" text-anchor="middle" fill="#C9A84C" font-family="Arial" font-weight="700" font-size="7">INITIATION</text>
    <text x="55" y="145" text-anchor="middle" fill="white" font-family="Arial" font-size="7">Kick-off &amp;</text>
    <text x="55" y="155" text-anchor="middle" fill="white" font-family="Arial" font-size="7">Charter</text>

    <!-- Arrow 1 -->
    <line x1="100" y1="135" x2="125" y2="135" stroke="#1B2A4A" stroke-width="2" marker-end="url(#arr)"/>

    <!-- Discovery -->
    <rect x="125" y="110" width="90" height="50" rx="4" fill="#253d6b"/>
    <text x="170" y="131" text-anchor="middle" fill="#C9A84C" font-family="Arial" font-weight="700" font-size="7">DISCOVERY</text>
    <text x="170" y="145" text-anchor="middle" fill="white" font-family="Arial" font-size="7">Gap Analysis &amp;</text>
    <text x="170" y="155" text-anchor="middle" fill="white" font-family="Arial" font-size="7">Assessment</text>

    <!-- Arrow 2 -->
    <line x1="215" y1="135" x2="240" y2="135" stroke="#1B2A4A" stroke-width="2" marker-end="url(#arr)"/>

    <!-- Design -->
    <rect x="240" y="110" width="90" height="50" rx="4" fill="#2D6A9F"/>
    <text x="285" y="131" text-anchor="middle" fill="white" font-family="Arial" font-weight="700" font-size="7">DESIGN</text>
    <text x="285" y="145" text-anchor="middle" fill="white" font-family="Arial" font-size="7">Architecture &amp;</text>
    <text x="285" y="155" text-anchor="middle" fill="white" font-family="Arial" font-size="7">Solution Design</text>

    <!-- Arrow 3 -->
    <line x1="330" y1="135" x2="355" y2="135" stroke="#1B2A4A" stroke-width="2" marker-end="url(#arr)"/>

    <!-- Build -->
    <rect x="355" y="110" width="90" height="50" rx="4" fill="#0D9488"/>
    <text x="400" y="131" text-anchor="middle" fill="white" font-family="Arial" font-weight="700" font-size="7">BUILD</text>
    <text x="400" y="145" text-anchor="middle" fill="white" font-family="Arial" font-size="7">6× Agile Sprints</text>
    <text x="400" y="155" text-anchor="middle" fill="white" font-family="Arial" font-size="7">Configuration</text>

    <!-- Change Request branch (down from Build) -->
    <line x1="400" y1="160" x2="400" y2="185" stroke="#C9A84C" stroke-width="1.5" stroke-dasharray="4,3"/>
    <!-- Diamond -->
    <polygon points="400,185 422,200 400,215 378,200" fill="#FEF3C7" stroke="#C9A84C" stroke-width="1.5"/>
    <text x="400" y="198" text-anchor="middle" fill="#92400E" font-family="Arial" font-weight="700" font-size="6.5">Change</text>
    <text x="400" y="207" text-anchor="middle" fill="#92400E" font-family="Arial" font-weight="700" font-size="6.5">Request?</text>
    <!-- Yes path -->
    <line x1="378" y1="200" x2="320" y2="200" stroke="#C9A84C" stroke-width="1.5" marker-end="url(#arr-gold)"/>
    <text x="349" y="196" text-anchor="middle" fill="#C9A84C" font-family="Arial" font-weight="600" font-size="7">Yes</text>
    <rect x="262" y="188" width="58" height="24" rx="3" fill="#FEF3C7" stroke="#C9A84C" stroke-width="1"/>
    <text x="291" y="203" text-anchor="middle" fill="#92400E" font-family="Arial" font-weight="700" font-size="7">Change Board</text>
    <!-- No path (back to build/test) -->
    <line x1="422" y1="200" x2="460" y2="200" stroke="#C9A84C" stroke-width="1.5"/>
    <text x="441" y="196" text-anchor="middle" fill="#C9A84C" font-family="Arial" font-weight="600" font-size="7">No</text>
    <line x1="460" y1="200" x2="460" y2="135" stroke="#C9A84C" stroke-width="1.5" marker-end="url(#arr-gold)"/>

    <!-- Arrow 4 -->
    <line x1="445" y1="135" x2="472" y2="135" stroke="#1B2A4A" stroke-width="2" marker-end="url(#arr)"/>

    <!-- Test -->
    <rect x="472" y="110" width="90" height="50" rx="4" fill="#7C3AED"/>
    <text x="517" y="131" text-anchor="middle" fill="white" font-family="Arial" font-weight="700" font-size="7">TEST</text>
    <text x="517" y="145" text-anchor="middle" fill="white" font-family="Arial" font-size="7">SIT, UAT &amp;</text>
    <text x="517" y="155" text-anchor="middle" fill="white" font-family="Arial" font-size="7">Performance</text>

    <!-- Arrow 5 -->
    <line x1="562" y1="135" x2="587" y2="135" stroke="#1B2A4A" stroke-width="2" marker-end="url(#arr)"/>

    <!-- Deploy -->
    <rect x="587" y="110" width="90" height="50" rx="4" fill="#059669"/>
    <text x="632" y="131" text-anchor="middle" fill="white" font-family="Arial" font-weight="700" font-size="7">DEPLOY</text>
    <text x="632" y="145" text-anchor="middle" fill="white" font-family="Arial" font-size="7">Go-Live &amp;</text>
    <text x="632" y="155" text-anchor="middle" fill="white" font-family="Arial" font-size="7">Cutover</text>

    <!-- Arrow 6 -->
    <line x1="677" y1="135" x2="700" y2="135" stroke="#1B2A4A" stroke-width="2" marker-end="url(#arr)"/>

    <!-- Hypercare -->
    <rect x="700" y="110" width="50" height="50" rx="4" fill="#C9A84C"/>
    <text x="725" y="131" text-anchor="middle" fill="white" font-family="Arial" font-weight="700" font-size="7">HYPER</text>
    <text x="725" y="143" text-anchor="middle" fill="white" font-family="Arial" font-weight="700" font-size="7">CARE</text>
    <text x="725" y="155" text-anchor="middle" fill="white" font-family="Arial" font-size="6.5">90 days</text>

    <!-- Phase labels above -->
    <text x="55" y="100" text-anchor="middle" fill="#64748B" font-family="Arial" font-size="7" font-weight="600">JAN</text>
    <text x="170" y="100" text-anchor="middle" fill="#64748B" font-family="Arial" font-size="7" font-weight="600">JAN–FEB</text>
    <text x="285" y="100" text-anchor="middle" fill="#64748B" font-family="Arial" font-size="7" font-weight="600">FEB–MAR</text>
    <text x="400" y="100" text-anchor="middle" fill="#64748B" font-family="Arial" font-size="7" font-weight="600">MAR–JUN</text>
    <text x="517" y="100" text-anchor="middle" fill="#64748B" font-family="Arial" font-size="7" font-weight="600">MAY–JUN</text>
    <text x="632" y="100" text-anchor="middle" fill="#64748B" font-family="Arial" font-size="7" font-weight="600">SEP</text>
    <text x="725" y="100" text-anchor="middle" fill="#64748B" font-family="Arial" font-size="7" font-weight="600">OCT–DEC</text>

    <!-- Gate diamonds below -->
    <polygon points="55,172 64,180 55,188 46,180" fill="white" stroke="#1B2A4A" stroke-width="1.5"/>
    <text x="55" y="183" text-anchor="middle" fill="#1B2A4A" font-family="Arial" font-weight="700" font-size="6">✓</text>
    <polygon points="285,172 294,180 285,188 276,180" fill="white" stroke="#1B2A4A" stroke-width="1.5"/>
    <text x="285" y="183" text-anchor="middle" fill="#1B2A4A" font-family="Arial" font-weight="700" font-size="6">✓</text>
    <polygon points="517,172 526,180 517,188 508,180" fill="#FEF3C7" stroke="#D97706" stroke-width="1.5"/>
    <text x="517" y="183" text-anchor="middle" fill="#92400E" font-family="Arial" font-weight="700" font-size="6">◇</text>

    <!-- Legend -->
    <rect x="10" y="240" width="10" height="10" fill="#1B2A4A" rx="1"/>
    <text x="24" y="249" fill="#64748B" font-family="Arial" font-size="7">Phase</text>
    <polygon points="90,248 96,244 102,248 96,252" fill="white" stroke="#1B2A4A" stroke-width="1.5"/>
    <text x="106" y="249" fill="#64748B" font-family="Arial" font-size="7">Quality Gate</text>
    <line x1="186" y1="247" x2="206" y2="247" stroke="#C9A84C" stroke-width="1.5" stroke-dasharray="4,3"/>
    <text x="210" y="250" fill="#64748B" font-family="Arial" font-size="7">Change Request Path</text>
    <polygon points="310,250 322,245 334,250 322,255" fill="#FEF3C7" stroke="#C9A84C" stroke-width="1"/>
    <text x="338" y="252" fill="#64748B" font-family="Arial" font-size="7">Decision Point</text>
  </svg>`;
}

function buildGanttSVG(timeline) {
  const startDate = new Date("2026-01-06");
  const endDate   = new Date("2026-12-28");
  const totalDays = (endDate - startDate) / 86400000;

  const colors = {
    Complete: "#059669",
    "In Progress": "#2D6A9F",
    Planned: "#CBD5E1",
  };

  const W = 700, ROW = 20, LABEL = 160, PAD = 8;
  const H = timeline.length * (ROW + PAD) + 60;

  const monthLabels = [];
  for (let m = 0; m <= 11; m++) {
    const d = new Date(2026, m, 1);
    const offset = (d - startDate) / 86400000;
    const x = LABEL + (offset / totalDays) * (W - LABEL);
    if (x >= LABEL && x <= W) {
      monthLabels.push({ x, label: d.toLocaleDateString("en", { month: "short" }) });
    }
  }

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" width="100%">
    <defs>
      <pattern id="grid" x="0" y="0" width="${(W - LABEL) / 12}" height="${H}" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="${H}" stroke="#E2E8F0" stroke-width="0.5"/>
      </pattern>
    </defs>
    <rect x="${LABEL}" y="0" width="${W - LABEL}" height="${H}" fill="url(#grid)"/>
  `;

  // Month headers
  monthLabels.forEach(({ x, label }) => {
    svg += `<text x="${x + 4}" y="14" fill="#64748B" font-family="Arial" font-size="6.5" font-weight="600">${label}</text>`;
    svg += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#E2E8F0" stroke-width="1"/>`;
  });

  // Today line
  const todayOffset = (new Date("2026-04-27") - startDate) / 86400000;
  const todayX = LABEL + (todayOffset / totalDays) * (W - LABEL);
  svg += `<line x1="${todayX}" y1="0" x2="${todayX}" y2="${H}" stroke="#DC2626" stroke-width="1.5" stroke-dasharray="4,3"/>`;
  svg += `<text x="${todayX + 2}" y="14" fill="#DC2626" font-family="Arial" font-size="6" font-weight="700">TODAY</text>`;

  // Timeline rows
  timeline.forEach((t, i) => {
    const y = 24 + i * (ROW + PAD);
    const s = new Date(t.start + "T12:00:00Z");
    const e = new Date(t.end   + "T12:00:00Z");
    const sx = LABEL + ((s - startDate) / 86400000 / totalDays) * (W - LABEL);
    const ex = LABEL + ((e - startDate) / 86400000 / totalDays) * (W - LABEL);
    const bw = Math.max(ex - sx, 8);
    const fill = colors[t.status] || "#94A3B8";
    const row_bg = i % 2 === 0 ? "#F8FAFC" : "#FFFFFF";

    svg += `<rect x="0" y="${y}" width="${W}" height="${ROW}" fill="${row_bg}"/>`;
    svg += `<text x="2" y="${y + 13}" fill="#1E293B" font-family="Arial" font-size="7" font-weight="400">${t.phase}</text>`;
    svg += `<rect x="${sx}" y="${y + 3}" width="${bw}" height="14" rx="2" fill="${fill}" opacity="0.9"/>`;
    if (bw > 40) {
      svg += `<text x="${sx + 4}" y="${y + 13}" fill="white" font-family="Arial" font-size="6" font-weight="600">${t.milestone}</text>`;
    }
    // Milestone diamond
    svg += `<polygon points="${ex},${y + 4} ${ex + 5},${y + 10} ${ex},${y + 16} ${ex - 5},${y + 10}" fill="${t.status === "Complete" ? "#059669" : "#C9A84C"}"/>`;
  });

  svg += `</svg>`;
  return svg;
}

function buildScreenshotPlaceholder(title, description, index) {
  const colors = ["#1B2A4A", "#2D6A9F", "#0D9488", "#7C3AED", "#C9A84C", "#059669"];
  const color = colors[index % colors.length];
  return `
  <div class="screenshot-card">
    <div class="screenshot-bar">
      <div class="browser-dot" style="background:#DC2626"></div>
      <div class="browser-dot" style="background:#D97706;margin:0 4px"></div>
      <div class="browser-dot" style="background:#059669"></div>
      <span style="margin-left:8px;font-size:7pt;color:rgba(255,255,255,0.6);font-family:'Segoe UI',Arial,sans-serif">${title}</span>
    </div>
    <div style="background:${color}15;height:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:1px solid ${color}30;border-top:none">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="4" fill="${color}"/>
        <path d="M5 7h14M5 12h10M5 17h7" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <span style="font-size:8pt;color:${color};font-weight:600;font-family:'Segoe UI',Arial,sans-serif">${description}</span>
    </div>
    <div class="screenshot-caption">Fig. ${index + 1} — ${description}. Screenshot captured automatically via wkhtmltoimage.</div>
  </div>`;
}

function buildHTML(data) {
  const now = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const css = buildCSS();

  // ─── COVER PAGE ───────────────────────────────────────────────────────────
  const cover = `
  <div class="cover">
    <div class="cover-accent-bar"></div>
    <svg class="cover-pattern" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <circle cx="200" cy="200" r="180" fill="none" stroke="white" stroke-width="2"/>
      <circle cx="200" cy="200" r="140" fill="none" stroke="white" stroke-width="1.5"/>
      <circle cx="200" cy="200" r="100" fill="none" stroke="white" stroke-width="1"/>
      <circle cx="200" cy="200" r="60" fill="none" stroke="white" stroke-width="0.5"/>
      <line x1="20" y1="200" x2="380" y2="200" stroke="white" stroke-width="0.5"/>
      <line x1="200" y1="20" x2="200" y2="380" stroke="white" stroke-width="0.5"/>
      <line x1="70" y1="70" x2="330" y2="330" stroke="white" stroke-width="0.5"/>
      <line x1="330" y1="70" x2="70" y2="330" stroke="white" stroke-width="0.5"/>
    </svg>
    <div class="cover-body">
      <div class="cover-firm">${data.consultant.firm} · ${data.consultant.practice}</div>
      <div class="cover-label">Job Card Document</div>
      <div class="cover-title">${data.project.name}</div>
      <div class="cover-subtitle">${data.project.client} · ${data.project.type}</div>
      <div class="cover-divider"></div>
      <div class="cover-meta">
        <div class="cover-meta-row">
          <span class="cover-meta-label">Document ID</span>
          <span class="cover-meta-value">${data.meta.documentId}</span>
        </div>
        <div class="cover-meta-row">
          <span class="cover-meta-label">Project Code</span>
          <span class="cover-meta-value">${data.project.code}</span>
        </div>
        <div class="cover-meta-row">
          <span class="cover-meta-label">Version</span>
          <span class="cover-meta-value">v${data.meta.version}</span>
        </div>
        <div class="cover-meta-row">
          <span class="cover-meta-label">Status</span>
          <span class="cover-meta-value">${data.meta.status}</span>
        </div>
        <div class="cover-meta-row">
          <span class="cover-meta-label">Programme Manager</span>
          <span class="cover-meta-value">${data.project.projectManager}</span>
        </div>
        <div class="cover-meta-row">
          <span class="cover-meta-label">Executive Sponsor</span>
          <span class="cover-meta-value">${data.project.sponsor}</span>
        </div>
        <div class="cover-meta-row">
          <span class="cover-meta-label">Date Issued</span>
          <span class="cover-meta-value">${fmtDate(data.meta.lastUpdated)}</span>
        </div>
        <div class="cover-meta-row">
          <span class="cover-meta-label">Engagement Ref</span>
          <span class="cover-meta-value">${data.project.engagementRef}</span>
        </div>
      </div>
      <div class="cover-status-row">
        <span class="cover-badge">${data.meta.classification}</span>
        <span class="cover-badge">${data.meta.status}</span>
        <span class="cover-badge">${data.project.phase}</span>
      </div>
    </div>
    <div class="cover-footer">
      <span class="cover-footer-text">&copy; ${new Date().getFullYear()} ${data.consultant.firm}. All rights reserved. Prepared exclusively for ${data.project.client}.</span>
      <span class="cover-footer-text">Generated: ${now}</span>
    </div>
  </div>`;

  // ─── TABLE OF CONTENTS ─────────────────────────────────────────────────────
  const tocItems = [
    { n: "01", title: "Document Control & Version History", sub: [] },
    { n: "02", title: "Executive Summary", sub: ["Current Status", "Strategic Alignment", "Key Risks & Recommendation"] },
    { n: "03", title: "Job Overview", sub: ["Engagement Details", "Budget Summary", "Team Composition"] },
    { n: "04", title: "Scope", sub: ["In-Scope", "Out-of-Scope", "Assumptions & Constraints"] },
    { n: "05", title: "Stakeholder Matrix", sub: [] },
    { n: "06", title: "RACI Matrix", sub: [] },
    { n: "07", title: "Workflow & Process Flow", sub: ["Workflow Steps", "Process Flow Diagram"] },
    { n: "08", title: "Screenshots & Artefacts", sub: [] },
    { n: "09", title: "Standard Operating Procedures (SOP)", sub: data.sop.map(s => s.title) },
    { n: "10", title: "Inputs", sub: [] },
    { n: "11", title: "Outputs & Deliverables", sub: [] },
    { n: "12", title: "Tools & Technology", sub: [] },
    { n: "13", title: "Responsibilities", sub: [] },
    { n: "14", title: "Timeline & Milestones", sub: [] },
    { n: "15", title: "Risk Register", sub: [] },
    { n: "16", title: "Issue Log", sub: [] },
    { n: "17", title: "Quality Checklist", sub: [] },
    { n: "18", title: "Testing Summary", sub: ["Test Strategy", "Test Types", "Defect Summary"] },
    { n: "19", title: "Acceptance Criteria", sub: [] },
    { n: "20", title: "Communication Plan", sub: [] },
    { n: "21", title: "Handover Notes", sub: ["Knowledge Transfer", "Operational Readiness", "Open Items"] },
    { n: "22", title: "Approval Sign-off", sub: [] },
    { n: "A",  title: "Appendix A — Glossary", sub: [] },
    { n: "B",  title: "Appendix B — References", sub: [] },
  ];

  const toc = `
  <div class="page-break">
    <div class="section-header">
      <div class="section-number">TOC</div>
      <div class="section-title-block">
        <div class="section-title">Table of Contents</div>
        <div class="section-subtitle">${data.meta.documentId} · v${data.meta.version}</div>
      </div>
    </div>
    ${tocItems.map(item => `
      <div class="toc-entry">
        <span class="toc-number">${item.n}</span>
        <span class="toc-title">${item.title}</span>
      </div>
      ${item.sub.map(s => `<div class="toc-entry toc-subtitle"><span class="toc-number"></span><span class="toc-title" style="color:var(--grey)">↳ ${s}</span></div>`).join("")}
    `).join("")}
  </div>`;

  // ─── DOCUMENT CONTROL ──────────────────────────────────────────────────────
  const docControl = `
  <div class="page-break section">
    <div class="section-header">
      <div class="section-number">01</div>
      <div class="section-title-block">
        <div class="section-title">Document Control & Version History</div>
        <div class="section-subtitle">Ownership, distribution, and change history</div>
      </div>
    </div>
    <div class="info-grid">
      <div class="info-card"><div class="info-card-label">Document Owner</div><div class="info-card-value">${data.meta.owner}</div><div class="info-card-sub">${data.consultant.firm}</div></div>
      <div class="info-card"><div class="info-card-label">Document Approver</div><div class="info-card-value">${data.meta.approver}</div><div class="info-card-sub">${data.project.client}</div></div>
      <div class="info-card"><div class="info-card-label">Classification</div><div class="info-card-value">${statusBadge(data.meta.classification)}</div><div class="info-card-sub">Internal distribution only</div></div>
      <div class="info-card"><div class="info-card-label">Next Review</div><div class="info-card-value">${fmtDate(data.meta.nextReviewDate)}</div><div class="info-card-sub">Quarterly review cycle</div></div>
    </div>
    <h2>Version History</h2>
    <table class="avoid-break">
      <thead><tr><th>Version</th><th>Date</th><th>Author</th><th>Changes</th></tr></thead>
      <tbody>
        ${data.versionHistory.map(v => `<tr><td><strong>v${v.version}</strong></td><td>${fmtDate(v.date)}</td><td>${v.author}</td><td>${v.changes}</td></tr>`).join("")}
      </tbody>
    </table>
    <h2>Distribution List</h2>
    <table class="avoid-break">
      <thead><tr><th>Name</th><th>Role</th><th>Organisation</th><th>Copy Type</th></tr></thead>
      <tbody>
        <tr><td>${data.meta.approver}</td><td>Executive Sponsor</td><td>${data.project.client}</td><td>Controlled</td></tr>
        <tr><td>${data.meta.owner}</td><td>Programme Manager</td><td>${data.consultant.firm}</td><td>Controlled</td></tr>
        ${data.stakeholders.slice(0, 4).map(s => `<tr><td>${s.name}</td><td>${s.role}</td><td>${s.organisation}</td><td>Information</td></tr>`).join("")}
      </tbody>
    </table>
  </div>`;

  // ─── EXECUTIVE SUMMARY ─────────────────────────────────────────────────────
  const execSummary = `
  <div class="page-break section">
    <div class="section-header">
      <div class="section-number">02</div>
      <div class="section-title-block">
        <div class="section-title">Executive Summary</div>
        <div class="section-subtitle">Programme overview, current health, and recommendation</div>
      </div>
    </div>
    <div class="status-indicator">
      <div class="status-dot"></div>
      <div><strong style="font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:9pt">Overall Programme Status: ${statusBadge("GREEN")}</strong>
      <span style="font-size:8pt;color:#166534;margin-left:8px">On Track — No critical path impact at this time</span></div>
    </div>
    <div class="exec-summary-box">
      <p>${data.executiveSummary.headline}</p>
    </div>
    <div class="info-grid-3">
      <div class="info-card highlight-card">
        <div class="info-card-label">Total Budget</div>
        <div class="info-card-value">${fmtCurrency(data.project.totalBudget)}</div>
        <div class="info-card-sub">${data.project.billingType}</div>
      </div>
      <div class="info-card">
        <div class="info-card-label">Consumed to Date</div>
        <div class="info-card-value">${fmtCurrency(data.project.budgetConsumed)}</div>
        <div class="info-card-sub">${((data.project.budgetConsumed / data.project.totalBudget) * 100).toFixed(1)}% of total budget</div>
      </div>
      <div class="info-card">
        <div class="info-card-label">Remaining</div>
        <div class="info-card-value">${fmtCurrency(data.project.budgetRemaining)}</div>
        <div class="info-card-sub">Forecast to complete on budget</div>
      </div>
    </div>
    <h2>Strategic Alignment</h2>
    <ul>${data.executiveSummary.strategicAlignment.map(a => `<li>${a}</li>`).join("")}</ul>
    <h2>Key Risks Requiring Attention</h2>
    ${data.executiveSummary.keyRisks.map(r => `
    <div class="callout callout-warn">
      <div class="callout-icon">⚠️</div>
      <div class="callout-text">${r}</div>
    </div>`).join("")}
    <h2>Recommendation</h2>
    <div class="callout callout-info">
      <div class="callout-icon">📋</div>
      <div class="callout-text"><strong>${data.executiveSummary.recommendation}</strong></div>
    </div>
  </div>`;

  // ─── JOB OVERVIEW ──────────────────────────────────────────────────────────
  const jobOverview = `
  <div class="page-break section">
    <div class="section-header">
      <div class="section-number">03</div>
      <div class="section-title-block">
        <div class="section-title">Job Overview</div>
        <div class="section-subtitle">Engagement details, budget, and core team</div>
      </div>
    </div>
    <h2>Engagement Details</h2>
    <table class="avoid-break">
      <thead><tr><th>Field</th><th>Value</th><th>Field</th><th>Value</th></tr></thead>
      <tbody>
        <tr><td>Project Name</td><td><strong>${data.project.name}</strong></td><td>Project Code</td><td><strong>${data.project.code}</strong></td></tr>
        <tr><td>Client</td><td>${data.project.client}</td><td>Engagement Ref</td><td>${data.project.engagementRef}</td></tr>
        <tr><td>Project Type</td><td>${data.project.type}</td><td>Methodology</td><td>${data.project.methodology}</td></tr>
        <tr><td>Start Date</td><td>${fmtDate(data.project.startDate)}</td><td>End Date</td><td>${fmtDate(data.project.endDate)}</td></tr>
        <tr><td>Contract End</td><td>${fmtDate(data.project.contractEndDate)}</td><td>Current Phase</td><td>${statusBadge("In Progress")} ${data.project.phase}</td></tr>
        <tr><td>Billing Type</td><td>${data.project.billingType}</td><td>Currency</td><td>${data.project.currency}</td></tr>
        <tr><td>Programme Manager</td><td>${data.project.projectManager}</td><td>Delivery Lead</td><td>${data.project.deliveryLead}</td></tr>
        <tr><td>Solution Architect</td><td>${data.project.solutionArchitect}</td><td>QA Lead</td><td>${data.project.qaLead}</td></tr>
        <tr><td>Change Manager</td><td>${data.project.changeManager}</td><td>Sponsor</td><td>${data.project.sponsor}</td></tr>
      </tbody>
    </table>
    <h2>Consulting Firm Details</h2>
    <div class="info-grid">
      <div class="info-card"><div class="info-card-label">Firm</div><div class="info-card-value">${data.consultant.firm}</div><div class="info-card-sub">${data.consultant.practice}</div></div>
      <div class="info-card"><div class="info-card-label">Contact</div><div class="info-card-value">${data.consultant.email}</div><div class="info-card-sub">${data.consultant.phone} · ${data.consultant.website}</div></div>
      <div class="info-card highlight-card"><div class="info-card-label">Office Address</div><div class="info-card-value">${data.consultant.address}</div></div>
      <div class="info-card highlight-card"><div class="info-card-label">Total Budget</div><div class="info-card-value">${fmtCurrency(data.project.totalBudget)}</div><div class="info-card-sub">${((data.project.budgetConsumed / data.project.totalBudget) * 100).toFixed(0)}% consumed · ${fmtCurrency(data.project.budgetRemaining)} remaining</div></div>
    </div>
  </div>`;

  // ─── SCOPE ─────────────────────────────────────────────────────────────────
  const scope = `
  <div class="page-break section">
    <div class="section-header">
      <div class="section-number">04</div>
      <div class="section-title-block">
        <div class="section-title">Scope</div>
        <div class="section-subtitle">In-scope, out-of-scope, assumptions, constraints, and exclusions</div>
      </div>
    </div>
    <h2>In-Scope</h2>
    <ul>${data.scope.inScope.map(i => `<li>${i}</li>`).join("")}</ul>
    <h2>Out-of-Scope</h2>
    <div class="callout callout-warn"><div class="callout-icon">🚫</div>
    <div class="callout-text"><ul style="margin:0;padding-left:16px">${data.scope.outOfScope.map(i => `<li>${i}</li>`).join("")}</ul></div></div>
    <h2>Assumptions</h2>
    <table class="avoid-break">
      <thead><tr><th>#</th><th>Assumption</th></tr></thead>
      <tbody>${data.scope.assumptions.map((a, i) => `<tr><td><strong>A${String(i+1).padStart(2,"0")}</strong></td><td>${a}</td></tr>`).join("")}</tbody>
    </table>
    <h2>Constraints</h2>
    <table class="avoid-break">
      <thead><tr><th>#</th><th>Constraint</th></tr></thead>
      <tbody>${data.scope.constraints.map((c, i) => `<tr><td><strong>C${String(i+1).padStart(2,"0")}</strong></td><td>${c}</td></tr>`).join("")}</tbody>
    </table>
    <h2>Exclusions</h2>
    <ul>${data.scope.exclusions.map(e => `<li>${e}</li>`).join("")}</ul>
  </div>`;

  // ─── STAKEHOLDER MATRIX ────────────────────────────────────────────────────
  const stakeholders = `
  <div class="page-break section">
    <div class="section-header">
      <div class="section-number">05</div>
      <div class="section-title-block">
        <div class="section-title">Stakeholder Matrix</div>
        <div class="section-subtitle">Full stakeholder register with influence, interest, and engagement strategy</div>
      </div>
    </div>
    <table class="avoid-break">
      <thead>
        <tr>
          <th>Name</th><th>Title</th><th>Organisation</th><th>Role</th>
          <th>Influence</th><th>Interest</th><th>Engagement</th>
          <th>Comms Frequency</th><th>Primary Contact</th>
        </tr>
      </thead>
      <tbody>
        ${data.stakeholders.map(s => `
        <tr>
          <td><strong>${s.name}</strong></td>
          <td>${s.title}</td>
          <td>${s.organisation}</td>
          <td>${s.role}</td>
          <td>${s.influence === "High" ? `<span class="badge badge-red">${s.influence}</span>` : s.influence === "Medium" ? `<span class="badge badge-amber">${s.influence}</span>` : `<span class="badge badge-done">${s.influence}</span>`}</td>
          <td>${s.interest === "High" ? `<span class="badge badge-red">${s.interest}</span>` : s.interest === "Medium" ? `<span class="badge badge-amber">${s.interest}</span>` : `<span class="badge badge-done">${s.interest}</span>`}</td>
          <td><span class="badge ${s.engagement === "Champion" ? "badge-done" : s.engagement === "Supportive" ? "badge-progress" : s.engagement === "Lead" ? "badge-confidential" : "badge-pending"}">${s.engagement}</span></td>
          <td>${s.commsFrequency}</td>
          <td>${s.primaryContact}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    <p class="table-caption">Table 5.1 — Stakeholder Register · ${fmtDate(data.meta.lastUpdated)}</p>
  </div>`;

  // ─── RACI ──────────────────────────────────────────────────────────────────
  const raciLegend = [
    { l: "R", label: "Responsible — does the work", color: "#C9A84C" },
    { l: "A", label: "Accountable — owns the outcome", color: "#1B2A4A" },
    { l: "C", label: "Consulted — provides input", color: "#2D6A9F" },
    { l: "I", label: "Informed — kept up to date", color: "#6B7280" },
  ];
  const raci = `
  <div class="page-break section">
    <div class="section-header">
      <div class="section-number">06</div>
      <div class="section-title-block">
        <div class="section-title">RACI Matrix</div>
        <div class="section-subtitle">Responsibility assignment for all key programme activities</div>
      </div>
    </div>
    <div class="raci-legend">
      ${raciLegend.map(r => `<div class="raci-legend-item">
        <div class="raci-cell" style="background:${r.color};color:white;font-size:8pt">${r.l}</div>
        <span>${r.label}</span>
      </div>`).join("")}
    </div>
    <div style="overflow-x:auto">
    <table class="raci-table avoid-break">
      <thead>
        <tr>
          <th style="text-align:left;min-width:160px">Activity</th>
          ${data.raci.roles.map(r => `<th style="font-size:7pt">${r}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${data.raci.activities.map((act, i) => `
        <tr>
          <td>${act}</td>
          ${data.raci.matrix[i].map(cell => `<td style="text-align:center"><span class="raci-cell" style="background:${raciColor(cell)};color:${cell === "I" ? "#6B7280" : "white"}">${cell}</span></td>`).join("")}
        </tr>`).join("")}
      </tbody>
    </table>
    </div>
    <p class="table-caption">Table 6.1 — RACI Matrix · Roles abbreviated for display. Full titles in Section 13.</p>
  </div>`;

  // ─── WORKFLOW ──────────────────────────────────────────────────────────────
  const workflow = `
  <div class="page-break section">
    <div class="section-header">
      <div class="section-number">07</div>
      <div class="section-title-block">
        <div class="section-title">Workflow & Process Flow</div>
        <div class="section-subtitle">End-to-end programme workflow with phase gates</div>
      </div>
    </div>
    <h2>Process Flow Diagram</h2>
    <div class="process-flow-container">${buildProcessFlowSVG()}</div>
    <h2>Workflow Steps</h2>
    <table class="avoid-break">
      <thead><tr><th>#</th><th>Phase</th><th>Activity</th><th>Owner</th><th>Duration</th><th>Gate</th></tr></thead>
      <tbody>
        ${data.workflow.map(w => `
        <tr>
          <td><strong>${w.step}</strong></td>
          <td>${w.phase}</td>
          <td><strong>${w.activity}</strong></td>
          <td>${w.owner}</td>
          <td>${w.duration}</td>
          <td style="color:var(--gold);font-weight:600;font-size:7.5pt">${w.gate}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    <h2>Detailed Step Inputs & Outputs</h2>
    <table class="avoid-break">
      <thead><tr><th>Step</th><th>Inputs</th><th>Outputs</th><th>Tools</th></tr></thead>
      <tbody>
        ${data.workflow.map(w => `
        <tr>
          <td><strong>${w.step}. ${w.phase}</strong></td>
          <td>${w.inputs}</td>
          <td>${w.outputs}</td>
          <td style="font-family:Consolas,'Courier New',monospace;font-size:7.5pt">${w.tools}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>`;

  // ─── SCREENSHOTS ───────────────────────────────────────────────────────────
  const screenshots = `
  <div class="page-break section">
    <div class="section-header">
      <div class="section-number">08</div>
      <div class="section-title-block">
        <div class="section-title">Screenshots & Artefacts</div>
        <div class="section-subtitle">Application screens, dashboard views, and key artefacts</div>
      </div>
    </div>
    <div class="callout callout-info">
      <div class="callout-icon">📸</div>
      <div class="callout-text">Screenshots below are captured automatically using <strong>wkhtmltoimage</strong>. For live applications, screenshots are taken of the target URL and embedded in all output formats. The <code>screenshots/</code> folder contains all captured PNG files.</div>
    </div>
    <div class="screenshot-grid">
      ${[
        ["Salesforce Sales Cloud — Accounts View", "CRM Account List Dashboard"],
        ["Analytics Hub — Executive KPI Dashboard", "Power BI Embedded Overview"],
        ["MuleSoft Anypoint — API Management Console", "Integration Layer Monitoring"],
        ["Project JIRA Board — Sprint 4 Kanban", "Sprint Backlog & Progress"],
      ].map((s, i) => buildScreenshotPlaceholder(s[0], s[1], i)).join("")}
    </div>
    <div class="screenshot-grid">
      ${[
        ["Salesforce Service Cloud — Case Management", "Service Desk View"],
        ["Data Migration Dashboard — Reconciliation", "Migration Progress Tracker"],
      ].map((s, i) => buildScreenshotPlaceholder(s[0], s[1], i + 4)).join("")}
    </div>
    <p class="table-caption">Fig. 8 — Screenshots captured as part of Sprint 4 review. PNG files available in /screenshots/ directory.</p>
  </div>`;

  // ─── SOP ───────────────────────────────────────────────────────────────────
  const sopSection = `
  <div class="page-break section">
    <div class="section-header">
      <div class="section-number">09</div>
      <div class="section-title-block">
        <div class="section-title">Standard Operating Procedures</div>
        <div class="section-subtitle">Documented step-by-step operational protocols</div>
      </div>
    </div>
    ${data.sop.map(sop => `
    <div class="avoid-break" style="margin-bottom:24px;border:1px solid var(--border);border-radius:4px;overflow:hidden">
      <div style="background:var(--navy);color:white;padding:10px 16px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <span style="font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;font-weight:700;font-size:10pt">${sop.title}</span>
        </div>
        <span style="background:var(--gold);color:var(--navy);font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:7.5pt;font-weight:700;padding:3px 10px;border-radius:2px">${sop.id}</span>
      </div>
      <div style="padding:12px 16px;background:#F8FAFC;border-bottom:1px solid var(--border)">
        <span style="font-size:7.5pt;color:var(--grey);font-weight:600;text-transform:uppercase;letter-spacing:1px">Purpose:</span>
        <span style="font-size:8.5pt;color:var(--body);margin-left:8px">${sop.purpose}</span>
      </div>
      <div style="padding:14px 16px">
        ${sop.steps.map((step, i) => `
        <div class="sop-step">
          <div class="sop-step-number">${i + 1}</div>
          <div class="sop-step-text">${step}</div>
        </div>`).join("")}
      </div>
    </div>`).join("")}
  </div>`;

  // ─── INPUTS ────────────────────────────────────────────────────────────────
  const inputs = `
  <div class="page-break section">
    <div class="section-header">
      <div class="section-number">10</div>
      <div class="section-title-block">
        <div class="section-title">Inputs</div>
        <div class="section-subtitle">Data, system, and human inputs required for programme execution</div>
      </div>
    </div>
    <table class="avoid-break">
      <thead><tr><th>ID</th><th>Type</th><th>Source</th><th>Description</th><th>Format</th><th>Frequency</th><th>Volume</th></tr></thead>
      <tbody>
        ${data.inputs.map(i => `
        <tr>
          <td><strong>${i.id}</strong></td>
          <td><span class="badge badge-progress">${i.type}</span></td>
          <td>${i.source}</td>
          <td>${i.description}</td>
          <td style="font-family:Consolas,'Courier New',monospace;font-size:7.5pt">${i.format}</td>
          <td>${i.frequency}</td>
          <td>${i.volume}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    <p class="table-caption">Table 10.1 — Input Register · All inputs validated as part of Sprint 1 Data Quality Assessment</p>
  </div>`;

  // ─── OUTPUTS ───────────────────────────────────────────────────────────────
  const outputs = `
  <div class="page-break section">
    <div class="section-header">
      <div class="section-number">11</div>
      <div class="section-title-block">
        <div class="section-title">Outputs & Deliverables</div>
        <div class="section-subtitle">Programme deliverables, system outputs, and SLAs</div>
      </div>
    </div>
    <table class="avoid-break">
      <thead><tr><th>ID</th><th>Type</th><th>Destination</th><th>Description</th><th>Format</th><th>SLA / Acceptance</th></tr></thead>
      <tbody>
        ${data.outputs.map(o => `
        <tr>
          <td><strong>${o.id}</strong></td>
          <td><span class="badge badge-done">${o.type}</span></td>
          <td>${o.destination}</td>
          <td>${o.description}</td>
          <td style="font-family:Consolas,'Courier New',monospace;font-size:7.5pt">${o.format}</td>
          <td>${o.sla}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    <p class="table-caption">Table 11.1 — Output & Deliverable Register</p>
  </div>`;

  // ─── TOOLS ─────────────────────────────────────────────────────────────────
  const tools = `
  <div class="page-break section">
    <div class="section-header">
      <div class="section-number">12</div>
      <div class="section-title-block">
        <div class="section-title">Tools & Technology Stack</div>
        <div class="section-subtitle">Full technology inventory, versions, and licence ownership</div>
      </div>
    </div>
    <table class="avoid-break">
      <thead><tr><th>Category</th><th>Tool / Platform</th><th>Version</th><th>Purpose</th><th>Licences</th><th>Owner</th></tr></thead>
      <tbody>
        ${data.tools.map(t => `
        <tr>
          <td><strong>${t.category}</strong></td>
          <td>${t.name}</td>
          <td style="font-family:Consolas,'Courier New',monospace;font-size:7.5pt">${t.version}</td>
          <td>${t.purpose}</td>
          <td>${t.licences}</td>
          <td><span class="badge ${t.owner.includes("Meridian") ? "badge-confidential" : "badge-progress"}">${t.owner}</span></td>
        </tr>`).join("")}
      </tbody>
    </table>
    <p class="table-caption">Table 12.1 — Technology Inventory · Version information correct as of ${fmtDate(data.meta.lastUpdated)}</p>
  </div>`;

  // ─── RESPONSIBILITIES ──────────────────────────────────────────────────────
  const responsibilities = `
  <div class="page-break section">
    <div class="section-header">
      <div class="section-number">13</div>
      <div class="section-title-block">
        <div class="section-title">Responsibilities</div>
        <div class="section-subtitle">Role-based responsibility breakdown for all programme team members</div>
      </div>
    </div>
    ${data.responsibilities.map(r => `
    <div class="avoid-break" style="margin-bottom:16px;border:1px solid var(--border);border-radius:4px;overflow:hidden">
      <div style="background:var(--blue-light);border-left:4px solid var(--navy);padding:10px 14px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;font-weight:700;font-size:10pt;color:var(--navy)">${r.role}</div>
          <div style="font-size:8pt;color:var(--grey);margin-top:2px">${r.name}</div>
        </div>
        <span class="badge badge-confidential">${data.consultant.firm}</span>
      </div>
      <div style="padding:10px 14px">
        <ul style="margin:0">
          ${r.responsibilities.map(resp => `<li style="font-size:8.5pt;margin-bottom:4px">${resp}</li>`).join("")}
        </ul>
      </div>
    </div>`).join("")}
  </div>`;

  // ─── TIMELINE ──────────────────────────────────────────────────────────────
  const timelineSection = `
  <div class="page-break section">
    <div class="section-header">
      <div class="section-number">14</div>
      <div class="section-title-block">
        <div class="section-title">Timeline & Milestones</div>
        <div class="section-subtitle">Programme Gantt chart with phase status and milestone tracking</div>
      </div>
    </div>
    <div class="timeline-bar-container">${buildGanttSVG(data.timeline)}</div>
    <p class="table-caption" style="margin-top:8px">Fig. 14.1 — Programme Timeline · Red dashed line = Today (${fmtDate("2026-04-27")}). Diamonds = Phase milestones.</p>
    <h2>Milestone Register</h2>
    <table class="avoid-break">
      <thead><tr><th>Phase</th><th>Start</th><th>End</th><th>Milestone</th><th>Status</th></tr></thead>
      <tbody>
        ${data.timeline.map(t => `
        <tr>
          <td><strong>${t.phase}</strong></td>
          <td>${fmtDate(t.start)}</td>
          <td>${fmtDate(t.end)}</td>
          <td>${t.milestone}</td>
          <td>${statusBadge(t.status)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>`;

  // ─── RISKS ─────────────────────────────────────────────────────────────────
  const risks = `
  <div class="page-break section">
    <div class="section-header">
      <div class="section-number">15</div>
      <div class="section-title-block">
        <div class="section-title">Risk Register</div>
        <div class="section-subtitle">Programme risk log with probability, impact, mitigation, and ownership</div>
      </div>
    </div>
    <div class="info-grid-3">
      <div class="info-card" style="border-left-color:var(--red)"><div class="info-card-label">Critical / High Risks</div><div class="info-card-value">${data.risks.filter(r => r.rating === "Critical" || r.rating === "High").length}</div></div>
      <div class="info-card" style="border-left-color:var(--amber)"><div class="info-card-label">Open</div><div class="info-card-value">${data.risks.filter(r => r.status === "Open" || r.status === "Escalated").length}</div></div>
      <div class="info-card" style="border-left-color:var(--green)"><div class="info-card-label">Mitigated</div><div class="info-card-value">${data.risks.filter(r => r.status === "Mitigated").length}</div></div>
    </div>
    <table class="avoid-break">
      <thead><tr><th>ID</th><th>Category</th><th>Description</th><th>Prob.</th><th>Impact</th><th>Rating</th><th>Mitigation</th><th>Owner</th><th>Status</th></tr></thead>
      <tbody>
        ${data.risks.map(r => `
        <tr>
          <td><strong>${r.id}</strong></td>
          <td>${r.category}</td>
          <td>${r.description}</td>
          <td>${r.probability}</td>
          <td>${r.impact}</td>
          <td>${ratingBadge(r.rating)}</td>
          <td>${r.mitigation}</td>
          <td>${r.owner}</td>
          <td>${statusBadge(r.status)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    <p class="table-caption">Table 15.1 — Risk Register · Review dates per entry. Next risk review: ${fmtDate("2026-04-30")}</p>
  </div>`;

  // ─── ISSUES ────────────────────────────────────────────────────────────────
  const issues = `
  <div class="page-break section">
    <div class="section-header">
      <div class="section-number">16</div>
      <div class="section-title-block">
        <div class="section-title">Issue Log</div>
        <div class="section-subtitle">Active and resolved issues with impact, ownership, and resolution</div>
      </div>
    </div>
    <table class="avoid-break">
      <thead><tr><th>ID</th><th>Description</th><th>Impact</th><th>Raised</th><th>Owner</th><th>Status</th><th>Resolution</th></tr></thead>
      <tbody>
        ${data.issues.map(i => `
        <tr>
          <td><strong>${i.id}</strong></td>
          <td>${i.description}</td>
          <td>${i.impact}</td>
          <td>${fmtDate(i.raisedDate)}</td>
          <td>${i.owner}</td>
          <td>${statusBadge(i.status)}</td>
          <td>${i.resolution}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    <p class="table-caption">Table 16.1 — Issue Log · ${data.issues.filter(i => i.status !== "Resolved").length} issue(s) open as of ${fmtDate("2026-04-27")}</p>
  </div>`;

  // ─── QUALITY CHECKLIST ─────────────────────────────────────────────────────
  const qualityChecklist = `
  <div class="page-break section">
    <div class="section-header">
      <div class="section-number">17</div>
      <div class="section-title-block">
        <div class="section-title">Quality Checklist</div>
        <div class="section-subtitle">QA gate items, compliance checks, and training readiness</div>
      </div>
    </div>
    <table class="avoid-break">
      <thead><tr><th>Category</th><th>Quality Item</th><th>Required</th><th>Status</th></tr></thead>
      <tbody class="check-row">
        ${data.qualityChecklist.map(q => `
        <tr>
          <td><strong>${q.category}</strong></td>
          <td>${q.item}</td>
          <td style="text-align:center"><span class="check-icon">${q.required ? "✅" : "⬜"}</span></td>
          <td>${statusBadge(q.status)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    <p class="table-caption">Table 17.1 — Quality Gate Checklist · ${data.qualityChecklist.filter(q => q.status === "Done").length} of ${data.qualityChecklist.length} items complete</p>
  </div>`;

  // ─── TESTING ───────────────────────────────────────────────────────────────
  const testing = `
  <div class="page-break section">
    <div class="section-header">
      <div class="section-number">18</div>
      <div class="section-title-block">
        <div class="section-title">Testing Summary</div>
        <div class="section-subtitle">Test strategy, types, coverage, and defect summary</div>
      </div>
    </div>
    <div class="exec-summary-box">
      <p><strong>Test Strategy:</strong> ${data.testing.strategy}</p>
    </div>
    <div class="info-grid-3">
      <div class="info-card" style="border-left-color:var(--red)"><div class="info-card-label">P1 Critical Defects</div><div class="info-card-value">${data.testing.defectSummary.p1Critical}</div></div>
      <div class="info-card" style="border-left-color:var(--amber)"><div class="info-card-label">P2 Major Defects</div><div class="info-card-value">${data.testing.defectSummary.p2Major}</div></div>
      <div class="info-card" style="border-left-color:var(--green)"><div class="info-card-label">Closed Defects</div><div class="info-card-value">${data.testing.defectSummary.closed} / ${data.testing.defectSummary.totalFound}</div></div>
    </div>
    <h2>Test Types & Coverage</h2>
    <table class="avoid-break">
      <thead><tr><th>Test Type</th><th>Owner</th><th>Tool</th><th>Coverage</th><th>Status</th></tr></thead>
      <tbody>
        ${data.testing.types.map(t => `
        <tr>
          <td><strong>${t.type}</strong></td>
          <td>${t.owner}</td>
          <td style="font-family:Consolas,'Courier New',monospace;font-size:7.5pt">${t.tool}</td>
          <td>${t.coverage}</td>
          <td>${statusBadge(t.status)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>`;

  // ─── ACCEPTANCE CRITERIA ───────────────────────────────────────────────────
  const acceptance = `
  <div class="page-break section">
    <div class="section-header">
      <div class="section-number">19</div>
      <div class="section-title-block">
        <div class="section-title">Acceptance Criteria</div>
        <div class="section-subtitle">Formal acceptance criteria per deliverable — must be met for programme sign-off</div>
      </div>
    </div>
    <table class="avoid-break">
      <thead><tr><th>ID</th><th>Deliverable</th><th>Acceptance Criterion</th><th>Verified By</th><th>Status</th></tr></thead>
      <tbody>
        ${data.acceptanceCriteria.map(ac => `
        <tr>
          <td><strong>${ac.id}</strong></td>
          <td>${ac.deliverable}</td>
          <td>${ac.criterion}</td>
          <td>${ac.verifiedBy}</td>
          <td>${statusBadge(ac.status)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    <p class="table-caption">Table 19.1 — Acceptance Criteria Register · ${data.acceptanceCriteria.filter(a => a.status !== "Pending").length} of ${data.acceptanceCriteria.length} criteria in progress or complete</p>
  </div>`;

  // ─── COMMUNICATION PLAN ────────────────────────────────────────────────────
  const commsPlan = `
  <div class="page-break section">
    <div class="section-header">
      <div class="section-number">20</div>
      <div class="section-title-block">
        <div class="section-title">Communication Plan</div>
        <div class="section-subtitle">Stakeholder communication frequency, format, and channel matrix</div>
      </div>
    </div>
    <table class="avoid-break">
      <thead><tr><th>Audience</th><th>Format</th><th>Frequency</th><th>Owner</th><th>Channel</th><th>Distribution</th></tr></thead>
      <tbody>
        ${data.communicationPlan.map(c => `
        <tr>
          <td><strong>${c.audience}</strong></td>
          <td>${c.format}</td>
          <td>${c.frequency}</td>
          <td>${c.owner}</td>
          <td>${c.channel}</td>
          <td style="font-size:7.5pt">${c.distribution}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    <p class="table-caption">Table 20.1 — Communication Plan · Governed by Change Manager (${data.project.changeManager})</p>
  </div>`;

  // ─── HANDOVER NOTES ────────────────────────────────────────────────────────
  const handover = `
  <div class="page-break section">
    <div class="section-header">
      <div class="section-number">21</div>
      <div class="section-title-block">
        <div class="section-title">Handover Notes</div>
        <div class="section-subtitle">Knowledge transfer, operational readiness, and open items</div>
      </div>
    </div>
    <h2>Knowledge Transfer Activities</h2>
    <ul>${data.handoverNotes.knowledgeTransfer.map(k => `<li>${k}</li>`).join("")}</ul>
    <h2>Operational Readiness</h2>
    <ul>${data.handoverNotes.operationalReadiness.map(o => `<li>${o}</li>`).join("")}</ul>
    <h2>Open Items at Handover</h2>
    <div class="callout callout-warn">
      <div class="callout-icon">⚠️</div>
      <div class="callout-text">
        <ul style="margin:0;padding-left:16px">
          ${data.handoverNotes.openItems.map(i => `<li>${i}</li>`).join("")}
        </ul>
      </div>
    </div>
  </div>`;

  // ─── APPROVAL SIGN-OFF ─────────────────────────────────────────────────────
  const approvals = `
  <div class="page-break section">
    <div class="section-header">
      <div class="section-number">22</div>
      <div class="section-title-block">
        <div class="section-title">Approval Sign-off</div>
        <div class="section-subtitle">Formal programme acceptance — signature required from all designated authorities</div>
      </div>
    </div>
    <div class="callout callout-info">
      <div class="callout-icon">📋</div>
      <div class="callout-text">This document requires wet or digital signature from all approvers listed below before the programme can proceed to Go-Live. All signatures must be obtained no later than <strong>${fmtDate("2026-05-15")}</strong>.</div>
    </div>
    ${data.approvals.map(a => `
    <div class="approval-box avoid-break">
      <div class="approval-header">${a.role} — ${a.organisation}</div>
      <div class="approval-body">
        <div>
          <div class="approval-field-label">Full Name</div>
          <div style="font-size:9pt;font-weight:600;padding-top:6px">${a.name}</div>
        </div>
        <div>
          <div class="approval-field-label">Signature</div>
          <div class="approval-field-line"></div>
        </div>
        <div>
          <div class="approval-field-label">Date Signed</div>
          <div class="approval-field-line"></div>
        </div>
        <div>
          <div class="approval-field-label">Status</div>
          <div style="padding-top:6px">${statusBadge(a.status)}</div>
        </div>
      </div>
    </div>`).join("")}
  </div>`;

  // ─── APPENDIX ──────────────────────────────────────────────────────────────
  const appendix = `
  <div class="page-break section">
    <div class="section-header">
      <div class="section-number">A</div>
      <div class="section-title-block">
        <div class="section-title">Appendix A — Glossary</div>
        <div class="section-subtitle">Definitions of key terms and acronyms used throughout this document</div>
      </div>
    </div>
    <table class="avoid-break">
      <thead><tr><th>Term</th><th>Definition</th></tr></thead>
      <tbody>
        ${data.appendix.glossary.map(g => `<tr><td><strong>${g.term}</strong></td><td>${g.definition}</td></tr>`).join("")}
      </tbody>
    </table>
    <div class="page-break">
    <div class="section-header">
      <div class="section-number">B</div>
      <div class="section-title-block">
        <div class="section-title">Appendix B — References</div>
        <div class="section-subtitle">Source documents and references cited in this job card</div>
      </div>
    </div>
    <table class="avoid-break">
      <thead><tr><th>Reference</th><th>Description</th><th>Date</th></tr></thead>
      <tbody>
        ${data.appendix.references.map(r => `<tr><td><strong>${r.ref}</strong></td><td>${r.description}</td><td>${fmtDate(r.date)}</td></tr>`).join("")}
      </tbody>
    </table>
    </div>
  </div>`;

  // ─── FOOTER ────────────────────────────────────────────────────────────────
  const footer = `
  <div class="doc-footer">
    <span>${data.meta.documentId} · v${data.meta.version} · ${data.meta.classification}</span>
    <span>${data.consultant.firm} · ${data.project.client}</span>
    <span>Generated ${now}</span>
  </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.project.name} — Job Card · ${data.meta.documentId}</title>
  <style>${css}</style>
</head>
<body>
  <div class="watermark">CONFIDENTIAL</div>
  ${cover}
  <div style="padding: 40px 50px 20px; max-width: 900px; margin: 0 auto;">
    ${toc}
    ${docControl}
    ${execSummary}
    ${jobOverview}
    ${scope}
    ${stakeholders}
    ${raci}
    ${workflow}
    ${screenshots}
    ${sopSection}
    ${inputs}
    ${outputs}
    ${tools}
    ${responsibilities}
    ${timelineSection}
    ${risks}
    ${issues}
    ${qualityChecklist}
    ${testing}
    ${acceptance}
    ${commsPlan}
    ${handover}
    ${approvals}
    ${appendix}
    ${footer}
  </div>
</body>
</html>`;
}

module.exports = { buildHTML };
