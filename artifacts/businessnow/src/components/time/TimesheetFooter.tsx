import { AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface FooterRow {
  hours: Record<string, number>;
  billableCategory: string;
  isLeave: boolean;
}

interface TimesheetFooterProps {
  weekDates: string[];
  rows: FooterRow[];
}

export function TimesheetFooter({ weekDates, rows }: TimesheetFooterProps) {
  const dayTotals = weekDates.map((date) =>
    rows.reduce((sum, row) => sum + (row.hours[date] ?? 0), 0),
  );
  const grandTotal = dayTotals.reduce((a, b) => a + b, 0);

  const billable = rows
    .filter((r) => r.billableCategory === "Billable" && !r.isLeave)
    .reduce((sum, r) => sum + Object.values(r.hours).reduce((a, b) => a + b, 0), 0);

  const leave = rows
    .filter((r) => r.isLeave)
    .reduce((sum, r) => sum + Object.values(r.hours).reduce((a, b) => a + b, 0), 0);

  const nonBillable = grandTotal - billable - leave;

  return (
    <>
      <tr className="border-t-2 border-border bg-muted/30">
        <td className="py-2 px-3 text-sm font-semibold">Total Hours</td>
        <td className="py-2 px-3" />
        {dayTotals.map((total, i) => (
          <td
            key={weekDates[i]}
            className={cn(
              "py-2 px-1 text-center text-sm font-semibold",
              total > 24 && "text-red-600 dark:text-red-400",
            )}
          >
            {total > 24 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center justify-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {total.toFixed(2)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>Day total exceeds 24 hours.</TooltipContent>
              </Tooltip>
            ) : total > 0 ? (
              total.toFixed(2)
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </td>
        ))}
        <td className="py-2 px-3 text-center text-sm font-bold">
          {grandTotal > 0 ? grandTotal.toFixed(2) : "—"}
        </td>
        <td />
      </tr>
      <tr className="bg-muted/10">
        <td colSpan={2} className="py-1 px-3 text-xs italic text-muted-foreground">
          Breakdown
        </td>
        <td colSpan={7} className="py-1 px-1 text-xs text-muted-foreground">
          <span className="mr-4">
            Billable:{" "}
            <span className="font-medium text-foreground">{billable.toFixed(1)}</span>
          </span>
          <span className="mr-4">
            Leave:{" "}
            <span className="font-medium text-foreground">{leave.toFixed(1)}</span>
          </span>
          <span>
            Non-Billable:{" "}
            <span className="font-medium text-foreground">{nonBillable.toFixed(1)}</span>
          </span>
        </td>
        <td colSpan={2} />
      </tr>
    </>
  );
}
