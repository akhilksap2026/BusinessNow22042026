import { authHeaders } from "@/lib/auth-headers";
import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
  getListUsersQueryKey,
  useGetUserSkills,
  useAddUserSkill,
  useRemoveUserSkill,
  useListProjectTemplates,
  useCreateProjectTemplate,
  useUpdateProjectTemplate,
  useDeleteProjectTemplate,
  getListProjectTemplatesQueryKey,
  useListProjectGroups,
  useCreateProjectGroup,
  useUpdateProjectGroup,
  useDeleteProjectGroup,
  getListProjectGroupsQueryKey,
  useListSkillCategories,
  useCreateSkillCategory,
  useDeleteSkillCategory,
  useListSkills,
  useCreateSkill,
  useDeleteSkill,
  getListSkillCategoriesQueryKey,
  getListSkillsQueryKey,
  useListTaxCodes,
  useCreateTaxCode,
  useUpdateTaxCode,
  useDeleteTaxCode,
  getListTaxCodesQueryKey,
  useListTimeCategories,
  useCreateTimeCategory,
  useUpdateTimeCategory,
  useDeleteTimeCategory,
  getListTimeCategoriesQueryKey,
  useListHolidayCalendars,
  useCreateHolidayCalendar,
  useDeleteHolidayCalendar,
  useListHolidayDates,
  useCreateHolidayDate,
  useDeleteHolidayDate,
  getListHolidayCalendarsQueryKey,
  getListHolidayDatesQueryKey,
  useListRateCards,
  useCreateRateCard,
  useUpdateRateCard,
  useDeleteRateCard,
  getListRateCardsQueryKey,
  useListCustomFieldDefinitions,
  useCreateCustomFieldDefinition,
  useUpdateCustomFieldDefinition,
  useDeleteCustomFieldDefinition,
  getListCustomFieldDefinitionsQueryKey,
  useListAuditLog,
  getListAuditLogQueryKey,
  useListTaskStatusDefinitions,
  useReorderTaskStatusDefinitions,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Trash2, LayoutTemplate, Users, Calendar, Layers, Star, Tag, Cpu, Percent, Clock, CalendarDays, Pencil, X, CreditCard, SlidersHorizontal, Activity, ChevronRight, ChevronDown, CheckCircle2, Building2, RotateCcw, MoreHorizontal, Settings2, ShieldCheck, Archive, Briefcase, ArrowUp, ArrowDown, Zap, Folder, ListTodo, FileText, DollarSign } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TemplateEditor } from "@/components/template-editor";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/contexts/current-user";
import { can } from "@/lib/permissions";
import { resolveRole, ROLES, type RoleValue } from "@/lib/roles";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Role-assignment matrix — mirrors validateInviteRole on the API.
 * Determines which canonical roles the current user may assign.
 */
const ALLOWED_ASSIGNMENTS: Record<RoleValue, RoleValue[]> = {
  account_admin: ["account_admin", "super_user", "collaborator", "customer"],
  super_user:    ["collaborator", "customer"],
  collaborator:  ["customer"],
  customer:      [],
};

const ROLE_LABELS: Record<RoleValue, string> = {
  account_admin: "Account Admin",
  super_user:    "Super User",
  collaborator:  "Collaborator",
  customer:      "Customer",
};

