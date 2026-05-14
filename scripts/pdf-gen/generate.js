const puppeteer = require('puppeteer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const OUTPUT_PDF = path.join(__dirname, '../../public/projects-requirements.pdf');

if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
const publicDir = path.join(__dirname, '../../artifacts/businessnow/public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
const OUTPUT_PDF_FINAL = path.join(publicDir, 'projects-requirements.pdf');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function shot(page, name, label) {
  const file = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  [screenshot] ${label} → ${name}.png`);
  return { file, label };
}

async function login(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1000);
  // Select admin user from dropdown
  await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select, [role="combobox"]'));
    console.log('selects found:', selects.length);
  });
  // Click the user selector
  const trigger = await page.$('[role="combobox"]');
  if (trigger) {
    await trigger.click();
    await sleep(500);
    // Look for the first option (admin user)
    const options = await page.$$('[role="option"]');
    if (options.length > 0) {
      // Pick the first user (typically admin)
      await options[0].click();
      await sleep(300);
    }
  }
  // Click Login button
  const loginBtn = await page.$('button');
  if (loginBtn) {
    await loginBtn.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  }
  await sleep(2000);
}

async function main() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/home/runner/.nix-profile/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();
  const screenshots = [];

  try {
    console.log('\n1. Logging in...');
    await login(page);

    // Navigate to projects
    console.log('\n2. Projects List...');
    await page.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2000);
    screenshots.push(await shot(page, '01-projects-list', 'Projects List View'));

    // Status filter chip
    console.log('\n3. Status filter chips...');
    const chips = await page.$$('button');
    for (const chip of chips) {
      const text = await page.evaluate(el => el.textContent?.trim(), chip);
      if (text === 'In Progress') { await chip.click(); await sleep(800); break; }
    }
    screenshots.push(await shot(page, '02-projects-filtered', 'Projects List — Status Filter Applied'));

    // Reset filter
    for (const chip of await page.$$('button')) {
      const text = await page.evaluate(el => el.textContent?.trim(), chip);
      if (text === 'All') { await chip.click(); await sleep(500); break; }
    }

    // Bulk select
    console.log('\n4. Bulk selection...');
    const checkboxes = await page.$$('input[type="checkbox"], [role="checkbox"]');
    if (checkboxes.length > 0) {
      await checkboxes[0].click();
      await sleep(300);
      if (checkboxes.length > 1) { await checkboxes[1].click(); await sleep(300); }
    }
    await sleep(600);
    screenshots.push(await shot(page, '03-projects-bulk-select', 'Projects List — Bulk Selection Bar'));

    // Deselect
    for (const cb of await page.$$('input[type="checkbox"], [role="checkbox"]')) {
      const checked = await page.evaluate(el => el.getAttribute('data-state') === 'checked' || el.checked, cb);
      if (checked) await cb.click();
    }
    await sleep(300);

    // Create Project Wizard
    console.log('\n5. Create Project Wizard...');
    const allBtns = await page.$$('button');
    for (const btn of allBtns) {
      const text = await page.evaluate(el => el.textContent?.trim(), btn);
      if (text && (text.includes('New Project') || text.includes('+ New'))) {
        await btn.click();
        await sleep(1500);
        break;
      }
    }
    screenshots.push(await shot(page, '04-wizard-step1-basics', 'Create Project Wizard — Step 1: Basics'));

    // Click Next to step 2
    const nextBtns = await page.$$('button');
    for (const btn of nextBtns) {
      const text = await page.evaluate(el => el.textContent?.trim(), btn);
      if (text === 'Next') { await btn.click(); await sleep(800); break; }
    }
    screenshots.push(await shot(page, '05-wizard-step2-financials', 'Create Project Wizard — Step 2: Financials'));

    // Click Next to step 3
    for (const btn of await page.$$('button')) {
      const text = await page.evaluate(el => el.textContent?.trim(), btn);
      if (text === 'Next') { await btn.click(); await sleep(800); break; }
    }
    screenshots.push(await shot(page, '06-wizard-step3-team', 'Create Project Wizard — Step 3: Team'));

    // Click Next to step 4 (Review)
    for (const btn of await page.$$('button')) {
      const text = await page.evaluate(el => el.textContent?.trim(), btn);
      if (text === 'Next') { await btn.click(); await sleep(800); break; }
    }
    screenshots.push(await shot(page, '07-wizard-step4-review', 'Create Project Wizard — Step 4: Review'));

    // Close the wizard
    const escBtn = await page.$('[data-state="open"] button[aria-label="Close"], [data-state="open"] .dialog-close, button[class*="close"]');
    if (escBtn) { await escBtn.click(); await sleep(500); }
    await page.keyboard.press('Escape');
    await sleep(800);

    // Navigate to project 1 detail
    console.log('\n6. Project Detail — Overview...');
    await page.goto(`${BASE_URL}/projects/1`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2500);
    screenshots.push(await shot(page, '08-project-detail-overview', 'Project Detail — Overview Tab (KPI Cards & Burn Chart)'));

    // Tasks tab
    console.log('\n7. Tasks tab...');
    const tabs = await page.$$('[role="tab"]');
    for (const tab of tabs) {
      const text = await page.evaluate(el => el.textContent?.trim(), tab);
      if (text === 'Tasks') { await tab.click(); await sleep(1500); break; }
    }
    screenshots.push(await shot(page, '09-tasks-list-view', 'Project Detail — Tasks Tab (List/Tree View)'));

    // Board view
    const viewBtns = await page.$$('button, [role="button"]');
    for (const btn of viewBtns) {
      const text = await page.evaluate(el => el.textContent?.trim() || el.getAttribute('aria-label'), btn);
      if (text && (text.toLowerCase().includes('board') || text.toLowerCase().includes('kanban'))) {
        await btn.click(); await sleep(1500); break;
      }
    }
    screenshots.push(await shot(page, '10-tasks-board-view', 'Project Detail — Tasks Tab (Board/Kanban View)'));

    // Click a task to open side sheet
    const taskRows = await page.$$('tr[data-task-id], [data-testid*="task"], .task-row, tr.cursor-pointer');
    if (taskRows.length === 0) {
      // Try clicking first row with cursor pointer in tasks area
      await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('tr')).filter(r => r.style.cursor === 'pointer' || r.classList.contains('cursor-pointer'));
        if (rows[0]) rows[0].click();
      });
    } else {
      await taskRows[0].click();
    }
    await sleep(1200);
    screenshots.push(await shot(page, '11-task-detail-sheet', 'Task Detail Side Sheet'));
    await page.keyboard.press('Escape');
    await sleep(500);

    // Team tab
    console.log('\n8. Team tab...');
    for (const tab of await page.$$('[role="tab"]')) {
      const text = await page.evaluate(el => el.textContent?.trim(), tab);
      if (text === 'Team') { await tab.click(); await sleep(1500); break; }
    }
    screenshots.push(await shot(page, '12-team-tab', 'Project Detail — Team Tab (Allocations & Resource Requests)'));

    // Finance tab
    console.log('\n9. Finance tab...');
    for (const tab of await page.$$('[role="tab"]')) {
      const text = await page.evaluate(el => el.textContent?.trim(), tab);
      if (text === 'Finance' || text === 'Financials') { await tab.click(); await sleep(1500); break; }
    }
    screenshots.push(await shot(page, '13-finance-tab', 'Project Detail — Financials Tab (Budget Ledger)'));

    // Scroll down to see more of finance tab
    await page.evaluate(() => window.scrollBy(0, 400));
    await sleep(500);
    screenshots.push(await shot(page, '13b-finance-tab-invoices', 'Project Detail — Financials Tab (Invoices & Revenue)'));
    await page.evaluate(() => window.scrollTo(0, 0));

    // Documents tab
    console.log('\n10. Documents tab...');
    for (const tab of await page.$$('[role="tab"]')) {
      const text = await page.evaluate(el => el.textContent?.trim(), tab);
      if (text === 'Documents' || text === 'Docs') { await tab.click(); await sleep(1500); break; }
    }
    screenshots.push(await shot(page, '14-documents-tab', 'Project Detail — Documents Tab'));

    // Timeline/Gantt tab
    console.log('\n11. Timeline tab...');
    for (const tab of await page.$$('[role="tab"]')) {
      const text = await page.evaluate(el => el.textContent?.trim(), tab);
      if (text === 'Timeline' || text === 'Gantt') { await tab.click(); await sleep(2000); break; }
    }
    screenshots.push(await shot(page, '15-timeline-gantt', 'Project Detail — Timeline (Gantt Chart)'));

    // Updates tab
    console.log('\n12. Updates tab...');
    for (const tab of await page.$$('[role="tab"]')) {
      const text = await page.evaluate(el => el.textContent?.trim(), tab);
      if (text === 'Updates') { await tab.click(); await sleep(1200); break; }
    }
    screenshots.push(await shot(page, '16-updates-tab', 'Project Detail — Updates Tab'));

    // CSAT tab
    console.log('\n13. CSAT tab...');
    for (const tab of await page.$$('[role="tab"]')) {
      const text = await page.evaluate(el => el.textContent?.trim(), tab);
      if (text === 'CSAT') { await tab.click(); await sleep(1200); break; }
    }
    screenshots.push(await shot(page, '17-csat-tab', 'Project Detail — CSAT Tab'));

    // Edit project modal
    console.log('\n14. Edit Project modal...');
    for (const tab of await page.$$('[role="tab"]')) {
      const text = await page.evaluate(el => el.textContent?.trim(), tab);
      if (text === 'Overview') { await tab.click(); await sleep(800); break; }
    }
    for (const btn of await page.$$('button')) {
      const text = await page.evaluate(el => el.textContent?.trim(), btn);
      if (text && (text.includes('Edit') || text.includes('Edit Project'))) {
        await btn.click(); await sleep(1200); break;
      }
    }
    screenshots.push(await shot(page, '18-edit-project-modal', 'Edit Project Modal'));
    await page.keyboard.press('Escape');
    await sleep(400);

    // Apply Template modal
    console.log('\n15. Apply Template...');
    for (const btn of await page.$$('button')) {
      const text = await page.evaluate(el => el.textContent?.trim(), btn);
      if (text && text.includes('Apply Template')) {
        await btn.click(); await sleep(1200); break;
      }
    }
    screenshots.push(await shot(page, '19-apply-template', 'Apply Template Modal'));
    await page.keyboard.press('Escape');
    await sleep(400);

    // Project list with archived view
    console.log('\n16. Archived projects...');
    await page.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(1500);
    for (const btn of await page.$$('button')) {
      const text = await page.evaluate(el => el.textContent?.trim(), btn);
      if (text && text.toLowerCase().includes('archived')) {
        await btn.click(); await sleep(1000); break;
      }
    }
    screenshots.push(await shot(page, '20-archived-projects', 'Projects List — Archived Projects View'));

    // Audit log (admin)
    console.log('\n17. Audit log...');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(1500);
    for (const tab of await page.$$('[role="tab"]')) {
      const text = await page.evaluate(el => el.textContent?.trim(), tab);
      if (text && text.toLowerCase().includes('audit')) { await tab.click(); await sleep(1200); break; }
    }
    screenshots.push(await shot(page, '21-audit-log', 'Audit Log (Project Change History)'));

  } catch (err) {
    console.error('Screenshot error:', err.message);
  }

  await browser.close();
  console.log(`\nCaptured ${screenshots.length} screenshots.`);

  // Generate PDF
  console.log('\nGenerating PDF...');
  await generatePDF(screenshots, OUTPUT_PDF_FINAL);
  console.log(`\nPDF saved to: ${OUTPUT_PDF_FINAL}`);
}

const SECTIONS = [
  {
    key: '01-projects-list',
    req: 'REQ-PRJ-001 to REQ-PRJ-007',
    heading: '3.1.1  Description — Projects List View',
    body: 'The Projects module provides a unified table of all projects accessible to the authenticated user. Columns include Project Name, Account, Owner, Type, Status, Health, Tracked Hours, and Allocated Hours. Role-based access ensures collaborators see only their allocated projects, while admins and super users see all projects.'
  },
  {
    key: '02-projects-filtered',
    req: 'REQ-PRJ-003 to REQ-PRJ-006',
    heading: 'Stimulus/Response — Search & Filter',
    body: 'The user types in the search input; the system filters in real time by project name. Clicking a Status chip (All, Not Started, In Progress, At Risk, Completed) or Health chip immediately narrows the list. Filters are composable and can be saved as named views persisted server-side per user.'
  },
  {
    key: '03-projects-bulk-select',
    req: 'REQ-PRJ-008 to REQ-PRJ-010',
    heading: 'Stimulus/Response — Bulk Actions',
    body: 'When one or more project rows are selected via checkboxes, a sticky bulk-action bar appears at the bottom of the page. The user can Export CSV (generates and downloads a comma-separated file of selected project data) or Archive (soft-deletes selected projects with an undo toast window).'
  },
  {
    key: '04-wizard-step1-basics',
    req: 'REQ-PRJ-011',
    heading: 'Stimulus/Response — Create Project: Step 1 Basics',
    body: 'User clicks "+ New Project". The system opens the Create Project Wizard. Step 1 captures Project Name (required), Description, Account (required), and Project Type (Internal/External). The system prevents progression if required fields are missing and displays field-level validation errors.'
  },
  {
    key: '05-wizard-step2-financials',
    req: 'REQ-PRJ-011',
    heading: 'Stimulus/Response — Create Project: Step 2 Financials',
    body: 'Step 2 captures financial parameters: Start Date, Due Date, Billing Type (Fixed Fee / T&M / Retainer), Budget ($), and Budgeted Hours. These values establish the project\'s baseline financial plan. The budget is locked once the project transitions from Draft to Active status (REQ-PRJ-015).'
  },
  {
    key: '06-wizard-step3-team',
    req: 'REQ-PRJ-011',
    heading: 'Stimulus/Response — Create Project: Step 3 Team',
    body: 'Step 3 assigns the project Owner (PM, required), Rate Card, and initial Team Member allocations. Each allocation specifies user, role, allocation percentage, and start/end dates. The system validates capacity and skill requirements before confirming each allocation.'
  },
  {
    key: '07-wizard-step4-review',
    req: 'REQ-PRJ-011',
    heading: 'Stimulus/Response — Create Project: Step 4 Review',
    body: 'Step 4 presents a complete summary of all entered data — Basics, Financials, and Team — for final review before submission. The user clicks "Create Project". The system creates the record, initialises budget, creates allocations, and redirects to the new Project Detail page.'
  },
  {
    key: '08-project-detail-overview',
    req: 'REQ-PRJ-017, REQ-PRJ-018, REQ-PRJ-036, REQ-PRJ-037',
    heading: '3.1.1  Description — Project Detail: Overview Tab',
    body: 'The Overview tab is the landing surface for a project. It displays: (a) KPI Cards — Revised Budget, Budget Used %, Hours Used %, Completion %, Timeline (days remaining), Margin; (b) Health Stat Cards — Overdue, Blocked, At-Risk, On-Track task counts; (c) Burn Chart — cumulative spend vs. elapsed time; (d) Quoted vs. Actual table — phase-level hours comparison with variance.'
  },
  {
    key: '09-tasks-list-view',
    req: 'REQ-PRJ-019, REQ-PRJ-021, REQ-PRJ-022',
    heading: 'Stimulus/Response — Tasks Tab: Hierarchical List View',
    body: 'The Tasks tab renders a collapsible hierarchical tree: Phases (isPhase=true) → Tasks → Sub-tasks. Each row supports inline editing of name, status, assignee, priority, and hours. Selecting multiple tasks activates a bulk-update bar for status, priority, and assignee changes applied atomically via PATCH /api/tasks/bulk.'
  },
  {
    key: '10-tasks-board-view',
    req: 'REQ-PRJ-020',
    heading: 'Stimulus/Response — Tasks Tab: Board (Kanban) View',
    body: 'Clicking the Board view toggle switches the task display to a Kanban board grouped by status columns. Tasks are draggable between columns to update status in real time. The board respects the same RBAC constraints as the list view. Phases and sub-tasks are visually distinguished from standard tasks.'
  },
  {
    key: '11-task-detail-sheet',
    req: 'REQ-PRJ-021',
    heading: 'Stimulus/Response — Task Detail Side Sheet',
    body: 'Clicking any task row opens a side sheet displaying: task name, description, status, priority, assignee, planned/estimate/actual hours, parent phase, linked time entries, and task notes. All fields are editable inline. Notes support create and delete. The sheet closes on Escape or clicking outside.'
  },
  {
    key: '12-team-tab',
    req: 'REQ-PRJ-023 to REQ-PRJ-026',
    heading: 'Stimulus/Response — Team Tab (Allocations & Resource Requests)',
    body: 'The Team tab lists all resource allocations with user, role, allocation %, dates, and hard/soft flag. Before confirming an allocation, the system shows a capacity preview (green/amber/red by week). If a required skill is unmet, the system returns 422 skill_mismatch. Resource Requests follow a Pending → Approved/Blocked/Filled workflow.'
  },
  {
    key: '13-finance-tab',
    req: 'REQ-PRJ-027, REQ-PRJ-028, REQ-PRJ-015',
    heading: 'Stimulus/Response — Financials Tab: Budget Ledger & Change Orders',
    body: 'The Financials tab shows the Budget Ledger: one SOW entry, adjustments, and change orders. Once a project is Active, the SOW entry is locked; budget changes require Change Orders (Draft → Submitted → Approved/Rejected). Approved COs automatically increase the Revised Budget. Self-approval of COs is blocked.'
  },
  {
    key: '13b-finance-tab-invoices',
    req: 'REQ-PRJ-029, REQ-PRJ-030, REQ-PRJ-031',
    heading: 'Functional Requirements — Financials: Invoices, Revenue & Contracts',
    body: 'Below the ledger, the Financials tab lists: (a) Invoices — invoice number, amount, status, due date, with navigation to Finance module; (b) Revenue Entries — monthly recognition entries editable by Finance-role users; (c) Contracts — full CRUD for contract records (name, status, dates, value, document URL, notes).'
  },
  {
    key: '14-documents-tab',
    req: 'REQ-PRJ-032',
    heading: 'Stimulus/Response — Documents Tab',
    body: 'The Documents tab shows all project-attached files with name, type, version number, upload date, uploader, and approval status. Users can upload new files, view per-document version history, set approval status, and create documents from pre-defined Document Templates stored in the Admin module.'
  },
  {
    key: '15-timeline-gantt',
    req: 'REQ-PRJ-033',
    heading: 'Stimulus/Response — Timeline (Gantt) Tab',
    body: 'The Timeline tab renders a Gantt chart plotting all project phases and tasks as horizontal bars on a calendar axis. Each bar represents the planned start and end date of the item. The chart provides a visual roadmap of the project\'s schedule, enabling PMs to spot overlaps and dependencies at a glance.'
  },
  {
    key: '16-updates-tab',
    req: 'REQ-PRJ-034',
    heading: 'Stimulus/Response — Updates Tab',
    body: 'The Updates tab enables authorised users to draft and send project status updates to stakeholders. The interface supports template placeholders (e.g., {{project_name}}, {{status}}). Each update is recorded with the recipient list and a per-recipient delivery status flag in update_recipients. The tab displays the full update history.'
  },
  {
    key: '17-csat-tab',
    req: 'REQ-PRJ-035',
    heading: 'Stimulus/Response — CSAT Tab',
    body: 'The CSAT tab displays customer satisfaction ratings submitted for the project. It shows a star-rating distribution chart, the list of individual submissions with comments, and a computed overall average score. This data is also surfaced in the Reports module\'s CSAT Trend report.'
  },
  {
    key: '18-edit-project-modal',
    req: 'REQ-PRJ-013, REQ-PRJ-014, REQ-PRJ-040',
    heading: 'Stimulus/Response — Edit Project Modal & Status Transitions',
    body: 'The Edit Project modal allows modification of: Name, Description, Account, Owner, Type, Status (enforced state machine), Billing Type, Budget (locked if Active), Budgeted Hours, Dates, Health override, and Rate Card. Changing Status requires a reason (logged to audit). Budget edits on Active projects are blocked unless explicitly unlocked by an Account Admin.'
  },
  {
    key: '19-apply-template',
    req: 'REQ-PRJ-039',
    heading: 'Stimulus/Response — Apply Template to Existing Project',
    body: 'The "Apply Template" action appends a project template\'s phases and tasks to an existing project without overwriting current tasks. The user selects a template and confirms. The system creates all template phases and tasks, computing absolute dates from relative offsets and the project\'s start date.'
  },
  {
    key: '20-archived-projects',
    req: 'REQ-PRJ-007, REQ-PRJ-010',
    heading: 'Functional Requirements — Archived Projects View',
    body: 'Toggling "Show Archived" includes soft-deleted projects in the list with a visual indicator. Archived projects can be individually selected and restored via a Restore action, which clears deleted_at. Archived projects are excluded from all reports, KPI counts, and capacity calculations unless explicitly included via the toggle.'
  },
  {
    key: '21-audit-log',
    req: 'REQ-PRJ-038',
    heading: 'Functional Requirements — Audit Log (Project Change History)',
    body: 'Every create, update, delete, and status-change operation on a project or its child records (tasks, allocations, budget entries, invoices, change orders, contracts) is recorded with: actor user ID, action type, entity type, entity ID, timestamp, and before/after field values where applicable. The Audit Log is accessible in the Admin module.'
  },
];

async function generatePDF(screenshots, outputPath) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, autoFirstPage: false });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Cover page
  doc.addPage();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#4F46E5');
  doc.fillColor('white')
    .font('Helvetica-Bold')
    .fontSize(28)
    .text('BusinessNow PSA Platform', 40, 180, { align: 'center', width: doc.page.width - 80 });
  doc.fontSize(20).text('Projects Module', 40, 230, { align: 'center', width: doc.page.width - 80 });
  doc.fontSize(14).text('Software Requirements Specification', 40, 270, { align: 'center', width: doc.page.width - 80 });
  doc.fontSize(12).text('Section 3.1 — Description, Stimulus/Response Sequences & Functional Requirements', 40, 310, { align: 'center', width: doc.page.width - 80 });
  doc.fontSize(10).fillColor('#C7D2FE').text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 40, 720, { align: 'center', width: doc.page.width - 80 });

  // TOC page
  doc.addPage();
  doc.fillColor('#1E1B4B').font('Helvetica-Bold').fontSize(18).text('Table of Contents', 40, 40);
  doc.moveTo(40, 65).lineTo(doc.page.width - 40, 65).strokeColor('#E0E7FF').stroke();

  const tocItems = [
    ['3.1.1', 'Description', '3'],
    ['3.1.2', 'Stimulus / Response Sequences', '4'],
    ['3.1.3', 'Functional Requirements', '—'],
    ['', 'Projects List View (REQ-PRJ-001 to 007)', '4'],
    ['', 'Bulk Actions (REQ-PRJ-008 to 010)', '5'],
    ['', 'Create Project Wizard (REQ-PRJ-011 to 012)', '6'],
    ['', 'Project Detail — Overview (REQ-PRJ-017, 018, 036, 037)', '9'],
    ['', 'Tasks Tab — List & Board Views (REQ-PRJ-019 to 022)', '10'],
    ['', 'Team Tab (REQ-PRJ-023 to 026)', '12'],
    ['', 'Financials Tab (REQ-PRJ-027 to 031)', '13'],
    ['', 'Documents Tab (REQ-PRJ-032)', '15'],
    ['', 'Timeline / Gantt Tab (REQ-PRJ-033)', '16'],
    ['', 'Updates Tab (REQ-PRJ-034)', '17'],
    ['', 'CSAT Tab (REQ-PRJ-035)', '18'],
    ['', 'Edit Project & Status Transitions (REQ-PRJ-013, 014, 040)', '19'],
    ['', 'Apply Template (REQ-PRJ-039)', '20'],
    ['', 'Archived Projects (REQ-PRJ-007, 010)', '21'],
    ['', 'Audit Log (REQ-PRJ-038)', '22'],
  ];

  let ty = 80;
  for (const [num, label, pg] of tocItems) {
    const isSection = num !== '';
    doc.fillColor(isSection ? '#312E81' : '#374151')
      .font(isSection ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(isSection ? 11 : 10);
    if (isSection) {
      doc.text(`${num}  ${label}`, 40, ty);
    } else {
      doc.text(`    ${label}`, 40, ty);
    }
    ty += isSection ? 20 : 16;
    if (ty > doc.page.height - 60) { doc.addPage(); ty = 40; }
  }

  // Intro page
  doc.addPage();
  doc.fillColor('#1E1B4B').font('Helvetica-Bold').fontSize(16).text('3.1  Projects Module', 40, 40);
  doc.moveTo(40, 62).lineTo(doc.page.width - 40, 62).strokeColor('#C7D2FE').lineWidth(1).stroke();

  doc.fillColor('#312E81').font('Helvetica-Bold').fontSize(13).text('3.1.1  Description', 40, 75);
  const desc = `The Projects module is the core operational workspace of the BusinessNow PSA platform. It manages the full lifecycle of client-facing and internal engagements — from initial creation through delivery, invoicing, and closure. It gives Project Managers, Account Admins, and Super Users a unified, real-time view of project health, financial performance, resource utilisation, task progress, and stakeholder communication.

The module has two primary surfaces:

  1.  Projects List View — A searchable, filterable, sortable table of all active and archived projects, enabling quick navigation, bulk operations, and high-level status visibility.

  2.  Project Detail Workspace — A deep, tabbed interface per project consolidating task management, resource allocation, financial tracking, document control, timeline visualisation, stakeholder updates, risk management, and CSAT data.

The module integrates with the Accounts, Resources, Finance, Time Tracking, and Reports modules. Role-based access control (RBAC) governs visibility and mutability of all data, enforced at both API and UI layers.`;
  doc.fillColor('#374151').font('Helvetica').fontSize(10).text(desc, 40, 95, { width: doc.page.width - 80, lineGap: 3 });

  // All requirement+screenshot pages
  const screenshotMap = {};
  for (const s of screenshots) {
    const key = path.basename(s.file, '.png');
    screenshotMap[key] = s.file;
  }

  for (const section of SECTIONS) {
    const imgFile = screenshotMap[section.key];
    doc.addPage();

    // Header bar
    doc.rect(0, 0, doc.page.width, 8).fill('#4F46E5');

    // Section heading
    doc.fillColor('#312E81').font('Helvetica-Bold').fontSize(13).text(section.heading, 40, 22, { width: doc.page.width - 80 });

    // REQ badge
    doc.fillColor('#4F46E5').font('Helvetica-Bold').fontSize(8)
      .text(section.req, doc.page.width - 200, 25, { width: 160, align: 'right' });

    // Divider
    doc.moveTo(40, 42).lineTo(doc.page.width - 40, 42).strokeColor('#E0E7FF').lineWidth(0.8).stroke();

    // Body text
    doc.fillColor('#374151').font('Helvetica').fontSize(10)
      .text(section.body, 40, 52, { width: doc.page.width - 80, lineGap: 2 });

    const textBottom = doc.y + 14;

    // Screenshot
    if (imgFile && fs.existsSync(imgFile)) {
      const maxW = doc.page.width - 80;
      const maxH = doc.page.height - textBottom - 60;
      const imgInfo = { width: 1440, height: 900 };
      const scale = Math.min(maxW / imgInfo.width, maxH / imgInfo.height, 1);
      const iw = imgInfo.width * scale;
      const ih = imgInfo.height * scale;
      const ix = (doc.page.width - iw) / 2;

      // Screenshot label
      doc.fillColor('#6B7280').font('Helvetica').fontSize(8)
        .text('Screenshot:', 40, textBottom - 2);

      // Border rect
      doc.rect(ix - 2, textBottom + 10, iw + 4, ih + 4).fillAndStroke('#F3F4F6', '#C7D2FE');

      doc.image(imgFile, ix, textBottom + 12, { width: iw, height: ih });

      // Caption
      doc.fillColor('#6B7280').font('Helvetica-Oblique').fontSize(8)
        .text(`Fig. ${section.key.split('-')[0]}: ${screenshots.find(s => path.basename(s.file, '.png') === section.key)?.label || section.heading}`,
          40, textBottom + 12 + ih + 8, { align: 'center', width: doc.page.width - 80 });
    } else {
      // Placeholder
      doc.rect(40, textBottom + 10, doc.page.width - 80, 200)
        .fillAndStroke('#F9FAFB', '#E5E7EB');
      doc.fillColor('#9CA3AF').font('Helvetica').fontSize(10)
        .text('[Screenshot not available for this screen]', 40, textBottom + 95, { align: 'center', width: doc.page.width - 80 });
    }

    // Footer
    doc.fillColor('#9CA3AF').font('Helvetica').fontSize(7)
      .text('BusinessNow PSA — Projects Module SRS  |  Confidential', 40, doc.page.height - 25, { width: doc.page.width - 80, align: 'center' });
  }

  // Functional Requirements Summary page
  doc.addPage();
  doc.rect(0, 0, doc.page.width, 8).fill('#4F46E5');
  doc.fillColor('#312E81').font('Helvetica-Bold').fontSize(14).text('3.1.3  Functional Requirements — Summary Index', 40, 20, { width: doc.page.width - 80 });
  doc.moveTo(40, 40).lineTo(doc.page.width - 40, 40).strokeColor('#E0E7FF').stroke();

  const reqs = [
    ['REQ-PRJ-001', 'Projects list visible to authenticated user per role — table with 8 columns'],
    ['REQ-PRJ-002', 'Role-based visibility: admin/super=all; collaborator=allocated projects only'],
    ['REQ-PRJ-003', 'Real-time text search by project name (case-insensitive, client-side)'],
    ['REQ-PRJ-004', 'Status filter chips: All / Not Started / In Progress / At Risk / On Hold / Completed'],
    ['REQ-PRJ-005', 'Health filter chips: All Health / On Track / At Risk / Off Track (composable)'],
    ['REQ-PRJ-006', 'Saved views: persist filter+sort per user server-side; create / rename / delete'],
    ['REQ-PRJ-007', 'Archived toggle: show/hide soft-deleted projects with visual distinction'],
    ['REQ-PRJ-008', 'Bulk checkbox selection with Select-All control'],
    ['REQ-PRJ-009', 'Export CSV for selected projects (all visible column data)'],
    ['REQ-PRJ-010', 'Bulk archive with undo toast; commit on timeout expiry'],
    ['REQ-PRJ-011', 'Multi-step wizard: Basics → Financials → Team → Review; required-field guards'],
    ['REQ-PRJ-012', 'Create from template: auto-generate phases/tasks with relative date offsets'],
    ['REQ-PRJ-013', 'Status state machine: Draft→Active/Cancelled; Active→OnHold/Completed/AtRisk; etc.'],
    ['REQ-PRJ-014', 'Status change reason required; persisted in audit log with before/after values'],
    ['REQ-PRJ-015', 'Budget lock on Draft→Active transition; unlock requires admin or Change Order'],
    ['REQ-PRJ-016', 'Auto-computed health: Red=past due, Amber=<14 days, Green=otherwise; manual overrides'],
    ['REQ-PRJ-017', 'KPI cards: Revised Budget, Budget Used %, Hours Used %, Completion %, Timeline, Margin'],
    ['REQ-PRJ-018', 'Health-stat cards: Overdue/Blocked/At-Risk/On-Track — click filters Tasks tab'],
    ['REQ-PRJ-019', 'Tasks list: collapsible tree (Phase→Task→Subtask); inline edit; drag reorder'],
    ['REQ-PRJ-020', 'Tasks board: Kanban by status; draggable cards; same RBAC as list'],
    ['REQ-PRJ-021', 'Task detail side sheet: all metadata, notes, time entries; inline edit'],
    ['REQ-PRJ-022', 'Bulk task update: status/priority/assignee via PATCH /api/tasks/bulk (atomic)'],
    ['REQ-PRJ-023', 'Team tab: list allocations with %, dates, soft/hard flag; add/edit/remove'],
    ['REQ-PRJ-024', 'Capacity preview before confirming allocation (green/amber/red per week)'],
    ['REQ-PRJ-025', 'Skill validation on allocation: 422 skill_mismatch; override with reason + audit log'],
    ['REQ-PRJ-026', 'Resource Requests: Pending→Approved/Blocked/Filled workflow'],
    ['REQ-PRJ-027', 'Finance — Budget Ledger: SOW + adjustments + COs; running Revised Budget total'],
    ['REQ-PRJ-028', 'Change Orders: Draft→Submitted→Approved/Rejected; auto-update Revised Budget; no self-approve'],
    ['REQ-PRJ-029', 'Finance — Invoices list: number, amount, status, due date; navigate to Finance module'],
    ['REQ-PRJ-030', 'Finance — Revenue Entries: monthly recognition; editable by Finance-role users'],
    ['REQ-PRJ-031', 'Finance — Contracts: full CRUD (name, status, dates, value, doc URL, notes)'],
    ['REQ-PRJ-032', 'Documents: upload, version history, approval status, create from template'],
    ['REQ-PRJ-033', 'Timeline/Gantt: phases + tasks as horizontal bars on calendar axis'],
    ['REQ-PRJ-034', 'Updates: draft with placeholders; record recipients + delivery status'],
    ['REQ-PRJ-035', 'CSAT: star-rating distribution, individual submissions, overall average'],
    ['REQ-PRJ-036', 'Burn chart: cumulative spend vs. elapsed time on baseline burn-rate'],
    ['REQ-PRJ-037', 'Quoted vs. Actual: phase-level hours comparison with variance column'],
    ['REQ-PRJ-038', 'Audit log: every CUD + status-change with actor, entity, timestamp, before/after'],
    ['REQ-PRJ-039', 'Apply template to existing project: append phases/tasks; no overwrite of existing'],
    ['REQ-PRJ-040', 'Edit Project modal: all fields editable subject to lock/state-machine rules'],
    ['REQ-PRJ-041', 'Error handling: field validation, 422 on bad transition, toast on network error, 403/404'],
    ['REQ-PRJ-042', 'Performance: list <2 s (≤500 rows); detail <3 s; no N+1 on tracked-hours'],
  ];

  let ry = 50;
  for (const [code, text] of reqs) {
    if (ry > doc.page.height - 50) { doc.addPage(); ry = 40; }
    doc.fillColor('#4F46E5').font('Helvetica-Bold').fontSize(8.5).text(code, 40, ry, { width: 90, continued: false });
    doc.fillColor('#374151').font('Helvetica').fontSize(8.5).text(text, 140, ry, { width: doc.page.width - 180 });
    ry += 16;
  }

  doc.fillColor('#9CA3AF').font('Helvetica').fontSize(7)
    .text('BusinessNow PSA — Projects Module SRS  |  Confidential', 40, doc.page.height - 25, { width: doc.page.width - 80, align: 'center' });

  doc.end();
  await new Promise((resolve, reject) => { stream.on('finish', resolve); stream.on('error', reject); });
}

main().catch(console.error);
