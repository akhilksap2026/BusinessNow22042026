import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TimesheetRow, type GridRow, type AssignedProject, type AssignedTask, type LeaveType } from "./TimesheetRow";
import { TimesheetFooter } from "./TimesheetFooter";

const MAX_ROWS = 15;

interface TimesheetGridProps {
  rows: GridRow[];
  weekDates: string[];
  today: string;
  projects: AssignedProject[];
  tasksByProject: Record<number, AssignedTask[]>;
  leaveTypes: LeaveType[];
  activeCell: { rowKey: string; date: string } | null;
  isReadOnly: boolean;
  onCellChange: (rowKey: string, date: string, hours: number) => void;
  onCellFocus: (rowKey: string, date: string) => void;
  onProjectChange: (rowKey: string, projectId: number | null, isLeave: boolean) => void;
  onTaskChange: (rowKey: string, taskId: number | null, leaveTypeId: number | null, billableCategory: string, taskName: string, budgetHours: number | null) => void;
  onDeleteRow: (rowKey: string) => void;
  onAddRow: () => void;
  onFetchTasks: (projectId: number) => Promise<void>;
}

function dayAbbr(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    timeZone: "UTC",
  });
}

function dayNum(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    timeZone: "UTC",
  });
}

export function TimesheetGrid({
  rows,
  weekDates,
  today,
  projects,
  tasksByProject,
  leaveTypes,
  activeCell,
  isReadOnly,
  onCellChange,
  onCellFocus,
  onProjectChange,
  onTaskChange,
  onDeleteRow,
  onAddRow,
  onFetchTasks,
}: TimesheetGridProps) {
  const canAddRow = !isReadOnly && rows.length < MAX_ROWS;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
              Project
            </th>
            <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
              Task / Leave Type
            </th>
            {weekDates.map((date) => (
              <th
                key={date}
                className={cn(
                  "py-2 px-1 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-20",
                  date === today && "text-primary font-semibold",
                )}
              >
                <div>{dayAbbr(date)}</div>
                <div className={cn("text-base font-bold", date === today && "text-primary")}>
                  {dayNum(date)}
                </div>
              </th>
            ))}
            <th className="py-2 px-3 text-center text-xs font-medium text-muted-foreground w-16">
              Total
            </th>
            <th className="py-2 px-3 text-center text-xs font-medium text-muted-foreground w-24">
              Cat. / Budget
            </th>
            <th className="w-8" />
          </tr>
        </thead>

        <tbody>
          {rows.map((row, idx) => {
            const tasks = row.projectId ? (tasksByProject[row.projectId] ?? []) : [];
            return (
              <TimesheetRow
                key={row.rowKey}
                row={row}
                rowIndex={idx}
                weekDates={weekDates}
                today={today}
                projects={projects}
                tasks={tasks}
                leaveTypes={leaveTypes}
                existingRows={rows}
                activeDate={activeCell?.rowKey === row.rowKey ? activeCell.date : null}
                isReadOnly={isReadOnly}
                onCellChange={(date, hours) => onCellChange(row.rowKey, date, hours)}
                onCellFocus={(date) => onCellFocus(row.rowKey, date)}
                onProjectChange={(pid, isLeave) => {
                  onProjectChange(row.rowKey, pid, isLeave);
                  if (pid && !isLeave) {
                    onFetchTasks(pid);
                  }
                }}
                onTaskChange={(taskId, leaveTypeId, billCat, taskName, budgetHours) =>
                  onTaskChange(row.rowKey, taskId, leaveTypeId, billCat, taskName, budgetHours)
                }
                onDelete={() => onDeleteRow(row.rowKey)}
              />
            );
          })}

          {/* Add row */}
          {!isReadOnly && (
            <tr>
              <td colSpan={10 + weekDates.length} className="py-2 px-3">
                {canAddRow ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-muted-foreground hover:text-foreground gap-1"
                    onClick={onAddRow}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Row
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">Maximum rows reached.</p>
                )}
              </td>
            </tr>
          )}

          <TimesheetFooter weekDates={weekDates} rows={rows} />
        </tbody>
      </table>
    </div>
  );
}
