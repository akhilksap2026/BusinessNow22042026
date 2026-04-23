import { useState } from "react";
import { Layout } from "@/components/layout";
import { useGetProject, useGetProjectSummary, useListTasks, useListUsers, useListAllocations, useCreateAllocation, useUpdateAllocation, useDeleteAllocation, useGetProjectCsatSummary, useUpdateProject, useCreateResourceRequest, useUpdateTask, useListTimeEntries, getGetProjectQueryKey, getGetProjectSummaryQueryKey, getListTasksQueryKey, getListAllocationsQueryKey, getGetProjectCsatSummaryQueryKey, listPortalTokens, createPortalToken } from "@workspace/api-client-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { StatusBadge, HealthBadge } from "@/pages/projects";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Calendar, Clock, DollarSign, Users, Target, Star, MessageSquare, Plus, Pencil, Trash2, FileText, FileQuestion, Share2, Copy, Check, BarChart2, Settings2, PackagePlus, LayoutList, Kanban, TrendingUp, LayoutTemplate } from "lucide-react";
import { ApplyTemplateModal } from "@/components/apply-template-modal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ProjectPhases } from "@/components/project-phases";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ProjectDocuments } from "@/components/project-documents";
import { ProjectForms } from "@/components/project-forms";
import ProjectGantt from "@/components/project-gantt";

export function TaskStatusBadge({ status }: { status: string }) {
  const getVariant = (s: string) => {
    switch (s) {
      case "Completed": return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
      case "In Progress": return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
      case "Overdue": return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
      default: return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
    }
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getVariant(status)}`}>{status}</span>;
}

export function TaskPriorityBadge({ priority }: { priority: string }) {
  const getVariant = (s: string) => {
    switch (s) {
      case "Urgent": return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
      case "High": return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
      case "Medium": return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
      default: return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
    }
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getVariant(priority)}`}>{priority}</span>;
}

