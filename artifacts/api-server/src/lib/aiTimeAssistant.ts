/**
 * AI Time-Tracking Assistant — backend orchestrator.
 *
 * This module is purely additive. It does NOT modify any existing route or
 * data flow. It exposes `runAssistantTurn()` which:
 *
 *   1. Loads (or creates) an in-memory conversation history keyed by sessionId.
 *   2. Calls the LLM (Groq llama-3.3-70b via OpenAI-compatible API) with a
 *      set of read-only tools that surface the caller's projects, tasks,
 *      and existing time logs.
 *   3. When the model is ready to log time, it calls the special
 *      `propose_time_entries` tool, which short-circuits the loop and returns
 *      the proposal to the caller for user confirmation. No write happens
 *      server-side until the frontend re-submits the same proposal as
 *      `confirmedEntries`.
 *
 * Writes are routed back through the existing `POST /api/time-entries`
 * endpoint via a same-process internal fetch with the caller's headers so
 * that all governance (parent-task ban, billable cascade, lock dates,
 * RBAC) stays in force without duplication.
 */

import OpenAI from "openai";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import {
  db,
  projectsTable,
  tasksTable,
  allocationsTable,
  timeEntriesTable,
  usersTable,
} from "@workspace/db";

// ─── LLM client ─────────────────────────────────────────────────────────────

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const OPENAI_MODEL = "gpt-4o-mini";

function getLLMClient(): { client: OpenAI; model: string; provider: "groq" | "openai" } | null {
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (groqKey) {
    return {
      client: new OpenAI({ apiKey: groqKey, baseURL: GROQ_BASE_URL }),
      model: GROQ_MODEL,
      provider: "groq",
    };
  }
  if (openaiKey) {
    return { client: new OpenAI({ apiKey: openaiKey }), model: OPENAI_MODEL, provider: "openai" };
  }
  return null;
}

// ─── In-memory session storage ──────────────────────────────────────────────

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

interface Session {
  ownerUserId: number;
  messages: ChatMessage[];
  lastTouched: number;
}

const SESSIONS = new Map<string, Session>();
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour idle TTL
const MAX_SESSIONS = 200;
const MAX_MESSAGES_PER_SESSION = 40;

/**
 * Build the internal session-store key. Sessions are partitioned by
 * authenticated userId so a leaked / guessed / shared sessionId from one
 * user can NEVER surface another user's prior chat history. The
 * ownerUserId is also stored on the session record as defence-in-depth
 * (we assert it on every read).
 */
function sessionKey(userId: number, sessionId: string): string {
  return `${userId}:${sessionId}`;
}

function pruneSessions() {
  const now = Date.now();
  for (const [k, s] of SESSIONS) {
    if (now - s.lastTouched > SESSION_TTL_MS) SESSIONS.delete(k);
  }
  if (SESSIONS.size > MAX_SESSIONS) {
    // Drop oldest sessions until under cap.
    const entries = [...SESSIONS.entries()].sort((a, b) => a[1].lastTouched - b[1].lastTouched);
    while (SESSIONS.size > MAX_SESSIONS) SESSIONS.delete(entries.shift()![0]);
  }
}

function getSession(userId: number, sessionId: string, systemPrompt: string): Session {
  pruneSessions();
  const k = sessionKey(userId, sessionId);
  let s = SESSIONS.get(k);
  if (!s || s.ownerUserId !== userId) {
    // Either no session or (defence-in-depth) ownership mismatch — reset.
    s = {
      ownerUserId: userId,
      messages: [{ role: "system", content: systemPrompt }],
      lastTouched: Date.now(),
    };
    SESSIONS.set(k, s);
  } else {
    s.lastTouched = Date.now();
    // Keep the system prompt + the most-recent N messages.
    if (s.messages.length > MAX_MESSAGES_PER_SESSION) {
      const sys = s.messages[0];
      s.messages = [sys, ...s.messages.slice(-MAX_MESSAGES_PER_SESSION + 1)];
    }
  }
  return s;
}

export function clearSession(userId: number, sessionId: string) {
  SESSIONS.delete(sessionKey(userId, sessionId));
}

