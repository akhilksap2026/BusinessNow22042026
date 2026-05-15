import { useParams } from "wouter";
import { Link } from "wouter";
import { ChevronLeft } from "lucide-react";
import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { TimesheetReviewScreen } from "@/components/timesheet-review-screen";
import { Button } from "@/components/ui/button";

export default function TimeApprovalReview() {
  const { submitterId, weekStart } = useParams<{ submitterId: string; weekStart: string }>();

  if (!submitterId || !weekStart) return null;

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/time/approvals">
            <Button variant="ghost" size="sm" className="gap-1.5 h-8">
              <ChevronLeft className="h-4 w-4" /> Back to Queue
            </Button>
          </Link>
          <PageHeader
            title="Review Timesheet"
            breadcrumbs={[
              { label: "Time Tracking", href: "/time" },
              { label: "Approvals", href: "/time/approvals" },
              { label: "Review" },
            ]}
          />
        </div>
        <TimesheetReviewScreen
          submitterId={Number(submitterId)}
          weekStart={weekStart}
        />
      </div>
    </Layout>
  );
}
