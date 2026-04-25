import { authHeaders } from "@/lib/auth-headers";
import { useState } from "react";
import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { useCurrentUser } from "@/contexts/current-user";
import { useAccountPermissions } from "@/lib/permissions";
import { useListProjects, useDeleteProject, useListUsers } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Plus, MoreHorizontal, Search, X, Archive, RotateCcw, Download, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { CreateProjectWizard } from "@/components/create-project-wizard";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { SavedViewsBar } from "@/components/saved-views-bar";
import { type FieldDef, type FilterValue, EMPTY_FILTER, evaluateFilters } from "@/lib/filter-evaluator";

const PROJECT_FIELDS: FieldDef[] = [
  { id: "name", label: "Name", type: "text" },
  { id: "status", label: "Status", type: "enum", options: [
    { value: "Not Started", label: "Not Started" },
    { value: "In Progress", label: "In Progress" },
    { value: "At Risk", label: "At Risk" },
    { value: "Completed", label: "Completed" },
  ] },
  { id: "health", label: "Health", type: "enum", options: [
    { value: "On Track", label: "On Track" },
    { value: "At Risk", label: "At Risk" },
    { value: "Off Track", label: "Off Track" },
  ] },
  { id: "internalExternal", label: "Type", type: "enum", options: [
    { value: "Internal", label: "Internal" },
    { value: "External", label: "External" },
  ] },
  { id: "startDate", label: "Start date", type: "date" },
  { id: "endDate", label: "End date", type: "date" },
  { id: "budget", label: "Budget", type: "number" },
];

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const STATUS_FILTERS = ["All", "Not Started", "In Progress", "At Risk", "Completed"] as const;
type StatusFilter = typeof STATUS_FILTERS[number];
const HEALTH_FILTERS = ["All Health", "On Track", "At Risk", "Off Track"] as const;
type HealthFilter = typeof HEALTH_FILTERS[number];

function InternalExternalBadge({ value }: { value: string | null }) {
  if (!value) return null;
  return (
    <Badge
      variant="outline"
      className={value === "Internal"
        ? "text-violet-700 border-violet-300 bg-violet-50"
        : "text-sky-700 border-sky-300 bg-sky-50"}
    >
      {value}
    </Badge>
  );
}

