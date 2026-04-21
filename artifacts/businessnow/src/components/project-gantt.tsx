import { useQuery } from "@tanstack/react-query";
import { getProjectGantt } from "@workspace/api-client-react";
import { GanttRow } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Flag } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  Completed: "bg-emerald-500",
  "In Progress": "bg-blue-500",
  "Not Started": "bg-slate-300",
  Blocked: "bg-red-500",
  Review: "bg-purple-400",
};

const ROW_BG: Record<string, string> = {
  phase: "bg-indigo-50 border-indigo-200",
  task: "bg-white border-slate-100",
};

function daysBetween(a: string, b: string) {
  return Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

interface Props {
  projectId: number;
}

export default function ProjectGantt({ projectId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["gantt", projectId],
    queryFn: () => getProjectGantt(projectId),
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <p className="text-sm">No phases or tasks with dates found for this project.</p>
      </div>
    );
  }

  const { projectStart, projectEnd, rows } = data;
  const totalDays = Math.max(daysBetween(projectStart, projectEnd), 1);

  // Build month labels
  const months: { label: string; pct: number }[] = [];
  const start = new Date(projectStart);
  const end = new Date(projectEnd);
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    const mStart = new Date(cur);
    const mEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
    const visibleStart = mStart < start ? start : mStart;
    const visibleEnd = mEnd > end ? end : mEnd;
    const pct = ((visibleEnd.getTime() - visibleStart.getTime()) / 86400000 + 1) / totalDays * 100;
    months.push({
      label: cur.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      pct: Math.max(pct, 0),
    });
    cur.setMonth(cur.getMonth() + 1);
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Column layout: name (30%) + gantt (70%) */}
        <div className="flex text-xs text-slate-500 font-medium border-b bg-slate-50 sticky top-0 z-10">
          <div className="w-[30%] min-w-[180px] px-3 py-2 border-r">Task / Phase</div>
          <div className="flex-1 flex overflow-hidden">
            {months.map((m, i) => (
              <div
                key={i}
                className="py-2 px-1 text-center border-r border-slate-200 flex-shrink-0"
                style={{ width: `${m.pct}%` }}
              >
                {m.label}
              </div>
            ))}
          </div>
        </div>

        {rows.map(row => (
          <GanttRowItem
            key={`${row.type}-${row.id}`}
            row={row}
            projectStart={projectStart}
            totalDays={totalDays}
          />
        ))}

        {/* Today marker info */}
        <div className="px-3 pt-3 pb-1 text-xs text-slate-400 flex items-center gap-2 border-t">
          <span className="h-3 w-3 rounded-sm bg-emerald-500 inline-block" /> Completed
          <span className="h-3 w-3 rounded-sm bg-blue-500 inline-block ml-2" /> In Progress
          <span className="h-3 w-3 rounded-sm bg-slate-300 inline-block ml-2" /> Not Started
          <span className="h-3 w-3 rounded-sm bg-red-500 inline-block ml-2" /> Blocked
          <Flag className="h-3 w-3 text-orange-400 ml-2" /> Milestone
        </div>
      </div>
    </div>
  );
}

function GanttRowItem({
  row,
  projectStart,
  totalDays,
}: {
  row: GanttRow;
  projectStart: string;
  totalDays: number;
}) {
  const isPhase = row.type === "phase";
  const indent = !isPhase && row.parentId ? "pl-8" : "pl-3";

  const rowStart = row.startDate ?? projectStart;
  const rowEnd = row.dueDate ?? projectStart;

  const offsetDays = clamp(daysBetween(projectStart, rowStart), 0, totalDays);
  const spanDays = clamp(daysBetween(rowStart, rowEnd) + 1, 1, totalDays - offsetDays);

  const leftPct = (offsetDays / totalDays) * 100;
  const widthPct = (spanDays / totalDays) * 100;

  const barColor = row.isMilestone
    ? "bg-orange-400"
    : STATUS_COLORS[row.status] ?? "bg-slate-300";

  return (
    <div className={`flex items-center border-b hover:bg-slate-50 transition-colors ${isPhase ? "bg-indigo-50/60" : ""}`} style={{ minHeight: "38px" }}>
      {/* Name column */}
      <div className={`w-[30%] min-w-[180px] ${indent} pr-3 border-r py-2 flex items-center gap-1.5`}>
        {row.isMilestone && <Flag className="h-3 w-3 text-orange-400 flex-shrink-0" />}
        <span className={`text-sm truncate ${isPhase ? "font-semibold text-indigo-800" : "text-slate-700"}`}>
          {row.name}
        </span>
      </div>

      {/* Bar column */}
      <div className="flex-1 relative py-2 px-1" style={{ minHeight: "38px" }}>
        <div className="relative h-full flex items-center">
          {/* bar */}
          <div
            className="absolute"
            style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 0.5)}%` }}
          >
            {row.isMilestone ? (
              /* Diamond for milestones */
              <div className="flex items-center justify-center">
                <div className="h-4 w-4 bg-orange-400 rotate-45 rounded-sm shadow-sm" />
              </div>
            ) : (
              <div
                className={`h-5 rounded ${isPhase ? "h-6 rounded-md shadow-sm" : "rounded"} ${barColor} relative overflow-hidden`}
                title={`${row.name}: ${row.startDate ?? "?"} → ${row.dueDate ?? "?"} (${row.completion}%)`}
              >
                {/* completion overlay */}
                {row.completion > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 bg-black/10"
                    style={{ width: `${row.completion}%` }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
