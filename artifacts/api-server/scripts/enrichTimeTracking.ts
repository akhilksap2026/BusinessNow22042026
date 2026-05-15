/**
 * enrichTimeTracking.ts
 * Idempotent enrichment of time-tracking data (timesheets, entries, time-off)
 * using the actual live DB users, projects, tasks, and categories.
 *
 * Run:  node --import tsx artifacts/api-server/scripts/enrichTimeTracking.ts
 */

import {
  db,
  timesheetsTable,
  timeEntriesTable,
  timeOffRequestsTable,
} from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";

// ─── Live DB constants ───────────────────────────────────────────────────────

const U = {
  admin:   1,  // account_admin   — Admin User
  marcus:  2,  // super_user/PM   — Marcus Webb   (manager of everyone)
  priya:   3,  // super_user      — Priya Nair    (Solutions Architect)
  daniel:  4,  // super_user      — Daniel Osei   (Integration Engineer)
  sophie:  5,  // super_user      — Sophie Laurent (Business Analyst)
  raj:     6,  // super_user      — Raj Krishnamurthy (Data Engineer)
  leila:   7,  // super_user      — Leila Hassan  (Change Management Lead)
  tom:     8,  // collaborator    — Tom Bridges   (QA Engineer)
  amara:   9,  // collaborator    — Amara Diallo  (Consultant)
};

const CAT = {
  billable: 1,  // Billable Project Work
  meetings: 2,  // Internal Meetings
  training: 3,  // Training & Enablement
  presales: 4,  // Pre-sales & Estimation
  admin:    5,  // Admin & PMO
};

const PROJ = {
  frostline:   1,  // FrostLine WMS (active — all users)
  velofreight: 2,  // VeloFreight TMS (active — users 2,3,4,5,6,7)
  oracle:      3,  // Oracle WMS Migration (active — users 3,4,5,6,8)
  harbourlink: 5,  // HarbourLink EDI (active — user 4)
  fleet:       6,  // Fleet Telemetry MVP (not-started — user 8)
};

const TASK = {
  // FrostLine WMS (project 1)
  rfid:        23,  // RFID Hardware Integration
  coldChain:   24,  // Cold Chain Temperature Monitoring Config
  changeplan:  25,  // Change Management & Training Plan
  erpIface:    26,  // SAP–ERP Interface Build
  sit:         27,  // SIT & Performance Testing
  // VeloFreight TMS (project 2)
  carrierRate: 32,  // Carrier Rating Engine Configuration
  freightAudit:33,  // Freight Audit & Payment Rules Setup
  ediVelo:     35,  // EDI 204/210/214 Carrier Integration
  endUserTrain:36,  // End-User Training – DE Hub
  // Oracle WMS Migration (project 3)
  rfBarcodes:  40,  // RF Gun & Barcode Label Configuration
  erpInt:      41,  // ERP Integration (NetSuite → Oracle WMS)
  uat:         42,  // UAT Scripting & Execution
  // HarbourLink EDI (project 5)
  tradingPart: 49,  // Trading Partner Profile Documentation
};

// ─── Entry builder ───────────────────────────────────────────────────────────

type TS = {
  userId: number;
  weekStart: string;
  status: "Draft" | "Submitted" | "Approved";
  totalHours: number;
  billableHours: number;
  submittedAt?: string;
  submittedBy?: number;
  approvedAt?: string;
  approvedBy?: number;
};

type Entry = {
  userId: number;
  weekStart: string;
  date: string;
  projectId?: number;
  taskId?: number;
  categoryId: number;
  hours: string;
  description: string;
  billable: boolean;
};

function e(
  userId: number,
  weekStart: string,
  date: string,
  hours: number,
  categoryId: number,
  description: string,
  billable: boolean,
  projectId?: number,
  taskId?: number,
): Entry {
  return { userId, weekStart, date, hours: String(hours), categoryId, description, billable, projectId, taskId };
}

// ─── Timesheet definitions ───────────────────────────────────────────────────

const timesheetDefs: TS[] = [
  // ── Week 2026-04-07 — APPROVED ──────────────────────────────────────────
  { userId: U.marcus, weekStart: "2026-04-07", status: "Approved", totalHours: 36, billableHours: 26,
    submittedAt: "2026-04-12T09:00:00Z", submittedBy: U.marcus, approvedAt: "2026-04-13T10:00:00Z", approvedBy: U.admin },
  { userId: U.priya,  weekStart: "2026-04-07", status: "Approved", totalHours: 40, billableHours: 36,
    submittedAt: "2026-04-11T17:30:00Z", submittedBy: U.priya,  approvedAt: "2026-04-13T10:15:00Z", approvedBy: U.marcus },
  { userId: U.daniel, weekStart: "2026-04-07", status: "Approved", totalHours: 38, billableHours: 34,
    submittedAt: "2026-04-12T08:00:00Z", submittedBy: U.daniel, approvedAt: "2026-04-13T10:30:00Z", approvedBy: U.marcus },
  { userId: U.sophie, weekStart: "2026-04-07", status: "Approved", totalHours: 36, billableHours: 28,
    submittedAt: "2026-04-12T16:00:00Z", submittedBy: U.sophie, approvedAt: "2026-04-13T11:00:00Z", approvedBy: U.marcus },
  { userId: U.raj,    weekStart: "2026-04-07", status: "Approved", totalHours: 34, billableHours: 26,
    submittedAt: "2026-04-11T18:00:00Z", submittedBy: U.raj,    approvedAt: "2026-04-13T11:30:00Z", approvedBy: U.marcus },
  { userId: U.leila,  weekStart: "2026-04-07", status: "Approved", totalHours: 32, billableHours: 24,
    submittedAt: "2026-04-12T12:00:00Z", submittedBy: U.leila,  approvedAt: "2026-04-14T09:00:00Z", approvedBy: U.marcus },
  { userId: U.tom,    weekStart: "2026-04-07", status: "Approved", totalHours: 30, billableHours: 26,
    submittedAt: "2026-04-12T17:00:00Z", submittedBy: U.tom,    approvedAt: "2026-04-14T09:30:00Z", approvedBy: U.marcus },
  { userId: U.amara,  weekStart: "2026-04-07", status: "Approved", totalHours: 28, billableHours: 22,
    submittedAt: "2026-04-12T16:30:00Z", submittedBy: U.amara,  approvedAt: "2026-04-14T10:00:00Z", approvedBy: U.marcus },

  // ── Week 2026-04-14 — Tom on PTO (0h); others APPROVED ─────────────────
  { userId: U.marcus, weekStart: "2026-04-14", status: "Approved", totalHours: 34, billableHours: 24,
    submittedAt: "2026-04-19T17:00:00Z", submittedBy: U.marcus, approvedAt: "2026-04-20T10:00:00Z", approvedBy: U.admin },
  { userId: U.priya,  weekStart: "2026-04-14", status: "Approved", totalHours: 40, billableHours: 36,
    submittedAt: "2026-04-19T17:00:00Z", submittedBy: U.priya,  approvedAt: "2026-04-20T10:15:00Z", approvedBy: U.marcus },
  { userId: U.daniel, weekStart: "2026-04-14", status: "Approved", totalHours: 38, billableHours: 34,
    submittedAt: "2026-04-19T18:00:00Z", submittedBy: U.daniel, approvedAt: "2026-04-20T10:30:00Z", approvedBy: U.marcus },
  { userId: U.sophie, weekStart: "2026-04-14", status: "Approved", totalHours: 36, billableHours: 30,
    submittedAt: "2026-04-19T17:30:00Z", submittedBy: U.sophie, approvedAt: "2026-04-20T11:00:00Z", approvedBy: U.marcus },
  { userId: U.raj,    weekStart: "2026-04-14", status: "Approved", totalHours: 34, billableHours: 26,
    submittedAt: "2026-04-20T08:30:00Z", submittedBy: U.raj,    approvedAt: "2026-04-21T09:00:00Z", approvedBy: U.marcus },
  { userId: U.leila,  weekStart: "2026-04-14", status: "Approved", totalHours: 30, billableHours: 22,
    submittedAt: "2026-04-19T16:00:00Z", submittedBy: U.leila,  approvedAt: "2026-04-20T11:30:00Z", approvedBy: U.marcus },
  { userId: U.tom,    weekStart: "2026-04-14", status: "Approved", totalHours: 0,  billableHours: 0,
    submittedAt: "2026-04-19T10:00:00Z", submittedBy: U.tom,    approvedAt: "2026-04-20T12:00:00Z", approvedBy: U.marcus },
  { userId: U.amara,  weekStart: "2026-04-14", status: "Approved", totalHours: 28, billableHours: 22,
    submittedAt: "2026-04-19T17:00:00Z", submittedBy: U.amara,  approvedAt: "2026-04-20T12:30:00Z", approvedBy: U.marcus },

  // ── Week 2026-04-21 — SUBMITTED (awaiting Marcus approval) ─────────────
  { userId: U.marcus, weekStart: "2026-04-21", status: "Submitted", totalHours: 36, billableHours: 26,
    submittedAt: "2026-04-26T17:30:00Z", submittedBy: U.marcus },
  { userId: U.priya,  weekStart: "2026-04-21", status: "Submitted", totalHours: 40, billableHours: 36,
    submittedAt: "2026-04-26T18:00:00Z", submittedBy: U.priya },
  { userId: U.daniel, weekStart: "2026-04-21", status: "Submitted", totalHours: 36, billableHours: 32,
    submittedAt: "2026-04-26T17:00:00Z", submittedBy: U.daniel },
  { userId: U.sophie, weekStart: "2026-04-21", status: "Submitted", totalHours: 36, billableHours: 30,
    submittedAt: "2026-04-26T16:30:00Z", submittedBy: U.sophie },
  { userId: U.raj,    weekStart: "2026-04-21", status: "Submitted", totalHours: 34, billableHours: 26,
    submittedAt: "2026-04-26T17:00:00Z", submittedBy: U.raj },
  { userId: U.leila,  weekStart: "2026-04-21", status: "Submitted", totalHours: 32, billableHours: 24,
    submittedAt: "2026-04-26T16:00:00Z", submittedBy: U.leila },
  { userId: U.tom,    weekStart: "2026-04-21", status: "Submitted", totalHours: 32, billableHours: 28,
    submittedAt: "2026-04-26T17:00:00Z", submittedBy: U.tom },
  { userId: U.amara,  weekStart: "2026-04-21", status: "Submitted", totalHours: 30, billableHours: 22,
    submittedAt: "2026-04-26T16:00:00Z", submittedBy: U.amara },

  // ── Week 2026-04-28 — Daniel on bereavement Mon-Wed (16h only) ─────────
  { userId: U.marcus, weekStart: "2026-04-28", status: "Submitted", totalHours: 34, billableHours: 24,
    submittedAt: "2026-05-03T17:00:00Z", submittedBy: U.marcus },
  { userId: U.priya,  weekStart: "2026-04-28", status: "Submitted", totalHours: 38, billableHours: 34,
    submittedAt: "2026-05-03T17:30:00Z", submittedBy: U.priya },
  { userId: U.daniel, weekStart: "2026-04-28", status: "Draft",     totalHours: 16, billableHours: 14 },
  { userId: U.sophie, weekStart: "2026-04-28", status: "Submitted", totalHours: 36, billableHours: 30,
    submittedAt: "2026-05-03T16:00:00Z", submittedBy: U.sophie },
  { userId: U.raj,    weekStart: "2026-04-28", status: "Submitted", totalHours: 32, billableHours: 26,
    submittedAt: "2026-05-03T18:00:00Z", submittedBy: U.raj },
  { userId: U.leila,  weekStart: "2026-04-28", status: "Submitted", totalHours: 30, billableHours: 22,
    submittedAt: "2026-05-03T16:30:00Z", submittedBy: U.leila },
  { userId: U.tom,    weekStart: "2026-04-28", status: "Draft",     totalHours: 32, billableHours: 28 },
  { userId: U.amara,  weekStart: "2026-04-28", status: "Draft",     totalHours: 28, billableHours: 22 },

  // ── Week 2026-05-05 — Sophie on PTO (0h); others Draft ─────────────────
  { userId: U.marcus, weekStart: "2026-05-05", status: "Draft", totalHours: 34, billableHours: 24 },
  { userId: U.priya,  weekStart: "2026-05-05", status: "Draft", totalHours: 38, billableHours: 34 },
  { userId: U.daniel, weekStart: "2026-05-05", status: "Draft", totalHours: 36, billableHours: 30 },
  { userId: U.sophie, weekStart: "2026-05-05", status: "Draft", totalHours: 0,  billableHours: 0 },
  { userId: U.raj,    weekStart: "2026-05-05", status: "Draft", totalHours: 32, billableHours: 26 },
  { userId: U.leila,  weekStart: "2026-05-05", status: "Draft", totalHours: 30, billableHours: 22 },
  { userId: U.tom,    weekStart: "2026-05-05", status: "Draft", totalHours: 30, billableHours: 26 },
  { userId: U.amara,  weekStart: "2026-05-05", status: "Draft", totalHours: 28, billableHours: 22 },

  // ── Week 2026-05-12 — Current week; partial hours only (Mon–Thu so far) ─
  { userId: U.marcus, weekStart: "2026-05-12", status: "Draft", totalHours: 22, billableHours: 16 },
  { userId: U.priya,  weekStart: "2026-05-12", status: "Draft", totalHours: 26, billableHours: 22 },
  { userId: U.daniel, weekStart: "2026-05-12", status: "Draft", totalHours: 24, billableHours: 20 },
  { userId: U.sophie, weekStart: "2026-05-12", status: "Draft", totalHours: 20, billableHours: 16 },
  { userId: U.raj,    weekStart: "2026-05-12", status: "Draft", totalHours: 22, billableHours: 18 },
  { userId: U.leila,  weekStart: "2026-05-12", status: "Draft", totalHours: 20, billableHours: 16 },
  { userId: U.tom,    weekStart: "2026-05-12", status: "Draft", totalHours: 18, billableHours: 16 },
  { userId: U.amara,  weekStart: "2026-05-12", status: "Draft", totalHours: 16, billableHours: 12 },
];

