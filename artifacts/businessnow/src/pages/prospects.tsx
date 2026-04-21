import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listProspects,
  createProspect,
  updateProspect,
  deleteProspect,
  convertProspect,
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
import { MoreHorizontal, Plus, Search, UserCheck } from "lucide-react";
import { Prospect } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";

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
  const [showConvert, setShowConvert] = useState(false);
  const [form, setForm] = useState({ name: "", contactName: "", contactEmail: "", contactPhone: "", status: "New", source: "", estimatedValue: "", notes: "" });
  const [convertForm, setConvertForm] = useState({ tier: "Mid-Market", region: "North America", domain: "", contractValue: "" });

  const { data: prospects = [] } = useQuery({
    queryKey: ["prospects", filterStatus],
    queryFn: () => listProspects({ status: filterStatus === "all" ? undefined : filterStatus }),
  });

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
    <div className="flex flex-col h-full">
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Prospects</h1>
            <p className="text-sm text-slate-500 mt-0.5">{filtered.length} prospects · {fmt(totalValue)} pipeline value</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Prospect
          </Button>
        </div>

        <div className="flex gap-3 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
      </div>

      <div className="flex-1 overflow-auto">
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
              <TableRow key={p.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelected(p)}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>
                  <div className="text-sm">{p.contactName ?? "—"}</div>
                  <div className="text-xs text-slate-400">{p.contactEmail ?? ""}</div>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] ?? ""}`}>{p.status}</span>
                </TableCell>
                <TableCell className="text-slate-500 text-sm">{p.source ?? "—"}</TableCell>
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
                      {p.status !== "Converted" && (
                        <DropdownMenuItem onClick={() => { setSelected(p); setShowConvert(true); }}>
                          Convert to Customer
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-red-600" onClick={() => deleteMut.mutate(p.id)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-400">No prospects found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Update Status</Label>
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
    </div>
    </Layout>
  );
}
