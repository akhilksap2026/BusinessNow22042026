import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListTimeEntries, 
  useCreateTimeEntry,
  useListTimesheets,
  useSubmitTimesheet,
  useApproveTimesheet,
  useRejectTimesheet,
  useListProjects,
  useListTasks,
  useListUsers,
  getListTimeEntriesQueryKey,
  getGetTimeEntrySummaryQueryKey,
  getListTimesheetsQueryKey,
  getListTasksQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Plus } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const logTimeSchema = z.object({
  projectId: z.coerce.number().min(1, "Project is required"),
  taskId: z.coerce.number().optional(),
  date: z.string().min(1, "Date is required"),
  hours: z.coerce.number().min(0.1, "Hours must be greater than 0"),
  description: z.string().optional(),
  billable: z.boolean(),
});

export function TimesheetGrid({ userId }: { userId: number }) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
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

  const { data: timeEntries } = useListTimeEntries({ userId, startDate: weekStartStr, endDate: weekEndStr }, {
    query: { queryKey: getListTimeEntriesQueryKey({ userId, startDate: weekStartStr, endDate: weekEndStr }) }
  });

  const { data: projects } = useListProjects();
  const { data: users } = useListUsers();
  
  const createTimeEntry = useCreateTimeEntry();
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

  const onLogTime = async (values: z.infer<typeof logTimeSchema>) => {
    try {
      await createTimeEntry.mutateAsync({ data: { ...values, userId, description: values.description ?? "" } });
      queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetTimeEntrySummaryQueryKey() });
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
      queryClient.invalidateQueries({ queryKey: ["createTimesheet"] });
      toast({ title: "Timesheet submitted" });
    } catch {
      toast({ title: "Error submitting timesheet", variant: "destructive" });
    }
  };

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

  // Group entries by Project + Task + Description
  const groupedEntries = (timeEntries || []).reduce((acc: any, entry) => {
    const key = `${entry.projectId}-${entry.taskId || 'none'}-${entry.description || 'none'}`;
    if (!acc[key]) {
      acc[key] = {
        projectId: entry.projectId,
        taskId: entry.taskId,
        description: entry.description,
        days: {}
      };
    }
    const dayStr = format(parseISO(entry.date), "yyyy-MM-dd");
    acc[key].days[dayStr] = (acc[key].days[dayStr] || 0) + entry.hours;
    return acc;
  }, {});

  const rows = Object.values(groupedEntries);
  
  // Manager Approval Section (dummy check for now, could be based on user role)
  const { data: submittedTimesheets } = useListTimesheets({ status: "Submitted" });

  const onApprove = async (id: number) => {
    try {
      await approveTimesheet.mutateAsync({ id, data: {} });
      queryClient.invalidateQueries({ queryKey: getListTimesheetsQueryKey() });
      toast({ title: "Timesheet approved" });
    } catch {
      toast({ title: "Error approving", variant: "destructive" });
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-muted/20 p-4 rounded-lg border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="font-medium min-w-[200px] text-center">
              {format(currentWeekStart, "MMM d")} - {format(currentWeekEnd, "MMM d, yyyy")}
            </span>
            <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {timesheet && (
            <>
              <div className="flex flex-col items-end">
                <span className="text-sm text-muted-foreground">Total: <span className="font-bold text-foreground">{timesheet.totalHours}h</span></span>
                <span className="text-xs text-muted-foreground">Billable: {timesheet.billableHours}h</span>
              </div>
              <Badge variant={timesheet.status === "Approved" ? "default" : "outline"} className={timesheet.status === "Approved" ? "bg-green-100 text-green-800" : ""}>
                {timesheet.status}
              </Badge>
              {timesheet.status === "Draft" && (
                <Button size="sm" onClick={onSubmitTimesheet}>Submit for Approval</Button>
              )}
              {timesheet.status === "Draft" && timesheet.rejectionNote && (
                <div className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3"/> {timesheet.rejectionNote}</div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Project / Task</TableHead>
              <TableHead>Description</TableHead>
              {weekDays.map(day => (
                <TableHead key={day.toISOString()} className="text-center min-w-[60px]">
                  <div className="text-xs font-normal text-muted-foreground">{format(day, "EEE")}</div>
                  <div>{format(day, "d")}</div>
                </TableHead>
              ))}
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No time logged this week.</TableCell></TableRow>
            ) : (
              rows.map((row: any, i) => {
                const totalRow = weekDays.reduce((sum, day) => sum + (row.days[format(day, "yyyy-MM-dd")] || 0), 0);
                return (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="font-medium truncate">{projects?.find(p => p.id === row.projectId)?.name}</div>
                      {row.taskId && <div className="text-xs text-muted-foreground truncate">{row.taskId}</div>}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{row.description}</TableCell>
                    {weekDays.map(day => {
                      const hours = row.days[format(day, "yyyy-MM-dd")] || 0;
                      return (
                        <TableCell key={day.toISOString()} className="text-center font-medium">
                          {hours > 0 ? hours : '-'}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-bold bg-muted/10">{totalRow}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <div className="p-2 border-t bg-muted/5">
          <Button variant="ghost" size="sm" onClick={() => setIsLogTimeOpen(true)} className="text-muted-foreground">
            <Plus className="h-4 w-4 mr-2" /> Log Time
          </Button>
        </div>
      </div>

      {submittedTimesheets && submittedTimesheets.length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-medium">Timesheets Pending Approval</h3>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Week</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submittedTimesheets.map(ts => (
                  <TableRow key={ts.id}>
                    <TableCell className="font-medium">{users?.find(u => u.id === ts.userId)?.name}</TableCell>
                    <TableCell>{ts.weekStart}</TableCell>
                    <TableCell>{ts.totalHours}h ({ts.billableHours}h billable)</TableCell>
                    <TableCell>{ts.submittedAt ? new Date(ts.submittedAt).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => setRejectTimesheetId(ts.id)}>Reject</Button>
                      <Button size="sm" onClick={() => onApprove(ts.id)}>Approve</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog open={isLogTimeOpen} onOpenChange={setIsLogTimeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Time</DialogTitle></DialogHeader>
          <Form {...logTimeForm}>
            <form onSubmit={logTimeForm.handleSubmit(onLogTime)} className="space-y-4">
              <FormField control={logTimeForm.control} name="projectId" render={({field}) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select project"/></SelectTrigger></FormControl>
                    <SelectContent>
                      {projects?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={logTimeForm.control} name="taskId" render={({field}) => (
                <FormItem>
                  <FormLabel>Task (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value?.toString()} disabled={!selectedProjectId}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select task"/></SelectTrigger></FormControl>
                    <SelectContent>
                      {projectTasks?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={logTimeForm.control} name="date" render={({field}) => (
                  <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field}/></FormControl></FormItem>
                )} />
                <FormField control={logTimeForm.control} name="hours" render={({field}) => (
                  <FormItem><FormLabel>Hours</FormLabel><FormControl><Input type="number" step="0.1" {...field}/></FormControl></FormItem>
                )} />
              </div>
              <FormField control={logTimeForm.control} name="description" render={({field}) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>
              )} />
              <FormField control={logTimeForm.control} name="billable" render={({field}) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange}/></FormControl>
                  <FormLabel>Billable</FormLabel>
                </FormItem>
              )} />
              <DialogFooter><Button type="submit" disabled={createTimeEntry.isPending}>Save Entry</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTimesheetId} onOpenChange={(o) => !o && setRejectTimesheetId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Timesheet</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rejection Reason</label>
              <Input value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Please explain why..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTimesheetId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={onReject}>Reject Timesheet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
