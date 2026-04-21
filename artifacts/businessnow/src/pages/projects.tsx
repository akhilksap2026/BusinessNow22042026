import { useState } from "react";
import { Layout } from "@/components/layout";
import { useListProjects, useDeleteProject } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Plus, MoreHorizontal, Search, X } from "lucide-react";
import { CreateProjectWizard } from "@/components/create-project-wizard";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("All Health");
  const qc = useQueryClient();
  const { toast } = useToast();
  const deleteMut = useDeleteProject();

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

  const visibleProjects = (projects?.filter(p => !p.isAdminProject) ?? [])
    .filter(p => statusFilter === "All" || p.status === statusFilter)
    .filter(p => healthFilter === "All Health" || p.health === healthFilter)
    .filter(p => !searchText || p.name.toLowerCase().includes(searchText.toLowerCase()));

  const hasActiveFilters = statusFilter !== "All" || healthFilter !== "All Health" || searchText;

  function clearFilters() {
    setStatusFilter("All");
    setHealthFilter("All Health");
    setSearchText("");
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Project
          </Button>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Completion</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        <Link href={`/projects/${project.id}`} className="text-primary hover:underline">
                          {project.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <InternalExternalBadge value={project.internalExternal ?? "External"} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={project.status} />
                      </TableCell>
                      <TableCell>
                        <HealthBadge health={project.health} />
                      </TableCell>
                      <TableCell className="text-right">${project.budget.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{project.completion}%</TableCell>
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
                  ))}
                  {visibleProjects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No projects found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        
        <CreateProjectWizard open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      </div>
    </Layout>
  );
}
