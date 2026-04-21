import { useState } from "react";
import {
  useListForms, useCreateForm, useDeleteForm,
  useGetForm, useCreateFormField, useDeleteFormField,
  useListFormResponses, useSubmitFormResponse,
  getListFormsQueryKey, getGetFormQueryKey, getListFormResponsesQueryKey,
} from "@workspace/api-client-react";
import type { ProjectFormDetail, FormField, FormResponse } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, FileQuestion, ChevronLeft, Send, Eye, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  projectId: number;
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Short Text",
  textarea: "Long Text",
  number: "Number",
  boolean: "Yes / No",
  select: "Dropdown",
  date: "Date",
};

export function ProjectForms({ projectId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: forms, isLoading } = useListForms(
    { projectId },
    { query: { enabled: !!projectId, queryKey: getListFormsQueryKey({ projectId }) } }
  );

  const createForm = useCreateForm();
  const deleteFormMut = useDeleteForm();

  const [createOpen, setCreateOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({ name: "", description: "" });
  const [deleteFormId, setDeleteFormId] = useState<number | null>(null);

  const [viewFormId, setViewFormId] = useState<number | null>(null);
  const [activeFormView, setActiveFormView] = useState<"builder" | "responses">("builder");

  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [fieldForm, setFieldForm] = useState({ label: "", fieldType: "text", isRequired: false, options: "" });

  const [fillOpen, setFillOpen] = useState(false);
  const [fillData, setFillData] = useState<Record<string, string>>({});

  const [responseViewId, setResponseViewId] = useState<number | null>(null);

  const { data: formDetail } = useGetForm(
    viewFormId ?? 0,
    { query: { enabled: !!viewFormId, queryKey: getGetFormQueryKey(viewFormId ?? 0) } }
  );

  const { data: responses } = useListFormResponses(
    viewFormId ?? 0,
    { query: { enabled: !!viewFormId && activeFormView === "responses", queryKey: getListFormResponsesQueryKey(viewFormId ?? 0) } }
  );

  const createFieldMut = useCreateFormField();
  const deleteFieldMut = useDeleteFormField();
  const submitResponseMut = useSubmitFormResponse();

  async function handleCreateForm() {
    if (!createFormData.name) return;
    try {
      await createForm.mutateAsync({
        data: { projectId, name: createFormData.name, description: createFormData.description || undefined },
      });
      queryClient.invalidateQueries({ queryKey: getListFormsQueryKey({ projectId }) });
      toast({ title: "Form created" });
      setCreateOpen(false);
      setCreateFormData({ name: "", description: "" });
    } catch {
      toast({ title: "Failed to create form", variant: "destructive" });
    }
  }

  async function handleDeleteForm(id: number) {
    try {
      await deleteFormMut.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListFormsQueryKey({ projectId }) });
      toast({ title: "Form deleted" });
      setDeleteFormId(null);
      if (viewFormId === id) setViewFormId(null);
    } catch {
      toast({ title: "Failed to delete form", variant: "destructive" });
    }
  }

  async function handleAddField() {
    if (!viewFormId || !fieldForm.label || !fieldForm.fieldType) return;
    const options = fieldForm.options
      ? fieldForm.options.split(",").map(s => s.trim()).filter(Boolean)
      : [];
    try {
      await createFieldMut.mutateAsync({
        id: viewFormId,
        data: {
          label: fieldForm.label,
          fieldType: fieldForm.fieldType,
          isRequired: fieldForm.isRequired,
          options,
          order: (formDetail?.fields?.length ?? 0) + 1,
        },
      });
      queryClient.invalidateQueries({ queryKey: getGetFormQueryKey(viewFormId) });
      toast({ title: "Field added" });
      setAddFieldOpen(false);
      setFieldForm({ label: "", fieldType: "text", isRequired: false, options: "" });
    } catch {
      toast({ title: "Failed to add field", variant: "destructive" });
    }
  }

  async function handleDeleteField(fieldId: number) {
    if (!viewFormId) return;
    try {
      await deleteFieldMut.mutateAsync({ id: viewFormId, fieldId });
      queryClient.invalidateQueries({ queryKey: getGetFormQueryKey(viewFormId) });
      toast({ title: "Field removed" });
    } catch {
      toast({ title: "Failed to remove field", variant: "destructive" });
    }
  }

  function openFillForm() {
    const initial: Record<string, string> = {};
    formDetail?.fields?.forEach((f: FormField) => { initial[f.id.toString()] = ""; });
    setFillData(initial);
    setFillOpen(true);
  }

  async function handleSubmitResponse() {
    if (!viewFormId) return;
    try {
      await submitResponseMut.mutateAsync({ id: viewFormId, data: { responses: fillData } });
      queryClient.invalidateQueries({ queryKey: getListFormsQueryKey({ projectId }) });
      queryClient.invalidateQueries({ queryKey: getListFormResponsesQueryKey(viewFormId) });
      toast({ title: "Response submitted" });
      setFillOpen(false);
    } catch {
      toast({ title: "Failed to submit response", variant: "destructive" });
    }
  }

  const responseToView = responses?.find(r => r.id === responseViewId);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Forms</CardTitle>
            <CardDescription>Data collection forms for this project</CardDescription>
          </div>
          {!viewFormId && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> New Form
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {viewFormId && formDetail ? (
            <FormDetailView
              form={formDetail}
              activeView={activeFormView}
              responses={responses ?? []}
              onBack={() => setViewFormId(null)}
              onSwitchView={setActiveFormView}
              onAddField={() => setAddFieldOpen(true)}
              onDeleteField={handleDeleteField}
              onFill={openFillForm}
              onDeleteForm={() => setDeleteFormId(viewFormId)}
              onViewResponse={setResponseViewId}
            />
          ) : isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded" />)}
            </div>
          ) : !forms?.length ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground gap-2">
              <FileQuestion className="h-10 w-10 opacity-30" />
              <p className="text-sm">No forms yet. Create one to start collecting data.</p>
            </div>
          ) : (
            <div className="divide-y">
              {forms.map(form => (
                <div key={form.id} className="flex items-center justify-between py-3 gap-3">
                  <button
                    className="flex items-center gap-3 flex-1 text-left hover:bg-muted/40 rounded px-2 py-1 transition-colors"
                    onClick={() => { setViewFormId(form.id); setActiveFormView("builder"); }}
                  >
                    <FileQuestion className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{form.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {form.description || "No description"} · {form.submissionCount} response{form.submissionCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={form.isActive ? "default" : "secondary"} className="text-xs">
                      {form.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{new Date(form.createdAt).toLocaleDateString()}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteFormId(form.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Form</DialogTitle>
            <DialogDescription>Create a data collection form for this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Form Name *</Label>
              <Input
                placeholder="e.g. Project Kickoff Survey"
                value={createFormData.name}
                onChange={e => setCreateFormData(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the purpose of this form..."
                value={createFormData.description}
                onChange={e => setCreateFormData(f => ({ ...f, description: e.target.value }))}
                className="h-20 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateForm} disabled={!createFormData.name || createForm.isPending}>Create Form</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addFieldOpen} onOpenChange={setAddFieldOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Field</DialogTitle>
            <DialogDescription>Add a new question or input field to this form.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Field Label *</Label>
              <Input
                placeholder="e.g. What is your name?"
                value={fieldForm.label}
                onChange={e => setFieldForm(f => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Field Type</Label>
              <Select value={fieldForm.fieldType} onValueChange={v => setFieldForm(f => ({ ...f, fieldType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FIELD_TYPE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {fieldForm.fieldType === "select" && (
              <div className="space-y-1.5">
                <Label>Options <span className="text-muted-foreground font-normal">(comma-separated)</span></Label>
                <Input
                  placeholder="Option A, Option B, Option C"
                  value={fieldForm.options}
                  onChange={e => setFieldForm(f => ({ ...f, options: e.target.value }))}
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label>Required field</Label>
              <Switch
                checked={fieldForm.isRequired}
                onCheckedChange={v => setFieldForm(f => ({ ...f, isRequired: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFieldOpen(false)}>Cancel</Button>
            <Button onClick={handleAddField} disabled={!fieldForm.label || createFieldMut.isPending}>Add Field</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={fillOpen} onOpenChange={setFillOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{formDetail?.name}</DialogTitle>
            <DialogDescription>{formDetail?.description || "Fill out all required fields and submit."}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto space-y-4">
            {formDetail?.fields?.map((field: FormField) => (
              <div key={field.id} className="space-y-1.5">
                <Label>
                  {field.label}
                  {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {field.fieldType === "textarea" ? (
                  <Textarea
                    className="resize-none h-20"
                    value={fillData[field.id.toString()] ?? ""}
                    onChange={e => setFillData(d => ({ ...d, [field.id.toString()]: e.target.value }))}
                  />
                ) : field.fieldType === "select" ? (
                  <Select
                    value={fillData[field.id.toString()] || ""}
                    onValueChange={v => setFillData(d => ({ ...d, [field.id.toString()]: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select an option" /></SelectTrigger>
                    <SelectContent>
                      {(field.options as string[])?.map((opt: string) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.fieldType === "boolean" ? (
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={fillData[field.id.toString()] === "true"}
                      onCheckedChange={v => setFillData(d => ({ ...d, [field.id.toString()]: v.toString() }))}
                    />
                    <span className="text-sm text-muted-foreground">{fillData[field.id.toString()] === "true" ? "Yes" : "No"}</span>
                  </div>
                ) : field.fieldType === "date" ? (
                  <Input
                    type="date"
                    value={fillData[field.id.toString()] ?? ""}
                    onChange={e => setFillData(d => ({ ...d, [field.id.toString()]: e.target.value }))}
                  />
                ) : (
                  <Input
                    type={field.fieldType === "number" ? "number" : "text"}
                    value={fillData[field.id.toString()] ?? ""}
                    onChange={e => setFillData(d => ({ ...d, [field.id.toString()]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFillOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitResponse} disabled={submitResponseMut.isPending}>
              <Send className="h-4 w-4 mr-2" />
              {submitResponseMut.isPending ? "Submitting…" : "Submit Response"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!responseViewId} onOpenChange={() => setResponseViewId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Response Details</DialogTitle>
            <DialogDescription>
              Submitted {responseToView ? new Date(responseToView.submittedAt).toLocaleString() : ""}
            </DialogDescription>
          </DialogHeader>
          {responseToView && formDetail && (
            <div className="space-y-3">
              {formDetail.fields?.map((f: FormField) => (
                <div key={f.id} className="space-y-0.5">
                  <p className="text-xs text-muted-foreground font-medium">{f.label}</p>
                  <p className="text-sm">{(responseToView.responses as Record<string, string>)[f.id.toString()] || <span className="italic text-muted-foreground">No answer</span>}</p>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResponseViewId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteFormId} onOpenChange={() => setDeleteFormId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Form</DialogTitle>
            <DialogDescription>This will permanently delete the form, all its fields, and all collected responses. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteFormId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteFormId && handleDeleteForm(deleteFormId)} disabled={deleteFormMut.isPending}>
              Delete Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface FormDetailViewProps {
  form: ProjectFormDetail;
  activeView: "builder" | "responses";
  responses: FormResponse[];
  onBack: () => void;
  onSwitchView: (v: "builder" | "responses") => void;
  onAddField: () => void;
  onDeleteField: (fieldId: number) => void;
  onFill: () => void;
  onDeleteForm: () => void;
  onViewResponse: (id: number) => void;
}

function FormDetailView({
  form, activeView, responses,
  onBack, onSwitchView, onAddField, onDeleteField, onFill, onDeleteForm, onViewResponse,
}: FormDetailViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          All Forms
        </button>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onFill} disabled={!form.fields?.length}>
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Fill Out Form
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onDeleteForm}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold">{form.name}</h3>
        {form.description && <p className="text-sm text-muted-foreground">{form.description}</p>}
      </div>

      <div className="flex items-center gap-1 border-b pb-1">
        <button
          onClick={() => onSwitchView("builder")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${activeView === "builder" ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Settings className="h-3.5 w-3.5" />
          Fields ({form.fields?.length ?? 0})
        </button>
        <button
          onClick={() => onSwitchView("responses")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${activeView === "responses" ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Eye className="h-3.5 w-3.5" />
          Responses ({form.submissionCount})
        </button>
      </div>

      {activeView === "builder" ? (
        <div className="space-y-3">
          {!form.fields?.length ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground gap-2 border-2 border-dashed rounded-lg">
              <p className="text-sm">No fields yet. Add a field to build your form.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(form.fields as FormField[]).map((field, idx) => (
                <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-5 text-right">{idx + 1}.</span>
                    <div>
                      <p className="text-sm font-medium">
                        {field.label}
                        {field.isRequired && <span className="text-red-500 ml-1 text-xs">*</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {FIELD_TYPE_LABELS[field.fieldType] ?? field.fieldType}
                        {Array.isArray(field.options) && field.options.length > 0 && ` · ${(field.options as string[]).join(", ")}`}
                      </p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDeleteField(field.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button size="sm" variant="outline" onClick={onAddField} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Add Field
          </Button>
        </div>
      ) : (
        <div>
          {!responses?.length ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground gap-2">
              <p className="text-sm">No responses yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Respondent</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.map((resp, idx) => (
                  <TableRow key={resp.id}>
                    <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                    <TableCell className="text-sm">
                      {resp.submitterEmail || (resp.submittedByUserId ? `User #${resp.submittedByUserId}` : "Anonymous")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(resp.submittedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => onViewResponse(resp.id)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}
