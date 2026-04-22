import { useState, useEffect, useRef } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
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
  getListTimeEntriesQueryKey,
  getGetTimeEntrySummaryQueryKey,
  getListTimesheetsQueryKey,
  getListTasksQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Plus, Undo2 } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";

const logTimeSchema = z.object({
  projectId: z.coerce.number().min(1, "Project is required"),
  taskId: z.coerce.number().optional(),
  categoryId: z.coerce.number().optional(),
  date: z.string().min(1, "Date is required"),
  hours: z.coerce.number().min(0.1, "Hours must be greater than 0"),
  description: z.string().optional(),
  billable: z.boolean(),
});

type EditingCell = { rowKey: string; dayStr: string };

export function TimesheetGrid({ userId }: { userId: number }) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [initialised, setInitialised] = useState(false);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  const { data: allUserTimesheets } = useListTimesheets({ userId }, {
    query: { queryKey: getListTimesheetsQueryKey({ userId }) }
  });
  const { data: allUserEntries } = useListTimeEntries({ userId }, {
    query: { queryKey: getListTimeEntriesQueryKey({ userId }) }
  });

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
    setCurrentWeekStart(startOfWeek(parseISO(latestDate), { weekStartsOn: 1 }));
    setInitialised(true);
  }, [allUserTimesheets, allUserEntries, initialised]);

  const [isLogTimeOpen, setIsLogTimeOpen] = useState(false);
  const [rejectTimesheetId, setRejectTimesheetId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekStartStr = format(currentWeekStart, "yyyy-MM-dd");
  const weekEndStr = format(currentWeekEnd, "yyyy-MM-dd");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: weekTimesheets } = useListTimesheets({ userId, weekStart: weekStartStr }, {
    query: { queryKey: getListTimesheetsQueryKey({ userId, weekStart: weekStartStr }) }
  });
  const timesheet = weekTimesheets?.[0];
  const isLocked = timesheet?.status === "Submitted" || timesheet?.status === "Approved";

  const { data: timeEntries } = useListTimeEntries({ userId, startDate: weekStartStr, endDate: weekEndStr }, {
    query: { queryKey: getListTimeEntriesQueryKey({ userId, startDate: weekStartStr, endDate: weekEndStr }) }
  });

  const { data: projects } = useListProjects();
  const { data: allTasks } = useListTasks({});
  const { data: users } = useListUsers();
  const { data: timeCategories } = useListTimeCategories();
  
  const createTimeEntry = useCreateTimeEntry();
  const updateTimeEntry = useUpdateTimeEntry();
  const deleteTimeEntry = useDeleteTimeEntry();
  const updateTimesheet = useUpdateTimesheet();
  const submitTimesheet = useSubmitTimesheet();
  const approveTimesheet = useApproveTimesheet();
  const rejectTimesheetMutation = useRejectTimesheet();

  const logTimeForm = useForm<z.infer<typeof logTimeSchema>>({
    resolver: zodResolver(logTimeSchema),
    defaultValues: { date: format(new Date(), "yyyy-MM-dd"), hours: 0, billable: true },
  });

  const selectedProjectId = logTimeForm.watch("projectId");
  const { data: projectTasks } = useListTasks({ projectId: selectedProjectId }, {
    query: { enabled: !!selectedProjectId, queryKey: getListTasksQueryKey({ projectId: selectedProjectId }) }
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTimeEntrySummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListTimesheetsQueryKey() });
  };

  const onLogTime = async (values: z.infer<typeof logTimeSchema>) => {
    try {
      await createTimeEntry.mutateAsync({ data: { ...values, userId, description: values.description ?? "" } });
      invalidate();
      setIsLogTimeOpen(false);
      logTimeForm.reset();
      toast({ title: "Time logged" });
    } catch {
      toast({ title: "Error logging time", variant: "destructive" });
    }
  };

  const onSubmitTimesheet = async () => {
    if (!timesheet?.id) return;
    try {
      await submitTimesheet.mutateAsync({ id: timesheet.id });
      invalidate();
      toast({ title: "Timesheet submitted for approval" });
    } catch {
      toast({ title: "Error submitting timesheet", variant: "destructive" });
    }
  };

  const onWithdrawTimesheet = async () => {
    if (!timesheet?.id) return;
    try {
      await updateTimesheet.mutateAsync({ id: timesheet.id, data: { status: "Draft" } as any });
      invalidate();
      toast({ title: "Timesheet withdrawn — now in Draft" });
    } catch {
      toast({ title: "Error withdrawing timesheet", variant: "destructive" });
    }
  };

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

  // Enhanced grouping: track entryIds per day + row-level metadata
  const groupedEntries = (timeEntries || []).reduce((acc: Record<string, any>, entry) => {
    const key = `${entry.projectId}-${entry.taskId ?? 'none'}-${entry.description ?? 'none'}`;
    if (!acc[key]) {
      acc[key] = {
        projectId: entry.projectId,
        taskId: entry.taskId ?? null,
        description: entry.description,
        billable: entry.billable,
        categoryId: (entry as any).categoryId ?? null,
        days: {} as Record<string, number>,
        entryIds: {} as Record<string, number[]>,
      };
    }
    const dayStr = format(parseISO(entry.date), "yyyy-MM-dd");
    acc[key].days[dayStr] = (acc[key].days[dayStr] || 0) + entry.hours;
    if (!acc[key].entryIds[dayStr]) acc[key].entryIds[dayStr] = [];
    acc[key].entryIds[dayStr].push(entry.id);
    return acc;
  }, {});

  const rows = Object.entries(groupedEntries).map(([key, val]) => ({ key, ...(val as any) }));

  // Daily totals
  const dailyTotals = weekDays.map(day => {
    const dayStr = format(day, "yyyy-MM-dd");
    return rows.reduce((sum, row) => sum + (row.days[dayStr] || 0), 0);
  });
  const grandTotal = dailyTotals.reduce((s, v) => s + v, 0);

  const getTaskName = (taskId: number | null) => allTasks?.find(t => t.id === taskId)?.name ?? null;
  const getCategoryName = (cid: number | null) => timeCategories?.find(c => c.id === cid)?.name ?? null;

  async function handleCellSave(row: any, dayStr: string, rawValue: string) {
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
        await createTimeEntry.mutateAsync({ data: {
          projectId: row.projectId,
          taskId: row.taskId ?? undefined,
          userId,
          date: dayStr,
          hours: newHours,
          description: row.description ?? "",
          billable: row.billable ?? true,
          categoryId: row.categoryId ?? undefined,
        } as any });
      }
      invalidate();
    } catch {
      toast({ title: "Failed to update hours", variant: "destructive" });
    }
  }

  function startEdit(row: any, dayStr: string) {
    if (isLocked) return;
    const ids: number[] = row.entryIds[dayStr] || [];
    if (ids.length > 1) return; // multiple entries — can't inline edit
    const hours = row.days[dayStr] || 0;
    setEditingCell({ rowKey: row.key, dayStr });
    setEditValue(hours > 0 ? String(hours) : "");
    setTimeout(() => editInputRef.current?.focus(), 0);
  }

  // Manager approval section
  const { data: submittedTimesheets } = useListTimesheets({ status: "Submitted" });
  const { data: approvedTimesheets } = useListTimesheets({ status: "Approved" });

  const onApprove = async (id: number) => {
    try {
      await approveTimesheet.mutateAsync({ id, data: {} });
      queryClient.invalidateQueries({ queryKey: getListTimesheetsQueryKey() });
      toast({ title: "Timesheet approved" });
    } catch {
      toast({ title: "Error approving", variant: "destructive" });
    }
  };

  const generateInvoice = useMutation({
    mutationFn: async (timesheetId: number) => {
      const resp = await fetch(`/api/invoices/from-timesheet/${timesheetId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": "Admin" },
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error((err as any).error || "Failed to generate invoice");
      }
      return resp.json();
    },
    onSuccess: () => toast({ title: "Draft invoice created", description: "Go to Finance to view and send it." }),
    onError: (e: Error) => toast({ title: "Invoice generation failed", description: e.message, variant: "destructive" }),
  });

  const onReject = async () => {
    if (!rejectTimesheetId) return;
    try {
      await rejectTimesheetMutation.mutateAsync({ id: rejectTimesheetId, data: { rejectionNote: rejectNote } });
      queryClient.invalidateQueries({ queryKey: getListTimesheetsQueryKey() });
      setRejectTimesheetId(null);
      setRejectNote("");
      toast({ title: "Timesheet rejected" });
    } catch {
      toast({ title: "Error rejecting", variant: "destructive" });
    }
  };

  const statusColors: Record<string, string> = {
    Draft: "bg-gray-100 text-gray-700 border-gray-200",
    Submitted: "bg-amber-100 text-amber-700 border-amber-200",
    Approved: "bg-green-100 text-green-700 border-green-200",
    Rejected: "bg-red-100 text-red-700 border-red-200",
  };

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
                <span className="font-semibold text-foreground">{timesheet.totalHours}h</span> total &nbsp;·&nbsp;
                <span className="font-semibold text-indigo-600">{timesheet.billableHours}h</span> billable
              </div>
              <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", statusColors[timesheet.status] ?? statusColors.Draft)}>
                {timesheet.status}
              </span>
              {timesheet.status === "Draft" && (
                <Button size="sm" onClick={onSubmitTimesheet} disabled={submitTimesheet.isPending}>
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
                <TableHead className="w-[220px] min-w-[220px]">Project / Task</TableHead>
                {weekDays.map(day => (
                  <TableHead key={day.toISOString()} className="text-center min-w-[64px] w-[64px] p-2">
                    <div className="text-[11px] font-normal text-muted-foreground">{format(day, "EEE")}</div>
                    <div className="font-semibold">{format(day, "d")}</div>
                  </TableHead>
                ))}
                <TableHead className="text-right min-w-[56px]">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                    No time logged this week.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const rowTotal = dailyTotals.reduce((sum, _v, i) => {
                    const dayStr = format(weekDays[i], "yyyy-MM-dd");
                    return sum + (row.days[dayStr] || 0);
                  }, 0);
                  const taskName = row.taskId ? getTaskName(row.taskId) : null;
                  const categoryName = row.categoryId ? getCategoryName(row.categoryId) : null;
                  return (
                    <TableRow key={row.key} className="hover:bg-muted/10">
                      <TableCell className="py-2 align-top">
                        <div className="font-medium text-sm truncate max-w-[200px]">
                          {projects?.find(p => p.id === row.projectId)?.name}
                        </div>
                        {taskName && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px] mt-0.5">{taskName}</div>
                        )}
                        {row.description && !taskName && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px] mt-0.5">{row.description}</div>
                        )}
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {row.billable ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400">
                              Billable
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200 dark:bg-gray-800 dark:text-gray-400">
                              Non-billable
                            </span>
                          )}
                          {categoryName && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/20 dark:text-violet-400">
                              {categoryName}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      {weekDays.map(day => {
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
                                className="w-14 h-8 text-center border border-indigo-400 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white dark:bg-gray-900"
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={() => handleCellSave(row, dayStr, editValue)}
                                onKeyDown={e => {
                                  if (e.key === "Enter") { e.preventDefault(); handleCellSave(row, dayStr, editValue); }
                                  if (e.key === "Escape") setEditingCell(null);
                                }}
                              />
                            ) : (
                              <button
                                onClick={() => startEdit(row, dayStr)}
                                title={multiEntry ? "Multiple entries — use Log Time to edit" : isLocked ? "Timesheet is locked" : "Click to edit"}
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
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>

        {/* Log Time footer action */}
        <div className="p-2 border-t bg-muted/5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsLogTimeOpen(true)}
            disabled={timesheet?.status === "Approved"}
            className="text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-4 w-4 mr-2" /> Log Time
          </Button>
          {isLocked && timesheet?.status === "Submitted" && (
            <span className="ml-3 text-xs text-amber-600 font-medium">
              ⏳ Awaiting approval — withdraw to make changes
            </span>
          )}
          {isLocked && timesheet?.status === "Approved" && (
            <span className="ml-3 text-xs text-green-600 font-medium">
              ✓ Approved &amp; locked
            </span>
          )}
        </div>
      </div>

      {/* Pending Approval Section (manager view) */}
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedTimesheets.map(ts => (
                  <TableRow key={ts.id}>
                    <TableCell className="font-medium">{users?.find(u => u.id === ts.userId)?.name}</TableCell>
                    <TableCell>{ts.weekStart}</TableCell>
                    <TableCell>{ts.billableHours}h billable / {ts.totalHours}h total</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{ts.approvedAt ? new Date(ts.approvedAt).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={generateInvoice.isPending}
                        onClick={() => generateInvoice.mutate(ts.id)}
                      >
                        Generate Invoice
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Log Time Dialog */}
      <Dialog open={isLogTimeOpen} onOpenChange={setIsLogTimeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Time</DialogTitle></DialogHeader>
          <Form {...logTimeForm}>
            <form onSubmit={logTimeForm.handleSubmit(onLogTime)} className="space-y-4">
              <FormField control={logTimeForm.control} name="projectId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {projects?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={logTimeForm.control} name="taskId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Task <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value?.toString()} disabled={!selectedProjectId}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select task" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {projectTasks?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={logTimeForm.control} name="categoryId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
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
                <FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="What did you work on?" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={logTimeForm.control} name="billable" render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="font-normal cursor-pointer">Billable</FormLabel>
                </FormItem>
              )} />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsLogTimeOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createTimeEntry.isPending}>Save Entry</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTimesheetId} onOpenChange={(o) => !o && setRejectTimesheetId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Timesheet</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rejection Reason <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Input value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Please explain why this timesheet was rejected..." />
            </div>
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
