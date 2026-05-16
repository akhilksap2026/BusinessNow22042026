import { useState } from "react";
import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { useAccountPermissions } from "@/lib/permissions";
import { useCurrentUser } from "@/contexts/current-user";
import Forbidden from "@/pages/forbidden";
import { ApprovalQueue, type QueueSubmission } from "@/components/time/ApprovalQueue";
import { ApprovalReviewPanel } from "@/components/time/ApprovalReviewPanel";
import { ClipboardCheck } from "lucide-react";

function EmptyReviewState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
      <ClipboardCheck className="h-12 w-12 text-muted-foreground/30" />
      <p className="text-sm font-medium text-muted-foreground">No timesheet selected</p>
      <p className="text-xs text-muted-foreground">
        Select a timesheet from the queue on the left to review it.
      </p>
    </div>
  );
}

export default function Approvals() {
  const { activeRole } = useCurrentUser();
  const checkPerm = useAccountPermissions(activeRole);
  const canApprove = checkPerm("timeTracking.approve");

  const [selected, setSelected] = useState<QueueSubmission | null>(null);

  // Role guard — redirect to Forbidden for roles without approve permission
  if (!canApprove) {
    return <Forbidden />;
  }

  return (
    <Layout>
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Page header */}
        <div className="px-6 py-4 border-b border-border bg-background shrink-0">
          <PageHeader
            title="Approvals"
            breadcrumbs={[
              { label: "Time Tracking", href: "/time" },
              { label: "Approvals" },
            ]}
          />
        </div>

        {/* Split layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel — queue (30%) */}
          <div className="w-[320px] shrink-0 border-r border-border overflow-hidden flex flex-col bg-background">
            <ApprovalQueue
              selected={selected}
              onSelect={(item) => setSelected(item)}
            />
          </div>

          {/* Right panel — review (70%) */}
          <div className="flex-1 overflow-hidden bg-muted/10">
            {selected ? (
              <ApprovalReviewPanel
                key={`${selected.resourceId}-${selected.weekStart}`}
                resourceId={selected.resourceId}
                weekStart={selected.weekStart}
                submitterName={selected.submitterName}
                onActionComplete={() => setSelected(null)}
              />
            ) : (
              <EmptyReviewState />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
