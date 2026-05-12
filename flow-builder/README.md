# Flow Builder

Production-grade dynamic workflow / application navigation flow builder, in the spirit of Whimsical, Lucidchart, and FigJam.

This is a **standalone** React app (Vite). It is intentionally NOT part of the pnpm workspace — it has its own `package.json`, `node_modules`, and dev server.

## Stack

- **React 18** + TypeScript + Vite
- **@xyflow/react** (formerly React Flow) for the canvas
- **dagre** for auto-layout
- **zustand** for state + undo/redo
- **TailwindCSS** for styling (light/dark)
- **html-to-image** for PNG/SVG export

## Run locally

```bash
cd flow-builder
npm install
npm run dev
```

Open http://localhost:5173.

> The app uses `--host 0.0.0.0` so it works in Replit and codespace previews.

## Build

```bash
npm run build
npm run preview
```

## Features

### Core
- Add / edit / delete nodes (double-click to edit, hover to reveal pencil/trash)
- Drag-and-drop nodes to reposition
- Connect nodes by dragging from the bottom handle to the top handle of another node
- Edit edge label by double-clicking it
- Delete nodes/edges via the Delete key, the per-node icon, or the right-click menu

### Auto-layout
- Click the grid icon to auto-layout vertically (Dagre)
- Imported JSON without `position` is auto-laid-out on load

### Import / Export
- Import a JSON file matching the schema below
- Export the current graph as JSON, PNG (2× pixel ratio), or SVG

### Persistence & history
- Auto-saves to `localStorage` on every committed mutation
- Undo (⌘Z / Ctrl+Z) and redo (⌘⇧Z / Ctrl+Y) — last 50 states

### UI / UX
- Light / dark mode (toggle in toolbar)
- Dotted-grid background
- Animated dashed edges (toggle in toolbar)
- Snap-to-grid toggle (16 px)
- Search palette: type any term, click a result to fly to that node
- Mini-map and zoom controls
- Right-click context menu on pane / node / edge
- Multi-select with Shift / ⌘ / Ctrl

### Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `N` | Add a new node |
| `Delete` / `Backspace` | Delete selected nodes/edges |
| `⌘Z` / `Ctrl+Z` | Undo |
| `⌘⇧Z` / `Ctrl+Y` | Redo |
| `⌘D` / `Ctrl+D` | Toggle dark mode |
| `Esc` | Close menus |

## JSON Schema

The graph is fully data-driven. There are no hardcoded names, modules, or business rules — you can drive it from any application's navigation map.

```json
{
  "nodes": [
    {
      "id": "node_1",
      "label": "Section Name",
      "subtitle": "Optional Metadata",
      "position": { "x": 100, "y": 200 }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2",
      "label": "Action Name"
    }
  ]
}
```

`position` is optional — if missing on any node, the entire graph is auto-laid-out with Dagre on import.

## Folder structure

```
flow-builder/
├ index.html
├ package.json
├ tailwind.config.js · postcss.config.js · vite.config.ts · tsconfig.json
├ README.md
└ src/
   ├ main.tsx · App.tsx · index.css
   ├ data/
   │  └ sample-flow.json          # default graph on first load
   ├ lib/
   │  ├ auto-layout.ts            # Dagre wrapper
   │  ├ persist.ts                # localStorage save/load
   │  └ export.ts                 # PNG / SVG / JSON export + import parser
   ├ store/
   │  └ flow-store.ts             # Zustand store with undo/redo + history
   └ components/
      ├ FlowCanvas.tsx            # ReactFlow root with provider, shortcuts, ctx menu
      ├ EditableNode.tsx          # custom node (rect, light-purple theme, inline edit)
      ├ Toolbar.tsx               # top-center toolbar with all global actions
      ├ SearchPalette.tsx         # top-left search with fly-to-node
      └ ContextMenu.tsx           # right-click menu for pane/node/edge
```

## Notes

- All nodes use a single reusable `editable` node type — to add new node shapes, register additional types in `FlowCanvas.tsx`'s `nodeTypes` map.
- The Zustand store is the single source of truth; React Flow callbacks are wired to it, so any new feature (e.g. groups, swimlanes) plugs in by extending `flow-store.ts`.
- History is committed only on **completed** changes (drag end, add, remove, label edit, etc.) so undo never lands the user mid-drag.
