import { useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MAX_CHARS = 1000;

const PII_PATTERNS: RegExp[] = [
  /\b\d{3}-\d{2}-\d{4}\b/,
  /\b(?:\d[ -]?){15,16}\b/,
  /\b(?:ssn|social[\s-]?security|credit[\s-]?card|password|passwd|dob|date[\s-]?of[\s-]?birth)\b/i,
];

function hasPii(text: string): boolean {
  return PII_PATTERNS.some((p) => p.test(text));
}

export interface ActiveCellInfo {
  rowKey: string;
  date: string;
  projectName: string;
  taskName: string;
  narrativeRequired: boolean;
}

interface DescriptionPanelProps {
  activeCell: ActiveCellInfo | null;
  value: string;
  onChange: (val: string) => void;
}

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function DescriptionPanel({ activeCell, value, onChange }: DescriptionPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const piiDetected = value.length > 0 && hasPii(value);

  useEffect(() => {
    if (activeCell && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activeCell?.rowKey, activeCell?.date]);

  if (!activeCell) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
        Click any hour cell to add a work description.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="text-muted-foreground">Description —</span>
        <span>{formatDay(activeCell.date)}</span>
        <span className="text-muted-foreground">|</span>
        <span className="text-foreground">{activeCell.projectName}</span>
        <span className="text-muted-foreground">—</span>
        <span className="text-foreground">{activeCell.taskName}</span>
        {activeCell.narrativeRequired && (
          <span className="ml-1 text-red-500 text-xs font-semibold">(Required)</span>
        )}
      </div>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_CHARS))}
        placeholder="Describe the work done…"
        rows={3}
        className={cn("resize-none text-sm", piiDetected && "border-red-400 focus-visible:ring-red-400")}
      />
      <div className="flex items-center justify-between">
        <p className={cn("text-xs text-muted-foreground", piiDetected && "text-red-600 font-medium")}>
          {piiDetected
            ? "⚠ Sensitive information detected. Remove personal data before saving."
            : ""}
        </p>
        <span
          className={cn(
            "text-xs tabular-nums",
            value.length >= MAX_CHARS ? "text-red-500" : "text-muted-foreground",
          )}
        >
          {value.length} / {MAX_CHARS}
        </span>
      </div>
    </div>
  );
}
