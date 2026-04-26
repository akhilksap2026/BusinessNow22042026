import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ShieldCheck, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
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

export default function Login() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading, loginAs } = useCurrentUser();
  const [users, setUsers] = useState<LoginUser[] | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pendingUser, setPendingUser] = useState<LoginUser | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in? Bounce straight to the dashboard.
  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate("/");
  }, [authLoading, isAuthenticated, navigate]);

  // Load the public user list (no auth headers needed).
  useEffect(() => {
    let cancelled = false;
    fetch(`${BASE}/api/auth/users-for-login`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as LoginUser[];
      })
      .then((data) => {
        if (cancelled) return;
        setUsers(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setFetchError(err?.message ?? "Failed to load users.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q) ||
        (u.secondaryRoles ?? []).some((r) => r.toLowerCase().includes(q)),
    );
  }, [users, search]);

  function rolesFor(u: LoginUser): string[] {
    return [u.role, ...(u.secondaryRoles ?? []).filter((r) => r !== u.role)];
  }

  async function doLogin(user: LoginUser, role: string) {
    setSubmitting(true);
    try {
      await loginAs(user.id, role);
      toast({
        title: `Welcome back, ${user.name.split(" ")[0]}`,
        description: `Signed in as ${role}.`,
      });
      navigate("/");
    } catch (err: any) {
      toast({
        title: "Sign-in failed",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleUserClick(u: LoginUser) {
    const roles = rolesFor(u);
    if (roles.length <= 1) {
      void doLogin(u, roles[0]);
    } else {
      setPendingUser(u);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
              B
            </div>
            <span className="text-2xl font-bold tracking-tight">BusinessNow</span>
          </div>
          <h1 className="text-3xl font-semibold mb-2">Sign in to your workspace</h1>
          <p className="text-muted-foreground text-sm">
            Pick a user below to continue. All roles are pre-configured for this demo workspace.
          </p>
        </div>

        {/* Role-pick step */}
        {pendingUser ? (
          <Card className="max-w-md mx-auto" data-testid="login-role-picker">
            <CardContent className="pt-6">
              <Button
                variant="ghost"
                size="sm"
                className="mb-4 -ml-2"
                onClick={() => setPendingUser(null)}
                disabled={submitting}
                data-testid="button-back-to-users"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to users
              </Button>
              <div className="flex items-center gap-3 mb-6">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={pendingUser.avatarUrl ?? ""} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {pendingUser.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{pendingUser.name}</div>
                  <div className="text-xs text-muted-foreground">{pendingUser.department}</div>
                </div>
              </div>
              <div className="text-sm font-medium mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                This account has multiple roles — pick one to continue
              </div>
              <div className="space-y-2">
                {rolesFor(pendingUser).map((role) => (
                  <Button
                    key={role}
                    variant="outline"
                    className="w-full justify-between h-auto py-3"
                    disabled={submitting}
                    onClick={() => doLogin(pendingUser, role)}
                    data-testid={`button-pick-role-${role.replace(/\s+/g, "-").toLowerCase()}`}
                  >
                    <span className="font-medium">{role}</span>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Search */}
            {users && users.length > 6 && (
              <div className="max-w-md mx-auto mb-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, role, or department"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-user-search"
                />
              </div>
            )}

            {/* Loading / error states */}
            {!users && !fetchError && (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading users…
              </div>
            )}
            {fetchError && (
              <Card className="max-w-md mx-auto border-destructive/50">
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-destructive font-medium mb-1">
                    Could not load the user list.
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    The API server may be starting up. Try refreshing in a few seconds.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* User grid */}
            {users && (
              <div
                className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                data-testid="login-user-grid"
              >
                {filteredUsers.map((u) => {
                  const roles = rolesFor(u);
                  const multi = roles.length > 1;
                  return (
                    <button
                      key={u.id}
                      onClick={() => handleUserClick(u)}
                      disabled={submitting}
                      className={cn(
                        "group text-left rounded-lg border bg-card p-4 transition-all",
                        "hover:border-primary hover:shadow-md hover:-translate-y-0.5",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
                      )}
                      data-testid={`button-login-user-${u.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarImage src={u.avatarUrl ?? ""} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {u.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">{u.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {u.department}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <Badge variant="secondary" className="text-[10px] font-medium">
                              {u.role}
                            </Badge>
                            {multi &&
                              roles.slice(1).map((r) => (
                                <Badge key={r} variant="outline" className="text-[10px]">
                                  {r}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      </div>
                      {multi && (
                        <div className="mt-3 text-[11px] text-muted-foreground flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          {roles.length} roles available
                        </div>
                      )}
                    </button>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <div className="col-span-full text-center py-12 text-sm text-muted-foreground">
                    No users match "{search}".
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">
          Demo workspace — no password required. Sessions are kept locally in your browser.
        </p>
      </div>
    </div>
  );
}
