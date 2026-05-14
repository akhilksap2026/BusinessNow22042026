import { BurnChart } from "./burn-chart";
import { QuotedVsActualTable } from "./quoted-vs-actual-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBurnChart } from "@/hooks/use-burn-chart";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectOverviewTabProps {
  projectId: number;
}

export function ProjectOverviewTab({ projectId }: ProjectOverviewTabProps) {
  const { data: burnData, isLoading: burnLoading } = useBurnChart(projectId);

  return (
    <div className="space-y-6">
      {burnLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[380px] w-full" />
          </CardContent>
        </Card>
      ) : burnData ? (
        <BurnChart data={burnData} />
      ) : null}

      <QuotedVsActualTable projectId={projectId} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">At-Risk Items</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aggregated risks will appear here...</p>
        </CardContent>
      </Card>
    </div>
  );
}
