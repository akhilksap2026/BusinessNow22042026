import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListUsers,
  useListProjectTemplates,
  useCreateProjectTemplate,
  useDeleteProjectTemplate,
  getListProjectTemplatesQueryKey,
  useListSkillCategories,
  useCreateSkillCategory,
  useDeleteSkillCategory,
  useListSkills,
  useCreateSkill,
  useDeleteSkill,
  getListSkillCategoriesQueryKey,
  getListSkillsQueryKey,
  useListTaxCodes,
  useCreateTaxCode,
  useUpdateTaxCode,
  useDeleteTaxCode,
  getListTaxCodesQueryKey,
  useListTimeCategories,
  useCreateTimeCategory,
  useUpdateTimeCategory,
  useDeleteTimeCategory,
  getListTimeCategoriesQueryKey,
  useListHolidayCalendars,
  useCreateHolidayCalendar,
  useDeleteHolidayCalendar,
  useListHolidayDates,
  useCreateHolidayDate,
  useDeleteHolidayDate,
  getListHolidayCalendarsQueryKey,
  getListHolidayDatesQueryKey,
  useListRateCards,
  useCreateRateCard,
  useUpdateRateCard,
  useDeleteRateCard,
  getListRateCardsQueryKey,
  useListCustomFieldDefinitions,
  useCreateCustomFieldDefinition,
  useUpdateCustomFieldDefinition,
  useDeleteCustomFieldDefinition,
  getListCustomFieldDefinitionsQueryKey,
  useListAuditLog,
  getListAuditLogQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Trash2, LayoutTemplate, Users, Calendar, Layers, Star, Tag, Cpu, Percent, Clock, CalendarDays, Pencil, X, CreditCard, SlidersHorizontal, Activity, ChevronRight, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const { data: users, isLoading: isLoadingUsers } = useListUsers();
  const { data: templates, isLoading: isLoadingTemplates } = useListProjectTemplates();
  const { data: categories, isLoading: isLoadingCategories } = useListSkillCategories();
  const { data: skills, isLoading: isLoadingSkills } = useListSkills();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createTemplate = useCreateProjectTemplate();
  const deleteTemplate = useDeleteProjectTemplate();
  const createCategory = useCreateSkillCategory();
  const deleteCategory = useDeleteSkillCategory();
  const createSkill = useCreateSkill();
  const deleteSkill = useDeleteSkill();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogId, setDeleteDialogId] = useState<number | null>(null);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [deleteCategoryId, setDeleteCategoryId] = useState<number | null>(null);

  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategoryId, setNewSkillCategoryId] = useState("");
  const [deleteSkillId, setDeleteSkillId] = useState<number | null>(null);

  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");

  const { data: taxCodes, isLoading: isLoadingTaxCodes } = useListTaxCodes();
  const createTaxCode = useCreateTaxCode();
  const updateTaxCode = useUpdateTaxCode();
  const deleteTaxCode = useDeleteTaxCode();

  const { data: timeCategories, isLoading: isLoadingTimeCategories } = useListTimeCategories();
  const createTimeCategory = useCreateTimeCategory();
  const updateTimeCategory = useUpdateTimeCategory();
  const deleteTimeCategory = useDeleteTimeCategory();

  const { data: holidayCalendars, isLoading: isLoadingHolidayCalendars } = useListHolidayCalendars();
  const createHolidayCalendar = useCreateHolidayCalendar();
  const deleteHolidayCalendar = useDeleteHolidayCalendar();
  const createHolidayDate = useCreateHolidayDate();
  const deleteHolidayDate = useDeleteHolidayDate();

  const [selectedCalendarId, setSelectedCalendarId] = useState<number | null>(null);
  const { data: holidayDates } = useListHolidayDates(selectedCalendarId ?? 0, {
    query: { enabled: !!selectedCalendarId, queryKey: [...getListHolidayDatesQueryKey(selectedCalendarId ?? 0)] },
  });

  const [taxCodeDialogOpen, setTaxCodeDialogOpen] = useState(false);
  const [editTaxCodeId, setEditTaxCodeId] = useState<number | null>(null);
  const [deleteTaxCodeId, setDeleteTaxCodeId] = useState<number | null>(null);
  const [taxCodeForm, setTaxCodeForm] = useState({ name: "", rate: "", description: "", isDefault: false });

  const [timeCategoryDialogOpen, setTimeCategoryDialogOpen] = useState(false);
  const [editTimeCategoryId, setEditTimeCategoryId] = useState<number | null>(null);
  const [deleteTimeCategoryId, setDeleteTimeCategoryId] = useState<number | null>(null);
  const [timeCategoryForm, setTimeCategoryForm] = useState({ name: "", description: "" });

  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const [deleteCalendarId, setDeleteCalendarId] = useState<number | null>(null);
  const [newCalendarName, setNewCalendarName] = useState("");
  const [newCalendarDesc, setNewCalendarDesc] = useState("");
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [newDateName, setNewDateName] = useState("");
  const [newDateValue, setNewDateValue] = useState("");

  const { data: rateCards, isLoading: isLoadingRateCards } = useListRateCards();
  const createRateCard = useCreateRateCard();
  const updateRateCard = useUpdateRateCard();
  const deleteRateCard = useDeleteRateCard();
  const [rateCardDialogOpen, setRateCardDialogOpen] = useState(false);
  const [editRateCardId, setEditRateCardId] = useState<number | null>(null);
  const [deleteRateCardId, setDeleteRateCardId] = useState<number | null>(null);
  const [rcForm, setRcForm] = useState({ name: "", currency: "USD", status: "Active", effectiveDate: "" });
  const [rcRoles, setRcRoles] = useState<{ role: string; rate: number }[]>([]);
  const [rcNewRole, setRcNewRole] = useState({ role: "", rate: "" });

  const [cfEntityFilter, setCfEntityFilter] = useState<string>("all");
  const { data: cfDefinitions, isLoading: isLoadingCf } = useListCustomFieldDefinitions(
    cfEntityFilter !== "all" ? { entityType: cfEntityFilter } : undefined,
    { query: { queryKey: getListCustomFieldDefinitionsQueryKey(cfEntityFilter !== "all" ? { entityType: cfEntityFilter } : undefined) } }
  );
  const createCfDef = useCreateCustomFieldDefinition();
  const updateCfDef = useUpdateCustomFieldDefinition();
  const deleteCfDef = useDeleteCustomFieldDefinition();
  const [cfDialogOpen, setCfDialogOpen] = useState(false);
  const [editCfId, setEditCfId] = useState<number | null>(null);
  const [deleteCfId, setDeleteCfId] = useState<number | null>(null);
  const [cfForm, setCfForm] = useState({ entityType: "project", name: "", fieldType: "text", isRequired: false, options: "" });

  const [auditEntityFilter, setAuditEntityFilter] = useState<string>("all");
  const { data: auditEntries, isLoading: isLoadingAudit } = useListAuditLog(
    auditEntityFilter !== "all" ? { entityType: auditEntityFilter } : undefined,
    { query: { queryKey: getListAuditLogQueryKey(auditEntityFilter !== "all" ? { entityType: auditEntityFilter } : undefined) } }
  );

  async function handleSaveTaxCode() {
    if (!taxCodeForm.name || !taxCodeForm.rate) return;
    try {
      if (editTaxCodeId) {
        await updateTaxCode.mutateAsync({ id: editTaxCodeId, data: { name: taxCodeForm.name, rate: parseFloat(taxCodeForm.rate), description: taxCodeForm.description, isDefault: taxCodeForm.isDefault } });
      } else {
        await createTaxCode.mutateAsync({ data: { name: taxCodeForm.name, rate: parseFloat(taxCodeForm.rate), description: taxCodeForm.description, isDefault: taxCodeForm.isDefault } });
      }
      queryClient.invalidateQueries({ queryKey: getListTaxCodesQueryKey() });
      toast({ title: editTaxCodeId ? "Tax code updated" : "Tax code created" });
      setTaxCodeDialogOpen(false);
      setEditTaxCodeId(null);
      setTaxCodeForm({ name: "", rate: "", description: "", isDefault: false });
    } catch {
      toast({ title: "Failed to save tax code", variant: "destructive" });
    }
  }

  async function handleDeleteTaxCode(id: number) {
    try {
      await deleteTaxCode.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListTaxCodesQueryKey() });
      toast({ title: "Tax code deleted" });
      setDeleteTaxCodeId(null);
    } catch {
      toast({ title: "Failed to delete tax code", variant: "destructive" });
    }
  }

  async function handleSaveTimeCategory() {
    if (!timeCategoryForm.name) return;
    try {
      if (editTimeCategoryId) {
        await updateTimeCategory.mutateAsync({ id: editTimeCategoryId, data: { name: timeCategoryForm.name, description: timeCategoryForm.description } });
      } else {
        await createTimeCategory.mutateAsync({ data: { name: timeCategoryForm.name, description: timeCategoryForm.description } });
      }
      queryClient.invalidateQueries({ queryKey: getListTimeCategoriesQueryKey() });
      toast({ title: editTimeCategoryId ? "Category updated" : "Category created" });
      setTimeCategoryDialogOpen(false);
      setEditTimeCategoryId(null);
      setTimeCategoryForm({ name: "", description: "" });
    } catch {
      toast({ title: "Failed to save category", variant: "destructive" });
    }
  }

  async function handleDeleteTimeCategory(id: number) {
    try {
      await deleteTimeCategory.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListTimeCategoriesQueryKey() });
      toast({ title: "Time category deleted" });
      setDeleteTimeCategoryId(null);
    } catch {
      toast({ title: "Failed to delete category", variant: "destructive" });
    }
  }

  async function handleCreateCalendar() {
    if (!newCalendarName) return;
    try {
      await createHolidayCalendar.mutateAsync({ data: { name: newCalendarName, description: newCalendarDesc || undefined } });
      queryClient.invalidateQueries({ queryKey: getListHolidayCalendarsQueryKey() });
      toast({ title: "Calendar created" });
      setCalendarDialogOpen(false);
      setNewCalendarName("");
      setNewCalendarDesc("");
    } catch {
      toast({ title: "Failed to create calendar", variant: "destructive" });
    }
  }

  async function handleDeleteCalendar(id: number) {
    try {
      await deleteHolidayCalendar.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListHolidayCalendarsQueryKey() });
      toast({ title: "Calendar deleted" });
      setDeleteCalendarId(null);
      if (selectedCalendarId === id) setSelectedCalendarId(null);
    } catch {
      toast({ title: "Failed to delete calendar", variant: "destructive" });
    }
  }

  async function handleAddHolidayDate() {
    if (!newDateName || !newDateValue || !selectedCalendarId) return;
    try {
      await createHolidayDate.mutateAsync({ id: selectedCalendarId, data: { name: newDateName, date: newDateValue } });
      queryClient.invalidateQueries({ queryKey: getListHolidayDatesQueryKey(selectedCalendarId) });
      toast({ title: "Holiday date added" });
      setDateDialogOpen(false);
      setNewDateName("");
      setNewDateValue("");
    } catch {
      toast({ title: "Failed to add holiday", variant: "destructive" });
    }
  }

  async function handleDeleteHolidayDate(dateId: number) {
    if (!selectedCalendarId) return;
    try {
      await deleteHolidayDate.mutateAsync({ id: selectedCalendarId, dateId });
      queryClient.invalidateQueries({ queryKey: getListHolidayDatesQueryKey(selectedCalendarId) });
      toast({ title: "Holiday removed" });
    } catch {
      toast({ title: "Failed to remove holiday", variant: "destructive" });
    }
  }

  const [form, setForm] = useState({
    name: "",
    description: "",
    billingType: "Fixed Fee",
    durationDays: 90,
  });

  async function handleCreate() {
    if (!form.name) return;
    try {
      await createTemplate.mutateAsync({
        data: { name: form.name, description: form.description || undefined, billingType: form.billingType, durationDays: form.durationDays }
      });
      queryClient.invalidateQueries({ queryKey: getListProjectTemplatesQueryKey() });
      toast({ title: "Template created" });
      setCreateDialogOpen(false);
      setForm({ name: "", description: "", billingType: "Fixed Fee", durationDays: 90 });
    } catch {
      toast({ title: "Failed to create template", variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteTemplate.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListProjectTemplatesQueryKey() });
      toast({ title: "Template deleted" });
      setDeleteDialogId(null);
    } catch {
      toast({ title: "Failed to delete template", variant: "destructive" });
    }
  }

  async function handleCreateCategory() {
    if (!newCategoryName) return;
    try {
      await createCategory.mutateAsync({ data: { name: newCategoryName } });
      queryClient.invalidateQueries({ queryKey: getListSkillCategoriesQueryKey() });
      toast({ title: "Category created" });
      setCategoryDialogOpen(false);
      setNewCategoryName("");
    } catch {
      toast({ title: "Failed to create category", variant: "destructive" });
    }
  }

  async function handleDeleteCategory(id: number) {
    try {
      await deleteCategory.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListSkillCategoriesQueryKey() });
      toast({ title: "Category deleted" });
      setDeleteCategoryId(null);
    } catch {
      toast({ title: "Failed to delete category", variant: "destructive" });
    }
  }

  async function handleCreateSkill() {
    if (!newSkillName) return;
    try {
      await createSkill.mutateAsync({
        data: { name: newSkillName, categoryId: newSkillCategoryId ? parseInt(newSkillCategoryId) : undefined }
      });
      queryClient.invalidateQueries({ queryKey: getListSkillsQueryKey() });
      toast({ title: "Skill created" });
      setSkillDialogOpen(false);
      setNewSkillName("");
      setNewSkillCategoryId("");
    } catch {
      toast({ title: "Failed to create skill", variant: "destructive" });
    }
  }

  async function handleDeleteSkill(id: number) {
    try {
      await deleteSkill.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListSkillsQueryKey() });
      toast({ title: "Skill deleted" });
      setDeleteSkillId(null);
    } catch {
      toast({ title: "Failed to delete skill", variant: "destructive" });
    }
  }

  async function handleSaveRateCard() {
    if (!rcForm.name) return;
    try {
      const payload = { name: rcForm.name, currency: rcForm.currency, status: rcForm.status, effectiveDate: rcForm.effectiveDate || undefined, roles: rcRoles };
      if (editRateCardId) {
        await updateRateCard.mutateAsync({ id: editRateCardId, data: payload });
      } else {
        await createRateCard.mutateAsync({ data: payload });
      }
      queryClient.invalidateQueries({ queryKey: getListRateCardsQueryKey() });
      toast({ title: editRateCardId ? "Rate card updated" : "Rate card created" });
      setRateCardDialogOpen(false);
      setEditRateCardId(null);
      setRcForm({ name: "", currency: "USD", status: "Active", effectiveDate: "" });
      setRcRoles([]);
      setRcNewRole({ role: "", rate: "" });
    } catch {
      toast({ title: "Failed to save rate card", variant: "destructive" });
    }
  }

  async function handleDeleteRateCard(id: number) {
    try {
      await deleteRateCard.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListRateCardsQueryKey() });
      toast({ title: "Rate card deleted" });
      setDeleteRateCardId(null);
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  }

  async function handleSaveCfDef() {
    if (!cfForm.name || !cfForm.entityType) return;
    const optionsArr = cfForm.options ? cfForm.options.split(",").map(s => s.trim()).filter(Boolean) : [];
    const payload = { entityType: cfForm.entityType, name: cfForm.name, fieldType: cfForm.fieldType, isRequired: cfForm.isRequired, options: optionsArr };
    try {
      if (editCfId) {
        await updateCfDef.mutateAsync({ id: editCfId, data: payload });
      } else {
        await createCfDef.mutateAsync({ data: payload });
      }
      queryClient.invalidateQueries({ queryKey: getListCustomFieldDefinitionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListCustomFieldDefinitionsQueryKey({ entityType: cfForm.entityType }) });
      toast({ title: editCfId ? "Field updated" : "Field created" });
      setCfDialogOpen(false);
      setEditCfId(null);
      setCfForm({ entityType: "project", name: "", fieldType: "text", isRequired: false, options: "" });
    } catch {
      toast({ title: "Failed to save custom field", variant: "destructive" });
    }
  }

  async function handleDeleteCfDef(id: number, entityType: string) {
    try {
      await deleteCfDef.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListCustomFieldDefinitionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListCustomFieldDefinitionsQueryKey({ entityType }) });
      toast({ title: "Custom field deleted" });
      setDeleteCfId(null);
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  }

  const filteredSkills = filterCategoryId === "all"
    ? (skills ?? [])
    : (skills ?? []).filter(s => s.categoryId === parseInt(filterCategoryId));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>
        </div>

        <Tabs defaultValue="users">
          <TabsList className="mb-4">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Users
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <LayoutTemplate className="h-4 w-4" /> Project Templates
            </TabsTrigger>
            <TabsTrigger value="skills" className="flex items-center gap-2">
              <Cpu className="h-4 w-4" /> Skills Matrix
            </TabsTrigger>
            <TabsTrigger value="taxcodes" className="flex items-center gap-2">
              <Percent className="h-4 w-4" /> Tax Codes
            </TabsTrigger>
            <TabsTrigger value="timecategories" className="flex items-center gap-2">
              <Clock className="h-4 w-4" /> Time Categories
            </TabsTrigger>
            <TabsTrigger value="holidays" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Holiday Calendars
            </TabsTrigger>
            <TabsTrigger value="ratecards" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Rate Cards
            </TabsTrigger>
            <TabsTrigger value="customfields" className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" /> Custom Fields
            </TabsTrigger>
            <TabsTrigger value="auditlog" className="flex items-center gap-2">
              <Activity className="h-4 w-4" /> Audit Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="m-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage team members, roles, and permissions</CardDescription>
                </div>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Add User</Button>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="space-y-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead className="text-right">Cost Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users?.map(user => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8"><AvatarFallback>{user.initials}</AvatarFallback></Avatar>
                              {user.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{user.email}</TableCell>
                          <TableCell><Badge variant="outline" className="font-normal">{user.role}</Badge></TableCell>
                          <TableCell>{user.department}</TableCell>
                          <TableCell className="text-right">${user.costRate}/hr</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="m-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Project Templates</CardTitle>
                  <CardDescription>Reusable project structures for faster onboarding</CardDescription>
                </div>
                <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> New Template
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingTemplates ? (
                  <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
                ) : templates?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <LayoutTemplate className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No templates yet</p>
                    <p className="text-sm mt-1">Create templates to speed up project creation.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {templates?.map(tmpl => (
                      <div key={tmpl.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{tmpl.name}</span>
                            <Badge variant="secondary" className="text-xs">{tmpl.billingType}</Badge>
                          </div>
                          {tmpl.description && <p className="text-sm text-muted-foreground">{tmpl.description}</p>}
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {tmpl.durationDays} days</span>
                            {tmpl.phases && (tmpl.phases as any[]).length > 0 && (
                              <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {(tmpl.phases as any[]).length} phases</span>
                            )}
                            <span className="text-muted-foreground/60">Created {tmpl.createdAt ? new Date(tmpl.createdAt).toLocaleDateString() : ""}</span>
                          </div>
                          {tmpl.phases && (tmpl.phases as any[]).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(tmpl.phases as any[]).map((ph: any, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs font-normal">{ph.name}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-red-500 shrink-0 ml-4" onClick={() => setDeleteDialogId(tmpl.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="skills" className="m-0 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Tag className="h-4 w-4" /> Skill Categories</CardTitle>
                    <CardDescription>Organise skills by discipline</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setCategoryDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add Category
                  </Button>
                </CardHeader>
                <CardContent>
                  {isLoadingCategories ? (
                    <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                  ) : categories?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Tag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No categories yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {categories?.map(cat => (
                        <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                          <div>
                            <span className="font-medium text-sm">{cat.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {skills?.filter(s => s.categoryId === cat.id).length ?? 0} skills
                            </span>
                          </div>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => setDeleteCategoryId(cat.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Star className="h-4 w-4" /> Skills</CardTitle>
                    <CardDescription>Individual skills assignable to team members</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => setSkillDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" /> Add Skill
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingSkills ? (
                    <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                  ) : filteredSkills.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No skills found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredSkills.map(skill => {
                        const cat = categories?.find(c => c.id === skill.categoryId);
                        return (
                          <div key={skill.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{skill.name}</span>
                              {cat && <Badge variant="secondary" className="text-xs">{cat.name}</Badge>}
                              {!skill.isActive && <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>}
                            </div>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => setDeleteSkillId(skill.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="taxcodes" className="m-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Percent className="h-4 w-4" /> Tax Codes</CardTitle>
                  <CardDescription>Configure GST, VAT, and other tax rates applied to invoices</CardDescription>
                </div>
                <Button size="sm" onClick={() => { setEditTaxCodeId(null); setTaxCodeForm({ name: "", rate: "", description: "", isDefault: false }); setTaxCodeDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Add Tax Code
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingTaxCodes ? (
                  <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : taxCodes?.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Percent className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No tax codes configured</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead>Default</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-20" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {taxCodes?.map(tc => (
                        <TableRow key={tc.id}>
                          <TableCell className="font-medium">{tc.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{tc.description ?? "—"}</TableCell>
                          <TableCell className="text-right">{tc.rate}%</TableCell>
                          <TableCell>{tc.isDefault ? <Badge variant="secondary" className="text-xs">Default</Badge> : "—"}</TableCell>
                          <TableCell>
                            <Badge variant={tc.isActive ? "outline" : "secondary"} className="text-xs">
                              {tc.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                                setEditTaxCodeId(tc.id);
                                setTaxCodeForm({ name: tc.name, rate: String(tc.rate), description: tc.description ?? "", isDefault: tc.isDefault });
                                setTaxCodeDialogOpen(true);
                              }}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => setDeleteTaxCodeId(tc.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timecategories" className="m-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" /> Time Categories</CardTitle>
                  <CardDescription>Define labels for time entries (e.g. Development, Design, Meetings)</CardDescription>
                </div>
                <Button size="sm" onClick={() => { setEditTimeCategoryId(null); setTimeCategoryForm({ name: "", description: "" }); setTimeCategoryDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Add Category
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingTimeCategories ? (
                  <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : timeCategories?.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No time categories yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {timeCategories?.map(tc => (
                      <div key={tc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div>
                          <p className="font-medium text-sm">{tc.name}</p>
                          {tc.description && <p className="text-xs text-muted-foreground mt-0.5">{tc.description}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant={tc.isActive ? "outline" : "secondary"} className="text-xs mr-2">
                            {tc.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                            setEditTimeCategoryId(tc.id);
                            setTimeCategoryForm({ name: tc.name, description: tc.description ?? "" });
                            setTimeCategoryDialogOpen(true);
                          }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => setDeleteTimeCategoryId(tc.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="holidays" className="m-0">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Holiday Calendars</CardTitle>
                    <CardDescription>Named calendars to block off non-working days</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setCalendarDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> New Calendar
                  </Button>
                </CardHeader>
                <CardContent>
                  {isLoadingHolidayCalendars ? (
                    <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                  ) : holidayCalendars?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No calendars yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {holidayCalendars?.map(cal => (
                        <div
                          key={cal.id}
                          onClick={() => setSelectedCalendarId(cal.id === selectedCalendarId ? null : cal.id)}
                          className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedCalendarId === cal.id ? "border-indigo-400 bg-indigo-50" : "hover:bg-muted/30"}`}
                        >
                          <div>
                            <p className="font-medium text-sm">{cal.name}</p>
                            {cal.description && <p className="text-xs text-muted-foreground mt-0.5">{cal.description}</p>}
                            <p className="text-xs text-muted-foreground mt-0.5">{cal.holidays?.length ?? 0} holidays</p>
                          </div>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={(e) => { e.stopPropagation(); setDeleteCalendarId(cal.id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {selectedCalendarId
                        ? `${holidayCalendars?.find(c => c.id === selectedCalendarId)?.name ?? "Calendar"} — Holidays`
                        : "Holiday Dates"}
                    </CardTitle>
                    <CardDescription>
                      {selectedCalendarId ? "Dates when team is off" : "Select a calendar to manage its dates"}
                    </CardDescription>
                  </div>
                  {selectedCalendarId && (
                    <Button size="sm" onClick={() => setDateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" /> Add Holiday
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {!selectedCalendarId ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Select a calendar on the left</p>
                    </div>
                  ) : (holidayDates?.length ?? 0) === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No holidays added yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {holidayDates?.sort((a, b) => a.date.localeCompare(b.date)).map(d => (
                        <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg group">
                          <div>
                            <p className="text-sm font-medium">{d.name}</p>
                            <p className="text-xs text-muted-foreground">{new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                          </div>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500" onClick={() => handleDeleteHolidayDate(d.id)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ratecards" className="m-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Rate Cards</CardTitle>
                  <CardDescription>Define billing rates per role for projects and clients</CardDescription>
                </div>
                <Button size="sm" onClick={() => { setEditRateCardId(null); setRcForm({ name: "", currency: "USD", status: "Active", effectiveDate: "" }); setRcRoles([]); setRateCardDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> New Rate Card
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingRateCards ? (
                  <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : (rateCards?.length ?? 0) === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No rate cards yet</p>
                    <p className="text-sm mt-1">Create rate cards to assign billing rates to project roles.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rateCards?.map(rc => (
                      <div key={rc.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{rc.name}</span>
                            <Badge variant={rc.status === "Active" ? "secondary" : "outline"} className="text-xs">{rc.status}</Badge>
                            <Badge variant="outline" className="text-xs font-mono">{rc.currency}</Badge>
                            {rc.effectiveDate && <span className="text-xs text-muted-foreground">Effective {rc.effectiveDate}</span>}
                          </div>
                          {(rc.roles as { role: string; rate: number }[]).length > 0 ? (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {(rc.roles as { role: string; rate: number }[]).map((r, i) => (
                                <span key={i} className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-xs">
                                  <span className="font-medium">{r.role}</span>
                                  <ChevronRight className="h-3 w-3 opacity-40" />
                                  <span>${r.rate}/hr</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No role rates defined</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-4 shrink-0">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                            setEditRateCardId(rc.id);
                            setRcForm({ name: rc.name, currency: rc.currency ?? "USD", status: rc.status ?? "Active", effectiveDate: rc.effectiveDate ?? "" });
                            setRcRoles((rc.roles as { role: string; rate: number }[]) ?? []);
                            setRateCardDialogOpen(true);
                          }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => setDeleteRateCardId(rc.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customfields" className="m-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /> Custom Fields</CardTitle>
                  <CardDescription>Define extra fields that appear on projects and tasks</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={cfEntityFilter} onValueChange={setCfEntityFilter}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue placeholder="All entities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All entities</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => { setEditCfId(null); setCfForm({ entityType: "project", name: "", fieldType: "text", isRequired: false, options: "" }); setCfDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Add Field
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingCf ? (
                  <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : (cfDefinitions?.length ?? 0) === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <SlidersHorizontal className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No custom fields defined</p>
                    <p className="text-sm mt-1">Add fields to capture extra information on projects and tasks.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entity</TableHead>
                        <TableHead>Field Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Required</TableHead>
                        <TableHead>Options</TableHead>
                        <TableHead className="w-20" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cfDefinitions?.map(cf => (
                        <TableRow key={cf.id}>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">{cf.entityType}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{cf.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs capitalize">{cf.fieldType}</Badge>
                          </TableCell>
                          <TableCell>
                            {cf.isRequired ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {cf.options && cf.options.length > 0 ? cf.options.join(", ") : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                                setEditCfId(cf.id);
                                setCfForm({ entityType: cf.entityType, name: cf.name, fieldType: cf.fieldType, isRequired: cf.isRequired, options: cf.options?.join(", ") ?? "" });
                                setCfDialogOpen(true);
                              }}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => setDeleteCfId(cf.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auditlog" className="m-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" /> Audit Log</CardTitle>
                  <CardDescription>System-wide record of all significant changes</CardDescription>
                </div>
                <Select value={auditEntityFilter} onValueChange={setAuditEntityFilter}>
                  <SelectTrigger className="w-[160px] h-8 text-xs">
                    <SelectValue placeholder="All entities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All entities</SelectItem>
                    <SelectItem value="project">Projects</SelectItem>
                    <SelectItem value="task">Tasks</SelectItem>
                    <SelectItem value="invoice">Invoices</SelectItem>
                    <SelectItem value="timesheet">Timesheets</SelectItem>
                    <SelectItem value="allocation">Allocations</SelectItem>
                    <SelectItem value="user">Users</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {isLoadingAudit ? (
                  <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : (auditEntries?.length ?? 0) === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No audit entries yet</p>
                    <p className="text-sm mt-1">Changes to projects, tasks, invoices, and users will appear here.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Actor</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(auditEntries as any[])?.map((entry: any) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(entry.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs capitalize">{entry.entityType}</Badge>
                              <span className="text-xs text-muted-foreground">#{entry.entityId}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={entry.action === "DELETE" ? "destructive" : entry.action === "CREATE" ? "secondary" : "outline"} className="text-xs">
                              {entry.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{entry.actorName ?? "System"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{entry.description ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Project Template</DialogTitle><DialogDescription>Define a reusable project structure for the team.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Template Name *</Label>
              <Input placeholder="e.g. ERP Implementation" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="Brief description of this template..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Billing Type</Label>
                <Select value={form.billingType} onValueChange={v => setForm(f => ({ ...f, billingType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fixed Fee">Fixed Fee</SelectItem>
                    <SelectItem value="Time & Materials">Time &amp; Materials</SelectItem>
                    <SelectItem value="Retainer">Retainer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Duration (days)</Label>
                <Input type="number" min={1} value={form.durationDays} onChange={e => setForm(f => ({ ...f, durationDays: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.name || createTemplate.isPending}>
              {createTemplate.isPending ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteDialogId} onOpenChange={() => setDeleteDialogId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Template</DialogTitle><DialogDescription>This will permanently remove the template. Projects created from it will not be affected.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteDialogId && handleDelete(deleteDialogId)} disabled={deleteTemplate.isPending}>
              {deleteTemplate.isPending ? "Deleting..." : "Delete Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Skill Category</DialogTitle><DialogDescription>Group related skills under a category.</DialogDescription></DialogHeader>
          <div className="space-y-1.5">
            <Label>Category Name *</Label>
            <Input placeholder="e.g. Frontend, Cloud, Data Science" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCategory} disabled={!newCategoryName || createCategory.isPending}>
              {createCategory.isPending ? "Creating…" : "Add Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteCategoryId} onOpenChange={() => setDeleteCategoryId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Category</DialogTitle><DialogDescription>All skills in this category will be orphaned.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCategoryId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteCategoryId && handleDeleteCategory(deleteCategoryId)} disabled={deleteCategory.isPending}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={skillDialogOpen} onOpenChange={setSkillDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Skill</DialogTitle><DialogDescription>Add a skill that can be assigned to team members.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Skill Name *</Label>
              <Input placeholder="e.g. React, AWS, SQL" value={newSkillName} onChange={e => setNewSkillName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={newSkillCategoryId} onValueChange={setNewSkillCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select category (optional)" /></SelectTrigger>
                <SelectContent>
                  {categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkillDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSkill} disabled={!newSkillName || createSkill.isPending}>
              {createSkill.isPending ? "Adding…" : "Add Skill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteSkillId} onOpenChange={() => setDeleteSkillId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Skill</DialogTitle><DialogDescription>This skill will be removed from all team members.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSkillId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteSkillId && handleDeleteSkill(deleteSkillId)} disabled={deleteSkill.isPending}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={taxCodeDialogOpen} onOpenChange={(open) => { setTaxCodeDialogOpen(open); if (!open) setEditTaxCodeId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTaxCodeId ? "Edit Tax Code" : "Add Tax Code"}</DialogTitle>
            <DialogDescription>Define a tax rate to apply on invoices and line items.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input placeholder="e.g. GST 10%" value={taxCodeForm.name} onChange={e => setTaxCodeForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Rate (%) *</Label>
                <Input type="number" step="0.01" placeholder="e.g. 10" value={taxCodeForm.rate} onChange={e => setTaxCodeForm(f => ({ ...f, rate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Optional description" value={taxCodeForm.description} onChange={e => setTaxCodeForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={taxCodeForm.isDefault} onChange={e => setTaxCodeForm(f => ({ ...f, isDefault: e.target.checked }))} className="rounded" />
              <span className="text-sm">Set as default tax code</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaxCodeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTaxCode} disabled={!taxCodeForm.name || !taxCodeForm.rate}>
              {editTaxCodeId ? "Save Changes" : "Add Tax Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTaxCodeId} onOpenChange={() => setDeleteTaxCodeId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Tax Code</DialogTitle><DialogDescription>This will permanently remove this tax code.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTaxCodeId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTaxCodeId && handleDeleteTaxCode(deleteTaxCodeId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={timeCategoryDialogOpen} onOpenChange={(open) => { setTimeCategoryDialogOpen(open); if (!open) setEditTimeCategoryId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTimeCategoryId ? "Edit Time Category" : "Add Time Category"}</DialogTitle>
            <DialogDescription>Define a label for classifying time entries in timesheets.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input placeholder="e.g. Development, Design, Meetings" value={timeCategoryForm.name} onChange={e => setTimeCategoryForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="Optional description" value={timeCategoryForm.description} onChange={e => setTimeCategoryForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTimeCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTimeCategory} disabled={!timeCategoryForm.name}>
              {editTimeCategoryId ? "Save Changes" : "Add Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTimeCategoryId} onOpenChange={() => setDeleteTimeCategoryId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Time Category</DialogTitle><DialogDescription>This category will no longer be available for new time entries.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTimeCategoryId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTimeCategoryId && handleDeleteTimeCategory(deleteTimeCategoryId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={calendarDialogOpen} onOpenChange={setCalendarDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Holiday Calendar</DialogTitle><DialogDescription>Create a named calendar to track company or regional holidays.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Calendar Name *</Label>
              <Input placeholder="e.g. Australia Public Holidays" value={newCalendarName} onChange={e => setNewCalendarName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Optional description" value={newCalendarDesc} onChange={e => setNewCalendarDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCalendarDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCalendar} disabled={!newCalendarName}>Create Calendar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteCalendarId} onOpenChange={() => setDeleteCalendarId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Calendar</DialogTitle><DialogDescription>All holiday dates in this calendar will also be removed.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCalendarId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteCalendarId && handleDeleteCalendar(deleteCalendarId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dateDialogOpen} onOpenChange={setDateDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Holiday Date</DialogTitle><DialogDescription>Add a non-working day to the selected calendar.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Holiday Name *</Label>
              <Input placeholder="e.g. Christmas Day" value={newDateName} onChange={e => setNewDateName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={newDateValue} onChange={e => setNewDateValue(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddHolidayDate} disabled={!newDateName || !newDateValue}>Add Holiday</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rateCardDialogOpen} onOpenChange={(open) => { setRateCardDialogOpen(open); if (!open) setEditRateCardId(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editRateCardId ? "Edit Rate Card" : "New Rate Card"}</DialogTitle>
            <DialogDescription>Define billing rates for each role in this rate card.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Name *</Label>
                <Input placeholder="e.g. Standard 2025" value={rcForm.name} onChange={e => setRcForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={rcForm.currency} onValueChange={v => setRcForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="SGD">SGD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={rcForm.status} onValueChange={v => setRcForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Effective Date</Label>
                <Input type="date" value={rcForm.effectiveDate} onChange={e => setRcForm(f => ({ ...f, effectiveDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role Rates</Label>
              <div className="border rounded-lg overflow-hidden">
                {rcRoles.length > 0 && (
                  <div className="divide-y">
                    {rcRoles.map((r, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="font-medium">{r.role}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">${r.rate}/hr</span>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500" onClick={() => setRcRoles(prev => prev.filter((_, idx) => idx !== i))}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 p-2 bg-muted/30">
                  <Input placeholder="Role name" className="h-8 text-sm" value={rcNewRole.role} onChange={e => setRcNewRole(r => ({ ...r, role: e.target.value }))} />
                  <Input placeholder="Rate/hr" type="number" className="h-8 text-sm w-24" value={rcNewRole.rate} onChange={e => setRcNewRole(r => ({ ...r, rate: e.target.value }))} />
                  <Button size="sm" variant="outline" className="h-8" onClick={() => {
                    if (!rcNewRole.role || !rcNewRole.rate) return;
                    setRcRoles(prev => [...prev, { role: rcNewRole.role, rate: parseFloat(rcNewRole.rate) }]);
                    setRcNewRole({ role: "", rate: "" });
                  }}>Add</Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRateCardDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRateCard} disabled={!rcForm.name || createRateCard.isPending || updateRateCard.isPending}>
              {editRateCardId ? "Save Changes" : "Create Rate Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteRateCardId} onOpenChange={() => setDeleteRateCardId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Rate Card</DialogTitle><DialogDescription>This will permanently remove this rate card. Projects using it will not be affected.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRateCardId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteRateCardId && handleDeleteRateCard(deleteRateCardId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cfDialogOpen} onOpenChange={(open) => { setCfDialogOpen(open); if (!open) setEditCfId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCfId ? "Edit Custom Field" : "Add Custom Field"}</DialogTitle>
            <DialogDescription>Define a field that will appear on the selected entity type.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Entity Type *</Label>
                <Select value={cfForm.entityType} onValueChange={v => setCfForm(f => ({ ...f, entityType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Field Type *</Label>
                <Select value={cfForm.fieldType} onValueChange={v => setCfForm(f => ({ ...f, fieldType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="boolean">Yes/No</SelectItem>
                    <SelectItem value="select">Select</SelectItem>
                    <SelectItem value="textarea">Long Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Field Name *</Label>
              <Input placeholder="e.g. Client Industry, Priority Score" value={cfForm.name} onChange={e => setCfForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            {cfForm.fieldType === "select" && (
              <div className="space-y-1.5">
                <Label>Options <span className="text-muted-foreground font-normal">(comma-separated)</span></Label>
                <Input placeholder="e.g. Low, Medium, High" value={cfForm.options} onChange={e => setCfForm(f => ({ ...f, options: e.target.value }))} />
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cfForm.isRequired} onChange={e => setCfForm(f => ({ ...f, isRequired: e.target.checked }))} className="rounded" />
              <span className="text-sm">Required field</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCfDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCfDef} disabled={!cfForm.name || createCfDef.isPending || updateCfDef.isPending}>
              {editCfId ? "Save Changes" : "Add Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteCfId} onOpenChange={() => setDeleteCfId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Custom Field</DialogTitle><DialogDescription>All values stored for this field will also be removed.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCfId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              const cf = cfDefinitions?.find(d => d.id === deleteCfId);
              if (deleteCfId && cf) handleDeleteCfDef(deleteCfId, cf.entityType);
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
