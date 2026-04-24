import { Router, type IRouter } from "express";
import { db, timeEntriesTable, invoicesTable, projectsTable, usersTable, tasksTable, rateCardsTable, csatSurveysTable, csatResponsesTable, projectTemplatesTable, keyEventsTable, intervalsTable, accountsTable, allocationsTable, holidayDatesTable, timeOffRequestsTable, timesheetsTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import {
  GetUtilizationReportResponse,
  GetRevenueReportResponse,
  GetProjectHealthReportResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Helper: count working days (Mon–Fri) in [startStr, endStr] that appear in a given set
function countWorkingDaysInSet(dateSet: Set<string>, startStr: string, endStr: string): number {
  let count = 0;
  const cur = new Date(startStr + "T00:00:00Z");
  const fin = new Date(endStr + "T00:00:00Z");
  while (cur <= fin) {
    const dow = cur.getUTCDay();
    if (dow !== 0 && dow !== 6 && dateSet.has(cur.toISOString().slice(0, 10))) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

// Helper: count working days (Mon–Fri) in a month's YYYY-MM period
function workingDaysInMonth(yearMonth: string): number {
  const [y, m] = yearMonth.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(y, m - 1, d).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

// Helper: get all YYYY-MM-DD dates for a month
function datesInMonth(yearMonth: string): string[] {
  const [y, m] = yearMonth.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const dates: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(`${yearMonth}-${String(d).padStart(2, "0")}`);
  }
  return dates;
}

router.get("/reports/utilization", async (_req, res): Promise<void> => {
  const [entries, users, allTimeOffs, allHolidayDates] = await Promise.all([
    db.select().from(timeEntriesTable),
    db.select().from(usersTable),
    db.select().from(timeOffRequestsTable).where(eq(timeOffRequestsTable.status, "Approved")),
    db.select().from(holidayDatesTable),
  ]);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();

  // Build per-user adjusted capacity for a given YYYY-MM month
  function userAdjustedMonthlyCapacity(u: typeof users[0], yearMonth: string): number {
    const dailyCap = u.capacity / 5;
    const monthDates = new Set(datesInMonth(yearMonth).filter(d => {
      const dow = new Date(d + "T00:00:00Z").getUTCDay();
      return dow !== 0 && dow !== 6;
    }));

    // Holiday deduction
    const userHolidaySet = u.holidayCalendarId
      ? new Set(allHolidayDates.filter(h => h.calendarId === u.holidayCalendarId).map(h => h.date))
      : new Set<string>();
    const holidayDays = [...monthDates].filter(d => userHolidaySet.has(d)).length;

    // Time-off deduction (approved, in this month, not already a holiday)
    const userTOs = allTimeOffs.filter(to => to.userId === u.id);
    let toHours = 0;
    for (const to of userTOs) {
      const toStart = to.startDate > (yearMonth + "-01") ? to.startDate : (yearMonth + "-01");
      const lastDay = datesInMonth(yearMonth).at(-1)!;
      const toEnd = to.endDate < lastDay ? to.endDate : lastDay;
      if (toStart > toEnd) continue;
      const cur = new Date(toStart + "T00:00:00Z");
      const fin = new Date(toEnd + "T00:00:00Z");
      while (cur <= fin) {
        const d = cur.toISOString().slice(0, 10);
        const dow = cur.getUTCDay();
        if (dow !== 0 && dow !== 6 && !userHolidaySet.has(d)) {
          if ((to as any).durationType === "Half Day") toHours += dailyCap / 2;
          else if ((to as any).durationType === "Custom" && (to as any).customHours) toHours += Number((to as any).customHours);
          else toHours += dailyCap;
        }
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    }

    const rawCap = workingDaysInMonth(yearMonth) * dailyCap;
    return Math.max(0, rawCap - holidayDays * dailyCap - toHours);
  }

  const byUser = users.map(u => {
    const userEntries = entries.filter(e => e.userId === u.id);
    const totalHours = userEntries.reduce((s, e) => s + Number(e.hours), 0);
    const billableHours = userEntries.filter(e => e.billable).reduce((s, e) => s + Number(e.hours), 0);
    if (totalHours === 0) return null;

    // Compute adjusted capacity over the span of the user's entries (last 4 months approx)
    const entryMonths = [...new Set(userEntries.map(e => e.date.slice(0, 7)))];
    const adjustedCap = entryMonths.reduce((s, m) => s + userAdjustedMonthlyCapacity(u, m), 0);
    const denominator = adjustedCap > 0 ? adjustedCap : u.capacity * 4;
    const utilization = Math.min(100, Math.round((totalHours / denominator) * 100));
    return { userId: u.id, userName: u.name, billableHours, totalHours, utilization };
  }).filter(Boolean) as { userId: number; userName: string; billableHours: number; totalHours: number; utilization: number }[];

  const averageUtilization = byUser.length > 0
    ? Math.round(byUser.reduce((s, u) => s + u.utilization, 0) / byUser.length)
    : 0;

  const byMonth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const month = `${d.getFullYear()}-${months[d.getMonth()]}`;
    const yearMonth = d.toISOString().slice(0, 7);
    const monthEntries = entries.filter(e => e.date.startsWith(yearMonth));
    const totalH = monthEntries.reduce((s, e) => s + Number(e.hours), 0);
    const totalCap = users.reduce((s, u) => s + userAdjustedMonthlyCapacity(u, yearMonth), 0);
    return { month, utilization: totalCap > 0 ? Math.min(100, Math.round((totalH / totalCap) * 100)) : 0 };
  });

  res.json(GetUtilizationReportResponse.parse({ averageUtilization, byUser, byMonth }));
});

router.get("/reports/revenue", async (_req, res): Promise<void> => {
  const invoices = await db.select().from(invoicesTable);
  const projects = await db.select().from(projectsTable);

  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + Number(i.total), 0);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const byMonth = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 23 + i, 1);
    const month = `${d.getFullYear()}-${months[d.getMonth()]}`;
    const monthStr = d.toISOString().slice(0, 7);
    const monthInvoices = invoices.filter(inv => inv.issueDate.startsWith(monthStr));
    const invoiced = monthInvoices.reduce((s, inv) => s + Number(inv.total), 0);
    const collected = monthInvoices.filter(inv => inv.status === 'Paid').reduce((s, inv) => s + Number(inv.total), 0);
    return { month, invoiced, collected };
  });

  const byProjectMap = new Map<number, number>();
  invoices.filter(i => i.status === 'Paid').forEach(i => {
    byProjectMap.set(i.projectId, (byProjectMap.get(i.projectId) || 0) + Number(i.total));
  });
  const byProject = Array.from(byProjectMap.entries()).map(([projectId, revenue]) => ({
    projectId,
    projectName: projects.find(p => p.id === projectId)?.name ?? 'Unknown',
    revenue,
  }));

  const byAccountMap = new Map<number, { name: string; revenue: number }>();
  invoices.filter(i => i.status === 'Paid').forEach(i => {
    const existing = byAccountMap.get(i.accountId) || { name: `Account ${i.accountId}`, revenue: 0 };
    byAccountMap.set(i.accountId, { ...existing, revenue: existing.revenue + Number(i.total) });
  });
  const byAccount = Array.from(byAccountMap.entries()).map(([accountId, { name, revenue }]) => ({
    accountId,
    accountName: name,
    revenue,
  }));

  res.json(GetRevenueReportResponse.parse({ totalRevenue, byMonth, byProject, byAccount }));
});

