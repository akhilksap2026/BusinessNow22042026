import { Router, type IRouter } from "express";
import { db, timeEntriesTable, invoicesTable, projectsTable, usersTable, tasksTable, rateCardsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetUtilizationReportResponse,
  GetRevenueReportResponse,
  GetProjectHealthReportResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/reports/utilization", async (_req, res): Promise<void> => {
  const entries = await db.select().from(timeEntriesTable);
  const users = await db.select().from(usersTable);

  const byUser = users.map(u => {
    const userEntries = entries.filter(e => e.userId === u.id);
    const totalHours = userEntries.reduce((s, e) => s + Number(e.hours), 0);
    const billableHours = userEntries.filter(e => e.billable).reduce((s, e) => s + Number(e.hours), 0);
    const utilization = u.capacity > 0 ? Math.min(100, Math.round((totalHours / (u.capacity * 4)) * 100)) : 0;
    return { userId: u.id, userName: u.name, billableHours, totalHours, utilization };
  }).filter(u => u.totalHours > 0);

  const averageUtilization = byUser.length > 0
    ? Math.round(byUser.reduce((s, u) => s + u.utilization, 0) / byUser.length)
    : 0;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const byMonth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const month = `${months[d.getMonth()]} ${d.getFullYear()}`;
    const monthStr = d.toISOString().slice(0, 7);
    const monthEntries = entries.filter(e => e.date.startsWith(monthStr));
    const totalH = monthEntries.reduce((s, e) => s + Number(e.hours), 0);
    const totalCap = users.reduce((s, u) => s + u.capacity * 4, 0);
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
  const byMonth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const month = `${months[d.getMonth()]} ${d.getFullYear()}`;
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
    const budget = Number(p.budget);
    const budgetUsed = budget > 0 ? Math.round((Number(p.trackedHours) / Number(p.budgetedHours || 1)) * 100) : 0;
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

export default router;
