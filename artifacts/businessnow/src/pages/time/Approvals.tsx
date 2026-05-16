import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { useAccountPermissions } from "@/lib/permissions";
import { useCurrentUser } from "@/contexts/current-user";
import { useToast } from "@/hooks/use-toast";
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
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selected, setSelected] = useState<QueueSubmission | null>(null);

  // E1: redirect Consultant (and other non-approver roles) with toast
  useEffect(() => {
    if (!canApprove) {
      toast({ title: "Access restricted.", variant: "destructive" });
      navigate("/time/timesheet");
    }
  }, [canApprove, toast, navigate]);

  if (!canApprove) return null;

  return (
    <Layout>
      <div className="flex flex-col h-screen overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-background shrink-0">
          <PageHeader
            title="Approvals"
            breadcrumbs={[
              { label: "Time Tracking", href: "/time" },
              { label: "Approvals" },
            ]}
          />
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-[320px] shrink-0 border-r border-border overflow-hidden flex flex-col bg-background">
            <ApprovalQueue
              selected={selected}
              onSelect={(item) => setSelected(item)}
            />
          </div>

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
