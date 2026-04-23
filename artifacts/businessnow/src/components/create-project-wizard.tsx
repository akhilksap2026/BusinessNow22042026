import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  useListAccounts,
  useListUsers,
  useListRateCards,
  useListProjectTemplates,
  useCreateProject,
  useCreateAllocation,
  useCreateProjectFromTemplate,
  getListProjectsQueryKey,
} from "@workspace/api-client-react";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, LayoutTemplate, Calendar, Layers, Clock } from "lucide-react";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  accountId: z.coerce.number().min(1, "Account is required"),
  startDate: z.string().min(1, "Start date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  billingType: z.enum(["Fixed Fee", "T&M", "Retainer"]),
  budget: z.coerce.number().min(0, "Budget must be positive"),
  budgetedHours: z.coerce.number().min(0, "Budgeted hours must be positive"),
  ownerId: z.coerce.number().min(1, "Owner is required"),
  teamMembers: z.array(z.number()).default([]),
  rateCardId: z.coerce.number().optional(),
  internalExternal: z.enum(["Internal", "External"]).default("External"),
});

const templateProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  accountId: z.coerce.number().min(1, "Account is required"),
  ownerId: z.coerce.number().min(1, "Owner is required"),
  startDate: z.string().min(1, "Start date is required"),
  budget: z.coerce.number().optional(),
});

type Mode = "choose" | "blank" | "template";

