import { useState } from "react";
import { Layout } from "@/components/layout";
import { UtilisationHeatmap } from "@/components/utilisation-heatmap";
import ResourceTimeline from "@/components/resource-timeline";
import {
  useGetCapacityOverview, useListUsers, useListProjects, useListResourceRequests, useUpdateResourceRequestStatus, getListResourceRequestsQueryKey,
  useGetUserSkills, useListSkills, useListAllocations,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Users, Briefcase, CalendarRange, AlertTriangle, Search, Mail, DollarSign, LayoutList, UserCheck, MessageSquare, RefreshCw, Ban, Send } from "lucide-react";
import { Input } from "@/components/ui/input";

function PriorityBadge({ priority }: { priority: string }) {
  const cls =
    priority === "High" ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400"
    : priority === "Medium" ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
    : "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>{priority}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "Pending" ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
    : status === "Approved" ? "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
    : status === "Fulfilled" ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400"
    : status === "Rejected" ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400"
    : "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>{status}</span>;
}

function ProficiencyDot({ level }: { level: string }) {
  const colors: Record<string, string> = {
    Beginner: "bg-gray-400",
    Intermediate: "bg-blue-500",
    Advanced: "bg-green-500",
    Expert: "bg-purple-500",
  };
  return (
    <span title={level} className={`inline-block h-2 w-2 rounded-full ${colors[level] ?? "bg-gray-400"}`} />
  );
}

function UserSkillsCell({ userId }: { userId: number }) {
  const { data: userSkills, isLoading } = useGetUserSkills(userId);
  if (isLoading) return <Skeleton className="h-4 w-20" />;
  if (!userSkills?.length) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {userSkills.slice(0, 4).map(us => (
        <span key={us.id} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-xs font-medium">
          <ProficiencyDot level={us.proficiencyLevel} />
          {us.skillName}
        </span>
      ))}
      {userSkills.length > 4 && (
        <span className="px-1.5 py-0.5 rounded bg-muted text-xs text-muted-foreground">+{userSkills.length - 4}</span>
      )}
    </div>
  );
}

