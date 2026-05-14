import { useQuery } from "@tanstack/react-query";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface QuotedVsActualRow {
  phaseId: number;
  phaseName: string;
  quotedHours: number;
  actualHours: number;
  completionPct: number;
  status: "under" | "on-track" | "over";
}

interface QuotedVsActualData {
  rows: QuotedVsActualRow[];
  totals: { quotedHours: number; actualHours: number };
}

interface QuotedVsActualProps {
  projectId: number;
}

const STATUS_LABELS: Record<QuotedVsActualRow["status"], string> = {
  under: "Under",
  "on-track": "On Track",
  over: "Over",
};

export function QuotedVsActualTable({ projectId }: QuotedVsActualProps) {
  const { data, isLoading } = useQuery<QuotedVsActualData>({
    queryKey: ["quoted-vs-actual", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/quoted-vs-actual`);
      if (!res.ok) throw new Error("Failed to fetch quoted vs actual");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-32 w-full" /></CardContent>
      </Card>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Quoted vs Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No phase data available yet.</p>
        </CardContent>
      </Card>
    );
  }

  const overallVariance = data.totals.quotedHours > 0
    ? ((data.totals.actualHours - data.totals.quotedHours) / data.totals.quotedHours) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Quoted vs Actual</CardTitle>
        {Math.abs(overallVariance) > 5 && (
          <p className={`text-sm font-medium ${overallVariance > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
            {overallVariance > 0 ? "+" : ""}{overallVariance.toFixed(1)}% overall variance from quoted hours
          </p>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phase</TableHead>
              <TableHead className="text-right">Quoted</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Completion</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((row) => (
              <TableRow key={row.phaseId}>
                <TableCell className="font-medium">{row.phaseName}</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {row.quotedHours.toFixed(1)}h
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {row.actualHours.toFixed(1)}h
                </TableCell>
                <TableCell className="text-right text-sm">{row.completionPct}%</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      row.status === "over" ? "destructive" :
                      row.status === "under" ? "outline" :
                      "secondary"
                    }
                    className="text-xs"
                  >
                    {STATUS_LABELS[row.status]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-bold">Total</TableCell>
              <TableCell className="text-right font-mono font-bold">
                {data.totals.quotedHours.toFixed(1)}h
              </TableCell>
              <TableCell className="text-right font-mono font-bold">
                {data.totals.actualHours.toFixed(1)}h
              </TableCell>
              <TableCell />
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
