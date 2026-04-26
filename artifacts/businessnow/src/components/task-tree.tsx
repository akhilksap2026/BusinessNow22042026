import { useState, useCallback } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TreeNode<T> {
  id: number;
  data: T;
  children: TreeNode<T>[];
  depth: number;
  hasChildren: boolean;
  descendantCount: number;
}

export function buildTreeFromFlat<T extends { id: number; parentId?: number | null }>(
  items: T[],
  rootParentId: number | null = null,
  depth = 0,
  sortFn?: (a: T, b: T) => number,
): TreeNode<T>[] {
  const filtered = items.filter((i) => (i.parentId ?? null) === rootParentId);
  const sorted = sortFn ? [...filtered].sort(sortFn) : filtered;
  return sorted.map((item) => {
    const children = buildTreeFromFlat(items, item.id, depth + 1, sortFn);
    const descendantCount = children.reduce((s, c) => s + 1 + c.descendantCount, 0);
    return {
      id: item.id,
      data: item,
      children,
      depth,
      hasChildren: children.length > 0,
      descendantCount,
    };
  });
}

export function flattenVisibleNodes<T>(
  nodes: TreeNode<T>[],
  expandedIds: Set<number>,
): TreeNode<T>[] {
  const out: TreeNode<T>[] = [];
  for (const n of nodes) {
    out.push(n);
    if (expandedIds.has(n.id))
      out.push(...flattenVisibleNodes(n.children, expandedIds));
  }
  return out;
}

export function collectAllNodeIds<T>(nodes: TreeNode<T>[]): number[] {
  return nodes.flatMap((n) => [n.id, ...collectAllNodeIds(n.children)]);
}

export function useExpandedIds(
  initial: Set<number> | (() => Set<number>) = () => new Set<number>(),
) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(initial);
  const toggle = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const expand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);
  const collapse = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);
  return { expandedIds, setExpandedIds, toggle, expand, collapse };
}

/**
 * Standardised expand / collapse toggle used across the project task list,
 * timesheet grid, and template editor. Renders a 24×24 hit area with chevron
 * icon when the node has children; renders an invisible spacer of the same
 * width otherwise so indentation stays aligned.
 *
 * Keyboard accessible (Enter / Space) and announces state via aria-expanded.
 */
export function TreeToggle({
  expanded,
  hasChildren,
  onToggle,
  label,
  size = "md",
}: {
  expanded: boolean;
  hasChildren: boolean;
  onToggle: () => void;
  label?: string;
  size?: "sm" | "md";
}) {
  const iconCls = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  const btnCls = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  if (!hasChildren) {
    return <span className={cn("inline-block shrink-0", btnCls)} aria-hidden="true" />;
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }
      }}
      aria-label={`${expanded ? "Collapse" : "Expand"} ${label ?? "node"}`}
      aria-expanded={expanded}
      className={cn(
        "inline-flex items-center justify-center rounded p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer",
        btnCls,
      )}
    >
      {expanded ? <ChevronDown className={iconCls} /> : <ChevronRight className={iconCls} />}
    </button>
  );
}