export default function Resources() {
  const { data: capacity, isLoading } = useGetCapacityOverview();
  const { data: requests, isLoading: isLoadingRequests } = useListResourceRequests();
  const { data: projects } = useListProjects();
  const { data: users } = useListUsers();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateStatus = useUpdateResourceRequestStatus();

  const [capacitySearch, setCapacitySearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState<string>("");
  const [fulfillRequestId, setFulfillRequestId] = useState<number | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [blockRequestId, setBlockRequestId] = useState<number | null>(null);
  const [ignoreSoft, setIgnoreSoft] = useState(false);
  const [openChatId, setOpenChatId] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<Record<number, any[]>>({});
  const [chatInput, setChatInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const getProject = (id: number) => projects?.find((p: any) => p.id === id);
  const getUser = (id: number) => users?.find((u: any) => u.id === id);

  const [profileUser, setProfileUser] = useState<any>(null);

  const pendingRequests = requests?.filter((r: any) => r.status === "Pending") ?? [];
  const allRequests = (requests ?? []) as any[];

  const filteredRequests = statusFilter === "all" ? allRequests : allRequests.filter((r: any) => r.status === statusFilter);

  // Forecasted utilization: current allocated hpw + proposed hpw, optionally ignoring soft allocations
  const { data: rawAllocs } = useListAllocations();
  function forecastedUtil(userId: number, proposedHpw: number, ignoreSoftFlag: boolean): { current: number; proposed: number; capacity: number; pct: number } {
    const cap = (getUser(userId) as any)?.capacity ?? 40;
    const userAllocs = ((rawAllocs as any[]) ?? []).filter((a: any) => {
      if (a.userId !== userId) return false;
      if (ignoreSoftFlag && a.isSoftAllocation) return false;
      const today = new Date().toISOString().slice(0, 10);
      return a.endDate >= today;
    });
    const current = userAllocs.reduce((s: number, a: any) => s + Number(a.hoursPerWeek ?? 0), 0);
    const proposed = current + proposedHpw;
    return { current, proposed, capacity: cap, pct: cap > 0 ? Math.round((proposed / cap) * 100) : 0 };
  }

  async function fetchComments(requestId: number) {
    try {
      const res = await fetch(`/api/resource-requests/${requestId}/comments`);
      const data = await res.json();
      setChatMessages(prev => ({ ...prev, [requestId]: data }));
    } catch {}
  }

  async function sendComment(requestId: number) {
    if (!chatInput.trim()) return;
    try {
      await fetch(`/api/resource-requests/${requestId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: 1, message: chatInput.trim() }),
      });
      setChatInput("");
      fetchComments(requestId);
    } catch {}
  }

  async function handleApprove(id: number) {
    try {
      await updateStatus.mutateAsync({ id, data: { status: "Approved" } });
      queryClient.invalidateQueries({ queryKey: getListResourceRequestsQueryKey() });
      toast({ title: "Request approved — requester notified" });
    } catch {
      toast({ title: "Failed to approve request", variant: "destructive" });
    }
  }

  async function handleReject() {
    if (!selectedRequestId) return;
    try {
      await updateStatus.mutateAsync({ id: selectedRequestId, data: { status: "Rejected", rejectionReason: rejectReason } });
      queryClient.invalidateQueries({ queryKey: getListResourceRequestsQueryKey() });
      toast({ title: "Request rejected" });
      setRejectDialogOpen(false);
      setRejectReason("");
      setSelectedRequestId(null);
    } catch {
      toast({ title: "Failed to reject request", variant: "destructive" });
    }
  }

  async function handleBlock() {
    if (!blockRequestId) return;
    try {
      const res = await fetch(`/api/resource-requests/${blockRequestId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-role": "Admin" },
        body: JSON.stringify({ status: "Blocked", blockedReason: blockReason }),
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: getListResourceRequestsQueryKey() });
      toast({ title: "Request blocked — requester notified and chat enabled" });
      setBlockDialogOpen(false);
      setBlockReason("");
      setBlockRequestId(null);
    } catch {
      toast({ title: "Failed to block request", variant: "destructive" });
    }
  }

  async function handleResubmit(id: number) {
    try {
      const res = await fetch(`/api/resource-requests/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Pending" }),
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: getListResourceRequestsQueryKey() });
      toast({ title: "Request resubmitted for review" });
    } catch {
      toast({ title: "Failed to resubmit", variant: "destructive" });
    }
  }

  async function handleFulfill() {
    if (!fulfillRequestId) return;
    try {
      await updateStatus.mutateAsync({
        id: fulfillRequestId,
        data: { status: "Fulfilled", assignedUserId: assignUserId ? parseInt(assignUserId) : undefined }
      });
      queryClient.invalidateQueries({ queryKey: getListResourceRequestsQueryKey() });
      toast({ title: "Request fulfilled — allocation automatically created" });
      setAssignDialogOpen(false);
      setAssignUserId("");
      setFulfillRequestId(null);
    } catch {
      toast({ title: "Failed to fulfill request", variant: "destructive" });
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Team Resources</h1>
          {pendingRequests.length > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1.5 px-3 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              {pendingRequests.length} pending request{pendingRequests.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        <Tabs defaultValue={pendingRequests.length > 0 ? "requests" : "capacity"}>
          <TabsList className="mb-4">
            <TabsTrigger value="capacity" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Capacity
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4" /> Heat Map
            </TabsTrigger>
            <TabsTrigger value="projects-timeline" className="flex items-center gap-2">
              <LayoutList className="h-4 w-4" /> Projects Timeline
            </TabsTrigger>
            <TabsTrigger value="people-timeline" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" /> People Timeline
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> Resource Requests
              {pendingRequests.length > 0 && (
                <span className="ml-1 bg-red-500 text-white rounded-full text-xs px-1.5 py-0.5 leading-none">
                  {pendingRequests.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="capacity" className="m-0">
            <Card>
              <CardHeader>
                <CardTitle>Capacity Overview</CardTitle>
                <CardDescription>Current utilization, availability, and skills for all team members</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, role, or skill…"
                      className="pl-8"
                      value={capacitySearch}
                      onChange={e => setCapacitySearch(e.target.value)}
                    />
                  </div>
                  <Select value={deptFilter} onValueChange={setDeptFilter}>
                    <SelectTrigger className="w-44"><SelectValue placeholder="Department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {[...new Set(capacity?.map(u => u.department).filter(Boolean))].sort().map(d => (
                        <SelectItem key={d} value={d!}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {isLoading ? (
                  <div className="space-y-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : (() => {
                  const q = capacitySearch.toLowerCase();
                  const filtered = (capacity ?? []).filter(u => {
                    const matchSearch = !q || u.userName?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q);
                    const matchDept = deptFilter === "all" || u.department === deptFilter;
                    return matchSearch && matchDept;
                  });
                  return (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team Member</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="w-[160px]">Utilization</TableHead>
                        <TableHead className="text-right">Capacity</TableHead>
                        <TableHead className="text-right">Available</TableHead>
                        <TableHead>Skills</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(user => {
                        const isOverallocated = user.utilizationPercent > 100;
                        const isUnderutilized = user.utilizationPercent < 50;
                        return (
                          <TableRow key={user.userId} className="cursor-pointer hover:bg-muted/50" onClick={() => setProfileUser(user)}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8"><AvatarFallback>{user.userInitials}</AvatarFallback></Avatar>
                                {user.userName}
                              </div>
                            </TableCell>
                            <TableCell>{user.department}</TableCell>
                            <TableCell className="text-muted-foreground">{user.role}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={Math.min(user.utilizationPercent, 100)}
                                  className={`h-2 ${isOverallocated ? "bg-red-100 dark:bg-red-950/50 [&>div]:bg-red-500" : ""}`}
                                />
                                <span className={`text-xs font-medium w-10 text-right ${isOverallocated ? "text-red-500" : isUnderutilized ? "text-amber-500" : ""}`}>
                                  {user.utilizationPercent}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{user.capacity}</TableCell>
                            <TableCell className={`text-right font-medium ${user.available < 0 ? "text-red-500" : ""}`}>
                              {user.available > 0 ? `+${user.available}` : user.available}
                            </TableCell>
                            <TableCell>
                              <UserSkillsCell userId={user.userId} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="heatmap" className="m-0">
            <UtilisationHeatmap />
          </TabsContent>

          <TabsContent value="projects-timeline" className="m-0">
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle>Projects Timeline</CardTitle>
                <CardDescription>All active allocations grouped by project. Expand a row to see individual team members. Drag bars to shift or resize allocation dates.</CardDescription>
              </CardHeader>
              <CardContent className="p-0" style={{ minHeight: 480 }}>
                <ResourceTimeline mode="projects" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="people-timeline" className="m-0">
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle>People Timeline</CardTitle>
                <CardDescription>All team members and their allocations across projects. Expand a row to see per-project breakdowns. Use "Find Availability" to locate free capacity.</CardDescription>
              </CardHeader>
              <CardContent className="p-0" style={{ minHeight: 480 }}>
                <ResourceTimeline mode="people" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests" className="m-0 space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["all","Pending","Approved","Blocked","Rejected","Fulfilled","Cancelled"].map(s => (
                    <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 text-xs text-muted-foreground border rounded-md px-2 py-1.5">
                <input type="checkbox" id="ignoreSoft" checked={ignoreSoft} onChange={e => setIgnoreSoft(e.target.checked)} className="h-3.5 w-3.5" />
                <label htmlFor="ignoreSoft" className="cursor-pointer select-none">Ignore soft allocations in utilization</label>
              </div>
              <span className="text-xs text-muted-foreground ml-auto">{filteredRequests.length} request{filteredRequests.length !== 1 ? "s" : ""}</span>
            </div>

            {isLoadingRequests ? (
              <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>
            ) : filteredRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No resource requests</p>
                  <p className="text-sm mt-1">Resource requests from project managers will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              filteredRequests.map((req: any) => {
                const project = getProject(req.projectId);
                const requester = getUser(req.requestedByUserId);
                const assignedUser = req.assignedUserId ? getUser(req.assignedUserId) : null;
                const isChatOpen = openChatId === req.id;
                const threadMsgs = chatMessages[req.id] ?? [];

                // Type label mapping
                const typeLabels: Record<string,string> = {
                  add_member: "Add Member", add_hours: "Add Hours",
                  assign_placeholder: "Assign Placeholder", replacement: "Replacement",
                  shift_allocations: "Shift Allocations", delete_allocation: "Delete Allocation",
                };

                const cardBorder = req.status === "Pending" ? "border-amber-200 dark:border-amber-800"
                  : req.status === "Blocked" ? "border-red-300 dark:border-red-800"
                  : req.status === "Approved" ? "border-blue-200 dark:border-blue-800"
                  : "";

                return (
                  <Card key={req.id} className={cardBorder}>
                    <CardContent className="pt-5 space-y-4">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-base">{req.role}</span>
                            <StatusBadge status={req.status} />
                            <PriorityBadge priority={req.priority} />
                            {req.type && req.type !== "add_member" && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">{typeLabels[req.type] ?? req.type}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />{project?.name ?? `Project #${req.projectId}`}</span>
                            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{req.hoursPerWeek} hrs/week</span>
                            <span className="flex items-center gap-1.5"><CalendarRange className="h-3.5 w-3.5" />{req.startDate} → {req.endDate}</span>
                            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />By {requester?.name ?? `User #${req.requestedByUserId}`}</span>
                            {req.region && <span className="flex items-center gap-1.5">🌍 {req.region}</span>}
                          </div>
                          {req.requiredSkills && req.requiredSkills.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {req.requiredSkills.map((skill: string) => (
                                <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                              ))}
                            </div>
                          )}
                          {req.notes && <p className="text-sm text-muted-foreground italic">"{req.notes}"</p>}
                          {assignedUser && (
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-1.5">
                              <CheckCircle className="h-3.5 w-3.5" />Assigned to {assignedUser.name}
                            </p>
                          )}
                          {req.rejectionReason && (
                            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
                              <XCircle className="h-3.5 w-3.5" />Rejected: {req.rejectionReason}
                            </p>
                          )}
                          {req.blockedReason && (
                            <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-1.5 font-medium">
                              <Ban className="h-3.5 w-3.5" />Blocked: {req.blockedReason}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 shrink-0">
                          {req.status === "Pending" && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50" onClick={() => handleApprove(req.id)} disabled={updateStatus.isPending}>
                                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50" onClick={() => { setBlockRequestId(req.id); setBlockDialogOpen(true); }}>
                                <Ban className="h-3.5 w-3.5 mr-1" /> Block
                              </Button>
                              <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50" onClick={() => { setSelectedRequestId(req.id); setRejectDialogOpen(true); }}>
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                              </Button>
                            </div>
                          )}
                          {req.status === "Approved" && (
                            <Button size="sm" onClick={() => { setFulfillRequestId(req.id); setAssignDialogOpen(true); }} disabled={updateStatus.isPending}>
                              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Assign & Allocate
                            </Button>
                          )}
                          {(req.status === "Blocked" || req.status === "Rejected") && (
                            <Button size="sm" variant="outline" onClick={() => handleResubmit(req.id)}>
                              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Resubmit
                            </Button>
                          )}
                          {(req.status === "Pending" || req.status === "Blocked") && (
                            <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => {
                              const next = isChatOpen ? null : req.id;
                              setOpenChatId(next);
                              if (next) fetchComments(next);
                            }}>
                              <MessageSquare className="h-3.5 w-3.5 mr-1" /> {isChatOpen ? "Hide" : "Chat"} {threadMsgs.length > 0 && `(${threadMsgs.length})`}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Candidate panel (shows on Pending requests) */}
                      {req.status === "Pending" && users && (users as any[]).length > 0 && (
                        <div className="border rounded-lg p-3 bg-slate-50 dark:bg-slate-900/30 space-y-2">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Relevant team members</p>
                          <div className="space-y-1.5">
                            {(users as any[])
                              .filter((u: any) => {
                                if (!u.isInternal && u.isInternal !== undefined) return false;
                                const roleMatch = !req.role || u.role?.toLowerCase().includes(req.role.toLowerCase().split(" ").pop() ?? "");
                                return roleMatch;
                              })
                              .slice(0, 5)
                              .map((u: any) => {
                                const fc = forecastedUtil(u.id, Number(req.hoursPerWeek), ignoreSoft);
                                const pctClass = fc.pct > 100 ? "text-red-600" : fc.pct > 80 ? "text-amber-600" : "text-green-600";
                                return (
                                  <div key={u.id} className="flex items-center gap-3 text-xs">
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: fc.pct > 100 ? "#ef4444" : fc.pct > 80 ? "#f59e0b" : "#22c55e" }} />
                                    <span className="font-medium w-36 truncate">{u.name}</span>
                                    <span className="text-muted-foreground w-28 truncate">{u.role}</span>
                                    <span className="text-muted-foreground">{fc.current}h → <span className={`font-semibold ${pctClass}`}>{fc.proposed}h ({fc.pct}%)</span></span>
                                    <span className="text-muted-foreground">/ {fc.capacity}h cap</span>
                                  </div>
                                );
                              })}
                          </div>
                          {ignoreSoft && <p className="text-xs text-indigo-500">* Soft allocations excluded from utilization calculation</p>}
                        </div>
                      )}

                      {/* Chat thread */}
                      {isChatOpen && (
                        <div className="border rounded-lg p-3 space-y-2 bg-white dark:bg-slate-950">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Thread</p>
                          {threadMsgs.length === 0 && <p className="text-xs text-muted-foreground">No messages yet. Start a conversation to resolve this request.</p>}
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {threadMsgs.map((m: any) => (
                              <div key={m.id} className="flex gap-2">
                                <div className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center shrink-0 font-semibold">
                                  {getUser(m.userId)?.name?.[0] ?? "?"}
                                </div>
                                <div>
                                  <span className="text-xs font-medium">{getUser(m.userId)?.name ?? `User ${m.userId}`}</span>
                                  <span className="text-xs text-muted-foreground ml-2">{new Date(m.createdAt).toLocaleString()}</span>
                                  <p className="text-xs text-slate-700 dark:text-slate-300">{m.message}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Input
                              placeholder="Type a message…"
                              className="h-7 text-xs flex-1"
                              value={chatInput}
                              onChange={e => setChatInput(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") sendComment(req.id); }}
                            />
                            <Button size="sm" className="h-7 px-2" onClick={() => sendComment(req.id)}>
                              <Send className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Resource Request</DialogTitle><DialogDescription>Provide a reason for rejecting this request (optional).</DialogDescription></DialogHeader>
          <Textarea placeholder="Rejection reason..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? "Rejecting..." : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Resource Request</DialogTitle>
            <DialogDescription>Blocking pauses this request and notifies the requester. A chat thread will be opened so they can provide more information.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Explain what information is needed or why this is blocked…" value={blockReason} onChange={e => setBlockReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBlock}>
              Block & Notify Requester
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign & Allocate dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign & Allocate</DialogTitle>
            <DialogDescription>Select a team member to assign. An allocation record will be automatically created on approval.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select onValueChange={setAssignUserId} value={assignUserId}>
              <SelectTrigger><SelectValue placeholder="Select team member…" /></SelectTrigger>
              <SelectContent>
                {(users as any[])?.map((u: any) => <SelectItem key={u.id} value={u.id.toString()}>{u.name} — {u.role}</SelectItem>)}
              </SelectContent>
            </Select>
            {/* Forecasted utilization preview */}
            {assignUserId && fulfillRequestId && (() => {
              const req = allRequests.find((r: any) => r.id === fulfillRequestId);
              if (!req) return null;
              const fc = forecastedUtil(parseInt(assignUserId), Number(req.hoursPerWeek), ignoreSoft);
              const pctClass = fc.pct > 100 ? "text-red-600 font-bold" : fc.pct > 80 ? "text-amber-600 font-semibold" : "text-green-600 font-semibold";
              return (
                <div className="rounded-lg border p-3 bg-slate-50 text-sm space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Forecasted utilization after assignment</p>
                  <p>Current: <span className="font-medium">{fc.current}h/wk</span> + Proposed: <span className="font-medium">{req.hoursPerWeek}h/wk</span> = <span className={pctClass}>{fc.proposed}h ({fc.pct}% of {fc.capacity}h capacity)</span></p>
                  {fc.pct > 100 && <p className="text-red-600 text-xs">⚠ This will over-allocate the team member. Consider reassigning or adjusting hours.</p>}
                  {ignoreSoft && <p className="text-xs text-indigo-500">* Soft allocations excluded</p>}
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignDialogOpen(false); setAssignUserId(""); }}>Cancel</Button>
            <Button onClick={handleFulfill} disabled={updateStatus.isPending || !assignUserId}>
              {updateStatus.isPending ? "Creating allocation…" : "Assign & Create Allocation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!profileUser} onOpenChange={o => !o && setProfileUser(null)}>
        <SheetContent className="w-[400px] sm:w-[480px] overflow-y-auto">
          {profileUser && (() => {
            const fullUser = users?.find(u => u.id === profileUser.userId);
            const isOverallocated = profileUser.utilizationPercent > 100;
            const isUnderutilized = profileUser.utilizationPercent < 50;
            return (
              <div className="space-y-6">
                <SheetHeader>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarFallback className="text-lg">{profileUser.userInitials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <SheetTitle className="text-xl">{profileUser.userName}</SheetTitle>
                      <p className="text-sm text-muted-foreground">{profileUser.role}</p>
                      <p className="text-xs text-muted-foreground">{profileUser.department}</p>
                    </div>
                  </div>
                </SheetHeader>

                {fullUser?.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span>{fullUser.email}</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border p-3 text-center">
                    <div className="text-2xl font-bold">{profileUser.capacity}h</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Weekly Capacity</div>
                  </div>
                  <div className={`rounded-lg border p-3 text-center ${isOverallocated ? "border-red-200 bg-red-50 dark:bg-red-950/20" : isUnderutilized ? "border-amber-200 bg-amber-50 dark:bg-amber-950/20" : "border-green-200 bg-green-50 dark:bg-green-950/20"}`}>
                    <div className={`text-2xl font-bold ${isOverallocated ? "text-red-600" : isUnderutilized ? "text-amber-600" : "text-green-600"}`}>{profileUser.utilizationPercent}%</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Utilization</div>
                  </div>
                  <div className={`rounded-lg border p-3 text-center ${profileUser.available < 0 ? "border-red-200 bg-red-50 dark:bg-red-950/20" : ""}`}>
                    <div className={`text-2xl font-bold ${profileUser.available < 0 ? "text-red-600" : "text-green-600"}`}>{profileUser.available > 0 ? `+${profileUser.available}` : profileUser.available}h</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Available</div>
                  </div>
                </div>

                {fullUser?.costRate !== undefined && (
                  <div className="flex items-center gap-2 rounded-lg border p-3">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">${fullUser.costRate}/hr</div>
                      <div className="text-xs text-muted-foreground">Internal cost rate</div>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold mb-2">Skills</h3>
                  <UserSkillsCell userId={profileUser.userId} />
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </Layout>
  );
}
