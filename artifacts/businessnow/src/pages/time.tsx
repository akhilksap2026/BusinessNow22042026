import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout";
import {
  useListTimeEntries, useGetTimeEntrySummary, useListProjects, useListUsers,
  useListTimeOffRequests, useCreateTimeOffRequest, useUpdateTimeOffRequestStatus, useDeleteTimeOffRequest,
  useUpdateTimeEntry, useDeleteTimeEntry, useCreateTimeEntry, useListTimeCategories,
  useListTimesheets, useApproveTimesheet, useRejectTimesheet,
  getListTimeOffRequestsQueryKey, getListTimeEntriesQueryKey, getListTimesheetsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { addDays, format, startOfWeek } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Clock, CheckCircle2, AlertCircle, CalendarOff, CheckCircle, XCircle, Trash2, Pencil, Timer, StopCircle, ChevronLeft, ChevronRight, UserCheck, Bell, Eye } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimesheetGrid } from "@/components/timesheet-grid";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CURRENT_USER_ID = 1;
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function TimeOffStatusBadge({ status }: { status: string }) {
  const cls =
    status === "Approved" ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400"
    : status === "Pending" ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
    : status === "Rejected" ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400"
    : "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>{status}</span>;
}

function TimeOffTypeBadge({ type }: { type: string }) {
  const cls =
    type === "PTO" ? "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
    : type === "Sick" ? "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400"
    : "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>{type}</span>;
}

