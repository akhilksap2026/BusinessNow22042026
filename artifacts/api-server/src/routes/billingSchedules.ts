import { Router, type IRouter } from "express";
import { db, billingSchedulesTable, invoicesTable, projectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireFinance } from "../middleware/rbac";
import {
  ListBillingSchedulesQueryParams,
  CreateBillingScheduleBody,
  UpdateBillingScheduleBody,
  GetBillingScheduleParams,
  UpdateBillingScheduleParams,
  DeleteBillingScheduleParams,
  TriggerBillingScheduleParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapSchedule(r: typeof billingSchedulesTable.$inferSelect) {
  return {
    ...r,
    amount: r.amount !== null ? Number(r.amount) : null,
    percentOfBudget: r.percentOfBudget !== null ? Number(r.percentOfBudget) : null,
    lastFiredAt: r.lastFiredAt instanceof Date ? r.lastFiredAt.toISOString() : r.lastFiredAt,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

router.get("/billing-schedules", async (req, res): Promise<void> => {
  const qp = ListBillingSchedulesQueryParams.safeParse(req.query);
  let rows;
  if (qp.success && qp.data.projectId) {
    rows = await db.select().from(billingSchedulesTable).where(eq(billingSchedulesTable.projectId, qp.data.projectId));
  } else {
    rows = await db.select().from(billingSchedulesTable);
  }
  res.json(rows.map(mapSchedule));
});

router.post("/billing-schedules", requireFinance, async (req, res): Promise<void> => {
  const parsed = CreateBillingScheduleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(billingSchedulesTable).values(parsed.data as any).returning();
  res.status(201).json(mapSchedule(row));
});

router.get("/billing-schedules/:id", async (req, res): Promise<void> => {
  const params = GetBillingScheduleParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.select().from(billingSchedulesTable).where(eq(billingSchedulesTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Billing schedule not found" }); return; }
  res.json(mapSchedule(row));
});

router.patch("/billing-schedules/:id", requireFinance, async (req, res): Promise<void> => {
  const params = UpdateBillingScheduleParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateBillingScheduleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(billingSchedulesTable).set(parsed.data as any).where(eq(billingSchedulesTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Billing schedule not found" }); return; }
  res.json(mapSchedule(row));
});

router.delete("/billing-schedules/:id", requireFinance, async (req, res): Promise<void> => {
  const params = DeleteBillingScheduleParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(billingSchedulesTable).where(eq(billingSchedulesTable.id, params.data.id));
  res.status(204).send();
});

router.post("/billing-schedules/:id/trigger", requireFinance, async (req, res): Promise<void> => {
  const params = TriggerBillingScheduleParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [schedule] = await db.select().from(billingSchedulesTable).where(eq(billingSchedulesTable.id, params.data.id));
  if (!schedule) { res.status(404).json({ error: "Billing schedule not found" }); return; }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, schedule.projectId));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const invoiceCount = await db.select().from(invoicesTable);
  const invoiceId = `INV-${new Date().getFullYear()}-${String(invoiceCount.length + 1).padStart(3, "0")}`;

  const amount = schedule.amount
    ? Number(schedule.amount)
    : schedule.percentOfBudget && project.budget
    ? Math.round(Number(project.budget) * Number(schedule.percentOfBudget) / 100 * 100) / 100
    : 0;

  const [invoice] = await db.insert(invoicesTable).values({
    id: invoiceId,
    projectId: schedule.projectId,
    accountId: project.accountId,
    status: "Draft",
    amount: amount.toString(),
    tax: "0",
    total: amount.toString(),
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: `Auto-generated from billing schedule: ${schedule.name}`,
  } as any).returning();

  await db.update(billingSchedulesTable)
    .set({ lastFiredAt: new Date(), status: "Fired" } as any)
    .where(eq(billingSchedulesTable.id, params.data.id));

  res.json({ scheduleId: params.data.id, invoiceId: invoice.id, message: `Draft invoice ${invoice.id} created for $${amount}` });
});

export default router;
