import { useMemo, useState } from "react";
import {
  useListSavedViews,
  useCreateSavedView,
  useUpdateSavedView,
  useDeleteSavedView,
  useDuplicateSavedView,
  getListSavedViewsQueryKey,
  type SavedView,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bookmark, ChevronDown, Plus, Trash2, Copy, Pencil, Check, Lock, Globe } from "lucide-react";
import {
  type FieldDef, type FilterValue, EMPTY_FILTER, OPERATORS_BY_TYPE, filtersEqual,
} from "@/lib/filter-evaluator";
import { useCurrentUser } from "@/contexts/current-user";

type Entity = "projects" | "people" | "resource_requests";

interface Props {
  entity: Entity;
  fields: FieldDef[];
  value: FilterValue;
  onChange: (v: FilterValue) => void;
}

export function SavedViewsBar({ entity, fields, value, onChange }: Props) {
  const qc = useQueryClient();
  const { currentUser, activeRole } = useCurrentUser();
  const canSave = activeRole !== "Customer";
  const isAdmin = activeRole === "Admin" || activeRole === "Super User";

  const { data: views = [] } = useListSavedViews({ entity });

  const [activeViewId, setActiveViewId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveVisibility, setSaveVisibility] = useState<"private" | "public">("private");
  const [saveAsNew, setSaveAsNew] = useState(false);

  const activeView = useMemo(
    () => (activeViewId ? views.find((v) => v.id === activeViewId) ?? null : null),
    [views, activeViewId],
  );

  const isModified = useMemo(() => {
    if (!activeView) return value.conditions.length > 0;
    return !filtersEqual(value, activeView.filters as FilterValue);
  }, [activeView, value]);

  const invalidate = () => qc.invalidateQueries({ queryKey: getListSavedViewsQueryKey({ entity }) });
  const createMut = useCreateSavedView({ mutation: { onSuccess: () => invalidate() } });
  const updateMut = useUpdateSavedView({ mutation: { onSuccess: () => invalidate() } });
  const deleteMut = useDeleteSavedView({ mutation: { onSuccess: () => invalidate() } });
  const duplicateMut = useDuplicateSavedView({ mutation: { onSuccess: () => invalidate() } });

  const myViews = views.filter((v) => v.isOwner);
  const sharedViews = views.filter((v) => !v.isOwner && v.visibility === "public");

  function applyView(v: SavedView) {
    setActiveViewId(v.id);
    onChange(v.filters as FilterValue);
  }

  function clearView() {
    setActiveViewId(null);
    onChange(EMPTY_FILTER);
  }

  async function handleSave() {
    const name = saveName.trim();
    if (!name) return;
    if (saveAsNew || !activeView) {
      const created = await createMut.mutateAsync({
        data: { name, entity, filters: value, visibility: saveVisibility },
      });
      setActiveViewId((created as SavedView).id);
    } else {
      const updated = await updateMut.mutateAsync({
        id: activeView.id,
        data: { name, filters: value, visibility: saveVisibility },
      });
      setActiveViewId((updated as SavedView).id);
    }
    setSaveOpen(false);
  }

  function openSaveDialog(asNew: boolean) {
    setSaveAsNew(asNew);
    setSaveName(asNew ? (activeView ? `${activeView.name} (copy)` : "") : (activeView?.name ?? ""));
    setSaveVisibility((activeView?.visibility as "private" | "public") ?? "private");
    setSaveOpen(true);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="saved-views-bar">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" data-testid="button-views-menu">
            <Bookmark className="h-4 w-4 mr-1.5" />
            <span className="max-w-[180px] truncate">
              {activeView ? activeView.name : "All items"}
            </span>
            {isModified && activeView && <span className="ml-1 text-amber-600">•</span>}
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuItem onClick={clearView} data-testid="view-item-all">
            <span className="font-medium">All items</span>
            {!activeView && <Check className="h-4 w-4 ml-auto" />}
          </DropdownMenuItem>
          {myViews.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">My views</DropdownMenuLabel>
              {myViews.map((v) => (
                <DropdownMenuItem key={v.id} onClick={() => applyView(v)} data-testid={`view-item-${v.id}`}>
                  {v.visibility === "public" ? <Globe className="h-3.5 w-3.5 mr-2 text-blue-600" /> : <Lock className="h-3.5 w-3.5 mr-2 text-muted-foreground" />}
                  <span className="truncate">{v.name}</span>
                  {activeView?.id === v.id && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
              ))}
            </>
          )}
          {sharedViews.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">Shared views</DropdownMenuLabel>
              {sharedViews.map((v) => (
                <DropdownMenuItem key={v.id} onClick={() => applyView(v)} data-testid={`view-item-${v.id}`}>
                  <Globe className="h-3.5 w-3.5 mr-2 text-blue-600" />
                  <span className="truncate">{v.name}</span>
                  {activeView?.id === v.id && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
              ))}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setManageOpen(true)} data-testid="button-manage-views">
            <Pencil className="h-3.5 w-3.5 mr-2" /> Manage views…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="outline" size="sm" onClick={() => setEditorOpen(true)} data-testid="button-edit-filters">
        Filters
        {value.conditions.length > 0 && (
          <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs px-1.5">
            {value.conditions.length}
          </span>
        )}
      </Button>

      {value.conditions.length > 0 && (
        <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTER)} data-testid="button-clear-filters">
          Clear
        </Button>
      )}

      {canSave && (isModified || (!activeView && value.conditions.length > 0)) && (
        <>
          {activeView && activeView.isOwner && (
            <Button variant="default" size="sm" onClick={() => openSaveDialog(false)} data-testid="button-save-view">
              Save
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => openSaveDialog(true)} data-testid="button-save-as">
            <Plus className="h-3.5 w-3.5 mr-1" />
            {activeView ? "Save as new" : "Save view"}
          </Button>
        </>
      )}

      <FilterEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        fields={fields}
        value={value}
        onChange={onChange}
      />

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{saveAsNew || !activeView ? "Save new view" : "Update view"}</DialogTitle>
            <DialogDescription>
              Saved views capture your current filter setup so you can re-apply them in one click.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="view-name">Name</Label>
              <Input
                id="view-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g. My active projects"
                data-testid="input-view-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select value={saveVisibility} onValueChange={(v) => setSaveVisibility(v as any)}>
                <SelectTrigger data-testid="select-view-visibility"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private — only you can see this view</SelectItem>
                  <SelectItem value="public">Public — visible to all team members</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!saveName.trim() || createMut.isPending || updateMut.isPending} data-testid="button-confirm-save-view">
              {saveAsNew || !activeView ? "Create view" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage saved views</DialogTitle>
            <DialogDescription>
              Rename, duplicate, or delete views. You can edit your own views; admins can manage public views.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto divide-y">
            {views.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No saved views yet.</p>}
            {views.map((v) => {
              const canEdit = v.isOwner || (isAdmin && v.visibility === "public");
              return (
                <div key={v.id} className="flex items-center gap-3 py-3" data-testid={`manage-view-${v.id}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium flex items-center gap-2">
                      {v.visibility === "public" ? <Globe className="h-3.5 w-3.5 text-blue-600" /> : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span className="truncate">{v.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(v.filters as FilterValue).conditions.length} condition(s) · {v.visibility} · {v.isOwner ? "yours" : "shared"}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => duplicateMut.mutate({ id: v.id, data: { name: `${v.name} (copy)` } })} data-testid={`button-duplicate-${v.id}`}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!canEdit}
                    onClick={() => {
                      if (window.confirm(`Delete view "${v.name}"?`)) {
                        deleteMut.mutate({ id: v.id });
                        if (activeViewId === v.id) clearView();
                      }
                    }}
                    data-testid={`button-delete-${v.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button onClick={() => setManageOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface EditorProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fields: FieldDef[];
  value: FilterValue;
  onChange: (v: FilterValue) => void;
}

function FilterEditor({ open, onOpenChange, fields, value, onChange }: EditorProps) {
  const fieldMap = useMemo(() => new Map(fields.map((f) => [f.id, f])), [fields]);

  function setMatchMode(m: "all" | "any") {
    onChange({ ...value, matchMode: m });
  }
  function addCondition() {
    const f = fields[0];
    if (!f) return;
    const ops = OPERATORS_BY_TYPE[f.type];
    onChange({ ...value, conditions: [...value.conditions, { field: f.id, operator: ops[0].value, value: "" }] });
  }
  function updateCondition(idx: number, patch: Partial<{ field: string; operator: string; value: unknown }>) {
    const next = value.conditions.map((c, i) => {
      if (i !== idx) return c;
      const merged = { ...c, ...patch };
      if (patch.field && patch.field !== c.field) {
        const f = fieldMap.get(patch.field);
        if (f) {
          merged.operator = OPERATORS_BY_TYPE[f.type][0].value;
          merged.value = f.type === "enum" && f.options?.[0] ? f.options[0].value : "";
        }
      }
      return merged;
    });
    onChange({ ...value, conditions: next });
  }
  function removeCondition(idx: number) {
    onChange({ ...value, conditions: value.conditions.filter((_, i) => i !== idx) });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Filter</DialogTitle>
          <DialogDescription>
            Stack multiple conditions and choose whether all must match or any can match.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 py-2">
          <Label className="text-sm">Match</Label>
          <Select value={value.matchMode} onValueChange={(v) => setMatchMode(v as any)}>
            <SelectTrigger className="w-32" data-testid="select-match-mode"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All conditions</SelectItem>
              <SelectItem value="any">Any condition</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {value.conditions.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center border rounded-md">
              No conditions yet. Click "Add condition" to start filtering.
            </p>
          )}
          {value.conditions.map((c, idx) => {
            const f = fieldMap.get(c.field) ?? fields[0];
            const ops = OPERATORS_BY_TYPE[f.type];
            const op = ops.find((o) => o.value === c.operator) ?? ops[0];
            return (
              <div key={idx} className="flex items-center gap-2" data-testid={`condition-row-${idx}`}>
                <Select value={c.field} onValueChange={(v) => updateCondition(idx, { field: v })}>
                  <SelectTrigger className="w-44" data-testid={`select-field-${idx}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {fields.map((fd) => <SelectItem key={fd.id} value={fd.id}>{fd.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={c.operator} onValueChange={(v) => updateCondition(idx, { operator: v })}>
                  <SelectTrigger className="w-40" data-testid={`select-operator-${idx}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ops.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {op.needsValue && (
                  <ValueInput field={f} value={c.value} onChange={(v) => updateCondition(idx, { value: v })} testId={`input-value-${idx}`} />
                )}
                <Button variant="ghost" size="sm" onClick={() => removeCondition(idx)} data-testid={`button-remove-condition-${idx}`}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={addCondition} data-testid="button-add-condition">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add condition
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onChange(EMPTY_FILTER)} data-testid="button-reset-filter">Reset</Button>
          <Button onClick={() => onOpenChange(false)} data-testid="button-apply-filter">Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ValueInput({ field, value, onChange, testId }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void; testId: string }) {
  if (field.type === "enum" && field.options) {
    const v = (value as string | undefined) ?? field.options[0]?.value ?? "";
    return (
      <Select value={v} onValueChange={onChange as any}>
        <SelectTrigger className="flex-1 min-w-[160px]" data-testid={testId}><SelectValue /></SelectTrigger>
        <SelectContent>
          {field.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }
  if (field.type === "number") {
    return <Input type="number" className="flex-1 min-w-[140px]" value={(value as any) ?? ""} onChange={(e) => onChange(e.target.value)} data-testid={testId} />;
  }
  if (field.type === "date") {
    return <Input type="date" className="flex-1 min-w-[160px]" value={(value as any) ?? ""} onChange={(e) => onChange(e.target.value)} data-testid={testId} />;
  }
  return <Input className="flex-1 min-w-[160px]" value={(value as any) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="value" data-testid={testId} />;
}
