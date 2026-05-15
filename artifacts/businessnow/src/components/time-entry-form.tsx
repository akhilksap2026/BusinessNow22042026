import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek } from "date-fns";
import {
  AlertTriangle, Lock, Loader2, CheckCircle2, CircleDot,
} from "lucide-react";

import { authHeaders } from "@/lib/auth-headers";
import { useCurrentUser } from "@/contexts/current-user";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useListProjects, useListUsers } from "@workspace/api-client-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContractRules {
  incrementMinutes: number;
  maxBillableHours: string | null;
  narrativeRequired: boolean;
  futureDateBufferDays: number;
  maxDailyHours: string | null;
  contractType: string;
}

interface TaskOption {
  id: number;
  name: string;
  defaultBillableCategory: string | null;
  status: string;
}

interface ProxyDelegation {
  id: number;
  proxyUserId: number;
  targetUserId: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

interface FieldError {
  field: string;
  message: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseDuration(input: string): number | null {
  const trimmed = input.trim();
  const colonMatch = trimmed.match(/^(\d{1,3}):(\d{2})$/);
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10);
    const m = parseInt(colonMatch[2], 10);
    if (m >= 60) return null;
    return parseFloat((h + m / 60).toFixed(4));
  }
  const dec = parseFloat(trimmed);
  if (!isNaN(dec) && dec > 0 && dec <= 24) return dec;
  return null;
}

