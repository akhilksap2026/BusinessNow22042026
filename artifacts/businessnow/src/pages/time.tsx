import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout";
import {
  useListTimeEntries, useGetTimeEntrySummary, useListProjects, useListUsers,
  useListTimeOffRequests, useCreateTimeOffRequest, useUpdateTimeOffRequestStatus, useDeleteTimeOffRequest,
  useUpdateTimeEntry, useDeleteTimeEntry, useCreateTimeEntry,
  getListTimeOffRequestsQueryKey, getListTimeEntriesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Clock, CheckCircle2, AlertCircle, CalendarOff, CheckCircle, XCircle, Trash2, Pencil, Timer, StopCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimesheetGrid } from "@/components/timesheet-grid";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const CURRENT_USER_ID = 1;

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
  const [logForm, setLogForm] = useState({ projectId: "", userId: String(CURRENT_USER_ID), date: new Date().toISOString().substring(0, 10), hours: "", description: "", billable: true });

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
      } as any });
      queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });
      toast({ title: "Time logged" });
      setShowLogTime(false);
      setTimerSeconds(0);
      setLogForm({ projectId: "", userId: String(CURRENT_USER_ID), date: new Date().toISOString().substring(0, 10), hours: "", description: "", billable: true });
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
    </Layout>
  );
}
