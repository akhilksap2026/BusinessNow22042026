import { cn } from "@/lib/utils";

interface NullCellProps {
  value: unknown;
  className?: string;
}

export function NullCell({ value, className }: NullCellProps) {
  if (value === null || value === undefined || value === "") {
    return <span className={cn("text-muted-foreground select-none", className)}>—</span>;
  }
  return <>{String(value)}</>;
}
