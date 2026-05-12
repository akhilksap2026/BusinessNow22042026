import dagre from "dagre";
import type { Edge, Node } from "@xyflow/react";

const NODE_W = 220;
const NODE_H = 80;

export type LayoutDirection = "TB" | "LR" | "BT" | "RL";

export function autoLayout<N extends Node>(
  nodes: N[],
  edges: Edge[],
  direction: LayoutDirection = "TB",
): N[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 90, marginx: 24, marginy: 24 });

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    if (!pos) return n;
    return {
      ...n,
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
    };
  });
}
