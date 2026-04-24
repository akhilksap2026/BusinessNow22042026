import { Router, type IRouter, type Request } from "express";
import { z } from "zod";
import { isAssistantConfigured, runChatTurn } from "../lib/aiAssistant";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const ChatBody = z.object({
  message: z.string().trim().min(1).max(4000),
  sessionId: z.string().trim().min(1).max(64).optional().nullable(),
});

function getBaseUrl(req: Request): string {
  // Internal fetch base — same process, so localhost is correct. The PORT env
  // var is required at boot, so it's always present here.
  const port = process.env.PORT ?? "8080";
  return `http://127.0.0.1:${port}`;
}

router.get("/ai-chat/status", (_req, res) => {
  res.json({ configured: isAssistantConfigured() });
});

router.post("/ai-chat", async (req, res): Promise<void> => {
  if (!isAssistantConfigured()) {
    res.status(503).json({
      error: "AI assistant is not configured. Set GROQ_API_KEY (or OPENAI_API_KEY) and restart the server.",
    });
    return;
  }

  const parsed = ChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join("; ") });
    return;
  }

  // Identity comes strictly from headers (already verified by verifyRoleClaim
  // middleware). Never trust message content for actor identity.
  const userIdRaw = req.headers["x-user-id"];
  const userRoleRaw = req.headers["x-user-role"];
  const userId = Number(Array.isArray(userIdRaw) ? userIdRaw[0] : userIdRaw);
  const userRole = String(Array.isArray(userRoleRaw) ? userRoleRaw[0] : userRoleRaw ?? "");
  if (!userId || Number.isNaN(userId) || !userRole) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const result = await runChatTurn({
      sessionId: parsed.data.sessionId ?? null,
      message: parsed.data.message,
      userId,
      userRole,
      baseUrl: getBaseUrl(req),
    });
    res.json(result);
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500;
    logger.error({ err }, "ai-chat: turn failed");
    res.status(status).json({ error: (err as Error).message ?? "AI assistant error" });
  }
});

export default router;
