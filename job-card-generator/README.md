# Enterprise Job Card Document Generator

A professional-grade document generator that produces **DOCX, PDF, Markdown, and HTML** versions of a comprehensive job card — modelled after Big 4 consulting deliverables (Deloitte / KPMG / McKinsey standard).

---

## What It Generates

A single `node generate.js` command produces four output files from one data source:

| Format   | File                      | Size    | Description |
|----------|---------------------------|---------|-------------|
| HTML     | `output/job-card.html`    | ~142 KB | Polished web document with SVG diagrams, colour-coded tables, corporate cover page |
| PDF      | `output/job-card.pdf`     | ~185 KB | Print-ready A4 PDF via `wkhtmltopdf` — page numbers, footer, watermark |
| DOCX     | `output/job-card.docx`    | ~33 KB  | Editable Word document with styles, headers/footers, and formatted tables |
| Markdown | `output/job-card.md`      | ~35 KB  | GitHub-compatible Markdown with YAML frontmatter and proper tables |

Screenshots are captured into `screenshots/` using `wkhtmltoimage`.

---

## Document Sections (26 total)

1. **Cover Page** — Project name, client, consultant firm, version, classification badge, date
2. **Table of Contents** — All 24 sections with sub-items
3. **Document Control & Version History** — Owner, approver, classification, full version log, distribution list
4. **Executive Summary** — Status indicator, budget snapshot, strategic alignment, key risks, recommendation
5. **Job Overview** — Full engagement metadata, team composition, billing type, dates
6. **Scope** — In-scope, out-of-scope, numbered assumptions and constraints, exclusions
7. **Stakeholder Matrix** — Full register: influence, interest, engagement strategy, comms frequency
8. **RACI Matrix** — 10 activities × 8 roles, colour-coded R/A/C/I cells with legend
9. **Workflow & Process Flow** — Step table with inputs/outputs/tools/gates + SVG process flow diagram
10. **Screenshots & Artefacts** — Embedded screenshots captured by `wkhtmltoimage`; browser-frame cards
11. **SOPs (x3)** — Sprint ceremony protocol, change request management, defect management
12. **Inputs** — System, document, and human inputs with format, frequency, volume
13. **Outputs & Deliverables** — Destination, format, SLA per deliverable
14. **Tools & Technology Stack** — 10-tool inventory: category, version, purpose, licences, owner
15. **Responsibilities** — Per-role accountability narrative for 5 key programme roles
16. **Timeline & Milestones** — SVG Gantt chart (12 phases, today-line, milestone diamonds) + milestone register
17. **Risk Register** — 5 risks: probability × impact matrix, mitigation, owner, review date
18. **Issue Log** — 3 issues with impact, raised date, owner, status, resolution
19. **Quality Checklist** — 15 gate items across Documentation, Technical, Compliance, Training
20. **Testing Summary** — Strategy, 7 test types, defect P1–P4 breakdown
21. **Acceptance Criteria** — 8 formal criteria per deliverable with verification owner
22. **Communication Plan** — 7 stakeholder groups: format, frequency, channel
23. **Handover Notes** — Knowledge transfer, operational readiness, open items
24. **Approval Sign-off** — Signature table for 5 designated approvers
25. **Appendix A — Glossary** — 11 key term definitions
26. **Appendix B — References** — 6 source documents with dates

---

## Quick Start

### Prerequisites

