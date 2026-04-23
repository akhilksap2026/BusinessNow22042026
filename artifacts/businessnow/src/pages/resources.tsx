import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { UtilisationHeatmap } from "@/components/utilisation-heatmap";
import ResourceTimeline from "@/components/resource-timeline";
import SkillsMatrix from "@/components/skills-matrix";
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
import { SavedViewsBar } from "@/components/saved-views-bar";
import { type FieldDef, type FilterValue, EMPTY_FILTER, evaluateFilters } from "@/lib/filter-evaluator";

const REQUEST_STATUSES = ["Pending", "Approved", "Blocked", "Rejected", "Fulfilled", "Cancelled"];

const REQUEST_FIELDS: FieldDef[] = [
  { id: "status", label: "Status", type: "enum", options: REQUEST_STATUSES.map(s => ({ value: s, label: s })) },
  { id: "role", label: "Role", type: "text" },
  { id: "skillName", label: "Skill", type: "text" },
  { id: "hours", label: "Hours", type: "number" },
  { id: "neededByDate", label: "Needed by", type: "date" },
];
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Users, Briefcase, CalendarRange, AlertTriangle, Search, Mail, DollarSign, LayoutList, UserCheck, MessageSquare, RefreshCw, Ban, Send, Grid3x3, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";

const PROFICIENCY_RANK: Record<string, number> = { "Needs Help": 1, "Independent": 2, "Can Lead": 3 };

function PriorityBadge({ priority }: { priority: string }) {
  const cls =
    priority === "High" ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400"
    : priority === "Medium" ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
    : "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>{priority}</span>;
}

function ProficiencyDot({ level }: { level: string }) {
  const colors: Record<string, string> = {
    "Needs Help": "bg-amber-400",
    "Independent": "bg-blue-500",
    "Can Lead": "bg-green-600",
  };
  return (
    <span title={level} className={`inline-block h-2 w-2 rounded-full ${colors[level] ?? "bg-gray-400"}`} />
  );
}

