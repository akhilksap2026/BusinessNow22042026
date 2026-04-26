import { useListTaskStatusDefinitions, type TaskStatusDefinition } from "@workspace/api-client-react";

export const TASK_STATUS_VALUES = [
  "Not Started",
  "Started",
  "On Hold",
  "Completed",
  "Canceled",
] as const;

export type TaskStatus = (typeof TASK_STATUS_VALUES)[number];

// C2 from product feedback (Sedore 4/24/26): default label switched from
// "In Progress" → "Started". Legacy DB rows that still hold "In Progress"
// (and other historical values) display through the canonical label.
const LEGACY_STATUS_MAP: Record<string, TaskStatus> = {
  "In Progress": "Started",
  "Blocked": "On Hold",
  "Todo": "Not Started",
  "Done": "Completed",
  "In Review": "Started",
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
  "Started",
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
  const fromApi = data
    ?.map((s) => taskStatusLabel(s.label))
    .filter((v): v is string => !!v);
  const deduped = fromApi ? Array.from(new Set(fromApi)) : undefined;
  const statuses = deduped && deduped.length > 0 ? deduped : (TASK_STATUS_VALUES as readonly string[]).slice();
  return { statuses, isLoading: q.isLoading, raw: data };
}
