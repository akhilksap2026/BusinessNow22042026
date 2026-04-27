"use strict";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric",
  });
}
function fmtCurrency(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(n);
}
function pad(str, len) {
  return String(str).padEnd(len);
}
function mdTable(headers, rows) {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => String(r[i] ?? "").length), 3)
  );
  const header = "| " + headers.map((h, i) => pad(h, widths[i])).join(" | ") + " |";
  const divider = "| " + widths.map(w => "-".repeat(w)).join(" | ") + " |";
  const body = rows.map(
    r => "| " + r.map((c, i) => pad(String(c ?? ""), widths[i])).join(" | ") + " |"
  );
  return [header, divider, ...body].join("\n");
}

function buildMarkdown(data) {
  const now = new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const lines = [];
  const H1 = t => lines.push(`# ${t}`, "");
  const H2 = t => lines.push(`## ${t}`, "");
  const H3 = t => lines.push(`### ${t}`, "");
  const P  = t => lines.push(t, "");
  const HR = () => lines.push("---", "");
  const UL = items => { items.forEach(i => lines.push(`- ${i}`)); lines.push(""); };
  const BR = () => lines.push("", "---", "");

  // ── FRONTMATTER
  lines.push("---");
  lines.push(`title: "${data.project.name}"`);
  lines.push(`documentId: "${data.meta.documentId}"`);
  lines.push(`version: "v${data.meta.version}"`);
  lines.push(`status: "${data.meta.status}"`);
  lines.push(`classification: "${data.meta.classification}"`);
  lines.push(`client: "${data.project.client}"`);
  lines.push(`firm: "${data.consultant.firm}"`);
  lines.push(`generated: "${now}"`);
  lines.push("---", "");

  // ── COVER
  H1(`${data.project.name}`);
  lines.push(`> **Job Card Document** · ${data.consultant.firm}  `);
  lines.push(`> ${data.meta.documentId} · v${data.meta.version} · **${data.meta.status}** · **${data.meta.classification}**  `);
  lines.push(`> Client: ${data.project.client} · Generated: ${now}`);
  lines.push("");
  HR();

  // ── TOC
  H2("Table of Contents");
  const sections = [
    "01. Document Control & Version History",
    "02. Executive Summary",
    "03. Job Overview",
    "04. Scope",
    "05. Stakeholder Matrix",
    "06. RACI Matrix",
    "07. Workflow & Process Flow",
    "08. Screenshots & Artefacts",
    "09. Standard Operating Procedures (SOP)",
    "10. Inputs",
    "11. Outputs & Deliverables",
    "12. Tools & Technology",
    "13. Responsibilities",
    "14. Timeline & Milestones",
    "15. Risk Register",
    "16. Issue Log",
    "17. Quality Checklist",
    "18. Testing Summary",
    "19. Acceptance Criteria",
    "20. Communication Plan",
    "21. Handover Notes",
    "22. Approval Sign-off",
    "A.  Glossary",
    "B.  References",
  ];
  UL(sections);
  HR();

  // ── 01 DOCUMENT CONTROL
  H2("01. Document Control & Version History");
  lines.push(`| Field | Value |`);
  lines.push(`| ----- | ----- |`);
  lines.push(`| **Document Owner** | ${data.meta.owner} |`);
  lines.push(`| **Approver** | ${data.meta.approver} |`);
  lines.push(`| **Classification** | ${data.meta.classification} |`);
  lines.push(`| **Last Updated** | ${fmtDate(data.meta.lastUpdated)} |`);
  lines.push(`| **Next Review** | ${fmtDate(data.meta.nextReviewDate)} |`);
  lines.push("");
  H3("Version History");
  lines.push(mdTable(
    ["Version", "Date", "Author", "Changes"],
    data.versionHistory.map(v => [`v${v.version}`, fmtDate(v.date), v.author, v.changes])
  ));
  lines.push("");
  BR();

  // ── 02 EXECUTIVE SUMMARY
  H2("02. Executive Summary");
  lines.push(`> **Programme Status: 🟢 GREEN — On Track**`);
  lines.push("");
  P(data.executiveSummary.headline);
  lines.push(`| Metric | Value |`);
  lines.push(`| ------ | ----- |`);
  lines.push(`| Total Budget | ${fmtCurrency(data.project.totalBudget)} |`);
  lines.push(`| Consumed | ${fmtCurrency(data.project.budgetConsumed)} (${((data.project.budgetConsumed / data.project.totalBudget) * 100).toFixed(1)}%) |`);
  lines.push(`| Remaining | ${fmtCurrency(data.project.budgetRemaining)} |`);
  lines.push("");
  H3("Strategic Alignment");
  UL(data.executiveSummary.strategicAlignment);
  H3("Key Risks");
  UL(data.executiveSummary.keyRisks.map(r => `⚠️ ${r}`));
  H3("Recommendation");
  P(`> ${data.executiveSummary.recommendation}`);
  BR();

  // ── 03 JOB OVERVIEW
  H2("03. Job Overview");
  lines.push(`| Field | Value | Field | Value |`);
  lines.push(`| ----- | ----- | ----- | ----- |`);
  lines.push(`| Project Name | ${data.project.name} | Project Code | ${data.project.code} |`);
  lines.push(`| Client | ${data.project.client} | Engagement Ref | ${data.project.engagementRef} |`);
  lines.push(`| Type | ${data.project.type} | Methodology | ${data.project.methodology} |`);
  lines.push(`| Start Date | ${fmtDate(data.project.startDate)} | End Date | ${fmtDate(data.project.endDate)} |`);
  lines.push(`| Billing Type | ${data.project.billingType} | Currency | ${data.project.currency} |`);
  lines.push(`| Programme Manager | ${data.project.projectManager} | Delivery Lead | ${data.project.deliveryLead} |`);
  lines.push(`| Solution Architect | ${data.project.solutionArchitect} | QA Lead | ${data.project.qaLead} |`);
  lines.push(`| Sponsor | ${data.project.sponsor} | Phase | ${data.project.phase} |`);
  lines.push("");
  BR();

  // ── 04 SCOPE
  H2("04. Scope");
  H3("In-Scope");
  UL(data.scope.inScope);
  H3("Out-of-Scope");
  UL(data.scope.outOfScope.map(s => `🚫 ${s}`));
  H3("Assumptions");
  UL(data.scope.assumptions);
  H3("Constraints");
  UL(data.scope.constraints);
  H3("Exclusions");
  UL(data.scope.exclusions);
  BR();

  // ── 05 STAKEHOLDERS
  H2("05. Stakeholder Matrix");
  lines.push(mdTable(
    ["Name", "Title", "Organisation", "Role", "Influence", "Interest", "Engagement"],
    data.stakeholders.map(s => [s.name, s.title, s.organisation, s.role, s.influence, s.interest, s.engagement])
  ));
  lines.push("");
  BR();

  // ── 06 RACI
  H2("06. RACI Matrix");
  P("**Legend:** R = Responsible · A = Accountable · C = Consulted · I = Informed");
  lines.push(mdTable(
    ["Activity", ...data.raci.roles],
    data.raci.activities.map((act, i) => [act, ...data.raci.matrix[i]])
  ));
  lines.push("");
  BR();

  // ── 07 WORKFLOW
  H2("07. Workflow & Process Flow");
  P("_Note: See the HTML/PDF version for the full SVG process flow diagram._");
  lines.push("```");
  lines.push("INITIATION → DISCOVERY → DESIGN → BUILD (6 Sprints) → TEST → DEPLOY → HYPERCARE");
  lines.push("                                      ↓");
  lines.push("                              [Change Request?]");
  lines.push("                            Yes ↓         ↓ No");
  lines.push("                       [Change Board]  [Continue]");
  lines.push("```");
  lines.push("");
  lines.push(mdTable(
    ["Step", "Phase", "Activity", "Owner", "Duration", "Gate"],
    data.workflow.map(w => [w.step, w.phase, w.activity, w.owner, w.duration, w.gate])
  ));
  lines.push("");
  BR();

  // ── 08 SCREENSHOTS
  H2("08. Screenshots & Artefacts");
  P("Screenshot files are located in the `screenshots/` directory.");
  UL([
    "`screenshots/01-salesforce-accounts.png` — Salesforce Sales Cloud: Accounts View",
    "`screenshots/02-analytics-hub.png` — Analytics Hub: Executive KPI Dashboard",
    "`screenshots/03-mulesoft-console.png` — MuleSoft Anypoint: API Management Console",
    "`screenshots/04-jira-board.png` — JIRA Board: Sprint 4 Kanban",
    "`screenshots/05-service-cloud.png` — Salesforce Service Cloud: Case Management",
    "`screenshots/06-migration-dashboard.png` — Data Migration: Reconciliation Dashboard",
  ]);
  P("_Screenshots captured automatically via wkhtmltoimage. Run `npm run screenshot` to regenerate._");
  BR();

  // ── 09 SOP
  H2("09. Standard Operating Procedures");
  data.sop.forEach(sop => {
    H3(`${sop.id} — ${sop.title}`);
    P(`**Purpose:** ${sop.purpose}`);
    sop.steps.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
    lines.push("");
  });
  BR();

  // ── 10 INPUTS
  H2("10. Inputs");
  lines.push(mdTable(
    ["ID", "Type", "Source", "Description", "Format", "Frequency", "Volume"],
    data.inputs.map(i => [i.id, i.type, i.source, i.description, i.format, i.frequency, i.volume])
  ));
  lines.push("");
  BR();

  // ── 11 OUTPUTS
  H2("11. Outputs & Deliverables");
  lines.push(mdTable(
    ["ID", "Type", "Destination", "Description", "Format", "SLA"],
    data.outputs.map(o => [o.id, o.type, o.destination, o.description, o.format, o.sla])
  ));
  lines.push("");
  BR();

  // ── 12 TOOLS
  H2("12. Tools & Technology Stack");
  lines.push(mdTable(
    ["Category", "Tool", "Version", "Purpose", "Licences", "Owner"],
    data.tools.map(t => [t.category, t.name, t.version, t.purpose, t.licences, t.owner])
  ));
  lines.push("");
  BR();

  // ── 13 RESPONSIBILITIES
  H2("13. Responsibilities");
  data.responsibilities.forEach(r => {
    H3(`${r.role} — ${r.name}`);
    UL(r.responsibilities);
  });
  BR();

  // ── 14 TIMELINE
  H2("14. Timeline & Milestones");
  P("_See HTML/PDF version for the full Gantt chart SVG._");
  lines.push(mdTable(
    ["Phase", "Start", "End", "Milestone", "Status"],
    data.timeline.map(t => [t.phase, fmtDate(t.start), fmtDate(t.end), t.milestone, t.status])
  ));
  lines.push("");
  BR();

  // ── 15 RISKS
  H2("15. Risk Register");
  lines.push(`**Summary:** ${data.risks.filter(r => r.rating === "Critical").length} Critical · ${data.risks.filter(r => r.rating === "High").length} High · ${data.risks.filter(r => r.status === "Open" || r.status === "Escalated").length} Open`);
  lines.push("");
  lines.push(mdTable(
    ["ID", "Category", "Description", "Prob.", "Impact", "Rating", "Owner", "Status"],
    data.risks.map(r => [r.id, r.category, r.description.slice(0, 60) + "…", r.probability, r.impact, r.rating, r.owner, r.status])
  ));
  lines.push("");
  data.risks.forEach(r => {
    H3(`${r.id} — ${r.category} [${r.rating}]`);
    P(`**Description:** ${r.description}`);
    P(`**Mitigation:** ${r.mitigation}`);
    P(`**Owner:** ${r.owner} · **Status:** ${r.status} · **Review:** ${fmtDate(r.reviewDate)}`);
  });
  BR();

  // ── 16 ISSUES
  H2("16. Issue Log");
  lines.push(mdTable(
    ["ID", "Description", "Owner", "Status", "Resolution"],
    data.issues.map(i => [i.id, i.description.slice(0, 50) + "…", i.owner, i.status, i.resolution.slice(0, 50) + "…"])
  ));
  lines.push("");
  BR();

  // ── 17 QUALITY CHECKLIST
  H2("17. Quality Checklist");
  const checkMap = { Done: "✅", "In Progress": "🔄", Pending: "⬜" };
  data.qualityChecklist.forEach(q => {
    const icon = checkMap[q.status] || "⬜";
    lines.push(`- ${icon} **[${q.category}]** ${q.item} — *${q.status}*`);
  });
  lines.push("");
  BR();

  // ── 18 TESTING
  H2("18. Testing Summary");
  P(data.testing.strategy);
  H3("Defect Summary");
  lines.push(`| Priority | Count | Status |`);
  lines.push(`| -------- | ----- | ------ |`);
  const ds = data.testing.defectSummary;
  lines.push(`| P1 Critical | ${ds.p1Critical} | ${ds.p1Critical > 0 ? "🔴 Attention Required" : "✅ Clear"} |`);
  lines.push(`| P2 Major | ${ds.p2Major} | ${ds.p2Major > 5 ? "🟡 Monitor" : "✅ OK"} |`);
  lines.push(`| P3 Minor | ${ds.p3Minor} | 🔵 Scheduled |`);
  lines.push(`| P4 Trivial | ${ds.p4Trivial} | ⬜ Backlog |`);
  lines.push(`| **Total** | **${ds.totalFound}** | **${ds.closed} Closed · ${ds.open} Open** |`);
  lines.push("");
  H3("Test Types");
  lines.push(mdTable(
    ["Type", "Owner", "Tool", "Coverage", "Status"],
    data.testing.types.map(t => [t.type, t.owner, t.tool, t.coverage, t.status])
  ));
  lines.push("");
  BR();

  // ── 19 ACCEPTANCE CRITERIA
  H2("19. Acceptance Criteria");
  lines.push(mdTable(
    ["ID", "Deliverable", "Criterion", "Verified By", "Status"],
    data.acceptanceCriteria.map(ac => [ac.id, ac.deliverable, ac.criterion.slice(0, 60) + "…", ac.verifiedBy, ac.status])
  ));
  lines.push("");
  BR();

  // ── 20 COMMUNICATION PLAN
  H2("20. Communication Plan");
  lines.push(mdTable(
    ["Audience", "Format", "Frequency", "Owner", "Channel"],
    data.communicationPlan.map(c => [c.audience, c.format, c.frequency, c.owner, c.channel])
  ));
  lines.push("");
  BR();

  // ── 21 HANDOVER NOTES
  H2("21. Handover Notes");
  H3("Knowledge Transfer");
  UL(data.handoverNotes.knowledgeTransfer);
  H3("Operational Readiness");
  UL(data.handoverNotes.operationalReadiness);
  H3("Open Items at Handover");
  UL(data.handoverNotes.openItems.map(i => `⚠️ ${i}`));
  BR();

  // ── 22 APPROVALS
  H2("22. Approval Sign-off");
  P("_All signatures required before Go-Live authorisation._");
  lines.push(mdTable(
    ["Role", "Name", "Organisation", "Signature", "Date", "Status"],
    data.approvals.map(a => [a.role, a.name, a.organisation, "_________________", "___________", a.status])
  ));
  lines.push("");
  BR();

  // ── APPENDIX A
  H2("Appendix A — Glossary");
  lines.push(mdTable(
    ["Term", "Definition"],
    data.appendix.glossary.map(g => [g.term, g.definition])
  ));
  lines.push("");
  BR();

  // ── APPENDIX B
  H2("Appendix B — References");
  lines.push(mdTable(
    ["Reference", "Description", "Date"],
    data.appendix.references.map(r => [r.ref, r.description, fmtDate(r.date)])
  ));
  lines.push("");
  HR();

  // ── FOOTER
  lines.push(`_${data.meta.documentId} · v${data.meta.version} · ${data.meta.classification} · Generated ${now}_`);
  lines.push(`_© ${new Date().getFullYear()} ${data.consultant.firm}. Prepared exclusively for ${data.project.client}._`);

  return lines.join("\n");
}

module.exports = { buildMarkdown };
