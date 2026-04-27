"use strict";

const C = {
  navy:    "#0F172A",
  blue:    "#2563EB",
  blueLite:"#DBEAFE",
  purple:  "#7C3AED",
  green:   "#059669",
  amber:   "#D97706",
  red:     "#DC2626",
  cyan:    "#0891B2",
  slate:   "#475569",
  grey:    "#94A3B8",
  light:   "#F1F5F9",
  border:  "#CBD5E1",
  text:    "#1E293B",
  white:   "#FFFFFF",
};

/* ─────────────────────────────────────────────
   1. Screen Flow Map
   ───────────────────────────────────────────── */
function screenFlow() {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 720" class="diagram">
  <defs>
    <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${C.slate}"/>
    </marker>
    <linearGradient id="dashG" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${C.navy}"/><stop offset="1" stop-color="${C.blue}"/>
    </linearGradient>
  </defs>

  <!-- Title -->
  <text x="600" y="34" text-anchor="middle" font-size="20" font-weight="700" fill="${C.navy}" font-family="'Segoe UI', Arial">Screen Flow Map — Top-Level Navigation</text>
  <text x="600" y="56" text-anchor="middle" font-size="12" fill="${C.slate}" font-family="'Segoe UI', Arial">Solid arrows = primary navigation · Dashed = drill-down · Coloured groups = module</text>

  <!-- Login (entry) -->
  <g>
    <rect x="40"  y="100" width="180" height="60" rx="8" fill="url(#dashG)" stroke="${C.navy}"/>
    <text x="130" y="128" text-anchor="middle" fill="white" font-size="13" font-weight="700" font-family="'Segoe UI', Arial">/login</text>
    <text x="130" y="146" text-anchor="middle" fill="${C.blueLite}" font-size="10" font-family="'Segoe UI', Arial">Pick user · No password (demo)</text>
  </g>

  <!-- Dashboard (hub) -->
  <g>
    <rect x="290" y="90"  width="200" height="80" rx="8" fill="${C.navy}" stroke="${C.navy}"/>
    <text x="390" y="124" text-anchor="middle" fill="white" font-size="14" font-weight="700" font-family="'Segoe UI', Arial">/  Dashboard</text>
    <text x="390" y="144" text-anchor="middle" fill="${C.blueLite}" font-size="10" font-family="'Segoe UI', Arial">KPI tiles · Portfolio · Activity</text>
    <text x="390" y="158" text-anchor="middle" fill="${C.blueLite}" font-size="10" font-family="'Segoe UI', Arial">Onboarding checklist (admin)</text>
  </g>

  <!-- CRM cluster -->
  <g>
    <rect x="560" y="80" width="280" height="120" rx="10" fill="${C.light}" stroke="${C.purple}" stroke-width="1.5"/>
    <text x="700" y="98" text-anchor="middle" fill="${C.purple}" font-size="11" font-weight="700" font-family="'Segoe UI', Arial">CRM</text>
    <rect x="575" y="108" width="80" height="32" rx="4" fill="white" stroke="${C.purple}"/>
    <text x="615" y="128" text-anchor="middle" font-size="10" fill="${C.text}" font-family="'Segoe UI', Arial">/accounts</text>
    <rect x="660" y="108" width="80" height="32" rx="4" fill="white" stroke="${C.purple}"/>
    <text x="700" y="128" text-anchor="middle" font-size="10" fill="${C.text}" font-family="'Segoe UI', Arial">/prospects</text>
    <rect x="745" y="108" width="80" height="32" rx="4" fill="white" stroke="${C.purple}"/>
    <text x="785" y="128" text-anchor="middle" font-size="10" fill="${C.text}" font-family="'Segoe UI', Arial">/opportunities</text>
    <rect x="635" y="155" width="130" height="32" rx="4" fill="${C.purple}"/>
    <text x="700" y="175" text-anchor="middle" font-size="10" fill="white" font-weight="600" font-family="'Segoe UI', Arial">→ Convert to Project</text>
  </g>

  <!-- Projects -->
  <g>
    <rect x="900" y="80" width="240" height="120" rx="10" fill="${C.light}" stroke="${C.blue}" stroke-width="1.5"/>
    <text x="1020" y="98" text-anchor="middle" fill="${C.blue}" font-size="11" font-weight="700" font-family="'Segoe UI', Arial">PROJECT DELIVERY</text>
    <rect x="915"  y="108" width="100" height="32" rx="4" fill="white" stroke="${C.blue}"/>
    <text x="965"  y="128" text-anchor="middle" font-size="10" fill="${C.text}" font-family="'Segoe UI', Arial">/projects</text>
    <rect x="1025" y="108" width="100" height="32" rx="4" fill="white" stroke="${C.blue}"/>
    <text x="1075" y="128" text-anchor="middle" font-size="10" fill="${C.text}" font-family="'Segoe UI', Arial">/projects/:id</text>
    <rect x="945"  y="155" width="150" height="32" rx="4" fill="${C.blue}"/>
    <text x="1020" y="175" text-anchor="middle" font-size="10" fill="white" font-weight="600" font-family="'Segoe UI', Arial">Phases · Tasks · Allocations</text>
  </g>

  <!-- Resources -->
  <g>
    <rect x="560" y="240" width="280" height="120" rx="10" fill="${C.light}" stroke="${C.green}" stroke-width="1.5"/>
    <text x="700" y="258" text-anchor="middle" fill="${C.green}" font-size="11" font-weight="700" font-family="'Segoe UI', Arial">RESOURCE MANAGEMENT</text>
    <rect x="575" y="268" width="120" height="32" rx="4" fill="white" stroke="${C.green}"/>
    <text x="635" y="288" text-anchor="middle" font-size="10" fill="${C.text}" font-family="'Segoe UI', Arial">/resources</text>
    <rect x="700" y="268" width="125" height="32" rx="4" fill="white" stroke="${C.green}"/>
    <text x="762" y="288" text-anchor="middle" font-size="10" fill="${C.text}" font-family="'Segoe UI', Arial">Capacity Plan</text>
    <rect x="575" y="315" width="250" height="32" rx="4" fill="${C.green}"/>
    <text x="700" y="335" text-anchor="middle" font-size="10" fill="white" font-weight="600" font-family="'Segoe UI', Arial">Resource Requests · AI Suggestions</text>
  </g>

  <!-- Time -->
  <g>
    <rect x="900" y="240" width="240" height="120" rx="10" fill="${C.light}" stroke="${C.amber}" stroke-width="1.5"/>
    <text x="1020" y="258" text-anchor="middle" fill="${C.amber}" font-size="11" font-weight="700" font-family="'Segoe UI', Arial">TIME &amp; ATTENDANCE</text>
    <rect x="915"  y="268" width="100" height="32" rx="4" fill="white" stroke="${C.amber}"/>
    <text x="965"  y="288" text-anchor="middle" font-size="10" fill="${C.text}" font-family="'Segoe UI', Arial">/time</text>
    <rect x="1025" y="268" width="100" height="32" rx="4" fill="white" stroke="${C.amber}"/>
    <text x="1075" y="288" text-anchor="middle" font-size="10" fill="${C.text}" font-family="'Segoe UI', Arial">Time Off</text>
    <rect x="945"  y="315" width="150" height="32" rx="4" fill="${C.amber}"/>
    <text x="1020" y="335" text-anchor="middle" font-size="10" fill="white" font-weight="600" font-family="'Segoe UI', Arial">PM Approval Queue</text>
  </g>

  <!-- Finance -->
  <g>
    <rect x="290" y="400" width="280" height="130" rx="10" fill="${C.light}" stroke="${C.red}" stroke-width="1.5"/>
    <text x="430" y="418" text-anchor="middle" fill="${C.red}" font-size="11" font-weight="700" font-family="'Segoe UI', Arial">FINANCE</text>
    <rect x="305" y="428" width="80" height="32" rx="4" fill="white" stroke="${C.red}"/>
    <text x="345" y="448" text-anchor="middle" font-size="10" fill="${C.text}" font-family="'Segoe UI', Arial">Rate Cards</text>
    <rect x="390" y="428" width="80" height="32" rx="4" fill="white" stroke="${C.red}"/>
    <text x="430" y="448" text-anchor="middle" font-size="10" fill="${C.text}" font-family="'Segoe UI', Arial">Invoices</text>
    <rect x="475" y="428" width="80" height="32" rx="4" fill="white" stroke="${C.red}"/>
    <text x="515" y="448" text-anchor="middle" font-size="10" fill="${C.text}" font-family="'Segoe UI', Arial">Schedules</text>
    <rect x="345" y="475" width="170" height="32" rx="4" fill="${C.red}"/>
    <text x="430" y="495" text-anchor="middle" font-size="10" fill="white" font-weight="600" font-family="'Segoe UI', Arial">Auto-Draft on Milestone</text>
  </g>

  <!-- Reports -->
  <g>
    <rect x="630" y="400" width="240" height="130" rx="10" fill="${C.light}" stroke="${C.cyan}" stroke-width="1.5"/>
    <text x="750" y="418" text-anchor="middle" fill="${C.cyan}" font-size="11" font-weight="700" font-family="'Segoe UI', Arial">REPORTS &amp; ANALYTICS</text>
    <rect x="650" y="428" width="200" height="32" rx="4" fill="white" stroke="${C.cyan}"/>
    <text x="750" y="448" text-anchor="middle" font-size="10" fill="${C.text}" font-family="'Segoe UI', Arial">/reports</text>
    <rect x="650" y="475" width="200" height="32" rx="4" fill="${C.cyan}"/>
    <text x="750" y="495" text-anchor="middle" font-size="10" fill="white" font-weight="600" font-family="'Segoe UI', Arial">10+ pre-built reports · CSV/XLSX</text>
  </g>

  <!-- Admin -->
  <g>
    <rect x="930" y="400" width="220" height="130" rx="10" fill="${C.light}" stroke="${C.slate}" stroke-width="1.5"/>
    <text x="1040" y="418" text-anchor="middle" fill="${C.slate}" font-size="11" font-weight="700" font-family="'Segoe UI', Arial">ADMIN</text>
    <rect x="945"  y="428" width="90" height="32" rx="4" fill="white" stroke="${C.slate}"/>
    <text x="990"  y="448" text-anchor="middle" font-size="10" fill="${C.text}" font-family="'Segoe UI', Arial">Users</text>
    <rect x="1045" y="428" width="100" height="32" rx="4" fill="white" stroke="${C.slate}"/>
    <text x="1095" y="448" text-anchor="middle" font-size="10" fill="${C.text}" font-family="'Segoe UI', Arial">Templates</text>
    <rect x="945"  y="475" width="200" height="32" rx="4" fill="${C.slate}"/>
    <text x="1045" y="495" text-anchor="middle" font-size="10" fill="white" font-weight="600" font-family="'Segoe UI', Arial">Audit Log · Settings</text>
  </g>

  <!-- Client portal (separate) -->
  <g>
    <rect x="40" y="400" width="200" height="130" rx="10" fill="${C.light}" stroke="${C.grey}" stroke-width="1.5" stroke-dasharray="4,3"/>
    <text x="140" y="420" text-anchor="middle" fill="${C.slate}" font-size="11" font-weight="700" font-family="'Segoe UI', Arial">CUSTOMER PORTAL</text>
    <rect x="55" y="430" width="170" height="32" rx="4" fill="white" stroke="${C.grey}"/>
    <text x="140" y="450" text-anchor="middle" font-size="10" fill="${C.text}" font-family="'Segoe UI', Arial">/portal/:projectId</text>
    <rect x="55" y="475" width="170" height="32" rx="4" fill="${C.grey}"/>
    <text x="140" y="495" text-anchor="middle" font-size="10" fill="white" font-weight="600" font-family="'Segoe UI', Arial">Read-only · Status · Milestones</text>
  </g>

  <!-- Arrows (login → dashboard, dashboard → modules) -->
  <line x1="220" y1="130" x2="285" y2="130" stroke="${C.slate}" stroke-width="1.5" marker-end="url(#arr)"/>
  <line x1="490" y1="120" x2="555" y2="120" stroke="${C.slate}" stroke-width="1.5" marker-end="url(#arr)"/>
  <line x1="490" y1="135" x2="895" y2="135" stroke="${C.slate}" stroke-width="1.5" marker-end="url(#arr)"/>
  <line x1="390" y1="170" x2="700" y2="235" stroke="${C.slate}" stroke-width="1.5" marker-end="url(#arr)"/>
  <line x1="450" y1="170" x2="1020" y2="235" stroke="${C.slate}" stroke-width="1.5" marker-end="url(#arr)"/>
  <line x1="390" y1="170" x2="430" y2="395" stroke="${C.slate}" stroke-width="1.5" marker-end="url(#arr)"/>
  <line x1="430" y1="170" x2="750" y2="395" stroke="${C.slate}" stroke-width="1.5" marker-end="url(#arr)"/>
  <line x1="450" y1="170" x2="1040" y2="395" stroke="${C.slate}" stroke-width="1.5" marker-end="url(#arr)"/>

  <!-- CRM → Projects (convert flow) -->
  <line x1="765" y1="171" x2="945" y2="171" stroke="${C.purple}" stroke-width="2" marker-end="url(#arr)" stroke-dasharray="5,3"/>
  <text x="855" y="165" text-anchor="middle" font-size="9" fill="${C.purple}" font-weight="600" font-family="'Segoe UI', Arial">opp.convert()</text>

  <!-- Resources ↔ Projects -->
  <line x1="1020" y1="200" x2="700" y2="240" stroke="${C.green}" stroke-width="1.5" marker-end="url(#arr)" stroke-dasharray="5,3"/>

  <!-- Time → Finance (invoice trigger) -->
  <line x1="1020" y1="360" x2="430" y2="400" stroke="${C.red}" stroke-width="1.5" marker-end="url(#arr)" stroke-dasharray="5,3"/>

  <!-- Login → Portal -->
  <line x1="130" y1="160" x2="140" y2="395" stroke="${C.slate}" stroke-width="1.5" marker-end="url(#arr)" stroke-dasharray="4,3"/>

  <!-- Legend -->
  <g transform="translate(40, 600)">
    <rect width="1120" height="100" rx="6" fill="${C.light}" stroke="${C.border}"/>
    <text x="20" y="22" font-size="11" font-weight="700" fill="${C.navy}" font-family="'Segoe UI', Arial">LEGEND</text>
    <line x1="20"  y1="44" x2="60" y2="44" stroke="${C.slate}" stroke-width="1.5" marker-end="url(#arr)"/>
    <text x="68" y="48" font-size="10" fill="${C.text}" font-family="'Segoe UI', Arial">Primary navigation</text>
    <line x1="200" y1="44" x2="240" y2="44" stroke="${C.slate}" stroke-width="1.5" marker-end="url(#arr)" stroke-dasharray="5,3"/>
    <text x="248" y="48" font-size="10" fill="${C.text}" font-family="'Segoe UI', Arial">Cross-module data flow</text>
    <rect x="400" y="36" width="20" height="14" fill="${C.purple}"/><text x="428" y="48" font-size="10" font-family="'Segoe UI', Arial">CRM</text>
    <rect x="470" y="36" width="20" height="14" fill="${C.blue}"/><text x="498" y="48" font-size="10" font-family="'Segoe UI', Arial">Projects</text>
    <rect x="555" y="36" width="20" height="14" fill="${C.green}"/><text x="583" y="48" font-size="10" font-family="'Segoe UI', Arial">Resources</text>
    <rect x="650" y="36" width="20" height="14" fill="${C.amber}"/><text x="678" y="48" font-size="10" font-family="'Segoe UI', Arial">Time</text>
    <rect x="720" y="36" width="20" height="14" fill="${C.red}"/><text x="748" y="48" font-size="10" font-family="'Segoe UI', Arial">Finance</text>
    <rect x="790" y="36" width="20" height="14" fill="${C.cyan}"/><text x="818" y="48" font-size="10" font-family="'Segoe UI', Arial">Reports</text>
    <rect x="865" y="36" width="20" height="14" fill="${C.slate}"/><text x="893" y="48" font-size="10" font-family="'Segoe UI', Arial">Admin</text>
    <text x="20"  y="78" font-size="10" fill="${C.slate}" font-family="'Segoe UI', Arial">Note: All routes are protected by RBAC. Visibility of menu items adapts to the user's active role.</text>
  </g>
</svg>`;
}

/* ─────────────────────────────────────────────
   2. Workflow swim-lane diagram (per workflow)
   ───────────────────────────────────────────── */
function workflowDiagram(wf, idx) {
  const W = 1120, stepW = 150, stepH = 64;
  const gap  = 24;
  const startX = 40;
  const y = 110;
  const total = wf.steps.length * (stepW + gap) - gap;
  const offsetX = Math.max(40, (W - total) / 2);

  const actorColours = {
    "Sales": C.purple,
    "PM":    C.blue,
    "System":C.slate,
    "Consultant": C.amber,
    "Resource Manager": C.green,
    "Finance": C.red,
  };

  const stepBoxes = wf.steps.map((s, i) => {
    const x = offsetX + i * (stepW + gap);
    const colour = actorColours[s.actor] || C.slate;
    return `
      <g>
        <rect x="${x}" y="${y}" width="${stepW}" height="${stepH}" rx="8" fill="white" stroke="${colour}" stroke-width="1.5"/>
        <rect x="${x}" y="${y}" width="${stepW}" height="20" rx="8" fill="${colour}"/>
        <rect x="${x}" y="${y+10}" width="${stepW}" height="10" fill="${colour}"/>
        <text x="${x + stepW/2}" y="${y + 14}" text-anchor="middle" font-size="10" font-weight="700" fill="white" font-family="'Segoe UI', Arial">${s.actor}</text>
        <text x="${x + stepW/2}" y="${y + 38}" text-anchor="middle" font-size="11" font-weight="600" fill="${C.text}" font-family="'Segoe UI', Arial">${escape(s.action)}</text>
        <text x="${x + stepW/2}" y="${y + 56}" text-anchor="middle" font-size="9" fill="${C.slate}" font-family="'Segoe UI', Arial">${escape(s.detail.slice(0, 38))}</text>
      </g>`;
  }).join("");

  const arrows = wf.steps.slice(0, -1).map((_, i) => {
    const x1 = offsetX + (i+1) * stepW + i * gap;
    const x2 = x1 + gap;
    return `<line x1="${x1}" y1="${y + stepH/2}" x2="${x2 - 2}" y2="${y + stepH/2}" stroke="${C.slate}" stroke-width="1.5" marker-end="url(#wfarr-${idx})"/>`;
  }).join("");

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 220" class="diagram">
  <defs>
    <marker id="wfarr-${idx}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${C.slate}"/>
    </marker>
  </defs>
  <text x="${W/2}" y="32" text-anchor="middle" font-size="16" font-weight="700" fill="${C.navy}" font-family="'Segoe UI', Arial">${escape(wf.name)}</text>
  <text x="${W/2}" y="54" text-anchor="middle" font-size="11" fill="${C.slate}" font-family="'Segoe UI', Arial">${escape(wf.description)}</text>
  ${arrows}
  ${stepBoxes}
</svg>`;
}

