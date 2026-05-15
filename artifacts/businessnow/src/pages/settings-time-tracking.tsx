/**
 * /settings/time-tracking — Admin settings for the Time Tracking module.
 *
 * Five tabs:
 *  1. Financial Periods   (CRUD + status toggle + CFO override)
 *  2. Contract Rules      (per-project config)
 *  3. Exceptional Effort  (global overtime thresholds)
 *  4. Proxy Delegations   (who can enter time on behalf of whom)
 *  5. Audit Log           (read-only viewer + CSV export)
 */

import { useState, useMemo } from "react";
import { format, isPast, parseISO } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { authHeaders } from "@/lib/auth-headers";
import { useCurrentUser } from "@/contexts/current-user";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useListUsers, useListProjects } from "@workspace/api-client-react";

import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Calendar, AlertTriangle, Users, FileText, Search, Download,
  Plus, ToggleLeft, Settings2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FinancialPeriod {
  id: number;
  periodName: string;
  startDate: string;
  endDate: string;
  status: string;
  cfoOverrideActive: boolean;
  cfoOverrideUserId: number | null;
  createdAt: string;
}

interface ContractRule {
  id: number;
  projectId: number;
  contractType: string;
  incrementMinutes: number;
  maxBillableHours: string | null;
  narrativeRequired: boolean;
  futureDateBufferDays: number;
  maxDailyHours: string;
}

interface ExceptionalEffortRule {
  id: number;
  ruleName: string;
  dailyOvertimeThresholdHours: string;
  weeklyOvertimeThresholdHours: string;
  isActive: boolean;
}

