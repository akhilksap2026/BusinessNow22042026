import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  RefreshCw,
  AlertTriangle,
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
} from "lucide-react";
import { authHeaders } from "@/lib/auth-headers";
import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { UtilisationHeatmap } from "@/components/utilisation-heatmap";

// ─── Types ───────────────────────────────────────────────────────────────────

type HealthBucket = "Green" | "Amber" | "Red";

interface PortfolioProject {
  projectId: number;
  projectName: string;
  accountId: number;
  accountName: string | null;
  ownerId: number;
  ownerName: string | null;
  status: string;
  health: string;
  healthBucket: HealthBucket;
  healthReason: string;
  billingType: string;
  sowBudget: number;
  changeOrderAmount: number;
  totalBudget: number;
  actuals: number;
  pendingInvoiced: number;
  percentUsed: number;
  plannedHours: number;
  actualHours: number;
  etc: number;
  eac: number;
  completion: number;
  startDate: string;
  dueDate: string;
  daysRemaining: number;
}

interface OverAllocatedEmployee {
  userId: number;
  userName: string;
  role: string;
  department: string;
  capacity: number;
  allocatedHours: number;
  utilizationPercent: number;
  projects: Array<{ projectId: number; projectName: string; hoursPerWeek: number }>;
}

interface OpenResourceRequest {
  id: number;
  projectId: number;
  projectName: string;
  role: string;
  requiredSkills: string[];
  hoursPerWeek: number;
  startDate: string;
  endDate: string;
  status: string;
  priority: string;
  createdAt: string;
  daysSinceRaised: number;
}

interface BudgetAlert {
  projectId: number;
  projectName: string;
  type: "spend_over_90" | "hours_over_plan" | "eac_over_budget" | "no_budget";
  message: string;
}

