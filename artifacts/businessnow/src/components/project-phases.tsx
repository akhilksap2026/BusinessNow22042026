import { useState, useMemo, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { authHeaders } from "@/lib/auth-headers";
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
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskDetailSheet } from "@/components/task-detail-sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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
  GripVertical,
  ArrowRightLeft,
  Save,
  Undo2,
  X,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TaskNode {
  task: any;
  children: TaskNode[];
  depth: number;
}

type PendingMap = Map<number, { sortOrder: number; parentTaskId: number | null }>;

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
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id)
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

// Flatten a tree into the visible row order, honoring expandedIds.
function flattenVisible(nodes: TaskNode[], expandedIds: Set<number>): TaskNode[] {
  const out: TaskNode[] = [];
  for (const n of nodes) {
    out.push(n);
    if (expandedIds.has(n.task.id)) out.push(...flattenVisible(n.children, expandedIds));
  }
  return out;
}

// All descendant ids (transitive) of a given task id, given the full task list.
function descendantIdsOf(taskId: number, tasks: any[]): Set<number> {
  const out = new Set<number>();
  const stack = [taskId];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const t of tasks) {
      if (t.parentTaskId === cur) {
        out.add(t.id);
        stack.push(t.id);
      }
    }
  }
  return out;
}

// Apply pendingChanges as an overlay on top of the server task list so the UI
// can render optimistically before saving.
function applyPending(tasks: any[], pending: PendingMap): any[] {
  if (pending.size === 0) return tasks;
  return tasks.map((t) => {
    const p = pending.get(t.id);
    if (!p) return t;
    return { ...t, sortOrder: p.sortOrder, parentTaskId: p.parentTaskId };
  });
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

// ── Sortable row ──────────────────────────────────────────────────────────────

interface SortableTaskRowProps {
  node: TaskNode;
  isExpanded: boolean;
  hasChildren: boolean;
  totalEffort: number;
  ownLogged: number;
  totalLogged: number;
  users: any[] | undefined;
  hoursByTaskId: Map<number, number>;
  onToggleExpand: (id: number) => void;
  onOpenDetail: (id: number) => void;
  onCycleStatus: (task: any) => void;
  onAddSubtask: (parentId: number, parentName: string) => void;
  onMoveTo: (task: any) => void;
  onDelete: (id: number) => void;
}

function SortableTaskRow(props: SortableTaskRowProps) {
  const {
    node, isExpanded, hasChildren, totalEffort, ownLogged, totalLogged,
    users, onToggleExpand, onOpenDetail, onCycleStatus, onAddSubtask, onMoveTo, onDelete,
  } = props;
  const { task, depth } = node;
  const showPhaseBadge = !!task.isPhase;
  const INDENT_PX = 20;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    paddingLeft: `${depth * INDENT_PX + 4}px`,
    paddingRight: "8px",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 py-2 border-b last:border-0 hover:bg-muted/40 group ${depthColor(depth)}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="w-5 shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none"
        aria-label="Drag to reorder"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Expand / collapse toggle */}
      <div className="w-5 shrink-0 flex items-center justify-center">
        {hasChildren ? (
          <button
            onClick={() => onToggleExpand(task.id)}
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
        onClick={() => onOpenDetail(task.id)}
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
          <Badge variant="outline" className="text-purple-600">Milestone</Badge>
        </div>
      ) : (
        <div className="w-28 shrink-0 cursor-pointer" onClick={() => onCycleStatus(task)}>
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
          const names = ids.map((uid: number) => users?.find((u: any) => u.id === uid)?.name).filter(Boolean) as string[];
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
            <DropdownMenuItem onClick={() => onOpenDetail(task.id)}>
              Open Details
            </DropdownMenuItem>
            {!task.isMilestone && (
              <DropdownMenuItem onClick={() => onAddSubtask(task.id, task.name)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Sub-task
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onMoveTo(task)}>
              <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
              Move to…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(task.id)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProjectPhases({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: rawTasks, isLoading } = useListTasks(
    { projectId },
    { query: { enabled: !!projectId, queryKey: getListTasksQueryKey({ projectId }) } }
  );
  const serverTasks: any[] = (rawTasks as any[]) ?? [];

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

  // Reorder state
  const [pendingChanges, setPendingChanges] = useState<PendingMap>(new Map());
  const [changeHistory, setChangeHistory] = useState<PendingMap[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeDragId, setActiveDragId] = useState<number | null>(null);

  // Move-to dialog
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveTask, setMoveTask] = useState<any | null>(null);
  const [moveTargetParentId, setMoveTargetParentId] = useState<number | null>(null);
  const [moveSearch, setMoveSearch] = useState("");

  // ── Apply pending overlay so the tree renders optimistically ──────────────

  const allTasks = useMemo(() => applyPending(serverTasks, pendingChanges), [serverTasks, pendingChanges]);
  const tree = useMemo(() => buildTree(allTasks), [allTasks]);
  const allIds = useMemo(() => allNodeIds(tree), [tree]);
  const visibleNodes = useMemo(() => flattenVisible(tree, expandedIds), [tree, expandedIds]);
  const visibleIds = useMemo(() => visibleNodes.map((n) => n.task.id), [visibleNodes]);
  const allExpanded = allIds.length > 0 && allIds.every((id) => expandedIds.has(id));

  function expandAll() { setExpandedIds(new Set(allIds)); }
  function collapseAll() { setExpandedIds(new Set()); }
  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function taskIsParent(taskId: number): boolean {
    return allTasks.some((t) => t.parentTaskId === taskId);
  }

  // ── Reorder logic ─────────────────────────────────────────────────────────

  // Snapshot current pendingChanges before mutating, for undo support.
  function pushHistory(snapshot: PendingMap) {
    setChangeHistory((h) => [...h, new Map(snapshot)]);
  }

  // Renumber a single sibling group using the `desiredOrder` array of task ids
  // (any siblings missing from desiredOrder fall back to their current sort).
  // Diffs are written into `basePending` against the *server* state so the
  // pending map only carries actual changes (and entries whose effective state
  // matches the server are removed).
  function renumberGroup(
    basePending: PendingMap,
    parentId: number | null,
    desiredOrder: number[],
  ): PendingMap {
    const next = new Map(basePending);
    const effective = applyPending(serverTasks, next);
    const groupTasks = effective.filter(
      (t) => (t.parentTaskId ?? null) === (parentId ?? null),
    );
    groupTasks.sort((a, b) => {
      const ai = desiredOrder.indexOf(a.id);
      const bi = desiredOrder.indexOf(b.id);
      if (ai === -1 && bi === -1) {
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id;
      }
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    groupTasks.forEach((t, idx) => {
      const server = serverTasks.find((s) => s.id === t.id);
      const serverParent = (server?.parentTaskId ?? null) as number | null;
      const serverSort = server?.sortOrder ?? 0;
      if (serverSort !== idx || serverParent !== parentId) {
        next.set(t.id, { sortOrder: idx, parentTaskId: parentId });
      } else {
        next.delete(t.id);
      }
    });
    return next;
  }

  // Compute the set of pending writes that result from dragging `movingId` so
  // it lands at the position currently occupied by `overId`, with a horizontal
  // `deltaX` controlling indent (>= 24 → demote into prev sibling; <= -24 →
  // promote one level).
  //
  // All "current state" reads (parent of moving, parent of prev row, etc.)
  // are sourced from the *effective* state (server + accumulated pending),
  // so multi-step reorders compose correctly.
  function computeReorderUpdates(args: {
    movingId: number;
    overId: number;
    deltaX: number;
  }): PendingMap {
    const { movingId, overId, deltaX } = args;
    if (movingId === overId) return new Map(pendingChanges);

    const overIndex = visibleNodes.findIndex((n) => n.task.id === overId);
    const movingIndex = visibleNodes.findIndex((n) => n.task.id === movingId);
    if (overIndex < 0 || movingIndex < 0) return new Map(pendingChanges);

    // Use dnd-kit's arrayMove which correctly handles both directions.
    const reordered = arrayMove(visibleNodes, movingIndex, overIndex);
    const newPos = reordered.findIndex((n) => n.task.id === movingId);
    const prev = newPos > 0 ? reordered[newPos - 1] : null;

    // Effective task lookup (already includes any prior pending changes).
    const effFind = (id: number) => allTasks.find((t) => t.id === id);

    // Determine new parent based on prev row + indent.
    let newParent: number | null = null;
    if (prev) {
      const prevTask = effFind(prev.task.id) ?? prev.task;
      newParent = (prevTask.parentTaskId ?? null) as number | null;
      if (deltaX >= 24) {
        newParent = prevTask.id;
      } else if (deltaX <= -24 && prevTask.parentTaskId != null) {
        const grand = effFind(prevTask.parentTaskId);
        newParent = (grand?.parentTaskId ?? null) as number | null;
      }
    }

    // Cycle protection — uses effective state so descendants reflect any
    // earlier pending re-parenting.
    const movingDescendants = descendantIdsOf(movingId, allTasks);
    if (newParent != null && (newParent === movingId || movingDescendants.has(newParent))) {
      return new Map(pendingChanges);
    }

    // Old parent comes from the *effective* state, not the raw server.
    const oldParent = (effFind(movingId)?.parentTaskId ?? null) as number | null;

    // Build the desired order of the new parent's group: take the visible-row
    // ordering (after arrayMove) of every node whose effective parent is the
    // new parent OR who is the moving task.
    const newGroupOrder = reordered
      .filter((n) => {
        if (n.task.id === movingId) return true;
        const eff = effFind(n.task.id);
        return ((eff?.parentTaskId ?? null) as number | null) === newParent;
      })
      .map((n) => n.task.id);

    // Provisionally place moving task under newParent, then renumber both groups.
    let next = new Map(pendingChanges);
    next.set(movingId, { sortOrder: 0, parentTaskId: newParent });
    next = renumberGroup(next, newParent, newGroupOrder);
    if (oldParent !== newParent) {
      next = renumberGroup(next, oldParent, []); // moving has left, others keep their relative order
    }
    return next;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(Number(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over, delta } = event;
    if (!over || active.id === over.id) return;
    pushHistory(pendingChanges);
    const next = computeReorderUpdates({
      movingId: Number(active.id),
      overId: Number(over.id),
      deltaX: delta?.x ?? 0,
    });
    setPendingChanges(next);
  }

  async function handleSave() {
    if (pendingChanges.size === 0) return;
    setIsSaving(true);
    try {
      const updates = Array.from(pendingChanges.entries()).map(([id, p]) => ({
        id, sortOrder: p.sortOrder, parentTaskId: p.parentTaskId,
      }));
      const res = await fetch("/api/tasks/reorder", {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const out = await res.json();
      setPendingChanges(new Map());
      setChangeHistory([]);
      await queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
      toast({ title: `Saved ${out.updated} change${out.updated === 1 ? "" : "s"}` });
    } catch (err) {
      toast({ title: "Failed to save changes", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDiscard() {
    setPendingChanges(new Map());
    setChangeHistory([]);
    await queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
  }

  function handleUndo() {
    setChangeHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setPendingChanges(new Map(prev));
      return h.slice(0, -1);
    });
  }

  // Cmd/Ctrl+Z keyboard shortcut for undo
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isUndo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey;
      if (isUndo && changeHistory.length > 0) {
        // Don't fight a typing field
        const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        e.preventDefault();
        handleUndo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changeHistory.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

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

  // ── Move-to dialog handlers ───────────────────────────────────────────────

  function openMoveDialog(task: any) {
    // STEP 5: invalidate list before opening the parent picker so we always
    // pick from the freshest task list (in case another tab created tasks).
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
    setMoveTask(task);
    setMoveTargetParentId(task.parentTaskId ?? null);
    setMoveSearch("");
    setMoveDialogOpen(true);
  }

  function confirmMove() {
    if (!moveTask) return;
    const newParent = moveTargetParentId;
    // Cycle protection mirrors the drag path
    const movingDescendants = descendantIdsOf(moveTask.id, allTasks);
    if (newParent != null && (newParent === moveTask.id || movingDescendants.has(newParent))) {
      toast({ title: "Cannot move a task into itself or a descendant.", variant: "destructive" });
      return;
    }
    pushHistory(pendingChanges);

    const oldParent = (allTasks.find((t) => t.id === moveTask.id)?.parentTaskId ?? null) as number | null;
    // Desired order in the new group: existing siblings (in current order) followed by the moving task.
    const existingSiblingIds = allTasks
      .filter((t) => (t.parentTaskId ?? null) === (newParent ?? null) && t.id !== moveTask.id)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id)
      .map((t) => t.id);
    const newGroupOrder = [...existingSiblingIds, moveTask.id];

    let next = new Map(pendingChanges);
    next.set(moveTask.id, { sortOrder: newGroupOrder.length - 1, parentTaskId: newParent });
    next = renumberGroup(next, newParent, newGroupOrder);
    if (oldParent !== newParent) {
      next = renumberGroup(next, oldParent, []);
    }

    setPendingChanges(next);
    setMoveDialogOpen(false);
    if (newParent != null) setExpandedIds((prev) => new Set([...prev, newParent]));
    toast({ title: "Move queued — review unsaved changes to commit." });
  }

  // STEP 5: build parent options excluding self + descendants
  const moveParentOptions = useMemo(() => {
    if (!moveTask) return [] as any[];
    const excluded = new Set<number>([moveTask.id, ...descendantIdsOf(moveTask.id, allTasks)]);
    return allTasks
      .filter((t) => !excluded.has(t.id))
      .filter((t) => !moveSearch || t.name.toLowerCase().includes(moveSearch.toLowerCase()));
  }, [moveTask, allTasks, moveSearch]);

  // Group by phase (top-level isPhase tasks). Tasks not under a phase go into "Other".
  const moveGrouped = useMemo(() => {
    const phaseOf = (t: any): string => {
      // Walk up to find an ancestor with isPhase
      let cur = t;
      const safety = 50;
      for (let i = 0; i < safety; i++) {
        if (cur.isPhase) return cur.name;
        if (cur.parentTaskId == null) break;
        const parent = allTasks.find((x) => x.id === cur.parentTaskId);
        if (!parent) break;
        cur = parent;
      }
      return "Other";
    };
    const groups: Record<string, any[]> = {};
    for (const t of moveParentOptions) {
      const g = phaseOf(t);
      if (!groups[g]) groups[g] = [];
      groups[g].push(t);
    }
    return groups;
  }, [moveParentOptions, allTasks]);

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
          <div className="w-5 shrink-0" />
          <div className="flex-1">Name</div>
          <div className="w-28 shrink-0">Status</div>
          <div className="w-20 shrink-0">Priority</div>
          <div className="w-32 shrink-0">Assigned Resource</div>
          <div className="w-24 shrink-0">Due</div>
          <div className="w-28 shrink-0 text-right">Planned Hours</div>
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
              <div>
                {visibleNodes.map((node) => {
                  const hasChildren = node.children.length > 0;
                  const totalEffort = calcEffort(node);
                  const ownLogged = hoursByTaskId.get(node.task.id) ?? 0;
                  const totalLogged = hasChildren ? calcLoggedHours(node, hoursByTaskId) : ownLogged;
                  return (
                    <SortableTaskRow
                      key={node.task.id}
                      node={node}
                      isExpanded={expandedIds.has(node.task.id)}
                      hasChildren={hasChildren}
                      totalEffort={totalEffort}
                      ownLogged={ownLogged}
                      totalLogged={totalLogged}
                      users={users}
                      hoursByTaskId={hoursByTaskId}
                      onToggleExpand={toggleExpand}
                      onOpenDetail={(id) => { setTaskDetailId(id); setTaskDetailOpen(true); }}
                      onCycleStatus={handleStatusCycle}
                      onAddSubtask={(pid, pname) => openAddTask(pid, pname)}
                      onMoveTo={openMoveDialog}
                      onDelete={handleDelete}
                    />
                  );
                })}
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
            </SortableContext>
            <DragOverlay>
              {activeDragId != null ? (
                <div className="bg-background border rounded shadow-lg px-3 py-2 text-sm font-medium opacity-90">
                  {visibleNodes.find((n) => n.task.id === activeDragId)?.task.name}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Sticky unsaved-changes bar */}
      {pendingChanges.size > 0 && (
        <div className="sticky bottom-4 z-30 flex items-center justify-between gap-3 px-4 py-2.5 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 shadow-md">
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            <span className="font-medium text-amber-900 dark:text-amber-200">
              {pendingChanges.size} unsaved change{pendingChanges.size === 1 ? "" : "s"}
            </span>
            {changeHistory.length > 0 && (
              <span className="text-xs text-amber-700 dark:text-amber-300/80">
                · {changeHistory.length} step{changeHistory.length === 1 ? "" : "s"} can be undone (⌘Z)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {changeHistory.length > 0 && (
              <Button size="sm" variant="ghost" onClick={handleUndo} className="h-7 text-xs gap-1 text-amber-900 dark:text-amber-100">
                <Undo2 className="h-3.5 w-3.5" /> Undo
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleDiscard} disabled={isSaving} className="h-7 text-xs gap-1">
              <X className="h-3.5 w-3.5" /> Discard
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-7 text-xs gap-1">
              <Save className="h-3.5 w-3.5" /> {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}

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

      {/* Move-to dialog (STEP 5 + 6) */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Move task</DialogTitle>
            <DialogDescription>
              {moveTask ? <>Choose a new parent for <span className="font-medium text-foreground">{moveTask.name}</span>.</> : null}
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-md">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search tasks…"
                value={moveSearch}
                onValueChange={setMoveSearch}
              />
              <CommandList className="max-h-72">
                <CommandEmpty>No matching tasks.</CommandEmpty>
                <CommandGroup heading="Top level">
                  <CommandItem
                    value="__top_level__"
                    onSelect={() => setMoveTargetParentId(null)}
                    className={moveTargetParentId === null ? "bg-accent" : ""}
                  >
                    Top Level (no parent)
                  </CommandItem>
                </CommandGroup>
                {Object.entries(moveGrouped).map(([groupName, tasks]) => (
                  <CommandGroup key={groupName} heading={groupName}>
                    {tasks.map((t: any) => (
                      <CommandItem
                        key={t.id}
                        value={`${t.id}-${t.name}`}
                        onSelect={() => setMoveTargetParentId(t.id)}
                        className={moveTargetParentId === t.id ? "bg-accent" : ""}
                      >
                        <span className="truncate">{t.name}</span>
                        {t.isPhase && (
                          <Badge variant="outline" className="ml-2 text-[10px] px-1 py-0 h-4 text-indigo-600 border-indigo-300">Phase</Badge>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMoveDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={confirmMove}>Queue move</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                            <SelectItem key={s} value={s}>{s}</SelectItem>
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
                            <SelectItem key={s} value={s}>{s}</SelectItem>
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
