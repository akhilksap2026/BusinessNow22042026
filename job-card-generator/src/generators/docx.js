"use strict";

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType,
  PageBreak, Header, Footer,
  NumberFormat, convertInchesToTwip, convertMillimetersToTwip,
  PageNumberElement, PageNumberType,
} = require("docx");

const NAVY   = "1B2A4A";
const GOLD   = "C9A84C";
const BLUE   = "2D6A9F";
const LIGHT  = "EBF3FB";
const GREEN  = "059669";
const RED    = "DC2626";
const AMBER  = "D97706";
const GREY   = "64748B";
const WHITE  = "FFFFFF";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric",
  });
}
function fmtCurrency(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

// ── Typography helpers ──────────────────────────────────────────────────────

function run(text, opts = {}) {
  return new TextRun({
    text: String(text),
    font: opts.heading ? "Raleway" : "Source Sans 3",
    size: (opts.size || 10) * 2,
    bold: opts.bold || false,
    italics: opts.italic || false,
    color: opts.color || "1E293B",
    highlight: opts.highlight || undefined,
    underline: opts.underline ? {} : undefined,
    break: opts.break || 0,
  });
}

function para(runs, opts = {}) {
  return new Paragraph({
    children: Array.isArray(runs) ? runs : [runs],
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: (opts.before || 80), after: (opts.after || 80) },
    indent: opts.indent ? { left: convertInchesToTwip(opts.indent) } : undefined,
    heading: opts.heading || undefined,
  });
}

function heading1(text) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: "Raleway",
        size: 28,
        bold: true,
        color: WHITE,
      }),
    ],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 200, after: 100 },
    shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
  });
}

function heading2(text) {
  return new Paragraph({
    children: [
      new TextRun({ text, font: "Raleway", size: 22, bold: true, color: NAVY }),
    ],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 180, after: 80 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD },
    },
  });
}

function heading3(text) {
  return new Paragraph({
    children: [
      new TextRun({ text, font: "Raleway", size: 18, bold: true, color: BLUE }),
    ],
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 120, after: 60 },
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    children: [new TextRun({ text, font: "Source Sans 3", size: 18, color: "1E293B" })],
    bullet: { level },
    spacing: { before: 40, after: 40 },
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function sectionHeader(number, title, subtitle) {
  const children = [
    new TextRun({ text: number + "  ", font: "Raleway", size: 20, bold: true, color: GOLD }),
    new TextRun({ text: title, font: "Raleway", size: 20, bold: true, color: WHITE }),
  ];
  if (subtitle) {
    children.push(new TextRun({ text: "\n" + subtitle, font: "Source Sans 3", size: 16, color: "CBD5E1", break: 1 }));
  }
  return new Paragraph({
    children,
    shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
    spacing: { before: 240, after: 160 },
  });
}

// ── Table helpers ───────────────────────────────────────────────────────────

function headerCell(text, widthPct = null) {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text, font: "Raleway", size: 14, bold: true, color: WHITE }),
        ],
        spacing: { before: 60, after: 60 },
      }),
    ],
    shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    width: widthPct ? { size: widthPct, type: WidthType.PERCENTAGE } : undefined,
  });
}

function bodyCell(text, opts = {}) {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: String(text ?? ""),
            font: opts.mono ? "Courier New" : "Source Sans 3",
            size: 16,
            bold: opts.bold || false,
            color: opts.color || "1E293B",
          }),
        ],
        spacing: { before: 40, after: 40 },
      }),
    ],
    shading: opts.shade ? { type: ShadingType.SOLID, color: LIGHT, fill: LIGHT } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    columnSpan: opts.span || undefined,
  });
}