router.get("/reports/project-health", async (_req, res): Promise<void> => {
  const projects = await db.select().from(projectsTable);
  const now = new Date();

  const projectList = projects.map(p => {
    const due = new Date(p.dueDate);
    const daysRemaining = Math.max(0, Math.ceil((due.getTime() - now.getTime()) / 86400000));
    const budget = Number(p.budget) || 0;
    const tracked = Number(p.trackedHours) || 0;
    const budgeted = Number(p.budgetedHours) || 0;
    const budgetUsed = budget > 0 && budgeted > 0 ? Math.round((tracked / budgeted) * 100) : 0;
    return {
      projectId: p.id,
      projectName: p.name,
      health: p.health,
      completion: p.completion,
      daysRemaining,
      budgetUsed,
    };
  });

  const onTrack = projects.filter(p => p.health === 'On Track').length;
  const atRisk = projects.filter(p => p.health === 'At Risk').length;
  const offTrack = projects.filter(p => p.health === 'Off Track').length;
  const completed = projects.filter(p => p.status === 'Completed').length;

  res.json(GetProjectHealthReportResponse.parse({ onTrack, atRisk, offTrack, completed, projects: projectList }));
});

router.get("/reports/budget-vs-actuals", async (_req, res): Promise<void> => {
  const projects = await db.select().from(projectsTable);
  const invoices = await db.select().from(invoicesTable);

  const projectList = projects.map(p => {
    const budget = Number(p.budget);
    const projectInvoices = invoices.filter(i => i.projectId === p.id);
    const spent = projectInvoices.reduce((s, i) => s + Number(i.total), 0);
    const remaining = Math.max(0, budget - spent);
    const percentUsed = budget > 0 ? Math.min(200, Math.round((spent / budget) * 100)) : 0;
    return {
      projectId: p.id,
      projectName: p.name,
      budget,
      spent,
      remaining,
      percentUsed,
      budgetedHours: Number(p.budgetedHours),
      trackedHours: Number(p.trackedHours),
    };
  });

  const totalBudget = projectList.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projectList.reduce((s, p) => s + p.spent, 0);
  const totalRemaining = projectList.reduce((s, p) => s + p.remaining, 0);
  const averagePercentUsed = projectList.length > 0
    ? Math.round(projectList.reduce((s, p) => s + p.percentUsed, 0) / projectList.length)
    : 0;

  res.json({ projects: projectList, totals: { totalBudget, totalSpent, totalRemaining, averagePercentUsed } });
});

