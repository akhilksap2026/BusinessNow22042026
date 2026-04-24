import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProjectGantt } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Layers, ArrowRightLeft, BookmarkPlus, Trash2, ChevronDown, ChevronRight, ChevronsDown, ChevronsUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

type Zoom = "quarter" | "month" | "week" | "day";

interface GanttRow {
  id: number;
  type: string;
  name: string;
  startDate: string;
  dueDate: string;
  status: string;
  completion: number;
  parentTaskId: number | null;
  depth: number;
  isMilestone: boolean;
  milestoneType: string | null;
  hasChildren: boolean;
}

interface Dep {
  id: number;
  predecessorId: number;
  successorId: number;
  dependencyType: string;
  lagDays: number;
}

interface Baseline {
  id: number;
  name: string;
  snapshotDate: string;
  taskSnapshot: { id: number; startDate: string | null; dueDate: string | null }[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LEFT_W = 260;
const ROW_H = 36;
const ZOOM_CELL_PX: Record<Zoom, number> = { quarter: 120, month: 80, week: 40, day: 20 };
const ZOOM_LABELS: Record<Zoom, string> = { quarter: "Quarter", month: "Month", week: "Week", day: "Day" };

const STATUS_BAR: Record<string, string> = {
  Completed: "#10b981",
  "In Progress": "#3b82f6",
  "Not Started": "#94a3b8",
  Blocked: "#ef4444",
  Overdue: "#dc2626",
  Review: "#a78bfa",
};

const MILESTONE_FILL: Record<string, string> = {
  Payment: "#10b981",
  Project: "#f97316",
  External: "#3b82f6",
};
const MILESTONE_DEFAULT = "#f97316";

// ── Utilities ─────────────────────────────────────────────────────────────────

function daysBetween(a: string, b: string) {
  return Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProjectGantt({ projectId }: { projectId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  // ── UI state ───────────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState<Zoom>("month");
  const [showMilestones, setShowMilestones] = useState(true);
  const [maxDepth, setMaxDepth] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [showBaselines, setShowBaselines] = useState(false);
  const [activeBaselineId, setActiveBaselineId] = useState<number | null>(null);
  const [showSaveBaseline, setShowSaveBaseline] = useState(false);
  const [showShiftDates, setShowShiftDates] = useState(false);
  const [baselineName, setBaselineName] = useState("");
  const [shiftDays, setShiftDays] = useState("0");
  const [saveBeforeShift, setSaveBeforeShift] = useState(false);

  // ── Dependency interaction state ────────────────────────────────────────────
  const [hoveredRowId, setHoveredRowId] = useState<number | null>(null);
  const [draggingFrom, setDraggingFrom] = useState<{ id: number; x: number; y: number } | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [editingDep, setEditingDep] = useState<{
    id: number; lagDays: number; predName: string; succName: string;
  } | null>(null);
  const [editLag, setEditLag] = useState("0");
  const svgRef = useRef<SVGSVGElement>(null);

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["gantt", projectId],
    queryFn: () => getProjectGantt(projectId),
  });

  const { data: baselines = [] } = useQuery<Baseline[]>({
    queryKey: ["baselines", projectId],
    queryFn: async () => (await fetch(`/api/projects/${projectId}/baselines`, { headers: authHeaders() })).json(),
    enabled: showBaselines,
  });

  // ── Derived data ────────────────────────────────────────────────────────────
  const gantt = data as any;
  const allRows: GanttRow[] = gantt?.rows ?? [];
  const allDeps: Dep[] = gantt?.dependencies ?? [];
  const projectStart: string = gantt?.projectStart ?? new Date().toISOString().slice(0, 10);
  const projectEnd: string = gantt?.projectEnd ?? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  // Auto-expand all parent tasks when data first loads
  useEffect(() => {
    if (!allRows.length) return;
    const parentIds = new Set(allRows.filter(r => r.hasChildren).map(r => r.id));
    setExpandedIds(parentIds);
  }, [gantt]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Row name lookup for dep editing ────────────────────────────────────────
  const rowNameMap = useMemo(() =>
    new Map(allRows.map(r => [r.id, r.name])), [allRows]);

  // ── Visible rows (filter by depth + collapse + milestones) ─────────────────
  const visibleRows = useMemo<GanttRow[]>(() => {
    const parentOk = new Set<number>();
    const result: GanttRow[] = [];
    for (const row of allRows) {
      if (maxDepth !== null && row.depth > maxDepth) continue;
      if (!showMilestones && row.isMilestone) continue;
      const pid = row.parentTaskId ?? null;
      if (pid === null || parentOk.has(pid)) {
        result.push(row);
        if (row.hasChildren && expandedIds.has(row.id)) parentOk.add(row.id);
      }
    }
    return result;
  }, [allRows, maxDepth, expandedIds, showMilestones]);

  // ── Row index map for dependency arrows ────────────────────────────────────
  const rowIndexMap = useMemo(() => {
    const m = new Map<number, number>();
    visibleRows.forEach((r, i) => m.set(r.id, i));
    return m;
  }, [visibleRows]);

  // ── Timeline math ──────────────────────────────────────────────────────────
  const totalDays = Math.max(daysBetween(projectStart, projectEnd) + 1, 1);
  const cellPx = ZOOM_CELL_PX[zoom];
  const totalPx = totalDays * cellPx;
  const startD = new Date(projectStart);
  const endD = new Date(projectEnd);

  // Header units
  const headerUnits: { label: string; days: number }[] = useMemo(() => {
    const units: { label: string; days: number }[] = [];
    if (zoom === "quarter") {
      const cur = new Date(startD.getFullYear(), Math.floor(startD.getMonth() / 3) * 3, 1);
      while (cur <= endD) {
        const qEnd = new Date(cur.getFullYear(), cur.getMonth() + 3, 0);
        const vs = cur < startD ? startD : cur;
        const ve = qEnd > endD ? endD : qEnd;
        units.push({ label: `Q${Math.floor(cur.getMonth() / 3) + 1} ${cur.getFullYear()}`, days: Math.ceil((ve.getTime() - vs.getTime()) / 86400000) + 1 });
        cur.setMonth(cur.getMonth() + 3);
      }
    } else if (zoom === "month") {
      const cur = new Date(startD.getFullYear(), startD.getMonth(), 1);
      while (cur <= endD) {
        const mEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
        const vs = cur < startD ? startD : cur;
        const ve = mEnd > endD ? endD : mEnd;
        units.push({ label: cur.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), days: Math.ceil((ve.getTime() - vs.getTime()) / 86400000) + 1 });
        cur.setMonth(cur.getMonth() + 1);
      }
    } else if (zoom === "week") {
      const cur = new Date(startD); cur.setDate(cur.getDate() - cur.getDay());
      while (cur <= endD) {
        const wEnd = new Date(cur); wEnd.setDate(wEnd.getDate() + 6);
        const vs = cur < startD ? startD : cur;
        const ve = wEnd > endD ? endD : wEnd;
        units.push({ label: vs.toLocaleDateString("en-US", { month: "short", day: "numeric" }), days: Math.ceil((ve.getTime() - vs.getTime()) / 86400000) + 1 });
        cur.setDate(cur.getDate() + 7);
      }
    } else {
      const cur = new Date(startD);
      while (cur <= endD) { units.push({ label: cur.getDate().toString(), days: 1 }); cur.setDate(cur.getDate() + 1); }
    }
    return units;
  }, [zoom, projectStart, projectEnd]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Bar position helper ────────────────────────────────────────────────────
  function barProps(start: string, due: string) {
    const offsetDays = clamp(daysBetween(projectStart, start ?? projectStart), 0, totalDays);
    const spanDays = clamp(daysBetween(start ?? projectStart, due ?? projectEnd) + 1, 1, totalDays - offsetDays);
    return {
      left: (offsetDays / totalDays) * totalPx,
      width: Math.max((spanDays / totalDays) * totalPx, 4),
    };
  }

  // ── Baseline map ───────────────────────────────────────────────────────────
  const baselineMap = useMemo(() => {
    const bl = baselines.find(b => b.id === activeBaselineId);
    if (!bl) return new Map<number, { startDate: string | null; dueDate: string | null }>();
    return new Map(bl.taskSnapshot.map(t => [t.id, t]));
  }, [baselines, activeBaselineId]);

  // ── Dependency arrows ──────────────────────────────────────────────────────
  const arrows = useMemo(() => {
    return allDeps.flatMap(dep => {
      const pi = rowIndexMap.get(dep.predecessorId);
      const si = rowIndexMap.get(dep.successorId);
      if (pi === undefined || si === undefined) return [];
      const pr = visibleRows[pi]; const sr = visibleRows[si];
      const pb = barProps(pr.startDate, pr.dueDate);
      const sb = barProps(sr.startDate, sr.dueDate);
      return [{ ...dep, x1: pb.left + pb.width, y1: pi * ROW_H + ROW_H / 2, x2: sb.left, y2: si * ROW_H + ROW_H / 2 }];
    });
  }, [allDeps, rowIndexMap, visibleRows, totalPx, totalDays]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drag global listeners ──────────────────────────────────────────────────
  useEffect(() => {
    if (!draggingFrom) return;
    const onMove = (e: MouseEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      setDragPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    const onUp = (e: MouseEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const rowIdx = Math.floor(y / ROW_H);
      const target = visibleRows[rowIdx];
      if (target && target.id !== draggingFrom.id && !target.isMilestone) {
        createDepMut.mutate({ predecessorId: draggingFrom.id, successorId: target.id });
      }
      setDraggingFrom(null); setDragPos(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [draggingFrom, visibleRows]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Expand / collapse helpers ──────────────────────────────────────────────
  function toggleExpand(id: number) {
    setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function expandAll() { setExpandedIds(new Set(allRows.filter(r => r.hasChildren).map(r => r.id))); }
  function collapseAll() { setExpandedIds(new Set()); }

  // ── Mutations ──────────────────────────────────────────────────────────────
  const saveBaselineMut = useMutation({
    mutationFn: async (name: string) => {
      const r = await fetch(`/api/projects/${projectId}/baselines`, { method: "POST", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ name }) });
      if (!r.ok) throw new Error(await r.text()); return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["baselines", projectId] }); toast({ title: "Baseline saved" }); setBaselineName(""); setShowSaveBaseline(false); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteBaselineMut = useMutation({
    mutationFn: async (id: number) => { await fetch(`/api/baselines/${id}`, { method: "DELETE", headers: authHeaders() }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["baselines", projectId] }); setActiveBaselineId(null); },
  });
  const shiftDatesMut = useMutation({
    mutationFn: async (days: number) => {
      const r = await fetch(`/api/projects/${projectId}/shift-dates`, { method: "POST", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ days }) });
      if (!r.ok) throw new Error(await r.text()); return r.json();
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["gantt", projectId] }); qc.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Dates shifted", description: `Shifted ${res.shifted} tasks by ${res.days} days` });
      setShowShiftDates(false); setShiftDays("0"); setSaveBeforeShift(false);
    },
    onError: (e: any) => toast({ title: "Shift failed", description: e.message, variant: "destructive" }),
  });
  const createDepMut = useMutation({
    mutationFn: async ({ predecessorId, successorId }: { predecessorId: number; successorId: number }) => {
      const r = await fetch(`/api/tasks/${successorId}/dependencies`, { method: "POST", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ predecessorId }) });
      if (!r.ok) throw new Error(await r.text()); return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["gantt", projectId] }); toast({ title: "Dependency created" }); },
    onError: (e: any) => toast({ title: "Dependency error", description: e.message, variant: "destructive" }),
  });
  const updateDepMut = useMutation({
    mutationFn: async ({ id, lagDays }: { id: number; lagDays: number }) => {
      const r = await fetch(`/api/task-dependencies/${id}`, { method: "PATCH", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ lagDays }) });
      if (!r.ok) throw new Error(await r.text()); return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["gantt", projectId] }); setEditingDep(null); toast({ title: "Dependency updated" }); },
  });
  const deleteDepMut = useMutation({
    mutationFn: async (id: number) => { await fetch(`/api/task-dependencies/${id}`, { method: "DELETE", headers: authHeaders() }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["gantt", projectId] }); setEditingDep(null); toast({ title: "Dependency removed" }); },
  });

  const handleShift = async () => {
    const d = parseInt(shiftDays, 10);
    if (isNaN(d) || d === 0) { toast({ title: "Enter a non-zero number of days", variant: "destructive" }); return; }
    if (saveBeforeShift) await saveBaselineMut.mutateAsync(`Pre-shift ${new Date().toLocaleDateString()}`);
    shiftDatesMut.mutate(d);
  };

  // ── Today marker ───────────────────────────────────────────────────────────
  const todayOffset = clamp(daysBetween(projectStart, new Date().toISOString().slice(0, 10)), 0, totalDays);
  const todayPx = (todayOffset / totalDays) * totalPx;
  const allParentIds = useMemo(() => allRows.filter(r => r.hasChildren).map(r => r.id), [allRows]);
  const allExpanded = allParentIds.length > 0 && allParentIds.every(id => expandedIds.has(id));

  // ── Loading / empty ────────────────────────────────────────────────────────
  if (isLoading) return <div className="space-y-2 p-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  if (!gantt || allRows.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <p className="text-sm">No tasks with dates found. Add start/due dates to tasks to see the Gantt chart.</p>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="flex flex-col w-full" style={{ height: "calc(100vh - 260px)", minHeight: 400 }}>

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-2 px-3 py-2 border-b bg-slate-50 flex-wrap shrink-0">
          {/* Scale / Zoom */}
          <div className="flex items-center gap-0 border rounded overflow-hidden">
            {(["quarter", "month", "week", "day"] as Zoom[]).map(z => (
              <button key={z} onClick={() => setZoom(z)}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${zoom === z ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}>
                {ZOOM_LABELS[z]}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* Level filter */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 mr-1">Levels:</span>
            {[["All", null], ["L1", 0], ["L1-2", 1], ["L1-3", 2]].map(([label, val]) => (
              <button key={String(label)} onClick={() => setMaxDepth(val as number | null)}
                className={`px-2 py-0.5 text-xs rounded border transition-colors ${maxDepth === val ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* Expand/Collapse all */}
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-slate-600" onClick={allExpanded ? collapseAll : expandAll}>
            {allExpanded ? <ChevronsUp className="h-3 w-3" /> : <ChevronsDown className="h-3 w-3" />}
            {allExpanded ? "Collapse" : "Expand"}
          </Button>

          <div className="h-4 w-px bg-slate-200" />

          {/* Milestones toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <Checkbox checked={showMilestones} onCheckedChange={v => setShowMilestones(!!v)} className="h-3.5 w-3.5" />
            <span className="text-xs text-slate-600">Milestones</span>
          </label>

          <div className="h-4 w-px bg-slate-200" />

          {/* Baselines */}
          <Button variant={showBaselines ? "default" : "outline"} size="sm" className="h-7 text-xs gap-1"
            onClick={() => setShowBaselines(v => !v)}>
            <Layers className="h-3 w-3" />
            Baselines {baselines.length > 0 && `(${baselines.length})`}
          </Button>
          {showBaselines && (
            <>
              <Select value={activeBaselineId?.toString() ?? "none"} onValueChange={v => setActiveBaselineId(v === "none" ? null : +v)}>
                <SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder="Show baseline…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No overlay</SelectItem>
                  {baselines.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name} ({b.snapshotDate})</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowSaveBaseline(true)}>
                <BookmarkPlus className="h-3 w-3" /> Save
              </Button>
              {activeBaselineId && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-red-500" onClick={() => { deleteBaselineMut.mutate(activeBaselineId); setActiveBaselineId(null); }}>
                  <Trash2 className="h-3 w-3" /> Delete
                </Button>
              )}
            </>
          )}

          <div className="flex-1" />

          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowShiftDates(true)}>
            <ArrowRightLeft className="h-3 w-3" /> Shift Dates
          </Button>
        </div>

        {/* ── Legend bar ── */}
        <div className="flex items-center gap-4 px-3 py-1.5 text-[11px] text-slate-500 border-b bg-white flex-wrap shrink-0">
          {/* Status legend */}
          {[["Completed", "#10b981"], ["In Progress", "#3b82f6"], ["Not Started", "#94a3b8"], ["Blocked", "#ef4444"]].map(([s, c]) => (
            <span key={s} className="flex items-center gap-1">
              <span className="h-2.5 w-4 rounded-sm inline-block" style={{ background: c }} />{s}
            </span>
          ))}
          {showMilestones && (
            <>
              <span className="h-3 w-px bg-slate-200 mx-1" />
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 inline-block rotate-45 rounded-[2px]" style={{ background: "#10b981" }} /> Payment
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 inline-block rotate-45 rounded-[2px]" style={{ background: "#f97316" }} /> Internal
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 inline-block rotate-45 rounded-[2px]" style={{ background: "#3b82f6" }} /> External
              </span>
            </>
          )}
          {activeBaselineId && (
            <span className="flex items-center gap-1 ml-1 opacity-70">
              <span className="h-2.5 w-5 rounded-sm bg-slate-300/60 border border-slate-400 inline-block" /> Baseline
            </span>
          )}
          {draggingFrom && (
            <span className="ml-2 text-indigo-500 font-medium animate-pulse">
              Drag to a task to create dependency ↗
            </span>
          )}
        </div>

        {/* ── Main scrollable area ── */}
        <div className="flex-1 overflow-auto min-h-0">
          <div style={{ minWidth: LEFT_W + totalPx }}>

            {/* Sticky header row */}
            <div className="flex sticky top-0 z-30 bg-slate-50 border-b shadow-sm" style={{ height: ROW_H }}>
              {/* Frozen name column header */}
              <div className="sticky left-0 z-30 bg-slate-50 border-r px-3 flex items-center text-[11px] font-semibold text-slate-500 uppercase tracking-wide shrink-0" style={{ width: LEFT_W }}>
                Task
              </div>
              {/* Timeline header */}
              <div className="flex shrink-0" style={{ width: totalPx }}>
                {headerUnits.map((u, i) => (
                  <div key={i} className="text-[11px] text-center text-slate-500 font-medium border-r border-slate-200 flex items-center justify-center shrink-0 overflow-hidden" style={{ width: u.days * cellPx }}>
                    {u.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Rows + overlay */}
            <div className="relative">
              {/* Column grid lines */}
              <div className="absolute inset-0 pointer-events-none flex" style={{ left: LEFT_W }}>
                {headerUnits.map((u, i) => (
                  <div key={i} className="border-r border-slate-100 shrink-0" style={{ width: u.days * cellPx }} />
                ))}
              </div>

              {/* Today line */}
              {todayOffset >= 0 && todayOffset <= totalDays && (
                <div className="absolute top-0 bottom-0 w-px bg-red-400/70 z-20 pointer-events-none"
                  style={{ left: LEFT_W + todayPx }} />
              )}

              {/* Dependency + drag SVG */}
              <svg
                ref={svgRef}
                className="absolute z-20"
                style={{ left: LEFT_W, top: 0, width: totalPx, height: Math.max(visibleRows.length * ROW_H, 1), pointerEvents: "none" }}
              >
                <defs>
                  <marker id="gantt-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill="#6366f1" />
                  </marker>
                  <marker id="gantt-arrow-drag" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill="#6366f1" opacity="0.5" />
                  </marker>
                </defs>

                {/* Dependency arrows */}
                {arrows.map(a => {
                  const midX = (a.x1 + a.x2) / 2;
                  const d = `M${a.x1},${a.y1} C${midX},${a.y1} ${midX},${a.y2} ${a.x2},${a.y2}`;
                  return (
                    <g key={`dep-${a.id}`}>
                      {/* Visible arrow */}
                      <path d={d} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeOpacity="0.75" markerEnd="url(#gantt-arrow)" />
                      {/* Invisible click target */}
                      <path d={d} fill="none" stroke="transparent" strokeWidth="10"
                        style={{ pointerEvents: "stroke", cursor: "pointer" }}
                        onClick={() => {
                          setEditingDep({ id: a.id, lagDays: a.lagDays, predName: rowNameMap.get(a.predecessorId) ?? `Task #${a.predecessorId}`, succName: rowNameMap.get(a.successorId) ?? `Task #${a.successorId}` });
                          setEditLag(String(a.lagDays));
                        }}
                      />
                      {/* Lag label */}
                      {a.lagDays !== 0 && (
                        <text x={(a.x1 + a.x2) / 2} y={(a.y1 + a.y2) / 2 - 4} textAnchor="middle" fontSize="9" fill="#6366f1" opacity="0.8">{a.lagDays > 0 ? `+${a.lagDays}d` : `${a.lagDays}d`}</text>
                      )}
                    </g>
                  );
                })}

                {/* Drag handles (right edge of each task bar) */}
                {visibleRows.map((row, idx) => {
                  if (row.isMilestone) return null;
                  const { left, width } = barProps(row.startDate, row.dueDate);
                  const cx = left + width;
                  const cy = idx * ROW_H + ROW_H / 2;
                  const visible = hoveredRowId === row.id || draggingFrom?.id === row.id;
                  return (
                    <circle key={`handle-${row.id}`}
                      cx={cx} cy={cy} r={5}
                      fill="white" stroke="#6366f1" strokeWidth="1.5"
                      opacity={visible ? 1 : 0}
                      style={{ pointerEvents: "auto", cursor: "crosshair" }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggingFrom({ id: row.id, x: cx, y: cy });
                        setDragPos({ x: cx, y: cy });
                      }}
                    />
                  );
                })}

                {/* Active drag line */}
                {draggingFrom && dragPos && (
                  <line x1={draggingFrom.x} y1={draggingFrom.y} x2={dragPos.x} y2={dragPos.y}
                    stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 3" strokeOpacity="0.6"
                    markerEnd="url(#gantt-arrow-drag)" />
                )}
              </svg>

              {/* Task rows */}
              {visibleRows.map((row, idx) => {
                const { left, width } = barProps(row.startDate, row.dueDate);
                const barColor = STATUS_BAR[row.status] ?? "#94a3b8";
                const mileFill = MILESTONE_FILL[row.milestoneType ?? ""] ?? MILESTONE_DEFAULT;
                const isExpanded = expandedIds.has(row.id);
                const bl = baselineMap.get(row.id);
                const blP = bl ? barProps(bl.startDate ?? row.startDate, bl.dueDate ?? row.dueDate) : null;
                const indent = row.depth * 16 + 8;

                return (
                  <div key={`row-${row.id}`}
                    className="flex border-b hover:bg-slate-50/80 transition-colors"
                    style={{ height: ROW_H }}>

                    {/* ── Left name pane (frozen) ── */}
                    <div
                      className="sticky left-0 z-10 bg-white border-r flex items-center gap-1 overflow-hidden shrink-0"
                      style={{ width: LEFT_W, height: ROW_H, paddingLeft: indent, paddingRight: 8 }}>
                      {row.hasChildren ? (
                        <button onClick={() => toggleExpand(row.id)} className="shrink-0 text-slate-400 hover:text-slate-600">
                          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </button>
                      ) : (
                        <span className="w-3 shrink-0" />
                      )}
                      {row.isMilestone && (
                        <span className="shrink-0 h-2.5 w-2.5 rotate-45 rounded-[2px] inline-block" style={{ background: mileFill }} />
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`text-xs truncate ${row.depth === 0 && row.hasChildren ? "font-semibold text-slate-800" : "text-slate-700"}`}>
                            {row.name}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs max-w-[200px]">
                          <div className="font-medium">{row.name}</div>
                          <div className="text-slate-400 mt-0.5">{row.startDate} → {row.dueDate}</div>
                          <div className="mt-0.5">{row.status} · {row.completion}% complete</div>
                          {row.isMilestone && row.milestoneType && <div className="text-slate-500">{row.milestoneType} milestone</div>}
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* ── Bar area ── */}
                    <div className="relative shrink-0 overflow-hidden"
                      style={{ width: totalPx, height: ROW_H }}
                      onMouseEnter={() => setHoveredRowId(row.id)}
                      onMouseLeave={() => setHoveredRowId(null)}>

                      {/* Baseline bar (grey, below) */}
                      {blP && (
                        <div className="absolute rounded bg-slate-300/40 border border-slate-400/30"
                          style={{ left: blP.left, width: Math.max(blP.width, 4), height: 14, top: "50%", transform: "translateY(-50%) translateY(8px)" }} />
                      )}

                      {/* Milestone diamond */}
                      {row.isMilestone ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="absolute" style={{ left: left - 7, top: "50%", transform: "translateY(-50%)", cursor: "default" }}>
                              <div style={{ width: 14, height: 14, background: mileFill, transform: "rotate(45deg)", borderRadius: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <div className="font-medium">{row.name}</div>
                            <div className="text-slate-400">{row.dueDate}</div>
                            {row.milestoneType && <div className="capitalize">{row.milestoneType} milestone</div>}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        /* Task bar */
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="absolute overflow-hidden"
                              style={{ left, width: Math.max(width, 4), height: row.depth === 0 && row.hasChildren ? 20 : 16, top: "50%", transform: "translateY(-50%)", borderRadius: 4, background: barColor, cursor: "default" }}>
                              {/* Completion fill */}
                              {row.completion > 0 && (
                                <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${row.completion}%`, background: "rgba(0,0,0,0.18)", borderRadius: "4px 0 0 4px" }} />
                              )}
                              {/* % text */}
                              {width >= 36 && row.completion > 0 && (
                                <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "white", letterSpacing: "0.02em" }}>
                                  {row.completion}%
                                </span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <div className="font-medium">{row.name}</div>
                            <div className="text-slate-400">{row.startDate} → {row.dueDate}</div>
                            <div>{row.status} · {row.completion}%</div>
                            {blP && <div className="text-slate-400 mt-0.5">Baseline: {bl?.startDate} → {bl?.dueDate}</div>}
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

        {/* ── Dependency Edit Dialog ── */}
        <Dialog open={!!editingDep} onOpenChange={v => { if (!v) setEditingDep(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Edit Dependency</DialogTitle>
              <DialogDescription className="text-xs">
                <span className="font-medium">{editingDep?.predName}</span>
                {" → "}
                <span className="font-medium">{editingDep?.succName}</span>
                {" (Finish-to-Start)"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-1">
              <Label className="text-sm">Lag / Lead (days)</Label>
              <Input type="number" value={editLag} onChange={e => setEditLag(e.target.value)} placeholder="0" className="h-8" />
              <p className="text-[11px] text-muted-foreground">Positive = lag (add delay after predecessor). Negative = lead (allow overlap).</p>
            </div>
            <DialogFooter className="flex-row justify-between gap-2">
              <Button variant="destructive" size="sm" className="gap-1"
                onClick={() => editingDep && deleteDepMut.mutate(editingDep.id)} disabled={deleteDepMut.isPending}>
                <Trash2 className="h-3.5 w-3.5" /> Remove Link
              </Button>
              <Button size="sm" onClick={() => editingDep && updateDepMut.mutate({ id: editingDep.id, lagDays: parseInt(editLag, 10) || 0 })} disabled={updateDepMut.isPending}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Save Baseline Dialog ── */}
        <Dialog open={showSaveBaseline} onOpenChange={setShowSaveBaseline}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Save Baseline</DialogTitle></DialogHeader>
            <Input placeholder="Baseline name…" value={baselineName} onChange={e => setBaselineName(e.target.value)} />
            <DialogFooter>
              <Button onClick={() => saveBaselineMut.mutate(baselineName)} disabled={!baselineName || saveBaselineMut.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Shift Dates Dialog ── */}
        <Dialog open={showShiftDates} onOpenChange={setShowShiftDates}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Shift All Task Dates</DialogTitle></DialogHeader>
            <div className="space-y-3 py-1">
              <div className="space-y-1">
                <Label>Days to shift (positive = forward, negative = backward)</Label>
                <Input type="number" value={shiftDays} onChange={e => setShiftDays(e.target.value)} placeholder="e.g. 7" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={saveBeforeShift} onCheckedChange={v => setSaveBeforeShift(!!v)} />
                <span className="text-sm">Save baseline before shifting</span>
              </label>
            </div>
            <DialogFooter>
              <Button onClick={handleShift} disabled={shiftDatesMut.isPending}>Shift Dates</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </TooltipProvider>
  );
}
