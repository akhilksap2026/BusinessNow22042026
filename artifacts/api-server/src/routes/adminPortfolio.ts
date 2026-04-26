import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  projectsTable,
  accountsTable,
  usersTable,
  allocationsTable,
  invoicesTable,
  changeOrdersTable,
  resourceRequestsTable,
  tasksTable,
} from "@workspace/db";
import { requirePM } from "../middleware/rbac";

const router: IRouter = Router();

type HealthBucket = "Green" | "Amber" | "Red";

function healthToBucket(h: string): HealthBucket {
  if (h === "On Track") return "Green";
  if (h === "At Risk") return "Amber";
  if (h === "Off Track") return "Red";
  return "Green";
}

function isAllocationActive(a: { startDate: string; endDate: string }, today: string): boolean {
  return a.startDate <= today && a.endDate >= today;
}

function daysBetween(fromIso: string | Date, toIso: string | Date): number {
  const f = typeof fromIso === "string" ? new Date(fromIso) : fromIso;
  const t = typeof toIso === "string" ? new Date(toIso) : toIso;
  return Math.max(0, Math.floor((t.getTime() - f.getTime()) / 86400000));
}

router.get("/admin/portfolio-summary", requirePM, async (_req, res): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();

  // ── Pull base data in parallel ────────────────────────────────────────────
  const [projects, accounts, users, allocations, invoices, changeOrders, resourceRequests, tasks] =
    await Promise.all([
      db.select().from(projectsTable),
      db.select().from(accountsTable),
      db.select().from(usersTable),
      db.select().from(allocationsTable),
      db.select().from(invoicesTable),
      db.select().from(changeOrdersTable),
      db.select().from(resourceRequestsTable),
      db.select().from(tasksTable),
    ]);

  // Exclude soft-deleted projects from the portfolio view.
  const activeProjects = projects.filter((p) => !p.deletedAt);

  const accountsById = new Map(accounts.map((a) => [a.id, a]));
  const usersById = new Map(users.map((u) => [u.id, u]));

  // Approved change-order amounts and additional hours per project.
  const approvedCoByProject = new Map<number, { amount: number; hours: number }>();
  for (const co of changeOrders) {
    if (co.status !== "Approved") continue;
    const cur = approvedCoByProject.get(co.projectId) ?? { amount: 0, hours: 0 };
    cur.amount += Number(co.amount);
    cur.hours += Number(co.additionalHours);
    approvedCoByProject.set(co.projectId, cur);
  }

  // Invoiced (Paid + Approved) and pending (Draft + In Review) per project.
  const invoicedByProject = new Map<number, { invoiced: number; pending: number }>();
  for (const inv of invoices) {
    const cur = invoicedByProject.get(inv.projectId) ?? { invoiced: 0, pending: 0 };
    if (inv.status === "Paid" || inv.status === "Approved") {
      cur.invoiced += Number(inv.total);
    } else if (inv.status === "Draft" || inv.status === "In Review") {
      cur.pending += Number(inv.total);
    }
    invoicedByProject.set(inv.projectId, cur);
  }

  // Planned hours per project: prefer task rollup, fall back to project.budgetedHours.
  const taskPlannedByProject = new Map<number, number>();
  for (const t of tasks) {
    if (t.isMilestone) continue;
    const planned = Number((t as any).plannedHours ?? 0) || 0;
    if (planned <= 0) continue;
    taskPlannedByProject.set(t.projectId, (taskPlannedByProject.get(t.projectId) ?? 0) + planned);
  }

  // ── Section 2: Project rows ───────────────────────────────────────────────
  const projectRows = activeProjects.map((p) => {
    const account = accountsById.get(p.accountId);
    const owner = usersById.get(p.ownerId);
    const co = approvedCoByProject.get(p.id) ?? { amount: 0, hours: 0 };
    const inv = invoicedByProject.get(p.id) ?? { invoiced: 0, pending: 0 };

    const sowBudget = Number(p.budget) || 0;
    const totalBudget = sowBudget + co.amount;
    const actuals = inv.invoiced;
    const percentUsed = totalBudget > 0 ? Math.round((actuals / totalBudget) * 100) : 0;

    const plannedHoursTask = taskPlannedByProject.get(p.id) ?? 0;
    const plannedHoursProject = (Number(p.budgetedHours) || 0) + co.hours;
    const plannedHours = plannedHoursTask > 0 ? plannedHoursTask : plannedHoursProject;
    const actualHours = Number(p.trackedHours) || 0;
    const completion = Number(p.completion) || 0;

    // ETC / EAC: prefer completion %; fall back to (planned - actual).
    let etc = Math.max(0, plannedHours - actualHours);
    let eac = plannedHours > 0 ? plannedHours : actualHours;
    if (completion > 0 && completion < 100 && actualHours > 0) {
      eac = Math.round((actualHours / completion) * 100);
      etc = Math.max(0, eac - actualHours);
    } else if (completion >= 100) {
      eac = actualHours;
      etc = 0;
    }

    const dueDate = new Date(p.dueDate);
    const daysRemaining = Math.max(0, Math.ceil((dueDate.getTime() - now.getTime()) / 86400000));

    // Reason hint for the health tooltip.
    const healthReasons: string[] = [];
    if (percentUsed >= 90) healthReasons.push(`Budget ${percentUsed}% spent`);
    if (plannedHours > 0 && actualHours > plannedHours) {
      healthReasons.push(`Hours over plan (${actualHours.toFixed(1)} / ${plannedHours.toFixed(1)})`);
    }
    if (eac > totalBudget && totalBudget > 0) healthReasons.push(`EAC > Budget`);
    if (totalBudget === 0) healthReasons.push(`No budget recorded`);

    return {
      projectId: p.id,
      projectName: p.name,
      accountId: p.accountId,
      accountName: account?.name ?? null,
      ownerId: p.ownerId,
      ownerName: owner?.name ?? null,
      status: p.status,
      health: p.health,
      healthBucket: healthToBucket(p.health),
      healthReason: healthReasons.length > 0 ? healthReasons.join("; ") : "Within thresholds",
      billingType: p.billingType,
      sowBudget,
      changeOrderAmount: co.amount,
      totalBudget,
      actuals,
      pendingInvoiced: inv.pending,
      percentUsed,
      plannedHours,
      actualHours,
      etc,
      eac,
      completion,
      startDate: p.startDate,
      dueDate: p.dueDate,
      daysRemaining,
    };
  });

  // ── Section 1: Portfolio KPIs ─────────────────────────────────────────────
  const totalBudget = projectRows.reduce((s, p) => s + p.totalBudget, 0);
  const totalPlannedHours = projectRows.reduce((s, p) => s + p.plannedHours, 0);
  const totalActualHours = projectRows.reduce((s, p) => s + p.actualHours, 0);
  const burnPercent = totalPlannedHours > 0
    ? Math.round((totalActualHours / totalPlannedHours) * 100)
    : 0;
  const totalBilled = projectRows.reduce((s, p) => s + p.actuals, 0);
  const totalPending = projectRows.reduce((s, p) => s + p.pendingInvoiced, 0);
  const atRiskCount = projectRows.filter(
    (p) => (p.health === "At Risk" || p.health === "Off Track") && p.status !== "Completed",
  ).length;

  // ── Section 3: Over-allocated employees ───────────────────────────────────
  const activeUsers = users.filter((u) => (u as any).isActive !== 0);
  const overAllocatedEmployees: Array<{
    userId: number;
    userName: string;
    role: string;
    department: string;
    capacity: number;
    allocatedHours: number;
    utilizationPercent: number;
    projects: Array<{ projectId: number; projectName: string; hoursPerWeek: number }>;
  }> = [];

  for (const u of activeUsers) {
    const userAllocs = allocations.filter(
      (a) => a.userId === u.id && isAllocationActive(a, today),
    );
    if (userAllocs.length === 0) continue;
    const allocatedHours = userAllocs.reduce((s, a) => s + Number(a.hoursPerWeek), 0);
    const capacity = Number((u as any).capacity ?? 40) || 40;
    const utilizationPercent = capacity > 0 ? Math.round((allocatedHours / capacity) * 100) : 0;
    if (utilizationPercent <= 100) continue;

    const projectsForUser = userAllocs.map((a) => {
      const proj = activeProjects.find((p) => p.id === a.projectId);
      return {
        projectId: a.projectId,
        projectName: proj?.name ?? `Project #${a.projectId}`,
        hoursPerWeek: Number(a.hoursPerWeek),
      };
    });

    overAllocatedEmployees.push({
      userId: u.id,
      userName: u.name,
      role: u.role,
      department: u.department,
      capacity,
      allocatedHours,
      utilizationPercent,
      projects: projectsForUser,
    });
  }
  overAllocatedEmployees.sort((a, b) => b.utilizationPercent - a.utilizationPercent);

  // ── Section 4: Open / pending resource requests ───────────────────────────
  const openStatuses = new Set(["Pending", "Open", "Approved"]);
  const openResourceRequests = resourceRequests
    .filter((r) => openStatuses.has(r.status) && r.status !== "Fulfilled")
    .map((r) => {
      const proj = activeProjects.find((p) => p.id === r.projectId);
      return {
        id: r.id,
        projectId: r.projectId,
        projectName: proj?.name ?? `Project #${r.projectId}`,
        role: r.role,
        requiredSkills: r.requiredSkills ?? [],
        hoursPerWeek: Number(r.hoursPerWeek),
        startDate: r.startDate,
        endDate: r.endDate,
        status: r.status,
        priority: r.priority,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        daysSinceRaised: daysBetween(r.createdAt as any, now),
      };
    });

  // ── Section 5: Budget alerts ──────────────────────────────────────────────
  const budgetAlerts: Array<{
    projectId: number;
    projectName: string;
    type: "spend_over_90" | "hours_over_plan" | "eac_over_budget" | "no_budget";
    message: string;
  }> = [];

  for (const p of projectRows) {
    if (p.status === "Completed") continue;
    if (p.totalBudget === 0) {
      budgetAlerts.push({
        projectId: p.projectId,
        projectName: p.projectName,
        type: "no_budget",
        message: "No budget entry recorded",
      });
      continue;
    }
    if (p.percentUsed >= 90) {
      budgetAlerts.push({
        projectId: p.projectId,
        projectName: p.projectName,
        type: "spend_over_90",
        message: `Budget ${p.percentUsed}% spent`,
      });
    }
    if (p.plannedHours > 0 && p.actualHours > p.plannedHours) {
      budgetAlerts.push({
        projectId: p.projectId,
        projectName: p.projectName,
        type: "hours_over_plan",
        message: `Actual ${p.actualHours.toFixed(1)}h > planned ${p.plannedHours.toFixed(1)}h`,
      });
    }
    if (p.eac > p.totalBudget) {
      budgetAlerts.push({
        projectId: p.projectId,
        projectName: p.projectName,
        type: "eac_over_budget",
        message: `EAC $${p.eac.toLocaleString()} exceeds budget $${p.totalBudget.toLocaleString()}`,
      });
    }
  }

  res.json({
    refreshedAt: now.toISOString(),
    kpis: {
      totalBudget,
      totalPlannedHours,
      totalActualHours,
      burnPercent,
      totalBilled,
      totalPending,
      atRiskCount,
      overAllocatedCount: overAllocatedEmployees.length,
      openRequestsCount: openResourceRequests.length,
      projectCount: projectRows.length,
    },
    projects: projectRows,
    overAllocatedEmployees,
    openResourceRequests,
    budgetAlerts,
  });
});

// Suppress unused-import warning if `inArray`/`eq` are not referenced above.
void inArray;
void eq;

export default router;
