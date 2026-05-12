import { useMemo } from "react";
import { Search, X } from "lucide-react";
import { useFlowStore } from "@/store/flow-store";
import { useReactFlow } from "@xyflow/react";

export function SearchPalette() {
  const search = useFlowStore((s) => s.searchQuery);
  const setSearch = useFlowStore((s) => s.setSearch);
  const nodes = useFlowStore((s) => s.nodes);
  const { setCenter } = useReactFlow();

  const matches = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return nodes.filter(
      (n) =>
        n.data.label.toLowerCase().includes(q) ||
        (n.data.subtitle ?? "").toLowerCase().includes(q),
    );
  }, [nodes, search]);

  return (
    <div className="absolute z-20 top-3 left-3 w-72">
      <div className="flex items-center gap-2 bg-white dark:bg-[#111733] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-node">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search nodes…"
          className="flex-1 bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            title="Clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {matches.length > 0 && (
        <div className="mt-2 max-h-64 overflow-y-auto thin-scroll bg-white dark:bg-[#111733] border border-slate-200 dark:border-slate-700 rounded-xl shadow-node">
          {matches.slice(0, 12).map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setCenter(n.position.x + 110, n.position.y + 40, { zoom: 1.2, duration: 400 })}
              className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 dark:hover:bg-brand-900/30 border-b last:border-b-0 border-slate-100 dark:border-slate-800"
            >
              <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                {n.data.label}
              </div>
              {n.data.subtitle && (
                <div className="text-xs text-slate-500 truncate">{n.data.subtitle}</div>
              )}
            </button>
          ))}
          {matches.length > 12 && (
            <div className="px-3 py-1.5 text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800">
              +{matches.length - 12} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}