function buildTable(headers, rows, widths = null) {
  const headerRow = new TableRow({
    children: headers.map((h, i) =>
      headerCell(h, widths ? widths[i] : null)
    ),
    tableHeader: true,
  });

  const bodyRows = rows.map((row, ri) =>
    new TableRow({
      children: row.map((cell, ci) =>
        bodyCell(cell, {
          shade: ri % 2 === 1,
          bold: ci === 0,
          color: ci === 0 ? NAVY : "1E293B",
        })
      ),
    })
  );

  return new Table({
    rows: [headerRow, ...bodyRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
      left:   { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
      right:  { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
      insideH:{ style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      insideV:{ style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
    },
  });
}

// ── Main DOCX builder ───────────────────────────────────────────────────────

async function generateDOCX(data, outputPath) {
  const children = [];

  // ── COVER PAGE ─────────────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: data.consultant.firm.toUpperCase(),
          font: "Raleway", size: 18, bold: true, color: GOLD, characterSpacing: 100,
        }),
      ],
      spacing: { before: 1440, after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: data.consultant.practice.toUpperCase(),
          font: "Raleway", size: 14, color: "94A3B8", characterSpacing: 60,
        }),
      ],
      spacing: { before: 0, after: 480 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "JOB CARD DOCUMENT", font: "Raleway", size: 16, bold: true, color: GOLD, characterSpacing: 120 }),
      ],
      spacing: { before: 0, after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: data.project.name, font: "Raleway", size: 44, bold: true, color: NAVY }),
      ],
      spacing: { before: 0, after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `${data.project.client} · ${data.project.type}`, font: "Raleway", size: 22, color: BLUE }),
      ],
      spacing: { before: 0, after: 480 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `${data.meta.documentId}`, font: "Raleway", size: 18, color: GREY }),
        new TextRun({ text: `  ·  v${data.meta.version}`, font: "Raleway", size: 18, color: GREY }),
        new TextRun({ text: `  ·  ${data.meta.status}`, font: "Raleway", size: 18, bold: true, color: NAVY }),
        new TextRun({ text: `  ·  ${data.meta.classification}`, font: "Raleway", size: 18, bold: true, color: RED }),
      ],
      spacing: { before: 0, after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Programme Manager: ${data.project.projectManager}`, font: "Source Sans 3", size: 18, color: "1E293B" }),
      ],
      spacing: { before: 0, after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Executive Sponsor: ${data.project.sponsor}`, font: "Source Sans 3", size: 18, color: "1E293B" }),
      ],
      spacing: { before: 0, after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Issued: ${fmtDate(data.meta.lastUpdated)}`, font: "Source Sans 3", size: 18, color: "1E293B" }),
      ],
      spacing: { before: 0, after: 1440 },
    }),
    pageBreak(),
  );

  // ── DOCUMENT CONTROL ───────────────────────────────────────────────────────
  children.push(
    sectionHeader("01", "Document Control & Version History", "Ownership, distribution, and change history"),
    para([
      run("Document Owner: ", { bold: true, size: 10 }),
      run(data.meta.owner, { size: 10 }),
      run("   |   Approver: ", { bold: true, size: 10 }),
      run(data.meta.approver, { size: 10 }),
      run("   |   Classification: ", { bold: true, size: 10 }),
      run(data.meta.classification, { size: 10, bold: true, color: RED }),
    ]),
    heading2("Version History"),
    buildTable(
      ["Version", "Date", "Author", "Changes"],
      data.versionHistory.map(v => [`v${v.version}`, fmtDate(v.date), v.author, v.changes]),
      [10, 20, 20, 50]
    ),
    heading2("Distribution List"),
    buildTable(
      ["Name", "Role", "Organisation", "Copy Type"],
      [
        [data.meta.approver, "Executive Sponsor", data.project.client, "Controlled"],
        [data.meta.owner, "Programme Manager", data.consultant.firm, "Controlled"],
        ...data.stakeholders.slice(0, 4).map(s => [s.name, s.role, s.organisation, "Information"]),
      ]
    ),
    pageBreak(),
  );

  // ── EXECUTIVE SUMMARY ──────────────────────────────────────────────────────
  children.push(
    sectionHeader("02", "Executive Summary", "Programme overview, current health, and recommendation"),
    new Paragraph({
      children: [
        new TextRun({ text: "🟢  PROGRAMME STATUS: GREEN — On Track", font: "Raleway", size: 20, bold: true, color: "166534" }),
      ],
      shading: { type: ShadingType.SOLID, color: "DCFCE7", fill: "DCFCE7" },
      spacing: { before: 80, after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: data.executiveSummary.headline, font: "Source Sans 3", size: 18, italics: true, color: "0F172A" })],
      shading: { type: ShadingType.SOLID, color: "EBF3FB", fill: "EBF3FB" },
      border: { left: { style: BorderStyle.THICK, size: 10, color: NAVY } },
      spacing: { before: 120, after: 120 },
    }),
    buildTable(
      ["Metric", "Value"],
      [
        ["Total Budget", fmtCurrency(data.project.totalBudget)],
        ["Consumed to Date", `${fmtCurrency(data.project.budgetConsumed)} (${((data.project.budgetConsumed / data.project.totalBudget) * 100).toFixed(1)}%)`],
        ["Remaining", fmtCurrency(data.project.budgetRemaining)],
        ["Billing Type", data.project.billingType],
      ],
      [40, 60]
    ),
    heading2("Strategic Alignment"),
    ...data.executiveSummary.strategicAlignment.map(a => bullet(a)),
    heading2("Key Risks"),
    ...data.executiveSummary.keyRisks.map(r => bullet(`⚠ ${r}`)),
    heading2("Recommendation"),
    new Paragraph({
      children: [new TextRun({ text: data.executiveSummary.recommendation, font: "Source Sans 3", size: 18, bold: true })],
      shading: { type: ShadingType.SOLID, color: "EBF3FB", fill: "EBF3FB" },
      border: { left: { style: BorderStyle.THICK, size: 10, color: BLUE } },
      spacing: { before: 80, after: 80 },
    }),
    pageBreak(),
  );

  // ── JOB OVERVIEW ───────────────────────────────────────────────────────────
  children.push(
    sectionHeader("03", "Job Overview", "Engagement details, budget, and team composition"),
    heading2("Engagement Details"),
    buildTable(
      ["Field", "Value", "Field", "Value"],
      [
        ["Project Name", data.project.name, "Project Code", data.project.code],
        ["Client", data.project.client, "Engagement Ref", data.project.engagementRef],
        ["Project Type", data.project.type, "Methodology", data.project.methodology],
        ["Start Date", fmtDate(data.project.startDate), "End Date", fmtDate(data.project.endDate)],
        ["Billing Type", data.project.billingType, "Currency", data.project.currency],
        ["Programme Manager", data.project.projectManager, "Delivery Lead", data.project.deliveryLead],
        ["Solution Architect", data.project.solutionArchitect, "QA Lead", data.project.qaLead],
        ["Change Manager", data.project.changeManager, "Sponsor", data.project.sponsor],
      ],
      [20, 30, 20, 30]
    ),
    pageBreak(),
  );

  // ── SCOPE ──────────────────────────────────────────────────────────────────
  children.push(
    sectionHeader("04", "Scope", "In-scope, out-of-scope, assumptions, constraints, and exclusions"),
    heading2("In-Scope"),
    ...data.scope.inScope.map(i => bullet(i)),
    heading2("Out-of-Scope"),
    ...data.scope.outOfScope.map(i => bullet(`🚫 ${i}`)),
    heading2("Assumptions"),
    buildTable(
      ["#", "Assumption"],
      data.scope.assumptions.map((a, i) => [`A${String(i+1).padStart(2,"0")}`, a])
    ),
    heading2("Constraints"),
    buildTable(
      ["#", "Constraint"],
      data.scope.constraints.map((c, i) => [`C${String(i+1).padStart(2,"0")}`, c])
    ),
    heading2("Exclusions"),
    ...data.scope.exclusions.map(e => bullet(e)),
    pageBreak(),
  );

  // ── STAKEHOLDERS ───────────────────────────────────────────────────────────
  children.push(
    sectionHeader("05", "Stakeholder Matrix", "Full stakeholder register with influence, interest, and engagement strategy"),
    buildTable(
      ["Name", "Title", "Organisation", "Role", "Influence", "Interest", "Engagement", "Comms"],
      data.stakeholders.map(s => [s.name, s.title, s.organisation, s.role, s.influence, s.interest, s.engagement, s.commsFrequency]),
      [14, 14, 14, 14, 8, 8, 12, 16]
    ),
    pageBreak(),
  );

  // ── RACI ───────────────────────────────────────────────────────────────────
  children.push(
    sectionHeader("06", "RACI Matrix", "R=Responsible · A=Accountable · C=Consulted · I=Informed"),
    buildTable(
      ["Activity", ...data.raci.roles],
      data.raci.activities.map((act, i) => [act, ...data.raci.matrix[i]])
    ),
    pageBreak(),
  );

  // ── WORKFLOW ───────────────────────────────────────────────────────────────
  children.push(
    sectionHeader("07", "Workflow & Process Flow", "End-to-end programme workflow with phase gates and decision points"),
    para([run("Process flow diagram is embedded in the HTML and PDF versions. ASCII representation:", { italic: true, size: 9, color: GREY })]),
    new Paragraph({
      children: [
        new TextRun({
          text: "INITIATION → DISCOVERY → DESIGN → BUILD (6 Sprints) → TEST → DEPLOY → HYPERCARE",
          font: "Courier New", size: 16, color: NAVY,
        }),
      ],
      shading: { type: ShadingType.SOLID, color: "F1F5F9", fill: "F1F5F9" },
      spacing: { before: 80, after: 80 },
    }),
    heading2("Workflow Steps"),
    buildTable(
      ["#", "Phase", "Activity", "Owner", "Duration", "Gate"],
      data.workflow.map(w => [w.step, w.phase, w.activity, w.owner, w.duration, w.gate]),
      [5, 12, 28, 18, 10, 27]
    ),
    heading2("Inputs & Outputs per Step"),
    buildTable(
      ["Step", "Inputs", "Outputs", "Tools"],
      data.workflow.map(w => [`${w.step}. ${w.phase}`, w.inputs, w.outputs, w.tools]),
      [15, 28, 32, 25]
    ),
    pageBreak(),
  );

  // ── SCREENSHOTS (placeholder) ───────────────────────────────────────────────
  children.push(
    sectionHeader("08", "Screenshots & Artefacts", "Application screens captured via wkhtmltoimage"),
    para([run("Screenshots are generated and saved to the /screenshots/ directory. See the HTML/PDF output for embedded visual artefacts.", { italic: true, size: 9, color: GREY })]),
    buildTable(
      ["Fig.", "Caption", "Filename"],
      [
        ["Fig 1", "Salesforce Sales Cloud — Accounts View", "screenshots/01-salesforce-accounts.png"],
        ["Fig 2", "Analytics Hub — Executive KPI Dashboard", "screenshots/02-analytics-hub.png"],
        ["Fig 3", "MuleSoft Anypoint — API Management Console", "screenshots/03-mulesoft-console.png"],
        ["Fig 4", "JIRA Board — Sprint 4 Kanban", "screenshots/04-jira-board.png"],
        ["Fig 5", "Salesforce Service Cloud — Case Management", "screenshots/05-service-cloud.png"],
        ["Fig 6", "Data Migration — Reconciliation Dashboard", "screenshots/06-migration-dashboard.png"],
      ]
    ),
    pageBreak(),
  );

  // ── SOP ────────────────────────────────────────────────────────────────────
  children.push(
    sectionHeader("09", "Standard Operating Procedures", "Documented step-by-step operational protocols"),
  );
  for (const sop of data.sop) {
    children.push(
      heading2(`${sop.id} — ${sop.title}`),
      para([run("Purpose: ", { bold: true }), run(sop.purpose)]),
      ...sop.steps.map((step, i) => bullet(`${i+1}. ${step}`)),
    );
  }
  children.push(pageBreak());

  // ── INPUTS ─────────────────────────────────────────────────────────────────
  children.push(
    sectionHeader("10", "Inputs", "Data, system, and human inputs required for programme execution"),
    buildTable(
      ["ID", "Type", "Source", "Description", "Format", "Frequency"],
      data.inputs.map(i => [i.id, i.type, i.source, i.description, i.format, i.frequency])
    ),
    pageBreak(),
  );

  // ── OUTPUTS ────────────────────────────────────────────────────────────────
  children.push(
    sectionHeader("11", "Outputs & Deliverables", "Programme deliverables, system outputs, and SLAs"),
    buildTable(
      ["ID", "Type", "Destination", "Description", "Format", "SLA"],
      data.outputs.map(o => [o.id, o.type, o.destination, o.description, o.format, o.sla])
    ),
    pageBreak(),
  );

  // ── TOOLS ──────────────────────────────────────────────────────────────────
  children.push(
    sectionHeader("12", "Tools & Technology Stack", "Full technology inventory, versions, and licence ownership"),
    buildTable(
      ["Category", "Tool / Platform", "Version", "Purpose", "Licences", "Owner"],
      data.tools.map(t => [t.category, t.name, t.version, t.purpose, t.licences, t.owner])
    ),
    pageBreak(),
  );

  // ── RESPONSIBILITIES ───────────────────────────────────────────────────────
  children.push(
    sectionHeader("13", "Responsibilities", "Role-based responsibility breakdown"),
  );
  for (const r of data.responsibilities) {
    children.push(
      heading2(`${r.role} — ${r.name}`),
      ...r.responsibilities.map(resp => bullet(resp)),
    );
  }
  children.push(pageBreak());

  // ── TIMELINE ───────────────────────────────────────────────────────────────
  children.push(
    sectionHeader("14", "Timeline & Milestones", "Programme phases with status and milestone register"),
    para([run("See the HTML/PDF version for the full Gantt chart visualization.", { italic: true, color: GREY, size: 9 })]),
    buildTable(
      ["Phase", "Start", "End", "Milestone", "Status"],
      data.timeline.map(t => [t.phase, fmtDate(t.start), fmtDate(t.end), t.milestone, t.status])
    ),
    pageBreak(),
  );

  // ── RISKS ──────────────────────────────────────────────────────────────────
  children.push(
    sectionHeader("15", "Risk Register", "Programme risks with probability, impact, mitigation, and ownership"),
    buildTable(
      ["ID", "Category", "Description", "Prob.", "Impact", "Rating", "Owner", "Status"],
      data.risks.map(r => [r.id, r.category, r.description, r.probability, r.impact, r.rating, r.owner, r.status])
    ),
    pageBreak(),
  );

  // ── ISSUES ─────────────────────────────────────────────────────────────────
  children.push(
    sectionHeader("16", "Issue Log", "Active and resolved issues with impact and resolution"),
    buildTable(
      ["ID", "Description", "Impact", "Raised", "Owner", "Status", "Resolution"],
      data.issues.map(i => [i.id, i.description, i.impact, fmtDate(i.raisedDate), i.owner, i.status, i.resolution])
    ),
    pageBreak(),
  );

  // ── QUALITY CHECKLIST ──────────────────────────────────────────────────────
  children.push(
    sectionHeader("17", "Quality Checklist", "QA gate items, compliance checks, and training readiness"),
    buildTable(
      ["Category", "Quality Item", "Required", "Status"],
      data.qualityChecklist.map(q => [q.category, q.item, q.required ? "YES" : "Optional", q.status])
    ),
    pageBreak(),
  );

  // ── TESTING ────────────────────────────────────────────────────────────────
  const ds = data.testing.defectSummary;
  children.push(
    sectionHeader("18", "Testing Summary", "Test strategy, types, coverage, and defect summary"),
    new Paragraph({
      children: [new TextRun({ text: data.testing.strategy, font: "Source Sans 3", size: 18, italics: true })],
      shading: { type: ShadingType.SOLID, color: "EBF3FB", fill: "EBF3FB" },
      border: { left: { style: BorderStyle.THICK, size: 10, color: NAVY } },
      spacing: { before: 80, after: 80 },
    }),
    heading2("Defect Summary"),
    buildTable(
      ["Priority", "Count", "Status"],
      [
        ["P1 Critical", String(ds.p1Critical), ds.p1Critical > 0 ? "⚠ Attention Required" : "✓ Clear"],
        ["P2 Major",    String(ds.p2Major),    ds.p2Major > 5 ? "⚠ Monitor" : "✓ OK"],
        ["P3 Minor",    String(ds.p3Minor),    "Scheduled"],
        ["P4 Trivial",  String(ds.p4Trivial),  "Backlog"],
        [`Total: ${ds.totalFound}`, `${ds.closed} Closed`, `${ds.open} Open`],
      ]
    ),
    heading2("Test Types & Coverage"),
    buildTable(
      ["Test Type", "Owner", "Tool", "Coverage", "Status"],
      data.testing.types.map(t => [t.type, t.owner, t.tool, t.coverage, t.status])
    ),
    pageBreak(),
  );

  // ── ACCEPTANCE CRITERIA ────────────────────────────────────────────────────
  children.push(
    sectionHeader("19", "Acceptance Criteria", "Formal acceptance criteria — must be met for programme sign-off"),
    buildTable(
      ["ID", "Deliverable", "Acceptance Criterion", "Verified By", "Status"],
      data.acceptanceCriteria.map(ac => [ac.id, ac.deliverable, ac.criterion, ac.verifiedBy, ac.status])
    ),
    pageBreak(),
  );

  // ── COMMUNICATION PLAN ─────────────────────────────────────────────────────
  children.push(
    sectionHeader("20", "Communication Plan", "Stakeholder communication frequency, format, and channel matrix"),
    buildTable(
      ["Audience", "Format", "Frequency", "Owner", "Channel", "Distribution"],
      data.communicationPlan.map(c => [c.audience, c.format, c.frequency, c.owner, c.channel, c.distribution])
    ),
    pageBreak(),
  );

  // ── HANDOVER NOTES ─────────────────────────────────────────────────────────
  children.push(
    sectionHeader("21", "Handover Notes", "Knowledge transfer, operational readiness, and open items"),
    heading2("Knowledge Transfer Activities"),
    ...data.handoverNotes.knowledgeTransfer.map(k => bullet(k)),
    heading2("Operational Readiness"),
    ...data.handoverNotes.operationalReadiness.map(o => bullet(o)),
    heading2("Open Items at Handover"),
    ...data.handoverNotes.openItems.map(i => bullet(`⚠ ${i}`)),
    pageBreak(),
  );

  // ── APPROVAL SIGN-OFF ──────────────────────────────────────────────────────
  children.push(
    sectionHeader("22", "Approval Sign-off", "All signatures required before Go-Live authorisation"),
    para([run("All approvers below must sign this document before the programme can proceed to Go-Live. Target date: 15 May 2026.", { italic: true })]),
    new Table({
      rows: [
        new TableRow({
          children: ["Role", "Name", "Organisation", "Signature", "Date", "Status"].map(h =>
            headerCell(h)
          ),
          tableHeader: true,
        }),
        ...data.approvals.map((a, i) =>
          new TableRow({
            children: [
              bodyCell(a.role, { bold: true, shade: i % 2 === 1 }),
              bodyCell(a.name, { shade: i % 2 === 1 }),
              bodyCell(a.organisation, { shade: i % 2 === 1 }),
              bodyCell("_________________________", { shade: i % 2 === 1, color: GREY }),
              bodyCell("___________", { shade: i % 2 === 1, color: GREY }),
              bodyCell(a.status, { shade: i % 2 === 1, color: a.status === "Pending" ? AMBER : GREEN }),
            ],
          })
        ),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    }),
    pageBreak(),
  );

  // ── APPENDIX A — GLOSSARY ──────────────────────────────────────────────────
  children.push(
    sectionHeader("A", "Appendix A — Glossary", "Definitions of key terms and acronyms"),
    buildTable(
      ["Term", "Definition"],
      data.appendix.glossary.map(g => [g.term, g.definition]),
      [20, 80]
    ),
    pageBreak(),
  );

  // ── APPENDIX B — REFERENCES ────────────────────────────────────────────────
  children.push(
    sectionHeader("B", "Appendix B — References", "Source documents cited in this job card"),
    buildTable(
      ["Reference", "Description", "Date"],
      data.appendix.references.map(r => [r.ref, r.description, fmtDate(r.date)]),
      [20, 60, 20]
    ),
  );

  // ── BUILD DOCUMENT ─────────────────────────────────────────────────────────
  const doc = new Document({
    title: data.project.name,
    description: `Job Card Document — ${data.meta.documentId} v${data.meta.version}`,
    creator: data.consultant.firm,
    keywords: `Job Card, ${data.project.client}, ${data.consultant.firm}, CRM, Transformation`,

    styles: {
      default: {
        document: {
          run: { font: "Source Sans 3", size: 20, color: "1E293B" },
        },
      },
    },

    sections: [
      {
        properties: {
          page: {
            margin: {
              top:    convertMillimetersToTwip(18),
              bottom: convertMillimetersToTwip(22),
              left:   convertMillimetersToTwip(16),
              right:  convertMillimetersToTwip(16),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Table({
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: `${data.consultant.firm}  ·  ${data.meta.documentId}  ·  v${data.meta.version}`,
                                font: "Raleway", size: 14, color: GREY,
                              }),
                            ],
                          }),
                        ],
                        borders: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD }, top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                        margins: { bottom: 40 },
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({ text: data.meta.classification, font: "Raleway", size: 14, bold: true, color: RED }),
                            ],
                            alignment: AlignmentType.RIGHT,
                          }),
                        ],
                        borders: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD }, top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                        margins: { bottom: 40 },
                      }),
                    ],
                  }),
                ],
                width: { size: 100, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: `${data.project.name}  ·  ${data.project.client}`, font: "Calibri", size: 14, color: GREY }),
                  new TextRun({ text: "   Page ", font: "Calibri", size: 14, color: GREY }),
                  new PageNumberElement(PageNumberType.CARDINAL, { font: "Calibri", size: 14, color: GREY }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  require("fs").writeFileSync(outputPath, buffer);
  return { success: true, path: outputPath, size: buffer.length };
}

module.exports = { generateDOCX };
