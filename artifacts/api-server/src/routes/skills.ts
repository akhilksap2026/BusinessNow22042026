import { Router, type IRouter } from "express";
import { db, skillCategoriesTable, skillsTable, userSkillsTable, jobRolesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListSkillsQueryParams,
  CreateSkillCategoryBody,
  DeleteSkillCategoryParams,
  CreateSkillBody,
  DeleteSkillParams,
  GetUserSkillsParams,
  AddUserSkillParams,
  AddUserSkillBody,
  RemoveUserSkillParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/skill-categories", async (_req, res): Promise<void> => {
  const rows = await db.select().from(skillCategoriesTable);
  res.json(rows.map(r => ({
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  })));
});

router.post("/skill-categories", async (req, res): Promise<void> => {
  const parsed = CreateSkillCategoryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(skillCategoriesTable).values(parsed.data).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt });
});

router.delete("/skill-categories/:id", async (req, res): Promise<void> => {
  const params = DeleteSkillCategoryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(skillCategoriesTable).where(eq(skillCategoriesTable.id, params.data.id));
  res.status(204).send();
});

router.get("/skills", async (req, res): Promise<void> => {
  const qp = ListSkillsQueryParams.safeParse(req.query);
  let rows;
  if (qp.success && qp.data.categoryId) {
    rows = await db.select().from(skillsTable).where(eq(skillsTable.categoryId, qp.data.categoryId));
  } else {
    rows = await db.select().from(skillsTable);
  }
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt })));
});

router.post("/skills", async (req, res): Promise<void> => {
  const parsed = CreateSkillBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(skillsTable).values(parsed.data).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt });
});

router.delete("/skills/:id", async (req, res): Promise<void> => {
  const params = DeleteSkillParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(skillsTable).where(eq(skillsTable.id, params.data.id));
  res.status(204).send();
});

router.get("/users/:id/skills", async (req, res): Promise<void> => {
  const params = GetUserSkillsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const userSkills = await db.select().from(userSkillsTable).where(eq(userSkillsTable.userId, params.data.id));
  const allSkills = await db.select().from(skillsTable);
  const allCategories = await db.select().from(skillCategoriesTable);

  const result = userSkills.map(us => {
    const skill = allSkills.find(s => s.id === us.skillId);
    const category = skill?.categoryId ? allCategories.find(c => c.id === skill.categoryId) : null;
    return {
      id: us.id,
      userId: us.userId,
      skillId: us.skillId,
      skillName: skill?.name ?? "Unknown",
      categoryName: category?.name ?? null,
      proficiencyLevel: us.proficiencyLevel,
      createdAt: us.createdAt instanceof Date ? us.createdAt.toISOString() : us.createdAt,
    };
  });
  res.json(result);
});

router.post("/users/:id/skills", async (req, res): Promise<void> => {
  const params = AddUserSkillParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = AddUserSkillBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [us] = await db.insert(userSkillsTable).values({
    userId: params.data.id,
    skillId: parsed.data.skillId,
    proficiencyLevel: parsed.data.proficiencyLevel ?? "Independent",
  }).returning();

  const [skill] = await db.select().from(skillsTable).where(eq(skillsTable.id, us.skillId));
  const [category] = skill?.categoryId
    ? await db.select().from(skillCategoriesTable).where(eq(skillCategoriesTable.id, skill.categoryId!))
    : [null];

  res.status(201).json({
    id: us.id,
    userId: us.userId,
    skillId: us.skillId,
    skillName: skill?.name ?? "Unknown",
    categoryName: category?.name ?? null,
    proficiencyLevel: us.proficiencyLevel,
    createdAt: us.createdAt instanceof Date ? us.createdAt.toISOString() : us.createdAt,
  });
});

router.patch("/users/:id/skills/:skillId", async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id);
  const skillId = parseInt(req.params.skillId);
  const { proficiencyLevel, value } = req.body;
  if (isNaN(userId) || isNaN(skillId)) { res.status(400).json({ error: "Invalid ids" }); return; }
  const newLevel = proficiencyLevel ?? value ?? "Independent";
  const [row] = await db.update(userSkillsTable)
    .set({ proficiencyLevel: newLevel, updatedAt: new Date() })
    .where(and(eq(userSkillsTable.userId, userId), eq(userSkillsTable.skillId, skillId)))
    .returning();
  if (!row) {
    const [inserted] = await db.insert(userSkillsTable).values({ userId, skillId, proficiencyLevel: newLevel }).returning();
    res.json(inserted); return;
  }
  res.json(row);
});

router.delete("/users/:id/skills/:skillId", async (req, res): Promise<void> => {
  const params = RemoveUserSkillParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(userSkillsTable).where(
    and(eq(userSkillsTable.userId, params.data.id), eq(userSkillsTable.skillId, params.data.skillId))
  );
  res.status(204).send();
});

// Bulk: GET /user-skills — all user skills with skill metadata (for matrix view)
router.get("/user-skills", async (_req, res): Promise<void> => {
  const allUserSkills = await db.select().from(userSkillsTable);
  const allSkills = await db.select().from(skillsTable);
  const allCategories = await db.select().from(skillCategoriesTable);
  const result = allUserSkills.map(us => {
    const skill = allSkills.find(s => s.id === us.skillId);
    const category = skill?.categoryId ? allCategories.find(c => c.id === skill.categoryId) : null;
    return {
      id: us.id,
      userId: us.userId,
      skillId: us.skillId,
      skillName: skill?.name ?? "Unknown",
      skillType: skill?.skillType ?? "Level",
      categoryId: skill?.categoryId ?? null,
      categoryName: category?.name ?? null,
      proficiencyLevel: us.proficiencyLevel,
    };
  });
  res.json(result);
});

// ─── Job Roles ────────────────────────────────────────────────────────────────

router.get("/job-roles", async (_req, res): Promise<void> => {
  const rows = await db.select().from(jobRolesTable).orderBy(jobRolesTable.name);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt })));
});

router.post("/job-roles", async (req, res): Promise<void> => {
  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required" }); return;
  }
  try {
    const [row] = await db.insert(jobRolesTable).values({ name: name.trim() }).returning();
    res.status(201).json({ ...row, createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt });
  } catch (e: any) {
    if (e.code === "23505") { res.status(409).json({ error: "Role already exists" }); return; }
    throw e;
  }
});

router.delete("/job-roles/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(jobRolesTable).where(eq(jobRolesTable.id, id));
  res.status(204).send();
});

export default router;
