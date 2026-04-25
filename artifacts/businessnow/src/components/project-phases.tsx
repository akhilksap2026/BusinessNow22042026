import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useListUsers,
  useListAllocations,
  useListTimeEntries,
  getListTasksQueryKey,
  getListAllocationsQueryKey,
  getListTimeEntriesQueryKey,
} from "@workspace/api-client-react";
import { TaskDetailSheet } from "@/components/task-detail-sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Plus,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Calendar,
  Milestone,
  ChevronsDown,
  ChevronsUp,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TaskNode {
  task: any;
  children: TaskNode[];
  depth: number;
}

// ── Depth shading (8 levels, then repeats) ────────────────────────────────────

const DEPTH_COLORS = [
  "",
  "bg-slate-50/80 dark:bg-slate-800/25",
  "bg-sky-50/60 dark:bg-sky-950/20",
  "bg-indigo-50/60 dark:bg-indigo-950/20",
  "bg-violet-50/60 dark:bg-violet-950/20",
  "bg-purple-50/60 dark:bg-purple-950/20",
  "bg-fuchsia-50/60 dark:bg-fuchsia-950/20",
  "bg-pink-50/60 dark:bg-pink-950/20",
];

function depthColor(depth: number): string {
  return DEPTH_COLORS[depth % DEPTH_COLORS.length];
}

// ── Tree helpers ──────────────────────────────────────────────────────────────

function buildTree(tasks: any[], parentId: number | null = null, depth = 0): TaskNode[] {
  return tasks
    .filter((t) => (t.parentTaskId ?? null) === parentId)
    .map((t) => ({
      task: t,
      children: buildTree(tasks, t.id, depth + 1),
      depth,
    }));
}

function calcEffort(node: TaskNode): number {
  if (node.children.length === 0) return Number(node.task.effort) || 0;
  return node.children.reduce((sum, child) => sum + calcEffort(child), 0);
}

function calcLoggedHours(node: TaskNode, hoursByTaskId: Map<number, number>): number {
  const own = hoursByTaskId.get(node.task.id) ?? 0;
  return node.children.reduce((sum, child) => sum + calcLoggedHours(child, hoursByTaskId), own);
}

function allNodeIds(nodes: TaskNode[]): number[] {
  return nodes.flatMap((n) => [n.task.id, ...allNodeIds(n.children)]);
}

function countDescendants(node: TaskNode): number {
  return node.children.reduce((s, c) => s + 1 + countDescendants(c), 0);
}

// ── Form schema ───────────────────────────────────────────────────────────────

const taskSchema = z.object({
  name: z.string().min(1, "Name is required"),
  status: z.enum(["Not Started", "In Progress", "Completed", "Blocked", "Overdue"]),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]),
  assigneeIds: z.array(z.number()),
  dueDate: z.string().optional(),
  effort: z.coerce.number().min(0).optional(),
  billable: z.boolean(),
  isMilestone: z.boolean(),
  milestoneType: z.enum(["Payment", "Project", "External"]).optional(),
  parentTaskId: z.number().nullable().optional(),
});

// ── Component ─────────────────────────────────────────────────────────────────

