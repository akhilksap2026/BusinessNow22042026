import { useMemo } from "react";
import { useListAllocations, useListUsers } from "@workspace/api-client-react";
import { AlertTriangle, Gauge, Clock, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function isWeekday(d: Date) {
  const day = d.getUTCDay();
  return day !== 0 && day !== 6;
}

function workingDaysInRange(startISO: string, endISO: string): number {
  const start = new Date(startISO + "T00:00:00Z");
  const end = new Date(endISO + "T00:00:00Z");
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (isWeekday(cur)) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

function dailyHoursOf(a: any): number {
  const hpd = Number(a.hoursPerDay ?? 0);
  if (hpd > 0) return hpd;
  const hpw = Number(a.hoursPerWeek ?? 0);
  if (hpw > 0) return hpw / 5;
  return 0;
}

interface Props {
  /** Optional explicit window. Falls back to the current calendar month. */
  startDate?: string;
  endDate?: string;
}

export function ResourceKpiBar({ startDate, endDate }: Props) {
  const { data: allocs, isLoading: loadingAllocs } = useListAllocations();
  const { data: users, isLoading: loadingUsers } = useListUsers();

  // Default to current calendar month if no explicit range supplied.
  const { periodStart, periodEnd, periodLabel } = useMemo(() => {
    if (startDate && endDate) {
      return { periodStart: startDate, periodEnd: endDate, periodLabel: `${startDate} → ${endDate}` };
    }
    const now = new Date();
    const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    return {
      periodStart: ymd(first),
      periodEnd: ymd(last),
      periodLabel: first.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    };
  }, [startDate, endDate]);

  const metrics = useMemo(() => {
    const userList = (users as any[]) ?? [];
    const allocList = (allocs as any[]) ?? [];
    const periodWorkingDays = workingDaysInRange(periodStart, periodEnd);

    // Daily capacity per user (weekly capacity / 5).
    const dailyCap = new Map<number, number>();
    let totalCapacity = 0;
    for (const u of userList) {
      const cap = (u.capacity ?? 40) / 5;
      dailyCap.set(u.id, cap);
      totalCapacity += cap * periodWorkingDays;
    }

    // Walk every allocation, intersect with period, attribute hours per weekday.
    // Track per-user per-day totals so we can flag over-allocated members.
    const perUserDay = new Map<number, Map<string, number>>();
    let totalAllocated = 0;

    for (const a of allocList) {
      if (!a.userId) continue;
      const hpd = dailyHoursOf(a);
      if (hpd <= 0) continue;
      const start = a.startDate > periodStart ? a.startDate : periodStart;
      const end = a.endDate < periodEnd ? a.endDate : periodEnd;
      if (start > end) continue;
      const cur = new Date(start + "T00:00:00Z");
      const stop = new Date(end + "T00:00:00Z");
      while (cur <= stop) {
        if (isWeekday(cur)) {
          const key = ymd(cur);
          totalAllocated += hpd;
          let inner = perUserDay.get(a.userId);
          if (!inner) { inner = new Map(); perUserDay.set(a.userId, inner); }
          inner.set(key, (inner.get(key) ?? 0) + hpd);
        }
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    }

    let overAllocatedCount = 0;
    for (const [uid, dayMap] of perUserDay) {
      const cap = dailyCap.get(uid) ?? 0;
      if (cap <= 0) continue;
      for (const hours of dayMap.values()) {
        if (hours > cap + 0.001) { overAllocatedCount++; break; }
      }
    }

    const utilisation = totalCapacity > 0 ? (totalAllocated / totalCapacity) * 100 : 0;
    return { totalCapacity, totalAllocated, utilisation, overAllocatedCount, periodWorkingDays };
  }, [allocs, users, periodStart, periodEnd]);

  const isLoading = loadingAllocs || loadingUsers;

  if (isLoading) {
    return (
      <div className="sticky top-0 z-30 -mx-4 px-4 py-3 mb-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    );
  }

  const utilColor =
    metrics.utilisation >= 100 ? "text-red-600 dark:text-red-400"
    : metrics.utilisation >= 80 ? "text-amber-600 dark:text-amber-400"
    : "text-emerald-600 dark:text-emerald-400";
  const utilBg =
    metrics.utilisation >= 100 ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900"
    : metrics.utilisation >= 80 ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900"
    : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="sticky top-0 z-30 -mx-4 px-4 py-3 mb-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
            Resource KPIs · {periodLabel}
          </div>
          <div className="text-xs text-muted-foreground">{metrics.periodWorkingDays} working days</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Clock className="h-3.5 w-3.5" /> Total Capacity
                </div>
                <div className="text-xl font-bold tracking-tight tabular-nums">{Math.round(metrics.totalCapacity).toLocaleString()}<span className="text-xs font-normal text-muted-foreground ml-1">hrs</span></div>
              </div>
            </TooltipTrigger>
            <TooltipContent>Sum of daily capacity × working days for every team member.</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Users className="h-3.5 w-3.5" /> Total Allocated
                </div>
                <div className="text-xl font-bold tracking-tight tabular-nums">{Math.round(metrics.totalAllocated).toLocaleString()}<span className="text-xs font-normal text-muted-foreground ml-1">hrs</span></div>
              </div>
            </TooltipTrigger>
            <TooltipContent>Sum of hard + soft allocation hours falling inside the period (Mon–Fri).</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`rounded-lg border p-3 ${utilBg}`}>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Gauge className="h-3.5 w-3.5" /> Utilisation
                </div>
                <div className={`text-xl font-bold tracking-tight tabular-nums ${utilColor}`}>
                  {metrics.utilisation.toFixed(1)}%
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Allocated ÷ Capacity. Green &lt;80%, amber 80–99%, red ≥100%.
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`rounded-lg border p-3 ${metrics.overAllocatedCount > 0 ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900" : "bg-card"}`}>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <AlertTriangle className={`h-3.5 w-3.5 ${metrics.overAllocatedCount > 0 ? "text-red-600" : ""}`} /> Over-Allocated
                </div>
                <div className={`text-xl font-bold tracking-tight tabular-nums ${metrics.overAllocatedCount > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                  {metrics.overAllocatedCount} <span className="text-xs font-normal">{metrics.overAllocatedCount === 1 ? "member" : "members"}</span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Members whose allocation hours exceed daily capacity on at least one day this period.
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default ResourceKpiBar;
