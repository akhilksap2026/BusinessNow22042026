import { ReactNode } from "react";
import { useCurrentUser } from "@/contexts/current-user";
import { can, type AccountPermission } from "@/lib/permissions";
import Forbidden from "@/pages/forbidden";

interface RequirePermissionProps {
  permission: AccountPermission;
  children: ReactNode;
}

export function RequirePermission({ permission, children }: RequirePermissionProps) {
  const { activeRole, isLoading, currentUser } = useCurrentUser();

  if (isLoading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!can(activeRole, permission)) {
    return <Forbidden permission={permission} />;
  }

  return <>{children}</>;
}
