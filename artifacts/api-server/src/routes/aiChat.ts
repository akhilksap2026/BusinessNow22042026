/**
 * AI Time Tracking Assistant — chat route.
 *
 * Endpoints:
 *   POST /api/ai-chat          (canonical, per task spec)
 *   POST /api/ai-time-helper   (alias kept for backward compatibility)
 *   GET  /api/ai-chat/welcome  (proactive opening message + catch-up reminder)
 *
 * All routes are authenticated by the global `verifyRoleClaim` middleware
 * — userId is always taken from the verified `x-user-id` header, never
 * from the request body or LLM output.
 *
 * POST body:
 *   { sessionId: string, message?: string, confirmedEntries?: ProposedEntry[], reset?: boolean }
 *
 * - With `message` → run an LLM turn, return `{ reply, proposal?, toolCalls[] }`.
 * - With `confirmedEntries` → commit each entry via the existing
 *   POST /api/time-entries route (full governance preserved).
 * - With `reset: true` → drop the server-side session history for this user.
 */

import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  runAssistantTurn,
  commitEntries,
  clearSession,
  buildWelcome,
  type ProposedEntry,
} from "../lib/aiTimeAssistant";

const router: IRouter = Router();

async function handleChatPost(req: any, res: any): Promise<void> {
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
    if (!body.message && !body.confirmedEntries) {
      res.json({ reply: "Conversation reset.", reset: true, sessionId });
      return;
    }
  }

  const port = process.env.PORT ?? "8080";
  const baseUrl = `http://127.0.0.1:${port}`;
  const forwardHeaders: Record<string, string> = {
    "x-user-id": String(userId),
    "x-user-role": userRole,
  };

  // Branch A: commit confirmed entries through the existing route.
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

  let userName = "the user";
  try {
    const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId));
    if (u?.name) userName = u.name;
  } catch {
    /* non-blocking */
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
}

async function handleWelcomeGet(req: any, res: any): Promise<void> {
  const userIdRaw = req.headers["x-user-id"];
  const userId = Number(userIdRaw);
  if (!userId || !Number.isFinite(userId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  let userName = "there";
  try {
    const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId));
    if (u?.name) userName = u.name;
  } catch {
    /* non-blocking */
  }
  const payload = await buildWelcome(userId, userName);
  res.json(payload);
}

// Canonical path
router.post("/ai-chat", handleChatPost);
router.get("/ai-chat/welcome", handleWelcomeGet);

// Backward-compatible alias (the user-facing prompt for this feature called it
// /api/ai-time-helper). Both paths share the same handler so existing clients
// keep working.
router.post("/ai-time-helper", handleChatPost);

export default router;
