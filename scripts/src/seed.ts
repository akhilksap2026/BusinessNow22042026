import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@workspace/db/schema";
import { inArray, sql } from "drizzle-orm";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
  console.log("🌱 Seeding OTM & logistics domain data...");

  // ─── Truncate in safe order ─────────────────────────────────────────────
  await db.execute(sql`
    TRUNCATE notifications, time_entries, timesheets,
             intervals, key_events,
             allocations, task_dependencies, tasks,
             change_orders, invoices, opportunities, projects,
             resource_requests, prospects, accounts,
             time_off_requests, holiday_dates, holiday_calendars,
             time_categories, activity_defaults,
             user_skills, skills, skill_categories,
             rate_cards, audit_log, users,
             document_templates, project_templates, template_phases,
             template_tasks, tax_codes, contracts, budget_entries,
             revenue_entries, documents
    RESTART IDENTITY CASCADE
  `);

  // ─── Holiday Calendars ─────────────────────────────────────────────────
  const [usHolCal, eurHolCal, apacHolCal] = await db
    .insert(schema.holidayCalendarsTable)
    .values([
      { name: "US Federal Holidays",       description: "Standard US federal observed holidays for 2024–2026" },
      { name: "EU Common Holidays",        description: "Common Western European holidays for 2024–2026" },
      { name: "APAC (Singapore) Holidays", description: "Singapore public holidays for 2024–2026" },
    ])
    .returning();

  await db.insert(schema.holidayDatesTable).values([
    { calendarId: usHolCal.id, name: "New Year's Day",   date: "2025-01-01" },
    { calendarId: usHolCal.id, name: "MLK Day",          date: "2025-01-20" },
    { calendarId: usHolCal.id, name: "Presidents' Day",  date: "2025-02-17" },
    { calendarId: usHolCal.id, name: "Memorial Day",     date: "2025-05-26" },
    { calendarId: usHolCal.id, name: "Independence Day", date: "2025-07-04" },
    { calendarId: usHolCal.id, name: "Labor Day",        date: "2025-09-01" },
    { calendarId: usHolCal.id, name: "Thanksgiving",     date: "2025-11-27" },
    { calendarId: usHolCal.id, name: "Christmas Day",    date: "2025-12-25" },
    { calendarId: usHolCal.id, name: "New Year's Day",   date: "2026-01-01" },
    { calendarId: usHolCal.id, name: "MLK Day",          date: "2026-01-19" },
    { calendarId: usHolCal.id, name: "Presidents' Day",  date: "2026-02-16" },
    { calendarId: usHolCal.id, name: "Memorial Day",     date: "2026-05-25" },
    { calendarId: usHolCal.id, name: "Independence Day", date: "2026-07-03" },
    { calendarId: eurHolCal.id, name: "New Year's Day",  date: "2025-01-01" },
    { calendarId: eurHolCal.id, name: "Good Friday",     date: "2025-04-18" },
    { calendarId: eurHolCal.id, name: "Easter Monday",   date: "2025-04-21" },
    { calendarId: eurHolCal.id, name: "Labour Day",      date: "2025-05-01" },
    { calendarId: eurHolCal.id, name: "Christmas Day",   date: "2025-12-25" },
    { calendarId: eurHolCal.id, name: "Boxing Day",      date: "2025-12-26" },
    { calendarId: eurHolCal.id, name: "Good Friday",     date: "2026-04-03" },
    { calendarId: eurHolCal.id, name: "Easter Monday",   date: "2026-04-06" },
    { calendarId: eurHolCal.id, name: "Labour Day",      date: "2026-05-01" },
    { calendarId: apacHolCal.id, name: "New Year's Day",   date: "2025-01-01" },
    { calendarId: apacHolCal.id, name: "Chinese New Year", date: "2025-01-29" },
    { calendarId: apacHolCal.id, name: "Hari Raya Puasa",  date: "2025-03-31" },
    { calendarId: apacHolCal.id, name: "Labour Day",       date: "2025-05-01" },
    { calendarId: apacHolCal.id, name: "National Day",     date: "2025-08-09" },
    { calendarId: apacHolCal.id, name: "Christmas Day",    date: "2025-12-25" },
    { calendarId: apacHolCal.id, name: "Chinese New Year", date: "2026-02-17" },
    { calendarId: apacHolCal.id, name: "Labour Day",       date: "2026-05-01" },
  ]);

  // ─── Tax Codes ───────────────────────────────────────────────────────────
  await db.insert(schema.taxCodesTable).values([
    { name: "US Zero Rate",    rate: "0.00",  description: "Export / international services — zero rated",  isDefault: true,  isActive: 1 },
    { name: "US Sales Tax",    rate: "8.25",  description: "Standard US sales tax (where applicable)",     isDefault: false, isActive: 1 },
    { name: "EU VAT 21%",      rate: "21.00", description: "Standard EU VAT rate (Netherlands, Belgium)",  isDefault: false, isActive: 1 },
    { name: "EU VAT 20%",      rate: "20.00", description: "Standard EU VAT rate (France, UK)",            isDefault: false, isActive: 1 },
    { name: "SG GST 9%",       rate: "9.00",  description: "Singapore Goods & Services Tax",               isDefault: false, isActive: 1 },
  ]);

  // ─── Rate Cards ─────────────────────────────────────────────────────────
  const [rcLogistics, rcEnterprise] = await db
    .insert(schema.rateCardsTable)
    .values([
      {
        name: "Logistics Standard",
        currency: "USD",
        status: "Active",
        effectiveDate: "2024-01-01",
        defaultRate: "150",
        roles: [
          { role: "Project Manager",       rate: 175 },
          { role: "Solutions Architect",   rate: 200 },
          { role: "Integration Engineer",  rate: 165 },
          { role: "Business Analyst",      rate: 145 },
          { role: "Data Engineer",         rate: 155 },
          { role: "QA Engineer",           rate: 130 },
          { role: "Change Management Lead",rate: 160 },
          { role: "Consultant",            rate: 140 },
        ],
      },
      {
        name: "Enterprise Premium",
        currency: "USD",
        status: "Active",
        effectiveDate: "2024-01-01",
        defaultRate: "210",
        roles: [
          { role: "Project Manager",       rate: 230 },
          { role: "Solutions Architect",   rate: 260 },
          { role: "Integration Engineer",  rate: 220 },
          { role: "Business Analyst",      rate: 195 },
          { role: "Data Engineer",         rate: 210 },
          { role: "QA Engineer",           rate: 180 },
          { role: "Change Management Lead",rate: 215 },
          { role: "Consultant",            rate: 190 },
        ],
      },
    ])
    .returning();

  // ─── Skill Categories + Skills ──────────────────────────────────────────
  const [catCore, catTech, catDomain] = await db
    .insert(schema.skillCategoriesTable)
    .values([
      { name: "Core Consulting" },
      { name: "Technology" },
      { name: "Logistics Domain" },
    ])
    .returning();

  await db.insert(schema.jobRolesTable).values([
    { name: "Project Manager" },
    { name: "Senior Consultant" },
    { name: "Consultant" },
    { name: "Business Analyst" },
    { name: "Developer" },
    { name: "QA / Test Engineer" },
    { name: "Solution Architect" },
    { name: "Change Manager" },
    { name: "Trainer" },
  ]).onConflictDoNothing();

  const skillRows = await db
    .insert(schema.skillsTable)
    .values([
      { categoryId: catCore.id, name: "Project Management" },
      { categoryId: catCore.id, name: "Stakeholder Management" },
      { categoryId: catCore.id, name: "Business Analysis" },
      { categoryId: catCore.id, name: "Change Management" },
      { categoryId: catCore.id, name: "Process Mapping" },
      { categoryId: catTech.id, name: "SAP EWM" },
      { categoryId: catTech.id, name: "Oracle WMS" },
      { categoryId: catTech.id, name: "Manhattan Associates WMS" },
      { categoryId: catTech.id, name: "Blue Yonder TMS" },
      { categoryId: catTech.id, name: "Oracle OTM" },
      { categoryId: catTech.id, name: "SAP TM" },
      { categoryId: catTech.id, name: "API Integration" },
      { categoryId: catTech.id, name: "EDI / ANSI X12" },
      { categoryId: catTech.id, name: "SQL / Data Analytics" },
      { categoryId: catTech.id, name: "IoT & RFID" },
      { categoryId: catDomain.id, name: "Warehouse Operations" },
      { categoryId: catDomain.id, name: "Transportation Management" },
      { categoryId: catDomain.id, name: "Cold Chain Logistics" },
      { categoryId: catDomain.id, name: "Last-Mile Delivery" },
      { categoryId: catDomain.id, name: "Freight Forwarding" },
      { categoryId: catDomain.id, name: "Customs & Compliance" },
      { categoryId: catDomain.id, name: "Fleet Management" },
      { categoryId: catDomain.id, name: "Carrier Management" },
      { categoryId: catDomain.id, name: "Freight Audit & Payment" },
    ])
    .returning();

  const sk = (name: string) => skillRows.find((s) => s.name === name)!;

  // ─── Users (canonical RBAC roles) ─────────────────────────────────────────
  const users = await db
    .insert(schema.usersTable)
    .values([
      { name: "Admin User",       initials: "AU", role: "account_admin", secondaryRoles: ["account_admin"],            email: "admin@ksap.tech",          capacity: 40, department: "Management",   costRate: "0",   activeStatus: "active", isInternal: true },
      { name: "Marcus Webb",      initials: "MW", role: "super_user",    secondaryRoles: ["super_user","account_admin"], email: "marcus.webb@ksap.tech",  capacity: 40, department: "Delivery",     costRate: "95",  activeStatus: "active", isInternal: true },
      { name: "Priya Nair",       initials: "PN", role: "super_user",    secondaryRoles: ["super_user"],                 email: "priya.nair@ksap.tech",   capacity: 40, department: "Architecture", costRate: "115", activeStatus: "active", isInternal: true },
      { name: "Daniel Osei",      initials: "DO", role: "super_user",    secondaryRoles: ["super_user"],                 email: "daniel.osei@ksap.tech",  capacity: 40, department: "Engineering",  costRate: "100", activeStatus: "active", isInternal: true },
      { name: "Sophie Laurent",   initials: "SL", role: "super_user",    secondaryRoles: ["super_user"],                 email: "sophie.laurent@ksap.tech", capacity: 40, department: "Delivery",   costRate: "85",  activeStatus: "active", isInternal: true },
      { name: "Raj Krishnamurthy",initials: "RK", role: "super_user",    secondaryRoles: ["super_user"],                 email: "raj.k@ksap.tech",        capacity: 40, department: "Engineering",  costRate: "100", activeStatus: "active", isInternal: true },
      { name: "Leila Hassan",     initials: "LH", role: "super_user",    secondaryRoles: ["super_user"],                 email: "leila.hassan@ksap.tech", capacity: 40, department: "Delivery",     costRate: "90",  activeStatus: "active", isInternal: true },
      { name: "Tom Bridges",      initials: "TB", role: "collaborator",  secondaryRoles: ["collaborator"],               email: "tom.bridges@ksap.tech",  capacity: 40, department: "Engineering",  costRate: "80",  activeStatus: "active", isInternal: true },
      { name: "Amara Diallo",     initials: "AD", role: "collaborator",  secondaryRoles: ["collaborator"],               email: "amara.diallo@ksap.tech", capacity: 40, department: "Delivery",     costRate: "80",  activeStatus: "active", isInternal: true },
    ])
    .returning();

  const u = (name: string) => users.find((x) => x.name === name)!;

  // Manager hierarchy: Marcus is everyone's manager
  await db.execute(sql`
    UPDATE users SET manager_id = ${u("Marcus Webb").id}
    WHERE name IN ('Priya Nair','Daniel Osei','Sophie Laurent','Raj Krishnamurthy','Leila Hassan','Tom Bridges','Amara Diallo')
  `);

  // User Skills
  await db.insert(schema.userSkillsTable).values([
    { userId: u("Marcus Webb").id,       skillId: sk("Project Management").id,         proficiencyLevel: "Expert" },
    { userId: u("Marcus Webb").id,       skillId: sk("Stakeholder Management").id,     proficiencyLevel: "Expert" },
    { userId: u("Marcus Webb").id,       skillId: sk("Change Management").id,          proficiencyLevel: "Intermediate" },
    { userId: u("Marcus Webb").id,       skillId: sk("Transportation Management").id,  proficiencyLevel: "Intermediate" },
    { userId: u("Priya Nair").id,        skillId: sk("SAP EWM").id,                    proficiencyLevel: "Expert" },
    { userId: u("Priya Nair").id,        skillId: sk("Oracle WMS").id,                 proficiencyLevel: "Advanced" },
    { userId: u("Priya Nair").id,        skillId: sk("Oracle OTM").id,                 proficiencyLevel: "Advanced" },
    { userId: u("Priya Nair").id,        skillId: sk("API Integration").id,            proficiencyLevel: "Advanced" },
    { userId: u("Priya Nair").id,        skillId: sk("Warehouse Operations").id,       proficiencyLevel: "Expert" },
    { userId: u("Daniel Osei").id,       skillId: sk("API Integration").id,            proficiencyLevel: "Expert" },
    { userId: u("Daniel Osei").id,       skillId: sk("EDI / ANSI X12").id,             proficiencyLevel: "Expert" },
    { userId: u("Daniel Osei").id,       skillId: sk("SQL / Data Analytics").id,       proficiencyLevel: "Advanced" },
    { userId: u("Daniel Osei").id,       skillId: sk("SAP TM").id,                     proficiencyLevel: "Intermediate" },
    { userId: u("Sophie Laurent").id,    skillId: sk("Business Analysis").id,          proficiencyLevel: "Expert" },
    { userId: u("Sophie Laurent").id,    skillId: sk("Process Mapping").id,            proficiencyLevel: "Advanced" },
    { userId: u("Sophie Laurent").id,    skillId: sk("Transportation Management").id,  proficiencyLevel: "Intermediate" },
    { userId: u("Sophie Laurent").id,    skillId: sk("Carrier Management").id,         proficiencyLevel: "Intermediate" },
    { userId: u("Raj Krishnamurthy").id, skillId: sk("SQL / Data Analytics").id,       proficiencyLevel: "Expert" },
    { userId: u("Raj Krishnamurthy").id, skillId: sk("IoT & RFID").id,                 proficiencyLevel: "Advanced" },
    { userId: u("Raj Krishnamurthy").id, skillId: sk("Warehouse Operations").id,       proficiencyLevel: "Intermediate" },
    { userId: u("Leila Hassan").id,      skillId: sk("Change Management").id,          proficiencyLevel: "Expert" },
    { userId: u("Leila Hassan").id,      skillId: sk("Stakeholder Management").id,     proficiencyLevel: "Advanced" },
    { userId: u("Leila Hassan").id,      skillId: sk("Customs & Compliance").id,       proficiencyLevel: "Advanced" },
    { userId: u("Tom Bridges").id,       skillId: sk("Business Analysis").id,          proficiencyLevel: "Intermediate" },
    { userId: u("Tom Bridges").id,       skillId: sk("Process Mapping").id,            proficiencyLevel: "Intermediate" },
    { userId: u("Tom Bridges").id,       skillId: sk("Fleet Management").id,           proficiencyLevel: "Advanced" },
    { userId: u("Amara Diallo").id,      skillId: sk("Cold Chain Logistics").id,       proficiencyLevel: "Expert" },
    { userId: u("Amara Diallo").id,      skillId: sk("Freight Forwarding").id,         proficiencyLevel: "Advanced" },
    { userId: u("Amara Diallo").id,      skillId: sk("Last-Mile Delivery").id,         proficiencyLevel: "Expert" },
    { userId: u("Amara Diallo").id,      skillId: sk("Freight Audit & Payment").id,    proficiencyLevel: "Intermediate" },
  ]);

  // ─── Accounts ────────────────────────────────────────────────────────────
  const accounts = await db
    .insert(schema.accountsTable)
    .values([
      { name: "KSAP",                  domain: "ksap.internal",     tier: "Internal",   region: "North America", status: "Active",  accountType: "internal", contractValue: "0",       billingAddress: "Internal — KSAP overhead, R&D" },
      { name: "FrostLine Cold Storage",domain: "frostline.com",     tier: "Enterprise", region: "North America", status: "Active",  contractValue: "1250000", billingAddress: "420 Refrigeration Blvd, Chicago, IL 60601" },
      { name: "VeloFreight Global",    domain: "velofreight.com",   tier: "Enterprise", region: "Europe",        status: "Active",  contractValue: "2100000", billingAddress: "88 Docklands Way, Rotterdam, Netherlands" },
      { name: "PrimePack Distribution",domain: "primepack.com",     tier: "Mid-Market", region: "North America", status: "Active",  contractValue: "680000",  billingAddress: "3300 Commerce Drive, Dallas, TX 75201" },
      { name: "HarbourLink Shipping",  domain: "harbourlink.com",   tier: "Enterprise", region: "Asia Pacific",  status: "Active",  contractValue: "1850000", billingAddress: "12 Container Terminal Rd, Singapore 628150" },
      { name: "SwiftRoute Last Mile",  domain: "swiftroute.io",     tier: "Mid-Market", region: "North America", status: "Active",  contractValue: "490000",  billingAddress: "900 Delivery Plaza, Austin, TX 78701" },
      { name: "Meridian Fleet Co.",    domain: "meridianfleet.com", tier: "Mid-Market", region: "North America", status: "At Risk", contractValue: "370000",  billingAddress: "50 Truck Route, Nashville, TN 37201" },
    ])
    .returning();

  const acc = (name: string) => accounts.find((a) => a.name === name)!;

  // ─── Prospects ───────────────────────────────────────────────────────────
  await db.insert(schema.prospectsTable).values([
    { name: "BlueSky Air Cargo",                 contactName: "Jim Nakamura",   contactEmail: "j.nakamura@bluesky-air.com",     contactPhone: "+1-310-555-0182", status: "Qualified",  source: "Trade Show",    estimatedValue: "920000",  notes: "Met at MODEX 2025. Looking for full TMS + customs integration.", ownerId: u("Marcus Webb").id },
    { name: "Terracycle Reverse Logistics",       contactName: "Sara Dent",      contactEmail: "sara.d@terracycle-rl.com",       contactPhone: "+1-908-555-0213", status: "Proposal",   source: "Referral",      estimatedValue: "540000",  notes: "Referred by FrostLine. Needs returns management + WMS upgrade.",  ownerId: u("Sophie Laurent").id },
    { name: "IronRoad Rail Logistics",           contactName: "Bruce Kowalski", contactEmail: "b.kowalski@ironroad.net",        contactPhone: "+1-312-555-0447", status: "Negotiation",source: "Inbound",       estimatedValue: "1400000", notes: "Large rail intermodal operator. ERP + WMS greenfield.",          ownerId: u("Marcus Webb").id },
    { name: "ClearPath Customs Brokers",         contactName: "Mei Lin",        contactEmail: "m.lin@clearpath-customs.com",     contactPhone: "+65-9555-1234",   status: "New",        source: "LinkedIn",      estimatedValue: "280000",  notes: "Singapore-based, interested in customs compliance automation.",   ownerId: u("Leila Hassan").id },
    { name: "UrbanCrate E-Commerce Fulfilment",  contactName: "Nadia Brown",    contactEmail: "nadia@urbancrate.co",            contactPhone: "+1-415-555-0309", status: "Converted",  source: "Conference",    estimatedValue: "460000",  notes: "Converted to SwiftRoute Last Mile account.",                       ownerId: u("Sophie Laurent").id, convertedAccountId: acc("SwiftRoute Last Mile").id },
    { name: "NorthShore 3PL",                    contactName: "Daria Petrov",   contactEmail: "d.petrov@northshore3pl.com",     contactPhone: "+1-312-555-0891", status: "Discovery",  source: "Cold Outreach", estimatedValue: "670000",  notes: "Looking to implement Oracle OTM for carrier contract management.", ownerId: u("Priya Nair").id },
    { name: "GlobalTrans Forwarding",            contactName: "Ahmed Al-Rashid",contactEmail: "a.alrashid@globaltrans.ae",       contactPhone: "+971-55-555-2341",status: "New",        source: "Trade Show",    estimatedValue: "1100000", notes: "Dubai-based freight forwarder. Multi-modal TMS greenfield opportunity.", ownerId: u("Marcus Webb").id },
  ]);

  // ─── Opportunities ────────────────────────────────────────────────────────
  const opps = await db
    .insert(schema.opportunitiesTable)
    .values([
      { accountId: acc("FrostLine Cold Storage").id, name: "Phase 2 Cold Chain IoT Expansion",          stage: "Proposal",   probability: 60,  value: "420000", description: "IoT sensor network for cold storage monitoring across 8 distribution centres.",       closeDate: "2025-07-31", ownerId: u("Raj Krishnamurthy").id },
      { accountId: acc("VeloFreight Global").id,     name: "European TMS Rollout",                     stage: "Negotiation",probability: 80,  value: "780000", description: "Blue Yonder TMS implementation across DE, FR, NL and UK depots.",                      closeDate: "2025-06-30", ownerId: u("Marcus Webb").id },
      { accountId: acc("PrimePack Distribution").id, name: "Oracle WMS Upgrade – Dallas DC",           stage: "Won",        probability: 100, value: "340000", description: "Upgrade from Oracle WMS 9.x to Cloud WMS with mobile RF guns.",                         closeDate: "2025-05-01", ownerId: u("Priya Nair").id },
      { accountId: acc("HarbourLink Shipping").id,   name: "Customs & Compliance Automation",          stage: "Discovery",  probability: 25,  value: "560000", description: "End-to-end customs declaration automation + trade lane compliance for APAC.",          closeDate: "2025-09-30", ownerId: u("Leila Hassan").id },
      { accountId: acc("SwiftRoute Last Mile").id,   name: "Last-Mile Route Optimisation Platform",    stage: "Won",        probability: 100, value: "490000", description: "Build and deploy AI-assisted dynamic routing engine integrated with courier APIs.",     closeDate: "2025-03-31", ownerId: u("Sophie Laurent").id },
      { accountId: acc("Meridian Fleet Co.").id,     name: "Fleet Telemetry & Predictive Maintenance", stage: "Proposal",   probability: 45,  value: "220000", description: "OBD telemetry ingestion, driver scorecarding and predictive maintenance alerts.",       closeDate: "2025-08-31", ownerId: u("Tom Bridges").id },
      { accountId: acc("HarbourLink Shipping").id,   name: "Oracle OTM Implementation – APAC",         stage: "Qualified",  probability: 55,  value: "890000", description: "Full Oracle OTM deployment for APAC trade lanes including carrier portal.",            closeDate: "2026-03-31", ownerId: u("Priya Nair").id },
      { accountId: acc("VeloFreight Global").id,     name: "Freight Audit & Payment Automation",       stage: "Discovery",  probability: 30,  value: "310000", description: "Automated freight audit, dispute resolution and payment processing integration.",        closeDate: "2026-01-31", ownerId: u("Sophie Laurent").id },
    ])
    .returning();

  const opp = (name: string) => opps.find((o) => o.name === name)!;

  // ─── Projects ─────────────────────────────────────────────────────────────
  const projects = await db
    .insert(schema.projectsTable)
    .values([
      { accountId: acc("FrostLine Cold Storage").id,    name: "FrostLine WMS Implementation",         status: "In Progress", ownerId: u("Marcus Webb").id,    startDate: "2024-11-01", dueDate: "2025-07-31", billingType: "Fixed Fee",        budget: "1250000", allocatedHours: "1600", budgetedHours: "2000", completion: 45,  health: "On Track",  description: "Full SAP EWM implementation for 3 cold storage DCs including RFID integration.",     rateCardId: rcEnterprise.id, customerChampion: "Derek Frost (VP Ops)",        internalExternal: "External", opportunityId: null },
      { accountId: acc("VeloFreight Global").id,        name: "VeloFreight TMS Rollout – Phase 1",    status: "In Progress", ownerId: u("Marcus Webb").id,    startDate: "2025-01-15", dueDate: "2025-09-30", billingType: "Time & Materials", budget: "780000",  allocatedHours: "960",  budgetedHours: "1400", completion: 28,  health: "At Risk",   description: "Blue Yonder TMS deployment for Western European freight corridors.",                  rateCardId: rcEnterprise.id, customerChampion: "Ines van der Berg (CTO)",     internalExternal: "External", opportunityId: opp("European TMS Rollout").id },
      { accountId: acc("PrimePack Distribution").id,    name: "Oracle WMS Cloud Migration",           status: "In Progress", ownerId: u("Priya Nair").id,     startDate: "2025-02-03", dueDate: "2025-08-29", billingType: "Fixed Fee",        budget: "340000",  allocatedHours: "480",  budgetedHours: "720",  completion: 35,  health: "On Track",  description: "Migrate Dallas DC from Oracle WMS on-premise to Oracle Cloud WMS.",                    rateCardId: rcLogistics.id,  customerChampion: "Tina Marlow (IT Director)",   internalExternal: "External", opportunityId: opp("Oracle WMS Upgrade – Dallas DC").id },
      { accountId: acc("SwiftRoute Last Mile").id,      name: "Route Optimisation Engine Deployment",status: "Completed",   ownerId: u("Sophie Laurent").id, startDate: "2024-09-16", dueDate: "2025-03-31", billingType: "Fixed Fee",        budget: "490000",  allocatedHours: "1280", budgetedHours: "1200", completion: 100, health: "On Track",  description: "Design and implement AI route optimisation microservice with courier API connectors.", rateCardId: rcLogistics.id,  customerChampion: "Chris Hayward (CEO)",          internalExternal: "External", opportunityId: opp("Last-Mile Route Optimisation Platform").id },
      { accountId: acc("HarbourLink Shipping").id,      name: "HarbourLink EDI Integration",          status: "In Progress", ownerId: u("Daniel Osei").id,    startDate: "2025-03-01", dueDate: "2025-10-31", billingType: "Time & Materials", budget: "320000",  allocatedHours: "280",  budgetedHours: "560",  completion: 18,  health: "On Track",  description: "ANSI X12 EDI integration with 14 carrier and port authority trading partners.",        rateCardId: rcLogistics.id,  customerChampion: "Wang Li (Head of Digital)",   internalExternal: "External", opportunityId: null },
      { accountId: acc("Meridian Fleet Co.").id,        name: "Fleet Telemetry MVP",                  status: "Not Started", ownerId: u("Tom Bridges").id,    startDate: "2025-06-01", dueDate: "2025-12-15", billingType: "Fixed Fee",        budget: "220000",  allocatedHours: "0",    budgetedHours: "480",  completion: 0,   health: "On Track",  description: "OBD-II data ingestion pipeline, driver scorecard dashboard and maintenance alert engine.", rateCardId: rcLogistics.id, customerChampion: "Dale Perkins (Fleet Director)", internalExternal: "External", opportunityId: opp("Fleet Telemetry & Predictive Maintenance").id },
    ])
    .returning();

  const proj = (name: string) => projects.find((p) => p.name === name)!;

  // ─── Phases as Tasks (isPhase: true) ─────────────────────────────────────
  const frostPhases = await db.insert(schema.tasksTable).values([
    { projectId: proj("FrostLine WMS Implementation").id, name: "Discovery & Blueprint",  isPhase: true, status: "Completed",   startDate: "2024-11-01", dueDate: "2024-12-20", sortOrder: 1 },
    { projectId: proj("FrostLine WMS Implementation").id, name: "System Configuration",   isPhase: true, status: "In Progress", startDate: "2025-01-06", dueDate: "2025-04-30", sortOrder: 2 },
    { projectId: proj("FrostLine WMS Implementation").id, name: "Integration & Testing",  isPhase: true, status: "Not Started", startDate: "2025-05-01", dueDate: "2025-06-30", sortOrder: 3 },
    { projectId: proj("FrostLine WMS Implementation").id, name: "Go-Live & Hypercare",    isPhase: true, status: "Not Started", startDate: "2025-07-01", dueDate: "2025-07-31", sortOrder: 4 },
  ]).returning();

  const veloPhases = await db.insert(schema.tasksTable).values([
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, name: "Requirements & Gap Analysis", isPhase: true, status: "Completed",   startDate: "2025-01-15", dueDate: "2025-02-28", sortOrder: 1 },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, name: "TMS Configuration",           isPhase: true, status: "In Progress", startDate: "2025-03-01", dueDate: "2025-06-30", sortOrder: 2 },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, name: "Carrier Integration",        isPhase: true, status: "Not Started", startDate: "2025-07-01", dueDate: "2025-08-31", sortOrder: 3 },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, name: "UAT & Training",             isPhase: true, status: "Not Started", startDate: "2025-09-01", dueDate: "2025-09-30", sortOrder: 4 },
  ]).returning();

  const primePhases = await db.insert(schema.tasksTable).values([
    { projectId: proj("Oracle WMS Cloud Migration").id, name: "Assessment & Data Migration Plan", isPhase: true, status: "Completed",   startDate: "2025-02-03", dueDate: "2025-03-14", sortOrder: 1 },
    { projectId: proj("Oracle WMS Cloud Migration").id, name: "Cloud Tenant Setup & Config",      isPhase: true, status: "In Progress", startDate: "2025-03-17", dueDate: "2025-06-13", sortOrder: 2 },
    { projectId: proj("Oracle WMS Cloud Migration").id, name: "Testing & Cutover",                 isPhase: true, status: "Not Started", startDate: "2025-06-16", dueDate: "2025-08-29", sortOrder: 3 },
  ]).returning();

  const swiftPhases = await db.insert(schema.tasksTable).values([
    { projectId: proj("Route Optimisation Engine Deployment").id, name: "Design & Architecture",   isPhase: true, status: "Completed", startDate: "2024-09-16", dueDate: "2024-11-01", sortOrder: 1 },
    { projectId: proj("Route Optimisation Engine Deployment").id, name: "Core Engine Build",       isPhase: true, status: "Completed", startDate: "2024-11-04", dueDate: "2025-01-31", sortOrder: 2 },
    { projectId: proj("Route Optimisation Engine Deployment").id, name: "Courier API Integration", isPhase: true, status: "Completed", startDate: "2025-02-03", dueDate: "2025-03-14", sortOrder: 3 },
    { projectId: proj("Route Optimisation Engine Deployment").id, name: "Production Deploy",       isPhase: true, status: "Completed", startDate: "2025-03-17", dueDate: "2025-03-31", sortOrder: 4 },
  ]).returning();

  const harbourPhases = await db.insert(schema.tasksTable).values([
    { projectId: proj("HarbourLink EDI Integration").id, name: "Trading Partner Onboarding", isPhase: true, status: "In Progress", startDate: "2025-03-01", dueDate: "2025-05-30", sortOrder: 1 },
    { projectId: proj("HarbourLink EDI Integration").id, name: "Map Development & Testing",  isPhase: true, status: "Not Started", startDate: "2025-06-02", dueDate: "2025-09-30", sortOrder: 2 },
    { projectId: proj("HarbourLink EDI Integration").id, name: "Prod Cutover",               isPhase: true, status: "Not Started", startDate: "2025-10-01", dueDate: "2025-10-31", sortOrder: 3 },
  ]).returning();

  // ─── Tasks (children of phases via parentTaskId) ───────────────────────────
  await db.insert(schema.tasksTable).values([
    { projectId: proj("FrostLine WMS Implementation").id, parentTaskId: frostPhases[0].id, name: "Kick-off Workshop & Scope Sign-off",            status: "Completed",   priority: "High",     assigneeIds: [u("Marcus Webb").id], startDate: "2024-11-01", dueDate: "2024-11-08", effort: "16", billable: true },
    { projectId: proj("FrostLine WMS Implementation").id, parentTaskId: frostPhases[0].id, name: "Current State Warehouse Process Documentation", status: "Completed",   priority: "High",     assigneeIds: [u("Sophie Laurent").id], startDate: "2024-11-11", dueDate: "2024-12-06", effort: "40", billable: true },
    { projectId: proj("FrostLine WMS Implementation").id, parentTaskId: frostPhases[0].id, name: "SAP EWM Blueprint & Fit-Gap Report",            status: "Completed",   priority: "High",     assigneeIds: [u("Priya Nair").id], startDate: "2024-11-18", dueDate: "2024-12-20", effort: "60", billable: true, isMilestone: true, milestoneType: "Payment" },
    { projectId: proj("FrostLine WMS Implementation").id, parentTaskId: frostPhases[1].id, name: "Storage Type & Bin Configuration",              status: "In Progress", priority: "High",     assigneeIds: [u("Priya Nair").id], startDate: "2025-01-06", dueDate: "2025-02-28", effort: "80", billable: true },
    { projectId: proj("FrostLine WMS Implementation").id, parentTaskId: frostPhases[1].id, name: "RFID Hardware Integration",                     status: "In Progress", priority: "Medium",   assigneeIds: [u("Raj Krishnamurthy").id], startDate: "2025-02-01", dueDate: "2025-03-31", effort: "60", billable: true },
    { projectId: proj("FrostLine WMS Implementation").id, parentTaskId: frostPhases[1].id, name: "Cold Chain Temperature Monitoring Config",      status: "Not Started", priority: "Medium",   assigneeIds: [u("Amara Diallo").id, u("Raj Krishnamurthy").id], startDate: "2025-03-01", dueDate: "2025-04-30", effort: "50", billable: true },
    { projectId: proj("FrostLine WMS Implementation").id, parentTaskId: frostPhases[1].id, name: "Change Management & Training Plan",             status: "Not Started", priority: "Medium",   assigneeIds: [u("Leila Hassan").id], startDate: "2025-03-15", dueDate: "2025-04-30", effort: "30", billable: true },
    { projectId: proj("FrostLine WMS Implementation").id, parentTaskId: frostPhases[2].id, name: "SAP–ERP Interface Build",                       status: "Not Started", priority: "High",     assigneeIds: [u("Daniel Osei").id], startDate: "2025-05-01", dueDate: "2025-06-13", effort: "80", billable: true },
    { projectId: proj("FrostLine WMS Implementation").id, parentTaskId: frostPhases[2].id, name: "SIT & Performance Testing",                     status: "Not Started", priority: "High",     assigneeIds: [u("Tom Bridges").id], startDate: "2025-05-15", dueDate: "2025-06-27", effort: "60", billable: true },
    { projectId: proj("FrostLine WMS Implementation").id, parentTaskId: frostPhases[3].id, name: "Go-Live Cutover",                               status: "Not Started", priority: "Critical", assigneeIds: [u("Marcus Webb").id, u("Priya Nair").id], startDate: "2025-07-01", dueDate: "2025-07-07", effort: "40", billable: true, isMilestone: true, milestoneType: "Project" },
    { projectId: proj("FrostLine WMS Implementation").id, parentTaskId: frostPhases[3].id, name: "Hypercare & Stabilisation",                     status: "Not Started", priority: "High",     assigneeIds: [u("Marcus Webb").id], startDate: "2025-07-07", dueDate: "2025-07-31", effort: "30", billable: true },
  ]);

  await db.insert(schema.tasksTable).values([
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, parentTaskId: veloPhases[0].id, name: "Freight Lane & Carrier Master Data Audit",   status: "Completed",   priority: "High",   assigneeIds: [u("Sophie Laurent").id], startDate: "2025-01-15", dueDate: "2025-02-07", effort: "40", billable: true },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, parentTaskId: veloPhases[0].id, name: "Gap Analysis Report vs Blue Yonder OOB",     status: "Completed",   priority: "High",   assigneeIds: [u("Priya Nair").id], startDate: "2025-02-10", dueDate: "2025-02-28", effort: "32", billable: true, isMilestone: true, milestoneType: "Payment" },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, parentTaskId: veloPhases[1].id, name: "Carrier Rating Engine Configuration",         status: "In Progress", priority: "High",   assigneeIds: [u("Priya Nair").id], startDate: "2025-03-03", dueDate: "2025-05-02", effort: "80", billable: true },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, parentTaskId: veloPhases[1].id, name: "Freight Audit & Payment Rules Setup",         status: "Not Started", priority: "Medium", assigneeIds: [u("Sophie Laurent").id], startDate: "2025-04-07", dueDate: "2025-06-13", effort: "60", billable: true },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, parentTaskId: veloPhases[1].id, name: "Customs Document Generation Module",         status: "Blocked",     priority: "High",   assigneeIds: [u("Leila Hassan").id, u("Daniel Osei").id], startDate: "2025-03-17", dueDate: "2025-05-30", effort: "70", billable: true },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, parentTaskId: veloPhases[2].id, name: "EDI 204/210/214 Carrier Integration",        status: "Not Started", priority: "High",   assigneeIds: [u("Daniel Osei").id], startDate: "2025-07-01", dueDate: "2025-08-15", effort: "80", billable: true },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, parentTaskId: veloPhases[3].id, name: "End-User Training – DE Hub",                 status: "Not Started", priority: "Medium", assigneeIds: [u("Leila Hassan").id], startDate: "2025-09-01", dueDate: "2025-09-22", effort: "30", billable: true },
  ]);

  await db.insert(schema.tasksTable).values([
    { projectId: proj("Oracle WMS Cloud Migration").id, parentTaskId: primePhases[0].id, name: "Legacy Data Quality Assessment",             status: "Completed",   priority: "High",   assigneeIds: [u("Raj Krishnamurthy").id], startDate: "2025-02-03", dueDate: "2025-02-28", effort: "40", billable: true },
    { projectId: proj("Oracle WMS Cloud Migration").id, parentTaskId: primePhases[0].id, name: "Data Migration Strategy Doc",                 status: "Completed",   priority: "High",   assigneeIds: [u("Sophie Laurent").id], startDate: "2025-03-03", dueDate: "2025-03-14", effort: "24", billable: true, isMilestone: true, milestoneType: "Payment" },
    { projectId: proj("Oracle WMS Cloud Migration").id, parentTaskId: primePhases[1].id, name: "Cloud Tenant Provisioning & Baseline Config", status: "Completed",   priority: "High",   assigneeIds: [u("Priya Nair").id], startDate: "2025-03-17", dueDate: "2025-04-11", effort: "50", billable: true },
    { projectId: proj("Oracle WMS Cloud Migration").id, parentTaskId: primePhases[1].id, name: "RF Gun & Barcode Label Configuration",        status: "In Progress", priority: "Medium", assigneeIds: [u("Raj Krishnamurthy").id], startDate: "2025-04-14", dueDate: "2025-05-30", effort: "40", billable: true },
    { projectId: proj("Oracle WMS Cloud Migration").id, parentTaskId: primePhases[1].id, name: "ERP Integration (NetSuite → Oracle WMS)",     status: "In Progress", priority: "High",   assigneeIds: [u("Daniel Osei").id], startDate: "2025-04-28", dueDate: "2025-06-13", effort: "60", billable: true },
    { projectId: proj("Oracle WMS Cloud Migration").id, parentTaskId: primePhases[2].id, name: "UAT Scripting & Execution",                   status: "Not Started", priority: "High",   assigneeIds: [u("Tom Bridges").id, u("Sophie Laurent").id], startDate: "2025-06-16", dueDate: "2025-07-31", effort: "80", billable: true },
  ]);

  await db.insert(schema.tasksTable).values([
    { projectId: proj("Route Optimisation Engine Deployment").id, parentTaskId: swiftPhases[0].id, name: "Routing Algorithm Selection & PoC",  status: "Completed", priority: "High",     assigneeIds: [u("Priya Nair").id, u("Raj Krishnamurthy").id], startDate: "2024-09-16", dueDate: "2024-10-11", effort: "60",  billable: true },
    { projectId: proj("Route Optimisation Engine Deployment").id, parentTaskId: swiftPhases[0].id, name: "Microservice Architecture Design",   status: "Completed", priority: "High",     assigneeIds: [u("Daniel Osei").id], startDate: "2024-10-14", dueDate: "2024-11-01", effort: "40",  billable: true },
    { projectId: proj("Route Optimisation Engine Deployment").id, parentTaskId: swiftPhases[1].id, name: "Core Routing Engine Development",    status: "Completed", priority: "High",     assigneeIds: [u("Daniel Osei").id, u("Raj Krishnamurthy").id], startDate: "2024-11-04", dueDate: "2025-01-10", effort: "200", billable: true },
    { projectId: proj("Route Optimisation Engine Deployment").id, parentTaskId: swiftPhases[1].id, name: "Driver App API Development",          status: "Completed", priority: "Medium",   assigneeIds: [u("Daniel Osei").id], startDate: "2025-01-06", dueDate: "2025-01-31", effort: "60",  billable: true },
    { projectId: proj("Route Optimisation Engine Deployment").id, parentTaskId: swiftPhases[2].id, name: "DHL & FedEx API Connectors",         status: "Completed", priority: "High",     assigneeIds: [u("Daniel Osei").id], startDate: "2025-02-03", dueDate: "2025-03-07", effort: "80",  billable: true },
    { projectId: proj("Route Optimisation Engine Deployment").id, parentTaskId: swiftPhases[3].id, name: "Production Deployment & Monitoring", status: "Completed", priority: "Critical", assigneeIds: [u("Marcus Webb").id, u("Raj Krishnamurthy").id], startDate: "2025-03-17", dueDate: "2025-03-31", effort: "40",  billable: true, isMilestone: true, milestoneType: "Project" },
  ]);

  await db.insert(schema.tasksTable).values([
    { projectId: proj("HarbourLink EDI Integration").id, parentTaskId: harbourPhases[0].id, name: "Trading Partner Profile Documentation", status: "In Progress", priority: "High",   assigneeIds: [u("Daniel Osei").id], startDate: "2025-03-01", dueDate: "2025-04-11", effort: "40",  billable: true },
    { projectId: proj("HarbourLink EDI Integration").id, parentTaskId: harbourPhases[0].id, name: "VAN / AS2 Connectivity Setup",         status: "Not Started", priority: "High",   assigneeIds: [u("Daniel Osei").id], startDate: "2025-04-14", dueDate: "2025-05-30", effort: "32",  billable: true },
    { projectId: proj("HarbourLink EDI Integration").id, parentTaskId: harbourPhases[1].id, name: "EDI 315/322 Sea Status Maps Build",    status: "Not Started", priority: "High",   assigneeIds: [u("Daniel Osei").id, u("Raj Krishnamurthy").id], startDate: "2025-06-02", dueDate: "2025-08-29", effort: "120", billable: true },
    { projectId: proj("HarbourLink EDI Integration").id, parentTaskId: harbourPhases[1].id, name: "EDI 214/990 Carrier Acknowledgements", status: "Not Started", priority: "Medium", assigneeIds: [u("Daniel Osei").id], startDate: "2025-07-01", dueDate: "2025-09-30", effort: "60",  billable: true },
  ]);

  // ─── Allocations (2025 + 2026 forward) ────────────────────────────────────
  await db.insert(schema.allocationsTable).values([
    { projectId: proj("FrostLine WMS Implementation").id,        userId: u("Marcus Webb").id,       role: "Project Manager",       startDate: "2024-11-01", endDate: "2025-07-31", hoursPerWeek: "16", isTimesheetApprover: true },
    { projectId: proj("FrostLine WMS Implementation").id,        userId: u("Priya Nair").id,        role: "Solutions Architect",   startDate: "2024-11-01", endDate: "2025-07-31", hoursPerWeek: "28" },
    { projectId: proj("FrostLine WMS Implementation").id,        userId: u("Sophie Laurent").id,    role: "Business Analyst",      startDate: "2024-11-01", endDate: "2025-04-30", hoursPerWeek: "24" },
    { projectId: proj("FrostLine WMS Implementation").id,        userId: u("Raj Krishnamurthy").id, role: "Data Engineer",         startDate: "2025-01-06", endDate: "2025-07-31", hoursPerWeek: "20" },
    { projectId: proj("FrostLine WMS Implementation").id,        userId: u("Daniel Osei").id,       role: "Integration Engineer",  startDate: "2025-05-01", endDate: "2025-07-31", hoursPerWeek: "32" },
    { projectId: proj("FrostLine WMS Implementation").id,        userId: u("Leila Hassan").id,      role: "Change Management Lead",startDate: "2025-03-01", endDate: "2025-07-31", hoursPerWeek: "16" },
    { projectId: proj("FrostLine WMS Implementation").id,        userId: u("Tom Bridges").id,       role: "QA Engineer",           startDate: "2025-05-15", endDate: "2025-06-27", hoursPerWeek: "32" },
    { projectId: proj("FrostLine WMS Implementation").id,        userId: u("Amara Diallo").id,      role: "Consultant",            startDate: "2025-03-01", endDate: "2025-07-31", hoursPerWeek: "16" },

    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id,   userId: u("Marcus Webb").id,       role: "Project Manager",       startDate: "2025-01-15", endDate: "2025-09-30", hoursPerWeek: "16", isTimesheetApprover: true },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id,   userId: u("Priya Nair").id,        role: "Solutions Architect",   startDate: "2025-01-15", endDate: "2025-09-30", hoursPerWeek: "24" },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id,   userId: u("Sophie Laurent").id,    role: "Business Analyst",      startDate: "2025-01-15", endDate: "2025-06-30", hoursPerWeek: "32" },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id,   userId: u("Leila Hassan").id,      role: "Change Management Lead",startDate: "2025-03-17", endDate: "2025-09-30", hoursPerWeek: "20" },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id,   userId: u("Daniel Osei").id,       role: "Integration Engineer",  startDate: "2025-07-01", endDate: "2025-09-30", hoursPerWeek: "32" },

    { projectId: proj("Oracle WMS Cloud Migration").id,           userId: u("Priya Nair").id,        role: "Solutions Architect",   startDate: "2025-02-03", endDate: "2025-08-29", hoursPerWeek: "24", isTimesheetApprover: true },
    { projectId: proj("Oracle WMS Cloud Migration").id,           userId: u("Raj Krishnamurthy").id, role: "Data Engineer",         startDate: "2025-02-03", endDate: "2025-08-29", hoursPerWeek: "24" },
    { projectId: proj("Oracle WMS Cloud Migration").id,           userId: u("Daniel Osei").id,       role: "Integration Engineer",  startDate: "2025-04-28", endDate: "2025-08-29", hoursPerWeek: "32" },
    { projectId: proj("Oracle WMS Cloud Migration").id,           userId: u("Sophie Laurent").id,    role: "Business Analyst",      startDate: "2025-02-03", endDate: "2025-06-30", hoursPerWeek: "16" },
    { projectId: proj("Oracle WMS Cloud Migration").id,           userId: u("Tom Bridges").id,       role: "QA Engineer",           startDate: "2025-06-16", endDate: "2025-08-29", hoursPerWeek: "32" },

    { projectId: proj("Route Optimisation Engine Deployment").id, userId: u("Sophie Laurent").id,    role: "Project Manager",       startDate: "2024-09-16", endDate: "2025-03-31", hoursPerWeek: "16", isTimesheetApprover: true },
    { projectId: proj("Route Optimisation Engine Deployment").id, userId: u("Daniel Osei").id,       role: "Integration Engineer",  startDate: "2024-09-16", endDate: "2025-03-31", hoursPerWeek: "32" },
    { projectId: proj("Route Optimisation Engine Deployment").id, userId: u("Raj Krishnamurthy").id, role: "Data Engineer",         startDate: "2024-09-16", endDate: "2025-03-31", hoursPerWeek: "24" },
    { projectId: proj("Route Optimisation Engine Deployment").id, userId: u("Priya Nair").id,        role: "Solutions Architect",   startDate: "2024-09-16", endDate: "2024-11-01", hoursPerWeek: "24" },
    { projectId: proj("Route Optimisation Engine Deployment").id, userId: u("Marcus Webb").id,       role: "Project Manager",       startDate: "2025-03-17", endDate: "2025-03-31", hoursPerWeek: "40" },

    { projectId: proj("HarbourLink EDI Integration").id,         userId: u("Daniel Osei").id,       role: "Integration Engineer",  startDate: "2025-03-01", endDate: "2025-10-31", hoursPerWeek: "32", isTimesheetApprover: true },
    { projectId: proj("HarbourLink EDI Integration").id,         userId: u("Raj Krishnamurthy").id, role: "Data Engineer",         startDate: "2025-06-02", endDate: "2025-10-31", hoursPerWeek: "16" },

    // 2026 forward-looking
    { projectId: proj("FrostLine WMS Implementation").id,        userId: u("Marcus Webb").id,       role: "Project Manager",       startDate: "2026-01-05", endDate: "2026-12-18", hoursPerWeek: "12", isTimesheetApprover: true },
    { projectId: proj("FrostLine WMS Implementation").id,        userId: u("Priya Nair").id,        role: "Solutions Architect",   startDate: "2026-01-05", endDate: "2026-09-25", hoursPerWeek: "20" },
    { projectId: proj("FrostLine WMS Implementation").id,        userId: u("Daniel Osei").id,       role: "Integration Engineer",  startDate: "2026-01-05", endDate: "2026-12-18", hoursPerWeek: "24" },
    { projectId: proj("FrostLine WMS Implementation").id,        userId: u("Tom Bridges").id,       role: "QA Engineer",           startDate: "2026-03-02", endDate: "2026-08-28", hoursPerWeek: "28" },
    { projectId: proj("FrostLine WMS Implementation").id,        userId: u("Leila Hassan").id,      role: "Change Management Lead",startDate: "2026-01-05", endDate: "2026-06-26", hoursPerWeek: "16" },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id,   userId: u("Marcus Webb").id,       role: "Project Manager",       startDate: "2026-01-05", endDate: "2026-12-18", hoursPerWeek: "16" },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id,   userId: u("Sophie Laurent").id,    role: "Business Analyst",      startDate: "2026-01-05", endDate: "2026-10-30", hoursPerWeek: "32" },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id,   userId: u("Leila Hassan").id,      role: "Change Management Lead",startDate: "2026-01-05", endDate: "2026-09-25", hoursPerWeek: "20" },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id,   userId: u("Raj Krishnamurthy").id, role: "Data Engineer",         startDate: "2026-04-06", endDate: "2026-12-18", hoursPerWeek: "20" },
    { projectId: proj("Oracle WMS Cloud Migration").id,           userId: u("Priya Nair").id,        role: "Solutions Architect",   startDate: "2026-01-05", endDate: "2026-08-28", hoursPerWeek: "16" },
    { projectId: proj("Oracle WMS Cloud Migration").id,           userId: u("Daniel Osei").id,       role: "Integration Engineer",  startDate: "2026-01-05", endDate: "2026-08-28", hoursPerWeek: "16" },
    { projectId: proj("Oracle WMS Cloud Migration").id,           userId: u("Sophie Laurent").id,    role: "Business Analyst",      startDate: "2026-01-05", endDate: "2026-06-26", hoursPerWeek: "12" },
    { projectId: proj("Oracle WMS Cloud Migration").id,           userId: u("Tom Bridges").id,       role: "QA Engineer",           startDate: "2026-04-06", endDate: "2026-08-28", hoursPerWeek: "20" },
    { projectId: proj("HarbourLink EDI Integration").id,         userId: u("Daniel Osei").id,       role: "Integration Engineer",  startDate: "2026-01-05", endDate: "2026-10-30", hoursPerWeek: "20" },
    { projectId: proj("HarbourLink EDI Integration").id,         userId: u("Raj Krishnamurthy").id, role: "Data Engineer",         startDate: "2026-01-05", endDate: "2026-10-30", hoursPerWeek: "16" },
    { projectId: proj("Fleet Telemetry MVP").id,                  userId: u("Marcus Webb").id,       role: "Project Manager",       startDate: "2026-03-02", endDate: "2026-12-18", hoursPerWeek: "12" },
    { projectId: proj("Fleet Telemetry MVP").id,                  userId: u("Daniel Osei").id,       role: "Integration Engineer",  startDate: "2026-03-02", endDate: "2026-12-18", hoursPerWeek: "24" },
    { projectId: proj("Fleet Telemetry MVP").id,                  userId: u("Raj Krishnamurthy").id, role: "Data Engineer",         startDate: "2026-03-02", endDate: "2026-12-18", hoursPerWeek: "20" },
    { projectId: proj("Fleet Telemetry MVP").id,                  userId: u("Tom Bridges").id,       role: "QA Engineer",           startDate: "2026-06-01", endDate: "2026-12-18", hoursPerWeek: "16" },
    { projectId: proj("Fleet Telemetry MVP").id,                  userId: u("Amara Diallo").id,     role: "Consultant",            startDate: "2026-03-02", endDate: "2026-09-25", hoursPerWeek: "20" },
    { projectId: proj("Oracle WMS Cloud Migration").id,           userId: u("Amara Diallo").id,     role: "Consultant",            startDate: "2026-01-05", endDate: "2026-08-28", hoursPerWeek: "12" },
  ]);

  // ─── Time Entries ─────────────────────────────────────────────────────────
  const timeEntries: (typeof schema.timeEntriesTable.$inferInsert)[] = [];
  const weeks = [
    "2025-01-06","2025-01-13","2025-01-20","2025-01-27",
    "2025-02-03","2025-02-10","2025-02-17","2025-02-24",
    "2025-03-03","2025-03-10","2025-03-17","2025-03-24",
    "2025-03-31","2025-04-07",
  ];

  for (const wk of weeks) {
    timeEntries.push({ projectId: proj("FrostLine WMS Implementation").id, userId: u("Marcus Webb").id, date: wk, hours: "12", description: "Project management, status reports, steering committee", billable: true, approved: true });
    timeEntries.push({ projectId: proj("FrostLine WMS Implementation").id, userId: u("Priya Nair").id,  date: wk, hours: "28", description: "SAP EWM configuration and design workshops", billable: true, approved: true });
  }
  for (const wk of weeks.slice(0, 8)) {
    timeEntries.push({ projectId: proj("FrostLine WMS Implementation").id, userId: u("Sophie Laurent").id, date: wk, hours: "20", description: "Process mapping and gap analysis", billable: true, approved: true });
  }
  for (const wk of weeks.slice(4)) {
    timeEntries.push({ projectId: proj("FrostLine WMS Implementation").id, userId: u("Raj Krishnamurthy").id, date: wk, hours: "18", description: "RFID configuration and data engineering", billable: true, approved: true });
  }
  for (const wk of weeks.slice(2)) {
    timeEntries.push({ projectId: proj("VeloFreight TMS Rollout – Phase 1").id, userId: u("Marcus Webb").id,    date: wk, hours: "14", description: "Steering updates, risk tracking", billable: true, approved: true });
    timeEntries.push({ projectId: proj("VeloFreight TMS Rollout – Phase 1").id, userId: u("Priya Nair").id,     date: wk, hours: "20", description: "TMS configuration workshops", billable: true, approved: true });
    timeEntries.push({ projectId: proj("VeloFreight TMS Rollout – Phase 1").id, userId: u("Sophie Laurent").id, date: wk, hours: "28", description: "Freight lane requirements and carrier data", billable: true, approved: true });
  }
  for (const wk of weeks.slice(4)) {
    timeEntries.push({ projectId: proj("Oracle WMS Cloud Migration").id, userId: u("Priya Nair").id,        date: wk, hours: "20", description: "Oracle WMS cloud tenant configuration", billable: true, approved: true });
    timeEntries.push({ projectId: proj("Oracle WMS Cloud Migration").id, userId: u("Raj Krishnamurthy").id, date: wk, hours: "16", description: "Data migration scripting and validation", billable: true, approved: true });
  }
  for (const wk of weeks.slice(0, 12)) {
    timeEntries.push({ projectId: proj("Route Optimisation Engine Deployment").id, userId: u("Daniel Osei").id, date: wk, hours: "32", description: "Route engine development and courier API integration", billable: true, approved: true });
  }
  for (const wk of weeks.slice(0, 10)) {
    timeEntries.push({ projectId: proj("Route Optimisation Engine Deployment").id, userId: u("Raj Krishnamurthy").id, date: wk, hours: "24", description: "Algorithm development and performance tuning", billable: true, approved: true });
  }
  for (const wk of weeks.slice(9)) {
    timeEntries.push({ projectId: proj("HarbourLink EDI Integration").id, userId: u("Daniel Osei").id, date: wk, hours: "24", description: "Trading partner profile setup and AS2 config", billable: true, approved: false });
  }

  const timeEntryRows = await db.insert(schema.timeEntriesTable).values(timeEntries).returning();

  // ─── Invoices ────────────────────────────────────────────────────────────
  await db.insert(schema.invoicesTable).values([
    { id: "INV-2024-001", projectId: proj("FrostLine WMS Implementation").id,         accountId: acc("FrostLine Cold Storage").id,    issueDate: "2024-12-31", dueDate: "2025-01-30", status: "Paid",      amount: "312500", tax: "0", total: "312500", description: "Milestone 1: Discovery & Blueprint completion – FrostLine WMS",     billTo: "FrostLine Cold Storage – AP Department", notes: "25% milestone payment per contract schedule." },
    { id: "INV-2025-001", projectId: proj("FrostLine WMS Implementation").id,         accountId: acc("FrostLine Cold Storage").id,    issueDate: "2025-03-31", dueDate: "2025-04-30", status: "Approved",  amount: "312500", tax: "0", total: "312500", description: "Milestone 2: System Configuration (50%) – FrostLine WMS",            billTo: "FrostLine Cold Storage – AP Department", notes: "Q1 2025 progress billing." },
    { id: "INV-2025-002", projectId: proj("VeloFreight TMS Rollout – Phase 1").id,    accountId: acc("VeloFreight Global").id,        issueDate: "2025-02-28", dueDate: "2025-03-31", status: "Paid",      amount: "156000", tax: "0", total: "156000", description: "T&M January–February 2025 – VeloFreight TMS Rollout Phase 1",        billTo: "VeloFreight Global Finance",             notes: "Covers 340 hours @ blended rate." },
    { id: "INV-2025-003", projectId: proj("VeloFreight TMS Rollout – Phase 1").id,    accountId: acc("VeloFreight Global").id,        issueDate: "2025-04-15", dueDate: "2025-05-15", status: "Overdue",   amount: "198000", tax: "0", total: "198000", description: "T&M March–April 2025 – VeloFreight TMS Rollout Phase 1",             billTo: "VeloFreight Global Finance",             notes: "Awaiting PO approval. Escalated." },
    { id: "INV-2025-004", projectId: proj("Oracle WMS Cloud Migration").id,           accountId: acc("PrimePack Distribution").id,    issueDate: "2025-03-14", dueDate: "2025-04-13", status: "Paid",      amount: "85000",  tax: "0", total: "85000",  description: "Milestone 1: Assessment & Data Migration Plan – Oracle WMS Cloud",   billTo: "PrimePack Distribution – Finance" },
    { id: "INV-2025-005", projectId: proj("Oracle WMS Cloud Migration").id,           accountId: acc("PrimePack Distribution").id,    issueDate: "2025-04-30", dueDate: "2025-05-30", status: "In Review", amount: "127500", tax: "0", total: "127500", description: "Milestone 2: Cloud Tenant Setup & Config (50%) – Oracle WMS Cloud", billTo: "PrimePack Distribution – Finance" },
    { id: "INV-2024-002", projectId: proj("Route Optimisation Engine Deployment").id, accountId: acc("SwiftRoute Last Mile").id,      issueDate: "2024-12-20", dueDate: "2025-01-19", status: "Paid",      amount: "196000", tax: "0", total: "196000", description: "Milestone 1: Design & Core Engine Build – Route Optimisation Engine",billTo: "SwiftRoute Last Mile – Finance" },
    { id: "INV-2025-006", projectId: proj("Route Optimisation Engine Deployment").id, accountId: acc("SwiftRoute Last Mile").id,      issueDate: "2025-03-31", dueDate: "2025-04-30", status: "Paid",      amount: "294000", tax: "0", total: "294000", description: "Final Milestone: Production Deployment – Route Optimisation Engine", billTo: "SwiftRoute Last Mile – Finance",         notes: "Project closed. Final retention payment." },
    { id: "INV-2025-007", projectId: proj("HarbourLink EDI Integration").id,          accountId: acc("HarbourLink Shipping").id,      issueDate: "2025-04-30", dueDate: "2025-05-30", status: "Draft",     amount: "64000",  tax: "0", total: "64000",  description: "T&M March–April 2025 – HarbourLink EDI Integration",                  billTo: "HarbourLink Shipping AP" },
  ]);

  // ─── Contracts ───────────────────────────────────────────────────────────
  await db.insert(schema.contractsTable).values([
    { projectId: proj("FrostLine WMS Implementation").id,         name: "Master Services Agreement – FrostLine WMS",      status: "Active", startDate: "2024-10-15", endDate: "2025-07-31", value: "1250000", notes: "Fixed-fee, milestone-based. 4 payment triggers." },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id,    name: "TMS Implementation SOW – VeloFreight Phase 1",   status: "Active", startDate: "2025-01-01", endDate: "2025-09-30", value: "780000",  notes: "Time & Materials. Monthly billing cycle." },
    { projectId: proj("Oracle WMS Cloud Migration").id,           name: "Oracle WMS Cloud Migration Contract",            status: "Active", startDate: "2025-01-15", endDate: "2025-08-29", value: "340000",  notes: "Fixed-fee. 3 milestone payments." },
    { projectId: proj("Route Optimisation Engine Deployment").id, name: "Route Optimisation Engine – Delivery Contract",  status: "Closed", startDate: "2024-08-20", endDate: "2025-03-31", value: "490000",  notes: "Fixed-fee. Fully delivered and closed." },
    { projectId: proj("HarbourLink EDI Integration").id,          name: "EDI Integration Services Agreement",             status: "Active", startDate: "2025-02-10", endDate: "2025-10-31", value: "320000",  notes: "T&M cap $320k. Monthly billing." },
    { projectId: proj("Fleet Telemetry MVP").id,                  name: "Fleet Telemetry MVP Statement of Work",          status: "Draft",  startDate: "2025-06-01", endDate: "2025-12-15", value: "220000",  notes: "Awaiting countersignature from Meridian Fleet." },
  ]);

  // ─── Budget Entries ───────────────────────────────────────────────────────
  await db.insert(schema.budgetEntriesTable).values([
    { projectId: proj("FrostLine WMS Implementation").id,         type: "SOW",        amount: "1250000", entryDate: "2024-10-01", description: "Original signed contract value",                       enteredByUserId: u("Marcus Webb").id },
    { projectId: proj("FrostLine WMS Implementation").id,         type: "Adjustment", amount: "75000",   entryDate: "2025-01-15", description: "Change order #1 – additional DC configuration scope", enteredByUserId: u("Marcus Webb").id },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id,    type: "SOW",        amount: "780000",  entryDate: "2024-11-01", description: "Phase 1 SOW value",                                    enteredByUserId: u("Marcus Webb").id },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id,    type: "Adjustment", amount: "-40000",  entryDate: "2025-02-10", description: "Scope reduction – postponed carrier rating module",    enteredByUserId: u("Marcus Webb").id },
    { projectId: proj("Oracle WMS Cloud Migration").id,           type: "SOW",        amount: "340000",  entryDate: "2025-01-01", description: "Original fixed-fee value",                             enteredByUserId: u("Priya Nair").id },
    { projectId: proj("Route Optimisation Engine Deployment").id, type: "SOW",        amount: "490000",  entryDate: "2024-10-01", description: "Final contract value",                                  enteredByUserId: u("Sophie Laurent").id },
    { projectId: proj("HarbourLink EDI Integration").id,          type: "SOW",        amount: "320000",  entryDate: "2025-02-01", description: "T&M cap per MSA",                                       enteredByUserId: u("Daniel Osei").id },
    { projectId: proj("Fleet Telemetry MVP").id,                  type: "SOW",        amount: "220000",  entryDate: "2025-03-01", description: "MVP fixed fee per draft SOW",                          enteredByUserId: u("Tom Bridges").id },
  ]);

  // ─── Revenue Entries ──────────────────────────────────────────────────────
  await db.insert(schema.revenueEntriesTable).values([
    { projectId: proj("FrostLine WMS Implementation").id,         period: "2024-11", amount: "50000",  recognizedAt: "2024-11-30", method: "percentage_complete", notes: "Month 1 recognition" },
    { projectId: proj("FrostLine WMS Implementation").id,         period: "2024-12", amount: "90000",  recognizedAt: "2024-12-31", method: "percentage_complete", notes: "Blueprint delivery" },
    { projectId: proj("FrostLine WMS Implementation").id,         period: "2025-01", amount: "85000",  recognizedAt: "2025-01-31", method: "percentage_complete" },
    { projectId: proj("FrostLine WMS Implementation").id,         period: "2025-02", amount: "95000",  recognizedAt: "2025-02-28", method: "percentage_complete" },
    { projectId: proj("FrostLine WMS Implementation").id,         period: "2025-03", amount: "100000", recognizedAt: "2025-03-31", method: "percentage_complete" },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id,    period: "2025-01", amount: "72000",  recognizedAt: "2025-01-31", method: "time_and_materials" },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id,    period: "2025-02", amount: "84000",  recognizedAt: "2025-02-28", method: "time_and_materials" },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id,    period: "2025-03", amount: "95000",  recognizedAt: "2025-03-31", method: "time_and_materials" },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id,    period: "2025-04", amount: "103000", recognizedAt: "2025-04-30", method: "time_and_materials" },
    { projectId: proj("Oracle WMS Cloud Migration").id,           period: "2025-02", amount: "55000",  recognizedAt: "2025-02-28", method: "milestone" },
    { projectId: proj("Oracle WMS Cloud Migration").id,           period: "2025-03", amount: "30000",  recognizedAt: "2025-03-31", method: "milestone" },
    { projectId: proj("Oracle WMS Cloud Migration").id,           period: "2025-04", amount: "65000",  recognizedAt: "2025-04-30", method: "milestone" },
    { projectId: proj("Route Optimisation Engine Deployment").id, period: "2024-11", amount: "80000",  recognizedAt: "2024-11-30", method: "milestone" },
    { projectId: proj("Route Optimisation Engine Deployment").id, period: "2024-12", amount: "116000", recognizedAt: "2024-12-31", method: "milestone" },
    { projectId: proj("Route Optimisation Engine Deployment").id, period: "2025-01", amount: "120000", recognizedAt: "2025-01-31", method: "time_and_materials" },
    { projectId: proj("Route Optimisation Engine Deployment").id, period: "2025-02", amount: "90000",  recognizedAt: "2025-02-28", method: "time_and_materials" },
    { projectId: proj("Route Optimisation Engine Deployment").id, period: "2025-03", amount: "84000",  recognizedAt: "2025-03-31", method: "milestone", notes: "Final retention" },
    { projectId: proj("HarbourLink EDI Integration").id,          period: "2025-03", amount: "28000",  recognizedAt: "2025-03-31", method: "time_and_materials" },
    { projectId: proj("HarbourLink EDI Integration").id,          period: "2025-04", amount: "36000",  recognizedAt: "2025-04-30", method: "time_and_materials" },
  ]);

  // ─── Holiday calendars + timesheet approvers ─────────────────────────────
  const approverId = u("Marcus Webb").id;
  const calendarAssignments: Array<[string[], number, string]> = [
    [["Marcus Webb"],                                         eurHolCal.id,  "Europe"],
    [["Sophie Laurent","Tom Bridges","Raj Krishnamurthy"],     usHolCal.id,   "North America"],
    [["Daniel Osei","Leila Hassan"],                          apacHolCal.id, "Asia Pacific"],
    [["Priya Nair","Amara Diallo"],                           usHolCal.id,   "North America"],
  ];
  for (const [names, calId, region] of calendarAssignments) {
    await db.update(schema.usersTable)
      .set({ holidayCalendarId: calId, region, timesheetApproverUserId: approverId })
      .where(inArray(schema.usersTable.name, names));
  }

  // ─── Time Categories + Activity Defaults ──────────────────────────────────
  await db.insert(schema.timeCategoriesTable).values([
    { name: "Billable Project Work",  description: "Time delivered against contracted scope",  sortOrder: 1, defaultBillable: true },
    { name: "Internal Meetings",      description: "Standups, retros, internal syncs",         sortOrder: 2, defaultBillable: false },
    { name: "Training & Enablement",  description: "Certifications, learning, ramp-up",        sortOrder: 3, defaultBillable: false },
    { name: "Pre-sales & Estimation", description: "Discovery calls, proposals, SOWs",         sortOrder: 4, defaultBillable: false },
    { name: "Admin & PMO",            description: "Timesheets, status reports, governance",   sortOrder: 5, defaultBillable: false },
  ]);
  await db.insert(schema.activityDefaultsTable).values([
    { activityName: "Internal Meetings", billable: false },
    { activityName: "Training",          billable: false },
    { activityName: "Vacation",          billable: false },
    { activityName: "Sick Leave",        billable: false },
    { activityName: "Pre-sales",         billable: false },
    { activityName: "Public Holiday",    billable: false },
  ]);

  // ─── Time-Off Requests ────────────────────────────────────────────────────
  await db.insert(schema.timeOffRequestsTable).values([
    { userId: u("Priya Nair").id,        type: "PTO",        startDate: "2025-03-17", endDate: "2025-03-21", status: "Approved", durationType: "Full Day", approvedByUserId: u("Marcus Webb").id, notes: "Family holiday" },
    { userId: u("Sophie Laurent").id,    type: "PTO",        startDate: "2025-02-24", endDate: "2025-02-26", status: "Approved", durationType: "Full Day", approvedByUserId: u("Marcus Webb").id, notes: "Personal" },
    { userId: u("Daniel Osei").id,       type: "Sick Leave", startDate: "2025-04-07", endDate: "2025-04-08", status: "Approved", durationType: "Full Day", approvedByUserId: u("Marcus Webb").id },
    { userId: u("Leila Hassan").id,      type: "PTO",        startDate: "2025-04-14", endDate: "2025-04-18", status: "Approved", durationType: "Full Day", approvedByUserId: u("Marcus Webb").id, notes: "Annual leave" },
    { userId: u("Raj Krishnamurthy").id, type: "PTO",        startDate: "2025-05-12", endDate: "2025-05-16", status: "Approved", durationType: "Full Day", approvedByUserId: u("Marcus Webb").id, notes: "Wedding" },
    { userId: u("Tom Bridges").id,       type: "PTO",        startDate: "2026-04-13", endDate: "2026-04-17", status: "Approved", durationType: "Full Day", approvedByUserId: u("Marcus Webb").id, notes: "Spring break" },
    { userId: u("Amara Diallo").id,      type: "PTO",        startDate: "2026-04-06", endDate: "2026-04-06", status: "Approved", durationType: "Half Day" },
    { userId: u("Sophie Laurent").id,    type: "PTO",        startDate: "2026-05-04", endDate: "2026-05-08", status: "Pending",  durationType: "Full Day", notes: "Awaiting manager approval" },
    { userId: u("Daniel Osei").id,       type: "Bereavement",startDate: "2026-04-27", endDate: "2026-04-29", status: "Pending",  durationType: "Full Day" },
    { userId: u("Tom Bridges").id,       type: "PTO",        startDate: "2026-06-01", endDate: "2026-06-12", status: "Rejected", durationType: "Full Day", approvedByUserId: u("Marcus Webb").id, notes: "Conflicts with Fleet Telemetry MVP go-live" },
  ]);

  // ─── Timesheets ───────────────────────────────────────────────────────────
  type TS = typeof schema.timesheetsTable.$inferInsert;
  const tsRows: TS[] = [];
  for (let wi = 0; wi < weeks.length; wi++) {
    const wk = weeks[wi];
    const wkEnd = new Date(wk + "T00:00:00Z"); wkEnd.setUTCDate(wkEnd.getUTCDate() + 6);
    const wkEndStr = wkEnd.toISOString().slice(0, 10);
    const weekAge = weeks.length - 1 - wi;
    for (const user of users) {
      const userEntries = timeEntryRows.filter(e => e.userId === user.id && e.date! >= wk && e.date! <= wkEndStr);
      const total = userEntries.reduce((s, e) => s + Number(e.hours), 0);
      const billable = userEntries.filter(e => e.billable).reduce((s, e) => s + Number(e.hours), 0);
      if (total === 0) continue;
      let status: "Draft"|"Submitted"|"Approved"|"Rejected" = "Approved";
      let submittedAt: Date|null = new Date(wkEnd); submittedAt.setUTCDate(submittedAt.getUTCDate() + 1);
      let approvedAt:  Date|null = new Date(wkEnd); approvedAt.setUTCDate(approvedAt.getUTCDate() + 3);
      let approvedBy: number|null = u("Marcus Webb").id;
      let rejectedAt: Date|null = null;
      let rejectionNote: string|null = null;
      if (weekAge <= 1) { status = "Draft"; submittedAt = null; approvedAt = null; approvedBy = null; }
      else if (weekAge <= 3) { status = "Submitted"; approvedAt = null; approvedBy = null; }
      else if (user.name === "Daniel Osei" && wk === "2025-03-31") {
        status = "Rejected"; approvedAt = null; approvedBy = null;
        rejectedAt = new Date(wkEnd); rejectedAt.setUTCDate(rejectedAt.getUTCDate() + 4);
        rejectionNote = "Please split Project A vs B hours and resubmit.";
      }
      tsRows.push({
        userId: user.id, weekStart: wk, status,
        totalHours: total.toFixed(2), billableHours: billable.toFixed(2),
        submittedAt: submittedAt as any, submittedByUserId: submittedAt ? user.id : null,
        approvedAt: approvedAt as any, approvedByUserId: approvedBy,
        rejectedAt: rejectedAt as any, rejectedByUserId: rejectedAt ? u("Marcus Webb").id : null,
        rejectionNote,
      });
    }
  }
  if (tsRows.length) await db.insert(schema.timesheetsTable).values(tsRows);

  // ─── Key Events + Intervals ──────────────────────────────────────────────
  const keyEventRows = await db.insert(schema.keyEventsTable).values([
    { projectId: proj("FrostLine WMS Implementation").id,         name: "Contract Signed",        eventDate: "2024-10-15", eventType: "manual" },
    { projectId: proj("FrostLine WMS Implementation").id,         name: "Kick-off",               eventDate: "2024-11-01", eventType: "manual" },
    { projectId: proj("FrostLine WMS Implementation").id,         name: "Blueprint Approved",     eventDate: "2024-12-20", eventType: "manual" },
    { projectId: proj("FrostLine WMS Implementation").id,         name: "Config Complete",        eventDate: "2025-04-30", eventType: "manual" },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id,    name: "Contract Signed",        eventDate: "2024-12-01", eventType: "manual" },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id,    name: "Kick-off",               eventDate: "2025-01-15", eventType: "manual" },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id,    name: "Requirements Approved",  eventDate: "2025-02-28", eventType: "manual" },
    { projectId: proj("Oracle WMS Cloud Migration").id,           name: "Contract Signed",        eventDate: "2025-01-15", eventType: "manual" },
    { projectId: proj("Oracle WMS Cloud Migration").id,           name: "Kick-off",               eventDate: "2025-02-03", eventType: "manual" },
    { projectId: proj("Oracle WMS Cloud Migration").id,           name: "Migration Plan Approved",eventDate: "2025-03-14", eventType: "manual" },
    { projectId: proj("Route Optimisation Engine Deployment").id, name: "Contract Signed",        eventDate: "2024-08-20", eventType: "manual" },
    { projectId: proj("Route Optimisation Engine Deployment").id, name: "Kick-off",               eventDate: "2024-09-16", eventType: "manual" },
    { projectId: proj("Route Optimisation Engine Deployment").id, name: "Production Launch",      eventDate: "2025-03-31", eventType: "manual" },
    { projectId: proj("HarbourLink EDI Integration").id,          name: "Contract Signed",        eventDate: "2025-02-10", eventType: "manual" },
    { projectId: proj("HarbourLink EDI Integration").id,          name: "Kick-off",               eventDate: "2025-03-01", eventType: "manual" },
  ]).returning();

  const ev = (projectName: string, name: string) =>
    keyEventRows.find(e => e.projectId === proj(projectName).id && e.name === name)!;

  await db.insert(schema.intervalsTable).values([
    { projectId: proj("FrostLine WMS Implementation").id,         name: "Contract → Kick-off",     startEventId: ev("FrostLine WMS Implementation","Contract Signed").id,         endEventId: ev("FrostLine WMS Implementation","Kick-off").id,                       benchmarkDays: 14 },
    { projectId: proj("FrostLine WMS Implementation").id,         name: "Kick-off → Blueprint",    startEventId: ev("FrostLine WMS Implementation","Kick-off").id,                endEventId: ev("FrostLine WMS Implementation","Blueprint Approved").id,             benchmarkDays: 45 },
    { projectId: proj("FrostLine WMS Implementation").id,         name: "Blueprint → Config",      startEventId: ev("FrostLine WMS Implementation","Blueprint Approved").id,      endEventId: ev("FrostLine WMS Implementation","Config Complete").id,                benchmarkDays: 90 },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id,    name: "Contract → Kick-off",     startEventId: ev("VeloFreight TMS Rollout – Phase 1","Contract Signed").id,    endEventId: ev("VeloFreight TMS Rollout – Phase 1","Kick-off").id,                  benchmarkDays: 21 },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id,    name: "Kick-off → Requirements", startEventId: ev("VeloFreight TMS Rollout – Phase 1","Kick-off").id,           endEventId: ev("VeloFreight TMS Rollout – Phase 1","Requirements Approved").id,     benchmarkDays: 30 },
    { projectId: proj("Oracle WMS Cloud Migration").id,           name: "Contract → Kick-off",     startEventId: ev("Oracle WMS Cloud Migration","Contract Signed").id,           endEventId: ev("Oracle WMS Cloud Migration","Kick-off").id,                          benchmarkDays: 14 },
    { projectId: proj("Oracle WMS Cloud Migration").id,           name: "Kick-off → Migration Plan",startEventId: ev("Oracle WMS Cloud Migration","Kick-off").id,                  endEventId: ev("Oracle WMS Cloud Migration","Migration Plan Approved").id,         benchmarkDays: 30 },
    { projectId: proj("Route Optimisation Engine Deployment").id, name: "Contract → Kick-off",     startEventId: ev("Route Optimisation Engine Deployment","Contract Signed").id, endEventId: ev("Route Optimisation Engine Deployment","Kick-off").id,               benchmarkDays: 21 },
    { projectId: proj("Route Optimisation Engine Deployment").id, name: "Kick-off → Launch",       startEventId: ev("Route Optimisation Engine Deployment","Kick-off").id,        endEventId: ev("Route Optimisation Engine Deployment","Production Launch").id,     benchmarkDays: 180 },
    { projectId: proj("HarbourLink EDI Integration").id,          name: "Contract → Kick-off",     startEventId: ev("HarbourLink EDI Integration","Contract Signed").id,          endEventId: ev("HarbourLink EDI Integration","Kick-off").id,                        benchmarkDays: 14 },
  ]);

  // ─── Documents (per project) ──────────────────────────────────────────────
  await db.insert(schema.documentsTable).values([
    { projectId: proj("FrostLine WMS Implementation").id,         name: "Project Charter",                  documentType: "rich_text", spaceType: "shared",  createdByUserId: u("Marcus Webb").id, content: "# Project Charter\n\n## Objectives\nFull SAP EWM implementation for 3 FrostLine cold storage DCs.\n\n## Scope\n- Warehouse configuration\n- RFID integration\n- Training\n\n## Budget: $1,250,000" },
    { projectId: proj("FrostLine WMS Implementation").id,         name: "SAP EWM Blueprint Report",         documentType: "rich_text", spaceType: "shared",  createdByUserId: u("Priya Nair").id,  content: "# SAP EWM Blueprint\n\n## Fit-Gap Analysis\n## Configuration Decisions" },
    { projectId: proj("FrostLine WMS Implementation").id,         name: "Go-Live Checklist",                documentType: "rich_text", spaceType: "private", createdByUserId: u("Marcus Webb").id, content: "# Go-Live Checklist\n\n- [ ] All SIT scenarios passed\n- [ ] Training complete\n- [ ] Cutover plan signed off" },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id,    name: "TMS Requirements Specification",   documentType: "rich_text", spaceType: "shared",  createdByUserId: u("Sophie Laurent").id, content: "# TMS Requirements\n\n## Freight Management\n## Carrier Integration" },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id,    name: "Risk Register",                    documentType: "rich_text", spaceType: "shared",  createdByUserId: u("Marcus Webb").id, content: "# Risk Register\n\n| Risk | Likelihood | Impact | Mitigation |\n|---|---|---|---|\n| Client data delay | High | High | Weekly governance meetings |" },
    { projectId: proj("Oracle WMS Cloud Migration").id,           name: "Data Migration Plan",              documentType: "rich_text", spaceType: "shared",  createdByUserId: u("Raj Krishnamurthy").id, content: "# Data Migration Plan\n\n## Source Systems\nOracle WMS 9.3 on-premise\n\n## Migration Approach\nETL via Oracle Data Integrator." },
    { projectId: proj("Route Optimisation Engine Deployment").id, name: "System Architecture Document",     documentType: "rich_text", spaceType: "shared",  createdByUserId: u("Daniel Osei").id, content: "# Route Optimisation System Architecture\n\n## Components\n1. Routing Engine (Python/OR-Tools)\n2. Courier API Gateway\n3. Driver Mobile API\n\n## Deployment: AWS ECS Fargate" },
    { projectId: proj("HarbourLink EDI Integration").id,          name: "Trading Partner Directory",        documentType: "rich_text", spaceType: "shared",  createdByUserId: u("Daniel Osei").id, content: "# Trading Partner Directory\n\n## Active Partners\n1. Maersk Line – EDI 315/322\n2. MSC – EDI 315\n3. DP World – EDI 322" },
  ]);

  // ─── Project Templates (OTM & Logistics Industry) ────────────────────────
  const templates = await db.insert(schema.projectTemplatesTable).values([
    { name: "WMS Implementation – Full Scope",         description: "End-to-end Warehouse Management System implementation for a single distribution centre. Covers discovery, system configuration, integration, user training and go-live support.", billingType: "Fixed Fee",        totalDurationDays: 180, autoAllocate: false, createdByUserId: u("Marcus Webb").id },
    { name: "TMS Rollout – Enterprise",                description: "Transportation Management System rollout for a multi-region enterprise. Covers requirements, carrier onboarding, TMS configuration, EDI integration, UAT and training.",          billingType: "Time & Materials", totalDurationDays: 270, autoAllocate: false, createdByUserId: u("Marcus Webb").id },
    { name: "EDI Integration – Carrier Onboarding",     description: "ANSI X12 EDI integration project for onboarding multiple carrier and trading partners. Includes VAN setup, map development, testing and production cutover.",                    billingType: "Fixed Fee",        totalDurationDays: 120, autoAllocate: false, createdByUserId: u("Daniel Osei").id },
    { name: "Oracle OTM Implementation",                description: "Oracle Transportation Management (OTM) full implementation including carrier contract management, rate engine setup, shipment planning and carrier portal configuration.",       billingType: "Fixed Fee",        totalDurationDays: 240, autoAllocate: false, createdByUserId: u("Priya Nair").id },
    { name: "Cold Chain IoT Deployment",                description: "IoT sensor network deployment for temperature-controlled logistics environments. Covers hardware installation, data pipeline setup, monitoring dashboards and alerting.",          billingType: "Fixed Fee",        totalDurationDays: 90,  autoAllocate: false, createdByUserId: u("Raj Krishnamurthy").id },
    { name: "Fleet Telemetry & Analytics MVP",          description: "OBD-II telemetry ingestion, driver scorecard dashboard and predictive maintenance alert engine. Fast-track 6-month MVP timeline.",                                                billingType: "Fixed Fee",        totalDurationDays: 180, autoAllocate: false, createdByUserId: u("Tom Bridges").id },
    { name: "WMS Quick-Start (Mid-Market)",             description: "Streamlined WMS implementation for mid-market warehouses with standard configurations. 90-day delivery, minimal customisation, rapid time-to-value.",                              billingType: "Fixed Fee",        totalDurationDays: 90,  autoAllocate: false, createdByUserId: u("Priya Nair").id },
    { name: "Customs & Compliance Automation",          description: "End-to-end customs declaration automation, trade lane compliance and regulatory reporting. Covers AES, C-TPAT and trade agreement optimisation.",                                  billingType: "Time & Materials", totalDurationDays: 150, autoAllocate: false, createdByUserId: u("Leila Hassan").id },
    { name: "Last-Mile Delivery Platform",              description: "Design and deployment of a last-mile delivery routing platform with dynamic route optimisation, proof-of-delivery capture and courier API integrations.",                            billingType: "Fixed Fee",        totalDurationDays: 150, autoAllocate: false, createdByUserId: u("Sophie Laurent").id },
    { name: "Freight Audit & Payment Automation",      description: "Automated freight invoice audit, dispute management workflow and payment processing integration with carrier billing systems and ERP.",                                              billingType: "Fixed Fee",        totalDurationDays: 100, autoAllocate: false, createdByUserId: u("Sophie Laurent").id },
  ]).returning();

  const tmpl = (name: string) => templates.find(t => t.name === name)!;

  // ─── Template Phases ──────────────────────────────────────────────────────
  const tPhases = await db.insert(schema.templatePhasesTable).values([
    { templateId: tmpl("WMS Implementation – Full Scope").id, name: "Discovery & Blueprint",      relativeStartOffset: 0,   relativeEndOffset: 30,  order: 1 },
    { templateId: tmpl("WMS Implementation – Full Scope").id, name: "System Configuration",       relativeStartOffset: 31,  relativeEndOffset: 100, order: 2 },
    { templateId: tmpl("WMS Implementation – Full Scope").id, name: "Integration & Testing",      relativeStartOffset: 101, relativeEndOffset: 150, order: 3 },
    { templateId: tmpl("WMS Implementation – Full Scope").id, name: "Go-Live & Hypercare",        relativeStartOffset: 151, relativeEndOffset: 180, order: 4 },
    { templateId: tmpl("TMS Rollout – Enterprise").id, name: "Requirements & Gap Analysis",       relativeStartOffset: 0,   relativeEndOffset: 45,  order: 1 },
    { templateId: tmpl("TMS Rollout – Enterprise").id, name: "TMS Configuration",                  relativeStartOffset: 46,  relativeEndOffset: 150, order: 2 },
    { templateId: tmpl("TMS Rollout – Enterprise").id, name: "Carrier & EDI Integration",          relativeStartOffset: 151, relativeEndOffset: 225, order: 3 },
    { templateId: tmpl("TMS Rollout – Enterprise").id, name: "UAT & Training",                     relativeStartOffset: 226, relativeEndOffset: 270, order: 4 },
    { templateId: tmpl("EDI Integration – Carrier Onboarding").id, name: "Trading Partner Onboarding", relativeStartOffset: 0,  relativeEndOffset: 30,  order: 1 },
    { templateId: tmpl("EDI Integration – Carrier Onboarding").id, name: "Map Development & Testing",  relativeStartOffset: 31, relativeEndOffset: 90,  order: 2 },
    { templateId: tmpl("EDI Integration – Carrier Onboarding").id, name: "Production Cutover",         relativeStartOffset: 91, relativeEndOffset: 120, order: 3 },
    { templateId: tmpl("Oracle OTM Implementation").id, name: "Discovery & Design",               relativeStartOffset: 0,   relativeEndOffset: 45,  order: 1 },
    { templateId: tmpl("Oracle OTM Implementation").id, name: "OTM Configuration",                 relativeStartOffset: 46,  relativeEndOffset: 150, order: 2 },
    { templateId: tmpl("Oracle OTM Implementation").id, name: "Carrier Portal & Integrations",     relativeStartOffset: 151, relativeEndOffset: 210, order: 3 },
    { templateId: tmpl("Oracle OTM Implementation").id, name: "UAT & Go-Live",                     relativeStartOffset: 211, relativeEndOffset: 240, order: 4 },
    { templateId: tmpl("Cold Chain IoT Deployment").id, name: "Sensor Network Design",            relativeStartOffset: 0,  relativeEndOffset: 20, order: 1 },
    { templateId: tmpl("Cold Chain IoT Deployment").id, name: "Hardware Install & Commissioning", relativeStartOffset: 21, relativeEndOffset: 55, order: 2 },
    { templateId: tmpl("Cold Chain IoT Deployment").id, name: "Data Pipeline & Dashboards",       relativeStartOffset: 56, relativeEndOffset: 90, order: 3 },
    { templateId: tmpl("Fleet Telemetry & Analytics MVP").id, name: "Telemetry Architecture",     relativeStartOffset: 0,   relativeEndOffset: 30,  order: 1 },
    { templateId: tmpl("Fleet Telemetry & Analytics MVP").id, name: "OBD Integration & Pipeline", relativeStartOffset: 31,  relativeEndOffset: 100, order: 2 },
    { templateId: tmpl("Fleet Telemetry & Analytics MVP").id, name: "Scorecard & Alerts Build",   relativeStartOffset: 101, relativeEndOffset: 150, order: 3 },
    { templateId: tmpl("Fleet Telemetry & Analytics MVP").id, name: "UAT & Launch",               relativeStartOffset: 151, relativeEndOffset: 180, order: 4 },
    { templateId: tmpl("WMS Quick-Start (Mid-Market)").id, name: "Rapid Assessment",              relativeStartOffset: 0,  relativeEndOffset: 14, order: 1 },
    { templateId: tmpl("WMS Quick-Start (Mid-Market)").id, name: "Standard Configuration",        relativeStartOffset: 15, relativeEndOffset: 60, order: 2 },
    { templateId: tmpl("WMS Quick-Start (Mid-Market)").id, name: "Testing & Go-Live",             relativeStartOffset: 61, relativeEndOffset: 90, order: 3 },
    { templateId: tmpl("Customs & Compliance Automation").id, name: "Regulatory Analysis",        relativeStartOffset: 0,   relativeEndOffset: 30,  order: 1 },
    { templateId: tmpl("Customs & Compliance Automation").id, name: "Automation Build",           relativeStartOffset: 31,  relativeEndOffset: 100, order: 2 },
    { templateId: tmpl("Customs & Compliance Automation").id, name: "Testing & Certification",    relativeStartOffset: 101, relativeEndOffset: 150, order: 3 },
    { templateId: tmpl("Last-Mile Delivery Platform").id, name: "Platform Design",                relativeStartOffset: 0,   relativeEndOffset: 30,  order: 1 },
    { templateId: tmpl("Last-Mile Delivery Platform").id, name: "Routing Engine Build",           relativeStartOffset: 31,  relativeEndOffset: 100, order: 2 },
    { templateId: tmpl("Last-Mile Delivery Platform").id, name: "Courier API Integration",         relativeStartOffset: 101, relativeEndOffset: 130, order: 3 },
    { templateId: tmpl("Last-Mile Delivery Platform").id, name: "UAT & Production Deploy",        relativeStartOffset: 131, relativeEndOffset: 150, order: 4 },
    { templateId: tmpl("Freight Audit & Payment Automation").id, name: "Audit Rule Design",       relativeStartOffset: 0,  relativeEndOffset: 25,  order: 1 },
    { templateId: tmpl("Freight Audit & Payment Automation").id, name: "Automation Development",  relativeStartOffset: 26, relativeEndOffset: 75,  order: 2 },
    { templateId: tmpl("Freight Audit & Payment Automation").id, name: "Integration & Testing",   relativeStartOffset: 76, relativeEndOffset: 100, order: 3 },
  ]).returning();

  const tph = (templateName: string, phaseName: string) =>
    tPhases.find(p => p.templateId === tmpl(templateName).id && p.name === phaseName)!;

  // ─── Template Tasks ───────────────────────────────────────────────────────
  await db.insert(schema.templateTasksTable).values([
    // WMS Full Scope
    { templateId: tmpl("WMS Implementation – Full Scope").id, templatePhaseId: tph("WMS Implementation – Full Scope","Discovery & Blueprint").id, name: "Kick-off Workshop",                   relativeDueDateOffset: 5,   effort: "16", priority: "High",     assigneeRolePlaceholder: "Project Manager",       order: 1 },
    { templateId: tmpl("WMS Implementation – Full Scope").id, templatePhaseId: tph("WMS Implementation – Full Scope","Discovery & Blueprint").id, name: "Current State Process Documentation",  relativeDueDateOffset: 20,  effort: "40", priority: "High",     assigneeRolePlaceholder: "Business Analyst",      order: 2 },
    { templateId: tmpl("WMS Implementation – Full Scope").id, templatePhaseId: tph("WMS Implementation – Full Scope","Discovery & Blueprint").id, name: "WMS Blueprint & Fit-Gap Report",       relativeDueDateOffset: 30,  effort: "60", priority: "High",     assigneeRolePlaceholder: "Solutions Architect",   order: 3 },
    { templateId: tmpl("WMS Implementation – Full Scope").id, templatePhaseId: tph("WMS Implementation – Full Scope","System Configuration").id, name: "Storage & Location Configuration",     relativeDueDateOffset: 60,  effort: "80", priority: "High",     assigneeRolePlaceholder: "Solutions Architect",   order: 1 },
    { templateId: tmpl("WMS Implementation – Full Scope").id, templatePhaseId: tph("WMS Implementation – Full Scope","System Configuration").id, name: "Receiving & Putaway Rule Setup",       relativeDueDateOffset: 70,  effort: "40", priority: "Medium",   assigneeRolePlaceholder: "Solutions Architect",   order: 2 },
    { templateId: tmpl("WMS Implementation – Full Scope").id, templatePhaseId: tph("WMS Implementation – Full Scope","System Configuration").id, name: "Pick / Pack / Ship Configuration",     relativeDueDateOffset: 85,  effort: "50", priority: "Medium",   assigneeRolePlaceholder: "Solutions Architect",   order: 3 },
    { templateId: tmpl("WMS Implementation – Full Scope").id, templatePhaseId: tph("WMS Implementation – Full Scope","System Configuration").id, name: "Change Management & Training Plan",    relativeDueDateOffset: 100, effort: "30", priority: "Medium",   assigneeRolePlaceholder: "Change Manager",        order: 4 },
    { templateId: tmpl("WMS Implementation – Full Scope").id, templatePhaseId: tph("WMS Implementation – Full Scope","Integration & Testing").id, name: "ERP Interface Build & Unit Test",      relativeDueDateOffset: 130, effort: "80", priority: "High",     assigneeRolePlaceholder: "Integration Engineer",  order: 1 },
    { templateId: tmpl("WMS Implementation – Full Scope").id, templatePhaseId: tph("WMS Implementation – Full Scope","Integration & Testing").id, name: "System Integration Testing (SIT)",     relativeDueDateOffset: 145, effort: "60", priority: "High",     assigneeRolePlaceholder: "QA / Test Engineer",    order: 2 },
    { templateId: tmpl("WMS Implementation – Full Scope").id, templatePhaseId: tph("WMS Implementation – Full Scope","Integration & Testing").id, name: "User Acceptance Testing (UAT)",        relativeDueDateOffset: 150, effort: "40", priority: "High",     assigneeRolePlaceholder: "Business Analyst",      order: 3 },
    { templateId: tmpl("WMS Implementation – Full Scope").id, templatePhaseId: tph("WMS Implementation – Full Scope","Go-Live & Hypercare").id, name: "Cutover Planning & Dry Run",           relativeDueDateOffset: 162, effort: "24", priority: "High",     assigneeRolePlaceholder: "Project Manager",       order: 1 },
    { templateId: tmpl("WMS Implementation – Full Scope").id, templatePhaseId: tph("WMS Implementation – Full Scope","Go-Live & Hypercare").id, name: "Go-Live Execution",                    relativeDueDateOffset: 167, effort: "40", priority: "Critical", assigneeRolePlaceholder: "Project Manager",       order: 2 },
    { templateId: tmpl("WMS Implementation – Full Scope").id, templatePhaseId: tph("WMS Implementation – Full Scope","Go-Live & Hypercare").id, name: "Hypercare & Stabilisation Support",    relativeDueDateOffset: 180, effort: "30", priority: "High",     assigneeRolePlaceholder: "Solutions Architect",   order: 3 },
    // TMS Enterprise
    { templateId: tmpl("TMS Rollout – Enterprise").id, templatePhaseId: tph("TMS Rollout – Enterprise","Requirements & Gap Analysis").id, name: "Freight Lane & Carrier Master Data Audit",    relativeDueDateOffset: 20, effort: "40", priority: "High",   assigneeRolePlaceholder: "Business Analyst",     order: 1 },
    { templateId: tmpl("TMS Rollout – Enterprise").id, templatePhaseId: tph("TMS Rollout – Enterprise","Requirements & Gap Analysis").id, name: "TMS Gap Analysis vs Out-of-Box Features",     relativeDueDateOffset: 35, effort: "32", priority: "High",   assigneeRolePlaceholder: "Solutions Architect",  order: 2 },
    { templateId: tmpl("TMS Rollout – Enterprise").id, templatePhaseId: tph("TMS Rollout – Enterprise","Requirements & Gap Analysis").id, name: "Business Requirements Document (BRD)",        relativeDueDateOffset: 45, effort: "24", priority: "High",   assigneeRolePlaceholder: "Business Analyst",     order: 3 },
    { templateId: tmpl("TMS Rollout – Enterprise").id, templatePhaseId: tph("TMS Rollout – Enterprise","TMS Configuration").id, name: "Carrier Rating Engine Setup",                          relativeDueDateOffset: 80,  effort: "80", priority: "High",   assigneeRolePlaceholder: "Solutions Architect", order: 1 },
    { templateId: tmpl("TMS Rollout – Enterprise").id, templatePhaseId: tph("TMS Rollout – Enterprise","TMS Configuration").id, name: "Shipment Planning Rules Configuration",                relativeDueDateOffset: 100, effort: "60", priority: "High",   assigneeRolePlaceholder: "Solutions Architect", order: 2 },
    { templateId: tmpl("TMS Rollout – Enterprise").id, templatePhaseId: tph("TMS Rollout – Enterprise","TMS Configuration").id, name: "Freight Audit & Payment Rules",                       relativeDueDateOffset: 120, effort: "50", priority: "Medium", assigneeRolePlaceholder: "Business Analyst",    order: 3 },
    { templateId: tmpl("TMS Rollout – Enterprise").id, templatePhaseId: tph("TMS Rollout – Enterprise","TMS Configuration").id, name: "Customs Document Generation Setup",                   relativeDueDateOffset: 135, effort: "40", priority: "Medium", assigneeRolePlaceholder: "Solutions Architect", order: 4 },
    { templateId: tmpl("TMS Rollout – Enterprise").id, templatePhaseId: tph("TMS Rollout – Enterprise","Carrier & EDI Integration").id, name: "EDI 204/210/214 Carrier Message Maps",        relativeDueDateOffset: 185, effort: "80", priority: "High",   assigneeRolePlaceholder: "Integration Engineer",order: 1 },
    { templateId: tmpl("TMS Rollout – Enterprise").id, templatePhaseId: tph("TMS Rollout – Enterprise","Carrier & EDI Integration").id, name: "Carrier Portal Configuration",               relativeDueDateOffset: 210, effort: "40", priority: "Medium", assigneeRolePlaceholder: "Solutions Architect", order: 2 },
    { templateId: tmpl("TMS Rollout – Enterprise").id, templatePhaseId: tph("TMS Rollout – Enterprise","UAT & Training").id, name: "End-to-End UAT Execution",                               relativeDueDateOffset: 250, effort: "60", priority: "High",   assigneeRolePlaceholder: "QA / Test Engineer",  order: 1 },
    { templateId: tmpl("TMS Rollout – Enterprise").id, templatePhaseId: tph("TMS Rollout – Enterprise","UAT & Training").id, name: "User Training (Train the Trainer)",                     relativeDueDateOffset: 265, effort: "32", priority: "Medium", assigneeRolePlaceholder: "Change Manager",      order: 2 },
    // EDI Integration
    { templateId: tmpl("EDI Integration – Carrier Onboarding").id, templatePhaseId: tph("EDI Integration – Carrier Onboarding","Trading Partner Onboarding").id, name: "Trading Partner Profile Documentation", relativeDueDateOffset: 15, effort: "24", priority: "High",     assigneeRolePlaceholder: "Integration Engineer", order: 1 },
    { templateId: tmpl("EDI Integration – Carrier Onboarding").id, templatePhaseId: tph("EDI Integration – Carrier Onboarding","Trading Partner Onboarding").id, name: "VAN / AS2 / SFTP Connectivity Setup",  relativeDueDateOffset: 30, effort: "20", priority: "High",     assigneeRolePlaceholder: "Integration Engineer", order: 2 },
    { templateId: tmpl("EDI Integration – Carrier Onboarding").id, templatePhaseId: tph("EDI Integration – Carrier Onboarding","Map Development & Testing").id, name: "Inbound EDI Map Development",            relativeDueDateOffset: 55, effort: "40", priority: "High",     assigneeRolePlaceholder: "Integration Engineer", order: 1 },
    { templateId: tmpl("EDI Integration – Carrier Onboarding").id, templatePhaseId: tph("EDI Integration – Carrier Onboarding","Map Development & Testing").id, name: "Outbound EDI Map Development",           relativeDueDateOffset: 70, effort: "40", priority: "High",     assigneeRolePlaceholder: "Integration Engineer", order: 2 },
    { templateId: tmpl("EDI Integration – Carrier Onboarding").id, templatePhaseId: tph("EDI Integration – Carrier Onboarding","Map Development & Testing").id, name: "End-to-End Integration Testing",          relativeDueDateOffset: 90, effort: "24", priority: "High",     assigneeRolePlaceholder: "QA / Test Engineer",   order: 3 },
    { templateId: tmpl("EDI Integration – Carrier Onboarding").id, templatePhaseId: tph("EDI Integration – Carrier Onboarding","Production Cutover").id, name: "Production Cutover & Monitoring",              relativeDueDateOffset: 120, effort: "16", priority: "Critical", assigneeRolePlaceholder: "Integration Engineer", order: 1 },
    // Oracle OTM
    { templateId: tmpl("Oracle OTM Implementation").id, templatePhaseId: tph("Oracle OTM Implementation","Discovery & Design").id, name: "OTM Functional Requirements Workshop",    relativeDueDateOffset: 20, effort: "40", priority: "High",     assigneeRolePlaceholder: "Business Analyst",     order: 1 },
    { templateId: tmpl("Oracle OTM Implementation").id, templatePhaseId: tph("Oracle OTM Implementation","Discovery & Design").id, name: "OTM Solution Design Document",            relativeDueDateOffset: 40, effort: "48", priority: "High",     assigneeRolePlaceholder: "Solutions Architect",  order: 2 },
    { templateId: tmpl("Oracle OTM Implementation").id, templatePhaseId: tph("Oracle OTM Implementation","Discovery & Design").id, name: "Data Migration & Integration Design",     relativeDueDateOffset: 45, effort: "24", priority: "Medium",   assigneeRolePlaceholder: "Integration Engineer", order: 3 },
    { templateId: tmpl("Oracle OTM Implementation").id, templatePhaseId: tph("Oracle OTM Implementation","OTM Configuration").id, name: "Rate & Charge Management Setup",          relativeDueDateOffset: 80,  effort: "80", priority: "High",     assigneeRolePlaceholder: "Solutions Architect",  order: 1 },
    { templateId: tmpl("Oracle OTM Implementation").id, templatePhaseId: tph("Oracle OTM Implementation","OTM Configuration").id, name: "Shipment Management & Tendering Rules",   relativeDueDateOffset: 110, effort: "60", priority: "High",     assigneeRolePlaceholder: "Solutions Architect",  order: 2 },
    { templateId: tmpl("Oracle OTM Implementation").id, templatePhaseId: tph("Oracle OTM Implementation","OTM Configuration").id, name: "Freight Order & Bulk Planning Config",     relativeDueDateOffset: 130, effort: "50", priority: "Medium",   assigneeRolePlaceholder: "Solutions Architect",  order: 3 },
    { templateId: tmpl("Oracle OTM Implementation").id, templatePhaseId: tph("Oracle OTM Implementation","OTM Configuration").id, name: "OTM–ERP Integration (Financials & PO)",  relativeDueDateOffset: 150, effort: "60", priority: "High",     assigneeRolePlaceholder: "Integration Engineer", order: 4 },
    { templateId: tmpl("Oracle OTM Implementation").id, templatePhaseId: tph("Oracle OTM Implementation","Carrier Portal & Integrations").id, name: "Carrier Portal Setup & Branding",  relativeDueDateOffset: 175, effort: "32", priority: "Medium",   assigneeRolePlaceholder: "Solutions Architect",  order: 1 },
    { templateId: tmpl("Oracle OTM Implementation").id, templatePhaseId: tph("Oracle OTM Implementation","Carrier Portal & Integrations").id, name: "Carrier Onboarding & EDI Mapping", relativeDueDateOffset: 200, effort: "60", priority: "High",     assigneeRolePlaceholder: "Integration Engineer", order: 2 },
    { templateId: tmpl("Oracle OTM Implementation").id, templatePhaseId: tph("Oracle OTM Implementation","UAT & Go-Live").id, name: "End-to-End UAT – Scenario Execution",            relativeDueDateOffset: 225, effort: "60", priority: "High",     assigneeRolePlaceholder: "QA / Test Engineer",   order: 1 },
    { templateId: tmpl("Oracle OTM Implementation").id, templatePhaseId: tph("Oracle OTM Implementation","UAT & Go-Live").id, name: "User Training & Knowledge Transfer",             relativeDueDateOffset: 235, effort: "40", priority: "High",     assigneeRolePlaceholder: "Change Manager",       order: 2 },
    { templateId: tmpl("Oracle OTM Implementation").id, templatePhaseId: tph("Oracle OTM Implementation","UAT & Go-Live").id, name: "Go-Live Cutover & Hypercare",                    relativeDueDateOffset: 240, effort: "32", priority: "Critical", assigneeRolePlaceholder: "Project Manager",      order: 3 },
    // Cold Chain IoT
    { templateId: tmpl("Cold Chain IoT Deployment").id, templatePhaseId: tph("Cold Chain IoT Deployment","Sensor Network Design").id, name: "Site Survey & Sensor Placement Plan",   relativeDueDateOffset: 10, effort: "24", priority: "High",   assigneeRolePlaceholder: "Solution Architect", order: 1 },
    { templateId: tmpl("Cold Chain IoT Deployment").id, templatePhaseId: tph("Cold Chain IoT Deployment","Sensor Network Design").id, name: "IoT Platform Architecture Design",       relativeDueDateOffset: 20, effort: "32", priority: "High",   assigneeRolePlaceholder: "Solution Architect", order: 2 },
    { templateId: tmpl("Cold Chain IoT Deployment").id, templatePhaseId: tph("Cold Chain IoT Deployment","Hardware Install & Commissioning").id, name: "Sensor Hardware Installation",   relativeDueDateOffset: 40, effort: "40", priority: "High",   assigneeRolePlaceholder: "Developer",          order: 1 },
    { templateId: tmpl("Cold Chain IoT Deployment").id, templatePhaseId: tph("Cold Chain IoT Deployment","Hardware Install & Commissioning").id, name: "Gateway & Network Commissioning",relativeDueDateOffset: 55, effort: "24", priority: "High",   assigneeRolePlaceholder: "Developer",          order: 2 },
    { templateId: tmpl("Cold Chain IoT Deployment").id, templatePhaseId: tph("Cold Chain IoT Deployment","Data Pipeline & Dashboards").id, name: "Real-Time Data Pipeline Build",      relativeDueDateOffset: 70, effort: "40", priority: "High",   assigneeRolePlaceholder: "Developer",          order: 1 },
    { templateId: tmpl("Cold Chain IoT Deployment").id, templatePhaseId: tph("Cold Chain IoT Deployment","Data Pipeline & Dashboards").id, name: "Temperature Monitoring Dashboard",   relativeDueDateOffset: 80, effort: "32", priority: "Medium", assigneeRolePlaceholder: "Developer",          order: 2 },
    { templateId: tmpl("Cold Chain IoT Deployment").id, templatePhaseId: tph("Cold Chain IoT Deployment","Data Pipeline & Dashboards").id, name: "Alert & Escalation Configuration",   relativeDueDateOffset: 90, effort: "16", priority: "High",   assigneeRolePlaceholder: "Solution Architect", order: 3 },
    // WMS Quick-Start
    { templateId: tmpl("WMS Quick-Start (Mid-Market)").id, templatePhaseId: tph("WMS Quick-Start (Mid-Market)","Rapid Assessment").id, name: "Current State Walk-Through",              relativeDueDateOffset: 7,  effort: "16", priority: "High",     assigneeRolePlaceholder: "Business Analyst",     order: 1 },
    { templateId: tmpl("WMS Quick-Start (Mid-Market)").id, templatePhaseId: tph("WMS Quick-Start (Mid-Market)","Rapid Assessment").id, name: "Quick-Start Configuration Checklist",    relativeDueDateOffset: 14, effort: "8",  priority: "High",     assigneeRolePlaceholder: "Solutions Architect",  order: 2 },
    { templateId: tmpl("WMS Quick-Start (Mid-Market)").id, templatePhaseId: tph("WMS Quick-Start (Mid-Market)","Standard Configuration").id, name: "Standard Warehouse Configuration",   relativeDueDateOffset: 35, effort: "60", priority: "High",     assigneeRolePlaceholder: "Solutions Architect",  order: 1 },
    { templateId: tmpl("WMS Quick-Start (Mid-Market)").id, templatePhaseId: tph("WMS Quick-Start (Mid-Market)","Standard Configuration").id, name: "ERP Interface (Standard Connector)", relativeDueDateOffset: 55, effort: "32", priority: "High",     assigneeRolePlaceholder: "Integration Engineer", order: 2 },
    { templateId: tmpl("WMS Quick-Start (Mid-Market)").id, templatePhaseId: tph("WMS Quick-Start (Mid-Market)","Testing & Go-Live").id, name: "Functional Testing & Bug Fix",          relativeDueDateOffset: 75, effort: "32", priority: "High",     assigneeRolePlaceholder: "QA / Test Engineer",   order: 1 },
    { templateId: tmpl("WMS Quick-Start (Mid-Market)").id, templatePhaseId: tph("WMS Quick-Start (Mid-Market)","Testing & Go-Live").id, name: "Go-Live & 2-Week Support Window",       relativeDueDateOffset: 90, effort: "24", priority: "Critical", assigneeRolePlaceholder: "Project Manager",      order: 2 },
  ]);

  // ─── Document Templates (OTM & Logistics Industry) ───────────────────────
  await db.insert(schema.documentTemplatesTable).values([
    {
      name: "Project Charter – Logistics Implementation",
      description: "Standard project charter template for logistics system implementation projects. Covers objectives, scope, stakeholders, budget and success criteria.",
      documentType: "rich_text",
      createdByUserId: u("Marcus Webb").id,
      content: `# Project Charter

## Project Overview
**Project Name:** [Project Name]
**Client:** [Client Name]
**Project Manager:** [PM Name]
**Start Date:** [Date] | **Target Go-Live:** [Date]
**Budget:** $[Amount] | **Billing Type:** [Fixed Fee / T&M]

## Objectives
1. [Primary objective]
2. [Secondary objective]
3. [Tertiary objective]

## Scope
### In Scope
- [Item 1]
### Out of Scope
- [Item 1]

## Key Stakeholders
| Name | Role | Organisation | Responsibility |
|------|------|--------------|----------------|
| | Executive Sponsor | Client | Budget authority |
| | Project Champion | Client | Day-to-day coordination |

## Success Criteria
- All scope delivered within budget and timeline
- UAT sign-off achieved
- Go-live with zero severity-1 issues
- User adoption > 90% within 30 days

## Assumptions & Constraints
- Client provides SMEs for workshops
- Environments provisioned by [date]
- Scope changes via formal change control only

*Approved:* _________________________ Date: _________`,
    },
    {
      name: "Statement of Work (SOW) – Logistics",
      description: "Professional services SOW template for logistics and supply chain engagements. Includes deliverables, milestones, acceptance criteria and commercials.",
      documentType: "rich_text",
      createdByUserId: u("Marcus Webb").id,
      content: `# Statement of Work

**Client:** [Client Name]
**Engagement:** [Engagement Name]
**SOW Reference:** SOW-[YYYY]-[NNN]
**Effective Date:** [Date]

## 1. Background
[Brief description of business context.]

## 2. Scope of Services
### 2.1 In-Scope Deliverables
| # | Deliverable | Description | Acceptance Criteria |
|---|------------|-------------|---------------------|
| 1 | | | |

### 2.2 Out of Scope
- [Item]

## 3. Project Milestones
| Milestone | Description | Target Date | Payment % |
|-----------|-------------|-------------|-----------|
| M1 | Kick-off & Blueprint | | 25% |
| M2 | Configuration Complete | | 25% |
| M3 | UAT Sign-off | | 25% |
| M4 | Go-Live | | 25% |

## 4. Commercial Terms
- Total Fee: $[Amount]
- Billing Frequency: [Monthly / Milestone]
- Payment Terms: Net [30/45/60] days
- Expenses: [Capped / Pass-through]

## 5. Client Responsibilities
- Provide SMEs (min [X] hours/week)
- Provision test environments
- Timely deliverable sign-off (SLA: [X] business days)

## 6. KSAP Team
| Name | Role | Allocation |
|------|------|-----------|
| | Project Manager | [X]% |

*KSAP Authorised Signatory:* _________________ Date: _________
*Client Authorised Signatory:* ________________ Date: _________`,
    },
    {
      name: "Business Requirements Document – WMS/TMS",
      description: "BRD template for WMS and TMS implementation projects. Captures functional requirements, process flows, integration points and reporting needs.",
      documentType: "rich_text",
      createdByUserId: u("Sophie Laurent").id,
      content: `# Business Requirements Document

**Project:** [Project Name]
**Version:** 1.0
**Author:** [BA Name]
**Date:** [Date]

## 1. Executive Summary
[Business need overview.]

## 2. Business Context
### 2.1 Current State Pain Points
- [Pain point]

### 2.2 Future State Vision
[Description.]

## 3. Functional Requirements
### 3.1 Inbound / Receiving
| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| RCV-001 | ASN (EDI 856) processing | Must Have | |
| RCV-002 | Cross-docking | Should Have | |

### 3.2 Storage & Putaway
| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| STO-001 | Directed putaway | Must Have | |
| STO-002 | Multi-temperature zones | Must Have | Cold chain |

### 3.3 Picking & Fulfilment
| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| PCK-001 | Wave-based pick planning | Must Have | |
| PCK-002 | RF-directed pick with scan validation | Must Have | |

### 3.4 Shipping & Despatch
| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| SHP-001 | Carrier manifesting and label printing | Must Have | |
| SHP-002 | EDI 856 ASN to customers | Must Have | |

## 4. Integration Requirements
| System | Direction | Method | Frequency |
|--------|-----------|--------|-----------|
| ERP | Bi-directional | API/EDI | Real-time |
| Carrier TMS | Outbound | EDI/API | Per shipment |

## 5. Non-Functional Requirements
- Availability: 99.5% uptime
- Performance: Page load < 2s; RF scan < 500ms
- Security: Role-based access; full audit trail

*Approved:* _________________________ Date: _________`,
    },
    {
      name: "UAT Test Plan – Logistics Systems",
      description: "User Acceptance Testing plan template for logistics system implementations with test scenarios, execution tracking and defect logging.",
      documentType: "rich_text",
      createdByUserId: u("Tom Bridges").id,
      content: `# UAT Test Plan

**Project:** [Project Name]
**System:** [WMS / TMS / EDI / OTM]
**UAT Lead:** [Name]
**Testing Window:** [Start] – [End]

## 1. UAT Objectives
- Validate configured system meets requirements
- Confirm integrations function end-to-end
- Identify and resolve defects before go-live

## 2. Test Scenarios
### 2.1 Inbound Processing
| TC # | Scenario | Steps | Expected Result | Pass/Fail |
|------|----------|-------|-----------------|-----------|
| TC-001 | Standard PO receipt with ASN | 1. Receive ASN EDI 856 2. Confirm receipt 3. Print labels | Receipt created, labels print | |
| TC-002 | Receipt with quantity variance | Receive + enter variance | Discrepancy alert | |
| TC-003 | Cross-dock receipt | Receive + trigger cross-dock | Routes to outbound dock | |

### 2.2 Outbound Fulfilment
| TC # | Scenario | Expected Result | Pass/Fail |
|------|----------|-----------------|-----------|
| TC-010 | Standard pick + ship | Order shipped, ASN sent | |
| TC-011 | Short pick | Back-order created | |

### 2.3 Integration Tests
| TC # | Scenario | Expected Result | Pass/Fail |
|------|----------|-----------------|-----------|
| TC-020 | Inbound EDI 850 from ERP | Order created in WMS | |
| TC-021 | Outbound EDI 856 | ASN transmitted | |
| TC-022 | Inventory sync | Updated within 5 min | |

## 3. Defect Log
| # | Description | Severity | Module | Status |
|---|-------------|----------|--------|--------|
| | | Critical/High/Medium/Low | | Open/Fixed |

## 4. UAT Sign-Off Criteria
- [ ] All Must Have test cases passed
- [ ] Zero open Critical/High defects
- [ ] All integrations tested end-to-end
- [ ] Training completed

*UAT Sign-off:* _________________________ Date: _________`,
    },
    {
      name: "Go-Live Readiness Checklist",
      description: "Pre-go-live readiness checklist for logistics system implementations covering technical, data, training and operational readiness gates.",
      documentType: "rich_text",
      createdByUserId: u("Marcus Webb").id,
      content: `# Go-Live Readiness Checklist

**Project:** [Project Name]
**Go-Live Date:** [Date]

## Technical Readiness
- [ ] Production environment provisioned and stable
- [ ] All integrations tested in prod-equivalent environment
- [ ] DR / rollback plan documented and tested
- [ ] Performance testing completed
- [ ] Security review completed
- [ ] Monitoring and alerting configured
- [ ] Backup / recovery procedures tested

## Data Readiness
- [ ] Data migration scripts validated
- [ ] Data cutover plan approved
- [ ] Legacy system data frozen
- [ ] Master data loaded and verified
- [ ] Opening balances validated
- [ ] Reconciliation report signed off

## Training Readiness
- [ ] Super user training completed
- [ ] End user training completed
- [ ] Quick reference guides distributed
- [ ] Help desk process communicated
- [ ] Knowledge base published

## Process Readiness
- [ ] SOPs updated for new system
- [ ] Cutover comms sent to staff
- [ ] On-call rota agreed
- [ ] Escalation contacts distributed
- [ ] Hypercare schedule confirmed

## Go/No-Go Decision
| Gate | Status | Sign-Off |
|------|--------|----------|
| Technical | ☐ Go ☐ No-Go | |
| Data | ☐ Go ☐ No-Go | |
| Training | ☐ Go ☐ No-Go | |
| Process | ☐ Go ☐ No-Go | |
| **Overall** | **☐ Go ☐ No-Go** | |

*Client Sponsor:* _________________ Date: _________
*KSAP PM:* _________________ Date: _________`,
    },
    {
      name: "Change Request Form",
      description: "Standard change control form for managing scope changes on logistics implementation projects.",
      documentType: "rich_text",
      createdByUserId: u("Marcus Webb").id,
      content: `# Change Request Form

**CR #:** CR-[NNN]
**Project:** [Project Name]
**Requested By:** [Name]
**Date Raised:** [Date]
**Priority:** Low / Medium / High / Critical

## 1. Change Description
[What is being requested and why.]

## 2. Business Justification
[Business reason or value of this change.]

## 3. Impact Assessment
### Schedule Impact
- [ ] No schedule impact
- [ ] [X] days extension required

### Budget Impact
- [ ] No budget impact
- [ ] Additional: $[Amount]
- Effort: [X] hours

### Technical Impact
[Configuration, integration, data migration changes.]

### Risk Impact
[New risks introduced.]

## 4. Options Considered
| Option | Description | Cost | Schedule | Recommendation |
|--------|-------------|------|----------|----------------|
| A | Implement as requested | $ | +X days | |
| B | Simplified alternative | $ | No impact | |
| C | Defer to Phase 2 | $0 | No impact | |

## 5. Approval
| Role | Name | Decision | Date |
|------|------|----------|------|
| Client Sponsor | | ☐ Approve ☐ Reject ☐ Defer | |
| KSAP PM | | ☐ Approve ☐ Reject ☐ Defer | |
| KSAP Director | | ☐ Approve ☐ Reject ☐ Defer | |`,
    },
    {
      name: "Weekly Status Report",
      description: "Weekly project status report template for client-facing updates on logistics implementations.",
      documentType: "rich_text",
      createdByUserId: u("Marcus Webb").id,
      content: `# Weekly Status Report

**Project:** [Project Name]
**Client:** [Client Name]
**Week Ending:** [Date]
**PM:** [Name]
**Overall Status:** 🟢 On Track / 🟡 At Risk / 🔴 Off Track

## Executive Summary
[Week's progress, concerns, path forward.]

## Progress This Week
| Workstream | Completed | In Progress | Comments |
|-----------|-----------|-------------|----------|
| Configuration | | | |
| Integration | | | |
| Testing | | | |
| Training | | | |

## Schedule
| Milestone | Planned | Revised | Status |
|-----------|---------|---------|--------|
| M1 – Blueprint | | | ✅ |
| M2 – Config | | | 🔄 |
| M3 – UAT | | | ⏳ |
| M4 – Go-Live | | | ⏳ |

**Completion:** [X]% | **Budget Used:** [X]%

## Risks & Issues
| # | Description | Type | Impact | Mitigation | Owner | Status |
|---|-------------|------|--------|------------|-------|--------|
| R1 | | Risk | High | | | Open |

## Decisions Required
1. [Decision needed by [date]]

## Next Week Plan
- [ ] [Activity]`,
    },
    {
      name: "Training Delivery Plan",
      description: "Training planning and delivery tracker for logistics system end-user training programmes.",
      documentType: "rich_text",
      createdByUserId: u("Leila Hassan").id,
      content: `# Training Delivery Plan

**Project:** [Project Name]
**System:** [WMS / TMS / OTM]
**Training Lead:** [Name]
**Window:** [Start] – [End]

## 1. Training Approach
[Methodology: classroom, e-learning, train-the-trainer.]

## 2. User Groups & Coverage
| User Group | Count | Format | Duration | Trainer |
|-----------|-------|--------|----------|---------|
| Warehouse Operators | [N] | Classroom | 4 hours | |
| Supervisors | [N] | Classroom + Lab | 8 hours | |
| Finance / Admin | [N] | Online | 2 hours | |
| IT / Sysadmin | [N] | Deep-dive | 16 hours | |
| Super Users | [N] | TTT | 24 hours | |

## 3. Materials Checklist
- [ ] User manuals / QRGs completed
- [ ] E-learning modules built
- [ ] Practice environment data loaded
- [ ] Venue / platform booked
- [ ] Sign-off sheets prepared

## 4. Session Schedule
| Date | Time | Group | Location | Trainer | Attendees | Done |
|------|------|-------|----------|---------|-----------|------|
| | | | | | | ☐ |

## 5. Competency Assessment
| User | Group | Pre-Test | Post-Test | Pass? |
|------|-------|----------|-----------|-------|
| | | /100 | /100 | ☐ |

Pass threshold: 70%

*Training Lead Sign-off:* _________________ Date: _________`,
    },
    {
      name: "EDI Mapping Specification",
      description: "Technical EDI mapping specification template for ANSI X12 transactions documenting field mappings and validation rules.",
      documentType: "rich_text",
      createdByUserId: u("Daniel Osei").id,
      content: `# EDI Mapping Specification

**Transaction Set:** [EDI 204 / 210 / 214 / 856]
**Direction:** Inbound / Outbound
**Trading Partner:** [Partner Name]
**Protocol:** [AS2 / SFTP / VAN]
**Version:** ANSI X12 [4010/5010]

## 1. Overview
| Item | Value |
|------|-------|
| Source System | [ERP / TMS / WMS] |
| Target System | [ERP / TMS / WMS] |
| Trigger | [Order / Shipment / Invoice] |
| Frequency | [Real-time / Batch] |

## 2. Segment Loop Structure
\`\`\`
ST  – Transaction Set Header
  BEG – Beginning Segment
  REF – Reference Numbers
  DTM – Date/Time References
  N1  – Name (Shipper / Consignee)
  N3  – Address
  N4  – Geographic Location
  TD5 – Carrier Details
    HL  – Hierarchical Level
      LIN – Line Item
      QTY – Quantity
SE  – Transaction Set Trailer
\`\`\`

## 3. Field Mapping
| SEG | EL | Source | Transformation | Target | Required |
|-----|----|--------|----------------|--------|----------|
| BEG | 03 | Order.Type | Lookup | PurposeCode | M |
| BEG | 05 | Order.Number | Pad to 22 | PONumber | M |
| N1 | 01 | Ship.Type | Hardcode "ST" | EntityCode | M |
| N1 | 02 | Ship.Name | Direct | Name | M |
| N4 | 01 | Ship.City | Direct | City | M |
| TD5 | 02 | Carrier.SCAC | Direct | SCAC | M |

## 4. Business Rules
1. If quantity > 999, split into multiple HL loops
2. Date format YYYYMMDD
3. SCAC must exist in carrier master

## 5. Error Handling
| Code | Description | Action |
|------|-------------|--------|
| 001 | Missing mandatory segment | Reject + send 997 FA |
| 002 | Invalid SCAC | Queue for manual review |
| 003 | Duplicate transaction | Discard + log |

*Approved:* _________________ Date: _________`,
    },
    {
      name: "Hypercare Support Report",
      description: "Post-go-live hypercare daily support report template tracking incidents and stabilisation status.",
      documentType: "rich_text",
      createdByUserId: u("Marcus Webb").id,
      content: `# Hypercare Support Report

**Project:** [Project Name]
**Go-Live Date:** [Date]
**Report Date:** [Date]
**Hypercare Day:** Day [N] of 30
**Status:** 🟢 Stable / 🟡 Minor Issues / 🔴 Critical

## System Health
| Component | Status | Uptime | Notes |
|-----------|--------|--------|-------|
| Application | 🟢 | 100% | |
| ERP Integration | 🟢 | 99.8% | |
| EDI Transmission | 🟡 | 98% | |
| RF Devices | 🟢 | 100% | |
| Reporting | 🟢 | 100% | |

## Today's Incidents
| # | Time | Description | Severity | Status |
|---|------|-------------|----------|--------|
| | | | P1/P2/P3/P4 | Open/Resolved |

## Cumulative Totals
| Severity | Raised | Resolved | Open |
|----------|--------|---------|------|
| P1 | 0 | 0 | 0 |
| P2 | | | |
| P3 | | | |
| P4 | | | |

## Throughput vs Baseline
| Metric | Baseline | Actual | Variance |
|--------|---------|--------|----------|
| Orders/day | | | |
| Pick accuracy | | | |
| On-time ship | | | |

## Key Activities Today
- [Activity]

## Tomorrow's Plan
- [Plan]

## Escalations
[None / list]`,
    },
    {
      name: "Oracle OTM Configuration Workbook",
      description: "Configuration design workbook for Oracle Transportation Management implementations covering rate management, planning and integration.",
      documentType: "rich_text",
      createdByUserId: u("Priya Nair").id,
      content: `# Oracle OTM Configuration Workbook

**Client:** [Client Name]
**OTM Version:** [6.4 / 23B / 24A]

## 1. Organisational Setup
| Item | Value |
|------|-------|
| Domain | [Name] |
| Base Currency | USD / EUR / SGD |
| Distance UOM | Miles / KM |
| Weight UOM | LBS / KGS |

## 2. Locations & Infrastructure
- [ ] Shipper Locations
- [ ] Consignee Locations
- [ ] Cross-Dock Hubs
- [ ] Port / Terminal Locations
- [ ] Carrier Terminals

## 3. Carrier Management
| Carrier | SCAC | Modes | EDI | Contract |
|---------|------|-------|-----|----------|
| | | TL/LTL/Parcel | AS2 | Rate Sheet |
| | | Ocean | SFTP | BSA |

## 4. Rate Management
### 4.1 Rate Record Types
| Type | Example |
|------|---------|
| Distance-Based | $X per mile |
| Weight-Based | $X per 100 lbs |
| Flat | $X per move |
| Accessorial | Fuel, Liftgate |

## 5. Shipment Planning Rules
| Rule | Type | Criteria | Action |
|------|------|---------|--------|
| Mode Selection | Auto | Weight > 10K lbs → TL | Select TL |
| Consolidation | Auto | Same dest, same day | Consolidate |
| Carrier Selection | Auto | Lowest cost | Tender cheapest |

## 6. Integration Points
| System | Direction | Method | Trigger |
|--------|-----------|--------|---------|
| ERP | Bi-directional | REST API | Order Release |
| WMS | Outbound | API | Shipment Confirm |
| Customs | Outbound | EDI | Shipment Create |
| Carrier | Outbound | EDI/API | Tender |

## 7. Reporting
| Report | Audience | Frequency |
|--------|---------|-----------|
| Freight Spend by Carrier | Finance | Monthly |
| On-Time Delivery | Operations | Weekly |
| Cost per Shipment | Mgmt | Monthly |
| Tender Acceptance Rate | Logistics | Daily |

*Configuration Sign-off:* _________________ Date: _________`,
    },
  ]);

  // ─── Notifications ────────────────────────────────────────────────────────
  await db.insert(schema.notificationsTable).values([
    { type: "invoice_overdue",    message: "Invoice INV-2025-003 for VeloFreight Global is overdue by 30+ days.",                  read: false, userId: u("Marcus Webb").id,    projectId: proj("VeloFreight TMS Rollout – Phase 1").id, projectName: "VeloFreight TMS Rollout – Phase 1", entityType: "invoice",          entityId: "INV-2025-003" },
    { type: "task_blocked",       message: "Task 'Customs Document Generation Module' is blocked – waiting on client data.",      read: false, userId: u("Marcus Webb").id,    projectId: proj("VeloFreight TMS Rollout – Phase 1").id, projectName: "VeloFreight TMS Rollout – Phase 1", entityType: "task" },
    { type: "project_health",     message: "Project 'VeloFreight TMS Rollout – Phase 1' health changed to At Risk.",              read: false, userId: u("Marcus Webb").id,    projectId: proj("VeloFreight TMS Rollout – Phase 1").id, projectName: "VeloFreight TMS Rollout – Phase 1", entityType: "project" },
    { type: "invoice_approved",   message: "Invoice INV-2025-001 for FrostLine Cold Storage approved – $312,500.",                read: true,  userId: u("Marcus Webb").id,    projectId: proj("FrostLine WMS Implementation").id,      projectName: "FrostLine WMS Implementation",      entityType: "invoice",          entityId: "INV-2025-001" },
    { type: "milestone_complete", message: "Milestone 'SAP EWM Blueprint & Fit-Gap Report' marked complete.",                     read: true,  userId: u("Priya Nair").id,     projectId: proj("FrostLine WMS Implementation").id,      projectName: "FrostLine WMS Implementation",      entityType: "task" },
    { type: "project_complete",   message: "Project 'Route Optimisation Engine Deployment' successfully closed.",                 read: true,  userId: u("Sophie Laurent").id, projectId: proj("Route Optimisation Engine Deployment").id, projectName: "Route Optimisation Engine Deployment", entityType: "project" },
    { type: "invoice_draft",      message: "Draft invoice INV-2025-007 created for HarbourLink EDI Integration.",                 read: false, userId: u("Daniel Osei").id,    projectId: proj("HarbourLink EDI Integration").id,       projectName: "HarbourLink EDI Integration",       entityType: "invoice",          entityId: "INV-2025-007" },
    { type: "resource_request",   message: "New resource request: Integration Engineer for FrostLine go-live phase.",             read: false, userId: u("Marcus Webb").id,    projectId: proj("FrostLine WMS Implementation").id,      projectName: "FrostLine WMS Implementation",      entityType: "resource_request" },
    { type: "task_blocked",       message: "EDI 204/210/214 Carrier Integration is blocked pending carrier SCAC confirmation.",   read: false, userId: u("Daniel Osei").id,    projectId: proj("VeloFreight TMS Rollout – Phase 1").id, projectName: "VeloFreight TMS Rollout – Phase 1", entityType: "task" },
    { type: "project_health",     message: "Fleet Telemetry MVP: Kickoff delayed — contract not yet countersigned.",              read: false, userId: u("Tom Bridges").id,    projectId: proj("Fleet Telemetry MVP").id,               projectName: "Fleet Telemetry MVP",               entityType: "project" },
  ]);

  console.log("✅ Seed complete!");
  console.log(`   • ${users.length} users (Admin + 8 team members, RBAC roles)`);
  console.log(`   • ${accounts.length} accounts`);
  console.log(`   • ${opps.length} opportunities`);
  console.log(`   • ${projects.length} projects`);
  console.log(`   • ${timeEntryRows.length} time entries`);
  console.log(`   • ${templates.length} project templates (OTM & Logistics)`);
  console.log("   • 11 document templates seeded");
  console.log("   • Tax codes, contracts, budget, revenue, invoices, notifications seeded");

  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
