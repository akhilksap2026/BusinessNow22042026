import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProjectTemplates,
  useApplyTemplateAsSegment,
  getGetProjectQueryKey,
  getListTasksQueryKey,
} from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Layers, LayoutTemplate, ChevronsUpDown, Check, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  onSuccess?: () => void;
}

export function ApplyTemplateSegmentModal({ open, onOpenChange, projectId, onSuccess }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: allTemplates, isLoading } = useListProjectTemplates();
  const apply = useApplyTemplateAsSegment();

  const templates = useMemo(
    () => (allTemplates ?? []).filter((t: any) => !t.isArchived),
    [allTemplates]
  );

  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [phaseName, setPhaseName] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedTemplate = useMemo(
    () => templates.find((t: any) => t.id === selectedTemplateId),
    [templates, selectedTemplateId]
  );

  // Pre-fill phase name with template name when a new template is selected.
  useEffect(() => {
    if (selectedTemplate) setPhaseName(selectedTemplate.name);
  }, [selectedTemplate]);

  // Reset on close.
  useEffect(() => {
    if (!open) {
      setSelectedTemplateId(null);
      setPhaseName("");
      setPickerOpen(false);
    }
  }, [open]);

  const totalTasks = useMemo(() => {
    if (!selectedTemplate) return 0;
    return ((selectedTemplate as any).phases ?? []).reduce(
      (n: number, p: any) => n + ((p.tasks ?? []).length),
      0
    );
  }, [selectedTemplate]);

  async function handleApply() {
    if (!selectedTemplateId) return;
    setSubmitting(true);
    try {
      const result = await apply.mutateAsync({
        id: projectId,
        data: { templateId: selectedTemplateId, phaseName: phaseName || undefined },
      });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      toast({
        title: "Template applied as segment",
        description: `Created phase "${(selectedTemplate as any)?.name ?? phaseName}" with ${(result as any).tasksCreated} task(s).`,
      });
      onSuccess?.();
      onOpenChange(false);
    } catch {
      toast({ title: "Failed to apply template", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-primary" />
            Apply Template Segment
          </DialogTitle>
          <DialogDescription>
            Adds a single phase task with all template tasks nested underneath, preserving the template's task hierarchy.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label>Template</Label>
            {isLoading ? (
              <div className="h-9 rounded-md bg-muted animate-pulse" />
            ) : templates.length === 0 ? (
              <div className="flex items-center gap-2 p-3 border border-dashed rounded-md text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                No active templates. Create one in Admin → Project Templates.
              </div>
            ) : (
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    {selectedTemplate ? (
                      <span className="truncate">{(selectedTemplate as any).name}</span>
                    ) : (
                      <span className="text-muted-foreground">Search templates…</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                  <Command>
                    <CommandInput placeholder="Search by name…" />
                    <CommandList>
                      <CommandEmpty>No templates found.</CommandEmpty>
                      <CommandGroup>
                        {templates.map((t: any) => (
                          <CommandItem
                            key={t.id}
                            value={t.name}
                            onSelect={() => { setSelectedTemplateId(t.id); setPickerOpen(false); }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${selectedTemplateId === t.id ? "opacity-100" : "opacity-0"}`} />
                            <div className="flex-1 min-w-0">
                              <div className="truncate">{t.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {(t.phases ?? []).reduce((n: number, p: any) => n + ((p.tasks ?? []).length), 0)} task(s) · {t.totalDurationDays}d
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          <div className="space-y-2">
            <Label>Phase Name</Label>
            <Input
              placeholder="Phase name on this project"
              value={phaseName}
              onChange={e => setPhaseName(e.target.value)}
              disabled={!selectedTemplateId}
            />
            <p className="text-xs text-muted-foreground">Defaults to the template name. The single phase task will use this label.</p>
          </div>

          {selectedTemplate && (
            <div className="rounded-md border bg-muted/30 px-3 py-2 flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Will create</span>
              <Badge variant="secondary" className="text-xs">1 phase</Badge>
              <span className="text-sm">+</span>
              <Badge variant="secondary" className="text-xs">{totalTasks} task(s) (nested)</Badge>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!selectedTemplateId || submitting} onClick={handleApply}>
            {submitting ? "Applying…" : "Apply Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