export function CreateProjectWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<Mode>("choose");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: accounts } = useListAccounts();
  const { data: users } = useListUsers();
  const { data: rateCards } = useListRateCards();
  const { data: templates } = useListProjectTemplates();

  const createProject = useCreateProject();
  const createAllocation = useCreateAllocation();
  const createFromTemplate = useCreateProjectFromTemplate();

  const blankForm = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      billingType: "Fixed Fee",
      budget: 0,
      budgetedHours: 0,
      teamMembers: [],
      internalExternal: "External",
    },
  });

  const templateForm = useForm<z.infer<typeof templateProjectSchema>>({
    resolver: zodResolver(templateProjectSchema),
    defaultValues: { name: "", budget: undefined },
  });

  function handleClose(v: boolean) {
    if (!v) {
      setMode("choose");
      setStep(1);
      setSelectedTemplateId(null);
      blankForm.reset();
      templateForm.reset();
    }
    onOpenChange(v);
  }

  const onSubmitBlank = async (values: z.infer<typeof projectSchema>) => {
    try {
      const project = await createProject.mutateAsync({
        data: {
          name: values.name,
          description: values.description,
          accountId: values.accountId,
          startDate: values.startDate,
          dueDate: values.dueDate,
          billingType: values.billingType,
          budget: values.budget,
          budgetedHours: values.budgetedHours,
          status: "Draft",
          ownerId: values.ownerId,
          internalExternal: values.internalExternal,
        }
      });

      if (values.teamMembers.length > 0) {
        await Promise.all(values.teamMembers.map(userId =>
          createAllocation.mutateAsync({
            data: {
              projectId: project.id,
              userId: userId,
              startDate: values.startDate,
              endDate: values.dueDate,
              hoursPerWeek: 40,
              role: "Team Member"
            }
          })
        ));
      }

      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      toast({ title: "Project created successfully" });
      handleClose(false);
      setLocation(`/projects/${project.id}`);
    } catch {
      toast({ title: "Failed to create project", variant: "destructive" });
    }
  };

  const onSubmitFromTemplate = async (values: z.infer<typeof templateProjectSchema>) => {
    if (!selectedTemplateId) return;
    try {
      const project = await createFromTemplate.mutateAsync({
        data: {
          templateId: selectedTemplateId,
          name: values.name,
          accountId: values.accountId,
          ownerId: values.ownerId,
          startDate: values.startDate,
          budget: values.budget || undefined,
        }
      });

      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      toast({ title: "Project created from template" });
      handleClose(false);
      setLocation(`/projects/${(project as any).id}`);
    } catch {
      toast({ title: "Failed to create project from template", variant: "destructive" });
    }
  };

  const validateStep1 = async () => {
    const valid = await blankForm.trigger(["name", "description", "accountId"]);
    if (valid) setStep(2);
  };

  const validateStep2 = async () => {
    const valid = await blankForm.trigger(["startDate", "dueDate", "billingType", "budget", "budgetedHours"]);
    if (valid) setStep(3);
  };

  const validateStep3 = async () => {
    const valid = await blankForm.trigger(["ownerId", "teamMembers", "rateCardId"]);
    if (valid) setStep(4);
  };

  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);

  const getTitle = () => {
    if (mode === "choose") return "New Project";
    if (mode === "template") return "New Project from Template";
    return "Create New Project";
  };

  const getDescription = () => {
    if (mode === "choose") return "Choose how to start your project";
    if (mode === "template") return selectedTemplate?.name ? `Template: ${selectedTemplate.name}` : "Fill in the project details";
    return `Step ${step} of 4`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        {mode === "choose" && (
          <div className="space-y-3 py-2">
            <button
              type="button"
              onClick={() => setMode("blank")}
              className="w-full flex items-start gap-4 p-4 border-2 rounded-xl hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors group text-left"
            >
              <div className="mt-0.5 p-2.5 rounded-lg bg-muted group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 transition-colors">
                <FileText className="h-5 w-5 text-muted-foreground group-hover:text-violet-600" />
              </div>
              <div>
                <p className="font-semibold">Blank Project</p>
                <p className="text-sm text-muted-foreground mt-0.5">Start from scratch with full customization over all settings.</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode("template")}
              className="w-full flex items-start gap-4 p-4 border-2 rounded-xl hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors group text-left"
            >
              <div className="mt-0.5 p-2.5 rounded-lg bg-muted group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 transition-colors">
                <LayoutTemplate className="h-5 w-5 text-muted-foreground group-hover:text-violet-600" />
              </div>
              <div>
                <p className="font-semibold">From Template</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Use a pre-defined structure with phases and tasks.
                  {templates && templates.length > 0 && (
                    <span className="ml-1 text-violet-600 font-medium">{templates.length} template{templates.length !== 1 ? "s" : ""} available.</span>
                  )}
                </p>
              </div>
            </button>
          </div>
        )}

        {mode === "template" && (
          <div className="space-y-5">
            {!selectedTemplateId ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Select a template</p>
                {(templates ?? []).filter((t: any) => !t.isArchived).map((tmpl: any) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className="w-full flex items-start gap-3 p-3.5 border rounded-lg hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors text-left"
                  >
                    <LayoutTemplate className="h-5 w-5 text-violet-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{tmpl.name}</span>
                        <Badge variant="secondary" className="text-xs">{tmpl.billingType}</Badge>
                      </div>
                      {tmpl.description && <p className="text-xs text-muted-foreground mt-0.5">{tmpl.description}</p>}
                      <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{tmpl.totalDurationDays} days</span>
                        {tmpl.phases && (tmpl.phases as any[]).length > 0 && (
                          <span className="flex items-center gap-1"><Layers className="h-3 w-3" />{(tmpl.phases as any[]).length} phases</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-violet-50 dark:bg-violet-950/20 rounded-lg border border-violet-200 dark:border-violet-800">
                  <LayoutTemplate className="h-4 w-4 text-violet-600 shrink-0" />
                  <span className="text-sm font-medium text-violet-700 dark:text-violet-300">{selectedTemplate?.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateId(null)}
                    className="ml-auto text-xs text-violet-500 hover:text-violet-700 underline"
                  >
                    Change
                  </button>
                </div>

                <Form {...templateForm}>
                  <form onSubmit={templateForm.handleSubmit(onSubmitFromTemplate)} className="space-y-4">
                    <FormField
                      control={templateForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Name</FormLabel>
                          <FormControl><Input placeholder="Enter project name" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={templateForm.control}
                      name="accountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {accounts?.map(acc => (
                                <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={templateForm.control}
                      name="ownerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Owner</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users?.map(u => (
                                <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={templateForm.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl><Input type="date" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={templateForm.control}
                        name="budget"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Budget (optional)</FormLabel>
                            <FormControl><Input type="number" placeholder="Override budget" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {selectedTemplate?.phases && (selectedTemplate.phases as any[]).length > 0 && (
                      <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1.5">
                        <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Phases to be created</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(selectedTemplate.phases as any[]).map((ph: any, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs font-normal">
                              {ph.name}
                              {ph.tasks && <span className="ml-1 text-muted-foreground">({ph.tasks.length} tasks)</span>}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setMode("choose")}>Back</Button>
                      <Button type="submit" disabled={createFromTemplate.isPending}>
                        {createFromTemplate.isPending ? "Creating..." : "Create from Template"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </div>
            )}

            {!selectedTemplateId && (
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setMode("choose")}>Back</Button>
              </DialogFooter>
            )}
          </div>
        )}

        {mode === "blank" && (
          <Form {...blankForm}>
            <form onSubmit={blankForm.handleSubmit(onSubmitBlank)} className="space-y-6">
              {step === 1 && (
                <div className="space-y-4">
                  <FormField
                    control={blankForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl><Input placeholder="Enter project name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={blankForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Textarea placeholder="Project description" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={blankForm.control}
                    name="accountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accounts?.map(acc => (
                              <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={blankForm.control}
                    name="internalExternal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Type</FormLabel>
                        <div className="flex gap-3">
                          {(["External", "Internal"] as const).map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => field.onChange(opt)}
                              className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${field.value === opt ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-accent"}`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={blankForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={blankForm.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={blankForm.control}
                    name="billingType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billing Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select billing type" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Fixed Fee">Fixed Fee</SelectItem>
                            <SelectItem value="T&M">T&M</SelectItem>
                            <SelectItem value="Retainer">Retainer</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={blankForm.control}
                      name="budget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Budget ($)</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={blankForm.control}
                      name="budgetedHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Budgeted Hours</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <FormField
                    control={blankForm.control}
                    name="ownerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Owner</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users?.map(user => (
                              <SelectItem key={user.id} value={user.id.toString()}>{user.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={blankForm.control}
                    name="teamMembers"
                    render={() => (
                      <FormItem>
                        <FormLabel>Initial Team Members</FormLabel>
                        <div className="space-y-2 border p-4 rounded-md max-h-48 overflow-y-auto">
                          {users?.map(user => (
                            <FormField
                              key={user.id}
                              control={blankForm.control}
                              name="teamMembers"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(user.id)}
                                      onCheckedChange={checked =>
                                        checked
                                          ? field.onChange([...field.value, user.id])
                                          : field.onChange(field.value?.filter(v => v !== user.id))
                                      }
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">{user.name}</FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={blankForm.control}
                    name="rateCardId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rate Card (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select rate card" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {rateCards?.map(card => (
                              <SelectItem key={card.id} value={card.id.toString()}>{card.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Review Project Details</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Name:</div>
                    <div>{blankForm.getValues("name")}</div>
                    <div className="text-muted-foreground">Description:</div>
                    <div>{blankForm.getValues("description")}</div>
                    <div className="text-muted-foreground">Account:</div>
                    <div>{accounts?.find(a => a.id === Number(blankForm.getValues("accountId")))?.name}</div>
                    <div className="text-muted-foreground">Start Date:</div>
                    <div>{blankForm.getValues("startDate")}</div>
                    <div className="text-muted-foreground">Due Date:</div>
                    <div>{blankForm.getValues("dueDate")}</div>
                    <div className="text-muted-foreground">Billing Type:</div>
                    <div>{blankForm.getValues("billingType")}</div>
                    <div className="text-muted-foreground">Budget:</div>
                    <div>${blankForm.getValues("budget")}</div>
                    <div className="text-muted-foreground">Budgeted Hours:</div>
                    <div>{blankForm.getValues("budgetedHours")}</div>
                  </div>
                </div>
              )}

              <DialogFooter>
                {step > 1 ? (
                  <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>Back</Button>
                ) : (
                  <Button type="button" variant="outline" onClick={() => setMode("choose")}>Back</Button>
                )}
                {step === 1 && <Button type="button" onClick={validateStep1}>Next</Button>}
                {step === 2 && <Button type="button" onClick={validateStep2}>Next</Button>}
                {step === 3 && <Button type="button" onClick={validateStep3}>Next</Button>}
                {step === 4 && (
                  <Button type="submit" disabled={createProject.isPending}>
                    {createProject.isPending ? "Creating..." : "Create Project"}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
