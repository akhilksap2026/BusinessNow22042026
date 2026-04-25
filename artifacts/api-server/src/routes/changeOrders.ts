import { Router, type IRouter } from "express";
import { eq, ne, and, count } from "drizzle-orm";
import { db, changeOrdersTable, projectsTable, resourceRequestsTable, tasksTable, budgetEntriesTable } from "@workspace/db";
import { requirePM } from "../middleware/rbac";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

const CR_STATUSES = ["Draft", "Submitted", "Approved", "Rejected"] as const;

function mapCO(c: typeof changeOrdersTable.$inferSelect) {
  return {
    ...c,
    amount: Number(c.amount),
    additionalHours: Number(c.additionalHours ?? 0),
    linkedTaskTitles: (c.linkedTaskTitles as string[] | null) ?? [],
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt,
  };
}

async function generateCRNumber(projectId: number): Promise<string> {
  const [result] = await db
    .select({ cnt: count() })
    .from(changeOrdersTable)
    .where(eq(changeOrdersTable.projectId, projectId));
  const next = (Number(result?.cnt ?? 0) + 1).toString().padStart(3, "0");
  return `CR-${next}`;
}

router.get("/projects/:id/change-orders", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.id, 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }
  const rows = await db.select().from(changeOrdersTable).where(eq(changeOrdersTable.projectId, projectId));
  res.json(rows.map(mapCO));
});

router.post("/projects/:id/change-orders", requirePM, async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.id, 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }
  const {
    title, description, amount, additionalHours, status,
    requestedDate, submittedDate, submittedByUserId,
    newResourceRole, documentLink, linkedTaskTitles,
  } = req.body;
  if (!title) { res.status(400).json({ error: "title is required" }); return; }

  const crNumber = await generateCRNumber(projectId);

  const [row] = await db.insert(changeOrdersTable).values({
    projectId,
    crNumber,
    title,
    description: description ?? null,
    amount: String(amount ?? 0),
    additionalHours: String(additionalHours ?? 0),
    status: CR_STATUSES.includes(status) ? status : "Draft",
    requestedDate: requestedDate ?? null,
    submittedDate: submittedDate ?? null,
    submittedByUserId: submittedByUserId ? Number(submittedByUserId) : null,
    newResourceRole: newResourceRole ?? null,
    documentLink: documentLink ?? null,
    linkedTaskTitles: Array.isArray(linkedTaskTitles) ? linkedTaskTitles : [],
  }).returning();

  await logAudit({
    entityType: "change_order",
    entityId: row.id,
    action: "created",
    description: `Change request "${title}" (${crNumber}) created for project ${projectId}`,
  });
  res.status(201).json(mapCO(row));
});

