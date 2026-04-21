import { useState } from "react";
import { Layout } from "@/components/layout";
import { UtilisationHeatmap } from "@/components/utilisation-heatmap";
import {
  useGetCapacityOverview, useListUsers, useListProjects, useListResourceRequests, useUpdateResourceRequestStatus, getListResourceRequestsQueryKey,
  useGetUserSkills,
  useListSkills,
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Users, Briefcase, CalendarRange, AlertTriangle, Search } from "lucide-react";
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

  const getProject = (id: number) => projects?.find(p => p.id === id);
  const getUser = (id: number) => users?.find(u => u.id === id);

  const pendingRequests = requests?.filter(r => r.status === "Pending") ?? [];
  const allRequests = requests ?? [];

  async function handleApprove(id: number) {
    try {
      await updateStatus.mutateAsync({ id, data: { status: "Approved" } });
      queryClient.invalidateQueries({ queryKey: getListResourceRequestsQueryKey() });
      toast({ title: "Request approved" });
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

  async function handleFulfill() {
    if (!fulfillRequestId) return;
    try {
      await updateStatus.mutateAsync({
        id: fulfillRequestId,
        data: { status: "Fulfilled", assignedUserId: assignUserId ? parseInt(assignUserId) : undefined }
      });
      queryClient.invalidateQueries({ queryKey: getListResourceRequestsQueryKey() });
      toast({ title: "Request fulfilled" });
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
                          <TableRow key={user.userId}>
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

          <TabsContent value="requests" className="m-0 space-y-4">
            {isLoadingRequests ? (
              <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>
            ) : allRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No resource requests</p>
                  <p className="text-sm mt-1">Resource requests from project managers will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              allRequests.map(req => {
                const project = getProject(req.projectId);
                const requester = getUser(req.requestedByUserId);
                const assignedUser = req.assignedUserId ? getUser(req.assignedUserId) : null;
                return (
                  <Card key={req.id} className={req.status === "Pending" ? "border-amber-200 dark:border-amber-800" : ""}>
                    <CardContent className="pt-5">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-base">{req.role}</span>
                            <StatusBadge status={req.status} />
                            <PriorityBadge priority={req.priority} />
                          </div>
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />{project?.name ?? `Project #${req.projectId}`}</span>
                            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{req.hoursPerWeek} hrs/week</span>
                            <span className="flex items-center gap-1.5"><CalendarRange className="h-3.5 w-3.5" />{req.startDate} → {req.endDate}</span>
                            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Requested by {requester?.name ?? `User #${req.requestedByUserId}`}</span>
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
                              <XCircle className="h-3.5 w-3.5" />Rejection reason: {req.rejectionReason}
                            </p>
                          )}
                        </div>

                        {req.status === "Pending" && (
                          <div className="flex gap-2 shrink-0">
                            <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30" onClick={() => handleApprove(req.id)} disabled={updateStatus.isPending}>
                              <CheckCircle className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => { setSelectedRequestId(req.id); setRejectDialogOpen(true); }} disabled={updateStatus.isPending}>
                              <XCircle className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                        {req.status === "Approved" && (
                          <Button size="sm" onClick={() => { setFulfillRequestId(req.id); setAssignDialogOpen(true); }} disabled={updateStatus.isPending}>
                            <CheckCircle className="h-4 w-4 mr-1" /> Fulfill
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>

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

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fulfill Resource Request</DialogTitle><DialogDescription>Assign a team member to fulfill this request.</DialogDescription></DialogHeader>
          <Select onValueChange={setAssignUserId} value={assignUserId}>
            <SelectTrigger><SelectValue placeholder="Select team member (optional)" /></SelectTrigger>
            <SelectContent>
              {users?.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name} — {u.role}</SelectItem>)}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleFulfill} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? "Fulfilling..." : "Mark as Fulfilled"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