// ─── Tool definitions (OpenAI tools spec) ───────────────────────────────────

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_my_projects",
      description:
        "List active projects the current user is allocated to. Returns id, name, status, accountName. Use this to find a project by name.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "list_my_tasks",
      description:
        "List the current user's assigned tasks. Optionally filter to one projectId. Returns id, name, projectId, status, dueDate, isParent. Time can ONLY be logged on leaf tasks (isParent=false).",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "number", description: "Restrict to one project" },
          includeCompleted: { type: "boolean", description: "Include Done/Completed tasks (default false)" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_my_time_logs",
      description:
        "List the current user's existing time entries within a date range (inclusive). Use to answer 'what did I log this week' or to check before logging duplicates.",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "YYYY-MM-DD" },
          endDate: { type: "string", description: "YYYY-MM-DD" },
        },
        required: ["startDate", "endDate"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_time_summary",
      description:
        "Get totals for the current user across a date range — total hours logged, hours by project, days with no entries. Useful for 'what is left to log' style questions.",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string" },
          endDate: { type: "string" },
        },
        required: ["startDate", "endDate"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_time_entries",
      description:
        "Call this ONLY when you have all the data needed to log time and want the user to confirm. Each entry MUST have hours > 0, a date in YYYY-MM-DD, and either projectId or be marked as a non-project entry (then projectId omitted). taskId must reference a leaf task. Do not call this if any required field is missing — ask the user instead.",
      parameters: {
        type: "object",
        properties: {
          entries: {
            type: "array",
            items: {
              type: "object",
              properties: {
                projectId: { type: "number", description: "Required for billable work" },
                taskId: { type: "number", description: "Optional but preferred — must be a leaf task" },
                date: { type: "string", description: "YYYY-MM-DD" },
                hours: { type: "number" },
                description: { type: "string" },
                billable: { type: "boolean", description: "Defaults to project default if omitted" },
              },
              required: ["date", "hours", "description"],
              additionalProperties: false,
            },
          },
          summary: {
            type: "string",
            description:
              "One short sentence summarising what is being logged, shown to the user above the confirmation buttons.",
          },
        },
        required: ["entries", "summary"],
        additionalProperties: false,
      },
    },
  },
];

// ─── Tool execution ─────────────────────────────────────────────────────────

interface ToolContext {
  userId: number;
  baseUrl: string;
  headers: Record<string, string>;
}

async function execTool(
  name: string,
  args: Record<string, any>,
  ctx: ToolContext,
): Promise<unknown> {
  switch (name) {
    case "list_my_projects": {
      // Projects the user has allocations on, plus any project where they own tasks.
      const allocs = await db.select().from(allocationsTable).where(eq(allocationsTable.userId, ctx.userId));
      const projectIds = Array.from(new Set(allocs.map(a => a.projectId)));
      if (projectIds.length === 0) return { projects: [] };
      const projects = await db.select().from(projectsTable).where(inArray(projectsTable.id, projectIds));
      return {
        projects: projects
          .filter(p => !p.deletedAt)
          .map(p => ({
            id: p.id,
            name: p.name,
            status: p.status,
            startDate: p.startDate,
            dueDate: p.dueDate,
          })),
      };
    }

    case "list_my_tasks": {
      const filter = args.projectId
        ? and(eq(tasksTable.projectId, Number(args.projectId)))
        : undefined;
      const all = filter ? await db.select().from(tasksTable).where(filter) : await db.select().from(tasksTable);
      const childParentIds = new Set(all.filter(t => t.parentTaskId !== null).map(t => t.parentTaskId as number));
      const includeCompleted = args.includeCompleted === true;
      const completedStatuses = new Set(["Completed", "Done", "Cancelled"]);
      const mine = all.filter(t => {
        const assigned = (t.assigneeIds ?? []).includes(ctx.userId);
        if (!assigned) return false;
        if (!includeCompleted && completedStatuses.has(t.status ?? "")) return false;
        return true;
      });
      return {
        tasks: mine.map(t => ({
          id: t.id,
          projectId: t.projectId,
          name: t.name,
          status: t.status,
          dueDate: t.dueDate,
          isParent: childParentIds.has(t.id) || t.isPhase === true,
          billable: t.billable !== false,
        })),
      };
    }

    case "list_my_time_logs": {
      const startDate = String(args.startDate ?? "");
      const endDate = String(args.endDate ?? "");
      if (!startDate || !endDate) return { error: "startDate and endDate required" };
      const rows = await db.select().from(timeEntriesTable).where(
        and(
          eq(timeEntriesTable.userId, ctx.userId),
          gte(timeEntriesTable.date, startDate),
          lte(timeEntriesTable.date, endDate),
        ),
      );
      const projectIds = Array.from(new Set(rows.map(r => r.projectId).filter(Boolean) as number[]));
      const projects = projectIds.length
        ? await db.select({ id: projectsTable.id, name: projectsTable.name }).from(projectsTable).where(inArray(projectsTable.id, projectIds))
        : [];
      const projectName = (id: number | null) => (id ? projects.find(p => p.id === id)?.name ?? null : null);
      return {
        entries: rows.map(r => ({
          id: r.id,
          date: r.date,
          hours: Number(r.hours),
          projectId: r.projectId,
          projectName: projectName(r.projectId),
          taskId: r.taskId,
          description: r.description,
          billable: r.billable,
          approved: r.approved,
        })),
      };
    }

    case "get_time_summary": {
      const startDate = String(args.startDate ?? "");
      const endDate = String(args.endDate ?? "");
      if (!startDate || !endDate) return { error: "startDate and endDate required" };
      const rows = await db.select().from(timeEntriesTable).where(
        and(
          eq(timeEntriesTable.userId, ctx.userId),
          gte(timeEntriesTable.date, startDate),
          lte(timeEntriesTable.date, endDate),
        ),
      );
      const total = rows.reduce((s, r) => s + Number(r.hours), 0);
      const byProjectMap = new Map<number, number>();
      for (const r of rows) {
        if (r.projectId) byProjectMap.set(r.projectId, (byProjectMap.get(r.projectId) ?? 0) + Number(r.hours));
      }
      const projects = byProjectMap.size
        ? await db.select({ id: projectsTable.id, name: projectsTable.name }).from(projectsTable).where(inArray(projectsTable.id, [...byProjectMap.keys()]))
        : [];
      // Days with no entries (Mon–Fri only)
      const daysCovered = new Set(rows.map(r => r.date));
      const missingWeekdays: string[] = [];
      const start = new Date(startDate + "T00:00:00Z");
      const end = new Date(endDate + "T00:00:00Z");
      const cursor = new Date(start);
      while (cursor <= end) {
        const dow = cursor.getUTCDay();
        if (dow !== 0 && dow !== 6) {
          const iso = cursor.toISOString().slice(0, 10);
          if (!daysCovered.has(iso)) missingWeekdays.push(iso);
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, ctx.userId));
      const weeklyCapacity = user?.capacity ?? 40;
      return {
        totalHours: total,
        weeklyCapacity,
        byProject: [...byProjectMap.entries()].map(([id, hours]) => ({
          projectId: id,
          projectName: projects.find(p => p.id === id)?.name ?? "Unknown",
          hours,
        })),
        weekdaysWithNoEntries: missingWeekdays,
      };
    }

    case "propose_time_entries": {
      // Special tool — returns the proposal to be surfaced to the user; the
      // outer loop short-circuits on this and never sends the result back to
      // the model.
      return {
        __proposal: true,
        summary: String(args.summary ?? "Log time"),
        entries: Array.isArray(args.entries) ? args.entries : [],
      };
    }
  }
  return { error: `Unknown tool ${name}` };
}

