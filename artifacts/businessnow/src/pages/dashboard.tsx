import { useState } from "react";
import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import {
  useGetDashboardSummary,
  useGetDashboardActivity,
  useGetProjectHealthReport,
  useListInvoices,
} from "@workspace/api-client-react";
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
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { authHeaders } from "@/lib/auth-headers";
import { OnboardingChecklist } from "@/components/onboarding-checklist";

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
  return "warning";
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

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>("month");

  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({ period });
  const { data: activities, isLoading: isLoadingActivity } = useGetDashboardActivity();
  const { data: healthReport } = useGetProjectHealthReport();
  const { data: invoices } = useListInvoices();

  const { data: crImpact } = useQuery<{ originalBudget: number; crAdditions: number; revised: number }>({
    queryKey: ["dashboard-cr-impact"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/cr-impact", { headers: authHeaders() });
      if (!res.ok) return { originalBudget: 0, crAdditions: 0, revised: 0 };
      return res.json();
    },
  });

  const atRiskProjects = healthReport?.projects?.filter(
    (p) => p.health === "At Risk" || p.health === "Off Track",
  ) ?? [];
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

  const onTrack = healthReport?.onTrack ?? 0;
  const atRisk = healthReport?.atRisk ?? 0;
  const offTrack = healthReport?.offTrack ?? 0;
  const portfolioTotal = onTrack + atRisk + offTrack;
  const pct = (n: number) => (portfolioTotal > 0 ? Math.round((n / portfolioTotal) * 100) : 0);

  const offTrackProjects =
    healthReport?.projects?.filter((p) => p.health === "Off Track").slice(0, 3) ?? [];
  const atRiskOnly =
    healthReport?.projects?.filter((p) => p.health === "At Risk").slice(0, 3) ?? [];

  const utilPct = summary?.teamUtilization ?? 0;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          actions={
            <div className="flex items-center gap-2">
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
              <Link href="/projects">
                <Button>New Project</Button>
              </Link>
            </div>
          }
        />

        <OnboardingChecklist />

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
            caption={`Target 70-90% · across ${summary?.totalProjects ?? 0} projects`}
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
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
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
