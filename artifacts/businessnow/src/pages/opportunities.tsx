import { authHeaders } from "@/lib/auth-headers";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  listAccounts,
} from "@workspace/api-client-react";
import { Opportunity } from "@workspace/api-client-react";
import { CreateProjectWizard, type CreateProjectPrefill } from "@/components/create-project-wizard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Kanban, ListIcon, FolderPlus, FolderOpen, ArrowUpRight, Search } from "lucide-react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/ui/status-badge";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const STAGES = ["Discovery", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];

const STAGE_PROBABILITY: Record<string, number> = {
  Discovery: 10,
  Qualified: 30,
  Proposal: 50,
  Negotiation: 75,
  Won: 100,
  Lost: 0,
};


const STAGE_BG: Record<string, string> = {
  Discovery: "bg-slate-50 border-slate-200",
  Qualified: "bg-blue-50 border-blue-200",
  Proposal: "bg-purple-50 border-purple-200",
  Negotiation: "bg-amber-50 border-amber-200",
  Won: "bg-green-50 border-green-200",
  Lost: "bg-red-50 border-red-200",
};

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function OpportunitiesPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<"list" | "kanban">("kanban");
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardPrefill, setWizardPrefill] = useState<CreateProjectPrefill | undefined>(undefined);
  const [form, setForm] = useState({ accountId: "", name: "", stage: "Discovery", probability: String(STAGE_PROBABILITY["Discovery"]), value: "", description: "", closeDate: "", customerEmail: "", customerPhone: "" });
  const [editForm, setEditForm] = useState({ name: "", stage: "Discovery", probability: "", value: "", description: "", closeDate: "" });

  const { data: opportunities = [] } = useQuery({
    queryKey: ["opportunities"],
    queryFn: () => listOpportunities({}),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => listAccounts({}),
  });

  const createMut = useMutation({
    mutationFn: () => createOpportunity({
      accountId: Number(form.accountId),
      name: form.name,
      stage: form.stage,
      probability: Number(form.probability) || STAGE_PROBABILITY[form.stage] || 0,
      value: Number(form.value) || 0,
      description: form.description || undefined,
      closeDate: form.closeDate || undefined,
      customerEmail: form.customerEmail || undefined,
      customerPhone: form.customerPhone || undefined,
    } as any),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["opportunities"] }); setShowCreate(false); resetForm(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, stage, probability }: { id: number; stage: string; probability?: number }) =>
      updateOpportunity(id, { stage, ...(probability !== undefined ? { probability } : {}) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opportunities"] }),
  });

  const editMut = useMutation({
    mutationFn: (id: number) => updateOpportunity(id, {
      name: editForm.name,
      stage: editForm.stage,
      probability: Number(editForm.probability),
      value: Number(editForm.value),
      description: editForm.description || undefined,
      closeDate: editForm.closeDate || undefined,
      closeReason: (editForm as any).closeReason || undefined,
    } as any),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["opportunities"] }); setShowEdit(false); },
  });

  function openEditOpp(o: Opportunity) {
    setSelected(o);
    setEditForm({ name: o.name, stage: o.stage, probability: String(o.probability), value: String(o.value), description: o.description ?? "", closeDate: o.closeDate ? o.closeDate.substring(0, 10) : "", closeReason: (o as any).closeReason ?? "" } as any);
    setShowEdit(true);
  }

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteOpportunity(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["opportunities"] }); setSelected(null); },
  });

  function openCreateProject(o: Opportunity) {
    setSelected(o);
    setWizardPrefill({
      name: o.name,
      accountId: o.accountId ?? undefined,
      budget: o.value ?? undefined,
      description: o.description ?? undefined,
      opportunityId: o.id,
    });
    setShowWizard(true);
  }

  function resetForm() {
    setForm({ accountId: "", name: "", stage: "Discovery", probability: String(STAGE_PROBABILITY["Discovery"]), value: "", description: "", closeDate: "", customerEmail: "", customerPhone: "" });
  }

  const totalPipeline = opportunities.filter(o => o.stage !== "Won" && o.stage !== "Lost").reduce((s, o) => s + o.value, 0);
  const totalWon = opportunities.filter(o => o.stage === "Won").reduce((s, o) => s + o.value, 0);
  const wonDeals = opportunities.filter(o => o.stage === "Won");
  const lostDeals = opportunities.filter(o => o.stage === "Lost");
  const closedDeals = wonDeals.length + lostDeals.length;
  const winRate = closedDeals > 0 ? Math.round((wonDeals.length / closedDeals) * 100) : null;
  const avgWonValue = wonDeals.length > 0 ? wonDeals.reduce((s, o) => s + o.value, 0) / wonDeals.length : null;

  return (
    <Layout>
    <div className="space-y-4">
      <PageHeader
        title="Opportunities"
        description={`${opportunities.length} deals · ${fmt(totalPipeline)} in pipeline · ${fmt(totalWon)} won`}
        breadcrumbs={[{ label: "Opportunities" }]}
        actions={
          <>
            <div className="flex border rounded-md overflow-hidden" role="radiogroup" aria-label="View mode">
              <button
                role="radio"
                aria-checked={view === "list"}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${view === "list" ? "bg-slate-900 text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}
                onClick={() => setView("list")}
              >
                <ListIcon className="h-3.5 w-3.5" /> List
              </button>
              <button
                role="radio"
                aria-checked={view === "kanban"}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${view === "kanban" ? "bg-slate-900 text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}
                onClick={() => setView("kanban")}
              >
                <Kanban className="h-3.5 w-3.5" /> Kanban
              </button>
            </div>
            <Button onClick={() => setShowCreate(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Opportunity
            </Button>
          </>
        }
      />

      {/* CRM-03: Win/Loss stats bar */}
      {closedDeals > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="border rounded-lg px-4 py-3">
            <p className="text-xs text-muted-foreground">Win Rate</p>
            <p className="text-2xl font-bold text-green-600">{winRate}%</p>
            <p className="text-xs text-muted-foreground">{wonDeals.length} won · {lostDeals.length} lost</p>
          </div>
          <div className="border rounded-lg px-4 py-3">
            <p className="text-xs text-muted-foreground">Deals Won</p>
            <p className="text-2xl font-bold">{wonDeals.length}</p>
            <p className="text-xs text-muted-foreground">{fmt(totalWon)} total value</p>
          </div>
          <div className="border rounded-lg px-4 py-3">
            <p className="text-xs text-muted-foreground">Avg Won Deal</p>
            <p className="text-2xl font-bold">{avgWonValue != null ? fmt(avgWonValue) : "—"}</p>
            <p className="text-xs text-muted-foreground">per closed-won deal</p>
          </div>
          <div className="border rounded-lg px-4 py-3">
            <p className="text-xs text-muted-foreground">Deals Lost</p>
            <p className="text-2xl font-bold text-red-500">{lostDeals.length}</p>
            <p className="text-xs text-muted-foreground">{fmt(lostDeals.reduce((s, o) => s + o.value, 0))} total value</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {view === "kanban" ? (
          <KanbanBoard opportunities={opportunities} onSelect={setSelected} onStageChange={(id, stage) => updateMut.mutate({ id, stage })} />
        ) : (
          <OpportunityTable opportunities={opportunities} onSelect={setSelected} onDelete={id => deleteMut.mutate(id)} onConvert={o => openCreateProject(o)} />
        )}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selected && !showWizard} onOpenChange={v => { if (!v) setSelected(null); }}>
        <SheetContent className="w-full sm:w-[460px] overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <StatusBadge status={selected.stage} />
                  <span className="text-slate-500 text-sm">{selected.probability}% probability</span>
                  <div className="ml-auto flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditOpp(selected)}>
                      Edit
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div><p className="text-xs text-slate-500">Account</p><p className="text-sm font-medium">{selected.accountName ?? "—"}</p></div>
                  <div><p className="text-xs text-slate-500">Value</p><p className="text-sm font-medium">{fmt(selected.value)}</p></div>
                  <div><p className="text-xs text-slate-500">Owner</p><p className="text-sm font-medium">{selected.ownerName ?? "—"}</p></div>
                  <div><p className="text-xs text-slate-500">Close Date</p><p className="text-sm font-medium">{selected.closeDate ? new Date(selected.closeDate).toLocaleDateString() : "—"}</p></div>
                  {selected.projectId && (
                    <div className="col-span-2">
                      <p className="text-xs text-slate-500 mb-1">Linked Project</p>
                      <Link href={`/projects/${selected.projectId}`}>
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-md border border-green-200 bg-green-50 hover:bg-green-100 transition-colors cursor-pointer">
                          <FolderOpen className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span className="text-sm font-medium text-green-800 truncate flex-1">
                            {(selected as any).projectName ?? `Project #${selected.projectId}`}
                          </span>
                          <ArrowUpRight className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        </div>
                      </Link>
                    </div>
                  )}
                </div>

                {selected.description && (
                  <div className="pt-2">
                    <p className="text-xs text-slate-500 mb-1">Description</p>
                    <p className="text-sm text-slate-700 bg-slate-50 rounded-md p-3">{selected.description}</p>
                  </div>
                )}

                <div className="pt-4 border-t space-y-3">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Update Stage</Label>
                  <Select
                    value={selected.stage}
                    onValueChange={val => {
                      const autoProbability = STAGE_PROBABILITY[val];
                      const updated = { ...selected, stage: val, probability: autoProbability };
                      setSelected(updated);
                      updateMut.mutate({ id: selected.id, stage: val, probability: autoProbability });
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="destructive" size="sm" onClick={() => deleteMut.mutate(selected.id)}>Delete Opportunity</Button>
                  {selected.stage === "Won" && !selected.projectId && (
                    <Button
                      className="gap-1.5 bg-green-600 hover:bg-green-700 text-white border-transparent"
                      size="sm"
                      onClick={() => openCreateProject(selected)}
                    >
                      <FolderPlus className="h-3.5 w-3.5" /> Create Project
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={v => { setShowCreate(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Opportunity</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <div className="col-span-full space-y-1">
              <Label>Opportunity Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="col-span-full space-y-1">
              <Label>Account *</Label>
              <Select value={form.accountId || "__none"} onValueChange={v => setForm(f => ({ ...f, accountId: v === "__none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— Select account —</SelectItem>
                  {accounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Stage</Label>
              <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v, probability: String(STAGE_PROBABILITY[v] ?? f.probability) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STAGES.slice(0, 4).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Win Probability (%)</Label>
              <Input type="number" min="0" max="100" value={form.probability} onChange={e => setForm(f => ({ ...f, probability: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Value ($)</Label>
              <Input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Close Date</Label>
              <Input type="date" value={form.closeDate} onChange={e => setForm(f => ({ ...f, closeDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Customer Email *</Label>
              <Input type="email" value={form.customerEmail} onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))} placeholder="contact@company.com" />
            </div>
            <div className="space-y-1">
              <Label>Customer Phone</Label>
              <Input type="tel" value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))} placeholder="+1 (555) 000-0000" />
            </div>
            <div className="col-span-full space-y-1">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate()} disabled={!form.name || !form.accountId || !form.customerEmail || createMut.isPending}>
              {createMut.isPending ? "Creating…" : "Create Opportunity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateProjectWizard
        open={showWizard}
        onOpenChange={v => {
          setShowWizard(v);
          if (!v) {
            qc.invalidateQueries({ queryKey: ["opportunities"] });
          }
        }}
        prefill={wizardPrefill}
      />
      {/* Edit Opportunity Dialog */}
      <Dialog open={showEdit} onOpenChange={v => setShowEdit(v)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Opportunity</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <div className="col-span-full space-y-1">
              <Label>Opportunity Name *</Label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Stage</Label>
              <Select value={editForm.stage} onValueChange={v => setEditForm(f => ({ ...f, stage: v, probability: String(STAGE_PROBABILITY[v] ?? f.probability) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Win Probability (%)</Label>
              <Input type="number" min="0" max="100" value={editForm.probability} onChange={e => setEditForm(f => ({ ...f, probability: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Value ($)</Label>
              <Input type="number" value={editForm.value} onChange={e => setEditForm(f => ({ ...f, value: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Close Date</Label>
              <Input type="date" value={editForm.closeDate} onChange={e => setEditForm(f => ({ ...f, closeDate: e.target.value }))} />
            </div>
            <div className="col-span-full space-y-1">
              <Label>Description</Label>
              <Textarea rows={2} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            {(editForm.stage === "Won" || editForm.stage === "Lost") && (
              <div className="col-span-full space-y-1">
                <Label>Close Reason {editForm.stage === "Lost" ? "*" : "(optional)"}</Label>
                <Textarea rows={2} placeholder={editForm.stage === "Lost" ? "e.g. Budget constraints, went with competitor…" : "e.g. Negotiated timeline, signed SOW…"} value={(editForm as any).closeReason ?? ""} onChange={e => setEditForm(f => ({ ...f, closeReason: e.target.value } as any))} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={() => selected && editMut.mutate(selected.id)} disabled={!editForm.name || editMut.isPending}>
              {editMut.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </Layout>
  );
}

function KanbanBoard({
  opportunities,
  onSelect,
  onStageChange,
}: {
  opportunities: Opportunity[];
  onSelect: (o: Opportunity) => void;
  onStageChange: (id: number, stage: string) => void;
}) {
  const [dragging, setDragging] = useState<number | null>(null);

  const byStage = STAGES.reduce((acc, s) => {
    acc[s] = opportunities.filter(o => o.stage === s);
    return acc;
  }, {} as Record<string, Opportunity[]>);

  return (
    <div className="flex gap-3 h-full min-w-max">
      {STAGES.map(stage => (
        <div
          key={stage}
          className={`flex flex-col w-52 rounded-lg border ${STAGE_BG[stage]} p-2`}
          onDragOver={e => e.preventDefault()}
          onDrop={() => {
            if (dragging !== null) onStageChange(dragging, stage);
            setDragging(null);
          }}
        >
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{stage}</span>
            <span className="text-xs text-slate-500 bg-white/70 rounded px-1.5 py-0.5">{byStage[stage]?.length ?? 0}</span>
          </div>
          <div className="flex flex-col gap-2 flex-1 overflow-y-auto min-h-[200px]">
            {(byStage[stage] ?? []).map(opp => (
              <div
                key={opp.id}
                draggable
                onDragStart={() => setDragging(opp.id)}
                onClick={() => onSelect(opp)}
                className="bg-white rounded-md border border-slate-200 p-3 cursor-pointer hover:shadow-sm transition-shadow"
              >
                <p className="text-sm font-medium text-slate-800 leading-snug">{opp.name}</p>
                <p className="text-xs text-slate-500 mt-1">{opp.accountName ?? "—"}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-semibold text-slate-700">{fmt(opp.value)}</span>
                  <span className="text-xs text-slate-400">{opp.probability}%</span>
                </div>
                {opp.closeDate && (
                  <p className="text-xs text-slate-400 mt-1">Close: {new Date(opp.closeDate).toLocaleDateString()}</p>
                )}
              </div>
            ))}
          </div>
          <div className="pt-2 text-xs text-slate-500 font-medium px-1">
            {fmt(byStage[stage]?.reduce((s, o) => s + o.value, 0) ?? 0)}
          </div>
        </div>
      ))}
    </div>
  );
}

function OpportunityTable({
  opportunities,
  onSelect,
  onDelete,
  onConvert,
}: {
  opportunities: Opportunity[];
  onSelect: (o: Opportunity) => void;
  onDelete: (id: number) => void;
  onConvert: (o: Opportunity) => void;
}) {
  if (opportunities.length === 0) {
    return <EmptyState icon={Search} title="No opportunities found" description="Try adjusting your filters or add a new opportunity." />;
  }

  return (
    <>
      {/* Mobile cards */}
      <ul className="md:hidden space-y-2" aria-label="Opportunities">
        {opportunities.map(o => (
          <li
            key={o.id}
            role="button"
            tabIndex={0}
            aria-label={`Open ${o.name}`}
            className="border border-border rounded-lg p-3 bg-card hover:bg-muted/30 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onSelect(o)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(o);
              }
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{o.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">{o.accountName ?? "—"}</div>
              </div>
              <div onClick={e => e.stopPropagation()} className="flex-shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More options">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onSelect(o)}>View Details</DropdownMenuItem>
                    {o.stage === "Won" && !o.projectId && (
                      <DropdownMenuItem onClick={() => onConvert(o)}>Create Project</DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-red-600" onClick={() => onDelete(o.id)}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <StatusBadge status={o.stage} />
              <div className="text-right">
                <div className="text-sm font-medium tabular-nums">{fmt(o.value)}</div>
                <div className="text-xs text-muted-foreground">
                  {o.closeDate ? new Date(o.closeDate).toLocaleDateString() : "—"}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Opportunity</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>Close Date</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {opportunities.map(o => (
              <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(o)}>
                <TableCell className="font-medium">{o.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{o.accountName ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={o.stage} />
                </TableCell>
                <TableCell className="text-right font-medium">{fmt(o.value)}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {o.closeDate ? new Date(o.closeDate).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onSelect(o)}>View Details</DropdownMenuItem>
                      {o.stage === "Won" && !o.projectId && (
                        <DropdownMenuItem onClick={() => onConvert(o)}>Create Project</DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-red-600" onClick={() => onDelete(o.id)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
