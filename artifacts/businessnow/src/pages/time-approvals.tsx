import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { ApprovalQueue } from "@/components/approval-queue";

export default function TimeApprovals() {
  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <PageHeader
          title="Approval Queue"
          breadcrumbs={[
            { label: "Time Tracking", href: "/time" },
            { label: "Approvals" },
          ]}
        />
        <ApprovalQueue />
      </div>
    </Layout>
  );
}
