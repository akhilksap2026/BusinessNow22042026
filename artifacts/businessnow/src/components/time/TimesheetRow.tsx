import { useState, useEffect, useCallback } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ─── Shared types (exported for reuse in Grid and Page) ───────────────────────

export interface AssignedProject {
  id: number;
  name: string;
  contractRules?: {
    contractType?: string;
    incrementMinutes?: number | null;
    maxBillableHours?: string | null;
  } | null;
  approvers?: { id: number; name: string }[];
}

export interface AssignedTask {
  id: number;
  name: string;
  budgetHours?: number | null;
  defaultBillableCategory?: string;
}

export interface LeaveType {
  id: number;
  code: string;
  name: string;
}

export interface GridRow {
  rowKey: string;
  projectId: number | null;
  projectName: string;
  taskId: number | null;
  taskName: string;
  leaveTypeId: number | null;
  isLeave: boolean;
  billableCategory: "Billable" | "Non-Billable";
  hours: Record<string, number>;
  entryIds: Record<string, number>;
  statuses: Record<string, string>;
  narratives: Record<string, string>;
  isExceptional: boolean;
  exceptionalJustification: string;
  budgetHours: number | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TimesheetRowProps {
  row: GridRow;
  rowIndex: number;
  weekDates: string[];
  today: string;
  projects: AssignedProject[];
  tasks: AssignedTask[];
  leaveTypes: LeaveType[];
  existingRows: GridRow[];
  activeDate: string | null;
  isReadOnly: boolean;
  onCellChange: (date: string, hours: number, narrative?: string) => void;
  onCellFocus: (date: string) => void;
  onProjectChange: (projectId: number | null, isLeave: boolean) => void;
  onTaskChange: (taskId: number | null, leaveTypeId: number | null, billableCategory: string, taskName: string, budgetHours: number | null) => void;
  onDelete: () => void;
}

export function TimesheetRow({
  row,
  weekDates,
  today,
  projects,
  tasks,
  leaveTypes,
  existingRows,
  activeDate,
  isReadOnly,
  onCellChange,
  onCellFocus,
  onProjectChange,
  onTaskChange,
  onDelete,
}: TimesheetRowProps) {
  const [cellInputs, setCellInputs] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const d of weekDates) {
      const h = row.hours[d];
      init[d] = h && h > 0 ? String(h) : "";
    }
    return init;
  });

  const [cellErrors, setCellErrors] = useState<Record<string, string>>({});
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  useEffect(() => {
    const updated: Record<string, string> = {};
    for (const d of weekDates) {
      const h = row.hours[d];
      updated[d] = h && h > 0 ? String(h) : "";
    }
    setCellInputs(updated);
  }, [row.rowKey, weekDates]);

  const rowTotal = weekDates.reduce((sum, d) => sum + (row.hours[d] ?? 0), 0);
  const isRejected = weekDates.some((d) => row.statuses[d] === "Rejected");
  const isSubmitted = weekDates.every(
    (d) => !row.hours[d] || row.statuses[d] === "Submitted" || row.statuses[d] === "Approved",
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const nav = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"];
    if (nav.includes(e.key)) return;
    if (/^\d$/.test(e.key)) return;
    if (e.key === "." && !e.currentTarget.value.includes(".")) return;
    e.preventDefault();
  }, []);

  const handleCellChange = useCallback(
    (date: string, raw: string) => {
      setCellInputs((prev) => ({ ...prev, [date]: raw }));
    },
    [],
  );

  const handleCellBlur = useCallback(
    (date: string) => {
      const raw = cellInputs[date] ?? "";
      const parsed = parseFloat(raw);
      const hours = isNaN(parsed) || parsed < 0 ? 0 : Math.min(parsed, 24);

      const displayVal = hours === 0 ? "" : String(hours);
      setCellInputs((prev) => ({ ...prev, [date]: displayVal }));

      const project = row.projectId ? projects.find((p) => p.id === row.projectId) : null;
      const contractRules = project?.contractRules;

      if (raw !== "" && isNaN(parsed)) {
        setCellErrors((prev) => ({ ...prev, [date]: "Invalid number" }));
        onCellChange(date, 0);
        return;
      }

      // B2: increment validation
      const incMins = contractRules?.incrementMinutes;
      if (incMins && hours > 0) {
        const incHrs = incMins / 60;
        const remainder = Math.round((hours % incHrs) * 10000) / 10000;
        if (remainder > 0.0001 && remainder < incHrs - 0.0001) {
          const lower = Math.floor(hours / incHrs) * incHrs;
          const upper = lower + incHrs;
          setCellErrors((prev) => ({
            ...prev,
            [date]: `Did you mean ${lower.toFixed(2)} or ${upper.toFixed(2)}? (${incMins}-min increments)`,
          }));
          onCellChange(date, hours);
          return;
        }
      }

      // B5: fixed-bid billable cap
      const maxBill = contractRules?.maxBillableHours ? Number(contractRules.maxBillableHours) : null;
      if (maxBill !== null && row.billableCategory === "Billable") {
        const otherDayHours = Object.entries(row.hours)
          .filter(([d]) => d !== date)
          .reduce((s, [, h]) => s + h, 0);
        const projectedTotal = otherDayHours + hours;
        if (projectedTotal > maxBill) {
          setCellErrors((prev) => ({
            ...prev,
            [date]: `Exceeds fixed-bid billable cap of ${maxBill} hrs (${projectedTotal.toFixed(2)} total)`,
          }));
          onCellChange(date, hours);
          return;
        }
      }

      setCellErrors((prev) => {
        const next = { ...prev };
        delete next[date];
        return next;
      });

      onCellChange(date, hours);
    },
    [cellInputs, onCellChange, row, projects],
  );

  const projectValue = row.isLeave ? "__LEAVE__" : row.projectId ? String(row.projectId) : "";

  const handleProjectChange = useCallback(
    (val: string) => {
      setDuplicateError(null);
      if (val === "__LEAVE__") {
        onProjectChange(null, true);
      } else {
        onProjectChange(Number(val), false);
      }
    },
    [onProjectChange],
  );

  const handleTaskChange = useCallback(
    (val: string) => {
      if (row.isLeave) {
        const lt = leaveTypes.find((t) => String(t.id) === val);
        if (lt) {
          const isDup = existingRows.some(
            (r) => r.rowKey !== row.rowKey && r.isLeave && r.leaveTypeId === lt.id,
          );
          if (isDup) {
            setDuplicateError("This leave type already exists. Add hours to the existing row.");
            return;
          }
          setDuplicateError(null);
          onTaskChange(null, lt.id, "Non-Billable", lt.name, null);
        }
      } else {
        const t = tasks.find((t) => String(t.id) === val);
        if (t) {
          const isDup = existingRows.some(
            (r) => r.rowKey !== row.rowKey && r.projectId === row.projectId && r.taskId === t.id,
          );
          if (isDup) {
            setDuplicateError("This project + task combination already exists. Add hours to the existing row.");
            return;
          }
          setDuplicateError(null);
          onTaskChange(
            t.id,
            null,
            t.defaultBillableCategory ?? "Billable",
            t.name,
            t.budgetHours ?? null,
          );
        }
      }
    },
    [row, tasks, leaveTypes, existingRows, onTaskChange],
  );

  const taskValue = row.isLeave
    ? row.leaveTypeId ? String(row.leaveTypeId) : ""
    : row.taskId ? String(row.taskId) : "";

  const taskOptions = row.isLeave
    ? leaveTypes.map((lt) => ({ id: lt.id, label: lt.name, sub: lt.code }))
    : tasks.map((t) => ({
        id: t.id,
        label: t.name,
        sub: t.budgetHours ? `Budget: ${t.budgetHours} hrs` : undefined,
      }));

  const billableVariant =
    row.billableCategory === "Billable"
      ? "default"
      : row.isLeave
      ? "secondary"
      : "outline";

  return (
    <tr
      className={cn(
        "group border-b border-border hover:bg-muted/30 transition-colors",
        isRejected && "border-l-2 border-l-red-400",
        row.isExceptional && !isRejected && "border-l-2 border-l-amber-400",
      )}
    >
      {/* Project dropdown */}
      <td className="py-1 px-2 min-w-[160px]">
        {isReadOnly ? (
          <span className="text-sm truncate block max-w-[160px]">
            {row.isLeave ? "📅 Leave" : row.projectName}
            {isRejected && (
              <Badge variant="destructive" className="ml-1 text-xs py-0">
                Rejected
              </Badge>
            )}
          </span>
        ) : (
          <Select value={projectValue} onValueChange={handleProjectChange}>
            <SelectTrigger className="h-8 text-xs w-full">
              <SelectValue placeholder="Select project…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__LEAVE__">
                📅 Leave
              </SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                  {p.contractRules?.contractType === "Fixed_Bid" ? " (Fixed-Bid)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </td>

      {/* Task / Leave type dropdown */}
      <td className="py-1 px-2 min-w-[160px]">
        {isReadOnly ? (
          <span className="text-sm truncate block max-w-[160px]">{row.taskName}</span>
        ) : (
          <div>
            <Select
              value={taskValue}
              onValueChange={handleTaskChange}
              disabled={!row.projectId && !row.isLeave}
            >
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Select task…" />
              </SelectTrigger>
              <SelectContent>
                {taskOptions.map((opt) => (
                  <SelectItem key={opt.id} value={String(opt.id)}>
                    {opt.label}{opt.sub ? ` — ${opt.sub}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {duplicateError && (
              <p className="mt-0.5 text-xs text-red-600">{duplicateError}</p>
            )}
          </div>
        )}
      </td>

      {/* Day cells */}
      {weekDates.map((date) => {
        const isToday = date === today;
        const status = row.statuses[date];
        const hasDesc = (row.narratives[date] ?? "").trim().length > 0;
        const isActive = activeDate === date;
        const cellLocked = isReadOnly || (status && status !== "Draft" && status !== "Rejected");

        return (
          <td
            key={date}
            className={cn(
              "py-1 px-1 text-center relative",
              isToday && "bg-primary/5",
              isActive && "ring-1 ring-inset ring-primary/40 rounded",
            )}
          >
            <div className="relative inline-block w-full">
              {cellLocked ? (
                <span className="text-sm tabular-nums text-muted-foreground">
                  {row.hours[date] ? row.hours[date].toFixed(2) : "—"}
                </span>
              ) : (
                <>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={cellInputs[date] ?? ""}
                    onChange={(e) => handleCellChange(date, e.target.value)}
                    onBlur={() => handleCellBlur(date)}
                    onFocus={() => onCellFocus(date)}
                    onKeyDown={handleKeyDown}
                    placeholder="—"
                    className={cn(
                      "w-16 h-8 rounded border border-input bg-background px-1.5 text-center text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-primary transition-colors",
                      cellErrors[date] && "border-red-400",
                      !row.projectId && !row.isLeave && "opacity-40 pointer-events-none",
                    )}
                  />
                  {hasDesc && (
                    <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-blue-500 pointer-events-none" />
                  )}
                </>
              )}
            </div>
            {cellErrors[date] && (
              <p className="text-xs text-red-500 mt-0.5">{cellErrors[date]}</p>
            )}
          </td>
        );
      })}

      {/* Row total */}
      <td className="py-1 px-3 text-center text-sm font-medium tabular-nums">
        {row.budgetHours != null && rowTotal > row.budgetHours ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                {rowTotal.toFixed(2)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Exceeds task allocation of {row.budgetHours} hrs
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className={rowTotal === 0 ? "text-muted-foreground" : undefined}>
            {rowTotal > 0 ? rowTotal.toFixed(2) : "0.00"}
          </span>
        )}
      </td>

      {/* Billable badge */}
      <td className="py-1 px-2 text-center">
        <Badge variant={billableVariant as any} className="text-xs py-0 px-1.5">
          {row.isLeave ? "Leave" : row.billableCategory === "Billable" ? "Bill." : "Non-Bill."}
        </Badge>
      </td>

      {/* Delete */}
      <td className="py-1 px-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
        {!isReadOnly && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-red-600"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove row</TooltipContent>
          </Tooltip>
        )}
      </td>
    </tr>
  );
}
