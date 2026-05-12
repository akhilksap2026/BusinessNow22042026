import { useEffect, useRef } from "react";
import { useFlowStore } from "@/store/flow-store";

export interface ContextMenuState {
  x: number;
  y: number;
  flowX: number;
  flowY: number;
  nodeId?: string;
  edgeId?: string;
}

export function ContextMenu({
  state,
  onClose,
}: {
  state: ContextMenuState;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const addNode = useFlowStore((s) => s.addNode);
  const deleteNode = useFlowStore((s) => s.deleteNode);
  const deleteEdge = useFlowStore((s) => s.deleteEdge);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as any)) onClose();
    }
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [onClose]);

  const items: Array<{ label: string; onClick: () => void; danger?: boolean }> = [];

  if (state.nodeId) {
    items.push({
      label: "Delete node",
      onClick: () => {
        deleteNode(state.nodeId!);
        onClose();
      },
      danger: true,
    });
  } else if (state.edgeId) {
    items.push({
      label: "Delete edge",
      onClick: () => {
        deleteEdge(state.edgeId!);
        onClose();
      },
      danger: true,
    });
  } else {
    items.push({
      label: "Add node here",
      onClick: () => {
        addNode({ label: "New Node", position: { x: state.flowX, y: state.flowY } });
        onClose();
      },
    });
  }

  return (
    <div
      ref={ref}
      style={{ top: state.y, left: state.x }}
      className="fixed z-30 min-w-[160px] py-1 bg-white dark:bg-[#111733] border border-slate-200 dark:border-slate-700 rounded-lg shadow-nodeHover"
    >
      {items.map((it, i) => (
        <button
          key={i}
          type="button"
          onClick={it.onClick}
          className={[
            "w-full text-left px-3 py-1.5 text-sm",
            it.danger
              ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
              : "text-slate-700 dark:text-slate-200 hover:bg-brand-50 dark:hover:bg-brand-900/40",
          ].join(" ")}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
