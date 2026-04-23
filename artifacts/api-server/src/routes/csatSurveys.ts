import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, csatSurveysTable, tasksTable, notificationsTable } from "@workspace/db";

const router: IRouter = Router();

function mapSurvey(s: typeof csatSurveysTable.$inferSelect, taskName?: string) {
  return {
    id: s.id,
    milestoneTaskId: s.milestoneTaskId,
    milestoneTaskName: taskName ?? `Task #${s.milestoneTaskId}`,
    projectId: s.projectId,
    recipientUserId: s.recipientUserId,
    sentAt: s.sentAt instanceof Date ? s.sentAt.toISOString() : s.sentAt,
    rating: s.rating,
    comment: s.comment,
    completedAt: s.completedAt instanceof Date ? s.completedAt.toISOString() : s.completedAt,
    token: s.token,
    status: s.rating !== null ? "completed" : "pending",
  };
}

// List surveys for a project
router.get("/projects/:id/csat-surveys", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.id, 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }
  const surveys = await db.select().from(csatSurveysTable).where(eq(csatSurveysTable.projectId, projectId));

  // Enrich with task names
  const taskIds = [...new Set(surveys.map(s => s.milestoneTaskId))];
  const tasks = taskIds.length > 0
    ? await db.select({ id: tasksTable.id, name: tasksTable.name, csatEnabled: tasksTable.csatEnabled }).from(tasksTable)
    : [];
  const taskMap = Object.fromEntries(tasks.map(t => [t.id, t]));

  res.json(surveys.map(s => ({
    ...mapSurvey(s, taskMap[s.milestoneTaskId]?.name),
    csatEnabled: taskMap[s.milestoneTaskId]?.csatEnabled ?? true,
  })));
});

// Get survey by token (customer-facing)
router.get("/csat-surveys/by-token/:token", async (req, res): Promise<void> => {
  const [survey] = await db.select().from(csatSurveysTable).where(eq(csatSurveysTable.token, req.params.token));
  if (!survey) { res.status(404).json({ error: "Survey not found" }); return; }
  const [task] = await db.select({ id: tasksTable.id, name: tasksTable.name }).from(tasksTable).where(eq(tasksTable.id, survey.milestoneTaskId));
  res.json(mapSurvey(survey, task?.name));
});

// Submit survey rating
router.post("/csat-surveys/:id/submit", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid survey id" }); return; }

  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Rating must be an integer 1-5" }); return;
  }

  const [survey] = await db.select().from(csatSurveysTable).where(eq(csatSurveysTable.id, id));
  if (!survey) { res.status(404).json({ error: "Survey not found" }); return; }
  if (survey.rating !== null) { res.status(409).json({ error: "Survey already submitted" }); return; }

  const [updated] = await db.update(csatSurveysTable).set({
    rating: parseInt(rating, 10),
    comment: comment ?? null,
    completedAt: new Date(),
  }).where(eq(csatSurveysTable.id, id)).returning();

  // Notify project team
  await db.insert(notificationsTable).values({
    type: "csat_submitted",
    message: `CSAT survey for milestone task #${survey.milestoneTaskId} completed — rated ${rating}/5`,
    projectId: survey.projectId,
    entityType: "csat_survey",
    entityId: String(survey.id),
  });

  const [task] = await db.select({ id: tasksTable.id, name: tasksTable.name }).from(tasksTable).where(eq(tasksTable.id, updated.milestoneTaskId));
  res.json(mapSurvey(updated, task?.name));
});

// Toggle csat_enabled on a milestone task (Admin only)
router.patch("/tasks/:id/csat-enabled", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid task id" }); return; }
  const { csatEnabled } = req.body;
  if (typeof csatEnabled !== "boolean") { res.status(400).json({ error: "csatEnabled must be boolean" }); return; }
  const [row] = await db.update(tasksTable).set({ csatEnabled } as any).where(eq(tasksTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Task not found" }); return; }
  res.json({ id: row.id, csatEnabled: (row as any).csatEnabled });
});

export default router;