// ─── Main entry point ───────────────────────────────────────────────────────

export interface RunAssistantInput {
  sessionId: string;
  message: string;
  userId: number;
  userName: string;
  userRole: string;
  baseUrl: string;
  headers: Record<string, string>;
}

export interface ProposedEntry {
  projectId?: number | null;
  taskId?: number | null;
  date: string;
  hours: number;
  description: string;
  billable?: boolean;
}

export interface AssistantResponse {
  reply: string;
  proposal?: { summary: string; entries: ProposedEntry[] };
  toolCalls?: string[];
  provider?: string;
  error?: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildSystemPrompt(userName: string, userRole: string): string {
  const today = todayISO();
  const dow = new Date(today + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  return [
    "You are a friendly, concise time-tracking assistant inside a PSA (Professional Services Automation) tool.",
    `The user you are helping is ${userName} (role: ${userRole}). Their user_id is implicit on every API call — never ask for it.`,
    `Today is ${today} (${dow}). When the user says 'yesterday', 'last Monday', 'this week', resolve it relative to that date in UTC and convert to YYYY-MM-DD.`,
    "",
    "Your single purpose is to help the user log time entries quickly. You can also answer questions about what they have already logged.",
    "",
    "Workflow:",
    "1. Read the user's request. If they want to log time, use the tools to find the correct project / task IDs (NEVER guess IDs).",
    "2. If anything required is unclear (project name ambiguous, hours missing, date range vague, or description missing for a billable entry) ASK A SHORT FOLLOW-UP QUESTION. Do not invent details.",
    "3. When everything is resolved, call `propose_time_entries` with the full list. The user will then see a confirmation card and decide.",
    "4. If the user declines or wants to adjust, edit the proposal in the next turn.",
    "",
    "Rules:",
    "- ONLY propose entries for the current user. Never propose entries for someone else.",
    "- Time can ONLY be logged on LEAF tasks (isParent=false). If the user names a parent/phase task, ask them which sub-task.",
    "- Hours must be > 0 and ≤ 24 per day. Billable defaults come from the project; you can omit `billable` to use the default.",
    "- For 'log time for last 3 days on X', create one entry per weekday in that range, asking how to split hours if not specified.",
    "- If totals exceed the user's weekly capacity, warn them in the summary.",
    "- Be conversational but brief. No emojis unless the user uses them first.",
  ].join("\n");
}

export async function runAssistantTurn(input: RunAssistantInput): Promise<AssistantResponse> {
  const llm = getLLMClient();
  if (!llm) {
    return {
      reply:
        "AI assistant is not configured. Set GROQ_API_KEY (preferred) or OPENAI_API_KEY in your environment.",
      error: "missing_api_key",
    };
  }

  const session = getSession(input.userId, input.sessionId, buildSystemPrompt(input.userName, input.userRole));
  session.messages.push({ role: "user", content: input.message });

  const ctx: ToolContext = {
    userId: input.userId,
    baseUrl: input.baseUrl,
    headers: input.headers,
  };
  const toolCallsExecuted: string[] = [];

  // Tool-call loop with safety cap.
  for (let step = 0; step < 6; step++) {
    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await llm.client.chat.completions.create({
        model: llm.model,
        messages: session.messages,
        tools: TOOLS,
        tool_choice: "auto",
        temperature: 0.2,
      });
    } catch (err: any) {
      // Roll back the user message on hard failure so the next turn re-asks.
      session.messages.pop();
      return {
        reply: `Sorry — I couldn't reach the AI provider (${llm.provider}). Please try again in a moment.`,
        error: String(err?.message ?? err),
        provider: llm.provider,
      };
    }

    const choice = completion.choices[0];
    const msg = choice.message;
    session.messages.push(msg);

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return {
        reply: msg.content ?? "",
        toolCalls: toolCallsExecuted,
        provider: llm.provider,
      };
    }

    let proposal: AssistantResponse["proposal"] | undefined;

    for (const call of msg.tool_calls) {
      if (call.type !== "function") continue;
      const name = call.function.name;
      let parsedArgs: Record<string, any> = {};
      try {
        parsedArgs = JSON.parse(call.function.arguments || "{}");
      } catch {
        parsedArgs = {};
      }
      toolCallsExecuted.push(name);
      const result = await execTool(name, parsedArgs, ctx);
      // Always push the tool result so the conversation history is well-formed.
      session.messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      } as ChatMessage);
      if (
        name === "propose_time_entries" &&
        result &&
        typeof result === "object" &&
        (result as any).__proposal
      ) {
        const r = result as any;
        proposal = { summary: String(r.summary ?? ""), entries: r.entries ?? [] };
      }
    }

    if (proposal) {
      // Synthesize a short user-facing reply alongside the proposal so the
      // chat surface always has something to render even when the model went
      // straight from tool use → propose.
      const reply =
        proposal.summary ||
        "Here is what I'd like to log. Please review and confirm.";
      return {
        reply,
        proposal,
        toolCalls: toolCallsExecuted,
        provider: llm.provider,
      };
    }
    // otherwise loop and let the model react to tool output
  }

  return {
    reply: "I had to stop after several tool calls. Could you rephrase or simplify?",
    toolCalls: toolCallsExecuted,
    provider: llm.provider,
  };
}

