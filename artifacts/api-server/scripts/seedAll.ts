/**
 * seedAll.ts
 * Full-database seed for all BusinessNow PSA modules.
 * Idempotent — safe to re-run (skips rows that already exist by a unique sentinel).
 *
 * Run:  node --import tsx artifacts/api-server/scripts/seedAll.ts
 */

import {
  db,
  skillCategoriesTable,
  skillsTable,
  userSkillsTable,
  usersTable,
  accountsTable,
  prospectsTable,
  opportunitiesTable,
  projectsTable,
  tasksTable,
  allocationsTable,
  timesheetsTable,
  timeEntriesTable,
  timeCategoriesTable,
  invoicesTable,
  invoiceLineItemsTable,
  taxCodesTable,
  contractsTable,
  budgetEntriesTable,
  revenueEntriesTable,
  rateCardsTable,
  csatResponsesTable,
  projectTemplatesTable,
  templatePhasesTable,
  templateTasksTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

// ─── helpers ────────────────────────────────────────────────────────────────

function d(offset: number): string {
  const base = new Date("2025-01-06"); // project start anchor
  base.setDate(base.getDate() + offset);
  return base.toISOString().slice(0, 10);
}

function wk(weekOffset: number): string {
  // Returns Monday of the given week offset from 2025-01-06
  const base = new Date("2025-01-06");
  base.setDate(base.getDate() + weekOffset * 7);
  return base.toISOString().slice(0, 10);
}

function invId(year: number, num: number): string {
  return `INV-${year}-${String(num).padStart(3, "0")}`;
}

async function guardSkip<T extends { name: string }>(
  table: any,
  rows: T[],
  nameCol: any,
): Promise<Map<string, number>> {
  const names = rows.map((r) => r.name);
  const existing = await db.select().from(table).where(inArray(nameCol, names));
  const map = new Map<string, number>(existing.map((r: any) => [r.name, r.id]));
  const toInsert = rows.filter((r) => !map.has(r.name));
  if (toInsert.length > 0) {
    const inserted = await db.insert(table).values(toInsert).returning();
    for (const r of inserted) map.set((r as any).name, (r as any).id);
  }
  return map;
}

// ─── 1. TAX CODES ────────────────────────────────────────────────────────────

async function seedTaxCodes(): Promise<Map<string, number>> {
  const rows = [
    { name: "GST 10%",      rate: "10.00", description: "Goods and Services Tax — Australia", isDefault: true,  isActive: 1 },
    { name: "VAT 20%",      rate: "20.00", description: "Value Added Tax — UK",                isDefault: false, isActive: 1 },
    { name: "Tax Exempt",   rate: "0.00",  description: "Zero-rated or exempt supply",          isDefault: false, isActive: 1 },
    { name: "US Sales 8%",  rate: "8.00",  description: "US state blended sales tax",           isDefault: false, isActive: 1 },
  ] as const;
  return guardSkip(taxCodesTable, rows, taxCodesTable.name);
}

// ─── 2. TIME CATEGORIES ──────────────────────────────────────────────────────

async function seedTimeCategories(): Promise<Map<string, number>> {
  const rows = [
    { name: "Consulting",          description: "Billable client consulting hours",         defaultBillable: true,  isActive: 1, sortOrder: 1 },
    { name: "Development",         description: "Billable development and engineering",      defaultBillable: true,  isActive: 1, sortOrder: 2 },
    { name: "Project Management",  description: "Billable PM and coordination",              defaultBillable: true,  isActive: 1, sortOrder: 3 },
    { name: "Testing & QA",        description: "Billable quality assurance",                defaultBillable: true,  isActive: 1, sortOrder: 4 },
    { name: "Training",            description: "Billable client training delivery",         defaultBillable: true,  isActive: 1, sortOrder: 5 },
    { name: "Internal Meetings",   description: "Non-billable internal team meetings",       defaultBillable: false, isActive: 1, sortOrder: 6 },
    { name: "Business Development",description: "Non-billable sales and pre-sales work",    defaultBillable: false, isActive: 1, sortOrder: 7 },
    { name: "Paid Leave",          description: "Annual / personal leave hours",            defaultBillable: false, isActive: 1, sortOrder: 8 },
  ];
  return guardSkip(timeCategoriesTable, rows, timeCategoriesTable.name);
}

// ─── 3. RATE CARDS ───────────────────────────────────────────────────────────

async function seedRateCards(): Promise<Map<string, number>> {
  const defs = [
    {
      name: "Enterprise Standard 2025",
      currency: "USD", status: "Active", effectiveDate: "2025-01-01",
      defaultRate: "200.00",
      roles: [
        { role: "Engagement Manager", rate: 275 },
        { role: "Solution Architect", rate: 260 },
        { role: "Senior Consultant",  rate: 225 },
        { role: "Business Analyst",   rate: 195 },
        { role: "Developer",          rate: 210 },
        { role: "QA Lead",            rate: 185 },
        { role: "DevOps Engineer",    rate: 220 },
        { role: "Consultant",         rate: 175 },
        { role: "Data Analyst",       rate: 180 },
        { role: "Training Lead",      rate: 165 },
      ],
    },
    {
      name: "Mid-Market 2025",
      currency: "USD", status: "Active", effectiveDate: "2025-01-01",
      defaultRate: "160.00",
      roles: [
        { role: "Engagement Manager", rate: 220 },
        { role: "Solution Architect", rate: 210 },
        { role: "Senior Consultant",  rate: 185 },
        { role: "Business Analyst",   rate: 155 },
        { role: "Developer",          rate: 170 },
        { role: "QA Lead",            rate: 150 },
        { role: "Consultant",         rate: 140 },
      ],
    },
    {
      name: "Government & Non-Profit",
      currency: "USD", status: "Active", effectiveDate: "2025-01-01",
      defaultRate: "140.00",
      roles: [
        { role: "Engagement Manager", rate: 190 },
        { role: "Senior Consultant",  rate: 160 },
        { role: "Business Analyst",   rate: 135 },
        { role: "Developer",          rate: 145 },
        { role: "Consultant",         rate: 120 },
      ],
    },
  ];

  const existing = await db.select().from(rateCardsTable);
  const existingNames = new Set(existing.map((r) => r.name));
  const map = new Map(existing.map((r) => [r.name, r.id]));

  for (const def of defs) {
    if (!existingNames.has(def.name)) {
      const [row] = await db.insert(rateCardsTable).values({
        name: def.name,
        currency: def.currency,
        status: def.status,
        effectiveDate: def.effectiveDate,
        defaultRate: def.defaultRate,
        roles: def.roles,
      }).returning();
      map.set(def.name, row.id);
    }
  }
  return map;
}

// ─── 4. SKILL CATEGORIES + SKILLS ────────────────────────────────────────────

async function seedSkills(): Promise<{ catMap: Map<string, number>; skillMap: Map<string, number> }> {
  const catNames = ["Technical", "Consulting", "Domain", "Soft Skills"];
  const catMap = await guardSkip(skillCategoriesTable, catNames.map((n) => ({ name: n })), skillCategoriesTable.name);

  const skillDefs = [
    // Technical
    { name: "Cloud Architecture",      categoryId: catMap.get("Technical")!, skillType: "Level", associatedRoles: ["Solution Architect", "DevOps Engineer"] },
    { name: "ERP Configuration",       categoryId: catMap.get("Technical")!, skillType: "Level", associatedRoles: ["Senior Consultant", "Consultant"] },
    { name: "React / Frontend",        categoryId: catMap.get("Technical")!, skillType: "Level", associatedRoles: ["Developer"] },
    { name: "SQL & Data Modelling",    categoryId: catMap.get("Technical")!, skillType: "Level", associatedRoles: ["Data Analyst", "Developer"] },
    { name: "CI/CD & DevOps",          categoryId: catMap.get("Technical")!, skillType: "Level", associatedRoles: ["DevOps Engineer"] },
    { name: "API Integration",         categoryId: catMap.get("Technical")!, skillType: "Level", associatedRoles: ["Developer", "Solution Architect"] },
    { name: "Test Automation",         categoryId: catMap.get("Technical")!, skillType: "Level", associatedRoles: ["QA Lead"] },
    // Consulting
    { name: "Requirements Elicitation", categoryId: catMap.get("Consulting")!, skillType: "Level", associatedRoles: ["Business Analyst", "Senior Consultant"] },
    { name: "Workshop Facilitation",   categoryId: catMap.get("Consulting")!, skillType: "Level", associatedRoles: ["Engagement Manager", "Senior Consultant"] },
    { name: "Stakeholder Management",  categoryId: catMap.get("Consulting")!, skillType: "Level", associatedRoles: ["Engagement Manager"] },
    { name: "Change Management",       categoryId: catMap.get("Consulting")!, skillType: "Level", associatedRoles: ["Senior Consultant", "Training Lead"] },
    // Domain
    { name: "Financial Services",      categoryId: catMap.get("Domain")!,    skillType: "Level", associatedRoles: ["Senior Consultant", "Business Analyst"] },
    { name: "Healthcare Compliance",   categoryId: catMap.get("Domain")!,    skillType: "Level", associatedRoles: ["Senior Consultant"] },
    { name: "Retail & eCommerce",      categoryId: catMap.get("Domain")!,    skillType: "Level", associatedRoles: ["Business Analyst", "Consultant"] },
    { name: "Manufacturing Ops",       categoryId: catMap.get("Domain")!,    skillType: "Level", associatedRoles: ["Senior Consultant", "Business Analyst"] },
    // Soft Skills
    { name: "Executive Communication", categoryId: catMap.get("Soft Skills")!, skillType: "Level", associatedRoles: ["Engagement Manager", "Solution Architect"] },
    { name: "Presentation & Training", categoryId: catMap.get("Soft Skills")!, skillType: "Level", associatedRoles: ["Training Lead", "Consultant"] },
  ];

  const skillMap = await guardSkip(skillsTable, skillDefs, skillsTable.name);
  return { catMap, skillMap };
}

// ─── 5. USERS ─────────────────────────────────────────────────────────────────

async function seedUsers(): Promise<Map<string, number>> {
  const defs = [
    {
      name: "Sarah Chen",          initials: "SC", role: "account_admin", email: "sarah.chen@ksap.internal",
      department: "Delivery",      region: "APAC",  costRate: "120.00", capacity: 40,
      skills: ["Cloud Architecture", "Stakeholder Management", "Executive Communication"],
      secondaryRoles: [],
    },
    {
      name: "James Okoye",         initials: "JO", role: "super_user",     email: "james.okoye@ksap.internal",
      department: "Delivery",      region: "APAC",  costRate: "105.00", capacity: 40,
      skills: ["Workshop Facilitation", "Stakeholder Management", "Change Management"],
      secondaryRoles: ["collaborator"],
    },
    {
      name: "Priya Nair",          initials: "PN", role: "super_user",     email: "priya.nair@ksap.internal",
      department: "Architecture",  region: "APAC",  costRate: "115.00", capacity: 40,
      skills: ["Cloud Architecture", "API Integration", "ERP Configuration"],
      secondaryRoles: ["collaborator"],
    },
    {
      name: "Marcus Webb",         initials: "MW", role: "super_user",     email: "marcus.webb@ksap.internal",
      department: "Consulting",    region: "APAC",  costRate: "95.00",  capacity: 40,
      skills: ["ERP Configuration", "Requirements Elicitation", "Financial Services"],
      secondaryRoles: ["collaborator"],
    },
    {
      name: "Ana Lima",            initials: "AL", role: "super_user",     email: "ana.lima@ksap.internal",
      department: "Consulting",    region: "APAC",  costRate: "88.00",  capacity: 40,
      skills: ["Requirements Elicitation", "Workshop Facilitation", "Retail & eCommerce"],
      secondaryRoles: ["collaborator"],
    },
    {
      name: "Derek Tan",           initials: "DT", role: "super_user",     email: "derek.tan@ksap.internal",
      department: "Engineering",   region: "APAC",  costRate: "92.00",  capacity: 40,
      skills: ["React / Frontend", "API Integration", "SQL & Data Modelling"],
      secondaryRoles: ["collaborator"],
    },
    {
      name: "Fatima Al-Hassan",    initials: "FA", role: "super_user",     email: "fatima.alhassan@ksap.internal",
      department: "Quality",       region: "APAC",  costRate: "85.00",  capacity: 40,
      skills: ["Test Automation", "Requirements Elicitation", "Healthcare Compliance"],
      secondaryRoles: ["collaborator"],
    },
    {
      name: "Luke Brennan",        initials: "LB", role: "super_user",     email: "luke.brennan@ksap.internal",
      department: "Engineering",   region: "APAC",  costRate: "90.00",  capacity: 40,
      skills: ["CI/CD & DevOps", "Cloud Architecture", "API Integration"],
      secondaryRoles: ["collaborator"],
    },
    {
      name: "Yuki Tanaka",         initials: "YT", role: "collaborator",   email: "yuki.tanaka@ksap.internal",
      department: "Consulting",    region: "APAC",  costRate: "72.00",  capacity: 40,
      skills: ["ERP Configuration", "Presentation & Training"],
      secondaryRoles: [],
    },
    {
      name: "Ravi Patel",          initials: "RP", role: "collaborator",   email: "ravi.patel@ksap.internal",
      department: "Data",          region: "APAC",  costRate: "75.00",  capacity: 40,
      skills: ["SQL & Data Modelling", "Manufacturing Ops"],
      secondaryRoles: [],
    },
    {
      name: "Clara Voss",          initials: "CV", role: "collaborator",   email: "clara.voss@ksap.internal",
      department: "Marketing",     region: "EMEA",  costRate: "70.00",  capacity: 40,
      skills: ["Presentation & Training", "Change Management"],
      secondaryRoles: [],
    },
    {
      name: "Ben Harrison",        initials: "BH", role: "collaborator",   email: "ben.harrison@ksap.internal",
      department: "Engineering",   region: "APAC",  costRate: "65.00",  capacity: 40,
      skills: ["React / Frontend", "SQL & Data Modelling"],
      secondaryRoles: [],
    },
  ];

  const existing = await db.select().from(usersTable);
  const existingEmails = new Set(existing.map((u) => u.email));
  const map = new Map(existing.map((u) => [u.email, u.id]));

  const toInsert = defs.filter((d) => !existingEmails.has(d.email));
  if (toInsert.length > 0) {
    const inserted = await db.insert(usersTable).values(
      toInsert.map((u) => ({
        name: u.name,
        initials: u.initials,
        role: u.role,
        email: u.email,
        department: u.department,
        region: u.region,
        costRate: u.costRate,
        capacity: u.capacity,
        skills: u.skills,
        secondaryRoles: u.secondaryRoles,
        isActive: 1,
        isInternal: true,
        activeStatus: "active",
        onboardingDismissed: false,
      }))
    ).returning();
    for (const u of inserted) map.set((u as any).email, (u as any).id);
  }
  return map;
}

// ─── 6. USER SKILLS ──────────────────────────────────────────────────────────

async function seedUserSkills(
  userMap: Map<string, number>,
  skillMap: Map<string, number>,
): Promise<void> {
  const assignments: Array<{ userEmail: string; skillName: string; level: string }> = [
    // Sarah
    { userEmail: "sarah.chen@ksap.internal",       skillName: "Cloud Architecture",       level: "Expert" },
    { userEmail: "sarah.chen@ksap.internal",       skillName: "Stakeholder Management",   level: "Expert" },
    { userEmail: "sarah.chen@ksap.internal",       skillName: "Executive Communication",  level: "Expert" },
    { userEmail: "sarah.chen@ksap.internal",       skillName: "Workshop Facilitation",    level: "Advanced" },
    // James
    { userEmail: "james.okoye@ksap.internal",      skillName: "Workshop Facilitation",    level: "Expert" },
    { userEmail: "james.okoye@ksap.internal",      skillName: "Stakeholder Management",   level: "Advanced" },
    { userEmail: "james.okoye@ksap.internal",      skillName: "Change Management",        level: "Advanced" },
    { userEmail: "james.okoye@ksap.internal",      skillName: "ERP Configuration",        level: "Intermediate" },
    // Priya
    { userEmail: "priya.nair@ksap.internal",       skillName: "Cloud Architecture",       level: "Expert" },
    { userEmail: "priya.nair@ksap.internal",       skillName: "API Integration",          level: "Expert" },
    { userEmail: "priya.nair@ksap.internal",       skillName: "ERP Configuration",        level: "Advanced" },
    { userEmail: "priya.nair@ksap.internal",       skillName: "CI/CD & DevOps",           level: "Intermediate" },
    // Marcus
    { userEmail: "marcus.webb@ksap.internal",      skillName: "ERP Configuration",        level: "Expert" },
    { userEmail: "marcus.webb@ksap.internal",      skillName: "Requirements Elicitation", level: "Expert" },
    { userEmail: "marcus.webb@ksap.internal",      skillName: "Financial Services",       level: "Advanced" },
    { userEmail: "marcus.webb@ksap.internal",      skillName: "Workshop Facilitation",    level: "Advanced" },
    // Ana
    { userEmail: "ana.lima@ksap.internal",         skillName: "Requirements Elicitation", level: "Advanced" },
    { userEmail: "ana.lima@ksap.internal",         skillName: "Workshop Facilitation",    level: "Advanced" },
    { userEmail: "ana.lima@ksap.internal",         skillName: "Retail & eCommerce",       level: "Expert" },
    { userEmail: "ana.lima@ksap.internal",         skillName: "Change Management",        level: "Intermediate" },
    // Derek
    { userEmail: "derek.tan@ksap.internal",        skillName: "React / Frontend",         level: "Expert" },
    { userEmail: "derek.tan@ksap.internal",        skillName: "API Integration",          level: "Advanced" },
    { userEmail: "derek.tan@ksap.internal",        skillName: "SQL & Data Modelling",     level: "Advanced" },
    // Fatima
    { userEmail: "fatima.alhassan@ksap.internal",  skillName: "Test Automation",          level: "Expert" },
    { userEmail: "fatima.alhassan@ksap.internal",  skillName: "Requirements Elicitation", level: "Intermediate" },
    { userEmail: "fatima.alhassan@ksap.internal",  skillName: "Healthcare Compliance",    level: "Advanced" },
    // Luke
    { userEmail: "luke.brennan@ksap.internal",     skillName: "CI/CD & DevOps",           level: "Expert" },
    { userEmail: "luke.brennan@ksap.internal",     skillName: "Cloud Architecture",       level: "Advanced" },
    { userEmail: "luke.brennan@ksap.internal",     skillName: "API Integration",          level: "Advanced" },
    // Yuki
    { userEmail: "yuki.tanaka@ksap.internal",      skillName: "ERP Configuration",        level: "Intermediate" },
    { userEmail: "yuki.tanaka@ksap.internal",      skillName: "Presentation & Training",  level: "Advanced" },
    // Ravi
    { userEmail: "ravi.patel@ksap.internal",       skillName: "SQL & Data Modelling",     level: "Expert" },
    { userEmail: "ravi.patel@ksap.internal",       skillName: "Manufacturing Ops",        level: "Advanced" },
    // Clara
    { userEmail: "clara.voss@ksap.internal",       skillName: "Presentation & Training",  level: "Expert" },
    { userEmail: "clara.voss@ksap.internal",       skillName: "Change Management",        level: "Intermediate" },
    // Ben
    { userEmail: "ben.harrison@ksap.internal",     skillName: "React / Frontend",         level: "Intermediate" },
    { userEmail: "ben.harrison@ksap.internal",     skillName: "SQL & Data Modelling",     level: "Intermediate" },
  ];

  const existingUserSkills = await db.select().from(userSkillsTable);
  const existingSet = new Set(
    existingUserSkills.map((us) => `${us.userId}:${us.skillId}`)
  );

  const toInsert = assignments.filter((a) => {
    const uid = userMap.get(a.userEmail);
    const sid = skillMap.get(a.skillName);
    if (!uid || !sid) return false;
    return !existingSet.has(`${uid}:${sid}`);
  });

  if (toInsert.length > 0) {
    await db.insert(userSkillsTable).values(
      toInsert.map((a) => ({
        userId: userMap.get(a.userEmail)!,
        skillId: skillMap.get(a.skillName)!,
        proficiencyLevel: a.level,
      }))
    );
  }
}

// ─── 7. ACCOUNTS ─────────────────────────────────────────────────────────────

async function seedAccounts(): Promise<Map<string, number>> {
  const defs = [
    {
      name: "Meridian Financial Group",   domain: "meridianfg.com",    tier: "Enterprise",
      region: "APAC",   status: "Active", accountType: "client",
      contractValue: "2400000.00",
      billingAddress: "Level 32, 200 George Street, Sydney NSW 2000, Australia",
    },
    {
      name: "TechNova Solutions",          domain: "technova.io",        tier: "Growth",
      region: "APAC",   status: "Active", accountType: "client",
      contractValue: "480000.00",
      billingAddress: "88 Collins Street, Melbourne VIC 3000, Australia",
    },
    {
      name: "Apex Manufacturing Ltd",      domain: "apexmanufacturing.com", tier: "Enterprise",
      region: "APAC",   status: "Active", accountType: "client",
      contractValue: "1800000.00",
      billingAddress: "1 Innovation Drive, Geelong VIC 3220, Australia",
    },
    {
      name: "Greenfield Retail Co.",       domain: "greenfieldretail.com.au", tier: "Mid-Market",
      region: "APAC",   status: "Active", accountType: "client",
      contractValue: "620000.00",
      billingAddress: "350 Queen Street, Brisbane QLD 4000, Australia",
    },
    {
      name: "Solaris Healthcare",          domain: "solarishealth.org",  tier: "Enterprise",
      region: "APAC",   status: "Active", accountType: "client",
      contractValue: "3100000.00",
      billingAddress: "50 Flinders Street, Adelaide SA 5000, Australia",
    },
    {
      name: "Blueprint Architects Pty",    domain: "blueprintarch.com.au", tier: "SMB",
      region: "APAC",   status: "Active", accountType: "client",
      contractValue: "240000.00",
      billingAddress: "23 King Street, Perth WA 6000, Australia",
    },
  ];

  return guardSkip(accountsTable, defs, accountsTable.name);
}

// ─── 8. PROSPECTS ────────────────────────────────────────────────────────────

async function seedProspects(userMap: Map<string, number>): Promise<void> {
  const sarahId = userMap.get("sarah.chen@ksap.internal")!;
  const jamesId = userMap.get("james.okoye@ksap.internal")!;

  const defs = [
    {
      name: "Coastal Logistics Pty",  contactName: "Diana Marsh",    contactEmail: "diana.marsh@coastallogistics.com.au",
      contactPhone: "+61 2 9987 3210", status: "Qualified",  source: "Referral",
      estimatedValue: "380000.00",
      notes: "Interested in ERP implementation across 3 warehouses. Decision expected Q2 2025.", ownerId: jamesId,
    },
    {
      name: "Ironvale Mining Corp",   contactName: "Tom Reeve",      contactEmail: "treeve@ironvale.com.au",
      contactPhone: "+61 8 9321 5566", status: "Contacted", source: "Trade Show",
      estimatedValue: "1200000.00",
      notes: "Met at MineEx 2024. Looking for asset management solution. Very early stage.", ownerId: sarahId,
    },
    {
      name: "Redwood Education Trust", contactName: "Fiona Clarke",  contactEmail: "fiona.c@redwoodedu.org.au",
      contactPhone: "+61 3 9845 7721", status: "Proposal Sent", source: "Inbound",
      estimatedValue: "290000.00",
      notes: "LMS implementation for 8 campuses. Proposal delivered 15 Feb 2025.", ownerId: jamesId,
    },
    {
      name: "Fortuna Insurance",      contactName: "Neil Bhatia",    contactEmail: "n.bhatia@fortuna.com.au",
      contactPhone: "+61 2 8210 4400", status: "New",       source: "LinkedIn",
      estimatedValue: "560000.00",
      notes: "Regulatory reporting modernisation. Needs compliance-aware BA.", ownerId: sarahId,
    },
    {
      name: "Harland Foods Group",    contactName: "Jessica Ng",     contactEmail: "j.ng@harlandfoods.com.au",
      contactPhone: "+61 7 3392 1104", status: "Qualified", source: "Partner",
      estimatedValue: "220000.00",
      notes: "Supply chain visibility project. Budget approved at board level.", ownerId: jamesId,
    },
    {
      name: "Pacific Urban Planning", contactName: "Clive Staton",   contactEmail: "c.staton@pacificu.com.au",
      contactPhone: "+61 2 9641 0033", status: "Contacted", source: "Conference",
      estimatedValue: "175000.00",
      notes: "Wants project portfolio management platform for 6 departments.", ownerId: sarahId,
    },
  ];

  const existing = await db.select().from(prospectsTable);
  const existingNames = new Set(existing.map((p) => p.name));
  const toInsert = defs.filter((p) => !existingNames.has(p.name));
  if (toInsert.length > 0) {
    await db.insert(prospectsTable).values(toInsert);
  }
}

// ─── 9. OPPORTUNITIES ────────────────────────────────────────────────────────

async function seedOpportunities(
  accountMap: Map<string, number>,
  userMap: Map<string, number>,
): Promise<Map<string, number>> {
  const sarahId = userMap.get("sarah.chen@ksap.internal")!;
  const jamesId = userMap.get("james.okoye@ksap.internal")!;

  const defs = [
    {
      name: "Meridian HRIS Modernisation Phase 2",
      accountId: accountMap.get("Meridian Financial Group")!, stage: "Proposal", probability: 65,
      value: "850000.00", closeDate: "2025-06-30", ownerId: jamesId,
      description: "Extension engagement following Phase 1 ERP success. Covers HR & payroll module integration.",
    },
    {
      name: "TechNova API Platform Build",
      accountId: accountMap.get("TechNova Solutions")!, stage: "Discovery", probability: 40,
      value: "320000.00", closeDate: "2025-07-31", ownerId: sarahId,
      description: "Greenfield API gateway and developer portal. T&M engagement.",
    },
    {
      name: "Apex MES Integration",
      accountId: accountMap.get("Apex Manufacturing Ltd")!, stage: "Negotiation", probability: 85,
      value: "420000.00", closeDate: "2025-05-15", ownerId: jamesId,
      description: "Manufacturing execution system integration with SAP. Near-term close.",
    },
    {
      name: "Greenfield Loyalty Platform",
      accountId: accountMap.get("Greenfield Retail Co.")!, stage: "Won", probability: 100,
      value: "280000.00", closeDate: "2025-03-01", ownerId: sarahId,
      description: "Retail loyalty programme build. Signed SOW.",
    },
    {
      name: "Solaris Patient Portal",
      accountId: accountMap.get("Solaris Healthcare")!, stage: "Won", probability: 100,
      value: "740000.00", closeDate: "2025-02-15", ownerId: jamesId,
      description: "Patient-facing portal with HL7 FHIR integration. Full project now active.",
    },
    {
      name: "Blueprint Practice Management",
      accountId: accountMap.get("Blueprint Architects Pty")!, stage: "Closed Lost", probability: 0,
      value: "195000.00", closeDate: "2025-01-31", ownerId: sarahId,
      description: "Went with off-the-shelf solution. Keep warm for future.",
    },
    {
      name: "Meridian Regulatory Reporting Automation",
      accountId: accountMap.get("Meridian Financial Group")!, stage: "Qualification", probability: 30,
      value: "560000.00", closeDate: "2025-09-30", ownerId: jamesId,
      description: "APRA reporting automation. Early-stage discovery call scheduled.",
    },
    {
      name: "Solaris Pathology Lab Digitalisation",
      accountId: accountMap.get("Solaris Healthcare")!, stage: "Proposal", probability: 55,
      value: "920000.00", closeDate: "2025-08-31", ownerId: sarahId,
      description: "End-to-end lab specimen tracking system. RFP response submitted.",
    },
  ];

  const existing = await db.select().from(opportunitiesTable);
  const existingNames = new Set(existing.map((o) => o.name));
  const map = new Map(existing.map((o) => [o.name, o.id]));
  const toInsert = defs.filter((o) => !existingNames.has(o.name));
  if (toInsert.length > 0) {
    const inserted = await db.insert(opportunitiesTable).values(toInsert).returning();
    for (const r of inserted) map.set((r as any).name, (r as any).id);
  }
  return map;
}

// ─── 10. PROJECTS ─────────────────────────────────────────────────────────────

async function seedProjects(
  accountMap: Map<string, number>,
  userMap: Map<string, number>,
  rateCardMap: Map<string, number>,
): Promise<Map<string, number>> {
  const sarahId  = userMap.get("sarah.chen@ksap.internal")!;
  const jamesId  = userMap.get("james.okoye@ksap.internal")!;
  const priyaId  = userMap.get("priya.nair@ksap.internal")!;
  const marcusId = userMap.get("marcus.webb@ksap.internal")!;

  const entRcId = rateCardMap.get("Enterprise Standard 2025")!;
  const midRcId = rateCardMap.get("Mid-Market 2025")!;

  const defs = [
    {
      name: "Meridian ERP Implementation",
      accountId: accountMap.get("Meridian Financial Group")!,
      ownerId: jamesId, rateCardId: entRcId,
      startDate: d(0), dueDate: d(90), status: "Active",
      billingType: "Time & Materials", budget: "1200000.00",
      allocatedHours: "1100.00", budgetedHours: "1100.00",
      completion: 45, health: "On Track",
      description: "Full ERP rollout covering Finance, HR, and Supply Chain modules. Five-phase delivery.",
      customerChampion: "Rachel Whitmore (CFO)",
    },
    {
      name: "TechNova Platform Redesign",
      accountId: accountMap.get("TechNova Solutions")!,
      ownerId: sarahId, rateCardId: midRcId,
      startDate: d(7), dueDate: d(67), status: "Active",
      billingType: "Fixed Fee", budget: "480000.00",
      allocatedHours: "520.00", budgetedHours: "520.00",
      completion: 38, health: "On Track",
      description: "Complete website and product platform redesign. Covers UX research, design system, CMS build, and SEO migration.",
      customerChampion: "Aisha Patel (Head of Product)",
    },
    {
      name: "Apex Manufacturing Campaign",
      accountId: accountMap.get("Apex Manufacturing Ltd")!,
      ownerId: marcusId, rateCardId: midRcId,
      startDate: d(14), dueDate: d(59), status: "Active",
      billingType: "Fixed Fee", budget: "185000.00",
      allocatedHours: "310.00", budgetedHours: "310.00",
      completion: 60, health: "At Risk",
      description: "Brand relaunch campaign targeting B2B industrial buyers. Creative delay has compressed launch schedule.",
      customerChampion: "Mark Sherbourne (CMO)",
    },
    {
      name: "Greenfield Digital Transformation",
      accountId: accountMap.get("Greenfield Retail Co.")!,
      ownerId: jamesId, rateCardId: midRcId,
      startDate: d(-30), dueDate: d(120), status: "Active",
      billingType: "Time & Materials", budget: "620000.00",
      allocatedHours: "900.00", budgetedHours: "900.00",
      completion: 28, health: "On Track",
      description: "Omni-channel retail transformation: POS integration, loyalty platform, and customer analytics.",
      customerChampion: "Linda Chow (CTO)",
    },
    {
      name: "Solaris Patient Portal",
      accountId: accountMap.get("Solaris Healthcare")!,
      ownerId: priyaId, rateCardId: entRcId,
      startDate: d(-14), dueDate: d(76), status: "Active",
      billingType: "Fixed Fee", budget: "740000.00",
      allocatedHours: "820.00", budgetedHours: "820.00",
      completion: 32, health: "On Track",
      description: "HL7 FHIR-compliant patient portal with appointment booking, results viewing, and secure messaging.",
      customerChampion: "Dr. Vivienne Lau (CMIO)",
    },
    {
      name: "Blueprint CRM Rollout",
      accountId: accountMap.get("Blueprint Architects Pty")!,
      ownerId: marcusId, rateCardId: rateCardMap.get("Mid-Market 2025")!,
      startDate: d(-60), dueDate: d(10), status: "Active",
      billingType: "Fixed Fee", budget: "240000.00",
      allocatedHours: "400.00", budgetedHours: "400.00",
      completion: 90, health: "On Track",
      description: "CRM implementation and process redesign for a 45-seat architecture practice. Approaching final cutover.",
      customerChampion: "George Alderton (Managing Partner)",
    },
  ];

  const existing = await db.select().from(projectsTable);
  const existingNames = new Set(existing.map((p) => p.name));
  const map = new Map(existing.map((p) => [p.name, p.id]));
  const toInsert = defs.filter((p) => !existingNames.has(p.name));
  if (toInsert.length > 0) {
    const inserted = await db.insert(projectsTable).values(toInsert).returning();
    for (const r of inserted) map.set((r as any).name, (r as any).id);
  }
  return map;
}

// ─── 11. TASKS (phases + tasks per project) ───────────────────────────────────

async function seedTasks(
  projectMap: Map<string, number>,
  userMap: Map<string, number>,
): Promise<Map<string, number>> {
  const existing = await db.select().from(tasksTable);
  const existingSet = new Set(existing.map((t) => `${t.projectId}:${t.name}`));
  const map = new Map(existing.map((t) => [`${t.projectId}:${t.name}`, t.id]));

  const jamesId  = userMap.get("james.okoye@ksap.internal")!;
  const priyaId  = userMap.get("priya.nair@ksap.internal")!;
  const marcusId = userMap.get("marcus.webb@ksap.internal")!;
  const anaId    = userMap.get("ana.lima@ksap.internal")!;
  const derekId  = userMap.get("derek.tan@ksap.internal")!;
  const fatimaId = userMap.get("fatima.alhassan@ksap.internal")!;
  const lukeId   = userMap.get("luke.brennan@ksap.internal")!;
  const yukiId   = userMap.get("yuki.tanaka@ksap.internal")!;
  const raviId   = userMap.get("ravi.patel@ksap.internal")!;
  const benId    = userMap.get("ben.harrison@ksap.internal")!;

  type TaskDef = {
    name: string; isPhase?: boolean; parentName?: string;
    status?: string; priority?: string;
    startDate?: string; dueDate?: string;
    plannedHours?: number; effort?: number;
    assigneeIds?: number[];
    billable?: boolean;
  };

  const projectTasks: Record<string, TaskDef[]> = {
    "Meridian ERP Implementation": [
      // Phases
      { name: "Discovery & Planning",   isPhase: true, startDate: d(0),  dueDate: d(14),  status: "Done",        priority: "High"     },
      { name: "Configuration & Build",  isPhase: true, startDate: d(15), dueDate: d(50),  status: "In Progress", priority: "High"     },
      { name: "Testing",                isPhase: true, startDate: d(51), dueDate: d(70),  status: "Not Started", priority: "High"     },
      { name: "Training & Cutover",     isPhase: true, startDate: d(71), dueDate: d(85),  status: "Not Started", priority: "Medium"   },
      { name: "Hypercare",              isPhase: true, startDate: d(86), dueDate: d(90),  status: "Not Started", priority: "Medium"   },
      // Phase 1 tasks
      { name: "Stakeholder interviews", parentName: "Discovery & Planning",   status: "Done", priority: "High",     startDate: d(0),  dueDate: d(5),  plannedHours: 12, assigneeIds: [jamesId],         billable: true },
      { name: "Requirements gathering", parentName: "Discovery & Planning",   status: "Done", priority: "High",     startDate: d(3),  dueDate: d(10), plannedHours: 24, assigneeIds: [anaId],            billable: true },
      { name: "Solution design",        parentName: "Discovery & Planning",   status: "Done", priority: "High",     startDate: d(8),  dueDate: d(13), plannedHours: 16, assigneeIds: [priyaId],          billable: true },
      { name: "SOW sign-off",           parentName: "Discovery & Planning",   status: "Done", priority: "Critical", startDate: d(13), dueDate: d(14), plannedHours: 4,  assigneeIds: [jamesId],          billable: false },
      // Phase 2 tasks
      { name: "Environment setup",      parentName: "Configuration & Build",  status: "Done",        priority: "High",   startDate: d(15), dueDate: d(20), plannedHours: 12, assigneeIds: [lukeId],  billable: true },
      { name: "Core configuration",     parentName: "Configuration & Build",  status: "In Progress", priority: "High",   startDate: d(21), dueDate: d(35), plannedHours: 60, assigneeIds: [marcusId, yukiId], billable: true },
      { name: "Custom development",     parentName: "Configuration & Build",  status: "In Progress", priority: "Medium", startDate: d(25), dueDate: d(45), plannedHours: 80, assigneeIds: [derekId, benId],  billable: true },
      { name: "Data migration prep",    parentName: "Configuration & Build",  status: "In Progress", priority: "High",   startDate: d(30), dueDate: d(50), plannedHours: 32, assigneeIds: [raviId],          billable: true },
      // Phase 3 tasks
      { name: "Integration testing",    parentName: "Testing",                status: "Not Started", priority: "High",     startDate: d(51), dueDate: d(62), plannedHours: 24, assigneeIds: [fatimaId], billable: true },
      { name: "User acceptance testing",parentName: "Testing",                status: "Not Started", priority: "Critical", startDate: d(62), dueDate: d(70), plannedHours: 40, assigneeIds: [fatimaId, anaId], billable: true },
    ],

    "TechNova Platform Redesign": [
      { name: "Discovery",    isPhase: true, startDate: d(7),  dueDate: d(17),  status: "Done",        priority: "High" },
      { name: "Design",       isPhase: true, startDate: d(18), dueDate: d(37),  status: "In Progress", priority: "High" },
      { name: "Build",        isPhase: true, startDate: d(38), dueDate: d(57),  status: "Not Started", priority: "High" },
      { name: "Launch",       isPhase: true, startDate: d(58), dueDate: d(67),  status: "Not Started", priority: "Medium" },
      { name: "Stakeholder workshops",         parentName: "Discovery", status: "Done",        priority: "High",   startDate: d(7),  dueDate: d(11), plannedHours: 12, assigneeIds: [jamesId],          billable: true },
      { name: "Analytics & SEO baseline",      parentName: "Discovery", status: "Done",        priority: "Medium", startDate: d(11), dueDate: d(14), plannedHours: 8,  assigneeIds: [anaId],            billable: true },
      { name: "Competitor benchmark",          parentName: "Discovery", status: "Done",        priority: "Low",    startDate: d(14), dueDate: d(17), plannedHours: 8,  assigneeIds: [anaId],            billable: true },
      { name: "Information architecture",      parentName: "Design",    status: "Done",        priority: "High",   startDate: d(18), dueDate: d(23), plannedHours: 16, assigneeIds: [priyaId],          billable: true },
      { name: "Wireframes",                    parentName: "Design",    status: "In Progress", priority: "High",   startDate: d(23), dueDate: d(29), plannedHours: 30, assigneeIds: [derekId],          billable: true },
      { name: "Visual design",                 parentName: "Design",    status: "In Progress", priority: "High",   startDate: d(28), dueDate: d(37), plannedHours: 32, assigneeIds: [derekId, benId],   billable: true },
      { name: "CMS setup & theming",           parentName: "Build",     status: "Not Started", priority: "High",   startDate: d(38), dueDate: d(45), plannedHours: 30, assigneeIds: [lukeId],           billable: true },
      { name: "Frontend development",          parentName: "Build",     status: "Not Started", priority: "High",   startDate: d(43), dueDate: d(53), plannedHours: 60, assigneeIds: [derekId, benId],   billable: true },
      { name: "Content migration",             parentName: "Build",     status: "Not Started", priority: "Medium", startDate: d(51), dueDate: d(55), plannedHours: 24, assigneeIds: [anaId],            billable: true },
      { name: "Cross-browser QA",              parentName: "Launch",    status: "Not Started", priority: "High",   startDate: d(58), dueDate: d(62), plannedHours: 16, assigneeIds: [fatimaId],         billable: true },
      { name: "Production launch",             parentName: "Launch",    status: "Not Started", priority: "Critical",startDate: d(65), dueDate: d(67), plannedHours: 8,  assigneeIds: [lukeId, jamesId],  billable: false },
    ],

    "Apex Manufacturing Campaign": [
      { name: "Strategy & Planning",    isPhase: true, startDate: d(14), dueDate: d(21), status: "Done",        priority: "High"   },
      { name: "Creative Production",    isPhase: true, startDate: d(22), dueDate: d(39), status: "Done",        priority: "High"   },
      { name: "Build & QA",             isPhase: true, startDate: d(40), dueDate: d(52), status: "In Progress", priority: "High"   },
      { name: "Launch & Optimisation",  isPhase: true, startDate: d(53), dueDate: d(59), status: "Not Started", priority: "High"   },
      { name: "Campaign brief",         parentName: "Strategy & Planning",   status: "Done", priority: "High",     startDate: d(14), dueDate: d(16), plannedHours: 6,  assigneeIds: [jamesId],          billable: true },
      { name: "Audience segmentation",  parentName: "Strategy & Planning",   status: "Done", priority: "Medium",   startDate: d(16), dueDate: d(18), plannedHours: 8,  assigneeIds: [anaId],            billable: true },
      { name: "Channel strategy",       parentName: "Strategy & Planning",   status: "Done", priority: "Medium",   startDate: d(18), dueDate: d(20), plannedHours: 8,  assigneeIds: [anaId],            billable: true },
      { name: "Copywriting",            parentName: "Creative Production",   status: "Done", priority: "Medium",   startDate: d(22), dueDate: d(32), plannedHours: 24, assigneeIds: [yukiId],           billable: true },
      { name: "Design",                 parentName: "Creative Production",   status: "Done", priority: "High",     startDate: d(22), dueDate: d(36), plannedHours: 32, assigneeIds: [derekId],          billable: true },
      { name: "Video production",       parentName: "Creative Production",   status: "Done", priority: "Medium",   startDate: d(30), dueDate: d(39), plannedHours: 24, assigneeIds: [marcusId],         billable: true },
      { name: "Landing page build",     parentName: "Build & QA",            status: "In Progress", priority: "High",   startDate: d(40), dueDate: d(46), plannedHours: 24, assigneeIds: [derekId, benId], billable: true },
      { name: "Email automation setup", parentName: "Build & QA",            status: "In Progress", priority: "Medium", startDate: d(44), dueDate: d(48), plannedHours: 12, assigneeIds: [benId],          billable: true },
      { name: "Analytics & tracking",   parentName: "Build & QA",            status: "Not Started", priority: "High",   startDate: d(48), dueDate: d(50), plannedHours: 10, assigneeIds: [raviId],         billable: true },
      { name: "Pre-launch QA",          parentName: "Build & QA",            status: "Not Started", priority: "High",   startDate: d(50), dueDate: d(52), plannedHours: 12, assigneeIds: [fatimaId],       billable: true },
      { name: "Full launch",            parentName: "Launch & Optimisation", status: "Not Started", priority: "Critical",startDate: d(55), dueDate: d(55), plannedHours: 8,  assigneeIds: [jamesId, marcusId], billable: false },
      { name: "Campaign optimisation",  parentName: "Launch & Optimisation", status: "Not Started", priority: "Medium", startDate: d(55), dueDate: d(59), plannedHours: 20, assigneeIds: [anaId],          billable: true },
    ],

    "Greenfield Digital Transformation": [
      { name: "Foundation & Architecture", isPhase: true, startDate: d(-30), dueDate: d(-1),  status: "Done",        priority: "High" },
      { name: "POS Integration",           isPhase: true, startDate: d(0),   dueDate: d(45),  status: "In Progress", priority: "High" },
      { name: "Loyalty Platform",          isPhase: true, startDate: d(30),  dueDate: d(90),  status: "Not Started", priority: "High" },
      { name: "Customer Analytics",        isPhase: true, startDate: d(70),  dueDate: d(120), status: "Not Started", priority: "Medium" },
      { name: "Architecture design",       parentName: "Foundation & Architecture", status: "Done", priority: "High",   startDate: d(-30), dueDate: d(-20), plannedHours: 40, assigneeIds: [priyaId],  billable: true },
      { name: "Infrastructure provisioning",parentName: "Foundation & Architecture", status: "Done", priority: "High",  startDate: d(-20), dueDate: d(-10), plannedHours: 32, assigneeIds: [lukeId],  billable: true },
      { name: "Data model design",         parentName: "Foundation & Architecture", status: "Done", priority: "High",   startDate: d(-15), dueDate: d(-5),  plannedHours: 24, assigneeIds: [raviId],   billable: true },
      { name: "POS API integration",       parentName: "POS Integration",           status: "In Progress", priority: "High",   startDate: d(0),  dueDate: d(30), plannedHours: 80, assigneeIds: [derekId, benId],   billable: true },
      { name: "Inventory sync",            parentName: "POS Integration",           status: "In Progress", priority: "High",   startDate: d(15), dueDate: d(40), plannedHours: 48, assigneeIds: [derekId],          billable: true },
      { name: "Payment gateway integration",parentName: "POS Integration",          status: "Not Started", priority: "Critical",startDate: d(35), dueDate: d(45), plannedHours: 32, assigneeIds: [priyaId, derekId], billable: true },
      { name: "Loyalty programme design",  parentName: "Loyalty Platform",          status: "Not Started", priority: "High",   startDate: d(30), dueDate: d(50), plannedHours: 40, assigneeIds: [anaId, jamesId],   billable: true },
      { name: "Loyalty app build",         parentName: "Loyalty Platform",          status: "Not Started", priority: "High",   startDate: d(50), dueDate: d(80), plannedHours: 80, assigneeIds: [derekId, benId],   billable: true },
      { name: "Analytics dashboard",       parentName: "Customer Analytics",        status: "Not Started", priority: "Medium", startDate: d(70), dueDate: d(110), plannedHours: 60, assigneeIds: [raviId, derekId], billable: true },
    ],

    "Solaris Patient Portal": [
      { name: "Discovery & Architecture", isPhase: true, startDate: d(-14), dueDate: d(0),  status: "Done",        priority: "High" },
      { name: "Core Portal Build",        isPhase: true, startDate: d(1),   dueDate: d(40), status: "In Progress", priority: "High" },
      { name: "HL7 FHIR Integration",     isPhase: true, startDate: d(20),  dueDate: d(55), status: "In Progress", priority: "Critical" },
      { name: "Security & Compliance",    isPhase: true, startDate: d(50),  dueDate: d(65), status: "Not Started", priority: "Critical" },
      { name: "UAT & Go-Live",            isPhase: true, startDate: d(65),  dueDate: d(76), status: "Not Started", priority: "High" },
      { name: "FHIR requirements workshop",    parentName: "Discovery & Architecture", status: "Done", priority: "Critical", startDate: d(-14), dueDate: d(-8),  plannedHours: 16, assigneeIds: [priyaId, jamesId],  billable: true },
      { name: "Clinical workflow mapping",     parentName: "Discovery & Architecture", status: "Done", priority: "High",     startDate: d(-8),  dueDate: d(-2),  plannedHours: 24, assigneeIds: [anaId],             billable: true },
      { name: "Solution blueprint",            parentName: "Discovery & Architecture", status: "Done", priority: "High",     startDate: d(-5),  dueDate: d(0),   plannedHours: 16, assigneeIds: [priyaId],           billable: true },
      { name: "Patient registration module",   parentName: "Core Portal Build",        status: "Done",        priority: "High",     startDate: d(1),  dueDate: d(15), plannedHours: 40, assigneeIds: [derekId, benId],   billable: true },
      { name: "Appointment booking module",    parentName: "Core Portal Build",        status: "In Progress", priority: "High",     startDate: d(15), dueDate: d(30), plannedHours: 48, assigneeIds: [derekId, benId],   billable: true },
      { name: "Secure messaging module",       parentName: "Core Portal Build",        status: "Not Started", priority: "Medium",   startDate: d(28), dueDate: d(40), plannedHours: 32, assigneeIds: [derekId],          billable: true },
      { name: "FHIR R4 adapter",              parentName: "HL7 FHIR Integration",     status: "In Progress", priority: "Critical", startDate: d(20), dueDate: d(45), plannedHours: 80, assigneeIds: [priyaId, lukeId],  billable: true },
      { name: "Lab results viewer",            parentName: "HL7 FHIR Integration",     status: "Not Started", priority: "High",     startDate: d(40), dueDate: d(55), plannedHours: 40, assigneeIds: [derekId],          billable: true },
      { name: "Pen test & remediation",        parentName: "Security & Compliance",    status: "Not Started", priority: "Critical", startDate: d(50), dueDate: d(60), plannedHours: 32, assigneeIds: [lukeId, fatimaId], billable: true },
      { name: "HIPAA/Australian Privacy Act review", parentName: "Security & Compliance", status: "Not Started", priority: "Critical", startDate: d(58), dueDate: d(65), plannedHours: 16, assigneeIds: [jamesId],     billable: true },
      { name: "Clinical UAT",                  parentName: "UAT & Go-Live",            status: "Not Started", priority: "Critical", startDate: d(65), dueDate: d(72), plannedHours: 40, assigneeIds: [fatimaId, anaId],  billable: true },
      { name: "Production deployment",         parentName: "UAT & Go-Live",            status: "Not Started", priority: "Critical", startDate: d(74), dueDate: d(76), plannedHours: 16, assigneeIds: [lukeId, priyaId],  billable: false },
    ],

    "Blueprint CRM Rollout": [
      { name: "Setup & Configuration",  isPhase: true, startDate: d(-60), dueDate: d(-35), status: "Done",        priority: "High" },
      { name: "Data Migration",         isPhase: true, startDate: d(-35), dueDate: d(-15), status: "Done",        priority: "High" },
      { name: "Training",               isPhase: true, startDate: d(-15), dueDate: d(0),   status: "Done",        priority: "High" },
      { name: "Cutover & Hypercare",    isPhase: true, startDate: d(0),   dueDate: d(10),  status: "In Progress", priority: "High" },
      { name: "CRM instance setup",     parentName: "Setup & Configuration", status: "Done", priority: "High",   startDate: d(-60), dueDate: d(-50), plannedHours: 20, assigneeIds: [marcusId],         billable: true },
      { name: "Pipeline configuration", parentName: "Setup & Configuration", status: "Done", priority: "High",   startDate: d(-50), dueDate: d(-40), plannedHours: 24, assigneeIds: [marcusId, yukiId], billable: true },
      { name: "Email & calendar sync",  parentName: "Setup & Configuration", status: "Done", priority: "Medium", startDate: d(-42), dueDate: d(-35), plannedHours: 12, assigneeIds: [lukeId],           billable: true },
      { name: "Contact data cleanse",   parentName: "Data Migration",        status: "Done", priority: "High",   startDate: d(-35), dueDate: d(-25), plannedHours: 32, assigneeIds: [raviId],           billable: true },
      { name: "Migration run & verify", parentName: "Data Migration",        status: "Done", priority: "High",   startDate: d(-25), dueDate: d(-15), plannedHours: 24, assigneeIds: [raviId, marcusId], billable: true },
      { name: "Admin training",         parentName: "Training",              status: "Done", priority: "Medium", startDate: d(-15), dueDate: d(-8),  plannedHours: 12, assigneeIds: [yukiId],           billable: true },
      { name: "End-user training",      parentName: "Training",              status: "Done", priority: "Medium", startDate: d(-8),  dueDate: d(0),   plannedHours: 24, assigneeIds: [yukiId, marcusId], billable: true },
      { name: "Go-live cutover",        parentName: "Cutover & Hypercare",   status: "Done",        priority: "Critical", startDate: d(0),  dueDate: d(2),   plannedHours: 12, assigneeIds: [lukeId, marcusId], billable: false },
      { name: "Hypercare support",      parentName: "Cutover & Hypercare",   status: "In Progress", priority: "High",     startDate: d(2),  dueDate: d(10),  plannedHours: 20, assigneeIds: [marcusId, yukiId], billable: true },
    ],
  };

  let sortOrder = 0;
  for (const [projName, tasks] of Object.entries(projectTasks)) {
    const projectId = projectMap.get(projName);
    if (!projectId) continue;

    // First pass: insert phases
    const phaseIdMap = new Map<string, number>();
    for (const t of tasks.filter((t) => t.isPhase)) {
      const key = `${projectId}:${t.name}`;
      if (!existingSet.has(key)) {
        const [row] = await db.insert(tasksTable).values({
          projectId, name: t.name, isPhase: true,
          status: t.status ?? "Not Started",
          priority: t.priority ?? "Medium",
          startDate: t.startDate, dueDate: t.dueDate,
          plannedHours: "0", effort: "0",
          billable: false, assigneeIds: [], sortOrder: sortOrder++,
        }).returning();
        phaseIdMap.set(t.name, row.id);
        map.set(key, row.id);
        existingSet.add(key);
      } else {
        phaseIdMap.set(t.name, map.get(key)!);
      }
    }

    // Second pass: insert tasks
    for (const t of tasks.filter((t) => !t.isPhase)) {
      const key = `${projectId}:${t.name}`;
      if (existingSet.has(key)) continue;
      const parentId = t.parentName ? phaseIdMap.get(t.parentName) : undefined;
      const [row] = await db.insert(tasksTable).values({
        projectId,
        parentTaskId: parentId ?? null,
        name: t.name,
        isPhase: false,
        status: t.status ?? "Not Started",
        priority: t.priority ?? "Medium",
        startDate: t.startDate,
        dueDate: t.dueDate,
        plannedHours: String(t.plannedHours ?? 0),
        effort: String(t.effort ?? t.plannedHours ?? 0),
        estimateHours: String(t.plannedHours ?? 0),
        billable: t.billable ?? true,
        assigneeIds: t.assigneeIds ?? [],
        sortOrder: sortOrder++,
      }).returning();
      map.set(key, row.id);
      existingSet.add(key);
    }
  }
  return map;
}

// ─── 12. ALLOCATIONS ─────────────────────────────────────────────────────────

async function seedAllocations(
  projectMap: Map<string, number>,
  userMap: Map<string, number>,
): Promise<void> {
  const jamesId  = userMap.get("james.okoye@ksap.internal")!;
  const priyaId  = userMap.get("priya.nair@ksap.internal")!;
  const marcusId = userMap.get("marcus.webb@ksap.internal")!;
  const anaId    = userMap.get("ana.lima@ksap.internal")!;
  const derekId  = userMap.get("derek.tan@ksap.internal")!;
  const fatimaId = userMap.get("fatima.alhassan@ksap.internal")!;
  const lukeId   = userMap.get("luke.brennan@ksap.internal")!;
  const yukiId   = userMap.get("yuki.tanaka@ksap.internal")!;
  const raviId   = userMap.get("ravi.patel@ksap.internal")!;
  const benId    = userMap.get("ben.harrison@ksap.internal")!;

  type AllocDef = { projectName: string; userId: number; role: string; startDate: string; endDate: string; hoursPerWeek: number; isSoft?: boolean };

  const defs: AllocDef[] = [
    // Meridian ERP
    { projectName: "Meridian ERP Implementation", userId: jamesId,  role: "Engagement Manager", startDate: d(0),  endDate: d(90),  hoursPerWeek: 20 },
    { projectName: "Meridian ERP Implementation", userId: priyaId,  role: "Solution Architect",  startDate: d(0),  endDate: d(50),  hoursPerWeek: 30 },
    { projectName: "Meridian ERP Implementation", userId: marcusId, role: "Senior Consultant",   startDate: d(15), endDate: d(90),  hoursPerWeek: 32 },
    { projectName: "Meridian ERP Implementation", userId: anaId,    role: "Business Analyst",    startDate: d(0),  endDate: d(70),  hoursPerWeek: 30 },
    { projectName: "Meridian ERP Implementation", userId: derekId,  role: "Developer",           startDate: d(20), endDate: d(70),  hoursPerWeek: 28 },
    { projectName: "Meridian ERP Implementation", userId: fatimaId, role: "QA Lead",             startDate: d(51), endDate: d(90),  hoursPerWeek: 32 },
    { projectName: "Meridian ERP Implementation", userId: lukeId,   role: "DevOps Engineer",     startDate: d(15), endDate: d(30),  hoursPerWeek: 20 },
    { projectName: "Meridian ERP Implementation", userId: yukiId,   role: "Consultant",          startDate: d(20), endDate: d(60),  hoursPerWeek: 24 },
    { projectName: "Meridian ERP Implementation", userId: raviId,   role: "Data Analyst",        startDate: d(30), endDate: d(70),  hoursPerWeek: 20 },
    { projectName: "Meridian ERP Implementation", userId: benId,    role: "Developer",           startDate: d(25), endDate: d(70),  hoursPerWeek: 24 },

    // TechNova Redesign
    { projectName: "TechNova Platform Redesign",  userId: jamesId,  role: "Engagement Manager",  startDate: d(7),  endDate: d(67),  hoursPerWeek: 12 },
    { projectName: "TechNova Platform Redesign",  userId: priyaId,  role: "Solution Architect",  startDate: d(7),  endDate: d(37),  hoursPerWeek: 24 },
    { projectName: "TechNova Platform Redesign",  userId: anaId,    role: "Business Analyst",    startDate: d(7),  endDate: d(55),  hoursPerWeek: 20 },
    { projectName: "TechNova Platform Redesign",  userId: derekId,  role: "Developer",           startDate: d(23), endDate: d(67),  hoursPerWeek: 32 },
    { projectName: "TechNova Platform Redesign",  userId: lukeId,   role: "DevOps Engineer",     startDate: d(38), endDate: d(67),  hoursPerWeek: 16 },
    { projectName: "TechNova Platform Redesign",  userId: fatimaId, role: "QA Lead",             startDate: d(55), endDate: d(67),  hoursPerWeek: 24 },
    { projectName: "TechNova Platform Redesign",  userId: benId,    role: "Developer",           startDate: d(27), endDate: d(60),  hoursPerWeek: 20 },

    // Apex Campaign
    { projectName: "Apex Manufacturing Campaign", userId: jamesId,  role: "Engagement Manager",  startDate: d(14), endDate: d(59),  hoursPerWeek: 10 },
    { projectName: "Apex Manufacturing Campaign", userId: marcusId, role: "Senior Consultant",   startDate: d(14), endDate: d(59),  hoursPerWeek: 20 },
    { projectName: "Apex Manufacturing Campaign", userId: anaId,    role: "Business Analyst",    startDate: d(14), endDate: d(50),  hoursPerWeek: 16 },
    { projectName: "Apex Manufacturing Campaign", userId: derekId,  role: "Developer",           startDate: d(40), endDate: d(55),  hoursPerWeek: 24 },
    { projectName: "Apex Manufacturing Campaign", userId: fatimaId, role: "QA Lead",             startDate: d(48), endDate: d(59),  hoursPerWeek: 16 },
    { projectName: "Apex Manufacturing Campaign", userId: raviId,   role: "Data Analyst",        startDate: d(45), endDate: d(59),  hoursPerWeek: 12 },
    { projectName: "Apex Manufacturing Campaign", userId: benId,    role: "Developer",           startDate: d(40), endDate: d(55),  hoursPerWeek: 20 },
    { projectName: "Apex Manufacturing Campaign", userId: yukiId,   role: "Consultant",          startDate: d(20), endDate: d(45),  hoursPerWeek: 16 },

    // Greenfield
    { projectName: "Greenfield Digital Transformation", userId: jamesId,  role: "Engagement Manager", startDate: d(-30), endDate: d(120), hoursPerWeek: 16 },
    { projectName: "Greenfield Digital Transformation", userId: priyaId,  role: "Solution Architect",  startDate: d(-30), endDate: d(60),  hoursPerWeek: 24 },
    { projectName: "Greenfield Digital Transformation", userId: anaId,    role: "Business Analyst",    startDate: d(-30), endDate: d(90),  hoursPerWeek: 20 },
    { projectName: "Greenfield Digital Transformation", userId: derekId,  role: "Developer",           startDate: d(0),   endDate: d(120), hoursPerWeek: 32 },
    { projectName: "Greenfield Digital Transformation", userId: lukeId,   role: "DevOps Engineer",     startDate: d(-20), endDate: d(20),  hoursPerWeek: 20 },
    { projectName: "Greenfield Digital Transformation", userId: raviId,   role: "Data Analyst",        startDate: d(-15), endDate: d(120), hoursPerWeek: 24 },
    { projectName: "Greenfield Digital Transformation", userId: benId,    role: "Developer",           startDate: d(15),  endDate: d(120), hoursPerWeek: 24 },

    // Solaris
    { projectName: "Solaris Patient Portal", userId: priyaId,  role: "Solution Architect", startDate: d(-14), endDate: d(76), hoursPerWeek: 28 },
    { projectName: "Solaris Patient Portal", userId: jamesId,  role: "Engagement Manager", startDate: d(-14), endDate: d(76), hoursPerWeek: 12 },
    { projectName: "Solaris Patient Portal", userId: anaId,    role: "Business Analyst",   startDate: d(-14), endDate: d(45), hoursPerWeek: 24 },
    { projectName: "Solaris Patient Portal", userId: derekId,  role: "Developer",          startDate: d(1),   endDate: d(65), hoursPerWeek: 32 },
    { projectName: "Solaris Patient Portal", userId: lukeId,   role: "DevOps Engineer",    startDate: d(20),  endDate: d(76), hoursPerWeek: 20 },
    { projectName: "Solaris Patient Portal", userId: fatimaId, role: "QA Lead",            startDate: d(50),  endDate: d(76), hoursPerWeek: 28 },
    { projectName: "Solaris Patient Portal", userId: benId,    role: "Developer",          startDate: d(1),   endDate: d(55), hoursPerWeek: 24 },

    // Blueprint CRM
    { projectName: "Blueprint CRM Rollout", userId: marcusId, role: "Senior Consultant",   startDate: d(-60), endDate: d(10), hoursPerWeek: 28 },
    { projectName: "Blueprint CRM Rollout", userId: jamesId,  role: "Engagement Manager",  startDate: d(-60), endDate: d(10), hoursPerWeek: 8  },
    { projectName: "Blueprint CRM Rollout", userId: lukeId,   role: "DevOps Engineer",     startDate: d(-60), endDate: d(10), hoursPerWeek: 12 },
    { projectName: "Blueprint CRM Rollout", userId: raviId,   role: "Data Analyst",        startDate: d(-35), endDate: d(-10), hoursPerWeek: 24 },
    { projectName: "Blueprint CRM Rollout", userId: yukiId,   role: "Consultant",          startDate: d(-55), endDate: d(10), hoursPerWeek: 20 },
  ];

  const existingAllocs = await db.select().from(allocationsTable);
  const existingSet = new Set(existingAllocs.map((a) => `${a.projectId}:${a.userId}:${a.startDate}`));

  const toInsert = defs.filter((d) => {
    const pid = projectMap.get(d.projectName);
    if (!pid) return false;
    return !existingSet.has(`${pid}:${d.userId}:${d.startDate}`);
  });

  if (toInsert.length > 0) {
    await db.insert(allocationsTable).values(
      toInsert.map((a) => ({
        projectId: projectMap.get(a.projectName)!,
        userId: a.userId,
        role: a.role,
        startDate: a.startDate,
        endDate: a.endDate,
        hoursPerWeek: String(a.hoursPerWeek),
        hoursPerDay: String((a.hoursPerWeek / 5).toFixed(2)),
        totalHours: String(a.hoursPerWeek * Math.ceil(
          (new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / (7 * 86400000)
        )),
        allocationMethod: "hours_per_week",
        isSoftAllocation: a.isSoft ?? false,
        source: "manual",
        isTimesheetApprover: false,
        isLeaveApprover: false,
      }))
    );
  }
}

// ─── 13. TIME CATEGORIES (already done above, but need IDs for time entries) ──

// ─── 14. TIMESHEETS + TIME ENTRIES ───────────────────────────────────────────

async function seedTimeEntries(
  projectMap: Map<string, number>,
  taskMap: Map<string, number>,
  userMap: Map<string, number>,
  catMap: Map<string, number>,
): Promise<void> {
  const jamesId  = userMap.get("james.okoye@ksap.internal")!;
  const priyaId  = userMap.get("priya.nair@ksap.internal")!;
  const marcusId = userMap.get("marcus.webb@ksap.internal")!;
  const anaId    = userMap.get("ana.lima@ksap.internal")!;
  const derekId  = userMap.get("derek.tan@ksap.internal")!;
  const fatimaId = userMap.get("fatima.alhassan@ksap.internal")!;
  const lukeId   = userMap.get("luke.brennan@ksap.internal")!;
  const yukiId   = userMap.get("yuki.tanaka@ksap.internal")!;
  const raviId   = userMap.get("ravi.patel@ksap.internal")!;
  const benId    = userMap.get("ben.harrison@ksap.internal")!;

  const consulting = catMap.get("Consulting")!;
  const development = catMap.get("Development")!;
  const pm = catMap.get("Project Management")!;
  const qa = catMap.get("Testing & QA")!;
  const training = catMap.get("Training")!;

  const meridId = projectMap.get("Meridian ERP Implementation")!;
  const techId  = projectMap.get("TechNova Platform Redesign")!;
  const apexId  = projectMap.get("Apex Manufacturing Campaign")!;
  const greenId = projectMap.get("Greenfield Digital Transformation")!;
  const solId   = projectMap.get("Solaris Patient Portal")!;
  const bpId    = projectMap.get("Blueprint CRM Rollout")!;

  const existingEntries = await db.select().from(timeEntriesTable);
  const existingSet = new Set(existingEntries.map((e) => `${e.userId}:${e.date}:${e.projectId}`));

  type EntryDef = { userId: number; projectId: number; date: string; hours: number; categoryId: number; billable?: boolean; description: string; approved?: boolean; appliedBillRate?: string; appliedCostRate?: string };

  // Generate realistic 8-week history of entries
  const entries: EntryDef[] = [];

  function addEntry(e: EntryDef) {
    if (!existingSet.has(`${e.userId}:${e.date}:${e.projectId}`)) {
      entries.push(e);
      existingSet.add(`${e.userId}:${e.date}:${e.projectId}`);
    }
  }

  // James — Engagement Manager across multiple projects
  for (let w = 0; w < 8; w++) {
    const mon = new Date(wk(w)); if (mon > new Date()) break;
    addEntry({ userId: jamesId, projectId: meridId, date: wk(w),                               hours: 4, categoryId: pm,         billable: true,  description: "Weekly status call + planning", approved: true, appliedBillRate: "275.00", appliedCostRate: "105.00" });
    addEntry({ userId: jamesId, projectId: meridId, date: new Date(mon.getTime()+86400000).toISOString().slice(0,10), hours: 6, categoryId: consulting,  billable: true, description: "Stakeholder engagement", approved: true, appliedBillRate: "275.00", appliedCostRate: "105.00" });
    addEntry({ userId: jamesId, projectId: techId,  date: new Date(mon.getTime()+2*86400000).toISOString().slice(0,10), hours: 3, categoryId: pm, billable: true, description: "TechNova checkpoint", approved: true, appliedBillRate: "220.00", appliedCostRate: "105.00" });
    addEntry({ userId: jamesId, projectId: greenId, date: new Date(mon.getTime()+3*86400000).toISOString().slice(0,10), hours: 4, categoryId: pm, billable: true, description: "Greenfield steering committee", approved: true, appliedBillRate: "275.00", appliedCostRate: "105.00" });
    addEntry({ userId: jamesId, projectId: bpId,    date: new Date(mon.getTime()+4*86400000).toISOString().slice(0,10), hours: 2, categoryId: pm, billable: true, description: "Blueprint weekly review", approved: true, appliedBillRate: "220.00", appliedCostRate: "105.00" });
  }

  // Priya — Solution Architect
  for (let w = 0; w < 8; w++) {
    const mon = new Date(wk(w)); if (mon > new Date()) break;
    addEntry({ userId: priyaId, projectId: meridId, date: wk(w),                               hours: 6, categoryId: consulting, billable: true, description: "ERP architecture review", approved: true, appliedBillRate: "260.00", appliedCostRate: "115.00" });
    addEntry({ userId: priyaId, projectId: meridId, date: new Date(mon.getTime()+86400000).toISOString().slice(0,10), hours: 7, categoryId: consulting, billable: true, description: "Integration design sessions", approved: true, appliedBillRate: "260.00", appliedCostRate: "115.00" });
    addEntry({ userId: priyaId, projectId: solId,   date: new Date(mon.getTime()+2*86400000).toISOString().slice(0,10), hours: 7, categoryId: consulting, billable: true, description: "FHIR adapter design", approved: true, appliedBillRate: "260.00", appliedCostRate: "115.00" });
    addEntry({ userId: priyaId, projectId: techId,  date: new Date(mon.getTime()+3*86400000).toISOString().slice(0,10), hours: 6, categoryId: consulting, billable: true, description: "Information architecture", approved: true, appliedBillRate: "210.00", appliedCostRate: "115.00" });
    addEntry({ userId: priyaId, projectId: greenId, date: new Date(mon.getTime()+4*86400000).toISOString().slice(0,10), hours: 6, categoryId: consulting, billable: true, description: "Cloud infrastructure design", approved: true, appliedBillRate: "260.00", appliedCostRate: "115.00" });
  }

  // Marcus — Senior Consultant
  for (let w = 0; w < 8; w++) {
    const mon = new Date(wk(w)); if (mon > new Date()) break;
    addEntry({ userId: marcusId, projectId: meridId, date: wk(w),                               hours: 7, categoryId: consulting, billable: true, description: "Finance module configuration", approved: true, appliedBillRate: "225.00", appliedCostRate: "95.00" });
    addEntry({ userId: marcusId, projectId: meridId, date: new Date(mon.getTime()+86400000).toISOString().slice(0,10), hours: 8, categoryId: consulting, billable: true, description: "Supply chain module config", approved: true, appliedBillRate: "225.00", appliedCostRate: "95.00" });
    addEntry({ userId: marcusId, projectId: apexId,  date: new Date(mon.getTime()+2*86400000).toISOString().slice(0,10), hours: 5, categoryId: consulting, billable: true, description: "Campaign strategy workshop", approved: true, appliedBillRate: "185.00", appliedCostRate: "95.00" });
    addEntry({ userId: marcusId, projectId: bpId,    date: new Date(mon.getTime()+3*86400000).toISOString().slice(0,10), hours: 6, categoryId: consulting, billable: true, description: "CRM pipeline configuration", approved: true, appliedBillRate: "185.00", appliedCostRate: "95.00" });
    addEntry({ userId: marcusId, projectId: bpId,    date: new Date(mon.getTime()+4*86400000).toISOString().slice(0,10), hours: 5, categoryId: training,   billable: true, description: "End-user CRM training session", approved: true, appliedBillRate: "185.00", appliedCostRate: "95.00" });
  }

  // Ana — Business Analyst
  for (let w = 0; w < 8; w++) {
    const mon = new Date(wk(w)); if (mon > new Date()) break;
    addEntry({ userId: anaId, projectId: meridId, date: wk(w),                               hours: 6, categoryId: consulting, billable: true, description: "Requirements documentation", approved: true, appliedBillRate: "195.00", appliedCostRate: "88.00" });
    addEntry({ userId: anaId, projectId: meridId, date: new Date(mon.getTime()+86400000).toISOString().slice(0,10), hours: 7, categoryId: consulting, billable: true, description: "Process mapping workshops", approved: true, appliedBillRate: "195.00", appliedCostRate: "88.00" });
    addEntry({ userId: anaId, projectId: techId,  date: new Date(mon.getTime()+2*86400000).toISOString().slice(0,10), hours: 5, categoryId: consulting, billable: true, description: "UX research synthesis", approved: true, appliedBillRate: "155.00", appliedCostRate: "88.00" });
    addEntry({ userId: anaId, projectId: apexId,  date: new Date(mon.getTime()+3*86400000).toISOString().slice(0,10), hours: 4, categoryId: consulting, billable: true, description: "Audience analysis", approved: true, appliedBillRate: "155.00", appliedCostRate: "88.00" });
    addEntry({ userId: anaId, projectId: greenId, date: new Date(mon.getTime()+4*86400000).toISOString().slice(0,10), hours: 5, categoryId: consulting, billable: true, description: "Digital transformation gap analysis", approved: true, appliedBillRate: "195.00", appliedCostRate: "88.00" });
  }

  // Derek — Developer
  for (let w = 0; w < 8; w++) {
    const mon = new Date(wk(w)); if (mon > new Date()) break;
    addEntry({ userId: derekId, projectId: meridId, date: wk(w),                               hours: 7, categoryId: development, billable: true, description: "Custom module development", approved: true, appliedBillRate: "210.00", appliedCostRate: "92.00" });
    addEntry({ userId: derekId, projectId: meridId, date: new Date(mon.getTime()+86400000).toISOString().slice(0,10), hours: 8, categoryId: development, billable: true, description: "API integration build", approved: true, appliedBillRate: "210.00", appliedCostRate: "92.00" });
    addEntry({ userId: derekId, projectId: techId,  date: new Date(mon.getTime()+2*86400000).toISOString().slice(0,10), hours: 7, categoryId: development, billable: true, description: "Wireframes & design system", approved: true, appliedBillRate: "170.00", appliedCostRate: "92.00" });
    addEntry({ userId: derekId, projectId: apexId,  date: new Date(mon.getTime()+3*86400000).toISOString().slice(0,10), hours: 5, categoryId: development, billable: true, description: "Landing page build", approved: true, appliedBillRate: "170.00", appliedCostRate: "92.00" });
    addEntry({ userId: derekId, projectId: greenId, date: new Date(mon.getTime()+4*86400000).toISOString().slice(0,10), hours: 6, categoryId: development, billable: true, description: "POS API integration", approved: true, appliedBillRate: "210.00", appliedCostRate: "92.00" });
  }

  // Luke — DevOps
  for (let w = 0; w < 6; w++) {
    const mon = new Date(wk(w)); if (mon > new Date()) break;
    addEntry({ userId: lukeId, projectId: meridId, date: wk(w),                               hours: 5, categoryId: development, billable: true, description: "Environment provisioning", approved: true, appliedBillRate: "220.00", appliedCostRate: "90.00" });
    addEntry({ userId: lukeId, projectId: solId,   date: new Date(mon.getTime()+2*86400000).toISOString().slice(0,10), hours: 7, categoryId: development, billable: true, description: "FHIR infrastructure setup", approved: true, appliedBillRate: "220.00", appliedCostRate: "90.00" });
    addEntry({ userId: lukeId, projectId: greenId, date: new Date(mon.getTime()+3*86400000).toISOString().slice(0,10), hours: 5, categoryId: development, billable: true, description: "Cloud infra provisioning", approved: true, appliedBillRate: "220.00", appliedCostRate: "90.00" });
    addEntry({ userId: lukeId, projectId: bpId,    date: new Date(mon.getTime()+4*86400000).toISOString().slice(0,10), hours: 3, categoryId: development, billable: true, description: "CRM hosting config", approved: true, appliedBillRate: "185.00", appliedCostRate: "90.00" });
  }

  // Fatima — QA
  for (let w = 2; w < 8; w++) {
    const mon = new Date(wk(w)); if (mon > new Date()) break;
    addEntry({ userId: fatimaId, projectId: meridId, date: wk(w),                               hours: 6, categoryId: qa, billable: true, description: "Test case authoring", approved: true, appliedBillRate: "185.00", appliedCostRate: "85.00" });
    addEntry({ userId: fatimaId, projectId: apexId,  date: new Date(mon.getTime()+2*86400000).toISOString().slice(0,10), hours: 4, categoryId: qa, billable: true, description: "Campaign QA round 1", approved: true, appliedBillRate: "150.00", appliedCostRate: "85.00" });
  }

  // Ravi — Data Analyst
  for (let w = 0; w < 7; w++) {
    const mon = new Date(wk(w)); if (mon > new Date()) break;
    addEntry({ userId: raviId, projectId: meridId, date: wk(w),                               hours: 5, categoryId: consulting, billable: true, description: "Data mapping and cleanse", approved: true, appliedBillRate: "180.00", appliedCostRate: "75.00" });
    addEntry({ userId: raviId, projectId: greenId, date: new Date(mon.getTime()+2*86400000).toISOString().slice(0,10), hours: 6, categoryId: consulting, billable: true, description: "Analytics model design", approved: true, appliedBillRate: "180.00", appliedCostRate: "75.00" });
    addEntry({ userId: raviId, projectId: bpId,    date: new Date(mon.getTime()+4*86400000).toISOString().slice(0,10), hours: 5, categoryId: consulting, billable: true, description: "Contact data audit", approved: true, appliedBillRate: "155.00", appliedCostRate: "75.00" });
  }

  // Ben — Junior Developer
  for (let w = 1; w < 8; w++) {
    const mon = new Date(wk(w)); if (mon > new Date()) break;
    addEntry({ userId: benId, projectId: meridId, date: wk(w),                               hours: 7, categoryId: development, billable: true, description: "Frontend component build", approved: true, appliedBillRate: "210.00", appliedCostRate: "65.00" });
    addEntry({ userId: benId, projectId: techId,  date: new Date(mon.getTime()+2*86400000).toISOString().slice(0,10), hours: 6, categoryId: development, billable: true, description: "Visual design implementation", approved: true, appliedBillRate: "170.00", appliedCostRate: "65.00" });
    addEntry({ userId: benId, projectId: apexId,  date: new Date(mon.getTime()+4*86400000).toISOString().slice(0,10), hours: 5, categoryId: development, billable: true, description: "Email template build", approved: true, appliedBillRate: "170.00", appliedCostRate: "65.00" });
  }

  // Yuki — Consultant
  for (let w = 0; w < 7; w++) {
    const mon = new Date(wk(w)); if (mon > new Date()) break;
    addEntry({ userId: yukiId, projectId: meridId, date: wk(w),                               hours: 6, categoryId: consulting, billable: true, description: "ERP core config support", approved: true, appliedBillRate: "175.00", appliedCostRate: "72.00" });
    addEntry({ userId: yukiId, projectId: apexId,  date: new Date(mon.getTime()+2*86400000).toISOString().slice(0,10), hours: 4, categoryId: consulting, billable: true, description: "Copywriting review", approved: true, appliedBillRate: "140.00", appliedCostRate: "72.00" });
    addEntry({ userId: yukiId, projectId: bpId,    date: new Date(mon.getTime()+4*86400000).toISOString().slice(0,10), hours: 5, categoryId: training,   billable: true, description: "CRM user training", approved: true, appliedBillRate: "140.00", appliedCostRate: "72.00" });
  }

  if (entries.length > 0) {
    // Batch insert in chunks of 50
    for (let i = 0; i < entries.length; i += 50) {
      await db.insert(timeEntriesTable).values(
        entries.slice(i, i + 50).map((e) => ({
          userId: e.userId,
          projectId: e.projectId,
          date: e.date,
          hours: String(e.hours),
          categoryId: e.categoryId,
          billable: e.billable ?? true,
          description: e.description,
          approved: e.approved ?? false,
          appliedBillRate: e.appliedBillRate ?? null,
          appliedCostRate: e.appliedCostRate ?? null,
        }))
      );
    }
  }
}

// ─── 15. INVOICES + LINE ITEMS ────────────────────────────────────────────────

async function seedInvoices(
  projectMap: Map<string, number>,
  accountMap: Map<string, number>,
  taxMap: Map<string, number>,
): Promise<void> {
  const meridProjId  = projectMap.get("Meridian ERP Implementation")!;
  const techProjId   = projectMap.get("TechNova Platform Redesign")!;
  const apexProjId   = projectMap.get("Apex Manufacturing Campaign")!;
  const greenProjId  = projectMap.get("Greenfield Digital Transformation")!;
  const solProjId    = projectMap.get("Solaris Patient Portal")!;
  const bpProjId     = projectMap.get("Blueprint CRM Rollout")!;

  const meridAccId = accountMap.get("Meridian Financial Group")!;
  const techAccId  = accountMap.get("TechNova Solutions")!;
  const apexAccId  = accountMap.get("Apex Manufacturing Ltd")!;
  const greenAccId = accountMap.get("Greenfield Retail Co.")!;
  const solAccId   = accountMap.get("Solaris Healthcare")!;
  const bpAccId    = accountMap.get("Blueprint Architects Pty")!;

  const gst10 = taxMap.get("GST 10%")!;

  const invDefs = [
    // Meridian — 3 invoices (2 paid, 1 sent)
    {
      id: invId(2025, 1), projectId: meridProjId, accountId: meridAccId,
      issueDate: "2025-01-31", dueDate: "2025-02-14", status: "Paid",
      description: "Professional Services — January 2025 (Discovery Phase)",
      billTo: "Meridian Financial Group, Accounts Payable",
      amount: "185000.00", tax: "18500.00", total: "203500.00",
      lines: [
        { desc: "Stakeholder Interviews & Requirements Gathering — 56 hrs", qty: "56", rate: "260.00", amt: "14560.00", taxId: gst10 },
        { desc: "Solution Architecture & Design — 40 hrs",                  qty: "40", rate: "260.00", amt: "10400.00", taxId: gst10 },
        { desc: "Project Management & Coordination — 32 hrs",               qty: "32", rate: "275.00", amt: "8800.00",  taxId: gst10 },
        { desc: "Fixed milestone: Discovery phase completion",              qty: "1",  rate: "151240.00", amt: "151240.00", taxId: gst10 },
      ],
    },
    {
      id: invId(2025, 2), projectId: meridProjId, accountId: meridAccId,
      issueDate: "2025-02-28", dueDate: "2025-03-14", status: "Paid",
      description: "Professional Services — February 2025 (Configuration Sprint 1)",
      billTo: "Meridian Financial Group, Accounts Payable",
      amount: "240000.00", tax: "24000.00", total: "264000.00",
      lines: [
        { desc: "ERP Configuration — Finance Module — 80 hrs",   qty: "80", rate: "225.00", amt: "18000.00", taxId: gst10 },
        { desc: "Custom Development — Phase 1 — 96 hrs",         qty: "96", rate: "210.00", amt: "20160.00", taxId: gst10 },
        { desc: "Data Migration Preparation — 48 hrs",           qty: "48", rate: "180.00", amt: "8640.00",  taxId: gst10 },
        { desc: "Fixed progress payment — Configuration Sprint 1", qty: "1", rate: "193200.00", amt: "193200.00", taxId: gst10 },
      ],
    },
    {
      id: invId(2025, 3), projectId: meridProjId, accountId: meridAccId,
      issueDate: "2025-03-31", dueDate: "2025-04-14", status: "Sent",
      description: "Professional Services — March 2025 (Configuration Sprint 2 + Integration)",
      billTo: "Meridian Financial Group, Accounts Payable",
      amount: "210000.00", tax: "21000.00", total: "231000.00",
      lines: [
        { desc: "ERP Configuration — Supply Chain Module — 72 hrs", qty: "72", rate: "225.00", amt: "16200.00", taxId: gst10 },
        { desc: "API Integration Development — 88 hrs",              qty: "88", rate: "210.00", amt: "18480.00", taxId: gst10 },
        { desc: "DevOps & Infrastructure — 24 hrs",                  qty: "24", rate: "220.00", amt: "5280.00",  taxId: gst10 },
        { desc: "Progress payment — Integration milestone",          qty: "1",  rate: "170040.00", amt: "170040.00", taxId: gst10 },
      ],
    },
    // TechNova — 2 invoices (1 paid, 1 sent)
    {
      id: invId(2025, 4), projectId: techProjId, accountId: techAccId,
      issueDate: "2025-01-31", dueDate: "2025-02-14", status: "Paid",
      description: "Discovery & UX Research Phase — TechNova Platform",
      billTo: "TechNova Solutions, Finance Team",
      amount: "96000.00", tax: "9600.00", total: "105600.00",
      lines: [
        { desc: "Discovery & stakeholder workshops — 32 hrs",  qty: "32", rate: "260.00", amt: "8320.00",  taxId: gst10 },
        { desc: "UX research & synthesis — 40 hrs",            qty: "40", rate: "195.00", amt: "7800.00",  taxId: gst10 },
        { desc: "Competitor benchmark analysis — 16 hrs",      qty: "16", rate: "195.00", amt: "3120.00",  taxId: gst10 },
        { desc: "Phase 1 fixed fee — Discovery",               qty: "1",  rate: "76760.00", amt: "76760.00", taxId: gst10 },
      ],
    },
    {
      id: invId(2025, 5), projectId: techProjId, accountId: techAccId,
      issueDate: "2025-02-28", dueDate: "2025-03-14", status: "Sent",
      description: "Design Phase — Information Architecture & Wireframes",
      billTo: "TechNova Solutions, Finance Team",
      amount: "144000.00", tax: "14400.00", total: "158400.00",
      lines: [
        { desc: "Information architecture — 40 hrs", qty: "40", rate: "260.00", amt: "10400.00", taxId: gst10 },
        { desc: "Wireframes & prototyping — 64 hrs", qty: "64", rate: "210.00", amt: "13440.00", taxId: gst10 },
        { desc: "Visual design — 48 hrs",            qty: "48", rate: "210.00", amt: "10080.00", taxId: gst10 },
        { desc: "Phase 2 fixed fee — Design",        qty: "1",  rate: "110080.00", amt: "110080.00", taxId: gst10 },
      ],
    },
    // Apex — 1 paid, 1 overdue
    {
      id: invId(2025, 6), projectId: apexProjId, accountId: apexAccId,
      issueDate: "2025-01-31", dueDate: "2025-02-14", status: "Paid",
      description: "Campaign Strategy & Creative Production — Phase 1",
      billTo: "Apex Manufacturing Ltd, Accounts Payable",
      amount: "72000.00", tax: "7200.00", total: "79200.00",
      lines: [
        { desc: "Campaign strategy & brief — 28 hrs",     qty: "28", rate: "220.00", amt: "6160.00",  taxId: gst10 },
        { desc: "Copywriting (all variants) — 24 hrs",    qty: "24", rate: "175.00", amt: "4200.00",  taxId: gst10 },
        { desc: "Design production — 32 hrs",             qty: "32", rate: "210.00", amt: "6720.00",  taxId: gst10 },
        { desc: "Phase 1 fixed fee",                      qty: "1",  rate: "54920.00", amt: "54920.00", taxId: gst10 },
      ],
    },
    {
      id: invId(2025, 7), projectId: apexProjId, accountId: apexAccId,
      issueDate: "2025-02-28", dueDate: "2025-03-14", status: "Overdue",
      description: "Creative Production Completion & Build Phase Start",
      billTo: "Apex Manufacturing Ltd, Accounts Payable",
      amount: "66000.00", tax: "6600.00", total: "72600.00",
      lines: [
        { desc: "Video production — 24 hrs",              qty: "24", rate: "175.00", amt: "4200.00",  taxId: gst10 },
        { desc: "Landing page development — 32 hrs",      qty: "32", rate: "210.00", amt: "6720.00",  taxId: gst10 },
        { desc: "Email automation setup — 12 hrs",        qty: "12", rate: "210.00", amt: "2520.00",  taxId: gst10 },
        { desc: "Phase 2 fixed fee",                      qty: "1",  rate: "52560.00", amt: "52560.00", taxId: gst10 },
      ],
    },
    // Greenfield — 1 paid
    {
      id: invId(2025, 8), projectId: greenProjId, accountId: greenAccId,
      issueDate: "2025-01-31", dueDate: "2025-02-14", status: "Paid",
      description: "T&M — January 2025 (Foundation Phase)",
      billTo: "Greenfield Retail Co., Accounts Payable",
      amount: "98000.00", tax: "9800.00", total: "107800.00",
      lines: [
        { desc: "Architecture & infrastructure design — 72 hrs", qty: "72", rate: "260.00", amt: "18720.00", taxId: gst10 },
        { desc: "Data model design — 48 hrs",                    qty: "48", rate: "180.00", amt: "8640.00",  taxId: gst10 },
        { desc: "Project management — 32 hrs",                   qty: "32", rate: "275.00", amt: "8800.00",  taxId: gst10 },
        { desc: "Business analysis — 40 hrs",                    qty: "40", rate: "195.00", amt: "7800.00",  taxId: gst10 },
        { desc: "DevOps — 24 hrs",                               qty: "24", rate: "220.00", amt: "5280.00",  taxId: gst10 },
        { desc: "T&M balance (blended rate 208 hrs remaining)",  qty: "1",  rate: "48760.00", amt: "48760.00", taxId: gst10 },
      ],
    },
    // Solaris — 1 paid, 1 draft
    {
      id: invId(2025, 9), projectId: solProjId, accountId: solAccId,
      issueDate: "2025-02-28", dueDate: "2025-03-14", status: "Paid",
      description: "Discovery & Architecture Phase — Solaris Patient Portal",
      billTo: "Solaris Healthcare, Accounts Payable",
      amount: "148000.00", tax: "14800.00", total: "162800.00",
      lines: [
        { desc: "FHIR requirements workshops — 32 hrs",   qty: "32", rate: "260.00", amt: "8320.00",  taxId: gst10 },
        { desc: "Clinical workflow mapping — 48 hrs",     qty: "48", rate: "195.00", amt: "9360.00",  taxId: gst10 },
        { desc: "Solution blueprint — 24 hrs",            qty: "24", rate: "260.00", amt: "6240.00",  taxId: gst10 },
        { desc: "Phase 1 fixed fee",                      qty: "1",  rate: "124080.00", amt: "124080.00", taxId: gst10 },
      ],
    },
    {
      id: invId(2025, 10), projectId: solProjId, accountId: solAccId,
      issueDate: "2025-03-31", dueDate: "2025-04-14", status: "Draft",
      description: "Core Portal Build — March 2025",
      billTo: "Solaris Healthcare, Accounts Payable",
      amount: "180000.00", tax: "18000.00", total: "198000.00",
      lines: [
        { desc: "Patient registration module — 80 hrs",   qty: "80", rate: "210.00", amt: "16800.00", taxId: gst10 },
        { desc: "Appointment booking — 48 hrs in progress", qty: "48", rate: "210.00", amt: "10080.00", taxId: gst10 },
        { desc: "FHIR adapter build — 64 hrs",            qty: "64", rate: "260.00", amt: "16640.00", taxId: gst10 },
        { desc: "Phase 2 fixed fee — portal core",        qty: "1",  rate: "136480.00", amt: "136480.00", taxId: gst10 },
      ],
    },
    // Blueprint — 2 invoices (both paid), 1 final draft
    {
      id: invId(2025, 11), projectId: bpProjId, accountId: bpAccId,
      issueDate: "2025-01-10", dueDate: "2025-01-24", status: "Paid",
      description: "CRM Setup & Configuration Phase",
      billTo: "Blueprint Architects Pty, George Alderton",
      amount: "72000.00", tax: "7200.00", total: "79200.00",
      lines: [
        { desc: "CRM instance & pipeline configuration — 56 hrs", qty: "56", rate: "185.00", amt: "10360.00", taxId: gst10 },
        { desc: "Email & calendar integration — 16 hrs",           qty: "16", rate: "185.00", amt: "2960.00",  taxId: gst10 },
        { desc: "Phase 1 fixed fee",                               qty: "1",  rate: "58680.00", amt: "58680.00", taxId: gst10 },
      ],
    },
    {
      id: invId(2025, 12), projectId: bpProjId, accountId: bpAccId,
      issueDate: "2025-02-14", dueDate: "2025-02-28", status: "Paid",
      description: "Data Migration & Training Phase",
      billTo: "Blueprint Architects Pty, George Alderton",
      amount: "96000.00", tax: "9600.00", total: "105600.00",
      lines: [
        { desc: "Contact data cleanse & migration — 56 hrs", qty: "56", rate: "155.00", amt: "8680.00",  taxId: gst10 },
        { desc: "Admin & end-user training — 36 hrs",        qty: "36", rate: "140.00", amt: "5040.00",  taxId: gst10 },
        { desc: "Phase 2 fixed fee — migration & training",  qty: "1",  rate: "82280.00", amt: "82280.00", taxId: gst10 },
      ],
    },
    {
      id: invId(2025, 13), projectId: bpProjId, accountId: bpAccId,
      issueDate: "2025-03-31", dueDate: "2025-04-14", status: "Draft",
      description: "Final Phase — Cutover, Hypercare & Project Closure",
      billTo: "Blueprint Architects Pty, George Alderton",
      amount: "72000.00", tax: "7200.00", total: "79200.00",
      lines: [
        { desc: "Go-live cutover management — 20 hrs",   qty: "20", rate: "185.00", amt: "3700.00",  taxId: gst10 },
        { desc: "Hypercare support — 20 hrs",            qty: "20", rate: "185.00", amt: "3700.00",  taxId: gst10 },
        { desc: "Final fixed fee — project completion",  qty: "1",  rate: "64600.00", amt: "64600.00", taxId: gst10 },
      ],
    },
  ];

  const existing = await db.select().from(invoicesTable);
  const existingIds = new Set(existing.map((i) => i.id));

  for (const inv of invDefs) {
    if (existingIds.has(inv.id)) continue;
    await db.insert(invoicesTable).values({
      id: inv.id, projectId: inv.projectId, accountId: inv.accountId,
      issueDate: inv.issueDate, dueDate: inv.dueDate, status: inv.status,
      amount: inv.amount, tax: inv.tax, total: inv.total,
      description: inv.description, billTo: inv.billTo,
    });
    await db.insert(invoiceLineItemsTable).values(
      inv.lines.map((l, idx) => ({
        invoiceId: inv.id,
        description: l.desc,
        quantity: l.qty,
        unitRate: l.rate,
        amount: l.amt,
        taxCodeId: l.taxId,
        taxAmount: (parseFloat(l.amt) * 0.10).toFixed(2),
        billable: true,
        order: idx,
      }))
    );
  }
}

// ─── 16. CONTRACTS ────────────────────────────────────────────────────────────

async function seedContracts(projectMap: Map<string, number>): Promise<void> {
  const defs = [
    {
      projectId: projectMap.get("Meridian ERP Implementation")!,
      name: "Meridian ERP Master Services Agreement",
      status: "Executed", startDate: d(0), endDate: d(90),
      value: "1200000.00",
      documentUrl: "https://docs.ksap.internal/contracts/meridian-msa-2025.pdf",
      notes: "3-year warranty post go-live. Change order process requires written approval within 5 business days.",
    },
    {
      projectId: projectMap.get("TechNova Platform Redesign")!,
      name: "TechNova Fixed Fee Agreement",
      status: "Executed", startDate: d(7), endDate: d(67),
      value: "480000.00",
      documentUrl: "https://docs.ksap.internal/contracts/technova-ffa-2025.pdf",
      notes: "3 rounds of design revisions included. Additional rounds billed at agreed rates.",
    },
    {
      projectId: projectMap.get("Apex Manufacturing Campaign")!,
      name: "Apex Marketing Campaign SOW",
      status: "Executed", startDate: d(14), endDate: d(59),
      value: "185000.00",
      documentUrl: "https://docs.ksap.internal/contracts/apex-campaign-sow-2025.pdf",
      notes: "Digital ad spend managed separately by client. KSAP responsible for creative and build only.",
    },
    {
      projectId: projectMap.get("Greenfield Digital Transformation")!,
      name: "Greenfield T&M Services Contract",
      status: "Executed", startDate: d(-30), endDate: d(120),
      value: "620000.00",
      documentUrl: "https://docs.ksap.internal/contracts/greenfield-tm-2025.pdf",
      notes: "Monthly billing. Budget re-forecast checkpoint every 60 days.",
    },
    {
      projectId: projectMap.get("Solaris Patient Portal")!,
      name: "Solaris Healthcare Delivery Agreement",
      status: "Executed", startDate: d(-14), endDate: d(76),
      value: "740000.00",
      documentUrl: "https://docs.ksap.internal/contracts/solaris-hda-2025.pdf",
      notes: "Subject to APHRA and Privacy Act compliance requirements. Pen test evidence required before go-live.",
    },
    {
      projectId: projectMap.get("Blueprint CRM Rollout")!,
      name: "Blueprint CRM Implementation SOW",
      status: "Executed", startDate: d(-60), endDate: d(10),
      value: "240000.00",
      documentUrl: "https://docs.ksap.internal/contracts/blueprint-crm-sow-2025.pdf",
      notes: "Three-phase delivery. Final milestone payment on hypercare completion sign-off.",
    },
  ];

  const existing = await db.select().from(contractsTable);
  const existingProjectIds = new Set(existing.map((c) => c.projectId));

  const toInsert = defs.filter((c) => !existingProjectIds.has(c.projectId));
  if (toInsert.length > 0) {
    await db.insert(contractsTable).values(toInsert);
  }
}

// ─── 17. BUDGET ENTRIES ───────────────────────────────────────────────────────

async function seedBudgetEntries(projectMap: Map<string, number>): Promise<void> {
  const defs = [
    { projectId: projectMap.get("Meridian ERP Implementation")!,  entryDate: d(0),   type: "SOW",        description: "Signed SOW — ERP Implementation",         amount: "1200000.00", hours: "1100.00" },
    { projectId: projectMap.get("Meridian ERP Implementation")!,  entryDate: d(30),  type: "Adjustment",  description: "Change order #001 — additional integrations", amount: "85000.00",  hours: "80.00"   },
    { projectId: projectMap.get("TechNova Platform Redesign")!,   entryDate: d(7),   type: "SOW",        description: "Signed SOW — Platform Redesign",           amount: "480000.00", hours: "520.00"  },
    { projectId: projectMap.get("Apex Manufacturing Campaign")!,   entryDate: d(14),  type: "SOW",        description: "Signed SOW — Campaign Delivery",           amount: "185000.00", hours: "310.00"  },
    { projectId: projectMap.get("Greenfield Digital Transformation")!, entryDate: d(-30), type: "SOW",    description: "Signed SOW — Digital Transformation T&M",  amount: "620000.00", hours: "900.00"  },
    { projectId: projectMap.get("Greenfield Digital Transformation")!, entryDate: d(30),  type: "Adjustment", description: "Scope addition — loyalty programme",    amount: "45000.00",  hours: "60.00"   },
    { projectId: projectMap.get("Solaris Patient Portal")!,        entryDate: d(-14), type: "SOW",        description: "Signed SOW — Patient Portal Delivery",     amount: "740000.00", hours: "820.00"  },
    { projectId: projectMap.get("Blueprint CRM Rollout")!,         entryDate: d(-60), type: "SOW",        description: "Signed SOW — CRM Rollout",                 amount: "240000.00", hours: "400.00"  },
  ];

  const existing = await db.select().from(budgetEntriesTable);
  const existingSet = new Set(existing.map((b) => `${b.projectId}:${b.type}`));

  const toInsert = defs.filter((d) => !existingSet.has(`${d.projectId}:${d.type}`) || d.type === "Adjustment");
  if (toInsert.length > 0) {
    await db.insert(budgetEntriesTable).values(toInsert);
  }
}

// ─── 18. REVENUE ENTRIES ─────────────────────────────────────────────────────

async function seedRevenueEntries(projectMap: Map<string, number>, userMap: Map<string, number>): Promise<void> {
  const sarahId = userMap.get("sarah.chen@ksap.internal")!;

  const defs = [
    { projectId: projectMap.get("Meridian ERP Implementation")!,  period: "2025-01", amount: "185000.00", method: "milestone", notes: "Discovery phase sign-off",       recognizedAt: "2025-01-31", createdByUserId: sarahId },
    { projectId: projectMap.get("Meridian ERP Implementation")!,  period: "2025-02", amount: "240000.00", method: "milestone", notes: "Config Sprint 1 completion",      recognizedAt: "2025-02-28", createdByUserId: sarahId },
    { projectId: projectMap.get("TechNova Platform Redesign")!,   period: "2025-01", amount: "96000.00",  method: "milestone", notes: "Discovery phase completion",      recognizedAt: "2025-01-31", createdByUserId: sarahId },
    { projectId: projectMap.get("Apex Manufacturing Campaign")!,   period: "2025-01", amount: "72000.00",  method: "milestone", notes: "Creative production Phase 1",     recognizedAt: "2025-01-31", createdByUserId: sarahId },
    { projectId: projectMap.get("Greenfield Digital Transformation")!, period: "2025-01", amount: "98000.00", method: "percent_complete", notes: "Jan 2025 T&M revenue", recognizedAt: "2025-01-31", createdByUserId: sarahId },
    { projectId: projectMap.get("Solaris Patient Portal")!,        period: "2025-02", amount: "148000.00", method: "milestone", notes: "Architecture phase completion",   recognizedAt: "2025-02-28", createdByUserId: sarahId },
    { projectId: projectMap.get("Blueprint CRM Rollout")!,         period: "2025-01", amount: "72000.00",  method: "milestone", notes: "Setup & config phase",           recognizedAt: "2025-01-10", createdByUserId: sarahId },
    { projectId: projectMap.get("Blueprint CRM Rollout")!,         period: "2025-02", amount: "96000.00",  method: "milestone", notes: "Migration & training phase",     recognizedAt: "2025-02-14", createdByUserId: sarahId },
  ];

  const existing = await db.select().from(revenueEntriesTable);
  const existingSet = new Set(existing.map((r) => `${r.projectId}:${r.period}`));
  const toInsert = defs.filter((d) => !existingSet.has(`${d.projectId}:${d.period}`));
  if (toInsert.length > 0) {
    await db.insert(revenueEntriesTable).values(toInsert);
  }
}

// ─── 19. CSAT RESPONSES ───────────────────────────────────────────────────────

async function seedCsatResponses(
  projectMap: Map<string, number>,
  taskMap: Map<string, number>,
  userMap: Map<string, number>,
): Promise<void> {
  const sarahId  = userMap.get("sarah.chen@ksap.internal")!;
  const jamesId  = userMap.get("james.okoye@ksap.internal")!;

  // Use Discovery task IDs as milestone proxies
  const meridDiscoveryTaskKey = `${projectMap.get("Meridian ERP Implementation")}:SOW sign-off`;
  const bpGoLiveKey           = `${projectMap.get("Blueprint CRM Rollout")}:Go-live cutover`;

  const meridTaskId = taskMap.get(meridDiscoveryTaskKey);
  const bpTaskId    = taskMap.get(bpGoLiveKey);

  if (!meridTaskId || !bpTaskId) return;

  const defs = [
    { projectId: projectMap.get("Meridian ERP Implementation")!, taskId: meridTaskId, submittedByUserId: sarahId, rating: 5, comment: "Discovery phase was extremely well-structured. The team really understood our business before designing anything." },
    { projectId: projectMap.get("Blueprint CRM Rollout")!,         taskId: bpTaskId,    submittedByUserId: jamesId, rating: 4, comment: "Go-live was smooth. Minor issues in the first week handled quickly. Very satisfied overall." },
  ];

  const existing = await db.select().from(csatResponsesTable);
  const existingSet = new Set(existing.map((c) => `${c.projectId}:${c.submittedByUserId}`));
  const toInsert = defs.filter((d) => !existingSet.has(`${d.projectId}:${d.submittedByUserId}`));
  if (toInsert.length > 0) {
    await db.insert(csatResponsesTable).values(toInsert);
  }
}

// ─── 20. EXTRA PROJECT TEMPLATES ─────────────────────────────────────────────

async function seedExtraTemplates(): Promise<void> {
  const extras = [
    {
      name: "Managed Services Onboarding",
      description: "Structured onboarding for a new managed-services client: environment handover, runbook creation, monitoring setup, and SLA baseline.",
      billingType: "Retainer" as const,
      totalDurationDays: 30,
      phases: [
        {
          name: "Handover & Discovery", relativeStartOffset: 0, relativeEndOffset: 7,
          tasks: [
            { name: "Current-state environment audit",   relativeDueDateOffset: 3,  effort: 16, priority: "High"     as const, assigneeRolePlaceholder: "Service Delivery Manager" },
            { name: "Access provisioning & credential handover", relativeDueDateOffset: 4, effort: 8, priority: "Critical" as const, assigneeRolePlaceholder: "DevOps Engineer" },
            { name: "Stakeholder introduction meeting",  relativeDueDateOffset: 5,  effort: 4,  priority: "High"     as const, assigneeRolePlaceholder: "Service Delivery Manager" },
            { name: "SLA definition & sign-off",         relativeDueDateOffset: 7,  effort: 8,  priority: "Critical" as const, assigneeRolePlaceholder: "Service Delivery Manager" },
          ],
        },
        {
          name: "Documentation & Runbooks", relativeStartOffset: 8, relativeEndOffset: 18,
          tasks: [
            { name: "Architecture diagram creation",     relativeDueDateOffset: 12, effort: 12, priority: "High"     as const, assigneeRolePlaceholder: "Solution Architect" },
            { name: "Incident response runbook",         relativeDueDateOffset: 14, effort: 16, priority: "High"     as const, assigneeRolePlaceholder: "DevOps Engineer" },
            { name: "Patch & backup runbook",            relativeDueDateOffset: 16, effort: 8,  priority: "Medium"   as const, assigneeRolePlaceholder: "DevOps Engineer" },
            { name: "Knowledge base articles (10 topics)", relativeDueDateOffset: 18, effort: 20, priority: "Medium" as const, assigneeRolePlaceholder: "Service Delivery Manager" },
          ],
        },
        {
          name: "Monitoring & Alerting Setup", relativeStartOffset: 19, relativeEndOffset: 26,
          tasks: [
            { name: "Monitoring tool integration",       relativeDueDateOffset: 22, effort: 16, priority: "High"     as const, assigneeRolePlaceholder: "DevOps Engineer" },
            { name: "Alert threshold configuration",     relativeDueDateOffset: 24, effort: 8,  priority: "High"     as const, assigneeRolePlaceholder: "DevOps Engineer" },
            { name: "Dashboard & reporting setup",       relativeDueDateOffset: 26, effort: 10, priority: "Medium"   as const, assigneeRolePlaceholder: "DevOps Engineer" },
          ],
        },
        {
          name: "Hypercare & Handover", relativeStartOffset: 27, relativeEndOffset: 30,
          tasks: [
            { name: "Joint on-call rehearsal",           relativeDueDateOffset: 28, effort: 6,  priority: "High"     as const, assigneeRolePlaceholder: "Service Delivery Manager" },
            { name: "30-day review meeting",             relativeDueDateOffset: 30, effort: 4,  priority: "High"     as const, assigneeRolePlaceholder: "Service Delivery Manager" },
          ],
        },
      ],
    },
    {
      name: "Data Migration & Modernisation",
      description: "Safe migration of on-premise databases to cloud. Covers profiling, ETL design, test loads, cutover planning, and post-migration validation.",
      billingType: "Fixed Fee" as const,
      totalDurationDays: 75,
      phases: [
        {
          name: "Profiling & Assessment", relativeStartOffset: 0, relativeEndOffset: 15,
          tasks: [
            { name: "Source system profiling",           relativeDueDateOffset: 7,  effort: 24, priority: "High"     as const, assigneeRolePlaceholder: "Data Engineer" },
            { name: "Data quality assessment",           relativeDueDateOffset: 10, effort: 16, priority: "High"     as const, assigneeRolePlaceholder: "Data Analyst" },
            { name: "Target schema design",              relativeDueDateOffset: 14, effort: 20, priority: "High"     as const, assigneeRolePlaceholder: "Data Engineer" },
            { name: "Migration strategy sign-off",       relativeDueDateOffset: 15, effort: 6,  priority: "Critical" as const, assigneeRolePlaceholder: "Engagement Manager" },
          ],
        },
        {
          name: "ETL Pipeline Build", relativeStartOffset: 16, relativeEndOffset: 45,
          tasks: [
            { name: "ETL framework setup",               relativeDueDateOffset: 22, effort: 20, priority: "High"     as const, assigneeRolePlaceholder: "Data Engineer" },
            { name: "Transformation logic development",  relativeDueDateOffset: 36, effort: 60, priority: "High"     as const, assigneeRolePlaceholder: "Data Engineer",
              subtasks: [
                { name: "Core entity transforms",        relativeDueDateOffset: 28, effort: 24, billableDefault: true },
                { name: "Reference data mapping",        relativeDueDateOffset: 32, effort: 16, billableDefault: true },
                { name: "Historical data handling",      relativeDueDateOffset: 36, effort: 20, billableDefault: true },
              ]
            },
            { name: "Reconciliation framework",         relativeDueDateOffset: 42, effort: 16, priority: "High"     as const, assigneeRolePlaceholder: "Data Analyst" },
            { name: "Initial test load",                 relativeDueDateOffset: 45, effort: 12, priority: "High"     as const, assigneeRolePlaceholder: "Data Engineer" },
          ],
        },
        {
          name: "Validation & Rehearsal", relativeStartOffset: 46, relativeEndOffset: 65,
          tasks: [
            { name: "Data validation & reconciliation",  relativeDueDateOffset: 55, effort: 32, priority: "High"     as const, assigneeRolePlaceholder: "Data Analyst" },
            { name: "Dress-rehearsal migration",         relativeDueDateOffset: 60, effort: 16, priority: "Critical" as const, assigneeRolePlaceholder: "Data Engineer" },
            { name: "Cutover plan finalisation",         relativeDueDateOffset: 65, effort: 8,  priority: "High"     as const, assigneeRolePlaceholder: "Engagement Manager" },
          ],
        },
        {
          name: "Cutover & Post-Migration", relativeStartOffset: 66, relativeEndOffset: 75,
          tasks: [
            { name: "Production cutover",                relativeDueDateOffset: 68, effort: 12, priority: "Critical" as const, assigneeRolePlaceholder: "Data Engineer" },
            { name: "Post-migration validation",         relativeDueDateOffset: 71, effort: 20, priority: "Critical" as const, assigneeRolePlaceholder: "Data Analyst" },
            { name: "Decommission source system",        relativeDueDateOffset: 74, effort: 8,  priority: "Medium"   as const, assigneeRolePlaceholder: "DevOps Engineer" },
            { name: "Migration closure report",          relativeDueDateOffset: 75, effort: 6,  priority: "High"     as const, assigneeRolePlaceholder: "Engagement Manager" },
          ],
        },
      ],
    },
    {
      name: "Security Assessment & Remediation",
      description: "End-to-end security review: threat modelling, penetration testing, remediation sprint, and governance reporting. Suitable for ISO 27001 readiness or pre-launch security gates.",
      billingType: "Fixed Fee" as const,
      totalDurationDays: 50,
      phases: [
        {
          name: "Scoping & Threat Modelling", relativeStartOffset: 0, relativeEndOffset: 10,
          tasks: [
            { name: "Kickoff & scope definition",        relativeDueDateOffset: 2,  effort: 4,  priority: "High"     as const, assigneeRolePlaceholder: "Security Consultant" },
            { name: "Asset inventory & classification",  relativeDueDateOffset: 6,  effort: 12, priority: "High"     as const, assigneeRolePlaceholder: "Security Analyst" },
            { name: "Threat modelling (STRIDE)",         relativeDueDateOffset: 10, effort: 20, priority: "High"     as const, assigneeRolePlaceholder: "Security Consultant" },
          ],
        },
        {
          name: "Testing", relativeStartOffset: 11, relativeEndOffset: 28,
          tasks: [
            { name: "External penetration test",         relativeDueDateOffset: 18, effort: 40, priority: "Critical" as const, assigneeRolePlaceholder: "Penetration Tester",
              subtasks: [
                { name: "Network perimeter scan",        relativeDueDateOffset: 14, effort: 12 },
                { name: "Web application testing",       relativeDueDateOffset: 17, effort: 16 },
                { name: "Social engineering simulation", relativeDueDateOffset: 18, effort: 12 },
              ]
            },
            { name: "Internal vulnerability assessment", relativeDueDateOffset: 24, effort: 24, priority: "High"     as const, assigneeRolePlaceholder: "Security Analyst" },
            { name: "Configuration review (cloud + OS)", relativeDueDateOffset: 28, effort: 16, priority: "High"     as const, assigneeRolePlaceholder: "Security Analyst" },
          ],
        },
        {
          name: "Reporting", relativeStartOffset: 29, relativeEndOffset: 36,
          tasks: [
            { name: "Draft findings report",             relativeDueDateOffset: 32, effort: 16, priority: "High"     as const, assigneeRolePlaceholder: "Security Consultant" },
            { name: "Client debrief workshop",           relativeDueDateOffset: 34, effort: 6,  priority: "High"     as const, assigneeRolePlaceholder: "Security Consultant" },
            { name: "Final executive & technical report",relativeDueDateOffset: 36, effort: 12, priority: "High"     as const, assigneeRolePlaceholder: "Security Consultant" },
          ],
        },
        {
          name: "Remediation Sprint", relativeStartOffset: 37, relativeEndOffset: 50,
          tasks: [
            { name: "Critical finding remediation",      relativeDueDateOffset: 42, effort: 32, priority: "Critical" as const, assigneeRolePlaceholder: "DevOps Engineer" },
            { name: "High finding remediation",          relativeDueDateOffset: 46, effort: 24, priority: "High"     as const, assigneeRolePlaceholder: "DevOps Engineer" },
            { name: "Remediation re-test",               relativeDueDateOffset: 49, effort: 12, priority: "High"     as const, assigneeRolePlaceholder: "Penetration Tester" },
            { name: "Closure certificate issued",        relativeDueDateOffset: 50, effort: 4,  priority: "High"     as const, assigneeRolePlaceholder: "Security Consultant" },
          ],
        },
      ],
    },
    {
      name: "Cloud Migration (Lift & Shift + Optimise)",
      description: "Phased lift-and-shift migration to a hyperscaler cloud (AWS/Azure/GCP), followed by a 30-day cloud optimisation sprint for cost and performance.",
      billingType: "Time & Materials" as const,
      totalDurationDays: 90,
      phases: [
        {
          name: "Discovery & Cloud Readiness", relativeStartOffset: 0, relativeEndOffset: 14,
          tasks: [
            { name: "Application portfolio assessment",  relativeDueDateOffset: 5,  effort: 20, priority: "High"     as const, assigneeRolePlaceholder: "Solution Architect" },
            { name: "Dependency mapping",                relativeDueDateOffset: 8,  effort: 16, priority: "High"     as const, assigneeRolePlaceholder: "Solution Architect" },
            { name: "TCO analysis",                      relativeDueDateOffset: 11, effort: 12, priority: "Medium"   as const, assigneeRolePlaceholder: "Business Analyst" },
            { name: "Cloud landing zone design",         relativeDueDateOffset: 14, effort: 20, priority: "Critical" as const, assigneeRolePlaceholder: "Cloud Architect" },
          ],
        },
        {
          name: "Landing Zone Setup", relativeStartOffset: 15, relativeEndOffset: 28,
          tasks: [
            { name: "Account / subscription structure",  relativeDueDateOffset: 18, effort: 8,  priority: "High"     as const, assigneeRolePlaceholder: "Cloud Architect" },
            { name: "Network topology (VPC/VNet)",       relativeDueDateOffset: 22, effort: 16, priority: "High"     as const, assigneeRolePlaceholder: "DevOps Engineer" },
            { name: "Identity & access management",      relativeDueDateOffset: 25, effort: 12, priority: "Critical" as const, assigneeRolePlaceholder: "Security Analyst" },
            { name: "Logging & monitoring baseline",     relativeDueDateOffset: 28, effort: 10, priority: "High"     as const, assigneeRolePlaceholder: "DevOps Engineer" },
          ],
        },
        {
          name: "Migration Waves", relativeStartOffset: 29, relativeEndOffset: 65,
          tasks: [
            { name: "Wave 1 — dev/test workloads",       relativeDueDateOffset: 38, effort: 32, priority: "High"     as const, assigneeRolePlaceholder: "DevOps Engineer" },
            { name: "Wave 2 — staging/UAT workloads",    relativeDueDateOffset: 48, effort: 32, priority: "High"     as const, assigneeRolePlaceholder: "DevOps Engineer" },
            { name: "Wave 3 — production workloads",     relativeDueDateOffset: 62, effort: 40, priority: "Critical" as const, assigneeRolePlaceholder: "Cloud Architect",
              subtasks: [
                { name: "Pre-production dry run",        relativeDueDateOffset: 56, effort: 16 },
                { name: "Production migration window",   relativeDueDateOffset: 60, effort: 16 },
                { name: "Smoke test & validation",       relativeDueDateOffset: 62, effort: 8  },
              ]
            },
            { name: "DNS / traffic cutover",             relativeDueDateOffset: 65, effort: 8,  priority: "Critical" as const, assigneeRolePlaceholder: "DevOps Engineer" },
          ],
        },
        {
          name: "Optimisation Sprint", relativeStartOffset: 66, relativeEndOffset: 90,
          tasks: [
            { name: "Right-sizing compute resources",    relativeDueDateOffset: 72, effort: 16, priority: "High"     as const, assigneeRolePlaceholder: "Cloud Architect" },
            { name: "Reserved instance / savings plan",  relativeDueDateOffset: 76, effort: 8,  priority: "Medium"   as const, assigneeRolePlaceholder: "Cloud Architect" },
            { name: "Storage tier optimisation",         relativeDueDateOffset: 80, effort: 10, priority: "Medium"   as const, assigneeRolePlaceholder: "DevOps Engineer" },
            { name: "Performance benchmarking",          relativeDueDateOffset: 85, effort: 16, priority: "High"     as const, assigneeRolePlaceholder: "DevOps Engineer" },
            { name: "Cost optimisation report",          relativeDueDateOffset: 88, effort: 8,  priority: "High"     as const, assigneeRolePlaceholder: "Solution Architect" },
            { name: "Project closure & handover",        relativeDueDateOffset: 90, effort: 6,  priority: "High"     as const, assigneeRolePlaceholder: "Engagement Manager" },
          ],
        },
      ],
    },
  ];

  const existing = await db.select().from(projectTemplatesTable);
  const existingNames = new Set(existing.map((t) => t.name));

  for (const spec of extras) {
    if (existingNames.has(spec.name)) continue;

    const [tmpl] = await db.insert(projectTemplatesTable).values({
      name: spec.name, description: spec.description,
      billingType: spec.billingType, totalDurationDays: spec.totalDurationDays,
      isArchived: false, autoAllocate: false,
    }).returning();

    for (let pi = 0; pi < spec.phases.length; pi++) {
      const ph = spec.phases[pi];
      const [phase] = await db.insert(templatePhasesTable).values({
        templateId: tmpl.id, name: ph.name,
        relativeStartOffset: ph.relativeStartOffset,
        relativeEndOffset: ph.relativeEndOffset, order: pi,
      }).returning();

      let order = 0;
      async function insertTmplTask(t: any, parentId: number | null): Promise<void> {
        const [row] = await db.insert(templateTasksTable).values({
          templateId: tmpl.id, templatePhaseId: phase.id,
          parentTaskId: parentId,
          name: t.name, relativeDueDateOffset: t.relativeDueDateOffset,
          effort: String(t.effort ?? 0),
          priority: t.priority ?? "Medium",
          billableDefault: t.billableDefault ?? true,
          assigneeRolePlaceholder: t.assigneeRolePlaceholder ?? null,
          order: order++,
        }).returning();
        if (t.subtasks) for (const child of t.subtasks) await insertTmplTask(child, row.id);
      }
      for (const t of ph.tasks) await insertTmplTask(t, null);
    }
  }
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding BusinessNow PSA — all modules...\n");

  console.log("  Tax codes...");
  const taxMap = await seedTaxCodes();
  console.log(`    ${taxMap.size} tax codes`);

  console.log("  Time categories...");
  const catMap = await seedTimeCategories();
  console.log(`    ${catMap.size} categories`);

  console.log("  Rate cards...");
  const rateCardMap = await seedRateCards();
  console.log(`    ${rateCardMap.size} rate cards`);

  console.log("  Skills...");
  const { skillMap } = await seedSkills();
  console.log(`    ${skillMap.size} skills`);

  console.log("  Users...");
  const userMap = await seedUsers();
  console.log(`    ${userMap.size} users`);

  console.log("  User skills...");
  await seedUserSkills(userMap, skillMap);

  console.log("  Accounts...");
  const accountMap = await seedAccounts();
  console.log(`    ${accountMap.size} accounts`);

  console.log("  Prospects...");
  await seedProspects(userMap);

  console.log("  Opportunities...");
  const oppMap = await seedOpportunities(accountMap, userMap);
  console.log(`    ${oppMap.size} opportunities`);

  console.log("  Projects...");
  const projectMap = await seedProjects(accountMap, userMap, rateCardMap);
  console.log(`    ${projectMap.size} projects`);

  console.log("  Tasks...");
  const taskMap = await seedTasks(projectMap, userMap);
  console.log(`    ${taskMap.size} tasks`);

  console.log("  Allocations...");
  await seedAllocations(projectMap, userMap);

  console.log("  Time entries...");
  await seedTimeEntries(projectMap, taskMap, userMap, catMap);

  console.log("  Invoices + line items...");
  await seedInvoices(projectMap, accountMap, taxMap);

  console.log("  Contracts...");
  await seedContracts(projectMap);

  console.log("  Budget entries...");
  await seedBudgetEntries(projectMap);

  console.log("  Revenue entries...");
  await seedRevenueEntries(projectMap, userMap);

  console.log("  CSAT responses...");
  await seedCsatResponses(projectMap, taskMap, userMap);

  console.log("  Project templates (4 existing + 4 new)...");
  // Run existing sample templates first
  const { seedSampleTemplates } = await import("./seedSampleTemplates.js");
  const tmplResult = await seedSampleTemplates();
  await seedExtraTemplates();
  console.log(`    Templates: ${tmplResult.inserted.length} inserted, ${tmplResult.skipped.length} skipped, +4 new`);

  console.log("\nSeed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
