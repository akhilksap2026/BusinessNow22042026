import { useState, useEffect, useRef, useCallback } from "react";
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
import { ChevronLeft, ChevronRight, AlertCircle, Plus, Undo2, Clock, X, Lock, Umbrella, Star } from "lucide-react";
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
      const r = await fetch(`/api/timesheet-rows?userId=${userId}`);
      return r.json() as Promise<any[]>;
    },
  });

  // Time settings (for min-hours warning)
  const { data: timeSettings } = useQuery({
    queryKey: ["time-settings"],
    queryFn: async () => { const r = await fetch("/api/time-settings"); return r.json(); },
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

  const deleteRowMutation = useMutation({
    mutationFn: async (rowId: number) => { await fetch(`/api/timesheet-rows/${rowId}`, { method: "DELETE" }); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROWS_QK }),
  });

  const addRowMutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch("/api/timesheet-rows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
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
    const k = rowKey(entry.projectId, entry.taskId, (entry as any).activityName, entry.description);
    if (!entryRowMap[k]) {
      entryRowMap[k] = {
        key: k,
        projectId: entry.projectId ?? null,
        taskId: entry.taskId ?? null,
        activityName: (entry as any).activityName ?? undefined,
        description: entry.description ?? undefined,
        billable: entry.billable,
        categoryId: (entry as any).categoryId ?? null,
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

  // ─── Totals ──────────────────────────────────────────────────────────────────

  const dailyTotals = allWeekDays.map(day => {
    const dayStr = format(day, "yyyy-MM-dd");
    return rows.reduce((sum, row) => sum + (row.days[dayStr] || 0), 0);
  });
  const grandTotal = dailyTotals.reduce((s, v) => s + v, 0);

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const getProjectName = (id?: number | null) => projects?.find(p => p.id === id)?.name;
  const getTaskName = (id?: number | null) => allTasks?.find(t => t.id === id)?.name;
  const getCategoryName = (id?: number | null) => timeCategories?.find(c => c.id === id)?.name;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTimeEntrySummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListTimesheetsQueryKey() });
  }, [queryClient]);

  // ─── Cell editing ─────────────────────────────────────────────────────────────

  async function handleCellSave(row: TimesheetRow, dayStr: string, rawValue: string) {
    const newHours = parseFloat(rawValue) || 0;
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
        };
        if (row.projectId) payload.projectId = row.projectId;
        if (row.taskId) payload.taskId = row.taskId;
        if (row.activityName) payload.activityName = row.activityName;
        await createTimeEntry.mutateAsync({ data: payload });
      }
      invalidate();
    } catch {
      toast({ title: "Failed to update hours", variant: "destructive" });
    }
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
  const hoursShort = minHours > 0 ? Math.max(0, minHours - grandTotal) : 0;

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

  const onApprove = async (id: number) => {
    try {
      await approveTimesheet.mutateAsync({ id, data: {} });
      queryClient.invalidateQueries({ queryKey: getListTimesheetsQueryKey() });
      toast({ title: "Timesheet approved" });
    } catch { toast({ title: "Error approving", variant: "destructive" }); }
  };

  const onReject = async () => {
    if (!rejectTimesheetId) return;
    try {
      await rejectTimesheetMutation.mutateAsync({ id: rejectTimesheetId, data: { rejectionNote: rejectNote } });
      queryClient.invalidateQueries({ queryKey: getListTimesheetsQueryKey() });
      setRejectTimesheetId(null); setRejectNote("");
      toast({ title: "Timesheet rejected" });
    } catch { toast({ title: "Error rejecting", variant: "destructive" }); }
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
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-10">
                    No rows yet. Click "Add Activity" to add a task or non-project activity.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const rowTotal = allWeekDays.reduce((sum, day) => {
                    const dayStr = format(day, "yyyy-MM-dd");
                    return sum + (row.days[dayStr] || 0);
                  }, 0);
                  const taskName = row.taskId ? getTaskName(row.taskId) : null;
                  const categoryName = row.categoryId ? getCategoryName(row.categoryId) : null;
                  return (
                    <TableRow key={row.key} className="hover:bg-muted/10 group">
                      <TableCell className="py-2 align-middle">
                        <div className="flex items-start gap-1.5">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate max-w-[180px]">
                              {row.isNonProject
                                ? <span className="text-slate-500 italic">{row.activityName || "Non-project activity"}</span>
                                : getProjectName(row.projectId) ?? <span className="text-muted-foreground">Unknown project</span>
                              }
                            </div>
                            {!row.isNonProject && taskName && (
                              <div className="text-xs text-muted-foreground truncate max-w-[180px] mt-0.5">{taskName}</div>
                            )}
                            {row.description && !taskName && !row.isNonProject && (
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
                          </div>
                          {/* Per-row clock icon */}
                          {!isLocked && (
                            <button
                              title="Log time for this row"
                              onClick={() => openLogForRow(row)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-indigo-50 text-muted-foreground hover:text-indigo-600 transition-all shrink-0"
                            >
                              <Clock className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </TableCell>

                      {allWeekDays.map(day => {
                        const dayStr = format(day, "yyyy-MM-dd");
                        const hours = row.days[dayStr] || 0;
                        const multiEntry = (row.entryIds[dayStr]?.length ?? 0) > 1;
                        const isEditing = editingCell?.rowKey === row.key && editingCell?.dayStr === dayStr;
                        const canClick = !isLocked && !multiEntry;
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
                                onClick={() => startEdit(row, dayStr)}
                                title={multiEntry ? "Multiple entries — use clock icon to add more" : isLocked ? "Timesheet is locked" : "Click to edit · Tab to advance"}
                                className={cn(
                                  "w-full min-h-[32px] px-1 rounded text-sm font-medium transition-colors",
                                  canClick && "hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer dark:hover:bg-indigo-900/20",
                                  !canClick && "cursor-default",
                                  hours > 0 && "text-foreground",
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
                {submittedTimesheets.map(ts => (
                  <TableRow key={ts.id}>
                    <TableCell className="font-medium">{users?.find(u => u.id === ts.userId)?.name}</TableCell>
                    <TableCell>{ts.weekStart}</TableCell>
                    <TableCell>{ts.totalHours}h <span className="text-muted-foreground text-xs">({ts.billableHours}h billable)</span></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{ts.submittedAt ? new Date(ts.submittedAt).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => setRejectTimesheetId(ts.id)}>Reject</Button>
                      <Button size="sm" onClick={() => onApprove(ts.id)} disabled={approveTimesheet.isPending}>Approve</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Approved Timesheets Section */}
      {approvedTimesheets && approvedTimesheets.length > 0 && (
        <div className="mt-4 space-y-3">
          <h3 className="text-base font-semibold">Approved Timesheets</h3>
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
        </div>
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
                        {projectTasks?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
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
                      {allTasks?.filter(t => t.projectId === Number(activityForm.projectId)).map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
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

      {/* Reject Dialog */}
      <Dialog open={!!rejectTimesheetId} onOpenChange={(o) => !o && setRejectTimesheetId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Timesheet</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Rejection Reason <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Please explain why this timesheet was rejected..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTimesheetId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={onReject} disabled={rejectTimesheetMutation.isPending}>Reject Timesheet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
