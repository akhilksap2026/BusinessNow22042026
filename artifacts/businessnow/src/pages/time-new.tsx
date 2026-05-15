import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { TimeEntryForm } from "@/components/time-entry-form";

export default function TimeNew() {
  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <PageHeader title="Log Time" breadcrumbs={[{ label: "Time Tracking", href: "/time" }, { label: "Log Time" }]} />
        <TimeEntryForm />
      </div>
    </Layout>
  );
}
