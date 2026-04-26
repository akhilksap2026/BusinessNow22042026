import {
  db,
  projectTemplatesTable,
  templatePhasesTable,
  templateTasksTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

type SeedTask = {
  name: string;
  relativeDueDateOffset: number;
  effort: number;
  priority?: "Low" | "Medium" | "High" | "Critical";
  billableDefault?: boolean;
  assigneeRolePlaceholder?: string;
  subtasks?: SeedTask[];
};

type SeedPhase = {
  name: string;
  relativeStartOffset: number;
  relativeEndOffset: number;
  tasks: SeedTask[];
};

type SeedTemplate = {
  name: string;
  description: string;
  billingType: "Fixed Fee" | "Time & Materials" | "Retainer";
  totalDurationDays: number;
  phases: SeedPhase[];
};

const SAMPLES: SeedTemplate[] = [
  {
    name: "Software Implementation",
    description:
      "Standard SaaS rollout covering discovery, build, testing, training, and hypercare. Suitable for ERP, CRM, or HRIS deployments.",
    billingType: "Time & Materials",
    totalDurationDays: 90,
    phases: [
      {
        name: "Discovery & Planning",
        relativeStartOffset: 0,
        relativeEndOffset: 14,
        tasks: [
          { name: "Stakeholder interviews", relativeDueDateOffset: 5, effort: 12, priority: "High", assigneeRolePlaceholder: "Lead Consultant" },
          {
            name: "Requirements gathering",
            relativeDueDateOffset: 10,
            effort: 24,
            priority: "High",
            assigneeRolePlaceholder: "Business Analyst",
            subtasks: [
              { name: "Functional requirements", relativeDueDateOffset: 8, effort: 10 },
              { name: "Non-functional requirements", relativeDueDateOffset: 9, effort: 6 },
              { name: "Integration map", relativeDueDateOffset: 10, effort: 8 },
            ],
          },
          { name: "Solution design", relativeDueDateOffset: 13, effort: 16, priority: "High", assigneeRolePlaceholder: "Solution Architect" },
          { name: "SOW sign-off", relativeDueDateOffset: 14, effort: 4, priority: "Critical", assigneeRolePlaceholder: "Engagement Manager" },
        ],
      },
      {
        name: "Configuration & Build",
        relativeStartOffset: 15,
        relativeEndOffset: 50,
        tasks: [
          {
            name: "Environment setup",
            relativeDueDateOffset: 20,
            effort: 12,
            priority: "High",
            assigneeRolePlaceholder: "DevOps Engineer",
            subtasks: [
              { name: "Development tenant", relativeDueDateOffset: 17, effort: 4 },
              { name: "Staging tenant", relativeDueDateOffset: 19, effort: 4 },
              { name: "Production tenant", relativeDueDateOffset: 20, effort: 4 },
            ],
          },
          { name: "Core configuration", relativeDueDateOffset: 35, effort: 60, priority: "High", assigneeRolePlaceholder: "Senior Consultant" },
          { name: "Custom development", relativeDueDateOffset: 45, effort: 80, priority: "Medium", assigneeRolePlaceholder: "Developer" },
          {
            name: "Data migration prep",
            relativeDueDateOffset: 50,
            effort: 32,
            priority: "High",
            assigneeRolePlaceholder: "Data Engineer",
            subtasks: [
              { name: "Source data audit", relativeDueDateOffset: 40, effort: 12 },
              { name: "Mapping document", relativeDueDateOffset: 45, effort: 10 },
              { name: "Cleanup & transform scripts", relativeDueDateOffset: 50, effort: 10 },
            ],
          },
        ],
      },
      {
        name: "Testing",
        relativeStartOffset: 51,
        relativeEndOffset: 70,
        tasks: [
          { name: "Unit testing", relativeDueDateOffset: 56, effort: 16, assigneeRolePlaceholder: "Developer" },
          { name: "Integration testing", relativeDueDateOffset: 62, effort: 24, priority: "High", assigneeRolePlaceholder: "QA Lead" },
          {
            name: "User acceptance testing",
            relativeDueDateOffset: 70,
            effort: 40,
            priority: "Critical",
            assigneeRolePlaceholder: "QA Lead",
            subtasks: [
              { name: "Test plan", relativeDueDateOffset: 63, effort: 6 },
              {
                name: "Test execution",
                relativeDueDateOffset: 68,
                effort: 28,
                subtasks: [
                  { name: "Smoke tests", relativeDueDateOffset: 65, effort: 6 },
                  { name: "Regression suite", relativeDueDateOffset: 67, effort: 14 },
                  { name: "Edge cases & negative paths", relativeDueDateOffset: 68, effort: 8 },
                ],
              },
              { name: "UAT sign-off", relativeDueDateOffset: 70, effort: 6, priority: "Critical" },
            ],
          },
        ],
      },
      {
        name: "Training & Cutover",
        relativeStartOffset: 71,
        relativeEndOffset: 85,
        tasks: [
          { name: "Train-the-trainer sessions", relativeDueDateOffset: 75, effort: 12, assigneeRolePlaceholder: "Training Lead" },
          { name: "End-user training", relativeDueDateOffset: 80, effort: 24, assigneeRolePlaceholder: "Training Lead" },
          { name: "Cutover plan & dry-run", relativeDueDateOffset: 83, effort: 16, priority: "High", assigneeRolePlaceholder: "Engagement Manager" },
          { name: "Production go-live", relativeDueDateOffset: 85, effort: 12, priority: "Critical", assigneeRolePlaceholder: "Engagement Manager" },
        ],
      },
      {
        name: "Hypercare",
        relativeStartOffset: 86,
        relativeEndOffset: 90,
        tasks: [
          { name: "Daily standups", relativeDueDateOffset: 90, effort: 5 },
          { name: "Issue triage & fixes", relativeDueDateOffset: 90, effort: 20, priority: "High", assigneeRolePlaceholder: "Senior Consultant" },
          { name: "Handover to support", relativeDueDateOffset: 90, effort: 6, priority: "High", assigneeRolePlaceholder: "Engagement Manager" },
        ],
      },
    ],
  },
  {
    name: "Marketing Campaign Launch",
    description:
      "End-to-end campaign delivery from brief to post-mortem. Covers strategy, creative production, build/QA, and launch optimisation.",
    billingType: "Fixed Fee",
    totalDurationDays: 45,
    phases: [
      {
        name: "Strategy & Planning",
        relativeStartOffset: 0,
        relativeEndOffset: 7,
        tasks: [
          { name: "Campaign brief", relativeDueDateOffset: 2, effort: 6, priority: "High", assigneeRolePlaceholder: "Account Director" },
          { name: "Audience segmentation", relativeDueDateOffset: 4, effort: 8, assigneeRolePlaceholder: "Strategist" },
          { name: "Channel strategy", relativeDueDateOffset: 6, effort: 8, assigneeRolePlaceholder: "Strategist" },
          { name: "Kick-off with client", relativeDueDateOffset: 7, effort: 3, priority: "High", assigneeRolePlaceholder: "Account Director" },
        ],
      },
      {
        name: "Creative Production",
        relativeStartOffset: 8,
        relativeEndOffset: 25,
        tasks: [
          {
            name: "Copywriting",
            relativeDueDateOffset: 18,
            effort: 24,
            assigneeRolePlaceholder: "Copywriter",
            subtasks: [
              { name: "Hero & landing copy", relativeDueDateOffset: 14, effort: 8 },
              { name: "Email sequences", relativeDueDateOffset: 16, effort: 10 },
              { name: "Ad variants (A/B/C)", relativeDueDateOffset: 18, effort: 6 },
            ],
          },
          {
            name: "Design",
            relativeDueDateOffset: 22,
            effort: 32,
            assigneeRolePlaceholder: "Senior Designer",
            subtasks: [
              { name: "Visual identity", relativeDueDateOffset: 14, effort: 10 },
              { name: "Display ad set", relativeDueDateOffset: 18, effort: 12 },
              { name: "Landing page mockups", relativeDueDateOffset: 22, effort: 10 },
            ],
          },
          { name: "Video production", relativeDueDateOffset: 25, effort: 24, assigneeRolePlaceholder: "Video Producer" },
        ],
      },
      {
        name: "Build & QA",
        relativeStartOffset: 26,
        relativeEndOffset: 38,
        tasks: [
          { name: "Landing page build", relativeDueDateOffset: 32, effort: 24, assigneeRolePlaceholder: "Frontend Developer" },
          { name: "Email automation setup", relativeDueDateOffset: 34, effort: 12, assigneeRolePlaceholder: "Marketing Ops" },
          { name: "Analytics & tracking", relativeDueDateOffset: 36, effort: 10, priority: "High", assigneeRolePlaceholder: "Marketing Ops" },
          { name: "Pre-launch QA", relativeDueDateOffset: 38, effort: 12, priority: "High", assigneeRolePlaceholder: "QA Lead" },
        ],
      },
      {
        name: "Launch & Optimisation",
        relativeStartOffset: 39,
        relativeEndOffset: 45,
        tasks: [
          { name: "Soft launch", relativeDueDateOffset: 40, effort: 6, priority: "High", assigneeRolePlaceholder: "Account Director" },
          { name: "Full launch", relativeDueDateOffset: 41, effort: 8, priority: "Critical", assigneeRolePlaceholder: "Account Director" },
          { name: "Daily performance optimisation", relativeDueDateOffset: 45, effort: 20, assigneeRolePlaceholder: "Performance Marketer" },
          { name: "Campaign post-mortem", relativeDueDateOffset: 45, effort: 6, assigneeRolePlaceholder: "Strategist" },
        ],
      },
    ],
  },
  {
    name: "Annual Audit Engagement",
    description:
      "Standard external audit cycle: planning, fieldwork, review, and reporting. Default scope is a mid-market client with three primary cycles.",
    billingType: "Fixed Fee",
    totalDurationDays: 60,
    phases: [
      {
        name: "Engagement Setup",
        relativeStartOffset: 0,
        relativeEndOffset: 10,
        tasks: [
          { name: "Engagement letter", relativeDueDateOffset: 3, effort: 4, priority: "High", assigneeRolePlaceholder: "Engagement Partner" },
          { name: "Risk assessment", relativeDueDateOffset: 7, effort: 16, priority: "High", assigneeRolePlaceholder: "Audit Manager" },
          { name: "Audit plan & budget", relativeDueDateOffset: 10, effort: 12, assigneeRolePlaceholder: "Audit Manager" },
        ],
      },
      {
        name: "Fieldwork",
        relativeStartOffset: 11,
        relativeEndOffset: 40,
        tasks: [
          {
            name: "Process walkthroughs",
            relativeDueDateOffset: 20,
            effort: 36,
            assigneeRolePlaceholder: "Senior Auditor",
            subtasks: [
              { name: "Revenue cycle", relativeDueDateOffset: 16, effort: 12 },
              { name: "Procurement cycle", relativeDueDateOffset: 18, effort: 12 },
              { name: "Payroll cycle", relativeDueDateOffset: 20, effort: 12 },
            ],
          },
          { name: "Substantive testing", relativeDueDateOffset: 35, effort: 80, priority: "High", assigneeRolePlaceholder: "Audit Senior" },
          { name: "External confirmations", relativeDueDateOffset: 32, effort: 16, assigneeRolePlaceholder: "Audit Associate" },
          { name: "Inventory observation", relativeDueDateOffset: 40, effort: 12, assigneeRolePlaceholder: "Audit Associate" },
        ],
      },
      {
        name: "Wrap-up & Review",
        relativeStartOffset: 41,
        relativeEndOffset: 55,
        tasks: [
          { name: "Workpaper review", relativeDueDateOffset: 48, effort: 24, priority: "High", assigneeRolePlaceholder: "Audit Manager" },
          { name: "Management letter draft", relativeDueDateOffset: 52, effort: 12, assigneeRolePlaceholder: "Audit Manager" },
          { name: "Partner review & sign-off", relativeDueDateOffset: 55, effort: 10, priority: "Critical", assigneeRolePlaceholder: "Engagement Partner" },
        ],
      },
      {
        name: "Reporting",
        relativeStartOffset: 56,
        relativeEndOffset: 60,
        tasks: [
          { name: "Final audit report", relativeDueDateOffset: 58, effort: 8, priority: "Critical", assigneeRolePlaceholder: "Audit Manager" },
          { name: "Audit committee presentation", relativeDueDateOffset: 60, effort: 6, priority: "High", assigneeRolePlaceholder: "Engagement Partner" },
        ],
      },
    ],
  },
  {
    name: "Website Redesign",
    description:
      "Discovery → design → build → launch. Use for marketing sites, intranets, or brochureware. Includes a Wireframes task with per-breakpoint subtasks.",
    billingType: "Fixed Fee",
    totalDurationDays: 60,
    phases: [
      {
        name: "Discovery",
        relativeStartOffset: 0,
        relativeEndOffset: 10,
        tasks: [
          { name: "Stakeholder workshops", relativeDueDateOffset: 4, effort: 12, priority: "High", assigneeRolePlaceholder: "UX Lead" },
          { name: "Analytics & SEO baseline", relativeDueDateOffset: 7, effort: 8, assigneeRolePlaceholder: "SEO Specialist" },
          { name: "Competitor benchmark", relativeDueDateOffset: 10, effort: 8, assigneeRolePlaceholder: "Strategist" },
        ],
      },
      {
        name: "Design",
        relativeStartOffset: 11,
        relativeEndOffset: 30,
        tasks: [
          { name: "Information architecture", relativeDueDateOffset: 16, effort: 16, priority: "High", assigneeRolePlaceholder: "UX Lead" },
          {
            name: "Wireframes",
            relativeDueDateOffset: 22,
            effort: 30,
            assigneeRolePlaceholder: "UX Designer",
            subtasks: [
              { name: "Homepage", relativeDueDateOffset: 19, effort: 10 },
              { name: "Inner pages", relativeDueDateOffset: 21, effort: 12 },
              { name: "Mobile breakpoints", relativeDueDateOffset: 22, effort: 8 },
            ],
          },
          { name: "Visual design", relativeDueDateOffset: 28, effort: 32, assigneeRolePlaceholder: "Senior Designer" },
          { name: "Interactive prototype review", relativeDueDateOffset: 30, effort: 8, priority: "High", assigneeRolePlaceholder: "UX Lead" },
        ],
      },
      {
        name: "Build",
        relativeStartOffset: 31,
        relativeEndOffset: 50,
        tasks: [
          { name: "CMS setup & theming", relativeDueDateOffset: 38, effort: 30, assigneeRolePlaceholder: "Backend Developer" },
          { name: "Frontend development", relativeDueDateOffset: 46, effort: 60, priority: "High", assigneeRolePlaceholder: "Frontend Developer" },
          { name: "Content migration", relativeDueDateOffset: 48, effort: 24, assigneeRolePlaceholder: "Content Editor" },
          { name: "On-page SEO implementation", relativeDueDateOffset: 50, effort: 12, assigneeRolePlaceholder: "SEO Specialist" },
        ],
      },
      {
        name: "Launch",
        relativeStartOffset: 51,
        relativeEndOffset: 60,
        tasks: [
          { name: "Cross-browser & device QA", relativeDueDateOffset: 55, effort: 16, priority: "High", assigneeRolePlaceholder: "QA Lead" },
          { name: "Performance & accessibility audit", relativeDueDateOffset: 57, effort: 10, priority: "High", assigneeRolePlaceholder: "Frontend Developer" },
          { name: "Soft launch (staged DNS)", relativeDueDateOffset: 58, effort: 6, assigneeRolePlaceholder: "DevOps Engineer" },
          { name: "Production launch", relativeDueDateOffset: 60, effort: 8, priority: "Critical", assigneeRolePlaceholder: "Engagement Manager" },
        ],
      },
    ],
  },
];

async function seedOne(spec: SeedTemplate): Promise<{ skipped: boolean; templateId?: number }> {
  const existing = await db
    .select()
    .from(projectTemplatesTable)
    .where(eq(projectTemplatesTable.name, spec.name));
  if (existing.length > 0) return { skipped: true, templateId: existing[0].id };

  const [template] = await db
    .insert(projectTemplatesTable)
    .values({
      name: spec.name,
      description: spec.description,
      billingType: spec.billingType,
      totalDurationDays: spec.totalDurationDays,
      isArchived: false,
      autoAllocate: false,
    })
    .returning();

  for (let phaseIdx = 0; phaseIdx < spec.phases.length; phaseIdx++) {
    const phaseSpec = spec.phases[phaseIdx];
    const [phase] = await db
      .insert(templatePhasesTable)
      .values({
        templateId: template.id,
        name: phaseSpec.name,
        relativeStartOffset: phaseSpec.relativeStartOffset,
        relativeEndOffset: phaseSpec.relativeEndOffset,
        order: phaseIdx,
      })
      .returning();

    let order = 0;
    async function insertTask(t: SeedTask, parentTaskId: number | null): Promise<void> {
      const [row] = await db
        .insert(templateTasksTable)
        .values({
          templateId: template.id,
          templatePhaseId: phase.id,
          parentTaskId,
          name: t.name,
          relativeDueDateOffset: t.relativeDueDateOffset,
          effort: String(t.effort),
          priority: t.priority ?? "Medium",
          billableDefault: t.billableDefault ?? true,
          assigneeRolePlaceholder: t.assigneeRolePlaceholder ?? null,
          order: order++,
        })
        .returning();
      if (t.subtasks) {
        for (const child of t.subtasks) await insertTask(child, row.id);
      }
    }
    for (const t of phaseSpec.tasks) await insertTask(t, null);
  }

  return { skipped: false, templateId: template.id };
}

export async function seedSampleTemplates(): Promise<{
  inserted: { name: string; id: number }[];
  skipped: { name: string; id: number }[];
}> {
  const inserted: { name: string; id: number }[] = [];
  const skipped: { name: string; id: number }[] = [];
  for (const spec of SAMPLES) {
    const r = await seedOne(spec);
    if (r.skipped && r.templateId) skipped.push({ name: spec.name, id: r.templateId });
    else if (r.templateId) inserted.push({ name: spec.name, id: r.templateId });
  }
  return { inserted, skipped };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  seedSampleTemplates()
    .then((r) => {
      console.log(JSON.stringify(r, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
