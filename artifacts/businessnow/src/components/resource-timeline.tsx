import { useState, useRef, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListAllocations, useListProjects, useListUsers, useGetCapacityOverview,
  useUpdateAllocation, useCreateAllocation, useDeleteAllocation,
  getListAllocationsQueryKey, useListSkills,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, ChevronDown, Search, X, Scissors } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type Zoom = "quarter" | "month" | "week" | "day";
type DragType = "move" | "resize-end" | "resize-start";

interface DragState {
  allocId: number;
  type: DragType;
  startX: number;
  origStart: string;
  origEnd: string;
  previewStart: string;
  previewEnd: string;
}

interface AvailFilter {
  startDate: string;
  endDate: string;
  minHoursPerDay: string;
  role: string;
  requiredSkillIds: number[];
  minProficiency: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ZOOM_LABELS: Record<Zoom, string> = { quarter: "Quarter", month: "Month", week: "Week", day: "Day" };
const ZOOM_CELL_PX: Record<Zoom, number> = { quarter: 120, month: 80, week: 40, day: 20 };
const ROW_H = 44;
const LABEL_W = 248;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysBetween(a: string, b: string) {
  return Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}
function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function buildHeaderUnits(zoom: Zoom, rangeStart: string, rangeEnd: string) {
  const units: { label: string; days: number; startOffset: number }[] = [];
  const startD = new Date(rangeStart);
  const endD = new Date(rangeEnd);

  if (zoom === "quarter") {
    const cur = new Date(startD.getFullYear(), Math.floor(startD.getMonth() / 3) * 3, 1);
    while (cur <= endD) {
      const qEnd = new Date(cur.getFullYear(), cur.getMonth() + 3, 0);
      const visStart = cur < startD ? new Date(startD) : new Date(cur);
      const visEnd = qEnd > endD ? new Date(endD) : qEnd;
      const days = Math.ceil((visEnd.getTime() - visStart.getTime()) / 86400000) + 1;
      const off = Math.max(0, Math.ceil((visStart.getTime() - startD.getTime()) / 86400000));
      units.push({ label: `Q${Math.floor(cur.getMonth() / 3) + 1} ${cur.getFullYear()}`, days, startOffset: off });
      cur.setMonth(cur.getMonth() + 3);
    }
  } else if (zoom === "month") {
    const cur = new Date(startD.getFullYear(), startD.getMonth(), 1);
    while (cur <= endD) {
      const mEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
      const visStart = cur < startD ? new Date(startD) : new Date(cur);
      const visEnd = mEnd > endD ? new Date(endD) : mEnd;
      const days = Math.ceil((visEnd.getTime() - visStart.getTime()) / 86400000) + 1;
      const off = Math.max(0, Math.ceil((visStart.getTime() - startD.getTime()) / 86400000));
      units.push({ label: cur.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), days, startOffset: off });
      cur.setMonth(cur.getMonth() + 1);
    }
  } else if (zoom === "week") {
    const cur = new Date(startD);
    cur.setDate(cur.getDate() - cur.getDay());
    while (cur <= endD) {
      const wEnd = new Date(cur); wEnd.setDate(wEnd.getDate() + 6);
      const visStart = cur < startD ? new Date(startD) : new Date(cur);
      const visEnd = wEnd > endD ? new Date(endD) : wEnd;
      const days = Math.ceil((visEnd.getTime() - visStart.getTime()) / 86400000) + 1;
      const off = Math.max(0, Math.ceil((visStart.getTime() - startD.getTime()) / 86400000));
      units.push({ label: visStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }), days, startOffset: off });
      cur.setDate(cur.getDate() + 7);
    }
  } else {
    const cur = new Date(startD);
    while (cur <= endD) {
      const off = Math.ceil((cur.getTime() - startD.getTime()) / 86400000);
      units.push({ label: cur.getDate().toString(), days: 1, startOffset: off });
      cur.setDate(cur.getDate() + 1);
    }
  }
  return units;
}

