import { Router, type IRouter } from "express";
import { db, projectsTable, invoicesTable, timeEntriesTable, usersTable, allocationsTable, notificationsTable, changeOrdersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetDashboardSummaryResponse,
  GetDashboardActivityResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const projects = await db.select().from(projectsTable);
  const invoices = await db.select().from(invoicesTable);
  const entries = await db.select().from(timeEntriesTable);
  const users = await db.select().from(usersTable);
  const allocations = await db.select().from(allocationsTable);

  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'In Progress').length;
  const atRiskProjects = projects.filter(p => p.health === 'At Risk').length;
  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + Number(i.total), 0);
  const outstandingInvoices = invoices.filter(i => i.status === 'Approved' || i.status === 'In Review').reduce((s, i) => s + Number(i.total), 0);

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const billableHoursThisMonth = entries.filter(e => e.billable && e.date >= monthStart).reduce((s, e) => s + Number(e.hours), 0);

  const nowStr = now.toISOString().slice(0, 10);
  const totalCapacity = users.reduce((s, u) => s + u.capacity, 0);
  const totalAllocated = users.reduce((sum, u) => {
    const active = allocations.filter(a => a.userId === u.id && a.endDate >= nowStr);
    return sum + active.reduce((s, a) => s + Number(a.hoursPerWeek), 0);
  }, 0);
  const teamUtilization = totalCapacity > 0 ? Math.round((totalAllocated / totalCapacity) * 100) : 0;

  const in30days = new Date(now); in30days.setDate(now.getDate() + 30);
  const in30Str = in30days.toISOString().slice(0, 10);
  const upcomingDeadlines = projects.filter(p => p.dueDate >= nowStr && p.dueDate <= in30Str && p.status !== 'Completed').length;

  res.json(GetDashboardSummaryResponse.parse({ totalProjects, activeProjects, atRiskProjects, totalRevenue, outstandingInvoices, billableHoursThisMonth, teamUtilization, upcomingDeadlines }));
});

// CR impact aggregate. project.budget is mutated to the REVISED total when a CR
// is approved (see changeOrders.ts), so we derive original = revised − approvedSum.
router.get("/dashboard/cr-impact", async (_req, res): Promise<void> => {
  const projects = await db.select().from(projectsTable);
  const cos = await db.select().from(changeOrdersTable).where(eq(changeOrdersTable.status, "Approved"));
  const revised = projects.reduce((s, p) => s + Number(p.budget ?? 0), 0);
  const crAdditions = cos.reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const originalBudget = Math.max(0, revised - crAdditions);
  res.json({ originalBudget, crAdditions, revised });
});

router.get("/dashboard/activity", async (_req, res): Promise<void> => {
  const notifications = await db.select().from(notificationsTable).orderBy(notificationsTable.timestamp);
  const activity = notifications.slice(-20).reverse().map((n, i) => ({
    id: i + 1,
    type: n.type,
    description: n.message,
    userName: 'System',
    userInitials: 'SY',
    projectName: n.projectName ?? null,
    timestamp: n.timestamp.toISOString(),
    icon: n.type === 'invoice' ? 'receipt' : n.type === 'task' ? 'check' : n.type === 'risk' ? 'alert' : 'bell',
  }));
  res.json(GetDashboardActivityResponse.parse(activity));
});

export default router;
