import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCurrentUser } from "@/contexts/current-user";
import { authHeaders } from "@/lib/auth-headers";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { TimesheetGrid } from "@/components/time/TimesheetGrid";
import { DescriptionPanel, type ActiveCellInfo } from "@/components/time/DescriptionPanel";
import { ExceptionalPanel, type ExceptionalRow } from "@/components/time/ExceptionalPanel";
import { RejectionBanner } from "@/components/time/RejectionBanner";
import type {
  GridRow,
  AssignedProject,
  AssignedTask,
  LeaveType,
} from "@/components/time/TimesheetRow";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type PageStatus = "Empty" | "Draft" | "Submitted" | "Approved" | "Rejected" | "Mixed";

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function getMondayOf(dateStr?: string): string {
  let d: Date;
  if (dateStr) {
    d = new Date(`${dateStr}T00:00:00Z`);
  } else {
    const now = new Date();
    d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addWeeks(ws: string, n: number): string {
  const d = new Date(`${ws}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n * 7);
  return d.toISOString().slice(0, 10);
}

function getWeekDates(ws: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${ws}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function formatWeekLabel(ws: string): string {
  const start = new Date(`${ws}T00:00:00Z`);
  const end = new Date(`${ws}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", timeZone: "UTC" };
  const optsY: Intl.DateTimeFormatOptions = { ...opts, year: "numeric" };
  return `${start.toLocaleDateString("en-GB", opts)} – ${end.toLocaleDateString("en-GB", optsY)}`;
}

function makeNewRow(): GridRow {
  return {
    rowKey: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    projectId: null,
    projectName: "",
    taskId: null,
    taskName: "",
    leaveTypeId: null,
    isLeave: false,
    billableCategory: "Billable",
    hours: {},
    entryIds: {},
    statuses: {},
    narratives: {},
    isExceptional: false,
    exceptionalJustification: "",
    budgetHours: null,
  };
}

function entriesToRows(entries: any[]): GridRow[] {
  const map = new Map<string, GridRow>();
  for (const e of entries) {
    const key = e.isLeave
      ? `leave-${e.leaveTypeId ?? "x"}-p${e.projectId}`
      : `proj-${e.projectId}-task-${e.taskId}`;
    if (!map.has(key)) {
      map.set(key, {
        rowKey: key,
        projectId: e.projectId,
        projectName: "",
        taskId: e.isLeave ? null : e.taskId,
        taskName: "",
        leaveTypeId: e.leaveTypeId ?? null,
        isLeave: Boolean(e.isLeave),
        billableCategory: e.billableCategory ?? "Billable",
        hours: {},
        entryIds: {},
        statuses: {},
        narratives: {},
        isExceptional: Boolean(e.isExceptional),
        exceptionalJustification: e.exceptionalJustification ?? "",
        budgetHours: null,
      });
    }
    const row = map.get(key)!;
    const date: string = e.entryDate;
    row.hours[date] = (row.hours[date] ?? 0) + Number(e.durationHours);
    row.entryIds[date] = e.id;
    row.statuses[date] = e.status;
    if (e.narrative) row.narratives[date] = e.narrative;
    if (e.isExceptional) row.isExceptional = true;
    if (e.exceptionalJustification && !row.exceptionalJustification)
      row.exceptionalJustification = e.exceptionalJustification;
  }
  return Array.from(map.values());
}

function derivePageStatus(rows: GridRow[], weekDates: string[]): PageStatus {
  const statuses: string[] = [];
  for (const row of rows) {
    for (const date of weekDates) {
      if ((row.hours[date] ?? 0) > 0 && row.statuses[date]) {
        statuses.push(row.statuses[date]);
      }
    }
  }
  if (statuses.length === 0) return "Empty";
  const uniq = new Set(statuses);
  if (uniq.size === 1) {
    const s = [...uniq][0];
    if (["Draft", "Submitted", "Approved", "Rejected"].includes(s)) return s as PageStatus;
  }
  if (statuses.some((s) => s === "Rejected")) return "Rejected";
  return "Mixed";
}

function lsKey(userId: number, ws: string) {
  return `bns_timesheet_${userId}_${ws}`;
}

const PAGE_STATUS_BADGE: Record<PageStatus, string> = {
  Empty: "Not Started",
  Draft: "Draft",
  Submitted: "Submitted",
  Approved: "Approved",
  Rejected: "Rejected",
  Mixed: "Mixed",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MyTimesheet() {
  const { currentUser } = useCurrentUser();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const today = todayUTC();
  const currentMonday = getMondayOf();

  const [weekStart, setWeekStart] = useState<string>(currentMonday);
  const weekDates = getWeekDates(weekStart);

  const [gridRows, setGridRows] = useState<GridRow[]>([makeNewRow()]);
  const [projects, setProjects] = useState<AssignedProject[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [tasksByProject, setTasksByProject] = useState<Record<number, AssignedTask[]>>({});
  const fetchedProjectIds = useRef<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeCell, setActiveCell] = useState<ActiveCellInfo | null>(null);
  const [recallOpen, setRecallOpen] = useState(false);
  const [hasRejectedPriorWeek, setHasRejectedPriorWeek] = useState(false);
  const [priorWeekStart, setPriorWeekStart] = useState<string>("");
  const [storedDraftTs, setStoredDraftTs] = useState<string | null>(null);

  const userId = currentUser?.id ?? 0;

  // ─── Fetch projects + leave types once ──────────────────────────────────────

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      fetch(`/api/time/assigned-projects?resourceId=${userId}`, { headers: authHeaders() }).then((r) => r.json()),
      fetch(`/api/time/leave-types`, { headers: authHeaders() }).then((r) => r.json()),
    ]).then(([proj, leave]) => {
      setProjects(proj.data ?? []);
      setLeaveTypes(leave.data ?? []);
    }).catch(() => {});
  }, [userId]);

  // ─── Fetch tasks lazily per project ─────────────────────────────────────────

  const fetchTasks = useCallback(async (projectId: number) => {
    if (!projectId || fetchedProjectIds.current.has(projectId)) return;
    fetchedProjectIds.current.add(projectId);
    try {
      const r = await fetch(
        `/api/time/assigned-tasks/${projectId}?resourceId=${userId}`,
        { headers: authHeaders() },
      );
      const data = await r.json();
      setTasksByProject((prev) => ({ ...prev, [projectId]: data.data ?? [] }));
    } catch {
      fetchedProjectIds.current.delete(projectId);
    }
  }, [userId]);

  // ─── Fetch entries for the current week ─────────────────────────────────────

  const fetchWeekData = useCallback(async (ws: string, uid: number) => {
    if (!uid) return;
    setIsLoading(true);
    try {
      const r = await fetch(
        `/api/time/entries?resourceId=${uid}&weekStart=${ws}`,
        { headers: authHeaders() },
      );
      const { data: entries = [] } = await r.json();
      const rows = entriesToRows(entries);
      if (rows.length === 0) rows.push(makeNewRow());
      setGridRows(rows);

      // Prefetch task names for all projects in the loaded entries
      const projectIds = [...new Set(rows.filter((r) => r.projectId && !r.isLeave).map((r) => r.projectId!))];
      for (const pid of projectIds) {
        fetchTasks(pid);
      }

      // Check prior week for rejected entries
      const priorWs = addWeeks(ws, -1);
      setPriorWeekStart(priorWs);
      const rPrior = await fetch(
        `/api/time/entries?resourceId=${uid}&weekStart=${priorWs}`,
        { headers: authHeaders() },
      );
      const { data: priorEntries = [] } = await rPrior.json();
      const hasRejected = priorEntries.some((e: any) => e.status === "Rejected");
      setHasRejectedPriorWeek(hasRejected);
    } catch {
      toast({ title: "Failed to load timesheet data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [fetchTasks, toast]);

  useEffect(() => {
    if (!userId) return;
    fetchWeekData(weekStart, userId);

    // Check localStorage for stored draft
    const key = lsKey(userId, weekStart);
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setStoredDraftTs(parsed._savedAt ?? null);
      } catch {}
    } else {
      setStoredDraftTs(null);
    }
  }, [weekStart, userId]);

  // ─── Populate project/task names after projects/tasks are loaded ─────────────

  useEffect(() => {
    setGridRows((prev) =>
      prev.map((row) => {
        const updated = { ...row };
        if (row.projectId && !row.isLeave) {
          const proj = projects.find((p) => p.id === row.projectId);
          if (proj) updated.projectName = proj.name;
          const tasks = tasksByProject[row.projectId];
          if (tasks && row.taskId) {
            const task = tasks.find((t) => t.id === row.taskId);
            if (task) {
              updated.taskName = task.name;
              updated.budgetHours = task.budgetHours ?? null;
            }
          }
        } else if (row.isLeave && row.leaveTypeId) {
          const lt = leaveTypes.find((l) => l.id === row.leaveTypeId);
          if (lt) {
            updated.taskName = lt.name;
            updated.projectName = "Leave";
          }
        }
        return updated;
      }),
    );
  }, [projects, tasksByProject, leaveTypes]);

  // ─── Page status ────────────────────────────────────────────────────────────

  const pageStatus: PageStatus = derivePageStatus(gridRows, weekDates);
  const isReadOnly = pageStatus === "Submitted" || pageStatus === "Approved";

  // ─── Week navigation ────────────────────────────────────────────────────────

  const currentWeekHasDraft = gridRows.some((row) =>
    weekDates.some((d) => row.statuses[d] === "Draft" && (row.hours[d] ?? 0) > 0),
  );
  const nextWeekStart = addWeeks(weekStart, 1);
  const isNextDisabled = currentWeekHasDraft || nextWeekStart > addWeeks(currentMonday, 1);

  const handlePrevWeek = () => setWeekStart((ws) => addWeeks(ws, -1));
  const handleNextWeek = () => { if (!isNextDisabled) setWeekStart((ws) => addWeeks(ws, 1)); };
  const handleCurrentWeek = () => setWeekStart(currentMonday);

  // ─── Grid callbacks ──────────────────────────────────────────────────────────

  const handleCellChange = useCallback((rowKey: string, date: string, hours: number) => {
    setGridRows((prev) =>
      prev.map((r) => {
        if (r.rowKey !== rowKey) return r;
        const updatedHours = { ...r.hours, [date]: hours };
        const rowTotal = Object.values(updatedHours).reduce((s, h) => s + h, 0);
        // B3: auto-flag exceptional when row total exceeds task budget
        const isExceptional = r.budgetHours !== null && r.budgetHours > 0 && rowTotal > r.budgetHours;
        return { ...r, hours: updatedHours, isExceptional };
      }),
    );
    // Auto-save to localStorage
    if (userId) {
      setGridRows((current) => {
        const key = lsKey(userId, weekStart);
        try {
          localStorage.setItem(key, JSON.stringify({ _savedAt: new Date().toISOString(), rows: current }));
        } catch {}
        return current;
      });
    }
  }, [userId, weekStart]);

  const handleCellFocus = useCallback((rowKey: string, date: string) => {
    const row = gridRows.find((r) => r.rowKey === rowKey);
    if (!row) return;
    setActiveCell({
      rowKey,
      date,
      projectName: row.isLeave ? "Leave" : row.projectName || "Project",
      taskName: row.taskName || "Task",
      narrativeRequired: false,
    });
  }, [gridRows]);

  const handleProjectChange = useCallback((rowKey: string, projectId: number | null, isLeave: boolean) => {
    setGridRows((prev) =>
      prev.map((r) => {
        if (r.rowKey !== rowKey) return r;
        const proj = projects.find((p) => p.id === projectId);
        return {
          ...r,
          projectId,
          projectName: proj?.name ?? (isLeave ? "Leave" : ""),
          isLeave,
          taskId: null,
          taskName: "",
          leaveTypeId: null,
          hours: {},
          billableCategory: "Billable",
        };
      }),
    );
    if (activeCell?.rowKey === rowKey) setActiveCell(null);
  }, [projects, activeCell]);

  const handleTaskChange = useCallback(
    (rowKey: string, taskId: number | null, leaveTypeId: number | null, billCat: string, taskName: string, budgetHours: number | null) => {
      setGridRows((prev) =>
        prev.map((r) =>
          r.rowKey === rowKey
            ? {
                ...r,
                taskId,
                taskName,
                leaveTypeId,
                billableCategory: billCat as "Billable" | "Non-Billable",
                budgetHours,
              }
            : r,
        ),
      );
    },
    [],
  );

  const handleDeleteRow = useCallback(async (rowKey: string) => {
    const row = gridRows.find((r) => r.rowKey === rowKey);
    if (!row) return;
    // Delete any persisted entries for this row
    const ids = Object.values(row.entryIds).filter(Boolean);
    for (const id of ids) {
      await fetch(`/api/time/entries/${id}`, { method: "DELETE", headers: authHeaders() }).catch(() => {});
    }
    setGridRows((prev) => {
      const updated = prev.filter((r) => r.rowKey !== rowKey);
      return updated.length === 0 ? [makeNewRow()] : updated;
    });
    if (activeCell?.rowKey === rowKey) setActiveCell(null);
  }, [gridRows, activeCell]);

  const handleAddRow = useCallback(() => {
    setGridRows((prev) => [...prev, makeNewRow()]);
  }, []);

  const handleDescriptionChange = useCallback((val: string) => {
    if (!activeCell) return;
    const { rowKey, date } = activeCell;
    setGridRows((prev) =>
      prev.map((r) =>
        r.rowKey === rowKey
          ? { ...r, narratives: { ...r.narratives, [date]: val } }
          : r,
      ),
    );
  }, [activeCell]);

  const handleJustificationChange = useCallback((rowKey: string, val: string) => {
    setGridRows((prev) =>
      prev.map((r) => (r.rowKey === rowKey ? { ...r, exceptionalJustification: val } : r)),
    );
  }, []);

  // ─── Save Draft ──────────────────────────────────────────────────────────────

  const handleSaveDraft = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    let savedCount = 0;
    let errorCount = 0;
    const updatedRows = gridRows.map((r) => ({ ...r, entryIds: { ...r.entryIds }, statuses: { ...r.statuses } }));

    for (const row of updatedRows) {
      if (!row.projectId && !row.isLeave) continue;
      for (const date of weekDates) {
        const hours = row.hours[date] ?? 0;
        const entryId = row.entryIds[date];
        try {
          if (hours > 0) {
            const body = {
              resourceId: userId,
              projectId: row.projectId,
              taskId: row.isLeave ? null : row.taskId,
              leaveTypeId: row.leaveTypeId,
              isLeave: row.isLeave,
              entryDate: date,
              durationHours: hours,
              narrative: row.narratives[date] ?? null,
              billableCategory: row.billableCategory,
              exceptionalJustification: row.exceptionalJustification || null,
            };
            if (entryId) {
              const r = await fetch(`/api/time/entries/${entryId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify(body),
              });
              if (r.ok) savedCount++;
              else errorCount++;
            } else {
              const r = await fetch(`/api/time/entries`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify(body),
              });
              if (r.ok) {
                const newEntry = await r.json();
                row.entryIds[date] = newEntry.id;
                row.statuses[date] = newEntry.status;
                savedCount++;
              } else {
                errorCount++;
              }
            }
          } else if (entryId) {
            const r = await fetch(`/api/time/entries/${entryId}`, {
              method: "DELETE",
              headers: authHeaders(),
            });
            if (r.ok || r.status === 204 || r.status === 404) {
              delete row.entryIds[date];
              delete row.statuses[date];
              savedCount++;
            }
          }
        } catch {
          errorCount++;
        }
      }
    }

    setGridRows(updatedRows);
    setIsSaving(false);
    localStorage.removeItem(lsKey(userId, weekStart));
    setStoredDraftTs(null);

    if (errorCount === 0) {
      toast({ title: "Draft saved." });
    } else {
      toast({
        title: `${savedCount} saved, ${errorCount} need correction.`,
        variant: "destructive",
      });
    }
    return errorCount === 0;
  }, [gridRows, weekDates, userId, weekStart, toast]);

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    // V-12: total hours > 0
    const total = gridRows.reduce((s, r) => s + Object.values(r.hours).reduce((a, b) => a + b, 0), 0);
    if (total === 0) { toast({ title: "Enter some hours before submitting.", variant: "destructive" }); return; }

    // V-04: no day > 24
    for (const date of weekDates) {
      const dayTotal = gridRows.reduce((s, r) => s + (r.hours[date] ?? 0), 0);
      if (dayTotal > 24) { toast({ title: `Day total on ${date} exceeds 24 hours.`, variant: "destructive" }); return; }
    }

    // V-06: exceptional justification required
    const missing = gridRows.filter((r) => r.isExceptional && r.exceptionalJustification.trim().length < 10);
    if (missing.length > 0) { toast({ title: "Fill justification for all exceptional entries (min 10 chars).", variant: "destructive" }); return; }

    // V-13: prior week draft check
    if (hasRejectedPriorWeek) { toast({ title: "Fix rejected entries from last week before submitting.", variant: "destructive" }); return; }

    const saved = await handleSaveDraft();
    if (!saved) return;

    const allIds: number[] = [];
    for (const row of gridRows) {
      for (const date of weekDates) {
        const id = row.entryIds[date];
        if (id && (row.hours[date] ?? 0) > 0) allIds.push(id);
      }
    }
    if (allIds.length === 0) { toast({ title: "No entries to submit.", variant: "destructive" }); return; }

    try {
      const r = await fetch(`/api/time/entries/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ entryIds: allIds }),
      });
      if (r.ok) {
        toast({ title: "Timesheet submitted for approval." });
        fetchWeekData(weekStart, userId);
      } else {
        const err = await r.json();
        toast({ title: err.error?.message ?? "Submission failed.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Submission failed.", variant: "destructive" });
    }
  }, [gridRows, weekDates, hasRejectedPriorWeek, handleSaveDraft, weekStart, userId, fetchWeekData, toast]);

  // ─── Recall ──────────────────────────────────────────────────────────────────

  const handleRecall = useCallback(async () => {
    let anyId: number | null = null;
    for (const row of gridRows) {
      for (const date of weekDates) {
        if (row.statuses[date] === "Submitted" && row.entryIds[date]) {
          anyId = row.entryIds[date];
          break;
        }
      }
      if (anyId) break;
    }
    if (!anyId) { toast({ title: "No submitted entries to recall.", variant: "destructive" }); return; }
    try {
      const r = await fetch(`/api/time/entries/${anyId}/recall`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (r.ok) {
        toast({ title: "Timesheet recalled. You can now edit it." });
        setRecallOpen(false);
        fetchWeekData(weekStart, userId);
      } else {
        const err = await r.json();
        toast({ title: err.error?.message ?? "Recall failed.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Recall failed.", variant: "destructive" });
    }
  }, [gridRows, weekDates, weekStart, userId, fetchWeekData, toast]);

  // ─── Restore from localStorage ───────────────────────────────────────────────

  const handleRestoreDraft = () => {
    const key = lsKey(userId, weekStart);
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? "");
      if (stored.rows) setGridRows(stored.rows);
    } catch {}
    setStoredDraftTs(null);
  };

  const handleDismissDraft = () => {
    localStorage.removeItem(lsKey(userId, weekStart));
    setStoredDraftTs(null);
  };

  // ─── Computed values ─────────────────────────────────────────────────────────

  const activeDescription = activeCell
    ? gridRows.find((r) => r.rowKey === activeCell.rowKey)?.narratives[activeCell.date] ?? ""
    : "";

  const exceptionalRows: ExceptionalRow[] = gridRows
    .filter((r) => r.isExceptional)
    .map((r) => ({
      rowKey: r.rowKey,
      projectName: r.projectName || "Project",
      taskName: r.taskName || "Task",
      budgetHours: r.budgetHours,
      enteredHours: Object.values(r.hours).reduce((a, b) => a + b, 0),
      justification: r.exceptionalJustification,
    }));

  const summary = {
    total: gridRows.reduce((s, r) => s + Object.values(r.hours).reduce((a, b) => a + b, 0), 0),
    billable: gridRows.filter((r) => r.billableCategory === "Billable" && !r.isLeave).reduce((s, r) => s + Object.values(r.hours).reduce((a, b) => a + b, 0), 0),
    leave: gridRows.filter((r) => r.isLeave).reduce((s, r) => s + Object.values(r.hours).reduce((a, b) => a + b, 0), 0),
    nonBillable: 0,
    utilization: 0,
    exceptionalCount: exceptionalRows.length,
  };
  summary.nonBillable = summary.total - summary.billable - summary.leave;
  summary.utilization = Math.round((summary.billable / 40) * 100);

  const canSubmit =
    pageStatus !== "Submitted" &&
    pageStatus !== "Approved" &&
    summary.total > 0 &&
    exceptionalRows.every((r) => r.justification.trim().length >= 10);

  const submitTooltip = !canSubmit
    ? summary.total === 0
      ? "Enter hours first"
      : exceptionalRows.some((r) => r.justification.trim().length < 10)
      ? "Fill justification for all exceptional entries"
      : undefined
    : undefined;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="flex flex-col gap-4 p-6 pb-24 max-w-[1400px] mx-auto">

        {/* ── Header ── */}
        <PageHeader
          title="My Timesheet"
          breadcrumbs={[{ label: "Time Tracking", href: "/time" }, { label: "My Timesheet" }]}
          actions={
            <StatusBadge status={PAGE_STATUS_BADGE[pageStatus]} />
          }
        />

        {/* ── User + proxy info ── */}
        <div className="text-sm text-muted-foreground">
          Timesheet for: <span className="font-medium text-foreground">{currentUser?.name ?? "—"}</span>
        </div>

        {/* ── Week navigator ── */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevWeek} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[220px] text-center">
            {formatWeekLabel(weekStart)}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleNextWeek}
                  disabled={isNextDisabled}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </span>
            </TooltipTrigger>
            {isNextDisabled && (
              <TooltipContent>
                {currentWeekHasDraft
                  ? `Submit ${formatWeekLabel(weekStart)} first`
                  : "Cannot navigate beyond next week"}
              </TooltipContent>
            )}
          </Tooltip>
          {weekStart !== currentMonday && (
            <Button variant="link" size="sm" className="h-8 text-xs" onClick={handleCurrentWeek}>
              Current
            </Button>
          )}
        </div>

        {/* ── Stored draft banner ── */}
        {storedDraftTs && (
          <div className="flex items-center gap-3 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 dark:border-blue-700 dark:bg-blue-950/30">
            <Clock className="h-4 w-4 text-blue-500 shrink-0" />
            <p className="flex-1 text-sm text-blue-800 dark:text-blue-300">
              You have unsaved changes from{" "}
              {new Date(storedDraftTs).toLocaleString()}.
            </p>
            <Button size="sm" variant="outline" onClick={handleRestoreDraft} className="border-blue-400 text-blue-800">
              Restore
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismissDraft} className="text-muted-foreground">
              Dismiss
            </Button>
          </div>
        )}

        {/* ── Rejection banner ── */}
        {hasRejectedPriorWeek && (
          <RejectionBanner
            priorWeekRange={formatWeekLabel(priorWeekStart)}
            onFix={() => setWeekStart(priorWeekStart)}
          />
        )}

        {/* ── Summary bar ── */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm">
          <span>Total: <span className="font-semibold">{summary.total.toFixed(1)} hrs</span></span>
          <span className="text-muted-foreground">|</span>
          <span>Billable: <span className="font-semibold">{summary.billable.toFixed(1)}</span></span>
          <span className="text-muted-foreground">|</span>
          <span>Non-Billable: <span className="font-semibold">{summary.nonBillable.toFixed(1)}</span></span>
          <span className="text-muted-foreground">|</span>
          <span>Leave: <span className="font-semibold">{summary.leave.toFixed(1)}</span></span>
          <span className="text-muted-foreground">|</span>
          <span>Utilization: <span className="font-semibold">{summary.utilization}%</span></span>
          {summary.exceptionalCount > 0 && (
            <>
              <span className="text-muted-foreground">|</span>
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                {summary.exceptionalCount} exceptional {summary.exceptionalCount === 1 ? "entry" : "entries"} — justification required
              </span>
            </>
          )}
        </div>

        {/* ── Grid ── */}
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 animate-spin mr-2" />
            Loading timesheet…
          </div>
        ) : (
          <TimesheetGrid
            rows={gridRows}
            weekDates={weekDates}
            today={today}
            projects={projects}
            tasksByProject={tasksByProject}
            leaveTypes={leaveTypes}
            activeCell={activeCell ? { rowKey: activeCell.rowKey, date: activeCell.date } : null}
            isReadOnly={isReadOnly}
            onCellChange={handleCellChange}
            onCellFocus={handleCellFocus}
            onProjectChange={handleProjectChange}
            onTaskChange={handleTaskChange}
            onDeleteRow={handleDeleteRow}
            onAddRow={handleAddRow}
            onFetchTasks={fetchTasks}
          />
        )}

        {/* ── Description panel ── */}
        <DescriptionPanel
          activeCell={activeCell}
          value={activeDescription}
          onChange={handleDescriptionChange}
        />

        {/* ── Exceptional panel ── */}
        {exceptionalRows.length > 0 && (
          <ExceptionalPanel
            rows={exceptionalRows}
            onJustificationChange={handleJustificationChange}
          />
        )}

        {/* ── Approved banner ── */}
        {pageStatus === "Approved" && (
          <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-3 dark:border-green-700 dark:bg-green-950/30">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              Approved — This timesheet has been approved and is locked.
            </p>
          </div>
        )}

        {/* ── Recall dialog ── */}
        <Dialog open={recallOpen} onOpenChange={setRecallOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Recall Timesheet</DialogTitle>
              <DialogDescription>
                This will move your timesheet back to Draft and your approver will be notified.
                You can then make changes and resubmit.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRecallOpen(false)}>Cancel</Button>
              <Button onClick={handleRecall}>Recall</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Sticky action bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center justify-between gap-3 px-6 py-3 max-w-[1400px] mx-auto">
          <div className="text-sm text-muted-foreground">
            {pageStatus === "Submitted" && "Your timesheet is with your approver. Recall to make changes."}
            {pageStatus === "Rejected" && "Some entries need correction. Edit the highlighted rows and resubmit."}
            {pageStatus === "Mixed" && "You have a mix of draft and submitted entries this week."}
          </div>

          <div className="flex items-center gap-2">
            {(pageStatus === "Empty" || pageStatus === "Draft" || pageStatus === "Rejected" || pageStatus === "Mixed") && (
              <>
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className="gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Draft
                </Button>
                {pageStatus !== "Rejected" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          onClick={handleSubmit}
                          disabled={!canSubmit || isSaving}
                          className="gap-1.5"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Submit
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {submitTooltip && <TooltipContent>{submitTooltip}</TooltipContent>}
                  </Tooltip>
                )}
                {pageStatus === "Rejected" && (
                  <Button onClick={handleSubmit} disabled={!canSubmit || isSaving} className="gap-1.5">
                    <Send className="h-3.5 w-3.5" />
                    Fix &amp; Resubmit
                  </Button>
                )}
              </>
            )}

            {pageStatus === "Submitted" && (
              <Button
                variant="outline"
                onClick={() => {
                  // C4: block recall if approver has already acted
                  const acted = gridRows.some((r) =>
                    weekDates.some((d) => r.statuses[d] === "Approved" || r.statuses[d] === "Rejected"),
                  );
                  if (acted) {
                    toast({ title: "Cannot recall: your approver has already acted on one or more entries.", variant: "destructive" });
                    return;
                  }
                  setRecallOpen(true);
                }}
                className="gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Recall Timesheet
              </Button>
            )}

            {pageStatus === "Mixed" && (
              <Button
                variant="outline"
                onClick={() => {
                  const acted = gridRows.some((r) =>
                    weekDates.some((d) => r.statuses[d] === "Approved" || r.statuses[d] === "Rejected"),
                  );
                  if (acted) {
                    toast({ title: "Cannot recall: your approver has already acted on one or more entries.", variant: "destructive" });
                    return;
                  }
                  setRecallOpen(true);
                }}
                className="gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Recall All
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