router.get("/reports/burn-down/:projectId", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId, 10);
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) { res.status(404).json({ error: "Not found" }); return; }

  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.projectId, projectId));
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "Completed").length;

  const startDate = new Date(project.startDate);
  const dueDate = new Date(project.dueDate);
  const now = new Date();
  const endDate = now < dueDate ? now : dueDate;

  const dataPoints: { date: string; remaining: number; ideal: number }[] = [];
  const totalDays = Math.max(1, Math.ceil((dueDate.getTime() - startDate.getTime()) / 86400000));
  const totalWeeks = Math.ceil(totalDays / 7);

  for (let week = 0; week <= totalWeeks; week++) {
    const pointDate = new Date(startDate);
    pointDate.setDate(startDate.getDate() + week * 7);
    if (pointDate > new Date(endDate.getTime() + 7 * 86400000)) break;

    const daysPassed = Math.ceil((pointDate.getTime() - startDate.getTime()) / 86400000);
    const ideal = Math.max(0, totalTasks - (totalTasks * daysPassed / totalDays));
    const isPast = pointDate <= now;
    const remaining = isPast ? totalTasks - completedTasks : totalTasks;

    dataPoints.push({
      date: pointDate.toISOString().slice(0, 10),
      remaining: isPast ? remaining : totalTasks,
      ideal: Math.round(ideal * 10) / 10,
    });
  }

  res.json({ projectId, projectName: project.name, totalTasks, completedTasks, dataPoints });
});


// ─── Project Performance Report ──────────────────────────────────────────────
router.get("/reports/project-performance", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);
  const projects = await db.select().from(projectsTable);
  const tasks = await db.select().from(tasksTable);
  const templates = await db.select().from(projectTemplatesTable);
  const accounts = await db.select().from(accountsTable);
  const surveys = await db.select().from(csatSurveysTable);
  const responses = await db.select().from(csatResponsesTable);

  const rows = projects.map(p => {
    const pTasks = tasks.filter(t => t.projectId === p.id && !t.isMilestone);
    const total = pTasks.length;
    const completed = pTasks.filter(t => t.status === "Completed").length;
    const overdue = pTasks.filter(t => t.dueDate && t.dueDate < today && t.status !== "Completed").length;
    const nonTemplate = pTasks.filter(t => !t.fromTemplate).length;
    const onTimeRate = (completed + overdue) > 0 ? Math.round((completed / (completed + overdue)) * 100) : null;

    const pSurveys = surveys.filter(s => s.projectId === p.id && s.rating !== null);
    const pResponses = responses.filter(r => r.projectId === p.id);
    const allRatings = [
      ...pSurveys.map(s => s.rating as number),
      ...pResponses.map(r => r.rating),
    ];
    const csatAvg = allRatings.length > 0 ? Math.round((allRatings.reduce((s, r) => s + r, 0) / allRatings.length) * 10) / 10 : null;

    const template = p.templateId ? templates.find(t => t.id === p.templateId) : null;
    const account = accounts.find(a => a.id === p.accountId);

    const planned = Math.ceil((new Date(p.dueDate).getTime() - new Date(p.startDate).getTime()) / 86400000);

    return {
      projectId: p.id,
      projectName: p.name,
      status: p.status,
      health: p.health,
      accountName: account?.name ?? null,
      templateUsed: !!p.templateId,
      templateName: template?.name ?? null,
      totalTasks: total,
      completedTasks: completed,
      overdueTasks: overdue,
      nonTemplateTasks: nonTemplate,
      onTimeRate,
      csatAvg,
      csatCount: allRatings.length,
      startDate: p.startDate,
      dueDate: p.dueDate,
      plannedDays: planned,
    };
  });

  res.json(rows);
});

