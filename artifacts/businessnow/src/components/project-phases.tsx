import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListPhases, 
  useCreatePhase, 
  useUpdatePhase, 
  useDeletePhase,
  useListTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useListUsers,
  getListPhasesQueryKey,
  getListTasksQueryKey
} from "@workspace/api-client-react";
import { TaskDetailSheet } from "@/components/task-detail-sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Plus, MoreVertical, ChevronDown, ChevronRight, Calendar, Milestone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { TaskStatusBadge, TaskPriorityBadge } from "@/pages/project-detail";

const phaseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  status: z.enum(["Not Started", "In Progress", "Completed"]),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
});

const taskSchema = z.object({
  name: z.string().min(1, "Name is required"),
  status: z.enum(["Not Started", "In Progress", "Completed", "Blocked", "Overdue"]),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]),
  assigneeIds: z.array(z.number()),
  dueDate: z.string().optional(),
  effort: z.coerce.number().min(0).optional(),
  billable: z.boolean(),
  isMilestone: z.boolean(),
  phaseId: z.number().nullable(),
});

export function ProjectPhases({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: phases } = useListPhases({ projectId }, { 
    query: { enabled: !!projectId, queryKey: getListPhasesQueryKey({ projectId }) } 
  });
  
  const { data: tasks } = useListTasks({ projectId }, { 
    query: { enabled: !!projectId, queryKey: getListTasksQueryKey({ projectId }) } 
  });
  
  const { data: users } = useListUsers();

  const createPhase = useCreatePhase();
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();
  const deleteTask = useDeleteTask();

  const [isAddPhaseOpen, setIsAddPhaseOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [selectedPhaseId, setSelectedPhaseId] = useState<number | null>(null);
  const [taskDetailId, setTaskDetailId] = useState<number | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);

  const phaseForm = useForm<z.infer<typeof phaseSchema>>({
    resolver: zodResolver(phaseSchema),
    defaultValues: { name: "", status: "Not Started" },
  });

  const taskForm = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: { name: "", status: "Not Started", priority: "Medium", assigneeIds: [], billable: true, isMilestone: false, phaseId: null },
  });

  const onAddPhase = async (values: z.infer<typeof phaseSchema>) => {
    try {
      await createPhase.mutateAsync({ data: { ...values, projectId } });
      queryClient.invalidateQueries({ queryKey: getListPhasesQueryKey({ projectId }) });
      setIsAddPhaseOpen(false);
      phaseForm.reset();
      toast({ title: "Phase added" });
    } catch {
      toast({ title: "Error adding phase", variant: "destructive" });
    }
  };

  const onAddTask = async (values: z.infer<typeof taskSchema>) => {
    try {
      await createTask.mutateAsync({ data: { ...values, projectId, phaseId: values.phaseId ?? undefined, effort: values.effort ?? 0 } });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
      setIsAddTaskOpen(false);
      taskForm.reset();
      toast({ title: "Task added" });
    } catch {
      toast({ title: "Error adding task", variant: "destructive" });
    }
  };

  const handleTaskStatusClick = async (task: any) => {
    const statuses = ["Not Started", "In Progress", "Completed", "Blocked"];
    const currentIndex = statuses.indexOf(task.status);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    
    try {
      await updateTask.mutateAsync({ id: task.id, data: { status: nextStatus as any } });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
    } catch {
      toast({ title: "Error updating status", variant: "destructive" });
    }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      await deleteTask.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
      toast({ title: "Task deleted" });
    } catch {
      toast({ title: "Error deleting task", variant: "destructive" });
    }
  };

  const openAddTask = (phaseId: number | null) => {
    setSelectedPhaseId(phaseId);
    taskForm.reset({ name: "", status: "Not Started", priority: "Medium", assigneeIds: [], billable: true, isMilestone: false, phaseId });
    setIsAddTaskOpen(true);
  };

  const openTaskDetail = (task: any) => {
    setTaskDetailId(task.id);
    setTaskDetailOpen(true);
  };

  const renderTask = (task: any) => (
    <div key={task.id} className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-muted/50 px-4 group">
      <div className="flex items-center gap-4 flex-1">
        <div className="w-1/3 font-medium cursor-pointer hover:text-indigo-600 hover:underline flex items-center gap-1.5" onClick={() => openTaskDetail(task)}>
          {task.isMilestone && <Milestone className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />}
          {task.name}
        </div>
        <div className="w-32 cursor-pointer" onClick={() => handleTaskStatusClick(task)}>
          <TaskStatusBadge status={task.status} />
        </div>
        <div className="w-24">
          <TaskPriorityBadge priority={task.priority} />
        </div>
        <div className="w-32 flex -space-x-2">
          {task.assigneeIds.map((userId: number) => {
            const user = users?.find(u => u.id === userId);
            return user ? (
              <Avatar key={userId} className="h-6 w-6 border-2 border-background">
                <AvatarFallback className="text-[10px]">{user.initials}</AvatarFallback>
              </Avatar>
            ) : null;
          })}
        </div>
        <div className="w-32 text-sm text-muted-foreground flex items-center gap-1">
          {task.dueDate && <><Calendar className="h-3 w-3"/> {new Date(task.dueDate).toLocaleDateString()}</>}
        </div>
        <div className="w-24 text-sm text-right">
          {task.effort ? `${task.effort}h` : '-'}
        </div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openTaskDetail(task)}>Open Details</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteTask(task.id)}>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  const unassignedTasks = tasks?.filter(t => !t.phaseId) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Phases & Tasks</h3>
        <Button onClick={() => setIsAddPhaseOpen(true)}><Plus className="h-4 w-4 mr-2"/> Add Phase</Button>
      </div>

      <div className="space-y-4">
        {phases?.map(phase => {
          const phaseTasks = tasks?.filter(t => t.phaseId === phase.id) || [];
          return (
            <Collapsible key={phase.id} defaultOpen className="border rounded-md">
              <div className="bg-muted/20 border-b">
                <div className="flex items-center justify-between p-4">
                <CollapsibleTrigger className="flex items-center gap-2 font-semibold">
                  <ChevronDown className="h-4 w-4" />
                  {phase.name}
                  <Badge variant="outline" className="ml-2">{phase.status}</Badge>
                </CollapsibleTrigger>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {phase.startDate && phase.dueDate && (
                    <span>{new Date(phase.startDate).toLocaleDateString()} - {new Date(phase.dueDate).toLocaleDateString()}</span>
                  )}
                  {(() => {
                    const done = phaseTasks.filter(t => t.status === "Done" || t.status === "Completed").length;
                    return <span className="font-medium">{done}/{phaseTasks.length} done</span>;
                  })()}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit Phase</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Delete Phase</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                </div>
                {phaseTasks.length > 0 && (() => {
                  const done = phaseTasks.filter(t => t.status === "Done" || t.status === "Completed").length;
                  const pct = Math.round((done / phaseTasks.length) * 100);
                  return (
                    <div className="px-4 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-indigo-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <CollapsibleContent>
                <div className="py-2">
                  {phaseTasks.map(renderTask)}
                  <div className="px-4 py-2">
                    <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => openAddTask(phase.id)}>
                      <Plus className="h-4 w-4 mr-2"/> Add Task
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        {unassignedTasks.length > 0 && (
          <Collapsible defaultOpen className="border rounded-md">
            <div className="flex items-center justify-between p-4 bg-muted/20 border-b">
              <CollapsibleTrigger className="flex items-center gap-2 font-semibold text-muted-foreground">
                <ChevronDown className="h-4 w-4" />
                Unassigned Tasks
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="py-2">
                {unassignedTasks.map(renderTask)}
                <div className="px-4 py-2">
                  <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => openAddTask(null)}>
                    <Plus className="h-4 w-4 mr-2"/> Add Task
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      <TaskDetailSheet
        taskId={taskDetailId}
        open={taskDetailOpen}
        onOpenChange={(open) => {
          setTaskDetailOpen(open);
          if (!open) setTaskDetailId(null);
        }}
      />

      <Dialog open={isAddPhaseOpen} onOpenChange={setIsAddPhaseOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Phase</DialogTitle></DialogHeader>
          <Form {...phaseForm}>
            <form onSubmit={phaseForm.handleSubmit(onAddPhase)} className="space-y-4">
              <FormField control={phaseForm.control} name="name" render={({field}) => (
                <FormItem><FormLabel>Phase Name</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>
              )} />
              <FormField control={phaseForm.control} name="status" render={({field}) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Not Started">Not Started</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={phaseForm.control} name="startDate" render={({field}) => (
                  <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field}/></FormControl></FormItem>
                )} />
                <FormField control={phaseForm.control} name="dueDate" render={({field}) => (
                  <FormItem><FormLabel>Due Date</FormLabel><FormControl><Input type="date" {...field}/></FormControl></FormItem>
                )} />
              </div>
              <DialogFooter><Button type="submit" disabled={createPhase.isPending}>Add Phase</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit(onAddTask)} className="space-y-4">
              <FormField control={taskForm.control} name="name" render={({field}) => (
                <FormItem><FormLabel>Task Name</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={taskForm.control} name="status" render={({field}) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Not Started">Not Started</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Blocked">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={taskForm.control} name="priority" render={({field}) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={taskForm.control} name="dueDate" render={({field}) => (
                  <FormItem><FormLabel>Due Date</FormLabel><FormControl><Input type="date" {...field}/></FormControl></FormItem>
                )} />
                <FormField control={taskForm.control} name="effort" render={({field}) => (
                  <FormItem><FormLabel>Effort (hours)</FormLabel><FormControl><Input type="number" {...field}/></FormControl></FormItem>
                )} />
              </div>
              <FormField control={taskForm.control} name="assigneeIds" render={() => (
                <FormItem>
                  <FormLabel>Assignees</FormLabel>
                  <div className="border rounded p-2 h-32 overflow-y-auto space-y-2">
                    {users?.map(user => (
                      <FormField key={user.id} control={taskForm.control} name="assigneeIds" render={({field}) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox 
                              checked={field.value?.includes(user.id)} 
                              onCheckedChange={(checked) => checked ? field.onChange([...field.value, user.id]) : field.onChange(field.value?.filter(id => id !== user.id))}
                            />
                          </FormControl>
                          <FormLabel className="font-normal text-sm">{user.name}</FormLabel>
                        </FormItem>
                      )} />
                    ))}
                  </div>
                </FormItem>
              )} />
              <div className="flex items-center gap-6">
                <FormField control={taskForm.control} name="billable" render={({field}) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange}/></FormControl>
                    <FormLabel>Billable</FormLabel>
                  </FormItem>
                )} />
                <FormField control={taskForm.control} name="isMilestone" render={({field}) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange}/></FormControl>
                    <FormLabel className="flex items-center gap-1"><Milestone className="h-3.5 w-3.5 text-purple-500" /> Milestone</FormLabel>
                  </FormItem>
                )} />
              </div>
              <DialogFooter><Button type="submit" disabled={createTask.isPending}>Add Task</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