function formatDurationDisplay(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const PII_PATTERNS = [
  /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/,      // SSN
  /\b(?:\d{4}[-\s]?){3}\d{4}\b/,             // credit card
];

function hasPii(text: string): boolean {
  return PII_PATTERNS.some(re => re.test(text));
}

const EXCEPTIONAL_HOURS_THRESHOLD = 8;

// ─── Component ────────────────────────────────────────────────────────────────

interface TimeEntryFormProps {
  entryId?: number;
}

export function TimeEntryForm({ entryId }: TimeEntryFormProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { currentUser, activeRole } = useCurrentUser();
  const currentUserId = currentUser?.id ?? 1;

  // ── Form state ──────────────────────────────────────────────────────────────
  const [resourceId, setResourceId] = useState<number>(currentUserId);
  const [projectId, setProjectId] = useState<number | "">("");
  const [taskId, setTaskId] = useState<number | "">("");
  const [entryDate, setEntryDate] = useState<string>(todayISO());
  const [durationInput, setDurationInput] = useState<string>("");
  const [durationHours, setDurationHours] = useState<number | null>(null);
  const [billableCategory, setBillableCategory] = useState<string>("Billable");
  const [narrative, setNarrative] = useState<string>("");
  const [exceptionalJustification, setExceptionalJustification] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [piiWarning, setPiiWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReplicationDialog, setShowReplicationDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<"draft" | "submit" | null>(null);
  const [contractRules, setContractRules] = useState<ContractRules | null>(null);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [existingEntry, setExistingEntry] = useState<any>(null);
  const [entryLocked, setEntryLocked] = useState(false);

  // ── Load existing entry for edit mode ───────────────────────────────────────
  useEffect(() => {
    if (!entryId) return;
    (async () => {
      const r = await fetch(`/api/time/entries/${entryId}`, { headers: authHeaders() });
      if (!r.ok) return;
      const entry = await r.json();
      setExistingEntry(entry);
      if (entry.status !== "Draft" && entry.status !== "Rejected") {
        setEntryLocked(true);
        return;
      }
      setResourceId(entry.resourceId);
      setProjectId(entry.projectId ?? "");
      setTaskId(entry.taskId ?? "");
      setEntryDate(entry.entryDate ?? todayISO());
      const h = parseFloat(entry.durationHours ?? "0");
      setDurationHours(h);
      setDurationInput(String(h));
      setBillableCategory(entry.billableCategory ?? "Billable");
      setNarrative(entry.narrative ?? "");
      setExceptionalJustification(entry.exceptionalJustification ?? "");
    })();
  }, [entryId]);

  // ── Proxy delegations ───────────────────────────────────────────────────────
  const { data: proxyDelegations } = useQuery<ProxyDelegation[]>({
    queryKey: ["proxy-delegations", currentUserId],
    queryFn: async () => {
      const r = await fetch(`/api/time/proxy-delegations?userId=${currentUserId}`, {
        headers: authHeaders(),
      });
      if (!r.ok) return [];
      const json = await r.json();
      return json.data ?? [];
    },
    enabled: !!currentUserId,
  });

  const activeDelegations = (proxyDelegations ?? []).filter(d => {
    if (!d.isActive || d.proxyUserId !== currentUserId) return false;
    const today = todayISO();
    return d.validFrom <= today && d.validUntil >= today;
  });
  const isProxy = resourceId !== currentUserId;

  // ── Projects ─────────────────────────────────────────────────────────────────
  const { data: allProjects } = useListProjects();
  const { data: allUsers } = useListUsers();

  const allowedProjects = (allProjects ?? []).filter(p => {
    if (["Closed", "Financially_Reconciled", "Archived"].includes(p.status ?? "")) return false;
    return true;
  });

  const selectedProject = allowedProjects.find(p => p.id === projectId);

  // ── Contract rules (load on project change) ──────────────────────────────────
  useEffect(() => {
    if (!projectId) { setContractRules(null); return; }
    (async () => {
      const r = await fetch(`/api/time/contract-rules/${projectId}`, { headers: authHeaders() });
      if (!r.ok) { setContractRules(null); return; }
      setContractRules(await r.json());
    })();
  }, [projectId]);

  // ── Tasks (load on project change) ───────────────────────────────────────────
  useEffect(() => {
    if (!projectId) { setTasks([]); setTaskId(""); return; }
    setTasksLoading(true);
    (async () => {
      const r = await fetch(`/api/tasks?projectId=${projectId}`, { headers: authHeaders() });
      if (!r.ok) { setTasks([]); setTasksLoading(false); return; }
      const data = await r.json();
      const list: TaskOption[] = (Array.isArray(data) ? data : data.data ?? [])
        .filter((t: any) => t.status === "active" || t.status === "Active" || !t.status);
      setTasks(list);
      setTasksLoading(false);
    })();
  }, [projectId]);

  // ── Auto-set billable category on task change ─────────────────────────────
  useEffect(() => {
    if (!taskId) return;
    const task = tasks.find(t => t.id === taskId);
    if (task) setBillableCategory(task.defaultBillableCategory ?? "Billable");
  }, [taskId, tasks]);

  // ── Exceptional detection ─────────────────────────────────────────────────
  const isExceptional = durationHours !== null && durationHours > EXCEPTIONAL_HOURS_THRESHOLD;

  // ── Date bounds ────────────────────────────────────────────────────────────
  const maxDate = (() => {
    const buffer = contractRules?.futureDateBufferDays ?? 6;
    const d = new Date();
    d.setDate(d.getDate() + buffer);
    return d.toISOString().slice(0, 10);
  })();

  // ── Inline validators ────────────────────────────────────────────────────
  const clearError = (field: string) =>
    setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });

  const validateDurationBlur = useCallback(() => {
    const parsed = parseDuration(durationInput);
    if (!durationInput.trim()) {
      setFieldErrors(p => ({ ...p, durationHours: "Duration is required." }));
      setDurationHours(null);
      return;
    }
    if (parsed === null) {
      setFieldErrors(p => ({ ...p, durationHours: "Enter a valid duration (e.g. 1.5 or 1:30)." }));
      setDurationHours(null);
      return;
    }
    if (contractRules?.incrementMinutes) {
      const incH = contractRules.incrementMinutes / 60;
      const rem = parsed % incH;
      if (rem > 0.001 && incH - rem > 0.001) {
        setFieldErrors(p => ({
          ...p,
          durationHours: `Must be in ${contractRules.incrementMinutes}-minute increments.`,
        }));
        setDurationHours(parsed);
        return;
      }
    }
    clearError("durationHours");
    setDurationHours(parsed);
  }, [durationInput, contractRules]);

  const validateNarrativeBlur = useCallback(() => {
    if (contractRules?.narrativeRequired && !narrative.trim()) {
      setFieldErrors(p => ({ ...p, narrative: "Narrative is required for this project." }));
    } else {
      clearError("narrative");
    }
    setPiiWarning(hasPii(narrative));
  }, [narrative, contractRules]);

  // ── Fixed-bid cap ──────────────────────────────────────────────────────────
  const isFixedBid = (selectedProject as any)?.contractType === "Fixed_Bid" ||
    contractRules?.contractType === "Fixed_Bid";
  const fixedBidCapHours = contractRules?.maxBillableHours
    ? parseFloat(contractRules.maxBillableHours) : null;

  // ── User lookup helper ─────────────────────────────────────────────────────
  const getUserName = (id: number) => {
    const u = (allUsers ?? []).find((u: any) => u.id === id);
    return u ? (u.name ?? `User ${id}`) : `User ${id}`;
  };

  // ── Submission ─────────────────────────────────────────────────────────────
  async function handleSave(action: "draft" | "submit") {
    // Client-side gate
    const errs: Record<string, string> = {};
    if (!projectId) errs.projectId = "Project is required.";
    if (!taskId) errs.taskId = "Task is required.";
    if (!entryDate) errs.entryDate = "Date is required.";
    if (!durationHours || durationHours <= 0) errs.durationHours = "Duration is required.";
    if (contractRules?.narrativeRequired && !narrative.trim()) {
      errs.narrative = "Narrative is required for this project.";
    }
    if (isExceptional && !exceptionalJustification.trim()) {
      errs.exceptionalJustification = "Justification is required for entries exceeding the standard threshold.";
    }
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }

    // Replicated-entry guard (edit mode)
    if (action === "submit" && existingEntry?.isReplicated) {
      setPendingAction("submit");
      setShowReplicationDialog(true);
      return;
    }

    await executeSubmit(action);
  }

  async function executeSubmit(action: "draft" | "submit", confirmationToken?: string) {
    setIsSubmitting(true);
    try {
      const body = {
        resourceId,
        projectId,
        taskId,
        entryDate,
        durationHours,
        billableCategory,
        narrative: narrative || null,
        exceptionalJustification: isExceptional ? exceptionalJustification : null,
      };

      let savedEntryId: number;

      if (entryId) {
        // PATCH existing
        const r = await fetch(`/api/time/entries/${entryId}`, {
          method: "PATCH",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(body),
        });
        const data = await r.json();
        if (!r.ok) {
          handleServerErrors(data);
          return;
        }
        savedEntryId = entryId;
      } else {
        // POST new
        const r = await fetch("/api/time/entries", {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(body),
        });
        const data = await r.json();
        if (!r.ok) {
          handleServerErrors(data);
          return;
        }
        savedEntryId = data.id;
      }

      if (action === "submit") {
        const payload: any = { entryIds: [savedEntryId] };
        if (confirmationToken) payload.confirmationToken = confirmationToken;
        const r = await fetch("/api/time/entries/submit", {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(payload),
        });
        const data = await r.json();
        if (!r.ok) {
          handleServerErrors(data);
          return;
        }
      }

      const weekStart = format(
        startOfWeek(new Date(entryDate + "T12:00:00"), { weekStartsOn: 1 }),
        "yyyy-MM-dd",
      );

      toast({
        title: action === "submit" ? "Time entry submitted" : "Draft saved",
        description: `Entry ${action === "submit" ? "submitted for approval" : "saved as draft"}.`,
      });
      navigate(`/time?weekStart=${weekStart}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleServerErrors(data: any) {
    if (data?.error?.fields) {
      const errs: Record<string, string> = {};
      (data.error.fields as FieldError[]).forEach(f => { errs[f.field] = f.message; });
      setFieldErrors(errs);
      toast({ title: "Validation failed", description: data.error.message, variant: "destructive" });
    } else {
      toast({ title: "Save failed", description: data?.error?.message ?? "Unknown error.", variant: "destructive" });
    }
  }

  async function handleReplicationConfirm() {
    setShowReplicationDialog(false);
    // Fetch confirmation token
    const r = await fetch("/api/time/confirm-replication", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ resourceId }),
    });
    const data = await r.json();
    await executeSubmit("submit", data.token);
  }

  // ── Locked (read-only) view ─────────────────────────────────────────────────
  if (entryLocked && existingEntry) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="flex-row items-center gap-3 pb-4">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base font-medium text-muted-foreground">
            This entry cannot be edited — Status:{" "}
            <span className="font-semibold">{existingEntry.status}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <Row label="Date" value={existingEntry.entryDate} />
          <Row label="Duration" value={formatDurationDisplay(parseFloat(existingEntry.durationHours ?? "0"))} />
          <Row label="Billable Category" value={existingEntry.billableCategory} />
          {existingEntry.narrative && <Row label="Narrative" value={existingEntry.narrative} />}
          {existingEntry.status === "Rejected" && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-red-800 text-xs">
              Rejected — contact your approver to resubmit.
            </div>
          )}
          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/time")}>
              Back to Time Tracking
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <>
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="pb-6">
          <CardTitle className="text-xl">
            {entryId ? "Edit Time Entry" : "Log Time"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* 1 ── Resource / Proxy selector */}
          {activeDelegations.length > 0 && (
            <div className="space-y-2">
              <Label>Logging for</Label>
              <Select
                value={String(resourceId)}
                onValueChange={v => setResourceId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(currentUserId)}>
                    {getUserName(currentUserId)} (myself)
                  </SelectItem>
                  {activeDelegations.map(d => (
                    <SelectItem key={d.id} value={String(d.targetUserId)}>
                      {getUserName(d.targetUserId)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isProxy && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-800">
                  Entering on behalf of {getUserName(resourceId)}
                </div>
              )}
            </div>
          )}

          {/* 2 ── Project */}
          <div className="space-y-2">
            <Label htmlFor="project">
              Project <span className="text-red-500">*</span>
            </Label>
            <Select
              value={projectId === "" ? "" : String(projectId)}
              onValueChange={v => {
                setProjectId(Number(v));
                setTaskId("");
                clearError("projectId");
              }}
            >
              <SelectTrigger id="project" className={cn(fieldErrors.projectId && "border-red-500")}>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {allowedProjects.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.projectId && (
              <p className="text-xs text-red-600">{fieldErrors.projectId}</p>
            )}
            {isFixedBid && fixedBidCapHours !== null && (
              <p className="text-xs text-muted-foreground">
                Fixed-Bid Project — {fixedBidCapHours}h total cap
              </p>
            )}
            {isFixedBid && fixedBidCapHours === null && (
              <p className="text-xs text-muted-foreground">Fixed-Bid Project</p>
            )}
          </div>

          {/* 3 ── Task */}
          <div className="space-y-2">
            <Label htmlFor="task">
              Task <span className="text-red-500">*</span>
            </Label>
            <Select
              value={taskId === "" ? "" : String(taskId)}
              onValueChange={v => { setTaskId(Number(v)); clearError("taskId"); }}
              disabled={!projectId || tasksLoading}
            >
              <SelectTrigger id="task" className={cn(fieldErrors.taskId && "border-red-500")}>
                <SelectValue placeholder={
                  tasksLoading ? "Loading tasks…" :
                  !projectId ? "Select a project first" :
                  "Select a task"
                } />
              </SelectTrigger>
              <SelectContent>
                {tasks.map(t => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    <span className="flex items-center gap-2">
                      {(t.defaultBillableCategory ?? "Billable") === "Billable"
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                        : <CircleDot className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      }
                      {t.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.taskId && (
              <p className="text-xs text-red-600">{fieldErrors.taskId}</p>
            )}
          </div>

          {/* 4 ── Date */}
          <div className="space-y-2">
            <Label htmlFor="entryDate">
              Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="entryDate"
              type="date"
              value={entryDate}
              max={maxDate}
              onChange={e => { setEntryDate(e.target.value); clearError("entryDate"); }}
              className={cn(fieldErrors.entryDate && "border-red-500")}
            />
            {fieldErrors.entryDate && (
              <p className="text-xs text-red-600">{fieldErrors.entryDate}</p>
            )}
          </div>

          {/* 5 ── Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">
              Duration <span className="text-red-500">*</span>
            </Label>
            <Input
              id="duration"
              placeholder="e.g. 1.5 or 1:30"
              value={durationInput}
              onChange={e => { setDurationInput(e.target.value); clearError("durationHours"); }}
              onBlur={validateDurationBlur}
              className={cn(fieldErrors.durationHours && "border-red-500")}
            />
            {fieldErrors.durationHours ? (
              <p className="text-xs text-red-600">{fieldErrors.durationHours}</p>
            ) : contractRules?.incrementMinutes ? (
              <p className="text-xs text-muted-foreground">
                Must be in {contractRules.incrementMinutes}-minute increments
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Enter hours as decimal (1.5) or HH:MM (1:30)</p>
            )}
            {durationHours !== null && !fieldErrors.durationHours && (
              <p className="text-xs text-muted-foreground">{formatDurationDisplay(durationHours)}</p>
            )}
          </div>

          {/* 6 ── Billable Category */}
          <div className="space-y-2">
            <Label>Billable Category</Label>
            <div className="flex items-center gap-3 h-9 px-3 rounded-md border bg-muted/40 text-sm">
              <Badge
                variant={billableCategory === "Billable" ? "default" : "secondary"}
                className={cn(
                  "text-xs",
                  billableCategory === "Billable"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : "bg-secondary text-secondary-foreground",
                )}
              >
                {billableCategory}
              </Badge>
              <span className="text-muted-foreground text-xs">Auto-detected from task</span>
            </div>
            {(activeRole === "account_admin" || activeRole === "super_user") && (
              <Select
                value={billableCategory}
                onValueChange={setBillableCategory}
              >
                <SelectTrigger className="h-8 text-xs w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Billable">Billable</SelectItem>
                  <SelectItem value="Non-Billable">Non-Billable</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* 7 ── Narrative */}
          <div className="space-y-2">
            <Label htmlFor="narrative">
              Work Description
              {contractRules?.narrativeRequired && (
                <span className="text-red-500 ml-1">* Required for this project</span>
              )}
            </Label>
            <Textarea
              id="narrative"
              placeholder="Describe the work performed…"
              value={narrative}
              maxLength={1000}
              rows={3}
              onChange={e => { setNarrative(e.target.value); clearError("narrative"); }}
              onBlur={validateNarrativeBlur}
              className={cn(fieldErrors.narrative && "border-red-500")}
            />
            <div className="flex items-center justify-between">
              <div>
                {fieldErrors.narrative && (
                  <p className="text-xs text-red-600">{fieldErrors.narrative}</p>
                )}
                {piiWarning && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Possible sensitive data detected (SSN or card number). Please remove it.
                  </p>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {narrative.length}/1000
              </span>
            </div>
          </div>

          {/* 8 ── Exceptional Justification (conditional) */}
          {isExceptional && (
            <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800 font-medium">
                  This entry exceeds the standard threshold ({EXCEPTIONAL_HOURS_THRESHOLD}h/day). A justification is required.
                </p>
              </div>
              <Label htmlFor="justification">
                Exceptional Justification <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="justification"
                placeholder="Explain why this entry exceeds the standard hours threshold…"
                value={exceptionalJustification}
                rows={3}
                onChange={e => { setExceptionalJustification(e.target.value); clearError("exceptionalJustification"); }}
                className={cn(fieldErrors.exceptionalJustification && "border-red-500")}
              />
              {fieldErrors.exceptionalJustification && (
                <p className="text-xs text-red-600">{fieldErrors.exceptionalJustification}</p>
              )}
            </div>
          )}

          {/* ── Actions ──────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => navigate("/time")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleSave("draft")}
                disabled={isSubmitting}
              >
                {isSubmitting && pendingAction === "draft" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save as Draft
              </Button>
              <Button
                onClick={() => handleSave("submit")}
                disabled={isSubmitting || piiWarning}
              >
                {isSubmitting && pendingAction === "submit" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save &amp; Submit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── FR-416.2 Replication Confirmation Dialog ───────────────────────── */}
      <Dialog open={showReplicationDialog} onOpenChange={setShowReplicationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Replicated Time</DialogTitle>
            <DialogDescription className="pt-1">
              This timesheet was populated from a previous week. Please confirm all hours,
              projects, and tasks are accurate for the current week before submitting.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => { setShowReplicationDialog(false); setPendingAction(null); }}
            >
              Cancel
            </Button>
            <Button onClick={handleReplicationConfirm} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              I Confirm — Submit Timesheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Small read-only row helper ───────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div className="flex gap-4">
      <span className="w-36 shrink-0 text-muted-foreground">{label}</span>
      <span>{value ?? "—"}</span>
    </div>
  );
}
