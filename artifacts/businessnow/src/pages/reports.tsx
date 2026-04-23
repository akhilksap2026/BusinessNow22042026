import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import {
  useGetUtilizationReport,
  useGetRevenueReport,
  useGetProjectHealthReport,
  useGetBudgetVsActualsReport,
  useGetProjectBurnDown,
  useListProjects,
  getGetProjectBurnDownQueryKey,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
  ResponsiveContainer, LineChart, Line, Cell, ReferenceLine,
} from "recharts";
import { Download, AlertTriangle, CheckCircle2, Star, TrendingUp, Clock, Filter, Activity } from "lucide-react";
import { ComposedChart, Area } from "recharts";

function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const header = keys.join(",");
  const body = rows.map(row =>
    keys.map(k => {
      const v = row[k];
      if (v === null || v === undefined) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")
  ).join("\n");
  const blob = new Blob([`${header}\n${body}`], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const HEALTH_COLORS: Record<string, string> = {
  "On Track": "#10b981", "At Risk": "#f59e0b", "Off Track": "#ef4444",
};
const STATUS_COLORS: Record<string, string> = {
  "In Progress": "#7c3aed", "Completed": "#10b981", "Not Started": "#94a3b8", "On Hold": "#f59e0b",
};

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`h-3 w-3 ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
      <span className="text-xs ml-1 text-muted-foreground">{rating}</span>
    </span>
  );
}

function ChartSkeleton() {
  return <Skeleton className="h-full w-full" />;
}

function BudgetVsActualsChart() {
  const { data, isLoading } = useGetBudgetVsActualsReport();

  const chartData = data?.projects.map(p => ({
    name: p.projectName.length > 22 ? p.projectName.substring(0, 22) + "…" : p.projectName,
    budget: p.budget,
    spent: p.spent,
    remaining: p.remaining,
    pct: p.percentUsed,
  })) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget vs Actuals</CardTitle>
        <CardDescription>Budget allocated vs spend to date across all active projects</CardDescription>
      </CardHeader>
      <CardContent className="h-[380px]">
        {isLoading ? <ChartSkeleton /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 40, left: 160, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={155} tick={{ fontSize: 12 }} />
              <RechartsTooltip
                formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name === "budget" ? "Budget" : "Spent"]}
                cursor={{ fill: "#f1f5f9" }}
              />
              <Legend />
              <Bar dataKey="budget" name="Budget" fill="#c4b5fd" radius={[0, 4, 4, 0]} />
              <Bar dataKey="spent" name="Spent" fill="#7c3aed" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.pct > 90 ? "#ef4444" : entry.pct > 75 ? "#f59e0b" : "#7c3aed"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function BudgetSummaryCards() {
  const { data, isLoading } = useGetBudgetVsActualsReport();
  if (isLoading) return <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>;
  if (!data) return null;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Budget</CardTitle></CardHeader>
        <CardContent><div className="text-2xl font-bold">${data.totals.totalBudget.toLocaleString()}</div></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle></CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${data.totals.totalSpent.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">{Math.round(data.totals.totalSpent / data.totals.totalBudget * 100)}% of budget</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Remaining</CardTitle></CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">${data.totals.totalRemaining.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">Avg {Math.round(data.totals.averagePercentUsed)}% utilized</p>
        </CardContent>
      </Card>
    </div>
  );
}

function BurnDownChart() {
  const { data: projects } = useListProjects();
  const activeProjects = projects?.filter(p => p.status !== "Completed") ?? [];
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const firstActive = activeProjects[0]?.id ?? null;
  const projectId = selectedProjectId ?? firstActive;

  const { data: burnDown, isLoading } = useGetProjectBurnDown(projectId ?? 0, {
    query: { enabled: !!projectId, queryKey: getGetProjectBurnDownQueryKey(projectId ?? 0) }
  });

  const chartData = burnDown?.dataPoints.map(dp => ({
    date: dp.date,
    actual: dp.remaining,
    ideal: Math.round(dp.ideal * 10) / 10,
  })) ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Burn-Down Chart</CardTitle>
          <CardDescription>Task completion trajectory vs ideal burn-down</CardDescription>
        </div>
        <Select
          value={projectId?.toString() ?? ""}
          onValueChange={v => setSelectedProjectId(parseInt(v))}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {activeProjects.map(p => (
              <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="h-[380px]">
        {isLoading || !projectId ? <ChartSkeleton /> : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tickFormatter={v => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                interval={Math.floor(chartData.length / 6)}
                tick={{ fontSize: 11 }}
              />
              <YAxis axisLine={false} tickLine={false} tickFormatter={v => `${v} tasks`} />
              <RechartsTooltip
                formatter={(value: number, name: string) => [value, name === "actual" ? "Actual Remaining" : "Ideal"]}
                labelFormatter={label => new Date(label).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
              />
              <Legend />
              <Line type="monotone" dataKey="ideal" name="Ideal" stroke="#a1a1aa" strokeWidth={2} strokeDasharray="6 3" dot={false} />
              <Line type="monotone" dataKey="actual" name="Actual" stroke="#7c3aed" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
      {burnDown && (
        <div className="px-6 pb-4 flex gap-6 text-sm text-muted-foreground">
          <span>Total tasks: <strong className="text-foreground">{burnDown.totalTasks}</strong></span>
          <span>Completed: <strong className="text-green-600">{burnDown.completedTasks}</strong></span>
          <span>Remaining: <strong className="text-foreground">{burnDown.totalTasks - burnDown.completedTasks}</strong></span>
        </div>
      )}
    </Card>
  );
}

// ─── Project Performance ──────────────────────────────────────────────────────
function ProjectPerformanceReport() {
  const { data: rows = [], isLoading } = useQuery<any[]>({
    queryKey: ["report-project-performance"],
    queryFn: () => fetch("/api/reports/project-performance").then(r => r.json()),
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [healthFilter, setHealthFilter] = useState("all");
  const [templateFilter, setTemplateFilter] = useState("all");

  const filtered = useMemo(() => rows.filter(p => {
    if (search && !p.projectName.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (healthFilter !== "all" && p.health !== healthFilter) return false;
    if (templateFilter === "template" && !p.templateUsed) return false;
    if (templateFilter === "no-template" && p.templateUsed) return false;
    return true;
  }), [rows, search, statusFilter, healthFilter, templateFilter]);

  const avgOnTime = filtered.filter(p => p.onTimeRate !== null).reduce((s, p, _, a) => s + p.onTimeRate / a.length, 0);
  const avgCsat = filtered.filter(p => p.csatAvg !== null);

  if (isLoading) return <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Projects</p>
          <p className="text-2xl font-bold">{filtered.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Avg On-Time Rate</p>
          <p className="text-2xl font-bold text-green-600">{filtered.length ? Math.round(avgOnTime) : "—"}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Avg CSAT</p>
          <p className="text-2xl font-bold text-amber-600">
            {avgCsat.length ? (avgCsat.reduce((s, p) => s + p.csatAvg, 0) / avgCsat.length).toFixed(1) : "—"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Template Projects</p>
          <p className="text-2xl font-bold">{filtered.filter(p => p.templateUsed).length}</p>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle>Project Performance</CardTitle>
            <CardDescription>On-time delivery, CSAT, and scope control per project</CardDescription>
          </div>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => downloadCSV("project-performance.csv", filtered)}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </CardHeader>
        <CardHeader className="pt-0 flex flex-row flex-wrap gap-2">
          <Input placeholder="Search projects…" className="w-52" value={search} onChange={e => setSearch(e.target.value)} />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {["Not Started","In Progress","Completed","On Hold"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={healthFilter} onValueChange={setHealthFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Health" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Health</SelectItem>
              {["On Track","At Risk","Off Track"].map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={templateFilter} onValueChange={setTemplateFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Template" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="template">Template-based</SelectItem>
              <SelectItem value="no-template">No Template</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">Project</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Health</th>
                <th className="px-4 py-2 font-medium">Template</th>
                <th className="px-4 py-2 font-medium text-right">Tasks</th>
                <th className="px-4 py-2 font-medium text-right">On-Time %</th>
                <th className="px-4 py-2 font-medium text-right">Non-Template Tasks</th>
                <th className="px-4 py-2 font-medium">CSAT</th>
                <th className="px-4 py-2 font-medium text-right">Days Planned</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">No projects match your filters.</td></tr>
              ) : filtered.map((p: any) => (
                <tr key={p.projectId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    <a href={`/projects/${p.projectId}`} className="text-primary hover:underline">{p.projectName}</a>
                    {p.accountName && <div className="text-xs text-muted-foreground">{p.accountName}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${STATUS_COLORS[p.status]}22`, color: STATUS_COLORS[p.status] }}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${HEALTH_COLORS[p.health] ?? "#94a3b8"}22`, color: HEALTH_COLORS[p.health] ?? "#94a3b8" }}>{p.health}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">{p.templateUsed ? <span className="text-violet-700 dark:text-violet-400">{p.templateName ?? "Yes"}</span> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.totalTasks}</td>
                  <td className="px-4 py-3 text-right">
                    {p.onTimeRate === null ? <span className="text-muted-foreground text-xs">—</span> : (
                      <div className="flex items-center justify-end gap-2">
                        <Progress value={p.onTimeRate} className="w-16 h-1.5" />
                        <span className={`tabular-nums text-xs font-medium ${p.onTimeRate < 60 ? "text-red-600" : p.onTimeRate < 80 ? "text-amber-600" : "text-green-600"}`}>{p.onTimeRate}%</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={p.nonTemplateTasks > 0 ? "text-amber-600 font-medium" : "text-muted-foreground"}>{p.nonTemplateTasks}</span>
                  </td>
                  <td className="px-4 py-3"><StarRating rating={p.csatAvg} /></td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{p.plannedDays}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Operations Insights ──────────────────────────────────────────────────────
function OperationsInsightsReport() {
  const { data: rows = [], isLoading } = useQuery<any[]>({
    queryKey: ["report-operations-insights"],
    queryFn: () => fetch("/api/reports/operations-insights").then(r => r.json()),
  });

  const chartData = rows.map(r => ({
    name: r.templateName.length > 20 ? r.templateName.substring(0, 20) + "…" : r.templateName,
    onTimeRate: r.onTimeRate ?? 0,
    nonTemplateRatio: r.nonTemplateRatio,
    projects: r.projectCount,
  }));

  if (isLoading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>On-Time Rate by Template</CardTitle>
            <CardDescription>Comparison of delivery performance and scope creep across templates</CardDescription>
          </div>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => downloadCSV("operations-insights.csv", rows)}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
              <YAxis axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
              <RechartsTooltip formatter={(v: number, name: string) => [`${v}%`, name === "onTimeRate" ? "On-Time Rate" : "Non-Template Task Ratio"]} cursor={{ fill: "#f1f5f9" }} />
              <Legend verticalAlign="top" />
              <Bar dataKey="onTimeRate" name="On-Time Rate" fill="#10b981" radius={[4,4,0,0]} />
              <Bar dataKey="nonTemplateRatio" name="Non-Template Tasks %" fill="#f59e0b" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Template Comparison Table</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">Template</th>
                <th className="px-4 py-2 font-medium text-right">Projects</th>
                <th className="px-4 py-2 font-medium text-right">Completed</th>
                <th className="px-4 py-2 font-medium text-right">On-Time %</th>
                <th className="px-4 py-2 font-medium text-right">Non-Template Tasks</th>
                <th className="px-4 py-2 font-medium text-right">Scope Creep %</th>
                <th className="px-4 py-2 font-medium">Avg CSAT</th>
                <th className="px-4 py-2 font-medium text-right">Avg Duration</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{r.templateId ? <span className="text-violet-700 dark:text-violet-400">{r.templateName}</span> : <span className="text-muted-foreground italic">{r.templateName}</span>}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.projectCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.completedProjects}</td>
                  <td className="px-4 py-3 text-right">
                    {r.onTimeRate === null ? <span className="text-muted-foreground text-xs">—</span> : (
                      <span className={`font-medium tabular-nums ${r.onTimeRate < 60 ? "text-red-600" : r.onTimeRate < 80 ? "text-amber-600" : "text-green-600"}`}>{r.onTimeRate}%</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.nonTemplateTasks}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`tabular-nums font-medium ${r.nonTemplateRatio > 30 ? "text-red-600" : r.nonTemplateRatio > 15 ? "text-amber-600" : "text-muted-foreground"}`}>{r.nonTemplateRatio}%</span>
                  </td>
                  <td className="px-4 py-3"><StarRating rating={r.csatAvg} /></td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{r.avgDurationDays !== null ? `${r.avgDurationDays}d` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── CSAT Trend Report ────────────────────────────────────────────────────────
function CsatTrendReport() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["report-csat-trend"],
    queryFn: () => fetch("/api/reports/csat-trend").then(r => r.json()),
  });

  const byMonth = data?.byMonth ?? [];
  const byProject = (data?.byProject ?? []).filter(Boolean).sort((a: any, b: any) => b.avgRating - a.avgRating);

  const chartData = byMonth.map((m: any) => ({
    month: m.month,
    rating: m.avgRating,
    count: m.count,
  }));

  if (isLoading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Overall Average</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-2xl font-bold text-amber-600">{data?.overallAvg ?? "—"}</p>
            {data?.overallAvg && <div className="flex">{[1,2,3,4,5].map(i => <Star key={i} className={`h-4 w-4 ${i <= Math.round(data.overallAvg) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />)}</div>}
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Responses</p>
          <p className="text-2xl font-bold">{data?.totalResponses ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Projects with CSAT</p>
          <p className="text-2xl font-bold">{byProject.length}</p>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>CSAT Rating Trend</CardTitle>
            <CardDescription>Average customer satisfaction score over time</CardDescription>
          </div>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => downloadCSV("csat-trend.csv", byMonth)}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent className="h-[320px]">
          {byMonth.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">No CSAT data yet. Submit surveys from project milestone tasks.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} domain={[1, 5]} ticks={[1,2,3,4,5]} tickFormatter={v => `${v}★`} />
                <RechartsTooltip formatter={(v: number, name: string) => [name === "rating" ? `${v} stars` : `${v} responses`, name === "rating" ? "Avg Rating" : "Responses"]} />
                <ReferenceLine y={4} stroke="#10b981" strokeDasharray="4 2" label={{ value: "Target (4★)", position: "right", fontSize: 11, fill: "#10b981" }} />
                <Line type="monotone" dataKey="rating" name="rating" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, fill: "#f59e0b" }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {byProject.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">By Project</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Project</th>
                  <th className="px-4 py-2 font-medium">Rating</th>
                  <th className="px-4 py-2 font-medium text-right">Responses</th>
                </tr>
              </thead>
              <tbody>
                {byProject.map((p: any) => (
                  <tr key={p.projectId} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3"><a href={`/projects/${p.projectId}`} className="text-primary hover:underline font-medium">{p.projectName}</a></td>
                    <td className="px-4 py-3"><StarRating rating={p.avgRating} /></td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Interval IQ Report ───────────────────────────────────────────────────────
function IntervalIqReport() {
  const { data: rows = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["report-interval-iq"],
    queryFn: () => fetch("/api/reports/interval-iq").then(r => r.json()),
  });

  const overruns = rows.filter(r => r.isOverrun);
  const onTime = rows.filter(r => !r.isOverrun && r.actualDays !== null);
  const avgDelta = rows.filter(r => r.delta !== null).reduce((s, r, _, a) => s + r.delta / a.length, 0);

  const chartData = rows.filter(r => r.actualDays !== null).map(r => ({
    name: `${r.projectName.substring(0, 14)}…`,
    actual: r.actualDays,
    benchmark: r.benchmarkDays,
    overrun: r.isOverrun,
  }));

  if (isLoading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Intervals Tracked</p>
          <p className="text-2xl font-bold">{rows.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-red-500" /> Overruns</p>
          <p className="text-2xl font-bold text-red-600">{overruns.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> On/Under Benchmark</p>
          <p className="text-2xl font-bold text-green-600">{onTime.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Avg Delta vs Benchmark</p>
          <p className={`text-2xl font-bold ${avgDelta > 0 ? "text-red-600" : "text-green-600"}`}>
            {rows.filter(r => r.delta !== null).length > 0 ? `${avgDelta > 0 ? "+" : ""}${Math.round(avgDelta)}d` : "—"}
          </p>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" /> Actual vs Benchmark Duration</CardTitle>
              <CardDescription>Highlights where project intervals exceeded their benchmark</CardDescription>
            </div>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => downloadCSV("interval-iq.csv", rows)}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 40 }} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
                <YAxis axisLine={false} tickLine={false} tickFormatter={v => `${v}d`} />
                <RechartsTooltip formatter={(v: number, name: string) => [`${v} days`, name === "actual" ? "Actual" : "Benchmark"]} cursor={{ fill: "#f1f5f9" }} />
                <Legend />
                <Bar dataKey="benchmark" name="Benchmark" fill="#c4b5fd" radius={[4,4,0,0]} />
                <Bar dataKey="actual" name="Actual" radius={[4,4,0,0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.overrun ? "#ef4444" : "#10b981"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Interval Details</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No intervals yet. They are auto-generated from project milestones on first load.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Project</th>
                  <th className="px-4 py-2 font-medium">Interval</th>
                  <th className="px-4 py-2 font-medium">Start → End</th>
                  <th className="px-4 py-2 font-medium text-right">Benchmark</th>
                  <th className="px-4 py-2 font-medium text-right">Actual</th>
                  <th className="px-4 py-2 font-medium text-right">Delta</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.intervalId} className={`border-b last:border-0 hover:bg-muted/30 ${r.isOverrun ? "bg-red-50/50 dark:bg-red-950/10" : ""}`}>
                    <td className="px-4 py-3 font-medium">
                      <a href={`/projects/${r.projectId}`} className="text-primary hover:underline">{r.projectName}</a>
                    </td>
                    <td className="px-4 py-3">{r.intervalName}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.startEventName ?? "—"} → {r.endEventName ?? "—"}
                      {r.startDate && r.endDate && <div className="text-muted-foreground/60">{r.startDate} → {r.endDate}</div>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.benchmarkDays}d</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {r.actualDays !== null ? `${r.actualDays}d` : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.delta === null ? <span className="text-muted-foreground">—</span> : (
                        <span className={`font-medium ${r.delta > 0 ? "text-red-600" : "text-green-600"}`}>{r.delta > 0 ? `+${r.delta}` : r.delta}d</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.actualDays === null ? (
                        <span className="text-xs text-muted-foreground">Pending</span>
                      ) : r.isOverrun ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full"><AlertTriangle className="h-3 w-3" /> Overrun</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full"><CheckCircle2 className="h-3 w-3" /> On Time</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CapacityPlanningReport() {
  const [weeks, setWeeks] = useState(12);
  const { data, isLoading } = useQuery({
    queryKey: ["/api/reports/capacity-planning", weeks],
    queryFn: async () => {
      const r = await fetch(`/api/reports/capacity-planning?weeks=${weeks}`);
      if (!r.ok) throw new Error("Failed to load capacity planning");
      return r.json() as Promise<{
        weeks: number;
        startDate: string;
        endDate: string;
        standardWeekHours: number;
        buckets: Array<{
          weekStart: string; weekEnd: string;
          totalCapacityFTE: number; timeOffFTE: number; holidayFTE: number;
          availableFTE: number; assignedDemandFTE: number; unassignedDemandFTE: number;
          totalDemandFTE: number; surplusFTE: number;
          byRole: Array<{ role: string; supplyFTE: number; demandFTE: number; surplusFTE: number }>;
        }>;
      }>;
    },
  });

  const chartData = useMemo(() => (data?.buckets ?? []).map(b => ({
    week: b.weekStart.slice(5),
    Available: b.availableFTE,
    Assigned: b.assignedDemandFTE,
    Unassigned: b.unassignedDemandFTE,
    Total: b.totalDemandFTE,
  })), [data]);

  const roleSummary = useMemo(() => {
    if (!data?.buckets.length) return [];
    const acc = new Map<string, { role: string; supply: number; demand: number; n: number }>();
    for (const b of data.buckets) {
      for (const r of b.byRole) {
        const cur = acc.get(r.role) ?? { role: r.role, supply: 0, demand: 0, n: 0 };
        cur.supply += r.supplyFTE; cur.demand += r.demandFTE; cur.n += 1;
        acc.set(r.role, cur);
      }
    }
    return Array.from(acc.values()).map(x => ({
      role: x.role,
      avgSupplyFTE: Math.round((x.supply / x.n) * 10) / 10,
      avgDemandFTE: Math.round((x.demand / x.n) * 10) / 10,
      avgSurplusFTE: Math.round(((x.supply - x.demand) / x.n) * 10) / 10,
    })).sort((a, b) => a.avgSurplusFTE - b.avgSurplusFTE);
  }, [data]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Capacity Planning — Demand vs Supply</CardTitle>
            <CardDescription>FTE forecast by week. Standard week = {data?.standardWeekHours ?? 40}h.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(weeks)} onValueChange={(v) => setWeeks(parseInt(v, 10))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4 weeks</SelectItem>
                <SelectItem value="8">8 weeks</SelectItem>
                <SelectItem value="12">12 weeks</SelectItem>
                <SelectItem value="26">26 weeks</SelectItem>
                <SelectItem value="52">52 weeks (1 yr max)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={!data?.buckets.length}
              onClick={() => downloadCSV("capacity-planning.csv", (data?.buckets ?? []).map(b => ({
                weekStart: b.weekStart,
                availableFTE: b.availableFTE,
                assignedDemandFTE: b.assignedDemandFTE,
                unassignedDemandFTE: b.unassignedDemandFTE,
                totalDemandFTE: b.totalDemandFTE,
                surplusFTE: b.surplusFTE,
              })))}
            >
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : !chartData.length ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis label={{ value: "FTE", angle: -90, position: "insideLeft" }} />
                <RechartsTooltip />
                <Legend />
                <Area type="monotone" dataKey="Available" fill="hsl(142 70% 45% / 0.25)" stroke="hsl(142 70% 45%)" />
                <Bar dataKey="Assigned" stackId="d" fill="hsl(217 91% 60%)" />
                <Bar dataKey="Unassigned" stackId="d" fill="hsl(38 92% 50%)" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role-level Surplus / Deficit</CardTitle>
          <CardDescription>Average FTE per week across the selected horizon. Negative surplus = deficit.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !roleSummary.length ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No role data.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 px-2">Role</th>
                    <th className="py-2 px-2 text-right">Avg Supply (FTE)</th>
                    <th className="py-2 px-2 text-right">Avg Demand (FTE)</th>
                    <th className="py-2 px-2 text-right">Surplus (FTE)</th>
                  </tr>
                </thead>
                <tbody>
                  {roleSummary.map(r => (
                    <tr key={r.role} className="border-b last:border-0">
                      <td className="py-2 px-2 font-medium">{r.role}</td>
                      <td className="py-2 px-2 text-right">{r.avgSupplyFTE}</td>
                      <td className="py-2 px-2 text-right">{r.avgDemandFTE}</td>
                      <td className={`py-2 px-2 text-right font-semibold ${r.avgSurplusFTE < 0 ? "text-red-600" : "text-green-600"}`}>
                        {r.avgSurplusFTE > 0 ? "+" : ""}{r.avgSurplusFTE}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Reports() {
  const { data: utilization, isLoading: isLoadingUtilization } = useGetUtilizationReport();
  const { data: revenue, isLoading: isLoadingRevenue } = useGetRevenueReport();
  const { data: health, isLoading: isLoadingHealth } = useGetProjectHealthReport();

  const currentYear = new Date().getFullYear().toString();
  const [revenueYear, setRevenueYear] = useState(currentYear);
  const [utilizationYear, setUtilizationYear] = useState(currentYear);

  const revenueYears = [...new Set((revenue?.byMonth ?? []).map(m => m.month.substring(0, 4)))].sort().reverse();
  const utilizationYears = [...new Set((utilization?.byMonth ?? []).map(m => m.month.substring(0, 4)))].sort().reverse();

  const filteredRevenueData = (revenue?.byMonth ?? []).filter(m => m.month.startsWith(revenueYear));
  const filteredUtilizationData = (utilization?.byMonth ?? []).filter(m => m.month.startsWith(utilizationYear));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        </div>

        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="performance" className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Performance</TabsTrigger>
            <TabsTrigger value="capacity-planning" className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Capacity Planning</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="csat" className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5" /> CSAT Trend</TabsTrigger>
            <TabsTrigger value="interval-iq" className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Interval IQ</TabsTrigger>
            <TabsTrigger value="budget">Budget vs Actuals</TabsTrigger>
            <TabsTrigger value="burndown">Burn-Down</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="utilization">Utilization</TabsTrigger>
            <TabsTrigger value="health">Project Health</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="m-0">
            <ProjectPerformanceReport />
          </TabsContent>

          <TabsContent value="capacity-planning" className="space-y-4 m-0">
            <CapacityPlanningReport />
          </TabsContent>

          <TabsContent value="operations" className="m-0">
            <OperationsInsightsReport />
          </TabsContent>

          <TabsContent value="csat" className="m-0">
            <CsatTrendReport />
          </TabsContent>

          <TabsContent value="interval-iq" className="m-0">
            <IntervalIqReport />
          </TabsContent>

          <TabsContent value="budget" className="space-y-4 m-0">
            <BudgetSummaryCards />
            <BudgetVsActualsChart />
          </TabsContent>

          <TabsContent value="burndown" className="space-y-4 m-0">
            <BurnDownChart />
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6 m-0">
            <Card className="col-span-2">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>Revenue by Month</CardTitle>
                  <CardDescription>Invoiced vs Collected revenue over time</CardDescription>
                </div>
                <Select value={revenueYear} onValueChange={setRevenueYear}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(revenueYears.length > 0 ? revenueYears : [currentYear]).map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="h-[400px]">
                {isLoadingRevenue ? <ChartSkeleton /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredRevenueData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tickFormatter={v => v.substring(5)} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
                      <RechartsTooltip formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]} cursor={{ fill: '#f1f5f9' }} />
                      <Legend />
                      <Bar dataKey="invoiced" name="Invoiced" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="utilization" className="space-y-6 m-0">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>Team Utilization Trend</CardTitle>
                  <CardDescription>Average utilization percentage over time</CardDescription>
                </div>
                <Select value={utilizationYear} onValueChange={setUtilizationYear}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(utilizationYears.length > 0 ? utilizationYears : [currentYear]).map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="h-[400px]">
                {isLoadingUtilization ? <ChartSkeleton /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filteredUtilizationData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tickFormatter={v => v.substring(5)} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} domain={[0, 100]} />
                      <RechartsTooltip formatter={(value: number) => [`${value}%`, 'Utilization']} />
                      <Line type="monotone" dataKey="utilization" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health" className="space-y-6 m-0">
            <div className="grid gap-4 md:grid-cols-4">
              {isLoadingHealth ? (
                [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)
              ) : (
                <>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">On Track</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-green-600">{health?.onTrack || 0}</div></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">At Risk</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-amber-600">{health?.atRisk || 0}</div></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Off Track</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-red-600">{health?.offTrack || 0}</div></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-blue-600">{health?.completed || 0}</div></CardContent></Card>
                </>
              )}
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Project Health Details</CardTitle>
                <CardDescription>Individual project health status and key metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingHealth ? (
                  <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : !health?.projects?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No project data available.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Project</th>
                        <th className="pb-2 font-medium">Health</th>
                        <th className="pb-2 font-medium text-right">Completion</th>
                        <th className="pb-2 font-medium text-right">Budget Used</th>
                        <th className="pb-2 font-medium text-right">Days Remaining</th>
                      </tr>
                    </thead>
                    <tbody>
                      {health.projects.map(p => (
                        <tr key={p.projectId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-3 font-medium">
                            <a href={`/projects/${p.projectId}`} className="text-primary hover:underline">{p.projectName}</a>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              p.health === "On Track" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" :
                              p.health === "At Risk" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" :
                              p.health === "Off Track" ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" :
                              "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            }`}>{p.health}</span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(p.completion, 100)}%` }} />
                              </div>
                              <span className="tabular-nums w-10 text-right">{p.completion}%</span>
                            </div>
                          </td>
                          <td className="py-3 text-right tabular-nums">
                            <span className={p.budgetUsed > 90 ? "text-red-600 font-medium" : p.budgetUsed > 75 ? "text-amber-600" : ""}>{p.budgetUsed}%</span>
                          </td>
                          <td className="py-3 text-right tabular-nums">
                            <span className={p.daysRemaining < 0 ? "text-red-600 font-medium" : p.daysRemaining < 14 ? "text-amber-600" : ""}>
                              {p.daysRemaining < 0 ? `${Math.abs(p.daysRemaining)}d overdue` : `${p.daysRemaining}d`}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