export default function ProjectDetail() {
  const { id } = useParams();
  const projectId = parseInt(id || "0", 10);
  
  const { data: project, isLoading: isLoadingProject } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });
  
  const { data: summary, isLoading: isLoadingSummary } = useGetProjectSummary(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectSummaryQueryKey(projectId) }
  });

  const { data: tasks, isLoading: isLoadingTasks } = useListTasks({ projectId }, {
    query: { enabled: !!projectId, queryKey: getListTasksQueryKey({ projectId }) }
  });

  const { data: allocations, isLoading: isLoadingAllocations } = useListAllocations({ projectId }, {
    query: { enabled: !!projectId, queryKey: getListAllocationsQueryKey({ projectId }) }
  });

  const { data: projectTimeEntries } = useListTimeEntries({ projectId }, {
    query: { enabled: !!projectId }
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createAllocation = useCreateAllocation();
  const updateAllocation = useUpdateAllocation();
  const deleteAllocation = useDeleteAllocation();
  const updateProject = useUpdateProject();
  const createResourceRequest = useCreateResourceRequest();

  const [shareOpen, setShareOpen] = useState(false);
  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false);
  const [taskView, setTaskView] = useState<"list" | "board">("list");
  const updateTask = useUpdateTask();

  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [editProjectForm, setEditProjectForm] = useState({
    name: "", status: "", health: "", budget: "", description: "",
  });

  const [coDialogOpen, setCoDialogOpen] = useState(false);
  const [coForm, setCoForm] = useState({ title: "", description: "", amount: "", requestedDate: "", status: "Pending" });

  async function handleCreateCO() {
    if (!coForm.title) return;
    try {
      await fetch(`/api/projects/${projectId}/change-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...coForm, amount: parseFloat(coForm.amount) || 0 }),
      });
      refetchChangeOrders();
      setCoDialogOpen(false);
      setCoForm({ title: "", description: "", amount: "", requestedDate: "", status: "Pending" });
      toast({ title: "Change order created" });
    } catch {
      toast({ title: "Failed to create change order", variant: "destructive" });
    }
  }

  async function handleUpdateCOStatus(coId: number, status: string) {
    try {
      await fetch(`/api/change-orders/${coId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      refetchChangeOrders();
    } catch {
      toast({ title: "Failed to update change order", variant: "destructive" });
    }
  }

  async function handleDeleteCO(coId: number) {
    try {
      await fetch(`/api/change-orders/${coId}`, { method: "DELETE" });
      refetchChangeOrders();
    } catch {
      toast({ title: "Failed to delete change order", variant: "destructive" });
    }
  }

  function openEditProject() {
    if (!project) return;
    setEditProjectForm({
      name: project.name,
      status: project.status,
      health: project.health,
      budget: project.budget.toString(),
      description: project.description ?? "",
    });
    setEditProjectOpen(true);
  }

  async function handleSaveProject() {
    try {
      await updateProject.mutateAsync({
        id: projectId,
        data: {
          name: editProjectForm.name,
          status: editProjectForm.status,
          health: editProjectForm.health,
          budget: parseFloat(editProjectForm.budget) || project?.budget,
          description: editProjectForm.description,
        } as any,
      });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      toast({ title: "Project updated" });
      setEditProjectOpen(false);
    } catch {
      toast({ title: "Failed to update project", variant: "destructive" });
    }
  }

  const [resReqOpen, setResReqOpen] = useState(false);
  const [resReqForm, setResReqForm] = useState({
    role: "", startDate: "", endDate: "", hoursPerWeek: "40", priority: "Medium", notes: "",
  });

  async function handleSaveResReq() {
    if (!resReqForm.role || !resReqForm.startDate || !resReqForm.endDate) return;
    try {
      await createResourceRequest.mutateAsync({
        data: {
          projectId,
          requestedByUserId: 1,
          role: resReqForm.role,
          startDate: resReqForm.startDate,
          endDate: resReqForm.endDate,
          hoursPerWeek: parseFloat(resReqForm.hoursPerWeek) || 40,
          priority: resReqForm.priority,
          notes: resReqForm.notes || undefined,
        },
      });
      toast({ title: "Resource request submitted" });
      setResReqOpen(false);
      setResReqForm({ role: "", startDate: "", endDate: "", hoursPerWeek: "40", priority: "Medium", notes: "" });
    } catch {
      toast({ title: "Failed to submit resource request", variant: "destructive" });
    }
  }
  const [copied, setCopied] = useState(false);
  const [creatingToken, setCreatingToken] = useState(false);

  const { data: portalTokens, refetch: refetchTokens } = useQuery({
    queryKey: ["portal-tokens", projectId],
    queryFn: () => listPortalTokens(projectId),
    enabled: shareOpen && !!projectId,
  });

  const activeToken = portalTokens?.find(t => t.isActive);
  const portalUrl = activeToken
    ? `${window.location.origin}/portal/${activeToken.token}`
    : null;

  async function handleCreateToken() {
    setCreatingToken(true);
    try {
      await createPortalToken(projectId, { label: "Client Portal" });
      refetchTokens();
    } finally {
      setCreatingToken(false);
    }
  }

  function handleCopyLink() {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const [allocDialogOpen, setAllocDialogOpen] = useState(false);
  const [editAllocId, setEditAllocId] = useState<number | null>(null);
  const [deleteAllocId, setDeleteAllocId] = useState<number | null>(null);
  const [allocForm, setAllocForm] = useState({
    userId: "",
    role: "",
    startDate: "",
    endDate: "",
    hoursPerWeek: "40",
    isSoftAllocation: false,
    isTimesheetApprover: false,
    isLeaveApprover: false,
  });

  function openNewAlloc() {
    setEditAllocId(null);
    setAllocForm({ userId: "", role: "", startDate: "", endDate: "", hoursPerWeek: "40", isSoftAllocation: false, isTimesheetApprover: false, isLeaveApprover: false });
    setAllocDialogOpen(true);
  }

  function openEditAlloc(alloc: { id: number; userId: number | null; role: string; startDate: string; endDate: string; hoursPerWeek: number; isSoftAllocation?: boolean; isTimesheetApprover?: boolean; isLeaveApprover?: boolean }) {
    setEditAllocId(alloc.id);
    setAllocForm({
      userId: alloc.userId?.toString() ?? "",
      role: alloc.role,
      startDate: alloc.startDate,
      endDate: alloc.endDate,
      hoursPerWeek: alloc.hoursPerWeek.toString(),
      isSoftAllocation: alloc.isSoftAllocation ?? false,
      isTimesheetApprover: alloc.isTimesheetApprover ?? false,
      isLeaveApprover: alloc.isLeaveApprover ?? false,
    });
    setAllocDialogOpen(true);
  }

  async function handleSaveAlloc() {
    if (!allocForm.role || !allocForm.startDate || !allocForm.endDate) return;
    const payload = {
      projectId,
      userId: allocForm.userId ? parseInt(allocForm.userId) : undefined,
      role: allocForm.role,
      startDate: allocForm.startDate,
      endDate: allocForm.endDate,
      hoursPerWeek: parseFloat(allocForm.hoursPerWeek) || 40,
      isSoftAllocation: allocForm.isSoftAllocation,
      isTimesheetApprover: allocForm.isTimesheetApprover,
      isLeaveApprover: allocForm.isLeaveApprover,
    };
    try {
      if (editAllocId) {
        await updateAllocation.mutateAsync({ id: editAllocId, data: payload });
      } else {
        await createAllocation.mutateAsync({ data: payload as any });
      }
      queryClient.invalidateQueries({ queryKey: getListAllocationsQueryKey({ projectId }) });
      toast({ title: editAllocId ? "Allocation updated" : "Allocation added" });
      setAllocDialogOpen(false);
    } catch {
      toast({ title: "Failed to save allocation", variant: "destructive" });
    }
  }

  async function handleDeleteAlloc(id: number) {
    try {
      await deleteAllocation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListAllocationsQueryKey({ projectId }) });
      toast({ title: "Allocation removed" });
      setDeleteAllocId(null);
    } catch {
      toast({ title: "Failed to remove allocation", variant: "destructive" });
    }
  }

  const { data: csatSummary } = useGetProjectCsatSummary(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectCsatSummaryQueryKey(projectId) }
  });

  const { data: csatSurveys = [], refetch: refetchSurveys } = useQuery<any[]>({
    queryKey: ["csat-surveys", projectId],
    queryFn: async () => {
      const r = await fetch(`/api/projects/${projectId}/csat-surveys`);
      return r.json();
    },
    enabled: !!projectId,
  });

  const { data: changeOrders, refetch: refetchChangeOrders } = useQuery<any[]>({
    queryKey: ["change-orders", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/change-orders`);
      if (!res.ok) throw new Error("Failed to load change orders");
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: users } = useListUsers();

  const getUser = (userId: number) => users?.find(u => u.id === userId);

  if (isLoadingProject || isLoadingSummary) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-1/3" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Project not found</h2>
          <p className="text-muted-foreground mt-2">The project you are looking for does not exist or has been removed.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              <StatusBadge status={project.status} />
              <HealthBadge health={project.health} />
            </div>
            <p className="text-muted-foreground">{project.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setApplyTemplateOpen(true)} className="flex items-center gap-2 shrink-0">
              <LayoutTemplate className="h-4 w-4" />
              Apply Template
            </Button>
            <Button variant="outline" size="sm" onClick={openEditProject} className="flex items-center gap-2 shrink-0">
              <Settings2 className="h-4 w-4" />
              Edit Project
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)} className="flex items-center gap-2 shrink-0">
              <Share2 className="h-4 w-4" />
              Share with Client
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budget Used</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.budgetUsedPercent}%</div>
              <Progress value={summary?.budgetUsedPercent} className="h-2 mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                ${summary?.invoicedAmount.toLocaleString()} invoiced of ${project.budget.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hours Used</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.hoursUsedPercent}%</div>
              <Progress value={summary?.hoursUsedPercent} className="h-2 mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {project.trackedHours} of {project.budgetedHours} hours tracked
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{project.completion}%</div>
              <Progress value={project.completion} className="h-2 mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                Based on task completion
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Timeline</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.daysRemaining} days</div>
              <p className="text-xs text-muted-foreground mt-2">
                Remaining until {new Date(project.dueDate).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="team">Team & Allocations</TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
            <TabsTrigger value="csat" className="flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" />
              CSAT
              {csatSummary && csatSummary.totalResponses > 0 && (
                <span className="bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400 rounded-full text-xs px-1.5 py-0.5 leading-none">
                  {csatSummary.totalResponses}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="forms" className="flex items-center gap-1.5">
              <FileQuestion className="h-4 w-4" />
              Forms
            </TabsTrigger>
            <TabsTrigger value="gantt" className="flex items-center gap-1.5">
              <BarChart2 className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="time" className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Time
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="tasks" className="m-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Project Tasks</CardTitle>
                  <CardDescription>All tasks and phases for this project</CardDescription>
                </div>
                <div className="flex items-center gap-1 bg-muted rounded-md p-1">
                  <Button size="sm" variant={taskView === "list" ? "default" : "ghost"} className="h-7 px-2 gap-1.5" onClick={() => setTaskView("list")}>
                    <LayoutList className="h-3.5 w-3.5" /> List
                  </Button>
                  <Button size="sm" variant={taskView === "board" ? "default" : "ghost"} className="h-7 px-2 gap-1.5" onClick={() => setTaskView("board")}>
                    <Kanban className="h-3.5 w-3.5" /> Board
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {taskView === "list" ? (
                  <ProjectPhases projectId={projectId} />
                ) : (
                  <div className="overflow-x-auto pb-4">
                    <div className="flex gap-4 min-w-max">
                      {(["Not Started", "In Progress", "Blocked", "Completed"] as const).map(status => {
                        const colTasks = (tasks || []).filter((t: any) => t.status === status && !t.parentTaskId && !t.isMilestone);
                        const colors: Record<string, string> = {
                          "Not Started": "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
                          "In Progress": "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
                          "Blocked": "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
                          "Completed": "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
                        };
                        const nextStatus: Record<string, string> = {
                          "Not Started": "In Progress",
                          "In Progress": "Completed",
                          "Blocked": "In Progress",
                          "Completed": "Not Started",
                        };
                        return (
                          <div key={status} className="w-72 flex-shrink-0">
                            <div className={`flex items-center justify-between mb-3 px-2 py-1.5 rounded-md ${colors[status]}`}>
                              <span className="font-semibold text-sm">{status}</span>
                              <span className="text-xs bg-white/60 dark:bg-black/20 rounded-full px-2 py-0.5 font-medium">{colTasks.length}</span>
                            </div>
                            <div className="space-y-2">
                              {colTasks.map((task: any) => {
                                const subtaskCount = (tasks || []).filter((t: any) => t.parentTaskId === task.id).length;
                                const assignees = (task.assigneeIds || []).map((uid: number) => users?.find(u => u.id === uid)).filter(Boolean);
                                return (
                                  <div key={task.id} className="bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                                    <div className="font-medium text-sm mb-2">{task.name}</div>
                                    <div className="flex items-center gap-2 flex-wrap mb-2">
                                      <TaskPriorityBadge priority={task.priority} />
                                      {task.fromTemplate && (
                                        <Badge variant="outline" className="text-xs py-0 text-purple-700 border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800">
                                          <LayoutTemplate className="h-2.5 w-2.5 mr-0.5" /> Template
                                        </Badge>
                                      )}
                                      {subtaskCount > 0 && (
                                        <span className="text-xs text-muted-foreground">{subtaskCount} sub-task{subtaskCount > 1 ? "s" : ""}</span>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                      <div className="flex -space-x-1.5">
                                        {assignees.slice(0, 3).map((u: any) => (
                                          <Avatar key={u.id} className="h-5 w-5 border border-background">
                                            <AvatarFallback className="text-[9px]">{u.initials}</AvatarFallback>
                                          </Avatar>
                                        ))}
                                      </div>
                                      <button
                                        className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground underline"
                                        onClick={() => {
                                          updateTask.mutate({ id: task.id, data: { status: nextStatus[status] as any } });
                                          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
                                        }}
                                      >
                                        → {nextStatus[status]}
                                      </button>
                                    </div>
                                    {task.dueDate && (
                                      <div className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-0.5">
                                        <Calendar className="h-2.5 w-2.5" />
                                        {new Date(task.dueDate).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {colTasks.length === 0 && (
                                <div className="border border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground">No tasks</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="m-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Team Allocations</CardTitle>
                  <CardDescription>Resources assigned to this project</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setResReqOpen(true)}>
                    <PackagePlus className="h-4 w-4 mr-2" /> Request Resource
                  </Button>
                  <Button size="sm" onClick={openNewAlloc}>
                    <Plus className="h-4 w-4 mr-2" /> Add Allocation
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingAllocations ? (
                  <div className="space-y-4">
                    {[1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : allocations?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No team members allocated</p>
                    <p className="text-sm mt-1">Add allocations to assign team members and track capacity.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team Member</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead className="text-right">Hours/Week</TableHead>
                        <TableHead className="w-20" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allocations?.map(allocation => {
                        const user = getUser(allocation.userId);
                        return (
                          <TableRow key={allocation.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>{user?.initials ?? "?"}</AvatarFallback>
                                </Avatar>
                                <span>{user?.name ?? (allocation.userId ? `User ${allocation.userId}` : "Unassigned")}</span>
                              </div>
                            </TableCell>
                            <TableCell>{allocation.role}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={(allocation as any).isSoftAllocation ? "border-amber-400 text-amber-700 bg-amber-50" : "border-blue-400 text-blue-700 bg-blue-50"}>
                                {(allocation as any).isSoftAllocation ? "Soft" : "Hard"}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(allocation.startDate + "T00:00:00").toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(allocation.endDate + "T00:00:00").toLocaleDateString()}</TableCell>
                            <TableCell className="text-right font-medium">{allocation.hoursPerWeek}h</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 justify-end">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditAlloc({ id: allocation.id, userId: allocation.userId, role: allocation.role, startDate: allocation.startDate, endDate: allocation.endDate, hoursPerWeek: allocation.hoursPerWeek, isSoftAllocation: (allocation as any).isSoftAllocation ?? false, isTimesheetApprover: (allocation as any).isTimesheetApprover ?? false, isLeaveApprover: (allocation as any).isLeaveApprover ?? false })}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => setDeleteAllocId(allocation.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financials" className="m-0 space-y-4">
            {/* Financial Summary + Margin */}
            {(() => {
              const approvedCOs = (changeOrders ?? []).filter(co => co.status === "Approved");
              const coValue = approvedCOs.reduce((s: number, co: any) => s + Number(co.amount), 0);
              const revenue = project.budget + coValue;

              // Estimated cost from allocations (hours × weeks × costRate)
              const estimatedCost = (allocations ?? []).reduce((sum, a) => {
                const user = getUser(a.userId ?? 0);
                if (!user) return sum;
                const costRate = Number((user as any).costRate) || 0;
                const start = new Date(a.startDate + "T00:00:00");
                const end = new Date(a.endDate + "T00:00:00");
                const weeks = Math.max(0, (end.getTime() - start.getTime()) / (7 * 86400000));
                return sum + a.hoursPerWeek * weeks * costRate;
              }, 0);

              const margin = revenue - estimatedCost;
              const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
              const marginColor = marginPct >= 30 ? "text-green-600" : marginPct >= 10 ? "text-amber-600" : "text-red-600";

              return (
                <Card>
                  <CardHeader>
                    <CardTitle>Financial Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-3">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Base Budget</p>
                          <p className="text-2xl font-bold">${project.budget.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Approved Change Orders</p>
                          <p className="text-xl font-semibold text-green-700">+${coValue.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                          <p className="text-xl font-bold">${revenue.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Invoiced Amount</p>
                          <p className="text-xl font-semibold">${(summary?.invoicedAmount ?? 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Pending Amount</p>
                          <p className="text-xl font-semibold text-muted-foreground">${(summary?.pendingAmount ?? 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Billing Type</p>
                          <Badge variant="outline">{project.billingType}</Badge>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Est. Resource Cost</p>
                          <p className="text-xl font-semibold text-red-600">${estimatedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Gross Margin</p>
                          <p className={`text-xl font-bold ${marginColor}`}>${margin.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Margin %</p>
                          <p className={`text-2xl font-bold ${marginColor}`}>{marginPct.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Change Orders */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle>Change Orders</CardTitle>
                <Button size="sm" onClick={() => { setCoForm({ title: "", description: "", amount: "", requestedDate: "", status: "Pending" }); setCoDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> New Change Order
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {!changeOrders || changeOrders.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground text-sm">No change orders yet.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-24" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {changeOrders.map((co: any) => (
                        <TableRow key={co.id}>
                          <TableCell className="font-medium">{co.title}</TableCell>
                          <TableCell>
                            <Select value={co.status} onValueChange={val => handleUpdateCOStatus(co.id, val)}>
                              <SelectTrigger className="h-7 w-28 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {["Pending", "Approved", "Rejected"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>{co.requestedDate ? new Date(co.requestedDate + "T00:00:00").toLocaleDateString() : "—"}</TableCell>
                          <TableCell className="text-right font-medium">${Number(co.amount).toLocaleString()}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => handleDeleteCO(co.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Change Order Dialog */}
          <Dialog open={coDialogOpen} onOpenChange={setCoDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>New Change Order</DialogTitle>
                <DialogDescription>Document scope changes and budget adjustments.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Title *</Label>
                  <Input placeholder="e.g. Additional API integrations" value={coForm.title} onChange={e => setCoForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea placeholder="Describe the scope change…" rows={3} value={coForm.description} onChange={e => setCoForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Amount ($)</Label>
                    <Input type="number" min={0} placeholder="0" value={coForm.amount} onChange={e => setCoForm(f => ({ ...f, amount: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Requested Date</Label>
                    <Input type="date" value={coForm.requestedDate} onChange={e => setCoForm(f => ({ ...f, requestedDate: e.target.value }))} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCoDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateCO} disabled={!coForm.title}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <TabsContent value="csat" className="m-0">
            <CsatTab
              projectId={projectId}
              csatSummary={csatSummary}
              csatSurveys={csatSurveys}
              refetchSurveys={refetchSurveys}
            />
          </TabsContent>

          <TabsContent value="documents" className="m-0">
            <ProjectDocuments projectId={projectId} />
          </TabsContent>

          <TabsContent value="forms" className="m-0">
            <ProjectForms projectId={projectId} />
          </TabsContent>

          <TabsContent value="gantt" className="m-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-muted-foreground" />
                  Project Timeline
                </CardTitle>
                <CardDescription>Visual Gantt chart of all phases and tasks with scheduled dates</CardDescription>
              </CardHeader>
              <CardContent className="p-0 pb-4">
                <ProjectGantt projectId={projectId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="time" className="m-0 space-y-4">
            {(() => {
              const entries = projectTimeEntries ?? [];
              const totalHours = entries.reduce((s, e) => s + Number(e.hours), 0);
              const billableHours = entries.filter(e => e.billable).reduce((s, e) => s + Number(e.hours), 0);
              const billablePct = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;
              const allUsers = users ?? [];

              const byUser: Record<number, { userId: number; totalHours: number; billableHours: number; entries: number }> = {};
              entries.forEach(e => {
                if (!byUser[e.userId]) byUser[e.userId] = { userId: e.userId, totalHours: 0, billableHours: 0, entries: 0 };
                byUser[e.userId].totalHours += Number(e.hours);
                if (e.billable) byUser[e.userId].billableHours += Number(e.hours);
                byUser[e.userId].entries += 1;
              });
              const userRows = Object.values(byUser).sort((a, b) => b.totalHours - a.totalHours);

              const byTask: Record<string, { label: string; totalHours: number; billableHours: number; entries: number }> = {};
              entries.forEach(e => {
                const task = tasks?.find(t => t.id === e.taskId);
                const key = e.taskId ? String(e.taskId) : (e.description ?? "Unassigned");
                const label = task?.name ?? e.description ?? "No task";
                if (!byTask[key]) byTask[key] = { label, totalHours: 0, billableHours: 0, entries: 0 };
                byTask[key].totalHours += Number(e.hours);
                if (e.billable) byTask[key].billableHours += Number(e.hours);
                byTask[key].entries += 1;
              });
              const taskRows = Object.values(byTask).sort((a, b) => b.totalHours - a.totalHours);

              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: "Total Hours", value: `${totalHours}h`, icon: Clock },
                      { label: "Billable Hours", value: `${billableHours}h`, icon: DollarSign },
                      { label: "Billable Ratio", value: `${billablePct}%`, icon: TrendingUp },
                      { label: "Contributors", value: String(userRows.length), icon: Users },
                    ].map(({ label, value, icon: Icon }) => (
                      <Card key={label}>
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                            <Icon className="h-3.5 w-3.5" /> {label}
                          </div>
                          <p className="text-2xl font-bold">{value}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />By Team Member</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 pb-1">
                      {entries.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-4 text-center">No time logged yet for this project.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Member</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              <TableHead className="text-right">Billable</TableHead>
                              <TableHead className="text-right">Billable %</TableHead>
                              <TableHead className="text-right">Entries</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {userRows.map(row => {
                              const u = allUsers.find(u => u.id === row.userId);
                              const pct = row.totalHours > 0 ? Math.round((row.billableHours / row.totalHours) * 100) : 0;
                              const initials = (u?.name ?? "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                              return (
                                <TableRow key={row.userId}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-7 w-7">
                                        <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">{initials}</AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm font-medium">{u?.name ?? `User #${row.userId}`}</span>
                                      {u?.department && <span className="text-xs text-muted-foreground">· {u.department}</span>}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-medium">{row.totalHours}h</TableCell>
                                  <TableCell className="text-right text-muted-foreground">{row.billableHours}h</TableCell>
                                  <TableCell className="text-right">
                                    <span className={`text-xs font-semibold ${pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-500"}`}>{pct}%</span>
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground text-sm">{row.entries}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2"><Target className="h-4 w-4 text-muted-foreground" />By Task / Work Item</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 pb-1">
                      {taskRows.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-4 text-center">No time entries with task assignments yet.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Task / Description</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              <TableHead className="text-right">Billable</TableHead>
                              <TableHead className="text-right">Billable %</TableHead>
                              <TableHead className="text-right">Entries</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {taskRows.map((row, i) => {
                              const pct = row.totalHours > 0 ? Math.round((row.billableHours / row.totalHours) * 100) : 0;
                              return (
                                <TableRow key={i}>
                                  <TableCell className="text-sm font-medium max-w-xs truncate">{row.label}</TableCell>
                                  <TableCell className="text-right font-medium">{row.totalHours}h</TableCell>
                                  <TableCell className="text-right text-muted-foreground">{row.billableHours}h</TableCell>
                                  <TableCell className="text-right">
                                    <span className={`text-xs font-semibold ${pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-500"}`}>{pct}%</span>
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground text-sm">{row.entries}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </TabsContent>
        </Tabs>
      </div>

      {/* Share with Client Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-indigo-600" />
              Share with Client
            </DialogTitle>
            <DialogDescription>
              Generate a read-only portal link for your client. They can view project status, milestones, and documents without logging in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {portalUrl ? (
              <>
                <div className="flex items-center gap-2">
                  <Input readOnly value={portalUrl} className="font-mono text-xs flex-1 bg-muted" />
                  <Button size="sm" variant="outline" onClick={handleCopyLink} className="shrink-0">
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This link is publicly accessible — anyone with the link can view project details. You can revoke it at any time.
                </p>
                <a
                  href={portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Preview portal →
                </a>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-4">No active portal link exists for this project yet.</p>
                <Button onClick={handleCreateToken} disabled={creatingToken}>
                  {creatingToken ? "Creating…" : "Generate Portal Link"}
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={allocDialogOpen} onOpenChange={(open) => { setAllocDialogOpen(open); if (!open) setEditAllocId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editAllocId ? "Edit Allocation" : "Add Allocation"}</DialogTitle>
            <DialogDescription>Assign a team member and define their time commitment to this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Team Member</Label>
              <Select value={allocForm.userId || "none"} onValueChange={v => setAllocForm(f => ({ ...f, userId: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Select team member (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned / Placeholder</SelectItem>
                  {users?.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name} — {u.role}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Input placeholder="e.g. Senior Developer, Project Manager" value={allocForm.role} onChange={e => setAllocForm(f => ({ ...f, role: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start Date *</Label>
                <Input type="date" value={allocForm.startDate} onChange={e => setAllocForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date *</Label>
                <Input type="date" value={allocForm.endDate} onChange={e => setAllocForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Hours / Week</Label>
              <Input type="number" min={1} max={80} value={allocForm.hoursPerWeek} onChange={e => setAllocForm(f => ({ ...f, hoursPerWeek: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <input
                type="checkbox"
                id="softAllocChk"
                checked={allocForm.isSoftAllocation}
                onChange={e => setAllocForm(f => ({ ...f, isSoftAllocation: e.target.checked }))}
                className="h-4 w-4 rounded border-input accent-amber-500"
              />
              <Label htmlFor="softAllocChk" className="cursor-pointer text-sm">
                Soft allocation <span className="text-muted-foreground font-normal">(tentative, pre-committed)</span>
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="timesheetApproverChk"
                checked={allocForm.isTimesheetApprover}
                onChange={e => setAllocForm(f => ({ ...f, isTimesheetApprover: e.target.checked }))}
                className="h-4 w-4 rounded border-input accent-indigo-500"
              />
              <Label htmlFor="timesheetApproverChk" className="cursor-pointer text-sm">
                Timesheet Approver <span className="text-muted-foreground font-normal">(can approve time submissions)</span>
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="leaveApproverChk"
                checked={allocForm.isLeaveApprover}
                onChange={e => setAllocForm(f => ({ ...f, isLeaveApprover: e.target.checked }))}
                className="h-4 w-4 rounded border-input accent-indigo-500"
              />
              <Label htmlFor="leaveApproverChk" className="cursor-pointer text-sm">
                Leave Approver <span className="text-muted-foreground font-normal">(can approve leave requests)</span>
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllocDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAlloc} disabled={!allocForm.role || !allocForm.startDate || !allocForm.endDate || createAllocation.isPending || updateAllocation.isPending}>
              {editAllocId ? "Save Changes" : "Add Allocation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteAllocId} onOpenChange={() => setDeleteAllocId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove Allocation</DialogTitle><DialogDescription>This will remove the team member's allocation from this project.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAllocId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteAllocId && handleDeleteAlloc(deleteAllocId)}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editProjectOpen} onOpenChange={setEditProjectOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update project details, status, and health.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Project Name *</Label>
              <Input value={editProjectForm.name} onChange={e => setEditProjectForm(f => ({ ...f, name: e.target.value }))} placeholder="Project name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editProjectForm.status} onValueChange={v => setEditProjectForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Not Started", "In Progress", "At Risk", "Completed", "On Hold"].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Health</Label>
                <Select value={editProjectForm.health} onValueChange={v => setEditProjectForm(f => ({ ...f, health: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["On Track", "At Risk", "Off Track"].map(h => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Budget ($)</Label>
              <Input type="number" min={0} value={editProjectForm.budget} onChange={e => setEditProjectForm(f => ({ ...f, budget: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={editProjectForm.description} onChange={e => setEditProjectForm(f => ({ ...f, description: e.target.value }))} placeholder="Project description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProjectOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveProject} disabled={!editProjectForm.name || updateProject.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resReqOpen} onOpenChange={setResReqOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Resource</DialogTitle>
            <DialogDescription>Submit a resource request for this project. It will appear in the Resources pipeline.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Role Needed *</Label>
              <Input value={resReqForm.role} onChange={e => setResReqForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Senior Developer, UX Designer" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start Date *</Label>
                <Input type="date" value={resReqForm.startDate} onChange={e => setResReqForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date *</Label>
                <Input type="date" value={resReqForm.endDate} onChange={e => setResReqForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Hours / Week</Label>
                <Input type="number" min={1} max={80} value={resReqForm.hoursPerWeek} onChange={e => setResReqForm(f => ({ ...f, hoursPerWeek: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={resReqForm.priority} onValueChange={v => setResReqForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Low", "Medium", "High", "Critical"].map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={resReqForm.notes} onChange={e => setResReqForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any specific requirements or context…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResReqOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveResReq} disabled={!resReqForm.role || !resReqForm.startDate || !resReqForm.endDate || createResourceRequest.isPending}>
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ApplyTemplateModal
        open={applyTemplateOpen}
        onOpenChange={setApplyTemplateOpen}
        projectId={projectId}
        projectStartDate={project.startDate ?? undefined}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) })}
      />
    </Layout>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none"
        >
          <Star className={`h-6 w-6 transition-colors ${s <= (hovered || value) ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`} />
        </button>
      ))}
    </div>
  );
}

function CsatTab({ projectId, csatSummary, csatSurveys, refetchSurveys }: {
  projectId: number;
  csatSummary: any;
  csatSurveys: any[];
  refetchSurveys: () => void;
}) {
  const { toast } = useToast();
  const [submitDialog, setSubmitDialog] = useState<{ surveyId: number; taskName: string } | null>(null);
  const [submitRating, setSubmitRating] = useState(0);
  const [submitComment, setSubmitComment] = useState("");
  const queryClient = useQueryClient();

  const pending = csatSurveys.filter(s => s.status === "pending");
  const completed = csatSurveys.filter(s => s.status === "completed");

  const submitMut = useMutation({
    mutationFn: async ({ id, rating, comment }: { id: number; rating: number; comment: string }) => {
      const r = await fetch(`/api/csat-surveys/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": "PM" },
        body: JSON.stringify({ rating, comment }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      return r.json();
    },
    onSuccess: () => {
      refetchSurveys();
      queryClient.invalidateQueries({ queryKey: getGetProjectCsatSummaryQueryKey(projectId) });
      toast({ title: "Survey submitted" });
      setSubmitDialog(null);
      setSubmitRating(0);
      setSubmitComment("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleCsatMut = useMutation({
    mutationFn: async ({ taskId, enabled }: { taskId: number; enabled: boolean }) => {
      const r = await fetch(`/api/tasks/${taskId}/csat-enabled`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-role": "Admin" },
        body: JSON.stringify({ csatEnabled: enabled }),
      });
      if (!r.ok) throw new Error("Failed to update");
      return r.json();
    },
    onSuccess: () => refetchSurveys(),
  });

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle></CardHeader>
          <CardContent>
            {csatSummary && csatSummary.totalResponses > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold">{csatSummary.averageRating.toFixed(1)}</span>
                <span className="text-muted-foreground text-sm">/ 5</span>
                <div className="flex ml-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`h-4 w-4 ${s <= Math.round(csatSummary.averageRating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
              </div>
            ) : <span className="text-muted-foreground text-sm">No data yet</span>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Surveys Pending</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${pending.length > 0 ? "text-amber-500" : "text-emerald-600"}`}>{pending.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Surveys Completed</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{completed.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Score Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {([5,4,3,2,1] as const).map(score => {
                const dist = csatSummary?.ratingDistribution as Record<string, number> ?? {};
                const count = dist[score.toString()] || 0;
                const total = csatSummary?.totalResponses ?? 0;
                const pct = total > 0 ? Math.round(count / total * 100) : 0;
                return (
                  <div key={score} className="flex items-center gap-1.5 text-xs">
                    <span className="w-3 text-right text-muted-foreground">{score}</span>
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />
                    <div className="flex-1 bg-muted rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-5 text-right text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Milestone surveys table */}
      {csatSurveys.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No milestone surveys yet</p>
            <p className="text-sm mt-1">CSAT surveys are auto-sent when milestone tasks are marked complete.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Milestone Surveys</CardTitle>
            <CardDescription>Auto-generated after milestone completion. Submit ratings on behalf of your client champion.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {csatSurveys.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${s.status === "completed" ? "bg-emerald-500" : "bg-amber-400"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.milestoneTaskName}</p>
                      <p className="text-xs text-muted-foreground">Sent {new Date(s.sentAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {s.status === "completed" ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex">
                          {[1,2,3,4,5].map(star => (
                            <Star key={star} className={`h-3.5 w-3.5 ${star <= s.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20"}`} />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(s.completedAt).toLocaleDateString()}</span>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => { setSubmitDialog({ surveyId: s.id, taskName: s.milestoneTaskName }); setSubmitRating(0); setSubmitComment(""); }}
                      >
                        Submit Rating
                      </Button>
                    )}
                    {/* Toggle csat_enabled */}
                    <button
                      className={`text-xs px-2 py-0.5 rounded border transition-colors ${s.csatEnabled ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100" : "border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100"}`}
                      onClick={() => toggleCsatMut.mutate({ taskId: s.milestoneTaskId, enabled: !s.csatEnabled })}
                      title={s.csatEnabled ? "Disable CSAT for this milestone" : "Enable CSAT for this milestone"}
                    >
                      {s.csatEnabled ? "CSAT On" : "CSAT Off"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent written comments */}
      {csatSummary && csatSummary.recentResponses?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Feedback Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {csatSummary.recentResponses.map((resp: any) => (
                resp.comment ? (
                  <div key={resp.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs">{String(resp.submittedByUserId).padStart(2, "0")}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} className={`h-3.5 w-3.5 ${s <= resp.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />)}</div>
                        <span className="text-xs text-muted-foreground">{new Date(resp.submittedAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-muted-foreground italic">"{resp.comment}"</p>
                    </div>
                  </div>
                ) : null
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit dialog */}
      <Dialog open={!!submitDialog} onOpenChange={v => { if (!v) setSubmitDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Submit CSAT Rating</DialogTitle>
            <CardDescription>Milestone: {submitDialog?.taskName}</CardDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs mb-2 block">Rating (1–5 stars)</Label>
              <StarRating value={submitRating} onChange={setSubmitRating} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Comment (optional)</Label>
              <Textarea
                rows={3}
                placeholder="Any feedback from the client?"
                value={submitComment}
                onChange={e => setSubmitComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSubmitDialog(null)}>Cancel</Button>
            <Button
              size="sm"
              disabled={submitRating === 0 || submitMut.isPending}
              onClick={() => submitDialog && submitMut.mutate({ id: submitDialog.surveyId, rating: submitRating, comment: submitComment })}
            >
              {submitMut.isPending ? "Submitting…" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
