import { useState, useEffect } from "react";
import { useListSkills, useListUsers } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, RefreshCw, Eye, EyeOff } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserSkillRow {
  id: number;
  userId: number;
  skillId: number;
  skillName: string;
  skillType: string;
  categoryId: number | null;
  categoryName: string | null;
  proficiencyLevel: string;
}

interface Skill {
  id: number;
  name: string;
  skillType: string;
  categoryId: number | null;
  description?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const LEVEL_RANK: Record<string, number> = { Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 4, Yes: 5, No: 0 };
const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced", "Expert"];
const LEVEL_COLORS: Record<string, string> = {
  Beginner: "bg-slate-100 text-slate-600 border-slate-200",
  Intermediate: "bg-blue-100 text-blue-700 border-blue-200",
  Advanced: "bg-green-100 text-green-700 border-green-200",
  Expert: "bg-purple-100 text-purple-700 border-purple-200",
  Yes: "bg-green-100 text-green-700 border-green-200",
  No: "bg-red-100 text-red-600 border-red-200",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function SkillsMatrix() {
  const { toast } = useToast();
  const { data: allSkills, isLoading: loadingSkills } = useListSkills();
  const { data: users, isLoading: loadingUsers } = useListUsers();

  const [userSkills, setUserSkills] = useState<UserSkillRow[]>([]);
  const [loadingMatrix, setLoadingMatrix] = useState(true);
  const [editingCell, setEditingCell] = useState<{ userId: number; skillId: number } | null>(null);
  const [groupBy, setGroupBy] = useState<"role" | "category">("role");
  const [hiddenCats, setHiddenCats] = useState<Set<number | null>>(new Set());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadMatrix() {
    setLoadingMatrix(true);
    try {
      const res = await fetch("/api/user-skills");
      const data = await res.json();
      setUserSkills(data);
    } catch {
      toast({ title: "Failed to load skills matrix", variant: "destructive" });
    } finally {
      setLoadingMatrix(false);
    }
  }

  useEffect(() => { loadMatrix(); }, []);

  async function updateCell(userId: number, skillId: number, proficiencyLevel: string, skillType: string) {
    setSaving(true);
    try {
      const existing = userSkills.find(us => us.userId === userId && us.skillId === skillId);
      if (existing) {
        if (proficiencyLevel === "__remove__") {
          await fetch(`/api/users/${userId}/skills/${skillId}`, { method: "DELETE" });
          setUserSkills(prev => prev.filter(us => !(us.userId === userId && us.skillId === skillId)));
        } else {
          await fetch(`/api/users/${userId}/skills/${skillId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ proficiencyLevel }),
          });
          setUserSkills(prev => prev.map(us =>
            us.userId === userId && us.skillId === skillId ? { ...us, proficiencyLevel } : us
          ));
        }
      } else if (proficiencyLevel !== "__remove__") {
        const res = await fetch(`/api/users/${userId}/skills`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skillId, proficiencyLevel }),
        });
        const newUs = await res.json();
        setUserSkills(prev => [...prev, { ...newUs, skillType, categoryId: null, categoryName: null }]);
        await loadMatrix();
      }
      toast({ title: "Skill updated" });
    } catch {
      toast({ title: "Failed to update skill", variant: "destructive" });
    } finally {
      setSaving(false);
      setEditingCell(null);
    }
  }

  if (loadingSkills || loadingUsers || loadingMatrix) {
    return (
      <div className="space-y-2 p-4">
        {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  const skills = (allSkills as Skill[] ?? []).filter(s => (s as any).isActive !== 0);

  // Group skills by category
  const categoryMap = new Map<number | null, Skill[]>();
  for (const s of skills) {
    const k = s.categoryId ?? null;
    if (!categoryMap.has(k)) categoryMap.set(k, []);
    categoryMap.get(k)!.push(s);
  }

  // Categories for column groups
  const categories: Array<{ id: number | null; name: string; skills: Skill[] }> = [];
  for (const [catId, catSkills] of categoryMap.entries()) {
    const firstUserSkill = userSkills.find(us => catSkills.some(s => s.id === us.skillId));
    const catName = firstUserSkill?.categoryName ?? (catId === null ? "Uncategorized" : `Category ${catId}`);
    categories.push({ id: catId, name: catName, skills: catSkills });
  }
  categories.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

  const visibleSkills = skills.filter(s => !hiddenCats.has(s.categoryId ?? null));

  const userList = (users as any[] ?? []).filter((u: any) => {
    if (!search) return true;
    return u.name?.toLowerCase().includes(search.toLowerCase()) || u.role?.toLowerCase().includes(search.toLowerCase());
  });

  // Group users by role
  const userGroups: Array<{ label: string; users: any[] }> = [];
  if (groupBy === "role") {
    const roleMap = new Map<string, any[]>();
    for (const u of userList) {
      const r = u.role ?? "No Role";
      if (!roleMap.has(r)) roleMap.set(r, []);
      roleMap.get(r)!.push(u);
    }
    for (const [role, uList] of roleMap.entries()) {
      userGroups.push({ label: role, users: uList });
    }
    userGroups.sort((a, b) => a.label.localeCompare(b.label));
  } else {
    userGroups.push({ label: "All Team Members", users: userList });
  }

  const getUserSkill = (userId: number, skillId: number) =>
    userSkills.find(us => us.userId === userId && us.skillId === skillId);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Filter by name or role…"
            className="h-8 text-xs pl-8 w-52"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Group by:</span>
          <div className="flex border rounded-md overflow-hidden">
            {(["role", "category"] as const).map(g => (
              <button key={g} onClick={() => setGroupBy(g)}
                className={`px-2.5 py-1 text-xs transition-colors ${groupBy === g ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}>
                {g === "role" ? "By Role" : "By Category"}
              </button>
            ))}
          </div>
        </div>
        {/* Column visibility per category */}
        <div className="flex flex-wrap gap-1.5 ml-2">
          {categories.map(cat => {
            const hidden = hiddenCats.has(cat.id);
            return (
              <button key={String(cat.id)} onClick={() => setHiddenCats(prev => {
                const next = new Set(prev);
                if (hidden) next.delete(cat.id); else next.add(cat.id);
                return next;
              })}
                className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs transition-colors ${hidden ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-white text-slate-700 border-slate-300"}`}>
                {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {cat.name}
              </button>
            );
          })}
        </div>
        <Button size="sm" variant="outline" className="h-8 ml-auto" onClick={loadMatrix} disabled={saving}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-slate-600">Proficiency:</span>
        {LEVEL_OPTIONS.map(l => (
          <span key={l} className={`px-2 py-0.5 rounded border text-xs font-medium ${LEVEL_COLORS[l]}`}>{l}</span>
        ))}
        <span className="ml-2 text-slate-400">Click any cell to edit • Empty = not assigned</span>
      </div>

      {/* Matrix grid */}
      <div className="overflow-x-auto rounded-lg border bg-white dark:bg-slate-950">
        <table className="min-w-full text-xs">
          <thead>
            {/* Category header row */}
            <tr className="bg-slate-50 dark:bg-slate-900 border-b">
              <th className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-900 border-r px-3 py-2 text-left font-semibold text-slate-600 min-w-44">
                Team Member
              </th>
              {categories.map(cat => {
                const visible = cat.skills.filter(s => !hiddenCats.has(s.categoryId ?? null));
                if (visible.length === 0) return null;
                return (
                  <th key={String(cat.id)} colSpan={visible.length}
                    className="border-r px-2 py-1.5 text-center font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 text-xs tracking-wide uppercase">
                    {cat.name}
                  </th>
                );
              })}
            </tr>
            {/* Skill name row */}
            <tr className="bg-white dark:bg-slate-950 border-b">
              <th className="sticky left-0 z-10 bg-white dark:bg-slate-950 border-r px-3 py-2 text-left text-slate-500 font-medium">
                Role
              </th>
              {visibleSkills.map(skill => (
                <th key={skill.id} className="border-r px-2 py-1.5 font-medium text-slate-600 text-center whitespace-nowrap max-w-24 min-w-24">
                  <div className="truncate" title={skill.name}>{skill.name}</div>
                  <div className="text-slate-400 font-normal text-xs">{skill.skillType}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {userGroups.map(group => (
              <>
                {groupBy === "role" && (
                  <tr key={`group-${group.label}`} className="bg-slate-50 dark:bg-slate-900/50">
                    <td colSpan={visibleSkills.length + 1} className="sticky left-0 px-3 py-1.5 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide border-b border-slate-200">
                      {group.label} ({group.users.length})
                    </td>
                  </tr>
                )}
                {group.users.map((u: any) => (
                  <tr key={u.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                    {/* User label */}
                    <td className="sticky left-0 z-10 bg-white dark:bg-slate-950 border-r px-3 py-2 min-w-44">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{u.name}</div>
                      <div className="text-slate-400 truncate max-w-40">{u.role}</div>
                    </td>
                    {/* Skill cells */}
                    {visibleSkills.map(skill => {
                      const us = getUserSkill(u.id, skill.id);
                      const isEditing = editingCell?.userId === u.id && editingCell?.skillId === skill.id;
                      const levelOptions = skill.skillType === "Yes-No" ? ["Yes", "No"] : LEVEL_OPTIONS;
                      return (
                        <td key={skill.id} className="border-r px-1 py-1 text-center">
                          {isEditing ? (
                            <Select
                              defaultOpen
                              value={us?.proficiencyLevel ?? ""}
                              onValueChange={v => updateCell(u.id, skill.id, v, skill.skillType)}
                              onOpenChange={open => { if (!open) setEditingCell(null); }}
                            >
                              <SelectTrigger className="h-7 text-xs w-24 mx-auto">
                                <SelectValue placeholder="Select…" />
                              </SelectTrigger>
                              <SelectContent>
                                {us && <SelectItem value="__remove__" className="text-red-600">Remove</SelectItem>}
                                {levelOptions.map(o => (
                                  <SelectItem key={o} value={o}>{o}</SelectItem>
                                ))}
                                {skill.skillType === "Number" && (
                                  <>
                                    {["1","2","3","4","5","6","7","8","9","10"].map(n => (
                                      <SelectItem key={n} value={n}>{n}</SelectItem>
                                    ))}
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          ) : (
                            <button
                              onClick={() => setEditingCell({ userId: u.id, skillId: skill.id })}
                              className="w-full min-h-7 px-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                            >
                              {us ? (
                                <span className={`inline-block px-2 py-0.5 rounded border text-xs font-medium ${LEVEL_COLORS[us.proficiencyLevel] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                                  {us.proficiencyLevel}
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-700">—</span>
                              )}
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
            {userList.length === 0 && (
              <tr>
                <td colSpan={visibleSkills.length + 1} className="py-10 text-center text-muted-foreground text-sm">
                  No team members found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground text-right">
        {userList.length} team member{userList.length !== 1 ? "s" : ""} · {visibleSkills.length} skill{visibleSkills.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
