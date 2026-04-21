import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, accountsTable } from "@workspace/db";
import { requirePM } from "../middleware/rbac";
import {
  ListAccountsResponse,
  CreateAccountBody,
  GetAccountParams,
  GetAccountResponse,
  UpdateAccountParams,
  UpdateAccountBody,
  UpdateAccountResponse,
  DeleteAccountParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapAccount(r: typeof accountsTable.$inferSelect) {
  return {
    ...r,
    contractValue: Number(r.contractValue),
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

router.get("/accounts", async (req, res): Promise<void> => {
  const rows = await db.select().from(accountsTable).orderBy(accountsTable.name);
  res.json(ListAccountsResponse.parse(rows.map(mapAccount)));
});

router.post("/accounts", requirePM, async (req, res): Promise<void> => {
  const parsed = CreateAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(accountsTable).values(parsed.data as any).returning();
  res.status(201).json(GetAccountResponse.parse(mapAccount(row)));
});

router.get("/accounts/:id", async (req, res): Promise<void> => {
  const params = GetAccountParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.select().from(accountsTable).where(eq(accountsTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Account not found" }); return; }
  res.json(GetAccountResponse.parse(mapAccount(row)));
});

router.patch("/accounts/:id", requirePM, async (req, res): Promise<void> => {
  const params = UpdateAccountParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateAccountBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(accountsTable).set(parsed.data as any).where(eq(accountsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Account not found" }); return; }
  res.json(UpdateAccountResponse.parse(mapAccount(row)));
});

router.delete("/accounts/:id", requirePM, async (req, res): Promise<void> => {
  const params = DeleteAccountParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(accountsTable).where(eq(accountsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
