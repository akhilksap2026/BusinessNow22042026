import { eq, inArray } from "drizzle-orm";
import { db, timeSettingsTable, timesheetsTable, timeEntriesTable, invoiceLineItemsTable, invoicesTable } from "@workspace/db";
import { resolveRole } from "../constants/roles";

export type GovernanceSettings = {
  globalLockEnabled: boolean;
  lockBeforeDate: string | null;
  lockOnApprovalEnabled: boolean;
  statusLockEnabled: boolean;
  dateLockEditOverrideRoles: string;
  dateLockStatusOverrideRoles: string;
};

export async function getGovernanceSettings(): Promise<GovernanceSettings> {
  const [row] = await db.select().from(timeSettingsTable).limit(1);
  if (!row) {
    return {
      globalLockEnabled: false,
      lockBeforeDate: null,
      lockOnApprovalEnabled: false,
      statusLockEnabled: false,
      dateLockEditOverrideRoles: "",
      dateLockStatusOverrideRoles: "",
    };
  }
  return {
    globalLockEnabled: !!row.globalLockEnabled,
    lockBeforeDate: row.lockBeforeDate ?? null,
    lockOnApprovalEnabled: !!(row as any).lockOnApprovalEnabled,
    statusLockEnabled: !!(row as any).statusLockEnabled,
    dateLockEditOverrideRoles: (row as any).dateLockEditOverrideRoles ?? "",
    dateLockStatusOverrideRoles: (row as any).dateLockStatusOverrideRoles ?? "",
  };
}

function rolesFromCsv(csv: string): string[] {
  return csv.split(",").map(r => resolveRole(r.trim())).filter(Boolean);
}

export function isAdminRole(role: string): boolean {
  return resolveRole(role) === "account_admin";
}

function isDateOnOrBefore(entryDate: string, lockDate: string | null): boolean {
  if (!lockDate) return false;
  return entryDate <= lockDate;
}

export type GovernanceError = { status: number; error: string };

/**
 * Can a non-admin EDIT details (hours/description/date/project) of this entry?
 * Returns null if allowed, or GovernanceError if blocked.
 */
export function checkEntryEditable(
  entry: { date: string },
  role: string,
  s: GovernanceSettings,
): GovernanceError | null {
  if (isAdminRole(role)) return null;
  if (!isDateOnOrBefore(entry.date, s.lockBeforeDate)) return null;
  const allowedRoles = rolesFromCsv(s.dateLockEditOverrideRoles);
  if (allowedRoles.includes(resolveRole(role))) return null;
  return {
    status: 423,
    error: `This time entry is in a locked period (on or before ${s.lockBeforeDate}). Only Admins or roles with "Edit date-locked entries" permission can modify it.`,
  };
}

/**
 * Can a non-admin CHANGE STATUS (submit/approve/reject/withdraw/unapprove) of this entry?
 * If statusLockEnabled is ON for date-locked periods, the override is automatically
 * disabled for non-admins (only Admin can override).
 */
export function checkEntryStatusChangeable(
  entry: { date: string },
  role: string,
  s: GovernanceSettings,
): GovernanceError | null {
  if (isAdminRole(role)) return null;
  if (!isDateOnOrBefore(entry.date, s.lockBeforeDate)) return null;
  // Status Lock disables override for non-admins
  if (s.statusLockEnabled) {
    return {
      status: 423,
      error: `Status changes are locked for entries on or before ${s.lockBeforeDate}. Status Lock is enabled — only Admins can change status.`,
    };
  }
  const allowedRoles = rolesFromCsv(s.dateLockStatusOverrideRoles);
  if (allowedRoles.includes(resolveRole(role))) return null;
  return {
    status: 423,
    error: `Cannot change status for entries on or before ${s.lockBeforeDate}. Only Admins or roles with "Change status of date-locked entries" permission can.`,
  };
}

