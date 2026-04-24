import { useState, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  useGetProjectTemplate,
  useUpdateProjectTemplate,
  useCreateTemplatePhase,
  useUpdateTemplatePhase,
  useDeleteTemplatePhase,
  useCreateTemplateTask,
  useUpdateTemplateTask,
  useDeleteTemplateTask,
  useListTemplateAllocations,
  useCreateTemplateAllocation,
  useUpdateTemplateAllocation,
  useDeleteTemplateAllocation,
  useGetTemplateAllocationsSummary,
  useListUsers,
  getListProjectTemplatesQueryKey,
  getGetProjectTemplateQueryKey,
  getListTemplateAllocationsQueryKey,
  getGetTemplateAllocationsSummaryQueryKey,
  type TemplatePhase,
  type TemplateTask,
  type TemplateAllocation,
} from "@workspace/api-client-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronRight,
  LayoutTemplate, Archive, ArchiveRestore, GripVertical,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const BILLING_TYPES = ["Fixed Fee", "Time & Materials", "Retainer", "Milestone-Based"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const ROLES = ["PM", "Developer", "Designer", "QA", "Finance", "Analyst", "Consultant", "Tech Lead"];

// ─── Inline editable field ───────────────────────────────────────────────────

function InlineEdit({
  value, onSave, label, className = "", type = "text",
}: { value: string; onSave: (v: string) => Promise<void>; label: string; className?: string; type?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  async function commit() {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        type="button"
        className={`group flex items-center gap-1 text-left hover:text-primary transition-colors ${className}`}
        onClick={() => { setDraft(value); setEditing(true); }}
      >
        {value || <span className="text-muted-foreground italic">({label})</span>}
        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 shrink-0" />
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <Input
        type={type}
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        className="h-7 text-sm py-0 px-2"
      />
      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={commit}>
        <Check className="h-3.5 w-3.5 text-green-600" />
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(false)}>
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </div>
  );
}

// ─── Task row ────────────────────────────────────────────────────────────────

function TaskRow({
  task, onDelete, onUpdate,
}: {
  task: TemplateTask;
  onDelete: () => Promise<void>;
  onUpdate: (data: Partial<TemplateTask>) => Promise<void>;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-md bg-background">
      <div className="flex items-center gap-2 px-3 py-2">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
        <button type="button" className="mr-0.5 text-muted-foreground hover:text-foreground" onClick={() => setExpanded(p => !p)}>
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <InlineEdit
            value={task.name}
            label="Task name"
            className="font-medium text-sm"
            onSave={v => onUpdate({ name: v })}
          />
        </div>
        <Badge variant="outline" className="text-xs shrink-0">Day +{task.relativeDueDateOffset}</Badge>
        <Badge
          variant="secondary"
          className={`text-xs shrink-0 ${task.priority === "High" || task.priority === "Critical" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : task.priority === "Medium" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : ""}`}
        >
          {task.priority}
        </Badge>
        {task.assigneeRolePlaceholder && (
          <Badge variant="outline" className="text-xs shrink-0 text-purple-700 border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800">
            {task.assigneeRolePlaceholder}
          </Badge>
        )}
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-red-500" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 grid grid-cols-2 gap-3 border-t bg-muted/20">
          <div className="space-y-1 mt-2">
            <Label className="text-xs text-muted-foreground">Due offset (days from project start)</Label>
            <Input
              type="number"
              min={0}
              defaultValue={task.relativeDueDateOffset}
              className="h-7 text-sm"
              onBlur={e => onUpdate({ relativeDueDateOffset: parseInt(e.target.value, 10) || 0 })}
            />
          </div>
          <div className="space-y-1 mt-2">
            <Label className="text-xs text-muted-foreground">Effort (hours)</Label>
            <Input
              type="number"
              min={0}
              step={0.5}
              defaultValue={task.effort}
              className="h-7 text-sm"
              onBlur={e => onUpdate({ effort: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Priority</Label>
            <Select defaultValue={task.priority} onValueChange={v => onUpdate({ priority: v })}>
              <SelectTrigger className="h-7 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Role placeholder</Label>
            <Select
              value={task.assigneeRolePlaceholder ?? ""}
              onValueChange={v => onUpdate({ assigneeRolePlaceholder: v === "__none__" ? null : v })}
            >
              <SelectTrigger className="h-7 text-sm"><SelectValue placeholder="No placeholder" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No placeholder</SelectItem>
                {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs text-muted-foreground">Billable by default</Label>
            <Select
              value={task.billableDefault ? "yes" : "no"}
              onValueChange={v => onUpdate({ billableDefault: v === "yes" })}
            >
              <SelectTrigger className="h-7 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Billable</SelectItem>
                <SelectItem value="no">Non-Billable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{task.name}</strong> from this template. This won't affect existing projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Phase card ───────────────────────────────────────────────────────────────

function PhaseCard({
  phase, onUpdate, onDelete, onAddTask, onDeleteTask, onUpdateTask,
}: {
  phase: TemplatePhase & { tasks: TemplateTask[] };
  onUpdate: (data: Partial<TemplatePhase>) => Promise<void>;
  onDelete: () => Promise<void>;
  onAddTask: (data: { name: string; relativeDueDateOffset: number; priority: string; effort: number; billableDefault: boolean; assigneeRolePlaceholder: string | null }) => Promise<void>;
  onDeleteTask: (taskId: number) => Promise<void>;
  onUpdateTask: (taskId: number, data: Partial<TemplateTask>) => Promise<void>;
}) {
  const [open, setOpen] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ name: "", relativeDueDateOffset: phase.relativeEndOffset, priority: "Medium", effort: 0, billableDefault: true, assigneeRolePlaceholder: "" });
  const [savingTask, setSavingTask] = useState(false);

  async function submitTask() {
    if (!taskForm.name.trim()) return;
    setSavingTask(true);
    await onAddTask({
      ...taskForm,
      assigneeRolePlaceholder: taskForm.assigneeRolePlaceholder || null,
    });
    setSavingTask(false);
    setTaskForm({ name: "", relativeDueDateOffset: phase.relativeEndOffset, priority: "Medium", effort: 0, billableDefault: true, assigneeRolePlaceholder: "" });
    setAddingTask(false);
  }

  return (
    <Card className="border-l-4 border-l-primary/30">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-foreground">
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </CollapsibleTrigger>
            <div className="flex-1 min-w-0">
              <InlineEdit
                value={phase.name}
                label="Phase name"
                className="font-semibold"
                onSave={v => onUpdate({ name: v })}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">
                Day +{phase.relativeStartOffset} → +{phase.relativeEndOffset}
              </span>
              <Badge variant="outline" className="text-xs">{phase.tasks.length} tasks</Badge>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex gap-3 ml-6 mt-2">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground w-24 shrink-0">Starts (day +)</Label>
              <Input
                type="number"
                min={0}
                defaultValue={phase.relativeStartOffset}
                className="h-6 text-xs w-16 py-0 px-2"
                onBlur={e => onUpdate({ relativeStartOffset: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground w-20 shrink-0">Ends (day +)</Label>
              <Input
                type="number"
                min={0}
                defaultValue={phase.relativeEndOffset}
                className="h-6 text-xs w-16 py-0 px-2"
                onBlur={e => onUpdate({ relativeEndOffset: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 px-4 pb-4 space-y-2">
            {phase.tasks.length === 0 && !addingTask && (
              <p className="text-xs text-muted-foreground text-center py-3 border border-dashed rounded-md">No tasks yet — add one below</p>
            )}
            {phase.tasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                onDelete={() => onDeleteTask(task.id)}
                onUpdate={data => onUpdateTask(task.id, data)}
              />
            ))}

            {addingTask ? (
              <div className="border rounded-md p-3 bg-muted/20 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Task Name *</Label>
                    <Input
                      autoFocus
                      placeholder="e.g. Write tech spec"
                      value={taskForm.name}
                      onChange={e => setTaskForm(f => ({ ...f, name: e.target.value }))}
                      onKeyDown={e => { if (e.key === "Enter") submitTask(); if (e.key === "Escape") setAddingTask(false); }}
                      className="h-7 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Due offset (days from start)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={taskForm.relativeDueDateOffset}
                      onChange={e => setTaskForm(f => ({ ...f, relativeDueDateOffset: parseInt(e.target.value, 10) || 0 }))}
                      className="h-7 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Effort (hours)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={taskForm.effort}
                      onChange={e => setTaskForm(f => ({ ...f, effort: parseFloat(e.target.value) || 0 }))}
                      className="h-7 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Priority</Label>
                    <Select value={taskForm.priority} onValueChange={v => setTaskForm(f => ({ ...f, priority: v }))}>
                      <SelectTrigger className="h-7 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Role Placeholder</Label>
                    <Select value={taskForm.assigneeRolePlaceholder || "__none__"} onValueChange={v => setTaskForm(f => ({ ...f, assigneeRolePlaceholder: v === "__none__" ? "" : v }))}>
                      <SelectTrigger className="h-7 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setAddingTask(false)}>Cancel</Button>
                  <Button size="sm" disabled={!taskForm.name.trim() || savingTask} onClick={submitTask}>
                    {savingTask ? "Adding…" : "Add Task"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="ghost" className="w-full text-muted-foreground hover:text-foreground border border-dashed" onClick={() => setAddingTask(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Task
              </Button>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete phase?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{phase.name}</strong> and all {phase.tasks.length} task(s) in it? This won't affect existing projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ─── Allocations section ──────────────────────────────────────────────────────

type Placeholder = { id: number; name: string; role: string };

function useApiBase() {
  return (import.meta as { env: { VITE_API_BASE_URL?: string } }).env.VITE_API_BASE_URL ?? "";
}

function usePlaceholders() {
  const base = useApiBase();
  return useQuery({
    queryKey: ["placeholders"],
    queryFn: async (): Promise<Placeholder[]> => {
      const r = await fetch(`${base}/api/placeholders`);
      if (!r.ok) throw new Error("Failed to load placeholders");
      return r.json();
    },
  });
}

const ALLOCATION_ROLES = ["PM", "Developer", "Designer", "QA", "Finance", "Analyst", "Consultant", "Tech Lead"];

function AllocationRow({
  alloc, totalDays, placeholders, users, onUpdate, onDelete,
}: {
  alloc: TemplateAllocation;
  totalDays: number;
  placeholders: Placeholder[];
  users: { id: number; name: string }[];
  onUpdate: (data: Partial<TemplateAllocation>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState({
    relativeStartDay: alloc.relativeStartDay,
    relativeEndDay: alloc.relativeEndDay,
    hoursPerDay: alloc.hoursPerDay,
    role: alloc.role,
    isSoftAllocation: alloc.isSoftAllocation,
  });
  useEffect(() => {
    setForm({
      relativeStartDay: alloc.relativeStartDay,
      relativeEndDay: alloc.relativeEndDay,
      hoursPerDay: alloc.hoursPerDay,
      role: alloc.role,
      isSoftAllocation: alloc.isSoftAllocation,
    });
  }, [alloc]);

  const isPlaceholder = alloc.placeholderId != null;
  const ph = isPlaceholder ? placeholders.find(p => p.id === alloc.placeholderId) : null;
  const usr = !isPlaceholder ? users.find(u => u.id === alloc.userId) : null;
  const days = Math.max(0, alloc.relativeEndDay - alloc.relativeStartDay + 1);
  const total = days * alloc.hoursPerDay;

  const safeTotal = Math.max(totalDays, 1);
  const startPct = ((alloc.relativeStartDay - 1) / safeTotal) * 100;
  const widthPct = (days / safeTotal) * 100;

  async function commitEdit() {
    await onUpdate(form);
    setEditing(false);
  }

  return (
    <div className="border rounded-md bg-background" data-testid={`row-allocation-${alloc.id}`}>
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {isPlaceholder ? (
            <Badge variant="outline" className="text-xs text-purple-700 border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800">
              {ph?.name ?? `Placeholder #${alloc.placeholderId}`}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              {usr?.name ?? `User #${alloc.userId}`}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">{alloc.role}</Badge>
          {alloc.isSoftAllocation && <Badge variant="outline" className="text-xs text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400">Soft</Badge>}
        </div>
        <div className="text-xs text-muted-foreground shrink-0 tabular-nums">
          Day {alloc.relativeStartDay}–{alloc.relativeEndDay} · {alloc.hoursPerDay}h/day · <strong className="text-foreground">{total}h</strong>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setEditing(p => !p)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Timeline bar */}
      <div className="px-3 pb-2">
        <div className="relative h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`absolute top-0 h-full rounded-full ${alloc.isSoftAllocation ? "bg-amber-400/70" : isPlaceholder ? "bg-purple-500/70" : "bg-primary/70"}`}
            style={{ left: `${startPct}%`, width: `${Math.max(widthPct, 1)}%` }}
          />
        </div>
      </div>

      {editing && (
        <div className="px-3 pb-3 pt-0 grid grid-cols-5 gap-2 border-t bg-muted/20">
          <div className="space-y-1 mt-2">
            <Label className="text-xs text-muted-foreground">Start day</Label>
            <Input type="number" min={1} value={form.relativeStartDay} className="h-7 text-sm"
              onChange={e => setForm(f => ({ ...f, relativeStartDay: parseInt(e.target.value, 10) || 1 }))} />
          </div>
          <div className="space-y-1 mt-2">
            <Label className="text-xs text-muted-foreground">End day</Label>
            <Input type="number" min={1} value={form.relativeEndDay} className="h-7 text-sm"
              onChange={e => setForm(f => ({ ...f, relativeEndDay: parseInt(e.target.value, 10) || 1 }))} />
          </div>
          <div className="space-y-1 mt-2">
            <Label className="text-xs text-muted-foreground">Hours/day</Label>
            <Input type="number" min={0} step={0.5} value={form.hoursPerDay} className="h-7 text-sm"
              onChange={e => setForm(f => ({ ...f, hoursPerDay: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div className="space-y-1 mt-2">
            <Label className="text-xs text-muted-foreground">Role</Label>
            <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
              <SelectTrigger className="h-7 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALLOCATION_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 mt-2">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select value={form.isSoftAllocation ? "soft" : "hard"} onValueChange={v => setForm(f => ({ ...f, isSoftAllocation: v === "soft" }))}>
              <SelectTrigger className="h-7 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hard">Hard</SelectItem>
                <SelectItem value="soft">Soft (tentative)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-5 flex justify-end gap-2 mt-1">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={commitEdit}>Save</Button>
          </div>
        </div>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove allocation?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove this {alloc.role} allocation (Day {alloc.relativeStartDay}–{alloc.relativeEndDay}). This won't affect existing projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={onDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AllocationsSection({ templateId, totalDays }: { templateId: number; totalDays: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: allocations = [], isLoading } = useListTemplateAllocations(templateId);
  const { data: summary } = useGetTemplateAllocationsSummary(templateId);
  const { data: placeholders = [] } = usePlaceholders();
  const { data: users = [] } = useListUsers();

  const createAlloc = useCreateTemplateAllocation();
  const updateAlloc = useUpdateTemplateAllocation();
  const deleteAlloc = useDeleteTemplateAllocation();

  const [adding, setAdding] = useState(false);
  type AssignType = "placeholder" | "user";
  const [form, setForm] = useState<{
    assignType: AssignType; placeholderId: string; userId: string; role: string;
    relativeStartDay: number; relativeEndDay: number; hoursPerDay: number; isSoftAllocation: boolean;
  }>({
    assignType: "placeholder", placeholderId: "", userId: "", role: "Developer",
    relativeStartDay: 1, relativeEndDay: Math.max(totalDays, 1), hoursPerDay: 6, isSoftAllocation: false,
  });
  const [saving, setSaving] = useState(false);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListTemplateAllocationsQueryKey(templateId) });
    queryClient.invalidateQueries({ queryKey: getGetTemplateAllocationsSummaryQueryKey(templateId) });
    queryClient.invalidateQueries({ queryKey: getGetProjectTemplateQueryKey(templateId) });
    // List view embeds nested allocations[] in every template — refresh it too.
    queryClient.invalidateQueries({ queryKey: getListProjectTemplatesQueryKey() });
  }

  async function submitAdd() {
    if (form.assignType === "placeholder" && !form.placeholderId) {
      toast({ title: "Select a placeholder", variant: "destructive" }); return;
    }
    if (form.assignType === "user" && !form.userId) {
      toast({ title: "Select a user", variant: "destructive" }); return;
    }
    if (form.relativeEndDay < form.relativeStartDay) {
      toast({ title: "End day must be on or after start day", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      await createAlloc.mutateAsync({
        id: templateId,
        data: {
          placeholderId: form.assignType === "placeholder" ? parseInt(form.placeholderId, 10) : undefined,
          userId: form.assignType === "user" ? parseInt(form.userId, 10) : undefined,
          role: form.role,
          relativeStartDay: form.relativeStartDay,
          relativeEndDay: form.relativeEndDay,
          hoursPerDay: form.hoursPerDay,
          isSoftAllocation: form.isSoftAllocation,
        } as never,
      });
      invalidate();
      setForm(f => ({ ...f, placeholderId: "", userId: "" }));
      setAdding(false);
      toast({ title: "Allocation added" });
    } catch {
      toast({ title: "Failed to add allocation", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(allocId: number, data: Partial<TemplateAllocation>) {
    try {
      await updateAlloc.mutateAsync({ allocId, data: data as never });
      invalidate();
    } catch {
      toast({ title: "Failed to update allocation", variant: "destructive" });
    }
  }

  async function handleDelete(allocId: number) {
    try {
      await deleteAlloc.mutateAsync({ allocId });
      invalidate();
      toast({ title: "Allocation removed" });
    } catch {
      toast({ title: "Failed to remove allocation", variant: "destructive" });
    }
  }

  const safeTotal = Math.max(totalDays, 1);
  const tickStep = safeTotal <= 14 ? 1 : safeTotal <= 30 ? 5 : safeTotal <= 90 ? 10 : 30;
  const ticks = [] as number[];
  for (let d = 1; d <= safeTotal; d += tickStep) ticks.push(d);
  if (ticks[ticks.length - 1] !== safeTotal) ticks.push(safeTotal);

  return (
    <div className="space-y-3" data-testid="section-allocations">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Resource Allocations</h3>
          <p className="text-xs text-muted-foreground">Pre-plan resource time using relative days. Day 1 = project start date.</p>
        </div>
        {!adding && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAdding(true)} data-testid="button-add-allocation">
            <Plus className="h-3.5 w-3.5" /> Add Allocation
          </Button>
        )}
      </div>

      {/* Day-axis ruler */}
      <div className="px-3 py-2 rounded-md bg-muted/30 border">
        <div className="relative h-4 text-[10px] text-muted-foreground">
          {ticks.map(d => (
            <div key={d} className="absolute top-0 -translate-x-1/2 tabular-nums" style={{ left: `${((d - 1) / safeTotal) * 100}%` }}>
              D{d}
            </div>
          ))}
        </div>
      </div>

      {isLoading && <Skeleton className="h-16 w-full rounded-md" />}

      {!isLoading && allocations.length === 0 && !adding && (
        <div className="text-center py-8 border border-dashed rounded-lg text-muted-foreground">
          <p className="text-sm font-medium">No allocations yet</p>
          <p className="text-xs mt-1">Add placeholders or named resources with day-range coverage.</p>
        </div>
      )}

      <div className="space-y-2">
        {allocations.map(a => (
          <AllocationRow
            key={a.id}
            alloc={a}
            totalDays={safeTotal}
            placeholders={placeholders}
            users={users.map(u => ({ id: u.id, name: u.name }))}
            onUpdate={data => handleUpdate(a.id, data)}
            onDelete={() => handleDelete(a.id)}
          />
        ))}
      </div>

      {adding && (
        <Card className="border-dashed border-primary/40">
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Assign to *</Label>
                <Select value={form.assignType} onValueChange={v => setForm(f => ({ ...f, assignType: v as AssignType }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder">Placeholder (role to fill)</SelectItem>
                    <SelectItem value="user">Named user</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{form.assignType === "placeholder" ? "Placeholder *" : "User *"}</Label>
                {form.assignType === "placeholder" ? (
                  <Select value={form.placeholderId} onValueChange={v => setForm(f => ({ ...f, placeholderId: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select placeholder…" /></SelectTrigger>
                    <SelectContent>
                      {placeholders.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={form.userId} onValueChange={v => setForm(f => ({ ...f, userId: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select user…" /></SelectTrigger>
                    <SelectContent>
                      {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Role *</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALLOCATION_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Start day *</Label>
                <Input type="number" min={1} value={form.relativeStartDay} className="h-8 text-sm"
                  onChange={e => setForm(f => ({ ...f, relativeStartDay: parseInt(e.target.value, 10) || 1 }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End day *</Label>
                <Input type="number" min={1} value={form.relativeEndDay} className="h-8 text-sm"
                  onChange={e => setForm(f => ({ ...f, relativeEndDay: parseInt(e.target.value, 10) || 1 }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hours/day *</Label>
                <Input type="number" min={0} step={0.5} value={form.hoursPerDay} className="h-8 text-sm"
                  onChange={e => setForm(f => ({ ...f, hoursPerDay: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={form.isSoftAllocation ? "soft" : "hard"} onValueChange={v => setForm(f => ({ ...f, isSoftAllocation: v === "soft" }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hard">Hard</SelectItem>
                    <SelectItem value="soft">Soft (tentative)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                {Math.max(0, form.relativeEndDay - form.relativeStartDay + 1)} days × {form.hoursPerDay}h ={" "}
                <strong className="text-foreground">{Math.max(0, form.relativeEndDay - form.relativeStartDay + 1) * form.hoursPerDay}h total</strong>
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
                <Button size="sm" disabled={saving} onClick={submitAdd} data-testid="button-save-allocation">
                  {saving ? "Adding…" : "Add Allocation"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {summary && summary.byRole && summary.byRole.length > 0 && (
        <div className="border rounded-lg p-3 bg-muted/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Effort by Role</span>
            <span className="text-sm">
              <strong className="text-foreground tabular-nums">{summary.totalHours}h</strong>
              <span className="text-muted-foreground"> · {summary.totalPersonDays} person-days</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2" data-testid="allocation-summary">
            {summary.byRole.map(t => (
              <Badge key={t.role} variant="secondary" className="text-xs">
                {t.role}: <strong className="ml-1 tabular-nums">{t.totalHours}h</strong>
                <span className="ml-1 text-muted-foreground">({t.personDays}pd)</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main TemplateEditor ──────────────────────────────────────────────────────

interface TemplateEditorProps {
  templateId: number;
  onClose?: () => void;
}

export function TemplateEditor({ templateId, onClose }: TemplateEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: template, isLoading } = useGetProjectTemplate(templateId, {
    query: { queryKey: getGetProjectTemplateQueryKey(templateId) },
  });

  const updateTemplate = useUpdateProjectTemplate();
  const createPhase = useCreateTemplatePhase();
  const updatePhase = useUpdateTemplatePhase();
  const deletePhase = useDeleteTemplatePhase();
  const createTask = useCreateTemplateTask();
  const updateTask = useUpdateTemplateTask();
  const deleteTask = useDeleteTemplateTask();

  const [addingPhase, setAddingPhase] = useState(false);
  const [phaseForm, setPhaseForm] = useState({ name: "", relativeStartOffset: 0, relativeEndOffset: 7 });
  const [savingPhase, setSavingPhase] = useState(false);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetProjectTemplateQueryKey(templateId) });
    queryClient.invalidateQueries({ queryKey: getListProjectTemplatesQueryKey() });
  }

  async function handleUpdateTemplate(data: Record<string, unknown>) {
    try {
      await updateTemplate.mutateAsync({ id: templateId, data: data as never });
      invalidate();
    } catch {
      toast({ title: "Failed to update template", variant: "destructive" });
    }
  }

  async function handleArchiveToggle() {
    await handleUpdateTemplate({ isArchived: !template?.isArchived });
    toast({ title: template?.isArchived ? "Template restored" : "Template archived" });
  }

  async function handleAddPhase() {
    if (!phaseForm.name.trim()) return;
    setSavingPhase(true);
    try {
      const order = (template?.phases?.length ?? 0);
      await createPhase.mutateAsync({ id: templateId, data: { ...phaseForm, order } });
      invalidate();
      setPhaseForm({ name: "", relativeStartOffset: 0, relativeEndOffset: 7 });
      setAddingPhase(false);
    } catch {
      toast({ title: "Failed to add phase", variant: "destructive" });
    } finally {
      setSavingPhase(false);
    }
  }

  async function handleUpdatePhase(phaseId: number, data: Partial<TemplatePhase>) {
    try {
      await updatePhase.mutateAsync({ phaseId, data: data as never });
      invalidate();
    } catch {
      toast({ title: "Failed to update phase", variant: "destructive" });
    }
  }

  async function handleDeletePhase(phaseId: number) {
    try {
      await deletePhase.mutateAsync({ phaseId });
      invalidate();
      toast({ title: "Phase deleted" });
    } catch {
      toast({ title: "Failed to delete phase", variant: "destructive" });
    }
  }

  async function handleAddTask(phaseId: number, data: {
    name: string; relativeDueDateOffset: number; priority: string; effort: number; billableDefault: boolean; assigneeRolePlaceholder: string | null;
  }) {
    const order = (template?.phases?.find(p => p.id === phaseId)?.tasks?.length ?? 0);
    await createTask.mutateAsync({ phaseId, data: { ...data, effort: data.effort, order } });
    invalidate();
  }

  async function handleDeleteTask(taskId: number) {
    try {
      await deleteTask.mutateAsync({ taskId });
      invalidate();
      toast({ title: "Task removed" });
    } catch {
      toast({ title: "Failed to delete task", variant: "destructive" });
    }
  }

  async function handleUpdateTask(taskId: number, data: Partial<TemplateTask>) {
    try {
      await updateTask.mutateAsync({ taskId, data: data as never });
      invalidate();
    } catch {
      toast({ title: "Failed to update task", variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
      </div>
    );
  }

  if (!template) {
    return <p className="text-muted-foreground text-sm py-8 text-center">Template not found.</p>;
  }

  const phases = (template.phases ?? []) as (TemplatePhase & { tasks: TemplateTask[] })[];
  const totalTasks = phases.reduce((sum, p) => sum + (p.tasks?.length ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <LayoutTemplate className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <InlineEdit
              value={template.name}
              label="Template name"
              className="font-bold text-lg leading-tight"
              onSave={v => handleUpdateTemplate({ name: v })}
            />
            <InlineEdit
              value={template.description ?? ""}
              label="Add description"
              className="text-sm text-muted-foreground mt-0.5"
              onSave={v => handleUpdateTemplate({ description: v })}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {template.isArchived && <Badge variant="secondary" className="text-xs">Archived</Badge>}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={handleArchiveToggle}
          >
            {template.isArchived
              ? <><ArchiveRestore className="h-3.5 w-3.5" /> Restore</>
              : <><Archive className="h-3.5 w-3.5" /> Archive</>
            }
          </Button>
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Template metadata */}
      <div className="grid grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg border">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Billing Type</Label>
          <Select value={template.billingType} onValueChange={v => handleUpdateTemplate({ billingType: v })}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BILLING_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Total Duration (days)</Label>
          <Input
            type="number"
            min={1}
            defaultValue={template.totalDurationDays}
            className="h-8 text-sm"
            onBlur={e => handleUpdateTemplate({ totalDurationDays: parseInt(e.target.value, 10) || 30 })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Structure</Label>
          <div className="h-8 flex items-center gap-3 text-sm text-muted-foreground">
            <span><strong className="text-foreground">{phases.length}</strong> phases</span>
            <span><strong className="text-foreground">{totalTasks}</strong> tasks</span>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground" htmlFor="auto-alloc-toggle">Auto-allocate on use</Label>
          <div className="h-8 flex items-center gap-2">
            <Switch
              id="auto-alloc-toggle"
              checked={!!template.autoAllocate}
              onCheckedChange={v => handleUpdateTemplate({ autoAllocate: v })}
              data-testid="switch-auto-allocate"
            />
            <span className="text-xs text-muted-foreground">
              {template.autoAllocate ? "Allocations copied to project" : "Manual allocation"}
            </span>
          </div>
        </div>
      </div>

      {/* Phases */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Phases</h3>
          {!addingPhase && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAddingPhase(true)}>
              <Plus className="h-3.5 w-3.5" /> Add Phase
            </Button>
          )}
        </div>

        {phases.length === 0 && !addingPhase && (
          <div className="text-center py-10 border border-dashed rounded-lg text-muted-foreground">
            <LayoutTemplate className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No phases yet</p>
            <p className="text-xs mt-1">Add phases to define the project structure and tasks.</p>
          </div>
        )}

        {phases.map(phase => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            onUpdate={data => handleUpdatePhase(phase.id, data)}
            onDelete={() => handleDeletePhase(phase.id)}
            onAddTask={data => handleAddTask(phase.id, data)}
            onDeleteTask={taskId => handleDeleteTask(taskId)}
            onUpdateTask={(taskId, data) => handleUpdateTask(taskId, data)}
          />
        ))}

        {addingPhase && (
          <Card className="border-dashed border-primary/40" data-testid="form-add-phase">
            <CardContent className="pt-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Phase Name *</Label>
                <Input
                  autoFocus
                  placeholder="e.g. Discovery & Planning"
                  value={phaseForm.name}
                  onChange={e => setPhaseForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") handleAddPhase(); if (e.key === "Escape") setAddingPhase(false); }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Starts (day +)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={phaseForm.relativeStartOffset}
                    onChange={e => setPhaseForm(f => ({ ...f, relativeStartOffset: parseInt(e.target.value, 10) || 0 }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ends (day +)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={phaseForm.relativeEndOffset}
                    onChange={e => setPhaseForm(f => ({ ...f, relativeEndOffset: parseInt(e.target.value, 10) || 0 }))}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setAddingPhase(false)}>Cancel</Button>
                <Button disabled={!phaseForm.name.trim() || savingPhase} onClick={handleAddPhase}>
                  {savingPhase ? "Adding…" : "Add Phase"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Allocations */}
      <AllocationsSection templateId={templateId} totalDays={template.totalDurationDays} />
    </div>
  );
}
