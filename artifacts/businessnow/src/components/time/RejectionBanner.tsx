import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RejectionBannerProps {
  priorWeekRange: string;
  onFix: () => void;
}

export function RejectionBanner({ priorWeekRange, onFix }: RejectionBannerProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/30">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="flex-1 text-sm text-amber-800 dark:text-amber-300">
        You have rejected entries in the week of{" "}
        <span className="font-medium">{priorWeekRange}</span>. Correct and resubmit
        them before submitting this week.
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={onFix}
        className="shrink-0 border-amber-400 text-amber-800 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300"
      >
        Fix Rejected Entries →
      </Button>
    </div>
  );
}
