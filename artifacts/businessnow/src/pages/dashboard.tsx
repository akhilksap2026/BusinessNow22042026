import { Layout } from "@/components/layout";
import { useGetDashboardSummary, useGetDashboardActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, DollarSign, Clock, Users, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: activities, isLoading: isLoadingActivity } = useGetDashboardActivity();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-2">
            <Link href="/projects">
              <Button>New Project</Button>
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{summary?.activeProjects}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary?.atRiskProjects} at risk
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">${summary?.totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ${summary?.outstandingInvoices.toLocaleString()} outstanding
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Billable Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{summary?.billableHoursThisMonth}h</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This month
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Utilization</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{summary?.teamUtilization}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average across {summary?.totalProjects} projects
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Activity */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingActivity ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activities?.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">No recent activity.</div>
              ) : (
                <div className="space-y-6">
                  {activities?.map((activity) => (
                    <div key={activity.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          {activity.type === 'project_update' ? <Briefcase className="h-4 w-4" /> :
                           activity.type === 'time_logged' ? <Clock className="h-4 w-4" /> :
                           <AlertCircle className="h-4 w-4" />}
                        </div>
                        <div className="w-px h-full bg-border mt-2" />
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm">
                          <span className="font-medium text-foreground">{activity.userName}</span>{" "}
                          <span className="text-muted-foreground">{activity.description}</span>
                          {activity.projectName && (
                            <span className="font-medium text-foreground"> {activity.projectName}</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions / At Risk */}
          <div className="space-y-6 col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Needs Attention</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-200">2 Projects Over Budget</p>
                      <p className="text-xs text-amber-700 dark:text-amber-400">Acme Corp Redesign, Nexus API</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/10">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-destructive">4 Overdue Invoices</p>
                      <p className="text-xs text-destructive/80">Totaling $45,000</p>
                    </div>
                  </div>
                </div>
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
          </div>
        </div>
      </div>
    </Layout>
  );
}