/**
 * Lock-on-Approval: when enabled, non-admins cannot withdraw/edit/resubmit an Approved timesheet.
 */
export function checkTimesheetEditable(
  ts: { status: string },
  role: string,
  s: GovernanceSettings,
): GovernanceError | null {
  if (isAdminRole(role)) return null;
  if (s.lockOnApprovalEnabled && ts.status === "Approved") {
    return {
      status: 423,
      error: "This timesheet is approved and locked. Contact an Admin to make changes.",
    };
  }
  return null;
}

/**
 * Returns the active (non-void/deleted) invoice line item linked to this entry, if any.
 */
export async function getInvoicedLink(entryId: number): Promise<{ invoiceId: string; invoiceStatus: string } | null> {
  const lines = await db.select().from(invoiceLineItemsTable).where(eq(invoiceLineItemsTable.timeEntryId, entryId));
  if (lines.length === 0) return null;
  const invIds = Array.from(new Set(lines.map(l => l.invoiceId)));
  const invs = await db.select().from(invoicesTable).where(inArray(invoicesTable.id, invIds));
  // Treat any non-Void invoice as locking the entry
  const live = invs.find(i => String(i.status).toLowerCase() !== "void" && String(i.status).toLowerCase() !== "voided" && String(i.status).toLowerCase() !== "deleted");
  if (!live) return null;
  return { invoiceId: live.id, invoiceStatus: live.status };
}

/**
 * If an entry is invoiced, block re-assigning it to another project.
 * Returns error only if newProjectId differs from current.
 */
export async function checkInvoicedMove(
  entry: { id: number; projectId: number | null },
  newProjectId: number | null | undefined,
): Promise<GovernanceError | null> {
  if (newProjectId === undefined) return null;
  if (newProjectId === entry.projectId) return null;
  const link = await getInvoicedLink(entry.id);
  if (link) {
    return {
      status: 409,
      error: `Cannot move this time entry: it is on invoice ${link.invoiceId} (${link.invoiceStatus}). Void or delete the invoice first.`,
    };
  }
  return null;
}

/**
 * Status-lock check at the timesheet level: if the entire week covered by the
 * timesheet falls on or before lockBeforeDate, non-admins cannot change status
 * (submit/approve/reject/withdraw/unapprove). The "Change status of date-locked
 * entries" override is honored unless statusLockEnabled is ON (then only Admins).
 */
export function checkTimesheetStatusChangeable(
  ts: { weekStart: string },
  role: string,
  s: GovernanceSettings,
): GovernanceError | null {
  if (isAdminRole(role)) return null;
  if (!s.lockBeforeDate) return null;
  // Compute weekEnd = weekStart + 6 days (ISO YYYY-MM-DD).
  const start = new Date(ts.weekStart + "T00:00:00Z");
  if (isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  const endStr = end.toISOString().slice(0, 10);
  if (endStr > s.lockBeforeDate) return null;
  if (s.statusLockEnabled) {
    return {
      status: 423,
      error: `Status changes are locked for the week of ${ts.weekStart}. Status Lock is enabled — only Admins can change status.`,
    };
  }
  const allowedRoles = rolesFromCsv(s.dateLockStatusOverrideRoles);
  if (allowedRoles.includes(resolveRole(role))) return null;
  return {
    status: 423,
    error: `Cannot change status for the week of ${ts.weekStart} (locked period). Only Admins or roles with "Change status of date-locked entries" permission can.`,
  };
}

/**
 * Resolve the parent timesheet for an entry (for lock-on-approval check).
 */
export async function getTimesheetForEntry(entry: { userId: number; date: string; timesheetId: number | null }): Promise<{ id: number; status: string } | null> {
  if (entry.timesheetId) {
    const [ts] = await db.select({ id: timesheetsTable.id, status: timesheetsTable.status })
      .from(timesheetsTable).where(eq(timesheetsTable.id, entry.timesheetId));
    return ts ?? null;
  }
  return null;
}
