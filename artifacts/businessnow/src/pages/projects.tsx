import { useState } from "react";
import { Layout } from "@/components/layout";
import { useListProjects } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { CreateProjectWizard } from "@/components/create-project-wizard";

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

export default function Projects() {
  const { data: projects, isLoading } = useListProjects();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Project
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Projects</CardTitle>
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
                    <TableHead>Status</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Completion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects?.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        <Link href={`/projects/${project.id}`} className="text-primary hover:underline">
                          {project.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={project.status} />
                      </TableCell>
                      <TableCell>
                        <HealthBadge health={project.health} />
                      </TableCell>
                      <TableCell className="text-right">${project.budget.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{project.completion}%</TableCell>
                    </TableRow>
                  ))}
                  {projects?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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
