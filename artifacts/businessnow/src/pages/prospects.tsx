import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listProspects,
  createProspect,
  updateProspect,
  deleteProspect,
  convertProspect,
  useListAccounts,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
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
import { MoreHorizontal, Plus, Search, UserCheck, ExternalLink } from "lucide-react";
import { Prospect } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  New: "bg-slate-100 text-slate-700",
  Qualified: "bg-blue-100 text-blue-700",
  Proposal: "bg-purple-100 text-purple-700",
  Negotiation: "bg-amber-100 text-amber-700",
  Lost: "bg-red-100 text-red-700",
  Converted: "bg-green-100 text-green-700",
};

const STATUSES = ["New", "Qualified", "Proposal", "Negotiation", "Lost", "Converted"];
const SOURCES = ["Inbound", "Outbound", "Referral", "Partner", "Trade Show", "Website", "Cold Outreach", "Other"];

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function ProspectsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState<Prospect | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [form, setForm] = useState({ name: "", contactName: "", contactEmail: "", contactPhone: "", status: "New", source: "", estimatedValue: "", notes: "" });
  const [editForm, setEditForm] = useState({ name: "", contactName: "", contactEmail: "", contactPhone: "", status: "New", source: "", estimatedValue: "", notes: "" });
  const [convertForm, setConvertForm] = useState({ tier: "Mid-Market", region: "North America", domain: "", contractValue: "" });

  const { data: prospects = [] } = useQuery({
    queryKey: ["prospects", filterStatus],
    queryFn: () => listProspects({ status: filterStatus === "all" ? undefined : filterStatus }),
  });
  const { data: accounts = [] } = useListAccounts();

  const createMut = useMutation({
    mutationFn: () => createProspect({
      ...form,
      estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["prospects"] }); setShowCreate(false); resetForm(); },
  });

  const updateMut = useMutation({
    mutationFn: (p: Prospect) => updateProspect(p.id, { status: p.status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prospects"] }),
  });

  const editMut = useMutation({
    mutationFn: (id: number) => updateProspect(id, {
      name: editForm.name,
      contactName: editForm.contactName || undefined,
      contactEmail: editForm.contactEmail || undefined,
      contactPhone: editForm.contactPhone || undefined,
      status: editForm.status,
      source: editForm.source || undefined,
      estimatedValue: editForm.estimatedValue ? Number(editForm.estimatedValue) : undefined,
      notes: editForm.notes || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["prospects"] }); setShowEdit(false); if (selected) setSelected(s => s ? { ...s, ...editForm, estimatedValue: editForm.estimatedValue ? Number(editForm.estimatedValue) : null } : s); },
  });

  function openEditProspect(p: Prospect) {
    setSelected(p);
    setEditForm({ name: p.name, contactName: p.contactName ?? "", contactEmail: p.contactEmail ?? "", contactPhone: p.contactPhone ?? "", status: p.status, source: p.source ?? "", estimatedValue: String(p.estimatedValue ?? ""), notes: p.notes ?? "" });
    setShowEdit(true);
  }

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteProspect(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["prospects"] }); setSelected(null); },
  });

  const convertMut = useMutation({
    mutationFn: () => convertProspect(selected!.id, {
      tier: convertForm.tier,
      region: convertForm.region,
      domain: convertForm.domain,
      contractValue: convertForm.contractValue ? Number(convertForm.contractValue) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospects"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      setShowConvert(false);
      setSelected(null);
    },
  });

  function resetForm() {
    setForm({ name: "", contactName: "", contactEmail: "", contactPhone: "", status: "New", source: "", estimatedValue: "", notes: "" });
  }

  const filtered = prospects.filter(p => {
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.contactName ?? "").toLowerCase().includes(q) || (p.contactEmail ?? "").toLowerCase().includes(q);
  });

  const totalValue = filtered.reduce((s, p) => s + (p.estimatedValue ?? 0), 0);

  return (
    <Layout>
    <div className="space-y-4">
      <PageHeader
        title="Prospects"
        description={`${filtered.length} prospects · ${fmt(totalValue)} pipeline value`}
        breadcrumbs={[{ label: "Prospects" }]}
        actions={
          <Button onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Prospect
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search prospects…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No prospects found</div>
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="md:hidden space-y-2" aria-label="Prospects">
            {filtered.map(p => (
              <li
                key={p.id}
                role="button"
                tabIndex={0}
                aria-label={`Open ${p.name}`}
                className="border border-border rounded-lg p-3 bg-card hover:bg-muted/30 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setSelected(p)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(p);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {p.contactName ?? "—"}
                      {p.contactEmail ? <span className="ml-1 text-muted-foreground/70">· {p.contactEmail}</span> : null}
                    </div>
                  </div>
                  <div onClick={e => e.stopPropagation()} className="flex-shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More options">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelected(p)}>View Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditProspect(p)}>Edit</DropdownMenuItem>
                        {p.status !== "Converted" && (
                          <DropdownMenuItem onClick={() => { setSelected(p); setShowConvert(true); }}>
                            Convert to Customer
                          </DropdownMenuItem>
                        )}
                        {p.status === "Converted" && p.convertedAccountId && (
                          <DropdownMenuItem asChild>
                            <Link href="/accounts" className="flex items-center gap-1.5">
                              <ExternalLink className="h-3.5 w-3.5" /> View Account
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-red-600" onClick={() => deleteMut.mutate(p.id)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] ?? ""}`}>{p.status}</span>
                    <span className="text-xs text-muted-foreground">{p.source ?? "—"}</span>
                  </div>
                  <span className="text-sm font-medium tabular-nums">{fmt(p.estimatedValue)}</span>
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="hidden md:block flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Est. Value</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(p)}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">{p.contactName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{p.contactEmail ?? ""}</div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] ?? ""}`}>{p.status}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.source ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(p.estimatedValue)}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelected(p)}>View Details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditProspect(p)}>Edit</DropdownMenuItem>
                          {p.status !== "Converted" && (
                            <DropdownMenuItem onClick={() => { setSelected(p); setShowConvert(true); }}>
                              Convert to Customer
                            </DropdownMenuItem>
                          )}
                          {p.status === "Converted" && p.convertedAccountId && (
                            <DropdownMenuItem asChild>
                              <Link href="/accounts" className="flex items-center gap-1.5">
                                <ExternalLink className="h-3.5 w-3.5" /> View Account
                              </Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-red-600" onClick={() => deleteMut.mutate(p.id)}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selected && !showConvert} onOpenChange={v => { if (!v) setSelected(null); }}>
        <SheetContent className="w-[460px] overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[selected.status] ?? ""}`}>{selected.status}</span>
                  {selected.status !== "Converted" && (
                    <Button size="sm" variant="outline" className="gap-1.5 ml-auto" onClick={() => setShowConvert(true)}>
                      <UserCheck className="h-3.5 w-3.5" /> Convert to Customer
                    </Button>
                  )}
                </div>

                {selected.status === "Converted" && selected.convertedAccountId && (() => {
                  const acct = accounts.find(a => a.id === selected.convertedAccountId);
                  return (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                      <div>
                        <p className="text-xs text-green-700 font-medium uppercase tracking-wide">Converted Account</p>
                        <p className="text-sm font-semibold text-green-900 mt-0.5">{acct?.name ?? `Account #${selected.convertedAccountId}`}</p>
                      </div>
                      <Link href="/accounts">
                        <Button size="sm" variant="outline" className="gap-1.5 border-green-300 text-green-700 hover:bg-green-100">
                          <ExternalLink className="h-3.5 w-3.5" /> View Account
                        </Button>
                      </Link>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div><p className="text-xs text-slate-500">Contact</p><p className="text-sm font-medium">{selected.contactName ?? "—"}</p></div>
                  <div><p className="text-xs text-slate-500">Email</p><p className="text-sm font-medium break-all">{selected.contactEmail ?? "—"}</p></div>
                  <div><p className="text-xs text-slate-500">Phone</p><p className="text-sm font-medium">{selected.contactPhone ?? "—"}</p></div>
                  <div><p className="text-xs text-slate-500">Source</p><p className="text-sm font-medium">{selected.source ?? "—"}</p></div>
                  <div><p className="text-xs text-slate-500">Est. Value</p><p className="text-sm font-medium">{fmt(selected.estimatedValue)}</p></div>
                  <div><p className="text-xs text-slate-500">Created</p><p className="text-sm font-medium">{new Date(selected.createdAt).toLocaleDateString()}</p></div>
                </div>

                {selected.notes && (
                  <div className="pt-2">
                    <p className="text-xs text-slate-500 mb-1">Notes</p>
                    <p className="text-sm text-slate-700 bg-slate-50 rounded-md p-3">{selected.notes}</p>
                  </div>
                )}

                <div className="pt-4 border-t space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Update Status</Label>
                  <Select
                    value={selected.status}
                    onValueChange={val => {
                      const updated = { ...selected, status: val };
                      setSelected(updated);
                      updateMut.mutate(updated);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMut.mutate(selected.id)}
                  >
                    Delete Prospect
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={v => { setShowCreate(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Prospect</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1">
              <Label>Company Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Contact Name</Label>
              <Input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Contact Email</Label>
              <Input type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.slice(0, 4).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Source</Label>
              <Select value={form.source || "__none"} onValueChange={v => setForm(f => ({ ...f, source: v === "__none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— None —</SelectItem>
                  {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Est. Value ($)</Label>
              <Input type="number" value={form.estimatedValue} onChange={e => setForm(f => ({ ...f, estimatedValue: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate()} disabled={!form.name || createMut.isPending}>
              {createMut.isPending ? "Creating…" : "Create Prospect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert Dialog */}
      <Dialog open={showConvert} onOpenChange={v => { setShowConvert(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Convert to Customer Account</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-slate-600">Converting <strong>{selected.name}</strong> will create a new Customer account.</p>
              <div className="space-y-1">
                <Label>Domain *</Label>
                <Input placeholder="company.com" value={convertForm.domain} onChange={e => setConvertForm(f => ({ ...f, domain: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Account Tier</Label>
                  <Select value={convertForm.tier} onValueChange={v => setConvertForm(f => ({ ...f, tier: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Enterprise", "Mid-Market", "SMB", "Startup"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Region</Label>
                  <Select value={convertForm.region} onValueChange={v => setConvertForm(f => ({ ...f, region: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["North America", "EMEA", "APAC", "LATAM"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Contract Value ($)</Label>
                <Input type="number" value={convertForm.contractValue} placeholder={String(selected.estimatedValue ?? 0)} onChange={e => setConvertForm(f => ({ ...f, contractValue: e.target.value }))} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvert(false)}>Cancel</Button>
            <Button onClick={() => convertMut.mutate()} disabled={!convertForm.domain || convertMut.isPending}>
              {convertMut.isPending ? "Converting…" : "Convert to Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Prospect Dialog */}
      <Dialog open={showEdit} onOpenChange={v => setShowEdit(v)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Prospect</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1">
              <Label>Name *</Label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Contact Name</Label>
              <Input value={editForm.contactName} onChange={e => setEditForm(f => ({ ...f, contactName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Contact Email</Label>
              <Input type="email" value={editForm.contactEmail} onChange={e => setEditForm(f => ({ ...f, contactEmail: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Contact Phone</Label>
              <Input value={editForm.contactPhone} onChange={e => setEditForm(f => ({ ...f, contactPhone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Source</Label>
              <Select value={editForm.source || "__none"} onValueChange={v => setEditForm(f => ({ ...f, source: v === "__none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— None —</SelectItem>
                  {["Website", "Referral", "Cold Outreach", "LinkedIn", "Event", "Partner"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["New", "Contacted", "Qualified", "Unqualified"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Est. Value ($)</Label>
              <Input type="number" value={editForm.estimatedValue} onChange={e => setEditForm(f => ({ ...f, estimatedValue: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Notes</Label>
              <Textarea rows={3} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
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
