import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, Clock, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { authHeaders } from "@/lib/auth-headers";

interface WeekSummary {
  week_start: string;
  total_hours: string;
  billable_hours: string;
  entry_count: number;
  project_count: number;
  exceptional_count: number;
  dominant_status: string;
  last_action_at: string | null;
}

interface TimesheetHistoryProps {
  userId: number;
  currentWeekStart: string;
  onNavigateToWeek: (weekStart: string) => void;
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(`${weekStart}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date, y?: boolean) =>
    d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      ...(y ? { year: "numeric" } : {}),
      timeZone: "UTC",
    });
  return `${fmt(start)} – ${fmt(end, true)}`;
}

function formatActionTime(ts: string): string {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_STYLES: Record<string, string> = {
  Approved: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800",
  Submitted: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  Rejected: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
  Draft: "bg-muted text-muted-foreground border-border",
};

export function TimesheetHistory({ userId, currentWeekStart, onNavigateToWeek }: TimesheetHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<WeekSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await fetch(`/api/time/history?resourceId=${userId}`, {
        headers: authHeaders(),
      });
      if (r.ok) {
        const body = await r.json();
        const rows: WeekSummary[] = Array.isArray(body) ? body : (body.data ?? []);
        setHistory(rows);
      }
    } catch {}
    setIsLoading(false);
    setHasFetched(true);
  }, [userId]);

  function handleToggle() {
    if (!isOpen && !hasFetched) {
      fetchHistory();
    }
    setIsOpen((v) => !v);
  }

  const pastWeeks = history.filter((w) => {
    const ws = typeof w.week_start === "string" ? w.week_start.slice(0, 10) : String(w.week_start);
    return ws !== currentWeekStart;
  });

  const rejectedCount = pastWeeks.filter((w) => w.dominant_status === "Rejected").length;
  const pendingCount = pastWeeks.filter((w) => w.dominant_status === "Submitted").length;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
      >
        <History className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="flex-1 text-sm font-medium">Timesheet History</span>
        {!isOpen && (rejectedCount > 0 || pendingCount > 0) && (
          <div className="flex items-center gap-1.5">
            {rejectedCount > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                {rejectedCount} rejected
              </span>
            )}
            {pendingCount > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                {pendingCount} pending
              </span>
            )}
          </div>
        )}
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-border">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 animate-spin" />
              Loading history…
            </div>
          ) : pastWeeks.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No previous timesheet weeks found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-xs text-muted-foreground">
                    <th className="text-left px-4 py-2 font-medium">Week</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-right px-3 py-2 font-medium">Total hrs</th>
                    <th className="text-right px-3 py-2 font-medium">Billable</th>
                    <th className="text-right px-3 py-2 font-medium">Projects</th>
                    <th className="text-right px-3 py-2 font-medium">Exceptions</th>
                    <th className="text-left px-4 py-2 font-medium">Last action</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pastWeeks.map((w) => {
                    const ws = typeof w.week_start === "string" ? w.week_start.slice(0, 10) : String(w.week_start);
                    const isRejected = w.dominant_status === "Rejected";
                    return (
                      <tr
                        key={ws}
                        className={cn(
                          "hover:bg-muted/20 transition-colors",
                          isRejected && "bg-red-50/40 dark:bg-red-950/10",
                        )}
                      >
                        <td className="px-4 py-2.5 text-xs font-medium whitespace-nowrap">
                          {formatWeekRange(ws)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              "inline-flex items-center text-xs font-medium px-2 py-0.5 rounded border",
                              STATUS_STYLES[w.dominant_status] ?? STATUS_STYLES.Draft,
                            )}
                          >
                            {w.dominant_status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-xs font-semibold">
                          {Number(w.total_hours).toFixed(1)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-xs text-muted-foreground">
                          {Number(w.billable_hours).toFixed(1)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs text-muted-foreground">
                          {w.project_count}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {w.exceptional_count > 0 ? (
                            <span className="text-xs font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                              {w.exceptional_count}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {w.last_action_at ? formatActionTime(w.last_action_at) : "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs px-2"
                            onClick={() => onNavigateToWeek(ws)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