export default function Projects() {
  const { data: projects, isLoading } = useListProjects();
  const { data: users } = useListUsers();
  const [, navigate] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("All Health");
  const [showArchived, setShowArchived] = useState(false);
  const [viewFilter, setViewFilter] = useState<FilterValue>(EMPTY_FILTER);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const qc = useQueryClient();
  const { toast } = useToast();
  const deleteMut = useDeleteProject();
  const { activeRole } = useCurrentUser();
  const checkPerm = useAccountPermissions(activeRole);
  const canCreateProject = checkPerm("projects.create");
  const canDeleteProject = checkPerm("projects.delete");

  const { data: archivedProjects = [], isLoading: isLoadingArchived } = useQuery<{ id: number; name: string; deletedAt: string | null }[]>({
    queryKey: ["projects-deleted"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/projects/deleted`, { headers: authHeaders() });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: showArchived,
  });

  const restoreMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${BASE}/api/projects/${id}/restore`, { method: "POST", headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to restore");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["projects-deleted"] });
      toast({ title: "Project restored" });
    },
    onError: () => toast({ title: "Failed to restore project", variant: "destructive" }),
  });

  function handleDelete(id: number, name: string) {
    if (!confirm(`Archive project "${name}"? It will be hidden but can be recovered by an admin.`)) return;
    deleteMut.mutate({ id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["projects"] });
        toast({ title: "Project archived", description: `"${name}" has been archived.` });
      },
      onError: () => toast({ title: "Failed to archive project", variant: "destructive" }),
    });
  }

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === visibleProjects.length && visibleProjects.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleProjects.map(p => p.id)));
    }
  }

  function handleBulkArchive() {
    const names = visibleProjects.filter(p => selectedIds.has(p.id)).map(p => p.name);
    if (!confirm(`Archive ${selectedIds.size} project${selectedIds.size !== 1 ? "s" : ""}?\n\n${names.slice(0, 5).join("\n")}${names.length > 5 ? `\n…and ${names.length - 5} more` : ""}`)) return;
    Promise.all([...selectedIds].map(id => deleteMut.mutateAsync({ id }))).then(() => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: `${selectedIds.size} project${selectedIds.size !== 1 ? "s" : ""} archived` });
      setSelectedIds(new Set());
    }).catch(() => toast({ title: "Some projects failed to archive", variant: "destructive" }));
  }

  function handleBulkExport() {
    const selected = visibleProjects.filter(p => selectedIds.has(p.id));
    const header = ["Name", "Account", "Owner", "Status", "Health", "Type", "Tracked Hrs", "Allocated Hrs"];
    const rows = selected.map(p => [
      p.name,
      p.companyName ?? `Account #${p.accountId}`,
      users?.find(u => u.id === p.ownerId)?.name ?? "",
      p.status, p.health,
      (p as any).internalExternal ?? "",
      String(Math.round((p.trackedHours ?? 0) * 10) / 10),
      String(Math.round((p.allocatedHours ?? 0) * 10) / 10),
    ]);
    const csv = [header, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "projects.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const baseFiltered = (projects?.filter(p => !p.isAdminProject) ?? [])
    .filter(p => statusFilter === "All" || p.status === statusFilter)
    .filter(p => healthFilter === "All Health" || p.health === healthFilter)
    .filter(p => !searchText || p.name.toLowerCase().includes(searchText.toLowerCase()));
  const visibleProjects = evaluateFilters(baseFiltered, PROJECT_FIELDS, viewFilter);

  const hasActiveFilters = statusFilter !== "All" || healthFilter !== "All Health" || searchText || viewFilter.conditions.length > 0;

  function clearFilters() {
    setStatusFilter("All");
    setHealthFilter("All Health");
    setSearchText("");
  }

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader
          title="Projects"
          actions={
            <>
              {checkPerm("projects.archive.view") && (
                <Button
                  variant={showArchived ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowArchived(v => !v)}
                  className="gap-1.5"
                >
                  <Archive className="h-4 w-4" />
                  {showArchived ? "Hide Archived" : "Show Archived"}
                </Button>
              )}
              {canCreateProject && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> New Project
                </Button>
              )}
            </>
          }
        />

        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="pl-9"
              aria-label="Search projects"
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div
              role="radiogroup"
              aria-label="Filter by status"
              className="flex items-center gap-1.5 flex-wrap"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mr-1">
                Status
              </span>
              {STATUS_FILTERS.map(f => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={statusFilter === f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    statusFilter === f
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <Separator orientation="vertical" className="h-6 hidden md:block" />

            <div
              role="radiogroup"
              aria-label="Filter by health"
              className="flex items-center gap-1.5 flex-wrap"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mr-1">
                Health
              </span>
              {HEALTH_FILTERS.map(f => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={healthFilter === f}
                  onClick={() => setHealthFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    healthFilter === f
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground h-7 px-2 gap-1">
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <SavedViewsBar entity="projects" fields={PROJECT_FIELDS} value={viewFilter} onChange={setViewFilter} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {hasActiveFilters
                ? `${visibleProjects.length} project${visibleProjects.length !== 1 ? "s" : ""} found`
                : "All Projects"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : visibleProjects.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-sm">
                No projects found.
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <ul className="md:hidden space-y-2" aria-label="Projects">
                  {visibleProjects.map((project) => {
                    const trackedHrs = Math.round((project.trackedHours ?? 0) * 10) / 10;
                    const allocatedHrs = Math.round((project.allocatedHours ?? 0) * 10) / 10;
                    const owner = users?.find(u => u.id === project.ownerId)?.name ?? "—";
                    const account = project.companyName ?? `Account #${project.accountId}`;
                    return (
                      <li
                        key={project.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Open ${project.name}`}
                        className="border border-border rounded-lg p-3 bg-card hover:bg-muted/30 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => navigate(`/projects/${project.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigate(`/projects/${project.id}`);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <Link
                            href={`/projects/${project.id}`}
                            className="font-medium text-primary hover:underline text-sm leading-snug min-w-0 break-words"
                            onClick={e => e.stopPropagation()}
                          >
                            {project.name}
                          </Link>
                          <div onClick={e => e.stopPropagation()} className="flex-shrink-0">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More options">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/projects/${project.id}`}>View Details</Link>
                                </DropdownMenuItem>
                                {canDeleteProject && (
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => handleDelete(project.id, project.name)}
                                  >
                                    Archive Project
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mb-2 truncate">
                          {account} · {owner}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <InternalExternalBadge value={project.internalExternal} />
                          <StatusBadge status={project.status} />
                          <StatusBadge status={project.health} />
                        </div>
                        <div className="flex justify-between text-xs tabular-nums">
                          <span className="text-muted-foreground">Tracked</span>
                          <span className="font-medium">{trackedHrs.toLocaleString()}h{allocatedHrs > 0 ? ` / ${allocatedHrs.toLocaleString()}h` : ""}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="w-10 pl-3" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={visibleProjects.length > 0 && selectedIds.size === visibleProjects.length}
                          data-state={selectedIds.size > 0 && selectedIds.size < visibleProjects.length ? "indeterminate" : undefined}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all projects"
                        />
                      </TableHead>
                      <TableHead className="w-[220px]">Project Name</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Health</TableHead>
                      <TableHead className="text-right">Tracked Hrs</TableHead>
                      <TableHead className="text-right">Allocated Hrs</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleProjects.map((project) => {
                      const trackedHrs = Math.round((project.trackedHours ?? 0) * 10) / 10;
                      const allocatedHrs = Math.round((project.allocatedHours ?? 0) * 10) / 10;
                      const isSelected = selectedIds.has(project.id);
                      return (
                      <TableRow
                        key={project.id}
                        className={`text-xs cursor-pointer hover:bg-muted/50 ${isSelected ? "bg-primary/5" : ""}`}
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <TableCell className="pl-3" onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(project.id)}
                            aria-label={`Select ${project.name}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          <Link
                            href={`/projects/${project.id}`}
                            className="text-primary hover:underline"
                            onClick={e => e.stopPropagation()}
                          >
                            {project.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {project.companyName ?? `Account #${project.accountId}`}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{users?.find(u => u.id === project.ownerId)?.name ?? "—"}</TableCell>
                        <TableCell><InternalExternalBadge value={project.internalExternal} /></TableCell>
                        <TableCell><StatusBadge status={project.status} /></TableCell>
                        <TableCell><StatusBadge status={project.health} /></TableCell>
                        <TableCell className="text-right tabular-nums">{trackedHrs.toLocaleString()}h</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{allocatedHrs > 0 ? `${allocatedHrs.toLocaleString()}h` : "—"}</TableCell>
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
                              <DropdownMenuItem asChild>
                                <Link href={`/projects/${project.id}`}>View Details</Link>
                              </DropdownMenuItem>
                              {canDeleteProject && (
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleDelete(project.id, project.name)}
                                >
                                  Archive Project
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>

                {/* US-8: Sticky bulk action bar */}
                {selectedIds.size > 0 && (
                  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border border-border bg-card shadow-lg px-4 py-2.5 text-sm animate-in slide-in-from-bottom-2">
                    <span className="font-medium text-foreground">{selectedIds.size} selected</span>
                    <div className="w-px h-4 bg-border" />
                    <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={handleBulkExport}>
                      <Download className="h-3.5 w-3.5" />
                      Export CSV
                    </Button>
                    {canDeleteProject && (
                      <Button size="sm" variant="outline" className="h-7 gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300" onClick={handleBulkArchive}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Archive
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelectedIds(new Set())} aria-label="Clear selection">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
        
        {showArchived && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <Archive className="h-4 w-4" />
                Archived Projects
                {archivedProjects.length > 0 && (
                  <Badge variant="secondary">{archivedProjects.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingArchived ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : archivedProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No archived projects.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project Name</TableHead>
                      <TableHead>Archived On</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archivedProjects.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {p.deletedAt ? new Date(p.deletedAt).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => restoreMut.mutate(p.id)}
                            disabled={restoreMut.isPending}
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Restore
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        <CreateProjectWizard open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      </div>
    </Layout>
  );
}