// ─── Commit confirmed entries via existing /api/time-entries ────────────────

export interface CommitResult {
  logged: Array<{ id: number; date: string; hours: number; projectId: number | null; description: string }>;
  errors: Array<{ entry: ProposedEntry; status: number; error: string }>;
}

export async function commitEntries(opts: {
  entries: ProposedEntry[];
  baseUrl: string;
  headers: Record<string, string>;
  userId: number;
}): Promise<CommitResult> {
  const result: CommitResult = { logged: [], errors: [] };
  for (const e of opts.entries) {
    if (!e.date || !e.hours || e.hours <= 0) {
      result.errors.push({ entry: e, status: 400, error: "Missing date or hours" });
      continue;
    }
    const body: Record<string, unknown> = {
      userId: opts.userId,
      date: e.date,
      hours: e.hours,
      description: e.description ?? "",
      // Default billable: true when associated with a project (existing route's
      // governance will downgrade to false for non-project entries on line 78).
      // The AI may override either way via the proposal.
      billable: e.billable === undefined ? !!e.projectId : e.billable,
    };
    if (e.projectId) body.projectId = e.projectId;
    if (e.taskId) body.taskId = e.taskId;
    try {
      const r = await fetch(`${opts.baseUrl}/api/time-entries`, {
        method: "POST",
        headers: { ...opts.headers, "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const text = await r.text().catch(() => "");
        result.errors.push({ entry: e, status: r.status, error: text || r.statusText });
        continue;
      }
      const row = (await r.json()) as { id: number; date: string; hours: number; projectId: number | null; description: string };
      result.logged.push({
        id: row.id,
        date: row.date,
        hours: Number(row.hours),
        projectId: row.projectId ?? null,
        description: row.description ?? "",
      });
    } catch (err: any) {
      result.errors.push({ entry: e, status: 500, error: String(err?.message ?? err) });
    }
  }
  return result;
}
