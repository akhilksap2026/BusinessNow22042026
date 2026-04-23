import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

export type StatusVariant = "success" | "warning" | "danger" | "neutral" | "info" | "default";

const VARIANT_CLASSES: Record<StatusVariant, string> = {
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

interface StatusBadgeProps {
  children: ReactNode;
  variant?: StatusVariant;
  className?: string;
}

export function StatusBadge({ children, variant = "neutral", className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
