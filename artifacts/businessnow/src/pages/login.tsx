import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useCurrentUser } from "@/contexts/current-user";
import { toast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface LoginUser {
  id: number;
  name: string;
  initials: string;
  role: string;
  secondaryRoles: string[];
  department: string;
  avatarUrl?: string | null;
}

const DEMO_PASSWORDS: Record<string, string> = {
  "Admin User":        "Admin@2026",
  "Amara Diallo":      "Amara@2026",
  "Daniel Osei":       "Daniel@2026",
  "Leila Hassan":      "Leila@2026",
  "Marcus Webb":       "Marcus@2026",
  "Priya Nair":        "Priya@2026",
  "Raj Krishnamurthy": "Raj@2026",
  "Sophie Laurent":    "Sophie@2026",
  "Tom Bridges":       "Tom@2026",
};

function passwordFor(name: string): string {
  return DEMO_PASSWORDS[name] ?? `${name.split(" ")[0]}@2026`;
}

export default function Login() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading, loginAs } = useCurrentUser();
  const [users, setUsers] = useState<LoginUser[] | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate("/");
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    fetch(`${BASE}/api/auth/users-for-login`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: LoginUser[]) => setUsers(data))
      .catch(() => {});
  }, []);

  const selectedUser = users?.find(u => u.id.toString() === selectedUserId) ?? null;
  const allRoles = selectedUser
    ? [selectedUser.role, ...(selectedUser.secondaryRoles ?? []).filter(r => r !== selectedUser.role)]
    : [];
  const hasMultipleRoles = allRoles.length > 1;
  const password = selectedUser ? passwordFor(selectedUser.name) : "";

  function handleUserChange(userId: string) {
    setSelectedUserId(userId);
    const u = users?.find(u => u.id.toString() === userId);
    if (u) {
      const roles = [u.role, ...(u.secondaryRoles ?? []).filter(r => r !== u.role)];
      setSelectedRole(roles[0] ?? "");
    } else {
      setSelectedRole("");
    }
  }

  async function handleLogin() {
    if (!selectedUser || !selectedRole) return;
    setSubmitting(true);
    try {
      await loginAs(selectedUser.id, selectedRole);
      toast({ title: `Welcome back, ${selectedUser.name.split(" ")[0]}`, description: `Signed in as ${selectedRole}.` });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Sign-in failed", description: err?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex">
      {/* ── Left panel: form ── */}
      <div className="w-full md:w-[420px] lg:w-[480px] flex-shrink-0 flex flex-col items-center justify-center bg-white dark:bg-zinc-950 px-10 py-12">
        {/* Logo */}
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-base select-none">
              B
            </div>
            <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">BusinessNow</span>
          </div>

          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-8">Log in</h1>

          <div className="space-y-5">
            {/* User ID */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">User ID</Label>
              <Select value={selectedUserId} onValueChange={handleUserChange} disabled={!users}>
                <SelectTrigger className="h-11 border-zinc-300 dark:border-zinc-700 focus:ring-indigo-500 bg-white dark:bg-zinc-900">
                  <SelectValue placeholder={users ? "Select a user…" : "Loading users…"} />
                </SelectTrigger>
                <SelectContent>
                  {(users ?? []).map(u => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      <span className="font-mono text-xs text-zinc-400 mr-2">#{u.id}</span>
                      {u.name}
                      <span className="ml-2 text-xs text-zinc-400">({u.department})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role selector (only when user has multiple roles) */}
            {hasMultipleRoles && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="h-11 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allRoles.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Password */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  readOnly
                  placeholder="Select a user to auto-fill"
                  className="h-11 pr-10 border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 cursor-default select-none"
                />
                {password && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>

            {/* Log In button */}
            <Button
              className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-semibold tracking-wide mt-1"
              disabled={!selectedUser || submitting}
              onClick={handleLogin}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "LOG IN"}
            </Button>
          </div>

          <p className="text-center text-xs text-zinc-400 mt-8">
            Demo workspace — passwords are pre-configured per user.
          </p>
        </div>
      </div>

      {/* ── Right panel: gradient ── */}
      <div className="hidden md:flex flex-1 items-center justify-center bg-gradient-to-br from-purple-400 via-violet-400 to-pink-400">
        <div className="text-center text-white/80 space-y-2 select-none">
          <div className="text-5xl font-bold tracking-tight text-white opacity-20">BusinessNow</div>
        </div>
      </div>
    </div>
  );
}
