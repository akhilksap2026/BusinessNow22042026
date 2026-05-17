import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  CheckSquare,
  Square,
  UserCheck,
  ChevronDown,
  ChevronRight,
  Folder,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { authHeaders } from "@/lib/auth-headers";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/contexts/current-user";
import { ApprovalEntryRow, type DetailEntry } from "./ApprovalEntryRow";
import { RejectionModal } from "./RejectionModal";

interface ApprovalReviewPanelProps {
  resourceId: number;
  weekStart: string;
  submitterName: string;
  onActionComplete: () => void;
}

interface ProjectGroup {
  projectId: number;
  projectName: string;
  entries: DetailEntry[];
}

function formatWeekRange(ws: string): string {
  const start = new Date(`${ws}T00:00:00Z`);
  const end = new Date(`${ws}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date, y?: boolean) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(y ? { year: "numeric" } : {}), timeZone: "UTC" });
  return `${fmt(start)} – ${fmt(end, true)}`;
}

export function ApprovalReviewPanel({
  resourceId,
  weekStart,
  submitterName,
  onActionComplete,
}: ApprovalReviewPanelProps) {
  const { currentUser, activeRole } = useCurrentUser();
  const { toast } = useToast();

  const [entries, setEntries] = useState<DetailEntry[]>([]);
  const [allApprovers, setAllApprovers] = useState<{ id: number; name: string }[]>([]);
  const [projectNames, setProjectNames] = useState<Record<number, string>>({});
  const [taskNames, setTaskNames] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmApproveAll, setConfirmApproveAll] = useState(false);
  const [approveProgress, setApproveProgress] = useState<{ current: number; total: number } | null>(null);
  const [rejectEntry, setRejectEntry] = useState<DetailEntry | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set());

  const currentUserId = currentUser?.id ?? 0;

  // ─── Fetch detail entries ─────────────────────────────────────────────────

  const fetchDetail = useCallback(async () => {
    setIsLoading(true);
    setSelectedIds(new Set());
    try {
      const r = await fetch(
        `/api/time/approval-queue/${resourceId}/${weekStart}`,
        { headers: authHeaders() },
      );
      if (r.ok) {
        const data = await r.json();
        setEntries(data.entries ?? []);
        setAllApprovers(data.allApprovers ?? []);

        const projectIds = [...new Set((data.entries ?? []).map((e: DetailEntry) => e.projectId))];
        const taskIds = [...new Set((data.entries ?? []).filter((e: DetailEntry) => e.taskId).map((e: DetailEntry) => e.taskId as number))];

        if (projectIds.length > 0) {
          const proj = await fetch(`/api/projects`, { headers: authHeaders() }).then((r) => r.json()).catch(() => ({ data: [] }));
          const projArr = Array.isArray(proj) ? proj : (proj.data ?? []);
          const names: Record<number, string> = {};
          for (const p of projArr) {
            if (projectIds.includes(p.id)) names[p.id] = p.name;
          }
          setProjectNames(names);
        }

        if (taskIds.length > 0) {
          const taskNameMap: Record<number, string> = {};
          for (const pid of projectIds as number[]) {
            try {
              const tr = await fetch(`/api/time/assigned-tasks/${pid}?resourceId=${resourceId}`, { headers: authHeaders() });
              if (tr.ok) {
                const td = await tr.json();
                for (const t of (td.data ?? [])) {
                  taskNameMap[t.id] = t.name;
                }
              }
            } catch {}
          }
          setTaskNames(taskNameMap);
        }
      }
    } catch {}
    setIsLoading(false);
  }, [resourceId, weekStart]);

  useEffect(() => {
    fetchDetail();
    setSelectMode(false);
    setCollapsedGroups(new Set());
  }, [fetchDetail]);

  // ─── Computed values ──────────────────────────────────────────────────────

  const submittedEntries = entries.filter((e) => e.status === "Submitted");
  const approvableEntries = submittedEntries.filter((e) => e.resourceId !== currentUserId);
  const allDone = submittedEntries.length === 0;

  const totalHours = entries.reduce((s, e) => s + Number(e.durationHours), 0);
  const billableHours = entries.filter((e) => e.billableCategory === "Billable").reduce((s, e) => s + Number(e.durationHours), 0);
  const leaveHours = entries.filter((e) => e.isLeave).reduce((s, e) => s + Number(e.durationHours), 0);
  const utilization = Math.round((billableHours / 40) * 100);
  const exceptionalCount = entries.filter((e) => e.isExceptional).length;

  const projectGroups = useMemo<ProjectGroup[]>(() => {
    const map: Record<number, ProjectGroup> = {};
    for (const entry of entries) {
      if (!map[entry.projectId]) {
        map[entry.projectId] = {
          projectId: entry.projectId,
          projectName: projectNames[entry.projectId] ?? `Project #${entry.projectId}`,
          entries: [],
        };
      }
      map[entry.projectId].entries.push(entry);
    }
    return Object.values(map).sort((a, b) => a.projectName.localeCompare(b.projectName));
  }, [entries, projectNames]);

  // ─── Approve single entry ─────────────────────────────────────────────────

  function handleEntryApproved(entryId: number) {
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, status: "Approved" } : e)),
    );
    const remaining = entries.filter((e) => e.id !== entryId && e.status === "Submitted");
    if (remaining.length === 0) {
      toast({ title: `All entries approved for ${submitterName}.` });
      onActionComplete();
    }
  }

  // ─── Reject entry ─────────────────────────────────────────────────────────

  async function handleRejectConfirm(reason: string) {
    if (!rejectEntry) return;
    const r = await fetch(`/api/time/entries/${rejectEntry.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ rejectionReason: reason }),
    });
    if (r.ok) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === rejectEntry.id ? { ...e, status: "Rejected", rejectionReason: reason } : e,
        ),
      );
      toast({ title: `Entry rejected. ${submitterName} has been notified.` });
      setRejectEntry(null);
    } else {
      const err = await r.json();
      throw new Error(err.error?.message ?? "Rejection failed");
    }
  }

  // ─── Approve All ──────────────────────────────────────────────────────────

  async function handleApproveAll() {
    setConfirmApproveAll(false);
    const toApprove = approvableEntries;
    setApproveProgress({ current: 0, total: toApprove.length });

    for (let i = 0; i < toApprove.length; i++) {
      const e = toApprove[i];
      await fetch(`/api/time/entries/${e.id}/approve`, {
        method: "POST",
        headers: authHeaders(),
      }).catch(() => {});
      setApproveProgress({ current: i + 1, total: toApprove.length });
      setEntries((prev) =>
        prev.map((x) => (x.id === e.id ? { ...x, status: "Approved" } : x)),
      );
    }

    setApproveProgress(null);
    toast({ title: `All entries approved for ${submitterName}.` });
    onActionComplete();
  }

  // ─── Approve Group ────────────────────────────────────────────────────────

  async function handleApproveGroup(group: ProjectGroup) {
    const toApprove = group.entries.filter(
      (e) => e.status === "Submitted" && e.resourceId !== currentUserId,
    );
    for (const e of toApprove) {
      await fetch(`/api/time/entries/${e.id}/approve`, {
        method: "POST",
        headers: authHeaders(),
      }).catch(() => {});
      setEntries((prev) =>
        prev.map((x) => (x.id === e.id ? { ...x, status: "Approved" } : x)),
      );
    }
    toast({ title: `${toApprove.length} entries approved for ${group.projectName}.` });
    const remaining = entries.filter(
      (e) => !toApprove.find((t) => t.id === e.id) && e.status === "Submitted",
    );
    if (remaining.length === 0) onActionComplete();
  }

  // ─── Select & Approve ────────────────────────────────────────────────────

  async function handleApproveSelected() {
    const ids = [...selectedIds];
    for (const id of ids) {
      await fetch(`/api/time/entries/${id}/approve`, {
        method: "POST",
        headers: authHeaders(),
      }).catch(() => {});
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: "Approved" } : e)),
      );
    }
    setSelectedIds(new Set());
    setSelectMode(false);
    toast({ title: `${ids.length} entries approved.` });
    if (approvableEntries.every((e) => selectedIds.has(e.id))) {
      onActionComplete();
    }
  }

  function toggleGroup(projectId: number) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
        <Clock className="h-4 w-4 animate-spin mr-2" />
        Loading entries…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-border bg-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold">{submitterName}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{formatWeekRange(weekStart)}</p>

            {/* Summary stats row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
              <span>Total: <span className="font-medium">{totalHours.toFixed(1)} hrs</span></span>
              <span className="text-muted-foreground">|</span>
              <span>Billable: <span className="font-medium">{billableHours.toFixed(1)}</span></span>
              <span className="text-muted-foreground">|</span>
              <span>Leave: <span className="font-medium">{leaveHours.toFixed(1)}</span></span>
              <span className="text-muted-foreground">|</span>
              <span>
                Utilization:{" "}
                <span className={cn("font-medium", utilization > 100 ? "text-red-600" : utilization > 90 ? "text-amber-600" : "")}>
                  {utilization}%
                </span>
              </span>
              {exceptionalCount > 0 && (
                <>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-amber-600 font-medium">{exceptionalCount} exceptional</span>
                </>
              )}
            </div>

            {/* Authorised approvers */}
            <div className="flex items-center gap-1.5 mt-2">
              <UserCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Authorised approvers:</span>{" "}
                {allApprovers.length > 0
                  ? allApprovers.map((a) => a.name).join(", ")
                  : <span className="italic">None designated — any manager can approve</span>
                }
              </span>
            </div>
          </div>

          {/* Action buttons */}
          {!allDone && (
            <div className="flex items-center gap-2 shrink-0">
              {approveProgress ? (
                <span className="text-sm text-muted-foreground">
                  Approving {approveProgress.current} of {approveProgress.total}…
                </span>
              ) : (
                <>
                  {selectMode ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white gap-1"
                        disabled={selectedIds.size === 0}
                        onClick={handleApproveSelected}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve Selected ({selectedIds.size})
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => setSelectMode(true)}
                        disabled={approvableEntries.length === 0}
                      >
                        <Square className="h-3.5 w-3.5" />
                        Select
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => setConfirmApproveAll(true)}
                        disabled={approvableEntries.length === 0}
                      >
                        <CheckSquare className="h-3.5 w-3.5" />
                        Approve All ({approvableEntries.length})
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Entry list grouped by project ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {allDone && (
          <div className="flex items-center justify-center flex-col gap-2 h-40 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="text-sm font-medium">All entries reviewed</p>
            <p className="text-xs text-muted-foreground">No more pending submissions for this week.</p>
          </div>
        )}

        {projectGroups.map((group) => {
          const isCollapsed = collapsedGroups.has(group.projectId);
          const groupTotal = group.entries.reduce((s, e) => s + Number(e.durationHours), 0);
          const groupSubmitted = group.entries.filter((e) => e.status === "Submitted" && e.resourceId !== currentUserId);
          const groupApproved = group.entries.filter((e) => e.status === "Approved").length;
          const groupRejected = group.entries.filter((e) => e.status === "Rejected").length;
          const groupExceptional = group.entries.filter((e) => e.isExceptional).length;

          return (
            <div key={group.projectId} className="rounded-lg border border-border bg-card overflow-hidden">
              {/* Project group header */}
              <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 border-b border-border">
                <button
                  onClick={() => toggleGroup(group.projectId)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <Folder className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">{group.projectName}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {group.entries.length} {group.entries.length === 1 ? "entry" : "entries"} · {groupTotal.toFixed(1)} hrs
                  </span>
                </button>

                <div className="flex items-center gap-1.5 shrink-0">
                  {groupExceptional > 0 && (
                    <Badge className="text-xs py-0 px-1.5 h-5 bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                      {groupExceptional} exceptional
                    </Badge>
                  )}
                  {groupApproved > 0 && (
                    <Badge className="text-xs py-0 px-1.5 h-5 bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                      {groupApproved} approved
                    </Badge>
                  )}
                  {groupRejected > 0 && (
                    <Badge className="text-xs py-0 px-1.5 h-5 bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
                      {groupRejected} rejected
                    </Badge>
                  )}
                  {groupSubmitted.length > 0 && !selectMode && (
                    <Button
                      size="sm"
                      className="h-6 text-xs px-2 bg-green-600 hover:bg-green-700 text-white gap-1"
                      onClick={() => handleApproveGroup(group)}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Approve {groupSubmitted.length}
                    </Button>
                  )}
                </div>
              </div>

              {/* Entries within this project (collapsible) */}
              {!isCollapsed && (
                <div className="divide-y divide-border/60">
                  {group.entries.map((entry) => (
                    <ApprovalEntryRow
                      key={entry.id}
                      entry={entry}
                      projectName={group.projectName}
                      taskName={entry.taskId ? (taskNames[entry.taskId] ?? `Task #${entry.taskId}`) : (entry.isLeave ? "Leave" : "—")}
                      currentUserId={currentUserId}
                      activeRole={activeRole}
                      selectMode={selectMode}
                      isSelected={selectedIds.has(entry.id)}
                      onSelect={(checked) => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(entry.id);
                          else next.delete(entry.id);
                          return next;
                        });
                      }}
                      onApproved={() => handleEntryApproved(entry.id)}
                      onReject={() => setRejectEntry(entry)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Approve All confirmation ── */}
      <Dialog open={confirmApproveAll} onOpenChange={setConfirmApproveAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve All Entries</DialogTitle>
            <DialogDescription>
              Approve all {approvableEntries.length} submitted entries for{" "}
              <strong>{submitterName}</strong>'s week of {formatWeekRange(weekStart)}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmApproveAll(false)}>
              Cancel
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleApproveAll}>
              Approve All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Rejection modal ── */}
      <RejectionModal
        open={rejectEntry !== null}
        onClose={() => setRejectEntry(null)}
        onConfirm={handleRejectConfirm}
        entry={
          rejectEntry
            ? {
                entryDate: rejectEntry.entryDate,
                projectName: projectNames[rejectEntry.projectId] ?? `Project #${rejectEntry.projectId}`,
                taskName: rejectEntry.taskId ? (taskNames[rejectEntry.taskId] ?? `Task #${rejectEntry.taskId}`) : "Leave",
                durationHours: Number(rejectEntry.durationHours),
              }
            : null
        }
      />
    </div>
  );
}
