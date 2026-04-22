import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, invoicesTable, timesheetsTable, timeEntriesTable, projectsTable } from "@workspace/db";
import { requireFinance } from "../middleware/rbac";
import {
  ListInvoicesResponse,
  ListInvoicesQueryParams,
  CreateInvoiceBody,
  GetInvoiceParams,
  GetInvoiceResponse,
  UpdateInvoiceParams,
  UpdateInvoiceBody,
  UpdateInvoiceResponse,
  GetFinanceSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapInvoice(i: typeof invoicesTable.$inferSelect) {
  return {
    ...i,
    amount: Number(i.amount),
    tax: Number(i.tax),
    total: Number(i.total),
    createdAt: i.createdAt instanceof Date ? i.createdAt.toISOString() : i.createdAt,
    updatedAt: i.updatedAt instanceof Date ? i.updatedAt.toISOString() : i.updatedAt,
  };
}

router.get("/invoices", async (req, res): Promise<void> => {
  const qp = ListInvoicesQueryParams.safeParse(req.query);
  const conditions = [];
  if (qp.success && qp.data.status) conditions.push(eq(invoicesTable.status, qp.data.status));
  if (qp.success && qp.data.accountId) conditions.push(eq(invoicesTable.accountId, qp.data.accountId));
  const rows = conditions.length
    ? await db.select().from(invoicesTable).where(and(...conditions))
    : await db.select().from(invoicesTable);
  res.json(ListInvoicesResponse.parse(rows.map(mapInvoice)));
});

router.post("/invoices", requireFinance, async (req, res): Promise<void> => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const invoiceCount = await db.select().from(invoicesTable);
  const invoiceId = `INV-${new Date().getFullYear()}-${String(invoiceCount.length + 1).padStart(3, '0')}`;
  const total = Number(parsed.data.amount) + Number(parsed.data.tax);
  const [row] = await db.insert(invoicesTable).values({ ...parsed.data as any, id: invoiceId, total: total.toString(), status: 'Draft' }).returning();
  res.status(201).json(GetInvoiceResponse.parse(mapInvoice(row)));
});

router.get("/invoices/finance-summary", async (_req, res): Promise<void> => {
  const rows = await db.select().from(invoicesTable);
  const totalInvoiced = rows.reduce((s, r) => s + Number(r.total), 0);
  const totalPaid = rows.filter(r => r.status === 'Paid').reduce((s, r) => s + Number(r.total), 0);
  const totalOutstanding = rows.filter(r => r.status === 'Approved' || r.status === 'In Review').reduce((s, r) => s + Number(r.total), 0);
  const totalOverdue = rows.filter(r => r.status === 'Overdue').reduce((s, r) => s + Number(r.total), 0);
  const pipelineValue = rows.filter(r => r.status === 'Draft').reduce((s, r) => s + Number(r.total), 0);

  const byStatusMap = new Map<string, { count: number; total: number }>();
  rows.forEach(r => {
    const existing = byStatusMap.get(r.status) || { count: 0, total: 0 };
    byStatusMap.set(r.status, { count: existing.count + 1, total: existing.total + Number(r.total) });
  });
  const byStatus = Array.from(byStatusMap.entries()).map(([status, { count, total }]) => ({ status, count, total }));

  res.json(GetFinanceSummaryResponse.parse({ totalInvoiced, totalPaid, totalOutstanding, totalOverdue, pipelineValue, byStatus }));
});

router.get("/invoices/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetInvoiceParams.safeParse({ id: raw });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.json(GetInvoiceResponse.parse(mapInvoice(row)));
});

router.patch("/invoices/:id", requireFinance, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateInvoiceParams.safeParse({ id: raw });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(invoicesTable).set(parsed.data as any).where(eq(invoicesTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.json(UpdateInvoiceResponse.parse(mapInvoice(row)));
});

router.delete("/invoices/:id", requireFinance, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [row] = await db.delete(invoicesTable).where(eq(invoicesTable.id, raw)).returning();
  if (!row) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.status(204).end();
});

// Generate a draft invoice from an approved timesheet
router.post("/invoices/from-timesheet/:id", requireFinance, async (req, res): Promise<void> => {
  const timesheetId = parseInt(req.params.id, 10);
  if (isNaN(timesheetId)) { res.status(400).json({ error: "Invalid timesheet id" }); return; }

  const [ts] = await db.select().from(timesheetsTable).where(eq(timesheetsTable.id, timesheetId));
  if (!ts) { res.status(404).json({ error: "Timesheet not found" }); return; }
  if (ts.status !== "Approved") { res.status(400).json({ error: "Only Approved timesheets can generate invoices" }); return; }

  // Fetch billable time entries for this user and week
  const weekEnd = new Date(ts.weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const entries = await db.select().from(timeEntriesTable).where(
    and(
      eq(timeEntriesTable.userId, ts.userId),
      gte(timeEntriesTable.date, ts.weekStart),
      lte(timeEntriesTable.date, weekEndStr),
      eq(timeEntriesTable.billable, true)
    )
  );

  if (entries.length === 0) { res.status(400).json({ error: "No billable time entries found for this timesheet" }); return; }

  const totalBillableHours = entries.reduce((s, e) => s + Number(e.hours), 0);

  // Determine the primary project and its account
  const projectIds = [...new Set(entries.map(e => e.projectId))];
  const [primaryProject] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectIds[0]));
  const accountId = primaryProject?.accountId;

  if (!accountId) { res.status(400).json({ error: "Project has no associated account for billing" }); return; }

  const invoiceCount = await db.select().from(invoicesTable);
  const invoiceId = `INV-${new Date().getFullYear()}-${String(invoiceCount.length + 1).padStart(3, '0')}`;
  const billingRate = Number((primaryProject as any)?.billingRate ?? 150);
  const total = (totalBillableHours * billingRate).toFixed(2);

  const [row] = await db.insert(invoicesTable).values({
    id: invoiceId,
    accountId,
    projectId: projectIds[0],
    status: "Draft",
    description: `Professional services: Week of ${ts.weekStart} (${totalBillableHours}h billable)`,
    amount: String(totalBillableHours * billingRate),
    total,
    dueDate: weekEndStr,
  } as any).returning();

  res.status(201).json(mapInvoice(row));
});

export default router;