function UserSkillsDialog({ userId, userName, allSkills, onClose }: { userId: number; userName: string; allSkills: { id: number; name: string; categoryId: number }[]; onClose: () => void }) {
  const { data: userSkills, isLoading } = useGetUserSkills(userId);
  const addSkill = useAddUserSkill();
  const removeSkill = useRemoveUserSkill();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [addSkillId, setAddSkillId] = useState("");

  const assignedIds = new Set((userSkills ?? []).map(s => s.skillId));
  const available = allSkills.filter(s => !assignedIds.has(s.id));

  async function handleAdd() {
    if (!addSkillId) return;
    try {
      await addSkill.mutateAsync({ id: userId, data: { skillId: parseInt(addSkillId) } });
      queryClient.invalidateQueries({ queryKey: ["getUserSkills", userId] });
      setAddSkillId("");
      toast({ title: "Skill added" });
    } catch {
      toast({ title: "Failed to add skill", variant: "destructive" });
    }
  }

  async function handleRemove(skillId: number) {
    try {
      await removeSkill.mutateAsync({ id: userId, skillId });
      queryClient.invalidateQueries({ queryKey: ["getUserSkills", userId] });
      toast({ title: "Skill removed" });
    } catch {
      toast({ title: "Failed to remove skill", variant: "destructive" });
    }
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Skills — {userName}</DialogTitle>
          <DialogDescription>Manage skills assigned to this team member.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : (userSkills ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No skills assigned yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(userSkills ?? []).map(s => (
                <Badge key={s.skillId} variant="secondary" className="flex items-center gap-1 pr-1">
                  {allSkills.find(sk => sk.id === s.skillId)?.name ?? `Skill #${s.skillId}`}
                  <button onClick={() => handleRemove(s.skillId)} className="ml-1 rounded hover:bg-muted-foreground/20 p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          {available.length > 0 && (
            <div className="flex gap-2 pt-2 border-t">
              <Select value={addSkillId} onValueChange={setAddSkillId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Add a skill…" /></SelectTrigger>
                <SelectContent>
                  {available.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAdd} disabled={!addSkillId || addSkill.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ALL_ROLES = ["Admin", "PM", "Resource Manager", "Finance", "Viewer"] as const;

function UserConfigTab({ users, BASE, onRefresh }: {
  users: { id: number; name: string; initials: string; role: string; secondaryRoles?: string[] }[];
  BASE: string;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [draft, setDraft] = useState<string[]>([]);

  function startEdit(userId: number, currentSecondary: string[]) {
    setEditingUserId(userId);
    setDraft([...currentSecondary]);
  }

  function cancelEdit() {
    setEditingUserId(null);
    setDraft([]);
  }

  function toggleDraftRole(role: string) {
    setDraft(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  }

  async function confirmEdit(userId: number) {
    setSaving(userId);
    try {
      const res = await fetch(`${BASE}/api/users/${userId}/secondary-roles`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ secondaryRoles: draft }),
      });
      if (!res.ok) throw new Error("Failed");
      onRefresh();
      toast({ title: "Roles updated" });
      setEditingUserId(null);
      setDraft([]);
    } catch {
      toast({ title: "Failed to update roles", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Configuration</CardTitle>
        <CardDescription>
          Assign secondary roles to users so they can switch their active view in the sidebar.
          A user's primary role is always available and cannot be removed here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Primary Role</TableHead>
              <TableHead>Secondary Roles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(user => {
              const secondary = (user as any).secondaryRoles ?? [];
              const editing = editingUserId === user.id;
              const activeRoles = editing ? draft : secondary;
              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8"><AvatarFallback>{user.initials}</AvatarFallback></Avatar>
                      {user.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {ALL_ROLES.filter(r => r !== user.role).map(role => {
                        const active = activeRoles.includes(role);
                        return (
                          <button
                            key={role}
                            disabled={saving === user.id || !editing}
                            onClick={() => editing && toggleDraftRole(role)}
                            className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-colors ${
                              active
                                ? "bg-blue-600 text-white border-blue-600"
                                : editing
                                  ? "bg-background text-muted-foreground border-border hover:border-blue-500 cursor-pointer"
                                  : "bg-background text-muted-foreground border-border cursor-default opacity-70"
                            }`}
                          >
                            {role}
                          </button>
                        );
                      })}
                      {editing ? (
                        <>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            title="Confirm"
                            disabled={saving === user.id}
                            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => confirmEdit(user.id)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            title="Cancel"
                            disabled={saving === user.id}
                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={cancelEdit}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          title="Edit roles"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={() => startEdit(user.id, secondary)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Section D — admin panel for reordering task status definitions.
// Uses simple ↑/↓ buttons (instead of dnd-kit) to keep the surface tiny —
// the table only ever holds a handful of rows in practice.
function TaskStatusesAdminPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: defs } = useListTaskStatusDefinitions();
  const reorderMut = useReorderTaskStatusDefinitions({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/task-status-definitions"] });
        qc.invalidateQueries();
        toast({ title: "Order saved" });
      },
      onError: (err: any) =>
        toast({ title: "Failed to reorder", description: err?.message ?? "Try again.", variant: "destructive" }),
    },
  });

  const sorted = (defs ?? []).slice().sort((a, b) => a.position - b.position);

  function move(idx: number, delta: number) {
    const next = sorted.slice();
    const target = idx + delta;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    reorderMut.mutate({ data: { order: next.map((s) => s.id) } });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Statuses</CardTitle>
        <CardDescription>
          Reorder the statuses available on tasks. Status labels appear in the
          kanban board, task list, and task detail dropdown.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Label</TableHead>
              <TableHead className="w-24">Terminal</TableHead>
              <TableHead className="w-24">Default</TableHead>
              <TableHead className="w-32 text-right">Reorder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                  No task statuses defined.
                </TableCell>
              </TableRow>
            )}
            {sorted.map((s, idx) => (
              <TableRow key={s.id} data-testid={`row-task-status-${s.id}`}>
                <TableCell className="text-muted-foreground tabular-nums">{idx + 1}</TableCell>
                <TableCell className="font-medium">{s.label}</TableCell>
                <TableCell>{s.isTerminal ? "Yes" : "—"}</TableCell>
                <TableCell>{s.isDefault ? "Yes" : "—"}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={idx === 0 || reorderMut.isPending}
                    onClick={() => move(idx, -1)}
                    data-testid={`button-status-up-${s.id}`}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={idx === sorted.length - 1 || reorderMut.isPending}
                    onClick={() => move(idx, 1)}
                    data-testid={`button-status-down-${s.id}`}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// P15 — Project Status display-label and colour customisation
function ProjectStatusLabelsPanel() {
  const { toast } = useToast();
  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const [configs, setConfigs] = useState<any[]>([]);
  const [editing, setEditing] = useState<Record<number, { displayLabel: string; color: string }>>({});

  useEffect(() => {
    fetch(`${BASE}/api/project-status-configs`)
      .then(r => r.ok ? r.json() : [])
      .then(setConfigs)
      .catch(() => {});
  }, []);

  const handleSave = async (id: number) => {
    const updates = editing[id];
    if (!updates) return;
    const r = await fetch(`${BASE}/api/project-status-configs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (r.ok) {
      const row = await r.json();
      setConfigs(prev => prev.map(c => c.id === id ? row : c));
      setEditing(prev => { const n = { ...prev }; delete n[id]; return n; });
      toast({ title: "Status label saved" });
    } else {
      toast({ title: "Save failed", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Status Labels</CardTitle>
        <CardDescription>Customise the display label and colour for each project lifecycle status.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status Key</TableHead>
              <TableHead>Display Label</TableHead>
              <TableHead>Colour Hint</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map(c => {
              const edit = editing[c.id];
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-sm text-muted-foreground">{c.statusKey}</TableCell>
                  <TableCell>
                    {edit ? (
                      <Input className="h-8 w-40" value={edit.displayLabel} onChange={e => setEditing(prev => ({ ...prev, [c.id]: { ...prev[c.id], displayLabel: e.target.value } }))} />
                    ) : (
                      <span className="text-sm">{c.displayLabel}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {edit ? (
                      <Select value={edit.color} onValueChange={v => setEditing(prev => ({ ...prev, [c.id]: { ...prev[c.id], color: v } }))}>
                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["default", "green", "yellow", "red", "blue", "orange", "violet", "slate"].map(col => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className="text-xs">{c.color || "default"}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {edit ? (
                      <>
                        <Button size="sm" onClick={() => handleSave(c.id)}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditing(prev => { const n = { ...prev }; delete n[c.id]; return n; })}>Cancel</Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setEditing(prev => ({ ...prev, [c.id]: { displayLabel: c.displayLabel, color: c.color || "default" } }))}>Edit</Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {configs.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center py-6 text-sm text-muted-foreground">No status configs found. Check API connection.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

type DocTemplateRow = {
  id: number;
  name: string;
  description: string | null;
  documentType: string;
  content: string | null;
  updatedAt: string;
};

/**
 * Admin panel for managing reusable document templates.
 * Lists templates, supports create / edit / delete via /api/document-templates.
 */
function DocumentTemplatesPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: templates, isLoading } = useQuery<DocTemplateRow[]>({
    queryKey: ["document-templates"],
    queryFn: async () => {
      const r = await fetch("/api/document-templates", { headers: authHeaders() });
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
  });

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<DocTemplateRow | null>(null);
  const [form, setForm] = useState({ name: "", description: "", documentType: "rich_text", content: "" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", description: "", documentType: "rich_text", content: "" });
    setEditorOpen(true);
  }
  function openEdit(t: DocTemplateRow) {
    setEditing(t);
    setForm({ name: t.name, description: t.description ?? "", documentType: t.documentType, content: t.content ?? "" });
    setEditorOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editing ? `/api/document-templates/${editing.id}` : "/api/document-templates";
      const method = editing ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(form),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? `Save failed (${r.status})`);
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      toast({ title: editing ? "Template updated" : "Template created" });
      setEditorOpen(false);
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/document-templates/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!r.ok) throw new Error(`Delete failed (${r.status})`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      toast({ title: "Template deleted" });
      setConfirmDeleteId(null);
    },
    onError: (e: any) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> Document Templates</CardTitle>
          <CardDescription>Reusable document content that PMs can pick from when creating a project document.</CardDescription>
        </div>
        <Button size="sm" onClick={openCreate} data-testid="button-new-document-template">
          <Plus className="h-4 w-4 mr-2" /> New Template
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded" />)}</div>
        ) : !templates?.length ? (
          <EmptyState icon={FileText} title="No document templates yet" description="Create one and your team can use it on any project." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell><Badge variant="outline">{t.documentType}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xl truncate">{t.description ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(t)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setConfirmDeleteId(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Template" : "New Template"}</DialogTitle>
            <DialogDescription>{editing ? "Update the reusable template." : "Create a reusable document template."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Template Name *</Label>
              <Input
                placeholder="e.g. Project Charter"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                placeholder="What is this template for?"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Document Type</Label>
              <Select value={form.documentType} onValueChange={v => setForm(f => ({ ...f, documentType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rich_text">Rich Text</SelectItem>
                  <SelectItem value="spreadsheet">Spreadsheet</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="link">Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Default Content</Label>
              <Textarea
                rows={10}
                placeholder="Default text/markdown that will be inserted when this template is used."
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
              {editing ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDeleteId} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete template?</DialogTitle>
            <DialogDescription>This will not affect documents previously created from it.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => confirmDeleteId && deleteMutation.mutate(confirmDeleteId)} disabled={deleteMutation.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function Admin() {
  const search = useSearch();
  const [activeTab, setActiveTab] = useState(() => new URLSearchParams(search).get("tab") ?? "users");
  const { data: users, isLoading: isLoadingUsers } = useListUsers();
  const { data: templates, isLoading: isLoadingTemplates } = useListProjectTemplates();
  const { data: categories, isLoading: isLoadingCategories } = useListSkillCategories();
  const { data: skills, isLoading: isLoadingSkills } = useListSkills();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createTemplate = useCreateProjectTemplate();
  const updateTemplate = useUpdateProjectTemplate();
  const deleteTemplate = useDeleteProjectTemplate();
  const { data: projectGroups, isLoading: isLoadingGroups } = useListProjectGroups();
  const createGroup = useCreateProjectGroup();
  const updateGroup = useUpdateProjectGroup();
  const deleteGroup = useDeleteProjectGroup();
  const createCategory = useCreateSkillCategory();
  const deleteCategory = useDeleteSkillCategory();
  const createSkill = useCreateSkill();
  const deleteSkill = useDeleteSkill();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const deleteUserMut = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${BASE}/api/users/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!r.ok && r.status !== 204) throw new Error("Failed to delete user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: "User deleted" });
      setUserDeleteId(null);
    },
    onError: () => toast({ title: "Failed to delete user", variant: "destructive" }),
  });

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [userDeleteId, setUserDeleteId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState({ name: "", email: "", role: "", department: "", region: "", capacity: "40", costRate: "0", isInternal: "true", activeStatus: "active", holidayCalendarId: "", resourceType: "employee" });

  /* ── Invite + role-management context ─────────────────────────── */
  const { activeRole } = useCurrentUser();
  const inviterCanonical = resolveRole(activeRole) as RoleValue;
  const allowedAssignments = ALLOWED_ASSIGNMENTS[inviterCanonical] ?? [];
  const canManageTeam = can(activeRole, "settings.manageTeam");
  const isAccountAdmin = inviterCanonical === ROLES.ACCOUNT_ADMIN;

  /**
   * The Admin page is global — no project context.  The invite-matrix requires
   * a projectId for any `customer` target (and any collaborator inviter, who
   * may only assign customers).  Customer invites therefore belong on the
   * Project page; here we offer only internal/account roles.
   */
  const adminPageInviteRoles = allowedAssignments.filter(r => r !== "customer");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", name: "", role: "" });
  const inviteUserMut = useMutation({
    mutationFn: async (payload: { email: string; name: string; role: string }) => {
      const r = await fetch(`${BASE}/api/users/invite`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Invite failed");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: `Invitation sent to ${inviteForm.email}` });
      setInviteOpen(false);
      setInviteForm({ email: "", name: "", role: "" });
    },
    onError: (err: Error) => toast({ title: "Invite failed", description: err.message, variant: "destructive" }),
  });

  /** Inline role change — uses the existing PATCH /users/:id, gated by assignment matrix. */
  const changeRoleMut = useMutation({
    mutationFn: async (vars: { id: number; role: RoleValue }) => {
      await updateUser.mutateAsync({ id: vars.id, data: { role: vars.role } as any });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: "Role updated" });
    },
    onError: (err: Error) => toast({ title: "Role change failed", description: err.message, variant: "destructive" }),
  });

  function openAddUser() {
    setEditUser(null);
    setUserForm({ name: "", email: "", role: "", department: "", region: "", capacity: "40", costRate: "0", isInternal: "true", activeStatus: "active", holidayCalendarId: "", resourceType: "employee" });
    setUserDialogOpen(true);
  }

  function openEditUser(u: any) {
    setEditUser(u);
    setUserForm({ name: u.name, email: u.email, role: u.role, department: u.department ?? "", region: u.region ?? "", capacity: String(u.capacity ?? 40), costRate: String(u.costRate ?? 0), isInternal: u.isInternal === false ? "false" : "true", activeStatus: u.activeStatus ?? "active", holidayCalendarId: u.holidayCalendarId ? String(u.holidayCalendarId) : "", resourceType: (u as any).resourceType ?? "employee" });
    setUserDialogOpen(true);
  }

  async function handleSaveUser() {
    const payload = { name: userForm.name, email: userForm.email, role: userForm.role, department: userForm.department, region: userForm.region || undefined, capacity: Number(userForm.capacity), costRate: Number(userForm.costRate), isInternal: userForm.isInternal !== "false", activeStatus: userForm.activeStatus, holidayCalendarId: userForm.holidayCalendarId ? Number(userForm.holidayCalendarId) : null, resourceType: userForm.resourceType };
    try {
      if (editUser) {
        await updateUser.mutateAsync({ id: editUser.id, data: payload });
        toast({ title: "User updated" });
      } else {
        await createUser.mutateAsync({ data: payload });
        toast({ title: "User added" });
      }
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      setUserDialogOpen(false);
    } catch {
      toast({ title: editUser ? "Failed to update user" : "Failed to add user", variant: "destructive" });
    }
  }

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogId, setDeleteDialogId] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<number | null>(null);
  const [editTemplateForm, setEditTemplateForm] = useState({ name: "", description: "", billingType: "Fixed" });

  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editGroupId, setEditGroupId] = useState<number | null>(null);
  const [groupForm, setGroupForm] = useState({ name: "", color: "" });
  const [deleteGroupId, setDeleteGroupId] = useState<number | null>(null);

  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const [rcuDialogOpen, setRcuDialogOpen] = useState(false);
  const [editRcuId, setEditRcuId] = useState<number | null>(null);
  const [rcuForm, setRcuForm] = useState({ userId: "", country: "", currency: "USD", rate: "", effectiveDate: "" });
  const [deleteRcuId, setDeleteRcuId] = useState<number | null>(null);
  const { data: resourceCostRates, isLoading: isLoadingRcu } = useQuery<any[]>({
    queryKey: ["resource-cost-rates"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/resource-cost-rates`, { headers: authHeaders() });
      if (!r.ok) return [];
      return r.json();
    },
  });

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [deleteCategoryId, setDeleteCategoryId] = useState<number | null>(null);

  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategoryId, setNewSkillCategoryId] = useState("");
  const [newSkillType, setNewSkillType] = useState("Level");
  const [newSkillSection, setNewSkillSection] = useState("");
  const [newSkillDescription, setNewSkillDescription] = useState("");
  const [deleteSkillId, setDeleteSkillId] = useState<number | null>(null);
  const [editSkillId, setEditSkillId] = useState<number | null>(null);
  const [editSkillForm, setEditSkillForm] = useState({ name: "", categoryId: "", skillType: "Level", section: "", description: "" });
  const [renameCalendarId, setRenameCalendarId] = useState<number | null>(null);
  const [renameCalendarName, setRenameCalendarName] = useState("");
  const [renameCalendarDesc, setRenameCalendarDesc] = useState("");
  const [renamingCalendar, setRenamingCalendar] = useState(false);

  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [skillsUser, setSkillsUser] = useState<{ id: number; name: string } | null>(null);

  const [jobRoles, setJobRoles] = useState<{ id: number; name: string }[]>([]);
  const [jobRolesLoading, setJobRolesLoading] = useState(false);
  const [newJobRoleName, setNewJobRoleName] = useState("");
  const [jobRoleSaving, setJobRoleSaving] = useState(false);

  async function fetchJobRoles() {
    setJobRolesLoading(true);
    try {
      const res = await fetch("/api/job-roles", { headers: authHeaders() });
      if (res.ok) setJobRoles(await res.json());
    } finally {
      setJobRolesLoading(false);
    }
  }

  async function handleCreateJobRole() {
    if (!newJobRoleName.trim()) return;
    setJobRoleSaving(true);
    try {
      const res = await fetch("/api/job-roles", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ name: newJobRoleName.trim() }),
      });
      if (res.ok) {
        setNewJobRoleName("");
        fetchJobRoles();
        toast({ title: "Job role added" });
      } else {
        const err = await res.json();
        toast({ title: err.error ?? "Failed to create job role", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to create job role", variant: "destructive" });
    } finally {
      setJobRoleSaving(false);
    }
  }

  async function handleDeleteJobRole(id: number) {
    try {
      await fetch(`/api/job-roles/${id}`, { method: "DELETE", headers: authHeaders() });
      fetchJobRoles();
      toast({ title: "Job role deleted" });
    } catch {
      toast({ title: "Failed to delete job role", variant: "destructive" });
    }
  }

  useEffect(() => { fetchJobRoles(); }, []);

  const { data: taxCodes, isLoading: isLoadingTaxCodes } = useListTaxCodes();
  const createTaxCode = useCreateTaxCode();
  const updateTaxCode = useUpdateTaxCode();
  const deleteTaxCode = useDeleteTaxCode();

  const { data: timeCategories, isLoading: isLoadingTimeCategories } = useListTimeCategories();
  const createTimeCategory = useCreateTimeCategory();
  const updateTimeCategory = useUpdateTimeCategory();
  const deleteTimeCategory = useDeleteTimeCategory();

  const { data: holidayCalendars, isLoading: isLoadingHolidayCalendars } = useListHolidayCalendars();
  const createHolidayCalendar = useCreateHolidayCalendar();
  const deleteHolidayCalendar = useDeleteHolidayCalendar();
  const createHolidayDate = useCreateHolidayDate();
  const deleteHolidayDate = useDeleteHolidayDate();

  const [selectedCalendarId, setSelectedCalendarId] = useState<number | null>(null);
  const { data: holidayDates } = useListHolidayDates(selectedCalendarId ?? 0, {
    query: { enabled: !!selectedCalendarId, queryKey: [...getListHolidayDatesQueryKey(selectedCalendarId ?? 0)] },
  });

  const [taxCodeDialogOpen, setTaxCodeDialogOpen] = useState(false);
  const [editTaxCodeId, setEditTaxCodeId] = useState<number | null>(null);
  const [deleteTaxCodeId, setDeleteTaxCodeId] = useState<number | null>(null);
  const [taxCodeForm, setTaxCodeForm] = useState({ name: "", rate: "", description: "", isDefault: false });

  const [timeCategoryDialogOpen, setTimeCategoryDialogOpen] = useState(false);
  const [editTimeCategoryId, setEditTimeCategoryId] = useState<number | null>(null);
  const [deleteTimeCategoryId, setDeleteTimeCategoryId] = useState<number | null>(null);
  const [timeCategoryForm, setTimeCategoryForm] = useState({ name: "", description: "", defaultBillable: true });

  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const [deleteCalendarId, setDeleteCalendarId] = useState<number | null>(null);
  const [newCalendarName, setNewCalendarName] = useState("");
  const [newCalendarDesc, setNewCalendarDesc] = useState("");
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [newDateName, setNewDateName] = useState("");
  const [newDateValue, setNewDateValue] = useState("");

  const { data: rateCards, isLoading: isLoadingRateCards } = useListRateCards();
  const createRateCard = useCreateRateCard();
  const updateRateCard = useUpdateRateCard();
  const deleteRateCard = useDeleteRateCard();
  const [rateCardDialogOpen, setRateCardDialogOpen] = useState(false);
  const [editRateCardId, setEditRateCardId] = useState<number | null>(null);
  const [deleteRateCardId, setDeleteRateCardId] = useState<number | null>(null);
  const [rcForm, setRcForm] = useState({ name: "", currency: "USD", status: "Active", effectiveDate: "" });
  const [rcRoles, setRcRoles] = useState<{ role: string; rate: number }[]>([]);
  const [rcNewRole, setRcNewRole] = useState({ role: "", rate: "" });

  const [cfEntityFilter, setCfEntityFilter] = useState<string>("all");
  const { data: cfDefinitions, isLoading: isLoadingCf } = useListCustomFieldDefinitions(
    cfEntityFilter !== "all" ? { entityType: cfEntityFilter } : undefined,
    { query: { queryKey: getListCustomFieldDefinitionsQueryKey(cfEntityFilter !== "all" ? { entityType: cfEntityFilter } : undefined) } }
  );
  const createCfDef = useCreateCustomFieldDefinition();
  const updateCfDef = useUpdateCustomFieldDefinition();
  const deleteCfDef = useDeleteCustomFieldDefinition();
  const [cfDialogOpen, setCfDialogOpen] = useState(false);
  const [editCfId, setEditCfId] = useState<number | null>(null);
  const [deleteCfId, setDeleteCfId] = useState<number | null>(null);
  const [cfForm, setCfForm] = useState({
    entityType: "project", name: "", fieldType: "text", isRequired: false, options: "",
    description: "", sectionId: "" as string,
    populationMethod: "manual",
    inheritFromEntity: "" as string,
    inheritFromFieldId: "" as string,
    fallbackValue: "",
  });
  // Custom field sections (for grouping fields with role-based visibility)
  const { data: cfSections, refetch: refetchCfSections } = useQuery({
    queryKey: ["custom-field-sections"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/custom-field-sections`, { headers: authHeaders() });
      if (!res.ok) return [] as any[];
      return res.json() as Promise<any[]>;
    },
  });
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editSectionId, setEditSectionId] = useState<number | null>(null);
  const [sectionForm, setSectionForm] = useState({ entityType: "time_entry", name: "", description: "", viewRoles: "", editRoles: "", isActive: true });
  const [deleteSectionId, setDeleteSectionId] = useState<number | null>(null);

  async function handleSaveSection() {
    if (!sectionForm.name) return;
    try {
      const url = editSectionId ? `${BASE}/api/custom-field-sections/${editSectionId}` : `${BASE}/api/custom-field-sections`;
      const res = await fetch(url, {
        method: editSectionId ? "PUT" : "POST",
        headers: authHeaders({ "content-type": "application/json" }),
        body: JSON.stringify(sectionForm),
      });
      if (!res.ok) throw new Error();
      toast({ title: editSectionId ? "Section updated" : "Section created" });
      setSectionDialogOpen(false); setEditSectionId(null);
      setSectionForm({ entityType: "time_entry", name: "", description: "", viewRoles: "", editRoles: "", isActive: true });
      refetchCfSections();
    } catch { toast({ title: "Failed to save section", variant: "destructive" }); }
  }
  async function handleDeleteSection(id: number) {
    try {
      const res = await fetch(`${BASE}/api/custom-field-sections/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error();
      toast({ title: "Section deleted" });
      setDeleteSectionId(null);
      refetchCfSections();
      queryClient.invalidateQueries({ queryKey: getListCustomFieldDefinitionsQueryKey() });
    } catch { toast({ title: "Failed to delete section", variant: "destructive" }); }
  }

  // Activity Defaults state
  const { data: activityDefaults, refetch: refetchActivityDefaults } = useQuery({
    queryKey: ["activity-defaults"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/activity-defaults`, { headers: authHeaders() });
      if (!res.ok) return [] as any[];
      return res.json() as Promise<any[]>;
    },
  });
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [editActivityId, setEditActivityId] = useState<number | null>(null);
  const [activityForm, setActivityForm] = useState({ activityName: "", billable: false, categoryId: "" as string, isActive: true });
  const [deleteActivityId, setDeleteActivityId] = useState<number | null>(null);
  async function handleSaveActivity() {
    if (!activityForm.activityName) return;
    try {
      const payload: any = {
        activityName: activityForm.activityName,
        billable: activityForm.billable,
        categoryId: activityForm.categoryId ? Number(activityForm.categoryId) : null,
        isActive: activityForm.isActive,
      };
      const url = editActivityId ? `${BASE}/api/activity-defaults/${editActivityId}` : `${BASE}/api/activity-defaults`;
      const res = await fetch(url, {
        method: editActivityId ? "PUT" : "POST",
        headers: authHeaders({ "content-type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast({ title: editActivityId ? "Activity default updated" : "Activity default created" });
      setActivityDialogOpen(false); setEditActivityId(null);
      setActivityForm({ activityName: "", billable: false, categoryId: "", isActive: true });
      refetchActivityDefaults();
    } catch { toast({ title: "Failed to save activity default", variant: "destructive" }); }
  }
  async function handleDeleteActivity(id: number) {
    try {
      const res = await fetch(`${BASE}/api/activity-defaults/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error();
      toast({ title: "Activity default deleted" });
      setDeleteActivityId(null);
      refetchActivityDefaults();
    } catch { toast({ title: "Failed to delete activity default", variant: "destructive" }); }
  }

  const [auditEntityFilter, setAuditEntityFilter] = useState<string>("all");
  const [auditActionFilter, setAuditActionFilter] = useState<string>("all");
  const [auditDateFrom, setAuditDateFrom] = useState<string>("");
  const [auditDateTo, setAuditDateTo] = useState<string>("");
  const auditQueryParams = {
    ...(auditEntityFilter !== "all" ? { entityType: auditEntityFilter } : {}),
    ...(auditActionFilter !== "all" ? { action: auditActionFilter } : {}),
    ...(auditDateFrom ? { from: auditDateFrom } : {}),
    ...(auditDateTo ? { to: auditDateTo } : {}),
  };
  const { data: auditEntries, isLoading: isLoadingAudit } = useListAuditLog(
    Object.keys(auditQueryParams).length ? auditQueryParams : undefined,
    { query: { queryKey: getListAuditLogQueryKey(Object.keys(auditQueryParams).length ? auditQueryParams : undefined) } }
  );

  const [companyForm, setCompanyForm] = useState({ name: "", address: "", timezone: "", currency: "", fiscalYearStart: "", website: "", phone: "", logoUrl: "", primaryColor: "" });
  const [companyFormDirty, setCompanyFormDirty] = useState(false);

  const { data: companySettings, refetch: refetchCompany } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/company-settings`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to fetch company settings");
      return res.json() as Promise<{ id: number; name: string; address: string | null; logoUrl: string | null; timezone: string; currency: string; fiscalYearStart: string; website: string | null; phone: string | null }>;
    },
  });

  useEffect(() => {
    if (companySettings && !companyFormDirty) {
      setCompanyForm({
        name: companySettings.name ?? "",
        address: companySettings.address ?? "",
        timezone: companySettings.timezone ?? "",
        currency: companySettings.currency ?? "",
        fiscalYearStart: companySettings.fiscalYearStart ?? "",
        website: companySettings.website ?? "",
        phone: companySettings.phone ?? "",
        logoUrl: (companySettings as any).logoUrl ?? "",
        primaryColor: (companySettings as any).primaryColor ?? "",
      });
    }
  }, [companySettings, companyFormDirty]);

  const saveCompanyMut = useMutation({
    mutationFn: async (data: typeof companyForm) => {
      const res = await fetch(`${BASE}/api/company-settings`, {
        method: "PUT",
        headers: authHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ ...data, logoUrl: data.logoUrl || null, primaryColor: data.primaryColor || null }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Company settings saved" });
      setCompanyFormDirty(false);
      refetchCompany();
    },
    onError: () => toast({ title: "Failed to save settings", variant: "destructive" }),
  });

  const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const [timeSettingsForm, setTimeSettingsForm] = useState({
    weeklyCapacityHours: 40,
    workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"] as string[],
    timesheetDueDay: "Monday",
    approvalMode: "Manual",
    globalLockEnabled: false,
    lockBeforeDate: "",
    weekStartDay: 1,
    minSubmitHours: 0,
    approverRoutingMode: "admin_default",
    lockOnApprovalEnabled: false,
    statusLockEnabled: false,
    dateLockEditOverrideRoles: "",
    dateLockStatusOverrideRoles: "",
    moduleEnabled: true,
    timesheetDueTime: "17:00",
    reminderDaysBefore: 1,
    reminderDaysAfter: 1,
    trackTimeAgainst: "task",
    reportingScope: "all",
    maxSubmitHours: "" as string | number,
    exactSubmitHours: "" as string | number,
    defaultBillable: true,
    rejectedHoursBehavior: "keep",
  });
  const [timeSettingsDirty, setTimeSettingsDirty] = useState(false);

  const { data: timeSettings, refetch: refetchTimeSettings } = useQuery({
    queryKey: ["time-settings"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/time-settings`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to fetch time settings");
      return res.json() as Promise<{
        id: number; weeklyCapacityHours: number; workingDays: string;
        timesheetDueDay: string; approvalMode: string;
        globalLockEnabled: boolean; lockBeforeDate: string | null;
        weekStartDay: number; minSubmitHours: number; updatedAt: string;
      }>;
    },
  });

  useEffect(() => {
    if (timeSettings && !timeSettingsDirty) {
      const ts = timeSettings as any;
      setTimeSettingsForm({
        weeklyCapacityHours: timeSettings.weeklyCapacityHours ?? 40,
        workingDays: timeSettings.workingDays ? timeSettings.workingDays.split(",").map(d => d.trim()) : ["Mon", "Tue", "Wed", "Thu", "Fri"],
        timesheetDueDay: timeSettings.timesheetDueDay ?? "Monday",
        approvalMode: timeSettings.approvalMode ?? "Manual",
        globalLockEnabled: timeSettings.globalLockEnabled ?? false,
        lockBeforeDate: timeSettings.lockBeforeDate ?? "",
        weekStartDay: timeSettings.weekStartDay ?? 1,
        minSubmitHours: timeSettings.minSubmitHours ?? 0,
        approverRoutingMode: ts.approverRoutingMode ?? "admin_default",
        lockOnApprovalEnabled: ts.lockOnApprovalEnabled ?? false,
        statusLockEnabled: ts.statusLockEnabled ?? false,
        dateLockEditOverrideRoles: ts.dateLockEditOverrideRoles ?? "",
        dateLockStatusOverrideRoles: ts.dateLockStatusOverrideRoles ?? "",
        moduleEnabled: ts.moduleEnabled ?? true,
        timesheetDueTime: ts.timesheetDueTime ?? "17:00",
        reminderDaysBefore: ts.reminderDaysBefore ?? 1,
        reminderDaysAfter: ts.reminderDaysAfter ?? 1,
        trackTimeAgainst: ts.trackTimeAgainst ?? "task",
        reportingScope: ts.reportingScope ?? "all",
        maxSubmitHours: ts.maxSubmitHours ?? "",
        exactSubmitHours: ts.exactSubmitHours ?? "",
        defaultBillable: ts.defaultBillable ?? true,
        rejectedHoursBehavior: ts.rejectedHoursBehavior ?? "keep",
      });
    }
  }, [timeSettings, timeSettingsDirty]);

  const saveTimeSettingsMut = useMutation({
    mutationFn: async (data: typeof timeSettingsForm) => {
      const res = await fetch(`${BASE}/api/time-settings`, {
        method: "PUT",
        headers: authHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ ...data, workingDays: data.workingDays.join(",") }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Time settings saved" });
      setTimeSettingsDirty(false);
      refetchTimeSettings();
    },
    onError: () => toast({ title: "Failed to save time settings", variant: "destructive" }),
  });

  const { data: deletedProjects, refetch: refetchDeleted } = useQuery({
    queryKey: ["deleted-projects"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/projects/deleted`, { headers: authHeaders() });
      if (!res.ok) return [];
      return res.json() as Promise<{ id: number; name: string; deletedAt: string | null }[]>;
    },
  });

  const restoreProjectMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${BASE}/api/projects/${id}/restore`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to restore");
    },
    onSuccess: () => {
      toast({ title: "Project restored" });
      refetchDeleted();
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: () => toast({ title: "Failed to restore project", variant: "destructive" }),
  });

  async function handleSaveTaxCode() {
    if (!taxCodeForm.name || !taxCodeForm.rate) return;
    try {
      if (editTaxCodeId) {
        await updateTaxCode.mutateAsync({ id: editTaxCodeId, data: { name: taxCodeForm.name, rate: parseFloat(taxCodeForm.rate), description: taxCodeForm.description, isDefault: taxCodeForm.isDefault } });
      } else {
        await createTaxCode.mutateAsync({ data: { name: taxCodeForm.name, rate: parseFloat(taxCodeForm.rate), description: taxCodeForm.description, isDefault: taxCodeForm.isDefault } });
      }
      queryClient.invalidateQueries({ queryKey: getListTaxCodesQueryKey() });
      toast({ title: editTaxCodeId ? "Tax code updated" : "Tax code created" });
      setTaxCodeDialogOpen(false);
      setEditTaxCodeId(null);
      setTaxCodeForm({ name: "", rate: "", description: "", isDefault: false });
    } catch {
      toast({ title: "Failed to save tax code", variant: "destructive" });
    }
  }

  async function handleDeleteTaxCode(id: number) {
    try {
      await deleteTaxCode.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListTaxCodesQueryKey() });
      toast({ title: "Tax code deleted" });
      setDeleteTaxCodeId(null);
    } catch {
      toast({ title: "Failed to delete tax code", variant: "destructive" });
    }
  }

  async function handleSaveTimeCategory() {
    if (!timeCategoryForm.name) return;
    try {
      const payload: any = { name: timeCategoryForm.name, description: timeCategoryForm.description, defaultBillable: timeCategoryForm.defaultBillable };
      if (editTimeCategoryId) {
        await updateTimeCategory.mutateAsync({ id: editTimeCategoryId, data: payload });
      } else {
        await createTimeCategory.mutateAsync({ data: payload });
      }
      queryClient.invalidateQueries({ queryKey: getListTimeCategoriesQueryKey() });
      toast({ title: editTimeCategoryId ? "Category updated" : "Category created" });
      setTimeCategoryDialogOpen(false);
      setEditTimeCategoryId(null);
      setTimeCategoryForm({ name: "", description: "", defaultBillable: true });
    } catch {
      toast({ title: "Failed to save category", variant: "destructive" });
    }
  }

  async function handleReorderTimeCategory(id: number, direction: -1 | 1) {
    if (!timeCategories) return;
    const ordered = [...timeCategories].sort((a, b) => ((a as any).sortOrder ?? 0) - ((b as any).sortOrder ?? 0));
    const idx = ordered.findIndex(c => c.id === id);
    if (idx < 0) return;
    const swap = idx + direction;
    if (swap < 0 || swap >= ordered.length) return;
    const newOrder = [...ordered];
    [newOrder[idx], newOrder[swap]] = [newOrder[swap], newOrder[idx]];
    try {
      const res = await fetch(`${BASE}/api/time-categories/reorder`, {
        method: "PUT",
        headers: authHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ ids: newOrder.map(c => c.id) }),
      });
      if (!res.ok) throw new Error("reorder failed");
      queryClient.invalidateQueries({ queryKey: getListTimeCategoriesQueryKey() });
    } catch {
      toast({ title: "Failed to reorder", variant: "destructive" });
    }
  }

  async function handleDeleteTimeCategory(id: number) {
    try {
      await deleteTimeCategory.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListTimeCategoriesQueryKey() });
      toast({ title: "Time category deleted" });
      setDeleteTimeCategoryId(null);
    } catch {
      toast({ title: "Failed to delete category", variant: "destructive" });
    }
  }

  async function handleCreateCalendar() {
    if (!newCalendarName) return;
    try {
      await createHolidayCalendar.mutateAsync({ data: { name: newCalendarName, description: newCalendarDesc || undefined } });
      queryClient.invalidateQueries({ queryKey: getListHolidayCalendarsQueryKey() });
      toast({ title: "Calendar created" });
      setCalendarDialogOpen(false);
      setNewCalendarName("");
      setNewCalendarDesc("");
    } catch {
      toast({ title: "Failed to create calendar", variant: "destructive" });
    }
  }

  async function handleDeleteCalendar(id: number) {
    try {
      await deleteHolidayCalendar.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListHolidayCalendarsQueryKey() });
      toast({ title: "Calendar deleted" });
      setDeleteCalendarId(null);
      if (selectedCalendarId === id) setSelectedCalendarId(null);
    } catch {
      toast({ title: "Failed to delete calendar", variant: "destructive" });
    }
  }

  async function handleAddHolidayDate() {
    if (!newDateName || !newDateValue || !selectedCalendarId) return;
    try {
      await createHolidayDate.mutateAsync({ id: selectedCalendarId, data: { name: newDateName, date: newDateValue } });
      queryClient.invalidateQueries({ queryKey: getListHolidayDatesQueryKey(selectedCalendarId) });
      toast({ title: "Holiday date added" });
      setDateDialogOpen(false);
      setNewDateName("");
      setNewDateValue("");
    } catch {
      toast({ title: "Failed to add holiday", variant: "destructive" });
    }
  }

  async function handleDeleteHolidayDate(dateId: number) {
    if (!selectedCalendarId) return;
    try {
      await deleteHolidayDate.mutateAsync({ id: selectedCalendarId, dateId });
      queryClient.invalidateQueries({ queryKey: getListHolidayDatesQueryKey(selectedCalendarId) });
      toast({ title: "Holiday removed" });
    } catch {
      toast({ title: "Failed to remove holiday", variant: "destructive" });
    }
  }

  const [form, setForm] = useState({
    name: "",
    description: "",
    billingType: "Fixed Fee",
    totalDurationDays: 30,
  });

  async function handleCreate() {
    if (!form.name) return;
    try {
      const row = await createTemplate.mutateAsync({
        data: { name: form.name, description: form.description || undefined, billingType: form.billingType, totalDurationDays: form.totalDurationDays }
      });
      queryClient.invalidateQueries({ queryKey: getListProjectTemplatesQueryKey() });
      toast({ title: "Template created — add phases and tasks in the editor" });
      setCreateDialogOpen(false);
      setForm({ name: "", description: "", billingType: "Fixed Fee", totalDurationDays: 30 });
      setSelectedTemplateId((row as any).id);
    } catch {
      toast({ title: "Failed to create template", variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteTemplate.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListProjectTemplatesQueryKey() });
      toast({ title: "Template deleted" });
      setDeleteDialogId(null);
    } catch {
      toast({ title: "Failed to delete template", variant: "destructive" });
    }
  }

  async function handleSaveTemplateEdit() {
    if (!editTemplateId || !editTemplateForm.name) return;
    try {
      await updateTemplate.mutateAsync({ id: editTemplateId, data: { name: editTemplateForm.name, description: editTemplateForm.description || undefined, billingType: editTemplateForm.billingType as any } });
      queryClient.invalidateQueries({ queryKey: getListProjectTemplatesQueryKey() });
      toast({ title: "Template updated" });
      setEditTemplateId(null);
    } catch {
      toast({ title: "Failed to update template", variant: "destructive" });
    }
  }

  async function handleSaveGroup() {
    if (!groupForm.name) return;
    try {
      if (editGroupId) {
        await updateGroup.mutateAsync({ id: editGroupId, data: { name: groupForm.name, color: groupForm.color || null } });
        toast({ title: "Group updated" });
      } else {
        await createGroup.mutateAsync({ data: { name: groupForm.name, color: groupForm.color || null } });
        toast({ title: "Group created" });
      }
      queryClient.invalidateQueries({ queryKey: getListProjectGroupsQueryKey() });
      setGroupDialogOpen(false);
      setEditGroupId(null);
      setGroupForm({ name: "", color: "" });
    } catch {
      toast({ title: "Failed to save group", variant: "destructive" });
    }
  }

  async function handleDeleteGroup() {
    if (!deleteGroupId) return;
    try {
      await deleteGroup.mutateAsync({ id: deleteGroupId });
      queryClient.invalidateQueries({ queryKey: getListProjectGroupsQueryKey() });
      toast({ title: "Group deleted" });
      setDeleteGroupId(null);
    } catch {
      toast({ title: "Failed to delete group", variant: "destructive" });
    }
  }

  async function handleSaveCategoryEdit() {
    if (!editCategoryId || !editCategoryName.trim()) return;
    setSavingCategory(true);
    try {
      const r = await fetch(`${BASE}/api/skill-categories/${editCategoryId}`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ name: editCategoryName.trim() }),
      });
      if (!r.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: getListSkillCategoriesQueryKey() });
      toast({ title: "Category renamed" });
      setEditCategoryId(null);
    } catch {
      toast({ title: "Failed to rename category", variant: "destructive" });
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleSaveRcu() {
    if (!rcuForm.userId || !rcuForm.country || !rcuForm.rate || !rcuForm.effectiveDate) return;
    try {
      if (editRcuId) {
        const r = await fetch(`${BASE}/api/resource-cost-rates/${editRcuId}`, {
          method: "PATCH",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ country: rcuForm.country, currency: rcuForm.currency, rate: parseFloat(rcuForm.rate), effectiveDate: rcuForm.effectiveDate }),
        });
        if (!r.ok) throw new Error();
        toast({ title: "Cost rate updated" });
      } else {
        const r = await fetch(`${BASE}/api/resource-cost-rates`, {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ userId: parseInt(rcuForm.userId), country: rcuForm.country, currency: rcuForm.currency, rate: parseFloat(rcuForm.rate), effectiveDate: rcuForm.effectiveDate }),
        });
        if (!r.ok) throw new Error();
        toast({ title: "Cost rate added" });
      }
      queryClient.invalidateQueries({ queryKey: ["resource-cost-rates"] });
      setRcuDialogOpen(false);
      setEditRcuId(null);
      setRcuForm({ userId: "", country: "", currency: "USD", rate: "", effectiveDate: "" });
    } catch {
      toast({ title: "Failed to save cost rate", variant: "destructive" });
    }
  }

  async function handleDeleteRcu() {
    if (!deleteRcuId) return;
    try {
      const r = await fetch(`${BASE}/api/resource-cost-rates/${deleteRcuId}`, { method: "DELETE", headers: authHeaders() });
      if (!r.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ["resource-cost-rates"] });
      toast({ title: "Cost rate deleted" });
      setDeleteRcuId(null);
    } catch {
      toast({ title: "Failed to delete cost rate", variant: "destructive" });
    }
  }

  async function handleCreateCategory() {
    if (!newCategoryName) return;
    try {
      await createCategory.mutateAsync({ data: { name: newCategoryName } });
      queryClient.invalidateQueries({ queryKey: getListSkillCategoriesQueryKey() });
      toast({ title: "Category created" });
      setCategoryDialogOpen(false);
      setNewCategoryName("");
    } catch {
      toast({ title: "Failed to create category", variant: "destructive" });
    }
  }

  async function handleDeleteCategory(id: number) {
    try {
      await deleteCategory.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListSkillCategoriesQueryKey() });
      toast({ title: "Category deleted" });
      setDeleteCategoryId(null);
    } catch {
      toast({ title: "Failed to delete category", variant: "destructive" });
    }
  }

  async function handleCreateSkill() {
    if (!newSkillName) return;
    try {
      await createSkill.mutateAsync({
        data: { name: newSkillName, categoryId: newSkillCategoryId ? parseInt(newSkillCategoryId) : undefined, section: newSkillSection || undefined, description: newSkillDescription || undefined } as any
      });
      queryClient.invalidateQueries({ queryKey: getListSkillsQueryKey() });
      toast({ title: "Skill created" });
      setSkillDialogOpen(false);
      setNewSkillName(""); setNewSkillCategoryId(""); setNewSkillType("Level"); setNewSkillSection(""); setNewSkillDescription("");
    } catch {
      toast({ title: "Failed to create skill", variant: "destructive" });
    }
  }

  async function handleDeleteSkill(id: number) {
    try {
      await deleteSkill.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListSkillsQueryKey() });
      toast({ title: "Skill deleted" });
      setDeleteSkillId(null);
    } catch {
      toast({ title: "Failed to delete skill", variant: "destructive" });
    }
  }

  async function handleSaveSkillEdit() {
    if (!editSkillId || !editSkillForm.name) return;
    const BASE = (typeof window !== "undefined" ? (window as any).__BASE_URL__ : "") || import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
    try {
      const r = await fetch(`${BASE}/api/skills/${editSkillId}`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: editSkillForm.name,
          categoryId: editSkillForm.categoryId ? parseInt(editSkillForm.categoryId) : undefined,
          skillType: editSkillForm.skillType,
          section: editSkillForm.section || undefined,
          description: editSkillForm.description || undefined,
        }),
      });
      if (!r.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: getListSkillsQueryKey() });
      toast({ title: "Skill updated" });
      setEditSkillId(null);
    } catch {
      toast({ title: "Failed to update skill", variant: "destructive" });
    }
  }

  async function handleRenameCalendar() {
    if (!renameCalendarId || !renameCalendarName) return;
    const BASE = (typeof window !== "undefined" ? (window as any).__BASE_URL__ : "") || import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
    setRenamingCalendar(true);
    try {
      const r = await fetch(`${BASE}/api/holiday-calendars/${renameCalendarId}`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ name: renameCalendarName, description: renameCalendarDesc || undefined }),
      });
      if (!r.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: getListHolidayCalendarsQueryKey() });
      toast({ title: "Calendar renamed" });
      setRenameCalendarId(null);
    } catch {
      toast({ title: "Failed to rename calendar", variant: "destructive" });
    } finally {
      setRenamingCalendar(false);
    }
  }

  async function handleSaveRateCard() {
    if (!rcForm.name) return;
    try {
      const payload = { name: rcForm.name, currency: rcForm.currency, status: rcForm.status, effectiveDate: rcForm.effectiveDate || undefined, roles: rcRoles };
      if (editRateCardId) {
        await updateRateCard.mutateAsync({ id: editRateCardId, data: payload });
      } else {
        await createRateCard.mutateAsync({ data: payload });
      }
      queryClient.invalidateQueries({ queryKey: getListRateCardsQueryKey() });
      toast({ title: editRateCardId ? "Rate card updated" : "Rate card created" });
      setRateCardDialogOpen(false);
      setEditRateCardId(null);
      setRcForm({ name: "", currency: "USD", status: "Active", effectiveDate: "" });
      setRcRoles([]);
      setRcNewRole({ role: "", rate: "" });
    } catch {
      toast({ title: "Failed to save rate card", variant: "destructive" });
    }
  }

  async function handleDeleteRateCard(id: number) {
    try {
      await deleteRateCard.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListRateCardsQueryKey() });
      toast({ title: "Rate card deleted" });
      setDeleteRateCardId(null);
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  }

  async function handleSaveCfDef() {
    if (!cfForm.name || !cfForm.entityType) return;
    const optionsArr = cfForm.options ? cfForm.options.split(",").map(s => s.trim()).filter(Boolean) : [];
    const payload: any = {
      entityType: cfForm.entityType,
      name: cfForm.name,
      fieldType: cfForm.fieldType,
      isRequired: cfForm.isRequired,
      options: optionsArr,
      description: cfForm.description || null,
      sectionId: cfForm.sectionId ? Number(cfForm.sectionId) : null,
      populationMethod: cfForm.populationMethod,
      inheritFromEntity: cfForm.inheritFromEntity || null,
      inheritFromFieldId: cfForm.inheritFromFieldId ? Number(cfForm.inheritFromFieldId) : null,
      fallbackValue: cfForm.fallbackValue || null,
    };
    try {
      if (editCfId) {
        await updateCfDef.mutateAsync({ id: editCfId, data: payload });
      } else {
        await createCfDef.mutateAsync({ data: payload });
      }
      queryClient.invalidateQueries({ queryKey: getListCustomFieldDefinitionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListCustomFieldDefinitionsQueryKey({ entityType: cfForm.entityType }) });
      toast({ title: editCfId ? "Field updated" : "Field created" });
      setCfDialogOpen(false);
      setEditCfId(null);
      setCfForm({ entityType: "project", name: "", fieldType: "text", isRequired: false, options: "", description: "", sectionId: "", populationMethod: "manual", inheritFromEntity: "", inheritFromFieldId: "", fallbackValue: "" });
    } catch {
      toast({ title: "Failed to save custom field", variant: "destructive" });
    }
  }

  async function handleDeleteCfDef(id: number, entityType: string) {
    try {
      await deleteCfDef.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListCustomFieldDefinitionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListCustomFieldDefinitionsQueryKey({ entityType }) });
      toast({ title: "Custom field deleted" });
      setDeleteCfId(null);
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  }

  const filteredSkills = filterCategoryId === "all"
    ? (skills ?? [])
    : (skills ?? []).filter(s => s.categoryId === parseInt(filterCategoryId));

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader
          title="Admin Settings"
          breadcrumbs={[{ label: "Admin" }]}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="mb-4">
            <TabsList className="flex flex-wrap h-auto gap-y-1 p-1">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Users
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <LayoutTemplate className="h-4 w-4" /> Project Templates
              </TabsTrigger>
              <TabsTrigger value="documenttemplates" className="flex items-center gap-2" data-testid="tab-document-templates">
                <FileText className="h-4 w-4" /> Document Templates
              </TabsTrigger>
              <TabsTrigger value="skills" className="flex items-center gap-2">
                <Cpu className="h-4 w-4" /> Skills Matrix
              </TabsTrigger>
              <TabsTrigger value="jobroles" className="flex items-center gap-2" onClick={fetchJobRoles}>
                <Briefcase className="h-4 w-4" /> Job Roles
              </TabsTrigger>
              <TabsTrigger value="taxcodes" className="flex items-center gap-2">
                <Percent className="h-4 w-4" /> Tax Codes
              </TabsTrigger>
              <TabsTrigger value="timecategories" className="flex items-center gap-2">
                <Clock className="h-4 w-4" /> Time Categories
              </TabsTrigger>
              <TabsTrigger value="taskstatuses" className="flex items-center gap-2" data-testid="tab-task-statuses">
                <ListTodo className="h-4 w-4" /> Task Statuses
              </TabsTrigger>
              <TabsTrigger value="timesettings" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" /> Time Settings
              </TabsTrigger>
              <TabsTrigger value="holidays" className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Holiday Calendars
              </TabsTrigger>
              {can(activeRole, "financials.viewRateCards") && (
                <TabsTrigger value="ratecards" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Rate Cards
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="users" className="m-0">
            <Tabs defaultValue="management">
              <TabsList className="mb-4">
                <TabsTrigger value="management" className="flex items-center gap-2">
                  <Users className="h-4 w-4" /> User Management
                </TabsTrigger>
                <TabsTrigger value="configuration" className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> User Configuration
                </TabsTrigger>
              </TabsList>

              <TabsContent value="management" className="m-0">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>User Management</CardTitle>
                      <CardDescription>Manage team members, roles, and permissions</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {canManageTeam && (
                        <Button size="sm" onClick={openAddUser}><Plus className="h-4 w-4 mr-2" /> Add User</Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingUsers ? (
                      <div className="space-y-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Cost Rate</TableHead>
                            <TableHead className="w-[90px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users?.map(user => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8"><AvatarFallback>{user.initials}</AvatarFallback></Avatar>
                                  {user.name}
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{user.email}</TableCell>
                              <TableCell>
                                {(() => {
                                  const userCanonical = resolveRole(user.role) as RoleValue;
                                  // Inline edit goes through PATCH /users/:id which is
                                  // gated by requireAdmin, so we restrict the dropdown
                                  // to account_admins to avoid a UI/backend 403 mismatch.
                                  // (When the matrix is extended to PATCH in a later
                                  // phase, this gate widens to `canManageTeam`.)
                                  const canEdit = isAccountAdmin && allowedAssignments.includes(userCanonical);
                                  if (!canEdit) {
                                    return <Badge variant="outline" className="font-normal">{user.role}</Badge>;
                                  }
                                  return (
                                    <Select
                                      value={userCanonical}
                                      onValueChange={(v) => changeRoleMut.mutate({ id: user.id, role: v as RoleValue })}
                                    >
                                      <SelectTrigger className="h-7 w-[140px] text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {(allowedAssignments as RoleValue[]).map(r => (
                                          <SelectItem key={r} value={r} className="text-xs">{ROLE_LABELS[r]}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  );
                                })()}
                              </TableCell>
                              <TableCell>{user.department}{(user as any).region ? <span className="text-muted-foreground ml-1 text-xs">· {(user as any).region}</span> : null}</TableCell>
                              <TableCell>
                                {(user as any).activeStatus === "on_leave" ? <Badge variant="secondary" className="text-xs">On Leave</Badge>
                                  : (user as any).activeStatus === "inactive" ? <Badge variant="secondary" className="text-xs text-muted-foreground">Inactive</Badge>
                                  : <Badge className="text-xs bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 border">Active</Badge>}
                                {(user as any).isInternal === false && <Badge variant="outline" className="text-xs ml-1">External</Badge>}
                              </TableCell>
                              <TableCell className="text-right">${user.costRate}/hr</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setSkillsUser({ id: user.id, name: user.name })}>
                                    <Star className="h-3.5 w-3.5 mr-1" /> Skills
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => openEditUser(user)}>
                                        <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                                      </DropdownMenuItem>
                                      {isAccountAdmin && (
                                        <>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem className="text-red-600" onClick={() => setUserDeleteId(user.id)}>
                                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
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

              <TabsContent value="configuration" className="m-0">
                <UserConfigTab users={users ?? []} BASE={BASE} onRefresh={() => queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() })} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="templates" className="m-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Project Templates</CardTitle>
                  <CardDescription>Reusable project structures for faster onboarding</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowArchived(p => !p)}>
                    <Archive className="h-4 w-4 mr-2" />{showArchived ? "Hide Archived" : "Show Archived"}
                  </Button>
                  <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> New Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingTemplates ? (
                  <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
                ) : (templates ?? []).filter((t: any) => showArchived || !t.isArchived).length === 0 ? (
                  <EmptyState icon={LayoutTemplate} title="No templates yet" description="Create templates to speed up project creation." />
                ) : (
                  <div className="space-y-3">
                    {(templates ?? []).filter((t: any) => showArchived || !t.isArchived).map((tmpl: any) => (
                      <div key={tmpl.id} className={`flex items-start justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors ${tmpl.isArchived ? "opacity-60" : ""}`}>
                        <div className="flex-1 space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{tmpl.name}</span>
                            <Badge variant="secondary" className="text-xs">{tmpl.billingType}</Badge>
                            {tmpl.isArchived && <Badge variant="outline" className="text-xs text-muted-foreground">Archived</Badge>}
                          </div>
                          {tmpl.description && <p className="text-sm text-muted-foreground">{tmpl.description}</p>}
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {tmpl.totalDurationDays} days total</span>
                            {tmpl.phases && (tmpl.phases as any[]).length > 0 && (
                              <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {(tmpl.phases as any[]).length} phases · {(tmpl.phases as any[]).reduce((n: number, p: any) => n + (p.tasks?.length ?? 0), 0)} tasks</span>
                            )}
                            <span className="text-muted-foreground/60">Created {tmpl.createdAt ? new Date(tmpl.createdAt).toLocaleDateString() : ""}</span>
                          </div>
                          {tmpl.phases && (tmpl.phases as any[]).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(tmpl.phases as any[]).map((ph: any, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs font-normal">{ph.name} <span className="text-muted-foreground ml-1">(+{ph.relativeStartOffset}–+{ph.relativeEndOffset}d)</span></Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-4">
                          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setSelectedTemplateId(tmpl.id)}>
                            <Pencil className="h-3.5 w-3.5" /> Open Editor
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-indigo-600" title="Edit metadata" onClick={() => { setEditTemplateId(tmpl.id); setEditTemplateForm({ name: tmpl.name, description: tmpl.description ?? "", billingType: tmpl.billingType ?? "Fixed" }); }}>
                            <Settings2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500" onClick={() => setDeleteDialogId(tmpl.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documenttemplates" className="m-0">
            <DocumentTemplatesPanel />
          </TabsContent>

          <TabsContent value="skills" className="m-0 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Tag className="h-4 w-4" /> Skill Categories</CardTitle>
                    <CardDescription>Organise skills by discipline</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setCategoryDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add Category
                  </Button>
                </CardHeader>
                <CardContent>
                  {isLoadingCategories ? (
                    <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                  ) : categories?.length === 0 ? (
                    <EmptyState icon={Tag} title="No categories yet" description="Add a category to group related skills." />
                  ) : (
                    <div className="space-y-2">
                      {categories?.map(cat => (
                        <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                          <div>
                            <span className="font-medium text-sm">{cat.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {skills?.filter(s => s.categoryId === cat.id).length ?? 0} skills
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-indigo-600" onClick={() => { setEditCategoryId(cat.id); setEditCategoryName(cat.name); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => setDeleteCategoryId(cat.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Star className="h-4 w-4" /> Skills</CardTitle>
                    <CardDescription>Individual skills assignable to team members</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => setSkillDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" /> Add Skill
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingSkills ? (
                    <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                  ) : filteredSkills.length === 0 ? (
                    <EmptyState icon={Star} title="No skills found" description="Add skills to match team members to project requirements." />
                  ) : (
                    <div className="space-y-2">
                      {filteredSkills.map(skill => {
                        const cat = categories?.find(c => c.id === skill.categoryId);
                        return (
                          <div key={skill.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{skill.name}</span>
                              {cat && <Badge variant="secondary" className="text-xs">{cat.name}</Badge>}
                              {!skill.isActive && <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>}
                            </div>
                            <div className="flex items-center gap-0.5">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-indigo-600" onClick={() => {
                                setEditSkillId(skill.id);
                                const s = skill as any; setEditSkillForm({ name: s.name, categoryId: s.categoryId ? String(s.categoryId) : "", skillType: s.skillType ?? "Level", section: s.section ?? "", description: s.description ?? "" });
                              }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => setDeleteSkillId(skill.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="jobroles" className="m-0">
            <Card className="max-w-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Job Roles</CardTitle>
                <CardDescription>Manage the list of configurable job roles available for team members, allocations, and resource requests.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Role name, e.g. Senior Developer"
                    value={newJobRoleName}
                    onChange={e => setNewJobRoleName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleCreateJobRole(); }}
                    className="flex-1"
                  />
                  <Button onClick={handleCreateJobRole} disabled={jobRoleSaving || !newJobRoleName.trim()}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                {jobRolesLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : jobRoles.length === 0 ? (
                  <EmptyState icon={Briefcase} title="No job roles defined yet" description="Add roles to use them as dropdowns in allocations and resource requests." />
                ) : (
                  <div className="divide-y border rounded-lg">
                    {jobRoles.map(role => (
                      <div key={role.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors">
                        <span className="text-sm font-medium">{role.name}</span>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => handleDeleteJobRole(role.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="taxcodes" className="m-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Percent className="h-4 w-4" /> Tax Codes</CardTitle>
                  <CardDescription>Configure GST, VAT, and other tax rates applied to invoices</CardDescription>
                </div>
                <Button size="sm" onClick={() => { setEditTaxCodeId(null); setTaxCodeForm({ name: "", rate: "", description: "", isDefault: false }); setTaxCodeDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Add Tax Code
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingTaxCodes ? (
                  <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : taxCodes?.length === 0 ? (
                  <EmptyState icon={Percent} title="No tax codes configured" description="Add tax codes to apply to invoices and billing." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead>Default</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-20" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {taxCodes?.map(tc => (
                        <TableRow key={tc.id}>
                          <TableCell className="font-medium">{tc.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{tc.description ?? "—"}</TableCell>
                          <TableCell className="text-right">{tc.rate}%</TableCell>
                          <TableCell>{tc.isDefault ? <Badge variant="secondary" className="text-xs">Default</Badge> : "—"}</TableCell>
                          <TableCell>
                            <Badge variant={tc.isActive ? "outline" : "secondary"} className="text-xs">
                              {tc.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                                setEditTaxCodeId(tc.id);
                                setTaxCodeForm({ name: tc.name, rate: String(tc.rate), description: tc.description ?? "", isDefault: tc.isDefault });
                                setTaxCodeDialogOpen(true);
                              }}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => setDeleteTaxCodeId(tc.id)}>
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

          <TabsContent value="timecategories" className="m-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" /> Time Categories</CardTitle>
                  <CardDescription>Define labels for time entries (e.g. Development, Design, Meetings)</CardDescription>
                </div>
                <Button size="sm" onClick={() => { setEditTimeCategoryId(null); setTimeCategoryForm({ name: "", description: "", defaultBillable: true }); setTimeCategoryDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Add Category
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingTimeCategories ? (
                  <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : timeCategories?.length === 0 ? (
                  <EmptyState icon={Clock} title="No time categories yet" description="Add categories to classify how time is logged." />
                ) : (
                  <div className="space-y-2">
                    {timeCategories?.map((tc, idx, arr) => (
                      <div key={tc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div>
                          <p className="font-medium text-sm">{tc.name}</p>
                          {tc.description && <p className="text-xs text-muted-foreground mt-0.5">{tc.description}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant={(tc as any).defaultBillable === false ? "secondary" : "outline"} className="text-xs mr-1">
                            {(tc as any).defaultBillable === false ? "Non-Billable" : "Billable"}
                          </Badge>
                          <Badge variant={tc.isActive ? "outline" : "secondary"} className="text-xs mr-1">
                            {tc.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={idx === 0} onClick={() => handleReorderTimeCategory(tc.id, -1)} title="Move up">
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={idx === arr.length - 1} onClick={() => handleReorderTimeCategory(tc.id, 1)} title="Move down">
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                            setEditTimeCategoryId(tc.id);
                            setTimeCategoryForm({ name: tc.name, description: tc.description ?? "", defaultBillable: (tc as any).defaultBillable !== false });
                            setTimeCategoryDialogOpen(true);
                          }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => setDeleteTimeCategoryId(tc.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="taskstatuses" className="m-0 space-y-4" data-testid="content-task-statuses">
            <TaskStatusesAdminPanel />
          </TabsContent>

          <TabsContent value="timesettings" className="m-0 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Time &amp; Timesheet Settings</CardTitle>
                  <CardDescription>Configure capacity, working days, approval rules, and period locking for your team.</CardDescription>
                </div>
                <Button size="sm" disabled={!timeSettingsDirty || saveTimeSettingsMut.isPending} onClick={() => saveTimeSettingsMut.mutate(timeSettingsForm)}>
                  Save Changes
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Weekly Capacity (hours)</Label>
                    <Input
                      type="number" min={1} max={80}
                      value={timeSettingsForm.weeklyCapacityHours}
                      onChange={e => { setTimeSettingsForm(f => ({ ...f, weeklyCapacityHours: parseInt(e.target.value) || 40 })); setTimeSettingsDirty(true); }}
                    />
                    <p className="text-xs text-muted-foreground">Default expected hours per person per week used in utilization calculations.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Timesheet Due Day</Label>
                    <Select value={timeSettingsForm.timesheetDueDay} onValueChange={v => { setTimeSettingsForm(f => ({ ...f, timesheetDueDay: v })); setTimeSettingsDirty(true); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Day of the week by which timesheets must be submitted.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Approval Mode</Label>
                    <Select value={timeSettingsForm.approvalMode} onValueChange={v => { setTimeSettingsForm(f => ({ ...f, approvalMode: v })); setTimeSettingsDirty(true); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Manual">Manual — manager reviews each submission</SelectItem>
                        <SelectItem value="Auto">Auto — approve on submission</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Auto-approve instantly locks the timesheet on submit.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Lock Periods Before Date</Label>
                    <Input
                      type="date"
                      value={timeSettingsForm.lockBeforeDate}
                      onChange={e => { setTimeSettingsForm(f => ({ ...f, lockBeforeDate: e.target.value })); setTimeSettingsDirty(true); }}
                    />
                    <p className="text-xs text-muted-foreground">Timesheets starting before this date will be read-only for all users.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Calendar Week Starts On</Label>
                    <Select value={String(timeSettingsForm.weekStartDay)} onValueChange={v => { setTimeSettingsForm(f => ({ ...f, weekStartDay: Number(v) })); setTimeSettingsDirty(true); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="0">Sunday</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">First column of the timesheet grid (Monday or Sunday).</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Minimum Hours to Submit</Label>
                    <Input
                      type="number" min={0} max={80}
                      value={timeSettingsForm.minSubmitHours}
                      onChange={e => { setTimeSettingsForm(f => ({ ...f, minSubmitHours: parseInt(e.target.value) || 0 })); setTimeSettingsDirty(true); }}
                    />
                    <p className="text-xs text-muted-foreground">Block submission if weekly hours logged are below this threshold. Set to 0 to disable.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Approver Routing</Label>
                    <Select value={timeSettingsForm.approverRoutingMode} onValueChange={v => { setTimeSettingsForm(f => ({ ...f, approverRoutingMode: v })); setTimeSettingsDirty(true); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin_default">Account Admins (default)</SelectItem>
                        <SelectItem value="designated">Designated Approver per Team Member</SelectItem>
                        <SelectItem value="project_owner">Project Owners (per project)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Who receives "approval requested" notifications when timesheets are submitted.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Working Days</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map(day => {
                      const active = timeSettingsForm.workingDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setTimeSettingsForm(f => ({
                              ...f,
                              workingDays: active ? f.workingDays.filter(d => d !== day) : [...f.workingDays, day],
                            }));
                            setTimeSettingsDirty(true);
                          }}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${active ? "bg-indigo-600 text-white border-indigo-600" : "bg-background text-muted-foreground border-border hover:bg-muted"}`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">Days shown as columns in the timesheet grid.</p>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-medium">Global Lock</p>
                    <p className="text-xs text-muted-foreground mt-0.5">When enabled, no timesheets can be edited regardless of date or status.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={timeSettingsForm.globalLockEnabled}
                    onClick={() => { setTimeSettingsForm(f => ({ ...f, globalLockEnabled: !f.globalLockEnabled })); setTimeSettingsDirty(true); }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${timeSettingsForm.globalLockEnabled ? "bg-indigo-600" : "bg-muted-foreground/30"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${timeSettingsForm.globalLockEnabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-medium">Lock on Approval</p>
                    <p className="text-xs text-muted-foreground mt-0.5">When enabled, team members cannot withdraw, edit, or resubmit a timesheet after it is approved. Admins remain exempt.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={timeSettingsForm.lockOnApprovalEnabled}
                    onClick={() => { setTimeSettingsForm(f => ({ ...f, lockOnApprovalEnabled: !f.lockOnApprovalEnabled })); setTimeSettingsDirty(true); }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${timeSettingsForm.lockOnApprovalEnabled ? "bg-indigo-600" : "bg-muted-foreground/30"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${timeSettingsForm.lockOnApprovalEnabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-medium">Status Lock (with Date Lock)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">When enabled, non-admins cannot submit, approve, reject, or withdraw entries dated on/before the Lock Date. Disables the "Change status of date-locked entries" override for non-admins.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={timeSettingsForm.statusLockEnabled}
                    onClick={() => { setTimeSettingsForm(f => ({ ...f, statusLockEnabled: !f.statusLockEnabled })); setTimeSettingsDirty(true); }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${timeSettingsForm.statusLockEnabled ? "bg-indigo-600" : "bg-muted-foreground/30"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${timeSettingsForm.statusLockEnabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>

                <Collapsible defaultOpen={false} className="rounded-lg border bg-muted/20">
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/40 transition-colors group">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Advanced settings</span>
                      <span className="text-xs text-muted-foreground">— role overrides, time-module config, and reporting</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4 pt-0 space-y-4">
                <div className="rounded-lg border p-4 space-y-3 bg-background">
                  <div>
                    <p className="text-sm font-medium">Date-Lock Override Roles</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Comma-separated role names that may bypass the Date Lock. Admin always exempt.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Can edit details of date-locked entries</Label>
                    <Input
                      value={timeSettingsForm.dateLockEditOverrideRoles}
                      onChange={e => { setTimeSettingsForm(f => ({ ...f, dateLockEditOverrideRoles: e.target.value })); setTimeSettingsDirty(true); }}
                      placeholder="e.g. PM, Finance"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Can change status of date-locked entries {timeSettingsForm.statusLockEnabled && <span className="text-amber-600 font-normal">(disabled — Status Lock is ON)</span>}</Label>
                    <Input
                      value={timeSettingsForm.dateLockStatusOverrideRoles}
                      onChange={e => { setTimeSettingsForm(f => ({ ...f, dateLockStatusOverrideRoles: e.target.value })); setTimeSettingsDirty(true); }}
                      placeholder="e.g. Finance"
                      disabled={timeSettingsForm.statusLockEnabled}
                    />
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-4 bg-background">
                  <div>
                    <p className="text-sm font-medium">Time Module Configuration</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Configuration-flexibility controls for the time module.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Track Time Against</Label>
                      <Select value={timeSettingsForm.trackTimeAgainst} onValueChange={v => { setTimeSettingsForm(f => ({ ...f, trackTimeAgainst: v })); setTimeSettingsDirty(true); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="task">Tasks only</SelectItem>
                          <SelectItem value="project">Projects only</SelectItem>
                          <SelectItem value="both">Tasks &amp; Projects</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Reporting Scope</Label>
                      <Select value={timeSettingsForm.reportingScope} onValueChange={v => { setTimeSettingsForm(f => ({ ...f, reportingScope: v })); setTimeSettingsDirty(true); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All entries</SelectItem>
                          <SelectItem value="approved">Approved only</SelectItem>
                          <SelectItem value="submitted">Submitted &amp; approved</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Timesheet Due Time</Label>
                      <Input type="time" value={timeSettingsForm.timesheetDueTime} onChange={e => { setTimeSettingsForm(f => ({ ...f, timesheetDueTime: e.target.value })); setTimeSettingsDirty(true); }} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Reminder Days Before Due</Label>
                      <Input type="number" min={0} max={14} value={timeSettingsForm.reminderDaysBefore} onChange={e => { setTimeSettingsForm(f => ({ ...f, reminderDaysBefore: parseInt(e.target.value) || 0 })); setTimeSettingsDirty(true); }} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Reminder Days After Due</Label>
                      <Input type="number" min={0} max={14} value={timeSettingsForm.reminderDaysAfter} onChange={e => { setTimeSettingsForm(f => ({ ...f, reminderDaysAfter: parseInt(e.target.value) || 0 })); setTimeSettingsDirty(true); }} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Maximum Hours per Submission</Label>
                      <Input type="number" min={0} value={timeSettingsForm.maxSubmitHours as any} onChange={e => { setTimeSettingsForm(f => ({ ...f, maxSubmitHours: e.target.value === "" ? "" : Number(e.target.value) })); setTimeSettingsDirty(true); }} placeholder="No maximum" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Exact Hours Required</Label>
                      <Input type="number" min={0} value={timeSettingsForm.exactSubmitHours as any} onChange={e => { setTimeSettingsForm(f => ({ ...f, exactSubmitHours: e.target.value === "" ? "" : Number(e.target.value) })); setTimeSettingsDirty(true); }} placeholder="Disabled" />
                      <p className="text-xs text-muted-foreground">If set, the timesheet total must equal this number of hours.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Rejected Hours Behavior</Label>
                      <Select value={timeSettingsForm.rejectedHoursBehavior} onValueChange={v => { setTimeSettingsForm(f => ({ ...f, rejectedHoursBehavior: v })); setTimeSettingsDirty(true); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="keep">Keep on timesheet (editable)</SelectItem>
                          <SelectItem value="remove">Remove from timesheet</SelectItem>
                          <SelectItem value="archive">Archive (read-only)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">Default Billable on New Entries</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Apply to new project entries when no other default fires (task/category/activity).</p>
                    </div>
                    <button type="button" role="switch" aria-checked={timeSettingsForm.defaultBillable}
                      onClick={() => { setTimeSettingsForm(f => ({ ...f, defaultBillable: !f.defaultBillable })); setTimeSettingsDirty(true); }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${timeSettingsForm.defaultBillable ? "bg-indigo-600" : "bg-muted-foreground/30"}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${timeSettingsForm.defaultBillable ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">Time Module Enabled</p>
                      <p className="text-xs text-muted-foreground mt-0.5">When off, time entry features are hidden across the app.</p>
                    </div>
                    <button type="button" role="switch" aria-checked={timeSettingsForm.moduleEnabled}
                      onClick={() => { setTimeSettingsForm(f => ({ ...f, moduleEnabled: !f.moduleEnabled })); setTimeSettingsDirty(true); }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${timeSettingsForm.moduleEnabled ? "bg-indigo-600" : "bg-muted-foreground/30"}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${timeSettingsForm.moduleEnabled ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                </div>
                  </CollapsibleContent>
                </Collapsible>

                {timeSettings && (
                  <p className="text-xs text-muted-foreground">Last saved: {new Date(timeSettings.updatedAt).toLocaleString()}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="holidays" className="m-0">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Holiday Calendars</CardTitle>
                    <CardDescription>Named calendars to block off non-working days</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setCalendarDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> New Calendar
                  </Button>
                </CardHeader>
                <CardContent>
                  {isLoadingHolidayCalendars ? (
                    <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                  ) : holidayCalendars?.length === 0 ? (
                    <EmptyState icon={CalendarDays} title="No calendars yet" description="Create a holiday calendar to track team time off." />
                  ) : (
                    <div className="space-y-2">
                      {holidayCalendars?.map(cal => (
                        <div
                          key={cal.id}
                          onClick={() => setSelectedCalendarId(cal.id === selectedCalendarId ? null : cal.id)}
                          className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedCalendarId === cal.id ? "border-indigo-400 bg-indigo-50" : "hover:bg-muted/30"}`}
                        >
                          <div>
                            <p className="font-medium text-sm">{cal.name}</p>
                            {cal.description && <p className="text-xs text-muted-foreground mt-0.5">{cal.description}</p>}
                            <p className="text-xs text-muted-foreground mt-0.5">{cal.holidays?.length ?? 0} holidays</p>
                          </div>
                          <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-indigo-600" onClick={(e) => { e.stopPropagation(); setRenameCalendarId(cal.id); setRenameCalendarName(cal.name); setRenameCalendarDesc(cal.description ?? ""); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={(e) => { e.stopPropagation(); setDeleteCalendarId(cal.id); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {selectedCalendarId
                        ? `${holidayCalendars?.find(c => c.id === selectedCalendarId)?.name ?? "Calendar"} — Holidays`
                        : "Holiday Dates"}
                    </CardTitle>
                    <CardDescription>
                      {selectedCalendarId ? "Dates when team is off" : "Select a calendar to manage its dates"}
                    </CardDescription>
                  </div>
                  {selectedCalendarId && (
                    <Button size="sm" onClick={() => setDateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" /> Add Holiday
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {!selectedCalendarId ? (
                    <EmptyState icon={CalendarDays} title="No calendar selected" description="Select a calendar on the left to manage its dates." />
                  ) : (holidayDates?.length ?? 0) === 0 ? (
                    <EmptyState icon={Calendar} title="No holidays added yet" description="Add holidays for this calendar." />
                  ) : (
                    <div className="space-y-2">
                      {holidayDates?.sort((a, b) => a.date.localeCompare(b.date)).map(d => (
                        <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg group">
                          <div>
                            <p className="text-sm font-medium">{d.name}</p>
                            <p className="text-xs text-muted-foreground">{new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                          </div>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500" onClick={() => handleDeleteHolidayDate(d.id)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ratecards" className="m-0 space-y-6">
            {can(activeRole, "financials.viewRateCards") && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Rate Cards</CardTitle>
                  <CardDescription>Define billing rates per role for projects and clients</CardDescription>
                </div>
                <Button size="sm" onClick={() => { setEditRateCardId(null); setRcForm({ name: "", currency: "USD", status: "Active", effectiveDate: "" }); setRcRoles([]); setRateCardDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> New Rate Card
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingRateCards ? (
                  <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : (rateCards?.length ?? 0) === 0 ? (
                  <EmptyState icon={CreditCard} title="No rate cards yet" description="Create rate cards to assign billing rates to project roles." />
                ) : (
                  <div className="space-y-3">
                    {rateCards?.map(rc => (
                      <div key={rc.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{rc.name}</span>
                            <Badge variant={rc.status === "Active" ? "secondary" : "outline"} className="text-xs">{rc.status}</Badge>
                            <Badge variant="outline" className="text-xs font-mono">{rc.currency}</Badge>
                            {rc.effectiveDate && <span className="text-xs text-muted-foreground">Effective {rc.effectiveDate}</span>}
                          </div>
                          {(rc.roles as { role: string; rate: number }[]).length > 0 ? (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {(rc.roles as { role: string; rate: number }[]).map((r, i) => (
                                <span key={i} className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-xs">
                                  <span className="font-medium">{r.role}</span>
                                  <ChevronRight className="h-3 w-3 opacity-40" />
                                  <span>${r.rate}/hr</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No role rates defined</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-4 shrink-0">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                            setEditRateCardId(rc.id);
                            setRcForm({ name: rc.name, currency: rc.currency ?? "USD", status: rc.status ?? "Active", effectiveDate: rc.effectiveDate ?? "" });
                            setRcRoles((rc.roles as { role: string; rate: number }[]) ?? []);
                            setRateCardDialogOpen(true);
                          }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => setDeleteRateCardId(rc.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            )}
            {can(activeRole, "financials.viewRateCards") && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Resource Cost Rates</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Define cost rates per resource, country and effective date.</p>
                  </div>
                  <Button size="sm" className="gap-2" onClick={() => { setEditRcuId(null); setRcuForm({ userId: "", country: "", currency: "USD", rate: "", effectiveDate: "" }); setRcuDialogOpen(true); }}>
                    <Plus className="h-4 w-4" /> Add Rate
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingRcu ? (
                  <div className="py-6 text-center text-muted-foreground text-sm">Loading…</div>
                ) : !resourceCostRates?.length ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">No cost rates configured.</div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium">User</th>
                          <th className="text-left px-4 py-2 font-medium">Country</th>
                          <th className="text-left px-4 py-2 font-medium">Currency</th>
                          <th className="text-right px-4 py-2 font-medium">Rate/hr</th>
                          <th className="text-left px-4 py-2 font-medium">Effective</th>
                          <th className="px-2 py-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {resourceCostRates.map((rcu: any) => {
                          const u = users?.find((x: any) => x.id === rcu.userId);
                          return (
                            <tr key={rcu.id} className="hover:bg-muted/30">
                              <td className="px-4 py-2">{u ? u.name : `User #${rcu.userId}`}</td>
                              <td className="px-4 py-2">{rcu.country}</td>
                              <td className="px-4 py-2">{rcu.currency}</td>
                              <td className="px-4 py-2 text-right">{Number(rcu.rate).toFixed(2)}</td>
                              <td className="px-4 py-2">{rcu.effectiveDate}</td>
                              <td className="px-2 py-2">
                                <div className="flex items-center gap-0.5 justify-end">
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-indigo-600" onClick={() => { setEditRcuId(rcu.id); setRcuForm({ userId: String(rcu.userId), country: rcu.country, currency: rcu.currency, rate: String(rcu.rate), effectiveDate: rcu.effectiveDate }); setRcuDialogOpen(true); }}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => setDeleteRcuId(rcu.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
            )}
          </TabsContent>

          <TabsContent value="customfields" className="m-0">
            <Tabs defaultValue="fields">
              <TabsList className="mb-4">
                <TabsTrigger value="fields"><SlidersHorizontal className="h-4 w-4 mr-2" /> Fields</TabsTrigger>
                <TabsTrigger value="sections"><Folder className="h-4 w-4 mr-2" /> Sections</TabsTrigger>
              </TabsList>

              <TabsContent value="sections" className="m-0">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2"><Folder className="h-4 w-4" /> Sections</CardTitle>
                      <CardDescription>Group custom fields and control which roles can view or edit them. Mandatory fields apply even if the section is hidden.</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => { setEditSectionId(null); setSectionForm({ entityType: "time_entry", name: "", description: "", viewRoles: "", editRoles: "", isActive: true }); setSectionDialogOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" /> Add Section
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {(cfSections?.length ?? 0) === 0 ? (
                      <EmptyState icon={Folder} title="No sections yet" description="Create a section to group custom fields by role permissions." />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Entity</TableHead>
                            <TableHead>Section</TableHead>
                            <TableHead>View Roles</TableHead>
                            <TableHead>Edit Roles</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-20" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(cfSections ?? []).map((s: any) => (
                            <TableRow key={s.id}>
                              <TableCell><Badge variant="outline" className="text-xs capitalize">{s.entityType.replace("_", " ")}</Badge></TableCell>
                              <TableCell>
                                <p className="font-medium text-sm">{s.name}</p>
                                {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{s.viewRoles || "All"}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{s.editRoles || "All"}</TableCell>
                              <TableCell><Badge variant={s.isActive ? "outline" : "secondary"} className="text-xs">{s.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                                    setEditSectionId(s.id);
                                    setSectionForm({ entityType: s.entityType, name: s.name, description: s.description ?? "", viewRoles: s.viewRoles ?? "", editRoles: s.editRoles ?? "", isActive: !!s.isActive });
                                    setSectionDialogOpen(true);
                                  }}><Pencil className="h-3.5 w-3.5" /></Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => setDeleteSectionId(s.id)}>
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

              <TabsContent value="fields" className="m-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /> Custom Fields</CardTitle>
                  <CardDescription>Define extra fields that appear on projects, tasks, time entries, and accounts</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={cfEntityFilter} onValueChange={setCfEntityFilter}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue placeholder="All entities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All entities</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                      <SelectItem value="time_entry">Time Entry</SelectItem>
                      <SelectItem value="account">Account</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => { setEditCfId(null); setCfForm({ entityType: cfEntityFilter !== "all" ? cfEntityFilter : "project", name: "", fieldType: "text", isRequired: false, options: "", description: "", sectionId: "", populationMethod: "manual", inheritFromEntity: "", inheritFromFieldId: "", fallbackValue: "" }); setCfDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Add Field
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingCf ? (
                  <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : (cfDefinitions?.length ?? 0) === 0 ? (
                  <EmptyState icon={SlidersHorizontal} title="No custom fields defined" description="Add fields to capture extra information on projects and tasks." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entity</TableHead>
                        <TableHead>Field Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Required</TableHead>
                        <TableHead>Options</TableHead>
                        <TableHead className="w-20" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cfDefinitions?.map(cf => (
                        <TableRow key={cf.id}>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">{cf.entityType}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{cf.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs capitalize">{cf.fieldType}</Badge>
                          </TableCell>
                          <TableCell>
                            {cf.isRequired ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {cf.options && cf.options.length > 0 ? cf.options.join(", ") : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                                setEditCfId(cf.id);
                                setCfForm({
                                  entityType: cf.entityType,
                                  name: cf.name,
                                  fieldType: cf.fieldType,
                                  isRequired: cf.isRequired,
                                  options: cf.options?.join(", ") ?? "",
                                  description: (cf as any).description ?? "",
                                  sectionId: (cf as any).sectionId ? String((cf as any).sectionId) : "",
                                  populationMethod: (cf as any).populationMethod ?? "manual",
                                  inheritFromEntity: (cf as any).inheritFromEntity ?? "",
                                  inheritFromFieldId: (cf as any).inheritFromFieldId ? String((cf as any).inheritFromFieldId) : "",
                                  fallbackValue: (cf as any).fallbackValue ?? "",
                                });
                                setCfDialogOpen(true);
                              }}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => setDeleteCfId(cf.id)}>
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
            </Tabs>
          </TabsContent>

          <TabsContent value="activitydefaults" className="m-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Zap className="h-4 w-4" /> Activity Defaults</CardTitle>
                  <CardDescription>Predefined activity names with default billable + category. Applied when a user logs time using one of these activities (and the field hasn't already been set by task or project defaults).</CardDescription>
                </div>
                <Button size="sm" onClick={() => { setEditActivityId(null); setActivityForm({ activityName: "", billable: false, categoryId: "", isActive: true }); setActivityDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Add Activity
                </Button>
              </CardHeader>
              <CardContent>
                {(activityDefaults?.length ?? 0) === 0 ? (
                  <EmptyState icon={Zap} title="No activity defaults configured" description="Add activity defaults to pre-fill billable/category on time entries." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Activity Name</TableHead>
                        <TableHead>Billable</TableHead>
                        <TableHead>Default Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-20" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(activityDefaults ?? []).map((a: any) => {
                        const cat = (timeCategories ?? []).find((c: any) => c.id === a.categoryId);
                        return (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">{a.activityName}</TableCell>
                            <TableCell>
                              <Badge variant={a.billable ? "outline" : "secondary"} className="text-xs">{a.billable ? "Billable" : "Non-Billable"}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{cat ? cat.name : "—"}</TableCell>
                            <TableCell><Badge variant={a.isActive ? "outline" : "secondary"} className="text-xs">{a.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                                  setEditActivityId(a.id);
                                  setActivityForm({ activityName: a.activityName, billable: !!a.billable, categoryId: a.categoryId ? String(a.categoryId) : "", isActive: !!a.isActive });
                                  setActivityDialogOpen(true);
                                }}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => setDeleteActivityId(a.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="placeholders" className="m-0">
            <PlaceholdersCatalog base={BASE} />
          </TabsContent>

          <TabsContent value="auditlog" className="m-0">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" /> Audit Log</CardTitle>
                    <CardDescription>System-wide record of all significant changes</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Select value={auditEntityFilter} onValueChange={setAuditEntityFilter}>
                      <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="All entities" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All entities</SelectItem>
                        <SelectItem value="project">Projects</SelectItem>
                        <SelectItem value="task">Tasks</SelectItem>
                        <SelectItem value="invoice">Invoices</SelectItem>
                        <SelectItem value="timesheet">Timesheets</SelectItem>
                        <SelectItem value="allocation">Allocations</SelectItem>
                        <SelectItem value="user">Users</SelectItem>
                        <SelectItem value="opportunity">Opportunities</SelectItem>
                        <SelectItem value="project_risk">RAID Items</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={auditActionFilter} onValueChange={setAuditActionFilter}>
                      <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="All actions" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All actions</SelectItem>
                        <SelectItem value="created">Created</SelectItem>
                        <SelectItem value="updated">Updated</SelectItem>
                        <SelectItem value="deleted">Deleted</SelectItem>
                        <SelectItem value="status_changed">Status changed</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <input type="date" value={auditDateFrom} onChange={e => setAuditDateFrom(e.target.value)} className="h-8 text-xs px-2 rounded-md border border-input bg-background text-foreground" title="From date" />
                    <input type="date" value={auditDateTo} onChange={e => setAuditDateTo(e.target.value)} className="h-8 text-xs px-2 rounded-md border border-input bg-background text-foreground" title="To date" />
                    {(auditEntityFilter !== "all" || auditActionFilter !== "all" || auditDateFrom || auditDateTo) && (
                      <button onClick={() => { setAuditEntityFilter("all"); setAuditActionFilter("all"); setAuditDateFrom(""); setAuditDateTo(""); }} className="h-8 px-2 text-xs rounded-md border border-input hover:bg-muted text-muted-foreground">Clear</button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingAudit ? (
                  <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : (auditEntries?.length ?? 0) === 0 ? (
                  <EmptyState icon={Activity} title="No audit entries yet" description="Changes to projects, tasks, invoices, and users will appear here." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Actor</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(auditEntries as any[])?.map((entry: any) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(entry.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs capitalize">{entry.entityType}</Badge>
                              <span className="text-xs text-muted-foreground">#{entry.entityId}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={entry.action === "DELETE" ? "destructive" : entry.action === "CREATE" ? "secondary" : "outline"} className="text-xs">
                              {entry.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{entry.actorName ?? "System"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{entry.description ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="m-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>Used on invoices and reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-full space-y-1.5">
                    <Label>Company Name *</Label>
                    <Input value={companyForm.name} onChange={e => { setCompanyForm(f => ({ ...f, name: e.target.value })); setCompanyFormDirty(true); }} />
                  </div>
                  <div className="col-span-full space-y-1.5">
                    <Label>Address</Label>
                    <Textarea rows={2} value={companyForm.address} onChange={e => { setCompanyForm(f => ({ ...f, address: e.target.value })); setCompanyFormDirty(true); }} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Logo URL</Label>
                    <Input placeholder="https://example.com/logo.png" value={companyForm.logoUrl} onChange={e => { setCompanyForm(f => ({ ...f, logoUrl: e.target.value })); setCompanyFormDirty(true); }} />
                    {companyForm.logoUrl && <img src={companyForm.logoUrl} alt="Logo preview" className="h-8 mt-1 rounded object-contain border" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Brand Colour</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={companyForm.primaryColor || "#6366f1"} onChange={e => { setCompanyForm(f => ({ ...f, primaryColor: e.target.value })); setCompanyFormDirty(true); }} className="h-9 w-12 cursor-pointer rounded border border-input" />
                      <Input placeholder="#6366f1" value={companyForm.primaryColor} onChange={e => { setCompanyForm(f => ({ ...f, primaryColor: e.target.value })); setCompanyFormDirty(true); }} className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Website</Label>
                    <Input placeholder="https://example.com" value={companyForm.website} onChange={e => { setCompanyForm(f => ({ ...f, website: e.target.value })); setCompanyFormDirty(true); }} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input placeholder="+1 416-555-0100" value={companyForm.phone} onChange={e => { setCompanyForm(f => ({ ...f, phone: e.target.value })); setCompanyFormDirty(true); }} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Timezone</Label>
                    <Select value={companyForm.timezone} onValueChange={v => { setCompanyForm(f => ({ ...f, timezone: v })); setCompanyFormDirty(true); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Toronto">America/Toronto (ET)</SelectItem>
                        <SelectItem value="America/New_York">America/New_York (ET)</SelectItem>
                        <SelectItem value="America/Chicago">America/Chicago (CT)</SelectItem>
                        <SelectItem value="America/Denver">America/Denver (MT)</SelectItem>
                        <SelectItem value="America/Los_Angeles">America/Los_Angeles (PT)</SelectItem>
                        <SelectItem value="America/Vancouver">America/Vancouver (PT)</SelectItem>
                        <SelectItem value="Europe/London">Europe/London (GMT/BST)</SelectItem>
                        <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Currency</Label>
                    <Select value={companyForm.currency} onValueChange={v => { setCompanyForm(f => ({ ...f, currency: v })); setCompanyFormDirty(true); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CAD">CAD — Canadian Dollar</SelectItem>
                        <SelectItem value="USD">USD — US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR — Euro</SelectItem>
                        <SelectItem value="GBP">GBP — British Pound</SelectItem>
                        <SelectItem value="INR">INR — Indian Rupee</SelectItem>
                        <SelectItem value="AUD">AUD — Australian Dollar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fiscal Year Start</Label>
                    <Select value={companyForm.fiscalYearStart} onValueChange={v => { setCompanyForm(f => ({ ...f, fiscalYearStart: v })); setCompanyFormDirty(true); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="01-01">January 1</SelectItem>
                        <SelectItem value="04-01">April 1</SelectItem>
                        <SelectItem value="07-01">July 1</SelectItem>
                        <SelectItem value="10-01">October 1</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <Button onClick={() => saveCompanyMut.mutate(companyForm)} disabled={saveCompanyMut.isPending || !companyFormDirty}>
                    {saveCompanyMut.isPending ? "Saving…" : "Save Settings"}
                  </Button>
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="archived" className="m-0">
            <Card>
              <CardHeader>
                <CardTitle>Archived Projects</CardTitle>
                <CardDescription>Projects that have been soft-deleted. Restore to make them active again.</CardDescription>
              </CardHeader>
              <CardContent>
                {(deletedProjects?.length ?? 0) === 0 ? (
                  <EmptyState icon={RotateCcw} title="No archived projects" description="Projects that are soft-deleted will appear here for restoration." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project Name</TableHead>
                        <TableHead>Archived On</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deletedProjects?.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {p.deletedAt ? new Date(p.deletedAt).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => restoreProjectMut.mutate(p.id)} disabled={restoreProjectMut.isPending}>
                              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restore
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
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Project Template</DialogTitle><DialogDescription>Define a reusable project structure for the team.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Template Name *</Label>
              <Input placeholder="e.g. ERP Implementation" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="Brief description of this template..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Billing Type</Label>
                <Select value={form.billingType} onValueChange={v => setForm(f => ({ ...f, billingType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fixed Fee">Fixed Fee</SelectItem>
                    <SelectItem value="Time & Materials">Time &amp; Materials</SelectItem>
                    <SelectItem value="Retainer">Retainer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Duration (days)</Label>
                <Input type="number" min={1} value={form.totalDurationDays} onChange={e => setForm(f => ({ ...f, totalDurationDays: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.name || createTemplate.isPending}>
              {createTemplate.isPending ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteDialogId} onOpenChange={() => setDeleteDialogId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Template</DialogTitle><DialogDescription>This will permanently remove the template. Projects created from it will not be affected.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteDialogId && handleDelete(deleteDialogId)} disabled={deleteTemplate.isPending}>
              {deleteTemplate.isPending ? "Deleting..." : "Delete Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!selectedTemplateId} onOpenChange={open => { if (!open) setSelectedTemplateId(null); }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Template Editor</SheetTitle>
          </SheetHeader>
          {selectedTemplateId && (
            <TemplateEditor templateId={selectedTemplateId} onClose={() => setSelectedTemplateId(null)} />
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Skill Category</DialogTitle><DialogDescription>Group related skills under a category.</DialogDescription></DialogHeader>
          <div className="space-y-1.5">
            <Label>Category Name *</Label>
            <Input placeholder="e.g. Frontend, Cloud, Data Science" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCategory} disabled={!newCategoryName || createCategory.isPending}>
              {createCategory.isPending ? "Creating…" : "Add Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteCategoryId} onOpenChange={() => setDeleteCategoryId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Category</DialogTitle><DialogDescription>All skills in this category will be orphaned.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCategoryId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteCategoryId && handleDeleteCategory(deleteCategoryId)} disabled={deleteCategory.isPending}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={skillDialogOpen} onOpenChange={setSkillDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Skill</DialogTitle><DialogDescription>Add a skill that can be assigned to team members.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Skill Name *</Label>
              <Input placeholder="e.g. React, AWS, SQL" value={newSkillName} onChange={e => setNewSkillName(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={newSkillCategoryId} onValueChange={setNewSkillCategoryId}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    {categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={newSkillType} onValueChange={setNewSkillType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Level">Level (Beginner–Expert)</SelectItem>
                    <SelectItem value="Yes-No">Yes / No</SelectItem>
                    <SelectItem value="Number">Number</SelectItem>
                    <SelectItem value="Single-Choice">Single Choice</SelectItem>
                    <SelectItem value="Multiple-Choice">Multiple Choice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Section <span className="text-muted-foreground text-xs">(optional grouping within category)</span></Label>
              <Input placeholder="e.g. Frontend, Cloud, Leadership" value={newSkillSection} onChange={e => setNewSkillSection(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input placeholder="Brief description of this skill" value={newSkillDescription} onChange={e => setNewSkillDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkillDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSkill} disabled={!newSkillName || createSkill.isPending}>
              {createSkill.isPending ? "Adding…" : "Add Skill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editSkillId} onOpenChange={(o) => { if (!o) setEditSkillId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Skill</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Skill Name *</Label>
              <Input value={editSkillForm.name} onChange={e => setEditSkillForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={editSkillForm.categoryId || "none"} onValueChange={v => setEditSkillForm(f => ({ ...f, categoryId: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {(categories ?? []).map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Skill Type</Label>
                <Select value={editSkillForm.skillType} onValueChange={v => setEditSkillForm(f => ({ ...f, skillType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Level">Level</SelectItem>
                    <SelectItem value="Certification">Certification</SelectItem>
                    <SelectItem value="Language">Language</SelectItem>
                    <SelectItem value="Domain">Domain</SelectItem>
                    <SelectItem value="Tool">Tool</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Section</Label>
              <Input placeholder="Optional grouping section" value={editSkillForm.section} onChange={e => setEditSkillForm(f => ({ ...f, section: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Optional description" value={editSkillForm.description} onChange={e => setEditSkillForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSkillId(null)}>Cancel</Button>
            <Button onClick={handleSaveSkillEdit} disabled={!editSkillForm.name}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteSkillId} onOpenChange={() => setDeleteSkillId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Skill</DialogTitle><DialogDescription>This skill will be removed from all team members.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSkillId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteSkillId && handleDeleteSkill(deleteSkillId)} disabled={deleteSkill.isPending}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={taxCodeDialogOpen} onOpenChange={(open) => { setTaxCodeDialogOpen(open); if (!open) setEditTaxCodeId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTaxCodeId ? "Edit Tax Code" : "Add Tax Code"}</DialogTitle>
            <DialogDescription>Define a tax rate to apply on invoices and line items.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input placeholder="e.g. GST 10%" value={taxCodeForm.name} onChange={e => setTaxCodeForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Rate (%) *</Label>
                <Input type="number" step="0.01" placeholder="e.g. 10" value={taxCodeForm.rate} onChange={e => setTaxCodeForm(f => ({ ...f, rate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Optional description" value={taxCodeForm.description} onChange={e => setTaxCodeForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={taxCodeForm.isDefault} onChange={e => setTaxCodeForm(f => ({ ...f, isDefault: e.target.checked }))} className="rounded" />
              <span className="text-sm">Set as default tax code</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaxCodeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTaxCode} disabled={!taxCodeForm.name || !taxCodeForm.rate}>
              {editTaxCodeId ? "Save Changes" : "Add Tax Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTaxCodeId} onOpenChange={() => setDeleteTaxCodeId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Tax Code</DialogTitle><DialogDescription>This will permanently remove this tax code.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTaxCodeId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTaxCodeId && handleDeleteTaxCode(deleteTaxCodeId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={timeCategoryDialogOpen} onOpenChange={(open) => { setTimeCategoryDialogOpen(open); if (!open) setEditTimeCategoryId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTimeCategoryId ? "Edit Time Category" : "Add Time Category"}</DialogTitle>
            <DialogDescription>Define a label for classifying time entries in timesheets.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input placeholder="e.g. Development, Design, Meetings" value={timeCategoryForm.name} onChange={e => setTimeCategoryForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="Optional description" value={timeCategoryForm.description} onChange={e => setTimeCategoryForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={timeCategoryForm.defaultBillable} onChange={e => setTimeCategoryForm(f => ({ ...f, defaultBillable: e.target.checked }))} className="rounded" />
              <span className="text-sm">Billable by default — entries using this category are marked billable unless overridden by task or activity defaults.</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTimeCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTimeCategory} disabled={!timeCategoryForm.name}>
              {editTimeCategoryId ? "Save Changes" : "Add Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTimeCategoryId} onOpenChange={() => setDeleteTimeCategoryId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Time Category</DialogTitle><DialogDescription>This category will no longer be available for new time entries.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTimeCategoryId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTimeCategoryId && handleDeleteTimeCategory(deleteTimeCategoryId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={calendarDialogOpen} onOpenChange={setCalendarDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Holiday Calendar</DialogTitle><DialogDescription>Create a named calendar to track company or regional holidays.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Calendar Name *</Label>
              <Input placeholder="e.g. Australia Public Holidays" value={newCalendarName} onChange={e => setNewCalendarName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Optional description" value={newCalendarDesc} onChange={e => setNewCalendarDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCalendarDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCalendar} disabled={!newCalendarName}>Create Calendar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameCalendarId} onOpenChange={(o) => { if (!o) setRenameCalendarId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Calendar</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Calendar Name *</Label>
              <Input value={renameCalendarName} onChange={e => setRenameCalendarName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Optional description" value={renameCalendarDesc} onChange={e => setRenameCalendarDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameCalendarId(null)}>Cancel</Button>
            <Button onClick={handleRenameCalendar} disabled={!renameCalendarName || renamingCalendar}>
              {renamingCalendar ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteCalendarId} onOpenChange={() => setDeleteCalendarId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Calendar</DialogTitle><DialogDescription>All holiday dates in this calendar will also be removed.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCalendarId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteCalendarId && handleDeleteCalendar(deleteCalendarId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dateDialogOpen} onOpenChange={setDateDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Holiday Date</DialogTitle><DialogDescription>Add a non-working day to the selected calendar.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Holiday Name *</Label>
              <Input placeholder="e.g. Christmas Day" value={newDateName} onChange={e => setNewDateName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={newDateValue} onChange={e => setNewDateValue(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddHolidayDate} disabled={!newDateName || !newDateValue}>Add Holiday</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rateCardDialogOpen} onOpenChange={(open) => { setRateCardDialogOpen(open); if (!open) setEditRateCardId(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editRateCardId ? "Edit Rate Card" : "New Rate Card"}</DialogTitle>
            <DialogDescription>Define billing rates for each role in this rate card.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Name *</Label>
                <Input placeholder="e.g. Standard 2025" value={rcForm.name} onChange={e => setRcForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={rcForm.currency} onValueChange={v => setRcForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="SGD">SGD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={rcForm.status} onValueChange={v => setRcForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-full">
                <Label>Effective Date</Label>
                <Input type="date" value={rcForm.effectiveDate} onChange={e => setRcForm(f => ({ ...f, effectiveDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role Rates</Label>
              <div className="border rounded-lg overflow-hidden">
                {rcRoles.length > 0 && (
                  <div className="divide-y">
                    {rcRoles.map((r, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="font-medium">{r.role}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">${r.rate}/hr</span>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500" onClick={() => setRcRoles(prev => prev.filter((_, idx) => idx !== i))}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 p-2 bg-muted/30">
                  <Input placeholder="Role name" className="h-8 text-sm" value={rcNewRole.role} onChange={e => setRcNewRole(r => ({ ...r, role: e.target.value }))} />
                  <Input placeholder="Rate/hr" type="number" className="h-8 text-sm w-24" value={rcNewRole.rate} onChange={e => setRcNewRole(r => ({ ...r, rate: e.target.value }))} />
                  <Button size="sm" variant="outline" className="h-8" onClick={() => {
                    if (!rcNewRole.role || !rcNewRole.rate) return;
                    setRcRoles(prev => [...prev, { role: rcNewRole.role, rate: parseFloat(rcNewRole.rate) }]);
                    setRcNewRole({ role: "", rate: "" });
                  }}>Add</Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRateCardDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRateCard} disabled={!rcForm.name || createRateCard.isPending || updateRateCard.isPending}>
              {editRateCardId ? "Save Changes" : "Create Rate Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteRateCardId} onOpenChange={() => setDeleteRateCardId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Rate Card</DialogTitle><DialogDescription>This will permanently remove this rate card. Projects using it will not be affected.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRateCardId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteRateCardId && handleDeleteRateCard(deleteRateCardId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skill category edit dialog */}
      <Dialog open={!!editCategoryId} onOpenChange={(o) => { if (!o) setEditCategoryId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Category</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={editCategoryName} onChange={e => setEditCategoryName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSaveCategoryEdit()} autoFocus />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCategoryId(null)}>Cancel</Button>
            <Button onClick={handleSaveCategoryEdit} disabled={!editCategoryName.trim() || savingCategory}>
              {savingCategory ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project template metadata edit dialog */}
      <Dialog open={!!editTemplateId} onOpenChange={(o) => { if (!o) setEditTemplateId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Template</DialogTitle><DialogDescription>Update the template name, description and billing type.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={editTemplateForm.name} onChange={e => setEditTemplateForm(f => ({ ...f, name: e.target.value }))} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={editTemplateForm.description} onChange={e => setEditTemplateForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
            </div>
            <div className="space-y-1.5">
              <Label>Billing Type</Label>
              <Select value={editTemplateForm.billingType} onValueChange={v => setEditTemplateForm(f => ({ ...f, billingType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fixed">Fixed</SelectItem>
                  <SelectItem value="TimeAndMaterials">Time &amp; Materials</SelectItem>
                  <SelectItem value="Retainer">Retainer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTemplateId(null)}>Cancel</Button>
            <Button onClick={handleSaveTemplateEdit} disabled={!editTemplateForm.name || updateTemplate.isPending}>
              {updateTemplate.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project group create/edit dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={(o) => { setGroupDialogOpen(o); if (!o) { setEditGroupId(null); setGroupForm({ name: "", color: "" }); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editGroupId ? "Edit Group" : "New Project Group"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Colour label</Label>
              <div className="flex items-center gap-3">
                <Input type="color" className="h-9 w-16 p-1 cursor-pointer" value={groupForm.color || "#6366f1"} onChange={e => setGroupForm(f => ({ ...f, color: e.target.value }))} />
                <Input value={groupForm.color} onChange={e => setGroupForm(f => ({ ...f, color: e.target.value }))} placeholder="#rrggbb (optional)" className="flex-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveGroup} disabled={!groupForm.name || createGroup.isPending || updateGroup.isPending}>
              {createGroup.isPending || updateGroup.isPending ? "Saving…" : editGroupId ? "Save Changes" : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project group delete confirm */}
      <Dialog open={!!deleteGroupId} onOpenChange={() => setDeleteGroupId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Group</DialogTitle><DialogDescription>Projects in this group will be ungrouped but not deleted.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteGroupId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteGroup} disabled={deleteGroup.isPending}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resource cost rate create/edit dialog */}
      <Dialog open={rcuDialogOpen} onOpenChange={(o) => { setRcuDialogOpen(o); if (!o) { setEditRcuId(null); setRcuForm({ userId: "", country: "", currency: "USD", rate: "", effectiveDate: "" }); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editRcuId ? "Edit Cost Rate" : "Add Cost Rate"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            {!editRcuId && (
              <div className="space-y-1.5">
                <Label>User *</Label>
                <Select value={rcuForm.userId} onValueChange={v => setRcuForm(f => ({ ...f, userId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select user…" /></SelectTrigger>
                  <SelectContent>
                    {users?.map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Country *</Label>
                <Input value={rcuForm.country} onChange={e => setRcuForm(f => ({ ...f, country: e.target.value }))} placeholder="e.g. US" />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={rcuForm.currency} onValueChange={v => setRcuForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["USD","EUR","GBP","AUD","CAD","SGD","INR"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Rate / hr *</Label>
                <Input type="number" min="0" step="0.01" value={rcuForm.rate} onChange={e => setRcuForm(f => ({ ...f, rate: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Effective Date *</Label>
                <Input type="date" value={rcuForm.effectiveDate} onChange={e => setRcuForm(f => ({ ...f, effectiveDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRcuDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRcu} disabled={(!editRcuId && !rcuForm.userId) || !rcuForm.country || !rcuForm.rate || !rcuForm.effectiveDate}>
              {editRcuId ? "Save Changes" : "Add Rate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resource cost rate delete confirm */}
      <Dialog open={!!deleteRcuId} onOpenChange={() => setDeleteRcuId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Cost Rate</DialogTitle><DialogDescription>This will permanently remove this cost rate record.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRcuId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteRcu}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cfDialogOpen} onOpenChange={(open) => { setCfDialogOpen(open); if (!open) setEditCfId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCfId ? "Edit Custom Field" : "Add Custom Field"}</DialogTitle>
            <DialogDescription>Define a field that will appear on the selected entity type.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Entity Type *</Label>
                <Select value={cfForm.entityType} onValueChange={v => setCfForm(f => ({ ...f, entityType: v, sectionId: "" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="time_entry">Time Entry</SelectItem>
                    <SelectItem value="account">Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Field Type *</Label>
                <Select value={cfForm.fieldType} onValueChange={v => setCfForm(f => ({ ...f, fieldType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="boolean">Yes/No</SelectItem>
                    <SelectItem value="select">Dropdown</SelectItem>
                    <SelectItem value="textarea">Long Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Field Name *</Label>
              <Input placeholder="e.g. Jira Ticket ID, Priority Score" value={cfForm.name} onChange={e => setCfForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Optional helper text shown next to the field" value={cfForm.description} onChange={e => setCfForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Section</Label>
                <Select value={cfForm.sectionId || "__none"} onValueChange={v => setCfForm(f => ({ ...f, sectionId: v === "__none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="No section" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">No section</SelectItem>
                    {(cfSections ?? []).filter(s => s.entityType === cfForm.entityType).map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Sections control role-based visibility &amp; edit permissions.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Population</Label>
                <Select value={cfForm.populationMethod} onValueChange={v => setCfForm(f => ({ ...f, populationMethod: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual entry</SelectItem>
                    <SelectItem value="inherited">Inherited from another entity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {cfForm.fieldType === "select" && (
              <div className="space-y-1.5">
                <Label>Options <span className="text-muted-foreground font-normal">(comma-separated)</span></Label>
                <Input placeholder="e.g. Low, Medium, High" value={cfForm.options} onChange={e => setCfForm(f => ({ ...f, options: e.target.value }))} />
              </div>
            )}
            {cfForm.populationMethod === "inherited" && (
              <div className="rounded-md border bg-muted/30 p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Inheritance</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>From Entity</Label>
                    <Select value={cfForm.inheritFromEntity || "__none"} onValueChange={v => setCfForm(f => ({ ...f, inheritFromEntity: v === "__none" ? "" : v, inheritFromFieldId: "" }))}>
                      <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">— select —</SelectItem>
                        <SelectItem value="task">Task</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                        <SelectItem value="account">Account</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>From Field</Label>
                    <Select value={cfForm.inheritFromFieldId || "__none"} onValueChange={v => setCfForm(f => ({ ...f, inheritFromFieldId: v === "__none" ? "" : v }))} disabled={!cfForm.inheritFromEntity}>
                      <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">— select —</SelectItem>
                        {(cfDefinitions ?? []).filter(d => d.entityType === cfForm.inheritFromEntity).map(d => (
                          <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Fallback Value</Label>
                  <Input placeholder="Used when source field is empty" value={cfForm.fallbackValue} onChange={e => setCfForm(f => ({ ...f, fallbackValue: e.target.value }))} />
                </div>
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cfForm.isRequired} onChange={e => setCfForm(f => ({ ...f, isRequired: e.target.checked }))} className="rounded" />
              <span className="text-sm">Mandatory — applies even when the section is hidden for the user's role.</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCfDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCfDef} disabled={!cfForm.name || createCfDef.isPending || updateCfDef.isPending}>
              {editCfId ? "Save Changes" : "Add Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sectionDialogOpen} onOpenChange={(open) => { setSectionDialogOpen(open); if (!open) setEditSectionId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editSectionId ? "Edit Section" : "Add Section"}</DialogTitle>
            <DialogDescription>Group custom fields and control which roles can view or edit them. Mandatory fields apply even when the section is hidden.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Entity Type *</Label>
              <Select value={sectionForm.entityType} onValueChange={v => setSectionForm(f => ({ ...f, entityType: v }))} disabled={!!editSectionId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="time_entry">Time Entry</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="account">Account</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Section Name *</Label>
              <Input placeholder="e.g. Internal Notes, Finance Fields" value={sectionForm.name} onChange={e => setSectionForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Optional helper text shown above the section" value={sectionForm.description} onChange={e => setSectionForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>View Roles <span className="text-muted-foreground font-normal">(comma-separated, blank = all)</span></Label>
              <Input placeholder="e.g. Admin, Finance, PM" value={sectionForm.viewRoles} onChange={e => setSectionForm(f => ({ ...f, viewRoles: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Edit Roles <span className="text-muted-foreground font-normal">(comma-separated, blank = all viewers)</span></Label>
              <Input placeholder="e.g. Admin, Finance" value={sectionForm.editRoles} onChange={e => setSectionForm(f => ({ ...f, editRoles: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={sectionForm.isActive} onChange={e => setSectionForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded" />
              <span className="text-sm">Active</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSection} disabled={!sectionForm.name}>{editSectionId ? "Save Changes" : "Add Section"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteSectionId} onOpenChange={() => setDeleteSectionId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Section</DialogTitle><DialogDescription>Fields in this section will be detached (kept, but un-grouped).</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSectionId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteSectionId && handleDeleteSection(deleteSectionId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activityDialogOpen} onOpenChange={(open) => { setActivityDialogOpen(open); if (!open) setEditActivityId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editActivityId ? "Edit Activity Default" : "Add Activity Default"}</DialogTitle>
            <DialogDescription>Predefined activity name with default billable + category for time entries.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Activity Name *</Label>
              <Input placeholder="e.g. Internal Meeting, Training" value={activityForm.activityName} onChange={e => setActivityForm(f => ({ ...f, activityName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Default Category</Label>
              <Select value={activityForm.categoryId || "__none"} onValueChange={v => setActivityForm(f => ({ ...f, categoryId: v === "__none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="No category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No category</SelectItem>
                  {(timeCategories ?? []).map((c: any) => (<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={activityForm.billable} onChange={e => setActivityForm(f => ({ ...f, billable: e.target.checked }))} className="rounded" />
              <span className="text-sm">Billable by default</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={activityForm.isActive} onChange={e => setActivityForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded" />
              <span className="text-sm">Active</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivityDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveActivity} disabled={!activityForm.activityName}>{editActivityId ? "Save Changes" : "Add Activity"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteActivityId} onOpenChange={() => setDeleteActivityId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Activity Default</DialogTitle><DialogDescription>Existing time entries that used this activity name retain their saved values.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteActivityId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteActivityId && handleDeleteActivity(deleteActivityId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteCfId} onOpenChange={() => setDeleteCfId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Custom Field</DialogTitle><DialogDescription>All values stored for this field will also be removed.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCfId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              const cf = cfDefinitions?.find(d => d.id === deleteCfId);
              if (deleteCfId && cf) handleDeleteCfDef(deleteCfId, cf.entityType);
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {skillsUser && (
        <UserSkillsDialog
          userId={skillsUser.id}
          userName={skillsUser.name}
          allSkills={(skills ?? []).filter(s => s.categoryId != null).map(s => ({ id: s.id, name: s.name, categoryId: s.categoryId! }))}
          onClose={() => setSkillsUser(null)}
        />
      )}

      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editUser ? "Edit User" : "Add User"}</DialogTitle>
            <DialogDescription>{editUser ? "Update team member details." : "Add a new team member to KSAP Technology."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} placeholder="name@ksap.tech" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Role</Label>
                {jobRoles.length > 0 ? (
                  <Select value={userForm.role} onValueChange={v => setUserForm(f => ({ ...f, role: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select role…" /></SelectTrigger>
                    <SelectContent>
                      {jobRoles.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Consultant" />
                )}
              </div>
              <div className="space-y-1">
                <Label>Department</Label>
                <Input value={userForm.department} onChange={e => setUserForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Engineering" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Region</Label>
              <Input value={userForm.region} onChange={e => setUserForm(f => ({ ...f, region: e.target.value }))} placeholder="e.g. APAC, EMEA, US-East" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Weekly Capacity (hrs)</Label>
                <Input type="number" value={userForm.capacity} onChange={e => setUserForm(f => ({ ...f, capacity: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Cost Rate ($/hr)</Label>
                <Input type="number" value={userForm.costRate} onChange={e => setUserForm(f => ({ ...f, costRate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={userForm.activeStatus} onValueChange={v => setUserForm(f => ({ ...f, activeStatus: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Member Type</Label>
                <Select value={userForm.isInternal} onValueChange={v => setUserForm(f => ({ ...f, isInternal: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Internal Employee</SelectItem>
                    <SelectItem value="false">External / Client Contact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Resource Type</Label>
              <Select value={userForm.resourceType} onValueChange={v => setUserForm(f => ({ ...f, resourceType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                  <SelectItem value="subcontractor">Subcontractor</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Holiday Calendar</Label>
              <Select value={userForm.holidayCalendarId || "__none"} onValueChange={v => setUserForm(f => ({ ...f, holidayCalendarId: v === "__none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="No calendar assigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No calendar</SelectItem>
                  {holidayCalendars?.map((cal: any) => (
                    <SelectItem key={cal.id} value={String(cal.id)}>{cal.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Assigns a holiday calendar for capacity deductions and timesheet visual indicators.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveUser} disabled={createUser.isPending || updateUser.isPending || !userForm.name || !userForm.email}>
              {editUser ? "Save Changes" : "Add User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite-via-email dialog — posts to /api/users/invite (validated server-side) */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              They'll receive an email with a sign-up link.
              {adminPageInviteRoles.length === 0 && " Your role cannot invite team members from this page."}
              {adminPageInviteRoles.length > 0 && " To invite a customer, open the relevant project and use Invite there."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="name@company.com" />
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} placeholder="Optional — defaults from email" />
            </div>
            <div className="space-y-1">
              <Label>Role *</Label>
              <Select value={inviteForm.role} onValueChange={v => setInviteForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue placeholder="Select role…" /></SelectTrigger>
                <SelectContent>
                  {adminPageInviteRoles.map(r => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                You ({ROLE_LABELS[inviterCanonical] ?? activeRole}) can invite: {adminPageInviteRoles.map(r => ROLE_LABELS[r]).join(", ") || "—"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button
              disabled={!inviteForm.email || !inviteForm.role || inviteUserMut.isPending}
              onClick={() => inviteUserMut.mutate({ email: inviteForm.email, name: inviteForm.name, role: inviteForm.role })}
            >
              {inviteUserMut.isPending ? "Sending…" : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!userDeleteId} onOpenChange={o => !o && setUserDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>This will permanently remove the team member. Time entries and assignments will remain. Are you sure?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteUserMut.isPending} onClick={() => userDeleteId && deleteUserMut.mutate(userDeleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

type PlaceholderRow = { id: number; name: string; roleId: string | null; isDefault: boolean; createdAt: string };

function PlaceholdersCatalog({ base }: { base: string }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<PlaceholderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${base}/api/placeholders`);
      if (r.ok) setRows(await r.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!name.trim()) return;
    const r = await fetch(`${base}/api/placeholders`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name: name.trim(), roleId: roleId.trim() || null }),
    });
    if (r.ok) {
      toast({ title: "Placeholder created" });
      setName(""); setRoleId(""); load();
    } else {
      toast({ title: "Failed to create placeholder", variant: "destructive" });
    }
  }

  async function remove(id: number, isDefault: boolean) {
    if (isDefault) { toast({ title: "Default placeholders cannot be deleted", variant: "destructive" }); return; }
    setDeleteConfirmId(id);
  }

  async function confirmDelete(id: number) {
    setDeleteConfirmId(null);
    const r = await fetch(`${base}/api/placeholders/${id}`, { method: "DELETE", headers: authHeaders() });
    if (r.status === 204) { toast({ title: "Placeholder deleted" }); load(); }
    else { toast({ title: "Failed to delete", variant: "destructive" }); }
  }

  return (
    <>
    <ConfirmDialog
      open={deleteConfirmId !== null}
      onOpenChange={open => { if (!open) setDeleteConfirmId(null); }}
      title="Delete placeholder"
      description="Existing allocations referencing this placeholder will keep their text role label. This action cannot be undone."
      confirmLabel="Delete"
      onConfirm={() => { if (deleteConfirmId !== null) confirmDelete(deleteConfirmId); }}
      destructive
    />
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Placeholders Catalog</CardTitle>
        <CardDescription>Reusable unfilled slots used in resource allocations before a real team member is assigned.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input className="w-64" placeholder="e.g. Senior Consultant Slot" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Role (optional)</Label>
            <Input className="w-48" placeholder="e.g. Consultant" value={roleId} onChange={e => setRoleId(e.target.value)} />
          </div>
          <Button onClick={create} disabled={!name.trim()}>Add Placeholder</Button>
        </div>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Role</th>
                <th className="px-3 py-2 text-left">Default</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">No placeholders yet</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.roleId ?? "—"}</td>
                  <td className="px-3 py-2">{r.isDefault ? <Badge variant="secondary">Default</Badge> : "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => remove(r.id, r.isDefault)} disabled={r.isDefault}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
    </>
  );
}
