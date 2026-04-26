export const TASK_STATUS_VALUES = [
  "Not Started",
  "In Progress",
  "On Hold",
  "Completed",
  "Canceled",
] as const;

export type TaskStatus = (typeof TASK_STATUS_VALUES)[number];

const LEGACY_STATUS_MAP: Record<string, TaskStatus> = {
  "Blocked": "On Hold",
  "Todo": "Not Started",
  "Done": "Completed",
  "In Review": "In Progress",
  "Cancelled": "Canceled",
};

export function taskStatusLabel(raw: string | null | undefined): string {
  if (!raw) return "Not Started";
  return LEGACY_STATUS_MAP[raw] ?? raw;
}

export function normalizeTaskStatus(raw: string | null | undefined): TaskStatus {
  const v = taskStatusLabel(raw);
  return (TASK_STATUS_VALUES as readonly string[]).includes(v) ? (v as TaskStatus) : "Not Started";
}

export const TASK_STATUS_CYCLE: TaskStatus[] = [
  "Not Started",
  "In Progress",
  "Completed",
  "On Hold",
];
