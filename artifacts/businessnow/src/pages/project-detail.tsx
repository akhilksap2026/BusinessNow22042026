import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useGetProject, useGetProjectSummary, useListTasks, useListUsers, useListAllocations, useCreateAllocation, useUpdateAllocation, useDeleteAllocation, useGetProjectCsatSummary, useUpdateProject, useCreateResourceRequest, useUpdateTask, useListTimeEntries, getGetProjectQueryKey, getGetProjectSummaryQueryKey, getListTasksQueryKey, getListAllocationsQueryKey, getGetProjectCsatSummaryQueryKey, listPortalTokens, createPortalToken, useListSkills } from "@workspace/api-client-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams, Link } from "wouter";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Calendar, Clock, DollarSign, Users, Target, Star, MessageSquare, Plus, Pencil, Trash2, FileText, FileQuestion, Share2, Copy, Check, BarChart2, Settings2, PackagePlus, LayoutList, Kanban, TrendingUp, LayoutTemplate, AlertTriangle, ShieldAlert, CheckCircle2, Send, ChevronDown, Filter, X as XIcon, Bell } from "lucide-react";
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
import { useCurrentUser } from "@/contexts/current-user";
import ProjectGantt from "@/components/project-gantt";
import { TrackedTimeTab } from "@/components/tracked-time-tab";


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
  const { currentUser, activeRole } = useCurrentUser();
  const viewerRole = activeRole ?? "PM";
  const createAllocation = useCreateAllocation();
  const updateAllocation = useUpdateAllocation();
  const deleteAllocation = useDeleteAllocation();
  const updateProject = useUpdateProject();
  const createResourceRequest = useCreateResourceRequest();

  const [shareOpen, setShareOpen] = useState(false);
  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false);
  const [taskView, setTaskView] = useState<"list" | "board">("list");
  const [activeTab, setActiveTab] = useState("tasks");
  const [taskFilter, setTaskFilter] = useState<"overdue" | "blocked" | "at_risk" | "on_track" | null>(null);
  const [updateForm, setUpdateForm] = useState({ subject: "", body: "", type: "internal" });
  const [sendingUpdate, setSendingUpdate] = useState(false);
  const updateTask = useUpdateTask();

  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [editProjectForm, setEditProjectForm] = useState<{ name: string; status: string; health: string; budget: string; description: string; autoAllocate: boolean }>({
    name: "", status: "", health: "", budget: "", description: "", autoAllocate: false,
  });

  const emptyCoForm = {
    title: "", description: "", amount: "", additionalHours: "",
    requestedDate: "", submittedDate: "", decisionDate: "",
    status: "Draft", submittedByUserId: "", approvedByUserId: "",
    newResourceRole: "", linkedTaskTitlesRaw: "",
  };
  const [coDialogOpen, setCoDialogOpen] = useState(false);
  const [editCrId, setEditCrId] = useState<number | null>(null);
  const [coForm, setCoForm] = useState(emptyCoForm);

  function openNewCR() {
    setEditCrId(null);
    setCoForm(emptyCoForm);
    setCoDialogOpen(true);
  }

  function openEditCR(co: any) {
    setEditCrId(co.id);
    setCoForm({
      title: co.title ?? "",
      description: co.description ?? "",
      amount: String(co.amount ?? ""),
      additionalHours: String(co.additionalHours ?? ""),
      requestedDate: co.requestedDate ?? "",
      submittedDate: co.submittedDate ?? "",
      decisionDate: co.decisionDate ?? "",
      status: co.status ?? "Draft",
      submittedByUserId: co.submittedByUserId ? String(co.submittedByUserId) : "",
      approvedByUserId: co.approvedByUserId ? String(co.approvedByUserId) : "",
      newResourceRole: co.newResourceRole ?? "",
      linkedTaskTitlesRaw: (co.linkedTaskTitles ?? []).join(", "),
    });
    setCoDialogOpen(true);
  }

  async function handleSaveCR() {
    if (!coForm.title) return;
    const linkedTaskTitles = coForm.linkedTaskTitlesRaw
      .split(",").map(s => s.trim()).filter(Boolean);
    const payload = {
      title: coForm.title,
      description: coForm.description || undefined,
      amount: parseFloat(coForm.amount) || 0,
      additionalHours: parseFloat(coForm.additionalHours) || 0,
      status: coForm.status,
      requestedDate: coForm.requestedDate || undefined,
      submittedDate: coForm.submittedDate || undefined,
      decisionDate: coForm.decisionDate || undefined,
      submittedByUserId: coForm.submittedByUserId ? parseInt(coForm.submittedByUserId) : undefined,
      approvedByUserId: coForm.approvedByUserId ? parseInt(coForm.approvedByUserId) : undefined,
      newResourceRole: coForm.newResourceRole || undefined,
      linkedTaskTitles,
    };
    try {
      if (editCrId) {
        await fetch(`/api/change-orders/${editCrId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-user-role": "PM" },
          body: JSON.stringify(payload),
        });
        toast({ title: "Change request updated" });
      } else {
        await fetch(`/api/projects/${projectId}/change-orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-role": "PM" },
          body: JSON.stringify(payload),
        });
        toast({ title: "Change request created" });
      }
      refetchChangeOrders();
      setCoDialogOpen(false);
    } catch {
      toast({ title: "Failed to save change request", variant: "destructive" });
    }
  }

  async function handleUpdateCOStatus(coId: number, status: string) {
    try {
      const decisionDate = ["Approved", "Rejected"].includes(status)
        ? new Date().toISOString().slice(0, 10) : undefined;
      await fetch(`/api/change-orders/${coId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-role": "PM" },
        body: JSON.stringify({ status, ...(decisionDate ? { decisionDate } : {}) }),
      });
      refetchChangeOrders();
    } catch {
      toast({ title: "Failed to update change request", variant: "destructive" });
    }
  }

  async function handleDeleteCO(coId: number) {
    try {
      await fetch(`/api/change-orders/${coId}`, { method: "DELETE", headers: { "x-user-role": "PM" } });
      refetchChangeOrders();
    } catch {
      toast({ title: "Failed to delete change request", variant: "destructive" });
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
      autoAllocate: !!(project as any).autoAllocate,
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
          autoAllocate: editProjectForm.autoAllocate,
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
  const RES_REQ_FORM_INIT = {
    type: "add_member",
    role: "", startDate: "", endDate: "",
    hoursPerWeek: "40", hoursPerDay: "8",
    allocationMethod: "hours_per_day" as "hours_per_day" | "percentage_capacity" | "total_hours",
    priority: "Medium", notes: "",
    region: "", targetUserId: "", skillIds: [] as number[],
    skillCompetencies: {} as Record<number, string>,
    additionalHours: "",
    placeholderId: "",
    replacementReason: "",
  };
  const [resReqForm, setResReqForm] = useState(RES_REQ_FORM_INIT);
  const { data: allSkillsList } = useListSkills();
  const { data: users } = useListUsers();

  const [jobRoles, setJobRoles] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    fetch("/api/job-roles").then(r => r.ok ? r.json() : []).then(setJobRoles).catch(() => {});
  }, []);

  const getUser = (userId: number) => users?.find(u => u.id === userId);

  const RES_REQ_TYPES = [
    { value: "add_member", label: "Add New Team Member", desc: "Request a new person to join the project" },
    { value: "add_hours", label: "Add Hours", desc: "Increase allocation hours for an existing member" },
    { value: "assign_placeholder", label: "Assign Placeholder", desc: "Fill an open placeholder slot" },
    { value: "replacement", label: "Replacement", desc: "Replace an existing team member" },
  ];

  // Relevant matches: filter users by role keyword
  const resReqMatches = (users as any[] ?? []).filter((u: any) => {
    if (!resReqForm.role) return false;
    return u.role?.toLowerCase().includes(resReqForm.role.toLowerCase().split(" ").pop() ?? "");
  }).slice(0, 3);

  // ─── Helpers used by the request-type-specific form blocks ────────────
  const projectAllocations = (allocations as any[] ?? []);

  // Members already allocated to THIS project (deduped by userId).
  const projectMembers = projectAllocations
    .filter((a: any) => a.userId)
    .filter((a: any, i: number, arr: any[]) => arr.findIndex(b => b.userId === a.userId) === i);

  // Unfilled placeholder slots on this project.
  const unfilledPlaceholders = projectAllocations.filter((a: any) =>
    !a.userId && (a.placeholderRole || a.placeholderId || a.role)
  );

  // For 'add_hours': show context for the currently selected member.
  function currentAllocatedHoursForTarget(): { hpw: number; allocs: any[] } {
    const uid = resReqForm.targetUserId ? parseInt(resReqForm.targetUserId) : null;
    if (!uid) return { hpw: 0, allocs: [] };
    const mine = projectAllocations.filter((a: any) => a.userId === uid);
    const hpw = mine.reduce((s: number, a: any) => s + Number(a.hoursPerWeek ?? 0), 0);
    return { hpw, allocs: mine };
  }

  // Pre-fill dates when a placeholder is selected for assign_placeholder.
  function onPickPlaceholder(placeholderRowId: string) {
    const ph = unfilledPlaceholders.find((a: any) => String(a.id) === placeholderRowId);
    setResReqForm(f => ({
      ...f,
      placeholderId: placeholderRowId,
      role: ph?.role ?? ph?.placeholderRole ?? f.role,
      startDate: ph?.startDate ?? f.startDate,
      endDate: ph?.endDate ?? f.endDate,
      hoursPerWeek: ph?.hoursPerWeek != null ? String(ph.hoursPerWeek) : f.hoursPerWeek,
    }));
  }

  const projectAutoAllocate = !!(project as any)?.autoAllocate;

  // Per-type validity (drives the Submit button + first-line guard).
  function isReqFormValid(): boolean {
    const f = resReqForm;
    if (f.type === "add_member") {
      return !!(f.role && f.startDate && f.endDate && parseFloat(f.hoursPerDay) > 0);
    }
    if (f.type === "add_hours") {
      return !!(f.targetUserId && f.startDate && f.endDate && parseFloat(f.additionalHours) > 0);
    }
    if (f.type === "assign_placeholder") {
      return !!(f.placeholderId);
    }
    if (f.type === "replacement") {
      // targetUserId is either a numeric user id or "ph-<allocId>"; both are valid replacement targets.
      return !!(f.targetUserId && f.startDate && f.endDate && !projectAutoAllocate);
    }
    return false;
  }

  async function handleSaveResReq() {
    if (!isReqFormValid()) return;
    if (resReqForm.type === "replacement" && projectAutoAllocate) {
      toast({ title: "Replacement requests are not available for auto-allocate projects", variant: "destructive" });
      return;
    }
    try {
      const selectedSkills = (allSkillsList as any[] ?? []).filter((s: any) => resReqForm.skillIds.includes(s.id));
      const skillNames = selectedSkills.map((s: any) => s.name);
      const requiredSkillsWithLevel = selectedSkills.map((s: any) => ({
        skillId: s.id,
        skillName: s.name,
        competencyLevel: resReqForm.skillCompetencies[s.id] ?? "Independent",
      }));

      // Per-type derivation of role / hoursPerWeek / notes so the existing
      // backend schema (role + hoursPerWeek required) is satisfied for every
      // request shape without changing the state machine.
      let role = resReqForm.role;
      let hoursPerWeek = parseFloat(resReqForm.hoursPerWeek) || 0;
      let startDate = resReqForm.startDate;
      let endDate = resReqForm.endDate;
      let notesAddon = "";

      if (resReqForm.type === "add_member") {
        const hpd = parseFloat(resReqForm.hoursPerDay) || 0;
        hoursPerWeek = hpd * 5;
      } else if (resReqForm.type === "add_hours") {
        const target = projectMembers.find((a: any) => String(a.userId) === resReqForm.targetUserId);
        role = target?.role ?? "Existing Member";
        hoursPerWeek = parseFloat(resReqForm.additionalHours) || 0;
        notesAddon = `Additional hours requested: ${resReqForm.additionalHours} hrs/wk`;
      } else if (resReqForm.type === "assign_placeholder") {
        const ph = unfilledPlaceholders.find((a: any) => String(a.id) === resReqForm.placeholderId);
        role = ph?.role ?? ph?.placeholderRole ?? role ?? "Placeholder";
        startDate = ph?.startDate ?? startDate;
        endDate = ph?.endDate ?? endDate;
        hoursPerWeek = Number(ph?.hoursPerWeek ?? hoursPerWeek);
        notesAddon = `Fill placeholder #${resReqForm.placeholderId} (${role})`;
      } else if (resReqForm.type === "replacement") {
        if (resReqForm.targetUserId.startsWith("ph-")) {
          const phId = resReqForm.targetUserId.slice(3);
          const ph = unfilledPlaceholders.find((a: any) => String(a.id) === phId);
          role = ph?.role ?? ph?.placeholderRole ?? role ?? "Replacement";
          hoursPerWeek = Number(ph?.hoursPerWeek ?? hoursPerWeek);
          notesAddon = `Replace placeholder #${phId} (${role}). Reason: ${resReqForm.replacementReason || "(none provided)"}`;
        } else {
          const target = projectMembers.find((a: any) => String(a.userId) === resReqForm.targetUserId);
          role = target?.role ?? role ?? "Replacement";
          hoursPerWeek = Number(target?.hoursPerWeek ?? hoursPerWeek);
          notesAddon = `Reason: ${resReqForm.replacementReason || "(none provided)"}`;
        }
      }

      const composedNotes = [resReqForm.notes, notesAddon].filter(Boolean).join("\n").trim();

      const created: any = await createResourceRequest.mutateAsync({
        data: {
          projectId,
          requestedByUserId: 1,
          role,
          startDate,
          endDate,
          hoursPerWeek,
          priority: resReqForm.priority,
          notes: composedNotes || undefined,
          requiredSkills: skillNames,
          requiredSkillsWithLevel,
        } as any,
      });
      // Patch type/region/target/method on the EXACT row we just created
      // (current Zod create schema doesn't expose these optional fields).
      const newId = created?.id ?? created?.data?.id;
      if (newId) {
        // Resolve targetResourceId only when we have a real numeric user id
        // (not a placeholder pseudo-id like "ph-12").
        const numericTarget =
          resReqForm.targetUserId && !resReqForm.targetUserId.startsWith("ph-")
            ? parseInt(resReqForm.targetUserId)
            : undefined;

        await fetch(`/api/resource-requests/${newId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-user-role": "PM" },
          body: JSON.stringify({
            type: resReqForm.type,
            region: resReqForm.region || undefined,
            targetResourceId: Number.isFinite(numericTarget) ? numericTarget : undefined,
            allocationMethod: resReqForm.type === "add_member" ? resReqForm.allocationMethod : undefined,
          }),
        });
      }
      toast({ title: "Resource request submitted" });
      setResReqOpen(false);
      setResReqForm(RES_REQ_FORM_INIT);
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

  // Allocation input methods. Persist last-used choice so the form opens
  // with the user's preferred method next time.
  type AllocMethod = "hours_per_day" | "percentage_capacity" | "total_hours";
  const ALLOC_METHOD_LS_KEY = "businessnow.alloc.lastMethod";
  function readPreferredMethod(): AllocMethod {
    try {
      const v = localStorage.getItem(ALLOC_METHOD_LS_KEY);
      if (v === "hours_per_day" || v === "total_hours") return v;
      // Accept legacy "pct_capacity" value alongside the canonical token.
      if (v === "percentage_capacity" || v === "pct_capacity") return "percentage_capacity";
    } catch { /* ignore */ }
    return "hours_per_day";
  }

  const [allocForm, setAllocForm] = useState({
    userId: "",
    role: "",
    startDate: "",
    endDate: "",
    method: "hours_per_day" as AllocMethod,
    methodValue: "8",
    isSoftAllocation: false,
    isTimesheetApprover: false,
    isLeaveApprover: false,
  });

  // Mon–Fri working-day count between two ISO dates (inclusive).
  function workingDaysBetween(startISO: string, endISO: string): number {
    if (!startISO || !endISO) return 0;
    const s = new Date(startISO + "T00:00:00Z");
    const e = new Date(endISO + "T00:00:00Z");
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
    let n = 0;
    const cur = new Date(s);
    while (cur <= e) {
      const d = cur.getUTCDay();
      if (d !== 0 && d !== 6) n++;
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return n;
  }

  // Capacity (weekly hours) of the currently-selected user; defaults to 40.
  function selectedUserWeeklyCapacity(): number {
    const uid = allocForm.userId ? parseInt(allocForm.userId) : null;
    if (!uid) return 40;
    const u = (users ?? []).find(x => x.id === uid);
    return Number((u as any)?.capacity ?? 40);
  }

  // Live derivation of all storage fields from the chosen method.
  function deriveAllocFields(method: AllocMethod, rawValue: string, startDate: string, endDate: string) {
    const v = parseFloat(rawValue);
    const value = isFinite(v) && v >= 0 ? v : 0;
    const weeklyCap = selectedUserWeeklyCapacity();
    const dailyCap = weeklyCap / 5;
    const wd = workingDaysBetween(startDate, endDate);
    let hoursPerDay = 0;
    let hoursPerWeek = 0;
    let totalHours = 0;
    let percentOfCapacity: number | null = null;
    if (method === "hours_per_day") {
      hoursPerDay = value;
      hoursPerWeek = value * 5;
      totalHours = value * wd;
    } else if (method === "percentage_capacity") {
      percentOfCapacity = value;
      hoursPerWeek = (weeklyCap * value) / 100;
      hoursPerDay = hoursPerWeek / 5;
      totalHours = hoursPerDay * wd;
    } else {
      // total_hours
      totalHours = value;
      hoursPerDay = wd > 0 ? value / wd : 0;
      hoursPerWeek = hoursPerDay * 5;
    }
    return { hoursPerDay, hoursPerWeek, totalHours, percentOfCapacity, workingDays: wd, dailyCap, weeklyCap };
  }

  function openNewAlloc() {
    setEditAllocId(null);
    const method = readPreferredMethod();
    const defaultValue = method === "hours_per_day" ? "8" : method === "percentage_capacity" ? "100" : "40";
    setAllocForm({ userId: "", role: "", startDate: "", endDate: "", method, methodValue: defaultValue, isSoftAllocation: false, isTimesheetApprover: false, isLeaveApprover: false });
    setAllocDialogOpen(true);
  }

  function openEditAlloc(alloc: { id: number; userId: number | null; role: string; startDate: string; endDate: string; hoursPerWeek: number; hoursPerDay?: number | string | null; totalHours?: number | string | null; percentOfCapacity?: number | string | null; allocationMethod?: string | null; isSoftAllocation?: boolean; isTimesheetApprover?: boolean; isLeaveApprover?: boolean }) {
    setEditAllocId(alloc.id);
    // Map stored allocationMethod → form method. Legacy 'hours_per_week'
    // values fall back to hours_per_day (derived) so the form always
    // surfaces one of the three exposed methods.
    const stored = alloc.allocationMethod;
    let method: AllocMethod = "hours_per_day";
    let methodValue = "";
    if (stored === "total_hours") {
      method = "total_hours";
      methodValue = String(alloc.totalHours ?? "");
    } else if (stored === "percentage_capacity") {
      method = "percentage_capacity";
      methodValue = String(alloc.percentOfCapacity ?? "");
    } else if (stored === "hours_per_day") {
      method = "hours_per_day";
      methodValue = String(alloc.hoursPerDay ?? (Number(alloc.hoursPerWeek) / 5));
    } else {
      // hours_per_week or unknown → present as hours/day
      method = "hours_per_day";
      methodValue = String(Number(alloc.hoursPerWeek) / 5);
    }
    setAllocForm({
      userId: alloc.userId?.toString() ?? "",
      role: alloc.role,
      startDate: alloc.startDate,
      endDate: alloc.endDate,
      method,
      methodValue,
      isSoftAllocation: alloc.isSoftAllocation ?? false,
      isTimesheetApprover: alloc.isTimesheetApprover ?? false,
      isLeaveApprover: alloc.isLeaveApprover ?? false,
    });
    setAllocDialogOpen(true);
  }

  async function handleSaveAlloc() {
    if (!allocForm.role || !allocForm.startDate || !allocForm.endDate) return;
    const d = deriveAllocFields(allocForm.method, allocForm.methodValue, allocForm.startDate, allocForm.endDate);
    const payload: any = {
      projectId,
      userId: allocForm.userId ? parseInt(allocForm.userId) : undefined,
      role: allocForm.role,
      startDate: allocForm.startDate,
      endDate: allocForm.endDate,
      allocationMethod: allocForm.method,
      methodValue: parseFloat(allocForm.methodValue) || 0,
      hoursPerWeek: d.hoursPerWeek,
      hoursPerDay: d.hoursPerDay,
      totalHours: d.totalHours,
      percentOfCapacity: d.percentOfCapacity,
      isSoftAllocation: allocForm.isSoftAllocation,
      isTimesheetApprover: allocForm.isTimesheetApprover,
      isLeaveApprover: allocForm.isLeaveApprover,
    };
    try {
      if (editAllocId) {
        await updateAllocation.mutateAsync({ id: editAllocId, data: payload });
      } else {
        await createAllocation.mutateAsync({ data: payload });
      }
      try { localStorage.setItem(ALLOC_METHOD_LS_KEY, allocForm.method); } catch { /* ignore */ }
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

  const { data: healthStats, refetch: refetchHealth } = useQuery<{
    total: number; completed: number; overdue: number; blocked: number; atRisk: number; onTrack: number; completionPct: number;
    phases: { id: number; name: string; status: string; totalTasks: number; completedTasks: number; completionPct: number; overdueTasks: number; startDate: string | null; endDate: string | null }[];
  }>({
    queryKey: ["health-stats", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/health-stats`);
      if (!res.ok) throw new Error("Failed to load health stats");
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: projectUpdates = [], refetch: refetchUpdates } = useQuery<any[]>({
    queryKey: ["project-updates", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/updates`);
      if (!res.ok) throw new Error("Failed to load updates");
      return res.json();
    },
    enabled: !!projectId,
  });

  async function handleSendUpdate() {
    if (!updateForm.subject) return;
    setSendingUpdate(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateForm),
      });
      if (!res.ok) throw new Error("Failed to send");
      setUpdateForm({ subject: "", body: "", type: "internal" });
      refetchUpdates();
      toast({ title: "Update sent", description: "Team has been notified." });
    } catch {
      toast({ title: "Failed to send update", variant: "destructive" });
    } finally {
      setSendingUpdate(false);
    }
  }

  if (isLoadingProject || isLoadingSummary) {
    return (
      <Layout>
        <div className="space-y-4">
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
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Breadcrumb className="mb-1.5">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/projects" className="hover:text-foreground transition-colors">Projects</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{project.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              <StatusBadge status={project.status} />
              <StatusBadge status={project.health} />
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
                {formatCurrency(summary?.invoicedAmount ?? 0)} invoiced of {formatCurrency(project.budget)}
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

        {/* ── Mini Health Stat Cards ────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => { setTaskFilter(f => f === "overdue" ? null : "overdue"); setActiveTab("tasks"); }}
            className={`rounded-xl border text-left p-3 transition-all hover:shadow-md focus:outline-none ${taskFilter === "overdue" ? "ring-2 ring-red-400 bg-red-50 dark:bg-red-950/30" : "bg-card dark:bg-card"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-xs font-medium text-muted-foreground">Overdue</span>
            </div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{healthStats?.overdue ?? "–"}</div>
            <div className="text-xs text-muted-foreground mt-0.5">tasks past due</div>
          </button>
          <button
            onClick={() => { setTaskFilter(f => f === "blocked" ? null : "blocked"); setActiveTab("tasks"); }}
            className={`rounded-xl border text-left p-3 transition-all hover:shadow-md focus:outline-none ${taskFilter === "blocked" ? "ring-2 ring-orange-400 bg-orange-50 dark:bg-orange-950/30" : "bg-card dark:bg-card"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="h-4 w-4 text-orange-500" />
              <span className="text-xs font-medium text-muted-foreground">Blocked</span>
            </div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{healthStats?.blocked ?? "–"}</div>
            <div className="text-xs text-muted-foreground mt-0.5">tasks blocked</div>
          </button>
          <button
            onClick={() => { setTaskFilter(f => f === "at_risk" ? null : "at_risk"); setActiveTab("tasks"); }}
            className={`rounded-xl border text-left p-3 transition-all hover:shadow-md focus:outline-none ${taskFilter === "at_risk" ? "ring-2 ring-amber-400 bg-amber-50 dark:bg-amber-950/30" : "bg-card dark:bg-card"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-muted-foreground">At Risk</span>
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{healthStats?.atRisk ?? "–"}</div>
            <div className="text-xs text-muted-foreground mt-0.5">milestones at risk</div>
          </button>
          <button
            onClick={() => { setTaskFilter(f => f === "on_track" ? null : "on_track"); setActiveTab("tasks"); }}
            className={`rounded-xl border text-left p-3 transition-all hover:shadow-md focus:outline-none ${taskFilter === "on_track" ? "ring-2 ring-green-400 bg-green-50 dark:bg-green-950/30" : "bg-card dark:bg-card"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-xs font-medium text-muted-foreground">On Track</span>
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{healthStats?.onTrack ?? "–"}</div>
            <div className="text-xs text-muted-foreground mt-0.5">in progress, on time</div>
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto scrollbar-none mb-4">
            <TabsList className="w-max">
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="team">Team & Allocations</TabsTrigger>
              <TabsTrigger value="financials">Financials</TabsTrigger>
              <TabsTrigger value="changes" className="flex items-center gap-1.5">
                <PackagePlus className="h-4 w-4" />
                Change Requests
                {changeOrders && changeOrders.length > 0 && (
                  <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded-full text-xs px-1.5 py-0.5 leading-none">{changeOrders.length}</span>
                )}
              </TabsTrigger>
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
              <TabsTrigger value="updates" className="flex items-center gap-1.5">
                <Bell className="h-4 w-4" />
                Updates
                {projectUpdates.length > 0 && (
                  <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs px-1.5 py-0.5 leading-none">{projectUpdates.length}</span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>
          
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
                {/* ── Active Filter Banner ──────────────────────────── */}
                {taskFilter && (
                  <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                      Showing: {taskFilter === "overdue" ? "Overdue tasks" : taskFilter === "blocked" ? "Blocked tasks" : taskFilter === "at_risk" ? "At-risk milestones" : "On-track tasks"}
                    </span>
                    <button onClick={() => setTaskFilter(null)} className="ml-auto flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200">
                      <XIcon className="h-3.5 w-3.5" /> Clear filter
                    </button>
                  </div>
                )}
                {taskFilter && (
                  <div className="mb-4 space-y-2">
                    {(() => {
                      const today = new Date().toISOString().slice(0, 10);
                      let filtered = (tasks || []).filter((t: any) => {
                        if (taskFilter === "overdue") return t.dueDate && t.dueDate < today && t.status !== "Completed" && !t.isMilestone;
                        if (taskFilter === "blocked") return t.status === "Blocked";
                        if (taskFilter === "at_risk") return t.isMilestone && t.dueDate && t.dueDate > today && t.status !== "Completed" && new Date(t.dueDate).getTime() - Date.now() < 7 * 86400000;
                        if (taskFilter === "on_track") return t.status === "In Progress" && (!t.dueDate || t.dueDate >= today) && !t.isMilestone;
                        return false;
                      });
                      if (filtered.length === 0) return <p className="text-sm text-muted-foreground py-2">No tasks match this filter.</p>;
                      return filtered.map((t: any) => (
                        <div key={t.id} className="flex items-center justify-between px-3 py-2 rounded-md border bg-card text-sm gap-3">
                          <span className="font-medium truncate">{t.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            {t.isMilestone && <span className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 px-1.5 py-0.5 rounded-full">Milestone</span>}
                            <StatusBadge status={t.status} />
                            {t.dueDate && <span className="text-xs text-muted-foreground">Due {t.dueDate}</span>}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}

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
                                      <StatusBadge status={task.priority} />
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
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditAlloc({ id: allocation.id, userId: allocation.userId, role: allocation.role, startDate: allocation.startDate, endDate: allocation.endDate, hoursPerWeek: allocation.hoursPerWeek, hoursPerDay: (allocation as any).hoursPerDay, totalHours: (allocation as any).totalHours, percentOfCapacity: (allocation as any).percentOfCapacity, allocationMethod: (allocation as any).allocationMethod, isSoftAllocation: (allocation as any).isSoftAllocation ?? false, isTimesheetApprover: (allocation as any).isTimesheetApprover ?? false, isLeaveApprover: (allocation as any).isLeaveApprover ?? false })}>
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
                          <p className="text-2xl font-bold">{formatCurrency(project.budget)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Approved Change Orders</p>
                          <p className="text-xl font-semibold text-green-700">+{formatCurrency(coValue)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                          <p className="text-xl font-bold">{formatCurrency(revenue)}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Invoiced Amount</p>
                          <p className="text-xl font-semibold">{formatCurrency(summary?.invoicedAmount ?? 0)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Pending Amount</p>
                          <p className="text-xl font-semibold text-muted-foreground">{formatCurrency(summary?.pendingAmount ?? 0)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Billing Type</p>
                          <Badge variant="outline">{project.billingType}</Badge>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Est. Resource Cost</p>
                          <p className="text-xl font-semibold text-red-600">{formatCurrency(estimatedCost)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Gross Margin</p>
                          <p className={`text-xl font-bold ${marginColor}`}>{formatCurrency(margin)}</p>
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

            {/* Change Requests summary callout */}
            {changeOrders && changeOrders.length > 0 && (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <PackagePlus className="h-5 w-5 text-amber-600" />
                      <div>
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                          {changeOrders.filter((co: any) => co.status === "Approved").length} Approved Change Request{changeOrders.filter((co: any) => co.status === "Approved").length !== 1 ? "s" : ""} of {changeOrders.length} total
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          Budget impact already reflected in Total Revenue above.
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100" onClick={() => setActiveTab("changes")}>
                      View All CRs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tracked Time — full editable table */}
            <TrackedTimeTab projectId={projectId} viewerRole={viewerRole} />
          </TabsContent>

          {/* ── Change Requests tab ─────────────────────────────────────────── */}
          <TabsContent value="changes" className="m-0 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Change Requests</h3>
                <p className="text-sm text-muted-foreground">Track scope changes, budget adjustments, and approval workflow.</p>
              </div>
              <Button size="sm" onClick={openNewCR}>
                <Plus className="h-4 w-4 mr-1" /> New CR
              </Button>
            </div>

            {!changeOrders || changeOrders.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  <PackagePlus className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No change requests yet</p>
                  <p className="text-xs mt-1">Create one to document scope changes and budget adjustments.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">CR #</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted by</TableHead>
                        <TableHead className="text-right">Cost Impact</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Decision</TableHead>
                        <TableHead className="w-20" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(changeOrders ?? []).map((co: any) => {
                        const submitter = (users as any[])?.find((u: any) => u.id === co.submittedByUserId);
                        const statusColors: Record<string, string> = {
                          Draft: "bg-slate-100 text-slate-700",
                          Submitted: "bg-blue-100 text-blue-700",
                          Approved: "bg-green-100 text-green-700",
                          Rejected: "bg-red-100 text-red-700",
                        };
                        return (
                          <TableRow key={co.id}>
                            <TableCell className="font-mono text-xs font-semibold text-muted-foreground">{co.crNumber ?? "—"}</TableCell>
                            <TableCell>
                              <div className="font-medium">{co.title}</div>
                              {co.description && <div className="text-xs text-muted-foreground truncate max-w-48">{co.description}</div>}
                            </TableCell>
                            <TableCell>
                              <Select value={co.status} onValueChange={val => handleUpdateCOStatus(co.id, val)}>
                                <SelectTrigger className={`h-7 w-28 text-xs border-0 ${statusColors[co.status] ?? ""}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {["Draft", "Submitted", "Approved", "Rejected"].map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-sm">{submitter?.name ?? (co.submittedByUserId ? `User ${co.submittedByUserId}` : "—")}</TableCell>
                            <TableCell className="text-right font-medium text-green-700">+{formatCurrency(Number(co.amount))}</TableCell>
                            <TableCell className="text-right text-sm">{Number(co.additionalHours) > 0 ? `+${Number(co.additionalHours)}h` : "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{co.submittedDate ? new Date(co.submittedDate + "T00:00:00").toLocaleDateString() : "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{co.decisionDate ? new Date(co.decisionDate + "T00:00:00").toLocaleDateString() : "—"}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => openEditCR(co)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => handleDeleteCO(co.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Full CR Form Dialog ──────────────────────────────────────────── */}
          <Dialog open={coDialogOpen} onOpenChange={setCoDialogOpen}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editCrId ? "Edit Change Request" : "New Change Request"}</DialogTitle>
                <DialogDescription>Document scope changes, budget impact, and approval workflow.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Title + Status */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <Label>Title *</Label>
                    <Input placeholder="e.g. Additional API integrations" value={coForm.title} onChange={e => setCoForm(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={coForm.status} onValueChange={v => setCoForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Draft", "Submitted", "Approved", "Rejected"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label>Description of Scope Change</Label>
                  <Textarea placeholder="Describe what is changing and why…" rows={3} value={coForm.description} onChange={e => setCoForm(f => ({ ...f, description: e.target.value }))} />
                </div>

                {/* Budget + Hours impact */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Additional Cost ($)</Label>
                    <Input type="number" min={0} placeholder="0" value={coForm.amount} onChange={e => setCoForm(f => ({ ...f, amount: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Additional Hours</Label>
                    <Input type="number" min={0} placeholder="0" value={coForm.additionalHours} onChange={e => setCoForm(f => ({ ...f, additionalHours: e.target.value }))} />
                  </div>
                </div>

                {/* People */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Submitted By</Label>
                    <Select value={coForm.submittedByUserId || "__none__"} onValueChange={v => setCoForm(f => ({ ...f, submittedByUserId: v === "__none__" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Select team member…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— None —</SelectItem>
                        {(users as any[] ?? []).map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Approved By</Label>
                    <Select value={coForm.approvedByUserId || "__none__"} onValueChange={v => setCoForm(f => ({ ...f, approvedByUserId: v === "__none__" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Select team member…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— None —</SelectItem>
                        {(users as any[] ?? []).map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Requested Date</Label>
                    <Input type="date" value={coForm.requestedDate} onChange={e => setCoForm(f => ({ ...f, requestedDate: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Submission Date</Label>
                    <Input type="date" value={coForm.submittedDate} onChange={e => setCoForm(f => ({ ...f, submittedDate: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Decision Date</Label>
                    <Input type="date" value={coForm.decisionDate} onChange={e => setCoForm(f => ({ ...f, decisionDate: e.target.value }))} />
                  </div>
                </div>

                {/* Tasks to create on approval */}
                <div className="space-y-1.5">
                  <Label>Tasks Added / Modified (comma-separated)</Label>
                  <Input
                    placeholder="e.g. Set up new API endpoint, Write tests, Deploy to staging"
                    value={coForm.linkedTaskTitlesRaw}
                    onChange={e => setCoForm(f => ({ ...f, linkedTaskTitlesRaw: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">These tasks will be added to the project task list when this CR is Approved.</p>
                </div>

                {/* Resource required */}
                <div className="space-y-1.5">
                  <Label>Resources Required (role to request)</Label>
                  <Input
                    placeholder="e.g. Senior Backend Engineer"
                    value={coForm.newResourceRole}
                    onChange={e => setCoForm(f => ({ ...f, newResourceRole: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">A resource request for this role will be auto-created when the CR is Approved.</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCoDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveCR} disabled={!coForm.title}>{editCrId ? "Save Changes" : "Create CR"}</Button>
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
            {currentUser?.id && (
              <TrackedTimeTab projectId={projectId} viewerRole={viewerRole} scopedUserId={currentUser.id} />
            )}
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

          {/* ── Updates Tab ──────────────────────────────────────── */}
          <TabsContent value="updates" className="m-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Send className="h-4 w-4" /> Send Project Update</CardTitle>
                <CardDescription>Compose an update for the team or client. Use <code className="bg-muted px-1 rounded text-xs">{"{{milestones}}"}</code>, <code className="bg-muted px-1 rounded text-xs">{"{{overdue_tasks}}"}</code>, or <code className="bg-muted px-1 rounded text-xs">{"{{pending_approvals}}"}</code> — they are auto-resolved on send.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="grid grid-cols-4 items-center gap-3">
                    <Label className="text-right col-span-1">Subject</Label>
                    <Input
                      className="col-span-3"
                      placeholder="e.g. Week 3 Project Update"
                      value={updateForm.subject}
                      onChange={e => setUpdateForm(f => ({ ...f, subject: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-start gap-3">
                    <Label className="text-right col-span-1 pt-2">Message</Label>
                    <Textarea
                      className="col-span-3 min-h-[120px] font-mono text-sm"
                      placeholder={"Milestone status:\n{{milestones}}\n\nOverdue tasks:\n{{overdue_tasks}}\n\nPending approvals:\n{{pending_approvals}}"}
                      value={updateForm.body}
                      onChange={e => setUpdateForm(f => ({ ...f, body: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-3">
                    <Label className="text-right col-span-1">Audience</Label>
                    <Select value={updateForm.type} onValueChange={v => setUpdateForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">Internal (team only)</SelectItem>
                        <SelectItem value="client">Client-facing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSendUpdate} disabled={sendingUpdate || !updateForm.subject} className="gap-2">
                    <Send className="h-4 w-4" />
                    {sendingUpdate ? "Sending…" : "Send Update"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Update History</CardTitle>
                <CardDescription>{projectUpdates.length === 0 ? "No updates sent yet." : `${projectUpdates.length} update${projectUpdates.length !== 1 ? "s" : ""} sent`}</CardDescription>
              </CardHeader>
              {projectUpdates.length > 0 && (
                <CardContent className="space-y-3">
                  {projectUpdates.map((upd: any) => (
                    <div key={upd.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-sm">{upd.subject}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${upd.type === "client" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                              {upd.type === "client" ? "Client-facing" : "Internal"}
                            </span>
                            {upd.createdBy && (
                              <span className="text-xs text-muted-foreground">by {upd.createdBy.name}</span>
                            )}
                            <span className="text-xs text-muted-foreground">· {new Date(upd.sentAt).toLocaleString()}</span>
                            {upd.recipientCount > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />{upd.recipientCount} recipients</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {upd.body && (
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded p-2 font-mono leading-relaxed">{upd.body}</pre>
                      )}
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
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
              {jobRoles.length > 0 ? (
                <Select value={allocForm.role} onValueChange={v => setAllocForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select role…" /></SelectTrigger>
                  <SelectContent>
                    {jobRoles.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input placeholder="e.g. Senior Developer, Project Manager" value={allocForm.role} onChange={e => setAllocForm(f => ({ ...f, role: e.target.value }))} />
              )}
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
            {/* Allocation input method picker (segmented). Switching the
                method reseeds the value with a sensible default for that mode
                so the derived preview updates immediately. */}
            <div className="space-y-1.5">
              <Label>Input Method</Label>
              <div className="inline-flex w-full rounded-md border bg-muted/40 p-0.5 text-xs font-medium">
                {([
                  { v: "hours_per_day", label: "Hours / Day" },
                  { v: "percentage_capacity", label: "% of Capacity" },
                  { v: "total_hours", label: "Total Hours" },
                ] as { v: AllocMethod; label: string }[]).map(opt => {
                  const selected = allocForm.method === opt.v;
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setAllocForm(f => {
                        const seed = opt.v === "hours_per_day" ? "8" : opt.v === "percentage_capacity" ? "100" : "40";
                        return { ...f, method: opt.v, methodValue: seed };
                      })}
                      className={`flex-1 px-2 py-1.5 rounded transition-colors ${selected ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Method-specific value input + live derived preview */}
            {(() => {
              const d = deriveAllocFields(allocForm.method, allocForm.methodValue, allocForm.startDate, allocForm.endDate);
              const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString();
              return (
                <div className="space-y-1.5">
                  {allocForm.method === "hours_per_day" && (
                    <>
                      <Label>Hours / Day</Label>
                      <Input type="number" min={0} max={24} step={0.25}
                        value={allocForm.methodValue}
                        onChange={e => setAllocForm(f => ({ ...f, methodValue: e.target.value }))} />
                      <p className="text-xs text-muted-foreground">
                        = {fmt(d.hoursPerWeek)} hrs/week · {fmt(d.totalHours)} total hrs over {d.workingDays} working day{d.workingDays === 1 ? "" : "s"}
                      </p>
                    </>
                  )}
                  {allocForm.method === "percentage_capacity" && (
                    <>
                      <Label>% of Capacity</Label>
                      <Input type="number" min={0} max={200} step={1}
                        value={allocForm.methodValue}
                        onChange={e => setAllocForm(f => ({ ...f, methodValue: e.target.value }))} />
                      <p className="text-xs text-muted-foreground">
                        = {fmt(d.hoursPerDay)} hrs/day · {fmt(d.hoursPerWeek)} hrs/week (cap {fmt(d.weeklyCap)}h/wk) · {fmt(d.totalHours)} total over {d.workingDays} day{d.workingDays === 1 ? "" : "s"}
                      </p>
                    </>
                  )}
                  {allocForm.method === "total_hours" && (
                    <>
                      <Label>Total Hours</Label>
                      <Input type="number" min={0} step={0.5}
                        value={allocForm.methodValue}
                        onChange={e => setAllocForm(f => ({ ...f, methodValue: e.target.value }))} />
                      <p className={`text-xs ${d.workingDays === 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {d.workingDays === 0
                          ? "Pick start & end dates to compute hrs/day"
                          : `= ${fmt(d.hoursPerDay)} hrs/day over ${d.workingDays} working day${d.workingDays === 1 ? "" : "s"} (${fmt(d.hoursPerWeek)} hrs/week)`}
                      </p>
                    </>
                  )}
                </div>
              );
            })()}
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
            <div className="flex items-start gap-3 rounded-md border p-3">
              <input
                id="auto-allocate-toggle"
                type="checkbox"
                className="mt-0.5"
                checked={editProjectForm.autoAllocate}
                onChange={e => setEditProjectForm(f => ({ ...f, autoAllocate: e.target.checked }))}
              />
              <div>
                <Label htmlFor="auto-allocate-toggle" className="cursor-pointer">Auto-allocate team members</Label>
                <p className="text-xs text-muted-foreground mt-0.5">When enabled, assigning a task to a team member automatically creates a soft allocation on this project for the project date range.</p>
              </div>
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
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Resource</DialogTitle>
            <DialogDescription>Submit a staffing request for this project. It will be routed for approval.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Request type selector */}
            <div className="space-y-1.5">
              <Label>Request Type *</Label>
              <div className="grid grid-cols-2 gap-2">
                {RES_REQ_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setResReqForm(f => ({ ...f, type: t.value }))}
                    className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${resReqForm.type === t.value ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300" : "border-border hover:border-indigo-300 hover:bg-slate-50"}`}
                  >
                    <div className="font-medium">{t.label}</div>
                    <div className="text-xs text-muted-foreground">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* ─────────────── add_member ─────────────── */}
            {resReqForm.type === "add_member" && (
              <>
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Role &amp; Skills</h3>
                  <div className="flex-1 border-t border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label>Role Needed *</Label>
                  {jobRoles.length > 0 ? (
                    <Select value={resReqForm.role} onValueChange={v => setResReqForm(f => ({ ...f, role: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select role…" /></SelectTrigger>
                      <SelectContent>
                        {jobRoles.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={resReqForm.role} onChange={e => setResReqForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Senior Developer, UX Designer" />
                  )}
                  {resReqMatches.length > 0 && (
                    <div className="mt-1.5 rounded-lg border bg-green-50 dark:bg-green-950/20 p-2 space-y-1">
                      <p className="text-xs font-medium text-green-700 dark:text-green-400">Relevant matches already on team</p>
                      {resReqMatches.map((u: any) => (
                        <div key={u.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{u.name}</span>
                          <span>{u.role}</span>
                          <span className="text-slate-400">· {u.capacity ?? 40}h/wk capacity</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Region</Label>
                  <Input value={resReqForm.region} onChange={e => setResReqForm(f => ({ ...f, region: e.target.value }))} placeholder="e.g. EMEA, North America, Remote…" />
                </div>

                <div className="space-y-1.5">
                  <Label>Required Skills &amp; Competency Level</Label>
                  {(allSkillsList as any[] ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No skills defined yet. Add skills in Admin → Skills Matrix.</p>
                  ) : (
                    <div className="space-y-1.5 p-2 rounded-lg border bg-slate-50 min-h-10">
                      {(allSkillsList as any[] ?? []).map((s: any) => {
                        const selected = resReqForm.skillIds.includes(s.id);
                        const competency = resReqForm.skillCompetencies[s.id] ?? "Independent";
                        return (
                          <div key={s.id} className="flex items-center gap-2">
                            <button type="button"
                              onClick={() => setResReqForm(f => ({
                                ...f,
                                skillIds: selected ? f.skillIds.filter(id => id !== s.id) : [...f.skillIds, s.id]
                              }))}
                              className={`flex-1 text-left px-2.5 py-1 rounded border text-xs font-medium transition-colors ${selected ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-300 hover:border-indigo-400 hover:text-indigo-600"}`}>
                              {s.name}
                            </button>
                            {selected && (
                              <select
                                value={competency}
                                onChange={e => setResReqForm(f => ({ ...f, skillCompetencies: { ...f.skillCompetencies, [s.id]: e.target.value } }))}
                                className="text-xs border rounded px-1.5 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              >
                                <option value="Needs Help">Needs Help</option>
                                <option value="Independent">Independent</option>
                                <option value="Can Lead">Can Lead</option>
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {resReqForm.skillIds.length > 0 && (
                    <p className="text-xs text-indigo-600">{resReqForm.skillIds.length} skill{resReqForm.skillIds.length !== 1 ? "s" : ""} selected</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Schedule</h3>
                  <div className="flex-1 border-t border-border" />
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
                    <Label>Hours / Day</Label>
                    <Input type="number" min={1} max={16} step="0.5" value={resReqForm.hoursPerDay} onChange={e => setResReqForm(f => ({ ...f, hoursPerDay: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Allocation Method</Label>
                    <Select value={resReqForm.allocationMethod} onValueChange={(v: any) => setResReqForm(f => ({ ...f, allocationMethod: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hours_per_day">Hours / Day</SelectItem>
                        <SelectItem value="percentage_capacity">% of Capacity</SelectItem>
                        <SelectItem value="total_hours">Total Hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Priority</h3>
                  <div className="flex-1 border-t border-border" />
                </div>

                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={resReqForm.priority} onValueChange={v => setResReqForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Low","Medium","High","Critical"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* ─────────────── add_hours ─────────────── */}
            {resReqForm.type === "add_hours" && (
              <>
                <div className="space-y-1.5">
                  <Label>Team Member *</Label>
                  {projectMembers.length === 0 ? (
                    <p className="text-xs text-amber-600">No team members are allocated to this project yet.</p>
                  ) : (
                    <Select value={resReqForm.targetUserId} onValueChange={v => setResReqForm(f => ({ ...f, targetUserId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select team member already on the project…" /></SelectTrigger>
                      <SelectContent>
                        {projectMembers.map((a: any) => {
                          const u = (users as any[])?.find((u: any) => u.id === a.userId);
                          return <SelectItem key={a.userId} value={String(a.userId)}>{u?.name ?? `User ${a.userId}`} — {u?.role ?? a.role ?? ""}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  )}
                  {resReqForm.targetUserId && (() => {
                    const ctx = currentAllocatedHoursForTarget();
                    return (
                      <div className="mt-1.5 rounded-md border bg-slate-50 dark:bg-slate-900/30 p-2 text-xs text-slate-600 dark:text-slate-400">
                        Currently allocated to this project: <span className="font-semibold text-slate-800 dark:text-slate-200">{ctx.hpw} hrs/wk</span>
                        {ctx.allocs.length > 1 && <span className="text-slate-400"> across {ctx.allocs.length} allocations</span>}
                      </div>
                    );
                  })()}
                </div>

                <div className="space-y-1.5">
                  <Label>Additional Hours Needed (per week) *</Label>
                  <Input type="number" min={1} max={80} value={resReqForm.additionalHours} onChange={e => setResReqForm(f => ({ ...f, additionalHours: e.target.value }))} placeholder="e.g. 8" />
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
              </>
            )}

            {/* ─────────────── assign_placeholder ─────────────── */}
            {resReqForm.type === "assign_placeholder" && (
              <>
                <div className="space-y-1.5">
                  <Label>Placeholder *</Label>
                  {unfilledPlaceholders.length === 0 ? (
                    <p className="text-xs text-amber-600">No unfilled placeholder slots on this project.</p>
                  ) : (
                    <Select value={resReqForm.placeholderId} onValueChange={onPickPlaceholder}>
                      <SelectTrigger><SelectValue placeholder="Select an unfilled placeholder…" /></SelectTrigger>
                      <SelectContent>
                        {unfilledPlaceholders.map((a: any) => (
                          <SelectItem key={a.id} value={String(a.id)}>
                            {(a.placeholderRole || a.role || "Placeholder")} · {a.startDate} → {a.endDate} · {Number(a.hoursPerWeek ?? 0)}h/wk
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {resReqForm.placeholderId && (
                    <p className="text-xs text-muted-foreground">Dates and hours pre-filled from the placeholder allocation.</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Required Skills</Label>
                  {(allSkillsList as any[] ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No skills defined yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border bg-slate-50 min-h-10">
                      {(allSkillsList as any[] ?? []).map((s: any) => {
                        const selected = resReqForm.skillIds.includes(s.id);
                        return (
                          <button key={s.id} type="button"
                            onClick={() => setResReqForm(f => ({
                              ...f,
                              skillIds: selected ? f.skillIds.filter(id => id !== s.id) : [...f.skillIds, s.id],
                            }))}
                            className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors ${selected ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-300 hover:border-indigo-400 hover:text-indigo-600"}`}>
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ─────────────── replacement ─────────────── */}
            {resReqForm.type === "replacement" && (
              <>
                {projectAutoAllocate && (
                  <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300">
                    Replacement requests are not available for auto-allocate projects.
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Current Member / Placeholder *</Label>
                  <Select
                    value={resReqForm.targetUserId}
                    onValueChange={v => setResReqForm(f => ({ ...f, targetUserId: v }))}
                    disabled={projectAutoAllocate}
                  >
                    <SelectTrigger><SelectValue placeholder="Select who to replace…" /></SelectTrigger>
                    <SelectContent>
                      {projectMembers.map((a: any) => {
                        const u = (users as any[])?.find((u: any) => u.id === a.userId);
                        return <SelectItem key={`u-${a.userId}`} value={String(a.userId)}>{u?.name ?? `User ${a.userId}`} — {u?.role ?? a.role ?? ""}</SelectItem>;
                      })}
                      {unfilledPlaceholders.map((a: any) => (
                        <SelectItem key={`ph-${a.id}`} value={`ph-${a.id}`}>
                          Placeholder · {(a.placeholderRole || a.role || "Role")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Replacement Start *</Label>
                    <Input type="date" disabled={projectAutoAllocate} value={resReqForm.startDate} onChange={e => setResReqForm(f => ({ ...f, startDate: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Replacement End *</Label>
                    <Input type="date" disabled={projectAutoAllocate} value={resReqForm.endDate} onChange={e => setResReqForm(f => ({ ...f, endDate: e.target.value }))} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Reason</Label>
                  <Input
                    disabled={projectAutoAllocate}
                    value={resReqForm.replacementReason}
                    onChange={e => setResReqForm(f => ({ ...f, replacementReason: e.target.value }))}
                    placeholder="e.g. parental leave, leaving team, skill mismatch…"
                  />
                </div>
              </>
            )}

            {/* Notes — common to all types */}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={resReqForm.notes} onChange={e => setResReqForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any specific requirements or context…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResReqOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveResReq} disabled={!isReqFormValid() || createResourceRequest.isPending}>
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
