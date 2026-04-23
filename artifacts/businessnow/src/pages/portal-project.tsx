import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/contexts/current-user";
import {
  CheckCircle, Clock, AlertTriangle, Activity,
  FileText, ArrowLeft, ChevronDown, ChevronRight,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

type PortalTask = {
  id: number;
  name: string;
  status: string;
  dueDate: string | null;
  priority: string | null;
  isMine: boolean;
};

type PortalPhase = {
  id: number;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  tasks: PortalTask[];
};

type PortalMilestone = {
  id: number;
  name: string;
  status: string;
  dueDate: string | null;
};

type PortalDoc = { id: number; title: string; type: string | null; updatedAt: string };

type PortalTheme = { primaryColor: string; accentColor: string; logoUrl: string | null; tabVisibility: { plan: boolean; updates: boolean; spaces: boolean } };

type PortalProjectDetail = {
  project: { id: number; name: string; description: string | null; status: string; health: string; startDate: string | null; dueDate: string | null; accountName: string | null };
  overallProgress: number;
  totalTasks: number;
  completedTasks: number;
  phases: PortalPhase[];
  milestones: PortalMilestone[];
  documents: PortalDoc[];
  portalTheme: PortalTheme;
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  Completed: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  "In Progress": <Activity className="h-4 w-4 text-blue-500" />,
  "Not Started": <Clock className="h-4 w-4 text-slate-400" />,
  Blocked: <AlertTriangle className="h-4 w-4 text-red-500" />,
};

const STATUS_CLS: Record<string, string> = {
  Completed: "bg-emerald-50 text-emerald-700",
  "In Progress": "bg-blue-50 text-blue-700",
  "Not Started": "bg-slate-100 text-slate-500",
  Blocked: "bg-red-50 text-red-600",
};

export default function PortalProject() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { currentUser } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [collapsedPhases, setCollapsedPhases] = useState<Set<number>>(new Set());

  const { data, isLoading, isError } = useQuery<PortalProjectDetail>({
    queryKey: ["portal-auth-project", projectId],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/portal-auth/projects/${projectId}`, {
        headers: { "x-user-role": "Customer", "x-user-id": String(currentUser?.id ?? 0) },
      });
      if (!r.ok) throw new Error("Not authorized");
      return r.json();
    },
    enabled: !!currentUser?.id && !!projectId,
  });

  const completeTask = useMutation({
    mutationFn: async (taskId: number) => {
      const r = await fetch(`${BASE}/api/portal-auth/tasks/${taskId}/complete`, {
        method: "PATCH",
        headers: { "x-user-role": "Customer", "x-user-id": String(currentUser?.id ?? 0) },
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-auth-project", projectId] });
      toast({ title: "Task marked complete!" });
    },
    onError: () => {
      toast({ title: "Could not complete task", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (data?.project?.name) document.title = `${data.project.name} — Client Portal`;
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading project…</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto p-8">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-800 mb-2">Project Not Available</h1>
          <p className="text-slate-500 text-sm mb-4">You may not have access to this project.</p>
          <Link href="/portal/dashboard">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Portal
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { project, overallProgress, totalTasks, completedTasks, phases, milestones, documents, portalTheme } = data;
  const primary = portalTheme?.primaryColor ?? "#4f46e5";

  function togglePhase(id: number) {
    setCollapsedPhases(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/portal/dashboard">
            <Button variant="ghost" size="sm" className="gap-2 text-slate-500 hover:text-slate-800">
              <ArrowLeft className="h-4 w-4" /> Portal
            </Button>
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">BusinessNow · Client Portal</p>
            <p className="text-sm font-semibold text-slate-800 leading-tight">{project.accountName ?? "Project"}</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${portalTheme?.accentColor ?? "#7c3aed"})` }}>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.description && <p className="text-white/80 text-sm mt-1 line-clamp-2">{project.description}</p>}
            <div className="flex flex-wrap items-center gap-6 mt-4 text-sm text-white/80">
              {project.startDate && <div><span className="block text-xs opacity-70 uppercase tracking-wide">Start</span><span className="font-medium text-white">{new Date(project.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></div>}
              {project.dueDate && <div><span className="block text-xs opacity-70 uppercase tracking-wide">Due</span><span className="font-medium text-white">{new Date(project.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></div>}
              <div><span className="block text-xs opacity-70 uppercase tracking-wide">Status</span><span className="font-medium text-white">{project.status}</span></div>
            </div>
          </div>
          <div className="px-8 py-5 border-b">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Overall Progress</span>
              <span className="text-sm font-bold" style={{ color: primary }}>{overallProgress}%</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${overallProgress}%`, background: primary }} />
            </div>
            <p className="text-xs text-slate-400 mt-2">{completedTasks} of {totalTasks} tasks completed</p>
          </div>
          <div className="grid grid-cols-3 divide-x text-center">
            <div className="px-6 py-4"><p className="text-xl font-bold text-slate-800">{completedTasks}/{totalTasks}</p><p className="text-xs text-slate-400 mt-0.5">Tasks Done</p></div>
            <div className="px-6 py-4"><p className="text-xl font-bold text-slate-800">{milestones.filter(m => m.status === "Completed").length}/{milestones.length}</p><p className="text-xs text-slate-400 mt-0.5">Milestones</p></div>
            <div className="px-6 py-4"><p className="text-xl font-bold" style={{ color: primary }}>{overallProgress}%</p><p className="text-xs text-slate-400 mt-0.5">Completion</p></div>
          </div>
        </div>

        {phases.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">Project Plan</h2>
            <div className="space-y-3">
              {phases.map(phase => {
                const collapsed = collapsedPhases.has(phase.id);
                const phaseDone = phase.tasks.filter(t => t.status === "Completed").length;
                return (
                  <div key={phase.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <button
                      onClick={() => togglePhase(phase.id)}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        {collapsed ? <ChevronRight className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                        <span className="font-medium text-slate-800">{phase.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLS[phase.status] ?? "bg-slate-100 text-slate-500"}`}>{phase.status}</span>
                      </div>
                      <span className="text-xs text-slate-400">{phaseDone}/{phase.tasks.length} tasks</span>
                    </button>
                    {!collapsed && phase.tasks.length > 0 && (
                      <div className="border-t divide-y">
                        {phase.tasks.map(task => (
                          <div key={task.id} className={cn("flex items-center justify-between px-5 py-3 text-sm", task.isMine && task.status !== "Completed" && "bg-indigo-50/40")}>
                            <div className="flex items-center gap-3">
                              {STATUS_ICON[task.status] ?? STATUS_ICON["Not Started"]}
                              <div>
                                <span className={cn("text-slate-800", task.status === "Completed" && "line-through text-slate-400")}>{task.name}</span>
                                {task.isMine && <span className="ml-2 text-[10px] text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded-full">Assigned to you</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {task.dueDate && <span className="text-xs text-slate-400">{new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                              {task.isMine && task.status !== "Completed" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1.5 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                  onClick={() => completeTask.mutate(task.id)}
                                  disabled={completeTask.isPending}
                                >
                                  <CheckSquare className="h-3.5 w-3.5" /> Mark Done
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                        {phase.tasks.length === 0 && (
                          <p className="text-xs text-slate-400 px-5 py-3">No shared tasks in this phase.</p>
                        )}
                      </div>
                    )}
                    {!collapsed && phase.tasks.length === 0 && (
                      <p className="text-xs text-slate-400 px-5 py-3 border-t">No shared tasks in this phase.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {milestones.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">Milestones</h2>
            <div className="space-y-2">
              {milestones.map(m => (
                <div key={m.id} className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    {STATUS_ICON[m.status] ?? STATUS_ICON["Not Started"]}
                    <div>
                      <p className="text-sm font-medium text-slate-800">{m.name}</p>
                      {m.dueDate && <p className="text-xs text-slate-400 mt-0.5">Due {new Date(m.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>}
                    </div>
                  </div>
                  <Badge variant="outline" className={STATUS_CLS[m.status] ?? ""}>{m.status}</Badge>
                </div>
              ))}
            </div>
          </section>
        )}

        {documents.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">Documents</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {documents.map(doc => (
                <div key={doc.id} className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-3 shadow-sm">
                  <div className="h-9 w-9 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{doc.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{doc.type ?? "Document"} · Updated {new Date(doc.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="text-center text-xs text-slate-400 pb-4">
          Powered by <span className="font-semibold text-slate-500">BusinessNow PSA</span> · This is a client-facing view · Financial data is not shown
        </footer>
      </main>
    </div>
  );
}