router.patch("/change-orders/:id", requirePM, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [existing] = await db.select().from(changeOrdersTable).where(eq(changeOrdersTable.id, id));
  if (!existing) { res.status(404).json({ error: "Change request not found" }); return; }

  const updates: Partial<typeof changeOrdersTable.$inferInsert> = {};
  const {
    title, description, amount, additionalHours, status,
    requestedDate, submittedDate, decisionDate, approvedDate,
    submittedByUserId, approvedByUserId,
    newResourceRole, documentLink, linkedTaskTitles,
  } = req.body;

  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (amount !== undefined) updates.amount = String(amount);
  if (additionalHours !== undefined) updates.additionalHours = String(additionalHours);
  if (status !== undefined && CR_STATUSES.includes(status)) updates.status = status;
  if (requestedDate !== undefined) updates.requestedDate = requestedDate;
  if (submittedDate !== undefined) updates.submittedDate = submittedDate;
  if (decisionDate !== undefined) updates.decisionDate = decisionDate;
  if (approvedDate !== undefined) updates.approvedDate = approvedDate;
  if (submittedByUserId !== undefined) updates.submittedByUserId = submittedByUserId ? Number(submittedByUserId) : null;
  if (approvedByUserId !== undefined) updates.approvedByUserId = approvedByUserId ? Number(approvedByUserId) : null;
  if (newResourceRole !== undefined) updates.newResourceRole = newResourceRole;
  if (documentLink !== undefined) updates.documentLink = documentLink || null;
  if (linkedTaskTitles !== undefined) updates.linkedTaskTitles = Array.isArray(linkedTaskTitles) ? linkedTaskTitles : [];

  updates.updatedAt = new Date();

  // ── Self-approval guard MUST run before any DB writes ────────────────────
  const isApprovalTransition = status === "Approved" && existing.status !== "Approved";
  if (isApprovalTransition) {
    const actorId = Number(req.headers["x-user-id"] ?? 0);
    if (actorId && existing.submittedByUserId && actorId === existing.submittedByUserId) {
      res.status(403).json({ error: "You cannot approve a change request you submitted." });
      return;
    }
  }

  // ── All writes happen atomically. For the Approval transition we use a
  //    conditional UPDATE so concurrent requests can't both apply the
  //    one-time side-effects (idempotency).
  let row: typeof changeOrdersTable.$inferSelect;
  let appliedApproval = false;
  try {
    row = await db.transaction(async (tx) => {
      let updated: typeof changeOrdersTable.$inferSelect | undefined;

      if (isApprovalTransition) {
        const winners = await tx
          .update(changeOrdersTable)
          .set(updates)
          .where(and(eq(changeOrdersTable.id, id), ne(changeOrdersTable.status, "Approved")))
          .returning();
        if (winners.length === 0) {
          // Lost the race or already approved; just return current row, no side-effects.
          const [current] = await tx.select().from(changeOrdersTable).where(eq(changeOrdersTable.id, id));
          return current;
        }
        updated = winners[0];
        appliedApproval = true;
      } else {
        const [u] = await tx
          .update(changeOrdersTable)
          .set(updates)
          .where(eq(changeOrdersTable.id, id))
          .returning();
        updated = u;
      }

      if (!updated) throw new Error("CR row vanished during update");

      if (appliedApproval) {
        // Re-approval safety: if a budget entry already exists for this CO
        // (because it was approved → reverted → re-approved), skip ALL one-time
        // financial side-effects so we never double-count. The unique index on
        // budget_entries.change_order_id makes this race-safe.
        const [existingEntry] = await tx
          .select({ id: budgetEntriesTable.id })
          .from(budgetEntriesTable)
          .where(eq(budgetEntriesTable.changeOrderId, updated.id));
        if (existingEntry) {
          appliedApproval = false;
          return updated;
        }

        // 1. Update project budget and budgeted hours
        const [proj] = await tx.select().from(projectsTable).where(eq(projectsTable.id, existing.projectId));
        if (proj) {
          const newBudget = Number(proj.budget) + Number(updated.amount);
          const newHours = Number(proj.budgetedHours) + Number(updated.additionalHours ?? 0);
          await tx.update(projectsTable).set({
            budget: String(newBudget),
            budgetedHours: String(newHours),
            updatedAt: new Date(),
          }).where(eq(projectsTable.id, proj.id));
        }

        // 1b. Always record this CO as a budget entry — even when amount/hours are zero.
        // The row also serves as the re-approval idempotency sentinel (looked up above),
        // and the unique index on change_order_id provides a hard DB-level backstop.
        const coAmount = Number(updated.amount);
        const coHours = Number(updated.additionalHours ?? 0);
        await tx.insert(budgetEntriesTable).values({
          projectId: existing.projectId,
          entryDate: updated.approvedDate || updated.decisionDate || new Date().toISOString().slice(0, 10),
          type: "CO",
          description: updated.title || `Change Request ${updated.crNumber ?? updated.id}`,
          amount: String(coAmount),
          hours: String(coHours),
          changeOrderId: updated.id,
        });

        // 2. Create tasks listed in linkedTaskTitles
        const taskTitles = (updated.linkedTaskTitles as string[] | null) ?? [];
        for (const taskTitle of taskTitles) {
          if (taskTitle.trim()) {
            await tx.insert(tasksTable).values({
              projectId: existing.projectId,
              name: taskTitle.trim(),
              status: "Not Started",
              priority: "Medium",
            } as any);
          }
        }

        // 3. Create resource request if a role was specified
        if (updated.newResourceRole) {
          const today = new Date().toISOString().slice(0, 10);
          const in90 = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
          await tx.insert(resourceRequestsTable).values({
            projectId: existing.projectId,
            requestedByUserId: updated.approvedByUserId ?? updated.submittedByUserId ?? 1,
            role: updated.newResourceRole,
            startDate: today,
            endDate: in90,
            hoursPerWeek: 40,
            priority: "Medium",
            notes: `Auto-created from Change Request ${updated.crNumber ?? ""}`,
            status: "Open",
          } as any);
        }
      }

      return updated;
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update change request", detail: String(err?.message ?? err) });
    return;
  }

  // Audit logs run outside the transaction; they can't roll back DB writes anyway.
  if (appliedApproval) {
    await logAudit({
      entityType: "change_order",
      entityId: id,
      action: "approved",
      previousValue: { status: existing.status },
      newValue: { status: "Approved" },
      description: `Change request ${row.crNumber ?? id} approved — budget updated by $${Number(row.amount).toFixed(2)}`,
    });
  }
  if (status && status !== existing.status) {
    await logAudit({
      entityType: "change_order",
      entityId: id,
      action: "status_changed",
      previousValue: { status: existing.status },
      newValue: { status: row.status },
    });
  }

  res.json(mapCO(row));
});

router.delete("/change-orders/:id", requirePM, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(changeOrdersTable).where(eq(changeOrdersTable.id, id));
  res.sendStatus(204);
});

export default router;