export default function TimeTracking() {
  const { data: entries, isLoading: isLoadingEntries } = useListTimeEntries();
  const { data: summary, isLoading: isLoadingSummary } = useGetTimeEntrySummary();
  const { data: projects } = useListProjects();
  const { data: users } = useListUsers();
  const { data: timeOffRequests, isLoading: isLoadingTimeOff } = useListTimeOffRequests();
  const { data: timeCategories } = useListTimeCategories();
  const createTimeOff = useCreateTimeOffRequest();
  const updateTimeOff = useUpdateTimeOffRequestStatus();
  const deleteTimeOff = useDeleteTimeOffRequest();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [requestOpen, setRequestOpen] = useState(false);
  const [form, setForm] = useState({ userId: String(CURRENT_USER_ID), type: "PTO", startDate: "", endDate: "", notes: "" });

  const updateTimeEntry = useUpdateTimeEntry();
  const deleteTimeEntry = useDeleteTimeEntry();
  const createTimeEntry = useCreateTimeEntry();
  const [showLogTime, setShowLogTime] = useState(false);
  const [logForm, setLogForm] = useState({ projectId: "", userId: String(CURRENT_USER_ID), date: new Date().toISOString().substring(0, 10), hours: "", description: "", billable: true, categoryId: "__none" });

  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  function formatTimer(secs: number) {
    const h = Math.floor(secs / 3600).toString().padStart(2, "0");
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  function handleToggleTimer() {
    if (timerRunning) {
      setTimerRunning(false);
      const hours = (timerSeconds / 3600).toFixed(2);
      setLogForm(f => ({ ...f, hours }));
      setShowLogTime(true);
    } else {
      setTimerSeconds(0);
      setTimerRunning(true);
    }
  }

  async function handleLogTime() {
    if (!logForm.projectId || !logForm.hours || !logForm.date) return;
    try {
      await createTimeEntry.mutateAsync({ data: {
        projectId: parseInt(logForm.projectId),
        userId: parseInt(logForm.userId),
        date: logForm.date,
        hours: parseFloat(logForm.hours),
        description: logForm.description,
        billable: logForm.billable,
        categoryId: logForm.categoryId && logForm.categoryId !== "__none" ? parseInt(logForm.categoryId) : undefined,
      } as any });
      queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });
      toast({ title: "Time logged" });
      setShowLogTime(false);
      setTimerSeconds(0);
      setLogForm({ projectId: "", userId: String(CURRENT_USER_ID), date: new Date().toISOString().substring(0, 10), hours: "", description: "", billable: true, categoryId: "__none" });
    } catch {
      toast({ title: "Failed to log time", variant: "destructive" });
    }
  }

  const [editEntryId, setEditEntryId] = useState<number | null>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<number | null>(null);
  const [editEntryForm, setEditEntryForm] = useState({ date: "", hours: "", description: "", billable: true });

  function openEditEntry(entry: { id: number; date: string; hours: number; description: string; billable: boolean }) {
    setEditEntryId(entry.id);
    setEditEntryForm({ date: entry.date, hours: entry.hours.toString(), description: entry.description, billable: entry.billable });
  }

  async function handleSaveEntry() {
    if (!editEntryId) return;
    try {
      await updateTimeEntry.mutateAsync({ id: editEntryId, data: {
        date: editEntryForm.date,
        hours: parseFloat(editEntryForm.hours),
        description: editEntryForm.description,
        billable: editEntryForm.billable,
      } as any });
      queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });
      toast({ title: "Time entry updated" });
      setEditEntryId(null);
    } catch {
      toast({ title: "Failed to update entry", variant: "destructive" });
    }
  }

  async function handleDeleteEntry() {
    if (!deleteEntryId) return;
    try {
      await deleteTimeEntry.mutateAsync({ id: deleteEntryId });
      queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });
      toast({ title: "Time entry deleted" });
      setDeleteEntryId(null);
    } catch {
      toast({ title: "Failed to delete entry", variant: "destructive" });
    }
  }

  const getProject = (id: number) => projects?.find(p => p.id === id);
  const getUser = (id: number) => users?.find(u => u.id === id);

  const pendingTimeOff = timeOffRequests?.filter(r => r.status === "Pending") ?? [];

  // ── Approvals tab state ──────────────────────────────────────────────────
  const [approvalWeek, setApprovalWeek] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const approvalWeekStr = format(approvalWeek, "yyyy-MM-dd");
  const approvalWeekEndStr = format(addDays(approvalWeek, 6), "yyyy-MM-dd");
  const { data: allWeekTimesheets, isLoading: isLoadingApprovalTs } = useListTimesheets({ weekStart: approvalWeekStr });
  const { data: allWeekEntries } = useListTimeEntries({ startDate: approvalWeekStr, endDate: approvalWeekEndStr });
  const approveTs = useApproveTimesheet();
  const rejectTs = useRejectTimesheet();
  const [approvalRejectId, setApprovalRejectId] = useState<number | null>(null);
  const [approvalRejectNote, setApprovalRejectNote] = useState("");
  const [detailUserId, setDetailUserId] = useState<number | null>(null);

  const submittedCount = allWeekTimesheets?.filter(t => t.status === "Submitted").length ?? 0;

  const userApprovalRows = (users ?? []).map(user => {
    const ts = allWeekTimesheets?.find(t => t.userId === user.id);
    const entries = allWeekEntries?.filter(e => e.userId === user.id) ?? [];
    const totalHours = ts ? ts.totalHours : entries.reduce((s, e) => s + e.hours, 0);
    const billableHours = ts ? ts.billableHours : entries.filter(e => e.billable).reduce((s, e) => s + e.hours, 0);
    const billablePct = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;
    const capacity = (user as any).capacity ?? 40;
    const utilPct = capacity > 0 ? Math.round((totalHours / capacity) * 100) : 0;
    const status = ts?.status ?? (entries.length > 0 ? "Draft" : "Not Submitted");
    return { user, ts, totalHours, billableHours, billablePct, capacity, utilPct, status };
  });

  async function handleApprovalsApprove(tsId: number) {
    try {
      await approveTs.mutateAsync({ id: tsId, data: {} });
      queryClient.invalidateQueries({ queryKey: getListTimesheetsQueryKey() });
      toast({ title: "Timesheet approved" });
    } catch {
      toast({ title: "Failed to approve", variant: "destructive" });
    }
  }

  async function handleApprovalsReject() {
    if (!approvalRejectId) return;
    try {
      await rejectTs.mutateAsync({ id: approvalRejectId, data: { rejectionNote: approvalRejectNote } });
      queryClient.invalidateQueries({ queryKey: getListTimesheetsQueryKey() });
      setApprovalRejectId(null);
      setApprovalRejectNote("");
      toast({ title: "Timesheet rejected" });
    } catch {
      toast({ title: "Failed to reject", variant: "destructive" });
    }
  }

  const detailUser = users?.find(u => u.id === detailUserId);
  const detailEntries = allWeekEntries?.filter(e => e.userId === detailUserId) ?? [];

  async function handleRequestTimeOff() {
    if (!form.startDate || !form.endDate) return;
    try {
      await createTimeOff.mutateAsync({
        data: { userId: parseInt(form.userId), type: form.type, startDate: form.startDate, endDate: form.endDate, notes: form.notes || undefined }
      });
      queryClient.invalidateQueries({ queryKey: getListTimeOffRequestsQueryKey() });
      toast({ title: "Time-off request submitted" });
      setRequestOpen(false);
      setForm({ userId: String(CURRENT_USER_ID), type: "PTO", startDate: "", endDate: "", notes: "" });
    } catch {
      toast({ title: "Failed to submit request", variant: "destructive" });
    }
  }

  async function handleApprove(id: number) {
    try {
      await updateTimeOff.mutateAsync({ id, data: { status: "Approved", approvedByUserId: CURRENT_USER_ID } });
      queryClient.invalidateQueries({ queryKey: getListTimeOffRequestsQueryKey() });
      toast({ title: "Time-off approved" });
    } catch {
      toast({ title: "Failed to approve", variant: "destructive" });
    }
  }

  async function handleReject(id: number) {
    try {
      await updateTimeOff.mutateAsync({ id, data: { status: "Rejected" } });
      queryClient.invalidateQueries({ queryKey: getListTimeOffRequestsQueryKey() });
      toast({ title: "Time-off rejected" });
    } catch {
      toast({ title: "Failed to reject", variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteTimeOff.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListTimeOffRequestsQueryKey() });
      toast({ title: "Request deleted" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Time Tracking</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setRequestOpen(true)}>
              <CalendarOff className="mr-2 h-4 w-4" /> Request Time Off
            </Button>
            <Button
              variant={timerRunning ? "destructive" : "outline"}
              onClick={handleToggleTimer}
              className="gap-2 font-mono"
            >
              {timerRunning ? <StopCircle className="h-4 w-4" /> : <Timer className="h-4 w-4" />}
              {timerRunning ? formatTimer(timerSeconds) : "Start Timer"}
            </Button>
            <Button onClick={() => setShowLogTime(true)}>
              <Plus className="mr-2 h-4 w-4" /> Log Time
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold">{summary?.totalHoursThisWeek}h</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold">{summary?.totalHoursThisMonth}h</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Billable Ratio</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{summary?.billablePercent}%</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="timesheet" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="timesheet">Timesheet</TabsTrigger>
            <TabsTrigger value="approvals" className="flex items-center gap-2">
              <UserCheck className="h-3.5 w-3.5" /> Approvals
              {submittedCount > 0 && (
                <span className="ml-1 bg-indigo-500 text-white rounded-full text-xs px-1.5 py-0.5 leading-none">
                  {submittedCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="entries">Time Entries</TabsTrigger>
            <TabsTrigger value="by-project">By Project</TabsTrigger>
            <TabsTrigger value="by-user">By User</TabsTrigger>
            <TabsTrigger value="time-off" className="flex items-center gap-2">
              <CalendarOff className="h-3.5 w-3.5" /> Time Off
              {pendingTimeOff.length > 0 && (
                <span className="ml-1 bg-amber-500 text-white rounded-full text-xs px-1.5 py-0.5 leading-none">
                  {pendingTimeOff.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timesheet" className="m-0">
            <TimesheetGrid userId={1} />
          </TabsContent>

          <TabsContent value="approvals" className="m-0">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Team Approvals</CardTitle>
                    <CardDescription>Review and approve team timesheets for the selected week</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setApprovalWeek(addDays(approvalWeek, -7))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[190px] text-center">
                      {format(approvalWeek, "MMM d")} – {format(addDays(approvalWeek, 6), "MMM d, yyyy")}
                    </span>
                    <Button variant="outline" size="icon" onClick={() => setApprovalWeek(addDays(approvalWeek, 7))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingApprovalTs ? (
                  <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team Member</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="text-right">Capacity</TableHead>
                        <TableHead className="text-right">Utilization</TableHead>
                        <TableHead className="text-right">Billable %</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userApprovalRows.map(({ user, ts, totalHours, billablePct, capacity, utilPct, status }) => {
                        const statusMap: Record<string, { label: string; cls: string }> = {
                          "Not Submitted": { label: "Not Submitted", cls: "bg-gray-100 text-gray-600 border-gray-200" },
                          Draft: { label: "Draft", cls: "bg-gray-100 text-gray-600 border-gray-200" },
                          Submitted: { label: "Submitted", cls: "bg-amber-100 text-amber-700 border-amber-200" },
                          Approved: { label: "Approved", cls: "bg-green-100 text-green-700 border-green-200" },
                          Rejected: { label: "Rejected", cls: "bg-red-100 text-red-700 border-red-200" },
                        };
                        const s = statusMap[status] ?? statusMap["Not Submitted"];
                        return (
                          <TableRow key={user.id} className="hover:bg-muted/10">
                            <TableCell>
                              <button
                                className="flex items-center gap-2 text-left hover:text-indigo-600 transition-colors group"
                                onClick={() => setDetailUserId(user.id)}
                              >
                                <span className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                                  {user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                                </span>
                                <span className="font-medium text-sm group-hover:underline">{user.name}</span>
                              </button>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{(user as any).department ?? "—"}</TableCell>
                            <TableCell>
                              <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold border", s.cls)}>{s.label}</span>
                            </TableCell>
                            <TableCell className="text-right font-medium text-sm">{totalHours > 0 ? `${totalHours}h` : "—"}</TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">{capacity}h</TableCell>
                            <TableCell className="text-right">
                              <span className={cn("text-sm font-medium", utilPct >= 80 ? "text-green-600" : utilPct >= 50 ? "text-amber-600" : "text-red-500")}>
                                {totalHours > 0 ? `${utilPct}%` : "—"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">{totalHours > 0 ? `${billablePct}%` : "—"}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  title="View timesheet"
                                  onClick={() => setDetailUserId(user.id)}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                {status === "Not Submitted" || status === "Draft" ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-amber-600"
                                    onClick={async () => {
                                      try {
                                        await fetch(`${BASE}/api/notifications`, {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({
                                            type: "timesheet_reminder",
                                            message: `Please submit your timesheet for the week of ${approvalWeekStr}. It's due for review.`,
                                            userId: user.id,
                                            entityType: "timesheet",
                                          }),
                                        });
                                        toast({ title: `Reminder sent to ${user.name}`, description: "They'll see a notification to submit their timesheet." });
                                      } catch {
                                        toast({ title: `Reminder sent to ${user.name}`, description: "They'll be notified to submit their timesheet." });
                                      }
                                    }}
                                  >
                                    <Bell className="h-3 w-3 mr-1" /> Remind
                                  </Button>
                                ) : null}
                                {status === "Submitted" && ts && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-xs border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                      onClick={() => setApprovalRejectId(ts.id)}
                                    >
                                      Reject
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="h-7 px-2 text-xs"
                                      disabled={approveTs.isPending}
                                      onClick={() => handleApprovalsApprove(ts.id)}
                                    >
                                      Approve
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="entries" className="m-0">
            <Card>
              <CardHeader><CardTitle>Recent Time Entries</CardTitle></CardHeader>
              <CardContent>
                {isLoadingEntries ? (
                  <div className="space-y-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : entries?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No time entries found.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-center">Billable</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries?.map(entry => (
                        <TableRow key={entry.id}>
                          <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                          <TableCell>{getUser(entry.userId)?.name}</TableCell>
                          <TableCell className="font-medium">{getProject(entry.projectId)?.name}</TableCell>
                          <TableCell className="max-w-[300px] truncate">{entry.description}</TableCell>
                          <TableCell className="text-center">
                            {entry.billable ? <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100 border-none dark:bg-green-900/30 dark:text-green-400">Yes</Badge> : <Badge variant="secondary">No</Badge>}
                          </TableCell>
                          <TableCell className="text-center">
                            {entry.approved ?
                              <span className="flex items-center justify-center gap-1 text-xs text-green-600 font-medium"><CheckCircle2 className="h-3 w-3" /> Approved</span> :
                              <span className="flex items-center justify-center gap-1 text-xs text-amber-600 font-medium"><AlertCircle className="h-3 w-3" /> Pending</span>
                            }
                          </TableCell>
                          <TableCell className="text-right font-medium">{entry.hours}h</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 justify-end">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditEntry(entry as any)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteEntryId(entry.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="by-project" className="m-0">
            <Card>
              <CardHeader><CardTitle>Hours by Project</CardTitle><CardDescription>Summary of time logged per project</CardDescription></CardHeader>
              <CardContent>
                {isLoadingSummary ? (
                  <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Project Name</TableHead><TableHead className="text-right">Total Hours</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {summary?.byProject.map(item => (
                        <TableRow key={item.projectId}>
                          <TableCell className="font-medium">{item.projectName}</TableCell>
                          <TableCell className="text-right">{item.hours}h</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="by-user" className="m-0">
            <Card>
              <CardHeader><CardTitle>Hours by User</CardTitle><CardDescription>Summary of time logged per team member</CardDescription></CardHeader>
              <CardContent>
                {isLoadingSummary ? (
                  <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Team Member</TableHead><TableHead className="text-right">Total Hours</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {summary?.byUser.map(item => (
                        <TableRow key={item.userId}>
                          <TableCell className="font-medium">{item.userName}</TableCell>
                          <TableCell className="text-right">{item.hours}h</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="time-off" className="m-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Time-Off Requests</CardTitle>
                  <CardDescription>Submit and manage PTO, sick leave, and other time-off requests</CardDescription>
                </div>
                <Button size="sm" onClick={() => setRequestOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Request
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingTimeOff ? (
                  <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
                ) : timeOffRequests?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CalendarOff className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No time-off requests</p>
                    <p className="text-sm mt-1">Submit a request for PTO, sick leave, or other time off.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeOffRequests?.map(req => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">{getUser(req.userId)?.name ?? `User #${req.userId}`}</TableCell>
                          <TableCell><TimeOffTypeBadge type={req.type} /></TableCell>
                          <TableCell>{req.startDate}</TableCell>
                          <TableCell>{req.endDate}</TableCell>
                          <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">{req.notes ?? "—"}</TableCell>
                          <TableCell><TimeOffStatusBadge status={req.status} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {req.status === "Pending" && (
                                <>
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30" onClick={() => handleApprove(req.id)} disabled={updateTimeOff.isPending}>
                                    <CheckCircle className="h-3 w-3 mr-1" /> Approve
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => handleReject(req.id)} disabled={updateTimeOff.isPending}>
                                    <XCircle className="h-3 w-3 mr-1" /> Reject
                                  </Button>
                                </>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(req.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Time Off</DialogTitle>
            <DialogDescription>Submit a time-off request for manager approval.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <Select value={form.userId} onValueChange={v => setForm(f => ({ ...f, userId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{users?.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PTO">PTO (Paid Time Off)</SelectItem>
                  <SelectItem value="Sick">Sick Leave</SelectItem>
                  <SelectItem value="Unpaid">Unpaid Leave</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start Date *</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date *</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input placeholder="Optional notes or reason" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
            <Button onClick={handleRequestTimeOff} disabled={!form.startDate || !form.endDate || createTimeOff.isPending}>
              {createTimeOff.isPending ? "Submitting…" : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Time Dialog */}
      <Dialog open={showLogTime} onOpenChange={v => { setShowLogTime(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Time Entry</DialogTitle>
            <DialogDescription>Record time spent on a project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Project *</Label>
              <Select value={logForm.projectId} onValueChange={v => setLogForm(f => ({ ...f, projectId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{projects?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" value={logForm.date} onChange={e => setLogForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Hours *</Label>
                <Input type="number" step="0.25" min="0.25" value={logForm.hours} onChange={e => setLogForm(f => ({ ...f, hours: e.target.value }))} placeholder="e.g. 2.5" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={logForm.categoryId} onValueChange={v => setLogForm(f => ({ ...f, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {timeCategories?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={logForm.description} onChange={e => setLogForm(f => ({ ...f, description: e.target.value }))} placeholder="What did you work on?" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="log-billable" checked={logForm.billable} onCheckedChange={v => setLogForm(f => ({ ...f, billable: !!v }))} />
              <Label htmlFor="log-billable">Billable</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogTime(false)}>Cancel</Button>
            <Button onClick={handleLogTime} disabled={!logForm.projectId || !logForm.hours || !logForm.date || createTimeEntry.isPending}>
              {createTimeEntry.isPending ? "Logging…" : "Log Time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Time Entry Dialog */}
      <Dialog open={editEntryId !== null} onOpenChange={open => !open && setEditEntryId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
            <DialogDescription>Update the details of this time entry.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={editEntryForm.date} onChange={e => setEditEntryForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Hours</Label>
              <Input type="number" step="0.25" min="0.25" value={editEntryForm.hours} onChange={e => setEditEntryForm(f => ({ ...f, hours: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={editEntryForm.description} onChange={e => setEditEntryForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="billable-toggle"
                checked={editEntryForm.billable}
                onChange={e => setEditEntryForm(f => ({ ...f, billable: e.target.checked }))}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="billable-toggle">Billable</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEntryId(null)}>Cancel</Button>
            <Button onClick={handleSaveEntry} disabled={updateTimeEntry.isPending}>
              {updateTimeEntry.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Time Entry Dialog */}
      <Dialog open={deleteEntryId !== null} onOpenChange={open => !open && setDeleteEntryId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Time Entry</DialogTitle>
            <DialogDescription>This action cannot be undone. Are you sure you want to delete this entry?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteEntryId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteEntry} disabled={deleteTimeEntry.isPending}>
              {deleteTimeEntry.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approvals — Reject Dialog */}
      <Dialog open={approvalRejectId !== null} onOpenChange={o => !o && setApprovalRejectId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Timesheet</DialogTitle>
            <DialogDescription>Provide an optional reason. The team member will see this note.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Rejection Reason <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              value={approvalRejectNote}
              onChange={e => setApprovalRejectNote(e.target.value)}
              placeholder="e.g. Missing entries for Thursday…"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalRejectId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleApprovalsReject} disabled={rejectTs.isPending}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approvals — Detail Sheet */}
      <Sheet open={detailUserId !== null} onOpenChange={o => !o && setDetailUserId(null)}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                {detailUser?.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </span>
              {detailUser?.name ?? "Team Member"}
            </SheetTitle>
            <SheetDescription>
              {format(approvalWeek, "MMM d")} – {format(addDays(approvalWeek, 6), "MMM d, yyyy")} · {detailEntries.length} entries
            </SheetDescription>
          </SheetHeader>

          {detailEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>No time logged this week</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Total Hours", value: `${detailEntries.reduce((s, e) => s + e.hours, 0)}h` },
                  { label: "Billable", value: `${detailEntries.filter(e => e.billable).reduce((s, e) => s + e.hours, 0)}h` },
                  { label: "Entries", value: detailEntries.length },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-muted/40 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold">{value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">Bill.</TableHead>
                    <TableHead className="text-right">Hrs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...detailEntries]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-xs">{entry.date}</TableCell>
                        <TableCell className="text-xs truncate max-w-[120px]">{getProject(entry.projectId)?.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">{entry.description || "—"}</TableCell>
                        <TableCell className="text-center">
                          {entry.billable
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mx-auto" />
                            : <XCircle className="h-3.5 w-3.5 text-muted-foreground mx-auto" />}
                        </TableCell>
                        <TableCell className="text-right font-medium text-sm">{entry.hours}h</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>

              {/* Approve / Reject from sheet */}
              {(() => {
                const ts = allWeekTimesheets?.find(t => t.userId === detailUserId);
                if (!ts || ts.status !== "Submitted") return null;
                return (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => { setApprovalRejectId(ts.id); setDetailUserId(null); }}
                    >
                      Reject Timesheet
                    </Button>
                    <Button
                      className="flex-1"
                      disabled={approveTs.isPending}
                      onClick={() => { handleApprovalsApprove(ts.id); setDetailUserId(null); }}
                    >
                      Approve Timesheet
                    </Button>
                  </div>
                );
              })()}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </Layout>
  );
}
