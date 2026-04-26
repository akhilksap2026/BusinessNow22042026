import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListProjectGroups,
  useCreateProjectGroup,
  useUpdateProjectGroup,
  useDeleteProjectGroup,
  useListProjects,
  useUpdateProject,
  getListProjectGroupsQueryKey,
  getListProjectsQueryKey,
  type ProjectGroup,
  type Project,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  MoreHorizontal,
  Plus,
  FolderOpen,
  Pencil,
  Trash2,
  FolderInput,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ProjectGroupsNavProps {
  isAdmin: boolean;
  onNavigate?: () => void;
  variant?: "desktop" | "mobile";
}

// Persist per-group expand state across navigations.
const COLLAPSE_KEY = "projectGroups.collapsed";

function readCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function writeCollapsed(set: Set<string>) {
  try {
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

const PALETTE = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6"];

export function ProjectGroupsNav({ isAdmin, onNavigate, variant = "desktop" }: ProjectGroupsNavProps) {
  const [location] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: groups = [] } = useListProjectGroups();
  const { data: projects = [] } = useListProjects();
  const createGroup = useCreateProjectGroup();
  const updateGroup = useUpdateProjectGroup();
  const deleteGroupMut = useDeleteProjectGroup();
  const updateProject = useUpdateProject();

  // Hide soft-deleted projects from the sidebar grouping. The /projects page
  // already filters these out via its own selector.
  const liveProjects = useMemo(
    () => (projects as Project[]).filter((p) => !p.deletedAt),
    [projects],
  );

  // Bucket projects by their groupId. Null bucket becomes "Ungrouped".
  const byGroup = useMemo(() => {
    const map = new Map<number | null, Project[]>();
    for (const p of liveProjects) {
      const k = (p.projectGroupId ?? null) as number | null;
      const arr = map.get(k) ?? [];
      arr.push(p);
      map.set(k, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [liveProjects]);

  const ungrouped = byGroup.get(null) ?? [];

  const [collapsed, setCollapsed] = useState<Set<string>>(() => readCollapsed());

  function toggleCollapsed(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      writeCollapsed(next);
      return next;
    });
  }

  // ── Dialog state for create/rename ─────────────────────────────────────
  const [dialogMode, setDialogMode] = useState<null | { kind: "create" } | { kind: "rename"; group: ProjectGroup }>(null);
  const [groupName, setGroupName] = useState("");
  const [groupColor, setGroupColor] = useState<string>(PALETTE[0]);

  function openCreateDialog() {
    setGroupName("");
    setGroupColor(PALETTE[groups.length % PALETTE.length]);
    setDialogMode({ kind: "create" });
  }

  function openRenameDialog(g: ProjectGroup) {
    setGroupName(g.name);
    setGroupColor(g.color ?? PALETTE[0]);
    setDialogMode({ kind: "rename", group: g });
  }

  async function handleSaveDialog() {
    const name = groupName.trim();
    if (!name) return;
    try {
      if (dialogMode?.kind === "create") {
        await createGroup.mutateAsync({ data: { name, color: groupColor } });
        toast({ title: "Group created" });
      } else if (dialogMode?.kind === "rename") {
        await updateGroup.mutateAsync({
          id: dialogMode.group.id,
          data: { name, color: groupColor },
        });
        toast({ title: "Group updated" });
      }
      qc.invalidateQueries({ queryKey: getListProjectGroupsQueryKey() });
      setDialogMode(null);
    } catch (err: any) {
      toast({
        title: "Failed to save group",
        description: err?.message ?? "Try again.",
        variant: "destructive",
      });
    }
  }

  // ── Delete confirm ─────────────────────────────────────────────────────
  const [pendingDelete, setPendingDelete] = useState<ProjectGroup | null>(null);

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteGroupMut.mutateAsync({ id: pendingDelete.id });
      qc.invalidateQueries({ queryKey: getListProjectGroupsQueryKey() });
      qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      toast({
        title: "Group deleted",
        description: "Projects in this group are now ungrouped.",
      });
      setPendingDelete(null);
    } catch (err: any) {
      toast({
        title: "Failed to delete group",
        description: err?.message ?? "Try again.",
        variant: "destructive",
      });
    }
  }

  // ── Move project to group ──────────────────────────────────────────────
  async function moveProjectToGroup(projectId: number, groupId: number | null) {
    try {
      await updateProject.mutateAsync({
        id: projectId,
        data: { projectGroupId: groupId } as any,
      });
      qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      toast({ title: groupId === null ? "Project moved to Ungrouped" : "Project moved" });
    } catch (err: any) {
      toast({
        title: "Failed to move project",
        description: err?.message ?? "Try again.",
        variant: "destructive",
      });
    }
  }

  function isProjectActive(id: number) {
    return location === `/projects/${id}` || location.startsWith(`/projects/${id}/`);
  }

  function ProjectLinkRow({ p }: { p: Project }) {
    const active = isProjectActive(p.id);
    return (
      <div className="group flex items-center gap-1 pl-7 pr-1">
        <Link href={`/projects/${p.id}`}>
          <div
            role="link"
            onClick={onNavigate}
            className={cn(
              "flex-1 min-w-0 truncate text-xs px-2 py-1 rounded-md transition-colors cursor-pointer outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            data-testid={`nav-project-${p.id}`}
            title={p.name}
          >
            {p.name}
          </div>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Project options"
              className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              onClick={(e) => e.stopPropagation()}
              data-testid={`button-project-menu-${p.id}`}
            >
              <MoreHorizontal className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderInput className="h-4 w-4 mr-2" />
                Move to group
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {groups.map((g) => (
                  <DropdownMenuItem
                    key={g.id}
                    disabled={p.projectGroupId === g.id}
                    onClick={() => moveProjectToGroup(p.id, g.id)}
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full mr-2"
                      style={{ background: g.color ?? "#94a3b8" }}
                    />
                    {g.name}
                  </DropdownMenuItem>
                ))}
                {groups.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  disabled={p.projectGroupId == null}
                  onClick={() => moveProjectToGroup(p.id, null)}
                >
                  Ungrouped
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  function GroupSection({ g }: { g: ProjectGroup }) {
    const items = byGroup.get(g.id) ?? [];
    const key = `g${g.id}`;
    const isCollapsed = collapsed.has(key);
    return (
      <div className="space-y-0.5">
        <div className="group flex items-center gap-1 pl-3 pr-1">
          <button
            type="button"
            onClick={() => toggleCollapsed(key)}
            className="flex-1 min-w-0 flex items-center gap-1.5 px-1 py-1 rounded-md text-xs font-medium text-foreground/80 hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-expanded={!isCollapsed}
            data-testid={`button-group-toggle-${g.id}`}
          >
            <ChevronRight
              className={cn("h-3 w-3 transition-transform shrink-0", !isCollapsed && "rotate-90")}
            />
            <span
              className="inline-block h-2 w-2 rounded-full shrink-0"
              style={{ background: g.color ?? "#94a3b8" }}
            />
            <span className="truncate">{g.name}</span>
            <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
              {items.length}
            </span>
          </button>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Group options"
                  className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  data-testid={`button-group-menu-${g.id}`}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openRenameDialog(g)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => setPendingDelete(g)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {!isCollapsed && (
          <div className="space-y-0.5">
            {items.length === 0 ? (
              <p className="pl-9 text-[11px] text-muted-foreground italic py-1">No projects</p>
            ) : (
              items.map((p) => <ProjectLinkRow key={p.id} p={p} />)
            )}
          </div>
        )}
      </div>
    );
  }

  const ungroupedKey = "ungrouped";
  const ungroupedCollapsed = collapsed.has(ungroupedKey);

  return (
    <div
      className={cn(
        "space-y-0.5",
        variant === "desktop" ? "mt-1 mb-1" : "mt-1",
      )}
      data-testid="project-groups-nav"
    >
      {groups.map((g) => (
        <GroupSection key={g.id} g={g} />
      ))}

      {/* Ungrouped bucket — only render when there is something in it. */}
      {ungrouped.length > 0 && (
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => toggleCollapsed(ungroupedKey)}
            className="w-full pl-3 pr-2 flex items-center gap-1.5 px-1 py-1 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-expanded={!ungroupedCollapsed}
            data-testid="button-group-toggle-ungrouped"
          >
            <ChevronRight
              className={cn("h-3 w-3 transition-transform shrink-0", !ungroupedCollapsed && "rotate-90")}
            />
            <FolderOpen className="h-3 w-3 shrink-0" />
            <span>Ungrouped</span>
            <span className="ml-auto text-[10px] tabular-nums">{ungrouped.length}</span>
          </button>
          {!ungroupedCollapsed && (
            <div className="space-y-0.5">
              {ungrouped.map((p) => (
                <ProjectLinkRow key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>
      )}

      {isAdmin && (
        <button
          type="button"
          onClick={openCreateDialog}
          className="w-full mt-1 pl-3 pr-2 flex items-center gap-1.5 py-1 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="button-new-project-group"
        >
          <Plus className="h-3 w-3" />
          New Group
        </button>
      )}

      {/* Create / Rename dialog */}
      <Dialog open={dialogMode != null} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode?.kind === "rename" ? "Rename Group" : "New Project Group"}
            </DialogTitle>
            <DialogDescription>
              Group projects in the sidebar. Projects can be moved between groups at any time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="group-name">Name</Label>
              <Input
                id="group-name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Active Engagements"
                autoFocus
                data-testid="input-group-name"
              />
            </div>
            <div className="space-y-1">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-1.5">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    onClick={() => setGroupColor(c)}
                    className={cn(
                      "h-6 w-6 rounded-full border-2 transition-all",
                      groupColor === c ? "border-foreground scale-110" : "border-transparent",
                    )}
                    style={{ background: c }}
                    data-testid={`button-group-color-${c.replace("#", "")}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveDialog}
              disabled={!groupName.trim() || createGroup.isPending || updateGroup.isPending}
              data-testid="button-save-project-group"
            >
              {dialogMode?.kind === "rename" ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={pendingDelete != null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{pendingDelete?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Projects in this group will become ungrouped. The projects themselves are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
              data-testid="button-confirm-delete-group"
            >
              Delete group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
