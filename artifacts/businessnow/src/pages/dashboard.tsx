import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { CreateProjectWizard } from "@/components/create-project-wizard";
import {
  useGetDashboardSummary,
  useGetDashboardActivity,
  useGetProjectHealthReport,
  useListInvoices,
  useListProjects,
} from "@workspace/api-client-react";
import { useCurrentUser } from "@/contexts/current-user";
import { hasRole } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  DollarSign,
  Clock,
  Users,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  BarChart2,
  Bookmark,
  Plus,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { authHeaders } from "@/lib/auth-headers";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { useToast } from "@/hooks/use-toast";

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type Period = "week" | "month" | "quarter" | "ytd";

type KpiStatus = "success" | "warning" | "danger" | "neutral";

const STATUS_BORDER: Record<KpiStatus, string> = {
  success: "border-l-emerald-500",
  warning: "border-l-amber-500",
  danger: "border-l-red-500",
  neutral: "border-l-slate-300 dark:border-l-slate-700",
};

const STATUS_ICON_BG: Record<KpiStatus, string> = {
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  danger: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  neutral: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

function utilizationStatus(pct: number): KpiStatus {
  if (pct > 100) return "danger";
  if (pct >= 70 && pct <= 90) return "success";
  if (pct > 90) return "warning";
  return "neutral"; // under-utilized — distinct from over-utilized warning
}

function KpiTile({
  title,
  value,
  caption,
  icon: Icon,
  status,
  href,
  isLoading,
  testId,
}: {
  title: string;
  value: string | number | undefined;
  caption: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  status: KpiStatus;
  href: string;
  isLoading: boolean;
  testId?: string;
}) {
  return (
    <Link href={href}>
      <Card
        data-testid={testId}
        className={`cursor-pointer hover:shadow-md transition-all border-l-4 ${STATUS_BORDER[status]}`}
      >
        <CardHeader className="flex flex-row items-start justify-between space-y-0 px-3 pt-3 pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className={`h-6 w-6 rounded flex items-center justify-center ${STATUS_ICON_BG[status]}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          {isLoading ? (
            <Skeleton className="h-6 w-20" />
          ) : (
            <>
              <div className="text-xl font-bold tracking-tight">{value}</div>
              <p className="text-xs text-muted-foreground mt-0.5">{caption}</p>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function ThisWeekTimeWidget() {
  const { currentUser, activeRole } = useCurrentUser();
  const userId = currentUser?.id ?? 0;
  const isManager = hasRole(activeRole, "super_user");

  const today = new Date();
  const mon = new Date(today);
  mon.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekStart = mon.toISOString().slice(0, 10);

  const { data: summary } = useQuery<{
    totalHours: number;
    billableHours: number;
    utilizationPct: number;
  }>({
    queryKey: ["dashboard-week-time-summary", userId, weekStart],
    queryFn: async () => {
      const r = await fetch(
        `/api/time/weekly-summary?resourceId=${userId}&weekStart=${weekStart}`,
        { headers: authHeaders() },
      );
      if (!r.ok) return { totalHours: 0, billableHours: 0, utilizationPct: 0 };
      return r.json();
    },
    enabled: !!userId,
  });

  const { data: pendingData } = useQuery<{ data: any[]; total?: number }>({
    queryKey: ["dashboard-pending-approvals"],
    queryFn: async () => {
      const r = await fetch("/api/time/entries?status=Submitted", { headers: authHeaders() });
      if (!r.ok) return { data: [] };
      return r.json();
    },
    enabled: isManager,
  });

  const { data: rejectedData } = useQuery<{ data: any[] }>({
    queryKey: ["dashboard-rejected-entries", userId],
    queryFn: async () => {
      const r = await fetch(
        `/api/time/entries?resourceId=${userId}&status=Rejected`,
        { headers: authHeaders() },
      );
      if (!r.ok) return { data: [] };
      return r.json();
    },
    enabled: !!userId,
  });

  const totalHours = summary?.totalHours ?? 0;
  const utilPct = summary?.utilizationPct ?? 0;
  const pendingCount = pendingData?.data?.length ?? 0;
  const rejectedCount = rejectedData?.data?.length ?? 0;

  const utilColor =
    utilPct >= 70 && utilPct <= 90 ? "text-emerald-600"
    : utilPct > 90 ? "text-amber-600"
    : "text-slate-500";

  return (
    <Card className="border-l-4 border-l-indigo-400">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">This Week&apos;s Time</CardTitle>
        <div className="h-6 w-6 rounded flex items-center justify-center bg-indigo-100 text-indigo-700">
          <Clock className="h-3.5 w-3.5" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight">{totalHours.toFixed(1)}h</span>
          <span className={`text-sm font-medium ${utilColor}`}>{utilPct}% utilization</span>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          {isManager && pendingCount > 0 && (
            <Link href="/time/approvals">
              <span className="text-amber-700 underline-offset-2 hover:underline cursor-pointer font-medium">
                {pendingCount} pending approval{pendingCount !== 1 ? "s" : ""}
              </span>
            </Link>
          )}
          {rejectedCount > 0 && (
            <Link href="/time/timesheet">
              <span className="text-red-600 underline-offset-2 hover:underline cursor-pointer font-medium">
                {rejectedCount} rejected — needs correction
              </span>
            </Link>
          )}
          {!isManager && rejectedCount === 0 && pendingCount === 0 && (
            <span className="text-muted-foreground">No action needed</span>
          )}
        </div>
        <div className="flex gap-2 pt-1">
          <Link href="/time/new">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
              <Plus className="h-3 w-3" /> Log Time
            </Button>
          </Link>
          <Link href="/time/timesheet">
            <Button size="sm" variant="ghost" className="h-7 text-xs">View Timesheet</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>("month");
  const { toast } = useToast();
  const { currentUser } = useCurrentUser();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  async function handleSaveView() {
    try {
      await fetch("/api/saved-views", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Dashboard · ${period}`, entity: "dashboard", widgetConfig: { period }, roleDefault: null }),
      });
      toast({ title: "View saved", description: `Dashboard period "${period}" saved.` });
    } catch {
      toast({ title: "Failed to save view", variant: "destructive" });
    }
  }

  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({ period });
  const { data: activities, isLoading: isLoadingActivity } = useGetDashboardActivity();
  const { data: healthReport } = useGetProjectHealthReport();
  const { data: invoices } = useListInvoices();
  const [myProjectsOnly, setMyProjectsOnly] = useState(false);
  const { data: allProjectsRaw } = useListProjects();
  const allProjects = Array.isArray(allProjectsRaw) ? (allProjectsRaw as any[]) : [];
  const myProjectIds = useMemo(() => new Set(
    allProjects.filter((p: any) => p.ownerId === currentUser?.id).map((p: any) => p.id as number)
  ), [allProjects, currentUser?.id]);
  const visibleHealthProjects = useMemo(() =>
    myProjectsOnly && myProjectIds.size > 0
      ? (healthReport?.projects ?? []).filter(p => myProjectIds.has((p as any).projectId))
      : (healthReport?.projects ?? [])
  , [healthReport?.projects, myProjectsOnly, myProjectIds]);

  const { data: crImpact } = useQuery<{ originalBudget: number; crAdditions: number; revised: number }>({
    queryKey: ["dashboard-cr-impact"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/cr-impact", { headers: authHeaders() });
      if (!res.ok) return { originalBudget: 0, crAdditions: 0, revised: 0 };
      return res.json();
    },
  });

  const atRiskProjects = visibleHealthProjects.filter(
    (p) => p.health === "At Risk" || p.health === "Off Track",
  );
  const overdueInvoices = invoices?.filter((inv) => inv.status === "Overdue") ?? [];
  const overdueTotal = overdueInvoices.reduce((sum, inv) => sum + inv.total, 0);

  const attentionItems = [
    ...(atRiskProjects.length > 0
      ? [
          {
            type: "projects" as const,
            label: `${atRiskProjects.length} Project${atRiskProjects.length > 1 ? "s" : ""} At Risk`,
            detail: atRiskProjects.slice(0, 3).map((p) => p.projectName).join(", "),
            href: "/projects",
            color: "amber",
          },
        ]
      : []),
    ...(overdueInvoices.length > 0
      ? [
          {
            type: "invoices" as const,
            label: `${overdueInvoices.length} Overdue Invoice${overdueInvoices.length > 1 ? "s" : ""}`,
            detail: `Totaling $${overdueTotal.toLocaleString()}`,
            href: "/finance",
            color: "red",
          },
        ]
      : []),
  ];

  const onTrack = myProjectsOnly
    ? visibleHealthProjects.filter(p => p.health === "On Track").length
    : (healthReport?.onTrack ?? 0);
  const atRisk = myProjectsOnly
    ? visibleHealthProjects.filter(p => p.health === "At Risk").length
    : (healthReport?.atRisk ?? 0);
  const offTrack = myProjectsOnly
    ? visibleHealthProjects.filter(p => p.health === "Off Track").length
    : (healthReport?.offTrack ?? 0);
  const portfolioTotal = onTrack + atRisk + offTrack;
  const pct = (n: number) => (portfolioTotal > 0 ? Math.round((n / portfolioTotal) * 100) : 0);

  const offTrackProjects = visibleHealthProjects.filter((p) => p.health === "Off Track").slice(0, 3);
  const atRiskOnly = visibleHealthProjects.filter((p) => p.health === "At Risk").slice(0, 3);

  const utilPct = summary?.teamUtilization ?? 0;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant={myProjectsOnly ? "secondary" : "outline"}
                size="sm"
                onClick={() => setMyProjectsOnly(v => !v)}
                title="Scope portfolio health to projects you own"
              >
                My Projects
              </Button>
              <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <SelectTrigger className="w-[180px]" data-testid="select-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleSaveView} title="Save dashboard view">
                <Bookmark className="h-3.5 w-3.5 mr-1.5" /> Save View
              </Button>
              <Button onClick={() => setIsCreateOpen(true)}>New Project</Button>
            </div>
          }
        />

        <CreateProjectWizard open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        <OnboardingChecklist />

        <ThisWeekTimeWidget />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile
            title="Active Projects"
            value={summary?.activeProjects ?? 0}
            caption={
              (summary?.atRiskProjects ?? 0) > 0
                ? `${summary?.atRiskProjects} at risk`
                : "All on track"
            }
            icon={Briefcase}
            status={(summary?.atRiskProjects ?? 0) > 0 ? "warning" : "success"}
            href="/projects"
            isLoading={isLoadingSummary}
            testId="kpi-active-projects"
          />
          <KpiTile
            title="Total Revenue"
            value={formatCurrency(summary?.totalRevenue ?? 0)}
            caption={`${
              period === "week" ? "This week · " :
              period === "quarter" ? "This quarter · " :
              period === "ytd" ? "Year to date · " :
              "This month · "
            }${formatCurrency(summary?.outstandingInvoices ?? 0)} outstanding (all-time)`}
            icon={DollarSign}
            status={(summary?.totalRevenue ?? 0) > 0 ? "success" : "neutral"}
            href="/finance"
            isLoading={isLoadingSummary}
            testId="kpi-revenue"
          />
          <KpiTile
            title="Billable Hours"
            value={`${summary?.billableHoursThisMonth ?? 0}h`}
            caption={
              period === "week" ? "This week"
              : period === "quarter" ? "This quarter"
              : period === "ytd" ? "Year to date"
              : "This month"
            }
            icon={Clock}
            status="neutral"
            href="/time"
            isLoading={isLoadingSummary}
            testId="kpi-billable-hours"
          />
          <KpiTile
            title="Team Utilization"
            value={`${utilPct}%`}
            caption={
              utilPct > 100
                ? "Over capacity — target 70–90%"
                : utilPct > 90
                  ? "Over target — aim for 70–90%"
                  : utilPct >= 70
                    ? `On target · across ${summary?.totalProjects ?? 0} projects`
                    : `Below target · ${summary?.totalProjects ?? 0} projects`
            }
            icon={Users}
            status={isLoadingSummary ? "neutral" : utilizationStatus(utilPct)}
            href="/reports"
            isLoading={isLoadingSummary}
            testId="kpi-utilization"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2" data-testid="card-portfolio-health">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Portfolio Health</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {portfolioTotal} project{portfolioTotal === 1 ? "" : "s"} by health status
                </p>
              </div>
              <Link href="/reports">
                <Button variant="ghost" size="sm" className="gap-1">
                  Details <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {portfolioTotal === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  No active projects to show.
                </div>
              ) : (
                <>
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                    {onTrack > 0 && (
                      <div
                        className="bg-emerald-500"
                        style={{ width: `${pct(onTrack)}%` }}
                        title={`On Track: ${onTrack}`}
                      />
                    )}
                    {atRisk > 0 && (
                      <div
                        className="bg-amber-500"
                        style={{ width: `${pct(atRisk)}%` }}
                        title={`At Risk: ${atRisk}`}
                      />
                    )}
                    {offTrack > 0 && (
                      <div
                        className="bg-red-500"
                        style={{ width: `${pct(offTrack)}%` }}
                        title={`Off Track: ${offTrack}`}
                      />
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <HealthRow color="emerald" label="On Track" count={onTrack} pct={pct(onTrack)} />
                    <HealthRow
                      color="amber"
                      label="At Risk"
                      count={atRisk}
                      pct={pct(atRisk)}
                      names={atRiskOnly.map((p) => p.projectName)}
                    />
                    <HealthRow
                      color="red"
                      label="Off Track"
                      count={offTrack}
                      pct={pct(offTrack)}
                      names={offTrackProjects.map((p) => p.projectName)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Link href="/projects" className="block">
            <Card
              className="h-full cursor-pointer hover:shadow-md transition-all"
              data-testid="card-cr-impact"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Budget (incl. CRs)
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {crImpact === undefined ? (
                  <div className="space-y-2">
                    <Skeleton className="h-9 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold tracking-tight">
                      {formatCurrency(crImpact.revised)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 space-y-1">
                      <div>Original {formatCurrency(crImpact.originalBudget)}</div>
                      {crImpact.crAdditions > 0 && (
                        <div className="text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(crImpact.crAdditions)} from approved CRs
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Needs Attention</CardTitle>
            </CardHeader>
            <CardContent>
              {attentionItems.length === 0 ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900/50">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-900 dark:text-green-200">All clear!</p>
                    <p className="text-xs text-green-700 dark:text-green-400">
                      No projects at risk or overdue invoices.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {attentionItems.map((item, i) => (
                    <Link key={i} href={item.href}>
                      <div
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:opacity-90 transition-opacity ${
                          item.color === "amber"
                            ? "border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50"
                            : "border-destructive/20 bg-destructive/10"
                        }`}
                      >
                        {item.color === "amber" ? (
                          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                        )}
                        <div>
                          <p
                            className={`text-sm font-medium ${
                              item.color === "amber"
                                ? "text-amber-900 dark:text-amber-200"
                                : "text-destructive"
                            }`}
                          >
                            {item.label}
                          </p>
                          <p
                            className={`text-xs ${
                              item.color === "amber"
                                ? "text-amber-700 dark:text-amber-400"
                                : "text-destructive/80"
                            }`}
                          >
                            {item.detail}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/time">
                  <Button variant="outline" className="w-full justify-start">
                    <Clock className="mr-2 h-4 w-4" /> Log Time
                  </Button>
                </Link>
                <Link href="/finance">
                  <Button variant="outline" className="w-full justify-start">
                    <DollarSign className="mr-2 h-4 w-4" /> Create Invoice
                  </Button>
                </Link>
                <Link href="/resources">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" /> Assign Resource
                  </Button>
                </Link>
                <Link href="/projects">
                  <Button variant="outline" className="w-full justify-start">
                    <Briefcase className="mr-2 h-4 w-4" /> View Projects
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-recent-activity">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <span className="text-xs text-muted-foreground">Last 5</span>
            </CardHeader>
            <CardContent>
              {isLoadingActivity ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !activities || activities.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No recent activity.
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="h-7 w-7 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        {activity.type === "project_update" ? (
                          <Briefcase className="h-3.5 w-3.5" />
                        ) : activity.type === "time_logged" ? (
                          <Clock className="h-3.5 w-3.5" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-snug">
                          <span className="text-muted-foreground">{activity.description}</span>
                          {activity.projectName && (
                            <span className="font-medium text-foreground"> {activity.projectName}</span>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {timeAgo(activity.timestamp as unknown as string)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <PlannedVsActualCard />
      </div>
    </Layout>
  );
}

function PlannedVsActualCard() {
  const { data, isLoading } = useQuery<{ projectId: number; projectName: string; planned: number; actual: number; etc: number; eac: number }[]>({
    queryKey: ["dashboard-planned-vs-actual"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/planned-vs-actual", { headers: authHeaders() });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const totals = (data ?? []).reduce(
    (acc, p) => ({ planned: acc.planned + p.planned, actual: acc.actual + p.actual, etc: acc.etc + p.etc, eac: acc.eac + p.eac }),
    { planned: 0, actual: 0, etc: 0, eac: 0 }
  );
  const burnPct = totals.planned > 0 ? Math.round((totals.actual / totals.planned) * 100) : 0;

  return (
    <Card data-testid="card-planned-vs-actual">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Planned vs Actual Hours</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Aggregated across all active projects</p>
        </div>
        <BarChart2 className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-3 w-48" /></div>
        ) : (data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No active projects with hour data yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Planned</p>
                <p className="text-lg font-bold tabular-nums">{totals.planned.toFixed(0)}h</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Actual</p>
                <p className="text-lg font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{totals.actual.toFixed(0)}h</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">ETC</p>
                <p className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">{totals.etc.toFixed(0)}h</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">EAC</p>
                <p className="text-lg font-bold tabular-nums text-slate-700 dark:text-slate-300">{totals.eac.toFixed(0)}h</p>
              </div>
            </div>
            <div className="space-y-1 mb-4">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Burn {burnPct}%</span>
                <span>{totals.actual.toFixed(0)}h of {totals.planned.toFixed(0)}h planned</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all ${burnPct > 100 ? "bg-red-500" : burnPct > 80 ? "bg-amber-500" : "bg-indigo-500"}`}
                  style={{ width: `${Math.min(burnPct, 100)}%` }}
                />
              </div>
            </div>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {(data ?? []).map(p => (
                <div key={p.projectId} className="flex items-center justify-between text-xs py-0.5 gap-2">
                  <span className="truncate text-muted-foreground flex-1 min-w-0">{p.projectName}</span>
                  <div className="flex items-center gap-3 shrink-0 tabular-nums text-right">
                    <span>{p.actual.toFixed(0)}h / {p.planned.toFixed(0)}h</span>
                    <span className={p.etc <= 0 ? "text-red-500" : "text-muted-foreground"}>ETC {p.etc.toFixed(0)}h</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function HealthRow({
  color,
  label,
  count,
  pct,
  names,
}: {
  color: "emerald" | "amber" | "red";
  label: string;
  count: number;
  pct: number;
  names?: string[];
}) {
  const dot =
    color === "emerald"
      ? "bg-emerald-500"
      : color === "amber"
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-semibold tabular-nums">{count}</span>
        <span className="text-xs text-muted-foreground">({pct}%)</span>
      </div>
      {names && names.length > 0 && (
        <p className="text-xs text-muted-foreground line-clamp-2 pl-4">{names.join(", ")}</p>
      )}
    </div>
  );
}
