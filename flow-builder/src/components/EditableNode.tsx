import { memo, useEffect, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Pencil, Trash2 } from "lucide-react";
import { useFlowStore, type NodeData } from "@/store/flow-store";

function EditableNodeImpl({ id, data, selected }: NodeProps) {
  const updateNode = useFlowStore((s) => s.updateNode);
  const deleteNode = useFlowStore((s) => s.deleteNode);
  const search = useFlowStore((s) => s.searchQuery);

  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState((data as NodeData).label);
  const [draftSubtitle, setDraftSubtitle] = useState((data as NodeData).subtitle ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    setDraftLabel((data as NodeData).label);
    setDraftSubtitle((data as NodeData).subtitle ?? "");
  }, [data]);

  function commit() {
    setEditing(false);
    if (
      draftLabel !== (data as NodeData).label ||
      draftSubtitle !== ((data as NodeData).subtitle ?? "")
    ) {
      updateNode(id, { label: draftLabel.trim() || "Untitled", subtitle: draftSubtitle.trim() });
    }
  }

  const matched =
    search.length > 0 &&
    ((data as NodeData).label.toLowerCase().includes(search.toLowerCase()) ||
      ((data as NodeData).subtitle ?? "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div
      className={[
        "group relative min-w-[180px] max-w-[280px] rounded-xl bg-white dark:bg-[#111733]",
        "border transition-all",
        selected
          ? "border-brand-500 shadow-nodeHover"
          : "border-brand-200/70 dark:border-brand-700/40 shadow-node hover:shadow-nodeHover",
        matched ? "ring-2 ring-amber-400/70" : "",
      ].join(" ")}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      <Handle type="target" position={Position.Top} />

      <div className="flex items-start gap-2 px-3 pt-2.5 pb-1">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") {
                  setEditing(false);
                  setDraftLabel((data as NodeData).label);
                }
              }}
              className="w-full text-sm font-semibold bg-transparent outline-none border-b border-brand-300 text-slate-900 dark:text-slate-100"
            />
          ) : (
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {(data as NodeData).label}
            </div>
          )}
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <button
            type="button"
            title="Edit"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            className="p-1 rounded hover:bg-brand-50 dark:hover:bg-brand-900/40 text-slate-500 hover:text-brand-600"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              deleteNode(id);
            }}
            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/40 text-slate-500 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="px-3 pb-2.5">
        {editing ? (
          <input
            value={draftSubtitle}
            onChange={(e) => setDraftSubtitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setEditing(false);
                setDraftSubtitle((data as NodeData).subtitle ?? "");
              }
            }}
            onBlur={commit}
            placeholder="Subtitle / metadata"
            className="w-full text-xs bg-transparent outline-none border-b border-brand-200 text-slate-500 dark:text-slate-400 placeholder:text-slate-300"
          />
        ) : (
          (data as NodeData).subtitle && (
            <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
              {(data as NodeData).subtitle}
            </div>
          )
        )}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export const EditableNode = memo(EditableNodeImpl);
