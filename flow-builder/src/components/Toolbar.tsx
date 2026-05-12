import { useRef } from "react";
import {
  Plus,
  Undo2,
  Redo2,
  LayoutGrid,
  Download,
  Upload,
  Image as ImageIcon,
  FileCode,
  Moon,
  Sun,
  Trash2,
  Magnet,
  Zap,
  RotateCw,
} from "lucide-react";
import { useFlowStore } from "@/store/flow-store";
import { exportJson, exportPng, exportSvg, parseImportedJson } from "@/lib/export";

function ToolButton({
  onClick,
  title,
  disabled,
  active,
  children,
}: {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={[
        "h-8 w-8 grid place-items-center rounded-md transition-colors",
        active
          ? "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200"
          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
        disabled ? "opacity-40 cursor-not-allowed hover:bg-transparent" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />;
}

export function Toolbar() {
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    addNode,
    undo,
    redo,
    canUndo,
    canRedo,
    layoutAll,
    nodes,
    edges,
    importGraph,
    reset,
    theme,
    toggleTheme,
    snapToGrid,
    toggleSnap,
    animatedEdges,
    toggleAnimated,
  } = useFlowStore();

  function onImportClick() {
    fileRef.current?.click();
  }

  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseImportedJson(text);
      importGraph(parsed);
    } catch (err: any) {
      alert(`Import failed: ${err.message ?? err}`);
    }
  }

  return (
    <div className="absolute z-20 top-3 left-1/2 -translate-x-1/2">
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-white dark:bg-[#111733] border border-slate-200 dark:border-slate-700 rounded-xl shadow-node">
        <ToolButton onClick={() => addNode()} title="Add node (N)">
          <Plus className="h-4 w-4" />
        </ToolButton>

        <Divider />

        <ToolButton onClick={undo} title="Undo (⌘Z)" disabled={!canUndo()}>
          <Undo2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={redo} title="Redo (⌘⇧Z)" disabled={!canRedo()}>
          <Redo2 className="h-4 w-4" />
        </ToolButton>

        <Divider />

        <ToolButton onClick={() => layoutAll("TB")} title="Auto-layout (vertical)">
          <LayoutGrid className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={toggleSnap} title="Snap to grid" active={snapToGrid}>
          <Magnet className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={toggleAnimated} title="Animate edges" active={animatedEdges}>
          <Zap className="h-4 w-4" />
        </ToolButton>

        <Divider />

        <ToolButton onClick={() => exportJson(nodes, edges)} title="Export JSON">
          <FileCode className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => exportPng()} title="Export PNG">
          <ImageIcon className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => exportSvg()} title="Export SVG">
          <Download className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={onImportClick} title="Import JSON">
          <Upload className="h-4 w-4" />
        </ToolButton>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={onFileChosen}
        />

        <Divider />

        <ToolButton
          onClick={() => {
            if (confirm("Reset to sample flow? Local changes will be cleared.")) reset();
          }}
          title="Reset to sample"
        >
          <RotateCw className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          onClick={() => {
            if (confirm("Delete all nodes and edges?")) {
              importGraph({ nodes: [], edges: [] });
            }
          }}
          title="Clear all"
        >
          <Trash2 className="h-4 w-4" />
        </ToolButton>

        <Divider />

        <ToolButton onClick={toggleTheme} title="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </ToolButton>
      </div>
    </div>
  );
}
