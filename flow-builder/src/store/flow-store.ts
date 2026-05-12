import { create } from "zustand";
import {
  type Edge,
  type Node,
  type EdgeChange,
  type NodeChange,
  type Connection,
  applyEdgeChanges,
  applyNodeChanges,
  addEdge,
  MarkerType,
} from "@xyflow/react";
import { autoLayout, type LayoutDirection } from "@/lib/auto-layout";
import { loadGraph, saveGraph, loadTheme, saveTheme } from "@/lib/persist";
import sample from "@/data/sample-flow.json";
import type { ImportedGraph } from "@/lib/export";

export type NodeData = { label: string; subtitle?: string };
export type FlowNode = Node<NodeData>;

const HISTORY_LIMIT = 50;

interface Snapshot {
  nodes: FlowNode[];
  edges: Edge[];
}

interface FlowState extends Snapshot {
  theme: "light" | "dark";
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  searchQuery: string;
  snapToGrid: boolean;
  animatedEdges: boolean;
  past: Snapshot[];
  future: Snapshot[];

  // mutations
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (conn: Connection) => void;

  addNode: (partial?: Partial<NodeData> & { position?: { x: number; y: number } }) => string;
  updateNode: (id: string, data: Partial<NodeData>) => void;
  deleteNode: (id: string) => void;

  updateEdgeLabel: (id: string, label: string) => void;
  deleteEdge: (id: string) => void;

  setSelectedNodes: (ids: string[]) => void;
  setSelectedEdges: (ids: string[]) => void;

  // tools
  layoutAll: (direction?: LayoutDirection) => void;
  importGraph: (g: ImportedGraph) => void;
  reset: () => void;
  loadFromStorage: () => void;
  toggleTheme: () => void;
  setTheme: (t: "light" | "dark") => void;
  setSearch: (q: string) => void;
  toggleSnap: () => void;
  toggleAnimated: () => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // internal
  _commit: (next: Snapshot) => void;
}

function buildEdge(e: { id: string; source: string; target: string; label?: string }, animated: boolean): Edge {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label ?? "",
    type: "smoothstep",
    animated,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#7c3aed", width: 18, height: 18 },
    style: { stroke: "#7c3aed" },
    labelBgPadding: [6, 4],
    labelBgBorderRadius: 6,
    labelStyle: { fill: "#475569", fontWeight: 500 },
  };
}

function buildNode(n: { id: string; label: string; subtitle?: string; position?: { x: number; y: number } }): FlowNode {
  return {
    id: n.id,
    type: "editable",
    position: n.position ?? { x: 0, y: 0 },
    data: { label: n.label, subtitle: n.subtitle ?? "" },
  };
}

function fromImported(g: ImportedGraph, animated: boolean): Snapshot {
  const nodes = g.nodes.map(buildNode);
  const edges = g.edges.map((e) => buildEdge(e, animated));
  const needsLayout = g.nodes.some((n) => !n.position);
  return needsLayout ? { nodes: autoLayout(nodes, edges), edges } : { nodes, edges };
}

let nodeCounter = 1;
let edgeCounter = 1;
function nextNodeId(existing: FlowNode[]): string {
  const ids = new Set(existing.map((n) => n.id));
  while (ids.has(`node_${nodeCounter}`)) nodeCounter++;
  return `node_${nodeCounter++}`;
}
function nextEdgeId(existing: Edge[]): string {
  const ids = new Set(existing.map((e) => e.id));
  while (ids.has(`edge_${edgeCounter}`)) edgeCounter++;
  return `edge_${edgeCounter++}`;
}

