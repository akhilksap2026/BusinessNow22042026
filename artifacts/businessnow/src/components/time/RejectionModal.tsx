import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface RejectionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  entry: {
    entryDate: string;
    projectName: string;
    taskName: string;
    durationHours: number;
  } | null;
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function RejectionModal({ open, onClose, onConfirm, entry }: RejectionModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = reason.trim().length >= 10;

  async function handleConfirm() {
    if (!isValid) {
      setError("Please provide at least 10 characters.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
      setReason("");
    } catch {
      setError("Failed to reject entry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    if (isSubmitting) return;
    setReason("");
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Entry</DialogTitle>
          <DialogDescription>
            The employee will be notified with your reason so they can correct and resubmit.
          </DialogDescription>
        </DialogHeader>

        {entry && (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm space-y-0.5">
            <p className="font-medium">{formatDate(entry.entryDate)}</p>
            <p className="text-muted-foreground">
              {entry.projectName} — {entry.taskName} &middot;{" "}
              <span className="font-medium">{entry.durationHours.toFixed(2)} hrs</span>
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="rejection-reason">Reason for rejection</Label>
          <Textarea
            id="rejection-reason"
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError(null); }}
            placeholder="Describe why this entry is being rejected so the employee can correct it."
            rows={4}
            className={cn("resize-none text-sm", error && "border-red-400 focus-visible:ring-red-400")}
          />
          <div className="flex items-center justify-between">
            {error ? (
              <p className="text-xs text-red-600">{error}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {reason.trim().length < 10
                  ? `${10 - reason.trim().length} more characters required`
                  : "✓ Good to go"}
              </p>
            )}
            <span className={cn("text-xs tabular-nums", reason.trim().length < 10 ? "text-muted-foreground" : "text-green-600")}>
              {reason.length} chars
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? "Rejecting…" : "Confirm Rejection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
