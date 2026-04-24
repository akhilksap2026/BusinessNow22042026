import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@workspace/db/schema";
import { eq, inArray, sql } from "drizzle-orm";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
  console.log("🌱 Seeding logistics domain data...");

  // ─── Truncate in safe order ─────────────────────────────────────────────
  await db.execute(sql`
    TRUNCATE csat_responses, csat_surveys, notifications, time_entries, timesheets,
             intervals, key_events,
             allocations, task_dependencies, tasks, phases,
             change_orders, invoices, opportunities, projects,
             resource_requests, prospects, accounts,
             time_off_requests, holiday_dates, holiday_calendars,
             time_categories, activity_defaults,
             user_skills, skills, skill_categories,
             rate_cards, audit_log, users
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
    // US 2025
    { calendarId: usHolCal.id, name: "New Year's Day",  date: "2025-01-01" },
    { calendarId: usHolCal.id, name: "MLK Day",         date: "2025-01-20" },
    { calendarId: usHolCal.id, name: "Presidents' Day", date: "2025-02-17" },
    { calendarId: usHolCal.id, name: "Memorial Day",    date: "2025-05-26" },
    { calendarId: usHolCal.id, name: "Independence Day",date: "2025-07-04" },
    { calendarId: usHolCal.id, name: "Labor Day",       date: "2025-09-01" },
    { calendarId: usHolCal.id, name: "Thanksgiving",    date: "2025-11-27" },
    { calendarId: usHolCal.id, name: "Christmas Day",   date: "2025-12-25" },
    // US 2026 (relevant to current test date Apr 2026)
    { calendarId: usHolCal.id, name: "New Year's Day",   date: "2026-01-01" },
    { calendarId: usHolCal.id, name: "MLK Day",          date: "2026-01-19" },
    { calendarId: usHolCal.id, name: "Presidents' Day",  date: "2026-02-16" },
    { calendarId: usHolCal.id, name: "Good Friday",      date: "2026-04-03" },
    { calendarId: usHolCal.id, name: "Memorial Day",     date: "2026-05-25" },
    { calendarId: usHolCal.id, name: "Independence Day", date: "2026-07-03" },
    // EU 2025–2026
    { calendarId: eurHolCal.id, name: "New Year's Day",  date: "2025-01-01" },
    { calendarId: eurHolCal.id, name: "Good Friday",     date: "2025-04-18" },
    { calendarId: eurHolCal.id, name: "Easter Monday",   date: "2025-04-21" },
    { calendarId: eurHolCal.id, name: "Labour Day",      date: "2025-05-01" },
    { calendarId: eurHolCal.id, name: "Christmas Day",   date: "2025-12-25" },
    { calendarId: eurHolCal.id, name: "Boxing Day",      date: "2025-12-26" },
    { calendarId: eurHolCal.id, name: "Good Friday",     date: "2026-04-03" },
    { calendarId: eurHolCal.id, name: "Easter Monday",   date: "2026-04-06" },
    { calendarId: eurHolCal.id, name: "Labour Day",      date: "2026-05-01" },
    // APAC (Singapore) 2025–2026
    { calendarId: apacHolCal.id, name: "New Year's Day",   date: "2025-01-01" },
    { calendarId: apacHolCal.id, name: "Chinese New Year", date: "2025-01-29" },
    { calendarId: apacHolCal.id, name: "Hari Raya Puasa",  date: "2025-03-31" },
    { calendarId: apacHolCal.id, name: "Labour Day",       date: "2025-05-01" },
    { calendarId: apacHolCal.id, name: "National Day",     date: "2025-08-09" },
    { calendarId: apacHolCal.id, name: "Christmas Day",    date: "2025-12-25" },
    { calendarId: apacHolCal.id, name: "Chinese New Year", date: "2026-02-17" },
    { calendarId: apacHolCal.id, name: "Good Friday",      date: "2026-04-03" },
    { calendarId: apacHolCal.id, name: "Labour Day",       date: "2026-05-01" },
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
          { role: "Project Manager", rate: 175 },
          { role: "Solutions Architect", rate: 200 },
          { role: "Integration Engineer", rate: 165 },
          { role: "Business Analyst", rate: 145 },
          { role: "Data Engineer", rate: 155 },
          { role: "QA Engineer", rate: 130 },
          { role: "Change Management Lead", rate: 160 },
          { role: "Consultant", rate: 140 },
        ],
      },
      {
        name: "Enterprise Premium",
        currency: "USD",
        status: "Active",
        effectiveDate: "2024-01-01",
        defaultRate: "210",
        roles: [
          { role: "Project Manager", rate: 230 },
          { role: "Solutions Architect", rate: 260 },
          { role: "Integration Engineer", rate: 220 },
          { role: "Business Analyst", rate: 195 },
          { role: "Data Engineer", rate: 210 },
          { role: "QA Engineer", rate: 180 },
          { role: "Change Management Lead", rate: 215 },
          { role: "Consultant", rate: 190 },
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

  const skillRows = await db
    .insert(schema.skillsTable)
    .values([
      // Core Consulting
      { categoryId: catCore.id, name: "Project Management" },
      { categoryId: catCore.id, name: "Stakeholder Management" },
      { categoryId: catCore.id, name: "Business Analysis" },
      { categoryId: catCore.id, name: "Change Management" },
      { categoryId: catCore.id, name: "Process Mapping" },
      // Technology
      { categoryId: catTech.id, name: "SAP EWM" },
      { categoryId: catTech.id, name: "Oracle WMS" },
      { categoryId: catTech.id, name: "Manhattan Associates WMS" },
      { categoryId: catTech.id, name: "Blue Yonder TMS" },
      { categoryId: catTech.id, name: "API Integration" },
      { categoryId: catTech.id, name: "EDI / ANSI X12" },
      { categoryId: catTech.id, name: "SQL / Data Analytics" },
      { categoryId: catTech.id, name: "IoT & RFID" },
      // Logistics Domain
      { categoryId: catDomain.id, name: "Warehouse Operations" },
      { categoryId: catDomain.id, name: "Transportation Management" },
      { categoryId: catDomain.id, name: "Cold Chain Logistics" },
      { categoryId: catDomain.id, name: "Last-Mile Delivery" },
      { categoryId: catDomain.id, name: "Freight Forwarding" },
      { categoryId: catDomain.id, name: "Customs & Compliance" },
      { categoryId: catDomain.id, name: "Fleet Management" },
    ])
    .returning();

  const sk = (name: string) => skillRows.find((s) => s.name === name)!;

  // ─── Users ───────────────────────────────────────────────────────────────
  const users = await db
    .insert(schema.usersTable)
    .values([
      {
        name: "Marcus Webb",
        initials: "MW",
        role: "Project Manager",
        email: "marcus.webb@ksap.tech",
        capacity: 40,
        department: "Delivery",
        costRate: "95",
        skills: ["Project Management", "Stakeholder Management", "Change Management"],
      },
      {
        name: "Priya Nair",
        initials: "PN",
        role: "Solutions Architect",
        email: "priya.nair@ksap.tech",
        capacity: 40,
        department: "Architecture",
        costRate: "115",
        skills: ["SAP EWM", "Oracle WMS", "API Integration", "Warehouse Operations"],
      },
      {
        name: "Daniel Osei",
        initials: "DO",
        role: "Integration Engineer",
        email: "daniel.osei@ksap.tech",
        capacity: 40,
        department: "Engineering",
        costRate: "100",
        skills: ["API Integration", "EDI / ANSI X12", "SQL / Data Analytics"],
      },
      {
        name: "Sophie Laurent",
        initials: "SL",
        role: "Business Analyst",
        email: "sophie.laurent@ksap.tech",
        capacity: 40,
        department: "Delivery",
        costRate: "85",
        skills: ["Business Analysis", "Process Mapping", "Transportation Management"],
      },
      {
        name: "Raj Krishnamurthy",
        initials: "RK",
        role: "Data Engineer",
        email: "raj.k@ksap.tech",
        capacity: 40,
        department: "Engineering",
        costRate: "100",
        skills: ["SQL / Data Analytics", "IoT & RFID", "Warehouse Operations"],
      },
      {
        name: "Leila Hassan",
        initials: "LH",
        role: "Change Management Lead",
        email: "leila.hassan@ksap.tech",
        capacity: 40,
        department: "Delivery",
        costRate: "90",
        skills: ["Change Management", "Stakeholder Management", "Customs & Compliance"],
      },
      {
        name: "Tom Bridges",
        initials: "TB",
        role: "QA Engineer",
        email: "tom.bridges@ksap.tech",
        capacity: 40,
        department: "Engineering",
        costRate: "80",
        skills: ["Business Analysis", "Process Mapping", "Fleet Management"],
      },
      {
        name: "Amara Diallo",
        initials: "AD",
        role: "Consultant",
        email: "amara.diallo@ksap.tech",
        capacity: 40,
        department: "Delivery",
        costRate: "80",
        skills: ["Cold Chain Logistics", "Freight Forwarding", "Last-Mile Delivery"],
      },
    ])
    .returning();

  const u = (name: string) => users.find((u) => u.name === name)!;

  // User Skills junction
  await db.insert(schema.userSkillsTable).values([
    { userId: u("Marcus Webb").id, skillId: sk("Project Management").id, proficiencyLevel: "Expert" },
    { userId: u("Marcus Webb").id, skillId: sk("Stakeholder Management").id, proficiencyLevel: "Expert" },
    { userId: u("Marcus Webb").id, skillId: sk("Change Management").id, proficiencyLevel: "Intermediate" },
    { userId: u("Priya Nair").id, skillId: sk("SAP EWM").id, proficiencyLevel: "Expert" },
    { userId: u("Priya Nair").id, skillId: sk("Oracle WMS").id, proficiencyLevel: "Advanced" },
    { userId: u("Priya Nair").id, skillId: sk("API Integration").id, proficiencyLevel: "Advanced" },
    { userId: u("Priya Nair").id, skillId: sk("Warehouse Operations").id, proficiencyLevel: "Expert" },
    { userId: u("Daniel Osei").id, skillId: sk("API Integration").id, proficiencyLevel: "Expert" },
    { userId: u("Daniel Osei").id, skillId: sk("EDI / ANSI X12").id, proficiencyLevel: "Expert" },
    { userId: u("Daniel Osei").id, skillId: sk("SQL / Data Analytics").id, proficiencyLevel: "Advanced" },
    { userId: u("Sophie Laurent").id, skillId: sk("Business Analysis").id, proficiencyLevel: "Expert" },
    { userId: u("Sophie Laurent").id, skillId: sk("Process Mapping").id, proficiencyLevel: "Advanced" },
    { userId: u("Sophie Laurent").id, skillId: sk("Transportation Management").id, proficiencyLevel: "Intermediate" },
    { userId: u("Raj Krishnamurthy").id, skillId: sk("SQL / Data Analytics").id, proficiencyLevel: "Expert" },
    { userId: u("Raj Krishnamurthy").id, skillId: sk("IoT & RFID").id, proficiencyLevel: "Advanced" },
    { userId: u("Raj Krishnamurthy").id, skillId: sk("Warehouse Operations").id, proficiencyLevel: "Intermediate" },
    { userId: u("Leila Hassan").id, skillId: sk("Change Management").id, proficiencyLevel: "Expert" },
    { userId: u("Leila Hassan").id, skillId: sk("Stakeholder Management").id, proficiencyLevel: "Advanced" },
    { userId: u("Leila Hassan").id, skillId: sk("Customs & Compliance").id, proficiencyLevel: "Advanced" },
    { userId: u("Tom Bridges").id, skillId: sk("Business Analysis").id, proficiencyLevel: "Intermediate" },
    { userId: u("Tom Bridges").id, skillId: sk("Process Mapping").id, proficiencyLevel: "Intermediate" },
    { userId: u("Tom Bridges").id, skillId: sk("Fleet Management").id, proficiencyLevel: "Advanced" },
    { userId: u("Amara Diallo").id, skillId: sk("Cold Chain Logistics").id, proficiencyLevel: "Expert" },
    { userId: u("Amara Diallo").id, skillId: sk("Freight Forwarding").id, proficiencyLevel: "Advanced" },
    { userId: u("Amara Diallo").id, skillId: sk("Last-Mile Delivery").id, proficiencyLevel: "Expert" },
  ]);

  // ─── Accounts ────────────────────────────────────────────────────────────
  const accounts = await db
    .insert(schema.accountsTable)
    .values([
      {
        name: "FrostLine Cold Storage",
        domain: "frostline.com",
        tier: "Enterprise",
        region: "North America",
        status: "Active",
        contractValue: "1250000",
        billingAddress: "420 Refrigeration Blvd, Chicago, IL 60601",
      },
      {
        name: "VeloFreight Global",
        domain: "velofreight.com",
        tier: "Enterprise",
        region: "Europe",
        status: "Active",
        contractValue: "2100000",
        billingAddress: "88 Docklands Way, Rotterdam, Netherlands",
      },
      {
        name: "PrimePack Distribution",
        domain: "primepack.com",
        tier: "Mid-Market",
        region: "North America",
        status: "Active",
        contractValue: "680000",
        billingAddress: "3300 Commerce Drive, Dallas, TX 75201",
      },
      {
        name: "HarbourLink Shipping",
        domain: "harbourlink.com",
        tier: "Enterprise",
        region: "Asia Pacific",
        status: "Active",
        contractValue: "1850000",
        billingAddress: "12 Container Terminal Rd, Singapore 628150",
      },
      {
        name: "SwiftRoute Last Mile",
        domain: "swiftroute.io",
        tier: "Mid-Market",
        region: "North America",
        status: "Active",
        contractValue: "490000",
        billingAddress: "900 Delivery Plaza, Austin, TX 78701",
      },
      {
        name: "Meridian Fleet Co.",
        domain: "meridianfleet.com",
        tier: "Mid-Market",
        region: "North America",
        status: "At Risk",
        contractValue: "370000",
        billingAddress: "50 Truck Route, Nashville, TN 37201",
      },
    ])
    .returning();

  const acc = (name: string) => accounts.find((a) => a.name === name)!;

  // ─── Prospects ───────────────────────────────────────────────────────────
  await db.insert(schema.prospectsTable).values([
    {
      name: "BlueSky Air Cargo",
      contactName: "Jim Nakamura",
      contactEmail: "j.nakamura@bluesky-air.com",
      contactPhone: "+1-310-555-0182",
      status: "Qualified",
      source: "Trade Show",
      estimatedValue: "920000",
      notes: "Met at MODEX 2025. Looking for full TMS + customs integration.",
      ownerId: u("Marcus Webb").id,
    },
    {
      name: "Terracycle Reverse Logistics",
      contactName: "Sara Dent",
      contactEmail: "sara.d@terracycle-rl.com",
      contactPhone: "+1-908-555-0213",
      status: "Proposal",
      source: "Referral",
      estimatedValue: "540000",
      notes: "Referred by FrostLine. Needs returns management + WMS upgrade.",
      ownerId: u("Sophie Laurent").id,
    },
    {
      name: "IronRoad Rail Logistics",
      contactName: "Bruce Kowalski",
      contactEmail: "b.kowalski@ironroad.net",
      contactPhone: "+1-312-555-0447",
      status: "Negotiation",
      source: "Inbound",
      estimatedValue: "1400000",
      notes: "Large rail intermodal operator. ERP + WMS greenfield.",
      ownerId: u("Marcus Webb").id,
    },
    {
      name: "ClearPath Customs Brokers",
      contactName: "Mei Lin",
      contactEmail: "m.lin@clearpath-customs.com",
      contactPhone: "+65-9555-1234",
      status: "New",
      source: "LinkedIn",
      estimatedValue: "280000",
      notes: "Singapore-based, interested in customs compliance automation.",
      ownerId: u("Leila Hassan").id,
    },
    {
      name: "UrbanCrate E-Commerce Fulfilment",
      contactName: "Nadia Brown",
      contactEmail: "nadia@urbancrate.co",
      contactPhone: "+1-415-555-0309",
      status: "Converted",
      source: "Conference",
      estimatedValue: "460000",
      notes: "Converted to SwiftRoute Last Mile account.",
      ownerId: u("Sophie Laurent").id,
      convertedAccountId: acc("SwiftRoute Last Mile").id,
    },
  ]);

  // ─── Opportunities ────────────────────────────────────────────────────────
  const opps = await db
    .insert(schema.opportunitiesTable)
    .values([
      {
        accountId: acc("FrostLine Cold Storage").id,
        name: "Phase 2 Cold Chain IoT Expansion",
        stage: "Proposal",
        probability: 60,
        value: "420000",
        description: "IoT sensor network for cold storage monitoring across 8 distribution centres.",
        closeDate: "2025-07-31",
        ownerId: u("Raj Krishnamurthy").id,
      },
      {
        accountId: acc("VeloFreight Global").id,
        name: "European TMS Rollout",
        stage: "Negotiation",
        probability: 80,
        value: "780000",
        description: "Blue Yonder TMS implementation across DE, FR, NL and UK depots.",
        closeDate: "2025-06-30",
        ownerId: u("Marcus Webb").id,
      },
      {
        accountId: acc("PrimePack Distribution").id,
        name: "Oracle WMS Upgrade – Dallas DC",
        stage: "Won",
        probability: 100,
        value: "340000",
        description: "Upgrade from Oracle WMS 9.x to Cloud WMS with mobile RF guns.",
        closeDate: "2025-05-01",
        ownerId: u("Priya Nair").id,
      },
      {
        accountId: acc("HarbourLink Shipping").id,
        name: "Customs & Compliance Automation",
        stage: "Discovery",
        probability: 25,
        value: "560000",
        description: "End-to-end customs declaration automation + trade lane compliance for APAC.",
        closeDate: "2025-09-30",
        ownerId: u("Leila Hassan").id,
      },
      {
        accountId: acc("SwiftRoute Last Mile").id,
        name: "Last-Mile Route Optimisation Platform",
        stage: "Won",
        probability: 100,
        value: "490000",
        description: "Build and deploy AI-assisted dynamic routing engine integrated with courier APIs.",
        closeDate: "2025-03-31",
        ownerId: u("Sophie Laurent").id,
      },
      {
        accountId: acc("Meridian Fleet Co.").id,
        name: "Fleet Telemetry & Predictive Maintenance",
        stage: "Proposal",
        probability: 45,
        value: "220000",
        description: "OBD telemetry ingestion, driver scorecarding and predictive maintenance alerts.",
        closeDate: "2025-08-31",
        ownerId: u("Tom Bridges").id,
      },
    ])
    .returning();

  const opp = (name: string) => opps.find((o) => o.name === name)!;

  // ─── Projects ─────────────────────────────────────────────────────────────
  const projects = await db
    .insert(schema.projectsTable)
    .values([
      {
        accountId: acc("FrostLine Cold Storage").id,
        name: "FrostLine WMS Implementation",
        status: "In Progress",
        ownerId: u("Marcus Webb").id,
        startDate: "2024-11-01",
        dueDate: "2025-07-31",
        billingType: "Fixed Fee",
        budget: "1250000",
        trackedHours: "820",
        allocatedHours: "1600",
        budgetedHours: "2000",
        completion: 45,
        health: "On Track",
        description: "Full SAP EWM implementation for 3 cold storage DCs including RFID integration.",
        rateCardId: rcEnterprise.id,
        customerChampion: "Derek Frost (VP Ops)",
        internalExternal: "External",
        opportunityId: null,
      },
      {
        accountId: acc("VeloFreight Global").id,
        name: "VeloFreight TMS Rollout – Phase 1",
        status: "In Progress",
        ownerId: u("Marcus Webb").id,
        startDate: "2025-01-15",
        dueDate: "2025-09-30",
        billingType: "Time & Materials",
        budget: "780000",
        trackedHours: "340",
        allocatedHours: "960",
        budgetedHours: "1400",
        completion: 28,
        health: "At Risk",
        description: "Blue Yonder TMS deployment for Western European freight corridors.",
        rateCardId: rcEnterprise.id,
        customerChampion: "Ines van der Berg (CTO)",
        internalExternal: "External",
        opportunityId: opp("European TMS Rollout").id,
      },
      {
        accountId: acc("PrimePack Distribution").id,
        name: "Oracle WMS Cloud Migration",
        status: "In Progress",
        ownerId: u("Priya Nair").id,
        startDate: "2025-02-03",
        dueDate: "2025-08-29",
        billingType: "Fixed Fee",
        budget: "340000",
        trackedHours: "210",
        allocatedHours: "480",
        budgetedHours: "720",
        completion: 35,
        health: "On Track",
        description: "Migrate Dallas DC from Oracle WMS on-premise to Oracle Cloud WMS.",
        rateCardId: rcLogistics.id,
        customerChampion: "Tina Marlow (IT Director)",
        internalExternal: "External",
        opportunityId: opp("Oracle WMS Upgrade – Dallas DC").id,
      },
      {
        accountId: acc("SwiftRoute Last Mile").id,
        name: "Route Optimisation Engine Deployment",
        status: "Completed",
        ownerId: u("Sophie Laurent").id,
        startDate: "2024-09-16",
        dueDate: "2025-03-31",
        billingType: "Fixed Fee",
        budget: "490000",
        trackedHours: "1280",
        allocatedHours: "1280",
        budgetedHours: "1200",
        completion: 100,
        health: "On Track",
        description: "Design and implement AI route optimisation microservice with courier API connectors.",
        rateCardId: rcLogistics.id,
        customerChampion: "Chris Hayward (CEO)",
        internalExternal: "External",
        opportunityId: opp("Last-Mile Route Optimisation Platform").id,
      },
      {
        accountId: acc("HarbourLink Shipping").id,
        name: "HarbourLink EDI Integration",
        status: "In Progress",
        ownerId: u("Daniel Osei").id,
        startDate: "2025-03-01",
        dueDate: "2025-10-31",
        billingType: "Time & Materials",
        budget: "320000",
        trackedHours: "95",
        allocatedHours: "280",
        budgetedHours: "560",
        completion: 18,
        health: "On Track",
        description: "ANSI X12 EDI integration with 14 carrier and port authority trading partners.",
        rateCardId: rcLogistics.id,
        customerChampion: "Wang Li (Head of Digital)",
        internalExternal: "External",
        opportunityId: null,
      },
      {
        accountId: acc("Meridian Fleet Co.").id,
        name: "Fleet Telemetry MVP",
        status: "Not Started",
        ownerId: u("Tom Bridges").id,
        startDate: "2025-06-01",
        dueDate: "2025-12-15",
        billingType: "Fixed Fee",
        budget: "220000",
        trackedHours: "0",
        allocatedHours: "0",
        budgetedHours: "480",
        completion: 0,
        health: "On Track",
        description: "OBD-II data ingestion pipeline, driver scorecard dashboard and maintenance alert engine.",
        rateCardId: rcLogistics.id,
        customerChampion: "Dale Perkins (Fleet Director)",
        internalExternal: "External",
        opportunityId: opp("Fleet Telemetry & Predictive Maintenance").id,
      },
    ])
    .returning();

  const proj = (name: string) => projects.find((p) => p.name === name)!;

  // ─── Phases ───────────────────────────────────────────────────────────────
  // FrostLine WMS
  const frostPhases = await db
    .insert(schema.phasesTable)
    .values([
      { projectId: proj("FrostLine WMS Implementation").id, name: "Discovery & Blueprint", status: "Completed", startDate: "2024-11-01", dueDate: "2024-12-20", order: 1 },
      { projectId: proj("FrostLine WMS Implementation").id, name: "System Configuration", status: "In Progress", startDate: "2025-01-06", dueDate: "2025-04-30", order: 2 },
      { projectId: proj("FrostLine WMS Implementation").id, name: "Integration & Testing", status: "Not Started", startDate: "2025-05-01", dueDate: "2025-06-30", order: 3 },
      { projectId: proj("FrostLine WMS Implementation").id, name: "Go-Live & Hypercare", status: "Not Started", startDate: "2025-07-01", dueDate: "2025-07-31", order: 4 },
    ])
    .returning();

  // VeloFreight TMS
  const veloPhases = await db
    .insert(schema.phasesTable)
    .values([
      { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, name: "Requirements & Gap Analysis", status: "Completed", startDate: "2025-01-15", dueDate: "2025-02-28", order: 1 },
      { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, name: "TMS Configuration", status: "In Progress", startDate: "2025-03-01", dueDate: "2025-06-30", order: 2 },
      { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, name: "Carrier Integration", status: "Not Started", startDate: "2025-07-01", dueDate: "2025-08-31", order: 3 },
      { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, name: "UAT & Training", status: "Not Started", startDate: "2025-09-01", dueDate: "2025-09-30", order: 4 },
    ])
    .returning();

  // PrimePack Oracle WMS
  const primePhases = await db
    .insert(schema.phasesTable)
    .values([
      { projectId: proj("Oracle WMS Cloud Migration").id, name: "Assessment & Data Migration Plan", status: "Completed", startDate: "2025-02-03", dueDate: "2025-03-14", order: 1 },
      { projectId: proj("Oracle WMS Cloud Migration").id, name: "Cloud Tenant Setup & Config", status: "In Progress", startDate: "2025-03-17", dueDate: "2025-06-13", order: 2 },
      { projectId: proj("Oracle WMS Cloud Migration").id, name: "Testing & Cutover", status: "Not Started", startDate: "2025-06-16", dueDate: "2025-08-29", order: 3 },
    ])
    .returning();

  // SwiftRoute (Completed)
  const swiftPhases = await db
    .insert(schema.phasesTable)
    .values([
      { projectId: proj("Route Optimisation Engine Deployment").id, name: "Design & Architecture", status: "Completed", startDate: "2024-09-16", dueDate: "2024-11-01", order: 1 },
      { projectId: proj("Route Optimisation Engine Deployment").id, name: "Core Engine Build", status: "Completed", startDate: "2024-11-04", dueDate: "2025-01-31", order: 2 },
      { projectId: proj("Route Optimisation Engine Deployment").id, name: "Courier API Integration", status: "Completed", startDate: "2025-02-03", dueDate: "2025-03-14", order: 3 },
      { projectId: proj("Route Optimisation Engine Deployment").id, name: "Production Deploy", status: "Completed", startDate: "2025-03-17", dueDate: "2025-03-31", order: 4 },
    ])
    .returning();

  // HarbourLink EDI
  const harbourPhases = await db
    .insert(schema.phasesTable)
    .values([
      { projectId: proj("HarbourLink EDI Integration").id, name: "Trading Partner Onboarding", status: "In Progress", startDate: "2025-03-01", dueDate: "2025-05-30", order: 1 },
      { projectId: proj("HarbourLink EDI Integration").id, name: "Map Development & Testing", status: "Not Started", startDate: "2025-06-02", dueDate: "2025-09-30", order: 2 },
      { projectId: proj("HarbourLink EDI Integration").id, name: "Prod Cutover", status: "Not Started", startDate: "2025-10-01", dueDate: "2025-10-31", order: 3 },
    ])
    .returning();

  // ─── Tasks ────────────────────────────────────────────────────────────────
  // FrostLine tasks
  await db.insert(schema.tasksTable).values([
    // Phase 1 – Completed
    { projectId: proj("FrostLine WMS Implementation").id, phaseId: frostPhases[0].id, name: "Kick-off Workshop & Scope Sign-off", status: "Completed", priority: "High", assigneeIds: [u("Marcus Webb").id], startDate: "2024-11-01", dueDate: "2024-11-08", effort: "16", billable: true },
    { projectId: proj("FrostLine WMS Implementation").id, phaseId: frostPhases[0].id, name: "Current State Warehouse Process Documentation", status: "Completed", priority: "High", assigneeIds: [u("Sophie Laurent").id], startDate: "2024-11-11", dueDate: "2024-12-06", effort: "40", billable: true },
    { projectId: proj("FrostLine WMS Implementation").id, phaseId: frostPhases[0].id, name: "SAP EWM Blueprint & Fit-Gap Report", status: "Completed", priority: "High", assigneeIds: [u("Priya Nair").id], startDate: "2024-11-18", dueDate: "2024-12-20", effort: "60", billable: true, isMilestone: true, milestoneType: "Payment" },
    // Phase 2 – In Progress
    { projectId: proj("FrostLine WMS Implementation").id, phaseId: frostPhases[1].id, name: "Storage Type & Bin Configuration", status: "In Progress", priority: "High", assigneeIds: [u("Priya Nair").id], startDate: "2025-01-06", dueDate: "2025-02-28", effort: "80", billable: true },
    { projectId: proj("FrostLine WMS Implementation").id, phaseId: frostPhases[1].id, name: "RFID Hardware Integration", status: "In Progress", priority: "Medium", assigneeIds: [u("Raj Krishnamurthy").id], startDate: "2025-02-01", dueDate: "2025-03-31", effort: "60", billable: true },
    { projectId: proj("FrostLine WMS Implementation").id, phaseId: frostPhases[1].id, name: "Cold Chain Temperature Monitoring Config", status: "Not Started", priority: "Medium", assigneeIds: [u("Amara Diallo").id, u("Raj Krishnamurthy").id], startDate: "2025-03-01", dueDate: "2025-04-30", effort: "50", billable: true },
    { projectId: proj("FrostLine WMS Implementation").id, phaseId: frostPhases[1].id, name: "Change Management & Training Plan", status: "Not Started", priority: "Medium", assigneeIds: [u("Leila Hassan").id], startDate: "2025-03-15", dueDate: "2025-04-30", effort: "30", billable: true },
    // Phase 3 – Not Started
    { projectId: proj("FrostLine WMS Implementation").id, phaseId: frostPhases[2].id, name: "SAP–ERP Interface Build", status: "Not Started", priority: "High", assigneeIds: [u("Daniel Osei").id], startDate: "2025-05-01", dueDate: "2025-06-13", effort: "80", billable: true },
    { projectId: proj("FrostLine WMS Implementation").id, phaseId: frostPhases[2].id, name: "SIT & Performance Testing", status: "Not Started", priority: "High", assigneeIds: [u("Tom Bridges").id], startDate: "2025-05-15", dueDate: "2025-06-27", effort: "60", billable: true },
    // Phase 4 – Not Started
    { projectId: proj("FrostLine WMS Implementation").id, phaseId: frostPhases[3].id, name: "Go-Live Cutover", status: "Not Started", priority: "Critical", assigneeIds: [u("Marcus Webb").id, u("Priya Nair").id], startDate: "2025-07-01", dueDate: "2025-07-07", effort: "40", billable: true, isMilestone: true, milestoneType: "Project" },
    { projectId: proj("FrostLine WMS Implementation").id, phaseId: frostPhases[3].id, name: "Hypercare & Stabilisation", status: "Not Started", priority: "High", assigneeIds: [u("Marcus Webb").id], startDate: "2025-07-07", dueDate: "2025-07-31", effort: "30", billable: true },
  ]);

  // VeloFreight tasks
  await db.insert(schema.tasksTable).values([
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, phaseId: veloPhases[0].id, name: "Freight Lane & Carrier Master Data Audit", status: "Completed", priority: "High", assigneeIds: [u("Sophie Laurent").id], startDate: "2025-01-15", dueDate: "2025-02-07", effort: "40", billable: true },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, phaseId: veloPhases[0].id, name: "Gap Analysis Report vs Blue Yonder OOB", status: "Completed", priority: "High", assigneeIds: [u("Priya Nair").id], startDate: "2025-02-10", dueDate: "2025-02-28", effort: "32", billable: true, isMilestone: true, milestoneType: "Payment" },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, phaseId: veloPhases[1].id, name: "Carrier Rating Engine Configuration", status: "In Progress", priority: "High", assigneeIds: [u("Priya Nair").id], startDate: "2025-03-03", dueDate: "2025-05-02", effort: "80", billable: true },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, phaseId: veloPhases[1].id, name: "Freight Audit & Payment Rules Setup", status: "Not Started", priority: "Medium", assigneeIds: [u("Sophie Laurent").id], startDate: "2025-04-07", dueDate: "2025-06-13", effort: "60", billable: true },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, phaseId: veloPhases[1].id, name: "Customs Document Generation Module", status: "Blocked", priority: "High", assigneeIds: [u("Leila Hassan").id, u("Daniel Osei").id], startDate: "2025-03-17", dueDate: "2025-05-30", effort: "70", billable: true },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, phaseId: veloPhases[2].id, name: "EDI 204/210/214 Carrier Integration", status: "Not Started", priority: "High", assigneeIds: [u("Daniel Osei").id], startDate: "2025-07-01", dueDate: "2025-08-15", effort: "80", billable: true },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, phaseId: veloPhases[3].id, name: "End-User Training – DE Hub", status: "Not Started", priority: "Medium", assigneeIds: [u("Leila Hassan").id], startDate: "2025-09-01", dueDate: "2025-09-22", effort: "30", billable: true },
  ]);

  // PrimePack tasks
  await db.insert(schema.tasksTable).values([
    { projectId: proj("Oracle WMS Cloud Migration").id, phaseId: primePhases[0].id, name: "Legacy Data Quality Assessment", status: "Completed", priority: "High", assigneeIds: [u("Raj Krishnamurthy").id], startDate: "2025-02-03", dueDate: "2025-02-28", effort: "40", billable: true },
    { projectId: proj("Oracle WMS Cloud Migration").id, phaseId: primePhases[0].id, name: "Data Migration Strategy Doc", status: "Completed", priority: "High", assigneeIds: [u("Sophie Laurent").id], startDate: "2025-03-03", dueDate: "2025-03-14", effort: "24", billable: true, isMilestone: true, milestoneType: "Payment" },
    { projectId: proj("Oracle WMS Cloud Migration").id, phaseId: primePhases[1].id, name: "Cloud Tenant Provisioning & Baseline Config", status: "Completed", priority: "High", assigneeIds: [u("Priya Nair").id], startDate: "2025-03-17", dueDate: "2025-04-11", effort: "50", billable: true },
    { projectId: proj("Oracle WMS Cloud Migration").id, phaseId: primePhases[1].id, name: "RF Gun & Barcode Label Configuration", status: "In Progress", priority: "Medium", assigneeIds: [u("Raj Krishnamurthy").id], startDate: "2025-04-14", dueDate: "2025-05-30", effort: "40", billable: true },
    { projectId: proj("Oracle WMS Cloud Migration").id, phaseId: primePhases[1].id, name: "ERP Integration (NetSuite → Oracle WMS)", status: "In Progress", priority: "High", assigneeIds: [u("Daniel Osei").id], startDate: "2025-04-28", dueDate: "2025-06-13", effort: "60", billable: true },
    { projectId: proj("Oracle WMS Cloud Migration").id, phaseId: primePhases[2].id, name: "UAT Scripting & Execution", status: "Not Started", priority: "High", assigneeIds: [u("Tom Bridges").id, u("Sophie Laurent").id], startDate: "2025-06-16", dueDate: "2025-07-31", effort: "80", billable: true },
  ]);

  // SwiftRoute (all completed)
  await db.insert(schema.tasksTable).values([
    { projectId: proj("Route Optimisation Engine Deployment").id, phaseId: swiftPhases[0].id, name: "Routing Algorithm Selection & PoC", status: "Completed", priority: "High", assigneeIds: [u("Priya Nair").id, u("Raj Krishnamurthy").id], startDate: "2024-09-16", dueDate: "2024-10-11", effort: "60", billable: true },
    { projectId: proj("Route Optimisation Engine Deployment").id, phaseId: swiftPhases[0].id, name: "Microservice Architecture Design", status: "Completed", priority: "High", assigneeIds: [u("Daniel Osei").id], startDate: "2024-10-14", dueDate: "2024-11-01", effort: "40", billable: true },
    { projectId: proj("Route Optimisation Engine Deployment").id, phaseId: swiftPhases[1].id, name: "Core Routing Engine Development", status: "Completed", priority: "High", assigneeIds: [u("Daniel Osei").id, u("Raj Krishnamurthy").id], startDate: "2024-11-04", dueDate: "2025-01-10", effort: "200", billable: true },
    { projectId: proj("Route Optimisation Engine Deployment").id, phaseId: swiftPhases[1].id, name: "Driver App API Development", status: "Completed", priority: "Medium", assigneeIds: [u("Daniel Osei").id], startDate: "2025-01-06", dueDate: "2025-01-31", effort: "60", billable: true },
    { projectId: proj("Route Optimisation Engine Deployment").id, phaseId: swiftPhases[2].id, name: "DHL & FedEx API Connectors", status: "Completed", priority: "High", assigneeIds: [u("Daniel Osei").id], startDate: "2025-02-03", dueDate: "2025-03-07", effort: "80", billable: true },
    { projectId: proj("Route Optimisation Engine Deployment").id, phaseId: swiftPhases[3].id, name: "Production Deployment & Monitoring", status: "Completed", priority: "Critical", assigneeIds: [u("Marcus Webb").id, u("Raj Krishnamurthy").id], startDate: "2025-03-17", dueDate: "2025-03-31", effort: "40", billable: true, isMilestone: true, milestoneType: "Project" },
  ]);

  // HarbourLink tasks
  await db.insert(schema.tasksTable).values([
    { projectId: proj("HarbourLink EDI Integration").id, phaseId: harbourPhases[0].id, name: "Trading Partner Profile Documentation", status: "In Progress", priority: "High", assigneeIds: [u("Daniel Osei").id], startDate: "2025-03-01", dueDate: "2025-04-11", effort: "40", billable: true },
    { projectId: proj("HarbourLink EDI Integration").id, phaseId: harbourPhases[0].id, name: "VAN / AS2 Connectivity Setup", status: "Not Started", priority: "High", assigneeIds: [u("Daniel Osei").id], startDate: "2025-04-14", dueDate: "2025-05-30", effort: "32", billable: true },
    { projectId: proj("HarbourLink EDI Integration").id, phaseId: harbourPhases[1].id, name: "EDI 315/322 Sea Status Maps Build", status: "Not Started", priority: "High", assigneeIds: [u("Daniel Osei").id, u("Raj Krishnamurthy").id], startDate: "2025-06-02", dueDate: "2025-08-29", effort: "120", billable: true },
  ]);

  // ─── Allocations ─────────────────────────────────────────────────────────
  await db.insert(schema.allocationsTable).values([
    // FrostLine
    { projectId: proj("FrostLine WMS Implementation").id, userId: u("Marcus Webb").id, role: "Project Manager", startDate: "2024-11-01", endDate: "2025-07-31", hoursPerWeek: "16", isTimesheetApprover: true },
    { projectId: proj("FrostLine WMS Implementation").id, userId: u("Priya Nair").id, role: "Solutions Architect", startDate: "2024-11-01", endDate: "2025-07-31", hoursPerWeek: "32" },
    { projectId: proj("FrostLine WMS Implementation").id, userId: u("Sophie Laurent").id, role: "Business Analyst", startDate: "2024-11-01", endDate: "2025-04-30", hoursPerWeek: "24" },
    { projectId: proj("FrostLine WMS Implementation").id, userId: u("Raj Krishnamurthy").id, role: "Data Engineer", startDate: "2025-01-06", endDate: "2025-07-31", hoursPerWeek: "20" },
    { projectId: proj("FrostLine WMS Implementation").id, userId: u("Daniel Osei").id, role: "Integration Engineer", startDate: "2025-05-01", endDate: "2025-07-31", hoursPerWeek: "32" },
    { projectId: proj("FrostLine WMS Implementation").id, userId: u("Leila Hassan").id, role: "Change Management Lead", startDate: "2025-03-01", endDate: "2025-07-31", hoursPerWeek: "16" },
    { projectId: proj("FrostLine WMS Implementation").id, userId: u("Tom Bridges").id, role: "QA Engineer", startDate: "2025-05-15", endDate: "2025-06-27", hoursPerWeek: "32" },
    { projectId: proj("FrostLine WMS Implementation").id, userId: u("Amara Diallo").id, role: "Consultant", startDate: "2025-03-01", endDate: "2025-07-31", hoursPerWeek: "16" },
    // VeloFreight
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, userId: u("Marcus Webb").id, role: "Project Manager", startDate: "2025-01-15", endDate: "2025-09-30", hoursPerWeek: "16", isTimesheetApprover: true },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, userId: u("Priya Nair").id, role: "Solutions Architect", startDate: "2025-01-15", endDate: "2025-09-30", hoursPerWeek: "24" },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, userId: u("Sophie Laurent").id, role: "Business Analyst", startDate: "2025-01-15", endDate: "2025-06-30", hoursPerWeek: "32" },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, userId: u("Leila Hassan").id, role: "Change Management Lead", startDate: "2025-03-17", endDate: "2025-09-30", hoursPerWeek: "20" },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, userId: u("Daniel Osei").id, role: "Integration Engineer", startDate: "2025-07-01", endDate: "2025-09-30", hoursPerWeek: "32" },
    // PrimePack
    { projectId: proj("Oracle WMS Cloud Migration").id, userId: u("Priya Nair").id, role: "Solutions Architect", startDate: "2025-02-03", endDate: "2025-08-29", hoursPerWeek: "24", isTimesheetApprover: true },
    { projectId: proj("Oracle WMS Cloud Migration").id, userId: u("Raj Krishnamurthy").id, role: "Data Engineer", startDate: "2025-02-03", endDate: "2025-08-29", hoursPerWeek: "24" },
    { projectId: proj("Oracle WMS Cloud Migration").id, userId: u("Daniel Osei").id, role: "Integration Engineer", startDate: "2025-04-28", endDate: "2025-08-29", hoursPerWeek: "32" },
    { projectId: proj("Oracle WMS Cloud Migration").id, userId: u("Sophie Laurent").id, role: "Business Analyst", startDate: "2025-02-03", endDate: "2025-06-30", hoursPerWeek: "16" },
    { projectId: proj("Oracle WMS Cloud Migration").id, userId: u("Tom Bridges").id, role: "QA Engineer", startDate: "2025-06-16", endDate: "2025-08-29", hoursPerWeek: "32" },
    // SwiftRoute
    { projectId: proj("Route Optimisation Engine Deployment").id, userId: u("Sophie Laurent").id, role: "Project Manager", startDate: "2024-09-16", endDate: "2025-03-31", hoursPerWeek: "16", isTimesheetApprover: true },
    { projectId: proj("Route Optimisation Engine Deployment").id, userId: u("Daniel Osei").id, role: "Integration Engineer", startDate: "2024-09-16", endDate: "2025-03-31", hoursPerWeek: "32" },
    { projectId: proj("Route Optimisation Engine Deployment").id, userId: u("Raj Krishnamurthy").id, role: "Data Engineer", startDate: "2024-09-16", endDate: "2025-03-31", hoursPerWeek: "24" },
    { projectId: proj("Route Optimisation Engine Deployment").id, userId: u("Priya Nair").id, role: "Solutions Architect", startDate: "2024-09-16", endDate: "2024-11-01", hoursPerWeek: "24" },
    { projectId: proj("Route Optimisation Engine Deployment").id, userId: u("Marcus Webb").id, role: "Project Manager", startDate: "2025-03-17", endDate: "2025-03-31", hoursPerWeek: "40" },
    // HarbourLink
    { projectId: proj("HarbourLink EDI Integration").id, userId: u("Daniel Osei").id, role: "Integration Engineer", startDate: "2025-03-01", endDate: "2025-10-31", hoursPerWeek: "32", isTimesheetApprover: true },
    { projectId: proj("HarbourLink EDI Integration").id, userId: u("Raj Krishnamurthy").id, role: "Data Engineer", startDate: "2025-06-02", endDate: "2025-10-31", hoursPerWeek: "16" },
  ]);

  // ─── Time Entries ─────────────────────────────────────────────────────────
  const timeEntries: typeof schema.timeEntriesTable.$inferInsert[] = [];
  const weeks = [
    "2025-01-06", "2025-01-13", "2025-01-20", "2025-01-27",
    "2025-02-03", "2025-02-10", "2025-02-17", "2025-02-24",
    "2025-03-03", "2025-03-10", "2025-03-17", "2025-03-24",
    "2025-03-31", "2025-04-07",
  ];

  // FrostLine – Marcus (PM)
  for (const wk of weeks) {
    timeEntries.push({ projectId: proj("FrostLine WMS Implementation").id, userId: u("Marcus Webb").id, date: wk, hours: "12", description: "Project management, status reports, steering committee", billable: true, approved: true });
  }
  // FrostLine – Priya (SA)
  for (const wk of weeks) {
    timeEntries.push({ projectId: proj("FrostLine WMS Implementation").id, userId: u("Priya Nair").id, date: wk, hours: "28", description: "SAP EWM configuration and design workshops", billable: true, approved: true });
  }
  // FrostLine – Sophie (BA)
  for (const wk of weeks.slice(0, 8)) {
    timeEntries.push({ projectId: proj("FrostLine WMS Implementation").id, userId: u("Sophie Laurent").id, date: wk, hours: "20", description: "Process mapping and gap analysis", billable: true, approved: true });
  }
  // FrostLine – Raj
  for (const wk of weeks.slice(4)) {
    timeEntries.push({ projectId: proj("FrostLine WMS Implementation").id, userId: u("Raj Krishnamurthy").id, date: wk, hours: "18", description: "RFID configuration and data engineering", billable: true, approved: true });
  }
  // VeloFreight – Marcus
  for (const wk of weeks.slice(2)) {
    timeEntries.push({ projectId: proj("VeloFreight TMS Rollout – Phase 1").id, userId: u("Marcus Webb").id, date: wk, hours: "14", description: "Steering updates, risk tracking", billable: true, approved: true });
  }
  // VeloFreight – Priya
  for (const wk of weeks.slice(2)) {
    timeEntries.push({ projectId: proj("VeloFreight TMS Rollout – Phase 1").id, userId: u("Priya Nair").id, date: wk, hours: "20", description: "TMS configuration workshops", billable: true, approved: true });
  }
  // VeloFreight – Sophie
  for (const wk of weeks.slice(2)) {
    timeEntries.push({ projectId: proj("VeloFreight TMS Rollout – Phase 1").id, userId: u("Sophie Laurent").id, date: wk, hours: "28", description: "Freight lane requirements and carrier data", billable: true, approved: true });
  }
  // PrimePack – Priya
  for (const wk of weeks.slice(4)) {
    timeEntries.push({ projectId: proj("Oracle WMS Cloud Migration").id, userId: u("Priya Nair").id, date: wk, hours: "20", description: "Oracle WMS cloud tenant configuration", billable: true, approved: true });
  }
  // PrimePack – Raj
  for (const wk of weeks.slice(4)) {
    timeEntries.push({ projectId: proj("Oracle WMS Cloud Migration").id, userId: u("Raj Krishnamurthy").id, date: wk, hours: "16", description: "Data migration scripting and validation", billable: true, approved: true });
  }
  // SwiftRoute – Daniel (completed)
  for (const wk of weeks.slice(0, 12)) {
    timeEntries.push({ projectId: proj("Route Optimisation Engine Deployment").id, userId: u("Daniel Osei").id, date: wk, hours: "32", description: "Route engine development and courier API integration", billable: true, approved: true });
  }
  // SwiftRoute – Raj
  for (const wk of weeks.slice(0, 10)) {
    timeEntries.push({ projectId: proj("Route Optimisation Engine Deployment").id, userId: u("Raj Krishnamurthy").id, date: wk, hours: "24", description: "Algorithm development and performance tuning", billable: true, approved: true });
  }
  // HarbourLink – Daniel
  for (const wk of weeks.slice(9)) {
    timeEntries.push({ projectId: proj("HarbourLink EDI Integration").id, userId: u("Daniel Osei").id, date: wk, hours: "24", description: "Trading partner profile setup and AS2 config", billable: true, approved: false });
  }

  await db.insert(schema.timeEntriesTable).values(timeEntries);

  // ─── Invoices ────────────────────────────────────────────────────────────
  await db.insert(schema.invoicesTable).values([
    {
      id: "INV-2024-001",
      projectId: proj("FrostLine WMS Implementation").id,
      accountId: acc("FrostLine Cold Storage").id,
      issueDate: "2024-12-31",
      dueDate: "2025-01-30",
      status: "Paid",
      amount: "312500",
      tax: "0",
      total: "312500",
      description: "Milestone 1: Discovery & Blueprint completion – FrostLine WMS Implementation",
      billTo: "FrostLine Cold Storage – AP Department",
      notes: "25% milestone payment per contract schedule.",
    },
    {
      id: "INV-2025-001",
      projectId: proj("FrostLine WMS Implementation").id,
      accountId: acc("FrostLine Cold Storage").id,
      issueDate: "2025-03-31",
      dueDate: "2025-04-30",
      status: "Approved",
      amount: "312500",
      tax: "0",
      total: "312500",
      description: "Milestone 2: System Configuration (50%) – FrostLine WMS Implementation",
      billTo: "FrostLine Cold Storage – AP Department",
      notes: "Q1 2025 progress billing.",
    },
    {
      id: "INV-2025-002",
      projectId: proj("VeloFreight TMS Rollout – Phase 1").id,
      accountId: acc("VeloFreight Global").id,
      issueDate: "2025-02-28",
      dueDate: "2025-03-31",
      status: "Paid",
      amount: "156000",
      tax: "0",
      total: "156000",
      description: "T&M January–February 2025 – VeloFreight TMS Rollout Phase 1",
      billTo: "VeloFreight Global Finance",
      notes: "Covers 340 hours @ blended rate.",
    },
    {
      id: "INV-2025-003",
      projectId: proj("VeloFreight TMS Rollout – Phase 1").id,
      accountId: acc("VeloFreight Global").id,
      issueDate: "2025-04-15",
      dueDate: "2025-05-15",
      status: "Overdue",
      amount: "198000",
      tax: "0",
      total: "198000",
      description: "T&M March–April 2025 – VeloFreight TMS Rollout Phase 1",
      billTo: "VeloFreight Global Finance",
      notes: "Awaiting PO approval from client. Follow up escalated.",
    },
    {
      id: "INV-2025-004",
      projectId: proj("Oracle WMS Cloud Migration").id,
      accountId: acc("PrimePack Distribution").id,
      issueDate: "2025-03-14",
      dueDate: "2025-04-13",
      status: "Paid",
      amount: "85000",
      tax: "0",
      total: "85000",
      description: "Milestone 1: Assessment & Data Migration Plan – Oracle WMS Cloud Migration",
      billTo: "PrimePack Distribution – Finance",
    },
    {
      id: "INV-2025-005",
      projectId: proj("Oracle WMS Cloud Migration").id,
      accountId: acc("PrimePack Distribution").id,
      issueDate: "2025-04-30",
      dueDate: "2025-05-30",
      status: "In Review",
      amount: "127500",
      tax: "0",
      total: "127500",
      description: "Milestone 2: Cloud Tenant Setup & Config (50%) – Oracle WMS Cloud Migration",
      billTo: "PrimePack Distribution – Finance",
    },
    {
      id: "INV-2024-002",
      projectId: proj("Route Optimisation Engine Deployment").id,
      accountId: acc("SwiftRoute Last Mile").id,
      issueDate: "2024-12-20",
      dueDate: "2025-01-19",
      status: "Paid",
      amount: "196000",
      tax: "0",
      total: "196000",
      description: "Milestone 1: Design & Core Engine Build – Route Optimisation Engine",
      billTo: "SwiftRoute Last Mile – Finance",
    },
    {
      id: "INV-2025-006",
      projectId: proj("Route Optimisation Engine Deployment").id,
      accountId: acc("SwiftRoute Last Mile").id,
      issueDate: "2025-03-31",
      dueDate: "2025-04-30",
      status: "Paid",
      amount: "294000",
      tax: "0",
      total: "294000",
      description: "Final Milestone: Production Deployment – Route Optimisation Engine",
      billTo: "SwiftRoute Last Mile – Finance",
      notes: "Project closed. Final retention payment.",
    },
    {
      id: "INV-2025-007",
      projectId: proj("HarbourLink EDI Integration").id,
      accountId: acc("HarbourLink Shipping").id,
      issueDate: "2025-04-30",
      dueDate: "2025-05-30",
      status: "Draft",
      amount: "64000",
      tax: "0",
      total: "64000",
      description: "T&M March–April 2025 – HarbourLink EDI Integration",
      billTo: "HarbourLink Shipping AP",
    },
  ]);

  // ─── CSAT Responses ────────────────────────────────────────────────────────
  // Fetch some task IDs for csat (swift route tasks are completed)
  const swiftTasks = await db
    .select()
    .from(schema.tasksTable)
    .where(eq(schema.tasksTable.projectId, proj("Route Optimisation Engine Deployment").id));

  if (swiftTasks.length >= 3) {
    await db.insert(schema.csatResponsesTable).values([
      { projectId: proj("Route Optimisation Engine Deployment").id, taskId: swiftTasks[0].id, submittedByUserId: u("Marcus Webb").id, rating: 5, comment: "Excellent delivery – algorithm performance exceeded our KPIs." },
      { projectId: proj("Route Optimisation Engine Deployment").id, taskId: swiftTasks[1].id, submittedByUserId: u("Sophie Laurent").id, rating: 4, comment: "Strong technical output. Minor delays in carrier integration but resolved quickly." },
      { projectId: proj("Route Optimisation Engine Deployment").id, taskId: swiftTasks[2].id, submittedByUserId: u("Daniel Osei").id, rating: 5, comment: "API connectors worked flawlessly in production from day 1." },
    ]);
  }

  // ─── Assign holiday calendars + designate timesheet approvers ──────────
  // North America users → US calendar; APAC user → APAC; Europe-focused PM → EU.
  const approverId = u("Marcus Webb").id;
  const calendarAssignments: Array<[string[], number, string]> = [
    [["Marcus Webb"],                                        eurHolCal.id,  "Europe"],
    [["Sophie Laurent", "Tom Bridges", "Raj Krishnamurthy"], usHolCal.id,   "North America"],
    [["Daniel Osei", "Leila Hassan"],                        apacHolCal.id, "Asia Pacific"],
    [["Priya Nair", "Amara Diallo"],                         usHolCal.id,   "North America"],
  ];
  for (const [names, calId, region] of calendarAssignments) {
    await db
      .update(schema.usersTable)
      .set({ holidayCalendarId: calId, region, timesheetApproverUserId: approverId })
      .where(inArray(schema.usersTable.name, names));
  }

  // ─── Time Categories + Activity Defaults ──────────────────────────────
  await db.insert(schema.timeCategoriesTable).values([
    { name: "Billable Project Work",  description: "Time delivered against contracted scope", sortOrder: 1, defaultBillable: true },
    { name: "Internal Meetings",      description: "Standups, retros, internal syncs",        sortOrder: 2, defaultBillable: false },
    { name: "Training & Enablement",  description: "Certifications, learning, ramp-up",       sortOrder: 3, defaultBillable: false },
    { name: "Pre-sales & Estimation", description: "Discovery calls, proposals, SOWs",        sortOrder: 4, defaultBillable: false },
    { name: "Admin & PMO",            description: "Timesheets, status reports, governance",  sortOrder: 5, defaultBillable: false },
  ]);

  await db.insert(schema.activityDefaultsTable).values([
    { activityName: "Internal Meetings",      billable: false },
    { activityName: "Training",               billable: false },
    { activityName: "Vacation",               billable: false },
    { activityName: "Sick Leave",             billable: false },
    { activityName: "Pre-sales",              billable: false },
    { activityName: "Public Holiday",         billable: false },
  ]);

  // ─── Time-Off Requests ────────────────────────────────────────────────
  await db.insert(schema.timeOffRequestsTable).values([
    // Approved past PTO that should reduce capacity in past weeks
    { userId: u("Priya Nair").id,         type: "PTO",        startDate: "2025-03-17", endDate: "2025-03-21", status: "Approved", durationType: "Full Day", approvedByUserId: u("Marcus Webb").id, notes: "Family holiday" },
    { userId: u("Sophie Laurent").id,     type: "PTO",        startDate: "2025-02-24", endDate: "2025-02-26", status: "Approved", durationType: "Full Day", approvedByUserId: u("Marcus Webb").id, notes: "Personal" },
    { userId: u("Daniel Osei").id,        type: "Sick Leave", startDate: "2025-04-07", endDate: "2025-04-08", status: "Approved", durationType: "Full Day", approvedByUserId: u("Marcus Webb").id },
    { userId: u("Leila Hassan").id,       type: "PTO",        startDate: "2025-04-14", endDate: "2025-04-18", status: "Approved", durationType: "Full Day", approvedByUserId: u("Marcus Webb").id, notes: "Annual leave" },
    { userId: u("Raj Krishnamurthy").id,  type: "PTO",        startDate: "2025-05-12", endDate: "2025-05-16", status: "Approved", durationType: "Full Day", approvedByUserId: u("Marcus Webb").id, notes: "Wedding" },
    // Recent / current (relative to Apr 2026 system date)
    { userId: u("Tom Bridges").id,        type: "PTO",        startDate: "2026-04-13", endDate: "2026-04-17", status: "Approved", durationType: "Full Day", approvedByUserId: u("Marcus Webb").id, notes: "Spring break" },
    { userId: u("Amara Diallo").id,       type: "PTO",        startDate: "2026-04-06", endDate: "2026-04-06", status: "Approved", durationType: "Half Day" },
    // Pending
    { userId: u("Sophie Laurent").id,     type: "PTO",        startDate: "2026-05-04", endDate: "2026-05-08", status: "Pending",  durationType: "Full Day", notes: "Awaiting manager approval" },
    { userId: u("Daniel Osei").id,        type: "Bereavement",startDate: "2026-04-27", endDate: "2026-04-29", status: "Pending",  durationType: "Full Day" },
    // Rejected
    { userId: u("Tom Bridges").id,        type: "PTO",        startDate: "2026-06-01", endDate: "2026-06-12", status: "Rejected", durationType: "Full Day", approvedByUserId: u("Marcus Webb").id, notes: "Conflicts with Fleet Telemetry MVP go-live" },
  ]);

  // ─── Timesheets (one per user × week with mixed statuses) ──────────────
  // Reuse the `weeks` array (Mondays from Jan – Apr 2025). For each
  // week+user, compute totals from the seeded time entries and assign a
  // realistic status: older weeks Approved, recent ones Submitted, the
  // freshest Draft to keep the submissions report colourful.
  type TS = typeof schema.timesheetsTable.$inferInsert;
  const tsRows: TS[] = [];
  const internalUsers = users; // all are internal in seed
  // Anchor "now" to the most recent seeded week so the freshest weeks always
  // produce Draft/Submitted timesheets regardless of the current calendar
  // date — gives the submissions report a realistic mix every run.
  const refDate = new Date(weeks[weeks.length - 1] + "T00:00:00Z");
  refDate.setUTCDate(refDate.getUTCDate() + 6);
  for (let wi = 0; wi < weeks.length; wi++) {
    const wk = weeks[wi];
    const wkEnd = new Date(wk + "T00:00:00Z"); wkEnd.setUTCDate(wkEnd.getUTCDate() + 6);
    const wkEndStr = wkEnd.toISOString().slice(0, 10);
    // Most recent week → age 0; previous → 1; etc.
    const weekAge = weeks.length - 1 - wi;
    for (const user of internalUsers) {
      const userEntries = timeEntries.filter(
        e => e.userId === user.id && e.date! >= wk && e.date! <= wkEndStr,
      );
      const total = userEntries.reduce((s, e) => s + Number(e.hours), 0);
      const billable = userEntries.filter(e => e.billable).reduce((s, e) => s + Number(e.hours), 0);
      // Skip if user logged nothing this week — leaves a "missing" cell in the report.
      if (total === 0) continue;
      // Status mapping: very old → Approved; older → Submitted; latest 2 → Draft for some users
      let status: "Draft" | "Submitted" | "Approved" | "Rejected" = "Approved";
      let submittedAt: Date | null = new Date(wkEnd); submittedAt.setUTCDate(submittedAt.getUTCDate() + 1);
      let approvedAt: Date | null = new Date(wkEnd);  approvedAt.setUTCDate(approvedAt.getUTCDate() + 3);
      let approvedBy: number | null = u("Marcus Webb").id;
      let rejectedAt: Date | null = null;
      let rejectionNote: string | null = null;
      if (weekAge <= 1) {
        status = "Draft"; submittedAt = null; approvedAt = null; approvedBy = null;
      } else if (weekAge <= 3) {
        status = "Submitted"; approvedAt = null; approvedBy = null;
      } else if (user.name === "Daniel Osei" && wk === "2025-03-31") {
        // One rejected example for the report's red cells
        status = "Rejected"; approvedAt = null; approvedBy = null;
        rejectedAt = new Date(wkEnd); rejectedAt.setUTCDate(rejectedAt.getUTCDate() + 4);
        rejectionNote = "Please split Project A vs B hours and resubmit.";
      }
      tsRows.push({
        userId: user.id,
        weekStart: wk,
        status,
        totalHours: total.toFixed(2),
        billableHours: billable.toFixed(2),
        submittedAt: submittedAt as any,
        submittedByUserId: submittedAt ? user.id : null,
        approvedAt: approvedAt as any,
        approvedByUserId: approvedBy,
        rejectedAt: rejectedAt as any,
        rejectedByUserId: rejectedAt ? u("Marcus Webb").id : null,
        rejectionNote,
      });
    }
  }
  if (tsRows.length) await db.insert(schema.timesheetsTable).values(tsRows);

  // ─── Key Events + Intervals (Interval IQ) ──────────────────────────────
  // Per project: capture canonical lifecycle moments and benchmark intervals.
  const keyEventRows = await db
    .insert(schema.keyEventsTable)
    .values([
      // FrostLine
      { projectId: proj("FrostLine WMS Implementation").id, name: "Contract Signed",     eventDate: "2024-10-15", eventType: "manual" },
      { projectId: proj("FrostLine WMS Implementation").id, name: "Kick-off",            eventDate: "2024-11-01", eventType: "manual" },
      { projectId: proj("FrostLine WMS Implementation").id, name: "Blueprint Approved",  eventDate: "2024-12-20", eventType: "manual" },
      { projectId: proj("FrostLine WMS Implementation").id, name: "Config Complete",     eventDate: "2025-04-30", eventType: "manual" },
      // VeloFreight
      { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, name: "Contract Signed", eventDate: "2024-12-01", eventType: "manual" },
      { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, name: "Kick-off",        eventDate: "2025-01-15", eventType: "manual" },
      { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, name: "Requirements Approved", eventDate: "2025-02-28", eventType: "manual" },
      // PrimePack
      { projectId: proj("Oracle WMS Cloud Migration").id, name: "Contract Signed", eventDate: "2025-01-15", eventType: "manual" },
      { projectId: proj("Oracle WMS Cloud Migration").id, name: "Kick-off",        eventDate: "2025-02-03", eventType: "manual" },
      { projectId: proj("Oracle WMS Cloud Migration").id, name: "Migration Plan Approved", eventDate: "2025-03-14", eventType: "manual" },
      // SwiftRoute (Completed)
      { projectId: proj("Route Optimisation Engine Deployment").id, name: "Contract Signed", eventDate: "2024-08-20", eventType: "manual" },
      { projectId: proj("Route Optimisation Engine Deployment").id, name: "Kick-off",        eventDate: "2024-09-16", eventType: "manual" },
      { projectId: proj("Route Optimisation Engine Deployment").id, name: "Production Launch", eventDate: "2025-03-31", eventType: "manual" },
      // HarbourLink
      { projectId: proj("HarbourLink EDI Integration").id, name: "Contract Signed", eventDate: "2025-02-10", eventType: "manual" },
      { projectId: proj("HarbourLink EDI Integration").id, name: "Kick-off",        eventDate: "2025-03-01", eventType: "manual" },
    ])
    .returning();

  const ev = (projectName: string, name: string) =>
    keyEventRows.find(e => e.projectId === proj(projectName).id && e.name === name)!;

  await db.insert(schema.intervalsTable).values([
    // FrostLine
    { projectId: proj("FrostLine WMS Implementation").id, name: "Contract → Kick-off",   startEventId: ev("FrostLine WMS Implementation", "Contract Signed").id, endEventId: ev("FrostLine WMS Implementation", "Kick-off").id, benchmarkDays: 14 },
    { projectId: proj("FrostLine WMS Implementation").id, name: "Kick-off → Blueprint",  startEventId: ev("FrostLine WMS Implementation", "Kick-off").id,        endEventId: ev("FrostLine WMS Implementation", "Blueprint Approved").id, benchmarkDays: 45 },
    { projectId: proj("FrostLine WMS Implementation").id, name: "Blueprint → Config",    startEventId: ev("FrostLine WMS Implementation", "Blueprint Approved").id, endEventId: ev("FrostLine WMS Implementation", "Config Complete").id, benchmarkDays: 90 },
    // VeloFreight
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, name: "Contract → Kick-off",     startEventId: ev("VeloFreight TMS Rollout – Phase 1", "Contract Signed").id, endEventId: ev("VeloFreight TMS Rollout – Phase 1", "Kick-off").id, benchmarkDays: 21 },
    { projectId: proj("VeloFreight TMS Rollout – Phase 1").id, name: "Kick-off → Requirements", startEventId: ev("VeloFreight TMS Rollout – Phase 1", "Kick-off").id,        endEventId: ev("VeloFreight TMS Rollout – Phase 1", "Requirements Approved").id, benchmarkDays: 30 },
    // PrimePack
    { projectId: proj("Oracle WMS Cloud Migration").id, name: "Contract → Kick-off",       startEventId: ev("Oracle WMS Cloud Migration", "Contract Signed").id, endEventId: ev("Oracle WMS Cloud Migration", "Kick-off").id, benchmarkDays: 14 },
    { projectId: proj("Oracle WMS Cloud Migration").id, name: "Kick-off → Migration Plan", startEventId: ev("Oracle WMS Cloud Migration", "Kick-off").id,        endEventId: ev("Oracle WMS Cloud Migration", "Migration Plan Approved").id, benchmarkDays: 30 },
    // SwiftRoute
    { projectId: proj("Route Optimisation Engine Deployment").id, name: "Contract → Kick-off", startEventId: ev("Route Optimisation Engine Deployment", "Contract Signed").id, endEventId: ev("Route Optimisation Engine Deployment", "Kick-off").id, benchmarkDays: 21 },
    { projectId: proj("Route Optimisation Engine Deployment").id, name: "Kick-off → Launch",   startEventId: ev("Route Optimisation Engine Deployment", "Kick-off").id,        endEventId: ev("Route Optimisation Engine Deployment", "Production Launch").id, benchmarkDays: 180 },
    // HarbourLink
    { projectId: proj("HarbourLink EDI Integration").id, name: "Contract → Kick-off", startEventId: ev("HarbourLink EDI Integration", "Contract Signed").id, endEventId: ev("HarbourLink EDI Integration", "Kick-off").id, benchmarkDays: 14 },
  ]);

  // ─── CSAT Surveys (sent to clients on milestone tasks) ─────────────────
  const milestoneTasks = await db
    .select()
    .from(schema.tasksTable)
    .where(eq(schema.tasksTable.isMilestone, true));

  if (milestoneTasks.length > 0) {
    const surveyRows = milestoneTasks.slice(0, 8).map((t, i) => {
      const completed = t.status === "Completed";
      return {
        milestoneTaskId: t.id,
        projectId: t.projectId,
        recipientUserId: u("Marcus Webb").id,
        rating: completed ? (i % 2 === 0 ? 5 : 4) : null,
        comment: completed ? (i % 2 === 0 ? "Strong delivery, met all acceptance criteria." : "Solid milestone, minor scope clarifications needed.") : null,
        completedAt: completed ? new Date() : null,
        token: `csat-token-${t.id}-${Math.random().toString(36).slice(2, 10)}`,
      };
    });
    await db.insert(schema.csatSurveysTable).values(surveyRows as any);
  }

  // ─── Notifications ────────────────────────────────────────────────────────
  await db.insert(schema.notificationsTable).values([
    { type: "invoice_overdue", message: "Invoice INV-2025-003 for VeloFreight Global is overdue by 30+ days.", read: false, userId: u("Marcus Webb").id, projectId: proj("VeloFreight TMS Rollout – Phase 1").id, projectName: "VeloFreight TMS Rollout – Phase 1", entityType: "invoice", entityId: "INV-2025-003" },
    { type: "task_blocked", message: "Task 'Customs Document Generation Module' is blocked – waiting on client data.", read: false, userId: u("Marcus Webb").id, projectId: proj("VeloFreight TMS Rollout – Phase 1").id, projectName: "VeloFreight TMS Rollout – Phase 1", entityType: "task" },
    { type: "project_health", message: "Project 'VeloFreight TMS Rollout – Phase 1' health changed to At Risk.", read: false, userId: u("Marcus Webb").id, projectId: proj("VeloFreight TMS Rollout – Phase 1").id, projectName: "VeloFreight TMS Rollout – Phase 1", entityType: "project" },
    { type: "invoice_approved", message: "Invoice INV-2025-001 for FrostLine Cold Storage approved – $312,500.", read: true, userId: u("Marcus Webb").id, projectId: proj("FrostLine WMS Implementation").id, projectName: "FrostLine WMS Implementation", entityType: "invoice", entityId: "INV-2025-001" },
    { type: "milestone_complete", message: "Milestone 'SAP EWM Blueprint & Fit-Gap Report' marked complete.", read: true, userId: u("Priya Nair").id, projectId: proj("FrostLine WMS Implementation").id, projectName: "FrostLine WMS Implementation", entityType: "task" },
    { type: "project_complete", message: "Project 'Route Optimisation Engine Deployment' successfully closed.", read: true, userId: u("Sophie Laurent").id, projectId: proj("Route Optimisation Engine Deployment").id, projectName: "Route Optimisation Engine Deployment", entityType: "project" },
    { type: "invoice_draft", message: "Draft invoice INV-2025-007 created for HarbourLink EDI Integration.", read: false, userId: u("Daniel Osei").id, projectId: proj("HarbourLink EDI Integration").id, projectName: "HarbourLink EDI Integration", entityType: "invoice", entityId: "INV-2025-007" },
    { type: "resource_request", message: "New resource request: Integration Engineer for FrostLine go-live phase.", read: false, userId: u("Marcus Webb").id, projectId: proj("FrostLine WMS Implementation").id, projectName: "FrostLine WMS Implementation", entityType: "resource_request" },
  ]);

  console.log("✅ Seed complete!");
  console.log(`   • ${users.length} users`);
  console.log(`   • ${accounts.length} accounts`);
  console.log(`   • ${opps.length} opportunities`);
  console.log(`   • ${projects.length} projects`);
  console.log(`   • ${timeEntries.length} time entries`);
  console.log("   • invoices, CSAT, notifications seeded");

  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