interface ProxyDelegation {
  id: number;
  proxyUserId: number;
  targetUserId: number;
  grantedById: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

interface AuditRecord {
  id: number;
  effortEntryId: number;
  action: string;
  performedById: number;
  previousValue: any;
  newValue: any;
  notes: string | null;
  performedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fetchJson(url: string) {
  return fetch(url, { headers: authHeaders() }).then(r => r.json());
}

function mutateJson(url: string, method: string, body?: any) {
  return fetch(url, {
    method,
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

function downloadCSV(rows: AuditRecord[], getName: (id: number) => string) {
  const header = "ID,Entry ID,Action,Performed By,Timestamp,Notes\n";
  const body = rows.map(r =>
    [r.id, r.effortEntryId, r.action, getName(r.performedById),
      format(parseISO(r.performedAt), "yyyy-MM-dd HH:mm:ss"),
      r.notes ?? ""].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","),
  ).join("\n");
  const blob = new Blob([header + body], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `effort-audit-log-${format(new Date(), "yyyyMMdd")}.csv`;
  a.click();
}

// ─── Financial Periods Tab ────────────────────────────────────────────────────

function FinancialPeriodsTab({ allUsers }: { allUsers: any[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const QK = ["time-financial-periods"];

  const { data, isLoading } = useQuery<{ data: FinancialPeriod[] }>({
    queryKey: QK,
    queryFn: () => fetchJson("/api/time/financial-periods"),
  });
  const periods = data?.data ?? [];

  const [addOpen, setAddOpen] = useState(false);
  const [confirmPatch, setConfirmPatch] = useState<{ period: FinancialPeriod; patch: any; label: string } | null>(null);
  const [form, setForm] = useState({ periodName: "", startDate: "", endDate: "", status: "Open" });
  const [saving, setSaving] = useState(false);

  const getName = (id: number | null) => id ? allUsers.find(u => u.id === id)?.name ?? `User ${id}` : "—";

  async function saveNew() {
    setSaving(true);
    try {
      const r = await mutateJson("/api/time/financial-periods", "POST", form);
      if (r.error) { toast({ title: "Failed", description: r.error.message, variant: "destructive" }); return; }
      toast({ title: "Period created" });
      setAddOpen(false);
      setForm({ periodName: "", startDate: "", endDate: "", status: "Open" });
      qc.invalidateQueries({ queryKey: QK });
    } finally { setSaving(false); }
  }

  async function applyPatch(period: FinancialPeriod, patch: any) {
    const r = await mutateJson(`/api/time/financial-periods/${period.id}`, "PATCH", patch);
    if (r.error) { toast({ title: "Failed", description: r.error.message, variant: "destructive" }); return; }
    toast({ title: "Period updated" });
    qc.invalidateQueries({ queryKey: QK });
    setConfirmPatch(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Manage fiscal periods. Closing a period prevents new time entries from being posted against it.
        </p>
        <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Period
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : periods.length === 0 ? (
        <EmptyState icon={Calendar} title="No financial periods" description="Add the first period to get started." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period Name</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>CFO Override</TableHead>
              <TableHead>CFO User</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.periodName}</TableCell>
                <TableCell>{format(parseISO(p.startDate), "MMM d, yyyy")}</TableCell>
                <TableCell>{format(parseISO(p.endDate), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn(
                      "text-xs",
                      p.status === "Open"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-600",
                    )}>
                      {p.status}
                    </Badge>
                    <Switch
                      checked={p.status === "Open"}
                      onCheckedChange={() => setConfirmPatch({
                        period: p,
                        patch: { status: p.status === "Open" ? "Closed" : "Open" },
                        label: `Change "${p.periodName}" to ${p.status === "Open" ? "Closed" : "Open"}?`,
                      })}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={p.cfoOverrideActive}
                    onCheckedChange={v => setConfirmPatch({
                      period: p,
                      patch: { cfoOverrideActive: v },
                      label: `${v ? "Enable" : "Disable"} CFO override for "${p.periodName}"?`,
                    })}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={String(p.cfoOverrideUserId ?? "")}
                    onValueChange={v => setConfirmPatch({
                      period: p,
                      patch: { cfoOverrideUserId: v ? Number(v) : null },
                      label: `Set CFO override user for "${p.periodName}"?`,
                    })}
                  >
                    <SelectTrigger className="h-7 w-[160px] text-xs">
                      <SelectValue placeholder="No user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No user</SelectItem>
                      {allUsers.map((u: any) => (
                        <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Add Period dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Financial Period</DialogTitle>
            <DialogDescription>Create a new fiscal period. This affects when time entries can be posted.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Period Name</Label>
              <Input value={form.periodName} onChange={e => setForm(f => ({ ...f, periodName: e.target.value }))} placeholder="e.g. Q2 2026" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveNew} disabled={saving || !form.periodName || !form.startDate || !form.endDate}>Save Period</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog */}
      <Dialog open={!!confirmPatch} onOpenChange={o => { if (!o) setConfirmPatch(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Change</DialogTitle>
            <DialogDescription>{confirmPatch?.label}</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground px-1">
            This change takes effect immediately and may impact time entry posting.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPatch(null)}>Cancel</Button>
            <Button onClick={() => confirmPatch && applyPatch(confirmPatch.period, confirmPatch.patch)}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Contract Rules Tab ───────────────────────────────────────────────────────

function ContractRulesTab({ allProjects }: { allProjects: any[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<ContractRule>>({});

  const filtered = useMemo(() =>
    allProjects.filter((p: any) =>
      !search || p.name.toLowerCase().includes(search.toLowerCase()),
    ), [allProjects, search]);

  const { data: ruleData } = useQuery<{ data: ContractRule | null }>({
    queryKey: ["contract-rule", selectedProject?.id],
    queryFn: () => fetchJson(`/api/time/contract-rules/${selectedProject!.id}`),
    enabled: !!selectedProject,
  });
  const rule = ruleData?.data;

  // Sync form when rule loads
  const formKey = selectedProject?.id;
  const [lastKey, setLastKey] = useState<number | null>(null);
  if (selectedProject && rule !== undefined && selectedProject.id !== lastKey) {
    setLastKey(selectedProject.id);
    setForm(rule ?? {
      projectId: selectedProject.id,
      contractType: "Time_And_Materials",
      incrementMinutes: 15,
      narrativeRequired: false,
      futureDateBufferDays: 7,
      maxDailyHours: "24",
    });
  }

  async function doSave() {
    if (!selectedProject) return;
    setSaving(true);
    try {
      const r = await mutateJson(`/api/time/contract-rules/${selectedProject.id}`, "PATCH", form);
      if (r.error) { toast({ title: "Failed", description: r.error.message, variant: "destructive" }); return; }
      toast({ title: "Contract rules saved" });
      qc.invalidateQueries({ queryKey: ["contract-rule", selectedProject.id] });
      setConfirmSave(false);
    } finally { setSaving(false); }
  }

  return (
    <div className="grid grid-cols-[260px_1fr] gap-5 min-h-[400px]">
      {/* Project list */}
      <div className="border-r pr-4 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="space-y-0.5 max-h-[480px] overflow-y-auto">
          {filtered.map((p: any) => (
            <button
              key={p.id}
              onClick={() => { setSelectedProject(p); setLastKey(null); }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                selectedProject?.id === p.id
                  ? "bg-indigo-50 text-indigo-900 font-medium"
                  : "hover:bg-muted",
              )}
            >
              {p.name}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-4">No projects found.</p>
          )}
        </div>
      </div>

      {/* Rule form */}
      {!selectedProject ? (
        <div className="flex items-center justify-center text-sm text-muted-foreground">
          Select a project to view or edit its contract rules.
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <h3 className="font-semibold text-base">{selectedProject.name}</h3>
            <p className="text-xs text-muted-foreground">Project ID {selectedProject.id}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Contract Type</Label>
              <Select
                value={form.contractType ?? "Time_And_Materials"}
                onValueChange={v => setForm(f => ({ ...f, contractType: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Time_And_Materials">Time &amp; Materials</SelectItem>
                  <SelectItem value="Fixed_Bid">Fixed Bid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Minimum Increment</Label>
              <Select
                value={String(form.incrementMinutes ?? 15)}
                onValueChange={v => setForm(f => ({ ...f, incrementMinutes: Number(v) }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Max Daily Hours</Label>
              <Input
                type="number"
                min={1}
                max={24}
                step={0.5}
                value={form.maxDailyHours ?? "24"}
                onChange={e => setForm(f => ({ ...f, maxDailyHours: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Future Date Buffer (days)</Label>
              <Input
                type="number"
                min={0}
                max={90}
                value={form.futureDateBufferDays ?? 7}
                onChange={e => setForm(f => ({ ...f, futureDateBufferDays: Number(e.target.value) }))}
              />
            </div>

            {form.contractType === "Fixed_Bid" && (
              <div className="space-y-1.5">
                <Label>Max Billable Hours Cap</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={form.maxBillableHours ?? ""}
                  placeholder="Unlimited"
                  onChange={e => setForm(f => ({ ...f, maxBillableHours: e.target.value || null }))}
                />
              </div>
            )}

            <div className="space-y-1.5 col-span-2">
              <Label>Narrative Required</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={!!form.narrativeRequired}
                  onCheckedChange={v => setForm(f => ({ ...f, narrativeRequired: v }))}
                />
                <span className="text-sm text-muted-foreground">
                  {form.narrativeRequired ? "Yes — submitters must provide a narrative" : "No"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setConfirmSave(true)} disabled={saving}>Save Rules</Button>
          </div>
        </div>
      )}

      {/* Confirm save dialog */}
      <Dialog open={confirmSave} onOpenChange={o => { if (!o) setConfirmSave(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Contract Rules</DialogTitle>
            <DialogDescription>
              This will update the contract rules for <strong>{selectedProject?.name}</strong>.
              Changes to increment minutes and caps take effect on the next time entry.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSave(false)} disabled={saving}>Cancel</Button>
            <Button onClick={doSave} disabled={saving}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Exceptional Effort Tab ───────────────────────────────────────────────────

function ExceptionalEffortTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const QK = ["time-exceptional-effort-rules"];
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<ExceptionalEffortRule>>({});
  const [loaded, setLoaded] = useState(false);

  const { data } = useQuery<{ data: ExceptionalEffortRule[] }>({
    queryKey: QK,
    queryFn: () => fetchJson("/api/time/exceptional-effort-rules"),
  });

  const rules = data?.data ?? [];
  const activeRule = rules.find(r => r.isActive) ?? rules[0];

  if (activeRule && !loaded) {
    setLoaded(true);
    setForm({
      dailyOvertimeThresholdHours: activeRule.dailyOvertimeThresholdHours,
      weeklyOvertimeThresholdHours: activeRule.weeklyOvertimeThresholdHours,
      isActive: activeRule.isActive,
    });
  }

  async function save() {
    if (!activeRule) return;
    setSaving(true);
    try {
      const r = await mutateJson(`/api/time/exceptional-effort-rules/${activeRule.id}`, "PATCH", form);
      if (r.error) { toast({ title: "Failed", description: r.error.message, variant: "destructive" }); return; }
      toast({ title: "Rule updated", description: "Takes effect on all future time entries." });
      qc.invalidateQueries({ queryKey: QK });
    } finally { setSaving(false); }
  }

  if (!activeRule) return <div className="text-sm text-muted-foreground py-4">No exceptional effort rules found in the database.</div>;

  return (
    <div className="space-y-5 max-w-lg">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        Changes to these thresholds take effect immediately on all future time entries.
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{activeRule.ruleName}</CardTitle>
          <CardDescription>Active exceptional effort thresholds</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Daily Overtime Threshold (hours)</Label>
              <Input
                type="number"
                min={1}
                max={24}
                step={0.5}
                value={form.dailyOvertimeThresholdHours ?? ""}
                onChange={e => setForm(f => ({ ...f, dailyOvertimeThresholdHours: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Weekly Overtime Threshold (hours)</Label>
              <Input
                type="number"
                min={1}
                max={168}
                step={0.5}
                value={form.weeklyOvertimeThresholdHours ?? ""}
                onChange={e => setForm(f => ({ ...f, weeklyOvertimeThresholdHours: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={!!form.isActive}
              onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))}
            />
            <span className="text-sm">
              {form.isActive ? "Rule is active — exceptional entries require justification" : "Rule is disabled"}
            </span>
          </div>
          <Button onClick={save} disabled={saving}>Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Proxy Delegations Tab ────────────────────────────────────────────────────

function ProxyDelegationsTab({ allUsers, currentUserId }: { allUsers: any[]; currentUserId: number }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const QK = ["time-proxy-delegations"];
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ proxyUserId: "", targetUserId: "", validFrom: "", validUntil: "" });
  const [formError, setFormError] = useState("");

  const { data, isLoading } = useQuery<{ data: ProxyDelegation[] }>({
    queryKey: QK,
    queryFn: () => fetchJson("/api/time/proxy-delegations"),
  });
  const delegations = data?.data ?? [];

  const getName = (id: number) => allUsers.find(u => u.id === id)?.name ?? `User ${id}`;

  async function saveNew() {
    setFormError("");
    if (!form.proxyUserId || !form.targetUserId || !form.validFrom || !form.validUntil) {
      setFormError("All fields are required."); return;
    }
    if (form.proxyUserId === form.targetUserId) {
      setFormError("Proxy and target users must be different."); return;
    }
    if (form.validUntil <= form.validFrom) {
      setFormError("Valid Until must be after Valid From."); return;
    }
    setSaving(true);
    try {
      const r = await mutateJson("/api/time/proxy-delegations", "POST", {
        proxyUserId: Number(form.proxyUserId),
        targetUserId: Number(form.targetUserId),
        grantedById: currentUserId,
        validFrom: form.validFrom,
        validUntil: form.validUntil,
        isActive: true,
      });
      if (r.error) { toast({ title: "Failed", description: r.error.message, variant: "destructive" }); return; }
      toast({ title: "Delegation created" });
      setAddOpen(false);
      setForm({ proxyUserId: "", targetUserId: "", validFrom: "", validUntil: "" });
      qc.invalidateQueries({ queryKey: QK });
    } finally { setSaving(false); }
  }

  async function deactivate(id: number) {
    await mutateJson(`/api/time/proxy-delegations/${id}`, "DELETE");
    toast({ title: "Delegation deactivated" });
    qc.invalidateQueries({ queryKey: QK });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Grant users the ability to enter time on behalf of another team member.
        </p>
        <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> New Delegation
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : delegations.length === 0 ? (
        <EmptyState icon={Users} title="No delegations" description="No proxy delegations have been set up yet." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proxy User</TableHead>
              <TableHead>Target User</TableHead>
              <TableHead>Granted By</TableHead>
              <TableHead>Valid From</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {delegations.map(d => {
              const expired = isPast(parseISO(d.validUntil));
              const isInactive = !d.isActive || expired;
              return (
                <TableRow key={d.id} className={cn(isInactive && "opacity-50")}>
                  <TableCell className="font-medium">{getName(d.proxyUserId)}</TableCell>
                  <TableCell>{getName(d.targetUserId)}</TableCell>
                  <TableCell className="text-muted-foreground">{getName(d.grantedById)}</TableCell>
                  <TableCell>{format(parseISO(d.validFrom), "MMM d, yyyy")}</TableCell>
                  <TableCell>{format(parseISO(d.validUntil), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    {expired ? (
                      <Badge variant="outline" className="text-xs text-muted-foreground">Expired</Badge>
                    ) : !d.isActive ? (
                      <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {d.isActive && !expired && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deactivate(d.id)}
                      >
                        Deactivate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Proxy Delegation</DialogTitle>
            <DialogDescription>Allow one user to submit time entries on behalf of another.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Proxy User (will enter time)</Label>
              <Select value={form.proxyUserId} onValueChange={v => setForm(f => ({ ...f, proxyUserId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select proxy user…" /></SelectTrigger>
                <SelectContent>
                  {allUsers.map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Target User (on whose behalf)</Label>
              <Select value={form.targetUserId} onValueChange={v => setForm(f => ({ ...f, targetUserId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select target user…" /></SelectTrigger>
                <SelectContent>
                  {allUsers.filter((u: any) => String(u.id) !== form.proxyUserId)
                    .map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valid From</Label>
                <Input type="date" value={form.validFrom} onChange={e => setForm(f => ({ ...f, validFrom: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Valid Until</Label>
                <Input type="date" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} />
              </div>
            </div>
            {formError && <p className="text-xs text-red-600">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveNew} disabled={saving}>Create Delegation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Audit Log Tab ────────────────────────────────────────────────────────────

function AuditLogTab({ allUsers }: { allUsers: any[] }) {
  const [filterUser, setFilterUser] = useState<string>("");
  const [filterAction, setFilterAction] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [filterEntryId, setFilterEntryId] = useState<string>("");
  const [offset, setOffset] = useState(0);
  const PAGE = 50;

  const params = new URLSearchParams();
  if (filterUser)     params.set("userId", filterUser);
  if (filterAction)   params.set("action", filterAction);
  if (filterDateFrom) params.set("dateFrom", filterDateFrom);
  if (filterDateTo)   params.set("dateTo", filterDateTo);
  if (filterEntryId)  params.set("entryId", filterEntryId);
  params.set("limit", String(PAGE));
  params.set("offset", String(offset));

  const { data, isLoading } = useQuery<{ data: AuditRecord[]; total: number }>({
    queryKey: ["time-audit-log", filterUser, filterAction, filterDateFrom, filterDateTo, filterEntryId, offset],
    queryFn: () => fetchJson(`/api/time/audit-log?${params.toString()}`),
  });

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  const getName = (id: number) => allUsers.find(u => u.id === id)?.name ?? `User ${id}`;

  const ACTIONS = ["Created", "Updated", "Submitted", "Recalled", "Approved", "Rejected", "Resubmitted", "Override"];

  function resetFilters() {
    setFilterUser(""); setFilterAction(""); setFilterDateFrom("");
    setFilterDateTo(""); setFilterEntryId(""); setOffset(0);
  }

  const hasFilters = filterUser || filterAction || filterDateFrom || filterDateTo || filterEntryId;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg border bg-muted/30">
        <div className="space-y-1">
          <Label className="text-xs">User</Label>
          <Select value={filterUser} onValueChange={v => { setFilterUser(v); setOffset(0); }}>
            <SelectTrigger className="h-8 w-[160px] text-sm">
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All users</SelectItem>
              {allUsers.map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Action</Label>
          <Select value={filterAction} onValueChange={v => { setFilterAction(v); setOffset(0); }}>
            <SelectTrigger className="h-8 w-[140px] text-sm">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All actions</SelectItem>
              {ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" className="h-8 w-[130px] text-sm" value={filterDateFrom}
            onChange={e => { setFilterDateFrom(e.target.value); setOffset(0); }} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" className="h-8 w-[130px] text-sm" value={filterDateTo}
            onChange={e => { setFilterDateTo(e.target.value); setOffset(0); }} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Entry ID</Label>
          <Input className="h-8 w-[90px] text-sm" placeholder="e.g. 42" value={filterEntryId}
            onChange={e => { setFilterEntryId(e.target.value.replace(/\D/, "")); setOffset(0); }} />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={resetFilters}>
            Reset
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-8 ml-auto gap-1.5 text-xs"
          disabled={rows.length === 0}
          onClick={() => downloadCSV(rows, getName)}
        >
          <Download className="h-3 w-3" /> Export CSV
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {total} record{total !== 1 ? "s" : ""} — read-only, no edits or deletions permitted.
      </p>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={FileText} title="No audit records" description="No records match the current filters." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Entry ID</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Previous</TableHead>
                <TableHead>New Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(parseISO(r.performedAt), "MMM d, HH:mm:ss")}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{r.effortEntryId}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{r.action}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{getName(r.performedById)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate font-mono">
                    {r.previousValue ? JSON.stringify(r.previousValue).slice(0, 60) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate font-mono">
                    {r.newValue ? JSON.stringify(r.newValue).slice(0, 60) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {total > PAGE && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Showing {offset + 1}–{Math.min(offset + PAGE, total)} of {total}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - PAGE))}>
                  Previous
                </Button>
                <Button size="sm" variant="outline" disabled={offset + PAGE >= total} onClick={() => setOffset(o => o + PAGE)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsTimeTracking() {
  const { currentUser } = useCurrentUser();
  const currentUserId = currentUser?.id ?? 1;

  const { data: usersData } = useListUsers();
  const { data: projectsData } = useListProjects();
  const allUsers: any[] = usersData ?? [];
  const allProjects: any[] = projectsData ?? [];

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <PageHeader
          title="Time Tracking Settings"
          breadcrumbs={[
            { label: "Admin", href: "/admin" },
            { label: "Time Tracking Settings" },
          ]}
        />

        <Tabs defaultValue="financial-periods">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="financial-periods" className="text-xs gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Financial Periods
            </TabsTrigger>
            <TabsTrigger value="contract-rules" className="text-xs gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Contract Rules
            </TabsTrigger>
            <TabsTrigger value="exceptional-effort" className="text-xs gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Exceptional Effort
            </TabsTrigger>
            <TabsTrigger value="proxy-delegations" className="text-xs gap-1.5">
              <Users className="h-3.5 w-3.5" /> Proxy Delegations
            </TabsTrigger>
            <TabsTrigger value="audit-log" className="text-xs gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Audit Log
            </TabsTrigger>
          </TabsList>

          <div className="mt-5">
            <TabsContent value="financial-periods">
              <Card><CardContent className="pt-5"><FinancialPeriodsTab allUsers={allUsers} /></CardContent></Card>
            </TabsContent>

            <TabsContent value="contract-rules">
              <Card><CardContent className="pt-5"><ContractRulesTab allProjects={allProjects} /></CardContent></Card>
            </TabsContent>

            <TabsContent value="exceptional-effort">
              <Card><CardContent className="pt-5"><ExceptionalEffortTab /></CardContent></Card>
            </TabsContent>

            <TabsContent value="proxy-delegations">
              <Card><CardContent className="pt-5"><ProxyDelegationsTab allUsers={allUsers} currentUserId={currentUserId} /></CardContent></Card>
            </TabsContent>

            <TabsContent value="audit-log">
              <Card><CardContent className="pt-5"><AuditLogTab allUsers={allUsers} /></CardContent></Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </Layout>
  );
}
