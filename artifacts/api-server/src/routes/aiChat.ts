/**
 * AI Time Tracking Assistant — chat route.
 *
 * Single endpoint, mounted under `/api/ai-time-helper`. Authenticated by
 * the global `verifyRoleClaim` middleware — userId is always taken from
 * the verified `x-user-id` header, never from the request body.
 *
 * Body:
 *   { sessionId: string, message?: string, confirmedEntries?: ProposedEntry[] }
 *
 * Behavior:
 *   - With `message` → run an LLM turn and return reply + optional proposal.
 *   - With `confirmedEntries` → commit them via the existing
 *     POST /api/time-entries route (preserving all governance / RBAC).
 *
 * Adding this route does not modify any existing file other than
 * `routes/index.ts` (one import + one `router.use(...)` line).
 */

import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  runAssistantTurn,
  commitEntries,
  clearSession,
  type ProposedEntry,
} from "../lib/aiTimeAssistant";

const router: IRouter = Router();

router.post("/ai-time-helper", async (req, res): Promise<void> => {
  const userIdRaw = req.headers["x-user-id"];
  const userRoleRaw = req.headers["x-user-role"];
  const userId = Number(userIdRaw);
  if (!userId || !Number.isFinite(userId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const userRole = String(userRoleRaw ?? "");

  const body = (req.body ?? {}) as {
    sessionId?: string;
    message?: string;
    confirmedEntries?: ProposedEntry[];
    reset?: boolean;
  };
  const sessionId = String(body.sessionId ?? "");
  if (!sessionId) {
    res.status(400).json({ error: "sessionId is required" });
    return;
  }

  if (body.reset) {
    clearSession(userId, sessionId);
  }

  // Resolve self-call base URL for committing entries via the existing route.
  const port = process.env.PORT ?? "8080";
  const baseUrl = `http://127.0.0.1:${port}`;
  const forwardHeaders: Record<string, string> = {
    "x-user-id": String(userId),
    "x-user-role": userRole,
  };

  // Branch A: user confirmed a previously-proposed batch — commit it.
  if (body.confirmedEntries && Array.isArray(body.confirmedEntries) && body.confirmedEntries.length > 0) {
    const result = await commitEntries({
      entries: body.confirmedEntries,
      baseUrl,
      headers: forwardHeaders,
      userId,
    });
    const okCount = result.logged.length;
    const failCount = result.errors.length;
    let reply: string;
    if (okCount > 0 && failCount === 0) {
      const totalHours = result.logged.reduce((s, r) => s + r.hours, 0);
      reply = `Logged ${okCount} entr${okCount === 1 ? "y" : "ies"} (${totalHours}h total). What's next?`;
    } else if (okCount > 0 && failCount > 0) {
      reply = `Logged ${okCount}, but ${failCount} failed: ${result.errors
        .map(e => `${e.entry.date} — ${e.error}`)
        .join("; ")}`;
    } else {
      reply = `Could not log entries: ${result.errors.map(e => `${e.entry.date} — ${e.error}`).join("; ")}`;
    }
    res.json({
      reply,
      logged: result.logged,
      errors: result.errors,
      sessionId,
    });
    return;
  }

  // Branch B: regular conversational turn.
  const message = String(body.message ?? "").trim();
  if (!message) {
    res.status(400).json({ error: "message or confirmedEntries is required" });
    return;
  }

  // Resolve user's display name for the system prompt (single small DB lookup).
  let userName = "the user";
  try {
    const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId));
    if (u?.name) userName = u.name;
  } catch {
    // Non-blocking — name is just a courtesy in the prompt.
  }

  const result = await runAssistantTurn({
    sessionId,
    message,
    userId,
    userName,
    userRole,
    baseUrl,
    headers: forwardHeaders,
  });

  res.json({
    reply: result.reply,
    proposal: result.proposal ?? null,
    toolCalls: result.toolCalls ?? [],
    provider: result.provider,
    error: result.error,
    sessionId,
  });
});

export default router;
