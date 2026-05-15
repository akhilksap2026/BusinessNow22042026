import { Router, type IRouter } from "express";
import { eq, and, lte, gte } from "drizzle-orm";
import { db, assetsTable, assetBookingsTable, projectsTable, usersTable } from "@workspace/db";
import { z } from "zod/v4";
import { requireAdmin, requirePM } from "../middleware/rbac";

const router: IRouter = Router();

function mapAsset(r: typeof assetsTable.$inferSelect) {
  return {
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  };
}

function mapBooking(r: typeof assetBookingsTable.$inferSelect) {
  return {
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  };
}

// ── Assets ──────────────────────────────────────────────────────────────────

const CreateAssetBody = z.object({
  name: z.string().min(1).max(200),
  type: z.string().min(1).max(80),
  capacity: z.number().int().positive().optional(),
  orgId: z.number().int().positive().nullable().optional(),
});

router.get("/assets", requirePM, async (_req, res): Promise<void> => {
  const rows = await db.select().from(assetsTable).orderBy(assetsTable.name);
  res.json(rows.map(mapAsset));
});

router.post("/assets", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateAssetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(assetsTable)
    .values({
      name: parsed.data.name,
      type: parsed.data.type,
      capacity: parsed.data.capacity ?? 1,
      orgId: parsed.data.orgId ?? null,
    })
    .returning();
  res.status(201).json(mapAsset(row));
});

// ── Asset Bookings ───────────────────────────────────────────────────────────

const CreateBookingBody = z.object({
  assetId: z.number().int().positive(),
  projectId: z.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

router.get("/asset-bookings", requirePM, async (req, res): Promise<void> => {
  const projectId = req.query.projectId ? parseInt(String(req.query.projectId), 10) : null;
  const assetId = req.query.assetId ? parseInt(String(req.query.assetId), 10) : null;

  let rows = await db.select({
    booking: assetBookingsTable,
    assetName: assetsTable.name,
    assetType: assetsTable.type,
    projectName: projectsTable.name,
    bookedByName: usersTable.name,
  })
    .from(assetBookingsTable)
    .leftJoin(assetsTable, eq(assetBookingsTable.assetId, assetsTable.id))
    .leftJoin(projectsTable, eq(assetBookingsTable.projectId, projectsTable.id))
    .leftJoin(usersTable, eq(assetBookingsTable.bookedById, usersTable.id))
    .orderBy(assetBookingsTable.startDate);

  if (projectId && !isNaN(projectId)) {
    rows = rows.filter(r => r.booking.projectId === projectId);
  }
  if (assetId && !isNaN(assetId)) {
    rows = rows.filter(r => r.booking.assetId === assetId);
  }

  res.json(rows.map(r => ({
    ...mapBooking(r.booking),
    assetName: r.assetName ?? null,
    assetType: r.assetType ?? null,
    projectName: r.projectName ?? null,
    bookedByName: r.bookedByName ?? null,
  })));
});

router.post("/asset-bookings", requirePM, async (req, res): Promise<void> => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { assetId, projectId, startDate, endDate } = parsed.data;

  if (endDate < startDate) {
    res.status(400).json({ error: "endDate must be on or after startDate" });
    return;
  }

  const bookedById = Number(req.headers["x-user-id"] ?? 0) || 0;

  // Verify the asset exists.
  const [asset] = await db.select().from(assetsTable).where(eq(assetsTable.id, assetId));
  if (!asset) {
    res.status(404).json({ error: `Asset ${assetId} not found` });
    return;
  }

  // Verify the project exists.
  const [project] = await db.select({ id: projectsTable.id }).from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) {
    res.status(404).json({ error: `Project ${projectId} not found` });
    return;
  }

  // Overlap check: bookings for this asset that overlap [startDate, endDate].
  // Standard half-open overlap: existing.start <= request.end AND existing.end >= request.start.
  const overlapping = await db
    .select()
    .from(assetBookingsTable)
    .where(and(
      eq(assetBookingsTable.assetId, assetId),
      lte(assetBookingsTable.startDate, endDate),
      gte(assetBookingsTable.endDate, startDate),
    ));

  if (overlapping.length >= asset.capacity) {
    res.status(409).json({
      error: "asset_unavailable",
      conflictingBookings: overlapping.map(mapBooking),
    });
    return;
  }

  const [row] = await db
    .insert(assetBookingsTable)
    .values({ assetId, projectId, startDate, endDate, bookedById })
    .returning();
  res.status(201).json(mapBooking(row));
});

router.delete("/asset-bookings/:id", requirePM, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id as string), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .delete(assetBookingsTable)
    .where(eq(assetBookingsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  res.status(204).end();
});

export default router;
