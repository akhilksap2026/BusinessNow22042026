/**
 * AI Time-Tracking Assistant — backend orchestrator.
 *
 * This module is purely additive. It does NOT modify any existing route or
 * data flow. It exposes:
 *   - `runAssistantTurn()` — runs one chat turn with tool/function calling
 *   - `commitEntries()`    — commits a confirmed proposal via the EXISTING
 *                            POST /api/time-entries route (preserving all
 *                            governance, RBAC, billable cascade, etc.)
 *   - `buildWelcome()`     — produces the proactive opening message,
 *                            including a "catch up" reminder if the user
 *                            hasn't logged time in 2+ days.
 *
 * Security boundaries:
 *   - userId always comes from the verified `x-user-id` header. Every tool
 *     receives userId via the server-controlled `ToolContext` — the LLM
 *     never sees or supplies it.
 *   - Every tool's arguments are validated through Zod before execution
 *     (defensive validation against non-deterministic LLM output).
 *   - Sessions are partitioned by `${userId}:${sessionId}` so a leaked /
 *     guessed sessionId cannot leak another user's chat history.
 */

import OpenAI from "openai";
import { z } from "zod";
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

export function isLLMConfigured(): boolean {
  return !!getLLMClient();
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

function sessionKey(userId: number, sessionId: string): string {
  return `${userId}:${sessionId}`;
}

function pruneSessions() {
  const now = Date.now();
  for (const [k, s] of SESSIONS) {
    if (now - s.lastTouched > SESSION_TTL_MS) SESSIONS.delete(k);
  }
  if (SESSIONS.size > MAX_SESSIONS) {
    const entries = [...SESSIONS.entries()].sort((a, b) => a[1].lastTouched - b[1].lastTouched);
    while (SESSIONS.size > MAX_SESSIONS) SESSIONS.delete(entries.shift()![0]);
  }
}

function getSession(userId: number, sessionId: string, systemPrompt: string): Session {
  pruneSessions();
  const k = sessionKey(userId, sessionId);
  let s = SESSIONS.get(k);
  if (!s || s.ownerUserId !== userId) {
    s = {
      ownerUserId: userId,
      messages: [{ role: "system", content: systemPrompt }],
      lastTouched: Date.now(),
    };
    SESSIONS.set(k, s);
  } else {
    s.lastTouched = Date.now();
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

// ─── Tool argument schemas (defensive validation of LLM output) ─────────────

const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

const TOOL_ARG_SCHEMAS = {
  fetch_current_projects: z.object({}).strict(),

  fetch_tasks: z
    .object({
      projectId: z.number().int().positive().optional(),
      status: z.string().optional(),
    })
    .strict(),

  get_time_logs: z
    .object({
      from: DateStr.optional(),
      to: DateStr.optional(),
      projectId: z.number().int().positive().optional(),
    })
    .strict(),

  get_time_summary: z
    .object({
      period: z.enum(["week", "month"]).default("week"),
      weekOffset: z.number().int().optional(),
    })
    .strict(),

  get_pending_tasks: z
    .object({
      projectId: z.number().int().positive().optional(),
    })
    .strict(),

  find_project_by_name: z
    .object({
      query: z.string().min(1),
    })
    .strict(),

  find_task_by_name: z
    .object({
      query: z.string().min(1),
      projectId: z.number().int().positive().optional(),
    })
    .strict(),

  log_time_entries: z
    .object({
      entries: z
        .array(
          z
            .object({
              projectId: z.number().int().positive().optional(),
              taskId: z.number().int().positive().optional(),
              date: DateStr,
              hours: z.number().positive().max(24),
              description: z.string().min(1),
              billable: z.boolean().optional(),
            })
            .strict(),
        )
        .min(1)
        .max(31),
      summary: z.string().min(1),
    })
    .strict(),
} as const;

type ToolName = keyof typeof TOOL_ARG_SCHEMAS;

// ─── Tool definitions (OpenAI tools spec) ───────────────────────────────────

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "fetch_current_projects",
      description:
        "List active projects the current user is allocated to. Returns id, name, status, startDate, dueDate, totalAllocatedHours, totalLoggedHours so the model can warn on overruns.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_tasks",
      description:
        "List tasks under a project (or across all projects). Each task is flagged `assignedToMe` so the model can prefer the user's own work. Time can ONLY be logged on leaf tasks (isParent=false).",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "number" },
          status: { type: "string", description: "Filter by status (e.g. 'In Progress')" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_time_logs",
      description:
        "List the current user's existing time entries. Optionally filter by date range (inclusive YYYY-MM-DD) or projectId. Use to check for duplicates or answer 'what did I log this week?'.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string" },
          to: { type: "string" },
          projectId: { type: "number" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_time_summary",
      description:
        "Get the user's hours summary for a period — totals, per-project breakdown, capacity-vs-logged delta, days with no entries.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["week", "month"] },
          weekOffset: {
            type: "number",
            description: "0 = current week, -1 = last week, etc. Only relevant when period='week'.",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pending_tasks",
      description:
        "List incomplete tasks assigned to the current user (status not Completed/Done/Cancelled). Optionally restrict to one project.",
      parameters: {
        type: "object",
        properties: { projectId: { type: "number" } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_project_by_name",
      description:
        "Fuzzy-match a project name against the user's allocated projects. Returns up to 5 candidates ranked by best match. Use this BEFORE log_time_entries when the user says a project name.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_task_by_name",
      description:
        "Fuzzy-match a task name against the user's tasks (optionally within one project). Returns up to 5 candidates. Use BEFORE log_time_entries when the user references a task by name.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          projectId: { type: "number" },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_time_entries",
      description:
        "Stage a batch of time entries for user confirmation. The user will see a confirmation card and decide whether to commit. Each entry MUST have date YYYY-MM-DD, hours > 0 and <= 24, and a non-empty description. taskId must reference a leaf task (call fetch_tasks first if unsure). Do NOT call this if any required field is missing — ASK the user instead.",
      parameters: {
        type: "object",
        properties: {
          entries: {
            type: "array",
            items: {
              type: "object",
              properties: {
                projectId: { type: "number", description: "Project id (omit if user did not specify a project)." },
                taskId: { type: "number", description: "Leaf task id (omit if logging at project level)." },
                date: { type: "string", description: "ISO date YYYY-MM-DD." },
                hours: { type: "number", description: "Hours, > 0 and <= 24." },
                description: { type: "string", description: "What was worked on." },
                billable: { type: "boolean", description: "Defaults to true when projectId is set." },
              },
              required: ["date", "hours", "description"],
            },
          },
          summary: { type: "string", description: "One-sentence summary shown above the confirmation buttons." },
        },
        required: ["entries", "summary"],
      },
    },
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function weekRange(weekOffset: number): { from: string; to: string } {
  const today = new Date();
  const dow = today.getUTCDay() || 7; // 1..7 Mon..Sun
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - (dow - 1) + weekOffset * 7);
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { from: monday.toISOString().slice(0, 10), to: sunday.toISOString().slice(0, 10) };
}

function monthRange(): { from: string; to: string } {
  const today = new Date();
  const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const last = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
  return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
}

function fuzzyScore(query: string, candidate: string): number {
  const q = query.toLowerCase().trim();
  const c = candidate.toLowerCase();
  if (c === q) return 1.0;
  if (c.startsWith(q)) return 0.9;
  if (c.includes(q)) return 0.75;
  // Token-level: count matching tokens
  const qTokens = q.split(/\s+/).filter(Boolean);
  const cTokens = c.split(/\s+/).filter(Boolean);
  const matches = qTokens.filter(qt => cTokens.some(ct => ct.includes(qt) || qt.includes(ct))).length;
  return matches / Math.max(qTokens.length, 1) * 0.6;
}

// ─── Tool execution ─────────────────────────────────────────────────────────

interface ToolContext {
  userId: number;
  baseUrl: string;
  headers: Record<string, string>;
}

async function getMyProjects(userId: number) {
  const allocs = await db.select().from(allocationsTable).where(eq(allocationsTable.userId, userId));
  const projectIds = Array.from(new Set(allocs.map(a => a.projectId)));
  if (projectIds.length === 0) return [];
  const projects = await db.select().from(projectsTable).where(inArray(projectsTable.id, projectIds));
  return projects.filter(p => !p.deletedAt);
}

async function execTool(
  name: ToolName,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  switch (name) {
    case "fetch_current_projects": {
      const projects = await getMyProjects(ctx.userId);
      if (projects.length === 0) return { projects: [] };
      const projectIds = projects.map(p => p.id);
      const allocs = await db
        .select()
        .from(allocationsTable)
        .where(and(eq(allocationsTable.userId, ctx.userId), inArray(allocationsTable.projectId, projectIds)));
      const entries = await db
        .select()
        .from(timeEntriesTable)
        .where(and(eq(timeEntriesTable.userId, ctx.userId), inArray(timeEntriesTable.projectId, projectIds)));
      const allocByProject = new Map<number, number>();
      for (const a of allocs) {
        // Approximate total allocated hours = hoursPerWeek * weeks in window
        if (a.startDate && a.endDate) {
          const days = Math.max(
            0,
            Math.round((new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / 86400000) + 1,
          );
          const weeks = days / 7;
          allocByProject.set(
            a.projectId,
            (allocByProject.get(a.projectId) ?? 0) + Number(a.hoursPerWeek ?? 0) * weeks,
          );
        }
      }
      const loggedByProject = new Map<number, number>();
      for (const e of entries) {
        if (e.projectId)
          loggedByProject.set(e.projectId, (loggedByProject.get(e.projectId) ?? 0) + Number(e.hours));
      }
      return {
        projects: projects.map(p => ({
          id: p.id,
          name: p.name,
          status: p.status,
          startDate: p.startDate,
          dueDate: p.dueDate,
          totalAllocatedHours: Math.round(allocByProject.get(p.id) ?? 0),
          totalLoggedHours: Math.round((loggedByProject.get(p.id) ?? 0) * 100) / 100,
        })),
      };
    }

    case "fetch_tasks": {
      const projectId = args.projectId as number | undefined;
      const statusFilter = args.status as string | undefined;
      const all = projectId
        ? await db.select().from(tasksTable).where(eq(tasksTable.projectId, projectId))
        : await db.select().from(tasksTable);
      const childParentIds = new Set(
        all.filter(t => t.parentTaskId !== null).map(t => t.parentTaskId as number),
      );
      const filtered = statusFilter ? all.filter(t => (t.status ?? "") === statusFilter) : all;
      return {
        tasks: filtered.map(t => ({
          id: t.id,
          projectId: t.projectId,
          name: t.name,
          status: t.status,
          dueDate: t.dueDate,
          isParent: childParentIds.has(t.id) || t.isPhase === true,
          assignedToMe: (t.assigneeIds ?? []).includes(ctx.userId),
          billable: t.billable !== false,
        })),
      };
    }

    case "get_time_logs": {
      const conds = [eq(timeEntriesTable.userId, ctx.userId)];
      if (args.from) conds.push(gte(timeEntriesTable.date, args.from as string));
      if (args.to) conds.push(lte(timeEntriesTable.date, args.to as string));
      if (args.projectId) conds.push(eq(timeEntriesTable.projectId, args.projectId as number));
      const rows = await db.select().from(timeEntriesTable).where(and(...conds));
      const projectIds = Array.from(new Set(rows.map(r => r.projectId).filter(Boolean) as number[]));
      const projects = projectIds.length
        ? await db.select({ id: projectsTable.id, name: projectsTable.name }).from(projectsTable).where(inArray(projectsTable.id, projectIds))
        : [];
      const taskIds = Array.from(new Set(rows.map(r => r.taskId).filter(Boolean) as number[]));
      const tasks = taskIds.length
        ? await db.select({ id: tasksTable.id, name: tasksTable.name }).from(tasksTable).where(inArray(tasksTable.id, taskIds))
        : [];
      return {
        entries: rows.map(r => ({
          id: r.id,
          date: r.date,
          hours: Number(r.hours),
          projectId: r.projectId,
          projectName: r.projectId ? projects.find(p => p.id === r.projectId)?.name ?? null : null,
          taskId: r.taskId,
          taskName: r.taskId ? tasks.find(t => t.id === r.taskId)?.name ?? null : null,
          description: r.description,
          billable: r.billable,
          approved: r.approved,
        })),
      };
    }

    case "get_time_summary": {
      const period = (args.period as "week" | "month" | undefined) ?? "week";
      const range = period === "month" ? monthRange() : weekRange((args.weekOffset as number | undefined) ?? 0);
      const rows = await db
        .select()
        .from(timeEntriesTable)
        .where(
          and(
            eq(timeEntriesTable.userId, ctx.userId),
            gte(timeEntriesTable.date, range.from),
            lte(timeEntriesTable.date, range.to),
          ),
        );
      const total = rows.reduce((s, r) => s + Number(r.hours), 0);
      const byProjectMap = new Map<number, number>();
      for (const r of rows) {
        if (r.projectId) byProjectMap.set(r.projectId, (byProjectMap.get(r.projectId) ?? 0) + Number(r.hours));
      }
      const projects = byProjectMap.size
        ? await db
            .select({ id: projectsTable.id, name: projectsTable.name })
            .from(projectsTable)
            .where(inArray(projectsTable.id, [...byProjectMap.keys()]))
        : [];
      const daysCovered = new Set(rows.map(r => r.date));
      const missingWeekdays: string[] = [];
      const start = new Date(range.from + "T00:00:00Z");
      const end = new Date(range.to + "T00:00:00Z");
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
      const expectedHours = period === "week" ? weeklyCapacity : weeklyCapacity * 4;
      return {
        period,
        from: range.from,
        to: range.to,
        totalHours: Math.round(total * 100) / 100,
        weeklyCapacity,
        expectedHours,
        capacityVsLoggedDelta: Math.round((expectedHours - total) * 100) / 100,
        byProject: [...byProjectMap.entries()].map(([id, hours]) => ({
          projectId: id,
          projectName: projects.find(p => p.id === id)?.name ?? "Unknown",
          hours: Math.round(hours * 100) / 100,
        })),
        weekdaysWithNoEntries: missingWeekdays,
      };
    }

    case "get_pending_tasks": {
      const projectId = args.projectId as number | undefined;
      const completed = new Set(["Completed", "Done", "Cancelled"]);
      const rows = projectId
        ? await db.select().from(tasksTable).where(eq(tasksTable.projectId, projectId))
        : await db.select().from(tasksTable);
      const childParentIds = new Set(
        rows.filter(t => t.parentTaskId !== null).map(t => t.parentTaskId as number),
      );
      const projectIds = Array.from(new Set(rows.map(r => r.projectId).filter(Boolean) as number[]));
      const projects = projectIds.length
        ? await db
            .select({ id: projectsTable.id, name: projectsTable.name })
            .from(projectsTable)
            .where(inArray(projectsTable.id, projectIds))
        : [];
      const mine = rows.filter(
        t => (t.assigneeIds ?? []).includes(ctx.userId) && !completed.has(t.status ?? ""),
      );
      return {
        tasks: mine.map(t => ({
          id: t.id,
          name: t.name,
          status: t.status,
          dueDate: t.dueDate,
          projectId: t.projectId,
          projectName: t.projectId ? projects.find(p => p.id === t.projectId)?.name ?? null : null,
          isParent: childParentIds.has(t.id) || t.isPhase === true,
        })),
      };
    }

    case "find_project_by_name": {
      const projects = await getMyProjects(ctx.userId);
      const ranked = projects
        .map(p => ({ project: p, score: fuzzyScore(args.query as string, p.name) }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      return {
        candidates: ranked.map(r => ({
          id: r.project.id,
          name: r.project.name,
          status: r.project.status,
          score: Math.round(r.score * 100) / 100,
        })),
      };
    }

    case "find_task_by_name": {
      const projectId = args.projectId as number | undefined;
      const all = projectId
        ? await db.select().from(tasksTable).where(eq(tasksTable.projectId, projectId))
        : await db.select().from(tasksTable);
      const childParentIds = new Set(
        all.filter(t => t.parentTaskId !== null).map(t => t.parentTaskId as number),
      );
      const ranked = all
        .map(t => ({ task: t, score: fuzzyScore(args.query as string, t.name) }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      return {
        candidates: ranked.map(r => ({
          id: r.task.id,
          projectId: r.task.projectId,
          name: r.task.name,
          status: r.task.status,
          isParent: childParentIds.has(r.task.id) || r.task.isPhase === true,
          assignedToMe: (r.task.assigneeIds ?? []).includes(ctx.userId),
          score: Math.round(r.score * 100) / 100,
        })),
      };
    }

    case "log_time_entries": {
      // Special tool — short-circuits the loop. We compute allocation
      // warnings server-side so the model can't fabricate them.
      const entries = (args.entries as Array<Record<string, any>>) ?? [];
      const summary = String(args.summary ?? "Log time");
      const warnings: string[] = [];
      // Daily-overrun warning: existing logged hours + new hours > capacity/5
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, ctx.userId));
      const dailyCap = (user?.capacity ?? 40) / 5;
      const dates = Array.from(new Set(entries.map(e => String(e.date))));
      if (dates.length > 0) {
        const existing = await db
          .select()
          .from(timeEntriesTable)
          .where(
            and(eq(timeEntriesTable.userId, ctx.userId), inArray(timeEntriesTable.date, dates)),
          );
        const existingByDate = new Map<string, number>();
        for (const r of existing) {
          existingByDate.set(r.date, (existingByDate.get(r.date) ?? 0) + Number(r.hours));
        }
        const newByDate = new Map<string, number>();
        for (const e of entries) {
          newByDate.set(String(e.date), (newByDate.get(String(e.date)) ?? 0) + Number(e.hours));
        }
        for (const d of dates) {
          const total = (existingByDate.get(d) ?? 0) + (newByDate.get(d) ?? 0);
          if (total > dailyCap + 0.001) {
            warnings.push(
              `${d}: ${total}h would exceed your daily capacity of ${dailyCap}h (${(existingByDate.get(d) ?? 0)}h already logged).`,
            );
          }
        }
      }
      // Allocation overrun across project + cumulative
      const byProject = new Map<number, number>();
      for (const e of entries) {
        if (e.projectId) byProject.set(Number(e.projectId), (byProject.get(Number(e.projectId)) ?? 0) + Number(e.hours));
      }
      if (byProject.size > 0) {
        const projectIds = [...byProject.keys()];
        const allocs = await db
          .select()
          .from(allocationsTable)
          .where(
            and(eq(allocationsTable.userId, ctx.userId), inArray(allocationsTable.projectId, projectIds)),
          );
        const existingProj = await db
          .select()
          .from(timeEntriesTable)
          .where(
            and(eq(timeEntriesTable.userId, ctx.userId), inArray(timeEntriesTable.projectId, projectIds)),
          );
        const allocByProject = new Map<number, number>();
        for (const a of allocs) {
          if (a.startDate && a.endDate) {
            const days = Math.round((new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / 86400000) + 1;
            const weeks = days / 7;
            allocByProject.set(
              a.projectId,
              (allocByProject.get(a.projectId) ?? 0) + Number(a.hoursPerWeek ?? 0) * weeks,
            );
          }
        }
        const loggedByProject = new Map<number, number>();
        for (const r of existingProj) {
          if (r.projectId)
            loggedByProject.set(r.projectId, (loggedByProject.get(r.projectId) ?? 0) + Number(r.hours));
        }
        for (const [pid, newH] of byProject) {
          const alloc = allocByProject.get(pid);
          const logged = loggedByProject.get(pid) ?? 0;
          if (alloc !== undefined && alloc > 0 && logged + newH > alloc + 0.001) {
            const [proj] = await db.select({ name: projectsTable.name }).from(projectsTable).where(eq(projectsTable.id, pid));
            warnings.push(
              `${proj?.name ?? `Project ${pid}`}: ${Math.round((logged + newH) * 10) / 10}h would exceed your allocation of ${Math.round(alloc)}h.`,
            );
          }
        }
      }
      return {
        __proposal: true,
        summary,
        entries,
        warnings,
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

export interface ToolCallSummary {
  name: string;
  ok: boolean;
  error?: string;
}

export interface AssistantResponse {
  reply: string;
  proposal?: { summary: string; entries: ProposedEntry[]; warnings?: string[] };
  toolCalls?: ToolCallSummary[];
  provider?: string;
  error?: string;
}

function buildSystemPrompt(userName: string, userRole: string): string {
  const today = todayISO();
  const dow = new Date(today + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  return [
    "You are a friendly, concise time-tracking assistant inside a PSA (Professional Services Automation) tool.",
    `The user you are helping is ${userName} (role: ${userRole}). Their user_id is implicit on every API call — never ask for it and never accept it from the user.`,
    `Today is ${today} (${dow}). Resolve relative dates ('yesterday', 'last Monday', 'this week') against that date in UTC and convert to YYYY-MM-DD.`,
    "",
    "Your purpose: help the user log time entries quickly, answer questions about their time, surface pending work, and warn before over-booking.",
    "",
    "Workflow:",
    "1. Read the user's request. If they reference a project or task by name, call `find_project_by_name` / `find_task_by_name` to resolve IDs (NEVER guess IDs).",
    "2. If anything required for logging is unclear (project ambiguous, hours missing, date vague, description missing) ASK A SHORT FOLLOW-UP QUESTION. Do not invent details.",
    "3. When everything is resolved, call `log_time_entries` with the full list. The user will then see a confirmation card and decide.",
    "4. If the user declines or wants to adjust, respond conversationally and re-propose in the next turn.",
    "5. For 'what's left to log' questions, call `get_time_summary` (use period='week' for 'this week') and call `get_pending_tasks` for follow-on work.",
    "",
    "Rules:",
    "- ONLY operate on the current user's data. Never propose entries for someone else.",
    "- Time can ONLY be logged on LEAF tasks (isParent=false). If the user names a parent/phase task, ask which sub-task.",
    "- Hours per entry must be > 0 and ≤ 24. The system will warn you (in `warnings` on the proposal response) if a day exceeds the user's daily capacity or a project exceeds allocation — surface those warnings to the user before they confirm.",
    "- For 'log time for last 3 weekdays on X', create one entry per weekday in that range.",
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
  const toolCallsExecuted: ToolCallSummary[] = [];

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
      const name = call.function.name as ToolName;
      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = JSON.parse(call.function.arguments || "{}");
      } catch {
        parsedArgs = {};
      }

      // Defensive Zod validation of LLM-supplied tool arguments.
      const schema = TOOL_ARG_SCHEMAS[name];
      let toolResult: unknown;
      let okFlag = true;
      let errFlag: string | undefined;
      if (!schema) {
        toolResult = { error: `Unknown tool ${name}` };
        okFlag = false;
        errFlag = "unknown_tool";
      } else {
        const validated = schema.safeParse(parsedArgs);
        if (!validated.success) {
          toolResult = {
            error: "Invalid tool arguments",
            issues: validated.error.issues.map(i => ({
              path: i.path.join("."),
              message: i.message,
            })),
          };
          okFlag = false;
          errFlag = "invalid_args";
        } else {
          try {
            toolResult = await execTool(name, validated.data as Record<string, unknown>, ctx);
          } catch (err: any) {
            toolResult = { error: String(err?.message ?? err) };
            okFlag = false;
            errFlag = "exec_failed";
          }
        }
      }

      toolCallsExecuted.push({ name, ok: okFlag, error: errFlag });
      session.messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(toolResult),
      } as ChatMessage);
      if (
        name === "log_time_entries" &&
        okFlag &&
        toolResult &&
        typeof toolResult === "object" &&
        (toolResult as any).__proposal
      ) {
        const r = toolResult as any;
        proposal = { summary: String(r.summary ?? ""), entries: r.entries ?? [], warnings: r.warnings ?? [] };
      }
    }

    if (proposal) {
      const reply = proposal.summary || "Here is what I'd like to log. Please review and confirm.";
      return {
        reply,
        proposal,
        toolCalls: toolCallsExecuted,
        provider: llm.provider,
      };
    }
  }

  return {
    reply: "I had to stop after several tool calls. Could you rephrase or simplify?",
    toolCalls: toolCallsExecuted,
    provider: llm.provider,
  };
}

// ─── Welcome message (proactive 2+ day catch-up reminder) ───────────────────

export interface WelcomePayload {
  greeting: string;
  daysSinceLastLog: number | null;
  catchUpReminder?: string;
  suggestionChips: string[];
  configured: boolean;
}

export async function buildWelcome(userId: number, userName: string): Promise<WelcomePayload> {
  const configured = isLLMConfigured();
  const firstName = userName.split(" ")[0];
  // Find the most recent entry's date for this user.
  const recent = await db
    .select({ date: timeEntriesTable.date })
    .from(timeEntriesTable)
    .where(eq(timeEntriesTable.userId, userId));
  let daysSinceLastLog: number | null = null;
  if (recent.length > 0) {
    const latestDate = recent.reduce((max, r) => (r.date > max ? r.date : max), recent[0].date);
    const today = new Date(todayISO() + "T00:00:00Z");
    const last = new Date(latestDate + "T00:00:00Z");
    daysSinceLastLog = Math.max(0, Math.round((today.getTime() - last.getTime()) / 86400000));
  }
  const greetingLines = [`Hi ${firstName} — I can help you log time fast.`];
  let catchUpReminder: string | undefined;
  if (daysSinceLastLog !== null && daysSinceLastLog >= 2) {
    catchUpReminder = `It's been ${daysSinceLastLog} day${daysSinceLastLog === 1 ? "" : "s"} since your last logged entry. Want to catch up on what you worked on?`;
    greetingLines.push(catchUpReminder);
  }
  greetingLines.push("Try things like:");
  return {
    greeting: greetingLines.join("\n"),
    daysSinceLastLog,
    catchUpReminder,
    configured,
    suggestionChips: [
      "Log 2h on … today",
      "What's my week look like?",
      "Show my pending tasks",
    ],
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
      // Default billable: true when associated with a project (existing
      // route's governance downgrades to false for non-project entries).
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
