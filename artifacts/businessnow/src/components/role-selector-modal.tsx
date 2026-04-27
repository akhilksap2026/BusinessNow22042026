import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/contexts/current-user";
import { cn } from "@/lib/utils";

const ROLE_DESCRIPTIONS: Record<string, string> = {
  Admin: "Full access — every project, every setting, every report.",
  account_admin: "Full access — every project, every setting, every report.",
  PM: "Manage projects, plans, allocations and approvals.",
  Finance: "Invoices, billing, rate cards and revenue.",
  "Super User": "Broad access across projects and finance work.",
  super_user: "Broad access across projects and finance work.",
  Developer: "Contribute to assigned project work.",
  Designer: "Contribute to assigned project work.",
  QA: "Test and verify assigned project work.",
  Collaborator: "Contribute to assigned projects and log your time.",
  collaborator: "Contribute to assigned projects and log your time.",
  Consultant: "Project advisory work and time tracking.",
};

export function RoleSelectorModal() {
  const { currentUser, availableRoles, activeRole, switchRole } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const openedForRef = useRef(false);

  useEffect(() => {
    if (!currentUser) return;
    if (availableRoles.length <= 1) return;
    if (!openedForRef.current) {
      openedForRef.current = true;
      setOpen(true);
    }
  }, [currentUser, availableRoles.length]);

  useEffect(() => {
    function handler() {
      setOpen(true);
    }
    window.addEventListener("open-role-selector", handler);
    return () => window.removeEventListener("open-role-selector", handler);
  }, []);

  function handlePick(role: string) {
    setPending(role);
    switchRole(role);
    setTimeout(() => {
      setOpen(false);
      setPending(null);
    }, 120);
  }

  if (!currentUser || availableRoles.length <= 1) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !activeRole) {
          switchRole(activeRole || currentUser.role);
        }
        setOpen(next);
      }}
    >
      <DialogContent className="sm:max-w-md" data-testid="dialog-role-selector">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Choose your role for this session
          </DialogTitle>
          <DialogDescription>
            You have access to {availableRoles.length} roles. Pick the one you'd like to use right now —
            you can switch any time from the account menu.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 mt-2">
          {availableRoles.map((role) => {
            const isCurrent = role === activeRole;
            const isPending = role === pending;
            return (
              <button
                key={role}
                type="button"
                onClick={() => handlePick(role)}
                disabled={!!pending}
                data-testid={`button-role-${role}`}
                className={cn(
                  "flex items-start gap-3 rounded-md border p-3 text-left transition-colors",
                  "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isCurrent && "border-primary/50 bg-primary/5",
                  isPending && "opacity-60",
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{role}</span>
                    {isCurrent && (
                      <span className="text-[10px] rounded-full bg-primary/10 text-primary px-2 py-0.5">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ROLE_DESCRIPTIONS[role] ?? "Role-based access for this user."}
                  </p>
                </div>
                {isCurrent && <Check className="h-4 w-4 text-primary mt-1" />}
              </button>
            );
          })}
        </div>
        {!activeRole && (
          <p className="text-xs text-muted-foreground mt-3">
            Tip: pick the role you'll use most. You can always switch later from the account menu.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
