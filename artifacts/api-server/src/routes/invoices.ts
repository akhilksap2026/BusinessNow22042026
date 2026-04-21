import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, invoicesTable } from "@workspace/db";
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

router.post("/invoices", async (req, res): Promise<void> => {
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

router.patch("/invoices/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateInvoiceParams.safeParse({ id: raw });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(invoicesTable).set(parsed.data as any).where(eq(invoicesTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.json(UpdateInvoiceResponse.parse(mapInvoice(row)));
});

export default router;
