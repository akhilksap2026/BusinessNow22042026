/**
 * ApprovalQueue — list of pending effort-entry submissions for the logged-in approver.
 *
 * Groups Submitted entries by (submitterId, weekStartDate), enriches with user data,
 * and renders each group as a reviewable queue card.
 */

import { useState, useMemo } from "react";
import { format, addDays, differenceInDays, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Clock, AlertTriangle, RefreshCw, ArrowRight, Filter, RotateCcw,
} from "lucide-react";

import { authHeaders } from "@/lib/auth-headers";
import { useCurrentUser } from "@/contexts/current-user";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useListProjects, useListUsers } from "@workspace/api-client-react";

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
  status: string;
  isExceptional: boolean;
  originalRejectorId: number | null;
  updatedAt: string;
}

interface QueueItem {
  submitterId: number;
  submitterName: string;
  submitterInitials: string;
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  entryCount: number;
  exceptionalCount: number;
  resubmittedCount: number;
  latestUpdatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function weekLabel(ws: string): string {
  const start = parseISO(ws);
  const end = addDays(start, 6);
  return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ApprovalQueue() {
  const { currentUser, activeRole } = useCurrentUser();
  const currentUserId = currentUser?.id ?? 1;

  const [filterProject, setFilterProject]   = useState<string>("__all");
  const [filterStatus,  setFilterStatus]    = useState<string>("Submitted");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo,   setFilterDateTo]   = useState<string>("");

  const { data: allUsers } = useListUsers();
  const { data: allProjects } = useListProjects();

  // Fetch all submitted entries visible to this approver
  const { data: submittedData, isLoading } = useQuery<{ data: EffortEntry[] }>({
    queryKey: ["approval-queue-entries", currentUserId],
    queryFn: async () => {
      const r = await fetch("/api/time/entries?status=Submitted", { headers: authHeaders() });
      if (!r.ok) return { data: [] };
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const entries: EffortEntry[] = submittedData?.data ?? [];

  // Group by (resourceId, weekStartDate)
  const grouped = useMemo<QueueItem[]>(() => {
    const map = new Map<string, EffortEntry[]>();
    for (const e of entries) {
      const key = `${e.resourceId}::${e.weekStartDate}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }

    const items: QueueItem[] = [];
    for (const [key, grp] of map.entries()) {
      const [submitterId, weekStart] = key.split("::");
      const user = (allUsers ?? []).find((u: any) => u.id === Number(submitterId));
      const name = user?.name ?? `User ${submitterId}`;
      const totalHours = grp.reduce((s, e) => s + parseFloat(e.durationHours), 0);
      const billableHours = grp
        .filter(e => e.billableCategory === "Billable")
        .reduce((s, e) => s + parseFloat(e.durationHours), 0);
      const latestUpdatedAt = grp
        .map(e => e.updatedAt)
        .sort()
        .at(-1) ?? new Date().toISOString();

      items.push({
        submitterId: Number(submitterId),
        submitterName: name,
        submitterInitials: initials(name),
        weekStart,
        weekEnd: format(addDays(parseISO(weekStart), 6), "yyyy-MM-dd"),
        totalHours,
        billableHours,
        nonBillableHours: totalHours - billableHours,
        entryCount: grp.length,
        exceptionalCount: grp.filter(e => e.isExceptional).length,
        resubmittedCount: grp.filter(e => e.originalRejectorId === currentUserId).length,
        latestUpdatedAt,
      });
    }
    return items.sort((a, b) => a.latestUpdatedAt.localeCompare(b.latestUpdatedAt));
  }, [entries, allUsers, currentUserId]);

  // Apply filters
  const filtered = useMemo(() => {
    return grouped.filter(item => {
      if (filterStatus === "Resubmitted" && item.resubmittedCount === 0) return false;
      if (filterDateFrom && item.weekStart < filterDateFrom) return false;
      if (filterDateTo   && item.weekStart > filterDateTo)   return false;
      // project filter — check if any entry in the group belongs to that project
      if (filterProject !== "__all") {
        const projectEntries = entries.filter(
          e => e.resourceId === item.submitterId &&
               e.weekStartDate === item.weekStart &&
               String(e.projectId) === filterProject,
        );
        if (projectEntries.length === 0) return false;
      }
      return true;
    });
  }, [grouped, filterProject, filterStatus, filterDateFrom, filterDateTo, entries]);

  return (
    <div className="space-y-5">
      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg border bg-muted/30">
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 w-[160px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Submitted">Submitted</SelectItem>
              <SelectItem value="Resubmitted">Resubmitted only</SelectItem>
              <SelectItem value="All">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Project</Label>
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="h-8 w-[180px] text-sm">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All projects</SelectItem>
              {(allProjects ?? []).map((p: any) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Week from</Label>
          <Input
            type="date"
            className="h-8 w-[140px] text-sm"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Week to</Label>
          <Input
            type="date"
            className="h-8 w-[140px] text-sm"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
          />
        </div>

        {(filterProject !== "__all" || filterStatus !== "Submitted" || filterDateFrom || filterDateTo) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => { setFilterProject("__all"); setFilterStatus("Submitted"); setFilterDateFrom(""); setFilterDateTo(""); }}
          >
            <RotateCcw className="h-3 w-3 mr-1" /> Reset
          </Button>
        )}
      </div>

      {/* ── Queue list ───────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No pending approvals"
          description="All submitted timesheets have been reviewed."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const daysSince = differenceInDays(new Date(), parseISO(item.latestUpdatedAt));
            const isOverdue = daysSince > 2;

            return (
              <div
                key={`${item.submitterId}-${item.weekStart}`}
                className={cn(
                  "flex items-center gap-4 rounded-lg border bg-background p-4 shadow-sm",
                  isOverdue && "border-red-200 bg-red-50/40",
                )}
              >
                {/* Avatar */}
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-semibold">
                    {item.submitterInitials}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{item.submitterName}</span>
                    {item.resubmittedCount > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">
                        <RefreshCw className="h-2.5 w-2.5 mr-1" />
                        {item.resubmittedCount} Resubmitted
                      </Badge>
                    )}
                    {item.exceptionalCount > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-orange-50 text-orange-700 border-orange-200">
                        <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                        {item.exceptionalCount} Exceptional
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{weekLabel(item.weekStart)}</p>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{item.totalHours.toFixed(1)}h total</span>
                    <span className="text-emerald-700">{item.billableHours.toFixed(1)}h billable</span>
                    <span>{item.nonBillableHours.toFixed(1)}h non-billable</span>
                    <span className={cn("ml-2", isOverdue ? "text-red-600 font-semibold" : "text-muted-foreground")}>
                      {daysSince === 0 ? "Today" : `${daysSince}d ago`}
                      {isOverdue && " — overdue"}
                    </span>
                  </div>
                </div>

                {/* Action */}
                <Link href={`/time/approvals/${item.submitterId}/${item.weekStart}`}>
                  <Button size="sm" className="gap-1.5 shrink-0">
                    Review <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
