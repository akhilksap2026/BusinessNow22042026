import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
  getListUsersQueryKey,
  useGetUserSkills,
  useAddUserSkill,
  useRemoveUserSkill,
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Trash2, LayoutTemplate, Users, Calendar, Layers, Star, Tag, Cpu, Percent, Clock, CalendarDays, Pencil, X, CreditCard, SlidersHorizontal, Activity, ChevronRight, CheckCircle2, Building2, RotateCcw, MoreHorizontal, Settings2, ShieldCheck, Archive } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TemplateEditor } from "@/components/template-editor";
import { useToast } from "@/hooks/use-toast";

function UserSkillsDialog({ userId, userName, allSkills, onClose }: { userId: number; userName: string; allSkills: { id: number; name: string; categoryId: number }[]; onClose: () => void }) {
  const { data: userSkills, isLoading } = useGetUserSkills({ userId });
  const addSkill = useAddUserSkill();
  const removeSkill = useRemoveUserSkill();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [addSkillId, setAddSkillId] = useState("");

  const assignedIds = new Set((userSkills ?? []).map(s => s.skillId));
  const available = allSkills.filter(s => !assignedIds.has(s.id));

  async function handleAdd() {
    if (!addSkillId) return;
    try {
      await addSkill.mutateAsync({ userId, data: { skillId: parseInt(addSkillId) } });
      queryClient.invalidateQueries({ queryKey: ["getUserSkills", userId] });
      setAddSkillId("");
      toast({ title: "Skill added" });
    } catch {
      toast({ title: "Failed to add skill", variant: "destructive" });
    }
  }

  async function handleRemove(skillId: number) {
    try {
      await removeSkill.mutateAsync({ userId, skillId });
      queryClient.invalidateQueries({ queryKey: ["getUserSkills", userId] });
      toast({ title: "Skill removed" });
    } catch {
      toast({ title: "Failed to remove skill", variant: "destructive" });
    }
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Skills — {userName}</DialogTitle>
          <DialogDescription>Manage skills assigned to this team member.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : (userSkills ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No skills assigned yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(userSkills ?? []).map(s => (
                <Badge key={s.skillId} variant="secondary" className="flex items-center gap-1 pr-1">
                  {allSkills.find(sk => sk.id === s.skillId)?.name ?? `Skill #${s.skillId}`}
                  <button onClick={() => handleRemove(s.skillId)} className="ml-1 rounded hover:bg-muted-foreground/20 p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          {available.length > 0 && (
            <div className="flex gap-2 pt-2 border-t">
              <Select value={addSkillId} onValueChange={setAddSkillId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Add a skill…" /></SelectTrigger>
                <SelectContent>
                  {available.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAdd} disabled={!addSkillId || addSkill.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ALL_ROLES = ["Admin", "PM", "Resource Manager", "Finance", "Viewer"] as const;

function UserConfigTab({ users, BASE, onRefresh }: {
  users: { id: number; name: string; initials: string; role: string; secondaryRoles?: string[] }[];
  BASE: string;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState<number | null>(null);

  async function toggleSecondaryRole(userId: number, currentSecondary: string[], primaryRole: string, role: string) {
    if (role === primaryRole) return;
    const updated = currentSecondary.includes(role)
      ? currentSecondary.filter(r => r !== role)
      : [...currentSecondary, role];
    setSaving(userId);
    try {
      const res = await fetch(`${BASE}/api/users/${userId}/secondary-roles`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-role": "Admin" },
        body: JSON.stringify({ secondaryRoles: updated }),
      });
      if (!res.ok) throw new Error("Failed");
      onRefresh();
      toast({ title: "Roles updated" });
    } catch {
      toast({ title: "Failed to update roles", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Configuration</CardTitle>
        <CardDescription>
          Assign secondary roles to users so they can switch their active view in the sidebar.
          A user's primary role is always available and cannot be removed here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Primary Role</TableHead>
              <TableHead>Secondary Roles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(user => {
              const secondary = (user as any).secondaryRoles ?? [];
              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8"><AvatarFallback>{user.initials}</AvatarFallback></Avatar>
                      {user.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_ROLES.filter(r => r !== user.role).map(role => {
                        const active = secondary.includes(role);
                        return (
                          <button
                            key={role}
                            disabled={saving === user.id}
                            onClick={() => toggleSecondaryRole(user.id, secondary, user.role, role)}
                            className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-colors ${
                              active
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-muted-foreground border-border hover:border-primary/50"
                            }`}
                          >
                            {role}
                          </button>
                        );
                      })}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

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
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const deleteUserMut = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${BASE}/api/users/${id}`, { method: "DELETE", headers: { "x-user-role": "Admin" } });
      if (!r.ok && r.status !== 204) throw new Error("Failed to delete user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: "User deleted" });
      setUserDeleteId(null);
    },
    onError: () => toast({ title: "Failed to delete user", variant: "destructive" }),
  });

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [userDeleteId, setUserDeleteId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState({ name: "", email: "", role: "", department: "", region: "", capacity: "40", costRate: "0", isInternal: "true", activeStatus: "active" });

  function openAddUser() {
    setEditUser(null);
    setUserForm({ name: "", email: "", role: "", department: "", region: "", capacity: "40", costRate: "0", isInternal: "true", activeStatus: "active" });
    setUserDialogOpen(true);
  }

  function openEditUser(u: any) {
    setEditUser(u);
    setUserForm({ name: u.name, email: u.email, role: u.role, department: u.department ?? "", region: u.region ?? "", capacity: String(u.capacity ?? 40), costRate: String(u.costRate ?? 0), isInternal: u.isInternal === false ? "false" : "true", activeStatus: u.activeStatus ?? "active" });
    setUserDialogOpen(true);
  }

  async function handleSaveUser() {
    const payload = { name: userForm.name, email: userForm.email, role: userForm.role, department: userForm.department, region: userForm.region || undefined, capacity: Number(userForm.capacity), costRate: Number(userForm.costRate), isInternal: userForm.isInternal !== "false", activeStatus: userForm.activeStatus };
    try {
      if (editUser) {
        await updateUser.mutateAsync({ id: editUser.id, data: payload });
        toast({ title: "User updated" });
      } else {
        await createUser.mutateAsync({ data: payload });
        toast({ title: "User added" });
      }
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      setUserDialogOpen(false);
    } catch {
      toast({ title: editUser ? "Failed to update user" : "Failed to add user", variant: "destructive" });
    }
  }

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogId, setDeleteDialogId] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [deleteCategoryId, setDeleteCategoryId] = useState<number | null>(null);

  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategoryId, setNewSkillCategoryId] = useState("");
  const [newSkillType, setNewSkillType] = useState("Level");
  const [newSkillSection, setNewSkillSection] = useState("");
  const [newSkillDescription, setNewSkillDescription] = useState("");
  const [deleteSkillId, setDeleteSkillId] = useState<number | null>(null);

  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [skillsUser, setSkillsUser] = useState<{ id: number; name: string } | null>(null);

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

  const [companyForm, setCompanyForm] = useState({ name: "", address: "", timezone: "", currency: "", fiscalYearStart: "", website: "", phone: "" });
  const [companyFormDirty, setCompanyFormDirty] = useState(false);

  const { data: companySettings, refetch: refetchCompany } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/company-settings`);
      if (!res.ok) throw new Error("Failed to fetch company settings");
      return res.json() as Promise<{ id: number; name: string; address: string | null; logoUrl: string | null; timezone: string; currency: string; fiscalYearStart: string; website: string | null; phone: string | null }>;
    },
  });

  useEffect(() => {
    if (companySettings && !companyFormDirty) {
      setCompanyForm({
        name: companySettings.name ?? "",
        address: companySettings.address ?? "",
        timezone: companySettings.timezone ?? "",
        currency: companySettings.currency ?? "",
        fiscalYearStart: companySettings.fiscalYearStart ?? "",
        website: companySettings.website ?? "",
        phone: companySettings.phone ?? "",
      });
    }
  }, [companySettings, companyFormDirty]);

  const saveCompanyMut = useMutation({
    mutationFn: async (data: typeof companyForm) => {
      const res = await fetch(`${BASE}/api/company-settings`, {
        method: "PUT",
        headers: { "content-type": "application/json", "x-user-role": "Admin" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Company settings saved" });
      setCompanyFormDirty(false);
      refetchCompany();
    },
    onError: () => toast({ title: "Failed to save settings", variant: "destructive" }),
  });

  const { data: portalBrandingAccounts } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["portal-branding-accounts"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/accounts`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });
  const [portalBrandingAccountId, setPortalBrandingAccountId] = useState<number | null>(null);
  const [portalBrandingForm, setPortalBrandingForm] = useState({ primaryColor: "#4f46e5", accentColor: "#7c3aed", logoUrl: "", tabPlan: true, tabUpdates: true, tabSpaces: false });
  const [portalBrandingDirty, setPortalBrandingDirty] = useState(false);

  const { data: portalBrandingData } = useQuery({
    queryKey: ["portal-branding", portalBrandingAccountId],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/portal-auth/accounts/${portalBrandingAccountId}/branding`);
      if (!r.ok) throw new Error("Failed");
      return r.json() as Promise<{ primaryColor: string; accentColor: string; logoUrl: string | null; tabVisibility: { plan: boolean; updates: boolean; spaces: boolean } }>;
    },
    enabled: !!portalBrandingAccountId,
  });

  useEffect(() => {
    if (portalBrandingData && !portalBrandingDirty) {
      setPortalBrandingForm({
        primaryColor: portalBrandingData.primaryColor ?? "#4f46e5",
        accentColor: portalBrandingData.accentColor ?? "#7c3aed",
        logoUrl: portalBrandingData.logoUrl ?? "",
        tabPlan: portalBrandingData.tabVisibility?.plan ?? true,
        tabUpdates: portalBrandingData.tabVisibility?.updates ?? true,
        tabSpaces: portalBrandingData.tabVisibility?.spaces ?? false,
      });
    }
  }, [portalBrandingData, portalBrandingDirty]);

  const savePortalBrandingMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE}/api/portal-auth/accounts/${portalBrandingAccountId}/branding`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-user-role": "Admin" },
        body: JSON.stringify({
          primaryColor: portalBrandingForm.primaryColor,
          accentColor: portalBrandingForm.accentColor,
          logoUrl: portalBrandingForm.logoUrl || null,
          tabVisibility: { plan: portalBrandingForm.tabPlan, updates: portalBrandingForm.tabUpdates, spaces: portalBrandingForm.tabSpaces },
        }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Portal branding saved" });
      setPortalBrandingDirty(false);
      queryClient.invalidateQueries({ queryKey: ["portal-branding", portalBrandingAccountId] });
    },
    onError: () => toast({ title: "Failed to save branding", variant: "destructive" }),
  });

  const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const [timeSettingsForm, setTimeSettingsForm] = useState({
    weeklyCapacityHours: 40,
    workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"] as string[],
    timesheetDueDay: "Monday",
    approvalMode: "Manual",
    globalLockEnabled: false,
    lockBeforeDate: "",
  });
  const [timeSettingsDirty, setTimeSettingsDirty] = useState(false);

  const { data: timeSettings, refetch: refetchTimeSettings } = useQuery({
    queryKey: ["time-settings"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/time-settings`);
      if (!res.ok) throw new Error("Failed to fetch time settings");
      return res.json() as Promise<{
        id: number; weeklyCapacityHours: number; workingDays: string;
        timesheetDueDay: string; approvalMode: string;
        globalLockEnabled: boolean; lockBeforeDate: string | null; updatedAt: string;
      }>;
    },
  });

  useEffect(() => {
    if (timeSettings && !timeSettingsDirty) {
      setTimeSettingsForm({
        weeklyCapacityHours: timeSettings.weeklyCapacityHours ?? 40,
        workingDays: timeSettings.workingDays ? timeSettings.workingDays.split(",").map(d => d.trim()) : ["Mon", "Tue", "Wed", "Thu", "Fri"],
        timesheetDueDay: timeSettings.timesheetDueDay ?? "Monday",
        approvalMode: timeSettings.approvalMode ?? "Manual",
        globalLockEnabled: timeSettings.globalLockEnabled ?? false,
        lockBeforeDate: timeSettings.lockBeforeDate ?? "",
      });
    }
  }, [timeSettings, timeSettingsDirty]);

  const saveTimeSettingsMut = useMutation({
    mutationFn: async (data: typeof timeSettingsForm) => {
      const res = await fetch(`${BASE}/api/time-settings`, {
        method: "PUT",
        headers: { "content-type": "application/json", "x-user-role": "Admin" },
        body: JSON.stringify({ ...data, workingDays: data.workingDays.join(",") }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Time settings saved" });
      setTimeSettingsDirty(false);
      refetchTimeSettings();
    },
    onError: () => toast({ title: "Failed to save time settings", variant: "destructive" }),
  });

  const { data: deletedProjects, refetch: refetchDeleted } = useQuery({
    queryKey: ["deleted-projects"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/projects/deleted`, { headers: { "x-user-role": "Admin" } });
      if (!res.ok) return [];
      return res.json() as Promise<{ id: number; name: string; deletedAt: string | null }[]>;
    },
  });

  const restoreProjectMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${BASE}/api/projects/${id}/restore`, {
        method: "POST",
        headers: { "x-user-role": "Admin" },
      });
      if (!res.ok) throw new Error("Failed to restore");
    },
    onSuccess: () => {
      toast({ title: "Project restored" });
      refetchDeleted();
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: () => toast({ title: "Failed to restore project", variant: "destructive" }),
  });

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
    totalDurationDays: 30,
  });

  async function handleCreate() {
    if (!form.name) return;
    try {
      const row = await createTemplate.mutateAsync({
        data: { name: form.name, description: form.description || undefined, billingType: form.billingType, totalDurationDays: form.totalDurationDays }
      });
      queryClient.invalidateQueries({ queryKey: getListProjectTemplatesQueryKey() });
      toast({ title: "Template created — add phases and tasks in the editor" });
      setCreateDialogOpen(false);
      setForm({ name: "", description: "", billingType: "Fixed Fee", totalDurationDays: 30 });
      setSelectedTemplateId((row as any).id);
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
        data: { name: newSkillName, categoryId: newSkillCategoryId ? parseInt(newSkillCategoryId) : undefined, skillType: newSkillType, section: newSkillSection || undefined, description: newSkillDescription || undefined }
      });
      queryClient.invalidateQueries({ queryKey: getListSkillsQueryKey() });
      toast({ title: "Skill created" });
      setSkillDialogOpen(false);
      setNewSkillName(""); setNewSkillCategoryId(""); setNewSkillType("Level"); setNewSkillSection(""); setNewSkillDescription("");
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
      <div className="space-y-4">
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
            <TabsTrigger value="timesettings" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" /> Time Settings
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
            <TabsTrigger value="placeholders" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Placeholders
            </TabsTrigger>
            <TabsTrigger value="auditlog" className="flex items-center gap-2">
              <Activity className="h-4 w-4" /> Audit Log
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Company Settings
            </TabsTrigger>
            <TabsTrigger value="archived" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" /> Archived Projects
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="m-0">
            <Tabs defaultValue="management">
              <TabsList className="mb-4">
                <TabsTrigger value="management" className="flex items-center gap-2">
                  <Users className="h-4 w-4" /> User Management
                </TabsTrigger>
                <TabsTrigger value="configuration" className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> User Configuration
                </TabsTrigger>
              </TabsList>

              <TabsContent value="management" className="m-0">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>User Management</CardTitle>
                      <CardDescription>Manage team members, roles, and permissions</CardDescription>
                    </div>
                    <Button size="sm" onClick={openAddUser}><Plus className="h-4 w-4 mr-2" /> Add User</Button>
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
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Cost Rate</TableHead>
                            <TableHead className="w-[90px]"></TableHead>
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
                              <TableCell>{user.department}{user.region ? <span className="text-muted-foreground ml-1 text-xs">· {user.region}</span> : null}</TableCell>
                              <TableCell>
                                {user.activeStatus === "on_leave" ? <Badge variant="secondary" className="text-xs">On Leave</Badge>
                                  : user.activeStatus === "inactive" ? <Badge variant="secondary" className="text-xs text-muted-foreground">Inactive</Badge>
                                  : <Badge className="text-xs bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 border">Active</Badge>}
                                {user.isInternal === false && <Badge variant="outline" className="text-xs ml-1">External</Badge>}
                              </TableCell>
                              <TableCell className="text-right">${user.costRate}/hr</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setSkillsUser({ id: user.id, name: user.name })}>
                                    <Star className="h-3.5 w-3.5 mr-1" /> Skills
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => openEditUser(user)}>
                                        <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-red-600" onClick={() => setUserDeleteId(user.id)}>
                                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
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

              <TabsContent value="configuration" className="m-0">
                <UserConfigTab users={users ?? []} BASE={BASE} onRefresh={() => queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() })} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="templates" className="m-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Project Templates</CardTitle>
                  <CardDescription>Reusable project structures for faster onboarding</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowArchived(p => !p)}>
                    <Archive className="h-4 w-4 mr-2" />{showArchived ? "Hide Archived" : "Show Archived"}
                  </Button>
                  <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> New Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingTemplates ? (
                  <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
                ) : (templates ?? []).filter((t: any) => showArchived || !t.isArchived).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <LayoutTemplate className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No templates yet</p>
                    <p className="text-sm mt-1">Create templates to speed up project creation.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(templates ?? []).filter((t: any) => showArchived || !t.isArchived).map((tmpl: any) => (
                      <div key={tmpl.id} className={`flex items-start justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors ${tmpl.isArchived ? "opacity-60" : ""}`}>
                        <div className="flex-1 space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{tmpl.name}</span>
                            <Badge variant="secondary" className="text-xs">{tmpl.billingType}</Badge>
                            {tmpl.isArchived && <Badge variant="outline" className="text-xs text-muted-foreground">Archived</Badge>}
                          </div>
                          {tmpl.description && <p className="text-sm text-muted-foreground">{tmpl.description}</p>}
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {tmpl.totalDurationDays} days total</span>
                            {tmpl.phases && (tmpl.phases as any[]).length > 0 && (
                              <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {(tmpl.phases as any[]).length} phases · {(tmpl.phases as any[]).reduce((n: number, p: any) => n + (p.tasks?.length ?? 0), 0)} tasks</span>
                            )}
                            <span className="text-muted-foreground/60">Created {tmpl.createdAt ? new Date(tmpl.createdAt).toLocaleDateString() : ""}</span>
                          </div>
                          {tmpl.phases && (tmpl.phases as any[]).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(tmpl.phases as any[]).map((ph: any, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs font-normal">{ph.name} <span className="text-muted-foreground ml-1">(+{ph.relativeStartOffset}–+{ph.relativeEndOffset}d)</span></Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-4">
                          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setSelectedTemplateId(tmpl.id)}>
                            <Pencil className="h-3.5 w-3.5" /> Open Editor
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500" onClick={() => setDeleteDialogId(tmpl.id)}>
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

          <TabsContent value="timesettings" className="m-0 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Time &amp; Timesheet Settings</CardTitle>
                  <CardDescription>Configure capacity, working days, approval rules, and period locking for your team.</CardDescription>
                </div>
                <Button size="sm" disabled={!timeSettingsDirty || saveTimeSettingsMut.isPending} onClick={() => saveTimeSettingsMut.mutate(timeSettingsForm)}>
                  Save Changes
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Weekly Capacity (hours)</Label>
                    <Input
                      type="number" min={1} max={80}
                      value={timeSettingsForm.weeklyCapacityHours}
                      onChange={e => { setTimeSettingsForm(f => ({ ...f, weeklyCapacityHours: parseInt(e.target.value) || 40 })); setTimeSettingsDirty(true); }}
                    />
                    <p className="text-xs text-muted-foreground">Default expected hours per person per week used in utilization calculations.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Timesheet Due Day</Label>
                    <Select value={timeSettingsForm.timesheetDueDay} onValueChange={v => { setTimeSettingsForm(f => ({ ...f, timesheetDueDay: v })); setTimeSettingsDirty(true); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Day of the week by which timesheets must be submitted.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Approval Mode</Label>
                    <Select value={timeSettingsForm.approvalMode} onValueChange={v => { setTimeSettingsForm(f => ({ ...f, approvalMode: v })); setTimeSettingsDirty(true); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Manual">Manual — manager reviews each submission</SelectItem>
                        <SelectItem value="Auto">Auto — approve on submission</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Auto-approve instantly locks the timesheet on submit.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Lock Periods Before Date</Label>
                    <Input
                      type="date"
                      value={timeSettingsForm.lockBeforeDate}
                      onChange={e => { setTimeSettingsForm(f => ({ ...f, lockBeforeDate: e.target.value })); setTimeSettingsDirty(true); }}
                    />
                    <p className="text-xs text-muted-foreground">Timesheets starting before this date will be read-only for all users.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Working Days</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map(day => {
                      const active = timeSettingsForm.workingDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setTimeSettingsForm(f => ({
                              ...f,
                              workingDays: active ? f.workingDays.filter(d => d !== day) : [...f.workingDays, day],
                            }));
                            setTimeSettingsDirty(true);
                          }}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${active ? "bg-indigo-600 text-white border-indigo-600" : "bg-background text-muted-foreground border-border hover:bg-muted"}`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">Days shown as columns in the timesheet grid.</p>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-medium">Global Lock</p>
                    <p className="text-xs text-muted-foreground mt-0.5">When enabled, no timesheets can be edited regardless of date or status.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={timeSettingsForm.globalLockEnabled}
                    onClick={() => { setTimeSettingsForm(f => ({ ...f, globalLockEnabled: !f.globalLockEnabled })); setTimeSettingsDirty(true); }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${timeSettingsForm.globalLockEnabled ? "bg-indigo-600" : "bg-muted-foreground/30"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${timeSettingsForm.globalLockEnabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>

                {timeSettings && (
                  <p className="text-xs text-muted-foreground">Last saved: {new Date(timeSettings.updatedAt).toLocaleString()}</p>
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

          <TabsContent value="placeholders" className="m-0">
            <PlaceholdersCatalog base={BASE} />
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

          <TabsContent value="settings" className="m-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>Used on invoices, reports, and the client portal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <Label>Company Name *</Label>
                    <Input value={companyForm.name} onChange={e => { setCompanyForm(f => ({ ...f, name: e.target.value })); setCompanyFormDirty(true); }} />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Address</Label>
                    <Textarea rows={2} value={companyForm.address} onChange={e => { setCompanyForm(f => ({ ...f, address: e.target.value })); setCompanyFormDirty(true); }} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Website</Label>
                    <Input placeholder="https://example.com" value={companyForm.website} onChange={e => { setCompanyForm(f => ({ ...f, website: e.target.value })); setCompanyFormDirty(true); }} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input placeholder="+1 416-555-0100" value={companyForm.phone} onChange={e => { setCompanyForm(f => ({ ...f, phone: e.target.value })); setCompanyFormDirty(true); }} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Timezone</Label>
                    <Select value={companyForm.timezone} onValueChange={v => { setCompanyForm(f => ({ ...f, timezone: v })); setCompanyFormDirty(true); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Toronto">America/Toronto (ET)</SelectItem>
                        <SelectItem value="America/New_York">America/New_York (ET)</SelectItem>
                        <SelectItem value="America/Chicago">America/Chicago (CT)</SelectItem>
                        <SelectItem value="America/Denver">America/Denver (MT)</SelectItem>
                        <SelectItem value="America/Los_Angeles">America/Los_Angeles (PT)</SelectItem>
                        <SelectItem value="America/Vancouver">America/Vancouver (PT)</SelectItem>
                        <SelectItem value="Europe/London">Europe/London (GMT/BST)</SelectItem>
                        <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Currency</Label>
                    <Select value={companyForm.currency} onValueChange={v => { setCompanyForm(f => ({ ...f, currency: v })); setCompanyFormDirty(true); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CAD">CAD — Canadian Dollar</SelectItem>
                        <SelectItem value="USD">USD — US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR — Euro</SelectItem>
                        <SelectItem value="GBP">GBP — British Pound</SelectItem>
                        <SelectItem value="INR">INR — Indian Rupee</SelectItem>
                        <SelectItem value="AUD">AUD — Australian Dollar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fiscal Year Start</Label>
                    <Select value={companyForm.fiscalYearStart} onValueChange={v => { setCompanyForm(f => ({ ...f, fiscalYearStart: v })); setCompanyFormDirty(true); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="01-01">January 1</SelectItem>
                        <SelectItem value="04-01">April 1</SelectItem>
                        <SelectItem value="07-01">July 1</SelectItem>
                        <SelectItem value="10-01">October 1</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <Button onClick={() => saveCompanyMut.mutate(companyForm)} disabled={saveCompanyMut.isPending || !companyFormDirty}>
                    {saveCompanyMut.isPending ? "Saving…" : "Save Settings"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Client Portal Branding</CardTitle>
                <CardDescription>Customise the colours and tab visibility shown to clients in the portal for each account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label>Account</Label>
                  <Select
                    value={portalBrandingAccountId ? String(portalBrandingAccountId) : ""}
                    onValueChange={v => { setPortalBrandingAccountId(Number(v)); setPortalBrandingDirty(false); }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select an account…" /></SelectTrigger>
                    <SelectContent>
                      {(portalBrandingAccounts ?? []).map(a => (
                        <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {portalBrandingAccountId && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Primary Colour</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={portalBrandingForm.primaryColor}
                            onChange={e => { setPortalBrandingForm(f => ({ ...f, primaryColor: e.target.value })); setPortalBrandingDirty(true); }}
                            className="h-9 w-14 rounded border border-input cursor-pointer p-0.5"
                          />
                          <Input
                            value={portalBrandingForm.primaryColor}
                            onChange={e => { setPortalBrandingForm(f => ({ ...f, primaryColor: e.target.value })); setPortalBrandingDirty(true); }}
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Accent Colour</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={portalBrandingForm.accentColor}
                            onChange={e => { setPortalBrandingForm(f => ({ ...f, accentColor: e.target.value })); setPortalBrandingDirty(true); }}
                            className="h-9 w-14 rounded border border-input cursor-pointer p-0.5"
                          />
                          <Input
                            value={portalBrandingForm.accentColor}
                            onChange={e => { setPortalBrandingForm(f => ({ ...f, accentColor: e.target.value })); setPortalBrandingDirty(true); }}
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Logo URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
                      <Input
                        placeholder="https://example.com/logo.png"
                        value={portalBrandingForm.logoUrl}
                        onChange={e => { setPortalBrandingForm(f => ({ ...f, logoUrl: e.target.value })); setPortalBrandingDirty(true); }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tab Visibility in Portal</Label>
                      <div className="flex flex-wrap gap-4">
                        {[
                          { key: "tabPlan", label: "Plan (Tasks)" },
                          { key: "tabUpdates", label: "Updates" },
                          { key: "tabSpaces", label: "Spaces" },
                        ].map(({ key, label }) => (
                          <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              checked={portalBrandingForm[key as keyof typeof portalBrandingForm] as boolean}
                              onChange={e => { setPortalBrandingForm(f => ({ ...f, [key]: e.target.checked })); setPortalBrandingDirty(true); }}
                              className="h-4 w-4 rounded accent-primary"
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-lg">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: portalBrandingForm.primaryColor }}>BN</div>
                      <div>
                        <p className="text-sm font-medium">Portal Preview</p>
                        <p className="text-xs text-muted-foreground">Header uses <span style={{ color: portalBrandingForm.primaryColor }} className="font-mono">{portalBrandingForm.primaryColor}</span> · Accent <span style={{ color: portalBrandingForm.accentColor }} className="font-mono">{portalBrandingForm.accentColor}</span></p>
                      </div>
                    </div>
                    <div className="pt-1 flex justify-end">
                      <Button onClick={() => savePortalBrandingMut.mutate()} disabled={savePortalBrandingMut.isPending || !portalBrandingDirty}>
                        {savePortalBrandingMut.isPending ? "Saving…" : "Save Portal Branding"}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="archived" className="m-0">
            <Card>
              <CardHeader>
                <CardTitle>Archived Projects</CardTitle>
                <CardDescription>Projects that have been soft-deleted. Restore to make them active again.</CardDescription>
              </CardHeader>
              <CardContent>
                {(deletedProjects?.length ?? 0) === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No archived projects</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project Name</TableHead>
                        <TableHead>Archived On</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deletedProjects?.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {p.deletedAt ? new Date(p.deletedAt).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => restoreProjectMut.mutate(p.id)} disabled={restoreProjectMut.isPending}>
                              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restore
                            </Button>
                          </TableCell>
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
                <Input type="number" min={1} value={form.totalDurationDays} onChange={e => setForm(f => ({ ...f, totalDurationDays: parseInt(e.target.value) || 0 }))} />
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

      <Sheet open={!!selectedTemplateId} onOpenChange={open => { if (!open) setSelectedTemplateId(null); }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Template Editor</SheetTitle>
          </SheetHeader>
          {selectedTemplateId && (
            <TemplateEditor templateId={selectedTemplateId} onClose={() => setSelectedTemplateId(null)} />
          )}
        </SheetContent>
      </Sheet>

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
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Skill Name *</Label>
              <Input placeholder="e.g. React, AWS, SQL" value={newSkillName} onChange={e => setNewSkillName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={newSkillCategoryId} onValueChange={setNewSkillCategoryId}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    {categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={newSkillType} onValueChange={setNewSkillType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Level">Level (Beginner–Expert)</SelectItem>
                    <SelectItem value="Yes-No">Yes / No</SelectItem>
                    <SelectItem value="Number">Number</SelectItem>
                    <SelectItem value="Single-Choice">Single Choice</SelectItem>
                    <SelectItem value="Multiple-Choice">Multiple Choice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Section <span className="text-muted-foreground text-xs">(optional grouping within category)</span></Label>
              <Input placeholder="e.g. Frontend, Cloud, Leadership" value={newSkillSection} onChange={e => setNewSkillSection(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input placeholder="Brief description of this skill" value={newSkillDescription} onChange={e => setNewSkillDescription(e.target.value)} />
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

      {skillsUser && (
        <UserSkillsDialog
          userId={skillsUser.id}
          userName={skillsUser.name}
          allSkills={(skills ?? []).map(s => ({ id: s.id, name: s.name, categoryId: s.categoryId }))}
          onClose={() => setSkillsUser(null)}
        />
      )}

      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editUser ? "Edit User" : "Add User"}</DialogTitle>
            <DialogDescription>{editUser ? "Update team member details." : "Add a new team member to KSAP Technology."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} placeholder="name@ksap.tech" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Role</Label>
                <Input value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Consultant" />
              </div>
              <div className="space-y-1">
                <Label>Department</Label>
                <Input value={userForm.department} onChange={e => setUserForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Engineering" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Region</Label>
              <Input value={userForm.region} onChange={e => setUserForm(f => ({ ...f, region: e.target.value }))} placeholder="e.g. APAC, EMEA, US-East" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Weekly Capacity (hrs)</Label>
                <Input type="number" value={userForm.capacity} onChange={e => setUserForm(f => ({ ...f, capacity: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Cost Rate ($/hr)</Label>
                <Input type="number" value={userForm.costRate} onChange={e => setUserForm(f => ({ ...f, costRate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={userForm.activeStatus} onValueChange={v => setUserForm(f => ({ ...f, activeStatus: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Member Type</Label>
                <Select value={userForm.isInternal} onValueChange={v => setUserForm(f => ({ ...f, isInternal: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Internal Employee</SelectItem>
                    <SelectItem value="false">External / Client Contact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveUser} disabled={createUser.isPending || updateUser.isPending || !userForm.name || !userForm.email}>
              {editUser ? "Save Changes" : "Add User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!userDeleteId} onOpenChange={o => !o && setUserDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>This will permanently remove the team member. Time entries and assignments will remain. Are you sure?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteUserMut.isPending} onClick={() => userDeleteId && deleteUserMut.mutate(userDeleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

type PlaceholderRow = { id: number; name: string; roleId: string | null; isDefault: boolean; createdAt: string };

function PlaceholdersCatalog({ base }: { base: string }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<PlaceholderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${base}/api/placeholders`);
      if (r.ok) setRows(await r.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!name.trim()) return;
    const r = await fetch(`${base}/api/placeholders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-role": "PM" },
      body: JSON.stringify({ name: name.trim(), roleId: roleId.trim() || null }),
    });
    if (r.ok) {
      toast({ title: "Placeholder created" });
      setName(""); setRoleId(""); load();
    } else {
      toast({ title: "Failed to create placeholder", variant: "destructive" });
    }
  }

  async function remove(id: number, isDefault: boolean) {
    if (isDefault) { toast({ title: "Default placeholders cannot be deleted", variant: "destructive" }); return; }
    if (!confirm("Delete this placeholder? Existing allocations referencing it will keep their text role label.")) return;
    const r = await fetch(`${base}/api/placeholders/${id}`, { method: "DELETE", headers: { "x-user-role": "Admin" } });
    if (r.status === 204) { toast({ title: "Placeholder deleted" }); load(); }
    else { toast({ title: "Failed to delete", variant: "destructive" }); }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Placeholders Catalog</CardTitle>
        <CardDescription>Reusable unfilled slots used in resource allocations before a real team member is assigned.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input className="w-64" placeholder="e.g. Senior Consultant Slot" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Role (optional)</Label>
            <Input className="w-48" placeholder="e.g. Consultant" value={roleId} onChange={e => setRoleId(e.target.value)} />
          </div>
          <Button onClick={create} disabled={!name.trim()}>Add Placeholder</Button>
        </div>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Role</th>
                <th className="px-3 py-2 text-left">Default</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">No placeholders yet</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.roleId ?? "—"}</td>
                  <td className="px-3 py-2">{r.isDefault ? <Badge variant="secondary">Default</Badge> : "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => remove(r.id, r.isDefault)} disabled={r.isDefault}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