// ─── Bar color + soft style ───────────────────────────────────────────────────
function barColorClass(pct: number | null) {
  if (pct === null) return "bg-slate-400";
  if (pct > 100) return "bg-red-500";
  if (pct > 80) return "bg-amber-400";
  return "bg-emerald-400";
}

const softStyle: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(255,255,255,0.35), rgba(255,255,255,0.35) 4px, transparent 4px, transparent 8px)",
};

// ─── Main component ───────────────────────────────────────────────────────────
interface Props {
  mode: "projects" | "people";
}

export default function ResourceTimeline({ mode }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [zoom, setZoom] = useState<Zoom>("month");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<DragState | null>(null);
  const [editAlloc, setEditAlloc] = useState<any | null>(null);
  const [showAvail, setShowAvail] = useState(false);
  const [availFilter, setAvailFilter] = useState<AvailFilter>({ startDate: "", endDate: "", minHoursPerDay: "", role: "", requiredSkillIds: [], minProficiency: "Intermediate" });
  const [allUserSkillsForFilter, setAllUserSkillsForFilter] = useState<any[]>([]);
  const { data: allSkillsList } = useListSkills();

  // Fetch all user-skills once for filtering
  useEffect(() => {
    fetch("/api/user-skills").then(r => r.json()).then(setAllUserSkillsForFilter).catch(() => {});
  }, []);
  const [focusedUserIds, setFocusedUserIds] = useState<Set<number> | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: rawAllocs, isLoading: loadingAllocs } = useListAllocations();
  const { data: projects, isLoading: loadingProjects } = useListProjects();
  const { data: users, isLoading: loadingUsers } = useListUsers();
  const { data: capacityData } = useGetCapacityOverview();

  const updateAlloc = useUpdateAllocation({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListAllocationsQueryKey() }),
      onError: () => toast({ title: "Failed to update allocation", variant: "destructive" }),
    },
  });

  const createAlloc = useCreateAllocation({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListAllocationsQueryKey() }),
      onError: () => toast({ title: "Failed to create allocation", variant: "destructive" }),
    },
  });

  const deleteAlloc = useDeleteAllocation({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListAllocationsQueryKey() }),
    },
  });

  const isLoading = loadingAllocs || loadingProjects || loadingUsers;
  const allocs = (rawAllocs as any[]) ?? [];
  const projectList = (projects as any[]) ?? [];
  const userList = (users as any[]) ?? [];

  // Lookup helpers
  const projectById = (id: number) => projectList.find(p => p.id === id);
  const userById = (id: number) => userList.find(u => u.id === id);
  const userCapacity = (userId: number): number => {
    const cap = (capacityData as any[])?.find((c: any) => c.userId === userId);
    if (cap) return cap.weeklyCapacity ?? cap.capacity ?? 40;
    return userById(userId)?.capacity ?? 40;
  };

  function allocPct(a: any): number | null {
    if (a.percentOfCapacity !== null && a.percentOfCapacity !== undefined) return Number(a.percentOfCapacity);
    if (a.userId && a.hoursPerWeek) {
      const cap = userCapacity(a.userId);
      return cap > 0 ? Math.round((Number(a.hoursPerWeek) / cap) * 100) : null;
    }
    return null;
  }

  // ─── Timeline date range ─────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  let rangeStart = today;
  let rangeEnd = addDays(today, 90);
  if (allocs.length > 0) {
    const starts = allocs.map((a: any) => a.startDate).filter(Boolean).sort();
    const ends = allocs.map((a: any) => a.endDate).filter(Boolean).sort();
    rangeStart = addDays(starts[0], -7);
    rangeEnd = addDays(ends[ends.length - 1], 7);
    if (daysBetween(rangeStart, rangeEnd) < 30) rangeEnd = addDays(rangeStart, 30);
  }
  const totalDays = Math.max(daysBetween(rangeStart, rangeEnd) + 1, 1);
  const cellPx = ZOOM_CELL_PX[zoom];
  const totalPx = totalDays * cellPx;

  const headerUnits = buildHeaderUnits(zoom, rangeStart, rangeEnd);
  const todayOffset = clamp(daysBetween(rangeStart, today), 0, totalDays);
  const todayPx = (todayOffset / totalDays) * totalPx;

  function barGeometry(startDate: string, endDate: string) {
    const offDays = clamp(daysBetween(rangeStart, startDate), 0, totalDays);
    const spanDays = clamp(daysBetween(startDate, endDate) + 1, 1, totalDays - offDays);
    return {
      left: Math.round((offDays / totalDays) * totalPx),
      width: Math.max(Math.round((spanDays / totalDays) * totalPx), 6),
    };
  }

  function previewGeometry(a: any) {
    if (drag && drag.allocId === a.id) {
      return barGeometry(drag.previewStart, drag.previewEnd);
    }
    return barGeometry(a.startDate, a.endDate);
  }

  // ─── Drag handling ───────────────────────────────────────────────────────
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dDays = Math.round(dx / cellPx);
    let ns = drag.origStart;
    let ne = drag.origEnd;
    if (drag.type === "move") {
      ns = addDays(drag.origStart, dDays);
      ne = addDays(drag.origEnd, dDays);
    } else if (drag.type === "resize-end") {
      ne = addDays(drag.origEnd, dDays);
      if (ne <= ns) ne = addDays(ns, 1);
    } else if (drag.type === "resize-start") {
      ns = addDays(drag.origStart, dDays);
      if (ns >= ne) ns = addDays(ne, -1);
    }
    setDrag(d => d ? { ...d, previewStart: ns, previewEnd: ne } : null);
  }, [drag, cellPx]);

  const onMouseUp = useCallback(() => {
    if (!drag) return;
    const changed = drag.previewStart !== drag.origStart || drag.previewEnd !== drag.origEnd;
    if (changed) {
      updateAlloc.mutate({
        id: drag.allocId,
        data: { startDate: drag.previewStart, endDate: drag.previewEnd } as any,
      });
    }
    setDrag(null);
  }, [drag, updateAlloc]);

  useEffect(() => {
    if (!drag) return;
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [drag, onMouseMove, onMouseUp]);

  function startDrag(e: React.MouseEvent, a: any, type: DragType) {
    e.preventDefault();
    e.stopPropagation();
    setDrag({
      allocId: a.id,
      type,
      startX: e.clientX,
      origStart: a.startDate,
      origEnd: a.endDate,
      previewStart: a.startDate,
      previewEnd: a.endDate,
    });
  }

  // ─── Split allocation ─────────────────────────────────────────────────────
  async function splitAllocation(a: any) {
    const days = daysBetween(a.startDate, a.endDate);
    if (days < 2) { toast({ title: "Allocation too short to split" }); return; }
    const mid = addDays(a.startDate, Math.floor(days / 2));
    const midNext = addDays(mid, 1);
    try {
      await deleteAlloc.mutateAsync({ id: a.id });
      await createAlloc.mutateAsync({
        data: {
          projectId: a.projectId, userId: a.userId, placeholderId: a.placeholderId,
          startDate: a.startDate, endDate: mid,
          hoursPerWeek: Number(a.hoursPerWeek), allocationMethod: a.allocationMethod ?? "hours_per_week",
          role: a.role ?? "Team Member", isSoftAllocation: a.isSoftAllocation,
        } as any,
      });
      await createAlloc.mutateAsync({
        data: {
          projectId: a.projectId, userId: a.userId, placeholderId: a.placeholderId,
          startDate: midNext, endDate: a.endDate,
          hoursPerWeek: Number(a.hoursPerWeek), allocationMethod: a.allocationMethod ?? "hours_per_week",
          role: a.role ?? "Team Member", isSoftAllocation: a.isSoftAllocation,
        } as any,
      });
      toast({ title: "Allocation split into two segments" });
    } catch {
      toast({ title: "Split failed", variant: "destructive" });
    }
  }

  // ─── Row building ─────────────────────────────────────────────────────────
  interface DisplayRow {
    key: string;
    type: "parent" | "child";
    label: string;
    sublabel?: string;
    parentKey?: string;
    allocs: any[];
    isOverAllocated?: boolean;
    dimmed?: boolean;
  }

  const displayRows: DisplayRow[] = [];

  if (mode === "projects") {
    // Group allocs by project
    const byProject = new Map<number, any[]>();
    for (const a of allocs) {
      if (!byProject.has(a.projectId)) byProject.set(a.projectId, []);
      byProject.get(a.projectId)!.push(a);
    }
    const sortedProjects = [...byProject.keys()].sort((a, b) => {
      const pa = projectById(a), pb = projectById(b);
      return (pa?.name ?? "").localeCompare(pb?.name ?? "");
    });
    for (const pid of sortedProjects) {
      const proj = projectById(pid);
      const projAllocs = byProject.get(pid)!;
      const pKey = `proj-${pid}`;
      displayRows.push({ key: pKey, type: "parent", label: proj?.name ?? `Project ${pid}`, sublabel: `${projAllocs.length} allocation${projAllocs.length !== 1 ? "s" : ""}`, allocs: projAllocs });
      if (expanded.has(pKey)) {
        // Group by user within project
        const byUser = new Map<string, any[]>();
        for (const a of projAllocs) {
          const uKey = a.userId ? `u-${a.userId}` : `ph-${a.placeholderId ?? a.placeholderRole ?? "?"}`;
          if (!byUser.has(uKey)) byUser.set(uKey, []);
          byUser.get(uKey)!.push(a);
        }
        for (const [uKey, ua] of byUser) {
          const u = ua[0].userId ? userById(ua[0].userId) : null;
          const label = u ? u.name : (ua[0].placeholderRole ?? ua[0].role ?? "Placeholder");
          const cap = ua[0].userId ? userCapacity(ua[0].userId) : 40;
          const totalHpw = ua.reduce((s: number, a: any) => s + Number(a.hoursPerWeek ?? 0), 0);
          displayRows.push({
            key: `${pKey}-${uKey}`,
            type: "child",
            label,
            sublabel: u?.role ?? "",
            parentKey: pKey,
            allocs: ua,
            isOverAllocated: totalHpw > cap,
          });
        }
      }
    }
  } else {
    // People mode: group allocs by user
    const byUser = new Map<number, any[]>();
    const placeholderAllocs: any[] = [];
    for (const a of allocs) {
      if (a.userId) {
        if (!byUser.has(a.userId)) byUser.set(a.userId, []);
        byUser.get(a.userId)!.push(a);
      } else {
        placeholderAllocs.push(a);
      }
    }
    const sortedUsers = [...byUser.keys()].sort((a, b) => {
      const ua = userById(a), ub = userById(b);
      return (ua?.name ?? "").localeCompare(ub?.name ?? "");
    });
    for (const uid of sortedUsers) {
      const u = userById(uid);
      const userAllocs = byUser.get(uid)!;
      const cap = userCapacity(uid);
      const concurrentHpw = userAllocs.reduce((s: number, a: any) => {
        const now = today;
        if (a.startDate <= now && a.endDate >= now) return s + Number(a.hoursPerWeek ?? 0);
        return s;
      }, 0);
      const utilPct = cap > 0 ? Math.round((concurrentHpw / cap) * 100) : 0;
      const uKey = `user-${uid}`;
      const isDimmed = focusedUserIds !== null && !focusedUserIds.has(uid);

      displayRows.push({
        key: uKey,
        type: "parent",
        label: u?.name ?? `User ${uid}`,
        sublabel: `${utilPct}% utilized`,
        allocs: userAllocs,
        isOverAllocated: concurrentHpw > cap,
        dimmed: isDimmed,
      });

      if (expanded.has(uKey)) {
        // Group by project
        const byProj = new Map<number, any[]>();
        for (const a of userAllocs) {
          if (!byProj.has(a.projectId)) byProj.set(a.projectId, []);
          byProj.get(a.projectId)!.push(a);
        }
        for (const [pid, pa] of byProj) {
          const proj = projectById(pid);
          displayRows.push({
            key: `${uKey}-proj-${pid}`,
            type: "child",
            label: proj?.name ?? `Project ${pid}`,
            sublabel: pa.map((a: any) => `${a.hoursPerWeek ?? 0} hpw`).join(", "),
            parentKey: uKey,
            allocs: pa,
            dimmed: isDimmed,
          });
        }
      }
    }
  }

  // ─── Availability search ──────────────────────────────────────────────────
  const PROFICIENCY_RANK: Record<string, number> = { Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 4 };

  function runAvailSearch() {
    if (!availFilter.startDate || !availFilter.endDate) {
      toast({ title: "Enter both start and end date", variant: "destructive" }); return;
    }
    const minHpd = parseFloat(availFilter.minHoursPerDay) || 0;
    const minProfRank = PROFICIENCY_RANK[availFilter.minProficiency] ?? 1;
    const matchedIds = new Set<number>();

    for (const u of userList) {
      if (availFilter.role && u.role !== availFilter.role) continue;

      // Skill filter: user must have ALL required skills with proficiency >= minProficiency
      if (availFilter.requiredSkillIds.length > 0) {
        const userSkillsHere = allUserSkillsForFilter.filter((us: any) => us.userId === u.id);
        const meetsAllSkills = availFilter.requiredSkillIds.every(sid => {
          const us = userSkillsHere.find((x: any) => x.skillId === sid);
          if (!us) return false;
          return (PROFICIENCY_RANK[us.proficiencyLevel] ?? 1) >= minProfRank;
        });
        if (!meetsAllSkills) continue;
      }

      const cap = userCapacity(u.id);
      const concurrent = allocs.filter((a: any) =>
        a.userId === u.id &&
        a.startDate <= availFilter.endDate &&
        a.endDate >= availFilter.startDate
      );
      const totalHpw = concurrent.reduce((s: number, a: any) => s + Number(a.hoursPerWeek ?? 0), 0);
      const freeHpd = Math.max(0, (cap - totalHpw) / 5);
      if (freeHpd >= minHpd) matchedIds.add(u.id);
    }
    setFocusedUserIds(matchedIds);
    toast({ title: `${matchedIds.size} team member${matchedIds.size !== 1 ? "s" : ""} available` });
  }

  // ─── Edit sheet save ──────────────────────────────────────────────────────
  const [editFields, setEditFields] = useState<any>({});
  useEffect(() => {
    if (editAlloc) setEditFields({ startDate: editAlloc.startDate, endDate: editAlloc.endDate, hoursPerWeek: editAlloc.hoursPerWeek, role: editAlloc.role });
  }, [editAlloc]);

  async function saveEdit() {
    if (!editAlloc) return;
    try {
      await updateAlloc.mutateAsync({ id: editAlloc.id, data: { ...editFields } as any });
      toast({ title: "Allocation updated" });
      setEditAlloc(null);
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return <div className="space-y-2 p-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  }

  if (allocs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <p className="text-sm">No allocations found. Create allocations from a project's Team tab.</p>
      </div>
    );
  }

  const uniqueRoles = [...new Set(userList.map((u: any) => u.role).filter(Boolean))].sort();

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full" ref={containerRef} style={{ userSelect: drag ? "none" : undefined }}>
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-slate-50 flex-wrap">
          <div className="flex items-center gap-0 border rounded-md overflow-hidden">
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
          <div className="flex-1" />
          {mode === "people" && (
            <Button
              size="sm"
              variant={showAvail ? "default" : "outline"}
              className="h-7 text-xs gap-1"
              onClick={() => { setShowAvail(v => !v); if (showAvail) { setFocusedUserIds(null); } }}
            >
              <Search className="h-3 w-3" />
              Find Availability
            </Button>
          )}
          {focusedUserIds !== null && (
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-slate-500" onClick={() => { setFocusedUserIds(null); setShowAvail(false); }}>
              <X className="h-3 w-3" /> Clear Focus
            </Button>
          )}
        </div>

        {/* Availability search panel */}
        {showAvail && mode === "people" && (
          <div className="flex flex-wrap items-end gap-3 px-4 py-3 bg-indigo-50 border-b">
            <div>
              <Label className="text-xs mb-1 block">From</Label>
              <Input type="date" className="h-7 text-xs w-36" value={availFilter.startDate} onChange={e => setAvailFilter(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">To</Label>
              <Input type="date" className="h-7 text-xs w-36" value={availFilter.endDate} onChange={e => setAvailFilter(f => ({ ...f, endDate: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Min hrs/day free</Label>
              <Input type="number" placeholder="e.g. 4" className="h-7 text-xs w-28" value={availFilter.minHoursPerDay} onChange={e => setAvailFilter(f => ({ ...f, minHoursPerDay: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Role</Label>
              <Select value={availFilter.role} onValueChange={v => setAvailFilter(f => ({ ...f, role: v === "any" ? "" : v }))}>
                <SelectTrigger className="h-7 text-xs w-40">
                  <SelectValue placeholder="Any role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any role</SelectItem>
                  {uniqueRoles.map((r: string) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Skills filter */}
            <div className="space-y-1">
              <Label className="text-xs block">Required Skills</Label>
              <div className="flex flex-wrap gap-1 max-w-64">
                {(allSkillsList as any[] ?? []).map((s: any) => {
                  const selected = availFilter.requiredSkillIds.includes(s.id);
                  return (
                    <button key={s.id}
                      onClick={() => setAvailFilter(f => ({
                        ...f,
                        requiredSkillIds: selected
                          ? f.requiredSkillIds.filter(id => id !== s.id)
                          : [...f.requiredSkillIds, s.id]
                      }))}
                      className={`px-2 py-0.5 rounded border text-xs transition-colors ${selected ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-300 hover:border-indigo-400"}`}>
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
            {availFilter.requiredSkillIds.length > 0 && (
              <div>
                <Label className="text-xs mb-1 block">Min Proficiency</Label>
                <Select value={availFilter.minProficiency} onValueChange={v => setAvailFilter(f => ({ ...f, minProficiency: v }))}>
                  <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Beginner","Intermediate","Advanced","Expert"].map(l => (
                      <SelectItem key={l} value={l}>{l}+</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button size="sm" className="h-7 text-xs" onClick={runAvailSearch}>Search</Button>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 px-4 py-1.5 text-xs text-slate-500 border-b bg-white flex-wrap">
          <span className="flex items-center gap-1"><span className="h-3 w-8 rounded-sm bg-emerald-400 inline-block" /> ≤80%</span>
          <span className="flex items-center gap-1"><span className="h-3 w-8 rounded-sm bg-amber-400 inline-block" /> 81–100%</span>
          <span className="flex items-center gap-1"><span className="h-3 w-8 rounded-sm bg-red-500 inline-block" /> Over 100%</span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-8 rounded-sm bg-emerald-400 inline-block" style={softStyle} />
            Soft allocation
          </span>
          <span className="flex items-center gap-1"><span className="h-3 w-px bg-red-500 inline-block" /><span className="text-red-500 font-medium ml-0.5">Red line</span> = over-allocation threshold</span>
        </div>

        {/* Gantt grid */}
        <div className="overflow-x-auto flex-1 overflow-y-auto" ref={scrollRef}>
          <div style={{ minWidth: LABEL_W + totalPx + 40 }}>
            {/* Header */}
            <div className="flex sticky top-0 z-20 bg-slate-50 border-b shadow-sm">
              <div className="shrink-0 border-r px-3 py-2 text-xs font-medium text-slate-500" style={{ width: LABEL_W }}>
                {mode === "projects" ? "Project / Member" : "Team Member / Project"}
              </div>
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

            {/* Rows */}
            {displayRows.map((row) => {
              const isExpanded = expanded.has(row.key);
              const isParent = row.type === "parent";

              return (
                <div
                  key={row.key}
                  className={`flex border-b transition-opacity ${row.dimmed ? "opacity-30" : ""} ${isParent ? "bg-slate-50 hover:bg-slate-100" : "bg-white hover:bg-slate-50/60"}`}
                  style={{ height: ROW_H }}
                >
                  {/* Label column */}
                  <div
                    className={`shrink-0 border-r flex items-center gap-1 px-2 cursor-pointer select-none`}
                    style={{ width: LABEL_W, paddingLeft: isParent ? 8 : 24 }}
                    onClick={() => {
                      if (!isParent) return;
                      setExpanded(prev => {
                        const next = new Set(prev);
                        if (next.has(row.key)) next.delete(row.key);
                        else next.add(row.key);
                        return next;
                      });
                    }}
                  >
                    {isParent && (
                      isExpanded
                        ? <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        : <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-xs font-medium ${row.isOverAllocated ? "text-red-600" : "text-slate-800"}`}>
                        {row.label}
                        {row.isOverAllocated && <span className="ml-1 text-red-400">●</span>}
                      </div>
                      {row.sublabel && <div className="truncate text-xs text-muted-foreground">{row.sublabel}</div>}
                    </div>
                  </div>

                  {/* Timeline column */}
                  <div className="relative flex-1 overflow-hidden" style={{ width: totalPx }}>
                    {/* Grid lines */}
                    {headerUnits.map((u, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 border-r border-slate-100"
                        style={{ left: u.startOffset * cellPx, width: u.days * cellPx }}
                      />
                    ))}

                    {/* Today marker */}
                    <div
                      className="absolute top-0 bottom-0 w-px bg-indigo-300/70 z-10 pointer-events-none"
                      style={{ left: todayPx }}
                    />

                    {/* Over-allocation threshold line (people mode parent rows) */}
                    {mode === "people" && isParent && row.isOverAllocated && (
                      <div className="absolute inset-x-0 pointer-events-none z-10" style={{ top: ROW_H * 0.85, height: 2, background: "rgba(239,68,68,0.7)" }} />
                    )}

                    {/* Summary bar for parent rows */}
                    {isParent && row.allocs.length > 0 && (() => {
                      const minStart = row.allocs.map((a: any) => a.startDate).sort()[0];
                      const maxEnd = row.allocs.map((a: any) => a.endDate).sort().slice(-1)[0];
                      const { left, width } = barGeometry(minStart, maxEnd);
                      return (
                        <div
                          className="absolute top-1/2 -translate-y-1/2 rounded-full bg-slate-300/60 border border-slate-300"
                          style={{ left, width, height: 6 }}
                        />
                      );
                    })()}

                    {/* Allocation bars (child rows only) */}
                    {!isParent && row.allocs.map((a: any) => {
                      const pct = allocPct(a);
                      const { left, width } = previewGeometry(a);
                      const isDragging = drag?.allocId === a.id;
                      return (
                        <Tooltip key={a.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={`absolute top-1/2 -translate-y-1/2 rounded cursor-grab active:cursor-grabbing group z-10 ${barColorClass(pct)} ${isDragging ? "ring-2 ring-indigo-400" : ""}`}
                              style={{
                                left,
                                width,
                                height: 22,
                                ...(a.isSoftAllocation ? softStyle : {}),
                              }}
                              onMouseDown={e => startDrag(e, a, "move")}
                              onClick={e => { e.stopPropagation(); setEditAlloc(a); }}
                            >
                              {/* Left resize handle */}
                              <div
                                className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 rounded-l"
                                onMouseDown={e => startDrag(e, a, "resize-start")}
                              />
                              {/* Bar label */}
                              <div className="absolute inset-0 flex items-center px-1.5 overflow-hidden pointer-events-none">
                                <span className="text-[10px] font-medium text-white truncate drop-shadow">
                                  {a.hoursPerWeek ? `${a.hoursPerWeek}hpw` : ""}
                                  {pct !== null ? ` (${pct}%)` : ""}
                                </span>
                              </div>
                              {/* Right resize handle */}
                              <div
                                className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 rounded-r"
                                onMouseDown={e => startDrag(e, a, "resize-end")}
                              />
                              {/* Split button */}
                              <button
                                title="Split allocation"
                                className="absolute -top-5 right-0 hidden group-hover:flex items-center justify-center h-4 w-4 bg-white border rounded shadow-sm text-slate-500 hover:text-indigo-600 z-20"
                                onClick={e => { e.stopPropagation(); splitAllocation(a); }}
                              >
                                <Scissors className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-0.5 text-xs">
                              <div className="font-medium">{a.role ?? "Allocation"}</div>
                              <div>{fmt(a.startDate)} → {fmt(a.endDate)}</div>
                              <div>{a.hoursPerWeek ?? 0} hrs/wk · {a.hoursPerDay ?? 0} hrs/day · {a.totalHours ?? 0} total hrs</div>
                              {pct !== null && <div>{pct}% of capacity</div>}
                              {a.isSoftAllocation && <Badge variant="outline" className="text-amber-600 border-amber-300">Soft</Badge>}
                              <div className="text-slate-400 mt-1">Drag to shift · drag edges to resize · click to edit</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Edit sheet */}
        <Sheet open={!!editAlloc} onOpenChange={open => { if (!open) setEditAlloc(null); }}>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle>Edit Allocation</SheetTitle>
            </SheetHeader>
            {editAlloc && (
              <div className="mt-4 space-y-4">
                <div>
                  <Label className="text-xs">Project</Label>
                  <p className="text-sm font-medium">{projectById(editAlloc.projectId)?.name ?? `Project ${editAlloc.projectId}`}</p>
                </div>
                <div>
                  <Label className="text-xs">Member</Label>
                  <p className="text-sm font-medium">{editAlloc.userId ? (userById(editAlloc.userId)?.name ?? `User ${editAlloc.userId}`) : (editAlloc.placeholderRole ?? "Placeholder")}</p>
                </div>
                <div>
                  <Label className="text-xs">Role</Label>
                  <Input className="h-8 text-sm" value={editFields.role ?? ""} onChange={e => setEditFields((f: any) => ({ ...f, role: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Start date</Label>
                    <Input type="date" className="h-8 text-sm" value={editFields.startDate ?? ""} onChange={e => setEditFields((f: any) => ({ ...f, startDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">End date</Label>
                    <Input type="date" className="h-8 text-sm" value={editFields.endDate ?? ""} onChange={e => setEditFields((f: any) => ({ ...f, endDate: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Hours per week</Label>
                  <Input type="number" className="h-8 text-sm" value={editFields.hoursPerWeek ?? ""} onChange={e => setEditFields((f: any) => ({ ...f, hoursPerWeek: parseFloat(e.target.value) }))} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="flex-1" onClick={saveEdit} disabled={updateAlloc.isPending}>
                    {updateAlloc.isPending ? "Saving…" : "Save"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditAlloc(null)}>Cancel</Button>
                </div>
                <div className="border-t pt-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full text-xs gap-1 text-slate-500"
                    onClick={() => { splitAllocation(editAlloc); setEditAlloc(null); }}
                  >
                    <Scissors className="h-3 w-3" />
                    Split this allocation at midpoint
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
