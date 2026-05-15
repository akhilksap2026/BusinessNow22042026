import { useParams } from "wouter";
import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { TimeEntryForm } from "@/components/time-entry-form";

export default function TimeEntryEdit() {
  const { id } = useParams<{ id: string }>();
  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <PageHeader title="Edit Time Entry" breadcrumbs={[{ label: "Time Tracking", href: "/time" }, { label: "Edit Entry" }]} />
        <TimeEntryForm entryId={Number(id)} />
      </div>
    </Layout>
  );
}