function ProficiencyLabel({ level }: { level: string }) {
  const colors: Record<string, string> = {
    "Needs Help": "text-amber-700 bg-amber-50 border-amber-200",
    "Independent": "text-blue-700 bg-blue-50 border-blue-200",
    "Can Lead": "text-green-700 bg-green-50 border-green-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium ${colors[level] ?? "text-gray-600 bg-gray-50 border-gray-200"}`}>
      <ProficiencyDot level={level} /> {level}
    </span>
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

function MatchScoreBadge({ score, total }: { score: number; total: number }) {
  if (total === 0) return null;
  const pct = Math.round(score);
  const cls = pct >= 100 ? "bg-green-100 text-green-700 border-green-300"
    : pct >= 75 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : pct >= 50 ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-red-50 text-red-600 border-red-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-bold ${cls}`}>
      {pct}% match
    </span>
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
  const [peopleViewFilter, setPeopleViewFilter] = useState<FilterValue>(EMPTY_FILTER);
  const [requestsViewFilter, setRequestsViewFilter] = useState<FilterValue>(EMPTY_FILTER);
  const [allUserSkills, setAllUserSkills] = useState<any[]>([]);
  const [showLowMatchMap, setShowLowMatchMap] = useState<Record<number, boolean>>({});

  // Bulk-load all user skills once on mount for skill match scoring
  useState(() => {
    fetch("/api/user-skills").then(r => r.json()).then(setAllUserSkills).catch(() => {});
  });

  function scoreCandidate(userId: number, req: any): { score: number; matched: number; total: number; details: { skillName: string; required: string; userLevel: string | null; meets: boolean }[] } {
    const skillsWithLevel: { skillId: number; skillName: string; competencyLevel: string }[] = req.requiredSkillsWithLevel ?? [];
    const legacySkills: string[] = req.requiredSkills ?? [];

    if (skillsWithLevel.length > 0) {
      const userSkillsForUser = allUserSkills.filter((us: any) => us.userId === userId);
      const details = skillsWithLevel.map(req => {
        const us = userSkillsForUser.find((s: any) => s.skillId === req.skillId || s.skillName.toLowerCase() === req.skillName.toLowerCase());
        const userLevel = us?.proficiencyLevel ?? null;
        const userRank = userLevel ? (PROFICIENCY_RANK[userLevel] ?? 0) : 0;
        const reqRank = PROFICIENCY_RANK[req.competencyLevel] ?? 1;
        const meets = userRank >= reqRank;
        return { skillName: req.skillName, required: req.competencyLevel, userLevel, meets };
      });
      const matched = details.filter(d => d.meets).length;
      const score = skillsWithLevel.length > 0 ? (matched / skillsWithLevel.length) * 100 : 0;
      return { score, matched, total: skillsWithLevel.length, details };
    }

    if (legacySkills.length > 0) {
      const userSkillNames = allUserSkills.filter((us: any) => us.userId === userId).map((us: any) => us.skillName.toLowerCase());
      const matched = legacySkills.filter(s => userSkillNames.includes(s.toLowerCase())).length;
      const score = legacySkills.length > 0 ? (matched / legacySkills.length) * 100 : 0;
      const details = legacySkills.map(s => ({ skillName: s, required: "Independent", userLevel: userSkillNames.includes(s.toLowerCase()) ? "Independent" : null, meets: userSkillNames.includes(s.toLowerCase()) }));
      return { score, matched, total: legacySkills.length, details };
    }

    return { score: 0, matched: 0, total: 0, details: [] };
  }

  const getProject = (id: number) => projects?.find((p: any) => p.id === id);
  const getUser = (id: number) => users?.find((u: any) => u.id === id);

  const [profileUser, setProfileUser] = useState<any>(null);

  const pendingRequests = requests?.filter((r: any) => r.status === "Pending") ?? [];
  const allRequests = (requests ?? []) as any[];

  const baseFilteredRequests = statusFilter === "all" ? allRequests : allRequests.filter((r: any) => r.status === statusFilter);
  const filteredRequests = evaluateFilters(baseFilteredRequests, REQUEST_FIELDS, requestsViewFilter);

  const departmentOptions = useMemo(
    () => [...new Set((capacity ?? []).map((u: any) => u.department).filter(Boolean))].sort().map((d: any) => ({ value: d, label: d })),
    [capacity],
  );
  const peopleFields: FieldDef[] = useMemo(() => ([
    { id: "userName", label: "Name", type: "text" },
    { id: "department", label: "Department", type: "enum", options: departmentOptions },
    { id: "role", label: "Role", type: "text" },
    { id: "utilizationPercent", label: "Utilization %", type: "number" },
    { id: "capacity", label: "Capacity (h)", type: "number" },
    { id: "available", label: "Available (h)", type: "number" },
  ]), [departmentOptions]);

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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Team Resources</h1>
          {pendingRequests.length > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1.5 px-3 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              {pendingRequests.length} pending request{pendingRequests.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        <Tabs
          defaultValue={
            (typeof window !== "undefined" ? localStorage.getItem("resources.activeTab") : null) ||
            (pendingRequests.length > 0 ? "requests" : "capacity")
          }
          onValueChange={(v) => { try { localStorage.setItem("resources.activeTab", v); } catch {} }}
        >
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
            <TabsTrigger value="skills-matrix" className="flex items-center gap-2">
              <Grid3x3 className="h-4 w-4" /> Skills Matrix
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
                <div className="mb-4">
                  <SavedViewsBar entity="people" fields={peopleFields} value={peopleViewFilter} onChange={setPeopleViewFilter} />
                </div>
                {isLoading ? (
                  <div className="space-y-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : (() => {
                  const q = capacitySearch.toLowerCase();
                  const baseFiltered = (capacity ?? []).filter(u => {
                    const matchSearch = !q || u.userName?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q);
                    const matchDept = deptFilter === "all" || u.department === deptFilter;
                    return matchSearch && matchDept;
                  });
                  const filtered = evaluateFilters(baseFiltered, peopleFields, peopleViewFilter);
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
            <SavedViewsBar entity="resource_requests" fields={REQUEST_FIELDS} value={requestsViewFilter} onChange={setRequestsViewFilter} />
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
                const showLow = showLowMatchMap[req.id] ?? false;

                const typeLabels: Record<string,string> = {
                  add_member: "Add Member", add_hours: "Add Hours",
                  assign_placeholder: "Assign Placeholder", replacement: "Replacement",
                  shift_allocations: "Shift Allocations", delete_allocation: "Delete Allocation",
                };

                const cardBorder = req.status === "Pending" ? "border-amber-200 dark:border-amber-800"
                  : req.status === "Blocked" ? "border-red-300 dark:border-red-800"
                  : req.status === "Approved" ? "border-blue-200 dark:border-blue-800"
                  : "";

                const hasStructuredSkills = (req.requiredSkillsWithLevel ?? []).length > 0;
                const hasAnySkills = hasStructuredSkills || (req.requiredSkills ?? []).length > 0;

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

                          {hasStructuredSkills && (
                            <div className="flex flex-wrap gap-1.5">
                              {(req.requiredSkillsWithLevel as any[]).map((s: any) => (
                                <span key={s.skillId ?? s.skillName} className="flex items-center gap-1 px-2 py-0.5 rounded border bg-slate-50 text-xs font-medium">
                                  {s.skillName}
                                  <ProficiencyLabel level={s.competencyLevel} />
                                </span>
                              ))}
                            </div>
                          )}
                          {!hasStructuredSkills && (req.requiredSkills ?? []).length > 0 && (
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
                      {req.status === "Pending" && users && (users as any[]).length > 0 && (() => {
                        const allCandidates = (users as any[])
                          .filter((u: any) => u.isInternal !== false)
                          .map((u: any) => {
                            const fc = forecastedUtil(u.id, Number(req.hoursPerWeek), ignoreSoft);
                            const sm = scoreCandidate(u.id, req);
                            return { ...u, fc, sm };
                          })
                          .sort((a: any, b: any) => {
                            if (hasAnySkills) {
                              const diff = b.sm.score - a.sm.score;
                              if (Math.abs(diff) > 0.5) return diff;
                            }
                            return a.fc.pct - b.fc.pct;
                          });

                        const qualifiedCandidates = hasAnySkills ? allCandidates.filter((c: any) => c.sm.score >= 50) : allCandidates;
                        const lowCandidates = hasAnySkills ? allCandidates.filter((c: any) => c.sm.score < 50) : [];
                        const displayCandidates = (showLow ? allCandidates : qualifiedCandidates).slice(0, 8);

                        if (allCandidates.length === 0) return null;

                        return (
                          <div className="border rounded-lg p-3 bg-slate-50 dark:bg-slate-900/30 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Candidate Matches</p>
                                {hasAnySkills && (
                                  <span className="text-xs text-indigo-600">{qualifiedCandidates.length} of {allCandidates.length} meet ≥50%</span>
                                )}
                              </div>
                              {hasAnySkills && lowCandidates.length > 0 && (
                                <button
                                  className="text-xs text-muted-foreground flex items-center gap-0.5 hover:text-foreground"
                                  onClick={() => setShowLowMatchMap(m => ({ ...m, [req.id]: !showLow }))}
                                >
                                  {showLow ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  {showLow ? "Hide low matches" : `Show ${lowCandidates.length} low match${lowCandidates.length !== 1 ? "es" : ""}`}
                                </button>
                              )}
                            </div>

                            <div className="space-y-2">
                              {displayCandidates.map((u: any) => {
                                const { fc, sm } = u;
                                const pctClass = fc.pct > 100 ? "text-red-600" : fc.pct > 80 ? "text-amber-600" : "text-green-600";
                                return (
                                  <div key={u.id} className="rounded-md border bg-white dark:bg-slate-950 p-2 space-y-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Avatar className="h-6 w-6 shrink-0">
                                        <AvatarFallback className="text-[10px]">{u.initials}</AvatarFallback>
                                      </Avatar>
                                      <span className="font-medium text-xs">{u.name}</span>
                                      <span className="text-muted-foreground text-xs">{u.role}</span>
                                      {hasAnySkills && <MatchScoreBadge score={sm.score} total={sm.total} />}
                                      <span className={`text-xs font-medium ml-auto ${pctClass}`}>
                                        {fc.current}h → {fc.proposed}h ({fc.pct}% cap)
                                      </span>
                                    </div>

                                    {hasAnySkills && sm.details.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {sm.details.map(d => (
                                          <span key={d.skillName} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${d.meets ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                                            {d.meets ? "✓" : "✗"} {d.skillName}
                                            {d.userLevel ? <ProficiencyLabel level={d.userLevel} /> : <span className="opacity-60">—</span>}
                                            <span className="opacity-60">/ needed: {d.required}</span>
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    <UtilisationHeatmap userId={u.id} weekCount={8} compact fromDate={new Date(req.startDate)} />
                                  </div>
                                );
                              })}
                            </div>

                            {ignoreSoft && <p className="text-xs text-indigo-500">* Soft allocations excluded from utilization</p>}

                            {hasAnySkills && (
                              <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1 border-t">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-100 border border-green-300 inline-block" /> ≥100% — all skills met</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-50 border border-amber-300 inline-block" /> 50–99% — partial match</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-50 border border-red-300 inline-block" /> &lt;50% — low match</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}

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

          <TabsContent value="skills-matrix" className="m-0">
            <SkillsMatrix />
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign & Allocate</DialogTitle>
            <DialogDescription>Select a team member to assign. An allocation record will be automatically created on approval.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const req = fulfillRequestId ? allRequests.find((r: any) => r.id === fulfillRequestId) : null;
              if (!req || !users) return null;

              const scoredUsers = (users as any[])
                .filter((u: any) => u.isInternal !== false)
                .map((u: any) => {
                  const fc = forecastedUtil(u.id, Number(req.hoursPerWeek), ignoreSoft);
                  const sm = scoreCandidate(u.id, req);
                  return { ...u, fc, sm };
                })
                .sort((a: any, b: any) => {
                  const hasSkills = (req.requiredSkillsWithLevel ?? []).length > 0 || (req.requiredSkills ?? []).length > 0;
                  if (hasSkills) return b.sm.score - a.sm.score;
                  return a.fc.pct - b.fc.pct;
                });

              return (
                <>
                  <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
                    {scoredUsers.map((u: any) => {
                      const { fc, sm } = u;
                      const isSelected = assignUserId === String(u.id);
                      const pctClass = fc.pct > 100 ? "text-red-600" : fc.pct > 80 ? "text-amber-600" : "text-green-600";
                      return (
                        <button
                          key={u.id}
                          className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-muted/50 transition-colors ${isSelected ? "bg-indigo-50 dark:bg-indigo-900/20" : ""}`}
                          onClick={() => setAssignUserId(String(u.id))}
                        >
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback className="text-[10px]">{u.initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-xs">{u.name}</span>
                              <span className="text-muted-foreground text-xs">{u.role}</span>
                              {sm.total > 0 && <MatchScoreBadge score={sm.score} total={sm.total} />}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs ${pctClass}`}>{fc.proposed}h/wk ({fc.pct}% cap)</span>
                              {fc.pct > 100 && <span className="text-red-500 text-[10px]">⚠ Overallocated</span>}
                            </div>
                          </div>
                          {isSelected && <CheckCircle className="h-4 w-4 text-indigo-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {assignUserId && (() => {
                    const sel = scoredUsers.find((u: any) => String(u.id) === assignUserId);
                    if (!sel) return null;
                    const { fc } = sel;
                    const pctClass = fc.pct > 100 ? "text-red-600 font-bold" : fc.pct > 80 ? "text-amber-600 font-semibold" : "text-green-600 font-semibold";
                    return (
                      <div className="rounded-lg border p-3 bg-slate-50 text-sm space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Forecasted utilization after assignment</p>
                        <p>Current: <span className="font-medium">{fc.current}h/wk</span> + Proposed: <span className="font-medium">{req.hoursPerWeek}h/wk</span> = <span className={pctClass}>{fc.proposed}h ({fc.pct}% of {fc.capacity}h capacity)</span></p>
                        {fc.pct > 100 && <p className="text-red-600 text-xs">⚠ This will over-allocate the team member. Consider reassigning or adjusting hours.</p>}
                        {ignoreSoft && <p className="text-xs text-indigo-500">* Soft allocations excluded</p>}
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1">Availability next 8 weeks from request start:</p>
                          <UtilisationHeatmap userId={sel.id} weekCount={8} compact fromDate={new Date(req.startDate)} />
                        </div>
                      </div>
                    );
                  })()}
                </>
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
              <div className="space-y-4">
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

                <div>
                  <h3 className="text-sm font-semibold mb-2">Utilization Heat Map (next 12 weeks)</h3>
                  <UtilisationHeatmap userId={profileUser.userId} weekCount={12} compact />
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </Layout>
  );
}
