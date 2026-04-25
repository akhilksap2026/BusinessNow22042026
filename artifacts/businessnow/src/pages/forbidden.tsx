import { Link } from "wouter";
import { ShieldAlert, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/contexts/current-user";

interface ForbiddenProps {
  permission?: string;
}

export default function Forbidden({ permission }: ForbiddenProps) {
  const { activeRole, availableRoles } = useCurrentUser();
  const canSwitch = availableRoles.length > 1;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="rounded-full bg-amber-100 dark:bg-amber-950/40 p-4 mb-4">
        <ShieldAlert className="h-10 w-10 text-amber-600 dark:text-amber-400" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight mb-2">Permission denied</h1>
      <p className="text-muted-foreground max-w-md mb-1">
        Your current role <span className="font-medium text-foreground">{activeRole}</span>{" "}
        doesn't have access to this page.
      </p>
      {permission && (
        <p className="text-xs text-muted-foreground mb-4">Required: <code>{permission}</code></p>
      )}
      <div className="flex gap-2 mt-4">
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Button>
        </Link>
        {canSwitch && (
          <Button
            className="gap-2"
            onClick={() => window.dispatchEvent(new CustomEvent("open-role-selector"))}
          >
            <RefreshCw className="h-4 w-4" /> Switch role
          </Button>
        )}
      </div>
    </div>
  );
}