const initial = fromImported(sample as ImportedGraph, false);

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: initial.nodes,
  edges: initial.edges,
  theme: loadTheme(),
  selectedNodeIds: [],
  selectedEdgeIds: [],
  searchQuery: "",
  snapToGrid: false,
  animatedEdges: false,
  past: [],
  future: [],

  _commit: (next) => {
    const { nodes, edges, past } = get();
    const newPast = [...past, { nodes, edges }].slice(-HISTORY_LIMIT);
    set({ nodes: next.nodes, edges: next.edges, past: newPast, future: [] });
    saveGraph(next.nodes, next.edges);
  },

  onNodesChange: (changes) => {
    const positionChange = changes.some((c) => c.type === "position" && (c as any).dragging === false);
    const removeChange = changes.some((c) => c.type === "remove");
    const next = applyNodeChanges<FlowNode>(changes, get().nodes);
    if (positionChange || removeChange) {
      get()._commit({ nodes: next, edges: get().edges });
    } else {
      set({ nodes: next });
    }
  },
  onEdgesChange: (changes) => {
    const removeChange = changes.some((c) => c.type === "remove");
    const next = applyEdgeChanges(changes, get().edges);
    if (removeChange) {
      get()._commit({ nodes: get().nodes, edges: next });
    } else {
      set({ edges: next });
    }
  },
  onConnect: (conn) => {
    const id = nextEdgeId(get().edges);
    const newEdge = buildEdge(
      { id, source: conn.source!, target: conn.target!, label: "" },
      get().animatedEdges,
    );
    const edges = addEdge(newEdge, get().edges);
    get()._commit({ nodes: get().nodes, edges });
  },

  addNode: (partial) => {
    const id = nextNodeId(get().nodes);
    const node = buildNode({
      id,
      label: partial?.label ?? "New Node",
      subtitle: partial?.subtitle ?? "",
      position: partial?.position ?? { x: 80 + Math.random() * 200, y: 80 + Math.random() * 200 },
    });
    get()._commit({ nodes: [...get().nodes, node], edges: get().edges });
    return id;
  },

  updateNode: (id, data) => {
    const nodes = get().nodes.map((n) =>
      n.id === id ? { ...n, data: { ...n.data, ...data } } : n,
    );
    get()._commit({ nodes, edges: get().edges });
  },

  deleteNode: (id) => {
    const nodes = get().nodes.filter((n) => n.id !== id);
    const edges = get().edges.filter((e) => e.source !== id && e.target !== id);
    get()._commit({ nodes, edges });
  },

  updateEdgeLabel: (id, label) => {
    const edges = get().edges.map((e) => (e.id === id ? { ...e, label } : e));
    get()._commit({ nodes: get().nodes, edges });
  },

  deleteEdge: (id) => {
    const edges = get().edges.filter((e) => e.id !== id);
    get()._commit({ nodes: get().nodes, edges });
  },

  setSelectedNodes: (ids) => set({ selectedNodeIds: ids }),
  setSelectedEdges: (ids) => set({ selectedEdgeIds: ids }),

  layoutAll: (direction = "TB") => {
    const nodes = autoLayout(get().nodes, get().edges, direction);
    get()._commit({ nodes, edges: get().edges });
  },

  importGraph: (g) => {
    const snap = fromImported(g, get().animatedEdges);
    get()._commit(snap);
  },

  reset: () => {
    const snap = fromImported(sample as ImportedGraph, get().animatedEdges);
    get()._commit(snap);
  },

  loadFromStorage: () => {
    const stored = loadGraph();
    if (stored) set({ nodes: stored.nodes as FlowNode[], edges: stored.edges });
  },

  toggleTheme: () => {
    const next = get().theme === "light" ? "dark" : "light";
    set({ theme: next });
    saveTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  },
  setTheme: (t) => {
    set({ theme: t });
    saveTheme(t);
    document.documentElement.classList.toggle("dark", t === "dark");
  },

  setSearch: (q) => set({ searchQuery: q }),
  toggleSnap: () => set({ snapToGrid: !get().snapToGrid }),
  toggleAnimated: () => {
    const animated = !get().animatedEdges;
    const edges = get().edges.map((e) => ({ ...e, animated }));
    set({ animatedEdges: animated, edges });
    saveGraph(get().nodes, edges);
  },

  undo: () => {
    const { past, nodes, edges, future } = get();
    if (!past.length) return;
    const prev = past[past.length - 1];
    const newPast = past.slice(0, -1);
    const newFuture = [{ nodes, edges }, ...future].slice(0, HISTORY_LIMIT);
    set({ nodes: prev.nodes, edges: prev.edges, past: newPast, future: newFuture });
    saveGraph(prev.nodes, prev.edges);
  },
  redo: () => {
    const { future, nodes, edges, past } = get();
    if (!future.length) return;
    const next = future[0];
    const newFuture = future.slice(1);
    const newPast = [...past, { nodes, edges }].slice(-HISTORY_LIMIT);
    set({ nodes: next.nodes, edges: next.edges, past: newPast, future: newFuture });
    saveGraph(next.nodes, next.edges);
  },
  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}));