// ─── Operations Insights Report ───────────────────────────────────────────────
router.get("/reports/operations-insights", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);
  const projects = await db.select().from(projectsTable);
  const tasks = await db.select().from(tasksTable);
  const templates = await db.select().from(projectTemplatesTable);
  const surveys = await db.select().from(csatSurveysTable);
  const responses = await db.select().from(csatResponsesTable);

  const grouped = new Map<string, {
    templateId: number | null; templateName: string; projects: typeof projects;
  }>();

  for (const t of templates) {
    grouped.set(`t-${t.id}`, { templateId: t.id, templateName: t.name, projects: [] });
  }
  grouped.set("no-template", { templateId: null, templateName: "(No Template)", projects: [] });

  for (const p of projects) {
    const key = p.templateId ? `t-${p.templateId}` : "no-template";
    const g = grouped.get(key);
    if (g) g.projects.push(p);
  }

  const rows = Array.from(grouped.values())
    .filter(g => g.projects.length > 0)
    .map(g => {
      const pIds = new Set(g.projects.map(p => p.id));
      const pTasks = tasks.filter(t => pIds.has(t.projectId) && !t.isMilestone);
      const total = pTasks.length;
      const completed = pTasks.filter(t => t.status === "Completed").length;
      const overdue = pTasks.filter(t => t.dueDate && t.dueDate < today && t.status !== "Completed").length;
      const nonTemplate = pTasks.filter(t => !t.fromTemplate).length;
      const onTimeRate = (completed + overdue) > 0 ? Math.round((completed / (completed + overdue)) * 100) : null;

      const allRatings = [
        ...surveys.filter(s => pIds.has(s.projectId) && s.rating !== null).map(s => s.rating as number),
        ...responses.filter(r => pIds.has(r.projectId)).map(r => r.rating),
      ];
      const csatAvg = allRatings.length > 0 ? Math.round((allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 10) / 10 : null;

      const completedProjects = g.projects.filter(p => p.status === "Completed");
      const avgDuration = completedProjects.length > 0
        ? Math.round(completedProjects.reduce((s, p) => s + Math.ceil((new Date(p.dueDate).getTime() - new Date(p.startDate).getTime()) / 86400000), 0) / completedProjects.length)
        : null;

      return {
        templateId: g.templateId,
        templateName: g.templateName,
        projectCount: g.projects.length,
        completedProjects: completedProjects.length,
        onTimeRate,
        totalTasks: total,
        completedTasks: completed,
        nonTemplateTasks: nonTemplate,
        nonTemplateRatio: total > 0 ? Math.round((nonTemplate / total) * 100) : 0,
        csatAvg,
        avgDurationDays: avgDuration,
      };
    });

  res.json(rows);
});

// ─── CSAT Trend Report ────────────────────────────────────────────────────────
router.get("/reports/csat-trend", async (_req, res): Promise<void> => {
  const surveys = await db.select().from(csatSurveysTable);
  const responses = await db.select().from(csatResponsesTable);
  const projects = await db.select().from(projectsTable);

  const allRatings: { date: string; rating: number; projectId: number }[] = [
    ...surveys.filter(s => s.rating !== null && s.completedAt !== null).map(s => ({
      date: s.completedAt!.toISOString().slice(0, 7),
      rating: s.rating as number,
      projectId: s.projectId,
    })),
    ...responses.map(r => ({
      date: r.submittedAt.toISOString().slice(0, 7),
      rating: r.rating,
      projectId: r.projectId,
    })),
  ];

  const monthMap = new Map<string, number[]>();
  for (const r of allRatings) {
    if (!monthMap.has(r.date)) monthMap.set(r.date, []);
    monthMap.get(r.date)!.push(r.rating);
  }
  const byMonth = Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, ratings]) => ({
    month,
    avgRating: Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10,
    count: ratings.length,
  }));

  const byProject = projects.map(p => {
    const pr = allRatings.filter(r => r.projectId === p.id);
    if (pr.length === 0) return null;
    const avg = Math.round((pr.reduce((s, r) => s + r.rating, 0) / pr.length) * 10) / 10;
    return { projectId: p.id, projectName: p.name, avgRating: avg, count: pr.length };
  }).filter(Boolean);

  const allValues = allRatings.map(r => r.rating);
  const overallAvg = allValues.length > 0 ? Math.round((allValues.reduce((s, r) => s + r, 0) / allValues.length) * 10) / 10 : null;

  res.json({ byMonth, byProject, overallAvg, totalResponses: allValues.length });
});

