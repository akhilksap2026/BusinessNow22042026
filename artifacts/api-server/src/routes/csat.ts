import { Router, type IRouter } from "express";
import { db, csatResponsesTable, csatSurveysTable } from "@workspace/db";
import { eq, and, isNotNull } from "drizzle-orm";
import { ListCsatResponsesQueryParams, CreateCsatResponseBody } from "@workspace/api-zod";

const router: IRouter = Router();

function mapCsat(r: typeof csatResponsesTable.$inferSelect) {
  return {
    ...r,
    submittedAt: r.submittedAt instanceof Date ? r.submittedAt.toISOString() : r.submittedAt,
  };
}

router.get("/csat-responses", async (req, res): Promise<void> => {
  const qp = ListCsatResponsesQueryParams.safeParse(req.query);
  const conditions: any[] = [];
  if (qp.success) {
    if (qp.data.projectId) conditions.push(eq(csatResponsesTable.projectId, qp.data.projectId));
    if (qp.data.taskId) conditions.push(eq(csatResponsesTable.taskId, qp.data.taskId));
  }
  const rows = conditions.length
    ? await db.select().from(csatResponsesTable).where(and(...conditions))
    : await db.select().from(csatResponsesTable);
  res.json(rows.map(mapCsat));
});

router.post("/csat-responses", async (req, res): Promise<void> => {
  const parsed = CreateCsatResponseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(csatResponsesTable).values(parsed.data).returning();
  res.status(201).json(mapCsat(row));
});

router.get("/projects/:id/csat-summary", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.id, 10);
  const responses = await db.select().from(csatResponsesTable).where(eq(csatResponsesTable.projectId, projectId));

  // Also include completed survey ratings
  const completedSurveys = await db.select().from(csatSurveysTable).where(
    and(eq(csatSurveysTable.projectId, projectId), isNotNull(csatSurveysTable.rating))
  );
  const pendingSurveys = await db.select().from(csatSurveysTable).where(
    and(eq(csatSurveysTable.projectId, projectId))
  );

  // Merge manual responses + completed survey ratings for aggregate
  const allRatings = [
    ...responses.map(r => r.rating),
    ...completedSurveys.map(s => s.rating as number),
  ];

  const totalResponses = allRatings.length;
  const averageRating = totalResponses > 0
    ? Math.round((allRatings.reduce((s, r) => s + r, 0) / totalResponses) * 10) / 10
    : 0;

  const dist: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  allRatings.forEach(r => { dist[String(r)] = (dist[String(r)] || 0) + 1; });

  const recentResponses = responses
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 5)
    .map(mapCsat);

  res.json({
    projectId,
    averageRating,
    totalResponses,
    ratingDistribution: dist,
    recentResponses,
    pendingSurveys: pendingSurveys.length,
    completedSurveys: completedSurveys.length,
  });
});

export default router;
