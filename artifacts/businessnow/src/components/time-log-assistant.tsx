import { useState, useEffect, useMemo } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { authHeaders } from "@/lib/auth-headers";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  useListTimeEntries, useListAllocations, useListTasks, useListTimeCategories,
  useCreateTimeEntry, useSubmitTimesheet, useListTimesheets, useListProjects,
  getListTimeEntriesQueryKey, getListTimesheetsQueryKey, getListTasksQueryKey,
} from "@workspace/api-client-react";
import { useCurrentUser } from "@/contexts/current-user";
import {
  CheckCircle2, AlertTriangle, Circle, ChevronRight, ChevronLeft,
  Sparkles, Pencil, SkipForward, Loader2, Clock, Briefcase, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PendingEntry {
  uid: string;
  date: string;
  projectId: number | null;
  projectName: string;
  taskId: number | null;
  taskName: string;
  categoryId: number | null;
  categoryName: string;
  hours: number;
  comment: string;
}

const HOUR_CHIPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8];
const DAILY_TARGET = 8;
const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function weekDates(ref: Date): string[] {
  const mon = startOfWeek(ref, { weekStartsOn: 1 });
  return [0, 1, 2, 3, 4].map(i => format(addDays(mon, i), "yyyy-MM-dd"));
}

function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function hoursForDay(entries: any[], date: string): number {
  return entries.filter(e => e.date === date).reduce((s: number, e: any) => s + Number(e.hours), 0);
}

function totalHoursForProject(entries: any[], pending: PendingEntry[], projectId: number | null, week: string[]): number {
  const existing = entries
    .filter(e => e.projectId === projectId && week.includes(e.date))
    .reduce((s: number, e: any) => s + Number(e.hours), 0);
  const pendingH = pending
    .filter(p => p.projectId === projectId && week.includes(p.date))
    .reduce((s, p) => s + p.hours, 0);
  return existing + pendingH;
}

function uid(): string {
  return Math.random().toString(36).slice(2);
}

interface TimeLogAssistantProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = {
  MODE: 0, DAY_SELECT: 1, PROJECT: 2, TASK: 3, HOURS: 4,
  OVERRUN: 45, CATEGORY: 5, COMMENT: 6, DAY_SUMMARY: 7, REVIEW: 8,
};