export function ProjectPhases({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: rawTasks, isLoading } = useListTasks(
    { projectId },
    { query: { enabled: !!projectId, queryKey: getListTasksQueryKey({ projectId }) } }
  );
  const allTasks: any[] = (rawTasks as any[]) ?? [];

  const { data: users } = useListUsers();
  const { data: allocations } = useListAllocations(
    { projectId },
    { query: { enabled: !!projectId, queryKey: getListAllocationsQueryKey({ projectId }) } }
  );
  const { data: timeEntries } = useListTimeEntries(
    { projectId },
    { query: { enabled: !!projectId, queryKey: getListTimeEntriesQueryKey({ projectId }) } }
  );

  const hoursByTaskId = useMemo(() => {
    const map = new Map<number, number>();
    for (const e of (timeEntries as any[]) ?? []) {
      if (e.taskId == null) continue;
      map.set(e.taskId, (map.get(e.taskId) ?? 0) + Number(e.hours ?? 0));
    }
    return map;
  }, [timeEntries]);

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  // ── State ──────────────────────────────────────────────────────────────────

  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [addingParentId, setAddingParentId] = useState<number | null>(null);
  const [addingParentName, setAddingParentName] = useState<string>("");
  const [taskDetailId, setTaskDetailId] = useState<number | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);

  // ── Tree ───────────────────────────────────────────────────────────────────

  const tree = useMemo(() => buildTree(allTasks), [allTasks]);
  const allIds = useMemo(() => allNodeIds(tree), [tree]);
  const allExpanded = allIds.length > 0 && allIds.every((id) => expandedIds.has(id));

  function expandAll() {
    setExpandedIds(new Set(allIds));
  }
  function collapseAll() {
    setExpandedIds(new Set());
  }
  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Whether a task has children in the current data ────────────────────────

  function taskIsParent(taskId: number): boolean {
    return allTasks.some((t) => t.parentTaskId === taskId);
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  const taskForm = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      name: "",
      status: "Not Started",
      priority: "Medium",
      assigneeIds: [],
      billable: true,
      isMilestone: false,
      parentTaskId: null,
    },
  });

  function openAddTask(parentId: number | null, parentName = "") {
    setAddingParentId(parentId);
    setAddingParentName(parentName);
    taskForm.reset({
      name: "",
      status: "Not Started",
      priority: "Medium",
      assigneeIds: [],
      billable: true,
      isMilestone: false,
      parentTaskId: parentId,
    });
    setIsAddTaskOpen(true);
  }

  const onAddTask = async (values: z.infer<typeof taskSchema>) => {
    try {
      await createTask.mutateAsync({
        data: {
          ...values,
          projectId,
          effort: values.effort ?? 0,
          parentTaskId: values.parentTaskId ?? undefined,
          milestoneType: values.milestoneType ?? undefined,
        } as any,
      });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
      if (values.parentTaskId) {
        setExpandedIds((prev) => new Set([...prev, values.parentTaskId!]));
      }
      setIsAddTaskOpen(false);
      taskForm.reset();
      toast({ title: values.parentTaskId ? "Sub-task added" : "Task added" });
    } catch {
      toast({ title: "Error adding task", variant: "destructive" });
    }
  };

  const handleStatusCycle = async (task: any) => {
    const order = ["Not Started", "In Progress", "Completed", "Blocked"];
    const next = order[(order.indexOf(task.status) + 1) % order.length];
    try {
      await updateTask.mutateAsync({ id: task.id, data: { status: next as any } });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
    } catch {
      toast({ title: "Error updating status", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTask.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
      toast({ title: "Task deleted" });
    } catch {
      toast({ title: "Error deleting task", variant: "destructive" });
    }
  };

  // ── Render a single task node (recursive) ──────────────────────────────────

  const INDENT_PX = 20;

  const renderNode = (node: TaskNode): React.ReactNode => {
    const { task, children, depth } = node;
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(task.id);
    const totalEffort = calcEffort(node);
    const ownLogged = hoursByTaskId.get(task.id) ?? 0;
    const totalLogged = hasChildren ? calcLoggedHours(node, hoursByTaskId) : ownLogged;
    const showPhaseBadge = !!task.isPhase;

    return (
      <div key={task.id}>
        {/* ── Task row ── */}
        <div
          className={`flex items-center gap-2 py-2 border-b last:border-0 hover:bg-muted/40 group ${depthColor(depth)}`}
          style={{ paddingLeft: `${depth * INDENT_PX + 12}px`, paddingRight: "8px" }}
        >
          {/* Expand / collapse toggle */}
          <div className="w-5 shrink-0 flex items-center justify-center">
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(task.id)}
                className="rounded p-0.5 hover:bg-muted text-muted-foreground transition-colors"
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <span className="w-3.5 h-3.5 block" />
            )}
          </div>

          {/* Task name */}
          <div
            className="flex-1 min-w-0 text-sm cursor-pointer hover:text-indigo-600 hover:underline flex items-center gap-1.5 truncate"
            onClick={() => {
              setTaskDetailId(task.id);
              setTaskDetailOpen(true);
            }}
          >
            {task.isMilestone && <Milestone className="h-3.5 w-3.5 text-purple-500 shrink-0" />}
            <span className={`truncate ${depth === 0 ? "font-medium" : ""}`}>{task.name}</span>
            {showPhaseBadge && (
              <Badge
                variant="outline"
                className="text-[10px] px-1 py-0 h-4 text-indigo-600 border-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 shrink-0"
                title="Phase — top-level task that groups child tasks"
              >
                Phase
              </Badge>
            )}
            {task.isMilestone && task.milestoneType && (
              <Badge
                variant="outline"
                className="text-[10px] px-1 py-0 h-4 text-purple-600 border-purple-300 shrink-0"
              >
                {task.milestoneType}
              </Badge>
            )}
            {hasChildren && (
              <span className="text-[10px] text-muted-foreground shrink-0 ml-0.5">
                ({countDescendants(node)})
              </span>
            )}
          </div>

          {/* Status */}
          {task.isMilestone ? (
            <div className="w-28 shrink-0">
              <Badge variant="outline" className="text-purple-600">
                Milestone
              </Badge>
            </div>
          ) : (
            <div className="w-28 shrink-0 cursor-pointer" onClick={() => handleStatusCycle(task)}>
              <StatusBadge status={task.status} />
            </div>
          )}

          {/* Priority */}
          <div className="w-20 shrink-0">
            <StatusBadge status={task.priority} />
          </div>

          {/* Assigned Resource */}
          <div className="w-32 shrink-0 text-xs text-muted-foreground truncate">
            {(() => {
              const ids = task.assigneeIds ?? [];
              if (ids.length === 0) return <span className="italic">Unassigned</span>;
              const names = ids.map((uid: number) => users?.find((u) => u.id === uid)?.name).filter(Boolean) as string[];
              if (names.length === 0) return <span className="italic">Unassigned</span>;
              if (names.length === 1) return <span className="font-medium text-foreground">{names[0]}</span>;
              if (names.length === 2) return <span className="font-medium text-foreground">{names[0]}, {names[1]}</span>;
              return <span className="font-medium text-foreground">{names[0]} <span className="text-muted-foreground">+{names.length - 1} more</span></span>;
            })()}
          </div>

          {/* Due date */}
          <div className="w-24 shrink-0 text-xs text-muted-foreground flex items-center gap-1">
            {task.dueDate && (
              <>
                <Calendar className="h-3 w-3 shrink-0" />
                {new Date(task.dueDate).toLocaleDateString()}
              </>
            )}
          </div>

          {/* Effort + Logged time */}
          <div className="w-28 shrink-0 text-xs text-right tabular-nums">
            {task.isMilestone ? null : hasChildren ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help leading-tight">
                    <div className="text-muted-foreground">
                      {totalEffort > 0 ? `${totalEffort % 1 === 0 ? totalEffort : totalEffort.toFixed(1)}h` : "—"}
                      <span className="text-[10px] ml-0.5 opacity-50">plan ∑</span>
                    </div>
                    <div className="text-emerald-600 dark:text-emerald-400">
                      {totalLogged > 0 ? `${totalLogged % 1 === 0 ? totalLogged : totalLogged.toFixed(1)}h` : "—"}
                      <span className="text-[10px] ml-0.5 opacity-60">logged ∑</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[240px] text-xs">
                  <p className="font-semibold">Auto-calculated</p>
                  <p className="mt-0.5">Planned effort: {totalEffort.toFixed(1)}h</p>
                  <p>Logged time: {totalLogged.toFixed(1)}h</p>
                  <p className="text-muted-foreground mt-0.5">
                    Sum of all {countDescendants(node)} descendant task
                    {countDescendants(node) !== 1 ? "s" : ""}. Log time directly on leaf tasks only.
                  </p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="leading-tight">
                <div>{totalEffort > 0 ? `${totalEffort % 1 === 0 ? totalEffort : totalEffort.toFixed(1)}h` : "—"}</div>
                {ownLogged > 0 && (
                  <div className="text-emerald-600 dark:text-emerald-400 text-[10px]">
                    {ownLogged % 1 === 0 ? ownLogged : ownLogged.toFixed(1)}h logged
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions menu */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setTaskDetailId(task.id);
                    setTaskDetailOpen(true);
                  }}
                >
                  Open Details
                </DropdownMenuItem>
                {!task.isMilestone && (
                  <DropdownMenuItem onClick={() => openAddTask(task.id, task.name)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Sub-task
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(task.id)}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── Children (only when expanded) ── */}
        {hasChildren && isExpanded && (
          <div>
            {children.map((child) => renderNode(child))}
            {/* Inline "Add sub-task" at the end of an expanded parent */}
            <div
              className={`border-b py-1 ${depthColor(depth + 1)}`}
              style={{ paddingLeft: `${(depth + 1) * INDENT_PX + 38}px` }}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground px-2 gap-1"
                onClick={() => openAddTask(task.id, task.name)}
              >
                <Plus className="h-3 w-3" />
                Add sub-task
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tasks</h3>
          <span className="text-xs text-muted-foreground">({allTasks.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {allIds.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground"
              onClick={allExpanded ? collapseAll : expandAll}
            >
              {allExpanded ? (
                <ChevronsUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronsDown className="h-3.5 w-3.5" />
              )}
              {allExpanded ? "Collapse All" : "Expand All"}
            </Button>
          )}
          <Button size="sm" onClick={() => openAddTask(null)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-md overflow-hidden">
        {/* Column headers */}
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
          <div className="w-5 shrink-0" />
          <div className="flex-1">Name</div>
          <div className="w-28 shrink-0">Status</div>
          <div className="w-20 shrink-0">Priority</div>
          <div className="w-32 shrink-0">Assigned Resource</div>
          <div className="w-24 shrink-0">Due</div>
          <div className="w-20 shrink-0 text-right">Planned Hours</div>
          <div className="w-7 shrink-0" />
        </div>

        {tree.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No tasks yet.{" "}
            <button
              onClick={() => openAddTask(null)}
              className="text-primary hover:underline font-medium"
            >
              Add the first task
            </button>
          </div>
        ) : (
          <div>
            {tree.map((node) => renderNode(node))}
            {/* Add root task at bottom */}
            <div className="px-3 py-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground px-2 gap-1"
                onClick={() => openAddTask(null)}
              >
                <Plus className="h-3 w-3" />
                Add root task
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        taskId={taskDetailId}
        open={taskDetailOpen}
        onOpenChange={(open) => {
          setTaskDetailOpen(open);
          if (!open) setTaskDetailId(null);
        }}
        isParent={taskDetailId != null ? taskIsParent(taskDetailId) : false}
      />

      {/* Add Task Dialog */}
      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{addingParentId ? "Add Sub-task" : "Add Task"}</DialogTitle>
            {addingParentId && addingParentName && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Under:{" "}
                <span className="font-medium text-foreground">{addingParentName}</span>
              </p>
            )}
          </DialogHeader>
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit(onAddTask)} className="space-y-4">
              <FormField
                control={taskForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Task name…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={taskForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["Not Started", "In Progress", "Completed", "Blocked"].map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={taskForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["Low", "Medium", "High", "Urgent"].map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={taskForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={taskForm.control}
                  name="effort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Effort (hours)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" min="0" placeholder="0" {...field} />
                      </FormControl>
                      <p className="text-[11px] text-muted-foreground">
                        If you add sub-tasks later, effort is auto-summed from them.
                      </p>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={taskForm.control}
                name="assigneeIds"
                render={() => (
                  <FormItem>
                    <FormLabel>Assignees</FormLabel>
                    <div className="border rounded p-2 max-h-32 overflow-y-auto space-y-1.5">
                      {users?.map((user) => {
                        const alloc = allocations?.find((a) => a.userId === user.id);
                        return (
                          <FormField
                            key={user.id}
                            control={taskForm.control}
                            name="assigneeIds"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(user.id)}
                                    onCheckedChange={(checked) =>
                                      checked
                                        ? field.onChange([...field.value, user.id])
                                        : field.onChange(field.value?.filter((id) => id !== user.id))
                                    }
                                  />
                                </FormControl>
                                <div className="flex items-center justify-between flex-1">
                                  <FormLabel className="font-normal text-sm cursor-pointer">
                                    {user.name}
                                  </FormLabel>
                                  {alloc?.role && (
                                    <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded font-medium">
                                      {alloc.role}
                                    </span>
                                  )}
                                </div>
                              </FormItem>
                            )}
                          />
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Roles are inherited from project allocations.
                    </p>
                  </FormItem>
                )}
              />
              <div className="flex items-center gap-6">
                <FormField
                  control={taskForm.control}
                  name="billable"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel>Billable</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={taskForm.control}
                  name="isMilestone"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(val) => {
                            field.onChange(val);
                            if (!val) taskForm.setValue("milestoneType", undefined);
                          }}
                        />
                      </FormControl>
                      <FormLabel className="flex items-center gap-1">
                        <Milestone className="h-3.5 w-3.5 text-purple-500" />
                        Milestone
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              {taskForm.watch("isMilestone") && (
                <FormField
                  control={taskForm.control}
                  name="milestoneType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Milestone Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Payment">Payment — triggers invoice on completion</SelectItem>
                          <SelectItem value="Project">Project — internal project milestone</SelectItem>
                          <SelectItem value="External">External — client-facing milestone</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddTaskOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTask.isPending}>
                  {addingParentId ? "Add Sub-task" : "Add Task"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
