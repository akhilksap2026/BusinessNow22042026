import { authHeaders } from "@/lib/auth-headers";
import { useState } from "react";
import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import {
  useGetFinanceSummary, useListInvoices, useListAccounts, useListProjects, getListInvoicesQueryKey,
  useListBillingSchedules, useCreateBillingSchedule, useDeleteBillingSchedule, useTriggerBillingSchedule, getListBillingSchedulesQueryKey,
  useListRevenueEntries, useCreateRevenueEntry, useDeleteRevenueEntry, useGetRevenueByPeriodReport, getListRevenueEntriesQueryKey,
  useUpdateInvoice, useListUsers, useUpdateProject, useListRateCards, useListOpportunities, getListProjectsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { InvoiceDetail } from "@/components/invoice-detail";
import { CreateInvoiceDialog } from "@/components/create-invoice-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, DollarSign, Zap, Trash2, TrendingUp, CalendarClock, BookOpen, Search, MoreVertical, ChevronRight, Pencil, FilePlus, FileText, ExternalLink, ArrowUpRight, Briefcase } from "lucide-react";
import { useLocation } from "wouter";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";



type ContractRow = {
  id: number;
  projectId: number;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  value: number | null;
  documentUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function Finance() {
  const [, setLocation] = useLocation();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterAccountId, setFilterAccountId] = useState<number | undefined>();
  const [filterProjectId, setFilterProjectId] = useState<number | undefined>();
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isContractOpen, setIsContractOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractRow | null>(null);
  const [deleteContractId, setDeleteContractId] = useState<number | null>(null);
  const [contractForm, setContractForm] = useState({ name: "", projectId: "", status: "Draft", startDate: "", endDate: "", value: "", documentUrl: "", notes: "" });
  const [isSavingContract, setIsSavingContract] = useState(false);
  const [editInvoice, setEditInvoice] = useState<any>(null);
  const [invoiceEditForm, setInvoiceEditForm] = useState({ description: "", amount: "", dueDate: "", status: "" });
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null);

  const [editContractProject, setEditContractProject] = useState<any>(null);
  const [editContractForm, setEditContractForm] = useState<{
    name: string; status: string; health: string; budget: string; budgetedHours: string;
    description: string; startDate: string; dueDate: string; billingType: string;
    ownerId: string; rateCardId: string; internalExternal: string;
    customerChampion: string; opportunityId: string; accountId: string;
  }>({
    name: "", status: "", health: "", budget: "", budgetedHours: "", description: "",
    startDate: "", dueDate: "", billingType: "Fixed Fee",
    ownerId: "", rateCardId: "", internalExternal: "External",
    customerChampion: "", opportunityId: "", accountId: "",
  });
  const [editContractDateError, setEditContractDateError] = useState<string | null>(null);

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const deleteInvoiceMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`${BASE}/api/invoices/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!r.ok && r.status !== 204) throw new Error("Failed to delete invoice");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      toast({ title: "Invoice deleted" });
      setDeleteInvoiceId(null);
      if (selectedInvoice?.id === deleteInvoiceId) setSelectedInvoice(null);
    },
    onError: () => toast({ title: "Failed to delete invoice", variant: "destructive" }),
  });

  async function handleEditInvoiceSave() {
    if (!editInvoice) return;
    try {
      await updateInvoice.mutateAsync({
        id: editInvoice.id,
        data: {
          description: invoiceEditForm.description || undefined,
          amount: invoiceEditForm.amount ? parseFloat(invoiceEditForm.amount) : undefined,
          dueDate: invoiceEditForm.dueDate || undefined,
          status: (invoiceEditForm.status || undefined) as any,
        },
      });
      queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      toast({ title: "Invoice updated" });
      setEditInvoice(null);
    } catch {
      toast({ title: "Failed to update invoice", variant: "destructive" });
    }
  }
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [deleteScheduleId, setDeleteScheduleId] = useState<number | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [isRevenueOpen, setIsRevenueOpen] = useState(false);
  const [deleteRevenueId, setDeleteRevenueId] = useState<number | null>(null);
  const [editingRevenue, setEditingRevenue] = useState<any>(null);

  const [scheduleForm, setScheduleForm] = useState({ projectId: "", name: "", triggerType: "Date", triggerValue: "", action: "CreateInvoice", amount: "", percentOfBudget: "" });
  const [revenueForm, setRevenueForm] = useState({ projectId: "", period: new Date().toISOString().substring(0, 7), amount: "", method: "Percentage of Completion", notes: "", recognizedAt: new Date().toISOString().split("T")[0] });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateInvoice = useUpdateInvoice();

  const INVOICE_NEXT_STATUS: Record<string, string> = {
    "Draft": "In Review",
    "In Review": "Approved",
    "Approved": "Paid",
  };

  async function handleQuickStatusUpdate(e: React.MouseEvent, invoiceId: string, newStatus: string) {
    e.stopPropagation();
    try {
      await updateInvoice.mutateAsync({ id: invoiceId, data: { status: newStatus as any } });
      queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      toast({ title: `Invoice marked as ${newStatus}` });
    } catch {
      toast({ title: "Failed to update invoice status", variant: "destructive" });
    }
  }

  const { data: summary, isLoading: isLoadingSummary } = useGetFinanceSummary();
  const { data: invoices, isLoading: isLoadingInvoices } = useListInvoices();
  const { data: accounts } = useListAccounts();
  const { data: projects } = useListProjects();

  const { data: schedules, isLoading: isLoadingSchedules } = useListBillingSchedules({ projectId: filterProjectId });
  const createSchedule = useCreateBillingSchedule();
  const deleteSchedule = useDeleteBillingSchedule();
  const triggerSchedule = useTriggerBillingSchedule();
  const updateScheduleMut = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const r = await fetch(`${BASE}/api/billing-schedules/${id}`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error("Failed to update schedule");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListBillingSchedulesQueryKey() });
      toast({ title: "Schedule updated" });
      setEditingSchedule(null);
    },
    onError: () => toast({ title: "Failed to update schedule", variant: "destructive" }),
  });
  const updateRevenueMut = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const r = await fetch(`${BASE}/api/revenue-entries/${id}`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error("Failed to update revenue entry");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListRevenueEntriesQueryKey() });
      toast({ title: "Revenue entry updated" });
      setEditingRevenue(null);
    },
    onError: () => toast({ title: "Failed to update revenue entry", variant: "destructive" }),
  });

  const { data: revenueEntries, isLoading: isLoadingRevenue } = useListRevenueEntries({ projectId: filterProjectId });
  const createRevenue = useCreateRevenueEntry();
  const deleteRevenue = useDeleteRevenueEntry();
  const { data: revReport } = useGetRevenueByPeriodReport();
  const { data: users } = useListUsers();
  const { data: rateCards } = useListRateCards();
  const { data: opportunities } = useListOpportunities();
  const updateProject = useUpdateProject();

  function openEditProjectContract(p: any) {
    setEditContractProject(p);
    setEditContractDateError(null);
    setEditContractForm({
      name: p.name ?? "",
      status: p.status ?? "",
      health: p.health ?? "",
      budget: p.budget != null ? String(p.budget) : "",
      budgetedHours: p.budgetedHours != null ? String(p.budgetedHours) : "",
      description: p.description ?? "",
      startDate: p.startDate ?? "",
      dueDate: p.dueDate ?? "",
      billingType: p.billingType ?? "Fixed Fee",
      ownerId: p.ownerId != null ? String(p.ownerId) : "",
      rateCardId: p.rateCardId != null ? String(p.rateCardId) : "",
      internalExternal: p.internalExternal ?? "External",
      customerChampion: p.customerChampion ?? "",
      opportunityId: p.opportunityId != null ? String(p.opportunityId) : "",
      accountId: p.accountId != null ? String(p.accountId) : "",
    });
  }

  async function handleSaveEditContract() {
    setEditContractDateError(null);
    if (editContractForm.startDate && editContractForm.dueDate &&
        new Date(editContractForm.dueDate) < new Date(editContractForm.startDate)) {
      setEditContractDateError("Due date must be on or after start date.");
      return;
    }
    try {
      await updateProject.mutateAsync({
        id: editContractProject.id,
        data: {
          name: editContractForm.name,
          status: editContractForm.status,
          health: editContractForm.health,
          description: editContractForm.description,
          startDate: editContractForm.startDate || undefined,
          dueDate: editContractForm.dueDate || undefined,
          billingType: editContractForm.billingType || undefined,
          ownerId: editContractForm.ownerId ? Number(editContractForm.ownerId) : undefined,
          rateCardId: editContractForm.rateCardId ? Number(editContractForm.rateCardId) : null,
          internalExternal: editContractForm.internalExternal || undefined,
          customerChampion: editContractForm.customerChampion?.trim() || null,
          opportunityId: editContractForm.opportunityId ? Number(editContractForm.opportunityId) : null,
          accountId: editContractForm.accountId ? Number(editContractForm.accountId) : undefined,
          budget: parseFloat(editContractForm.budget) || 0,
          budgetedHours: parseFloat(editContractForm.budgetedHours) || 0,
        } as any,
      });
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      toast({ title: "Contract updated" });
      setEditContractProject(null);
    } catch {
      toast({ title: "Failed to update contract", variant: "destructive" });
    }
  }


  async function handleCreateSchedule() {
    if (!scheduleForm.name || !scheduleForm.projectId) return;
    try {
      await createSchedule.mutateAsync({
        data: {
          projectId: parseInt(scheduleForm.projectId),
          name: scheduleForm.name,
          triggerType: scheduleForm.triggerType,
          triggerValue: scheduleForm.triggerValue || undefined,
          action: scheduleForm.action || "CreateInvoice",
          amount: scheduleForm.amount ? parseFloat(scheduleForm.amount) : undefined,
          percentOfBudget: scheduleForm.percentOfBudget ? parseFloat(scheduleForm.percentOfBudget) : undefined,
        } as any,
      });
      queryClient.invalidateQueries({ queryKey: getListBillingSchedulesQueryKey() });
      toast({ title: "Billing schedule created" });
      setIsScheduleOpen(false);
      setScheduleForm({ projectId: "", name: "", triggerType: "Date", triggerValue: "", action: "CreateInvoice", amount: "", percentOfBudget: "" });
    } catch {
      toast({ title: "Failed to create schedule", variant: "destructive" });
    }
  }

  async function handleTrigger(id: number) {
    try {
      const result = await triggerSchedule.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListBillingSchedulesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      toast({ title: "Schedule triggered", description: result.message });
    } catch {
      toast({ title: "Failed to trigger schedule", variant: "destructive" });
    }
  }

  async function handleDeleteSchedule(id: number) {
    try {
      await deleteSchedule.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListBillingSchedulesQueryKey() });
      toast({ title: "Schedule deleted" });
      setDeleteScheduleId(null);
    } catch {
      toast({ title: "Failed to delete schedule", variant: "destructive" });
    }
  }

  async function handleCreateRevenue() {
    if (!revenueForm.projectId || !revenueForm.amount || !revenueForm.period) return;
    try {
      await createRevenue.mutateAsync({
        data: {
          projectId: parseInt(revenueForm.projectId),
          period: revenueForm.period,
          amount: parseFloat(revenueForm.amount),
          method: revenueForm.method,
          notes: revenueForm.notes || undefined,
          recognizedAt: revenueForm.recognizedAt,
        } as any,
      });
      queryClient.invalidateQueries({ queryKey: getListRevenueEntriesQueryKey() });
      toast({ title: "Revenue entry recorded" });
      setIsRevenueOpen(false);
      setRevenueForm({ projectId: "", period: new Date().toISOString().substring(0, 7), amount: "", method: "Percentage of Completion", notes: "", recognizedAt: new Date().toISOString().split("T")[0] });
    } catch {
      toast({ title: "Failed to record revenue", variant: "destructive" });
    }
  }

  async function handleDeleteRevenue(id: number) {
    try {
      await deleteRevenue.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListRevenueEntriesQueryKey() });
      toast({ title: "Revenue entry deleted" });
      setDeleteRevenueId(null);
    } catch {
      toast({ title: "Failed to delete revenue entry", variant: "destructive" });
    }
  }

  const contractsQueryKey = ["/api/contracts"] as const;
  const { data: contracts, isLoading: isLoadingContracts } = useQuery<ContractRow[]>({
    queryKey: contractsQueryKey,
    queryFn: async () => {
      const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const r = await fetch(`${BASE}/api/contracts`, { headers: authHeaders() });
      if (!r.ok) throw new Error("Failed to load contracts");
      return r.json();
    },
  });

  function resetContractForm() {
    setContractForm({ name: "", projectId: "", status: "Draft", startDate: "", endDate: "", value: "", documentUrl: "", notes: "" });
  }

  async function handleCreateContract() {
    if (!contractForm.name || !contractForm.projectId) return;
    setIsSavingContract(true);
    try {
      const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const isEdit = editingContract !== null;
      const url = isEdit ? `${BASE}/api/contracts/${editingContract!.id}` : `${BASE}/api/contracts`;
      const body: Record<string, unknown> = {
        projectId: parseInt(contractForm.projectId, 10),
        name: contractForm.name,
        status: contractForm.status || "Draft",
        startDate: contractForm.startDate || null,
        endDate: contractForm.endDate || null,
        value: contractForm.value === "" ? null : parseFloat(contractForm.value),
        documentUrl: contractForm.documentUrl || null,
        notes: contractForm.notes || null,
      };
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to save contract");
      }
      queryClient.invalidateQueries({ queryKey: contractsQueryKey });
      toast({ title: isEdit ? "Contract updated" : "Contract saved" });
      setIsContractOpen(false);
      setEditingContract(null);
      resetContractForm();
    } catch (err) {
      toast({
        title: "Failed to save contract",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsSavingContract(false);
    }
  }

  function openEditContract(c: ContractRow) {
    setEditingContract(c);
    setContractForm({
      name: c.name,
      projectId: c.projectId.toString(),
      status: c.status,
      startDate: c.startDate ?? "",
      endDate: c.endDate ?? "",
      value: c.value === null ? "" : String(c.value),
      documentUrl: c.documentUrl ?? "",
      notes: c.notes ?? "",
    });
    setIsContractOpen(true);
  }

  async function handleDeleteContract(id: number) {
    try {
      const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const r = await fetch(`${BASE}/api/contracts/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!r.ok && r.status !== 204) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to delete contract");
      }
      queryClient.invalidateQueries({ queryKey: contractsQueryKey });
      toast({ title: "Contract deleted" });
      setDeleteContractId(null);
    } catch (err) {
      toast({
        title: "Failed to delete contract",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  }

  const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"];

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader
          title="Finance & Invoicing"
          breadcrumbs={[{ label: "Finance" }]}
        />

        <div className="flex items-center gap-3 flex-wrap">
          <Select
            value={filterAccountId ? String(filterAccountId) : "all"}
            onValueChange={v => {
              setFilterAccountId(v !== "all" ? parseInt(v) : undefined);
              setFilterProjectId(undefined);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by account…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {accounts?.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select
            value={filterProjectId ? String(filterProjectId) : "all"}
            onValueChange={v => setFilterProjectId(v !== "all" ? parseInt(v) : undefined)}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by project…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {(filterAccountId
                ? projects?.filter(p => (p as any).accountId === filterAccountId)
                : projects
              )?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pl-9 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Search across all tabs…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {(() => {
          const filteredForKpi = filterProjectId
            ? (invoices ?? []).filter((inv: any) => inv.projectId === filterProjectId)
            : filterAccountId
            ? (invoices ?? []).filter((inv: any) => inv.accountId === filterAccountId)
            : null;
          const kpi = filteredForKpi
            ? {
                totalInvoiced: filteredForKpi.reduce((s: number, r: any) => s + Number(r.total), 0),
                totalPaid: filteredForKpi.filter((r: any) => r.status === "Paid").reduce((s: number, r: any) => s + Number(r.total), 0),
                totalOutstanding: filteredForKpi.filter((r: any) => r.status === "Approved" || r.status === "In Review").reduce((s: number, r: any) => s + Number(r.total), 0),
                totalOverdue: filteredForKpi.filter((r: any) => r.status === "Overdue").reduce((s: number, r: any) => s + Number(r.total), 0),
              }
            : summary;
          const isLoading = (filterProjectId || filterAccountId) ? isLoadingInvoices : isLoadingSummary;
          return (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {(["Total Invoiced", "Total Paid", "Outstanding", "Overdue"] as const).map((label, i) => {
                const vals = [kpi?.totalInvoiced, kpi?.totalPaid, kpi?.totalOutstanding, kpi?.totalOverdue];
                const colors = ["", "text-green-600 dark:text-green-400", "", "text-destructive"];
                return (
                  <Card key={label}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2">
                      <CardTitle className="text-sm font-medium">{label}</CardTitle>
                      <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="px-3 pb-2 pt-0">
                      {isLoading ? <Skeleton className="h-5 w-24" /> : (
                        <div className={`text-lg font-bold tracking-tight ${colors[i]}`}>${(vals[i] ?? 0).toLocaleString()}</div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
        })()}

        <Tabs defaultValue="invoices" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Invoices
            </TabsTrigger>
            <TabsTrigger value="schedules" className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Billing Schedules
            </TabsTrigger>
            <TabsTrigger value="revenue" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Revenue Recognition
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Contracts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="m-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Invoices</CardTitle>
                <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> New Invoice
                </Button>
              </CardHeader>
              <CardContent>
                {(() => {
                  const search = searchQuery.toLowerCase();
                  const filtered = (invoices ?? []).filter(inv => {
                    if (filterProjectId && (inv as any).projectId !== filterProjectId) return false;
                    if (filterAccountId && (inv as any).accountId !== filterAccountId) return false;
                    if (!search) return true;
                    const pName = projects?.find(p => p.id === (inv as any).projectId)?.name?.toLowerCase() ?? "";
                    const aName = accounts?.find(a => a.id === (inv as any).accountId)?.name?.toLowerCase() ?? "";
                    return inv.id.toLowerCase().includes(search) ||
                      (inv.description ?? "").toLowerCase().includes(search) ||
                      pName.includes(search) || aName.includes(search);
                  });
                  return (
                    <Tabs defaultValue="all">
                      <TabsList className="mb-4">
                        <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
                        <TabsTrigger value="draft">Draft</TabsTrigger>
                        <TabsTrigger value="review">In Review</TabsTrigger>
                        <TabsTrigger value="approved">Approved</TabsTrigger>
                        <TabsTrigger value="paid">Paid</TabsTrigger>
                        <TabsTrigger value="overdue" className="text-destructive data-[state=active]:text-destructive">Overdue</TabsTrigger>
                      </TabsList>
                      {(["all", "draft", "review", "approved", "paid", "overdue"] as const).map(tab => {
                        const tabMap: Record<string, string> = { draft: "Draft", review: "In Review", approved: "Approved", paid: "Paid", overdue: "Overdue" };
                        const tabFiltered = tab === "all" ? filtered : filtered.filter(inv => inv.status === tabMap[tab]);
                        return (
                          <TabsContent key={tab} value={tab} className="m-0">
                            {isLoadingInvoices ? (
                              <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Invoice ID</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Issue Date</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="w-10"></TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {tabFiltered.map(invoice => {
                                    const nextStatus = INVOICE_NEXT_STATUS[invoice.status];
                                    return (
                                    <TableRow key={invoice.id} onClick={() => setSelectedInvoice(invoice)} className="cursor-pointer hover:bg-muted/50">
                                      <TableCell className="font-medium">{invoice.id}</TableCell>
                                      <TableCell>{invoice.description}</TableCell>
                                      <TableCell>{new Date(invoice.issueDate).toLocaleDateString()}</TableCell>
                                      <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                                      <TableCell><StatusBadge status={invoice.status} /></TableCell>
                                      <TableCell className="text-right font-medium">${invoice.total.toLocaleString()}</TableCell>
                                      <TableCell onClick={e => e.stopPropagation()} className="p-1">
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button>
                                              </TooltipTrigger>
                                              <TooltipContent>More options</TooltipContent>
                                            </Tooltip>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setSelectedInvoice(invoice)}>View Details</DropdownMenuItem>
                                            <DropdownMenuItem onClick={e => { e.stopPropagation(); setInvoiceEditForm({ description: invoice.description ?? "", amount: String(invoice.amount), dueDate: invoice.dueDate ?? "", status: invoice.status }); setEditInvoice(invoice); }}>
                                              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                                            </DropdownMenuItem>
                                            {nextStatus && (
                                              <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={e => handleQuickStatusUpdate(e, invoice.id, nextStatus)}>
                                                  <ChevronRight className="h-3.5 w-3.5 mr-1.5" /> Mark as {nextStatus}
                                                </DropdownMenuItem>
                                              </>
                                            )}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-red-600" onClick={e => { e.stopPropagation(); setDeleteInvoiceId(invoice.id); }}>
                                              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </TableCell>
                                    </TableRow>
                                    );
                                  })}
                                  {tabFiltered.length === 0 && (
                                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                      {searchQuery ? `No invoices match "${searchQuery}".` : "No invoices found."}
                                    </TableCell></TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            )}
                          </TabsContent>
                        );
                      })}
                    </Tabs>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedules" className="m-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Billing Schedules</CardTitle>
                  <CardDescription>Date or milestone triggers that auto-create draft invoices</CardDescription>
                </div>
                <Button size="sm" onClick={() => setIsScheduleOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> New Schedule
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingSchedules ? (
                  <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : schedules?.length === 0 ? (
                  <EmptyState
                    icon={CalendarClock}
                    title="No billing schedules"
                    description="Create a schedule to automatically trigger invoice drafts."
                    action={{ label: "New Schedule", onClick: () => setIsScheduleOpen(true) }}
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Trigger</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Fired</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(schedules ?? []).filter(s => {
                        if (!searchQuery) return true;
                        const q = searchQuery.toLowerCase();
                        const pName = projects?.find(p => p.id === s.projectId)?.name?.toLowerCase() ?? "";
                        return s.name.toLowerCase().includes(q) || pName.includes(q);
                      }).map(s => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{projects?.find(p => p.id === s.projectId)?.name ?? `#${s.projectId}`}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs font-normal">{s.triggerType}</Badge>
                            {s.triggerValue && <span className="ml-1 text-xs text-muted-foreground">{s.triggerValue}</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{s.action ?? "CreateInvoice"}</TableCell>
                          <TableCell className="text-sm">
                            {s.amount ? `$${Number(s.amount).toLocaleString()}` : s.percentOfBudget ? `${s.percentOfBudget}% of budget` : "—"}
                          </TableCell>
                          <TableCell><StatusBadge status={s.status} /></TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {s.lastFiredAt ? new Date(s.lastFiredAt).toLocaleDateString() : "Never"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleTrigger(s.id)} disabled={triggerSchedule.isPending}>
                                <Zap className="h-3 w-3 mr-1" /> Fire
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-indigo-600" onClick={() => setEditingSchedule(s)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => setDeleteScheduleId(s.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="m-0 space-y-4">
            {revReport && revReport.periods.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Period</CardTitle>
                  <CardDescription>
                    Total recognised: <strong>${revReport.totalRecognized.toLocaleString()}</strong>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={revReport.periods} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                      <RechartsTooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                      <Legend />
                      {revReport.methods.map((m, i) => (
                        <Bar key={m} dataKey={`byMethod.${m}`} name={m} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === revReport.methods.length - 1 ? [4, 4, 0, 0] : [0,0,0,0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Revenue Entries</CardTitle>
                  <CardDescription>Log recognised revenue by project and accounting period</CardDescription>
                </div>
                <Button size="sm" onClick={() => setIsRevenueOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Recognise Revenue
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingRevenue ? (
                  <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : revenueEntries?.length === 0 ? (
                  <EmptyState
                    icon={TrendingUp}
                    title="No revenue entries"
                    description="Record recognised revenue against projects and periods."
                    action={{ label: "Recognise Revenue", onClick: () => setIsRevenueOpen(true) }}
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Recognised At</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(revenueEntries ?? []).filter(e => {
                        if (!searchQuery) return true;
                        const q = searchQuery.toLowerCase();
                        const pName = projects?.find(p => p.id === e.projectId)?.name?.toLowerCase() ?? "";
                        return pName.includes(q) || (e.period ?? "").toLowerCase().includes(q) || (e.method ?? "").toLowerCase().includes(q);
                      }).map(e => (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium">{projects?.find(p => p.id === e.projectId)?.name ?? `#${e.projectId}`}</TableCell>
                          <TableCell>{e.period}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs font-normal">{e.method}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{e.recognizedAt}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{e.notes ?? "—"}</TableCell>
                          <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                            ${Number(e.amount).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-0.5">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-indigo-600" onClick={() => setEditingRevenue(e)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => setDeleteRevenueId(e.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Contracts tab (projects view) ───────────────────── */}
          <TabsContent value="projects" className="m-0">
            <Card>
              <CardHeader>
                <CardTitle>Contracts</CardTitle>
                <CardDescription>Master agreements, SOWs, and other contract documents tied to projects.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {(() => {
                  const q = searchQuery.toLowerCase();
                  const filtered = (projects ?? [])
                    .filter((p: any) => !p.deletedAt)
                    .filter((p: any) => {
                      if (!q) return true;
                      const owner = users?.find((u: any) => u.id === p.ownerId);
                      return (
                        p.name.toLowerCase().includes(q) ||
                        (owner?.name ?? "").toLowerCase().includes(q) ||
                        (p.status ?? "").toLowerCase().includes(q) ||
                        (p.health ?? "").toLowerCase().includes(q) ||
                        (p.internalExternal ?? "").toLowerCase().includes(q)
                      );
                    });
                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center text-muted-foreground text-sm">
                        {q ? `No projects match "${searchQuery}".` : "No projects found."}
                      </div>
                    );
                  }
                  return (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Project Name</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Health</TableHead>
                          <TableHead className="text-right">Tracked Hrs</TableHead>
                          <TableHead className="text-right">Allocated Hrs</TableHead>
                          <TableHead className="w-[48px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((p: any) => {
                          const owner = users?.find((u: any) => u.id === p.ownerId);
                          return (
                            <TableRow key={p.id}>
                              <TableCell>
                                <button
                                  type="button"
                                  onClick={() => setLocation(`/projects/${p.id}`)}
                                  className="text-sm font-medium text-left hover:text-primary hover:underline"
                                >
                                  {p.name}
                                </button>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {owner?.name ?? "—"}
                              </TableCell>
                              <TableCell>
                                {p.internalExternal && (
                                  <Badge variant="outline" className="text-xs">{p.internalExternal}</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={p.status} />
                              </TableCell>
                              <TableCell>
                                {p.health ? <StatusBadge status={p.health} /> : <span className="text-muted-foreground text-sm">—</span>}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-sm">
                                {p.trackedHours != null ? `${p.trackedHours}h` : "0h"}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-sm">
                                {p.allocatedHours != null ? `${Number(p.allocatedHours).toLocaleString()}h` : "—"}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-indigo-600"
                                  onClick={() => openEditProjectContract(p)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
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
        </Tabs>

        <InvoiceDetail invoice={selectedInvoice} open={!!selectedInvoice} onOpenChange={(o) => !o && setSelectedInvoice(null)} />
        <CreateInvoiceDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

        {/* ── Edit Contract dialog ───────────────────────────────────────── */}
        <Dialog open={!!editContractProject} onOpenChange={open => { if (!open) setEditContractProject(null); }}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Contract</DialogTitle>
              <DialogDescription>Update project details. All changes are applied on save.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-1">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Basics</p>
                <div className="space-y-1.5">
                  <Label>Project Name *</Label>
                  <Input value={editContractForm.name} onChange={e => setEditContractForm(f => ({ ...f, name: e.target.value }))} placeholder="Project name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    value={editContractForm.description}
                    onChange={e => setEditContractForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Project description"
                    rows={3}
                  />
                </div>
              </div>
              <div className="border-t" />
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Classification</p>
                <div className="space-y-1.5">
                  <Label>Project Type</Label>
                  <div className="flex gap-3">
                    {(["External", "Internal"] as const).map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setEditContractForm(f => ({ ...f, internalExternal: opt }))}
                        className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${editContractForm.internalExternal === opt ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-accent"}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Account</Label>
                  <Select
                    value={editContractForm.accountId}
                    onValueChange={v => setEditContractForm(f => ({ ...f, accountId: v, opportunityId: "" }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>
                      {(accounts ?? []).map((acc: any) => (
                        <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {editContractForm.internalExternal === "External" && (
                  <div className="space-y-1.5">
                    <Label>Customer Champion</Label>
                    <Input
                      value={editContractForm.customerChampion}
                      onChange={e => setEditContractForm(f => ({ ...f, customerChampion: e.target.value }))}
                      placeholder="Primary contact at client"
                    />
                  </div>
                )}
              </div>
              <div className="border-t" />
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline & Billing</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Start Date *</Label>
                    <Input
                      type="date"
                      value={editContractForm.startDate}
                      onChange={e => { setEditContractForm(f => ({ ...f, startDate: e.target.value })); setEditContractDateError(null); }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Due Date *</Label>
                    <Input
                      type="date"
                      value={editContractForm.dueDate}
                      onChange={e => { setEditContractForm(f => ({ ...f, dueDate: e.target.value })); setEditContractDateError(null); }}
                    />
                  </div>
                </div>
                {editContractDateError && <p className="text-xs text-destructive">{editContractDateError}</p>}
                <div className="space-y-1.5">
                  <Label>Billing Type</Label>
                  <Select value={editContractForm.billingType} onValueChange={v => setEditContractForm(f => ({ ...f, billingType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Fixed Fee", "T&M", "Retainer"].map(bt => (
                        <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Budget ($)</Label>
                    <Input type="number" min={0} value={editContractForm.budget} onChange={e => setEditContractForm(f => ({ ...f, budget: e.target.value }))} placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Budgeted Hours</Label>
                    <Input type="number" min={0} value={editContractForm.budgetedHours} onChange={e => setEditContractForm(f => ({ ...f, budgetedHours: e.target.value }))} placeholder="0" />
                  </div>
                </div>
              </div>
              <div className="border-t" />
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Team & Configuration</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Project Owner *</Label>
                    <Select value={editContractForm.ownerId} onValueChange={v => setEditContractForm(f => ({ ...f, ownerId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                      <SelectContent>
                        {(users ?? []).map((u: any) => (
                          <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Rate Card</Label>
                    <Select
                      value={editContractForm.rateCardId || "__none__"}
                      onValueChange={v => setEditContractForm(f => ({ ...f, rateCardId: v === "__none__" ? "" : v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {(rateCards ?? []).map((rc: any) => (
                          <SelectItem key={rc.id} value={rc.id.toString()}>{rc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="border-t" />
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status & Health</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={editContractForm.status} onValueChange={v => setEditContractForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Draft", "Not Started", "Started", "At Risk", "On Hold", "Completed"].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Health</Label>
                    <Select value={editContractForm.health} onValueChange={v => setEditContractForm(f => ({ ...f, health: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["On Track", "At Risk", "Off Track"].map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditContractProject(null)}>Cancel</Button>
              <Button onClick={handleSaveEditContract} disabled={!editContractForm.name || !editContractForm.ownerId || updateProject.isPending}>
                {updateProject.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Billing Schedule</DialogTitle>
              <DialogDescription>Configure when a draft invoice should be auto-created for this project.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Project *</Label>
                <Select value={scheduleForm.projectId} onValueChange={v => setScheduleForm(f => ({ ...f, projectId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>{projects?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Schedule Name *</Label>
                <Input placeholder="e.g. 50% Milestone Invoice" value={scheduleForm.name} onChange={e => setScheduleForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Trigger Type</Label>
                  <Select value={scheduleForm.triggerType} onValueChange={v => setScheduleForm(f => ({ ...f, triggerType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Date">Date</SelectItem>
                      <SelectItem value="TaskComplete">Task Completion</SelectItem>
                      <SelectItem value="PhaseComplete">Phase Completion</SelectItem>
                      <SelectItem value="Manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Trigger Value</Label>
                  <Input placeholder={scheduleForm.triggerType === "Date" ? "YYYY-MM-DD" : "Task or phase ID"} value={scheduleForm.triggerValue} onChange={e => setScheduleForm(f => ({ ...f, triggerValue: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Fixed Amount ($)</Label>
                  <Input type="number" step="0.01" placeholder="e.g. 5000" value={scheduleForm.amount} onChange={e => setScheduleForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>% of Budget</Label>
                  <Input type="number" step="0.1" placeholder="e.g. 25" value={scheduleForm.percentOfBudget} onChange={e => setScheduleForm(f => ({ ...f, percentOfBudget: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsScheduleOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateSchedule} disabled={!scheduleForm.name || !scheduleForm.projectId || createSchedule.isPending}>
                {createSchedule.isPending ? "Creating…" : "Create Schedule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isRevenueOpen} onOpenChange={setIsRevenueOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Recognise Revenue</DialogTitle>
              <DialogDescription>Record revenue against a project for a specific accounting period.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Project *</Label>
                <Select value={revenueForm.projectId} onValueChange={v => setRevenueForm(f => ({ ...f, projectId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>{projects?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Period *</Label>
                  <Input type="month" value={revenueForm.period} onChange={e => setRevenueForm(f => ({ ...f, period: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Recognised At</Label>
                  <Input type="date" value={revenueForm.recognizedAt} onChange={e => setRevenueForm(f => ({ ...f, recognizedAt: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Amount *</Label>
                  <Input type="number" step="0.01" placeholder="0.00" value={revenueForm.amount} onChange={e => setRevenueForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Method</Label>
                  <Select value={revenueForm.method} onValueChange={v => setRevenueForm(f => ({ ...f, method: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Percentage of Completion">Percentage of Completion</SelectItem>
                      <SelectItem value="Completed Contract">Completed Contract</SelectItem>
                      <SelectItem value="Time & Materials">Time &amp; Materials</SelectItem>
                      <SelectItem value="Milestone">Milestone</SelectItem>
                      <SelectItem value="Straight Line">Straight Line</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input placeholder="Optional notes" value={revenueForm.notes} onChange={e => setRevenueForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRevenueOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateRevenue} disabled={!revenueForm.projectId || !revenueForm.amount || createRevenue.isPending}>
                {createRevenue.isPending ? "Saving…" : "Record Revenue"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingSchedule} onOpenChange={(o) => { if (!o) setEditingSchedule(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Billing Schedule</DialogTitle>
            </DialogHeader>
            {editingSchedule && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Schedule Name *</Label>
                  <Input value={editingSchedule.name} onChange={e => setEditingSchedule((s: any) => ({ ...s, name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Trigger Type</Label>
                    <Select value={editingSchedule.triggerType} onValueChange={v => setEditingSchedule((s: any) => ({ ...s, triggerType: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Date">Date</SelectItem>
                        <SelectItem value="TaskComplete">Task Completion</SelectItem>
                        <SelectItem value="PhaseComplete">Phase Completion</SelectItem>
                        <SelectItem value="Manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Trigger Value</Label>
                    <Input placeholder={editingSchedule.triggerType === "Date" ? "YYYY-MM-DD" : "Task or phase ID"} value={editingSchedule.triggerValue ?? ""} onChange={e => setEditingSchedule((s: any) => ({ ...s, triggerValue: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Fixed Amount ($)</Label>
                    <Input type="number" step="0.01" value={editingSchedule.amount ?? ""} onChange={e => setEditingSchedule((s: any) => ({ ...s, amount: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>% of Budget</Label>
                    <Input type="number" step="0.1" value={editingSchedule.percentOfBudget ?? ""} onChange={e => setEditingSchedule((s: any) => ({ ...s, percentOfBudget: e.target.value }))} />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSchedule(null)}>Cancel</Button>
              <Button onClick={() => editingSchedule && updateScheduleMut.mutate({
                id: editingSchedule.id,
                data: {
                  name: editingSchedule.name,
                  triggerType: editingSchedule.triggerType,
                  triggerValue: editingSchedule.triggerValue || undefined,
                  amount: editingSchedule.amount ? parseFloat(String(editingSchedule.amount)) : undefined,
                  percentOfBudget: editingSchedule.percentOfBudget ? parseFloat(String(editingSchedule.percentOfBudget)) : undefined,
                },
              })} disabled={!editingSchedule?.name || updateScheduleMut.isPending}>
                {updateScheduleMut.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingRevenue} onOpenChange={(o) => { if (!o) setEditingRevenue(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Revenue Entry</DialogTitle>
            </DialogHeader>
            {editingRevenue && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Period *</Label>
                    <Input type="month" value={editingRevenue.period} onChange={e => setEditingRevenue((r: any) => ({ ...r, period: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Recognised At</Label>
                    <Input type="date" value={editingRevenue.recognizedAt ?? ""} onChange={e => setEditingRevenue((r: any) => ({ ...r, recognizedAt: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Amount *</Label>
                    <Input type="number" step="0.01" value={editingRevenue.amount} onChange={e => setEditingRevenue((r: any) => ({ ...r, amount: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Method</Label>
                    <Select value={editingRevenue.method} onValueChange={v => setEditingRevenue((r: any) => ({ ...r, method: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Percentage of Completion">Percentage of Completion</SelectItem>
                        <SelectItem value="Completed Contract">Completed Contract</SelectItem>
                        <SelectItem value="Time & Materials">Time &amp; Materials</SelectItem>
                        <SelectItem value="Milestone">Milestone</SelectItem>
                        <SelectItem value="Straight Line">Straight Line</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Input placeholder="Optional notes" value={editingRevenue.notes ?? ""} onChange={e => setEditingRevenue((r: any) => ({ ...r, notes: e.target.value }))} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingRevenue(null)}>Cancel</Button>
              <Button onClick={() => editingRevenue && updateRevenueMut.mutate({
                id: editingRevenue.id,
                data: {
                  period: editingRevenue.period,
                  amount: parseFloat(String(editingRevenue.amount)),
                  method: editingRevenue.method,
                  notes: editingRevenue.notes || null,
                  recognizedAt: editingRevenue.recognizedAt || undefined,
                },
              })} disabled={!editingRevenue?.period || !editingRevenue?.amount || updateRevenueMut.isPending}>
                {updateRevenueMut.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleteScheduleId} onOpenChange={() => setDeleteScheduleId(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete Billing Schedule</DialogTitle><DialogDescription>This cannot be undone.</DialogDescription></DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteScheduleId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteScheduleId && handleDeleteSchedule(deleteScheduleId)} disabled={deleteSchedule.isPending}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleteRevenueId} onOpenChange={() => setDeleteRevenueId(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete Revenue Entry</DialogTitle><DialogDescription>This cannot be undone.</DialogDescription></DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteRevenueId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteRevenueId && handleDeleteRevenue(deleteRevenueId)} disabled={deleteRevenue.isPending}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isContractOpen} onOpenChange={(o) => { if (!o) { setEditingContract(null); resetContractForm(); } setIsContractOpen(o); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingContract ? "Edit Contract" : "New Contract"}</DialogTitle>
              <DialogDescription>
                {editingContract ? "Update the contract details." : "Track a contract tied to a project."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-1">
              <div className="space-y-1.5">
                <Label>Contract Name *</Label>
                <input
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="e.g. Master Services Agreement"
                  value={contractForm.name}
                  onChange={e => setContractForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Project *</Label>
                  <Select value={contractForm.projectId} onValueChange={v => setContractForm(f => ({ ...f, projectId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select project…" /></SelectTrigger>
                    <SelectContent>
                      {projects?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={contractForm.status} onValueChange={v => setContractForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Pending Signature">Pending Signature</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Expired">Expired</SelectItem>
                      <SelectItem value="Terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Start Date</Label>
                  <input type="date" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={contractForm.startDate} onChange={e => setContractForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>End Date</Label>
                  <input type="date" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={contractForm.endDate} onChange={e => setContractForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Contract Value ($)</Label>
                  <input
                    type="number"
                    step="0.01"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="0.00"
                    value={contractForm.value}
                    onChange={e => setContractForm(f => ({ ...f, value: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Document URL</Label>
                  <input
                    type="url"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="https://…"
                    value={contractForm.documentUrl}
                    onChange={e => setContractForm(f => ({ ...f, documentUrl: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Optional contract notes…"
                  rows={3}
                  value={contractForm.notes}
                  onChange={e => setContractForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditingContract(null); resetContractForm(); setIsContractOpen(false); }}>Cancel</Button>
              <Button
                onClick={handleCreateContract}
                disabled={!contractForm.name || !contractForm.projectId || isSavingContract}
              >
                {isSavingContract ? "Saving…" : (editingContract ? "Update Contract" : "Save Contract")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editInvoice} onOpenChange={o => !o && setEditInvoice(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Invoice — {editInvoice?.id}</DialogTitle>
              <DialogDescription>Update the invoice details below.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label>Description</Label>
                <Input value={invoiceEditForm.description} onChange={e => setInvoiceEditForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Amount ($)</Label>
                  <Input type="number" step="0.01" value={invoiceEditForm.amount} onChange={e => setInvoiceEditForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Due Date</Label>
                  <Input type="date" value={invoiceEditForm.dueDate} onChange={e => setInvoiceEditForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={invoiceEditForm.status} onChange={e => setInvoiceEditForm(f => ({ ...f, status: e.target.value }))}>
                  {["Draft","In Review","Approved","Paid","Overdue"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditInvoice(null)}>Cancel</Button>
              <Button onClick={handleEditInvoiceSave} disabled={updateInvoice.isPending}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleteInvoiceId} onOpenChange={o => !o && setDeleteInvoiceId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Invoice</DialogTitle>
              <DialogDescription>Permanently delete invoice <strong>{deleteInvoiceId}</strong>? This cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteInvoiceId(null)}>Cancel</Button>
              <Button variant="destructive" disabled={deleteInvoiceMut.isPending} onClick={() => deleteInvoiceId && deleteInvoiceMut.mutate(deleteInvoiceId)}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
