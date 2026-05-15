/**
 * WeeklyTimesheetView
 *
 * Primary workspace for consultants — grid of Project × Task rows with one
 * column per day of the selected week.  Implements FR-396.2 (cross-month),
 * FR-416.2 (replication confirmation), and the full status/bulk-action spec.
 */

import { useState, useMemo, useCallback } from "react";
import { format, addDays, startOfWeek, parseISO } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, Copy, Loader2, AlertTriangle,
  Zap, PanelRightClose, PanelRightOpen, CheckSquare,
} from "lucide-react";

import { authHeaders } from "@/lib/auth-headers";
import { useCurrentUser } from "@/contexts/current-user";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableFooter,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TimeEntryForm } from "@/components/time-entry-form";

// ─── Types (mirror the API service types) ────────────────────────────────────

interface DailyEntry {
  entryId: number;
  entryDate: string;
  durationHours: number;
  billableCategory: string;
  status: string;
  narrative: string | null;
  rejectionReason?: string | null;
  isReplicated?: boolean;
  isExceptional?: boolean;
}

interface TaskGroup {
  taskId: number;
  taskName: string;
  entries: DailyEntry[];
  taskTotal: number;
}

interface ProjectGroup {
  projectId: number;
  projectName: string;
  tasks: TaskGroup[];
  projectTotal: number;
}

interface WeekBlock {
  month: string;
  weekStart: string;
  weekEnd: string;
  projects: ProjectGroup[];
  dailyTotals: Record<string, number>;
  weekTotal: number;
  billableTotal: number;
  nonBillableTotal: number;
  utilizationRate: number;
}

interface WeeklyView {
  resourceId: number;
  weekStartDate: string;
  isCrossMonth: boolean;
  blocks: WeekBlock[];
}

interface WeeklySummary {
  totalBillable: number;
  totalNonBillable: number;
  utilizationRate: number;
}

interface FullEntry {
  id: number;
  entryDate: string;
  durationHours: string;
  status: string;
  billableCategory: string;
  rejectionReason?: string | null;
  isReplicated?: boolean;
  isExceptional?: boolean;
}

// ─── Status dot ──────────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  Draft:     "bg-slate-300",
  Submitted: "bg-blue-500",
  Approved:  "bg-emerald-500",
  Rejected:  "bg-red-500",
  Processed: "bg-violet-500",
};

function StatusDot({ status, rejectionReason }: { status: string; rejectionReason?: string | null }) {
  const dot = (
    <span className={cn("inline-block h-2 w-2 rounded-full flex-shrink-0", STATUS_DOT[status] ?? "bg-slate-200")} />
  );
  if (status === "Rejected" && rejectionReason) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{dot}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          Rejected: {rejectionReason}
        </TooltipContent>
      </Tooltip>
    );
  }
  return dot;
}

// ─── Week status badge label ──────────────────────────────────────────────────

function deriveWeekStatus(entries: FullEntry[]): string {
  if (entries.length === 0) return "Draft";
  const statuses = new Set(entries.map(e => e.status));
  if (statuses.size === 1) return [...statuses][0];
  if (statuses.has("Rejected")) return "Mixed";
  if (statuses.has("Approved") && statuses.has("Draft")) return "Mixed";
  if (statuses.has("Submitted") && statuses.has("Draft")) return "Partially Submitted";
  return "Mixed";
}

