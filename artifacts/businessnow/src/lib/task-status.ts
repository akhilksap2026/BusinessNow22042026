import { useListTaskStatusDefinitions, type TaskStatusDefinition } from "@workspace/api-client-react";

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

/**
 * Section D — Configurable task statuses.
 *
 * Returns the ordered list of status labels from the backend
 * (`task_status_definitions` table). Falls back to the static
 * `TASK_STATUS_VALUES` while loading or on error so existing UI
 * never renders an empty dropdown.
 */
export function useTaskStatuses(): {
  statuses: string[];
  isLoading: boolean;
  raw: TaskStatusDefinition[] | undefined;
} {
  const q = useListTaskStatusDefinitions({
    query: {
      queryKey: ["task-status-definitions"],
      staleTime: 60_000,
    },
  });
  const data = q.data as TaskStatusDefinition[] | undefined;
  const fromApi = data?.map((s) => s.label).filter(Boolean);
  const statuses = fromApi && fromApi.length > 0 ? fromApi : (TASK_STATUS_VALUES as readonly string[]).slice();
  return { statuses, isLoading: q.isLoading, raw: data };
}
