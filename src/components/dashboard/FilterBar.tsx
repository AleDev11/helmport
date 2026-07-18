import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type StateFilter = "all" | "running" | "stopped";

interface Props {
  query: string;
  onQuery: (v: string) => void;
  state: StateFilter;
  onState: (v: StateFilter) => void;
  counts: { all: number; running: number; stopped: number };
}

const FILTERS: { key: StateFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "running", label: "Running" },
  { key: "stopped", label: "Stopped" },
];

export function FilterBar({ query, onQuery, state, onState, counts }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search by name, image or project…"
          className="pl-9 pr-9"
          aria-label="Search containers"
        />
        {query && (
          <button
            onClick={() => onQuery("")}
            aria-label="Clear search"
            className="text-muted-foreground hover:text-foreground absolute right-2.5 top-1/2 -translate-y-1/2"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="bg-muted flex items-center gap-1 rounded-lg p-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => onState(f.key)}
            data-state={state === f.key ? "active" : "inactive"}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors",
              state === f.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
            <span className="text-muted-foreground text-xs tabular-nums">{counts[f.key]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
