import { useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/contexts/current-user";
import {
  CheckCircle, Clock, AlertTriangle, Activity,
  ArrowRight, Calendar, Building2, Briefcase,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

type PortalProject = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  health: string;
  startDate: string | null;
  dueDate: string | null;
  overallProgress: number;
  totalTasks: number;
  completedTasks: number;
  accountName: string | null;
  accountLogoUrl: string | null;
  portalTheme: { primaryColor: string; accentColor: string; logoUrl: string | null };
};

const HEALTH_MAP: Record<string, { label: string; color: string }> = {
  "On Track": { label: "On Track", color: "text-emerald-700 bg-emerald-50" },
  "At Risk": { label: "At Risk", color: "text-amber-700 bg-amber-50" },
  "Off Track": { label: "Off Track", color: "text-red-700 bg-red-50" },
  Green: { label: "On Track", color: "text-emerald-700 bg-emerald-50" },
  Yellow: { label: "At Risk", color: "text-amber-700 bg-amber-50" },
  Red: { label: "Off Track", color: "text-red-700 bg-red-50" },
};

export default function PortalDashboard() {
  const { currentUser } = useCurrentUser();

  const { data: projects = [], isLoading, isError } = useQuery<PortalProject[]>({
    queryKey: ["portal-auth-projects"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/portal-auth/projects`, {
        headers: { "x-user-role": "Customer", "x-user-id": String(currentUser?.id ?? 0) },
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!currentUser?.id,
  });

  useEffect(() => { document.title = "Client Portal — BusinessNow"; }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading your projects…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">BN</span>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">BusinessNow · Client Portal</p>
              <p className="text-sm font-semibold text-slate-800 leading-tight">Welcome, {currentUser?.name}</p>
            </div>
          </div>
          <div className="text-xs text-slate-400">
            {projects.length} active project{projects.length !== 1 ? "s" : ""}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center mb-6">
            <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-700 text-sm font-medium">Unable to load projects. Please try again later.</p>
          </div>
        )}

        {projects.length === 0 && !isError && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-700 mb-2">No projects yet</h2>
            <p className="text-slate-500 text-sm">You haven't been added to any projects. Contact your project manager.</p>
          </div>
        )}

        <div className="grid gap-5">
          {projects.map(project => {
            const health = HEALTH_MAP[project.health] ?? HEALTH_MAP["On Track"];
            const primary = project.portalTheme?.primaryColor ?? "#4f46e5";
            return (
              <Link key={project.id} href={`/portal/projects/${project.id}`}>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="h-1.5" style={{ background: primary }} />
                  <div className="px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {project.accountName && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <Building2 className="h-3 w-3" />
                              {project.accountName}
                            </div>
                          )}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${health.color}`}>
                            {health.label}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">{project.name}</h3>
                        {project.description && (
                          <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{project.description}</p>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors flex-shrink-0 mt-1" />
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-slate-500">{project.completedTasks} of {project.totalTasks} tasks</span>
                        <span className="text-xs font-semibold" style={{ color: primary }}>{project.overallProgress}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${project.overallProgress}%`, background: primary }} />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
                      {project.startDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(project.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      )}
                      {project.dueDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due {new Date(project.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      )}
                      <Badge variant="outline" className="text-[10px] py-0">{project.status}</Badge>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      <footer className="text-center text-xs text-slate-400 pb-6 mt-4">
        Powered by <span className="font-semibold text-slate-500">BusinessNow PSA</span> · Client Portal
      </footer>
    </div>
  );
}
