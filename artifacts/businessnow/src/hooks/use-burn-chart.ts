import { useQuery } from "@tanstack/react-query";
import { authHeaders } from "@/lib/auth-headers";

export interface BurnChartData {
  currency: string;
  todayLine: string;
  series: Array<{
    date: string;
    plannedBudget: number;
    actualCost: number;
    invoicedAmount: number;
    plannedHours: number;
    actualHours: number;
    forecastCost: number;
    forecastHours: number;
  }>;
}

export function useBurnChart(projectId: number, granularity: "week" | "month" = "week") {
  return useQuery<BurnChartData>({
    queryKey: ["burn-chart", projectId, granularity],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/burn-chart?granularity=${granularity}`,
        { headers: authHeaders() },
      );
      if (!res.ok) throw new Error("Failed to fetch burn chart");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    enabled: projectId > 0,
  });
}
