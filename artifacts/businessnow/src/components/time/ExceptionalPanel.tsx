import { AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface ExceptionalRow {
  rowKey: string;
  projectName: string;
  taskName: string;
  budgetHours: number | null;
  enteredHours: number;
  justification: string;
}

interface ExceptionalPanelProps {
  rows: ExceptionalRow[];
  onJustificationChange: (rowKey: string, value: string) => void;
}

export function ExceptionalPanel({ rows, onJustificationChange }: ExceptionalPanelProps) {
  if (rows.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-4 dark:border-amber-700 dark:bg-amber-950/20">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Exceptional Effort — Justification Required
      </div>
      {rows.map((row) => {
        const excess =
          row.budgetHours != null ? row.enteredHours - row.budgetHours : null;
        const isValid = row.justification.trim().length >= 10;
        return (
          <div
            key={row.rowKey}
            className="rounded-md border border-amber-200 bg-white p-3 space-y-2 dark:border-amber-800 dark:bg-amber-950/40"
          >
            <div className="text-sm font-medium text-foreground">
              {row.projectName} — {row.taskName}
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              {row.budgetHours != null && (
                <span>Budget: <span className="font-medium">{row.budgetHours.toFixed(1)} hrs</span></span>
              )}
              <span>Entered: <span className="font-medium">{row.enteredHours.toFixed(1)} hrs</span></span>
              {excess != null && excess > 0 && (
                <span className="text-amber-700 dark:text-amber-400">
                  Excess: <span className="font-medium">{excess.toFixed(1)} hrs</span>
                </span>
              )}
            </div>
            <Textarea
              value={row.justification}
              onChange={(e) => onJustificationChange(row.rowKey, e.target.value)}
              placeholder="Justify the excess hours (min 10 characters)…"
              rows={2}
              className={cn(
                "resize-none text-sm",
                !isValid && row.justification.length > 0 && "border-red-400",
              )}
            />
            {!isValid && row.justification.length > 0 && (
              <p className="text-xs text-red-600">At least 10 characters required.</p>
            )}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{isValid ? "✓ Justification accepted" : "Justification required before submitting"}</span>
              <span>{row.justification.length} chars</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
