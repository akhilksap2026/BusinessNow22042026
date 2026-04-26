import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

/**
 * Unified status badge component.
 *
 * Color/variant mapping (direct status-string lookup via StatusBadge):
 *
 * Project status    → Not Started (slate) | In Progress (blue) | At Risk (amber) | Completed (green) | On Hold (slate)
 * Project health    → On Track (green) | At Risk (amber) | Off Track (red)
 * Account status    → Active (green) | Inactive (slate) | Prospect (blue) | At Risk (amber) | Churned (red)
 * Invoice status    → Draft (slate) | In Review (amber) | Approved (blue) | Paid (green) | Overdue (red) | Void (slate) | Sent (blue)
 * Allocation status → Pending (amber) | Approved (blue) | Blocked (red) | Rejected (red) | Fulfilled (green) | Cancelled (slate) | Confirmed (green) | Tentative (amber) | Requested (blue)
 * Timesheet status  → Not Submitted (slate) | Submitted (amber) | Approved (green) | Rejected (red)
 * Schedule status   → Active (green) | Fired (green)
 * Opportunity stage → Prospecting (slate) | Qualification (blue) | Proposal (blue) | Negotiation (amber) | Closed Won (green) | Closed Lost (red)
 */

export type StatusVariant = "success" | "warning" | "danger" | "neutral" | "info" | "default";

export const VARIANT_CLASSES: Record<StatusVariant, string> = {
  success: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900/50",
  warning: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50",
  danger:  "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50",
  info:    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50",
  neutral: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/60 dark:text-gray-300 dark:border-gray-700",
  default: "bg-primary/10 text-primary border-primary/20",
};

export const PROJECT_STATUS_VARIANT: Record<string, StatusVariant> = {
  "Not Started": "neutral",
  "In Progress": "info",
  "At Risk":     "warning",
  "Completed":   "success",
  "On Hold":     "neutral",
};

export const HEALTH_VARIANT: Record<string, StatusVariant> = {
  "On Track":  "success",
  "At Risk":   "warning",
  "Off Track": "danger",
};

export const INVOICE_STATUS_VARIANT: Record<string, StatusVariant> = {
  "Draft":   "neutral",
  "Sent":    "info",
  "Paid":    "success",
  "Overdue": "danger",
  "Void":    "neutral",
};

export const ALLOCATION_STATUS_VARIANT: Record<string, StatusVariant> = {
  "Confirmed": "success",
  "Tentative": "warning",
  "Requested": "info",
};

export const OPPORTUNITY_STAGE_VARIANT: Record<string, StatusVariant> = {
  "Prospecting":    "neutral",
  "Qualification":  "info",
  "Proposal":       "info",
  "Negotiation":    "warning",
  "Closed Won":     "success",
  "Closed Lost":    "danger",
};

const STATUS_CLASSES: Record<string, string> = {
  "Not Started":     "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  "In Progress":     "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  "At Risk":         "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  "Completed":       "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  "On Hold":         "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  "Canceled":        "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  "On Track":        "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  "Off Track":       "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  "Active":          "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  "Inactive":        "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  "Prospect":        "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  "Churned":         "bg-red-200 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800",
  "Draft":           "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  "In Review":       "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  "Paid":            "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  "Approved":        "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  "Overdue":         "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  "Void":            "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  "Sent":            "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  "Pending":         "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  "Blocked":         "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  "Rejected":        "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  "Fulfilled":       "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  "Cancelled":       "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  "Confirmed":       "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  "Tentative":       "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  "Requested":       "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  "Not Submitted":   "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  "Submitted":       "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  "Fired":           "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  "Urgent":          "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  "High":            "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  "Medium":          "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  "Low":             "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/60 dark:text-gray-300 dark:border-gray-700",
  "PTO":             "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  "Sick":            "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  "Prospecting":     "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  "Qualification":   "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  "Proposal":        "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  "Negotiation":     "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  "Closed Won":      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  "Closed Lost":     "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
};

const DEFAULT_CLASSES = "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

interface VariantBadgeProps {
  children: ReactNode;
  variant?: StatusVariant;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const classes = STATUS_CLASSES[status] ?? DEFAULT_CLASSES;
  return (
    <span
      className={cn(
        "whitespace-nowrap inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border",
        classes,
        className,
      )}
    >
      {status}
    </span>
  );
}

export function VariantBadge({ children, variant = "neutral", className }: VariantBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
