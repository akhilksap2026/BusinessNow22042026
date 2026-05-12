import type { Edge, Node } from "@xyflow/react";

const KEY = "flow-builder:graph:v1";
const THEME_KEY = "flow-builder:theme";

export interface PersistedGraph {
  nodes: Node[];
  edges: Edge[];
  savedAt: string;
}

export function saveGraph(nodes: Node[], edges: Edge[]) {
  const payload: PersistedGraph = {
    nodes,
    edges,
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // quota — ignore
  }
}

export function loadGraph(): PersistedGraph | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedGraph;
  } catch {
    return null;
  }
}

export function clearGraph() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

export function loadTheme(): "light" | "dark" {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function saveTheme(theme: "light" | "dark") {
  localStorage.setItem(THEME_KEY, theme);
}