// ─── Time entry definitions ───────────────────────────────────────────────────
// Format: e(userId, weekStart, date, hours, categoryId, description, billable, projectId?, taskId?)

const entryDefs: Entry[] = [

  // ════════════════════════════════════════════════════════════════════════════
  // MARCUS (U.marcus = 2) — PM / Engagement Manager across P1 + P2
  // ════════════════════════════════════════════════════════════════════════════

  // Week 2026-04-07
  e(U.marcus,"2026-04-07","2026-04-07",4,CAT.billable,"FrostLine WMS — weekly project status review & risk update",true,PROJ.frostline),
  e(U.marcus,"2026-04-07","2026-04-07",2,CAT.meetings,"All-hands delivery sync",false),
  e(U.marcus,"2026-04-07","2026-04-08",3,CAT.billable,"VeloFreight TMS — carrier onboarding progress session",true,PROJ.velofreight),
  e(U.marcus,"2026-04-07","2026-04-08",2,CAT.admin,"Resource forecast & capacity planning for Q2",false),
  e(U.marcus,"2026-04-07","2026-04-09",4,CAT.billable,"FrostLine WMS — go-live readiness scorecard review",true,PROJ.frostline),
  e(U.marcus,"2026-04-07","2026-04-09",2,CAT.meetings,"Steering committee prep with Sarah Chen",false),
  e(U.marcus,"2026-04-07","2026-04-10",4,CAT.billable,"VeloFreight TMS — milestone sign-off with TechCo stakeholders",true,PROJ.velofreight),
  e(U.marcus,"2026-04-07","2026-04-10",2,CAT.presales,"Ironvale Mining pre-sales scoping call",false),
  e(U.marcus,"2026-04-07","2026-04-11",4,CAT.billable,"FrostLine WMS — change control board meeting",true,PROJ.frostline),
  e(U.marcus,"2026-04-07","2026-04-11",1,CAT.admin,"Timesheets review & approval queue clearance",false),
  e(U.marcus,"2026-04-07","2026-04-11",2,CAT.presales,"Redwood Education proposal review",false),

  // Week 2026-04-14
  e(U.marcus,"2026-04-14","2026-04-14",4,CAT.billable,"FrostLine WMS — SIT planning session with Priya & Tom",true,PROJ.frostline),
  e(U.marcus,"2026-04-14","2026-04-14",2,CAT.meetings,"Executive delivery update",false),
  e(U.marcus,"2026-04-14","2026-04-15",3,CAT.billable,"VeloFreight TMS — carrier EDI integration review",true,PROJ.velofreight),
  e(U.marcus,"2026-04-14","2026-04-15",3,CAT.presales,"Fortuna Insurance RFP response session",false),
  e(U.marcus,"2026-04-14","2026-04-16",4,CAT.billable,"FrostLine WMS — CMP review with Leila",true,PROJ.frostline),
  e(U.marcus,"2026-04-14","2026-04-16",2,CAT.meetings,"PMO weekly ops review",false),
  e(U.marcus,"2026-04-14","2026-04-17",5,CAT.billable,"VeloFreight TMS — budget vs actuals reconciliation",true,PROJ.velofreight),
  e(U.marcus,"2026-04-14","2026-04-17",2,CAT.admin,"Invoice review for Meridian account",false),
  e(U.marcus,"2026-04-14","2026-04-18",4,CAT.billable,"FrostLine WMS — stakeholder Q&A session",true,PROJ.frostline),
  e(U.marcus,"2026-04-14","2026-04-18",1,CAT.admin,"Weekly reporting pack finalisation",false),

  // Week 2026-04-21
  e(U.marcus,"2026-04-21","2026-04-21",4,CAT.billable,"FrostLine WMS — SIT kick-off with QA team",true,PROJ.frostline),
  e(U.marcus,"2026-04-21","2026-04-21",2,CAT.meetings,"Delivery leadership sync",false),
  e(U.marcus,"2026-04-21","2026-04-22",4,CAT.billable,"VeloFreight TMS — freight audit rules UAT sign-off",true,PROJ.velofreight),
  e(U.marcus,"2026-04-21","2026-04-22",2,CAT.admin,"Resource allocation updates for May",false),
  e(U.marcus,"2026-04-21","2026-04-23",4,CAT.billable,"FrostLine WMS — RFID go-live readiness",true,PROJ.frostline),
  e(U.marcus,"2026-04-21","2026-04-23",1,CAT.meetings,"Retrospective — HarbourLink EDI Phase 1",false),
  e(U.marcus,"2026-04-21","2026-04-24",4,CAT.billable,"VeloFreight TMS — training plan review with Leila",true,PROJ.velofreight),
  e(U.marcus,"2026-04-21","2026-04-24",2,CAT.presales,"Coastal Logistics opportunity scoping",false),
  e(U.marcus,"2026-04-21","2026-04-25",5,CAT.billable,"FrostLine WMS — change log & issue register update",true,PROJ.frostline),
  e(U.marcus,"2026-04-21","2026-04-25",1,CAT.admin,"Skills matrix review for Q2 hiring",false),

  // Week 2026-04-28
  e(U.marcus,"2026-04-28","2026-04-28",4,CAT.billable,"FrostLine WMS — cold chain config sign-off",true,PROJ.frostline),
  e(U.marcus,"2026-04-28","2026-04-28",2,CAT.meetings,"Delivery governance board",false),
  e(U.marcus,"2026-04-28","2026-04-29",4,CAT.billable,"VeloFreight TMS — stage-gate review",true,PROJ.velofreight),
  e(U.marcus,"2026-04-28","2026-04-29",2,CAT.presales,"New prospect qualification call",false),
  e(U.marcus,"2026-04-28","2026-04-30",4,CAT.billable,"FrostLine WMS — go-live cutover checklist",true,PROJ.frostline),
  e(U.marcus,"2026-04-28","2026-04-30",2,CAT.meetings,"All-hands project sync (standing)",false),
  e(U.marcus,"2026-04-28","2026-05-01",5,CAT.billable,"VeloFreight TMS — project close-out tasks",true,PROJ.velofreight),
  e(U.marcus,"2026-04-28","2026-05-01",2,CAT.admin,"Monthly capacity & utilisation report",false),
  e(U.marcus,"2026-04-28","2026-05-02",3,CAT.billable,"FrostLine WMS — hypercare handover pack",true,PROJ.frostline),

  // Week 2026-05-05
  e(U.marcus,"2026-05-05","2026-05-05",4,CAT.billable,"FrostLine WMS — go-live support (hypercare day 1)",true,PROJ.frostline),
  e(U.marcus,"2026-05-05","2026-05-05",2,CAT.meetings,"Delivery ops weekly sync",false),
  e(U.marcus,"2026-05-05","2026-05-06",3,CAT.billable,"VeloFreight TMS — lessons-learned workshop",true,PROJ.velofreight),
  e(U.marcus,"2026-05-05","2026-05-06",3,CAT.presales,"Fleet Telemetry client update call",false),
  e(U.marcus,"2026-05-05","2026-05-07",4,CAT.billable,"FrostLine WMS — post-live defect triage",true,PROJ.frostline),
  e(U.marcus,"2026-05-05","2026-05-07",2,CAT.admin,"Budget reconciliation Q1 actuals",false),
  e(U.marcus,"2026-05-05","2026-05-08",5,CAT.billable,"VeloFreight TMS — final invoice sign-off",true,PROJ.velofreight),
  e(U.marcus,"2026-05-05","2026-05-08",2,CAT.meetings,"Steering committee — FrostLine hypercare status",false),
  e(U.marcus,"2026-05-05","2026-05-09",4,CAT.billable,"FrostLine WMS — hypercare escalation review",true,PROJ.frostline),
  e(U.marcus,"2026-05-05","2026-05-09",1,CAT.admin,"Team PTO approvals & schedule updates",false),

  // Week 2026-05-12 (current — Mon-Thu only)
  e(U.marcus,"2026-05-12","2026-05-12",4,CAT.billable,"FrostLine WMS — week 2 hypercare standup",true,PROJ.frostline),
  e(U.marcus,"2026-05-12","2026-05-12",2,CAT.meetings,"Weekly delivery leadership call",false),
  e(U.marcus,"2026-05-12","2026-05-13",4,CAT.billable,"VeloFreight TMS — final project close meeting",true,PROJ.velofreight),
  e(U.marcus,"2026-05-12","2026-05-13",2,CAT.admin,"Q2 resource plan submission",false),
  e(U.marcus,"2026-05-12","2026-05-14",4,CAT.billable,"FrostLine WMS — handover to support team",true,PROJ.frostline),
  e(U.marcus,"2026-05-12","2026-05-14",2,CAT.presales,"New account scoping session",false),
  e(U.marcus,"2026-05-12","2026-05-15",4,CAT.billable,"FrostLine WMS — hypercare sign-off with client",true,PROJ.frostline),

  // ════════════════════════════════════════════════════════════════════════════
  // PRIYA (U.priya = 3) — Solutions Architect across P1, P2, P3
  // ════════════════════════════════════════════════════════════════════════════

  // Week 2026-04-07
  e(U.priya,"2026-04-07","2026-04-07",4,CAT.billable,"FrostLine — RFID integration architecture review",true,PROJ.frostline,TASK.rfid),
  e(U.priya,"2026-04-07","2026-04-07",3,CAT.billable,"Oracle WMS — NetSuite ERP integration design session",true,PROJ.oracle,TASK.erpInt),
  e(U.priya,"2026-04-07","2026-04-08",5,CAT.billable,"Oracle WMS — integration mapping document update",true,PROJ.oracle,TASK.erpInt),
  e(U.priya,"2026-04-07","2026-04-08",2,CAT.meetings,"Architecture guild — API standards review",false),
  e(U.priya,"2026-04-07","2026-04-09",4,CAT.billable,"FrostLine — cold chain monitoring config spec",true,PROJ.frostline,TASK.coldChain),
  e(U.priya,"2026-04-07","2026-04-09",3,CAT.billable,"Oracle WMS — UAT scenario review with Fatima",true,PROJ.oracle,TASK.erpInt),
  e(U.priya,"2026-04-07","2026-04-10",4,CAT.billable,"VeloFreight — carrier rating engine design",true,PROJ.velofreight,TASK.carrierRate),
  e(U.priya,"2026-04-07","2026-04-10",2,CAT.meetings,"Solution design workshop with Daniel & Raj",false),
  e(U.priya,"2026-04-07","2026-04-11",4,CAT.billable,"Oracle WMS — ERP interface test plan",true,PROJ.oracle,TASK.erpInt),
  e(U.priya,"2026-04-07","2026-04-11",4,CAT.billable,"FrostLine — technical architecture sign-off",true,PROJ.frostline,TASK.rfid),

  // Week 2026-04-14
  e(U.priya,"2026-04-14","2026-04-14",5,CAT.billable,"Oracle WMS — ERP integration unit test execution",true,PROJ.oracle,TASK.erpInt),
  e(U.priya,"2026-04-14","2026-04-14",3,CAT.billable,"FrostLine — cold chain alert thresholds configuration",true,PROJ.frostline,TASK.coldChain),
  e(U.priya,"2026-04-14","2026-04-15",5,CAT.billable,"Oracle WMS — RF gun configuration validation",true,PROJ.oracle,TASK.rfBarcodes),
  e(U.priya,"2026-04-14","2026-04-15",2,CAT.meetings,"Architecture decision record (ADR) session",false),
  e(U.priya,"2026-04-14","2026-04-16",4,CAT.billable,"FrostLine — RFID middleware integration testing",true,PROJ.frostline,TASK.rfid),
  e(U.priya,"2026-04-14","2026-04-16",3,CAT.billable,"VeloFreight — carrier API design review",true,PROJ.velofreight,TASK.carrierRate),
  e(U.priya,"2026-04-14","2026-04-17",5,CAT.billable,"Oracle WMS — ERP integration regression test",true,PROJ.oracle,TASK.erpInt),
  e(U.priya,"2026-04-14","2026-04-17",2,CAT.meetings,"Sprint review — Oracle WMS",false),
  e(U.priya,"2026-04-14","2026-04-18",5,CAT.billable,"FrostLine — end-to-end flow validation",true,PROJ.frostline,TASK.coldChain),
  e(U.priya,"2026-04-14","2026-04-18",3,CAT.billable,"Oracle WMS — barcode label config finalisation",true,PROJ.oracle,TASK.rfBarcodes),

  // Week 2026-04-21
  e(U.priya,"2026-04-21","2026-04-21",5,CAT.billable,"Oracle WMS — UAT script execution with Tom",true,PROJ.oracle,TASK.uat),
  e(U.priya,"2026-04-21","2026-04-21",3,CAT.billable,"FrostLine — RFID reader performance benchmarking",true,PROJ.frostline,TASK.rfid),
  e(U.priya,"2026-04-21","2026-04-22",4,CAT.billable,"Oracle WMS — integration defect triage",true,PROJ.oracle,TASK.erpInt),
  e(U.priya,"2026-04-21","2026-04-22",4,CAT.billable,"VeloFreight — carrier rating algorithm validation",true,PROJ.velofreight,TASK.carrierRate),
  e(U.priya,"2026-04-21","2026-04-23",5,CAT.billable,"FrostLine — cold chain sensor calibration review",true,PROJ.frostline,TASK.coldChain),
  e(U.priya,"2026-04-21","2026-04-23",2,CAT.meetings,"Architecture team standup",false),
  e(U.priya,"2026-04-21","2026-04-24",5,CAT.billable,"Oracle WMS — ERP integration sign-off docs",true,PROJ.oracle,TASK.erpInt),
  e(U.priya,"2026-04-21","2026-04-24",2,CAT.meetings,"PMO project review presentation",false),
  e(U.priya,"2026-04-21","2026-04-25",5,CAT.billable,"FrostLine — SIT preparation with Tom",true,PROJ.frostline,TASK.sit),
  e(U.priya,"2026-04-21","2026-04-25",2,CAT.training,"SAP EWM advanced workshop — self-study",false),

  // Week 2026-04-28
  e(U.priya,"2026-04-28","2026-04-28",5,CAT.billable,"Oracle WMS — UAT issue resolution",true,PROJ.oracle,TASK.uat),
  e(U.priya,"2026-04-28","2026-04-28",3,CAT.billable,"FrostLine — SIT phase 1 execution",true,PROJ.frostline,TASK.sit),
  e(U.priya,"2026-04-28","2026-04-29",5,CAT.billable,"Oracle WMS — ERP cutover prep",true,PROJ.oracle,TASK.erpInt),
  e(U.priya,"2026-04-28","2026-04-29",2,CAT.meetings,"Cross-project architecture governance call",false),
  e(U.priya,"2026-04-28","2026-04-30",5,CAT.billable,"FrostLine — SIT defect review with Marcus",true,PROJ.frostline,TASK.sit),
  e(U.priya,"2026-04-28","2026-04-30",2,CAT.billable,"VeloFreight — carrier integration close-out review",true,PROJ.velofreight,TASK.carrierRate),
  e(U.priya,"2026-04-28","2026-05-01",5,CAT.billable,"Oracle WMS — pre-go-live architecture sign-off",true,PROJ.oracle,TASK.erpInt),
  e(U.priya,"2026-04-28","2026-05-01",2,CAT.meetings,"Tech leadership forum",false),
  e(U.priya,"2026-04-28","2026-05-02",5,CAT.billable,"FrostLine — SIT completion and sign-off",true,PROJ.frostline,TASK.sit),

  // Week 2026-05-05
  e(U.priya,"2026-05-05","2026-05-05",5,CAT.billable,"Oracle WMS — go-live cutover support",true,PROJ.oracle,TASK.erpInt),
  e(U.priya,"2026-05-05","2026-05-05",3,CAT.billable,"FrostLine — hypercare support (day 1)",true,PROJ.frostline,TASK.sit),
  e(U.priya,"2026-05-05","2026-05-06",5,CAT.billable,"Oracle WMS — post-go-live performance monitoring",true,PROJ.oracle,TASK.erpInt),
  e(U.priya,"2026-05-05","2026-05-06",2,CAT.meetings,"Delivery retrospective — FrostLine SIT",false),
  e(U.priya,"2026-05-05","2026-05-07",5,CAT.billable,"FrostLine — hypercare defect triage",true,PROJ.frostline,TASK.rfid),
  e(U.priya,"2026-05-05","2026-05-07",2,CAT.billable,"Oracle WMS — UAT final sign-off with client",true,PROJ.oracle,TASK.uat),
  e(U.priya,"2026-05-05","2026-05-08",4,CAT.billable,"FrostLine — hypercare stabilisation session",true,PROJ.frostline,TASK.coldChain),
  e(U.priya,"2026-05-05","2026-05-08",2,CAT.training,"Cloud architecture certification prep",false),
  e(U.priya,"2026-05-05","2026-05-09",5,CAT.billable,"Oracle WMS — lessons learned document",true,PROJ.oracle,TASK.erpInt),
  e(U.priya,"2026-05-05","2026-05-09",2,CAT.meetings,"Architecture chapter meeting",false),

  // Week 2026-05-12 (Mon-Thu)
  e(U.priya,"2026-05-12","2026-05-12",5,CAT.billable,"Oracle WMS — ERP integration post-go-live monitoring",true,PROJ.oracle,TASK.erpInt),
  e(U.priya,"2026-05-12","2026-05-12",2,CAT.meetings,"Weekly architecture sync",false),
  e(U.priya,"2026-05-12","2026-05-13",5,CAT.billable,"FrostLine — hypercare support (week 2)",true,PROJ.frostline,TASK.rfid),
  e(U.priya,"2026-05-12","2026-05-13",2,CAT.billable,"Oracle WMS — performance tuning session",true,PROJ.oracle,TASK.erpInt),
  e(U.priya,"2026-05-12","2026-05-14",5,CAT.billable,"FrostLine — RFID final acceptance testing",true,PROJ.frostline,TASK.rfid),
  e(U.priya,"2026-05-12","2026-05-14",2,CAT.meetings,"Solution architecture forum",false),
  e(U.priya,"2026-05-12","2026-05-15",5,CAT.billable,"Oracle WMS — handover to support",true,PROJ.oracle,TASK.erpInt),

  // ════════════════════════════════════════════════════════════════════════════
  // DANIEL (U.daniel = 4) — Integration Engineer across P1, P3, P5
  // ════════════════════════════════════════════════════════════════════════════

  // Week 2026-04-07
  e(U.daniel,"2026-04-07","2026-04-07",5,CAT.billable,"FrostLine — SAP-ERP interface build (IDOC mapping)",true,PROJ.frostline,TASK.erpIface),
  e(U.daniel,"2026-04-07","2026-04-07",2,CAT.billable,"HarbourLink — AS2 connectivity setup",true,PROJ.harbourlink,TASK.tradingPart),
  e(U.daniel,"2026-04-07","2026-04-08",5,CAT.billable,"FrostLine — RFC interface unit testing",true,PROJ.frostline,TASK.erpIface),
  e(U.daniel,"2026-04-07","2026-04-08",3,CAT.billable,"Oracle WMS — NetSuite API integration build",true,PROJ.oracle,TASK.erpInt),
  e(U.daniel,"2026-04-07","2026-04-09",5,CAT.billable,"HarbourLink — EDI 315/322 message mapping",true,PROJ.harbourlink,TASK.tradingPart),
  e(U.daniel,"2026-04-07","2026-04-09",2,CAT.meetings,"Daily integration standup",false),
  e(U.daniel,"2026-04-07","2026-04-10",5,CAT.billable,"FrostLine — ERP interface end-to-end test",true,PROJ.frostline,TASK.erpIface),
  e(U.daniel,"2026-04-07","2026-04-10",2,CAT.billable,"Oracle WMS — inventory sync API build",true,PROJ.oracle,TASK.erpInt),
  e(U.daniel,"2026-04-07","2026-04-11",4,CAT.billable,"HarbourLink — VAN connectivity test with trading partner",true,PROJ.harbourlink,TASK.tradingPart),
  e(U.daniel,"2026-04-07","2026-04-11",2,CAT.meetings,"Sprint review — integration track",false),

  // Week 2026-04-14
  e(U.daniel,"2026-04-14","2026-04-14",6,CAT.billable,"FrostLine — SAP BAPI call testing & error handling",true,PROJ.frostline,TASK.erpIface),
  e(U.daniel,"2026-04-14","2026-04-14",2,CAT.billable,"Oracle WMS — NetSuite item master sync build",true,PROJ.oracle,TASK.erpInt),
  e(U.daniel,"2026-04-14","2026-04-15",5,CAT.billable,"HarbourLink — AS2 end-to-end test with carrier",true,PROJ.harbourlink,TASK.tradingPart),
  e(U.daniel,"2026-04-14","2026-04-15",3,CAT.billable,"FrostLine — RFID middleware integration",true,PROJ.frostline,TASK.rfid),
  e(U.daniel,"2026-04-14","2026-04-16",6,CAT.billable,"Oracle WMS — API integration defect fixes",true,PROJ.oracle,TASK.erpInt),
  e(U.daniel,"2026-04-14","2026-04-16",2,CAT.meetings,"Integration daily standup + backlog grooming",false),
  e(U.daniel,"2026-04-14","2026-04-17",5,CAT.billable,"FrostLine — interface performance test results",true,PROJ.frostline,TASK.erpIface),
  e(U.daniel,"2026-04-14","2026-04-17",3,CAT.billable,"HarbourLink — trading partner profile documentation",true,PROJ.harbourlink,TASK.tradingPart),
  e(U.daniel,"2026-04-14","2026-04-18",6,CAT.billable,"Oracle WMS — ERP sync regression suite",true,PROJ.oracle,TASK.erpInt),

  // Week 2026-04-21
  e(U.daniel,"2026-04-21","2026-04-21",5,CAT.billable,"FrostLine — SIT integration scenarios execution",true,PROJ.frostline,TASK.sit),
  e(U.daniel,"2026-04-21","2026-04-21",3,CAT.billable,"Oracle WMS — inventory sync UAT support",true,PROJ.oracle,TASK.erpInt),
  e(U.daniel,"2026-04-21","2026-04-22",4,CAT.billable,"HarbourLink — carrier acknowledgement build",true,PROJ.harbourlink,TASK.tradingPart),
  e(U.daniel,"2026-04-21","2026-04-22",4,CAT.billable,"FrostLine — ERP interface defect resolution",true,PROJ.frostline,TASK.erpIface),
  e(U.daniel,"2026-04-21","2026-04-23",5,CAT.billable,"Oracle WMS — NetSuite order integration testing",true,PROJ.oracle,TASK.erpInt),
  e(U.daniel,"2026-04-21","2026-04-23",2,CAT.meetings,"Integration chapter retrospective",false),
  e(U.daniel,"2026-04-21","2026-04-24",5,CAT.billable,"FrostLine — SAP interface smoke test",true,PROJ.frostline,TASK.erpIface),
  e(U.daniel,"2026-04-21","2026-04-24",2,CAT.billable,"HarbourLink — EDI 214 acknowledgement test",true,PROJ.harbourlink,TASK.tradingPart),
  e(U.daniel,"2026-04-21","2026-04-25",4,CAT.billable,"Oracle WMS — ERP integration code review",true,PROJ.oracle,TASK.erpInt),
  e(U.daniel,"2026-04-21","2026-04-25",2,CAT.meetings,"Cross-team integration forum",false),

  // Week 2026-04-28 — Daniel on bereavement Mon-Wed (Thu+Fri only)
  e(U.daniel,"2026-04-28","2026-05-01",8,CAT.billable,"Oracle WMS — ERP integration regression (returning from leave)",true,PROJ.oracle,TASK.erpInt),
  e(U.daniel,"2026-04-28","2026-05-02",6,CAT.billable,"FrostLine — SIT defect fixes",true,PROJ.frostline,TASK.sit),

  // Week 2026-05-05
  e(U.daniel,"2026-05-05","2026-05-05",5,CAT.billable,"FrostLine — hypercare integration support",true,PROJ.frostline,TASK.erpIface),
  e(U.daniel,"2026-05-05","2026-05-05",3,CAT.billable,"Oracle WMS — ERP go-live support",true,PROJ.oracle,TASK.erpInt),
  e(U.daniel,"2026-05-05","2026-05-06",4,CAT.billable,"HarbourLink — EDI mapping final validation",true,PROJ.harbourlink,TASK.tradingPart),
  e(U.daniel,"2026-05-05","2026-05-06",4,CAT.billable,"FrostLine — SAP RFC monitoring setup",true,PROJ.frostline,TASK.erpIface),
  e(U.daniel,"2026-05-05","2026-05-07",5,CAT.billable,"Oracle WMS — ERP post-go-live defect resolution",true,PROJ.oracle,TASK.erpInt),
  e(U.daniel,"2026-05-05","2026-05-07",2,CAT.meetings,"Integration team standup & sprint planning",false),
  e(U.daniel,"2026-05-05","2026-05-08",5,CAT.billable,"FrostLine — hypercare ERP integration monitoring",true,PROJ.frostline,TASK.erpIface),
  e(U.daniel,"2026-05-05","2026-05-08",2,CAT.meetings,"Sprint review — integration track",false),
  e(U.daniel,"2026-05-05","2026-05-09",5,CAT.billable,"Oracle WMS — handover documentation",true,PROJ.oracle,TASK.erpInt),
  e(U.daniel,"2026-05-05","2026-05-09",1,CAT.admin,"Timesheet catch-up after leave",false),

  // Week 2026-05-12 (Mon-Thu)
  e(U.daniel,"2026-05-12","2026-05-12",5,CAT.billable,"FrostLine — ERP integration monitoring dashboard",true,PROJ.frostline,TASK.erpIface),
  e(U.daniel,"2026-05-12","2026-05-12",2,CAT.meetings,"Integration chapter weekly sync",false),
  e(U.daniel,"2026-05-12","2026-05-13",5,CAT.billable,"HarbourLink — EDI 990 carrier response build",true,PROJ.harbourlink,TASK.tradingPart),
  e(U.daniel,"2026-05-12","2026-05-13",2,CAT.billable,"Oracle WMS — post-go-live integration triage",true,PROJ.oracle,TASK.erpInt),
  e(U.daniel,"2026-05-12","2026-05-14",5,CAT.billable,"FrostLine — interface performance report",true,PROJ.frostline,TASK.erpIface),
  e(U.daniel,"2026-05-12","2026-05-14",2,CAT.meetings,"Sprint retrospective",false),
  e(U.daniel,"2026-05-12","2026-05-15",5,CAT.billable,"Oracle WMS — ERP handover to support team",true,PROJ.oracle,TASK.erpInt),

  // ════════════════════════════════════════════════════════════════════════════
  // SOPHIE (U.sophie = 5) — Business Analyst across P1, P2, P3
  // ════════════════════════════════════════════════════════════════════════════

  // Week 2026-04-07
  e(U.sophie,"2026-04-07","2026-04-07",4,CAT.billable,"FrostLine — change management training plan draft",true,PROJ.frostline,TASK.changeplan),
  e(U.sophie,"2026-04-07","2026-04-07",2,CAT.billable,"VeloFreight — carrier rating requirements review",true,PROJ.velofreight,TASK.freightAudit),
  e(U.sophie,"2026-04-07","2026-04-08",4,CAT.billable,"FrostLine — end-user training curriculum design",true,PROJ.frostline,TASK.changeplan),
  e(U.sophie,"2026-04-07","2026-04-08",2,CAT.meetings,"Business analysis chapter meeting",false),
  e(U.sophie,"2026-04-07","2026-04-09",4,CAT.billable,"VeloFreight — freight audit rules documentation",true,PROJ.velofreight,TASK.freightAudit),
  e(U.sophie,"2026-04-07","2026-04-09",3,CAT.billable,"Oracle WMS — UAT scenario authoring",true,PROJ.oracle,TASK.uat),
  e(U.sophie,"2026-04-07","2026-04-10",4,CAT.billable,"FrostLine — business process change impact analysis",true,PROJ.frostline,TASK.changeplan),
  e(U.sophie,"2026-04-07","2026-04-10",2,CAT.meetings,"Stakeholder interview — FrostLine operations manager",false),
  e(U.sophie,"2026-04-07","2026-04-11",4,CAT.billable,"VeloFreight — carrier portal user story review",true,PROJ.velofreight,TASK.freightAudit),
  e(U.sophie,"2026-04-07","2026-04-11",2,CAT.training,"BPMN modelling refresher",false),
  e(U.sophie,"2026-04-07","2026-04-11",3,CAT.billable,"Oracle WMS — UAT defect walkthrough",true,PROJ.oracle,TASK.uat),

  // Week 2026-04-14
  e(U.sophie,"2026-04-14","2026-04-14",4,CAT.billable,"FrostLine — training material authoring (warehouse ops)",true,PROJ.frostline,TASK.changeplan),
  e(U.sophie,"2026-04-14","2026-04-14",3,CAT.billable,"VeloFreight — freight audit business rules update",true,PROJ.velofreight,TASK.freightAudit),
  e(U.sophie,"2026-04-14","2026-04-15",4,CAT.billable,"Oracle WMS — RF device UAT test execution",true,PROJ.oracle,TASK.uat),
  e(U.sophie,"2026-04-14","2026-04-15",3,CAT.billable,"FrostLine — change readiness survey analysis",true,PROJ.frostline,TASK.changeplan),
  e(U.sophie,"2026-04-14","2026-04-16",4,CAT.billable,"VeloFreight — carrier onboarding training guide",true,PROJ.velofreight,TASK.freightAudit),
  e(U.sophie,"2026-04-14","2026-04-16",2,CAT.meetings,"BA chapter weekly sync",false),
  e(U.sophie,"2026-04-14","2026-04-17",4,CAT.billable,"FrostLine — training session with warehouse supervisors",true,PROJ.frostline,TASK.changeplan),
  e(U.sophie,"2026-04-14","2026-04-17",3,CAT.billable,"Oracle WMS — UAT defect triage with Priya",true,PROJ.oracle,TASK.uat),
  e(U.sophie,"2026-04-14","2026-04-18",4,CAT.billable,"VeloFreight — go-live readiness assessment report",true,PROJ.velofreight,TASK.freightAudit),
  e(U.sophie,"2026-04-14","2026-04-18",2,CAT.meetings,"Sprint review presentation",false),

  // Week 2026-04-21
  e(U.sophie,"2026-04-21","2026-04-21",4,CAT.billable,"FrostLine — train-the-trainer session (supervisors)",true,PROJ.frostline,TASK.changeplan),
  e(U.sophie,"2026-04-21","2026-04-21",3,CAT.billable,"Oracle WMS — final UAT sign-off session",true,PROJ.oracle,TASK.uat),
  e(U.sophie,"2026-04-21","2026-04-22",4,CAT.billable,"VeloFreight — SIT support for freight audit module",true,PROJ.velofreight,TASK.freightAudit),
  e(U.sophie,"2026-04-21","2026-04-22",3,CAT.billable,"FrostLine — change champion network session",true,PROJ.frostline,TASK.changeplan),
  e(U.sophie,"2026-04-21","2026-04-23",4,CAT.billable,"Oracle WMS — UAT closure report",true,PROJ.oracle,TASK.uat),
  e(U.sophie,"2026-04-21","2026-04-23",2,CAT.meetings,"Lessons learned — discovery phase",false),
  e(U.sophie,"2026-04-21","2026-04-24",4,CAT.billable,"FrostLine — go-live user readiness checklist",true,PROJ.frostline,TASK.changeplan),
  e(U.sophie,"2026-04-21","2026-04-24",3,CAT.billable,"VeloFreight — training pack for DE hub users",true,PROJ.velofreight,TASK.freightAudit),
  e(U.sophie,"2026-04-21","2026-04-25",4,CAT.billable,"Oracle WMS — post-UAT stakeholder sign-off",true,PROJ.oracle,TASK.uat),
  e(U.sophie,"2026-04-21","2026-04-25",2,CAT.meetings,"PMO weekly report",false),

  // Week 2026-04-28
  e(U.sophie,"2026-04-28","2026-04-28",4,CAT.billable,"FrostLine — hypercare user support plan",true,PROJ.frostline,TASK.changeplan),
  e(U.sophie,"2026-04-28","2026-04-28",3,CAT.billable,"VeloFreight — carrier training delivery (session 1)",true,PROJ.velofreight,TASK.endUserTrain),
  e(U.sophie,"2026-04-28","2026-04-29",4,CAT.billable,"Oracle WMS — go-live prep documentation",true,PROJ.oracle,TASK.uat),
  e(U.sophie,"2026-04-28","2026-04-29",3,CAT.billable,"FrostLine — super user training delivery",true,PROJ.frostline,TASK.changeplan),
  e(U.sophie,"2026-04-28","2026-04-30",4,CAT.billable,"VeloFreight — carrier training (session 2)",true,PROJ.velofreight,TASK.endUserTrain),
  e(U.sophie,"2026-04-28","2026-04-30",2,CAT.meetings,"BA team retrospective",false),
  e(U.sophie,"2026-04-28","2026-05-01",4,CAT.billable,"FrostLine — end-user training wrap-up",true,PROJ.frostline,TASK.changeplan),
  e(U.sophie,"2026-04-28","2026-05-01",3,CAT.billable,"Oracle WMS — cutover training brief",true,PROJ.oracle,TASK.uat),
  e(U.sophie,"2026-04-28","2026-05-02",4,CAT.billable,"VeloFreight — post-training feedback analysis",true,PROJ.velofreight,TASK.endUserTrain),
  e(U.sophie,"2026-04-28","2026-05-02",2,CAT.meetings,"Sprint planning — May",false),

  // Week 2026-05-05 — Sophie on PTO (no entries)

  // Week 2026-05-12 (Mon-Thu — returning from PTO)
  e(U.sophie,"2026-05-12","2026-05-12",4,CAT.billable,"FrostLine — hypercare support (post-PTO catch-up)",true,PROJ.frostline,TASK.changeplan),
  e(U.sophie,"2026-05-12","2026-05-12",2,CAT.meetings,"BA team weekly sync",false),
  e(U.sophie,"2026-05-12","2026-05-13",4,CAT.billable,"VeloFreight — project close-out user documentation",true,PROJ.velofreight,TASK.endUserTrain),
  e(U.sophie,"2026-05-12","2026-05-13",2,CAT.meetings,"Handover meeting — VeloFreight",false),
  e(U.sophie,"2026-05-12","2026-05-14",4,CAT.billable,"FrostLine — hypercare post-go-live report",true,PROJ.frostline,TASK.changeplan),
  e(U.sophie,"2026-05-12","2026-05-14",2,CAT.meetings,"Sprint review",false),
  e(U.sophie,"2026-05-12","2026-05-15",4,CAT.billable,"Oracle WMS — final BA handover notes",true,PROJ.oracle,TASK.uat),

  // ════════════════════════════════════════════════════════════════════════════
  // RAJ (U.raj = 6) — Data Engineer across P1, P2, P3
  // ════════════════════════════════════════════════════════════════════════════

  // Week 2026-04-07
  e(U.raj,"2026-04-07","2026-04-07",4,CAT.billable,"FrostLine — data migration validation scripts",true,PROJ.frostline),
  e(U.raj,"2026-04-07","2026-04-07",3,CAT.billable,"Oracle WMS — data quality assessment",true,PROJ.oracle),
  e(U.raj,"2026-04-07","2026-04-08",4,CAT.billable,"VeloFreight — carrier master data reconciliation",true,PROJ.velofreight),
  e(U.raj,"2026-04-07","2026-04-08",2,CAT.meetings,"Data team standup",false),
  e(U.raj,"2026-04-07","2026-04-09",4,CAT.billable,"FrostLine — inventory data cleanse & load",true,PROJ.frostline),
  e(U.raj,"2026-04-07","2026-04-09",3,CAT.billable,"Oracle WMS — stock balance migration validation",true,PROJ.oracle),
  e(U.raj,"2026-04-07","2026-04-10",4,CAT.billable,"VeloFreight — freight lane data audit",true,PROJ.velofreight),
  e(U.raj,"2026-04-07","2026-04-10",2,CAT.meetings,"Analytics forum",false),
  e(U.raj,"2026-04-07","2026-04-11",4,CAT.billable,"FrostLine — data migration run & reconciliation",true,PROJ.frostline),
  e(U.raj,"2026-04-07","2026-04-11",2,CAT.admin,"Data governance report update",false),

  // Week 2026-04-14
  e(U.raj,"2026-04-14","2026-04-14",5,CAT.billable,"Oracle WMS — data migration test run 1",true,PROJ.oracle),
  e(U.raj,"2026-04-14","2026-04-14",3,CAT.billable,"FrostLine — inventory delta load",true,PROJ.frostline),
  e(U.raj,"2026-04-14","2026-04-15",5,CAT.billable,"VeloFreight — carrier rate data import",true,PROJ.velofreight),
  e(U.raj,"2026-04-14","2026-04-15",2,CAT.meetings,"Data quality review with Priya",false),
  e(U.raj,"2026-04-14","2026-04-16",5,CAT.billable,"FrostLine — bin data load & validation",true,PROJ.frostline),
  e(U.raj,"2026-04-14","2026-04-16",2,CAT.billable,"Oracle WMS — open order data migration",true,PROJ.oracle),
  e(U.raj,"2026-04-14","2026-04-17",5,CAT.billable,"VeloFreight — freight audit data analysis",true,PROJ.velofreight),
  e(U.raj,"2026-04-14","2026-04-17",2,CAT.meetings,"Data chapter sprint review",false),
  e(U.raj,"2026-04-14","2026-04-18",5,CAT.billable,"FrostLine — go-live data cutover checklist",true,PROJ.frostline),

  // Week 2026-04-21
  e(U.raj,"2026-04-21","2026-04-21",5,CAT.billable,"Oracle WMS — data migration test run 2",true,PROJ.oracle),
  e(U.raj,"2026-04-21","2026-04-21",3,CAT.billable,"FrostLine — production data load prep",true,PROJ.frostline),
  e(U.raj,"2026-04-21","2026-04-22",4,CAT.billable,"VeloFreight — rate card data finalisation",true,PROJ.velofreight),
  e(U.raj,"2026-04-21","2026-04-22",4,CAT.billable,"Oracle WMS — data migration reconciliation",true,PROJ.oracle),
  e(U.raj,"2026-04-21","2026-04-23",5,CAT.billable,"FrostLine — cutover data run",true,PROJ.frostline),
  e(U.raj,"2026-04-21","2026-04-23",2,CAT.meetings,"Data team retrospective",false),
  e(U.raj,"2026-04-21","2026-04-24",5,CAT.billable,"Oracle WMS — post-migration data quality checks",true,PROJ.oracle),
  e(U.raj,"2026-04-21","2026-04-24",2,CAT.meetings,"Analytics chapter forum",false),
  e(U.raj,"2026-04-21","2026-04-25",4,CAT.billable,"VeloFreight — reporting dashboard data build",true,PROJ.velofreight),

  // Week 2026-04-28
  e(U.raj,"2026-04-28","2026-04-28",4,CAT.billable,"FrostLine — hypercare data monitoring",true,PROJ.frostline),
  e(U.raj,"2026-04-28","2026-04-28",3,CAT.billable,"Oracle WMS — post-go-live data validation",true,PROJ.oracle),
  e(U.raj,"2026-04-28","2026-04-29",5,CAT.billable,"VeloFreight — freight data analytics handover",true,PROJ.velofreight),
  e(U.raj,"2026-04-28","2026-04-29",2,CAT.meetings,"Data governance board",false),
  e(U.raj,"2026-04-28","2026-04-30",5,CAT.billable,"FrostLine — warehouse data reporting setup",true,PROJ.frostline),
  e(U.raj,"2026-04-28","2026-05-01",4,CAT.billable,"Oracle WMS — data anomaly investigation",true,PROJ.oracle),
  e(U.raj,"2026-04-28","2026-05-01",2,CAT.meetings,"Sprint planning session",false),
  e(U.raj,"2026-04-28","2026-05-02",4,CAT.billable,"VeloFreight — final data handover pack",true,PROJ.velofreight),

  // Week 2026-05-05
  e(U.raj,"2026-05-05","2026-05-05",4,CAT.billable,"FrostLine — hypercare data dashboard monitoring",true,PROJ.frostline),
  e(U.raj,"2026-05-05","2026-05-05",3,CAT.billable,"Oracle WMS — data quality report",true,PROJ.oracle),
  e(U.raj,"2026-05-05","2026-05-06",5,CAT.billable,"FrostLine — inventory accuracy report post-go-live",true,PROJ.frostline),
  e(U.raj,"2026-05-05","2026-05-06",2,CAT.meetings,"Data team standup",false),
  e(U.raj,"2026-05-05","2026-05-07",5,CAT.billable,"Oracle WMS — data handover documentation",true,PROJ.oracle),
  e(U.raj,"2026-05-05","2026-05-07",2,CAT.billable,"FrostLine — data KPI dashboard setup",true,PROJ.frostline),
  e(U.raj,"2026-05-05","2026-05-08",4,CAT.billable,"Oracle WMS — lessons learned data section",true,PROJ.oracle),
  e(U.raj,"2026-05-05","2026-05-08",2,CAT.training,"Advanced SQL & dbt training module",false),
  e(U.raj,"2026-05-05","2026-05-09",4,CAT.billable,"FrostLine — post-go-live data monitoring",true,PROJ.frostline),

  // Week 2026-05-12 (Mon-Thu)
  e(U.raj,"2026-05-12","2026-05-12",4,CAT.billable,"Oracle WMS — support handover data queries",true,PROJ.oracle),
  e(U.raj,"2026-05-12","2026-05-12",3,CAT.billable,"FrostLine — week 2 hypercare data monitoring",true,PROJ.frostline),
  e(U.raj,"2026-05-12","2026-05-13",5,CAT.billable,"FrostLine — inventory transaction report validation",true,PROJ.frostline),
  e(U.raj,"2026-05-12","2026-05-13",2,CAT.meetings,"Data chapter weekly",false),
  e(U.raj,"2026-05-12","2026-05-14",5,CAT.billable,"Oracle WMS — ERP data sync status review",true,PROJ.oracle),
  e(U.raj,"2026-05-12","2026-05-14",1,CAT.admin,"Project data archiving",false),
  e(U.raj,"2026-05-12","2026-05-15",3,CAT.billable,"FrostLine — final data acceptance report",true,PROJ.frostline),

  // ════════════════════════════════════════════════════════════════════════════
  // LEILA (U.leila = 7) — Change Management Lead across P1, P2
  // ════════════════════════════════════════════════════════════════════════════

  // Week 2026-04-07
  e(U.leila,"2026-04-07","2026-04-07",4,CAT.billable,"FrostLine — change impact assessment update",true,PROJ.frostline,TASK.changeplan),
  e(U.leila,"2026-04-07","2026-04-07",2,CAT.billable,"VeloFreight — end-user training session plan",true,PROJ.velofreight,TASK.endUserTrain),
  e(U.leila,"2026-04-07","2026-04-08",4,CAT.billable,"FrostLine — stakeholder engagement plan",true,PROJ.frostline,TASK.changeplan),
  e(U.leila,"2026-04-07","2026-04-08",2,CAT.meetings,"Change management chapter sync",false),
  e(U.leila,"2026-04-07","2026-04-09",4,CAT.billable,"VeloFreight — carrier user training content build",true,PROJ.velofreight,TASK.endUserTrain),
  e(U.leila,"2026-04-07","2026-04-09",2,CAT.meetings,"Stakeholder communication review",false),
  e(U.leila,"2026-04-07","2026-04-10",4,CAT.billable,"FrostLine — resistance management log update",true,PROJ.frostline,TASK.changeplan),
  e(U.leila,"2026-04-07","2026-04-10",2,CAT.billable,"VeloFreight — training pilot with 3 pilot users",true,PROJ.velofreight,TASK.endUserTrain),
  e(U.leila,"2026-04-07","2026-04-11",4,CAT.billable,"FrostLine — change champion briefing session",true,PROJ.frostline,TASK.changeplan),
  e(U.leila,"2026-04-07","2026-04-11",2,CAT.training,"Prosci ADKAR refresher workshop",false),

  // Week 2026-04-14
  e(U.leila,"2026-04-14","2026-04-14",4,CAT.billable,"VeloFreight — training delivery — batch 1 (10 users)",true,PROJ.velofreight,TASK.endUserTrain),
  e(U.leila,"2026-04-14","2026-04-14",2,CAT.billable,"FrostLine — CMP progress review with Marcus",true,PROJ.frostline,TASK.changeplan),
  e(U.leila,"2026-04-14","2026-04-15",4,CAT.billable,"VeloFreight — training delivery — batch 2",true,PROJ.velofreight,TASK.endUserTrain),
  e(U.leila,"2026-04-14","2026-04-15",2,CAT.meetings,"Change management team meeting",false),
  e(U.leila,"2026-04-14","2026-04-16",4,CAT.billable,"FrostLine — super-user network meeting",true,PROJ.frostline,TASK.changeplan),
  e(U.leila,"2026-04-14","2026-04-16",2,CAT.billable,"VeloFreight — post-training Q&A session",true,PROJ.velofreight,TASK.endUserTrain),
  e(U.leila,"2026-04-14","2026-04-17",4,CAT.billable,"FrostLine — training readiness assessment",true,PROJ.frostline,TASK.changeplan),
  e(U.leila,"2026-04-14","2026-04-17",2,CAT.meetings,"Steering committee update preparation",false),
  e(U.leila,"2026-04-14","2026-04-18",4,CAT.billable,"VeloFreight — change adoption scorecard",true,PROJ.velofreight,TASK.endUserTrain),

  // Week 2026-04-21
  e(U.leila,"2026-04-21","2026-04-21",4,CAT.billable,"FrostLine — go-live communication broadcast",true,PROJ.frostline,TASK.changeplan),
  e(U.leila,"2026-04-21","2026-04-21",2,CAT.billable,"VeloFreight — training completion tracking",true,PROJ.velofreight,TASK.endUserTrain),
  e(U.leila,"2026-04-21","2026-04-22",4,CAT.billable,"FrostLine — final change readiness check",true,PROJ.frostline,TASK.changeplan),
  e(U.leila,"2026-04-21","2026-04-22",3,CAT.billable,"VeloFreight — refresher training for late adopters",true,PROJ.velofreight,TASK.endUserTrain),
  e(U.leila,"2026-04-21","2026-04-23",4,CAT.billable,"FrostLine — hypercare communication plan",true,PROJ.frostline,TASK.changeplan),
  e(U.leila,"2026-04-21","2026-04-23",2,CAT.meetings,"Change community of practice",false),
  e(U.leila,"2026-04-21","2026-04-24",4,CAT.billable,"VeloFreight — training effectiveness survey analysis",true,PROJ.velofreight,TASK.endUserTrain),
  e(U.leila,"2026-04-21","2026-04-24",2,CAT.meetings,"Sprint review — change track",false),
  e(U.leila,"2026-04-21","2026-04-25",4,CAT.billable,"FrostLine — cutover day communications",true,PROJ.frostline,TASK.changeplan),
  e(U.leila,"2026-04-21","2026-04-25",2,CAT.training,"Stakeholder engagement masterclass",false),

  // Week 2026-04-28
  e(U.leila,"2026-04-28","2026-04-28",4,CAT.billable,"FrostLine — go-live day support (on-site floor walking)",true,PROJ.frostline,TASK.changeplan),
  e(U.leila,"2026-04-28","2026-04-28",2,CAT.billable,"VeloFreight — change adoption final report",true,PROJ.velofreight,TASK.endUserTrain),
  e(U.leila,"2026-04-28","2026-04-29",4,CAT.billable,"FrostLine — hypercare daily user support",true,PROJ.frostline,TASK.changeplan),
  e(U.leila,"2026-04-28","2026-04-29",2,CAT.meetings,"Change management team wrap-up",false),
  e(U.leila,"2026-04-28","2026-04-30",4,CAT.billable,"FrostLine — change champion feedback collection",true,PROJ.frostline,TASK.changeplan),
  e(U.leila,"2026-04-28","2026-04-30",2,CAT.meetings,"PMO status update — change track",false),
  e(U.leila,"2026-04-28","2026-05-01",4,CAT.billable,"VeloFreight — project close-out documentation",true,PROJ.velofreight,TASK.endUserTrain),
  e(U.leila,"2026-04-28","2026-05-01",2,CAT.meetings,"All-hands change management retrospective",false),
  e(U.leila,"2026-04-28","2026-05-02",3,CAT.billable,"FrostLine — week 1 hypercare report",true,PROJ.frostline,TASK.changeplan),

  // Week 2026-05-05
  e(U.leila,"2026-05-05","2026-05-05",4,CAT.billable,"FrostLine — week 2 hypercare user support",true,PROJ.frostline,TASK.changeplan),
  e(U.leila,"2026-05-05","2026-05-05",2,CAT.meetings,"Change team debrief",false),
  e(U.leila,"2026-05-05","2026-05-06",4,CAT.billable,"FrostLine — adoption metrics collection",true,PROJ.frostline,TASK.changeplan),
  e(U.leila,"2026-05-05","2026-05-06",3,CAT.training,"Leading Change certification workshop",false),
  e(U.leila,"2026-05-05","2026-05-07",4,CAT.billable,"FrostLine — week 2 hypercare close-out",true,PROJ.frostline,TASK.changeplan),
  e(U.leila,"2026-05-05","2026-05-07",2,CAT.meetings,"Project review — change effectiveness",false),
  e(U.leila,"2026-05-05","2026-05-08",4,CAT.billable,"FrostLine — lessons learned documentation",true,PROJ.frostline,TASK.changeplan),
  e(U.leila,"2026-05-05","2026-05-08",2,CAT.presales,"Pre-sales support — new WMS opportunity",false),
  e(U.leila,"2026-05-05","2026-05-09",3,CAT.billable,"FrostLine — change success report to client",true,PROJ.frostline,TASK.changeplan),

  // Week 2026-05-12 (Mon-Thu)
  e(U.leila,"2026-05-12","2026-05-12",4,CAT.billable,"FrostLine — hypercare final closure activities",true,PROJ.frostline,TASK.changeplan),
  e(U.leila,"2026-05-12","2026-05-12",2,CAT.meetings,"Change management chapter weekly",false),
  e(U.leila,"2026-05-12","2026-05-13",4,CAT.billable,"FrostLine — benefits realisation planning",true,PROJ.frostline,TASK.changeplan),
  e(U.leila,"2026-05-12","2026-05-13",2,CAT.meetings,"New opportunity change assessment",false),
  e(U.leila,"2026-05-12","2026-05-14",4,CAT.billable,"FrostLine — final handover to client PMO",true,PROJ.frostline,TASK.changeplan),
  e(U.leila,"2026-05-12","2026-05-14",2,CAT.meetings,"Sprint review — CML track",false),
  e(U.leila,"2026-05-12","2026-05-15",4,CAT.billable,"FrostLine — change programme close-out meeting",true,PROJ.frostline,TASK.changeplan),

  // ════════════════════════════════════════════════════════════════════════════
  // TOM (U.tom = 8) — QA Engineer (collaborator) — P1, P3, P6
  // ════════════════════════════════════════════════════════════════════════════

  // Week 2026-04-07
  e(U.tom,"2026-04-07","2026-04-07",4,CAT.billable,"FrostLine — SIT test case design for RFID flows",true,PROJ.frostline,TASK.sit),
  e(U.tom,"2026-04-07","2026-04-07",2,CAT.billable,"Oracle WMS — UAT execution (RF device scenarios)",true,PROJ.oracle,TASK.uat),
  e(U.tom,"2026-04-07","2026-04-08",4,CAT.billable,"FrostLine — SIT environment setup & smoke tests",true,PROJ.frostline,TASK.sit),
  e(U.tom,"2026-04-07","2026-04-08",2,CAT.meetings,"QA chapter daily standup",false),
  e(U.tom,"2026-04-07","2026-04-09",4,CAT.billable,"Oracle WMS — defect logging & triage session",true,PROJ.oracle,TASK.uat),
  e(U.tom,"2026-04-07","2026-04-09",2,CAT.billable,"FrostLine — regression suite for RFID integration",true,PROJ.frostline,TASK.sit),
  e(U.tom,"2026-04-07","2026-04-10",4,CAT.billable,"FrostLine — SIT cold chain scenario execution",true,PROJ.frostline,TASK.sit),
  e(U.tom,"2026-04-07","2026-04-10",2,CAT.meetings,"Sprint review — QA track",false),
  e(U.tom,"2026-04-07","2026-04-11",4,CAT.billable,"Oracle WMS — UAT closure defect review",true,PROJ.oracle,TASK.uat),

  // Week 2026-04-14 — Tom on PTO (no entries)

  // Week 2026-04-21
  e(U.tom,"2026-04-21","2026-04-21",5,CAT.billable,"FrostLine — SIT execution: ERP interface scenarios",true,PROJ.frostline,TASK.sit),
  e(U.tom,"2026-04-21","2026-04-21",2,CAT.meetings,"Return from PTO — project catch-up",false),
  e(U.tom,"2026-04-21","2026-04-22",5,CAT.billable,"Oracle WMS — regression testing post defect fixes",true,PROJ.oracle,TASK.uat),
  e(U.tom,"2026-04-21","2026-04-22",2,CAT.billable,"FrostLine — performance test execution",true,PROJ.frostline,TASK.sit),
  e(U.tom,"2026-04-21","2026-04-23",5,CAT.billable,"FrostLine — SIT complete: sign-off documentation",true,PROJ.frostline,TASK.sit),
  e(U.tom,"2026-04-21","2026-04-23",2,CAT.meetings,"QA chapter retrospective",false),
  e(U.tom,"2026-04-21","2026-04-24",5,CAT.billable,"Oracle WMS — UAT final acceptance test",true,PROJ.oracle,TASK.uat),
  e(U.tom,"2026-04-21","2026-04-24",2,CAT.meetings,"Sprint review presentation",false),
  e(U.tom,"2026-04-21","2026-04-25",4,CAT.billable,"Fleet Telemetry — test strategy & plan",true,PROJ.fleet),
  e(U.tom,"2026-04-21","2026-04-25",2,CAT.training,"Test automation framework refresher",false),

  // Week 2026-04-28
  e(U.tom,"2026-04-28","2026-04-28",5,CAT.billable,"FrostLine — hypercare defect triage",true,PROJ.frostline,TASK.sit),
  e(U.tom,"2026-04-28","2026-04-28",3,CAT.billable,"Fleet Telemetry — test environment planning",true,PROJ.fleet),
  e(U.tom,"2026-04-28","2026-04-29",5,CAT.billable,"Oracle WMS — post-go-live regression",true,PROJ.oracle,TASK.uat),
  e(U.tom,"2026-04-28","2026-04-29",2,CAT.meetings,"QA team standup",false),
  e(U.tom,"2026-04-28","2026-04-30",5,CAT.billable,"FrostLine — go-live smoke test results",true,PROJ.frostline,TASK.sit),
  e(U.tom,"2026-04-28","2026-04-30",2,CAT.billable,"Fleet Telemetry — IoT sensor test cases",true,PROJ.fleet),
  e(U.tom,"2026-04-28","2026-05-01",5,CAT.billable,"Oracle WMS — final QA handover report",true,PROJ.oracle,TASK.uat),
  e(U.tom,"2026-04-28","2026-05-01",2,CAT.meetings,"Sprint planning — QA track",false),
  e(U.tom,"2026-04-28","2026-05-02",4,CAT.billable,"Fleet Telemetry — data pipeline test plan",true,PROJ.fleet),

  // Week 2026-05-05
  e(U.tom,"2026-05-05","2026-05-05",4,CAT.billable,"FrostLine — hypercare post-go-live defects",true,PROJ.frostline,TASK.sit),
  e(U.tom,"2026-05-05","2026-05-05",3,CAT.billable,"Fleet Telemetry — test automation setup",true,PROJ.fleet),
  e(U.tom,"2026-05-05","2026-05-06",5,CAT.billable,"Oracle WMS — QA close-out documentation",true,PROJ.oracle,TASK.uat),
  e(U.tom,"2026-05-05","2026-05-06",2,CAT.meetings,"QA daily standup",false),
  e(U.tom,"2026-05-05","2026-05-07",5,CAT.billable,"Fleet Telemetry — sensor data validation tests",true,PROJ.fleet),
  e(U.tom,"2026-05-05","2026-05-07",2,CAT.billable,"FrostLine — hypercare regression (week 2)",true,PROJ.frostline,TASK.sit),
  e(U.tom,"2026-05-05","2026-05-08",5,CAT.billable,"Fleet Telemetry — gateway connectivity test plan",true,PROJ.fleet),
  e(U.tom,"2026-05-05","2026-05-08",2,CAT.meetings,"Sprint review",false),
  e(U.tom,"2026-05-05","2026-05-09",4,CAT.billable,"Oracle WMS — lessons learned — QA section",true,PROJ.oracle,TASK.uat),

  // Week 2026-05-12 (Mon-Thu)
  e(U.tom,"2026-05-12","2026-05-12",4,CAT.billable,"Fleet Telemetry — test strategy finalisation",true,PROJ.fleet),
  e(U.tom,"2026-05-12","2026-05-12",2,CAT.meetings,"QA chapter weekly",false),
  e(U.tom,"2026-05-12","2026-05-13",4,CAT.billable,"FrostLine — hypercare final QA sign-off",true,PROJ.frostline,TASK.sit),
  e(U.tom,"2026-05-12","2026-05-13",2,CAT.billable,"Fleet Telemetry — test environment build",true,PROJ.fleet),
  e(U.tom,"2026-05-12","2026-05-14",4,CAT.billable,"Fleet Telemetry — IoT pipeline automated tests",true,PROJ.fleet),
  e(U.tom,"2026-05-12","2026-05-14",2,CAT.meetings,"Sprint planning — Fleet Telemetry",false),
  e(U.tom,"2026-05-12","2026-05-15",4,CAT.billable,"Fleet Telemetry — sensor data quality test cases",true,PROJ.fleet),

  // ════════════════════════════════════════════════════════════════════════════
  // AMARA (U.amara = 9) — Consultant (collaborator) — P1 primary
  // ════════════════════════════════════════════════════════════════════════════

  // Week 2026-04-07
  e(U.amara,"2026-04-07","2026-04-07",4,CAT.billable,"FrostLine — warehouse process documentation update",true,PROJ.frostline),
  e(U.amara,"2026-04-07","2026-04-07",2,CAT.billable,"FrostLine — end-user training facilitation (shift 1)",true,PROJ.frostline,TASK.changeplan),
  e(U.amara,"2026-04-07","2026-04-08",4,CAT.billable,"FrostLine — training delivery (picking team)",true,PROJ.frostline,TASK.changeplan),
  e(U.amara,"2026-04-07","2026-04-08",2,CAT.meetings,"Consultant team standup",false),
  e(U.amara,"2026-04-07","2026-04-09",4,CAT.billable,"FrostLine — training delivery (receiving team)",true,PROJ.frostline,TASK.changeplan),
  e(U.amara,"2026-04-07","2026-04-09",2,CAT.meetings,"Project coordination call with Marcus",false),
  e(U.amara,"2026-04-07","2026-04-10",4,CAT.billable,"FrostLine — floor support during SIT",true,PROJ.frostline,TASK.sit),
  e(U.amara,"2026-04-07","2026-04-10",2,CAT.meetings,"Weekly team catch-up",false),
  e(U.amara,"2026-04-07","2026-04-11",4,CAT.billable,"FrostLine — training feedback review & action items",true,PROJ.frostline,TASK.changeplan),

  // Week 2026-04-14
  e(U.amara,"2026-04-14","2026-04-14",4,CAT.billable,"FrostLine — dispatch team training delivery",true,PROJ.frostline,TASK.changeplan),
  e(U.amara,"2026-04-14","2026-04-14",2,CAT.meetings,"Project standup",false),
  e(U.amara,"2026-04-14","2026-04-15",4,CAT.billable,"FrostLine — training Q&A support session",true,PROJ.frostline,TASK.changeplan),
  e(U.amara,"2026-04-14","2026-04-15",2,CAT.meetings,"Consultant chapter weekly",false),
  e(U.amara,"2026-04-14","2026-04-16",4,CAT.billable,"FrostLine — super-user knowledge transfer session",true,PROJ.frostline,TASK.changeplan),
  e(U.amara,"2026-04-14","2026-04-16",2,CAT.billable,"FrostLine — SIT floor observation",true,PROJ.frostline,TASK.sit),
  e(U.amara,"2026-04-14","2026-04-17",4,CAT.billable,"FrostLine — user acceptance checklist walkthrough",true,PROJ.frostline,TASK.sit),
  e(U.amara,"2026-04-14","2026-04-17",2,CAT.meetings,"Sprint review observation",false),
  e(U.amara,"2026-04-14","2026-04-18",4,CAT.billable,"FrostLine — training completion sign-off",true,PROJ.frostline,TASK.changeplan),

  // Week 2026-04-21
  e(U.amara,"2026-04-21","2026-04-21",4,CAT.billable,"FrostLine — go-live countdown — user prep session",true,PROJ.frostline,TASK.changeplan),
  e(U.amara,"2026-04-21","2026-04-21",2,CAT.meetings,"Team coordination call",false),
  e(U.amara,"2026-04-21","2026-04-22",4,CAT.billable,"FrostLine — final user readiness confirmation",true,PROJ.frostline,TASK.changeplan),
  e(U.amara,"2026-04-21","2026-04-22",3,CAT.billable,"FrostLine — refresher training for low-confidence users",true,PROJ.frostline,TASK.changeplan),
  e(U.amara,"2026-04-21","2026-04-23",4,CAT.billable,"FrostLine — go-live support (on-site)",true,PROJ.frostline,TASK.sit),
  e(U.amara,"2026-04-21","2026-04-23",2,CAT.meetings,"Daily standup",false),
  e(U.amara,"2026-04-21","2026-04-24",4,CAT.billable,"FrostLine — hypercare floor walking — day 2",true,PROJ.frostline,TASK.sit),
  e(U.amara,"2026-04-21","2026-04-24",2,CAT.meetings,"Sprint review",false),
  e(U.amara,"2026-04-21","2026-04-25",4,CAT.billable,"FrostLine — hypercare user query resolution",true,PROJ.frostline,TASK.sit),

  // Week 2026-04-28
  e(U.amara,"2026-04-28","2026-04-28",4,CAT.billable,"FrostLine — hypercare day 6 — floor support",true,PROJ.frostline,TASK.sit),
  e(U.amara,"2026-04-28","2026-04-28",2,CAT.meetings,"Daily standup",false),
  e(U.amara,"2026-04-28","2026-04-29",4,CAT.billable,"FrostLine — user adoption tracking update",true,PROJ.frostline,TASK.changeplan),
  e(U.amara,"2026-04-28","2026-04-29",2,CAT.meetings,"Consultant team review",false),
  e(U.amara,"2026-04-28","2026-04-30",4,CAT.billable,"FrostLine — system usage report (week 1 post-go-live)",true,PROJ.frostline),
  e(U.amara,"2026-04-28","2026-04-30",2,CAT.meetings,"PMO status call",false),
  e(U.amara,"2026-04-28","2026-05-01",4,CAT.billable,"FrostLine — hypercare close-out (user queries resolved)",true,PROJ.frostline,TASK.sit),
  e(U.amara,"2026-04-28","2026-05-01",2,CAT.meetings,"Sprint review",false),
  e(U.amara,"2026-04-28","2026-05-02",4,CAT.billable,"FrostLine — lessons learned contribution",true,PROJ.frostline,TASK.changeplan),

  // Week 2026-05-05
  e(U.amara,"2026-05-05","2026-05-05",4,CAT.billable,"FrostLine — hypercare week 2 support",true,PROJ.frostline,TASK.sit),
  e(U.amara,"2026-05-05","2026-05-05",2,CAT.meetings,"Consultant team standup",false),
  e(U.amara,"2026-05-05","2026-05-06",4,CAT.billable,"FrostLine — adoption metrics (week 2 report)",true,PROJ.frostline,TASK.changeplan),
  e(U.amara,"2026-05-05","2026-05-06",2,CAT.meetings,"Project close-out planning",false),
  e(U.amara,"2026-05-05","2026-05-07",4,CAT.billable,"FrostLine — final hypercare user support",true,PROJ.frostline,TASK.sit),
  e(U.amara,"2026-05-05","2026-05-07",2,CAT.training,"Consulting methodology certification",false),
  e(U.amara,"2026-05-05","2026-05-08",4,CAT.billable,"FrostLine — knowledge transfer to client team",true,PROJ.frostline,TASK.changeplan),
  e(U.amara,"2026-05-05","2026-05-08",2,CAT.meetings,"Sprint review — consultant track",false),
  e(U.amara,"2026-05-05","2026-05-09",4,CAT.billable,"FrostLine — project close-out documentation",true,PROJ.frostline,TASK.changeplan),

  // Week 2026-05-12 (Mon-Thu)
  e(U.amara,"2026-05-12","2026-05-12",4,CAT.billable,"FrostLine — benefits realisation baseline",true,PROJ.frostline),
  e(U.amara,"2026-05-12","2026-05-12",2,CAT.meetings,"Consultant team weekly",false),
  e(U.amara,"2026-05-12","2026-05-13",4,CAT.billable,"FrostLine — final handover documentation",true,PROJ.frostline,TASK.changeplan),
  e(U.amara,"2026-05-12","2026-05-13",2,CAT.meetings,"Project close-out call with Marcus",false),
  e(U.amara,"2026-05-12","2026-05-14",4,CAT.billable,"FrostLine — client satisfaction debrief",true,PROJ.frostline),
  e(U.amara,"2026-05-12","2026-05-14",2,CAT.meetings,"Sprint retrospective",false),
  e(U.amara,"2026-05-12","2026-05-15",4,CAT.billable,"FrostLine — project closure sign-off",true,PROJ.frostline,TASK.changeplan),
];

