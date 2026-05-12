import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type EdgeMouseHandler,
  type NodeMouseHandler,
  type OnSelectionChangeFunc,
} from "@xyflow/react";
import { useFlowStore } from "@/store/flow-store";
import { EditableNode } from "./EditableNode";
import { Toolbar } from "./Toolbar";
import { SearchPalette } from "./SearchPalette";
import { ContextMenu, type ContextMenuState } from "./ContextMenu";

const nodeTypes = { editable: EditableNode };

function CanvasInner() {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect = useFlowStore((s) => s.onConnect);
  const setSelectedNodes = useFlowStore((s) => s.setSelectedNodes);
  const setSelectedEdges = useFlowStore((s) => s.setSelectedEdges);
  const updateEdgeLabel = useFlowStore((s) => s.updateEdgeLabel);
  const snapToGrid = useFlowStore((s) => s.snapToGrid);
  const undo = useFlowStore((s) => s.undo);
  const redo = useFlowStore((s) => s.redo);
  const addNode = useFlowStore((s) => s.addNode);
  const setTheme = useFlowStore((s) => s.setTheme);
  const theme = useFlowStore((s) => s.theme);
  const loadFromStorage = useFlowStore((s) => s.loadFromStorage);

  const { screenToFlowPosition } = useReactFlow();
  const [menu, setMenu] = useState<ContextMenuState | null>(null);

  // Hydrate theme + storage on mount
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    loadFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (meta && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (e.key === "n" && !meta) {
        e.preventDefault();
        addNode();
      } else if (e.key === "d" && meta) {
        e.preventDefault();
        setTheme(theme === "dark" ? "light" : "dark");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, addNode, setTheme, theme]);

  const onSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: ns, edges: es }) => {
      setSelectedNodes(ns.map((n) => n.id));
      setSelectedEdges(es.map((e) => e.id));
    },
    [setSelectedNodes, setSelectedEdges],
  );

  const onPaneContextMenu = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      e.preventDefault();
      const evt = e as React.MouseEvent;
      const flow = screenToFlowPosition({ x: evt.clientX, y: evt.clientY });
      setMenu({ x: evt.clientX, y: evt.clientY, flowX: flow.x, flowY: flow.y });
    },
    [screenToFlowPosition],
  );

  const onNodeContextMenu: NodeMouseHandler = useCallback(
    (e, node) => {
      e.preventDefault();
      const flow = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setMenu({ x: e.clientX, y: e.clientY, flowX: flow.x, flowY: flow.y, nodeId: node.id });
    },
    [screenToFlowPosition],
  );

  const onEdgeContextMenu: EdgeMouseHandler = useCallback(
    (e, edge) => {
      e.preventDefault();
      const flow = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setMenu({ x: e.clientX, y: e.clientY, flowX: flow.x, flowY: flow.y, edgeId: edge.id });
    },
    [screenToFlowPosition],
  );

  const onEdgeDoubleClick: EdgeMouseHandler = useCallback(
    (_e, edge) => {
      const next = prompt("Edge label:", typeof edge.label === "string" ? edge.label : "");
      if (next !== null) updateEdgeLabel(edge.id, next);
    },
    [updateEdgeLabel],
  );

  const defaultViewport = useMemo(() => ({ x: 0, y: 0, zoom: 1 }), []);

  return (
    <div className="absolute inset-0">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onSelectionChange={onSelectionChange}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onEdgeDoubleClick={onEdgeDoubleClick}
        snapToGrid={snapToGrid}
        snapGrid={[16, 16]}
        defaultViewport={defaultViewport}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        multiSelectionKeyCode={["Meta", "Shift", "Control"]}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color={theme === "dark" ? "#2a3357" : "#cbd5e1"}
        />
        <MiniMap
          pannable
          zoomable
          nodeStrokeColor={() => "#7c3aed"}
          nodeColor={() => (theme === "dark" ? "#1e2547" : "#ede9fe")}
          maskColor={theme === "dark" ? "rgba(11,16,32,0.7)" : "rgba(248,250,252,0.7)"}
        />
        <Controls position="bottom-right" showInteractive={false} />
      </ReactFlow>

      <Toolbar />
      <SearchPalette />

      {menu && <ContextMenu state={menu} onClose={() => setMenu(null)} />}

      {/* Footer hint */}
      <div className="absolute bottom-3 left-3 z-10 text-[11px] text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-[#111733]/70 backdrop-blur px-2.5 py-1 rounded-md border border-slate-200/70 dark:border-slate-700/60">
        Double-click node to edit · Double-click edge to label · Right-click for menu · N = new node · ⌘Z / ⌘⇧Z = undo/redo
      </div>
    </div>
  );
}

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
