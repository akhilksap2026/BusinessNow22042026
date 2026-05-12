import { Skeleton } from "@/components/ui/skeleton";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  colWidths?: string[];
}

export function TableSkeleton({ rows = 5, cols = 4, colWidths }: TableSkeletonProps) {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i} className="pointer-events-none">
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton
                className={`h-4 ${colWidths?.[j] ?? (j === 0 ? "w-40" : j === cols - 1 ? "w-16" : "w-24")}`}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}
