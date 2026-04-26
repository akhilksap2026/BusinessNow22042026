import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import {
  db, timeEntriesTable, allocationsTable, projectsTable, tasksTable,
  timeSettingsTable, usersTable,
} from "@workspace/db";

const router: IRouter = Router();

// ─── Shared AI caller ─────────────────────────────────────────────────────────

async function callClaude(prompt: string, maxTokens = 200, jsonMode = false): Promise<string | null> {
  const baseUrl = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  if (!baseUrl || !apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
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
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const data = await response.json() as any;
    return data?.content?.[0]?.text?.trim() ?? null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

// ─── POST /api/ai/time-comment-suggestion ─────────────────────────────────────
// Original comment-suggestion endpoint (kept for backwards compatibility)
router.post("/ai/time-comment-suggestion", async (req, res): Promise<void> => {
  const { projectName, taskName, categoryName } = req.body ?? {};
  const contextParts = [
    projectName ? `Project: ${projectName}` : null,
    taskName ? `Task: ${taskName}` : null,
    categoryName ? `Category: ${categoryName}` : null,
  ].filter(Boolean).join(", ");
  const prompt = `You are a professional services timesheet assistant. Based on this work context — ${contextParts} — write a single concise sentence (maximum 12 words) that describes what work was done. Reply with only the sentence, no quotes, no punctuation other than necessary.`;
  const suggestion = await callClaude(prompt, 60);
  res.json({ suggestion });
});

// ─── POST /api/ai/timesheet-assist ────────────────────────────────────────────
// Natural language → structured time entry suggestion.
// Body: { userId, message, weekStart, context? }
// Returns: { entries: [...], guardrails: [...], reply }
router.post("/ai/timesheet-assist", async (req, res): Promise<void> => {
  const { userId, message, weekStart } = req.body ?? {};
  if (!userId || !message) {
    res.status(400).json({ error: "userId and message are required" });
    return;
  }

  // Fetch user's active allocations + project names for context
  const allocs = await db
    .select({
      projectId: allocationsTable.projectId,
      hoursPerWeek: allocationsTable.hoursPerWeek,
      totalHours: allocationsTable.totalHours,
      startDate: allocationsTable.startDate,
      endDate: allocationsTable.endDate,
      projectName: projectsTable.name,
      projectStatus: projectsTable.status,
    })
    .from(allocationsTable)
    .innerJoin(projectsTable, eq(projectsTable.id, allocationsTable.projectId))
    .where(eq(allocationsTable.userId, Number(userId)));

  // Fetch logged hours this week per project for guardrail awareness
  const wStart = weekStart ?? new Date().toISOString().slice(0, 10);
  const wEnd = (() => {
    const d = new Date(wStart + "T00:00:00");
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  })();
  const weekEntries = await db
    .select()
    .from(timeEntriesTable)
    .where(
      and(
        eq(timeEntriesTable.userId, Number(userId)),
        gte(timeEntriesTable.date, wStart),
        lte(timeEntriesTable.date, wEnd),
      ),
    );
  const weekHoursMap = new Map<number, number>();
  for (const e of weekEntries) {
    if (e.projectId) weekHoursMap.set(e.projectId, (weekHoursMap.get(e.projectId) ?? 0) + Number(e.hours));
  }

  const today = new Date().toISOString().slice(0, 10);

  const projectContext = allocs.map((a) => {
    const logged = weekHoursMap.get(a.projectId ?? 0) ?? 0;
    const remaining = a.hoursPerWeek ? Math.max(0, Number(a.hoursPerWeek) - logged) : null;
    const expired = a.endDate && a.endDate < today;
    return `- "${a.projectName}" (ID:${a.projectId}, ${logged}h logged this week of ${a.hoursPerWeek ?? "?"}h allocated${expired ? ", EXPIRED" : ""})`;
  }).join("\n");

  const prompt = `You are a professional services timesheet AI assistant. A team member wrote: "${message}"

Their active project allocations this week (${wStart} to ${wEnd}):
${projectContext || "No project allocations found."}

Today is ${today}.

Parse their message and respond with a JSON object (no markdown, no code block) in this exact format:
{
  "reply": "A brief friendly confirmation message (1-2 sentences)",
  "entries": [
    {
      "date": "YYYY-MM-DD",
      "projectId": <number or null for internal>,
      "projectName": "<name>",
      "hours": <number>,
      "description": "<12-word work description>",
      "billable": <true or false>
    }
  ],
  "warnings": ["<any guardrail concern>"]
}

Rules:
- Only suggest projects from the user's allocation list (match by name).
- If the project is expired, include a warning.
- If hours exceed weekly allocation, include a warning.
- Set billable=false for internal/admin time.
- If the message is ambiguous, ask for clarification in "reply" and return empty entries.
- Date defaults to today unless specified.
- Return valid JSON only, nothing else.`;

  const raw = await callClaude(prompt, 600, true);
  if (!raw) {
    res.json({ reply: "I couldn't process that request right now. Please try again or use the manual entry.", entries: [], warnings: [] });
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    res.json({
      reply: parsed.reply ?? "Here's what I found:",
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    });
  } catch {
    // AI returned prose instead of JSON — extract the reply at least
    res.json({ reply: raw.slice(0, 300), entries: [], warnings: [] });
  }
});

// ─── GET /api/ai/timesheet-suggestions ────────────────────────────────────────
// Auto-suggest entries for a user based on their allocations and logged hours.
// Query: { userId, weekStart }
// Returns: { suggestions: [...] }
router.get("/ai/timesheet-suggestions", async (req, res): Promise<void> => {
  const userId = req.query.userId ? Number(req.query.userId) : null;
  const weekStart = req.query.weekStart ? String(req.query.weekStart) : null;
  if (!userId || !weekStart) {
    res.status(400).json({ error: "userId and weekStart are required" });
    return;
  }

  const wEnd = (() => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  })();
  const today = new Date().toISOString().slice(0, 10);

  const allocs = await db
    .select({
      projectId: allocationsTable.projectId,
      hoursPerWeek: allocationsTable.hoursPerWeek,
      endDate: allocationsTable.endDate,
      projectName: projectsTable.name,
    })
    .from(allocationsTable)
    .innerJoin(projectsTable, eq(projectsTable.id, allocationsTable.projectId))
    .where(eq(allocationsTable.userId, userId));

  const weekEntries = await db
    .select()
    .from(timeEntriesTable)
    .where(
      and(
        eq(timeEntriesTable.userId, userId),
        gte(timeEntriesTable.date, weekStart),
        lte(timeEntriesTable.date, wEnd),
      ),
    );
  const weekHoursMap = new Map<number, number>();
  for (const e of weekEntries) {
    if (e.projectId) weekHoursMap.set(e.projectId, (weekHoursMap.get(e.projectId) ?? 0) + Number(e.hours));
  }

  const [settings] = await db.select().from(timeSettingsTable).limit(1);
  const weeklyCapacity = settings?.weeklyCapacityHours ?? 40;
  const workDays = (settings?.workingDays ?? "Mon,Tue,Wed,Thu,Fri").split(",").filter(Boolean);
  const dailyHours = Math.round(weeklyCapacity / workDays.length);

  // Build suggestions: for each working day that has gaps, suggest allocation-based entries
  const workDayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
  const workDowSet = new Set(workDays.map((d) => workDayMap[d] ?? -1));

  const dayEntries = new Map<string, number>();
  for (const e of weekEntries) {
    dayEntries.set(e.date, (dayEntries.get(e.date) ?? 0) + Number(e.hours));
  }

  // Generate Mon–Fri dates for the week
  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + i);
    const dow = d.getDay();
    if (workDowSet.has(dow)) {
      weekDates.push(d.toISOString().slice(0, 10));
    }
  }

  // For each active allocation, distribute remaining weekly hours across days
  const suggestions: any[] = [];
  for (const alloc of allocs) {
    if (!alloc.projectId) continue;
    if (alloc.endDate && alloc.endDate < weekStart) continue; // expired
    const allocHPW = Number(alloc.hoursPerWeek);
    const logged = weekHoursMap.get(alloc.projectId) ?? 0;
    const remaining = allocHPW > 0 ? Math.max(0, allocHPW - logged) : 0;
    if (remaining <= 0) continue;

    // Spread remaining hours across days that still have capacity
    const perDay = Math.min(remaining, dailyHours);
    for (const date of weekDates) {
      if (date > today) continue; // don't suggest future dates
      const dayTotal = dayEntries.get(date) ?? 0;
      const projectDayLogged = weekEntries
        .filter((e) => e.date === date && e.projectId === alloc.projectId)
        .reduce((s, e) => s + Number(e.hours), 0);
      if (projectDayLogged > 0) continue; // already has entry for this project/day
      const dayCapacity = Math.max(0, dailyHours - dayTotal);
      if (dayCapacity <= 0) continue;
      const suggestedHours = Math.min(perDay, dayCapacity);
      if (suggestedHours <= 0) continue;
      suggestions.push({
        date,
        projectId: alloc.projectId,
        projectName: alloc.projectName,
        hours: suggestedHours,
        description: "",
        billable: true,
      });
    }
  }

  // Use AI to enhance descriptions if AI is available
  if (suggestions.length > 0 && process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL) {
    const projectNames = [...new Set(suggestions.map((s) => s.projectName))].join(", ");
    const descPrompt = `You are a professional timesheet assistant. For each of these projects: ${projectNames}, write a single natural 8-12 word description of typical daily work. Reply with a JSON object mapping project names to descriptions, nothing else. Example: {"Project Alpha": "Backend API development and code review with team"}`;
    const raw = await callClaude(descPrompt, 300, true);
    if (raw) {
      try {
        const descMap = JSON.parse(raw);
        for (const s of suggestions) {
          if (descMap[s.projectName]) s.description = descMap[s.projectName];
        }
      } catch {}
    }
  }

  res.json({ suggestions, weekDates, dailyCapacity: dailyHours });
});

