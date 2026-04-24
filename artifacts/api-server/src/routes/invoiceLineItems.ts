import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, invoiceLineItemsTable, timeEntriesTable, usersTable, rateCardsTable } from "@workspace/db";
import { requireFinance } from "../middleware/rbac";
import {
  ListInvoiceLineItemsParams,
  ListInvoiceLineItemsResponse,
  CreateInvoiceLineItemParams,
  CreateInvoiceLineItemBody,
  UpdateInvoiceLineItemParams,
  UpdateInvoiceLineItemBody,
  UpdateInvoiceLineItemResponse,
  DeleteInvoiceLineItemParams,
  AutofillInvoiceLineItemsParams,
  AutofillInvoiceLineItemsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapLineItem(li: typeof invoiceLineItemsTable.$inferSelect) {
  return {
    ...li,
    quantity: Number(li.quantity),
    unitRate: Number(li.unitRate),
    amount: Number(li.amount),
    taxAmount: Number(li.taxAmount),
    createdAt: li.createdAt instanceof Date ? li.createdAt.toISOString() : li.createdAt,
  };
}

router.get("/invoices/:id/line-items", async (req, res): Promise<void> => {
  const params = ListInvoiceLineItemsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const rows = await db.select().from(invoiceLineItemsTable)
    .where(eq(invoiceLineItemsTable.invoiceId, params.data.id));
  res.json(ListInvoiceLineItemsResponse.parse(rows.map(mapLineItem)));
});

router.post("/invoices/:id/line-items", requireFinance, async (req, res): Promise<void> => {
  const params = CreateInvoiceLineItemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = CreateInvoiceLineItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(invoiceLineItemsTable)
    .values({ ...parsed.data as any, invoiceId: params.data.id })
    .returning();
  res.status(201).json(mapLineItem(row));
});

router.patch("/invoices/:id/line-items/:lineItemId", requireFinance, async (req, res): Promise<void> => {
  const params = UpdateInvoiceLineItemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateInvoiceLineItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(invoiceLineItemsTable)
    .set(parsed.data as any)
    .where(and(eq(invoiceLineItemsTable.id, params.data.lineItemId), eq(invoiceLineItemsTable.invoiceId, params.data.id)))
    .returning();
  if (!row) { res.status(404).json({ error: "Line item not found" }); return; }
  res.json(UpdateInvoiceLineItemResponse.parse(mapLineItem(row)));
});

router.delete("/invoices/:id/line-items/:lineItemId", requireFinance, async (req, res): Promise<void> => {
  const params = DeleteInvoiceLineItemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(invoiceLineItemsTable)
    .where(and(eq(invoiceLineItemsTable.id, params.data.lineItemId), eq(invoiceLineItemsTable.invoiceId, params.data.id)));
  res.sendStatus(204);
});

router.post("/invoices/:id/line-items/autofill", requireFinance, async (req, res): Promise<void> => {
  const params = AutofillInvoiceLineItemsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const existingItems = await db.select().from(invoiceLineItemsTable)
    .where(eq(invoiceLineItemsTable.invoiceId, params.data.id));

  const linkedTimeEntryIds = existingItems
    .filter(i => i.timeEntryId !== null)
    .map(i => i.timeEntryId as number);

  const allEntries = await db.select().from(timeEntriesTable).where(eq(timeEntriesTable.approved, true));
  const entries = allEntries.filter(e => !linkedTimeEntryIds.includes(e.id));

  const users = await db.select().from(usersTable);
  const rateCards = await db.select().from(rateCardsTable);

  let order = existingItems.length;
  const created: (typeof invoiceLineItemsTable.$inferSelect)[] = [];

  for (const entry of entries) {
    const user = users.find(u => u.id === entry.userId);
    const rateCard = rateCards[0];
    const roles = (rateCard?.roles as Array<{ role: string; rate: number }>) ?? [];
    const roleEntry = user ? roles.find(r => r.role === user.role) : null;
    const unitRate = roleEntry ? roleEntry.rate : (user ? Number(user.costRate) : 0);
    const quantity = Number(entry.hours);
    const amount = quantity * unitRate;

    const [row] = await db.insert(invoiceLineItemsTable).values({
      invoiceId: params.data.id,
      description: entry.description || `${user?.name ?? "Team Member"} — ${new Date(entry.date).toLocaleDateString()}`,
      quantity: String(quantity),
      unitRate: String(unitRate),
      amount: String(amount),
      taxAmount: "0",
      billable: entry.billable,
      timeEntryId: entry.id,
      userId: entry.userId,
      role: user?.role ?? null,
      order: order++,
    }).returning();
    created.push(row);
  }

  res.json(AutofillInvoiceLineItemsResponse.parse(created.map(mapLineItem)));
});

export default router;
