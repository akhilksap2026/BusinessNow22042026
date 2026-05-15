import { useState, useEffect } from "react";
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
  useApplyTemplateToProject,
  useCreateProject,
  useCreateAllocation,
  useCreateProjectFromTemplate,
  useListOpportunities,
  getListProjectsQueryKey,
} from "@workspace/api-client-react";
import { Checkbox } from "@/components/ui/checkbox";
import { LayoutTemplate, Calendar, Layers } from "lucide-react";

const TEAM_ROLES = ["Team Member", "Project Manager", "Lead Consultant", "Senior Consultant", "Consultant", "Analyst", "Architect", "QA Engineer", "Business Analyst"];

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
  customerChampion: z.string().optional(),
  opportunityId: z.coerce.number().optional(),
}).refine(
  (d) => !d.startDate || !d.dueDate || new Date(d.dueDate) >= new Date(d.startDate),
  { message: "Due date must be on or after start date", path: ["dueDate"] },
);

const templateProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  accountId: z.coerce.number().min(1, "Account is required"),
  ownerId: z.coerce.number().min(1, "Owner is required"),
  startDate: z.string().min(1, "Start date is required"),
  budget: z.coerce.number().optional(),
});

type Mode = "choose" | "blank" | "template";

type MemberConfig = Record<number, { role: string; hoursPerWeek: number }>;

export type CreateProjectPrefill = {
  name?: string;
  accountId?: number;
  budget?: number;
  description?: string;
  opportunityId?: number;
};