- Node.js v18+
- `wkhtmltopdf` (bundled via Nix in Replit, or install from https://wkhtmltopdf.org/)

### Install & Run

```bash
cd job-card-generator
npm install
node generate.js
```

### Format-Specific Generation

```bash
# Generate all formats (default)
node generate.js --format all

# Individual formats
node generate.js --format html
node generate.js --format pdf
node generate.js --format docx
node generate.js --format markdown

# Screenshots only (requires HTML to be generated first)
node generate.js --screenshot
```

Or use npm scripts:

```bash
npm run generate          # all formats
npm run generate:html
npm run generate:pdf
npm run generate:docx
npm run generate:markdown
npm run screenshot
```

---

## Customising with Your Own Data

Edit `src/data/sample-job.js` to replace the sample data with your own project information. The file contains a single `SAMPLE_JOB` object with 24 top-level sections.

**Key fields to update:**

```js
project: {
  name: "Your Project Name",
  code: "PRJ-2026",
  client: "Your Client Ltd",
  projectManager: "Your Name",
  totalBudget: 1_500_000,
  startDate: "2026-06-01",
  endDate: "2026-12-31",
}
```

All other sections (risks, RACI, timeline, SOPs, etc.) automatically render from the data you supply.

---

## Screenshot Capture

The generator uses `wkhtmltoimage` to automatically capture:

1. **`job-card-preview.png`** — Full-page screenshot of the generated HTML document
2. **URL screenshots** — Any URLs defined in `generate.js` under `urlShots` are captured and saved to `screenshots/`

To add your own URL screenshots, edit the `urlShots` array in `generate.js`:

```js
const urlShots = [
  { url: "https://your-app.com/dashboard", out: "dashboard.png", label: "Dashboard" },
  { url: "https://your-crm.com/accounts",  out: "accounts.png",  label: "CRM Accounts" },
];
```

---

## Design System

The documents use a **deep navy / gold** corporate colour palette:

| Token         | Hex       | Usage |
|---------------|-----------|-------|
| Navy          | `#1B2A4A` | Headers, section markers, table headers |
| Gold          | `#C9A84C` | Accent, RACI "R" cells, section numbers |
| Corporate Blue| `#2D6A9F` | Sub-headings, info cards, RACI "C" cells |
| Light Blue    | `#EBF3FB` | Callout backgrounds, alternating table rows |
| Green         | `#059669` | Done/Complete status badges |
| Amber         | `#D97706` | Warning callouts, High risk |
| Red           | `#DC2626` | Critical risk, classification badge |

The HTML document includes:
- Full-bleed navy cover page with geometric pattern
- Per-section coloured header bars with section numbers
- Inline SVG process flow diagram and Gantt chart
- Browser-frame screenshot placeholders with colour coding
- Print-ready `@page` CSS rules for A4 output
- `CONFIDENTIAL` watermark (visible in print)

---

## File Structure

```
job-card-generator/
├── generate.js                  ← Main entry point / CLI
├── package.json
├── README.md
├── src/
│   ├── data/
│   │   └── sample-job.js        ← All sample data (edit this)
│   ├── generators/
│   │   ├── html.js              ← HTML document builder + SVG diagrams
│   │   ├── pdf.js               ← wkhtmltopdf wrapper
│   │   ├── docx.js              ← Word document builder (docx library)
│   │   ├── markdown.js          ← Markdown generator
│   │   └── screenshots.js       ← wkhtmltoimage wrapper
│   └── utils/
│       └── logger.js            ← Colour terminal logger
├── output/                      ← Generated files (gitignored)
│   ├── job-card.html
│   ├── job-card.pdf
│   ├── job-card.docx
│   └── job-card.md
└── screenshots/                 ← Captured screenshots (gitignored)
    ├── job-card-preview.png
    └── 01-salesforce.png
```

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `docx`  | Word document generation (tables, styles, headers, footers, page numbers) |
| `chalk` | Terminal colour output for the logger |

**System dependencies (no npm install required):**
- `wkhtmltopdf` — PDF generation from HTML
- `wkhtmltoimage` — Screenshot capture from HTML or URL

---

## Sample Data

The generator ships with a fully populated sample job card for:

> **Phoenix — Enterprise CRM Modernisation Programme**  
> Client: TechNova Corporation  
> Consultant: Meridian Advisory Group  
> Budget: USD 4,800,000 · 9 months · Hybrid Agile-Waterfall

This covers a realistic Salesforce CRM replacement programme with:
- 5 risks (Critical through Low)
- 3 live issues
- 10-tool technology inventory
- 5 programme roles with detailed responsibilities
- 10 timeline phases with Gantt chart data
- 8 acceptance criteria
- 15 quality checklist items
- 7 test types with defect summary
- 26 full document sections

---

## Audit-Ready Output

The document is designed to meet the standards expected for:
- **Client deliverables** at Big 4 / management consulting firms
- **Programme governance** documentation (MSP, Prince2, SAFe)
- **Audit trails** — classification marking, version history, distribution list, formal approval sign-off
- **Regulatory submissions** — document ID, owner, approver, next review date

All generated PDFs include:
- Centred footer: firm name
- Right footer: `Page N of M`
- Document header: document ID + version + classification