// ─── Interval IQ Report ───────────────────────────────────────────────────────
router.get("/reports/interval-iq", async (_req, res): Promise<void> => {
  const projects = await db.select().from(projectsTable);
  const tasks = await db.select().from(tasksTable);

  const existingEvents = await db.select().from(keyEventsTable);

  if (existingEvents.length === 0) {
    const milestones = tasks.filter(t => t.isMilestone && t.dueDate);
    for (const m of milestones) {
      const project = projects.find(p => p.id === m.projectId);
      if (!project) continue;
      const existing = existingEvents.find(e => e.projectId === m.projectId && e.name === m.name);
      if (!existing) {
        await db.insert(keyEventsTable).values({
          projectId: m.projectId,
          name: m.name,
          eventDate: m.dueDate!,
          eventType: "milestone",
        });
      }
    }
    for (const p of projects) {
      await db.insert(keyEventsTable).values([
        { projectId: p.id, name: "Project Kickoff", eventDate: p.startDate, eventType: "project_start" },
        { projectId: p.id, name: "Project Go-Live", eventDate: p.dueDate, eventType: "project_end" },
      ]).onConflictDoNothing();
    }
  }

  const allEvents = await db.select().from(keyEventsTable);
  const allIntervals = await db.select().from(intervalsTable);

  if (allIntervals.length === 0) {
    for (const p of projects) {
      const pEvents = allEvents.filter(e => e.projectId === p.id);
      const kickoff = pEvents.find(e => e.eventType === "project_start");
      const golive = pEvents.find(e => e.eventType === "project_end");
      if (kickoff && golive) {
        await db.insert(intervalsTable).values({
          projectId: p.id,
          name: "Kickoff to Go-Live",
          startEventId: kickoff.id,
          endEventId: golive.id,
          benchmarkDays: 90,
        }).onConflictDoNothing();
      }
    }
  }

  const finalIntervals = await db.select().from(intervalsTable);
  const finalEvents = await db.select().from(keyEventsTable);

  const rows = finalIntervals.map(interval => {
    const project = projects.find(p => p.id === interval.projectId);
    const startEvent = finalEvents.find(e => e.id === interval.startEventId);
    const endEvent = finalEvents.find(e => e.id === interval.endEventId);

    let actualDays: number | null = null;
    if (startEvent && endEvent) {
      const diff = new Date(endEvent.eventDate).getTime() - new Date(startEvent.eventDate).getTime();
      actualDays = Math.ceil(diff / 86400000);
    }

    const isOverrun = actualDays !== null && actualDays > interval.benchmarkDays;
    const delta = actualDays !== null ? actualDays - interval.benchmarkDays : null;

    return {
      intervalId: interval.id,
      projectId: interval.projectId,
      projectName: project?.name ?? "Unknown",
      intervalName: interval.name,
      startEventName: startEvent?.name ?? null,
      startDate: startEvent?.eventDate ?? null,
      endEventName: endEvent?.name ?? null,
      endDate: endEvent?.eventDate ?? null,
      benchmarkDays: interval.benchmarkDays,
      actualDays,
      delta,
      isOverrun,
    };
  });

  res.json(rows);
});

router.post("/reports/interval-iq/events", async (req, res): Promise<void> => {
  const { projectId, name, eventDate, eventType = "manual" } = req.body ?? {};
  if (!projectId || !name || !eventDate) { res.status(400).json({ error: "projectId, name, eventDate required" }); return; }
  const [ev] = await db.insert(keyEventsTable).values({ projectId: parseInt(projectId, 10), name, eventDate, eventType }).returning();
  res.status(201).json(ev);
});

router.post("/reports/interval-iq/intervals", async (req, res): Promise<void> => {
  const { projectId, name, startEventId, endEventId, benchmarkDays = 0 } = req.body ?? {};
  if (!projectId || !name) { res.status(400).json({ error: "projectId and name required" }); return; }
  const [row] = await db.insert(intervalsTable).values({
    projectId: parseInt(projectId, 10),
    name,
    startEventId: startEventId ? parseInt(startEventId, 10) : null,
    endEventId: endEventId ? parseInt(endEventId, 10) : null,
    benchmarkDays: parseInt(benchmarkDays, 10) || 0,
  }).returning();
  res.status(201).json(row);
});

