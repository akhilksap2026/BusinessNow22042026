import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

interface TooltipCellProps {
  value: string | null | undefined;
  maxWidth?: string;
  className?: string;
}

/**
 * US-13: Renders a truncated text cell that shows the full value in a tooltip on hover.
 * Falls back to an em-dash for null/empty values (consistent with CN-5 null style).
 */
export function TooltipCell({ value, maxWidth = "max-w-[14rem]", className }: TooltipCellProps) {
  if (!value) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`block truncate cursor-default ${maxWidth} ${className ?? ""}`}>
          {value}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs break-words">
        {value}
      </TooltipContent>
    </Tooltip>
  );
}
