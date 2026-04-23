import { useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getPortal } from "@workspace/api-client-react";
import { CheckCircle, Clock, FileText, AlertTriangle, Activity } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

const HEALTH_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  Green: { bg: "bg-emerald-500", text: "text-emerald-700", label: "On Track" },
  Yellow: { bg: "bg-amber-400", text: "text-amber-700", label: "At Risk" },
  Red: { bg: "bg-red-500", text: "text-red-700", label: "Off Track" },
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  Completed: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  "In Progress": <Activity className="h-4 w-4 text-blue-500" />,
  "Not Started": <Clock className="h-4 w-4 text-slate-400" />,
  Blocked: <AlertTriangle className="h-4 w-4 text-red-500" />,
};

export default function PortalPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["portal", token],
    queryFn: () => getPortal(token),
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (data?.project?.name) {
      document.title = `${data.project.name} — Client Portal`;
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading project portal…</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto p-8">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-800 mb-2">Portal Not Available</h1>
          <p className="text-slate-500 text-sm">This portal link may have expired or been revoked. Please contact your project manager for an updated link.</p>
        </div>
      </div>
    );
  }

  const { project, milestones, documents, overallProgress, totalTasks, completedTasks } = data;
  const health = HEALTH_COLORS[project.health] ?? HEALTH_COLORS.Green;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">BN</span>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">BusinessNow · Client Portal</p>
              <p className="text-sm font-semibold text-slate-800 leading-tight">{project.accountName ?? "Project Update"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${health.text} bg-opacity-10`}>
              <span className={`h-2 w-2 rounded-full ${health.bg}`} />
              {health.label}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Project Hero */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-6 text-white">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-indigo-100 text-sm mt-1 line-clamp-2">{project.description}</p>
            )}
            <div className="flex items-center gap-6 mt-4 text-sm text-indigo-100">
              <div>
                <span className="block text-xs opacity-70 uppercase tracking-wide">Start</span>
                <span className="font-medium text-white">{project.startDate ? new Date(project.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
              </div>
              <div>
                <span className="block text-xs opacity-70 uppercase tracking-wide">Due</span>
                <span className="font-medium text-white">{project.dueDate ? new Date(project.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
              </div>
              <div>
                <span className="block text-xs opacity-70 uppercase tracking-wide">Status</span>
                <span className="font-medium text-white">{project.status}</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="px-8 py-5 border-b">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Overall Progress</span>
              <span className="text-sm font-bold text-indigo-600">{overallProgress}%</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">{completedTasks} of {totalTasks} tasks completed</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 divide-x">
            <Stat label="Tasks Done" value={`${completedTasks}/${totalTasks}`} />
            <Stat label="Milestones" value={`${milestones.filter(m => m.status === "Completed").length}/${milestones.length}`} />
            <Stat label="Completion" value={`${overallProgress}%`} highlight />
          </div>
        </div>

        {/* Milestones */}
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
                      {m.dueDate && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Due {new Date(m.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Documents */}
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
                    <p className="text-xs text-slate-400 mt-0.5">
                      {doc.type} · Updated {new Date(doc.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-slate-400 pb-4">
          <p>Powered by <span className="font-semibold text-slate-500">BusinessNow PSA</span> · This is a read-only view shared by your project team</p>
        </footer>
      </main>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="px-6 py-4 text-center">
      <p className={`text-xl font-bold ${highlight ? "text-indigo-600" : "text-slate-800"}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