const WEEK_STATUS_STYLE: Record<string, string> = {
  Draft:               "bg-slate-100 text-slate-700 border-slate-200",
  "Partially Submitted": "bg-blue-50 text-blue-700 border-blue-200",
  Submitted:           "bg-blue-100 text-blue-800 border-blue-300",
  Approved:            "bg-emerald-100 text-emerald-800 border-emerald-300",
  Rejected:            "bg-red-100 text-red-800 border-red-300",
  Mixed:               "bg-amber-100 text-amber-800 border-amber-300",
  Processed:           "bg-violet-100 text-violet-800 border-violet-300",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface WeeklyTimesheetViewProps {
  initialWeekStart?: string;
  initialResourceId?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WeeklyTimesheetView({ initialWeekStart, initialResourceId }: WeeklyTimesheetViewProps) {
  const { currentUser } = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();

  const currentUserId = currentUser?.id ?? 1;
  const [resourceId, setResourceId] = useState<number>(initialResourceId ?? currentUserId);
  const isProxyMode = resourceId !== currentUserId;

  // ── Week navigation ────────────────────────────────────────────────────────
  const [weekStart, setWeekStart] = useState<Date>(() => {
    if (initialWeekStart) {
      try { return startOfWeek(parseISO(initialWeekStart), { weekStartsOn: 1 }); } catch { /* fall */ }
    }
    return startOfWeek(new Date(), { weekStartsOn: 1 });
  });

  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const prevWeek = () => setWeekStart(d => addDays(d, -7));
  const nextWeek = () => setWeekStart(d => addDays(d, 7));

  // ── Data queries ────────────────────────────────────────────────────────────
  const viewQK = ["effort-weekly-view", resourceId, weekStartStr];
  const { data: viewData, isLoading: viewLoading } = useQuery<WeeklyView>({
    queryKey: viewQK,
    queryFn: async () => {
      const r = await fetch(`/api/time/weekly-view?resourceId=${resourceId}&weekStart=${weekStartStr}`, {
        headers: authHeaders(),
      });
      if (!r.ok) throw new Error("Failed to load weekly view");
      return r.json();
    },
  });

  const summaryQK = ["effort-weekly-summary", resourceId, weekStartStr];
  const { data: summary } = useQuery<WeeklySummary>({
    queryKey: summaryQK,
    queryFn: async () => {
      const r = await fetch(`/api/time/weekly-summary?resourceId=${resourceId}&weekStart=${weekStartStr}`, {
        headers: authHeaders(),
      });
      if (!r.ok) return { totalBillable: 0, totalNonBillable: 0, utilizationRate: 0 };
      return r.json();
    },
  });

  // Raw entries (for rejectionReason, isReplicated, selection)
  const entriesQK = ["effort-entries-week", resourceId, weekStartStr];
  const { data: rawEntries } = useQuery<{ data: FullEntry[] }>({
    queryKey: entriesQK,
    queryFn: async () => {
      const r = await fetch(`/api/time/entries?resourceId=${resourceId}&weekStart=${weekStartStr}`, {
        headers: authHeaders(),
      });
      if (!r.ok) return { data: [] };
      return r.json();
    },
  });

  const entries: FullEntry[] = rawEntries?.data ?? [];
  const weekStatus = deriveWeekStatus(entries);

  // Build entryId → full entry map for status/rejection lookup
  const entryMap = useMemo(() => {
    const m = new Map<number, FullEntry>();
    entries.forEach(e => m.set(e.id, e));
    return m;
  }, [entries]);

  // ── Flatten all WeekBlocks into a single project/task structure ─────────────
  const allProjects = useMemo<ProjectGroup[]>(() => {
    if (!viewData) return [];
    const merged = new Map<number, ProjectGroup>();
    for (const block of viewData.blocks) {
      for (const proj of block.projects) {
        if (!merged.has(proj.projectId)) {
          merged.set(proj.projectId, { ...proj, tasks: [] });
        }
        const pg = merged.get(proj.projectId)!;
        for (const task of proj.tasks) {
          const existing = pg.tasks.find(t => t.taskId === task.taskId);
          if (existing) {
            existing.entries.push(...task.entries);
            existing.taskTotal += task.taskTotal;
          } else {
            pg.tasks.push({ ...task });
          }
        }
      }
    }
    return [...merged.values()];
  }, [viewData]);

  // Build cell lookup: `${taskId}_${dateStr}` → DailyEntry[]
  const cellMap = useMemo(() => {
    const m = new Map<string, DailyEntry[]>();
    for (const proj of allProjects) {
      for (const task of proj.tasks) {
        for (const e of task.entries) {
          const k = `${task.taskId}_${e.entryDate}`;
          if (!m.has(k)) m.set(k, []);
          m.get(k)!.push(e);
        }
      }
    }
    return m;
  }, [allProjects]);

  // Per-day totals (across all blocks)
  const combinedDailyTotals = useMemo<Record<string, number>>(() => {
    const totals: Record<string, number> = {};
    for (const block of viewData?.blocks ?? []) {
      for (const [d, h] of Object.entries(block.dailyTotals)) {
        totals[d] = (totals[d] ?? 0) + h;
      }
    }
    return totals;
  }, [viewData]);

  const weekTotal = viewData?.blocks.reduce((s, b) => s + b.weekTotal, 0) ?? 0;
  const isCrossMonth = viewData?.isCrossMonth ?? false;

  // Month boundary: which day-index is the last day of the first month?
  const monthBoundaryIdx = useMemo(() => {
    if (!isCrossMonth) return -1;
    const firstMonth = format(days[0], "yyyy-MM");
    let last = -1;
    days.forEach((d, i) => { if (format(d, "yyyy-MM") === firstMonth) last = i; });
    return last;
  }, [isCrossMonth, days]);

  // ── Selection state ─────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const draftEntryIds = entries.filter(e => e.status === "Draft").map(e => e.id);
  const submittedEntryIds = entries.filter(e => e.status === "Submitted").map(e => e.id);
  const allDraftSelected = draftEntryIds.length > 0 &&
    draftEntryIds.every(id => selectedIds.has(id));

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleAllDraft(checked: boolean) {
    setSelectedIds(checked ? new Set(draftEntryIds) : new Set());
  }

  // ── Sheet (slide-over entry form) ───────────────────────────────────────────
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetEntryId, setSheetEntryId] = useState<number | undefined>(undefined);
  const [sheetPrefill, setSheetPrefill] = useState<{ projectId?: number; taskId?: number; entryDate?: string } | undefined>(undefined);

  function openCellSheet(opts: { entryId?: number; projectId?: number; taskId?: number; dateStr?: string }) {
    setSheetEntryId(opts.entryId);
    setSheetPrefill(opts.entryId ? undefined : {
      projectId: opts.projectId,
      taskId: opts.taskId,
      entryDate: opts.dateStr,
    });
    setSheetOpen(true);
  }

  function handleSheetSuccess() {
    setSheetOpen(false);
    qc.invalidateQueries({ queryKey: viewQK });
    qc.invalidateQueries({ queryKey: summaryQK });
    qc.invalidateQueries({ queryKey: entriesQK });
    setSelectedIds(new Set());
  }

  // ── Copy previous week ─────────────────────────────────────────────────────
  const [copying, setCopying] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyResult, setCopyResult] = useState<{ created: number; skipped: number } | null>(null);

  async function handleCopyPreviousWeek() {
    setCopying(true);
    try {
      const r = await fetch("/api/time/replicate-week", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ resourceId, currentWeekStart: weekStartStr }),
      });
      const data = await r.json();
      if (!r.ok) {
        toast({ title: "Copy failed", description: data?.error?.message ?? "Unknown error.", variant: "destructive" });
        return;
      }
      setCopyResult({ created: data.created?.length ?? 0, skipped: data.skipped?.length ?? 0 });
      setShowCopyDialog(true);
      qc.invalidateQueries({ queryKey: viewQK });
      qc.invalidateQueries({ queryKey: summaryQK });
      qc.invalidateQueries({ queryKey: entriesQK });
    } finally {
      setCopying(false);
    }
  }

  // ── Bulk submit ─────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);

  const hasReplicatedInSelection = [...selectedIds].some(id => entryMap.get(id)?.isReplicated);
  const [showReplicationConfirm, setShowReplicationConfirm] = useState(false);

  async function handleBulkSubmit() {
    if (hasReplicatedInSelection) { setShowReplicationConfirm(true); return; }
    await executeBulkSubmit();
  }

  async function executeBulkSubmit(confirmationToken?: string) {
    setSubmitting(true);
    try {
      const payload: any = { entryIds: [...selectedIds] };
      if (confirmationToken) payload.confirmationToken = confirmationToken;
      const r = await fetch("/api/time/entries/submit", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) {
        toast({ title: "Submit failed", description: data?.error?.message, variant: "destructive" });
        return;
      }
      toast({ title: `${data.submitted} entr${data.submitted === 1 ? "y" : "ies"} submitted` });
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: viewQK });
      qc.invalidateQueries({ queryKey: summaryQK });
      qc.invalidateQueries({ queryKey: entriesQK });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReplicationConfirm() {
    setShowReplicationConfirm(false);
    const r = await fetch("/api/time/confirm-replication", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ resourceId }),
    });
    const data = await r.json();
    await executeBulkSubmit(data.token);
  }

  // ── Bulk recall ─────────────────────────────────────────────────────────────
  const [recalling, setRecalling] = useState(false);
  const selectedSubmittedIds = [...selectedIds].filter(id => entryMap.get(id)?.status === "Submitted");

  async function handleBulkRecall() {
    setRecalling(true);
    let recalled = 0;
    for (const id of selectedSubmittedIds) {
      try {
        await fetch(`/api/time/entries/${id}/recall`, {
          method: "POST",
          headers: authHeaders(),
        });
        recalled++;
      } catch { /* continue */ }
    }
    toast({ title: `${recalled} entr${recalled === 1 ? "y" : "ies"} recalled` });
    setSelectedIds(new Set());
    qc.invalidateQueries({ queryKey: viewQK });
    qc.invalidateQueries({ queryKey: summaryQK });
    qc.invalidateQueries({ queryKey: entriesQK });
    setRecalling(false);
  }

  // ── Sidebar ─────────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const exceptionalCount = entries.filter(e => e.isExceptional).length;

  // ── Render ──────────────────────────────────────────────────────────────────

  const DAYS_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="flex flex-col gap-0 h-full">

      {/* ── Proxy banner ─────────────────────────────────────────────────────── */}
      {isProxyMode && (
        <div className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 text-sm font-medium">
          <Zap className="h-4 w-4 flex-shrink-0" />
          Proxy Mode — Managing timesheet for resource #{resourceId}. All entries will be attributed to them and logged under your name.
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Main area ────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-auto p-4 gap-4">

          {/* ── Header row ─────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Week navigator */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-sm font-medium min-w-[180px] text-center">
                {format(days[0], "MMM d")} – {format(days[6], "MMM d, yyyy")}
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Week status */}
              <span className={cn(
                "inline-flex items-center text-xs font-medium border rounded-full px-2.5 py-0.5",
                WEEK_STATUS_STYLE[weekStatus] ?? "bg-slate-100 text-slate-700 border-slate-200",
              )}>
                {weekStatus}
              </span>

              {/* Utilization chip */}
              {summary && (
                <Badge variant="outline" className="text-xs gap-1">
                  Utilization: {Math.round(summary.utilizationRate)}% this week
                </Badge>
              )}

              {/* Copy previous week */}
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleCopyPreviousWeek} disabled={copying}>
                {copying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                Copy Previous Week
              </Button>

              {/* Sidebar toggle */}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(p => !p)}>
                {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* ── Grid ──────────────────────────────────────────────────────── */}
          {viewLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
            </div>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    {/* Select-all checkbox */}
                    <TableHead className="w-8 px-2">
                      <Checkbox
                        checked={allDraftSelected}
                        onCheckedChange={(v) => toggleAllDraft(!!v)}
                        aria-label="Select all draft entries"
                      />
                    </TableHead>
                    <TableHead className="min-w-[180px] font-semibold">Project / Task</TableHead>
                    {days.map((d, i) => (
                      <>
                        {/* Cross-month divider */}
                        {isCrossMonth && i === monthBoundaryIdx + 1 && (
                          <TableHead key={`divider-${i}`} className="w-1 p-0 bg-slate-200" />
                        )}
                        <TableHead
                          key={d.toISOString()}
                          className={cn("text-center w-[72px] min-w-[72px] font-medium",
                            format(d, "E") === "Sat" || format(d, "E") === "Sun"
                              ? "text-muted-foreground" : ""
                          )}
                        >
                          <div>{DAYS_ABBR[i]}</div>
                          <div className="font-normal text-muted-foreground">{format(d, "d")}</div>
                        </TableHead>
                      </>
                    ))}
                    <TableHead className="text-center w-16 font-semibold">Total</TableHead>
                    <TableHead className="w-24 text-center">Category</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {allProjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-10 text-muted-foreground">
                        No time logged this week.{" "}
                        <button
                          className="underline text-indigo-600 hover:text-indigo-800"
                          onClick={() => openCellSheet({ dateStr: weekStartStr })}
                        >
                          Log time
                        </button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    allProjects.map(proj => (
                      <>
                        {/* Project header row */}
                        <TableRow key={`proj-${proj.projectId}`} className="bg-muted/20 font-medium">
                          <TableCell className="px-2" />
                          <TableCell
                            colSpan={isCrossMonth ? 10 : 9}
                            className="text-xs text-muted-foreground uppercase tracking-wide py-1.5"
                          >
                            {proj.projectName}
                          </TableCell>
                          <TableCell className="text-center text-xs font-semibold">
                            {proj.projectTotal.toFixed(1)}h
                          </TableCell>
                          <TableCell />
                        </TableRow>

                        {/* Task rows */}
                        {proj.tasks.map(task => {
                          // Collect all entry IDs for this task this week (for selection)
                          const taskEntryIds = task.entries.map(e => e.entryId);
                          const taskRowTotal = task.taskTotal;
                          const taskBillable = task.entries[0]?.billableCategory ?? "—";

                          return (
                            <TableRow key={`task-${proj.projectId}-${task.taskId}`} className="hover:bg-muted/10">
                              {/* Row checkbox (select all draft entries in this task) */}
                              <TableCell className="px-2">
                                <Checkbox
                                  checked={
                                    taskEntryIds.filter(id => entryMap.get(id)?.status === "Draft").length > 0 &&
                                    taskEntryIds.filter(id => entryMap.get(id)?.status === "Draft").every(id => selectedIds.has(id))
                                  }
                                  onCheckedChange={(v) => {
                                    const draftIds = taskEntryIds.filter(id => entryMap.get(id)?.status === "Draft");
                                    setSelectedIds(prev => {
                                      const n = new Set(prev);
                                      draftIds.forEach(id => v ? n.add(id) : n.delete(id));
                                      return n;
                                    });
                                  }}
                                />
                              </TableCell>

                              <TableCell className="font-medium pl-4">{task.taskName}</TableCell>

                              {/* Day cells */}
                              {days.map((d, i) => {
                                const dateStr = format(d, "yyyy-MM-dd");
                                const cellEntries = cellMap.get(`${task.taskId}_${dateStr}`) ?? [];
                                const totalHrs = cellEntries.reduce((s, e) => s + e.durationHours, 0);
                                const primaryEntry = cellEntries[0];
                                const fullEntry = primaryEntry ? entryMap.get(primaryEntry.entryId) : undefined;
                                const status = fullEntry?.status ?? primaryEntry?.status;
                                const rejectionReason = fullEntry?.rejectionReason;

                                return (
                                  <>
                                    {isCrossMonth && i === monthBoundaryIdx + 1 && (
                                      <TableCell key={`div-${task.taskId}-${i}`} className="w-1 p-0 bg-slate-200" />
                                    )}
                                    <TableCell
                                      key={`${task.taskId}-${dateStr}`}
                                      className={cn(
                                        "text-center p-1 cursor-pointer hover:bg-indigo-50 transition-colors",
                                        status === "Approved" ? "bg-emerald-50/40" :
                                        status === "Rejected" ? "bg-red-50/40" : "",
                                      )}
                                      onClick={() => {
                                        if (primaryEntry) {
                                          openCellSheet({ entryId: primaryEntry.entryId });
                                        } else {
                                          openCellSheet({
                                            projectId: proj.projectId,
                                            taskId: task.taskId,
                                            dateStr,
                                          });
                                        }
                                      }}
                                    >
                                      {primaryEntry ? (
                                        <div className="flex flex-col items-center gap-0.5">
                                          <div className="flex items-center gap-1">
                                            {status && <StatusDot status={status} rejectionReason={rejectionReason} />}
                                            <span className="font-medium text-xs">
                                              {totalHrs % 1 === 0 ? totalHrs : totalHrs.toFixed(1)}h
                                            </span>
                                          </div>
                                          {/* selection dot for draft entries */}
                                          {status === "Draft" && primaryEntry && (
                                            <Checkbox
                                              className="h-3 w-3"
                                              checked={selectedIds.has(primaryEntry.entryId)}
                                              onCheckedChange={(v) => {
                                                toggleSelect(primaryEntry.entryId);
                                              }}
                                              onClick={e => e.stopPropagation()}
                                            />
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground/40 text-base leading-none">+</span>
                                      )}
                                    </TableCell>
                                  </>
                                );
                              })}

                              <TableCell className="text-center font-medium text-xs">
                                {taskRowTotal > 0 ? `${taskRowTotal.toFixed(1)}h` : "—"}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] px-1.5 py-0",
                                    taskBillable === "Billable"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {taskBillable}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </>
                    ))
                  )}
                </TableBody>

                {/* Footer */}
                <TableFooter>
                  {/* Daily totals row */}
                  <TableRow className="bg-muted/30 font-semibold text-xs">
                    <TableCell />
                    <TableCell className="text-muted-foreground text-xs">Daily Total</TableCell>
                    {days.map((d, i) => {
                      const dateStr = format(d, "yyyy-MM-dd");
                      const total = combinedDailyTotals[dateStr] ?? 0;
                      return (
                        <>
                          {isCrossMonth && i === monthBoundaryIdx + 1 && (
                            <TableCell key={`foot-div-${i}`} className="w-1 p-0 bg-slate-200" />
                          )}
                          <TableCell key={dateStr} className="text-center">
                            {total > 0 ? `${total.toFixed(1)}h` : "—"}
                          </TableCell>
                        </>
                      );
                    })}
                    <TableCell className="text-center">{weekTotal.toFixed(1)}h</TableCell>
                    <TableCell />
                  </TableRow>

                  {/* Billable / Non-Billable totals */}
                  <TableRow className="bg-muted/10 text-xs text-muted-foreground">
                    <TableCell colSpan={9 + (isCrossMonth ? 1 : 0)} className="py-1.5">
                      <span className="text-emerald-700 font-medium mr-4">
                        Billable: {(summary?.totalBillable ?? 0).toFixed(1)}h
                      </span>
                      <span className="text-slate-600">
                        Non-Billable: {(summary?.totalNonBillable ?? 0).toFixed(1)}h
                      </span>
                    </TableCell>
                    {/* Cross-month month block totals */}
                    {isCrossMonth && viewData?.blocks.map(block => (
                      <TableCell key={block.month} className="text-right text-[10px] pr-2" colSpan={2}>
                        {format(new Date(block.month + "-01"), "MMMM")}: {block.weekTotal.toFixed(1)}h
                      </TableCell>
                    ))}
                    <TableCell colSpan={isCrossMonth ? 0 : 3} />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}

          {/* ── Bulk action bar ───────────────────────────────────────────── */}
          {selectedIds.size > 0 && (
            <div className="sticky bottom-0 flex items-center justify-between gap-3 rounded-lg border bg-background/95 backdrop-blur px-4 py-2.5 shadow-lg">
              <div className="flex items-center gap-2 text-sm">
                <CheckSquare className="h-4 w-4 text-indigo-600" />
                <span className="font-medium">{selectedIds.size} selected</span>
              </div>
              <div className="flex items-center gap-2">
                {selectedSubmittedIds.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleBulkRecall} disabled={recalling}>
                    {recalling && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                    Recall Selected
                  </Button>
                )}
                <Button size="sm" onClick={handleBulkSubmit} disabled={submitting}>
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                  Submit Selected
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                  Clear
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar summary panel ─────────────────────────────────────────── */}
        {sidebarOpen && (
          <aside className="w-64 shrink-0 border-l bg-muted/20 p-4 flex flex-col gap-4 overflow-auto">
            <h3 className="text-sm font-semibold text-foreground">Week Summary</h3>

            <div className="space-y-2 text-sm">
              <SummaryRow label="Total hours" value={`${weekTotal.toFixed(1)}h`} />
              <SummaryRow
                label="Billable"
                value={`${(summary?.totalBillable ?? 0).toFixed(1)}h`}
                className="text-emerald-700 font-medium"
              />
              <SummaryRow
                label="Non-Billable"
                value={`${(summary?.totalNonBillable ?? 0).toFixed(1)}h`}
              />
              <SummaryRow
                label="Utilization"
                value={`${Math.round(summary?.utilizationRate ?? 0)}%`}
                className={cn(
                  (summary?.utilizationRate ?? 0) >= 80 ? "text-emerald-700" :
                  (summary?.utilizationRate ?? 0) >= 60 ? "text-amber-600" : "text-red-600",
                  "font-semibold",
                )}
              />
            </div>

            {/* Exceptional entries */}
            {exceptionalCount > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>{exceptionalCount} exceptional entr{exceptionalCount === 1 ? "y" : "ies"} this week</span>
              </div>
            )}

            {/* Status legend */}
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground w-full">
                Status Legend
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-1.5">
                {Object.entries(STATUS_DOT).map(([status, cls]) => (
                  <div key={status} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={cn("h-2 w-2 rounded-full flex-shrink-0", cls)} />
                    {status}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </aside>
        )}
      </div>

      {/* ── Slide-over: TimeEntryForm ─────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>{sheetEntryId ? "Edit Time Entry" : "Log Time"}</SheetTitle>
            <SheetDescription>
              {sheetEntryId
                ? "Update this entry. Changes are saved immediately."
                : "Fill in the details for this time entry."}
            </SheetDescription>
          </SheetHeader>
          {sheetOpen && (
            <TimeEntryForm
              entryId={sheetEntryId}
              prefill={sheetPrefill ? { ...sheetPrefill, resourceId } : undefined}
              onSuccess={handleSheetSuccess}
              onCancel={() => setSheetOpen(false)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* ── Copy previous week result dialog ─────────────────────────────────── */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Week Copied</DialogTitle>
            <DialogDescription>
              {copyResult?.created ?? 0} entr{(copyResult?.created ?? 0) === 1 ? "y" : "ies"} created
              {copyResult?.skipped ? ` · ${copyResult.skipped} skipped (closed projects)` : ""}.
              Review and submit when ready.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowCopyDialog(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── FR-416.2 Replication confirmation ────────────────────────────────── */}
      <Dialog open={showReplicationConfirm} onOpenChange={setShowReplicationConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Replicated Time</DialogTitle>
            <DialogDescription>
              Your selection includes replicated entries. Please confirm all hours, projects, and
              tasks are accurate for the current week before submitting.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowReplicationConfirm(false)}>Cancel</Button>
            <Button onClick={handleReplicationConfirm} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              I Confirm — Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Summary row helper ───────────────────────────────────────────────────────

function SummaryRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums", className)}>{value}</span>
    </div>
  );
}