// ─── Capacity Planning Report ────────────────────────────────────────────────
// Demand vs Supply (FTE) by week for up to 52 weeks. Demand split into
// assigned (named user) and unassigned (placeholder). Includes role breakdown.
router.get("/reports/capacity-planning", async (req, res): Promise<void> => {
  const STD_WEEK = 40;
  const requested = parseInt(String(req.query.weeks ?? "12"), 10);
  const weeks = Math.min(52, Math.max(1, isNaN(requested) ? 12 : requested));

  const startParam = req.query.startDate ? String(req.query.startDate) : null;
  const startDate = startParam ? new Date(startParam) : new Date();
  // Snap to Monday
  const dow = startDate.getDay();
  const diffMon = dow === 0 ? -6 : 1 - dow;
  startDate.setDate(startDate.getDate() + diffMon);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + weeks * 7 - 1);
  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);

  const [users, allocations, projects, holidays, timeOffs] = await Promise.all([
    db.select().from(usersTable),
    db.select().from(allocationsTable),
    db.select().from(projectsTable),
    db.select().from(holidayDatesTable),
    db.select().from(timeOffRequestsTable).where(eq(timeOffRequestsTable.status, "Approved")),
  ]);

  const internalActiveUsers = users.filter(u => u.isInternal !== false && u.isActive === 1);
  const activeProjectIds = new Set(projects.filter(p => !p.deletedAt).map(p => p.id));
  const activeAllocs = allocations.filter(a => activeProjectIds.has(a.projectId));

  function intersectsWeek(allocStart: string, allocEnd: string, wStart: string, wEnd: string) {
    return allocStart <= wEnd && allocEnd >= wStart;
  }
  function workingDaysInWeek(wStart: Date) {
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(wStart); d.setDate(wStart.getDate() + i);
      const dn = d.getDay();
      if (dn !== 0 && dn !== 6) days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }

  const buckets: any[] = [];
  for (let w = 0; w < weeks; w++) {
    const wStart = new Date(startDate); wStart.setDate(startDate.getDate() + w * 7);
    const wEnd = new Date(wStart); wEnd.setDate(wStart.getDate() + 6);
    const wStartStr = wStart.toISOString().slice(0, 10);
    const wEndStr = wEnd.toISOString().slice(0, 10);
    const workDays = workingDaysInWeek(wStart);
    const holidaySet = new Set(
      holidays.filter(h => workDays.includes(h.date)).map(h => h.date)
    );

    let supplyHours = 0;
    let timeOffHours = 0;
    let holidayHours = 0;
    const roleSupply = new Map<string, number>();

    for (const u of internalActiveUsers) {
      const dailyCap = u.capacity / 5;
      const userHolidayHours = holidaySet.size * dailyCap;
      const userTOs = timeOffs.filter(
        t => t.userId === u.id && t.startDate <= wEndStr && t.endDate >= wStartStr
      );
      let toDays = 0;
      for (const t of userTOs) {
        const tStart = t.startDate > wStartStr ? t.startDate : wStartStr;
        const tEnd = t.endDate < wEndStr ? t.endDate : wEndStr;
        for (const wd of workDays) {
          if (wd >= tStart && wd <= tEnd) toDays++;
        }
      }
      const userTOHours = toDays * dailyCap;
      const cap = Math.max(0, u.capacity - userHolidayHours - userTOHours);
      supplyHours += cap;
      holidayHours += userHolidayHours;
      timeOffHours += userTOHours;
      const r = u.role || "Unspecified";
      roleSupply.set(r, (roleSupply.get(r) ?? 0) + cap);
    }

    let assignedHours = 0;
    let unassignedHours = 0;
    const roleDemand = new Map<string, number>();
    for (const a of activeAllocs) {
      if (!intersectsWeek(a.startDate, a.endDate, wStartStr, wEndStr)) continue;
      const hpw = Number(a.hoursPerWeek);
      if (a.userId !== null) assignedHours += hpw;
      else unassignedHours += hpw;
      const r = a.role || a.placeholderRole || "Unspecified";
      roleDemand.set(r, (roleDemand.get(r) ?? 0) + hpw);
    }

    const allRoles = new Set<string>([...roleSupply.keys(), ...roleDemand.keys()]);
    const byRole = Array.from(allRoles).map(role => {
      const supply = roleSupply.get(role) ?? 0;
      const demand = roleDemand.get(role) ?? 0;
      return {
        role,
        supplyFTE: Math.round((supply / STD_WEEK) * 100) / 100,
        demandFTE: Math.round((demand / STD_WEEK) * 100) / 100,
        surplusFTE: Math.round(((supply - demand) / STD_WEEK) * 100) / 100,
      };
    }).sort((a, b) => a.role.localeCompare(b.role));

    buckets.push({
      weekStart: wStartStr,
      weekEnd: wEndStr,
      totalCapacityFTE: Math.round((internalActiveUsers.reduce((s, u) => s + u.capacity, 0) / STD_WEEK) * 100) / 100,
      timeOffFTE: Math.round((timeOffHours / STD_WEEK) * 100) / 100,
      holidayFTE: Math.round((holidayHours / STD_WEEK) * 100) / 100,
      availableFTE: Math.round((supplyHours / STD_WEEK) * 100) / 100,
      assignedDemandFTE: Math.round((assignedHours / STD_WEEK) * 100) / 100,
      unassignedDemandFTE: Math.round((unassignedHours / STD_WEEK) * 100) / 100,
      totalDemandFTE: Math.round(((assignedHours + unassignedHours) / STD_WEEK) * 100) / 100,
      surplusFTE: Math.round(((supplyHours - assignedHours - unassignedHours) / STD_WEEK) * 100) / 100,
      byRole,
    });
  }

  res.json({ weeks, startDate: startStr, endDate: endStr, standardWeekHours: STD_WEEK, buckets });
});

