import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Check, ChevronRight, X } from "lucide-react";
import { useListUsers, useListProjects, useListAllocations, useListTimesheets, getListUsersQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/contexts/current-user";
import { authHeaders } from "@/lib/auth-headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Step = {
  id: string;
  label: string;
  description: string;
  done: boolean;
  href: string;
  cta: string;
};

/**
 * Workspace setup checklist for the dashboard. Computes its own step states
 * from real data (users, projects, allocations, submitted timesheets) so the
 * list is always honest. Auto-hides once everything is done OR the user
 * dismisses it (per-user flag stored on the users table).
 *
 * Visible to account admins only — they're the ones who actually need to do
 * the setup work, and showing it to every collaborator just adds noise.
 */
export function OnboardingChecklist() {
  const { currentUser } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "account_admin";

  const { data: users } = useListUsers(undefined, { query: { enabled: isAdmin } });
  const { data: projects } = useListProjects(undefined, { query: { enabled: isAdmin } });
  const { data: allocations } = useListAllocations(undefined, { query: { enabled: isAdmin } });
  const { data: timesheets } = useListTimesheets(undefined, { query: { enabled: isAdmin } });

  const dismissed = Boolean((currentUser as any)?.onboardingDismissed);

  const dismissMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error("No user");
      const r = await fetch(`/api/users/${currentUser.id}/onboarding-dismissed`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ dismissed: true }),
      });
      if (!r.ok) throw new Error(`Dismiss failed (${r.status})`);
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      // Force a re-fetch of the current user so the dismissed flag flows
      // through and the panel disappears immediately.
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      toast({ title: "Setup checklist hidden", description: "You can re-enable it from your profile if needed." });
    },
    onError: (e: any) => toast({ title: "Couldn't dismiss", description: e.message, variant: "destructive" }),
  });

  const steps: Step[] = useMemo(() => [
    {
      id: "team",
      label: "Invite your team",
      description: "Add at least one teammate so you can assign work.",
      done: (users?.length ?? 0) > 1,
      href: "/team",
      cta: "Invite",
    },
    {
      id: "project",
      label: "Create your first project",
      description: "Spin up a project to start tracking scope, budget, and time.",
      done: (projects?.length ?? 0) > 0,
      href: "/projects",
      cta: "Create project",
    },
    {
      id: "allocation",
      label: "Allocate someone to a project",
      description: "Assign a team member so they show up in capacity and timesheets.",
      done: (allocations?.length ?? 0) > 0,
      href: "/resources",
      cta: "Allocate",
    },
    {
      id: "timesheet",
      label: "Submit your first timesheet",
      description: "Confirm the time-tracking workflow end-to-end.",
      done: (timesheets ?? []).some((t: any) => t.status === "Submitted" || t.status === "Approved"),
      href: "/time",
      cta: "Open timesheets",
    },
  ], [users, projects, allocations, timesheets]);

  const completedCount = steps.filter(s => s.done).length;
  const allDone = completedCount === steps.length;

  // Hide for non-admins, dismissed users, and once everything is done.
  if (!isAdmin || dismissed || allDone) return null;

  return (
    <Card data-testid="onboarding-checklist" className="border-indigo-200 bg-indigo-50/40 dark:bg-indigo-950/20 dark:border-indigo-900/50">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">Get your workspace set up</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {completedCount} of {steps.length} complete — finish these to unlock the full platform.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1 text-muted-foreground"
          onClick={() => dismissMutation.mutate()}
          disabled={dismissMutation.isPending}
        >
          <X className="h-3.5 w-3.5" />
          Dismiss
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex items-center gap-3 p-3 rounded-md border bg-white dark:bg-background ${step.done ? "opacity-60" : ""}`}
          >
            <div className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-white ${step.done ? "bg-emerald-500" : "bg-muted-foreground/30"}`}>
              {step.done && <Check className="h-3.5 w-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${step.done ? "line-through" : ""}`}>{step.label}</div>
              <div className="text-xs text-muted-foreground">{step.description}</div>
            </div>
            {!step.done && (
              <Link href={step.href}>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                  {step.cta}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
