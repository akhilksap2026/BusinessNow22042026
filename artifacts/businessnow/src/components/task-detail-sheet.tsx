import { useState } from "react";
import { hasRole } from "@/lib/roles";
import { authHeaders } from "@/lib/auth-headers";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/contexts/current-user";
import { useTaskStatuses, taskStatusLabel } from "@/lib/task-status";
import {
  useListTaskComments,
  useCreateTaskComment,
  useDeleteTaskComment,
  useListTaskChecklist,
  useCreateTaskChecklistItem,
  useUpdateTaskChecklistItem,
  useDeleteTaskChecklistItem,
  useUpdateTask,
  useListUsers,
  useListTaskNotes,
  useCreateTaskNote,
  useDeleteTaskNote,
  getListTaskCommentsQueryKey,
  getListTaskChecklistQueryKey,
  getListTaskNotesQueryKey,
  getListTasksQueryKey,
  useGetTask,
} from "@workspace/api-client-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useUndoableMutation } from "@/hooks/use-undoable-mutation";
import {
  Trash2, Plus, Flag, CheckSquare, MessageSquare, Milestone,
  Shield, GitBranch, AlertTriangle, FileText, Clock, Pencil,
  CalendarDays, Users, X, Hash,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface TaskDetailSheetProps {
  taskId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isParent?: boolean;
}

const STATUS_OPTIONS_FALLBACK = ["Not Started", "Started", "On Hold", "Canceled", "Completed"];
const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"];
const APPROVAL_OPTIONS = ["none", "pending", "approved", "rejected"];

function statusColor(status: string) {
  if (status === "Completed") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (status === "In Progress" || status === "Started") return "bg-blue-100 text-blue-800 border-blue-200";
  if (status === "On Hold") return "bg-amber-100 text-amber-800 border-amber-200";
  if (status === "Canceled") return "bg-slate-100 text-slate-500 border-slate-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function priorityDot(p: string) {
  if (p === "Critical") return "bg-red-500";
  if (p === "High") return "bg-orange-400";
  if (p === "Medium") return "bg-yellow-400";
  return "bg-slate-300";
}

function priorityTextColor(p: string) {
  if (p === "Critical") return "text-red-700";
  if (p === "High") return "text-orange-600";
  if (p === "Medium") return "text-yellow-700";
  return "text-slate-600";
}

export function TaskDetailSheet({ taskId, open, onOpenChange, isParent = false }: TaskDetailSheetProps) {
  const { toast } = useToast();
  const undoable = useUndoableMutation();
  const queryClient = useQueryClient();

  const { data: users } = useListUsers();
  const { statuses: dynamicStatusOptions } = useTaskStatuses();
  const STATUS_OPTIONS = dynamicStatusOptions.length > 0 ? dynamicStatusOptions : STATUS_OPTIONS_FALLBACK;

  const { data: comments, isLoading: loadingComments } = useListTaskComments(taskId ?? 0, {
    query: { enabled: !!taskId, queryKey: [...getListTaskCommentsQueryKey(taskId ?? 0)] },
  });
  const { data: checklist, isLoading: loadingChecklist } = useListTaskChecklist(taskId ?? 0, {
    query: { enabled: !!taskId, queryKey: [...getListTaskChecklistQueryKey(taskId ?? 0)] },
  });
  const { data: notes, isLoading: loadingNotes } = useListTaskNotes(taskId ?? 0, {
    query: { enabled: !!taskId, queryKey: [...getListTaskNotesQueryKey(taskId ?? 0)] },
  });

  const createComment = useCreateTaskComment();
  const deleteComment = useDeleteTaskComment();
  const createItem = useCreateTaskChecklistItem();
  const updateItem = useUpdateTaskChecklistItem();
  const deleteItem = useDeleteTaskChecklistItem();
  const createNote = useCreateTaskNote();
  const deleteNote = useDeleteTaskNote();
  const updateTask = useUpdateTask();

  const [newComment, setNewComment] = useState("");
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [newNote, setNewNote] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [addingChecklist, setAddingChecklist] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [editNoteId, setEditNoteId] = useState<number | null>(null);
  const [editNoteContent, setEditNoteContent] = useState("");
  const [addingDep, setAddingDep] = useState(false);
  const [depForm, setDepForm] = useState({ predecessorId: "", dependencyType: "FS", lagDays: "0" });
  const [addingDailyAlloc, setAddingDailyAlloc] = useState(false);
  const [dailyAllocForm, setDailyAllocForm] = useState({ workDate: "", userId: "", hours: "8" });
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const { data: dependencies, refetch: refetchDeps } = useQuery<any[]>({
    queryKey: ["task-deps", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const res = await fetch(`/api/tasks/${taskId}/dependencies`, { headers: authHeaders() });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!taskId,
  });

  const { data: dailyAllocs, refetch: refetchDailyAllocs } = useQuery<any[]>({
    queryKey: ["task-daily-allocs", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const res = await fetch(`/api/tasks/${taskId}/daily-allocations`, { headers: authHeaders() });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!taskId,
  });

  const projectTasksForDeps = (queryClient.getQueriesData({ predicate: q => Array.isArray(q.queryKey) && q.queryKey[0] === "listTasks" }) as any[])
    .flatMap(([, d]: any) => Array.isArray(d) ? d : [])
    .filter(Boolean);

  async function handleAddDep() {
    if (!taskId || !depForm.predecessorId) return;
    try {
      await fetch(`/api/tasks/${taskId}/dependencies`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ predecessorId: parseInt(depForm.predecessorId), dependencyType: depForm.dependencyType, lagDays: parseInt(depForm.lagDays) || 0 }),
      });
      refetchDeps();
      setAddingDep(false);
      setDepForm({ predecessorId: "", dependencyType: "FS", lagDays: "0" });
    } catch { /* ignore */ }
  }

  async function handleDeleteDep(depId: number) {
    try {
      await fetch(`/api/task-dependencies/${depId}`, { method: "DELETE", headers: authHeaders() });
      refetchDeps();
    } catch { /* ignore */ }
  }

  const { currentUser, activeRole } = useCurrentUser();
  const currentUserId = currentUser?.id ?? 1;

  const { data: task } = useGetTask(taskId ?? 0, {
    query: { enabled: !!taskId } as any,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListTaskCommentsQueryKey(taskId ?? 0) });
    queryClient.invalidateQueries({ queryKey: getListTaskChecklistQueryKey(taskId ?? 0) });
    queryClient.invalidateQueries({ queryKey: getListTaskNotesQueryKey(taskId ?? 0) });
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
  }

  async function handleToggleChecklist(item: any) {
    if (!taskId) return;
    await updateItem.mutateAsync({ id: taskId, itemId: item.id, data: { completed: !item.completed } });
    queryClient.invalidateQueries({ queryKey: getListTaskChecklistQueryKey(taskId) });
  }

  async function handleDeleteChecklist(item: any) {
    if (!taskId) return;
    await deleteItem.mutateAsync({ id: taskId, itemId: item.id });
    queryClient.invalidateQueries({ queryKey: getListTaskChecklistQueryKey(taskId) });
  }

  async function handleAddChecklist() {
    if (!newChecklistItem.trim() || !taskId) return;
    await createItem.mutateAsync({ id: taskId, data: { taskId, name: newChecklistItem.trim() } });
    setNewChecklistItem("");
    setAddingChecklist(false);
    queryClient.invalidateQueries({ queryKey: getListTaskChecklistQueryKey(taskId) });
  }

  async function handleAddComment() {
    if (!newComment.trim() || !taskId) return;
    await createComment.mutateAsync({ id: taskId, data: { taskId, userId: currentUserId, content: newComment.trim() } });
    setNewComment("");
    setAddingComment(false);
    queryClient.invalidateQueries({ queryKey: getListTaskCommentsQueryKey(taskId) });
  }

  async function handleDeleteComment(commentId: number) {
    if (!taskId) return;
    await deleteComment.mutateAsync({ id: taskId, commentId });
    queryClient.invalidateQueries({ queryKey: getListTaskCommentsQueryKey(taskId) });
  }

  async function handleAddNote() {
    if (!newNote.trim() || !taskId) return;
    try {
      await createNote.mutateAsync({ id: taskId, data: { userId: currentUserId, content: newNote.trim() } });
      setNewNote("");
      setAddingNote(false);
      queryClient.invalidateQueries({ queryKey: getListTaskNotesQueryKey(taskId) });
    } catch {
      toast({ title: "Failed to add note", variant: "destructive" });
    }
  }

  async function handleDeleteNote(noteId: number) {
    if (!taskId) return;
    try {
      await deleteNote.mutateAsync({ taskId, noteId });
      queryClient.invalidateQueries({ queryKey: getListTaskNotesQueryKey(taskId) });
    } catch {
      toast({ title: "Failed to delete note", variant: "destructive" });
    }
  }

  async function handleSaveEditNote() {
    if (!taskId || editNoteId === null || !editNoteContent.trim()) return;
    try {
      await fetch(`/api/tasks/${taskId}/notes/${editNoteId}`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ content: editNoteContent.trim() }),
      });
      queryClient.invalidateQueries({ queryKey: getListTaskNotesQueryKey(taskId) });
      setEditNoteId(null);
      setEditNoteContent("");
    } catch {
      toast({ title: "Failed to update note", variant: "destructive" });
    }
  }

  async function handleUpdateField(field: string, value: any) {
    if (!taskId) return;
    const previous = task ? (task as any)[field] : undefined;
    await undoable.run({
      do: async () => {
        await updateTask.mutateAsync({ id: taskId, data: { [field]: value } as any });
        invalidate();
      },
      undo: async () => {
        await updateTask.mutateAsync({ id: taskId, data: { [field]: previous } as any });
        invalidate();
      },
      successTitle: "Task updated",
      description: field,
      errorTitle: "Failed to update task",
    });
  }

  const completedCount = checklist?.filter((i) => i.completed).length ?? 0;
  const totalCount = checklist?.length ?? 0;

  const userName = (userId: number) => {
    const u = users?.find((u) => u.id === userId);
    return u ? u.name : `User ${userId}`;
  };

  const userInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

  // Unique assignees derived from daily allocations
  const assignees: { userId: number; name: string; totalHours: number }[] = [];
  if (dailyAllocs) {
    const map = new Map<number, number>();
    for (const da of dailyAllocs) {
      map.set(da.userId, (map.get(da.userId) ?? 0) + Number(da.allocatedHours ?? 0));
    }
    for (const [uid, hrs] of map) {
      assignees.push({ userId: uid, name: userName(uid), totalHours: hrs });
    }
  }

  if (!taskId) return null;

  const completionPct = (task as any)?.completionPct ?? 0;
  const canonical = taskStatusLabel(task?.status);
  const priority = task?.priority ?? "Medium";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[700px] w-full p-0 flex flex-col overflow-hidden">
        <TooltipProvider delayDuration={200}>

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="border-b bg-white px-5 pt-4 pb-3 flex-shrink-0">
            {/* Title row */}
            <div className="flex items-start gap-2 mb-2">
              <div className="flex-1 min-w-0">
                {editingTitle ? (
                  <Input
                    className="text-base font-semibold h-8 px-2"
                    value={titleDraft}
                    autoFocus
                    onChange={e => setTitleDraft(e.target.value)}
                    onBlur={() => {
                      if (titleDraft.trim() && titleDraft !== task?.name) handleUpdateField("name", titleDraft.trim());
                      setEditingTitle(false);
                    }}
                    onKeyDown={e => {
                      if (e.key === "Enter") { e.currentTarget.blur(); }
                      if (e.key === "Escape") { setEditingTitle(false); }
                    }}
                  />
                ) : (
                  <h2
                    className="text-base font-semibold text-slate-900 leading-snug cursor-text hover:text-indigo-700 transition-colors"
                    onClick={() => { setTitleDraft(task?.name ?? ""); setEditingTitle(true); }}
                  >
                    {task?.name ?? "Task Details"}
                  </h2>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                  <Hash className="h-3 w-3" />{taskId}
                </span>
                {task?.isMilestone && (
                  <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50 gap-1 text-[11px] h-5 px-1.5">
                    <Milestone className="h-3 w-3" />Milestone
                  </Badge>
                )}
                {isParent && (
                  <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-[11px] h-5 px-1.5">Phase</Badge>
                )}
              </div>
            </div>

            {/* Status / Priority / Approval strip */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status */}
              {(() => {
                const opts = STATUS_OPTIONS.includes(canonical) ? STATUS_OPTIONS : [...STATUS_OPTIONS, canonical];
                return (
                  <Select value={canonical} onValueChange={v => handleUpdateField("status", v)}>
                    <SelectTrigger className={`h-6 text-[11px] font-medium border rounded-full px-2.5 gap-1 w-auto ${statusColor(canonical)}`} style={{ minWidth: 0 }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {opts.map(s => (
                        <SelectItem key={s} value={s}>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(s)}`}>{s}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              })()}

              {/* Priority */}
              <Select value={priority} onValueChange={v => handleUpdateField("priority", v)}>
                <SelectTrigger className="h-6 text-[11px] font-medium border rounded-full px-2.5 gap-1.5 w-auto bg-white" style={{ minWidth: 0 }}>
                  <span className={`inline-flex items-center gap-1.5 ${priorityTextColor(priority)}`}>
                    <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${priorityDot(priority)}`} />
                    <Flag className="h-3 w-3 flex-shrink-0" />
                    {priority}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(p => (
                    <SelectItem key={p} value={p}>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${priorityTextColor(p)}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${priorityDot(p)}`} />
                        {p}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Approval status */}
              {(task as any)?.approvalStatus && (task as any).approvalStatus !== "none" && (
                <Badge variant="outline" className="h-6 px-2.5 gap-1 text-[11px] capitalize">
                  <Shield className="h-3 w-3" />{(task as any).approvalStatus}
                </Badge>
              )}

              {/* Flags */}
              <label className="flex items-center gap-1 cursor-pointer ml-auto">
                <Checkbox
                  checked={task?.billable ?? true}
                  onCheckedChange={v => handleUpdateField("billable", !!v)}
                  className="h-3.5 w-3.5"
                />
                <span className="text-[11px] text-muted-foreground">Billable</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <Checkbox
                  checked={task?.isMilestone ?? false}
                  onCheckedChange={v => handleUpdateField("isMilestone", !!v)}
                  className="h-3.5 w-3.5"
                />
                <span className="text-[11px] text-muted-foreground">Milestone</span>
              </label>
            </div>
          </div>

          {/* ── Scrollable body ─────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">

            {/* Key fields grid */}
            <div className="px-5 pt-3 pb-0 grid grid-cols-2 gap-x-4 gap-y-3">

              {/* Start date */}
              <div>
                <label className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground flex items-center gap-1 mb-1">
                  <CalendarDays className="h-3 w-3" />Start Date
                </label>
                <Input
                  type="date"
                  className="h-7 text-xs"
                  defaultValue={task?.startDate ?? ""}
                  onBlur={e => { if (e.target.value) handleUpdateField("startDate", e.target.value); }}
                />
              </div>

              {/* Due date */}
              <div>
                <label className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground flex items-center gap-1 mb-1">
                  <CalendarDays className="h-3 w-3" />Due Date
                </label>
                <Input
                  type="date"
                  className="h-7 text-xs"
                  defaultValue={task?.dueDate ?? ""}
                  onBlur={e => { if (e.target.value) handleUpdateField("dueDate", e.target.value); }}
                />
              </div>

              {/* Completion — spans both cols */}
              {!isParent && (
                <div className="col-span-2">
                  <label className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground flex items-center justify-between mb-1">
                    <span>Completion</span>
                    <span className="tabular-nums font-semibold text-foreground text-xs">{completionPct}%</span>
                  </label>
                  <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden mb-1">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-indigo-500 transition-all"
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min={0} max={100} step={5}
                    className="w-full h-1 accent-indigo-600 cursor-pointer"
                    key={`cp-${taskId}-${completionPct}`}
                    defaultValue={completionPct}
                    onMouseUp={e => handleUpdateField("completionPct", Number((e.target as HTMLInputElement).value))}
                    onTouchEnd={e => handleUpdateField("completionPct", Number((e.target as HTMLInputElement).value))}
                  />
                </div>
              )}
            </div>

            {/* Hours stat bar */}
            <div className="px-5 py-3">
              {isParent ? (
                <div className="flex items-center gap-1.5 h-8 rounded border border-dashed border-amber-300 bg-amber-50 px-3 text-xs text-amber-700">
                  <span className="font-medium">Auto-calculated</span>
                  <span className="text-amber-400">—</span>
                  <span>sum of child tasks. Log time on leaf tasks only.</span>
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-px bg-slate-200 rounded-lg overflow-hidden border border-slate-200">
                  {/* Planned */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-white px-2 py-2">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Planned</div>
                        <Input
                          type="number" min={0} step="0.25"
                          className="h-6 text-xs px-1.5 border-0 bg-transparent p-0 focus-visible:ring-0 font-semibold text-slate-700"
                          defaultValue={task?.plannedHours ?? task?.effort ?? 0}
                          onBlur={e => {
                            if (e.target.value === "") return;
                            handleUpdateField("plannedHours", Math.max(0, Number(e.target.value) || 0));
                          }}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">Originally planned hours</TooltipContent>
                  </Tooltip>

                  {/* Estimate */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-white px-2 py-2">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Estimate</div>
                        <Input
                          type="number" min={0} step="0.25"
                          className="h-6 text-xs px-1.5 border-0 bg-transparent p-0 focus-visible:ring-0 font-semibold text-slate-700"
                          defaultValue={task?.estimateHours ?? task?.plannedHours ?? task?.effort ?? 0}
                          onBlur={e => {
                            if (e.target.value === "") return;
                            handleUpdateField("estimateHours", Math.max(0, Number(e.target.value) || 0));
                          }}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">Current revised estimate</TooltipContent>
                  </Tooltip>

                  {/* Actual */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-slate-50 px-2 py-2 cursor-default">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Actual</div>
                        <div className="text-xs font-semibold text-slate-700 leading-6">{(task?.actualHours ?? 0).toFixed(1)}h</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">Sum of logged time entries</TooltipContent>
                  </Tooltip>

                  {/* ETC */}
                  <div className={`px-2 py-2 ${Number(task?.etc ?? 0) < 0 ? "bg-red-50" : "bg-white"}`}>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-0.5">
                      ETC
                      {(task as any)?.etcOverride != null && <span className="text-[8px] text-violet-500">(m)</span>}
                      {Number(task?.etc ?? 0) < 0 && <AlertTriangle className="h-2.5 w-2.5 text-red-500 ml-0.5" />}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Input
                        type="number" step="0.25"
                        className={`h-6 text-xs px-1 border-0 bg-transparent p-0 focus-visible:ring-0 font-semibold w-full ${Number(task?.etc ?? 0) < 0 ? "text-red-600" : "text-slate-700"}`}
                        defaultValue={Number(task?.etc ?? 0).toFixed(1)}
                        key={`etc-${taskId}-${(task as any)?.etcOverride}`}
                        onBlur={e => {
                          if (e.target.value === "") return;
                          handleUpdateField("etcOverride", Number(parseFloat(e.target.value).toFixed(2)));
                        }}
                      />
                      {(task as any)?.etcOverride != null && (
                        <button type="button" onClick={() => handleUpdateField("etcOverride", null)}
                          className="text-muted-foreground hover:text-foreground leading-none text-xs px-0.5">×</button>
                      )}
                    </div>
                  </div>

                  {/* EAC */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-slate-50 px-2 py-2 cursor-default">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">EAC</div>
                        <div className="text-xs font-semibold text-slate-700 leading-6">{(task?.eac ?? 0).toFixed(1)}h</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">Estimate at Completion = Actual + |ETC|</TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>

            {/* Assignees */}
            <div className="px-5 pb-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />Assignees
                </label>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" onClick={() => setAddingDailyAlloc(true)}>
                  <Plus className="h-3 w-3" />Add
                </Button>
              </div>

              {assignees.length === 0 && !addingDailyAlloc ? (
                <p className="text-xs text-muted-foreground">No assignees yet. Add a daily allocation to assign someone.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {assignees.map(a => (
                    <div key={a.userId} className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 rounded-full pl-1 pr-2 py-0.5 transition-colors">
                      <Avatar className="h-5 w-5 flex-shrink-0">
                        <AvatarFallback className="text-[9px] bg-indigo-100 text-indigo-700">{userInitials(a.name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-slate-700">{a.name}</span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">{a.totalHours}h</span>
                    </div>
                  ))}
                </div>
              )}

              {addingDailyAlloc && (
                <div className="mt-2 p-3 border rounded-lg bg-slate-50 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="date"
                      className="h-7 text-xs col-span-1"
                      value={dailyAllocForm.workDate}
                      onChange={e => setDailyAllocForm(f => ({ ...f, workDate: e.target.value }))}
                    />
                    <Select value={dailyAllocForm.userId} onValueChange={v => setDailyAllocForm(f => ({ ...f, userId: v }))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Assignee…" /></SelectTrigger>
                      <SelectContent>
                        {users?.map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number" min={0.25} max={24} step={0.25}
                      className="h-7 text-xs"
                      placeholder="Hours"
                      value={dailyAllocForm.hours}
                      onChange={e => setDailyAllocForm(f => ({ ...f, hours: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs"
                      disabled={!dailyAllocForm.workDate || !dailyAllocForm.userId}
                      onClick={async () => {
                        await fetch(`/api/tasks/${taskId}/daily-allocations`, {
                          method: "POST",
                          headers: { ...authHeaders(), "Content-Type": "application/json" },
                          body: JSON.stringify({ userId: Number(dailyAllocForm.userId), workDate: dailyAllocForm.workDate, allocatedHours: Number(dailyAllocForm.hours) }),
                        });
                        setDailyAllocForm({ workDate: "", userId: "", hours: "8" });
                        setAddingDailyAlloc(false);
                        refetchDailyAllocs();
                      }}
                    >Save</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingDailyAlloc(false); setDailyAllocForm({ workDate: "", userId: "", hours: "8" }); }}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Approval status select (compact, below assignees) */}
            <div className="px-5 pb-3 flex items-center gap-3">
              <label className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground flex-shrink-0">Approval</label>
              <Select defaultValue={(task as any)?.approvalStatus ?? "none"} onValueChange={v => handleUpdateField("approvalStatus", v)}>
                <SelectTrigger className="h-7 text-xs w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPROVAL_OPTIONS.map(a => (
                    <SelectItem key={a} value={a} className="text-xs capitalize">{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Created / updated metadata */}
              {(task as any)?.createdAt && (
                <span className="text-[11px] text-muted-foreground ml-auto">
                  Created {formatDistanceToNow(new Date((task as any).createdAt), { addSuffix: true })}
                </span>
              )}
            </div>

            {/* ── Tabs ────────────────────────────────────────────────────────── */}
            <div className="border-t">
              <Tabs defaultValue="checklist" className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b bg-white h-9 px-5 gap-0">
                  <TabsTrigger value="checklist" className="text-xs h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-3">
                    <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                    Checklist
                    {totalCount > 0 && <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.5 tabular-nums">{completedCount}/{totalCount}</span>}
                  </TabsTrigger>
                  <TabsTrigger value="dependencies" className="text-xs h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-3">
                    <GitBranch className="h-3.5 w-3.5 mr-1.5" />
                    Deps
                    {(dependencies?.length ?? 0) > 0 && <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.5 tabular-nums">{dependencies?.length}</span>}
                  </TabsTrigger>
                  <TabsTrigger value="daily" className="text-xs h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-3">
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    Daily Hours
                    {(dailyAllocs?.length ?? 0) > 0 && <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.5 tabular-nums">{dailyAllocs?.length}</span>}
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="text-xs h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-3">
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                    Comments
                    {(comments?.length ?? 0) > 0 && <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.5 tabular-nums">{comments?.length}</span>}
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-3">
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    Notes
                    {(notes?.length ?? 0) > 0 && <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.5 tabular-nums">{notes?.length}</span>}
                  </TabsTrigger>
                </TabsList>

                {/* Checklist tab */}
                <TabsContent value="checklist" className="m-0 px-5 py-3">
                  {totalCount > 0 && (
                    <div className="w-full bg-slate-100 rounded-full h-1 mb-3">
                      <div
                        className="bg-indigo-500 h-1 rounded-full transition-all"
                        style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                      />
                    </div>
                  )}
                  {loadingChecklist ? (
                    <p className="text-xs text-muted-foreground py-2">Loading…</p>
                  ) : (
                    <div className="space-y-0.5">
                      {checklist?.sort((a, b) => a.order - b.order).map(item => (
                        <div key={item.id} className="flex items-center gap-2 group py-1 px-1 rounded hover:bg-slate-50">
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={() => handleToggleChecklist(item)}
                            className="h-3.5 w-3.5"
                          />
                          <span className={`text-sm flex-1 ${item.completed ? "line-through text-muted-foreground" : ""}`}>{item.name}</span>
                          <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground"
                            onClick={() => handleDeleteChecklist(item)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {addingChecklist ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        placeholder="New item…"
                        className="h-7 text-xs flex-1"
                        value={newChecklistItem}
                        onChange={e => setNewChecklistItem(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleAddChecklist(); if (e.key === "Escape") { setAddingChecklist(false); setNewChecklistItem(""); } }}
                        autoFocus
                      />
                      <Button size="sm" className="h-7 text-xs" onClick={handleAddChecklist} disabled={!newChecklistItem.trim()}>Add</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingChecklist(false); setNewChecklistItem(""); }}>Cancel</Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs gap-1 text-muted-foreground" onClick={() => setAddingChecklist(true)}>
                      <Plus className="h-3 w-3" />Add item
                    </Button>
                  )}
                </TabsContent>

                {/* Dependencies tab */}
                <TabsContent value="dependencies" className="m-0 px-5 py-3">
                  {dependencies && dependencies.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {dependencies.map(dep => {
                        const isSuccessor = dep.successorId === taskId;
                        const otherName = isSuccessor ? dep.predecessorName : dep.successorName;
                        return (
                          <div key={dep.id} className="flex items-center justify-between gap-2 group py-1 px-2 rounded hover:bg-muted/40">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">{dep.dependencyType}</span>
                              <span className="text-[11px] text-muted-foreground shrink-0">{isSuccessor ? "After:" : "Blocks:"}</span>
                              <span className="text-sm truncate">{otherName}</span>
                              {dep.lagDays > 0 && <span className="text-[11px] text-muted-foreground shrink-0">+{dep.lagDays}d</span>}
                            </div>
                            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground shrink-0"
                              onClick={() => handleDeleteDep(dep.id)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {addingDep ? (
                    <div className="space-y-2 p-2 border rounded bg-muted/20">
                      <div className="flex gap-2">
                        <Select value={depForm.predecessorId} onValueChange={v => setDepForm(f => ({ ...f, predecessorId: v }))}>
                          <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Predecessor task…" /></SelectTrigger>
                          <SelectContent>
                            {projectTasksForDeps.filter(t => t.id !== taskId).map(t => (
                              <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={depForm.dependencyType} onValueChange={v => setDepForm(f => ({ ...f, dependencyType: v }))}>
                          <SelectTrigger className="h-7 text-xs w-16"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["FS", "SS", "FF", "SF"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number" min={0} className="h-7 text-xs w-20"
                          placeholder="Lag d"
                          value={depForm.lagDays}
                          onChange={e => setDepForm(f => ({ ...f, lagDays: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-xs" onClick={handleAddDep} disabled={!depForm.predecessorId}>Add</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingDep(false); setDepForm({ predecessorId: "", dependencyType: "FS", lagDays: "0" }); }}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => setAddingDep(true)}>
                      <Plus className="h-3 w-3" />Add dependency
                    </Button>
                  )}
                </TabsContent>

                {/* Daily hours tab */}
                <TabsContent value="daily" className="m-0 px-5 py-3">
                  {dailyAllocs && dailyAllocs.length > 0 ? (
                    <div className="space-y-0.5 mb-3">
                      {dailyAllocs.map((da: any) => (
                        <div key={da.id} className="flex items-center justify-between gap-2 group py-1 px-2 rounded hover:bg-muted/40">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{da.workDate}</span>
                            <span className="text-sm truncate">{users?.find((u: any) => u.id === da.userId)?.name ?? `User ${da.userId}`}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-medium tabular-nums">{da.allocatedHours}h</span>
                            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground"
                              onClick={async () => {
                                await fetch(`/api/tasks/${taskId}/daily-allocations/${da.id}`, { method: "DELETE", headers: authHeaders() });
                                refetchDailyAllocs();
                              }}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !addingDailyAlloc ? (
                    <p className="text-xs text-muted-foreground mb-2">No daily allocations yet.</p>
                  ) : null}
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => setAddingDailyAlloc(true)}>
                    <Plus className="h-3 w-3" />Add allocation
                  </Button>
                </TabsContent>

                {/* Comments tab */}
                <TabsContent value="comments" className="m-0 px-5 py-3">
                  {loadingComments ? (
                    <p className="text-xs text-muted-foreground py-2">Loading…</p>
                  ) : (
                    <div className="space-y-3">
                      {comments?.length === 0 && !addingComment && (
                        <p className="text-xs text-muted-foreground">No comments yet.</p>
                      )}
                      {comments?.map(comment => (
                        <div key={comment.id} className="flex gap-2.5 group">
                          <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                            <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700">
                              {userInitials(userName(comment.userId))}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs font-medium">{userName(comment.userId)}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {comment.createdAt ? format(new Date(comment.createdAt), "MMM d, h:mm a") : ""}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 mt-0.5 break-words">{comment.content}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground flex-shrink-0"
                            onClick={() => handleDeleteComment(comment.id)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {addingComment ? (
                    <div className="mt-3 space-y-2">
                      <Textarea
                        placeholder="Write a comment…"
                        className="text-sm resize-none"
                        rows={3}
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-xs" onClick={handleAddComment} disabled={!newComment.trim()}>Post</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingComment(false); setNewComment(""); }}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" className="mt-3 h-7 text-xs gap-1 text-muted-foreground" onClick={() => setAddingComment(true)}>
                      <Plus className="h-3 w-3" />Add comment
                    </Button>
                  )}
                </TabsContent>

                {/* Notes tab */}
                <TabsContent value="notes" className="m-0 px-5 py-3">
                  {loadingNotes ? (
                    <p className="text-xs text-muted-foreground py-2">Loading…</p>
                  ) : (
                    <div className="space-y-3">
                      {notes?.length === 0 && !addingNote && (
                        <p className="text-xs text-muted-foreground">No notes yet.</p>
                      )}
                      {notes?.map(note => {
                        const canEdit = note.userId === currentUserId || hasRole(activeRole, "super_user");
                        const isEditing = editNoteId === note.id;
                        return (
                          <div key={note.id} className="flex gap-2.5 group">
                            <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                              <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">
                                {(note.userName || `U${note.userId}`).split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className="text-xs font-medium">{note.userName}</span>
                                <span className="text-[11px] text-muted-foreground">
                                  {note.createdAt ? formatDistanceToNow(new Date(note.createdAt), { addSuffix: true }) : ""}
                                </span>
                              </div>
                              {isEditing ? (
                                <div className="mt-1 space-y-2">
                                  <Textarea
                                    className="text-sm resize-none"
                                    rows={3}
                                    value={editNoteContent}
                                    onChange={e => setEditNoteContent(e.target.value)}
                                    autoFocus
                                  />
                                  <div className="flex gap-2">
                                    <Button size="sm" className="h-7 text-xs" onClick={handleSaveEditNote} disabled={!editNoteContent.trim()}>Save</Button>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditNoteId(null); setEditNoteContent(""); }}>Cancel</Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-slate-700 mt-0.5 break-words whitespace-pre-wrap">{note.content}</p>
                              )}
                            </div>
                            {canEdit && !isEditing && (
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0">
                                <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground"
                                  onClick={() => { setEditNoteId(note.id); setEditNoteContent(note.content); }}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground"
                                  onClick={() => handleDeleteNote(note.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {addingNote ? (
                    <div className="mt-3 space-y-2">
                      <Textarea
                        placeholder="Add a note…"
                        className="text-sm resize-none"
                        rows={3}
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-xs" onClick={handleAddNote} disabled={!newNote.trim()}>Save</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingNote(false); setNewNote(""); }}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" className="mt-3 h-7 text-xs gap-1 text-muted-foreground" onClick={() => setAddingNote(true)}>
                      <Plus className="h-3 w-3" />Add note
                    </Button>
                  )}
                </TabsContent>
              </Tabs>
            </div>

          </div>
        </TooltipProvider>
      </SheetContent>
    </Sheet>
  );
}
