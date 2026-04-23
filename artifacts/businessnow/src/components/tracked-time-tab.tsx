import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListTimeEntries,
  useListUsers,
  useListTasks,
  useListAllocations,
  getListTimeEntriesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

type Phase = { id: number; name: string; projectId: number };
type Category = { id: number; name: string; isBillable?: boolean };

interface Props {
  projectId: number;
  /** When provided, restricts the table to entries owned by this user (single-user view). */
  scopedUserId?: number;
  /** Role of the viewing user — Admin/PM bypass governance limits where appropriate. */
  viewerRole?: string;
}

type GroupBy = "none" | "member" | "role" | "phase" | "task" | "status";

function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const header = keys.join(",");
  const body = rows
    .map((row) =>
      keys
        .map((k) => {
          const v = row[k];
          if (v === null || v === undefined) return "";
          const s = String(v);
          return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob([`${header}\n${body}`], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function statusOf(e: any): "Approved" | "Rejected" | "Pending" {
  if (e.approved) return "Approved";
  if (e.rejected) return "Rejected";
  return "Pending";
}

function statusBadge(s: string) {
  const map: Record<string, string> = {
    Approved: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
    Rejected: "bg-red-100 text-red-700 hover:bg-red-100",
    Pending: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  };
  return <Badge className={`${map[s]} border-0`}>{s}</Badge>;
}

export function TrackedTimeTab({ projectId, scopedUserId, viewerRole = "PM" }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: entries, refetch } = useListTimeEntries({ projectId });
  const { data: users } = useListUsers();
  const { data: tasks } = useListTasks({ projectId });
  const { data: allocations } = useListAllocations({ projectId });

  const [phases, setPhases] = useState<Phase[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Lazy-fetch phases + categories once
  useMemo(() => {
    fetch(`/api/phases?projectId=${projectId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setPhases(Array.isArray(data) ? data : []))
      .catch(() => {});
    fetch(`/api/time-categories`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [projectId]);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterBillable, setFilterBillable] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterMember, setFilterMember] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");

  // ── Selection ─────────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [editEntry, setEditEntry] = useState<any | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<{ ids: number[] } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // ── Helpers ───────────────────────────────────────────────────────────────
  const userById = useMemo(() => new Map((users ?? []).map((u: any) => [u.id, u])), [users]);
  const taskById = useMemo(() => new Map((tasks ?? []).map((t: any) => [t.id, t])), [tasks]);
  const phaseById = useMemo(() => new Map(phases.map((p) => [p.id, p])), [phases]);
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Resolve role: prefer entry.role, else allocation.role for that user on this project
  const resolveRole = (e: any): string => {
    if (e.role) return e.role;
    const allocs = (allocations ?? []).filter((a: any) => a.userId === e.userId);
    if (allocs.length === 1) return allocs[0].role ?? "—";
    if (allocs.length > 1) {
      const uniq = Array.from(new Set(allocs.map((a: any) => a.role).filter(Boolean)));
      return uniq.length === 1 ? uniq[0] : "—";
    }
    return "—";
  };

  // Roles available for editing on this project
  const projectRoles = useMemo(() => {
    return Array.from(new Set((allocations ?? []).map((a: any) => a.role).filter(Boolean))) as string[];
  }, [allocations]);

  // For "Role edit blocked if user has allocations across all roles"
  const userHasAllRoles = (userId: number): boolean => {
    const userRoles = new Set(
      (allocations ?? []).filter((a: any) => a.userId === userId).map((a: any) => a.role),
    );
    return projectRoles.length > 0 && projectRoles.every((r) => userRoles.has(r));
  };

  // ── Filtered entries ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return (entries ?? [])
      .filter((e: any) => (scopedUserId ? e.userId === scopedUserId : true))
      .filter((e: any) => {
        if (filterStatus !== "all" && statusOf(e).toLowerCase() !== filterStatus) return false;
        if (filterBillable === "billable" && !e.billable) return false;
        if (filterBillable === "non-billable" && e.billable) return false;
        if (filterCategory !== "all" && String(e.categoryId ?? "") !== filterCategory) return false;
        if (filterMember !== "all" && String(e.userId) !== filterMember) return false;
        return true;
      })
      .sort((a: any, b: any) => (a.date < b.date ? 1 : -1));
  }, [entries, scopedUserId, filterStatus, filterBillable, filterCategory, filterMember]);

  // ── Grouping ─────────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    if (groupBy === "none") return [{ key: "__all__", label: "", entries: filtered }];
    const groups = new Map<string, any[]>();
    for (const e of filtered) {
      let key: string;
      let label: string;
      switch (groupBy) {
        case "member": {
          const u = userById.get(e.userId) as any;
          key = String(e.userId);
          label = u?.name ?? `User #${e.userId}`;
          break;
        }
        case "role": {
          label = resolveRole(e);
          key = label;
          break;
        }
        case "phase": {
          const t = taskById.get(e.taskId) as any;
          const phaseId = t?.phaseId;
          const phase = phaseId ? (phaseById.get(phaseId) as any) : null;
          label = phase?.name ?? "No phase";
          key = String(phaseId ?? "none");
          break;
        }
        case "task": {
          const t = taskById.get(e.taskId) as any;
          label = t?.name ?? e.description ?? "No task";
          key = String(e.taskId ?? `desc:${e.description ?? ""}`);
          break;
        }
        case "status": {
          label = statusOf(e);
          key = label;
          break;
        }
        default:
          key = "__all__";
          label = "";
      }
      const arr = groups.get(key) ?? [];
      arr.push(e);
      if (!groups.has(key)) groups.set(key, arr);
      else groups.set(key, arr);
      const labelMap = (groups as any)._labels ?? new Map<string, string>();
      labelMap.set(key, label);
      (groups as any)._labels = labelMap;
    }
    return Array.from(groups.entries()).map(([key, ents]) => ({
      key,
      label: ((groups as any)._labels as Map<string, string>).get(key) ?? key,
      entries: ents.sort((a: any, b: any) => (a.date < b.date ? 1 : -1)),
    }));
  }, [filtered, groupBy, userById, taskById, phaseById, allocations]);

  // ── Bulk action handlers ─────────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListTimeEntriesQueryKey({ projectId }) });
    refetch();
  };

  const callApi = async (path: string, init: RequestInit) => {
    const res = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-user-role": viewerRole,
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      let msg = `Request failed (${res.status})`;
      try {
        const body = await res.json();
        msg = body?.error ?? msg;
      } catch {}
      throw new Error(msg);
    }
    return res.status === 204 ? null : await res.json();
  };

  const handleBulkApprove = async () => {
    if (selected.size === 0) return;
    try {
      await callApi(`/api/time-entries/bulk-approve`, {
        method: "POST",
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      toast({ title: `Approved ${selected.size} entr${selected.size === 1 ? "y" : "ies"}` });
      setSelected(new Set());
      invalidate();
    } catch (err: any) {
      toast({ title: "Bulk approve failed", description: err.message, variant: "destructive" });
    }
  };

  const handleBulkReject = () => {
    if (selected.size === 0) return;
    setRejectDialog({ ids: Array.from(selected) });
    setRejectReason("");
  };

  const submitReject = async () => {
    if (!rejectDialog) return;
    try {
      await callApi(`/api/time-entries/bulk-reject`, {
        method: "POST",
        body: JSON.stringify({ ids: rejectDialog.ids, rejectionNote: rejectReason }),
      });
      toast({ title: `Rejected ${rejectDialog.ids.length} entr${rejectDialog.ids.length === 1 ? "y" : "ies"}` });
      setSelected(new Set());
      setRejectDialog(null);
      invalidate();
    } catch (err: any) {
      toast({ title: "Bulk reject failed", description: err.message, variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} time entr${selected.size === 1 ? "y" : "ies"}? This cannot be undone.`)) return;
    try {
      await callApi(`/api/time-entries/bulk-delete`, {
        method: "POST",
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      toast({ title: `Deleted ${selected.size} entr${selected.size === 1 ? "y" : "ies"}` });
      setSelected(new Set());
      invalidate();
    } catch (err: any) {
      toast({ title: "Bulk delete failed", description: err.message, variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: number, action: "approve" | "reject" | "unapprove" | "unreject") => {
    try {
      const body =
        action === "approve"
          ? { approved: true, rejected: false }
          : action === "reject"
          ? { approved: false, rejected: true }
          : { approved: false, rejected: false };
      await callApi(`/api/time-entries/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      invalidate();
    } catch (err: any) {
      toast({ title: "Status change failed", description: err.message, variant: "destructive" });
    }
  };

  const exportCSV = () => {
    const rows = filtered.map((e: any) => {
      const u = userById.get(e.userId) as any;
      const t = taskById.get(e.taskId) as any;
      const c = e.categoryId ? (catById.get(e.categoryId) as any) : null;
      return {
        Date: e.date,
        Member: u?.name ?? `User #${e.userId}`,
        Task: t?.name ?? e.description ?? "",
        Hours: e.hours,
        Billable: e.billable ? "Yes" : "No",
        Category: c?.name ?? "",
        Role: resolveRole(e),
        Status: statusOf(e),
        Notes: e.description ?? "",
        BillRate: (u as any)?.billRate ?? "",
        CostRate: (u as any)?.costRate ?? "",
        SubmittedOn: e.createdAt ? new Date(e.createdAt).toISOString().slice(0, 10) : "",
      };
    });
    downloadCSV(`tracked-time-project-${projectId}.csv`, rows);
  };

  const totalHours = filtered.reduce((s: number, e: any) => s + Number(e.hours), 0);
  const billableHours = filtered.filter((e: any) => e.billable).reduce((s: number, e: any) => s + Number(e.hours), 0);

  // Toggle selection
  const allVisibleIds = filtered.map((e: any) => e.id);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id: number) => selected.has(id));

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(allVisibleIds) : new Set());
  };

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-base">Tracked Time</CardTitle>
            <CardDescription>
              {scopedUserId
                ? "Your time entries on this project."
                : "All team time entries on this project. Edit, approve, reject, or add on behalf."}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
            {!scopedUserId && (
              <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add on Behalf
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Filters row */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Billable</Label>
            <Select value={filterBillable} onValueChange={setFilterBillable}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="billable">Billable</SelectItem>
                <SelectItem value="non-billable">Non-billable</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!scopedUserId && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Team Member</Label>
              <Select value={filterMember} onValueChange={setFilterMember}>
                <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {Array.from(new Set((entries ?? []).map((e: any) => e.userId))).map((uid: any) => {
                    const u = userById.get(uid) as any;
                    return <SelectItem key={uid} value={String(uid)}>{u?.name ?? `User #${uid}`}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Group by</Label>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="member">Team Member</SelectItem>
                <SelectItem value="role">Role</SelectItem>
                <SelectItem value="phase">Phase</SelectItem>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto text-xs text-muted-foreground">
            {filtered.length} entr{filtered.length === 1 ? "y" : "ies"} · {totalHours}h total · {billableHours}h billable
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && !scopedUserId && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-indigo-50 border border-indigo-200 text-sm">
            <span className="font-medium text-indigo-900">{selected.size} selected</span>
            <Button size="sm" variant="outline" className="h-7 gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={handleBulkApprove}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
            </Button>
            <Button size="sm" variant="outline" className="h-7 gap-1 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={handleBulkReject}>
              <XCircle className="h-3.5 w-3.5" /> Reject…
            </Button>
            <Button size="sm" variant="outline" className="h-7 gap-1 border-red-300 text-red-700 hover:bg-red-50" onClick={handleBulkDelete}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
            <Button size="sm" variant="ghost" className="h-7 ml-auto" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        )}

        {/* Table */}
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground p-8 text-center">No time entries match the current filters.</p>
        ) : (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {!scopedUserId && (
                    <TableHead className="w-8">
                      <Checkbox checked={allSelected} onCheckedChange={(v) => toggleAll(!!v)} />
                    </TableHead>
                  )}
                  {!scopedUserId && <TableHead>Member</TableHead>}
                  <TableHead>Date</TableHead>
                  <TableHead>Task / Work Item</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead>Billable</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Bill / Cost</TableHead>
                  <TableHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.map((g) => {
                  const isCollapsed = collapsed.has(g.key);
                  const groupHours = g.entries.reduce((s: number, e: any) => s + Number(e.hours), 0);
                  const groupBillable = g.entries.filter((e: any) => e.billable).reduce((s: number, e: any) => s + Number(e.hours), 0);
                  return (
                    <>
                      {groupBy !== "none" && (
                        <TableRow key={`group-${g.key}`} className="bg-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => {
                          setCollapsed((prev) => {
                            const next = new Set(prev);
                            if (next.has(g.key)) next.delete(g.key); else next.add(g.key);
                            return next;
                          });
                        }}>
                          <TableCell colSpan={scopedUserId ? 10 : 11} className="font-semibold text-sm py-2">
                            <div className="flex items-center gap-2">
                              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              <span>{g.label || "—"}</span>
                              <span className="ml-auto text-xs text-muted-foreground font-normal">
                                {g.entries.length} entr{g.entries.length === 1 ? "y" : "ies"} · {groupHours}h total · {groupBillable}h billable
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {!isCollapsed && g.entries.map((e: any) => {
                        const u = userById.get(e.userId) as any;
                        const t = taskById.get(e.taskId) as any;
                        const c = e.categoryId ? (catById.get(e.categoryId) as any) : null;
                        const status = statusOf(e);
                        return (
                          <TableRow key={e.id}>
                            {!scopedUserId && (
                              <TableCell>
                                <Checkbox checked={selected.has(e.id)} onCheckedChange={() => toggleOne(e.id)} />
                              </TableCell>
                            )}
                            {!scopedUserId && (
                              <TableCell className="text-sm font-medium">{u?.name ?? `User #${e.userId}`}</TableCell>
                            )}
                            <TableCell className="text-sm text-muted-foreground">{e.date}</TableCell>
                            <TableCell className="text-sm max-w-xs truncate">{t?.name ?? e.description ?? "—"}</TableCell>
                            <TableCell className="text-right font-medium text-sm">{Number(e.hours)}h</TableCell>
                            <TableCell className="text-xs">
                              {e.billable ? <Badge variant="outline" className="border-emerald-300 text-emerald-700">Billable</Badge> : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-sm">{c?.name ?? "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{resolveRole(e)}</TableCell>
                            <TableCell>{statusBadge(status)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[10rem] truncate" title={e.description ?? ""}>{e.description ?? ""}</TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {(u as any)?.billRate ? `$${(u as any).billRate}` : "—"} / {(u as any)?.costRate ? `$${(u as any).costRate}` : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-0.5 justify-end">
                                {!scopedUserId && status === "Pending" && (
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-600" title="Approve" onClick={() => handleStatusChange(e.id, "approve")}>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {!scopedUserId && status === "Pending" && (
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-600" title="Reject" onClick={() => handleStatusChange(e.id, "reject")}>
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {!scopedUserId && status !== "Pending" && (
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-600" title={status === "Approved" ? "Un-approve" : "Un-reject"} onClick={() => handleStatusChange(e.id, status === "Approved" ? "unapprove" : "unreject")}>
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Edit" onClick={() => setEditEntry(e)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Edit dialog */}
      {editEntry && (
        <EditEntryDialog
          entry={editEntry}
          tasks={tasks ?? []}
          categories={categories}
          projectRoles={projectRoles}
          roleEditBlocked={userHasAllRoles(editEntry.userId)}
          viewerRole={viewerRole}
          isSelfView={!!scopedUserId}
          userName={(userById.get(editEntry.userId) as any)?.name ?? `User #${editEntry.userId}`}
          billRate={(userById.get(editEntry.userId) as any)?.billRate}
          costRate={(userById.get(editEntry.userId) as any)?.costRate}
          onClose={() => setEditEntry(null)}
          onSaved={() => {
            setEditEntry(null);
            invalidate();
          }}
        />
      )}

      {/* Add-on-behalf dialog */}
      {addOpen && (
        <AddOnBehalfDialog
          projectId={projectId}
          users={users ?? []}
          tasks={tasks ?? []}
          categories={categories}
          projectRoles={projectRoles}
          viewerRole={viewerRole}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            invalidate();
          }}
        />
      )}

      {/* Bulk reject dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(v) => !v && setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {rejectDialog?.ids.length} time entr{rejectDialog?.ids.length === 1 ? "y" : "ies"}</DialogTitle>
            <DialogDescription>The submitter(s) will be notified with this reason.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Hours exceed task estimate" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button onClick={submitReject} className="bg-amber-600 hover:bg-amber-700">Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── Edit Entry Dialog ──────────────────────────────────────────────────────
function EditEntryDialog({
  entry,
  tasks,
  categories,
  projectRoles,
  roleEditBlocked,
  viewerRole,
  isSelfView,
  userName,
  billRate,
  costRate,
  onClose,
  onSaved,
}: {
  entry: any;
  tasks: any[];
  categories: Category[];
  projectRoles: string[];
  roleEditBlocked: boolean;
  viewerRole: string;
  isSelfView: boolean;
  userName: string;
  billRate?: number | string;
  costRate?: number | string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isApproved = entry.approved;
  const isAdmin = viewerRole === "Admin";
  const taskEditable = isAdmin || (!isApproved && !entry.rejected);
  const fieldsEditable = isAdmin || !isApproved;
  const [hours, setHours] = useState(String(entry.hours));
  const [billable, setBillable] = useState(!!entry.billable);
  const [categoryId, setCategoryId] = useState<string>(entry.categoryId ? String(entry.categoryId) : "__none__");
  const [role, setRole] = useState<string>(entry.role ?? "__none__");
  const [taskId, setTaskId] = useState<string>(entry.taskId ? String(entry.taskId) : "__none__");
  const [description, setDescription] = useState<string>(entry.description ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const body: any = {
        hours: Number(hours),
        billable,
        description,
      };
      if (taskEditable) body.taskId = taskId === "__none__" ? null : Number(taskId);
      if (fieldsEditable) {
        body.categoryId = categoryId === "__none__" ? null : Number(categoryId);
        if (!roleEditBlocked) body.role = role === "__none__" ? "" : role;
      }
      const res = await fetch(`/api/time-entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-role": viewerRole },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Save failed (${res.status})`);
      }
      toast({ title: "Time entry updated" });
      onSaved();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Time Entry</DialogTitle>
          <DialogDescription>
            <span className="block">Date and Team Member cannot be changed on existing entries.</span>
            {isApproved && !isAdmin && <span className="text-amber-700 mt-1 block">Approved entry — limited fields editable.</span>}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Date (locked)</Label>
              <Input value={entry.date} disabled />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Team Member (locked)</Label>
              <Input value={userName} disabled />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Task / Work Item</Label>
            <Select value={taskId} onValueChange={setTaskId} disabled={!taskEditable}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {tasks.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {!taskEditable && <p className="text-xs text-muted-foreground">Task is locked because this entry is approved.</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Hours</Label>
              <Input type="number" step="0.25" min="0" value={hours} onChange={(e) => setHours(e.target.value)} disabled={!fieldsEditable} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId} disabled={!fieldsEditable}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole} disabled={!fieldsEditable || roleEditBlocked}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {projectRoles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              {roleEditBlocked && <p className="text-xs text-muted-foreground">User is allocated across all project roles — role edit disabled.</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="billable" checked={billable} onCheckedChange={(v) => setBillable(!!v)} disabled={!fieldsEditable} />
            <Label htmlFor="billable" className="text-sm">Billable</Label>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} disabled={!fieldsEditable} />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Bill Rate (read-only)</Label>
              <Input value={billRate ? `$${billRate}` : "—"} disabled />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cost Rate (read-only)</Label>
              <Input value={costRate ? `$${costRate}` : "—"} disabled />
            </div>
          </div>

          <div className="text-xs text-muted-foreground pt-1">
            Submitted: {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "—"}
            {" · "}Last updated: {entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : "—"}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {(fieldsEditable || taskEditable) && (
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add-on-Behalf Dialog ───────────────────────────────────────────────────
function AddOnBehalfDialog({
  projectId,
  users,
  tasks,
  categories,
  projectRoles,
  viewerRole,
  onClose,
  onSaved,
}: {
  projectId: number;
  users: any[];
  tasks: any[];
  categories: Category[];
  projectRoles: string[];
  viewerRole: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [userId, setUserId] = useState<string>("");
  const [date, setDate] = useState(today);
  const [taskId, setTaskId] = useState<string>("__none__");
  const [hours, setHours] = useState("1");
  const [billable, setBillable] = useState(true);
  const [categoryId, setCategoryId] = useState<string>("__none__");
  const [role, setRole] = useState<string>("__none__");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!userId) {
      toast({ title: "Pick a team member", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        projectId,
        userId: Number(userId),
        date,
        hours: Number(hours),
        description,
        billable,
        taskId: taskId === "__none__" ? undefined : Number(taskId),
        categoryId: categoryId === "__none__" ? null : Number(categoryId),
        role: role === "__none__" ? null : role,
      };
      const res = await fetch(`/api/time-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": viewerRole },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Save failed (${res.status})`);
      }
      toast({ title: "Time entry added" });
      onSaved();
    } catch (err: any) {
      toast({ title: "Add failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Time on Behalf</DialogTitle>
          <DialogDescription>Log a time entry for any team member on this project.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Team Member *</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Task / Work Item</Label>
            <Select value={taskId} onValueChange={setTaskId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {tasks.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Hours *</Label>
              <Input type="number" step="0.25" min="0" value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {projectRoles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="billable-add" checked={billable} onCheckedChange={(v) => setBillable(!!v)} />
            <Label htmlFor="billable-add" className="text-sm">Billable</Label>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !userId}>{saving ? "Saving…" : "Add Entry"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
