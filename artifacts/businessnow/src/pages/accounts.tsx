import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAccounts, createAccount, updateAccount, listOpportunities, listProjects } from "@workspace/api-client-react";
import { Account } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
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
import { Plus, Search, Building2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Inactive: "bg-slate-100 text-slate-600",
  Prospect: "bg-blue-100 text-blue-700",
  "At Risk": "bg-red-100 text-red-700",
  Churned: "bg-red-200 text-red-800",
};

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
  const [form, setForm] = useState({ name: "", domain: "", tier: "Mid-Market", region: "North America", status: "Active", contractValue: "" });

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounts"] }); setShowCreate(false); resetForm(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateAccount(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });

  function resetForm() {
    setForm({ name: "", domain: "", tier: "Mid-Market", region: "North America", status: "Active", contractValue: "" });
  }

  const filtered = accounts.filter(a => {
    const q = search.toLowerCase();
    return a.name.toLowerCase().includes(q) || a.domain.toLowerCase().includes(q);
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Client Accounts</h1>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Account
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>All Accounts</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input className="pl-9" placeholder="Search accounts…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead className="text-right">Contract Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(account => (
                    <TableRow key={account.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelected(account)}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          {account.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{account.domain}</TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[account.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {account.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[account.tier] ?? "bg-slate-100 text-slate-600"}`}>
                          {account.tier}
                        </span>
                      </TableCell>
                      <TableCell>{account.region}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(account.contractValue)}</TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        {search ? "No accounts match your search." : "No accounts found."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
    </Layout>
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
          <Building2 className="h-5 w-5 text-slate-400" />
          {account.name}
        </SheetTitle>
      </SheetHeader>

      <div className="mt-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[account.status] ?? ""}`}>{account.status}</span>
          <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${TIER_COLORS[account.tier] ?? ""}`}>{account.tier}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><p className="text-xs text-slate-500">Domain</p><p className="text-sm font-medium">{account.domain}</p></div>
          <div><p className="text-xs text-slate-500">Region</p><p className="text-sm font-medium">{account.region}</p></div>
          <div><p className="text-xs text-slate-500">Contract Value</p><p className="text-sm font-medium">{fmt(account.contractValue)}</p></div>
          <div><p className="text-xs text-slate-500">Since</p><p className="text-sm font-medium">{new Date(account.createdAt).toLocaleDateString()}</p></div>
        </div>

        <div className="pt-2 border-t space-y-2">
          <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Account Status</Label>
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
                <div><span className="text-slate-500">Pipeline: </span><span className="font-medium">{fmt(totalOppValue)}</span></div>
                <div><span className="text-slate-500">Won: </span><span className="font-medium text-green-600">{fmt(wonValue)}</span></div>
              </div>
            )}
            <div className="space-y-2">
              {opportunities.map(o => (
                <div key={o.id} className="border rounded-md p-3 bg-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{o.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{o.probability}% probability</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[o.stage] ?? ""}`}>{o.stage}</span>
                      <p className="text-xs font-semibold mt-1">{fmt(o.value)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {opportunities.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">No opportunities yet</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="projects" className="mt-3">
            <div className="space-y-2">
              {projects.map((p: any) => (
                <div key={p.id} className="border rounded-md p-3 bg-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{p.billingType}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.status === "Completed" ? "bg-green-100 text-green-700" :
                        p.status === "In Progress" ? "bg-blue-100 text-blue-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>{p.status}</span>
                      <p className="text-xs font-semibold mt-1">{fmt(p.budget)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {projects.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">No projects yet</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
