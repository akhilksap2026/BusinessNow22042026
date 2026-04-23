import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProjectTemplates,
  useApplyTemplateToProject,
  getGetProjectQueryKey,
  getListTasksQueryKey,
  type ProjectTemplate,
  type TemplatePhase,
  type TemplateTask,
} from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Layers, CheckCircle2, AlertTriangle, LayoutTemplate } from "lucide-react";

interface ApplyTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  projectStartDate?: string;
  onSuccess?: () => void;
}

function addCalendarDays(base: string, days: number): string {
  const d = new Date(base + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDate(date: string): string {
  return new Date(date + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ApplyTemplateModal({ open, onOpenChange, projectId, projectStartDate, onSuccess }: ApplyTemplateModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: allTemplates, isLoading: isLoadingTemplates } = useListProjectTemplates();
  const applyTemplate = useApplyTemplateToProject();

  const templates = (allTemplates ?? []).filter((t: any) => !t.isArchived);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [startDate, setStartDate] = useState(projectStartDate ?? new Date().toISOString().slice(0, 10));
  const [applying, setApplying] = useState(false);

  const selectedTemplate = templates.find((t: any) => t.id === parseInt(selectedTemplateId, 10)) as (ProjectTemplate & { phases: (TemplatePhase & { tasks: TemplateTask[] })[] }) | undefined;

  async function handleApply() {
    if (!selectedTemplateId || !startDate) return;
    setApplying(true);
    try {
      const result = await applyTemplate.mutateAsync({
        id: parseInt(selectedTemplateId, 10),
        data: { projectId, startDate },
      });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
      toast({
        title: "Template applied",
        description: `Created ${(result as any).phasesCreated} phases and ${(result as any).tasksCreated} tasks from "${selectedTemplate?.name}".`,
      });
      onSuccess?.();
      onOpenChange(false);
      setSelectedTemplateId("");
    } catch {
      toast({ title: "Failed to apply template", variant: "destructive" });
    } finally {
      setApplying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-primary" />
            Apply Template to Project
          </DialogTitle>
          <DialogDescription>
            Choose a template and start date. Phases and tasks will be created with calculated due dates. You can apply multiple templates to compose a richer project structure.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Template selector */}
          <div className="space-y-2">
            <Label>Template</Label>
            {isLoadingTemplates ? (
              <Skeleton className="h-9 w-full" />
            ) : templates.length === 0 ? (
              <div className="flex items-center gap-2 p-3 border border-dashed rounded-md text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                No active templates available. Create one in Admin → Project Templates.
              </div>
            ) : (
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template…" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t: any) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                      <span className="text-muted-foreground ml-2 text-xs">({t.totalDurationDays}d · {(t.phases as any[]).length} phases)</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Start date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Base Start Date
              <span className="text-xs text-muted-foreground font-normal">(all offsets calculated from this date)</span>
            </Label>
            <Input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>

          {/* Preview */}
          {selectedTemplate && startDate && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/40 px-3 py-2 flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Date Preview</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {selectedTemplate.phases.length} phases · {selectedTemplate.phases.reduce((n, p) => n + (p.tasks?.length ?? 0), 0)} tasks
                </Badge>
              </div>
              <div className="divide-y max-h-52 overflow-y-auto">
                {selectedTemplate.phases.map(phase => {
                  const phaseStart = addCalendarDays(startDate, phase.relativeStartOffset);
                  const phaseEnd = addCalendarDays(startDate, phase.relativeEndOffset);
                  return (
                    <div key={phase.id} className="px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{phase.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(phaseStart)} → {formatDate(phaseEnd)}
                        </span>
                      </div>
                      {(phase.tasks ?? []).length > 0 && (
                        <div className="mt-1 space-y-0.5 ml-3">
                          {phase.tasks.map(task => (
                            <div key={task.id} className="flex items-center justify-between text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {task.name}
                                {task.assigneeRolePlaceholder && (
                                  <Badge variant="outline" className="text-xs py-0 px-1 text-purple-600 border-purple-200">{task.assigneeRolePlaceholder}</Badge>
                                )}
                              </span>
                              <span>Due {formatDate(addCalendarDays(startDate, task.relativeDueDateOffset))}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="bg-muted/20 px-3 py-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Project would span to <strong>{formatDate(addCalendarDays(startDate, selectedTemplate.totalDurationDays))}</strong>
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!selectedTemplateId || !startDate || applying}
            onClick={handleApply}
          >
            {applying ? "Applying…" : "Apply Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
