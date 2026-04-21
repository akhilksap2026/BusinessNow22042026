import { useListUsers } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, addWeeks, startOfWeek, endOfWeek } from "date-fns";

function getWeeksFromNow(count: number) {
  const weeks: Array<{ start: Date; end: Date; label: string }> = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const start = startOfWeek(addWeeks(now, i), { weekStartsOn: 1 });
    const end = endOfWeek(start, { weekStartsOn: 1 });
    weeks.push({ start, end, label: format(start, "MMM d") });
  }
  return weeks;
}

function cellColor(pct: number): string {
  if (pct === 0) return "bg-slate-50 border-slate-100";
  if (pct < 50) return "bg-green-50 border-green-100 text-green-700";
  if (pct < 80) return "bg-green-100 border-green-200 text-green-800";
  if (pct < 100) return "bg-amber-100 border-amber-200 text-amber-800";
  if (pct < 120) return "bg-red-100 border-red-200 text-red-700";
  return "bg-red-200 border-red-300 text-red-800 font-bold";
}

export function UtilisationHeatmap() {
  const { data: users, isLoading: loadingUsers } = useListUsers();
  const { data: allAllocations, isLoading: loadingAllocs } = useQuery<any[]>({
    queryKey: ["all-allocations"],
    queryFn: async () => {
      const res = await fetch("/api/allocations");
      if (!res.ok) throw new Error("Failed to fetch allocations");
      return res.json();
    },
  });

  const isLoading = loadingUsers || loadingAllocs;
  const weeks = getWeeksFromNow(12);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Resource Utilisation Heat Map</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeUsers = (users ?? []).filter(u => (u as any).isActive !== 0);

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle>Resource Utilisation Heat Map</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Showing allocated hours vs capacity for next 12 weeks.
            <span className="inline-flex gap-2 ml-4 items-center">
              <span className="w-3 h-3 rounded bg-green-100 border border-green-200 inline-block" /> &lt;80%
              <span className="w-3 h-3 rounded bg-amber-100 border border-amber-200 inline-block" /> 80–99%
              <span className="w-3 h-3 rounded bg-red-100 border border-red-200 inline-block" /> ≥100%
            </span>
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-xs border-collapse min-w-[900px]">
            <thead>
              <tr>
                <th className="sticky left-0 bg-background border-b px-4 py-2 text-left font-medium text-muted-foreground w-44 z-10">Team Member</th>
                {weeks.map(w => (
                  <th key={w.label} className="border-b px-2 py-2 text-center font-medium text-muted-foreground whitespace-nowrap min-w-[72px]">
                    {w.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeUsers.map(user => {
                const capacity = (user.capacity ?? 40);
                const userAllocs = (allAllocations ?? []).filter((a: any) => a.userId === user.id);

                return (
                  <tr key={user.id} className="hover:bg-muted/30">
                    <td className="sticky left-0 bg-background border-b px-3 py-2 z-10">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">{user.initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-xs">{user.name}</p>
                          <p className="text-muted-foreground text-[10px]">{user.role}</p>
                        </div>
                      </div>
                    </td>
                    {weeks.map(week => {
                      const allocatedHours = userAllocs.reduce((sum: number, a: any) => {
                        const aStart = new Date(a.startDate + "T00:00:00");
                        const aEnd = new Date(a.endDate + "T00:00:00");
                        if (aEnd < week.start || aStart > week.end) return sum;
                        return sum + (a.hoursPerWeek ?? 0);
                      }, 0);

                      const isSoftOnly = userAllocs
                        .filter((a: any) => {
                          const aStart = new Date(a.startDate + "T00:00:00");
                          const aEnd = new Date(a.endDate + "T00:00:00");
                          return !(aEnd < week.start || aStart > week.end);
                        })
                        .every((a: any) => a.isSoftAllocation);

                      const pct = capacity > 0 ? Math.round((allocatedHours / capacity) * 100) : 0;
                      const color = cellColor(pct);

                      return (
                        <Tooltip key={week.label}>
                          <TooltipTrigger asChild>
                            <td className={`border border-slate-100 px-2 py-2 text-center cursor-default ${color}`}>
                              {allocatedHours > 0 ? (
                                <span className={isSoftOnly ? "opacity-60 italic" : ""}>
                                  {pct}%
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{user.name} — {week.label}</p>
                            <p>{allocatedHours}h allocated of {capacity}h capacity ({pct}%)</p>
                            {isSoftOnly && allocatedHours > 0 && <p className="text-amber-300">Soft allocation only</p>}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
