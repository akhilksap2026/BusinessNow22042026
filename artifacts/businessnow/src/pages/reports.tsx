import { useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
  ResponsiveContainer, LineChart, Line, Cell,
} from "recharts";

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

export default function Reports() {
  const { data: utilization, isLoading: isLoadingUtilization } = useGetUtilizationReport();
  const { data: revenue, isLoading: isLoadingRevenue } = useGetRevenueReport();
  const { data: health, isLoading: isLoadingHealth } = useGetProjectHealthReport();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        </div>

        <Tabs defaultValue="budget" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="budget">Budget vs Actuals</TabsTrigger>
            <TabsTrigger value="burndown">Burn-Down</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="utilization">Utilization</TabsTrigger>
            <TabsTrigger value="health">Project Health</TabsTrigger>
          </TabsList>

          <TabsContent value="budget" className="space-y-4 m-0">
            <BudgetSummaryCards />
            <BudgetVsActualsChart />
          </TabsContent>

          <TabsContent value="burndown" className="space-y-4 m-0">
            <BurnDownChart />
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6 m-0">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Revenue by Month</CardTitle>
                <CardDescription>Invoiced vs Collected revenue over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {isLoadingRevenue ? <ChartSkeleton /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenue?.byMonth} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} />
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
              <CardHeader>
                <CardTitle>Team Utilization Trend</CardTitle>
                <CardDescription>Average utilization percentage over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {isLoadingUtilization ? <ChartSkeleton /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={utilization?.byMonth} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} />
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
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