export function TimeLogAssistant({ open, onClose }: TimeLogAssistantProps) {
  const { currentUser } = useCurrentUser();
  const userId = currentUser?.id ?? 1;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const today = todayStr();
  const weekDays = weekDates(new Date());

  const [step, setStep] = useState(STEPS.MODE);
  const [mode, setMode] = useState<"today" | "week">("today");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [currentDayIdx, setCurrentDayIdx] = useState(0);

  const [selectedProjectId, setSelectedProjectId] = useState<number | null | "INTERNAL">("INTERNAL");
  const [selectedProjectName, setSelectedProjectName] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedTaskName, setSelectedTaskName] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("");
  const [hours, setHours] = useState<number | null>(null);
  const [customHours, setCustomHours] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [pendingEntries, setPendingEntries] = useState<PendingEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingUid, setEditingUid] = useState<string | null>(null);

  const currentDay = selectedDays[currentDayIdx] ?? today;

  const { data: allocations } = useListAllocations({ userId }, { query: { enabled: !!userId } });
  const { data: projects } = useListProjects();
  const { data: weekEntries } = useListTimeEntries(
    { userId, startDate: weekDays[0], endDate: weekDays[4] },
    { query: { queryKey: [...getListTimeEntriesQueryKey(), "assistant-week", userId, weekDays[0]] } },
  );
  const { data: tasks } = useListTasks(
    selectedProjectId && selectedProjectId !== "INTERNAL"
      ? { projectId: selectedProjectId as number, assigneeId: userId }
      : undefined,
    { query: { enabled: !!selectedProjectId && selectedProjectId !== "INTERNAL" } },
  );
  const { data: categories } = useListTimeCategories();
  const { data: timeSettings } = useQuery({
    queryKey: ["time-settings"],
    queryFn: async () => {
      const r = await fetch("/api/time-settings", { headers: authHeaders() });
      return r.json();
    },
  });

  const createTimeEntry = useCreateTimeEntry();
  const submitTimesheet = useSubmitTimesheet();

  const allEntries = weekEntries ?? [];
  const showCategoryStep = (timeSettings?.trackTimeAgainst === "categories") && (categories?.length ?? 0) > 0;

  const allocatedProjectIds = useMemo(
    () => new Set((allocations ?? []).map((a: any) => a.projectId)),
    [allocations],
  );

  const allocatedProjects = useMemo(
    () => (projects ?? []).filter((p: any) => allocatedProjectIds.has(p.id)),
    [projects, allocatedProjectIds],
  );

  const activeAllocationForProject = (projectId: number) =>
    (allocations ?? []).find((a: any) => a.projectId === projectId && a.userId === userId);

  const weekTotalForProject = (projectId: number | null) =>
    totalHoursForProject(allEntries, pendingEntries, projectId, weekDays);

  function reset() {
    setStep(STEPS.MODE);
    setMode("today");
    setSelectedDays([]);
    setCurrentDayIdx(0);
    clearEntryState();
    setPendingEntries([]);
    setEditingUid(null);
  }

  function clearEntryState() {
    setSelectedProjectId("INTERNAL");
    setSelectedProjectName("");
    setSelectedTaskId(null);
    setSelectedTaskName("");
    setSelectedCategoryId(null);
    setSelectedCategoryName("");
    setHours(null);
    setCustomHours("");
    setComment("");
    setAiSuggestion(null);
  }

  useEffect(() => {
    if (!open) return;
    reset();
  }, [open]);

  function handleSelectMode(m: "today" | "week") {
    setMode(m);
    if (m === "today") {
      setSelectedDays([today]);
      setCurrentDayIdx(0);
      setStep(STEPS.PROJECT);
    } else {
      setStep(STEPS.DAY_SELECT);
    }
  }

  function handleToggleDay(d: string) {
    setSelectedDays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort(),
    );
  }

  function handleSelectAllMissing() {
    const missing = weekDays.filter(d => {
      const logged = hoursForDay(allEntries, d) + pendingEntries.filter(p => p.date === d).reduce((s, p) => s + p.hours, 0);
      return logged < DAILY_TARGET;
    });
    setSelectedDays(missing);
  }

  function handleDaySelectNext() {
    if (selectedDays.length === 0) return;
    setCurrentDayIdx(0);
    setStep(STEPS.PROJECT);
  }

  function handleSelectProject(id: number | "INTERNAL", name: string) {
    setSelectedProjectId(id);
    setSelectedProjectName(name);
    setSelectedTaskId(null);
    setSelectedTaskName("");
    setStep(STEPS.TASK);
  }

  function handleSelectTask(id: number | null, name: string) {
    setSelectedTaskId(id);
    setSelectedTaskName(name);
    setStep(STEPS.HOURS);
  }

  function handleSelectHours(h: number) {
    setHours(h);
    setCustomHours(String(h));
  }

  function handleHoursNext() {
    const h = hours ?? parseFloat(customHours || "0");
    if (!h || h <= 0) return;
    setHours(h);

    if (selectedProjectId !== "INTERNAL") {
      const alloc = activeAllocationForProject(selectedProjectId as number);
      if (alloc) {
        const weekTotal = weekTotalForProject(selectedProjectId as number);
        if (weekTotal + h > Number(alloc.hoursPerWeek)) {
          setStep(STEPS.OVERRUN);
          return;
        }
      }
    }
    proceedAfterHours(h);
  }

  function proceedAfterHours(h: number) {
    if (showCategoryStep) {
      setStep(STEPS.CATEGORY);
    } else {
      fetchAiSuggestion();
      setStep(STEPS.COMMENT);
    }
  }

  function handleOverrunYes() {
    proceedAfterHours(hours ?? 0);
  }

  function handleSelectCategory(id: number | null, name: string) {
    setSelectedCategoryId(id);
    setSelectedCategoryName(name);
    fetchAiSuggestion();
    setStep(STEPS.COMMENT);
  }

  async function fetchAiSuggestion() {
    setAiLoading(true);
    setAiSuggestion(null);
    try {
      const resp = await fetch("/api/ai/time-comment-suggestion", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          projectName: selectedProjectName,
          taskName: selectedTaskName || undefined,
          categoryName: selectedCategoryName || undefined,
        }),
        signal: AbortSignal.timeout(5000),
      });
      const data = await resp.json();
      setAiSuggestion(data.suggestion ?? null);
    } catch {
      setAiSuggestion(null);
    } finally {
      setAiLoading(false);
    }
  }

  function addCurrentEntry(finalComment: string) {
    const h = hours ?? 0;
    const entry: PendingEntry = {
      uid: editingUid ?? uid(),
      date: currentDay,
      projectId: selectedProjectId === "INTERNAL" ? null : selectedProjectId as number,
      projectName: selectedProjectName || "Internal / Non-project",
      taskId: selectedTaskId,
      taskName: selectedTaskName || "General project work",
      categoryId: selectedCategoryId,
      categoryName: selectedCategoryName,
      hours: h,
      comment: finalComment,
    };
    if (editingUid) {
      setPendingEntries(prev => prev.map(e => e.uid === editingUid ? entry : e));
      setEditingUid(null);
      setStep(STEPS.REVIEW);
    } else {
      setPendingEntries(prev => [...prev, entry]);
      setStep(STEPS.DAY_SUMMARY);
    }
    clearEntryState();
  }

  function handleCommentUse() { addCurrentEntry(aiSuggestion ?? ""); }
  function handleCommentSkip() { addCurrentEntry(""); }
  function handleCommentEdit(val: string) { addCurrentEntry(val); }

  function handleAddAnother() {
    clearEntryState();
    setStep(STEPS.PROJECT);
  }

  function handleNextDay() {
    if (currentDayIdx < selectedDays.length - 1) {
      setCurrentDayIdx(i => i + 1);
      clearEntryState();
      setStep(STEPS.PROJECT);
    } else {
      setStep(STEPS.REVIEW);
    }
  }

  function handleEditEntry(entry: PendingEntry) {
    const dayIdx = selectedDays.indexOf(entry.date);
    if (dayIdx !== -1) setCurrentDayIdx(dayIdx);
    setEditingUid(entry.uid);
    setSelectedProjectId(entry.projectId ?? "INTERNAL");
    setSelectedProjectName(entry.projectName);
    setSelectedTaskId(entry.taskId);
    setSelectedTaskName(entry.taskName);
    setSelectedCategoryId(entry.categoryId);
    setSelectedCategoryName(entry.categoryName);
    setHours(entry.hours);
    setCustomHours(String(entry.hours));
    setComment(entry.comment);
    setStep(STEPS.PROJECT);
  }

  function handleDeleteEntry(uid: string) {
    setPendingEntries(prev => prev.filter(e => e.uid !== uid));
  }

  async function handleSave(andSubmit: boolean) {
    if (pendingEntries.length === 0) return;
    setSaving(true);
    let saved = 0;
    try {
      for (const entry of pendingEntries) {
        await createTimeEntry.mutateAsync({
          data: {
            userId,
            projectId: entry.projectId ?? undefined,
            taskId: entry.taskId ?? undefined,
            date: entry.date,
            hours: entry.hours,
            description: entry.comment,
            billable: entry.projectId !== null,
            categoryId: entry.categoryId ?? undefined,
          } as any,
        });
        saved++;
      }

      if (andSubmit) {
        const uniqueWeeks = [...new Set(pendingEntries.map(e => {
          const mon = startOfWeek(new Date(e.date + "T00:00:00"), { weekStartsOn: 1 });
          return format(mon, "yyyy-MM-dd");
        }))];
        for (const weekStart of uniqueWeeks) {
          const tsList = await fetch(
            `/api/timesheets?userId=${userId}&weekStart=${weekStart}`,
            { headers: authHeaders() },
          ).then(r => r.json()).catch(() => []);
          const ts = Array.isArray(tsList) ? tsList.find((t: any) => t.status === "Draft" || t.status === "Open") : null;
          if (ts?.id) {
            await submitTimesheet.mutateAsync({ id: ts.id });
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListTimesheetsQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["listTasks"] });

      const uniqueDays = [...new Set(pendingEntries.map(e => e.date))];
      toast({
        title: `${saved} ${saved === 1 ? "entry" : "entries"} logged across ${uniqueDays.length} ${uniqueDays.length === 1 ? "day" : "days"}`,
        description: andSubmit ? "Timesheet submitted for approval." : "Saved as draft.",
      });
      onClose();
      reset();
    } catch (err: any) {
      toast({
        title: `Failed after ${saved} entries`,
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  function dayLabel(date: string) {
    return format(new Date(date + "T00:00:00"), "EEE d MMM");
  }

  function dayHoursStatus(date: string) {
    const existing = hoursForDay(allEntries, date);
    const pendingH = pendingEntries.filter(p => p.date === date).reduce((s, p) => s + p.hours, 0);
    return { logged: existing + pendingH, existing };
  }

  const currentDayEntriesDisplay = pendingEntries.filter(p => p.date === currentDay);

  const stepLabels: Record<number, string> = {
    [STEPS.MODE]: "Mode",
    [STEPS.DAY_SELECT]: "Select Days",
    [STEPS.PROJECT]: "Project",
    [STEPS.TASK]: "Task",
    [STEPS.HOURS]: "Hours",
    [STEPS.OVERRUN]: "Hours",
    [STEPS.CATEGORY]: "Category",
    [STEPS.COMMENT]: "Comment",
    [STEPS.DAY_SUMMARY]: "Day Summary",
    [STEPS.REVIEW]: "Review",
  };

  const totalSteps = showCategoryStep ? 7 : 6;
  const stepNum: Record<number, number> = {
    [STEPS.MODE]: 0,
    [STEPS.DAY_SELECT]: 1,
    [STEPS.PROJECT]: 2,
    [STEPS.TASK]: 3,
    [STEPS.HOURS]: 4,
    [STEPS.OVERRUN]: 4,
    [STEPS.CATEGORY]: 5,
    [STEPS.COMMENT]: showCategoryStep ? 6 : 5,
    [STEPS.DAY_SUMMARY]: showCategoryStep ? 7 : 6,
    [STEPS.REVIEW]: showCategoryStep ? 8 : 7,
  };

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0" side="right">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <SheetTitle className="text-base font-semibold">Log Time with Assistant</SheetTitle>
          </div>
          {step !== STEPS.MODE && step !== STEPS.REVIEW && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{stepLabels[step]}</span>
                {mode === "week" && selectedDays.length > 0 && step >= STEPS.PROJECT && step !== STEPS.REVIEW && (
                  <span className="font-medium text-foreground">{dayLabel(currentDay)}</span>
                )}
              </div>
              <Progress value={Math.round((stepNum[step] / totalSteps) * 100)} className="h-1.5" />
            </div>
          )}
          <SheetDescription className="sr-only">Multi-step time logging wizard</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* STEP 0: MODE */}
          {step === STEPS.MODE && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">How would you like to log time?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleSelectMode("today")}
                  className="rounded-xl border-2 border-muted hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 p-5 text-left transition-colors group"
                >
                  <Clock className="h-7 w-7 text-indigo-500 mb-2" />
                  <div className="font-semibold text-sm">Today only</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{format(new Date(), "EEE, MMM d")}</div>
                </button>
                <button
                  onClick={() => handleSelectMode("week")}
                  className="rounded-xl border-2 border-muted hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 p-5 text-left transition-colors group"
                >
                  <Calendar className="h-7 w-7 text-indigo-500 mb-2" />
                  <div className="font-semibold text-sm">This week</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(weekDays[0] + "T00:00:00"), "MMM d")} – {format(new Date(weekDays[4] + "T00:00:00"), "MMM d")}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: DAY SELECT */}
          {step === STEPS.DAY_SELECT && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Select days to log</p>
                <button
                  onClick={handleSelectAllMissing}
                  className="text-xs text-indigo-500 hover:underline"
                >
                  Select all missing
                </button>
              </div>
              <div className="space-y-2">
                {weekDays.map((d, i) => {
                  const { logged } = dayHoursStatus(d);
                  const isSelected = selectedDays.includes(d);
                  const complete = logged >= DAILY_TARGET;
                  const partial = logged > 0 && !complete;
                  const missing = DAILY_TARGET - logged;
                  return (
                    <button
                      key={d}
                      onClick={() => handleToggleDay(d)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                        isSelected
                          ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30"
                          : "border-muted hover:border-muted-foreground",
                      )}
                    >
                      {complete ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      ) : partial ? (
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{WEEK_DAYS[i]} — {format(new Date(d + "T00:00:00"), "MMM d")}</div>
                        <div className="text-xs text-muted-foreground">
                          {complete
                            ? `${logged}h logged`
                            : partial
                            ? `${logged}h logged · ${missing.toFixed(1)}h missing`
                            : "No hours logged"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <Button
                className="w-full"
                disabled={selectedDays.length === 0}
                onClick={handleDaySelectNext}
              >
                Continue with {selectedDays.length} {selectedDays.length === 1 ? "day" : "days"} <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* STEP 2: PROJECT SELECT */}
          {step === STEPS.PROJECT && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Which project did you work on?</p>
              {allocatedProjects.length === 0 && (
                <p className="text-xs text-muted-foreground">No allocated projects found. Ask your PM to assign you to a project.</p>
              )}
              {allocatedProjects.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectProject(p.id, p.name)}
                  className="w-full flex items-center gap-3 rounded-lg border border-muted hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 p-3 text-left transition-colors"
                >
                  <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    {p.status && <div className="text-xs text-muted-foreground capitalize">{p.status}</div>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
              <button
                onClick={() => handleSelectProject("INTERNAL", "Internal / Non-project")}
                className="w-full flex items-center gap-3 rounded-lg border border-dashed border-muted hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 p-3 text-left transition-colors"
              >
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="text-sm text-muted-foreground">Internal / Non-project time</div>
                <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
              </button>
            </div>
          )}

          {/* STEP 3: TASK SELECT */}
          {step === STEPS.TASK && (
            <div className="space-y-3">
              <p className="text-sm font-medium">What were you working on?</p>
              <p className="text-xs text-muted-foreground">Project: <span className="font-medium text-foreground">{selectedProjectName}</span></p>
              {selectedProjectId !== "INTERNAL" && (tasks ?? [])
                .filter((t: any) => !t.isPhase)
                .map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTask(t.id, t.name)}
                    className="w-full rounded-lg border border-muted hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 p-3 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium flex-1 truncate">{t.name}</span>
                      {t.status && <Badge variant="outline" className="text-xs shrink-0">{t.status}</Badge>}
                    </div>
                    {t.dueDate && (
                      <div className="text-xs text-muted-foreground mt-0.5">Due {format(new Date(t.dueDate + "T00:00:00"), "MMM d")}</div>
                    )}
                  </button>
                ))
              }
              <button
                onClick={() => handleSelectTask(null, "")}
                className="w-full rounded-lg border border-dashed border-muted hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 p-3 text-left transition-colors"
              >
                <div className="text-sm text-muted-foreground">+ General project work (no specific task)</div>
              </button>
            </div>
          )}

          {/* STEP 4: HOURS */}
          {step === STEPS.HOURS && (
            <div className="space-y-4">
              <p className="text-sm font-medium">How many hours?</p>
              <div className="flex flex-wrap gap-2">
                {HOUR_CHIPS.map(h => (
                  <button
                    key={h}
                    onClick={() => handleSelectHours(h)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                      hours === h
                        ? "border-indigo-500 bg-indigo-500 text-white"
                        : "border-muted hover:border-indigo-400",
                    )}
                  >
                    {h}h
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Custom amount</label>
                <Input
                  type="number"
                  min="0.25"
                  step="0.25"
                  placeholder="e.g. 2.75"
                  value={customHours}
                  onChange={e => {
                    setCustomHours(e.target.value);
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v) && v > 0) setHours(v);
                  }}
                />
              </div>
              {selectedProjectId !== "INTERNAL" && (() => {
                const alloc = activeAllocationForProject(selectedProjectId as number);
                if (!alloc) return null;
                const weekTotal = weekTotalForProject(selectedProjectId as number);
                return (
                  <p className="text-xs text-muted-foreground">
                    Allocation: {Number(alloc.hoursPerWeek)}h/week · Logged this week: {weekTotal.toFixed(1)}h
                  </p>
                );
              })()}
              <Button className="w-full" disabled={!hours && !customHours} onClick={handleHoursNext}>
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* STEP 4a: OVERRUN WARNING */}
          {step === STEPS.OVERRUN && selectedProjectId !== "INTERNAL" && (() => {
            const alloc = activeAllocationForProject(selectedProjectId as number);
            const weekTotal = weekTotalForProject(selectedProjectId as number);
            const newTotal = weekTotal + (hours ?? 0);
            const allocated = Number(alloc?.hoursPerWeek ?? 0);
            return (
              <div className="space-y-4">
                <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-2">
                  <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    Allocation overrun
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Logging {hours}h would bring your total for <strong>{selectedProjectName}</strong> this week to <strong>{newTotal.toFixed(1)}h</strong>, which exceeds your weekly allocation of <strong>{allocated}h</strong>.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={() => setStep(STEPS.HOURS)}>
                    No, adjust
                  </Button>
                  <Button onClick={handleOverrunYes}>
                    Yes, log it
                  </Button>
                </div>
              </div>
            );
          })()}

          {/* STEP 5: CATEGORY */}
          {step === STEPS.CATEGORY && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Activity category</p>
              {(categories ?? []).map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectCategory(c.id, c.name)}
                  className={cn(
                    "w-full rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition-colors",
                    selectedCategoryId === c.id
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                      : "border-muted hover:border-indigo-400",
                  )}
                >
                  {c.name}
                </button>
              ))}
              <button
                onClick={() => handleSelectCategory(null, "")}
                className="w-full rounded-lg border border-dashed border-muted hover:border-muted-foreground px-4 py-2.5 text-left text-sm text-muted-foreground"
              >
                Skip category
              </button>
            </div>
          )}

          {/* STEP 6: COMMENT */}
          {step === STEPS.COMMENT && (
            <div className="space-y-4">
              <p className="text-sm font-medium">Add a comment</p>
              {aiLoading && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Getting AI suggestion…
                </div>
              )}
              {!aiLoading && aiSuggestion && (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20 p-3 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="h-3.5 w-3.5" /> AI suggestion
                  </div>
                  <p className="text-sm italic text-foreground">&ldquo;{aiSuggestion}&rdquo;</p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleCommentUse} className="gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Use this
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
                      setComment(aiSuggestion ?? "");
                      setAiSuggestion(null);
                    }}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1.5 ml-auto" onClick={handleCommentSkip}>
                      <SkipForward className="h-3.5 w-3.5" /> Skip
                    </Button>
                  </div>
                </div>
              )}
              {!aiLoading && (!aiSuggestion || comment !== "") && (
                <div className="space-y-1.5">
                  {aiSuggestion === null && !aiLoading && (
                    <p className="text-xs text-muted-foreground">Describe the work done (optional)</p>
                  )}
                  <Input
                    placeholder="e.g. Reviewed sprint backlog and updated task priorities"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addCurrentEntry(comment); }}
                  />
                  <div className="flex gap-2 pt-1">
                    <Button className="flex-1" onClick={() => addCurrentEntry(comment)}>
                      Save entry <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                    <Button variant="ghost" onClick={handleCommentSkip}>Skip</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 7: DAY SUMMARY */}
          {step === STEPS.DAY_SUMMARY && (
            <div className="space-y-4">
              <p className="text-sm font-medium">{dayLabel(currentDay)}</p>
              {currentDayEntriesDisplay.length > 0 && (
                <div className="space-y-2">
                  {currentDayEntriesDisplay.map(e => (
                    <div key={e.uid} className="rounded-lg border p-3 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{e.projectName}</span>
                        <span className="text-sm font-bold text-indigo-600 shrink-0 ml-2">{e.hours}h</span>
                      </div>
                      {e.taskName && <div className="text-xs text-muted-foreground">{e.taskName}</div>}
                      {e.comment && <div className="text-xs text-muted-foreground italic">&ldquo;{e.comment}&rdquo;</div>}
                    </div>
                  ))}
                </div>
              )}
              {(() => {
                const { logged } = dayHoursStatus(currentDay);
                const pct = Math.min(100, (logged / DAILY_TARGET) * 100);
                return (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{logged.toFixed(1)}h logged</span>
                      <span>{DAILY_TARGET}h target</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })()}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={handleAddAnother} className="text-sm">
                  + Add another project
                </Button>
                <Button onClick={handleNextDay} className="text-sm">
                  {currentDayIdx < selectedDays.length - 1
                    ? <>Next day <ChevronRight className="ml-1 h-4 w-4" /></>
                    : <>Review <ChevronRight className="ml-1 h-4 w-4" /></>
                  }
                </Button>
              </div>
            </div>
          )}

          {/* STEP 8: REVIEW */}
          {step === STEPS.REVIEW && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Review entries</p>
                <p className="text-xs text-muted-foreground">
                  Total: <span className="font-semibold text-foreground">
                    {pendingEntries.reduce((s, e) => s + e.hours, 0).toFixed(1)}h
                  </span>
                </p>
              </div>
              {pendingEntries.length === 0 && (
                <p className="text-sm text-muted-foreground">No entries captured yet.</p>
              )}
              {[...new Set(pendingEntries.map(e => e.date))].sort().map(date => (
                <div key={date} className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {dayLabel(date)}
                  </p>
                  {pendingEntries.filter(e => e.date === date).map(entry => (
                    <div key={entry.uid} className="rounded-lg border p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">{entry.projectName}</span>
                            <span className="text-sm font-bold text-indigo-600 shrink-0">{entry.hours}h</span>
                          </div>
                          {entry.taskName && <div className="text-xs text-muted-foreground">{entry.taskName}</div>}
                          {entry.categoryName && <div className="text-xs text-muted-foreground">{entry.categoryName}</div>}
                          {entry.comment && <div className="text-xs text-muted-foreground italic mt-0.5">&ldquo;{entry.comment}&rdquo;</div>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => handleEditEntry(entry)} className="text-xs text-indigo-500 hover:underline">Edit</button>
                          <span className="text-muted-foreground">·</span>
                          <button onClick={() => handleDeleteEntry(entry.uid)} className="text-xs text-red-500 hover:underline">Del</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {pendingEntries.length > 0 && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button variant="outline" disabled={saving} onClick={() => handleSave(false)}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Save as draft
                  </Button>
                  <Button disabled={saving} onClick={() => handleSave(true)}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Save &amp; Submit
                  </Button>
                </div>
              )}
              {pendingEntries.length === 0 && (
                <Button variant="outline" className="w-full" onClick={() => setStep(STEPS.PROJECT)}>
                  Add an entry
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Back button */}
        {step !== STEPS.MODE && step !== STEPS.REVIEW && (
          <div className="border-t px-6 py-3 flex items-center">
            <button
              onClick={() => {
                const backMap: Record<number, number> = {
                  [STEPS.DAY_SELECT]: STEPS.MODE,
                  [STEPS.PROJECT]: mode === "week" && selectedDays.length > 1 ? STEPS.DAY_SELECT : STEPS.MODE,
                  [STEPS.TASK]: STEPS.PROJECT,
                  [STEPS.HOURS]: STEPS.TASK,
                  [STEPS.OVERRUN]: STEPS.HOURS,
                  [STEPS.CATEGORY]: STEPS.HOURS,
                  [STEPS.COMMENT]: showCategoryStep ? STEPS.CATEGORY : STEPS.HOURS,
                  [STEPS.DAY_SUMMARY]: STEPS.COMMENT,
                };
                setStep(backMap[step] ?? STEPS.MODE);
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