// ─── Utilization Sub-Report (grid: users × periods) ──────────────────────────
// Available Capacity = Total Capacity − Time-Off − Holidays
// Cell value = (Tracked / Available) × 100  and  (Billable Tracked / Available) × 100
router.get("/reports/utilization-grid", async (req, res): Promise<void> => {
  const fromStr = String(req.query.from ?? "");
  const toStr = String(req.query.to ?? "");
  const grouping = (String(req.query.grouping ?? "week") === "month" ? "month" : "week") as "week" | "month";
  const userIdsParam = String(req.query.userIds ?? "");
  const filterUserIds = userIdsParam
    ? new Set(userIdsParam.split(",").map(s => parseInt(s, 10)).filter(n => Number.isFinite(n)))
    : null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromStr) || !/^\d{4}-\d{2}-\d{2}$/.test(toStr) || fromStr > toStr) {
    res.status(400).json({ error: "from/to must be YYYY-MM-DD with from <= to" });
    return;
  }

  const [users, entries, holidays, timeOffs] = await Promise.all([
    db.select().from(usersTable),
    db.select().from(timeEntriesTable),
    db.select().from(holidayDatesTable),
    db.select().from(timeOffRequestsTable).where(eq(timeOffRequestsTable.status, "Approved")),
  ]);

  const activeUsers = users
    .filter(u => u.isActive === 1 && u.isInternal !== false)
    .filter(u => !filterUserIds || filterUserIds.has(u.id));

  // Build period buckets
  function snapToMonday(d: Date): Date {
    const out = new Date(d);
    const dow = out.getUTCDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    out.setUTCDate(out.getUTCDate() + diff);
    out.setUTCHours(0, 0, 0, 0);
    return out;
  }
  type Period = { key: string; label: string; start: string; end: string };
  const periods: Period[] = [];
  if (grouping === "week") {
    const cur = snapToMonday(new Date(fromStr + "T00:00:00Z"));
    const fin = new Date(toStr + "T00:00:00Z");
    while (cur <= fin) {
      const wEnd = new Date(cur); wEnd.setUTCDate(cur.getUTCDate() + 6);
      const ks = cur.toISOString().slice(0, 10);
      periods.push({ key: ks, label: `Wk ${ks.slice(5)}`, start: ks, end: wEnd.toISOString().slice(0, 10) });
      cur.setUTCDate(cur.getUTCDate() + 7);
    }
  } else {
    const cur = new Date(fromStr.slice(0, 7) + "-01T00:00:00Z");
    const fin = new Date(toStr.slice(0, 7) + "-01T00:00:00Z");
    while (cur <= fin) {
      const ym = cur.toISOString().slice(0, 7);
      const last = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
      periods.push({ key: ym, label: ym, start: `${ym}-01`, end: last });
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
  }

  // Per-user available capacity for a [start, end] inclusive window
  function availableCapacity(u: typeof users[0], start: string, end: string): number {
    const dailyCap = u.capacity / 5;
    let workingDays = 0;
    const workingDaySet = new Set<string>();
    const cur = new Date(start + "T00:00:00Z");
    const fin = new Date(end + "T00:00:00Z");
    while (cur <= fin) {
      const dow = cur.getUTCDay();
      if (dow !== 0 && dow !== 6) {
        workingDays++;
        workingDaySet.add(cur.toISOString().slice(0, 10));
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    const totalCap = workingDays * dailyCap;

    const userHolidaySet = u.holidayCalendarId
      ? new Set(holidays.filter(h => h.calendarId === u.holidayCalendarId && workingDaySet.has(h.date)).map(h => h.date))
      : new Set<string>();
    const holidayHours = userHolidaySet.size * dailyCap;

    const userTOs = timeOffs.filter(t => t.userId === u.id && t.startDate <= end && t.endDate >= start);
    let toHours = 0;
    for (const t of userTOs) {
      const tStart = t.startDate > start ? t.startDate : start;
      const tEnd = t.endDate < end ? t.endDate : end;
      const c = new Date(tStart + "T00:00:00Z");
      const f = new Date(tEnd + "T00:00:00Z");
      while (c <= f) {
        const ds = c.toISOString().slice(0, 10);
        const dow = c.getUTCDay();
        if (dow !== 0 && dow !== 6 && !userHolidaySet.has(ds)) {
          if ((t as any).durationType === "Half Day") toHours += dailyCap / 2;
          else if ((t as any).durationType === "Custom" && (t as any).customHours) toHours += Number((t as any).customHours);
          else toHours += dailyCap;
        }
        c.setUTCDate(c.getUTCDate() + 1);
      }
    }
    return Math.max(0, totalCap - holidayHours - toHours);
  }

  const rows = activeUsers.map(u => {
    const cells = periods.map(p => {
      const userPeriodEntries = entries.filter(e => e.userId === u.id && e.date >= p.start && e.date <= p.end);
      const tracked = userPeriodEntries.reduce((s, e) => s + Number(e.hours), 0);
      const billable = userPeriodEntries.filter(e => e.billable).reduce((s, e) => s + Number(e.hours), 0);
      const cap = availableCapacity(u, p.start, p.end);
      return {
        period: p.key,
        availableHours: Math.round(cap * 10) / 10,
        trackedHours: Math.round(tracked * 10) / 10,
        billableHours: Math.round(billable * 10) / 10,
        utilization: cap > 0 ? Math.round((tracked / cap) * 100) : null,
        billableUtilization: cap > 0 ? Math.round((billable / cap) * 100) : null,
      };
    });
    const totals = cells.reduce((acc, c) => ({
      avail: acc.avail + c.availableHours,
      tracked: acc.tracked + c.trackedHours,
      billable: acc.billable + c.billableHours,
    }), { avail: 0, tracked: 0, billable: 0 });
    return {
      userId: u.id,
      userName: u.name,
      role: u.role,
      cells,
      totals: {
        availableHours: Math.round(totals.avail * 10) / 10,
        trackedHours: Math.round(totals.tracked * 10) / 10,
        billableHours: Math.round(totals.billable * 10) / 10,
        utilization: totals.avail > 0 ? Math.round((totals.tracked / totals.avail) * 100) : null,
        billableUtilization: totals.avail > 0 ? Math.round((totals.billable / totals.avail) * 100) : null,
      },
    };
  });

  res.json({ from: fromStr, to: toStr, grouping, periods, rows });
});

// ─── Timesheet Submissions Sub-Report ────────────────────────────────────────
// Per-user × per-week status. View toggles: submission vs approval.
router.get("/reports/timesheet-submissions", async (req, res): Promise<void> => {
  const fromStr = String(req.query.from ?? "");
  const toStr = String(req.query.to ?? "");
  const view = String(req.query.view ?? "submission") === "approval" ? "approval" : "submission";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromStr) || !/^\d{4}-\d{2}-\d{2}$/.test(toStr) || fromStr > toStr) {
    res.status(400).json({ error: "from/to must be YYYY-MM-DD with from <= to" });
    return;
  }

  const [users, sheets, entries] = await Promise.all([
    db.select().from(usersTable),
    db.select().from(timesheetsTable),
    db.select().from(timeEntriesTable),
  ]);

  const activeUsers = users.filter(u => u.isActive === 1 && u.isInternal !== false);

  function snapToMonday(d: Date): Date {
    const out = new Date(d);
    const dow = out.getUTCDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    out.setUTCDate(out.getUTCDate() + diff);
    out.setUTCHours(0, 0, 0, 0);
    return out;
  }

  const weeks: { weekStart: string; weekEnd: string }[] = [];
  const cur = snapToMonday(new Date(fromStr + "T00:00:00Z"));
  const fin = new Date(toStr + "T00:00:00Z");
  while (cur <= fin) {
    const wEnd = new Date(cur); wEnd.setUTCDate(cur.getUTCDate() + 6);
    weeks.push({ weekStart: cur.toISOString().slice(0, 10), weekEnd: wEnd.toISOString().slice(0, 10) });
    cur.setUTCDate(cur.getUTCDate() + 7);
  }

  const rows = activeUsers.map(u => {
    const cells = weeks.map(w => {
      const sheet = sheets.find(s => s.userId === u.id && s.weekStart === w.weekStart);
      const userWeekEntries = entries.filter(e => e.userId === u.id && e.date >= w.weekStart && e.date <= w.weekEnd);
      const trackedHours = userWeekEntries.reduce((s, e) => s + Number(e.hours), 0);

      let status: "approved" | "submitted" | "partial" | "missing" = "missing";
      if (sheet) {
        if (sheet.status === "Approved") status = "approved";
        else if (sheet.status === "Submitted" || sheet.submittedAt) status = "submitted";
        else if (trackedHours > 0) status = "partial";
        else status = "missing";
      } else if (trackedHours > 0) {
        status = "partial";
      }

      // Approval view collapses statuses: approved=green, anything-not-approved-with-hours=yellow, missing=red
      const indicator = view === "approval"
        ? (status === "approved" ? "green" : trackedHours > 0 ? "yellow" : "red")
        : (status === "approved" || status === "submitted" ? "green" : status === "partial" ? "yellow" : "red");

      return {
        weekStart: w.weekStart,
        status,
        indicator,
        trackedHours: Math.round(trackedHours * 10) / 10,
        billableHours: Math.round(userWeekEntries.filter(e => e.billable).reduce((s, e) => s + Number(e.hours), 0) * 10) / 10,
        submittedAt: sheet?.submittedAt ?? null,
        approvedAt: sheet?.approvedAt ?? null,
      };
    });
    const counts = cells.reduce((acc, c) => {
      acc[c.indicator] = (acc[c.indicator] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return {
      userId: u.id,
      userName: u.name,
      role: u.role,
      cells,
      counts: { green: counts.green ?? 0, yellow: counts.yellow ?? 0, red: counts.red ?? 0 },
    };
  });

  res.json({ from: fromStr, to: toStr, view, weeks, rows });
});

// ─── Async CSV Export Stub ───────────────────────────────────────────────────
// Returns 202 with a job id. In production this would enqueue a worker that
// generates the CSV and emails it to the requester. Frontend uses this to
// avoid browser timeouts on large date ranges.
router.post("/reports/export-async", async (req, res): Promise<void> => {
  const { reportType, filters, deliveryEmail } = (req.body ?? {}) as {
    reportType?: string; filters?: unknown; deliveryEmail?: string;
  };
  if (!reportType || typeof reportType !== "string") {
    res.status(400).json({ error: "reportType is required" });
    return;
  }
  const email = (deliveryEmail && typeof deliveryEmail === "string" && deliveryEmail.trim()) || null;
  const jobId = `${reportType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  // No queue infrastructure yet — caller is informed delivery is async.
  res.status(202).json({
    jobId,
    status: "queued",
    reportType,
    deliveryEmail: email,
    message: email
      ? `Export queued. We'll email the CSV to ${email} when it's ready.`
      : `Export queued. We'll email the CSV to your account email when it's ready.`,
    receivedFilters: filters ?? null,
  });
});

export default router;

