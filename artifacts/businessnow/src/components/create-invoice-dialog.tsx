import { useState, useEffect, useCallback } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { useListAccounts, useListProjects, useListTaxCodes, useCreateInvoice, getListInvoicesQueryKey, getGetFinanceSummaryQueryKey } from "@workspace/api-client-react";
import { authHeaders } from "@/lib/auth-headers";
import { Check, ChevronsUpDown, TrendingUp, ReceiptText, Wallet, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ProjectSummary = {
  totalBudget: number;
  totalInvoiced: number;
  remainingBalance: number;
  projectName: string;
};

type Errors = Partial<Record<string, string>>;

const today = () => new Date().toISOString().split("T")[0];
const plusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateInvoiceDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createInvoice = useCreateInvoice();

  const { data: accounts } = useListAccounts();
  const { data: allProjects } = useListProjects();
  const { data: taxCodes } = useListTaxCodes();

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

  const [accountOpen, setAccountOpen] = useState(false);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);

  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState(plusDays(30));
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [taxCodeId, setTaxCodeId] = useState<number | null>(null);
  const [tax, setTax] = useState("");
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const projects = allProjects?.filter(p => !accountId || (p as any).accountId === accountId) ?? [];
  const selectedAccount = accounts?.find(a => a.id === accountId);
  const selectedProject = allProjects?.find(p => p.id === projectId);
  const selectedTaxCode = taxCodes?.find(tc => tc.id === taxCodeId);

  const { data: projectSummary, isFetching: isFetchingSummary } = useQuery<ProjectSummary>({
    queryKey: ["invoice-project-summary", projectId],
    queryFn: async ({ signal }) => {
      const r = await fetch(`${BASE}/api/invoices/project-summary/${projectId}`, {
        headers: authHeaders(),
        signal,
      });
      if (!r.ok) throw new Error("Failed to fetch project summary");
      return r.json();
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });

  const recomputeTax = useCallback((amtStr: string, tcId: number | null) => {
    if (tcId && taxCodes) {
      const tc = taxCodes.find(t => t.id === tcId);
      if (tc) {
        const computed = Math.round(parseFloat(amtStr || "0") * Number(tc.rate)) / 100;
        setTax(isNaN(computed) ? "" : computed.toFixed(2));
        return;
      }
    }
    if (!tcId) setTax("");
  }, [taxCodes]);

  useEffect(() => {
    if (projectId && selectedProject) {
      setDescription(`Invoice for ${selectedProject.name}`);
      if (projectSummary && projectSummary.remainingBalance > 0) {
        setAmount(projectSummary.remainingBalance.toFixed(2));
        recomputeTax(projectSummary.remainingBalance.toFixed(2), taxCodeId);
      }
    }
  }, [projectId, projectSummary]);

  useEffect(() => {
    recomputeTax(amount, taxCodeId);
  }, [taxCodeId]);

  const handleReset = () => {
    setAccountId(null);
    setProjectId(null);
    setIssueDate(today());
    setDueDate(plusDays(30));
    setDescription("");
    setAmount("");
    setTaxCodeId(null);
    setTax("");
    setNotes("");
    setErrors({});
    setAccountOpen(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) handleReset();
    onOpenChange(v);
  };

  const validate = (): boolean => {
    const e: Errors = {};
    if (!accountId) e.accountId = "Account is required";
    if (!projectId) e.projectId = "Project is required";
    if (!issueDate) e.issueDate = "Issue date is required";
    if (!dueDate) e.dueDate = "Due date is required";
    if (dueDate && issueDate && dueDate < issueDate) e.dueDate = "Due date must be on or after issue date";
    if (!description.trim()) e.description = "Description is required";
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
      e.amount = "Amount must be greater than 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await createInvoice.mutateAsync({
        data: {
          accountId: accountId!,
          projectId: projectId!,
          issueDate,
          dueDate,
          description: description.trim(),
          amount: parseFloat(amount),
          tax: tax ? parseFloat(tax) : 0,
          taxCodeId: taxCodeId ?? undefined,
          notes: notes.trim() || undefined,
        } as any,
      });
      await queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetFinanceSummaryQueryKey() });
      toast({ title: "Invoice created", description: `Draft invoice created for ${selectedProject?.name}` });
      handleClose(false);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? "Unknown error";
      toast({ title: "Failed to create invoice", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldErr = (k: string) =>
    errors[k] ? (
      <p className="flex items-center gap-1 text-xs text-destructive mt-1">
        <AlertCircle className="h-3 w-3" /> {errors[k]}
      </p>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Select an account and project to generate a new draft invoice with auto-populated financial summary.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">

          {/* ── Step 1: Account ── */}
          <div className="space-y-1">
            <Label>Account <span className="text-destructive">*</span></Label>
            <Popover open={accountOpen} onOpenChange={setAccountOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={accountOpen}
                  className={cn("w-full justify-between font-normal", !selectedAccount && "text-muted-foreground", errors.accountId && "border-destructive")}
                >
                  {selectedAccount ? selectedAccount.name : "Search and select an account…"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search accounts…" />
                  <CommandList>
                    <CommandEmpty>No accounts found.</CommandEmpty>
                    <CommandGroup>
                      {(accounts ?? []).map(a => (
                        <CommandItem
                          key={a.id}
                          value={a.name}
                          onSelect={() => {
                            if (accountId !== a.id) {
                              setAccountId(a.id);
                              setProjectId(null);
                            }
                            setAccountOpen(false);
                            if (errors.accountId) setErrors(e => ({ ...e, accountId: undefined }));
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", accountId === a.id ? "opacity-100" : "opacity-0")} />
                          {a.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {fieldErr("accountId")}
          </div>

          {/* ── Step 2: Project (filtered by account) ── */}
          <div className="space-y-1">
            <Label>
              Project <span className="text-destructive">*</span>
              {accountId && <span className="ml-2 text-xs text-muted-foreground">({projects.length} project{projects.length !== 1 ? "s" : ""} for this account)</span>}
            </Label>
            <Select
              disabled={!accountId}
              value={projectId?.toString() ?? ""}
              onValueChange={v => {
                setProjectId(Number(v));
                if (errors.projectId) setErrors(e => ({ ...e, projectId: undefined }));
              }}
            >
              <SelectTrigger className={cn(!accountId && "opacity-50", errors.projectId && "border-destructive")}>
                <SelectValue placeholder={accountId ? "Select a project…" : "Select an account first"} />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErr("projectId")}
          </div>

          {/* ── Project Financial Summary (read-only) ── */}
          {projectId && (
            <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project Financial Summary</p>
              {isFetchingSummary ? (
                <div className="grid grid-cols-3 gap-3">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="h-16 rounded-md bg-muted animate-pulse" />
                  ))}
                </div>
              ) : projectSummary ? (
                <div className="grid grid-cols-3 gap-3">
                  <SummaryCard
                    icon={<Wallet className="h-4 w-4 text-indigo-500" />}
                    label="Total Budget"
                    value={fmt(projectSummary.totalBudget)}
                  />
                  <SummaryCard
                    icon={<ReceiptText className="h-4 w-4 text-amber-500" />}
                    label="Invoiced to Date"
                    value={fmt(projectSummary.totalInvoiced)}
                  />
                  <SummaryCard
                    icon={<TrendingUp className={cn("h-4 w-4", projectSummary.remainingBalance >= 0 ? "text-green-500" : "text-destructive")} />}
                    label="Remaining Balance"
                    value={fmt(projectSummary.remainingBalance)}
                    valueClass={projectSummary.remainingBalance >= 0 ? "text-green-700 dark:text-green-400" : "text-destructive"}
                  />
                </div>
              ) : null}
            </div>
          )}

          <div className="border-t pt-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoice Details</p>

            {/* ── Dates ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Issue Date <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={e => {
                    setIssueDate(e.target.value);
                    if (errors.issueDate) setErrors(er => ({ ...er, issueDate: undefined }));
                  }}
                  className={errors.issueDate ? "border-destructive" : ""}
                />
                {fieldErr("issueDate")}
              </div>
              <div className="space-y-1">
                <Label>Due Date <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={dueDate}
                  min={issueDate}
                  onChange={e => {
                    setDueDate(e.target.value);
                    if (errors.dueDate) setErrors(er => ({ ...er, dueDate: undefined }));
                  }}
                  className={errors.dueDate ? "border-destructive" : ""}
                />
                {fieldErr("dueDate")}
              </div>
            </div>

            {/* ── Description ── */}
            <div className="space-y-1">
              <Label>Description <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Enter invoice description"
                value={description}
                onChange={e => {
                  setDescription(e.target.value);
                  if (errors.description) setErrors(er => ({ ...er, description: undefined }));
                }}
                className={errors.description ? "border-destructive" : ""}
              />
              {fieldErr("description")}
            </div>

            {/* ── Amount + Tax Code ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>
                  Amount (USD) <span className="text-destructive">*</span>
                  {projectSummary && projectSummary.remainingBalance > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      Balance: {fmt(projectSummary.remainingBalance)}
                    </span>
                  )}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => {
                    setAmount(e.target.value);
                    recomputeTax(e.target.value, taxCodeId);
                    if (errors.amount) setErrors(er => ({ ...er, amount: undefined }));
                  }}
                  className={errors.amount ? "border-destructive" : ""}
                />
                {fieldErr("amount")}
              </div>
              <div className="space-y-1">
                <Label>Tax Code <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Select
                  value={taxCodeId?.toString() ?? "none"}
                  onValueChange={v => {
                    const id = v === "none" ? null : Number(v);
                    setTaxCodeId(id);
                    recomputeTax(amount, id);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {(taxCodes ?? []).map(tc => (
                      <SelectItem key={tc.id} value={tc.id.toString()}>
                        {tc.name} ({Number(tc.rate)}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Tax Amount (read-only if tax code selected, editable if manual) ── */}
            <div className="space-y-1">
              <Label>
                Tax Amount
                {selectedTaxCode ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    Auto-computed at {Number(selectedTaxCode.rate)}% — read-only
                  </span>
                ) : (
                  <span className="ml-2 text-xs text-muted-foreground">(optional — enter manually if no tax code)</span>
                )}
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={tax}
                readOnly={!!taxCodeId}
                onChange={e => !taxCodeId && setTax(e.target.value)}
                className={cn(taxCodeId && "bg-muted text-muted-foreground cursor-not-allowed")}
              />
            </div>

            {/* ── Invoice Total Preview ── */}
            {amount && parseFloat(amount) > 0 && (
              <div className="rounded-md bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Invoice Total</span>
                <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
                  {fmt((parseFloat(amount) || 0) + (parseFloat(tax) || 0))}
                </span>
              </div>
            )}

            {/* ── Notes ── */}
            <div className="space-y-1">
              <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                placeholder="Additional notes or terms…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !accountId || !projectId}>
            {isSubmitting ? "Creating…" : "Create Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-md bg-background border px-3 py-2.5 space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className={cn("text-sm font-semibold tabular-nums", valueClass)}>{value}</p>
    </div>
  );
}
