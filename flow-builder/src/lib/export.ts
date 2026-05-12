import { toPng, toSvg } from "html-to-image";
import type { Edge, Node } from "@xyflow/react";

function download(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function getViewport(): Promise<HTMLElement | null> {
  return document.querySelector(".react-flow__viewport") as HTMLElement | null;
}

export async function exportPng(filename = "flow.png") {
  const el = await getViewport();
  if (!el) return;
  const dataUrl = await toPng(el, {
    backgroundColor: getComputedStyle(document.body).backgroundColor,
    pixelRatio: 2,
    cacheBust: true,
  });
  download(dataUrl, filename);
}

export async function exportSvg(filename = "flow.svg") {
  const el = await getViewport();
  if (!el) return;
  const dataUrl = await toSvg(el, {
    backgroundColor: getComputedStyle(document.body).backgroundColor,
    cacheBust: true,
  });
  download(dataUrl, filename);
}

export function exportJson(nodes: Node[], edges: Edge[], filename = "flow.json") {
  const payload = {
    nodes: nodes.map((n) => ({
      id: n.id,
      label: (n.data as any)?.label ?? "",
      subtitle: (n.data as any)?.subtitle ?? "",
      position: n.position,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: typeof e.label === "string" ? e.label : "",
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  download(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ImportedGraph {
  nodes: Array<{ id: string; label: string; subtitle?: string; position?: { x: number; y: number } }>;
  edges: Array<{ id: string; source: string; target: string; label?: string }>;
}

export function parseImportedJson(text: string): ImportedGraph {
  let data: any;
  try {
    data = JSON.parse(text);
  } catch (e: any) {
    throw new Error(`Not valid JSON: ${e.message}`);
  }
  if (!data || typeof data !== "object") {
    throw new Error("Expected an object with { nodes, edges }.");
  }
  if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
    throw new Error("Expected { nodes: [], edges: [] }.");
  }

  const nodeIds = new Set<string>();
  const nodes = data.nodes.map((n: any, i: number) => {
    if (!n || typeof n !== "object") throw new Error(`nodes[${i}] is not an object`);
    const id = String(n.id ?? "").trim();
    if (!id) throw new Error(`nodes[${i}].id is required`);
    if (nodeIds.has(id)) throw new Error(`Duplicate node id: ${id}`);
    nodeIds.add(id);
    const label = String(n.label ?? "Untitled");
    const subtitle = n.subtitle != null ? String(n.subtitle) : undefined;
    let position: { x: number; y: number } | undefined;
    if (n.position && typeof n.position === "object") {
      const x = Number(n.position.x);
      const y = Number(n.position.y);
      if (Number.isFinite(x) && Number.isFinite(y)) position = { x, y };
    }
    return { id, label, subtitle, position };
  });

  const edgeIds = new Set<string>();
  const edges = data.edges.map((e: any, i: number) => {
    if (!e || typeof e !== "object") throw new Error(`edges[${i}] is not an object`);
    const id = String(e.id ?? "").trim();
    if (!id) throw new Error(`edges[${i}].id is required`);
    if (edgeIds.has(id)) throw new Error(`Duplicate edge id: ${id}`);
    edgeIds.add(id);
    const source = String(e.source ?? "").trim();
    const target = String(e.target ?? "").trim();
    if (!source || !target) throw new Error(`edges[${i}] requires source and target`);
    if (!nodeIds.has(source)) throw new Error(`edges[${i}].source "${source}" not found in nodes`);
    if (!nodeIds.has(target)) throw new Error(`edges[${i}].target "${target}" not found in nodes`);
    const label = e.label != null ? String(e.label) : "";
    return { id, source, target, label };
  });

  return { nodes, edges };
}