export function CreateProjectWizard({
  open,
  onOpenChange,
  prefill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: CreateProjectPrefill;
}) {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<Mode>("blank");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [startingPoint, setStartingPoint] = useState<"blank" | "template" | "later">("blank");
  const [postCreateTemplateId, setPostCreateTemplateId] = useState<number | null>(null);
  const [memberConfig, setMemberConfig] = useState<MemberConfig>({});
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: accounts } = useListAccounts();
  const { data: users } = useListUsers();
  const { data: rateCards } = useListRateCards();
  const { data: templates } = useListProjectTemplates();
  const { data: allOpportunities } = useListOpportunities();

  const createProject = useCreateProject();
  const createAllocation = useCreateAllocation();
  const createFromTemplate = useCreateProjectFromTemplate();
  const applyTemplate = useApplyTemplateToProject();

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

  useEffect(() => {
    if (open && prefill) {
      blankForm.reset({
        name: prefill.name ?? "",
        description: prefill.description ?? "",
        billingType: "Fixed Fee",
        budget: prefill.budget ?? 0,
        budgetedHours: 0,
        teamMembers: [],
        internalExternal: "External",
        ...(prefill.accountId ? { accountId: prefill.accountId } : {}),
        ...(prefill.opportunityId ? { opportunityId: prefill.opportunityId } : {}),
      });
    }
  }, [open]);

  function handleClose(v: boolean) {
    if (!v) {
      setMode("blank");
      setStep(1);
      setSelectedTemplateId(null);
      setStartingPoint("blank");
      setPostCreateTemplateId(null);
      setMemberConfig({});
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
          rateCardId: values.rateCardId ? Number(values.rateCardId) : undefined,
          customerChampion: values.customerChampion?.trim() || undefined,
          opportunityId: values.opportunityId ? Number(values.opportunityId) : undefined,
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
              hoursPerWeek: memberConfig[userId]?.hoursPerWeek ?? 40,
              role: memberConfig[userId]?.role ?? "Team Member",
              isSoftAllocation: true,
            }
          })
        ));
      }

      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });

      if (startingPoint === "template" && postCreateTemplateId) {
        try {
          await applyTemplate.mutateAsync({
            id: postCreateTemplateId,
            data: { projectId: project.id, startDate: values.startDate },
          });
          toast({ title: "Project created and template applied" });
        } catch {
          toast({
            title: "Project created — template apply failed",
            description: "You can apply the template later from the project page.",
            variant: "destructive",
          });
        }
      } else {
        toast({ title: "Project created successfully" });
      }

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
    if (!valid) return;
    if (!blankForm.getValues("description")?.trim()) {
      toast({
        title: "Heads up — no description",
        description: "Project will be created without a description. You can add one later from Edit Project.",
      });
    }
    setStep(2);
  };

  const validateStep2 = async () => {
    const valid = await blankForm.trigger(["startDate", "dueDate", "billingType", "budget", "budgetedHours"]);
    if (!valid) return;
    const { billingType, budget } = blankForm.getValues();
    if (budget === 0 && (billingType === "T&M" || billingType === "Retainer")) {
      toast({
        title: "Budget cannot be $0 for " + billingType,
        description: `${billingType} projects require a budget to generate accurate invoices and financial reports. Enter a budget amount to continue.`,
        variant: "destructive",
      });
      return;
    }
    if (budget === 0 && billingType === "Fixed Fee") {
      toast({
        title: "Budget is $0",
        description: "You can proceed, but a $0 budget will affect financial reporting. Consider setting a budget.",
      });
    }
    setStep(3);
  };

  const validateStep3 = async () => {
    const valid = await blankForm.trigger(["ownerId", "teamMembers", "rateCardId"]);
    if (!valid) return;
    const { billingType, rateCardId } = blankForm.getValues();
    if ((billingType === "T&M" || billingType === "Retainer") && !rateCardId) {
      toast({
        title: "Rate card recommended",
        description: `${billingType} projects need a rate card to calculate billable amounts. You can assign one after creation.`,
      });
    }
    setStep(4);
  };

  const validateStep4 = () => {
    if (startingPoint === "template" && !postCreateTemplateId) {
      toast({
        title: "Pick a template",
        description: "Select a template to start from, or choose another option.",
        variant: "destructive",
      });
      return;
    }
    setStep(5);
  };

  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);

  const getTitle = () => {
    if (mode === "template") return "New Project from Template";
    return "Create New Project";
  };

  const getDescription = () => {
    if (mode === "template") return selectedTemplate?.name ? `Template: ${selectedTemplate.name}` : "Fill in the project details";
    return `Step ${step} of 5`;
  };

  const watchedAccountId = blankForm.watch("accountId");
  const watchedInternalExternal = blankForm.watch("internalExternal");
  const watchedTeamMembers = blankForm.watch("teamMembers");
  const watchedBillingType = blankForm.watch("billingType");

  const wonOpportunities = (allOpportunities as any[] | undefined)?.filter(
    (o: any) => o.accountId === Number(watchedAccountId) && o.stage === "Won" && !o.projectId
  ) ?? [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

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

              {/* ── Step 1: Basics ────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-4">
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
                              onClick={() => {
                                field.onChange(opt);
                                blankForm.setValue("accountId", 0 as any);
                                blankForm.setValue("opportunityId", undefined);
                              }}
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
                  <FormField
                    control={blankForm.control}
                    name="accountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account</FormLabel>
                        <Select
                          onValueChange={(v) => {
                            field.onChange(v);
                            blankForm.setValue("opportunityId", undefined);
                          }}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(() => {
                              const isInternalProj = watchedInternalExternal === "Internal";
                              const filtered = isInternalProj
                                ? accounts?.filter(a => (a as any).isInternal === true || a.accountType === "internal")
                                : accounts;
                              if (isInternalProj && (!filtered || filtered.length === 0)) {
                                return (
                                  <div className="px-3 py-2 text-sm text-muted-foreground">
                                    No internal accounts found. Mark an account as internal in the Accounts module.
                                  </div>
                                );
                              }
                              return filtered?.map(acc => (
                                <SelectItem key={acc.id} value={acc.id.toString()}>
                                  <span className="flex items-center gap-2">
                                    {acc.name}
                                    {((acc as any).isInternal === true || acc.accountType === "internal") && (
                                      <Badge variant="outline" className="text-[10px] py-0 h-4 border-indigo-300 text-indigo-700 dark:text-indigo-300 dark:border-indigo-700">
                                        Internal
                                      </Badge>
                                    )}
                                  </span>
                                </SelectItem>
                              ));
                            })()}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Opportunity linkage — only for External projects with a won opp for this account */}
                  {watchedInternalExternal === "External" && Number(watchedAccountId) > 0 && wonOpportunities.length > 0 && (
                    <FormField
                      control={blankForm.control}
                      name="opportunityId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Link to Opportunity <span className="text-muted-foreground font-normal">(optional)</span>
                          </FormLabel>
                          <Select
                            onValueChange={(v) => field.onChange(v === "none" ? undefined : Number(v))}
                            value={field.value ? String(field.value) : "none"}
                          >
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select won opportunity" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">— None —</SelectItem>
                              {wonOpportunities.map((opp: any) => (
                                <SelectItem key={opp.id} value={String(opp.id)}>
                                  <span className="flex items-center gap-2">
                                    {opp.name}
                                    <span className="text-xs text-muted-foreground">${Number(opp.value ?? 0).toLocaleString()}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">Linking an opportunity preserves the CRM-to-delivery chain for sales reporting.</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Customer Champion — External projects only */}
                  {watchedInternalExternal === "External" && (
                    <FormField
                      control={blankForm.control}
                      name="customerChampion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Customer Champion <span className="text-muted-foreground font-normal">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Name of key contact at the client" {...field} />
                          </FormControl>
                          <p className="text-xs text-muted-foreground mt-1">Used for CSAT surveys and stakeholder communications.</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
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
                    render={({ field }) => {
                      const empty = !field.value || !String(field.value).trim();
                      return (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl><Textarea placeholder="Project description" {...field} /></FormControl>
                          {empty && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                              Tip: adding a description makes this project much easier to find and understand later.
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>
              )}

              {/* ── Step 2: Timeline & Billing ───────────────── */}
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
                            <SelectItem value="Fixed Fee">Fixed Fee — single agreed amount</SelectItem>
                            <SelectItem value="T&M">T&M — rate × hours logged</SelectItem>
                            <SelectItem value="Retainer">Retainer — recurring periodic amount</SelectItem>
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
                          <FormLabel>
                            Budget ($)
                            {watchedBillingType !== "Fixed Fee" && (
                              <span className="ml-1 text-xs text-destructive">required</span>
                            )}
                          </FormLabel>
                          <FormControl><Input type="number" min={0} {...field} /></FormControl>
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
                          <FormControl><Input type="number" min={0} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {watchedBillingType === "T&M" && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                      T&M projects require a rate card (set in the next step) so billable amounts can be calculated from time entries.
                    </p>
                  )}
                  {watchedBillingType === "Retainer" && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                      Retainer projects bill at a fixed periodic amount. Set the total contract value here and configure billing schedules after creation.
                    </p>
                  )}
                </div>
              )}

              {/* ── Step 3: Team & Rate Card ─────────────────── */}
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
                    name="rateCardId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Rate Card
                          {(watchedBillingType === "T&M" || watchedBillingType === "Retainer") && (
                            <span className="ml-1 text-xs text-amber-600">recommended for {watchedBillingType}</span>
                          )}
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString() ?? ""}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select rate card (optional)" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">— None —</SelectItem>
                            {rateCards?.map(card => (
                              <SelectItem key={card.id} value={card.id.toString()}>
                                {card.name}
                                {card.currency && card.currency !== "USD" && (
                                  <span className="ml-1 text-xs text-muted-foreground">({card.currency})</span>
                                )}
                              </SelectItem>
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
                        <div className="border rounded-md divide-y max-h-44 overflow-y-auto">
                          {users?.map(user => {
                            const isChecked = watchedTeamMembers?.includes(user.id);
                            return (
                              <FormField
                                key={user.id}
                                control={blankForm.control}
                                name="teamMembers"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center gap-3 px-3 py-2 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={checked => {
                                          if (checked) {
                                            field.onChange([...field.value, user.id]);
                                            setMemberConfig(prev => ({
                                              ...prev,
                                              [user.id]: { role: "Team Member", hoursPerWeek: 40 },
                                            }));
                                          } else {
                                            field.onChange(field.value?.filter(v => v !== user.id));
                                            setMemberConfig(prev => {
                                              const next = { ...prev };
                                              delete next[user.id];
                                              return next;
                                            });
                                          }
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal flex-1 cursor-pointer">{user.name}</FormLabel>
                                    {(user as any).title && (
                                      <span className="text-xs text-muted-foreground">{(user as any).title}</span>
                                    )}
                                  </FormItem>
                                )}
                              />
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Per-member role & hours configuration */}
                  {watchedTeamMembers && watchedTeamMembers.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Member configuration</p>
                      <div className="border rounded-md divide-y">
                        {watchedTeamMembers.map(userId => {
                          const user = users?.find(u => u.id === userId);
                          if (!user) return null;
                          const cfg = memberConfig[userId] ?? { role: "Team Member", hoursPerWeek: 40 };
                          return (
                            <div key={userId} className="px-3 py-2 grid grid-cols-[1fr_auto_auto] items-center gap-3">
                              <span className="text-sm font-medium truncate">{user.name}</span>
                              <select
                                className="text-sm border rounded px-2 py-1 bg-background"
                                value={cfg.role}
                                onChange={e => setMemberConfig(prev => ({
                                  ...prev,
                                  [userId]: { ...cfg, role: e.target.value },
                                }))}
                              >
                                {TEAM_ROLES.map(r => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                              </select>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={1}
                                  max={80}
                                  className="w-16 text-sm border rounded px-2 py-1 bg-background text-right"
                                  value={cfg.hoursPerWeek}
                                  onChange={e => setMemberConfig(prev => ({
                                    ...prev,
                                    [userId]: { ...cfg, hoursPerWeek: Math.max(1, Math.min(80, Number(e.target.value) || 40)) },
                                  }))}
                                />
                                <span className="text-xs text-muted-foreground whitespace-nowrap">h/wk</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">Allocations are created as soft (tentative) so they do not trigger conflict alerts.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 4: Starting Point ───────────────────── */}
              {step === 4 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Starting Point</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose how you want to populate this project's phases and tasks.
                  </p>
                  <div className="space-y-2">
                    {[
                      { id: "blank" as const, title: "Start blank", desc: "Create the project with no phases or tasks. You can add them manually." },
                      { id: "template" as const, title: "Start from a template", desc: "Apply a project template to scaffold phases and tasks." },
                      { id: "later" as const, title: "Decide later", desc: "Create the project now and pick a starting point afterwards." },
                    ].map((opt) => {
                      const selected = startingPoint === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setStartingPoint(opt.id)}
                          className={`w-full text-left rounded-md border p-3 transition-colors ${
                            selected ? "border-primary bg-accent" : "hover:bg-accent/50"
                          }`}
                          data-testid={`starting-point-${opt.id}`}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 ${
                              selected ? "border-primary bg-primary" : "border-muted-foreground"
                            }`} />
                            <div>
                              <div className="font-medium text-sm">{opt.title}</div>
                              <div className="text-xs text-muted-foreground">{opt.desc}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {startingPoint === "template" && (
                    <div className="space-y-2 pt-2">
                      <label className="text-sm font-medium">Template</label>
                      <Select
                        value={postCreateTemplateId ? String(postCreateTemplateId) : ""}
                        onValueChange={(v) => setPostCreateTemplateId(parseInt(v, 10))}
                      >
                        <SelectTrigger data-testid="select-post-create-template">
                          <SelectValue placeholder="Choose a template..." />
                        </SelectTrigger>
                        <SelectContent>
                          {templates?.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!templates?.length && (
                        <p className="text-xs text-muted-foreground">
                          No templates available. Pick another option or create one in Project Templates.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 5: Review ───────────────────────────── */}
              {step === 5 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Review Project Details</h3>
                  <div className="rounded-lg border divide-y text-sm">
                    {/* Basics */}
                    <div className="px-3 py-2 grid grid-cols-[140px_1fr] gap-1">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{blankForm.getValues("name")}</span>
                    </div>
                    {blankForm.getValues("description") && (
                      <div className="px-3 py-2 grid grid-cols-[140px_1fr] gap-1">
                        <span className="text-muted-foreground">Description</span>
                        <span className="text-muted-foreground italic line-clamp-2">{blankForm.getValues("description")}</span>
                      </div>
                    )}
                    <div className="px-3 py-2 grid grid-cols-[140px_1fr] gap-1">
                      <span className="text-muted-foreground">Account</span>
                      <span>{accounts?.find(a => a.id === Number(blankForm.getValues("accountId")))?.name ?? "—"}</span>
                    </div>
                    <div className="px-3 py-2 grid grid-cols-[140px_1fr] gap-1">
                      <span className="text-muted-foreground">Project Type</span>
                      <span>{blankForm.getValues("internalExternal")}</span>
                    </div>
                    {blankForm.getValues("opportunityId") && (
                      <div className="px-3 py-2 grid grid-cols-[140px_1fr] gap-1">
                        <span className="text-muted-foreground">Opportunity</span>
                        <span>{wonOpportunities.find((o: any) => o.id === blankForm.getValues("opportunityId"))?.name ?? `#${blankForm.getValues("opportunityId")}`}</span>
                      </div>
                    )}
                    {blankForm.getValues("customerChampion") && (
                      <div className="px-3 py-2 grid grid-cols-[140px_1fr] gap-1">
                        <span className="text-muted-foreground">Customer Champion</span>
                        <span>{blankForm.getValues("customerChampion")}</span>
                      </div>
                    )}
                    {/* Timeline & Billing */}
                    <div className="px-3 py-2 grid grid-cols-[140px_1fr] gap-1">
                      <span className="text-muted-foreground">Start Date</span>
                      <span>{blankForm.getValues("startDate")}</span>
                    </div>
                    <div className="px-3 py-2 grid grid-cols-[140px_1fr] gap-1">
                      <span className="text-muted-foreground">Due Date</span>
                      <span>{blankForm.getValues("dueDate")}</span>
                    </div>
                    <div className="px-3 py-2 grid grid-cols-[140px_1fr] gap-1">
                      <span className="text-muted-foreground">Billing Type</span>
                      <span>{blankForm.getValues("billingType")}</span>
                    </div>
                    <div className="px-3 py-2 grid grid-cols-[140px_1fr] gap-1">
                      <span className="text-muted-foreground">Budget</span>
                      <span className={blankForm.getValues("budget") === 0 ? "text-amber-600" : ""}>
                        ${Number(blankForm.getValues("budget")).toLocaleString()}
                        {blankForm.getValues("budget") === 0 && " — no budget set"}
                      </span>
                    </div>
                    <div className="px-3 py-2 grid grid-cols-[140px_1fr] gap-1">
                      <span className="text-muted-foreground">Budgeted Hours</span>
                      <span>{Number(blankForm.getValues("budgetedHours")).toLocaleString()} h</span>
                    </div>
                    {/* Team */}
                    <div className="px-3 py-2 grid grid-cols-[140px_1fr] gap-1">
                      <span className="text-muted-foreground">Owner</span>
                      <span>{users?.find(u => u.id === Number(blankForm.getValues("ownerId")))?.name ?? "—"}</span>
                    </div>
                    {blankForm.getValues("rateCardId") && (
                      <div className="px-3 py-2 grid grid-cols-[140px_1fr] gap-1">
                        <span className="text-muted-foreground">Rate Card</span>
                        <span>{rateCards?.find(r => r.id === Number(blankForm.getValues("rateCardId")))?.name ?? "—"}</span>
                      </div>
                    )}
                    {watchedTeamMembers && watchedTeamMembers.length > 0 && (
                      <div className="px-3 py-2 grid grid-cols-[140px_1fr] gap-1">
                        <span className="text-muted-foreground">Team</span>
                        <div className="flex flex-wrap gap-1">
                          {watchedTeamMembers.map(uid => {
                            const user = users?.find(u => u.id === uid);
                            const cfg = memberConfig[uid];
                            return (
                              <Badge key={uid} variant="secondary" className="text-xs font-normal">
                                {user?.name ?? `User #${uid}`}
                                {cfg && <span className="ml-1 text-muted-foreground">· {cfg.role} · {cfg.hoursPerWeek}h</span>}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* Starting point */}
                    <div className="px-3 py-2 grid grid-cols-[140px_1fr] gap-1">
                      <span className="text-muted-foreground">Starting Point</span>
                      <span>
                        {startingPoint === "blank" && "Blank — add tasks manually"}
                        {startingPoint === "template" && `From template: ${templates?.find(t => t.id === postCreateTemplateId)?.name ?? "—"}`}
                        {startingPoint === "later" && "Decide later"}
                      </span>
                    </div>
                    <div className="px-3 py-2 grid grid-cols-[140px_1fr] gap-1">
                      <span className="text-muted-foreground">Initial Status</span>
                      <span><Badge variant="outline">Draft</Badge></span>
                    </div>
                  </div>
                  {Number(blankForm.getValues("budget")) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      An SOW budget entry of <span className="font-medium">${Number(blankForm.getValues("budget")).toLocaleString()}</span> will be recorded in the budget ledger automatically.
                    </p>
                  )}
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
                {step === 4 && <Button type="button" onClick={validateStep4}>Next</Button>}
                {step === 5 && (
                  <Button type="submit" disabled={createProject.isPending || applyTemplate.isPending}>
                    {createProject.isPending || applyTemplate.isPending ? "Creating..." : "Create Project"}
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
