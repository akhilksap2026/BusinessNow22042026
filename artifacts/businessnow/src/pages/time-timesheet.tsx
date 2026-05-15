import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { WeeklyTimesheetView } from "@/components/weekly-timesheet-view";

export default function TimeTimesheet() {
  // Read ?weekStart and ?resourceId from the URL
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const weekStart  = params.get("weekStart")  ?? undefined;
  const resourceId = params.get("resourceId") ? Number(params.get("resourceId")) : undefined;

  return (
    <Layout>
      <div className="flex flex-col h-full">
        <div className="px-6 pt-6 pb-3 shrink-0">
          <PageHeader
            title="Weekly Timesheet"
            breadcrumbs={[
              { label: "Time Tracking", href: "/time" },
              { label: "Weekly Timesheet" },
            ]}
          />
        </div>
        <div className="flex-1 min-h-0">
          <WeeklyTimesheetView
            initialWeekStart={weekStart}
            initialResourceId={resourceId}
          />
        </div>
      </div>
    </Layout>
  );
}