// ─── Additional time-off requests ─────────────────────────────────────────────

type TOReq = {
  userId: number;
  type: string;
  startDate: string;
  endDate: string;
  status: "Pending" | "Approved" | "Rejected";
  durationType: "Full Day" | "Half Day" | "Custom";
  notes?: string;
  approvedBy?: number;
};

const newTimeOff: TOReq[] = [
  { userId: U.marcus, type: "PTO", startDate: "2026-06-02", endDate: "2026-06-05", status: "Pending", durationType: "Full Day", notes: "Annual leave — family holiday" },
  { userId: U.priya,  type: "PTO", startDate: "2026-05-25", endDate: "2026-05-29", status: "Pending", durationType: "Full Day", notes: "Annual leave" },
  { userId: U.raj,    type: "PTO", startDate: "2026-05-19", endDate: "2026-05-20", status: "Approved", durationType: "Full Day", notes: "Medical appointment", approvedBy: U.marcus },
  { userId: U.leila,  type: "Sick Leave", startDate: "2026-04-03", endDate: "2026-04-03", status: "Approved", durationType: "Full Day", approvedBy: U.marcus },
  { userId: U.amara,  type: "PTO", startDate: "2026-07-07", endDate: "2026-07-11", status: "Pending", durationType: "Full Day", notes: "Summer break" },
  { userId: U.tom,    type: "PTO", startDate: "2026-08-03", endDate: "2026-08-07", status: "Pending", durationType: "Full Day", notes: "Camping trip" },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("▶  enrichTimeTracking — starting");

  // 1. Fetch existing timesheets to avoid duplicates
  const existingSheets = await db.select({
    userId: timesheetsTable.userId,
    weekStart: timesheetsTable.weekStart,
    id: timesheetsTable.id,
  }).from(timesheetsTable);

  const existingSheetKey = new Set(existingSheets.map(s => `${s.userId}:${s.weekStart}`));
  const sheetIdMap = new Map(existingSheets.map(s => [`${s.userId}:${s.weekStart}`, s.id]));

  // 2. Insert missing timesheets
  const toInsert = timesheetDefs.filter(ts => !existingSheetKey.has(`${ts.userId}:${ts.weekStart}`));
  if (toInsert.length > 0) {
    const inserted = await db.insert(timesheetsTable).values(
      toInsert.map(ts => ({
        userId: ts.userId,
        weekStart: ts.weekStart,
        status: ts.status,
        totalHours: String(ts.totalHours),
        billableHours: String(ts.billableHours),
        submittedAt: ts.submittedAt ? new Date(ts.submittedAt) : null,
        submittedByUserId: ts.submittedBy ?? null,
        approvedAt: ts.approvedAt ? new Date(ts.approvedAt) : null,
        approvedByUserId: ts.approvedBy ?? null,
      }))
    ).returning();
    for (const s of inserted) {
      sheetIdMap.set(`${s.userId}:${s.weekStart}`, s.id);
    }
    console.log(`  ✓  Inserted ${inserted.length} new timesheets`);
  } else {
    console.log("  –  All timesheets already exist, skipping");
  }

  // 3. Insert time entries linked to the timesheets
  const existingEntries = await db.select({
    timesheetId: timeEntriesTable.timesheetId,
    date: timeEntriesTable.date,
    userId: timeEntriesTable.userId,
    description: timeEntriesTable.description,
  }).from(timeEntriesTable);

  const existingEntryKey = new Set(
    existingEntries.map(e => `${e.userId}:${e.date}:${(e.description ?? "").substring(0, 40)}`)
  );

  const entriesToInsert = entryDefs.filter(en => {
    const key = `${en.userId}:${en.date}:${en.description.substring(0, 40)}`;
    return !existingEntryKey.has(key);
  }).map(en => {
    const tsId = sheetIdMap.get(`${en.userId}:${en.weekStart}`);
    return {
      userId: en.userId,
      timesheetId: tsId ?? null,
      date: en.date,
      projectId: en.projectId ?? null,
      taskId: en.taskId ?? null,
      categoryId: en.categoryId,
      hours: en.hours,
      description: en.description,
      billable: en.billable,
      approved: false,
      rejected: false,
    };
  });

  if (entriesToInsert.length > 0) {
    // Insert in batches of 50
    const BATCH = 50;
    let count = 0;
    for (let i = 0; i < entriesToInsert.length; i += BATCH) {
      await db.insert(timeEntriesTable).values(entriesToInsert.slice(i, i + BATCH));
      count += Math.min(BATCH, entriesToInsert.length - i);
    }
    console.log(`  ✓  Inserted ${count} new time entries`);
  } else {
    console.log("  –  All time entries already exist, skipping");
  }

  // 4. Insert additional time-off requests
  const existingTOR = await db.select({
    userId: timeOffRequestsTable.userId,
    startDate: timeOffRequestsTable.startDate,
  }).from(timeOffRequestsTable);

  const existingTORKey = new Set(existingTOR.map(r => `${r.userId}:${r.startDate}`));

  const torToInsert = newTimeOff.filter(r => !existingTORKey.has(`${r.userId}:${r.startDate}`));
  if (torToInsert.length > 0) {
    await db.insert(timeOffRequestsTable).values(
      torToInsert.map(r => ({
        userId: r.userId,
        type: r.type,
        startDate: r.startDate,
        endDate: r.endDate,
        status: r.status,
        durationType: r.durationType,
        notes: r.notes ?? null,
        approvedByUserId: r.approvedBy ?? null,
        notifyProjectOwners: true,
      }))
    );
    console.log(`  ✓  Inserted ${torToInsert.length} new time-off requests`);
  } else {
    console.log("  –  All time-off requests already exist, skipping");
  }

  console.log("✅  enrichTimeTracking — complete");
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
