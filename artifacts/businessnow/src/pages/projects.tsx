import { useState } from "react";
import { Layout } from "@/components/layout";
import { useListProjects, useDeleteProject, useListUsers } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Plus, MoreHorizontal, Search, X, Archive, RotateCcw } from "lucide-react";
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

export function StatusBadge({ status }: { status: string }) {
  const getVariant = (s: string) => {
    switch (s) {
      case "Completed": return "secondary";
      case "In Progress": return "default";
      case "At Risk": return "destructive";
      default: return "outline";
    }
  };
  return <Badge variant={getVariant(status)}>{status}</Badge>;
}

export function HealthBadge({ health }: { health: string }) {
  const getColor = (h: string) => {
    switch (h) {
      case "On Track": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "At Risk": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
      case "Off Track": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${getColor(health)}`}>{health}</span>;
}

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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("All Health");
  const [showArchived, setShowArchived] = useState(false);
  const [viewFilter, setViewFilter] = useState<FilterValue>(EMPTY_FILTER);
  const qc = useQueryClient();
  const { toast } = useToast();
  const deleteMut = useDeleteProject();

  const { data: archivedProjects = [], isLoading: isLoadingArchived } = useQuery<{ id: number; name: string; deletedAt: string | null }[]>({
    queryKey: ["projects-deleted"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/projects/deleted`, { headers: { "x-user-role": "Admin" } });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: showArchived,
  });

  const restoreMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${BASE}/api/projects/${id}/restore`, { method: "POST", headers: { "x-user-role": "Admin" } });
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
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <div className="flex gap-2">
            <Button
              variant={showArchived ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowArchived(v => !v)}
              className="gap-1.5"
            >
              <Archive className="h-4 w-4" />
              {showArchived ? "Hide Archived" : "Show Archived"}
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Project
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  statusFilter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {HEALTH_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setHealthFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
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
            ) : (
              <div className="overflow-x-auto">
              <Table className="min-w-[1600px]">
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-[180px]">Project Name</TableHead>
                    <TableHead>Company ID</TableHead>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Account Owner</TableHead>
                    <TableHead className="max-w-[200px]">Description</TableHead>
                    <TableHead className="text-right">Tracked Min</TableHead>
                    <TableHead className="text-right">Billable Min</TableHead>
                    <TableHead className="text-right">Actual Revenue</TableHead>
                    <TableHead className="text-right">Actual Cost</TableHead>
                    <TableHead className="text-right">Actual Profit</TableHead>
                    <TableHead className="text-right">Actual Margin</TableHead>
                    <TableHead>Champions</TableHead>
                    <TableHead className="text-right">Allocated Min</TableHead>
                    <TableHead>Account Notes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleProjects.map((project) => {
                    const trackedMin = Math.round((project.trackedHours ?? 0) * 60);
                    const allocatedMin = Math.round((project.allocatedHours ?? 0) * 60);
                    return (
                    <TableRow key={project.id} className="text-xs">
                      <TableCell className="font-medium whitespace-nowrap">
                        <Link href={`/projects/${project.id}`} className="text-primary hover:underline">
                          {project.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{project.accountId}</TableCell>
                      <TableCell className="whitespace-nowrap">{(project as any).companyName ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{users?.find(u => u.id === project.ownerId)?.name ?? "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">{project.description ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{trackedMin.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">—</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">—</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">—</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">—</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">—</TableCell>
                      <TableCell className="whitespace-nowrap">{(project as any).customerChampion ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{allocatedMin.toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell><StatusBadge status={project.status} /></TableCell>
                      <TableCell><HealthBadge health={project.health} /></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/projects/${project.id}`}>View Details</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(project.id, project.name)}
                            >
                              Archive Project
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                  {visibleProjects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={17} className="text-center text-muted-foreground py-8">
                        No projects found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
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