interface PortfolioPayload {
  refreshedAt: string;
  kpis: {
    totalBudget: number;
    totalPlannedHours: number;
    totalActualHours: number;
    burnPercent: number;
    totalBilled: number;
    totalPending: number;
    atRiskCount: number;
    overAllocatedCount: number;
    openRequestsCount: number;
    projectCount: number;
  };
  projects: PortfolioProject[];
  overAllocatedEmployees: OverAllocatedEmployee[];
  openResourceRequests: OpenResourceRequest[];
  budgetAlerts: BudgetAlert[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fmtHours(n: number): string {
  return `${n.toFixed(1)}h`;
}

function healthDot(b: HealthBucket): string {
  if (b === "Green") return "bg-emerald-500";
  if (b === "Amber") return "bg-amber-500";
  return "bg-red-500";
}

function csvEscape(v: any): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename: string, rows: Record<string, any>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Section Components ─────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  emphasis,
  onClick,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string | number;
  sub?: string;
  emphasis?: "default" | "warn" | "danger";
  onClick?: () => void;
}) {
  const tone =
    emphasis === "danger"
      ? "text-red-600"
      : emphasis === "warn"
        ? "text-amber-600"
        : "text-foreground";
  return (
    <Card
      className={onClick ? "cursor-pointer hover:border-primary transition-colors" : undefined}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </div>
            <div className={`text-2xl font-semibold mt-1 ${tone}`}>{value}</div>
            {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
          </div>
          <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

function HealthBadge({ bucket, reason }: { bucket: HealthBucket; reason: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${healthDot(bucket)}`} />
            <span className="text-xs">{bucket}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{reason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cls =
    priority === "High" || priority === "Critical"
      ? "bg-red-100 text-red-700 border-red-200"
      : priority === "Medium"
        ? "bg-amber-100 text-amber-700 border-amber-200"
        : "bg-slate-100 text-slate-700 border-slate-200";
  return <Badge variant="outline" className={cls}>{priority}</Badge>;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function CommandCenter() {
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery<PortfolioPayload>({
    queryKey: ["admin-portfolio-summary"],
    queryFn: async () => {
      const r = await fetch("/api/admin/portfolio-summary", { headers: authHeaders() });
      if (!r.ok) throw new Error(`Failed to load portfolio summary (${r.status})`);
      return r.json();
    },
    refetchInterval: 5 * 60 * 1000, // auto-refresh every 5 minutes
    staleTime: 60 * 1000,
  });

  // ── Filters / grouping for the projects table ──────────────────────────────
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<string>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [pmFilter, setPmFilter] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<"none" | "account" | "pm">("none");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof PortfolioProject>("projectName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Section 5/3/4 collapsible state
  const [overAllocOpen, setOverAllocOpen] = useState(true);
  const [requestsOpen, setRequestsOpen] = useState(true);
  const [alertsOpen, setAlertsOpen] = useState(true);

  const filteredProjects = useMemo(() => {
    if (!data) return [];
    let rows = data.projects;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((p) => p.projectName.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") rows = rows.filter((p) => p.status === statusFilter);
    if (healthFilter !== "all") rows = rows.filter((p) => p.healthBucket === healthFilter);
    if (accountFilter !== "all")
      rows = rows.filter((p) => String(p.accountId) === accountFilter);
    if (pmFilter !== "all") rows = rows.filter((p) => String(p.ownerId) === pmFilter);

    rows = [...rows].sort((a, b) => {
      const av = a[sortKey] as any;
      const bv = b[sortKey] as any;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av ?? "").localeCompare(String(bv ?? ""))
        : String(bv ?? "").localeCompare(String(av ?? ""));
    });
    return rows;
  }, [data, search, statusFilter, healthFilter, accountFilter, pmFilter, sortKey, sortDir]);

  const groupedProjects = useMemo(() => {
    if (groupBy === "none") return [{ key: "All projects", rows: filteredProjects }];
    const map = new Map<string, PortfolioProject[]>();
    for (const p of filteredProjects) {
      const k =
        groupBy === "account"
          ? p.accountName ?? "(no account)"
          : p.ownerName ?? "(no PM)";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, rows]) => ({ key, rows }));
  }, [filteredProjects, groupBy]);

  const distinctAccounts = useMemo(() => {
    const m = new Map<number, string>();
    (data?.projects ?? []).forEach((p) =>
      p.accountName && m.set(p.accountId, p.accountName),
    );
    return Array.from(m.entries()).sort(([, a], [, b]) => a.localeCompare(b));
  }, [data]);

  const distinctPMs = useMemo(() => {
    const m = new Map<number, string>();
    (data?.projects ?? []).forEach((p) => p.ownerName && m.set(p.ownerId, p.ownerName));
    return Array.from(m.entries()).sort(([, a], [, b]) => a.localeCompare(b));
  }, [data]);

  const requestsByProject = useMemo(() => {
    const m = new Map<number, { projectName: string; rows: OpenResourceRequest[] }>();
    (data?.openResourceRequests ?? []).forEach((r) => {
      if (!m.has(r.projectId)) m.set(r.projectId, { projectName: r.projectName, rows: [] });
      m.get(r.projectId)!.rows.push(r);
    });
    return Array.from(m.values()).sort((a, b) => a.projectName.localeCompare(b.projectName));
  }, [data]);

  function toggleSort(key: keyof PortfolioProject) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function exportCsv() {
    const rows = filteredProjects.map((p) => ({
      Project: p.projectName,
      Account: p.accountName ?? "",
      PM: p.ownerName ?? "",
      Status: p.status,
      Health: p.healthBucket,
      "Health Reason": p.healthReason,
      "Billing Type": p.billingType,
      "Total Budget": p.totalBudget,
      "Actuals": p.actuals,
      "% Used": p.percentUsed,
      "Planned Hours": p.plannedHours,
      "Actual Hours": p.actualHours,
      ETC: p.etc,
      EAC: p.eac,
      "Days Remaining": p.daysRemaining,
      "Start Date": p.startDate,
      "Due Date": p.dueDate,
    }));
    downloadCsv(`portfolio-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading || !data) {
    return (
      <Layout>
        <PageHeader title="Command Center" description="Cross-project portfolio view" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </Layout>
    );
  }

  const k = data.kpis;
  const refreshedLabel = dataUpdatedAt
    ? format(new Date(dataUpdatedAt), "MMM d, h:mm a")
    : format(new Date(data.refreshedAt), "MMM d, h:mm a");

  return (
    <Layout>
      <PageHeader
        title="Command Center"
        description="Portfolio-wide health, capacity, and budget — refreshed every 5 minutes."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden md:inline">
              Last refreshed {refreshedLabel}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
              data-testid="button-refresh-portfolio"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* ── Section 1: KPI bar ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard
          icon={DollarSign}
          label="Portfolio Budget"
          value={fmtCurrency(k.totalBudget)}
          sub={`${k.projectCount} projects`}
        />
        <KpiCard
          icon={Clock}
          label="Hours Burn"
          value={`${k.burnPercent}%`}
          sub={`${fmtHours(k.totalActualHours)} / ${fmtHours(k.totalPlannedHours)}`}
          emphasis={k.burnPercent >= 100 ? "danger" : k.burnPercent >= 80 ? "warn" : "default"}
        />
        <KpiCard
          icon={TrendingUp}
          label="Billed to Date"
          value={fmtCurrency(k.totalBilled)}
          sub={`${fmtCurrency(k.totalPending)} pending`}
        />
        <KpiCard
          icon={AlertTriangle}
          label="At Risk / Red"
          value={k.atRiskCount}
          sub="Click to filter table"
          emphasis={k.atRiskCount > 0 ? "danger" : "default"}
          onClick={() => setHealthFilter(k.atRiskCount > 0 ? "Red" : "all")}
        />
        <KpiCard
          icon={Users}
          label="Over-allocated"
          value={k.overAllocatedCount}
          sub="Employees > 100%"
          emphasis={k.overAllocatedCount > 0 ? "warn" : "default"}
          onClick={() => {
            setOverAllocOpen(true);
            document.getElementById("over-allocated-section")?.scrollIntoView({ behavior: "smooth" });
          }}
        />
        <KpiCard
          icon={Briefcase}
          label="Open Resource Reqs"
          value={k.openRequestsCount}
          sub="Pending / Approved"
          emphasis={k.openRequestsCount > 0 ? "warn" : "default"}
          onClick={() => {
            setRequestsOpen(true);
            document.getElementById("resource-requests-section")?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      </div>

      {/* ── Section 2: Consolidated project table ──────────────────────── */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Consolidated Projects</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={exportCsv}
              data-testid="button-export-csv"
            >
              <Download className="h-4 w-4 mr-1.5" /> Export CSV
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Input
              placeholder="Search project…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48 h-8"
              data-testid="input-project-search"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {[...new Set(data.projects.map((p) => p.status))].sort().map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={healthFilter} onValueChange={setHealthFilter}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Health" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All health</SelectItem>
                <SelectItem value="Green">🟢 Green</SelectItem>
                <SelectItem value="Amber">🟡 Amber</SelectItem>
                <SelectItem value="Red">🔴 Red</SelectItem>
              </SelectContent>
            </Select>
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Account" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {distinctAccounts.map(([id, name]) => (
                  <SelectItem key={id} value={String(id)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={pmFilter} onValueChange={setPmFilter}>
              <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="PM" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All PMs</SelectItem>
                {distinctPMs.map(([id, name]) => (
                  <SelectItem key={id} value={String(id)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Group by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No grouping</SelectItem>
                <SelectItem value="account">Group by Account</SelectItem>
                <SelectItem value="pm">Group by PM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("projectName")}>
                    Project {sortKey === "projectName" && (sortDir === "asc" ? "▲" : "▼")}
                  </TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>PM</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => toggleSort("totalBudget")}>
                    Total Budget {sortKey === "totalBudget" && (sortDir === "asc" ? "▲" : "▼")}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("percentUsed")}>
                    Spent {sortKey === "percentUsed" && (sortDir === "asc" ? "▲" : "▼")}
                  </TableHead>
                  <TableHead className="text-right">Planned h</TableHead>
                  <TableHead className="text-right">Actual h</TableHead>
                  <TableHead className="text-right">ETC</TableHead>
                  <TableHead className="text-right">EAC</TableHead>
                  <TableHead>Billing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                      No projects match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedProjects.map((group) => (
                    <>
                      {groupBy !== "none" && (
                        <TableRow key={`group-${group.key}`} className="bg-muted/40">
                          <TableCell colSpan={12} className="text-xs font-semibold text-muted-foreground">
                            {group.key} · {group.rows.length}
                          </TableCell>
                        </TableRow>
                      )}
                      {group.rows.map((p) => (
                        <TableRow key={p.projectId} data-testid={`row-project-${p.projectId}`}>
                          <TableCell className="font-medium">
                            <Link href={`/projects/${p.projectId}`} className="hover:underline text-primary">
                              {p.projectName}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {p.accountName ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {p.ownerName ?? "—"}
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{p.status}</Badge></TableCell>
                          <TableCell><HealthBadge bucket={p.healthBucket} reason={p.healthReason} /></TableCell>
                          <TableCell className="text-right font-mono text-sm">{fmtCurrency(p.totalBudget)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <Progress
                                value={Math.min(100, p.percentUsed)}
                                className={`h-2 flex-1 ${p.percentUsed >= 90 ? "[&>*]:bg-red-500" : ""}`}
                              />
                              <span
                                className={`text-xs font-mono w-10 text-right ${
                                  p.percentUsed >= 90 ? "text-red-600 font-semibold" : ""
                                }`}
                              >
                                {p.percentUsed}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{p.plannedHours.toFixed(1)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{p.actualHours.toFixed(1)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{p.etc.toFixed(1)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {p.billingType === "Fixed Fee" ? fmtCurrency(p.eac) : `${p.eac.toFixed(1)}h`}
                          </TableCell>
                          <TableCell className="text-xs">{p.billingType}</TableCell>
                        </TableRow>
                      ))}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 3: Over-allocated employees ────────────────────────── */}
      <div id="over-allocated-section" />
      <Collapsible open={overAllocOpen} onOpenChange={setOverAllocOpen} className="mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <CardTitle className="text-base flex items-center gap-2">
                {overAllocOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Over-allocated Employees
                <Badge variant="outline" className="text-xs">
                  {data.overAllocatedEmployees.length}
                </Badge>
              </CardTitle>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {data.overAllocatedEmployees.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No employees are currently over-allocated. Capacity looks healthy.
                </p>
              ) : (
                <div className="space-y-4">
                  {data.overAllocatedEmployees.map((emp) => (
                    <div
                      key={emp.userId}
                      className="border rounded-lg p-3"
                      data-testid={`row-overalloc-${emp.userId}`}
                    >
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div className="min-w-0">
                          <div className="font-medium">
                            {emp.userName}
                            <Badge variant="outline" className="ml-2 text-xs">{emp.role}</Badge>
                            <span className="text-xs text-muted-foreground ml-2">{emp.department}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {emp.allocatedHours.toFixed(1)}h / {emp.capacity}h capacity ·{" "}
                            <span className="text-red-600 font-semibold">{emp.utilizationPercent}%</span>
                          </div>
                          <div className="text-xs mt-2">
                            <span className="text-muted-foreground">On: </span>
                            {emp.projects.map((pj, i) => (
                              <span key={pj.projectId}>
                                <Link href={`/projects/${pj.projectId}`} className="text-primary hover:underline">
                                  {pj.projectName}
                                </Link>{" "}
                                <span className="text-muted-foreground">({pj.hoursPerWeek}h/wk)</span>
                                {i < emp.projects.length - 1 ? ", " : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link href={`/resources?userId=${emp.userId}`}>
                            <Button size="sm" variant="outline" data-testid={`button-view-allocs-${emp.userId}`}>
                              <ExternalLink className="h-3 w-3 mr-1" /> View Allocations
                            </Button>
                          </Link>
                        </div>
                      </div>
                      <div className="mt-3">
                        <UtilisationHeatmap userId={emp.userId} weekCount={4} compact />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ── Section 4: Open resource requests ──────────────────────────── */}
      <div id="resource-requests-section" />
      <Collapsible open={requestsOpen} onOpenChange={setRequestsOpen} className="mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <CardTitle className="text-base flex items-center gap-2">
                {requestsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Resource Requirements Needing Attention
                <Badge variant="outline" className="text-xs">{data.openResourceRequests.length}</Badge>
              </CardTitle>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {requestsByProject.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No open resource requests.
                </p>
              ) : (
                <div className="space-y-4">
                  {requestsByProject.map((grp) => (
                    <div key={grp.rows[0].projectId}>
                      <div className="text-sm font-semibold mb-2">
                        <Link
                          href={`/projects/${grp.rows[0].projectId}`}
                          className="hover:underline text-primary"
                        >
                          {grp.projectName}
                        </Link>
                      </div>
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Role</TableHead>
                              <TableHead>Skills</TableHead>
                              <TableHead className="text-right">Hrs/wk</TableHead>
                              <TableHead>Start</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Priority</TableHead>
                              <TableHead className="text-right">Days open</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {grp.rows.map((r) => (
                              <TableRow key={r.id} data-testid={`row-request-${r.id}`}>
                                <TableCell className="font-medium">{r.role}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {(r.requiredSkills ?? []).join(", ") || "—"}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  {r.hoursPerWeek}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {format(new Date(r.startDate), "MMM d, yyyy")}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">{r.status}</Badge>
                                </TableCell>
                                <TableCell><PriorityBadge priority={r.priority} /></TableCell>
                                <TableCell className="text-right">
                                  <span
                                    className={
                                      r.daysSinceRaised > 7
                                        ? "text-red-600 font-semibold"
                                        : "text-muted-foreground text-sm"
                                    }
                                  >
                                    {r.daysSinceRaised}d
                                    {r.daysSinceRaised > 7 && " ⚠"}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Link
                                    href={`/projects/${r.projectId}?tab=resources&request=${r.id}`}
                                  >
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      data-testid={`button-assign-${r.id}`}
                                    >
                                      Assign
                                    </Button>
                                  </Link>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ── Section 5: Budget alerts ───────────────────────────────────── */}
      <Collapsible open={alertsOpen} onOpenChange={setAlertsOpen}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <CardTitle className="text-base flex items-center gap-2">
                {alertsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Budget Alerts
                <Badge variant="outline" className="text-xs">{data.budgetAlerts.length}</Badge>
              </CardTitle>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {data.budgetAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No active budget alerts. All projects are within thresholds.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Alert Type</TableHead>
                      <TableHead>Detail</TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.budgetAlerts.map((a, i) => {
                      const typeLabel =
                        a.type === "spend_over_90"
                          ? "Spend ≥ 90%"
                          : a.type === "hours_over_plan"
                            ? "Hours over plan"
                            : a.type === "eac_over_budget"
                              ? "EAC > Budget"
                              : "No budget";
                      const typeCls =
                        a.type === "no_budget"
                          ? "bg-slate-100 text-slate-700 border-slate-200"
                          : "bg-red-100 text-red-700 border-red-200";
                      return (
                        <TableRow key={`${a.projectId}-${a.type}-${i}`} data-testid={`row-alert-${a.projectId}-${a.type}`}>
                          <TableCell className="font-medium">
                            <Link href={`/projects/${a.projectId}`} className="hover:underline text-primary">
                              {a.projectName}
                            </Link>
                          </TableCell>
                          <TableCell><Badge variant="outline" className={typeCls}>{typeLabel}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{a.message}</TableCell>
                          <TableCell className="text-right">
                            <Link href={`/projects/${a.projectId}?tab=budget`}>
                              <Button size="sm" variant="ghost">
                                <ExternalLink className="h-3 w-3 mr-1" /> Open Budget
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </Layout>
  );
}
