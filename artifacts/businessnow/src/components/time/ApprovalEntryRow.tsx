import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { authHeaders } from "@/lib/auth-headers";
import { useToast } from "@/hooks/use-toast";

export interface AuditLogEntry {
  id: number;
  effortEntryId: number;
  action: string;
  performedById: number;
  performedAt: string;
  details?: string | null;
}

export interface DetailEntry {
  id: number;
  resourceId: number;
  projectId: number;
  taskId: number | null;
  leaveTypeId: number | null;
  entryDate: string;
  durationHours: string;
  billableCategory: string;
  narrative: string | null;
  isLeave: boolean;
  isExceptional: boolean;
  exceptionalJustification: string | null;
  status: string;
  rejectionReason: string | null;
  resubmissionType: string | null;
  auditLog: AuditLogEntry[];
  budgetHours?: number | null;
  approvers?: { id: number; name: string }[];
}

interface ApprovalEntryRowProps {
  entry: DetailEntry;
  projectName: string;
  taskName: string;
  currentUserId: number;
  activeRole: string;
  selectMode: boolean;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onApproved: () => void;
  onReject: () => void;
}

function formatEntryDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function formatAuditTime(ts: string): string {
  return new Date(ts).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ACTION_LABELS: Record<string, string> = {
  created: "Created",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  recalled: "Recalled",
  resubmitted: "Resubmitted",
  category_overridden: "Billing category overridden",
};

export function ApprovalEntryRow({
  entry,
  projectName,
  taskName,
  currentUserId,
  activeRole,
  selectMode,
  isSelected,
  onSelect,
  onApproved,
  onReject,
}: ApprovalEntryRowProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [isApproving, setIsApproving] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState<"Billable" | "Non-Billable">("Billable");
  const [isOverriding, setIsOverriding] = useState(false);
  const [currentBillable, setCurrentBillable] = useState(entry.billableCategory);
  const [isOverridden, setIsOverridden] = useState(false);

  const isSelf = entry.resourceId === currentUserId;
  const isAuthorizedApprover = activeRole === "account_admin" || activeRole === "super_user";
  const hours = Number(entry.durationHours);
  const isResubmitted = entry.resubmissionType === "Rejection_Correction";

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleApprove() {
    setIsApproving(true);
    try {
      const r = await fetch(`/api/time/entries/${entry.id}/approve`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (r.ok) {
        onApproved();
      } else {
        const err = await r.json();
        toast({ title: err.error?.message ?? "Approval failed.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Approval failed.", variant: "destructive" });
    }
    setIsApproving(false);
  }

  async function handleOverrideConfirm() {
    setIsOverriding(true);
    try {
      const r = await fetch(`/api/time/entries/${entry.id}/override-category`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ billableCategory: overrideTarget }),
      });
      if (r.ok) {
        setCurrentBillable(overrideTarget);
        setIsOverridden(true);
        setOverrideOpen(false);
        toast({ title: `Billing category overridden to ${overrideTarget}.` });
      } else {
        const err = await r.json();
        toast({ title: err.error?.message ?? "Override failed.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Override failed.", variant: "destructive" });
    }
    setIsOverriding(false);
  }

  const statusColor = {
    Submitted: "text-amber-600 bg-amber-50 border-amber-200",
    Approved: "text-green-700 bg-green-50 border-green-200",
    Rejected: "text-red-700 bg-red-50 border-red-200",
  }[entry.status] ?? "text-muted-foreground bg-muted";

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card overflow-hidden",
        entry.status === "Rejected" && "border-l-4 border-l-red-400",
        entry.status === "Approved" && "border-l-4 border-l-green-400",
        isSelf && "opacity-70",
      )}
    >
      {/* Self-approval warning */}
      {isSelf && (
        <div className="px-3 py-1.5 bg-muted/50 text-xs text-muted-foreground border-b border-border">
          Your own entry — cannot approve
        </div>
      )}

      {/* Main row */}
      <div className="flex items-start gap-3 p-3">
        {/* Checkbox in select mode */}
        {selectMode && entry.status === "Submitted" && !isSelf && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(v) => onSelect(Boolean(v))}
            className="mt-0.5"
          />
        )}

        {/* Resubmitted badge */}
        {isResubmitted && (
          <Badge className="shrink-0 text-xs h-5 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
            <RotateCcw className="h-2.5 w-2.5 mr-1" />
            Resubmitted
          </Badge>
        )}

        {/* Left content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {formatEntryDate(entry.entryDate)}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {projectName} — {taskName}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-sm font-semibold tabular-nums">{hours.toFixed(2)} hrs</span>

            {/* Billable badge with optional override */}
            <div className="flex items-center gap-1">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs h-5",
                  currentBillable === "Billable"
                    ? "border-primary/30 text-primary bg-primary/5"
                    : "border-muted-foreground/30 text-muted-foreground",
                )}
              >
                {currentBillable}
                {isOverridden && (
                  <span className="ml-1 text-muted-foreground">(Overridden)</span>
                )}
              </Badge>
              {isAuthorizedApprover && entry.status === "Submitted" && !isSelf && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setOverrideTarget(currentBillable === "Billable" ? "Non-Billable" : "Billable");
                        setOverrideOpen(true);
                      }}
                    >
                      ↔
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Override billing category</TooltipContent>
                </Tooltip>
              )}
            </div>

            {entry.isExceptional && (
              <Badge className="text-xs h-5 bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                Exceptional
              </Badge>
            )}
          </div>
        </div>

        {/* Right: action buttons or status */}
        <div className="shrink-0 flex items-center gap-2">
          {entry.status === "Submitted" ? (
            isSelf ? (
              <span className="text-xs text-muted-foreground italic">Cannot self-approve</span>
            ) : (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      className="h-7 gap-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={handleApprove}
                      disabled={isApproving}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Approve this entry</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 border-red-300 text-red-700 hover:bg-red-50"
                      onClick={onReject}
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reject with reason</TooltipContent>
                </Tooltip>
              </>
            )
          ) : (
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded border",
                statusColor,
              )}
            >
              {entry.status}
            </span>
          )}
        </div>
      </div>

      {/* Rejection reason */}
      {entry.status === "Rejected" && entry.rejectionReason && (
        <div className="px-3 pb-2 text-xs text-red-700 bg-red-50/50 border-t border-red-100">
          <span className="font-medium">Rejection reason:</span> {entry.rejectionReason}
        </div>
      )}

      {/* Expandable sections */}
      <div className="border-t border-border divide-y divide-border">
        {/* Work Description */}
        <button
          className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 text-left transition-colors"
          onClick={() => toggle("desc")}
        >
          {expanded.has("desc") ? (
            <ChevronDown className="h-3 w-3 shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0" />
          )}
          Work Description
        </button>
        {expanded.has("desc") && (
          <div className="px-6 py-2 text-xs text-muted-foreground bg-muted/10">
            {entry.narrative?.trim() ? (
              <p className="whitespace-pre-wrap">{entry.narrative}</p>
            ) : (
              <p className="italic">No description provided.</p>
            )}
          </div>
        )}

        {/* Exceptional section */}
        {entry.isExceptional && (
          <>
            <button
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 text-left transition-colors"
              onClick={() => toggle("exceptional")}
            >
              {expanded.has("exceptional") ? (
                <ChevronDown className="h-3 w-3 shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 shrink-0" />
              )}
              Exceptional Effort
            </button>
            {expanded.has("exceptional") && (
              <div className="px-6 py-2 text-xs bg-amber-50/50 dark:bg-amber-950/10 space-y-1">
                {entry.budgetHours != null && (
                  <div className="flex gap-4">
                    <span>Task budget: <span className="font-medium">{Number(entry.budgetHours).toFixed(1)} hrs</span></span>
                    <span>Logged: <span className="font-medium">{hours.toFixed(1)} hrs</span></span>
                    {hours > Number(entry.budgetHours) && (
                      <span className="text-amber-700">
                        Excess: <span className="font-medium">{(hours - Number(entry.budgetHours)).toFixed(1)} hrs</span>
                      </span>
                    )}
                  </div>
                )}
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Justification:</span>{" "}
                  {entry.exceptionalJustification ?? "No justification provided."}
                </p>
              </div>
            )}
          </>
        )}

        {/* Audit Trail */}
        <button
          className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 text-left transition-colors"
          onClick={() => toggle("audit")}
        >
          {expanded.has("audit") ? (
            <ChevronDown className="h-3 w-3 shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0" />
          )}
          Audit Trail ({entry.auditLog.length})
        </button>
        {expanded.has("audit") && (
          <div className="px-6 py-2 space-y-1 bg-muted/10">
            {entry.auditLog.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">No audit history.</p>
            ) : (
              entry.auditLog.map((log) => (
                <div key={log.id} className="flex gap-2 text-xs">
                  <span className="text-muted-foreground shrink-0">{formatAuditTime(log.performedAt)}</span>
                  <span className="font-medium">{ACTION_LABELS[log.action] ?? log.action}</span>
                  <span className="text-muted-foreground">by User #{log.performedById}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Billable override dialog */}
      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Override Billing Category</DialogTitle>
            <DialogDescription>
              Override billing category from{" "}
              <strong>{currentBillable}</strong> to{" "}
              <strong>{overrideTarget}</strong>? This action is audited.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideOpen(false)} disabled={isOverriding}>
              Cancel
            </Button>
            <Button onClick={handleOverrideConfirm} disabled={isOverriding}>
              {isOverriding ? "Saving…" : "Confirm Override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