/* ─────────────────────────────────────────────
   3. Persona / role hierarchy
   ───────────────────────────────────────────── */
function rbacDiagram() {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1120 380" class="diagram">
  <text x="560" y="30" text-anchor="middle" font-size="18" font-weight="700" fill="${C.navy}" font-family="'Segoe UI', Arial">Role Hierarchy &amp; Access Scope</text>
  <text x="560" y="50" text-anchor="middle" font-size="11" fill="${C.slate}" font-family="'Segoe UI', Arial">4-role canonical RBAC model — server-side enforced</text>

  <!-- Account Admin (top) -->
  <g>
    <rect x="380" y="80" width="360" height="80" rx="10" fill="${C.navy}" stroke="${C.navy}"/>
    <text x="560" y="108" text-anchor="middle" fill="white" font-size="15" font-weight="700" font-family="'Segoe UI', Arial">Account Admin</text>
    <text x="560" y="128" text-anchor="middle" fill="${C.blueLite}" font-size="10" font-family="'Segoe UI', Arial">Full access · Org settings · User mgmt</text>
    <text x="560" y="144" text-anchor="middle" fill="${C.blueLite}" font-size="10" font-family="'Segoe UI', Arial">Cost rates · Audit log · All financials</text>
  </g>

  <!-- Super User -->
  <g>
    <rect x="380" y="190" width="360" height="80" rx="10" fill="${C.blue}" stroke="${C.blue}"/>
    <text x="560" y="218" text-anchor="middle" fill="white" font-size="15" font-weight="700" font-family="'Segoe UI', Arial">Super User (PM / Finance)</text>
    <text x="560" y="238" text-anchor="middle" fill="${C.blueLite}" font-size="10" font-family="'Segoe UI', Arial">Projects · Allocations · Approvals · Invoices</text>
    <text x="560" y="254" text-anchor="middle" fill="${C.blueLite}" font-size="10" font-family="'Segoe UI', Arial">Reports · Bill rates (no cost rates)</text>
  </g>

  <!-- Collaborator -->
  <g>
    <rect x="100" y="300" width="320" height="60" rx="10" fill="${C.amber}" stroke="${C.amber}"/>
    <text x="260" y="324" text-anchor="middle" fill="white" font-size="14" font-weight="700" font-family="'Segoe UI', Arial">Collaborator</text>
    <text x="260" y="344" text-anchor="middle" fill="white" font-size="10" font-family="'Segoe UI', Arial">My time · My allocations · My tasks · Time off</text>
  </g>

  <!-- Customer -->
  <g>
    <rect x="700" y="300" width="320" height="60" rx="10" fill="${C.slate}" stroke="${C.slate}"/>
    <text x="860" y="324" text-anchor="middle" fill="white" font-size="14" font-weight="700" font-family="'Segoe UI', Arial">Customer</text>
    <text x="860" y="344" text-anchor="middle" fill="white" font-size="10" font-family="'Segoe UI', Arial">Read-only portal · Status · Milestones · CSAT</text>
  </g>

  <line x1="560" y1="160" x2="560" y2="190" stroke="${C.border}" stroke-width="2"/>
  <line x1="380" y1="270" x2="260" y2="300" stroke="${C.border}" stroke-width="1.5"/>
  <line x1="740" y1="270" x2="860" y2="300" stroke="${C.border}" stroke-width="1.5"/>
</svg>`;
}

/* ─────────────────────────────────────────────
   4. Wireframe mockups (clearly labelled WIREFRAME)
   ───────────────────────────────────────────── */
function wireframe(label, content) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 600" class="wireframe">
  <rect width="1100" height="600" fill="white" stroke="${C.border}"/>
  <!-- Browser chrome -->
  <rect x="0" y="0" width="1100" height="34" fill="${C.light}" stroke="${C.border}"/>
  <circle cx="16" cy="17" r="6" fill="#FF5F57"/>
  <circle cx="34" cy="17" r="6" fill="#FEBC2E"/>
  <circle cx="52" cy="17" r="6" fill="#28C840"/>
  <rect x="80" y="8" width="900" height="18" rx="4" fill="white" stroke="${C.border}"/>
  <text x="92" y="21" font-size="10" fill="${C.slate}" font-family="'Segoe UI', Arial">businessnow.ksap.io${label.url}</text>
  <text x="1030" y="21" font-size="9" fill="${C.grey}" font-weight="600" font-family="'Segoe UI', Arial">WIREFRAME</text>

  <!-- Sidebar -->
  <rect x="0" y="34" width="200" height="566" fill="${C.navy}"/>
  <text x="20" y="64" font-size="13" font-weight="700" fill="white" font-family="'Segoe UI', Arial">B  BusinessNow</text>
  ${["Dashboard","Projects","Accounts","Opportunities","Resources","Time","Finance","Reports","Admin"].map((m, i) =>
    `<text x="24" y="${108 + i*30}" font-size="11" fill="${m === label.activeNav ? "white" : "#94A3B8"}" font-weight="${m === label.activeNav ? 700 : 400}" font-family="'Segoe UI', Arial">${m === label.activeNav ? "▸ " : "  "}${m}</text>`
  ).join("")}

  <!-- Content header -->
  <rect x="200" y="34" width="900" height="60" fill="white" stroke="${C.border}"/>
  <text x="220" y="65" font-size="18" font-weight="700" fill="${C.navy}" font-family="'Segoe UI', Arial">${label.title}</text>
  <text x="220" y="84" font-size="11" fill="${C.slate}" font-family="'Segoe UI', Arial">${label.subtitle}</text>

  ${content}
