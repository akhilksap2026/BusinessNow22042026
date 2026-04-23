import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProjectGantt } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Flag, ZoomIn, ZoomOut, CalendarRange, Layers, ArrowRightLeft, BookmarkPlus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  Completed: "bg-emerald-500",
  "In Progress": "bg-blue-500",
  "Not Started": "bg-slate-300",
  Blocked: "bg-red-500",
  Review: "bg-purple-400",
};

type Zoom = "quarter" | "month" | "week" | "day";
const ZOOM_LABELS: Record<Zoom, string> = { quarter: "Quarter", month: "Month", week: "Week", day: "Day" };
const ZOOM_CELL_PX: Record<Zoom, number> = { quarter: 120, month: 80, week: 40, day: 20 };

function daysBetween(a: string, b: string) {
  return Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
function addDays(dateStr: string, n: number) {
  return new Date(new Date(dateStr).getTime() + n * 86400000).toISOString().slice(0, 10);
}

interface Baseline {
  id: number;
  name: string;
  notes?: string;
  snapshotDate: string;
  phaseSnapshot: { id: number; name: string; startDate: string | null; endDate: string | null }[];
  taskSnapshot: { id: number; name: string; startDate: string | null; dueDate: string | null }[];
}

interface Props { projectId: number }

export default function ProjectGantt({ projectId }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [zoom, setZoom] = useState<Zoom>("month");
  const [showBaselines, setShowBaselines] = useState(false);
  const [activeBaselineId, setActiveBaselineId] = useState<number | null>(null);
  const [showSaveBaselineDialog, setShowSaveBaselineDialog] = useState(false);
  const [showShiftDatesDialog, setShowShiftDatesDialog] = useState(false);
  const [baselineName, setBaselineName] = useState("");
  const [shiftDays, setShiftDays] = useState("0");
  const [saveBeforeShift, setSaveBeforeShift] = useState(false);
  const [collapsedPhases, setCollapsedPhases] = useState<Set<number>>(new Set());
  const barContainerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["gantt", projectId],
    queryFn: () => getProjectGantt(projectId),
  });

  const { data: baselines = [], isLoading: baselinesLoading } = useQuery<Baseline[]>({
    queryKey: ["baselines", projectId],
    queryFn: async () => {
      const r = await fetch(`/api/projects/${projectId}/baselines`);
      return r.json();
    },
    enabled: showBaselines,
  });

  const saveBaselineMut = useMutation({
    mutationFn: async (name: string) => {
      const r = await fetch(`/api/projects/${projectId}/baselines`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": "PM" },
        body: JSON.stringify({ name }),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["baselines", projectId] });
      toast({ title: "Baseline saved" });
      setBaselineName("");
      setShowSaveBaselineDialog(false);
    },
    onError: (e: any) => toast({ title: "Error saving baseline", description: e.message, variant: "destructive" }),
  });

  const deleteBaselineMut = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/baselines/${id}`, { method: "DELETE", headers: { "x-user-role": "PM" } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["baselines", projectId] });
      if (activeBaselineId && baselines.find(b => b.id === activeBaselineId) === undefined) setActiveBaselineId(null);
    },
  });

  const shiftDatesMut = useMutation({
    mutationFn: async (days: number) => {
      const r = await fetch(`/api/projects/${projectId}/shift-dates`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": "PM" },
        body: JSON.stringify({ days }),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["gantt", projectId] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Dates shifted", description: `Shifted ${result.shifted} tasks by ${result.days} days` });
      setShowShiftDatesDialog(false);
      setShiftDays("0");
      setSaveBeforeShift(false);
    },
    onError: (e: any) => toast({ title: "Shift failed", description: e.message, variant: "destructive" }),
  });

  const handleShift = async () => {
    const d = parseInt(shiftDays, 10);
    if (isNaN(d) || d === 0) { toast({ title: "Enter a non-zero number of days", variant: "destructive" }); return; }
    if (saveBeforeShift) {
      const name = `Pre-shift ${new Date().toLocaleDateString()}`;
      await saveBaselineMut.mutateAsync(name);
    }
    shiftDatesMut.mutate(d);
  };

  const togglePhase = (phaseId: number) => {
    setCollapsedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  if (isLoading) {
    return <div className="space-y-2 p-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <p className="text-sm">No phases or tasks with dates found for this project.</p>
      </div>
    );
  }

  const { projectStart, projectEnd, rows, dependencies = [] } = data as any;
  const totalDays = Math.max(daysBetween(projectStart, projectEnd) + 1, 1);
  const cellPx = ZOOM_CELL_PX[zoom];

  // Build header units based on zoom
  type HeaderUnit = { label: string; days: number; startOffset: number };
  const headerUnits: HeaderUnit[] = [];
  const startD = new Date(projectStart);
  const endD = new Date(projectEnd);

  if (zoom === "quarter") {
    const cur = new Date(startD.getFullYear(), Math.floor(startD.getMonth() / 3) * 3, 1);
    while (cur <= endD) {
      const qEnd = new Date(cur.getFullYear(), cur.getMonth() + 3, 0);
      const visStart = cur < startD ? startD : cur;
      const visEnd = qEnd > endD ? endD : qEnd;
      const days = Math.ceil((visEnd.getTime() - visStart.getTime()) / 86400000) + 1;
      const startOffset = Math.max(0, Math.ceil((visStart.getTime() - startD.getTime()) / 86400000));
      const qLabel = `Q${Math.floor(cur.getMonth() / 3) + 1} ${cur.getFullYear()}`;
      headerUnits.push({ label: qLabel, days, startOffset });
      cur.setMonth(cur.getMonth() + 3);
    }
  } else if (zoom === "month") {
    const cur = new Date(startD.getFullYear(), startD.getMonth(), 1);
    while (cur <= endD) {
      const mEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
      const visStart = cur < startD ? startD : cur;
      const visEnd = mEnd > endD ? endD : mEnd;
      const days = Math.ceil((visEnd.getTime() - visStart.getTime()) / 86400000) + 1;
      const startOffset = Math.max(0, Math.ceil((visStart.getTime() - startD.getTime()) / 86400000));
      headerUnits.push({ label: cur.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), days, startOffset });
      cur.setMonth(cur.getMonth() + 1);
    }
  } else if (zoom === "week") {
    const cur = new Date(startD);
    cur.setDate(cur.getDate() - cur.getDay()); // start of week
    while (cur <= endD) {
      const wEnd = new Date(cur); wEnd.setDate(wEnd.getDate() + 6);
      const visStart = cur < startD ? startD : cur;
      const visEnd = wEnd > endD ? endD : wEnd;
      const days = Math.ceil((visEnd.getTime() - visStart.getTime()) / 86400000) + 1;
      const startOffset = Math.max(0, Math.ceil((visStart.getTime() - startD.getTime()) / 86400000));
      headerUnits.push({ label: visStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }), days, startOffset });
      cur.setDate(cur.getDate() + 7);
    }
  } else {
    // day
    const cur = new Date(startD);
    while (cur <= endD) {
      const offset = Math.ceil((cur.getTime() - startD.getTime()) / 86400000);
      headerUnits.push({ label: cur.getDate().toString(), days: 1, startOffset: offset });
      cur.setDate(cur.getDate() + 1);
    }
  }

  const totalPx = totalDays * cellPx;

  // Today marker
  const todayOffset = clamp(daysBetween(projectStart, new Date().toISOString().slice(0, 10)), 0, totalDays);
  const todayPx = (todayOffset / totalDays) * totalPx;

  // Row height
  const ROW_H = 40;

  // Filter visible rows considering collapsed phases
  const visibleRows: typeof rows = [];
  for (const row of rows) {
    if (row.type === "phase") {
      visibleRows.push(row);
    } else if (row.type === "task") {
      const parentPhase = rows.find((r: any) => r.type === "phase" && r.id === row.parentId);
      if (!parentPhase || !collapsedPhases.has(parentPhase.id)) {
        visibleRows.push(row);
      }
    }
  }

  // Build row index map for dependency arrows
  const rowIndexMap = new Map<number, number>();
  visibleRows.forEach((r: any, i: number) => { if (r.type === "task") rowIndexMap.set(r.id, i); });

  // Active baseline task map
  const baselineTaskMap = new Map<number, { startDate: string | null; dueDate: string | null }>();
  if (activeBaselineId) {
    const bl = baselines.find(b => b.id === activeBaselineId);
    if (bl) bl.taskSnapshot.forEach(t => baselineTaskMap.set(t.id, t));
  }

  function barProps(startDate: string | null, dueDate: string | null) {
    const s = startDate ?? projectStart;
    const e = dueDate ?? projectEnd;
    const offsetDays = clamp(daysBetween(projectStart, s), 0, totalDays);
    const spanDays = clamp(daysBetween(s, e) + 1, 1, totalDays - offsetDays);
    return { left: (offsetDays / totalDays) * totalPx, width: Math.max((spanDays / totalDays) * totalPx, 4) };
  }

  // SVG arrows for dependencies
  const arrows: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
  for (const dep of (dependencies as any[])) {
    const predIdx = rowIndexMap.get(dep.predecessorId);
    const succIdx = rowIndexMap.get(dep.successorId);
    if (predIdx === undefined || succIdx === undefined) continue;
    const predRow = visibleRows[predIdx];
    const succRow = visibleRows[succIdx];
    const predBar = barProps(predRow.startDate, predRow.dueDate);
    const succBar = barProps(succRow.startDate, succRow.dueDate);
    const x1 = predBar.left + predBar.width;
    const y1 = predIdx * ROW_H + ROW_H / 2;
    const x2 = succBar.left;
    const y2 = succIdx * ROW_H + ROW_H / 2;
    arrows.push({ x1, y1, x2, y2, key: `dep-${dep.id}` });
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-slate-50 flex-wrap">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 border rounded-md overflow-hidden">
            {(["quarter", "month", "week", "day"] as Zoom[]).map(z => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${zoom === z ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}
              >
                {ZOOM_LABELS[z]}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* Baseline controls */}
          <Button
            variant={showBaselines ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowBaselines(v => !v)}
          >
            <Layers className="h-3 w-3" />
            Baselines {baselines.length > 0 && `(${baselines.length})`}
          </Button>

          {showBaselines && (
            <>
              <Select
                value={activeBaselineId?.toString() ?? "none"}
                onValueChange={v => setActiveBaselineId(v === "none" ? null : parseInt(v, 10))}
              >
                <SelectTrigger className="h-7 text-xs w-40">
                  <SelectValue placeholder="Show baseline…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No overlay</SelectItem>
                  {baselines.map(b => (
                    <SelectItem key={b.id} value={b.id.toString()}>
                      {b.name} ({b.snapshotDate})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setShowSaveBaselineDialog(true)}
              >
                <BookmarkPlus className="h-3 w-3" />
                Save Baseline
              </Button>
              {activeBaselineId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-red-500 hover:text-red-600"
                  onClick={() => { deleteBaselineMut.mutate(activeBaselineId); setActiveBaselineId(null); }}
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </Button>
              )}
            </>
          )}

          <div className="flex-1" />

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowShiftDatesDialog(true)}
          >
            <ArrowRightLeft className="h-3 w-3" />
            Shift Dates
          </Button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 px-4 py-1.5 text-xs text-slate-500 border-b bg-white flex-wrap">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-emerald-500 inline-block" /> Completed</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-blue-500 inline-block" /> In Progress</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-slate-300 inline-block" /> Not Started</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-red-500 inline-block" /> Blocked</span>
          <span className="flex items-center gap-1"><Flag className="h-3 w-3 text-orange-400" /> Milestone</span>
          {activeBaselineId && (
            <span className="flex items-center gap-1 ml-2 text-slate-400">
              <span className="h-3 w-6 rounded-sm bg-slate-300/60 border border-slate-400 inline-block" /> Baseline
            </span>
          )}
        </div>

        {/* Main grid */}
        <div className="overflow-x-auto flex-1">
          <div style={{ minWidth: 700 }}>
            <div className="flex sticky top-0 z-20 bg-slate-50 border-b shadow-sm">
              {/* Name column header */}
              <div className="shrink-0 w-56 px-3 py-2 text-xs font-medium text-slate-500 border-r">Task / Phase</div>
              {/* Gantt header */}
              <div className="relative" style={{ width: totalPx }}>
                <div className="flex h-full">
                  {headerUnits.map((u, i) => (
                    <div
                      key={i}
                      className="text-xs text-center text-slate-500 font-medium border-r border-slate-200 py-2 shrink-0 overflow-hidden"
                      style={{ width: u.days * cellPx }}
                    >
                      {u.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Rows + SVG overlay */}
            <div className="relative" ref={barContainerRef}>
              {/* Grid lines */}
              <div className="absolute inset-0 pointer-events-none flex" style={{ left: 224 }}>
                {headerUnits.map((u, i) => (
                  <div key={i} className="shrink-0 border-r border-slate-100" style={{ width: u.days * cellPx }} />
                ))}
              </div>

              {/* Today line */}
              {todayOffset >= 0 && todayOffset <= totalDays && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-400/60 z-10 pointer-events-none"
                  style={{ left: 224 + todayPx }}
                />
              )}

              {/* Dependency SVG arrows */}
              <svg
                className="absolute pointer-events-none z-10"
                style={{ left: 224, top: 0, width: totalPx, height: visibleRows.length * ROW_H }}
              >
                <defs>
                  <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill="#6366f1" />
                  </marker>
                </defs>
                {arrows.map(a => {
                  const midX = (a.x1 + a.x2) / 2;
                  return (
                    <path
                      key={a.key}
                      d={`M${a.x1},${a.y1} C${midX},${a.y1} ${midX},${a.y2} ${a.x2},${a.y2}`}
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="1.5"
                      strokeOpacity="0.7"
                      markerEnd="url(#arrow)"
                    />
                  );
                })}
              </svg>

              {/* Rows */}
              {visibleRows.map((row: any, idx: number) => {
                const isPhase = row.type === "phase";
                const isCollapsed = isPhase && collapsedPhases.has(row.id);
                const indent = !isPhase && row.parentId ? "pl-7" : "pl-3";
                const { left, width } = barProps(row.startDate, row.dueDate);
                const barColor = row.isMilestone ? "bg-orange-400" : STATUS_COLORS[row.status] ?? "bg-slate-300";

                // Baseline bar for this task
                const bl = row.type === "task" ? baselineTaskMap.get(row.id) : undefined;
                const blProps = bl ? barProps(bl.startDate, bl.dueDate) : null;

                return (
                  <div
                    key={`${row.type}-${row.id}`}
                    className={`flex items-center border-b transition-colors hover:bg-slate-50/80 ${isPhase ? "bg-indigo-50/40" : ""}`}
                    style={{ height: ROW_H }}
                  >
                    {/* Name column */}
                    <div
                      className={`shrink-0 w-56 ${indent} pr-2 border-r flex items-center gap-1 overflow-hidden`}
                      style={{ height: ROW_H }}
                    >
                      {isPhase && (
                        <button onClick={() => togglePhase(row.id)} className="shrink-0 text-slate-400 hover:text-slate-600">
                          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      )}
                      {row.isMilestone && <Flag className="h-3 w-3 text-orange-400 shrink-0" />}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`text-xs truncate ${isPhase ? "font-semibold text-indigo-800" : "text-slate-700"}`}>
                            {row.name}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs max-w-[220px]">
                          <div className="font-medium">{row.name}</div>
                          <div className="text-slate-400">{row.startDate ?? "?"} → {row.dueDate ?? "?"}</div>
                          {row.status && <div>{row.status} · {row.completion}%</div>}
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Bar area */}
                    <div className="relative flex items-center" style={{ width: totalPx, height: ROW_H }}>
                      {/* Baseline bar (grey, behind) */}
                      {blProps && (
                        <div
                          className="absolute rounded bg-slate-300/50 border border-slate-400/40"
                          style={{ left: blProps.left, width: blProps.width, height: isPhase ? 14 : 10, top: "50%", transform: "translateY(-50%) translateY(8px)" }}
                        />
                      )}

                      {/* Live bar */}
                      {row.isMilestone ? (
                        <div
                          className="absolute flex items-center justify-center"
                          style={{ left: left, top: "50%", transform: "translateY(-50%)" }}
                        >
                          <div className="h-4 w-4 bg-orange-400 rotate-45 rounded-sm shadow-sm" />
                        </div>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`absolute rounded ${isPhase ? "h-5" : "h-4"} ${barColor} cursor-pointer`}
                              style={{ left, width: Math.max(width, 4), top: "50%", transform: "translateY(-50%)" }}
                            >
                              {row.completion > 0 && (
                                <div className="absolute inset-y-0 left-0 bg-black/15 rounded-l" style={{ width: `${row.completion}%` }} />
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <div className="font-medium">{row.name}</div>
                            <div className="text-slate-400">{row.startDate ?? "?"} → {row.dueDate ?? "?"}</div>
                            <div>{row.status} · {row.completion}%</div>
                            {blProps && <div className="text-slate-500 mt-1">Baseline: {bl?.startDate ?? "?"} → {bl?.dueDate ?? "?"}</div>}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Save Baseline Dialog */}
        <Dialog open={showSaveBaselineDialog} onOpenChange={setShowSaveBaselineDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Save Baseline</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs">Baseline name</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g. Sprint 1 baseline"
                  value={baselineName}
                  onChange={e => setBaselineName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setShowSaveBaselineDialog(false)}>Cancel</Button>
              <Button
                size="sm"
                disabled={!baselineName.trim() || saveBaselineMut.isPending}
                onClick={() => saveBaselineMut.mutate(baselineName.trim())}
              >
                {saveBaselineMut.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Shift Dates Dialog */}
        <Dialog open={showShiftDatesDialog} onOpenChange={setShowShiftDatesDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Shift All Dates</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs">Days to shift (positive = forward, negative = back)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  placeholder="e.g. 7 or -3"
                  value={shiftDays}
                  onChange={e => setShiftDays(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="save-before"
                  checked={saveBeforeShift}
                  onCheckedChange={v => setSaveBeforeShift(!!v)}
                />
                <Label htmlFor="save-before" className="text-xs font-normal cursor-pointer">
                  Save baseline before shifting (recommended)
                </Label>
              </div>
              {saveBeforeShift && (
                <p className="text-xs text-slate-500">
                  A baseline named "Pre-shift {new Date().toLocaleDateString()}" will be created first.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setShowShiftDatesDialog(false)}>Cancel</Button>
              <Button
                size="sm"
                disabled={shiftDatesMut.isPending || saveBaselineMut.isPending}
                onClick={handleShift}
              >
                {shiftDatesMut.isPending ? "Shifting…" : "Shift Dates"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
