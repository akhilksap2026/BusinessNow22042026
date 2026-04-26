import { Router, type IRouter } from "express";

const router: IRouter = Router();

// POST /api/ai/time-comment-suggestion
// Uses Replit AI Integrations (Anthropic) to suggest a brief work description.
// Falls back gracefully (returns { suggestion: null }) on any error or timeout.
// No user API key required — credentials managed by Replit.
router.post("/ai/time-comment-suggestion", async (req, res): Promise<void> => {
  const { projectName, taskName, categoryName } = req.body ?? {};

  const baseUrl = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

  if (!baseUrl || !apiKey) {
    res.json({ suggestion: null });
    return;
  }

  const contextParts = [
    projectName ? `Project: ${projectName}` : null,
    taskName ? `Task: ${taskName}` : null,
    categoryName ? `Category: ${categoryName}` : null,
  ].filter(Boolean).join(", ");

  const prompt = `You are a professional services timesheet assistant. Based on this work context — ${contextParts} — write a single concise sentence (maximum 12 words) that describes what work was done. Reply with only the sentence, no quotes, no punctuation other than necessary.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 60,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      res.json({ suggestion: null });
      return;
    }

    const data = await response.json() as any;
    const suggestion = data?.content?.[0]?.text?.trim() ?? null;
    res.json({ suggestion });
  } catch {
    clearTimeout(timeout);
    res.json({ suggestion: null });
  }
});

export default router;
