import { useState, useEffect, useCallback } from "react";
import { Search, Clock, AlertTriangle, RefreshCw, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { authHeaders } from "@/lib/auth-headers";

export interface QueueSubmission {
  resourceId: number;
  submitterName: string;
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  billableHours: number;
  exceptionalCount: number;
  entryCount: number;
  daysSinceSubmission: number;
  status: string;
  approvers: { id: number; name: string }[];
}

interface ApprovalQueueProps {
  selected: QueueSubmission | null;
  onSelect: (item: QueueSubmission) => void;
}

function formatWeekRange(start: string, end: string): string {
  const s = new Date(`${start}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const e = new Date(`${end}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${s} – ${e}`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ApprovalQueue({ selected, onSelect }: ApprovalQueueProps) {
  const [submissions, setSubmissions] = useState<QueueSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nameFilter, setNameFilter] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await fetch("/api/time/approval-queue", { headers: authHeaders() });
      if (r.ok) {
        const { data } = await r.json();
        setSubmissions(data ?? []);
        setLastRefreshed(new Date());
      }
    } catch {}
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 60_000);
    const onFocus = () => fetchQueue();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchQueue]);

  const filtered = submissions.filter((s) =>
    !nameFilter || s.submitterName.toLowerCase().includes(nameFilter.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">
            Pending Approvals{" "}
            <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold w-5 h-5">
              {submissions.length}
            </span>
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={fetchQueue}
            disabled={isLoading}
            title="Refresh"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search employee…"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Queue list */}
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {isLoading && submissions.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 animate-spin mr-2" />
            Loading queue…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-center text-sm text-muted-foreground p-4">
            <p className="font-medium">No pending approvals</p>
            {nameFilter && <p className="text-xs">Try clearing the search filter.</p>}
          </div>
        ) : (
          filtered.map((sub) => {
            const isSelected =
              selected?.resourceId === sub.resourceId && selected?.weekStart === sub.weekStart;
            const slaBreach = sub.daysSinceSubmission > 2;
            return (
              <button
                key={`${sub.resourceId}-${sub.weekStart}`}
                onClick={() => onSelect(sub)}
                className={cn(
                  "w-full text-left px-4 py-3 transition-colors hover:bg-muted/50 focus:outline-none focus:bg-muted/50",
                  isSelected && "bg-primary/5 border-l-2 border-l-primary",
                )}
              >
                {/* Row 1: Avatar + name + days badge */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                    {initials(sub.submitterName)}
                  </span>
                  <span className="flex-1 text-sm font-medium truncate">{sub.submitterName}</span>
                  <span
                    className={cn(
                      "shrink-0 text-xs font-medium px-1.5 py-0.5 rounded",
                      slaBreach
                        ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {sub.daysSinceSubmission}d
                  </span>
                </div>

                {/* Row 2: Week range */}
                <p className="text-xs text-muted-foreground mb-1.5 pl-9">
                  {formatWeekRange(sub.weekStart, sub.weekEnd)}
                </p>

                {/* Row 3: Hours + badges */}
                <div className="flex items-center gap-2 pl-9 flex-wrap">
                  <span className="text-xs">
                    <span className="font-medium">{sub.totalHours.toFixed(1)}</span>{" "}
                    <span className="text-muted-foreground">hrs</span>
                  </span>
                  <span className="text-muted-foreground text-xs">·</span>
                  <span className="text-xs text-muted-foreground">
                    Bill: <span className="font-medium">{sub.billableHours.toFixed(1)}</span>
                  </span>
                  {sub.exceptionalCount > 0 && (
                    <Badge className="text-xs py-0 px-1.5 h-4 bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                      <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                      {sub.exceptionalCount}
                    </Badge>
                  )}
                  {slaBreach && (
                    <Badge variant="destructive" className="text-xs py-0 px-1.5 h-4">
                      SLA
                    </Badge>
                  )}
                </div>

                {/* Row 4: Authorised approvers */}
                {sub.approvers?.length > 0 && (
                  <div className="flex items-center gap-1 pl-9 mt-1.5">
                    <UserCheck className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground">
                      {sub.approvers.map((a) => a.name).join(", ")}
                    </span>
                  </div>
                )}
                {(!sub.approvers || sub.approvers.length === 0) && (
                  <div className="flex items-center gap-1 pl-9 mt-1.5">
                    <UserCheck className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                    <span className="text-xs text-muted-foreground/60 italic">No designated approver</span>
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Footer: last refreshed */}
      <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
        Updated {lastRefreshed.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
  );
}
