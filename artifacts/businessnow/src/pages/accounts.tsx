import { useState, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { listAccounts, createAccount, updateAccount, deleteAccount, listOpportunities, listProjects } from "@workspace/api-client-react";
import { Account } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { TooltipCell } from "@/components/ui/tooltip-cell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { Plus, Search, Building2, MoreHorizontal, Pencil, Trash2, ChevronRight, ChevronDown, ExternalLink, FolderOpen } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const TIER_COLORS: Record<string, string> = {
  Enterprise: "bg-purple-100 text-purple-700",
  "Mid-Market": "bg-blue-100 text-blue-700",
  SMB: "bg-amber-100 text-amber-700",
  Startup: "bg-teal-100 text-teal-700",
};

const STAGE_COLORS: Record<string, string> = {
  Discovery: "bg-slate-100 text-slate-700",
  Qualified: "bg-blue-100 text-blue-700",
  Proposal: "bg-purple-100 text-purple-700",
  Negotiation: "bg-amber-100 text-amber-700",
  Won: "bg-green-100 text-green-700",
  Lost: "bg-red-100 text-red-700",
};

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function Accounts() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Account | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editTarget, setEditTarget] = useState<Account | null>(null);
  const [form, setForm] = useState({ name: "", domain: "", tier: "Mid-Market", region: "North America", status: "Active", contractValue: "" });
  const [editForm, setEditForm] = useState({ name: "", domain: "", tier: "Mid-Market", region: "North America", status: "Active", contractValue: "" });

  const [expandedAccounts, setExpandedAccounts] = useState<Set<number>>(new Set());

  function toggleExpand(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    setExpandedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => listAccounts({}),
  });

  const createMut = useMutation({
    mutationFn: () => createAccount({
      name: form.name,
      domain: form.domain,
      tier: form.tier,
      region: form.region,
      status: form.status,
      contractValue: Number(form.contractValue) || 0,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounts"] }); setShowCreate(false); resetForm(); toast({ title: "Account created" }); },
    onError: (err: any) => toast({ title: "Failed to create account", description: err?.message ?? "Please try again.", variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateAccount(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
    onError: (err: any) => toast({ title: "Failed to update status", description: err?.message ?? "Please try again.", variant: "destructive" }),
  });

  const editMut = useMutation({
    mutationFn: (id: number) => updateAccount(id, {
      name: editForm.name,
      domain: editForm.domain,
      tier: editForm.tier,
      region: editForm.region,
      status: editForm.status,
      contractValue: Number(editForm.contractValue) || 0,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounts"] }); setShowEdit(false); setEditTarget(null); toast({ title: "Account updated" }); },
    onError: (err: any) => toast({ title: "Failed to save account", description: err?.message ?? "Please try again.", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteAccount(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounts"] }); setShowDelete(false); setEditTarget(null); if (selected?.id === editTarget?.id) setSelected(null); toast({ title: "Account deleted" }); },
    onError: (err: any) => toast({ title: "Failed to delete account", description: err?.message ?? "Please try again.", variant: "destructive" }),
  });

  function openEdit(account: Account) {
    setEditTarget(account);
    setEditForm({ name: account.name, domain: account.domain, tier: account.tier, region: account.region, status: account.status, contractValue: String(account.contractValue ?? "") });
    setShowEdit(true);
  }

  function openDelete(account: Account) {
    setEditTarget(account);
    setShowDelete(true);
  }

  function resetForm() {
    setForm({ name: "", domain: "", tier: "Mid-Market", region: "North America", status: "Active", contractValue: "" });
  }

  const filtered = accounts.filter(a => {
    const q = search.toLowerCase();
    return a.name.toLowerCase().includes(q) || a.domain.toLowerCase().includes(q);
  });

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader
          title="Client Accounts"
          breadcrumbs={[{ label: "Accounts" }]}
          actions={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Account
            </Button>
          }
        />

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>All Accounts</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search accounts…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <>
              {/* Mobile cards */}
              <ul className="md:hidden space-y-2" aria-label="Accounts">
                {filtered.length === 0 ? (
                  <li className="text-center text-muted-foreground py-8 text-sm">
                    {search ? "No accounts match your search." : "No accounts found."}
                  </li>
                ) : filtered.map(account => (
                  <li
                    key={account.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open ${account.name}`}
                    className="border border-border rounded-lg p-3 bg-card hover:bg-muted/30 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setSelected(account)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(account);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 font-medium text-sm">
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{account.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">{account.domain}</div>
                      </div>
                      <div onClick={e => e.stopPropagation()} className="flex-shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More options">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(account)}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => openDelete(account)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <StatusBadge status={account.status} />
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[account.tier] ?? "bg-slate-100 text-slate-600"}`}>
                        {account.tier}
                      </span>
                      <span className="text-xs text-muted-foreground">{account.region}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Contract Value</span>
                      <span className="font-medium tabular-nums">{fmt(account.contractValue)}</span>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Desktop table */}
              <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Account Name</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead className="text-right">Contract Value</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(account => {
                    const isExpanded = expandedAccounts.has(account.id);
                    return (
                      <Fragment key={account.id}>
                        <TableRow className="cursor-pointer hover:bg-slate-50" onClick={() => setSelected(account)}>
                          <TableCell onClick={e => toggleExpand(account.id, e)} className="p-2">
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-primary/10 transition-colors">
                              {isExpanded
                                ? <ChevronDown className="h-3.5 w-3.5 text-primary" />
                                : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {account.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground"><TooltipCell value={account.domain} maxWidth="max-w-[10rem]" /></TableCell>
                          <TableCell>
                            <StatusBadge status={account.status} />
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[account.tier] ?? "bg-slate-100 text-slate-600"}`}>
                              {account.tier}
                            </span>
                          </TableCell>
                          <TableCell>{account.region}</TableCell>
                          <TableCell className="text-right font-medium">{fmt(account.contractValue)}</TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>More options</TooltipContent>
                                </Tooltip>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEdit(account)}>
                                  <Pencil className="h-4 w-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => openDelete(account)}>
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                            <TableCell />
                            <TableCell colSpan={7} className="py-3 px-4">
                              <AccountProjectsExpanded accountId={account.id} accountName={account.name} />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        {search ? "No accounts match your search." : "No accounts found."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Account Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={v => { if (!v) setSelected(null); }}>
        <SheetContent className="w-[540px] overflow-y-auto">
          {selected && <AccountDetail account={selected} onStatusChange={(status) => {
            const updated = { ...selected, status };
            setSelected(updated);
            updateMut.mutate({ id: selected.id, status });
          }} />}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={v => { setShowCreate(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Account</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1">
              <Label>Account Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Domain *</Label>
              <Input placeholder="company.com" value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Contract Value ($)</Label>
              <Input type="number" value={form.contractValue} onChange={e => setForm(f => ({ ...f, contractValue: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Tier</Label>
              <Select value={form.tier} onValueChange={v => setForm(f => ({ ...f, tier: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Enterprise", "Mid-Market", "SMB", "Startup"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Region</Label>
              <Select value={form.region} onValueChange={v => setForm(f => ({ ...f, region: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["North America", "EMEA", "APAC", "LATAM"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Active", "Inactive", "Prospect", "At Risk"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate()} disabled={!form.name || !form.domain || createMut.isPending}>
              {createMut.isPending ? "Creating…" : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={showEdit} onOpenChange={v => { setShowEdit(v); if (!v) setEditTarget(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Account</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1">
              <Label>Account Name *</Label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Domain *</Label>
              <Input placeholder="company.com" value={editForm.domain} onChange={e => setEditForm(f => ({ ...f, domain: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Contract Value ($)</Label>
              <Input type="number" value={editForm.contractValue} onChange={e => setEditForm(f => ({ ...f, contractValue: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Tier</Label>
              <Select value={editForm.tier} onValueChange={v => setEditForm(f => ({ ...f, tier: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Enterprise", "Mid-Market", "SMB", "Startup"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Region</Label>
              <Select value={editForm.region} onValueChange={v => setEditForm(f => ({ ...f, region: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["North America", "EMEA", "APAC", "LATAM"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Active", "Inactive", "Prospect", "At Risk", "Churned"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={() => editTarget && editMut.mutate(editTarget.id)} disabled={!editForm.name || !editForm.domain || editMut.isPending}>
              {editMut.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={showDelete} onOpenChange={v => { setShowDelete(v); if (!v) setEditTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{editTarget?.name}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => editTarget && deleteMut.mutate(editTarget.id)} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function AccountProjectsExpanded({ accountId, accountName }: { accountId: number; accountName: string }) {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", { accountId }],
    queryFn: () => listProjects({ accountId }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        Loading projects…
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
        <FolderOpen className="h-4 w-4" />
        No projects linked to {accountName} yet.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-200 overflow-hidden">
      <div className="bg-white">
        <div className="grid grid-cols-[1fr_100px_110px_100px_80px_100px] text-xs font-medium text-muted-foreground border-b border-slate-100 px-3 py-2 gap-3">
          <span>Project Name</span>
          <span>Status</span>
          <span>Billing Type</span>
          <span className="text-right">Budget</span>
          <span className="text-right">Done</span>
          <span />
        </div>
        {projects.map((p: any, i: number) => (
          <div
            key={p.id}
            className={`grid grid-cols-[1fr_100px_110px_100px_80px_100px] items-center text-xs px-3 py-2.5 gap-3 ${i < projects.length - 1 ? "border-b border-slate-50" : ""} hover:bg-slate-50/50 transition-colors`}
          >
            <span className="font-medium truncate">{p.name}</span>
            <span>
              <StatusBadge status={p.status} />
            </span>
            <span className="text-muted-foreground">{p.billingType}</span>
            <span className="text-right tabular-nums font-medium">{fmt(p.budget)}</span>
            <span className="text-right tabular-nums">
              <span className={`font-medium ${p.completion >= 80 ? "text-green-600" : p.completion >= 40 ? "text-amber-600" : "text-slate-600"}`}>
                {p.completion}%
              </span>
            </span>
            <span className="flex justify-end">
              <Link href={`/projects/${p.id}`}>
                <Button size="sm" variant="outline" className="h-6 text-xs gap-1 px-2">
                  <ExternalLink className="h-3 w-3" /> Details
                </Button>
              </Link>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountDetail({ account, onStatusChange }: { account: Account; onStatusChange: (s: string) => void }) {
  const { data: opportunities = [] } = useQuery({
    queryKey: ["opportunities", { accountId: account.id }],
    queryFn: () => listOpportunities({ accountId: account.id }),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", { accountId: account.id }],
    queryFn: () => listProjects({ accountId: account.id }),
  });

  const totalOppValue = opportunities.reduce((s, o) => s + o.value, 0);
  const wonValue = opportunities.filter(o => o.stage === "Won").reduce((s, o) => s + o.value, 0);

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          {account.name}
        </SheetTitle>
      </SheetHeader>

      <div className="mt-6 space-y-4">
        <div className="flex items-center gap-2">
          <StatusBadge status={account.status} />
          <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${TIER_COLORS[account.tier] ?? ""}`}>{account.tier}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><p className="text-xs text-muted-foreground">Domain</p><p className="text-sm font-medium">{account.domain}</p></div>
          <div><p className="text-xs text-muted-foreground">Region</p><p className="text-sm font-medium">{account.region}</p></div>
          <div><p className="text-xs text-muted-foreground">Contract Value</p><p className="text-sm font-medium">{fmt(account.contractValue)}</p></div>
          <div><p className="text-xs text-muted-foreground">Since</p><p className="text-sm font-medium">{new Date(account.createdAt).toLocaleDateString()}</p></div>
        </div>

        <div className="pt-2 border-t space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account Status</Label>
          <Select value={account.status} onValueChange={onStatusChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Active", "Inactive", "Prospect", "At Risk", "Churned"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="opportunities" className="pt-2">
          <TabsList className="w-full">
            <TabsTrigger value="opportunities" className="flex-1">
              Opportunities ({opportunities.length})
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex-1">
              Projects ({projects.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="opportunities" className="mt-3">
            {opportunities.length > 0 && (
              <div className="flex gap-4 mb-3 text-sm">
                <div><span className="text-muted-foreground">Pipeline: </span><span className="font-medium">{fmt(totalOppValue)}</span></div>
                <div><span className="text-muted-foreground">Won: </span><span className="font-medium text-green-600">{fmt(wonValue)}</span></div>
              </div>
            )}
            <div className="space-y-2">
              {opportunities.map(o => (
                <Link key={o.id} href="/opportunities">
                  <div className="border rounded-md p-3 bg-card hover:bg-muted/30 cursor-pointer transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-primary hover:underline">{o.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{o.probability}% probability</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[o.stage] ?? ""}`}>{o.stage}</span>
                        <p className="text-xs font-semibold mt-1">{fmt(o.value)}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              {opportunities.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No opportunities yet</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="projects" className="mt-3">
            <div className="space-y-2">
              {projects.map((p: any) => (
                <div key={p.id} className="border rounded-md p-3 bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.billingType} · {p.completion}% complete</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.status === "Completed" ? "bg-green-100 text-green-700" :
                          p.status === "In Progress" ? "bg-blue-100 text-blue-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>{p.status}</span>
                        <p className="text-xs font-semibold mt-1">{fmt(p.budget)}</p>
                      </div>
                      <Link href={`/projects/${p.id}`}>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0">
                          <ExternalLink className="h-3 w-3" /> View
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
              {projects.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No projects yet</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
