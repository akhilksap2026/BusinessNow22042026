import { Router } from "express";
import { db, projectUpdatesTable, updateRecipientsTable, tasksTable, phasesTable, documentsTable, allocationsTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export const projectUpdatesRouter = Router();

async function resolveTemplate(body: string, projectId: number): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  let result = body;

  if (result.includes("{{milestones}}")) {
    const milestones = await db.select().from(tasksTable)
      .where(and(eq(tasksTable.projectId, projectId), eq(tasksTable.isMilestone, true)));
    const list = milestones.length
      ? milestones.map(m => `• ${m.name} — ${m.status}${m.dueDate ? ` (due ${m.dueDate})` : ""}`).join("\n")
      : "No milestones defined.";
    result = result.replaceAll("{{milestones}}", list);
  }

  if (result.includes("{{overdue_tasks}}")) {
    const tasks = await db.select().from(tasksTable).where(eq(tasksTable.projectId, projectId));
    const overdue = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== "Completed" && !t.isMilestone);
    const list = overdue.length
      ? overdue.map(t => `• ${t.name} (due ${t.dueDate})`).join("\n")
      : "No overdue tasks.";
    result = result.replaceAll("{{overdue_tasks}}", list);
  }

  if (result.includes("{{pending_approvals}}")) {
    const docs = await db.select().from(documentsTable).where(eq(documentsTable.projectId, projectId));
    const pending = docs.filter(d => d.approvalStatus === "pending");
    const list = pending.length
      ? pending.map(d => `• ${d.name}`).join("\n")
      : "No pending approvals.";
    result = result.replaceAll("{{pending_approvals}}", list);
  }

  return result;
}

projectUpdatesRouter.get("/projects/:id/updates", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.id, 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }

  const updates = await db.select().from(projectUpdatesTable)
    .where(eq(projectUpdatesTable.projectId, projectId))
    .orderBy(projectUpdatesTable.sentAt);

  const enriched = await Promise.all(updates.map(async u => {
    const recipients = await db.select({ userId: updateRecipientsTable.userId }).from(updateRecipientsTable)
      .where(eq(updateRecipientsTable.updateId, u.id));
    const [creator] = u.createdByUserId
      ? await db.select({ name: usersTable.name, initials: usersTable.initials }).from(usersTable).where(eq(usersTable.id, u.createdByUserId))
      : [null];
    return {
      id: u.id,
      projectId: u.projectId,
      subject: u.subject,
      body: u.body,
      type: u.type,
      sentAt: u.sentAt,
      recipientCount: recipients.length,
      createdBy: creator ?? null,
    };
  }));

  res.json(enriched.reverse());
});

projectUpdatesRouter.post("/projects/:id/updates", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.id, 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }

  const { subject, body = "", type = "internal", recipientUserIds = [] } = req.body ?? {};
  if (!subject) { res.status(400).json({ error: "subject required" }); return; }

  const role = req.headers["x-user-role"] as string;
  let createdByUserId: number | null = null;
  const meRows = await db.select().from(usersTable).limit(1);
  if (meRows.length > 0) createdByUserId = meRows[0].id;

  const resolvedBody = await resolveTemplate(body, projectId);

  const [update] = await db.insert(projectUpdatesTable).values({
    projectId,
    subject,
    body: resolvedBody,
    type,
    createdByUserId,
  }).returning();

  let finalRecipients: number[] = recipientUserIds.map((id: any) => parseInt(id, 10)).filter(Number.isFinite);

  if (finalRecipients.length === 0) {
    const allocs = await db.select({ userId: allocationsTable.userId }).from(allocationsTable)
      .where(eq(allocationsTable.projectId, projectId));
    finalRecipients = [...new Set(allocs.map(a => a.userId).filter((id): id is number => id !== null))];
  }

  if (finalRecipients.length > 0) {
    await db.insert(updateRecipientsTable).values(
      finalRecipients.map(uid => ({ updateId: update.id, userId: uid }))
    );

    await db.insert(notificationsTable).values(
      finalRecipients.map(uid => ({
        userId: uid,
        projectId,
        type: "project_update",
        message: `Project update: "${subject}"`,
        read: false,
        timestamp: new Date(),
      }))
    );
  }

  res.status(201).json({ ...update, body: resolvedBody, recipientCount: finalRecipients.length });
});

projectUpdatesRouter.get("/projects/:id/health-stats", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.id, 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }

  const today = new Date().toISOString().slice(0, 10);
  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.projectId, projectId));

  const nonMilestones = tasks.filter(t => !t.isMilestone);
  const total = nonMilestones.length;
  const completed = nonMilestones.filter(t => t.status === "Completed").length;
  const overdue = nonMilestones.filter(t => t.dueDate && t.dueDate < today && t.status !== "Completed").length;
  const blocked = nonMilestones.filter(t => t.status === "Blocked").length;
  const atRisk = tasks.filter(t => t.isMilestone && t.dueDate && t.dueDate > today && t.status !== "Completed" && new Date(t.dueDate).getTime() - Date.now() < 7 * 86400000).length;
  const onTrack = nonMilestones.filter(t => t.status === "In Progress" && (!t.dueDate || t.dueDate >= today)).length;
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const phases = await db.select().from(phasesTable).where(eq(phasesTable.projectId, projectId));
  const phaseStats = phases.map(ph => {
    const phaseTasks = nonMilestones.filter(t => t.phaseId === ph.id);
    const phTotal = phaseTasks.length;
    const phDone = phaseTasks.filter(t => t.status === "Completed").length;
    const pct = phTotal > 0 ? Math.round((phDone / phTotal) * 100) : 0;
    const phOverdue = phaseTasks.filter(t => t.dueDate && t.dueDate < today && t.status !== "Completed").length;
    return {
      id: ph.id,
      name: ph.name,
      status: ph.status,
      totalTasks: phTotal,
      completedTasks: phDone,
      completionPct: pct,
      overdueTasks: phOverdue,
      startDate: ph.startDate,
      endDate: ph.endDate,
    };
  });

  res.json({
    total,
    completed,
    overdue,
    blocked,
    atRisk,
    onTrack,
    completionPct,
    phases: phaseStats,
  });
});
