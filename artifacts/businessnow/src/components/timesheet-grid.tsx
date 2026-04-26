import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { authHeaders } from "@/lib/auth-headers";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import {
  useListTimeEntries,
  useCreateTimeEntry,
  useUpdateTimeEntry,
  useDeleteTimeEntry,
  useListTimesheets,
  useUpdateTimesheet,
  useSubmitTimesheet,
  useApproveTimesheet,
  useRejectTimesheet,
  useListProjects,
  useListTasks,
  useListUsers,
  useListTimeCategories,
  useListTimeOffRequests,
  useListHolidayCalendars,
  getListTimeEntriesQueryKey,
  getGetTimeEntrySummaryQueryKey,
  getListTimesheetsQueryKey,
  getListTasksQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, ChevronDown, AlertCircle, Plus, Undo2, Clock, X, Lock, Umbrella, Star, TrendingUp, AlertTriangle, CheckCircle2, Zap, Bell, FolderOpen } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TreeToggle } from "@/components/task-tree";
import { format, addDays, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimesheetRow {
  rowDbId?: number;       // id in timesheet_rows table (if persisted)
  key: string;
  projectId?: number | null;
  taskId?: number | null;
  activityName?: string;
  description?: string;
  billable: boolean;
  categoryId?: number | null;
  isNonProject: boolean;
  days: Record<string, number>;
  entryIds: Record<string, number[]>;
}

type EditingCell = { rowKey: string; dayStr: string };

// ─── Schemas ──────────────────────────────────────────────────────────────────

const logTimeSchema = z.object({
  projectId: z.coerce.number().optional(),
  taskId: z.coerce.number().optional(),
  categoryId: z.coerce.number().optional(),
  date: z.string().min(1, "Date is required"),
  hours: z.coerce.number().min(0.1, "Hours must be greater than 0"),
  description: z.string().optional(),
  billable: z.boolean(),
  activityName: z.string().optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowKey(projectId?: number | null, taskId?: number | null, activityName?: string, description?: string) {
  return `${projectId ?? "np"}-${taskId ?? "none"}-${activityName ?? ""}-${description ?? ""}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TimesheetGrid({ userId, weekStartDay = 1 }: { userId: number; weekStartDay?: number }) {
  const wsd = (weekStartDay as 0 | 1);

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: wsd }));
  const [initialised, setInitialised] = useState(false);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Log time dialog
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [logDialogPrefill, setLogDialogPrefill] = useState<Partial<z.infer<typeof logTimeSchema>>>({});

  // Add Activity dialog
  const [addActivityOpen, setAddActivityOpen] = useState(false);
  const [activityMode, setActivityMode] = useState<"project" | "nonproject">("project");
  const [activityForm, setActivityForm] = useState({
    projectId: "", taskId: "", activityName: "", categoryId: "", billable: true,
  });

  // Reject dialog
  const [rejectTimesheetId, setRejectTimesheetId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  // Guardrail confirmation dialog (for 409 soft-block responses)
  const [guardrailConfirm, setGuardrailConfirm] = useState<{
    row: TimesheetRow;
    dayStr: string;
    newHours: number;
    warning: string;
    code: string;
  } | null>(null);

  const weekStartsOnChanged = wsd;
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: wsd });
  const weekStartStr = format(currentWeekStart, "yyyy-MM-dd");
  const weekEndStr = format(currentWeekEnd, "yyyy-MM-dd");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ─── Data queries ────────────────────────────────────────────────────────────

  const { data: allUserTimesheets } = useListTimesheets({ userId }, { query: { queryKey: getListTimesheetsQueryKey({ userId }) } });
  const { data: allUserEntries } = useListTimeEntries({ userId }, { query: { queryKey: getListTimeEntriesQueryKey({ userId }) } });
  const { data: weekTimesheets } = useListTimesheets({ userId, weekStart: weekStartStr }, { query: { queryKey: getListTimesheetsQueryKey({ userId, weekStart: weekStartStr }) } });
  const timesheet = weekTimesheets?.[0];
  const isLocked = timesheet?.status === "Submitted" || timesheet?.status === "Approved";

  const { data: timeEntries } = useListTimeEntries({ userId, startDate: weekStartStr, endDate: weekEndStr }, {
    query: { queryKey: getListTimeEntriesQueryKey({ userId, startDate: weekStartStr, endDate: weekEndStr }) }
  });

  const { data: projects } = useListProjects();
  const { data: allTasks } = useListTasks({});
  const { data: users } = useListUsers();
  const { data: timeCategories } = useListTimeCategories();

  // Persistent rows
  const ROWS_QK = ["timesheet-rows", userId];
  const { data: persistentRows } = useQuery({
    queryKey: ROWS_QK,
    queryFn: async () => {
      const r = await fetch(`/api/timesheet-rows?userId=${userId}`, { headers: authHeaders() });
      return r.json() as Promise<any[]>;
    },
  });

  // Time settings (for min-hours warning)
  const { data: timeSettings } = useQuery({
    queryKey: ["time-settings"],
    queryFn: async () => { const r = await fetch("/api/time-settings", { headers: authHeaders() }); return r.json(); },
  });

  // Guardrail context: allocation vs actuals per project for this week
  const { data: guardrailCtx } = useQuery({
    queryKey: ["guardrail-context", userId, weekStartStr],
    queryFn: async () => {
      const r = await fetch(`/api/time-entries/guardrail-context?userId=${userId}&weekStart=${weekStartStr}`, { headers: authHeaders() });
      return r.json() as Promise<{
        allocations: { projectId: number; allocatedPerWeek: number; allocatedTotal: number; weekLoggedHours: number; totalLoggedHours: number; remainingTotal: number | null; weekOverrun: boolean; budgetPct: number | null; allocationEndDate: string; isExpired: boolean }[];
        dailyCapacity: number;
        weeklyCapacity: number;
        dailyTotals: Record<string, number>;
      }>;
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  // Time-off and holiday indicators
  const { data: userTimeOffs } = useListTimeOffRequests({ userId, status: "Approved" as any });
  const { data: holidayCalendars } = useListHolidayCalendars();
  const currentUser = users?.find((u: any) => u.id === userId);
  const userHolidayDates = (() => {
    if (!currentUser || !(currentUser as any).holidayCalendarId) return new Set<string>();
    const cal = holidayCalendars?.find((c: any) => c.id === (currentUser as any).holidayCalendarId);
    return new Set<string>((cal as any)?.holidays?.map((h: any) => h.date) ?? []);
  })();
  const userTimeOffDates = (() => {
    const result: Record<string, string> = {};
    for (const to of userTimeOffs ?? []) {
      const cur = new Date((to as any).startDate + "T00:00:00Z");
      const fin = new Date((to as any).endDate + "T00:00:00Z");
      while (cur <= fin) {
        result[cur.toISOString().slice(0, 10)] = (to as any).durationType ?? "Full Day";
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    }
    return result;
  })();

  // Mutations
  const createTimeEntry = useCreateTimeEntry();
  const updateTimeEntry = useUpdateTimeEntry();
  const deleteTimeEntry = useDeleteTimeEntry();
  const updateTimesheet = useUpdateTimesheet();
  const submitTimesheet = useSubmitTimesheet();
  const approveTimesheet = useApproveTimesheet();
  const rejectTimesheetMutation = useRejectTimesheet();
  const submittedTimesheets = useListTimesheets({ status: "Submitted" }).data;
  const approvedTimesheets = useListTimesheets({ status: "Approved" }).data;

  // Pending-prior-week guard intentionally removed: users may log time on any
  // date regardless of whether earlier weeks are unsubmitted or awaiting approval.

  const deleteRowMutation = useMutation({
    mutationFn: async (rowId: number) => { await fetch(`/api/timesheet-rows/${rowId}`, { method: "DELETE", headers: authHeaders() }); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROWS_QK }),
  });

  const addRowMutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch("/api/timesheet-rows", { method: "POST", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROWS_QK }),
  });

  // ─── Initialise to latest week ──────────────────────────────────────────────

  useEffect(() => {
    if (initialised) return;
    let latestDate: string | null = null;
    if (allUserTimesheets && allUserTimesheets.length > 0) {
      const sorted = [...allUserTimesheets].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
      latestDate = sorted[0].weekStart;
    } else if (allUserEntries && allUserEntries.length > 0) {
      const sorted = [...allUserEntries].sort((a, b) => b.date.localeCompare(a.date));
      latestDate = sorted[0].date;
    }
    if (!latestDate) return;
    setCurrentWeekStart(startOfWeek(parseISO(latestDate), { weekStartsOn: wsd }));
    setInitialised(true);
  }, [allUserTimesheets, allUserEntries, initialised, wsd]);

  // ─── Week columns ────────────────────────────────────────────────────────────

  const weekDays = Array.from({ length: 5 }).map((_, i) => {
    // Always 5 working days starting from weekStart (Mon or Sun)
    // If weekStartsOn 0 (Sun), days are Sun-Thu — but convention is work week Mon-Fri
    // Use weekStart + offset to get Mon-Fri regardless of wsd
    const base = wsd === 0 ? addDays(currentWeekStart, 1) : currentWeekStart;
    return addDays(base, i);
  });
  // Also include Sat for a 7-day view (most timesheets are 7 days)
  const allWeekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

  // ─── Build rows ──────────────────────────────────────────────────────────────

  // Entry-derived rows from this week's time entries
  const entryRowMap: Record<string, TimesheetRow> = {};
  for (const entry of (timeEntries || [])) {
    const k = rowKey(entry.projectId, entry.taskId, entry.activityName ?? undefined, entry.description);
    if (!entryRowMap[k]) {
      entryRowMap[k] = {
        key: k,
        projectId: entry.projectId ?? null,
        taskId: entry.taskId ?? null,
        activityName: entry.activityName ?? undefined,
        description: entry.description ?? undefined,
        billable: entry.billable,
        categoryId: entry.categoryId ?? null,
        isNonProject: !entry.projectId,
        days: {},
        entryIds: {},
      };
    }
    const dayStr = format(parseISO(entry.date), "yyyy-MM-dd");
    entryRowMap[k].days[dayStr] = (entryRowMap[k].days[dayStr] || 0) + entry.hours;
    if (!entryRowMap[k].entryIds[dayStr]) entryRowMap[k].entryIds[dayStr] = [];
    entryRowMap[k].entryIds[dayStr].push(entry.id);
  }

  // Persistent rows (always visible across weeks)
  const persistedRowMap: Record<string, TimesheetRow> = {};
  for (const pr of (persistentRows || [])) {
    const k = rowKey(pr.projectId, pr.taskId, pr.activityName, undefined);
    persistedRowMap[k] = {
      rowDbId: pr.id,
      key: k,
      projectId: pr.projectId ?? null,
      taskId: pr.taskId ?? null,
      activityName: pr.activityName ?? undefined,
      billable: pr.billable,
      categoryId: pr.categoryId ?? null,
      isNonProject: pr.isNonProject,
      days: entryRowMap[k]?.days ?? {},
      entryIds: entryRowMap[k]?.entryIds ?? {},
    };
  }

  // Merge: persistent rows first, then entry-only rows (ad-hoc entries not in persistent rows)
  const rows: TimesheetRow[] = [];
  const seenKeys = new Set<string>();
  for (const pr of Object.values(persistedRowMap)) { rows.push(pr); seenKeys.add(pr.key); }
  for (const er of Object.values(entryRowMap)) { if (!seenKeys.has(er.key)) rows.push(er); }

  // ─── Lookup helpers (declared before any hierarchy build that needs them) ──
  // Defined as `const` arrow fns; must precede `displayRows` useMemo below
  // because closure capture happens at first render before later declarations.
  const getProjectName = (id?: number | null) => projects?.find(p => p.id === id)?.name;
  const getTaskName = (id?: number | null) => allTasks?.find(t => t.id === id)?.name;
  const getCategoryName = (id?: number | null) => timeCategories?.find(c => c.id === id)?.name;
  // A task that has children (or is itself a phase) should accumulate its
  // time from its leaves, not be logged against directly. Used to disable
  // hour cells / log buttons on summary rows (H1 from product feedback).
  const taskHasChildren = (taskId?: number | null) =>
    taskId != null && (allTasks?.some(t => t.parentTaskId === taskId) ?? false);
  const isParentTaskRow = (row: { taskId?: number | null; isNonProject?: boolean }) =>
    !row.isNonProject && taskHasChildren(row.taskId);

  // ─── Hierarchical view (Project → Phase → Task → Subtask) ────────────────────
  // The flat `rows` list is reorganised into a tree view: each project becomes
  // a collapsible header; underneath, leaf rows are nested under synthesised
  // task summary nodes that follow the parentTaskId chain in `allTasks`.
  // Hour cells stay editable on leaf rows only; summary/project rows show
  // aggregated daily totals (read-only) so users can scan timesheets at a
  // higher level. Default state: everything expanded so leaves are visible.

  // Collapsed-state Sets (presence == collapsed). Defaulting to "absent ==
  // expanded" means new tasks/projects appear opened automatically.
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [collapsedTasks, setCollapsedTasks] = useState<Set<number>>(new Set());
  const toggleProject = useCallback((key: string) => {
    setCollapsedProjects(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);
  const toggleTaskSummary = useCallback((id: number) => {
    setCollapsedTasks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  type LeafEntry = { row: TimesheetRow; chain: number[] };
  type DisplayEntry =
    | { kind: "project"; projectKey: string; projectName: string; isNonProject: boolean; dailyTotals: Record<string, number>; total: number; leafCount: number; collapsed: boolean }
    | { kind: "task"; taskId: number; taskName: string; isPhase: boolean; depth: number; dailyTotals: Record<string, number>; total: number; descendantLeafCount: number; collapsed: boolean }
    | { kind: "leaf"; row: TimesheetRow; depth: number };

  const displayRows: DisplayEntry[] = useMemo(() => {
    const out: DisplayEntry[] = [];
    const tasks = (allTasks ?? []) as any[];
    const taskById = new Map<number, any>();
    for (const t of tasks) taskById.set(t.id, t);

    // 1) Group rows by project (or "non-project" bucket).
    const groups = new Map<string, TimesheetRow[]>();
    for (const r of rows) {
      const key = r.isNonProject || r.projectId == null ? "__nonproject__" : `p${r.projectId}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }

    // Stable project ordering: by project name (non-project bucket last).
    const sortedKeys = [...groups.keys()].sort((a, b) => {
      if (a === "__nonproject__") return 1;
      if (b === "__nonproject__") return -1;
      const an = getProjectName(parseInt(a.slice(1), 10)) ?? "";
      const bn = getProjectName(parseInt(b.slice(1), 10)) ?? "";
      return an.localeCompare(bn);
    });

    // 2) Helpers
    const sumDays = (entries: { days: Record<string, number> }[]) => {
      const totals: Record<string, number> = {};
      for (const e of entries) {
        for (const [d, h] of Object.entries(e.days)) {
          totals[d] = (totals[d] ?? 0) + h;
        }
      }
      return totals;
    };
    const sumTotal = (totals: Record<string, number>) =>
      Object.values(totals).reduce((s, v) => s + v, 0);

    // 3) For each project group, build the task hierarchy and walk it.
    for (const projectKey of sortedKeys) {
      const projectRows = groups.get(projectKey)!;
      const isNonProject = projectKey === "__nonproject__";
      const projectName = isNonProject
        ? "Non-project Activities"
        : (getProjectName(parseInt(projectKey.slice(1), 10)) ?? "Unknown project");

      // Build ancestor chains (root → ... → leaf task) for each leaf row.
      const leaves: LeafEntry[] = projectRows.map(row => {
        if (row.taskId == null || isNonProject) return { row, chain: [] };
        const chain: number[] = [];
        let cur = taskById.get(row.taskId);
        const guard = new Set<number>(); // guard against accidental cycles
        while (cur && !guard.has(cur.id)) {
          guard.add(cur.id);
          chain.unshift(cur.id);
          cur = cur.parentTaskId != null ? taskById.get(cur.parentTaskId) : null;
        }
        return { row, chain };
      });

      // Project header totals (aggregate every leaf in the group).
      const projectDaily = sumDays(projectRows);
      const projectTotal = sumTotal(projectDaily);
      const projectCollapsed = collapsedProjects.has(projectKey);

      out.push({
        kind: "project",
        projectKey,
        projectName,
        isNonProject,
        dailyTotals: projectDaily,
        total: projectTotal,
        leafCount: projectRows.length,
        collapsed: projectCollapsed,
      });

      if (projectCollapsed) continue;

      // Recurse: at each level, partition leaves by chain[depth].
      const walk = (subset: LeafEntry[], depth: number) => {
        // Group by chain[depth]; "self" leaves (chain.length === depth) render as leaves at this depth.
        const groupsAtDepth = new Map<number, LeafEntry[]>();
        const selfLeaves: LeafEntry[] = [];
        for (const l of subset) {
          if (l.chain.length <= depth) {
            selfLeaves.push(l);
          } else {
            const k = l.chain[depth];
            if (!groupsAtDepth.has(k)) groupsAtDepth.set(k, []);
            groupsAtDepth.get(k)!.push(l);
          }
        }

        // Sort task groups by task name for stability.
        const orderedGroupKeys = [...groupsAtDepth.keys()].sort((a, b) => {
          const an = taskById.get(a)?.name ?? "";
          const bn = taskById.get(b)?.name ?? "";
          return an.localeCompare(bn);
        });

        for (const taskId of orderedGroupKeys) {
          const groupLeaves = groupsAtDepth.get(taskId)!;
          const task = taskById.get(taskId);
          // All direct leaves whose chain ends at this task (the row IS this
          // task). There can be many — same task, multiple activities or
          // descriptions — and they must all be rendered, not just the first.
          const directLeaves = groupLeaves.filter(
            l => l.chain.length === depth + 1 && l.chain[depth] === taskId,
          );
          const deeper = groupLeaves.filter(
            l => !(l.chain.length === depth + 1 && l.chain[depth] === taskId),
          );

          if (deeper.length === 0) {
            // No nested children — render all direct leaves at this depth.
            // (When there is exactly one and no deeper rows, this collapses to
            // the simple flat case the user sees today.)
            for (const dl of directLeaves) {
              out.push({ kind: "leaf", row: dl.row, depth });
            }
          } else {
            // Synthesise a task summary header that groups the direct leaves
            // (if any) plus all deeper rows. The summary's daily totals
            // include both buckets so the parent reflects everything beneath.
            const allInGroup = groupLeaves.map(l => l.row);
            const taskDaily = sumDays(allInGroup);
            const taskTotal = sumTotal(taskDaily);
            const collapsed = collapsedTasks.has(taskId);
            out.push({
              kind: "task",
              taskId,
              taskName: task?.name ?? `Task #${taskId}`,
              isPhase: !!task?.isPhase,
              depth,
              dailyTotals: taskDaily,
              total: taskTotal,
              descendantLeafCount: groupLeaves.length,
              collapsed,
            });
            if (!collapsed) {
              // Render every direct leaf at depth+1 so they sit alongside their
              // sibling subtasks beneath the synthesised parent.
              for (const dl of directLeaves) {
                out.push({ kind: "leaf", row: dl.row, depth: depth + 1 });
              }
              walk(deeper, depth + 1);
            }
          }
        }

        // Orphan leaves (no taskId at all) at this depth, rendered last.
        for (const l of selfLeaves) {
          out.push({ kind: "leaf", row: l.row, depth });
        }
      };
      walk(leaves, 0);
    }
    return out;
  }, [rows, allTasks, collapsedProjects, collapsedTasks, projects]);

  // ─── Totals ──────────────────────────────────────────────────────────────────

  const dailyTotals = allWeekDays.map(day => {
    const dayStr = format(day, "yyyy-MM-dd");
    return rows.reduce((sum, row) => sum + (row.days[dayStr] || 0), 0);
  });
  const grandTotal = dailyTotals.reduce((s, v) => s + v, 0);

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  // (Lookup helpers `getProjectName` / `getTaskName` / `getCategoryName` are
  // declared above the displayRows builder; do not redeclare here.)

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTimeEntrySummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListTimesheetsQueryKey() });
  }, [queryClient]);

  // ─── Cell editing ─────────────────────────────────────────────────────────────

  async function handleCellSave(row: TimesheetRow, dayStr: string, rawValue: string, force = false) {
    const parsed = parseFloat(rawValue) || 0;
    const newHours = Math.min(24, Math.max(0, parsed));
    const currentHours = row.days[dayStr] || 0;
    const existingIds: number[] = row.entryIds[dayStr] || [];
    setEditingCell(null);
    if (newHours === currentHours) return;
    try {
      if (existingIds.length === 1) {
        if (newHours <= 0) {
          await deleteTimeEntry.mutateAsync({ id: existingIds[0] });
        } else {
          await updateTimeEntry.mutateAsync({ id: existingIds[0], data: { hours: newHours } as any });
        }
      } else if (existingIds.length === 0 && newHours > 0) {
        const payload: any = {
          userId,
          date: dayStr,
          hours: newHours,
          description: row.description ?? "",
          billable: row.isNonProject ? false : (row.billable ?? true),
          categoryId: row.categoryId ?? undefined,
          force,
        };
        if (row.projectId) payload.projectId = row.projectId;
        if (row.taskId) payload.taskId = row.taskId;
        if (row.activityName) payload.activityName = row.activityName;

        // Use raw fetch so we can handle 409 guardrail warnings
        const resp = await fetch("/api/time-entries", {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(payload),
        });

        if (resp.status === 409) {
          const body = await resp.json();
          setGuardrailConfirm({
            row,
            dayStr,
            newHours,
            warning: body.warning ?? "Guardrail check triggered. Do you want to proceed?",
            code: body.guardrailCode ?? "UNKNOWN",
          });
          return;
        }

        if (resp.status === 422) {
          const body = await resp.json();
          toast({ title: "Entry blocked", description: body.error, variant: "destructive" });
          return;
        }

        if (!resp.ok) {
          toast({ title: "Failed to save hours", variant: "destructive" });
          return;
        }
      }
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["guardrail-context", userId, weekStartStr] });
    } catch {
      toast({ title: "Failed to update hours", variant: "destructive" });
    }
  }

  async function handleGuardrailForce() {
    if (!guardrailConfirm) return;
    const { row, dayStr, newHours } = guardrailConfirm;
    setGuardrailConfirm(null);
    await handleCellSave(row, dayStr, String(newHours), true);
  }

  function startEdit(row: TimesheetRow, dayStr: string) {
    if (isLocked) return;
    const ids: number[] = row.entryIds[dayStr] || [];
    if (ids.length > 1) return;
    const hours = row.days[dayStr] || 0;
    setEditingCell({ rowKey: row.key, dayStr });
    setEditValue(hours > 0 ? String(hours) : "");
    setTimeout(() => editInputRef.current?.focus(), 0);
  }

  function handleCellTab(row: TimesheetRow, dayStr: string, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    handleCellSave(row, dayStr, editValue);
    // Find next cell: same row next day, or next row first day
    const dayIdx = allWeekDays.findIndex(d => format(d, "yyyy-MM-dd") === dayStr);
    const rowIdx = rows.findIndex(r => r.key === row.key);
    let nextRowIdx = rowIdx;
    let nextDayIdx = dayIdx + 1;
    if (nextDayIdx >= allWeekDays.length) { nextDayIdx = 0; nextRowIdx = rowIdx + 1; }
    if (nextRowIdx >= rows.length) { nextRowIdx = 0; }
    const nextRow = rows[nextRowIdx];
    const nextDay = format(allWeekDays[nextDayIdx], "yyyy-MM-dd");
    setTimeout(() => startEdit(nextRow, nextDay), 50);
  }

  // ─── Log Time form ───────────────────────────────────────────────────────────

  const logTimeForm = useForm<z.infer<typeof logTimeSchema>>({
    resolver: zodResolver(logTimeSchema),
    defaultValues: { date: format(new Date(), "yyyy-MM-dd"), hours: 0, billable: true },
  });

  const selectedProjectId = logTimeForm.watch("projectId");
  const { data: projectTasks } = useListTasks({ projectId: selectedProjectId }, {
    query: { enabled: !!selectedProjectId, queryKey: getListTasksQueryKey({ projectId: selectedProjectId }) }
  });

  function openLogForRow(row: TimesheetRow) {
    logTimeForm.reset({
      projectId: row.projectId ?? undefined,
      taskId: row.taskId ?? undefined,
      categoryId: row.categoryId ?? undefined,
      date: format(new Date(), "yyyy-MM-dd"),
      hours: 0,
      billable: row.isNonProject ? false : row.billable,
      description: "",
      activityName: row.activityName,
    });
    setLogDialogOpen(true);
  }

  async function onLogTime(values: z.infer<typeof logTimeSchema>) {
    try {
      const payload: any = {
        userId,
        date: values.date,
        hours: values.hours,
        description: values.description ?? "",
        billable: values.billable,
        categoryId: values.categoryId,
      };
      if (values.projectId) payload.projectId = values.projectId;
      if (values.taskId) payload.taskId = values.taskId;
      if (values.activityName) payload.activityName = values.activityName;
      await createTimeEntry.mutateAsync({ data: payload });
      invalidate();
      setLogDialogOpen(false);
      logTimeForm.reset();
      toast({ title: "Time logged" });
    } catch {
      toast({ title: "Error logging time", variant: "destructive" });
    }
  }

  // ─── Add Activity ────────────────────────────────────────────────────────────

  async function handleAddActivity() {
    const isNP = activityMode === "nonproject";
    const payload: any = { userId, isNonProject: isNP, billable: isNP ? false : activityForm.billable };
    if (!isNP && activityForm.projectId) payload.projectId = Number(activityForm.projectId);
    if (!isNP && activityForm.taskId) payload.taskId = Number(activityForm.taskId);
    if (isNP && activityForm.activityName) payload.activityName = activityForm.activityName;
    if (activityForm.categoryId) payload.categoryId = Number(activityForm.categoryId);
    if (isNP && !activityForm.activityName) { toast({ title: "Activity name is required", variant: "destructive" }); return; }
    if (!isNP && !activityForm.projectId) { toast({ title: "Project is required", variant: "destructive" }); return; }
    try {
      await addRowMutation.mutateAsync(payload);
      setAddActivityOpen(false);
      setActivityForm({ projectId: "", taskId: "", activityName: "", categoryId: "", billable: true });
      toast({ title: "Row added — it will appear every week" });
    } catch {
      toast({ title: "Failed to add row", variant: "destructive" });
    }
  }

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const minHours = timeSettings?.minSubmitHours ?? 0;
  const maxHours = timeSettings?.maxSubmitHours ?? null;
  const hoursShort = minHours > 0 ? Math.max(0, minHours - grandTotal) : 0;

  // Rule 6 — Unsubmitted reminder banner: check if today is past the due day for the current week
  const isSubmissionLate = useMemo(() => {
    if (!timeSettings) return false;
    if (timesheet?.status === "Submitted" || timesheet?.status === "Approved") return false;
    const dueDay = timeSettings.timesheetDueDay ?? "Monday";
    const dueDayMap: Record<string, number> = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
    const dueDow = dueDayMap[dueDay] ?? 1;
    const todayDow = new Date().getDay();
    const isCurrentWeek = weekStartStr === format(startOfWeek(new Date(), { weekStartsOn: wsd }), "yyyy-MM-dd");
    return isCurrentWeek && todayDow > dueDow && grandTotal > 0;
  }, [timeSettings, timesheet, weekStartStr, grandTotal, wsd]);

  // Helper: get allocation context for a project
  const getAllocContext = useCallback((projectId: number | null | undefined) => {
    if (!projectId || !guardrailCtx?.allocations) return null;
    return guardrailCtx.allocations.find((a) => a.projectId === projectId) ?? null;
  }, [guardrailCtx]);

  async function onSubmitTimesheet() {
    if (!timesheet?.id) return;
    try {
      await submitTimesheet.mutateAsync({ id: timesheet.id });
      invalidate();
      toast({ title: "Timesheet submitted for approval" });
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? e?.message ?? "Error submitting timesheet";
      toast({ title: msg, variant: "destructive" });
    }
  }

  async function onWithdrawTimesheet() {
    if (!timesheet?.id) return;
    try {
      await updateTimesheet.mutateAsync({ id: timesheet.id, data: { status: "Draft" } as any });
      invalidate();
      toast({ title: "Timesheet withdrawn — now in Draft" });
    } catch { toast({ title: "Error withdrawing timesheet", variant: "destructive" }); }
  }

  function serverErrorMessage(err: unknown): string | undefined {
    const data = (err as any)?.data;
    if (data && typeof data === "object" && typeof data.error === "string") return data.error;
    if (typeof data === "string" && data.trim()) return data;
    if (err instanceof Error && err.message) return err.message;
    return undefined;
  }

  const onApprove = async (id: number) => {
    try {
      await approveTimesheet.mutateAsync({ id, data: {} });
      queryClient.invalidateQueries({ queryKey: getListTimesheetsQueryKey() });
      toast({ title: "Timesheet approved" });
    } catch (err) {
      toast({ title: "Error approving", description: serverErrorMessage(err), variant: "destructive" });
    }
  };

  const onReject = async () => {
    if (!rejectTimesheetId) return;
    try {
      await rejectTimesheetMutation.mutateAsync({ id: rejectTimesheetId, data: { rejectionNote: rejectNote } });
      queryClient.invalidateQueries({ queryKey: getListTimesheetsQueryKey() });
      setRejectTimesheetId(null); setRejectNote("");
      toast({ title: "Timesheet rejected" });
    } catch (err) {
      toast({ title: "Error rejecting", description: serverErrorMessage(err), variant: "destructive" });
    }
  };

  const statusColors: Record<string, string> = {
    Draft: "bg-gray-100 text-gray-700 border-gray-200",
    Submitted: "bg-amber-100 text-amber-700 border-amber-200",
    Approved: "bg-green-100 text-green-700 border-green-200",
    Rejected: "bg-red-100 text-red-700 border-red-200",
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Week Nav & Status Bar */}
      <div className="flex items-center justify-between bg-muted/20 p-4 rounded-lg border">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium min-w-[210px] text-center">
            {format(currentWeekStart, "MMM d")} – {format(currentWeekEnd, "MMM d, yyyy")}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          {timesheet && (
            <>
              <div className="text-sm text-muted-foreground text-right">
                <span className="font-semibold text-foreground">{grandTotal}h</span> total &nbsp;·&nbsp;
                <span className="font-semibold text-indigo-600">{timesheet.billableHours}h</span> billable
                {minHours > 0 && timesheet.status === "Draft" && hoursShort > 0 && (
                  <span className="ml-2 text-amber-600 text-xs font-medium">({hoursShort}h below {minHours}h minimum)</span>
                )}
              </div>
              <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", statusColors[timesheet.status] ?? statusColors.Draft)}>
                {timesheet.status}
              </span>
              {timesheet.status === "Draft" && (
                <Button size="sm" onClick={onSubmitTimesheet} disabled={submitTimesheet.isPending || (minHours > 0 && hoursShort > 0)}>
                  Submit for Approval
                </Button>
              )}
              {timesheet.status === "Submitted" && (
                <Button size="sm" variant="outline" onClick={onWithdrawTimesheet} disabled={updateTimesheet.isPending}>
                  <Undo2 className="h-3.5 w-3.5 mr-1.5" /> Withdraw
                </Button>
              )}
              {timesheet.status === "Draft" && timesheet.rejectionNote && (
                <div className="text-xs text-red-500 flex items-center gap-1 max-w-[200px]">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span className="truncate">{timesheet.rejectionNote}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Rule 6 — Submission Reminder Banner */}
      {isSubmissionLate && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 text-sm">
          <Bell className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-medium text-amber-800 dark:text-amber-300">Timesheet due: </span>
            <span className="text-amber-700 dark:text-amber-400">
              Your timesheet for this week is past the {timeSettings?.timesheetDueDay} deadline and hasn't been submitted yet.
            </span>
          </div>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shrink-0" onClick={onSubmitTimesheet} disabled={submitTimesheet.isPending || (minHours > 0 && hoursShort > 0)}>
            Submit now
          </Button>
        </div>
      )}

      {/* Grid */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[240px] min-w-[240px]">Project / Task / Activity</TableHead>
                {allWeekDays.map(day => {
                  const dayStr = format(day, "yyyy-MM-dd");
                  const isHoliday = userHolidayDates.has(dayStr);
                  const timeOffType = userTimeOffDates[dayStr];
                  return (
                    <TableHead key={day.toISOString()} className={cn("text-center min-w-[60px] w-[60px] p-2", isHoliday ? "bg-amber-50 dark:bg-amber-950/20" : timeOffType ? "bg-blue-50 dark:bg-blue-950/20" : "")}>
                      <div className="text-[11px] font-normal text-muted-foreground">{format(day, "EEE")}</div>
                      <div className="font-semibold">{format(day, "d")}</div>
                      {isHoliday && (
                        <div title="Holiday" className="flex justify-center mt-0.5">
                          <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                        </div>
                      )}
                      {!isHoliday && timeOffType && (
                        <div title={`Time Off: ${timeOffType}`} className="flex justify-center mt-0.5">
                          <Umbrella className="h-2.5 w-2.5 text-blue-500" />
                        </div>
                      )}
                    </TableHead>
                  );
                })}
                <TableHead className="text-right min-w-[56px]">Total</TableHead>
                <TableHead className="w-[32px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-10">
                    No rows yet. Click "Add Activity" to add a task or non-project activity.
                  </TableCell>
                </TableRow>
              ) : (
                displayRows.map((entry, idx) => {
                  // ── Project header row ──────────────────────────────────────
                  if (entry.kind === "project") {
                    return (
                      <TableRow key={`proj-${entry.projectKey}`} className="bg-muted/40 hover:bg-muted/50 border-t-2 border-b">
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1.5">
                            <TreeToggle
                              expanded={!entry.collapsed}
                              hasChildren={entry.leafCount > 0}
                              onToggle={() => toggleProject(entry.projectKey)}
                              label={entry.projectName}
                              size="sm"
                            />
                            <FolderOpen className={cn("h-3.5 w-3.5 shrink-0", entry.isNonProject ? "text-slate-400" : "text-indigo-500")} />
                            <span className="font-semibold text-sm truncate" title={entry.projectName}>{entry.projectName}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              ({entry.leafCount} {entry.leafCount === 1 ? "row" : "rows"})
                            </span>
                          </div>
                        </TableCell>
                        {allWeekDays.map(day => {
                          const dayStr = format(day, "yyyy-MM-dd");
                          const v = entry.dailyTotals[dayStr] ?? 0;
                          return (
                            <TableCell key={dayStr} className="text-center text-xs font-semibold tabular-nums text-muted-foreground">
                              {v > 0 ? v : <span className="text-muted-foreground/30">·</span>}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right font-bold text-sm">{entry.total > 0 ? entry.total : "—"}</TableCell>
                        <TableCell />
                      </TableRow>
                    );
                  }

                  // ── Task summary row (synthesised parent) ──────────────────
                  if (entry.kind === "task") {
                    return (
                      <TableRow key={`task-${entry.taskId}-${idx}`} className="bg-muted/15 hover:bg-muted/25">
                        <TableCell className="py-1.5">
                          <div className="flex items-center gap-1.5" style={{ paddingLeft: 8 + (entry.depth + 1) * 16 }}>
                            <TreeToggle
                              expanded={!entry.collapsed}
                              hasChildren={entry.descendantLeafCount > 0}
                              onToggle={() => toggleTaskSummary(entry.taskId)}
                              label={entry.taskName}
                              size="sm"
                            />
                            <span className="text-sm font-medium truncate text-foreground/90" title={entry.taskName}>
                              {entry.taskName}
                            </span>
                            {entry.isPhase && (
                              <span className="text-[9px] px-1 py-0 h-3.5 inline-flex items-center rounded border border-indigo-300 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30">
                                Phase
                              </span>
                            )}
                            {entry.collapsed && entry.descendantLeafCount > 0 && (
                              <span className="text-[10px] text-muted-foreground shrink-0">({entry.descendantLeafCount})</span>
                            )}
                          </div>
                        </TableCell>
                        {allWeekDays.map(day => {
                          const dayStr = format(day, "yyyy-MM-dd");
                          const v = entry.dailyTotals[dayStr] ?? 0;
                          return (
                            <TableCell key={dayStr} className="text-center text-xs tabular-nums text-muted-foreground/80">
                              {v > 0 ? <span className="opacity-70">{v}</span> : <span className="text-muted-foreground/20">·</span>}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right text-sm font-medium text-muted-foreground">{entry.total > 0 ? entry.total : "—"}</TableCell>
                        <TableCell />
                      </TableRow>
                    );
                  }

                  // ── Leaf row (real, editable) ──────────────────────────────
                  const row = entry.row;
                  const leafDepth = entry.depth;
                  const rowTotal = allWeekDays.reduce((sum, day) => {
                    const dayStr = format(day, "yyyy-MM-dd");
                    return sum + (row.days[dayStr] || 0);
                  }, 0);
                  const taskName = row.taskId ? getTaskName(row.taskId) : null;
                  const categoryName = row.categoryId ? getCategoryName(row.categoryId) : null;
                  // H1: time cannot be logged against a parent task — those
                  // accumulate from their children. Show the row read-only with
                  // a tooltip pointing to the leaf-only rule.
                  const isParentLeaf = isParentTaskRow(row);
                  // Indent leaf to align under its task summary parent (or
                  // directly under the project header if no task ancestor).
                  const leafIndent = 8 + (leafDepth + 1) * 16;
                  return (
                    <TableRow key={row.key} className="hover:bg-muted/10 group">
                      <TableCell className="py-2 align-middle">
                        <div className="flex items-start gap-1.5" style={{ paddingLeft: leafIndent }}>
                          {/* Spacer to align with TreeToggle in summary rows */}
                          <span className="inline-block w-5 shrink-0" aria-hidden="true" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate max-w-[180px]">
                              {row.isNonProject
                                ? <span className="text-slate-500 italic">{row.activityName || "Non-project activity"}</span>
                                : taskName ?? <span className="text-muted-foreground italic">No task</span>
                              }
                            </div>
                            {row.activityName && taskName && row.activityName !== taskName && !row.isNonProject && (
                              <div className="text-xs text-muted-foreground truncate max-w-[180px] mt-0.5">{row.activityName}</div>
                            )}
                            {row.description && !row.isNonProject && (
                              <div className="text-xs text-muted-foreground truncate max-w-[180px] mt-0.5">{row.description}</div>
                            )}
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {row.isNonProject ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                                  <Lock className="h-2.5 w-2.5" /> Non-billable
                                </span>
                              ) : row.billable ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">Billable</span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">Non-billable</span>
                              )}
                              {categoryName && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-200">{categoryName}</span>
                              )}
                            </div>
                            {/* Allocation context bar */}
                            {!row.isNonProject && (() => {
                              const ctx = getAllocContext(row.projectId);
                              if (!ctx || (!ctx.allocatedPerWeek && !ctx.allocatedTotal)) return null;
                              const weekPct = ctx.allocatedPerWeek > 0 ? Math.min(100, Math.round((ctx.weekLoggedHours / ctx.allocatedPerWeek) * 100)) : 0;
                              const overrun = ctx.weekOverrun;
                              const expired = ctx.isExpired;
                              return (
                                <div className="mt-1.5 space-y-0.5">
                                  {ctx.allocatedPerWeek > 0 && (
                                    <div className="flex items-center gap-1.5">
                                      <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                                        <div className={cn("h-full rounded-full transition-all", overrun ? "bg-amber-500" : "bg-indigo-400")} style={{ width: `${weekPct}%` }} />
                                      </div>
                                      <span className={cn("text-[10px] font-medium whitespace-nowrap", overrun ? "text-amber-600" : "text-muted-foreground")}>
                                        {ctx.weekLoggedHours}h / {ctx.allocatedPerWeek}h wk
                                        {overrun && <span className="ml-0.5 text-amber-600">⚠</span>}
                                      </span>
                                    </div>
                                  )}
                                  {ctx.allocatedTotal > 0 && ctx.budgetPct !== null && (
                                    <div className="text-[10px] text-muted-foreground">
                                      {ctx.totalLoggedHours}h of {ctx.allocatedTotal}h total
                                      {ctx.budgetPct >= 90 && <span className="ml-1 text-orange-500 font-medium">({ctx.budgetPct}% used)</span>}
                                    </div>
                                  )}
                                  {expired && (
                                    <div className="text-[10px] text-red-500 font-medium flex items-center gap-0.5">
                                      <AlertTriangle className="h-2.5 w-2.5" /> Allocation expired {ctx.allocationEndDate}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          {/* Per-row clock icon */}
                          {!isLocked && !isParentLeaf && (
                            <button
                              title="Log time for this row"
                              onClick={() => openLogForRow(row)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-indigo-50 text-muted-foreground hover:text-indigo-600 transition-all shrink-0"
                            >
                              <Clock className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {isParentLeaf && (
                            <span
                              title="Time accumulates from child tasks. Log on a leaf task instead."
                              className="text-[10px] text-muted-foreground italic shrink-0 px-1.5 py-0.5 rounded bg-muted/40 border border-muted"
                            >
                              roll-up
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {allWeekDays.map(day => {
                        const dayStr = format(day, "yyyy-MM-dd");
                        const hours = row.days[dayStr] || 0;
                        const multiEntry = (row.entryIds[dayStr]?.length ?? 0) > 1;
                        const isEditing = editingCell?.rowKey === row.key && editingCell?.dayStr === dayStr && !isParentLeaf;
                        const canClick = !isLocked && !multiEntry && !isParentLeaf;
                        return (
                          <TableCell key={dayStr} className="text-center p-1">
                            {isEditing ? (
                              <input
                                ref={editInputRef}
                                type="number"
                                step="0.5"
                                min="0"
                                max="24"
                                value={editValue}
                                className="w-12 h-8 text-center border border-indigo-400 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white dark:bg-gray-900"
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={() => handleCellSave(row, dayStr, editValue)}
                                onKeyDown={e => {
                                  if (e.key === "Enter") { e.preventDefault(); handleCellSave(row, dayStr, editValue); }
                                  if (e.key === "Escape") setEditingCell(null);
                                  handleCellTab(row, dayStr, e);
                                }}
                              />
                            ) : (
                              <button
                                onClick={() => canClick && startEdit(row, dayStr)}
                                disabled={isParentLeaf}
                                title={isParentLeaf ? "Time accumulates from child tasks — log on a leaf task instead" : multiEntry ? "Multiple entries — use clock icon to add more" : isLocked ? "Timesheet is locked" : "Click to edit · Tab to advance"}
                                className={cn(
                                  "w-full min-h-[32px] px-1 rounded text-sm font-medium transition-colors",
                                  canClick && "hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer dark:hover:bg-indigo-900/20",
                                  !canClick && "cursor-default",
                                  isParentLeaf && "text-muted-foreground/60 italic cursor-not-allowed",
                                  hours > 0 && !isParentLeaf && "text-foreground",
                                )}
                              >
                                {hours > 0 ? hours : <span className="text-muted-foreground/30 text-lg">·</span>}
                              </button>
                            )}
                          </TableCell>
                        );
                      })}

                      <TableCell className="text-right font-bold text-sm bg-muted/10">{rowTotal > 0 ? rowTotal : "—"}</TableCell>
                      <TableCell className="p-1">
                        {row.rowDbId && !isLocked && (
                          <button
                            title="Remove row"
                            onClick={() => deleteRowMutation.mutate(row.rowDbId!)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-muted-foreground/40 hover:text-red-500 transition-all"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            {rows.length > 0 && (
              <TableFooter>
                <TableRow className="bg-muted/40 border-t-2 font-semibold">
                  <TableCell className="text-xs text-muted-foreground py-2">Daily Total</TableCell>
                  {dailyTotals.map((total, i) => (
                    <TableCell key={i} className="text-center text-sm py-2">
                      {total > 0 ? <span className="font-bold">{total}</span> : <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold text-sm py-2">{grandTotal > 0 ? grandTotal : "—"}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>

        {/* Footer actions */}
        <div className="p-2 border-t bg-muted/5 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAddActivityOpen(true)}
            disabled={isLocked}
            className="text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Activity
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { logTimeForm.reset({ date: format(new Date(), "yyyy-MM-dd"), hours: 0, billable: true }); setLogDialogOpen(true); }}
            disabled={timesheet?.status === "Approved"}
            className="text-muted-foreground hover:text-foreground"
          >
            <Clock className="h-4 w-4 mr-1.5" /> Log Time
          </Button>
          {isLocked && timesheet?.status === "Submitted" && (
            <span className="ml-2 text-xs text-amber-600 font-medium">⏳ Awaiting approval — withdraw to make changes</span>
          )}
          {isLocked && timesheet?.status === "Approved" && (
            <span className="ml-2 text-xs text-green-600 font-medium">✓ Approved &amp; locked</span>
          )}
        </div>
      </div>

      {/* Pending Approval Section */}
      {submittedTimesheets && submittedTimesheets.length > 0 && (
        <div className="mt-8 space-y-3">
          <h3 className="text-base font-semibold">Timesheets Pending Approval</h3>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Member</TableHead>
                  <TableHead>Week</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submittedTimesheets.map(ts => {
                  const isOwn = ts.userId === userId;
                  return (
                    <TableRow key={ts.id}>
                      <TableCell className="font-medium">{users?.find(u => u.id === ts.userId)?.name}</TableCell>
                      <TableCell>{ts.weekStart}</TableCell>
                      <TableCell>{ts.totalHours}h <span className="text-muted-foreground text-xs">({ts.billableHours}h billable)</span></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ts.submittedAt ? new Date(ts.submittedAt).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        {isOwn ? (
                          <span className="text-xs text-muted-foreground italic" title="You can't approve or reject your own timesheet">Awaiting another approver</span>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setRejectTimesheetId(ts.id)}>Reject</Button>
                            <Button size="sm" onClick={() => onApprove(ts.id)} disabled={approveTimesheet.isPending}>Approve</Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Approved Timesheets Section (collapsible, closed by default) */}
      {approvedTimesheets && approvedTimesheets.length > 0 && (
        <Collapsible className="mt-4">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-muted/40 transition-colors"
              data-testid="approved-timesheets-toggle"
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
              <h3 className="text-base font-semibold">Approved Timesheets</h3>
              <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                {approvedTimesheets.length}
              </span>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Member</TableHead>
                    <TableHead>Week</TableHead>
                    <TableHead>Billable / Total</TableHead>
                    <TableHead>Approved</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedTimesheets.map(ts => (
                    <TableRow key={ts.id}>
                      <TableCell className="font-medium">{users?.find(u => u.id === ts.userId)?.name}</TableCell>
                      <TableCell>{ts.weekStart}</TableCell>
                      <TableCell>{ts.billableHours}h billable / {ts.totalHours}h total</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ts.approvedAt ? new Date(ts.approvedAt).toLocaleDateString() : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* ─── Log Time Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Time</DialogTitle></DialogHeader>
          <Form {...logTimeForm}>
            <form onSubmit={logTimeForm.handleSubmit(onLogTime)} className="space-y-4">
              <FormField control={logTimeForm.control} name="projectId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Project <span className="text-muted-foreground font-normal">(leave blank for non-project)</span></FormLabel>
                  <Select onValueChange={v => { field.onChange(v === "__none" ? undefined : v); logTimeForm.setValue("billable", v !== "__none"); }} value={field.value?.toString() ?? "__none"}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="__none">— Non-project activity —</SelectItem>
                      {projects?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              {!logTimeForm.watch("projectId") && (
                <FormField control={logTimeForm.control} name="activityName" render={({ field }) => (
                  <FormItem><FormLabel>Activity Name</FormLabel><FormControl><Input placeholder="e.g. Internal training" {...field} /></FormControl></FormItem>
                )} />
              )}
              {!!logTimeForm.watch("projectId") && (
                <FormField control={logTimeForm.control} name="taskId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()} disabled={!selectedProjectId}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select task" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {projectTasks
                          ?.filter(t => !t.isPhase)
                          .filter(t => !projectTasks.some(c => c.parentTaskId === t.id))
                          .map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              )}
              <FormField control={logTimeForm.control} name="categoryId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value?.toString()}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {timeCategories?.filter(c => c.isActive).map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={logTimeForm.control} name="date" render={({ field }) => (
                  <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={logTimeForm.control} name="hours" render={({ field }) => (
                  <FormItem><FormLabel>Hours</FormLabel><FormControl><Input type="number" step="0.5" min="0.5" max="24" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={logTimeForm.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Notes <span className="text-muted-foreground font-normal">(optional)</span></FormLabel><FormControl><Input placeholder="What did you work on?" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={logTimeForm.control} name="billable" render={({ field }) => (
                <FormItem className={cn("flex items-center space-x-2 space-y-0", !logTimeForm.watch("projectId") && "opacity-40 pointer-events-none")}>
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={!logTimeForm.watch("projectId")} /></FormControl>
                  <FormLabel className="font-normal cursor-pointer">
                    Billable {!logTimeForm.watch("projectId") && <span className="text-xs text-muted-foreground ml-1">(locked non-billable for non-project activities)</span>}
                  </FormLabel>
                </FormItem>
              )} />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setLogDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createTimeEntry.isPending}>Save Entry</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ─── Add Activity Dialog ─────────────────────────────────────────────── */}
      <Dialog open={addActivityOpen} onOpenChange={setAddActivityOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Activity Row</DialogTitle>
            <DialogDescription>Add a persistent row that appears in your timesheet every week.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActivityMode("project")}
                className={cn("flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors", activityMode === "project" ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "text-muted-foreground hover:bg-muted/30")}
              >Project Activity</button>
              <button
                onClick={() => setActivityMode("nonproject")}
                className={cn("flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors", activityMode === "nonproject" ? "bg-slate-100 border-slate-300 text-slate-700" : "text-muted-foreground hover:bg-muted/30")}
              >Non-Project Activity</button>
            </div>

            {activityMode === "project" ? (
              <>
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={activityForm.projectId} onValueChange={v => setActivityForm(f => ({ ...f, projectId: v, taskId: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>{projects?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Task <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                  <Select value={activityForm.taskId} onValueChange={v => setActivityForm(f => ({ ...f, taskId: v }))} disabled={!activityForm.projectId}>
                    <SelectTrigger><SelectValue placeholder="Select task" /></SelectTrigger>
                    <SelectContent>
                      {allTasks
                        ?.filter(t => t.projectId === Number(activityForm.projectId))
                        .filter(t => !t.isPhase)
                        .filter(t => !(allTasks ?? []).some(c => c.parentTaskId === t.id))
                        .map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={activityForm.billable} onCheckedChange={v => setActivityForm(f => ({ ...f, billable: v }))} id="act-billable" />
                  <Label htmlFor="act-billable" className="font-normal cursor-pointer">Billable</Label>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Activity Name</Label>
                  <Input placeholder="e.g. Internal training, Admin work" value={activityForm.activityName} onChange={e => setActivityForm(f => ({ ...f, activityName: e.target.value }))} />
                </div>
                <div className="flex items-center gap-2 opacity-50">
                  <Switch checked={false} disabled id="np-billable" />
                  <Label htmlFor="np-billable" className="font-normal text-muted-foreground cursor-default">Non-billable (locked for non-project activities)</Label>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Category <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
              <Select value={activityForm.categoryId} onValueChange={v => setActivityForm(f => ({ ...f, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {timeCategories?.filter(c => c.isActive).map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddActivityOpen(false)}>Cancel</Button>
            <Button onClick={handleAddActivity} disabled={addRowMutation.isPending}>Add Row</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog — Rule 12: rejection note is mandatory */}
      <Dialog open={!!rejectTimesheetId} onOpenChange={(o) => !o && setRejectTimesheetId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Timesheet</DialogTitle>
            <DialogDescription>A rejection reason is required so the employee knows what to correct.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Rejection Reason <span className="text-red-500">*</span></Label>
            <Input value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Please explain why this timesheet is being returned..." />
            {rejectNote.trim().length === 0 && <p className="text-xs text-muted-foreground">Required — employees will see this message and must correct their timesheet.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTimesheetId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={onReject}
              disabled={rejectTimesheetMutation.isPending || rejectNote.trim().length === 0}
            >
              Reject Timesheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guardrail Confirmation Dialog — soft-block overrides */}
      <Dialog open={!!guardrailConfirm} onOpenChange={(o) => !o && setGuardrailConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Timesheet Guardrail
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-foreground">{guardrailConfirm?.warning}</p>
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 p-3 text-xs text-amber-700 dark:text-amber-400">
              Code: <span className="font-mono font-medium">{guardrailConfirm?.code}</span>
              <span className="ml-2 text-muted-foreground">· Override will be noted in the audit log.</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGuardrailConfirm(null)}>Cancel</Button>
            <Button variant="default" onClick={handleGuardrailForce} className="bg-amber-600 hover:bg-amber-700 text-white">
              Save Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
