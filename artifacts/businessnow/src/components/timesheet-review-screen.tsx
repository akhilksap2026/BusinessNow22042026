/**
 * TimesheetReviewScreen — approver view for a single submitter's week.
 *
 * Implements:
 *   FR-496.1 — Line-item rejection (individual entries reject independently)
 *   FR-496.2 — Resubmission routing + diff from audit log
 *   FR-357.1/2 — Billable category override for Authorized_Approver
 *   FR-476.2 — Per-entry rejection without affecting others
 */

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, addDays, parseISO } from "date-fns";
import { Link } from "wouter";
import {
  ChevronLeft, ChevronDown, ChevronRight, AlertTriangle,
  RefreshCw, CheckCircle2, XCircle, Loader2, History, Lock,
} from "lucide-react";

import { authHeaders } from "@/lib/auth-headers";
import { useCurrentUser } from "@/contexts/current-user";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useListUsers, useListProjects, useListTasks } from "@workspace/api-client-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EffortEntry {
  id: number;
  resourceId: number;
  projectId: number;
  taskId: number;
  entryDate: string;
  weekStartDate: string;
  durationHours: string;
  billableCategory: string;
  originalBillableCategory: string | null;
  status: string;
  narrative: string | null;
  isExceptional: boolean;
  exceptionalJustification: string | null;
  isReplicated: boolean;
  rejectionReason: string | null;
  originalRejectorId: number | null;
  enteredById: number;
}

interface AuditRecord {
  id: number;
  action: string;
  performedById: number;
  previousValue: any;
  newValue: any;
  notes: string | null;
  performedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  Draft:     "bg-slate-100 text-slate-700 border-slate-200",
  Submitted: "bg-blue-100 text-blue-800 border-blue-200",
  Approved:  "bg-emerald-100 text-emerald-800 border-emerald-200",
  Rejected:  "bg-red-100 text-red-700 border-red-200",
  Processed: "bg-violet-100 text-violet-800 border-violet-200",
};