// ─── POST /api/ai/billable-anomaly-check ──────────────────────────────────────
// Rule 10 — Billable Hours Ratio Anomaly detector.
// Body: { userId, weekStart }
// Returns: { anomaly: boolean, message?: string, billablePct: number }
router.post("/ai/billable-anomaly-check", async (req, res): Promise<void> => {
  const { userId, weekStart } = req.body ?? {};
  if (!userId || !weekStart) { res.status(400).json({ error: "userId and weekStart required" }); return; }

  const wEnd = (() => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  })();

  const entries = await db
    .select({ hours: timeEntriesTable.hours, billable: timeEntriesTable.billable })
    .from(timeEntriesTable)
    .where(
      and(
        eq(timeEntriesTable.userId, Number(userId)),
        gte(timeEntriesTable.date, weekStart),
        lte(timeEntriesTable.date, wEnd),
      ),
    );

  const total = entries.reduce((s, e) => s + Number(e.hours), 0);
  const billable = entries.filter((e) => e.billable).reduce((s, e) => s + Number(e.hours), 0);
  const billablePct = total > 0 ? Math.round((billable / total) * 100) : 0;

  // Check against org average: fetch all users' billable % for this week
  const allWeekEntries = await db
    .select({ hours: timeEntriesTable.hours, billable: timeEntriesTable.billable })
    .from(timeEntriesTable)
    .where(and(gte(timeEntriesTable.date, weekStart), lte(timeEntriesTable.date, wEnd)));
  const orgTotal = allWeekEntries.reduce((s, e) => s + Number(e.hours), 0);
  const orgBillable = allWeekEntries.filter((e) => e.billable).reduce((s, e) => s + Number(e.hours), 0);
  const orgBillablePct = orgTotal > 0 ? Math.round((orgBillable / orgTotal) * 100) : 0;

  const anomaly = orgBillablePct > 20 && billablePct < orgBillablePct - 30;
  const message = anomaly
    ? `Your billable hours are ${billablePct}% this week, which is significantly below the team average of ${orgBillablePct}%. Please review your entries to ensure billable work is coded correctly.`
    : undefined;

  res.json({ anomaly, billablePct, orgBillablePct, message });
});

export default router;
