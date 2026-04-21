import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useGetFinanceSummary, useListInvoices, useListAccounts, useListProjects, useCreateInvoice, getListInvoicesQueryKey,
  useListBillingSchedules, useCreateBillingSchedule, useDeleteBillingSchedule, useTriggerBillingSchedule, getListBillingSchedulesQueryKey,
  useListRevenueEntries, useCreateRevenueEntry, useDeleteRevenueEntry, useGetRevenueByPeriodReport, getListRevenueEntriesQueryKey,
  useUpdateInvoice,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { InvoiceDetail } from "@/components/invoice-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, DollarSign, Zap, Trash2, TrendingUp, CalendarClock, BookOpen, Search, MoreVertical, ChevronRight } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export function InvoiceStatusBadge({ status }: { status: string }) {
  const getVariant = (s: string) => {
    switch (s) {
      case "Paid": return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
      case "Approved": return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
      case "In Review": return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
      case "Overdue": return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
      default: return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
    }
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getVariant(status)}`}>{status}</span>;
}

function ScheduleStatusBadge({ status }: { status: string }) {
  const cls = status === "Fired" ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400"
    : status === "Active" ? "bg-blue-100 text-blue-800 border-blue-200"
    : "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>{status}</span>;
}

const createInvoiceSchema = z.object({
  projectId: z.coerce.number().min(1, "Project is required"),
  accountId: z.coerce.number().min(1, "Account is required"),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  description: z.string().min(1),
  amount: z.coerce.number().min(0),
  tax: z.coerce.number().min(0),
});

export default function Finance() {
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterProjectId, setFilterProjectId] = useState<number | undefined>();
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [deleteScheduleId, setDeleteScheduleId] = useState<number | null>(null);
  const [isRevenueOpen, setIsRevenueOpen] = useState(false);
  const [deleteRevenueId, setDeleteRevenueId] = useState<number | null>(null);

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
  const createInvoice = useCreateInvoice();

  const { data: schedules, isLoading: isLoadingSchedules } = useListBillingSchedules({ projectId: filterProjectId });
  const createSchedule = useCreateBillingSchedule();
  const deleteSchedule = useDeleteBillingSchedule();
  const triggerSchedule = useTriggerBillingSchedule();

  const { data: revenueEntries, isLoading: isLoadingRevenue } = useListRevenueEntries({ projectId: filterProjectId });
  const createRevenue = useCreateRevenueEntry();
  const deleteRevenue = useDeleteRevenueEntry();
  const { data: revReport } = useGetRevenueByPeriodReport();

  const form = useForm<z.infer<typeof createInvoiceSchema>>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: { issueDate: new Date().toISOString().split("T")[0], dueDate: new Date().toISOString().split("T")[0], amount: 0, tax: 0, description: "" },
  });

  const onCreateInvoice = async (values: z.infer<typeof createInvoiceSchema>) => {
    try {
      await createInvoice.mutateAsync({ data: { ...values, status: "Draft" } as any });
      queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      setIsCreateOpen(false);
      form.reset();
      toast({ title: "Invoice created" });
    } catch {
      toast({ title: "Failed to create invoice", variant: "destructive" });
    }
  };

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

  const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Finance & Invoicing</h1>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Invoice
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {(["Total Invoiced", "Total Paid", "Outstanding", "Overdue"] as const).map((label, i) => {
            const vals = [summary?.totalInvoiced, summary?.totalPaid, summary?.totalOutstanding, summary?.totalOverdue];
            const colors = ["", "text-green-600 dark:text-green-400", "", "text-destructive"];
            return (
              <Card key={label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{label}</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoadingSummary ? <Skeleton className="h-8 w-24" /> : (
                    <div className={`text-2xl font-bold ${colors[i]}`}>${vals[i]?.toLocaleString()}</div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          <Select onValueChange={v => setFilterProjectId(v ? parseInt(v) : undefined)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by project…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

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
          </TabsList>

          <TabsContent value="invoices" className="m-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Invoices</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pl-9 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Search invoices…"
                    value={invoiceSearch}
                    onChange={e => setInvoiceSearch(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const search = invoiceSearch.toLowerCase();
                  const filtered = (invoices ?? []).filter(inv =>
                    !search ||
                    inv.id.toLowerCase().includes(search) ||
                    (inv.description ?? "").toLowerCase().includes(search)
                  );
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
                                      <TableCell><InvoiceStatusBadge status={invoice.status} /></TableCell>
                                      <TableCell className="text-right font-medium">${invoice.total.toLocaleString()}</TableCell>
                                      <TableCell onClick={e => e.stopPropagation()} className="p-1">
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setSelectedInvoice(invoice)}>View Details</DropdownMenuItem>
                                            {nextStatus && (
                                              <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={e => handleQuickStatusUpdate(e, invoice.id, nextStatus)}>
                                                  <ChevronRight className="h-3.5 w-3.5 mr-1.5" /> Mark as {nextStatus}
                                                </DropdownMenuItem>
                                              </>
                                            )}
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </TableCell>
                                    </TableRow>
                                    );
                                  })}
                                  {tabFiltered.length === 0 && (
                                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                      {invoiceSearch ? `No invoices match "${invoiceSearch}".` : "No invoices found."}
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
                  <div className="text-center py-12 text-muted-foreground">
                    <CalendarClock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No billing schedules</p>
                    <p className="text-sm mt-1">Create a schedule to automatically trigger invoice drafts.</p>
                  </div>
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
                      {schedules?.map(s => (
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
                          <TableCell><ScheduleStatusBadge status={s.status} /></TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {s.lastFiredAt ? new Date(s.lastFiredAt).toLocaleDateString() : "Never"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleTrigger(s.id)} disabled={triggerSchedule.isPending}>
                                <Zap className="h-3 w-3 mr-1" /> Fire
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
                      <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
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
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No revenue entries</p>
                    <p className="text-sm mt-1">Record recognised revenue against projects and periods.</p>
                  </div>
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
                      {revenueEntries?.map(e => (
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
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => setDeleteRevenueId(e.id)}>
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
        </Tabs>

        <InvoiceDetail invoice={selectedInvoice} open={!!selectedInvoice} onOpenChange={(o) => !o && setSelectedInvoice(null)} />

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreateInvoice)} className="space-y-4">
                <FormField control={form.control} name="projectId" render={({ field }) => (
                  <FormItem><FormLabel>Project</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger></FormControl>
                      <SelectContent>{projects?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
                    </Select></FormItem>
                )} />
                <FormField control={form.control} name="accountId" render={({ field }) => (
                  <FormItem><FormLabel>Account</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger></FormControl>
                      <SelectContent>{accounts?.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}</SelectContent>
                    </Select></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="issueDate" render={({ field }) => (
                    <FormItem><FormLabel>Issue Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="dueDate" render={({ field }) => (
                    <FormItem><FormLabel>Due Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="tax" render={({ field }) => (
                    <FormItem><FormLabel>Tax</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <DialogFooter><Button type="submit" disabled={createInvoice.isPending}>Create Invoice</Button></DialogFooter>
              </form>
            </Form>
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
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Period *</Label>
                  <Input type="month" value={revenueForm.period} onChange={e => setRevenueForm(f => ({ ...f, period: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Recognised At</Label>
                  <Input type="date" value={revenueForm.recognizedAt} onChange={e => setRevenueForm(f => ({ ...f, recognizedAt: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
      </div>
    </Layout>
  );
}
