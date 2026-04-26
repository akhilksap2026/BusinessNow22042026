import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

export interface UndoableMutationOptions {
  /** The forward action. Throw to signal failure. */
  do: () => Promise<unknown> | unknown;
  /** The inverse action that restores previous state. Throw to signal failure. */
  undo: () => Promise<unknown> | unknown;
  /** Toast title on successful forward action. */
  successTitle: string;
  /** Optional toast description (e.g. the affected entity's name). */
  description?: string;
  /** Toast title on forward-action failure. Defaults to "Action failed". */
  errorTitle?: string;
  /** Toast title shown after a successful undo. Defaults to "Reverted". */
  undoSuccessTitle?: string;
  /** Toast title shown when undo itself fails. Defaults to "Could not undo". */
  undoErrorTitle?: string;
  /** Label for the action button. Defaults to "Undo". */
  actionLabel?: string;
  /** How long the success toast (with the Undo button) stays visible. */
  duration?: number;
}

export interface UseUndoableMutationResult {
  run: (opts: UndoableMutationOptions) => Promise<boolean>;
}

/**
 * Generic helper for "do something, but offer an Undo for a few seconds".
 *
 * Pattern:
 *   const { run } = useUndoableMutation();
 *   await run({
 *     do: () => deleteTask.mutateAsync({ id }),
 *     undo: () => createTask.mutateAsync({ data: snapshot }),
 *     successTitle: "Task deleted",
 *     description: task.name,
 *   });
 *
 * The forward action runs immediately. On success, a toast appears with an
 * "Undo" button that fires the inverse action when clicked. On failure of
 * either step, a destructive toast is shown.
 *
 * Returns `true` if the forward action succeeded (regardless of whether the
 * user later clicks Undo), `false` if it threw.
 */
export function useUndoableMutation(): UseUndoableMutationResult {
  const { toast } = useToast();

  const run = useCallback(
    async (opts: UndoableMutationOptions): Promise<boolean> => {
      const {
        do: doFn,
        undo: undoFn,
        successTitle,
        description,
        errorTitle = "Action failed",
        undoSuccessTitle = "Reverted",
        undoErrorTitle = "Could not undo",
        actionLabel = "Undo",
        duration = 5000,
      } = opts;

      try {
        await doFn();
      } catch {
        toast({ title: errorTitle, variant: "destructive" });
        return false;
      }

      let undone = false;
      const handleUndo = async () => {
        if (undone) return;
        undone = true;
        try {
          await undoFn();
          toast({ title: undoSuccessTitle, duration: 3000 });
        } catch {
          toast({ title: undoErrorTitle, variant: "destructive" });
        }
      };

      toast({
        title: successTitle,
        description,
        duration,
        action: (
          <ToastAction altText={actionLabel} onClick={handleUndo}>
            {actionLabel}
          </ToastAction>
        ),
      });

      return true;
    },
    [toast],
  );

  return { run };
}