function initials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TimesheetReviewScreenProps {
  submitterId: number;
  weekStart: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TimesheetReviewScreen({ submitterId, weekStart }: TimesheetReviewScreenProps) {
  const { currentUser, activeRole } = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const currentUserId = currentUser?.id ?? 1;
  const isAuthorizedApprover = activeRole === "account_admin" || activeRole === "super_user";

  const { data: allUsers } = useListUsers();
  const { data: allProjects } = useListProjects();
  const { data: allTasks } = useListTasks({});

  const getName = (id: number) => (allUsers ?? []).find((u: any) => u.id === id)?.name ?? `User ${id}`;
  const getProject = (id: number) => (allProjects ?? []).find((p: any) => p.id === id)?.name ?? `Project ${id}`;
  const getTask = (id: number) => (allTasks ?? []).find((t: any) => t.id === id)?.name ?? `Task ${id}`;

  const submitterName = getName(submitterId);
  const weekEnd = format(addDays(parseISO(weekStart), 6), "MMM d, yyyy");
  const weekLabel = `${format(parseISO(weekStart), "MMM d")} – ${weekEnd}`;

  // ── Fetch entries for this submitter + week ────────────────────────────────
  const entriesQK = ["approval-review-entries", submitterId, weekStart];
  const { data: entriesData, isLoading } = useQuery<{ data: EffortEntry[] }>({
    queryKey: entriesQK,
    queryFn: async () => {
      const r = await fetch(
        `/api/time/entries?resourceId=${submitterId}&weekStart=${weekStart}`,
        { headers: authHeaders() },
      );
      if (!r.ok) return { data: [] };
      return r.json();
    },
  });

  const entries: EffortEntry[] = (entriesData?.data ?? [])
    .filter(e => ["Submitted", "Approved", "Rejected"].includes(e.status));

  // Group by project for display
  const byProject = useMemo(() => {
    const map = new Map<number, EffortEntry[]>();
    for (const e of entries) {
      if (!map.has(e.projectId)) map.set(e.projectId, []);
      map.get(e.projectId)!.push(e);
    }
    return map;
  }, [entries]);

  // ── Selection state ─────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const submittedEntries = entries.filter(e => e.status === "Submitted");
  const allSubmittedSelected = submittedEntries.length > 0 &&
    submittedEntries.every(e => selectedIds.has(e.id));

  // ── Reject modal state ──────────────────────────────────────────────────────
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // ── Approve state ───────────────────────────────────────────────────────────
  const [approvingIds, setApprovingIds] = useState<Set<number>>(new Set());

  // ── Audit trail state ───────────────────────────────────────────────────────
  const [openAuditIds, setOpenAuditIds] = useState<Set<number>>(new Set());
  const [auditCache, setAuditCache] = useState<Map<number, AuditRecord[]>>(new Map());

  // ── Override category state ─────────────────────────────────────────────────
  const [overrideTarget, setOverrideTarget] = useState<{ id: number; current: string } | null>(null);
  const [overrideCategory, setOverrideCategory] = useState<string>("");
  const [overriding, setOverriding] = useState(false);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function invalidate() {
    qc.invalidateQueries({ queryKey: entriesQK });
    qc.invalidateQueries({ queryKey: ["approval-queue-entries"] });
  }

  async function approveSingle(entryId: number) {
    setApprovingIds(p => new Set([...p, entryId]));
    try {
      const r = await fetch(`/api/time/entries/${entryId}/approve`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await r.json();
      if (!r.ok) { toast({ title: "Approve failed", description: data?.error?.message, variant: "destructive" }); return; }
      toast({ title: "Entry approved" });
      invalidate();
    } finally {
      setApprovingIds(p => { const n = new Set(p); n.delete(entryId); return n; });
    }
  }

  async function approveSelected() {
    for (const id of selectedIds) {
      await approveSingle(id);
    }
    setSelectedIds(new Set());
  }

  async function approveAll() {
    for (const e of submittedEntries) {
      await approveSingle(e.id);
    }
  }

  function openRejectModal(entryId: number) {
    setRejectTarget(entryId);
    setRejectReason("");
    setRejectError("");
  }

  async function confirmReject() {
    const trimmed = rejectReason.trim();
    if (!trimmed || trimmed.length < 10) {
      setRejectError("Reason must be at least 10 characters and cannot be blank."); return;
    }
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      const r = await fetch(`/api/time/entries/${rejectTarget}/reject`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ rejectionReason: trimmed }),
      });
      const data = await r.json();
      if (!r.ok) { toast({ title: "Reject failed", description: data?.error?.message, variant: "destructive" }); return; }
      toast({ title: "Entry rejected", description: "The submitter has been notified." });
      setRejectTarget(null);
      invalidate();
    } finally {
      setRejecting(false);
    }
  }

  async function toggleAuditTrail(entryId: number) {
    if (openAuditIds.has(entryId)) {
      setOpenAuditIds(p => { const n = new Set(p); n.delete(entryId); return n; });
      return;
    }
    // Fetch if not cached
    if (!auditCache.has(entryId)) {
      const r = await fetch(`/api/time/entries/${entryId}/audit`, { headers: authHeaders() });
      if (r.ok) {
        const data = await r.json();
        setAuditCache(p => new Map([...p, [entryId, data.data ?? []]]));
      }
    }
    setOpenAuditIds(p => new Set([...p, entryId]));
  }

  async function confirmOverride() {
    if (!overrideTarget || !overrideCategory) return;
    setOverriding(true);
    try {
      const r = await fetch(`/api/time/entries/${overrideTarget.id}/override-category`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ newCategory: overrideCategory }),
      });
      const data = await r.json();
      if (!r.ok) { toast({ title: "Override failed", description: data?.error?.message, variant: "destructive" }); return; }
      toast({ title: "Category overridden" });
      setOverrideTarget(null);
      invalidate();
    } finally {
      setOverriding(false);
    }
  }

  // ── Summary stats ───────────────────────────────────────────────────────────
  const totalHours = entries.reduce((s, e) => s + parseFloat(e.durationHours), 0);
  const approvedCount = entries.filter(e => e.status === "Approved").length;
  const rejectedCount = entries.filter(e => e.status === "Rejected").length;

  // ── Render ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11">
            <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold">
              {initials(submitterName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold">{submitterName}</h2>
            <p className="text-sm text-muted-foreground">{weekLabel}</p>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex items-center gap-4 text-sm">
          <span className="font-medium">{totalHours.toFixed(1)}h total</span>
          <span className="text-emerald-700">{approvedCount} approved</span>
          <span className="text-red-600">{rejectedCount} rejected</span>
          <span className="text-blue-700">{submittedEntries.length} pending</span>
        </div>
      </div>

      {/* ── Bulk action bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Checkbox
          checked={allSubmittedSelected}
          onCheckedChange={v => setSelectedIds(v ? new Set(submittedEntries.map(e => e.id)) : new Set())}
          aria-label="Select all submitted entries"
        />
        <span className="text-sm text-muted-foreground mr-1">Select all</span>

        <Button
          size="sm"
          onClick={approveAll}
          disabled={submittedEntries.length === 0}
          className="gap-1.5"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Approve All ({submittedEntries.length})
        </Button>

        {selectedIds.size > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={approveSelected}
            className="gap-1.5"
          >
            Approve Selected ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* ── Entry rows grouped by project ──────────────────────────────────── */}
      {entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No entries to review for this week.
        </div>
      ) : (
        <div className="space-y-4">
          {[...byProject.entries()].map(([projectId, projEntries]) => (
            <div key={projectId} className="rounded-lg border overflow-hidden">
              {/* Project header */}
              <div className="bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {getProject(projectId)}
              </div>

              {/* Entry rows */}
              <div className="divide-y">
                {projEntries.map(entry => {
                  const isSubmitted = entry.status === "Submitted";
                  const isApproving = approvingIds.has(entry.id);
                  const isResubmitted = entry.originalRejectorId === currentUserId && isSubmitted;
                  const auditLog = auditCache.get(entry.id) ?? [];
                  const isAuditOpen = openAuditIds.has(entry.id);

                  // Diff: for resubmitted entries, compare current vs previous from audit log
                  const rejectedAuditEntry = auditLog.find(a => a.action === "Rejected");
                  const diffHours = rejectedAuditEntry
                    ? parseFloat(rejectedAuditEntry.previousValue?.durationHours ?? 0)
                    : null;

                  return (
                    <div key={entry.id} className={cn(
                      "px-4 py-3 space-y-2",
                      entry.status === "Approved" && "bg-emerald-50/30",
                      entry.status === "Rejected" && "bg-red-50/30",
                    )}>
                      {/* Row header */}
                      <div className="flex items-start gap-3">
                        {/* Checkbox — only for submitted */}
                        <div className="mt-0.5 w-4 shrink-0">
                          {isSubmitted && (
                            <Checkbox
                              checked={selectedIds.has(entry.id)}
                              onCheckedChange={v => setSelectedIds(p => {
                                const n = new Set(p);
                                v ? n.add(entry.id) : n.delete(entry.id);
                                return n;
                              })}
                            />
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{getTask(entry.taskId)}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(entry.entryDate), "EEE MMM d")}
                            </span>
                            <span className="text-sm font-semibold text-indigo-700">
                              {parseFloat(entry.durationHours).toFixed(1)}h
                            </span>

                            {/* Status badge */}
                            <span className={cn(
                              "inline-flex items-center text-[10px] font-medium border rounded-full px-2 py-0.5",
                              STATUS_STYLE[entry.status] ?? "",
                            )}>
                              {entry.status}
                            </span>

                            {/* Resubmitted flag */}
                            {isResubmitted && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">
                                <RefreshCw className="h-2.5 w-2.5 mr-1" />
                                Resubmitted
                              </Badge>
                            )}

                            {/* Exceptional flag */}
                            {entry.isExceptional && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-orange-50 text-orange-700 border-orange-200">
                                <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                                Exceptional
                              </Badge>
                            )}

                            {/* Proxy badge */}
                            {entry.enteredById !== entry.resourceId && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                                Proxy: {getName(entry.enteredById)}
                              </Badge>
                            )}

                            {/* Billable badge */}
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] px-1.5 py-0",
                                entry.billableCategory === "Billable"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "text-muted-foreground",
                              )}
                            >
                              {entry.billableCategory}
                              {entry.originalBillableCategory &&
                                entry.originalBillableCategory !== entry.billableCategory && (
                                  <span className="ml-1 line-through text-muted-foreground">
                                    {entry.originalBillableCategory}
                                  </span>
                                )}
                            </Badge>
                          </div>

                          {/* Narrative */}
                          {entry.narrative && (
                            <p className="text-xs text-muted-foreground italic">{entry.narrative}</p>
                          )}

                          {/* Exceptional justification */}
                          {entry.isExceptional && entry.exceptionalJustification && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                              <span className="font-medium">Justification:</span> {entry.exceptionalJustification}
                            </div>
                          )}

                          {/* Rejection reason (for Rejected entries) */}
                          {entry.status === "Rejected" && entry.rejectionReason && (
                            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-800">
                              <span className="font-medium">Rejected:</span> {entry.rejectionReason}
                            </div>
                          )}

                          {/* Diff for resubmitted entries */}
                          {isResubmitted && diffHours !== null &&
                            diffHours !== parseFloat(entry.durationHours) && (
                              <div className="text-xs text-muted-foreground">
                                Hours changed: <span className="line-through">{diffHours.toFixed(1)}h</span>
                                {" → "}<span className="font-medium text-indigo-700">{parseFloat(entry.durationHours).toFixed(1)}h</span>
                              </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Audit trail toggle */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggleAuditTrail(entry.id)}
                            title="View audit trail"
                          >
                            <History className="h-3.5 w-3.5" />
                          </Button>

                          {/* Billable override (Authorized_Approver only) */}
                          {isAuthorizedApprover && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => {
                                setOverrideTarget({ id: entry.id, current: entry.billableCategory });
                                setOverrideCategory(
                                  entry.billableCategory === "Billable" ? "Non-Billable" : "Billable",
                                );
                              }}
                            >
                              Override
                            </Button>
                          )}

                          {/* Approve / Reject — only for Submitted entries */}
                          {isSubmitted && (
                            <>
                              <Button
                                size="sm"
                                className="h-7 text-xs px-2.5 gap-1 bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => approveSingle(entry.id)}
                                disabled={isApproving}
                              >
                                {isApproving
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <CheckCircle2 className="h-3 w-3" />
                                }
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2.5 gap-1 border-red-200 text-red-700 hover:bg-red-50"
                                onClick={() => openRejectModal(entry.id)}
                                disabled={isApproving}
                              >
                                <XCircle className="h-3 w-3" />
                                Reject
                              </Button>
                            </>
                          )}

                          {/* Locked indicator for non-submitted */}
                          {!isSubmitted && entry.status !== "Submitted" && (
                            <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label={entry.status} />
                          )}
                        </div>
                      </div>

                      {/* Audit trail (expandable) */}
                      {isAuditOpen && (
                        <div className="ml-7 mt-2 rounded-md border bg-muted/20 p-3 space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Audit Trail
                          </p>
                          {auditLog.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No audit records.</p>
                          ) : (
                            auditLog.map(rec => (
                              <div key={rec.id} className="flex gap-2 text-xs">
                                <span className="text-muted-foreground shrink-0 w-36">
                                  {format(parseISO(rec.performedAt), "MMM d, HH:mm")}
                                </span>
                                <span className="font-medium w-24 shrink-0">{rec.action}</span>
                                <span className="text-muted-foreground">
                                  by {getName(rec.performedById)}
                                  {rec.notes ? ` — ${rec.notes}` : ""}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Rejection modal (FR-496.1) ─────────────────────────────────────── */}
      <Dialog open={rejectTarget !== null} onOpenChange={open => { if (!open) setRejectTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Entry</DialogTitle>
            <DialogDescription>
              Only this entry will be rejected. Other entries in the submission remain unaffected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="rejection-reason">
              Reason for rejection <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="rejection-reason"
              placeholder="Describe why this entry is being rejected (min 10 characters)…"
              value={rejectReason}
              rows={4}
              onChange={e => { setRejectReason(e.target.value); setRejectError(""); }}
              className={cn(rejectError && "border-red-500")}
            />
            {rejectError && <p className="text-xs text-red-600">{rejectError}</p>}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={rejecting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={rejecting}
            >
              {rejecting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Billable override modal (FR-357.1/2) ───────────────────────────── */}
      <Dialog open={overrideTarget !== null} onOpenChange={open => { if (!open) setOverrideTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Billable Category</DialogTitle>
            <DialogDescription>
              Current category:{" "}
              <span className="font-semibold">{overrideTarget?.current}</span>.
              The original category will be preserved for audit purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label>New Category</Label>
            <Select value={overrideCategory} onValueChange={setOverrideCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Billable">Billable</SelectItem>
                <SelectItem value="Non-Billable">Non-Billable</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOverrideTarget(null)} disabled={overriding}>
              Cancel
            </Button>
            <Button onClick={confirmOverride} disabled={overriding}>
              {overriding && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