</svg>`;
}

function dashboardWireframe() {
  const cards = [
    { label: "Active Projects", value: "47", color: C.blue },
    { label: "Billable Util.",  value: "78.4%", color: C.green },
    { label: "Open Pipeline",   value: "$8.2M", color: C.purple },
    { label: "Overdue Invoices",value: "$340K", color: C.red },
  ];
  const cardsSvg = cards.map((c, i) => `
    <g transform="translate(${230 + i * 200}, 120)">
      <rect width="180" height="90" rx="8" fill="white" stroke="${C.border}"/>
      <rect width="6" height="90" rx="3" fill="${c.color}"/>
      <text x="20" y="30" font-size="10" fill="${C.slate}" font-family="'Segoe UI', Arial">${c.label}</text>
      <text x="20" y="62" font-size="22" font-weight="700" fill="${C.navy}" font-family="'Segoe UI', Arial">${c.value}</text>
      <text x="20" y="80" font-size="9" fill="${C.green}" font-family="'Segoe UI', Arial">▲ vs last month</text>
    </g>`).join("");

  // Chart
  const chart = `
    <g transform="translate(230, 230)">
      <rect width="560" height="220" rx="8" fill="white" stroke="${C.border}"/>
      <text x="20" y="26" font-size="12" font-weight="700" fill="${C.navy}" font-family="'Segoe UI', Arial">Portfolio Health Trend</text>
      <line x1="20" y1="180" x2="540" y2="180" stroke="${C.border}"/>
      ${[40,30,55,45,75,60,85,70,90,80,95,88].map((h,i) =>
        `<rect x="${30 + i*40}" y="${180-h*1.5}" width="28" height="${h*1.5}" fill="${C.blue}" opacity="${0.4 + i*0.05}"/>`
      ).join("")}
    </g>`;

  // Onboarding card
  const onboarding = `
    <g transform="translate(810, 230)">
      <rect width="270" height="220" rx="8" fill="${C.blueLite}" stroke="${C.blue}"/>
      <text x="20" y="26" font-size="12" font-weight="700" fill="${C.navy}" font-family="'Segoe UI', Arial">Onboarding (Admin)</text>
      ${["✓ Add team members (10/3)","✓ Create first project","○ Allocate consultants","○ Submit a timesheet"].map((t,i) =>
        `<text x="20" y="${60 + i*30}" font-size="10" fill="${i<2 ? C.green : C.slate}" font-family="'Segoe UI', Arial">${t}</text>`
      ).join("")}
      <rect x="20" y="180" width="80" height="24" rx="4" fill="white" stroke="${C.blue}"/>
      <text x="60" y="196" text-anchor="middle" font-size="9" fill="${C.blue}" font-family="'Segoe UI', Arial">Dismiss</text>
    </g>`;

  return cardsSvg + chart + onboarding +
    `<g transform="translate(230, 470)">
      <rect width="850" height="110" rx="8" fill="white" stroke="${C.border}"/>
      <text x="20" y="26" font-size="12" font-weight="700" fill="${C.navy}" font-family="'Segoe UI', Arial">Recent Activity</text>
      ${["Marcus W. converted Phoenix opp → project","Amara D. submitted timesheet for review","System auto-drafted INV-1042 (milestone)","Resource request RR-088 fulfilled"].map((t,i) =>
        `<text x="20" y="${52 + i*16}" font-size="10" fill="${C.slate}" font-family="'Segoe UI', Arial">• ${t}</text>`
      ).join("")}
    </g>`;
}

function projectsWireframe() {
  // Filter row
  const filters = `
    <g transform="translate(220, 110)">
      <rect width="200" height="32" rx="4" fill="white" stroke="${C.border}"/>
      <text x="10" y="20" font-size="10" fill="${C.grey}" font-family="'Segoe UI', Arial">🔍 Search projects…</text>
      ${["All","On Track","At Risk","Off Track"].map((t,i) =>
        `<g transform="translate(${210 + i*90}, 0)"><rect width="80" height="32" rx="4" fill="${i===0 ? C.navy : "white"}" stroke="${C.border}"/><text x="40" y="20" text-anchor="middle" font-size="10" fill="${i===0 ? "white" : C.text}" font-family="'Segoe UI', Arial">${t}</text></g>`
      ).join("")}
      <g transform="translate(770, 0)"><rect width="100" height="32" rx="4" fill="${C.blue}"/><text x="50" y="20" text-anchor="middle" font-size="10" fill="white" font-weight="600" font-family="'Segoe UI', Arial">+ New Project</text></g>
    </g>`;

  // Table header
  const tbl = `
    <g transform="translate(220, 160)">
      <rect width="860" height="34" fill="${C.light}" stroke="${C.border}"/>
      ${["Project","Client","PM","Health","Phase","Budget","Progress",""].map((c,i) => {
        const widths = [200,140,120,80,100,90,100,30]; const starts = widths.reduce((a,_,j)=>{a.push((a[j-1]||0)+(widths[j-1]||0));return a;},[0]);
        return `<text x="${starts[i]+10}" y="22" font-size="10" font-weight="700" fill="${C.navy}" font-family="'Segoe UI', Arial">${c}</text>`;
      }).join("")}
    </g>`;

  // Rows
  const rows = [
    { p:"Phoenix CRM", c:"TechNova",     pm:"M. Webb",   h:"On Track",  hc:C.green,  ph:"Build",  b:"$4.8M",  pr:62 },
    { p:"Atlas ERP",   c:"Global Bank",  pm:"M. Webb",   h:"At Risk",   hc:C.amber,  ph:"Design", b:"$2.1M",  pr:34 },
    { p:"Helios DW",   c:"MedCo",        pm:"L. Hassan", h:"Off Track", hc:C.red,    ph:"Disc.",  b:"$880K",  pr:12 },
    { p:"Orion Mig.",  c:"FinServ Ltd",  pm:"L. Hassan", h:"On Track",  hc:C.green,  ph:"UAT",    b:"$1.4M",  pr:88 },
    { p:"Vega CMS",    c:"PressGroup",   pm:"M. Webb",   h:"On Track",  hc:C.green,  ph:"Build",  b:"$650K",  pr:55 },
    { p:"Lyra Ana.",   c:"RetailHub",    pm:"L. Hassan", h:"At Risk",   hc:C.amber,  ph:"Build",  b:"$1.2M",  pr:42 },
  ].map((r,i) => `
    <g transform="translate(220, ${198 + i*42})">
      <rect width="860" height="40" fill="${i%2===0 ? "white" : C.light}" stroke="${C.border}"/>
      <text x="10"  y="24" font-size="11" font-weight="600" fill="${C.text}" font-family="'Segoe UI', Arial">${r.p}</text>
      <text x="210" y="24" font-size="10" fill="${C.slate}" font-family="'Segoe UI', Arial">${r.c}</text>
      <text x="350" y="24" font-size="10" fill="${C.slate}" font-family="'Segoe UI', Arial">${r.pm}</text>
      <rect x="470" y="13" width="70" height="18" rx="9" fill="${r.hc}" opacity="0.18"/>
      <text x="505" y="25" text-anchor="middle" font-size="9" font-weight="700" fill="${r.hc}" font-family="'Segoe UI', Arial">${r.h}</text>
      <text x="550" y="24" font-size="10" fill="${C.text}" font-family="'Segoe UI', Arial">${r.ph}</text>
      <text x="650" y="24" font-size="10" fill="${C.text}" font-family="'Segoe UI', Arial">${r.b}</text>
      <rect x="740" y="16" width="80" height="8" rx="4" fill="${C.border}"/>
      <rect x="740" y="16" width="${r.pr*0.8}" height="8" rx="4" fill="${C.blue}"/>
      <text x="830" y="24" font-size="9" fill="${C.slate}" font-family="'Segoe UI', Arial">${r.pr}%</text>
    </g>`).join("");

  return filters + tbl + rows;
}

function timesheetWireframe() {
  const days = ["Mon 4/20","Tue 4/21","Wed 4/22","Thu 4/23","Fri 4/24","Sat","Sun","Total"];
  // Header
  const hdr = `
    <g transform="translate(220, 110)">
      <rect width="860" height="40" fill="${C.navy}"/>
      <text x="20" y="26" font-size="11" font-weight="700" fill="white" font-family="'Segoe UI', Arial">Project / Task</text>
      ${days.map((d,i) => `<text x="${290 + i*72}" y="26" text-anchor="middle" font-size="10" fill="white" font-family="'Segoe UI', Arial">${d}</text>`).join("")}
    </g>`;

  const rows = [
    { p:"Phoenix CRM — Build",    h:[8,7.5,8,8,6,0,0] },
    { p:"Atlas ERP — Design",     h:[0,0.5,0,0,2,0,0] },
    { p:"Internal — Training",    h:[0,0,0,0,0.5,0,0] },
    { p:"Phoenix CRM — Workshop", h:[0,0,0,0,1,0,0] },
  ].map((r,i) => {
    const total = r.h.reduce((a,b)=>a+b,0);
    return `
      <g transform="translate(220, ${150 + i*42})">
        <rect width="860" height="40" fill="${i%2===0 ? "white" : C.light}" stroke="${C.border}"/>
        <text x="20" y="24" font-size="10" font-weight="600" fill="${C.text}" font-family="'Segoe UI', Arial">${r.p}</text>
        ${r.h.map((h,j) => `
          <rect x="${260 + j*72}" y="8" width="60" height="24" rx="4" fill="white" stroke="${C.border}"/>
          <text x="${290 + j*72}" y="24" text-anchor="middle" font-size="11" fill="${h>0 ? C.text : C.grey}" font-family="'Segoe UI', Arial">${h>0 ? h.toFixed(1) : "—"}</text>`).join("")}
        <text x="${290 + 7*72}" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="${C.navy}" font-family="'Segoe UI', Arial">${total.toFixed(1)}</text>
      </g>`;
  }).join("");

  // Footer total + actions
  const footer = `
    <g transform="translate(220, 360)">
      <rect width="860" height="44" fill="${C.light}" stroke="${C.border}"/>
      <text x="20" y="28" font-size="11" font-weight="700" fill="${C.navy}" font-family="'Segoe UI', Arial">Week Total: 41.5 h  ·  Billable: 38.5 h  ·  Util: 96%</text>
      <g transform="translate(580, 8)">
        <rect width="120" height="28" rx="4" fill="white" stroke="${C.blue}"/>
        <text x="60" y="18" text-anchor="middle" font-size="10" fill="${C.blue}" font-weight="600" font-family="'Segoe UI', Arial">Import Allocations</text>
      </g>
      <g transform="translate(710, 8)">
        <rect width="80" height="28" rx="4" fill="white" stroke="${C.border}"/>
        <text x="40" y="18" text-anchor="middle" font-size="10" fill="${C.text}" font-family="'Segoe UI', Arial">Save Draft</text>
      </g>
      <g transform="translate(800, 8)">
        <rect width="60" height="28" rx="4" fill="${C.green}"/>
        <text x="30" y="18" text-anchor="middle" font-size="10" fill="white" font-weight="700" font-family="'Segoe UI', Arial">Submit</text>
      </g>
    </g>`;

  // AI assistant card
  const ai = `
    <g transform="translate(220, 420)">
      <rect width="860" height="160" rx="8" fill="${C.blueLite}" stroke="${C.blue}"/>
      <text x="20" y="26" font-size="12" font-weight="700" fill="${C.navy}" font-family="'Segoe UI', Arial">⚡ AI Time Assistant — 3 suggestions</text>
      ${[
        ["Phoenix CRM — Standup", "Mon 9:00–9:30", "0.5 h"],
        ["Atlas ERP — Workshop",  "Wed 14:00–16:00", "2.0 h"],
        ["Internal — All Hands",  "Fri 10:00–11:00", "1.0 h"],
      ].map((s,i) => `
        <g transform="translate(20, ${50 + i*32})">
          <rect width="820" height="28" rx="4" fill="white" stroke="${C.border}"/>
          <text x="14" y="18" font-size="10" fill="${C.text}" font-family="'Segoe UI', Arial">${s[0]}</text>
          <text x="380" y="18" font-size="10" fill="${C.slate}" font-family="'Segoe UI', Arial">${s[1]}</text>
          <text x="600" y="18" font-size="10" font-weight="700" fill="${C.text}" font-family="'Segoe UI', Arial">${s[2]}</text>
          <g transform="translate(700, 4)"><rect width="50" height="20" rx="3" fill="${C.green}"/><text x="25" y="14" text-anchor="middle" font-size="9" fill="white" font-weight="600" font-family="'Segoe UI', Arial">Accept</text></g>
          <g transform="translate(755, 4)"><rect width="50" height="20" rx="3" fill="white" stroke="${C.border}"/><text x="25" y="14" text-anchor="middle" font-size="9" fill="${C.slate}" font-family="'Segoe UI', Arial">Dismiss</text></g>
        </g>`).join("")}
    </g>`;

  return hdr + rows + footer + ai;
}

function resourcesWireframe() {
  // Capacity grid
  const weeks = Array.from({length:12}, (_,i) => `W${i+18}`);
  const people = [
    { n:"Amara D.",     u:[60,70,80,90,100,110,90,80,70,60,50,40] },
    { n:"Daniel O.",    u:[80,80,85,80,75,70,75,80,80,85,80,75] },
    { n:"Leila H.",     u:[90,95,100,110,105,100,95,90,85,80,75,70] },
    { n:"Priya N.",     u:[40,50,60,70,80,90,95,90,80,70,60,50] },
    { n:"Raj K.",       u:[70,75,80,85,90,95,90,85,80,75,70,65] },
    { n:"Sophie L.",    u:[60,65,70,75,80,85,85,80,75,70,65,60] },
    { n:"Placeholder",  u:[0,20,40,60,80,100,80,60,40,20,0,0] },
  ];

  const colour = u => u >= 100 ? C.red : u >= 85 ? C.amber : u >= 60 ? C.green : C.blueLite;

  const hdrRow = `
    <g transform="translate(220, 110)">
      <rect width="860" height="32" fill="${C.navy}"/>
      <text x="20" y="20" font-size="10" font-weight="700" fill="white" font-family="'Segoe UI', Arial">Consultant</text>
      ${weeks.map((w,i) => `<text x="${175 + i*55}" y="20" text-anchor="middle" font-size="9" fill="white" font-family="'Segoe UI', Arial">${w}</text>`).join("")}
    </g>`;

  const grid = people.map((p,i) => `
    <g transform="translate(220, ${142 + i*36})">
      <rect width="150" height="32" fill="${i%2===0 ? "white" : C.light}" stroke="${C.border}"/>
      <text x="14" y="20" font-size="10" font-weight="600" fill="${C.text}" font-family="'Segoe UI', Arial">${p.n}</text>
      ${p.u.map((u,j) => `
        <rect x="${150 + j*55}" y="0" width="55" height="32" fill="${colour(u)}" stroke="${C.border}" opacity="${u/120}"/>
        <text x="${177 + j*55}" y="20" text-anchor="middle" font-size="9" font-weight="600" fill="${u>=100 ? "white" : C.text}" font-family="'Segoe UI', Arial">${u}%</text>
      `).join("")}
    </g>`).join("");

  // AI suggestions panel
  const ai = `
    <g transform="translate(220, 410)">
      <rect width="860" height="170" rx="8" fill="white" stroke="${C.border}"/>
      <text x="20" y="28" font-size="12" font-weight="700" fill="${C.navy}" font-family="'Segoe UI', Arial">🧠 AI Suggestions for "Salesforce Lead — Phoenix CRM"</text>
      ${[
        { n:"Daniel Osei",    s:92, c:"Top",     why:"Salesforce certified · 75% capacity available" },
        { n:"Priya Nair",     s:85, c:"",        why:"Strong CRM background · 60% capacity" },
        { n:"Raj Krishnamurthy",s:78,c:"",        why:"Data integration skills · 40% capacity" },
      ].map((s,i) => `
        <g transform="translate(${20 + i*280}, 50)">
          <rect width="270" height="100" rx="6" fill="${C.light}" stroke="${i===0 ? C.green : C.border}" stroke-width="${i===0 ? 2 : 1}"/>
          <text x="14" y="22" font-size="11" font-weight="700" fill="${C.text}" font-family="'Segoe UI', Arial">${s.n}</text>
          ${s.c ? `<rect x="220" y="10" width="38" height="16" rx="8" fill="${C.green}"/><text x="239" y="22" text-anchor="middle" font-size="9" font-weight="700" fill="white" font-family="'Segoe UI', Arial">${s.c}</text>` : ""}
          <text x="14" y="44" font-size="20" font-weight="700" fill="${C.green}" font-family="'Segoe UI', Arial">${s.s}</text>
          <text x="50" y="44" font-size="9" fill="${C.slate}" font-family="'Segoe UI', Arial">/ 100 composite</text>
          <text x="14" y="78" font-size="9" fill="${C.slate}" font-family="'Segoe UI', Arial">${s.why}</text>
        </g>`).join("")}
    </g>`;

  return hdrRow + grid + ai;
}

function escape(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

module.exports = {
  screenFlow,
  workflowDiagram,
  rbacDiagram,
  wireframe,
  dashboardWireframe,
  projectsWireframe,
  timesheetWireframe,
  resourcesWireframe,
};
