import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Boxes, Cpu, MemoryStick, HardDrive, AlertTriangle } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Header } from "./Header";
import { StatTile } from "./StatTile";
import { DiskPanel } from "./DiskPanel";
import { ContainerCard } from "./ContainerCard";
import { ContainerCardSkeleton } from "./Skeletons";
import { Toaster, type Toast } from "./Toaster";
import { fetchOverview, fetchStats, runAction, type Overview } from "./api";
import type { ContainerAction, ContainerStats } from "@/lib/types";
import { formatBytes, formatPercent } from "@/lib/format";

const STATS_INTERVAL = 4000;
const OVERVIEW_INTERVAL = 12000;

export default function Dashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [stats, setStats] = useState<Record<string, ContainerStats>>({});
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [pending, setPending] = useState<Record<string, ContainerAction>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toastId = useRef(0);
  const pushToast = useCallback((kind: Toast["kind"], message: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const loadOverview = useCallback(async () => {
    try {
      const data = await fetchOverview();
      setOverview(data);
      setError(null);
      setLastUpdated(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, []);

  const sampleStats = useCallback(async () => {
    try {
      const s = await fetchStats();
      setStats(s);
    } catch {
      /* transient; keep previous sample */
    }
  }, []);

  // Initial load.
  useEffect(() => {
    void loadOverview();
    void sampleStats();
  }, [loadOverview, sampleStats]);

  // Polling loops.
  useEffect(() => {
    const a = setInterval(() => void sampleStats(), STATS_INTERVAL);
    const b = setInterval(() => void loadOverview(), OVERVIEW_INTERVAL);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, [sampleStats, loadOverview]);

  const manualRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadOverview(), sampleStats()]);
    setRefreshing(false);
  }, [loadOverview, sampleStats]);

  const handleAction = useCallback(
    async (id: string, action: ContainerAction) => {
      setPending((p) => ({ ...p, [id]: action }));
      try {
        const res = await runAction(id, action);
        if (res.ok) {
          pushToast("success", `Container ${action}ed successfully`);
        } else {
          pushToast("error", res.error || `Failed to ${action}`);
        }
      } catch (err) {
        pushToast("error", err instanceof Error ? err.message : `Failed to ${action}`);
      } finally {
        setPending((p) => {
          const next = { ...p };
          delete next[id];
          return next;
        });
        await Promise.all([loadOverview(), sampleStats()]);
      }
    },
    [loadOverview, sampleStats, pushToast],
  );

  const containers = overview?.containers ?? [];

  // Aggregate metrics.
  const agg = useMemo(() => {
    const running = containers.filter((c) => c.state === "running");
    const totalCpu = running.reduce((a, c) => a + (stats[c.id]?.cpuPercent ?? 0), 0);
    const memUsed = running.reduce((a, c) => a + (stats[c.id]?.memUsage ?? 0), 0);
    const memTotal = overview?.host.memTotal ?? 0;
    const ncpu = overview?.host.ncpu ?? 1;
    return {
      running: running.length,
      stopped: containers.length - running.length,
      total: containers.length,
      cpuPct: totalCpu / ncpu, // % of total host CPU capacity
      memUsed,
      memTotal,
      memPct: memTotal > 0 ? (memUsed / memTotal) * 100 : 0,
    };
  }, [containers, stats, overview]);

  // Group by compose project.
  const groups = useMemo(() => {
    const map = new Map<string, typeof containers>();
    for (const c of containers) {
      const key = c.project ?? "";
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (a === "") return 1; // standalone last
      if (b === "") return -1;
      return a.localeCompare(b);
    });
  }, [containers]);

  const loading = overview === null && error === null;

  return (
    <TooltipProvider>
      <Header
        host={overview?.host ?? null}
        refreshing={refreshing}
        lastUpdated={lastUpdated}
        onRefresh={() => void manualRefresh()}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {error && (
          <div className="border-destructive/40 bg-destructive/10 text-destructive mb-6 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Can't reach Docker</p>
              <p className="text-destructive/80 mt-0.5">{error}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => void manualRefresh()}>
              Retry
            </Button>
          </div>
        )}

        {/* Overview */}
        <section aria-label="Overview" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile
            label="Containers"
            value={loading ? "—" : `${agg.running}/${agg.total}`}
            sub={loading ? undefined : `${agg.stopped} stopped`}
            icon={Boxes}
          />
          <StatTile
            label="CPU load"
            value={loading ? "—" : formatPercent(agg.cpuPct / 100, 1)}
            sub={overview ? `${overview.host.ncpu} vCPU total` : undefined}
            icon={Cpu}
            meter={agg.cpuPct}
            accent="text-chart-2"
          />
          <StatTile
            label="Memory"
            value={loading ? "—" : formatBytes(agg.memUsed)}
            sub={agg.memTotal ? `of ${formatBytes(agg.memTotal)}` : undefined}
            icon={MemoryStick}
            meter={agg.memPct}
            accent="text-chart-4"
          />
          <StatTile
            label="Docker disk"
            value={loading ? "—" : formatBytes(overview?.disk.totalSize ?? 0)}
            sub={
              overview && overview.disk.reclaimable > 0
                ? `${formatBytes(overview.disk.reclaimable)} reclaimable`
                : "in use"
            }
            icon={HardDrive}
            accent="text-chart-1"
          />
        </section>

        {/* Disk breakdown */}
        {overview && (
          <section className="mt-6">
            <DiskPanel disk={overview.disk} />
          </section>
        )}

        {/* Containers */}
        <section className="mt-8" aria-label="Containers">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ContainerCardSkeleton key={i} />
              ))}
            </div>
          ) : containers.length === 0 && !error ? (
            <div className="text-muted-foreground rounded-xl border border-dashed py-16 text-center text-sm">
              No containers found on this host.
            </div>
          ) : (
            <div className="space-y-8">
              {groups.map(([project, items]) => (
                <div key={project || "standalone"}>
                  <div className="mb-3 flex items-center gap-2">
                    <h2 className="text-sm font-semibold">{project || "Standalone"}</h2>
                    <span className="text-muted-foreground text-xs">{items.length}</span>
                    <div className="bg-border ml-1 h-px flex-1" />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {items.map((c) => (
                      <ContainerCard
                        key={c.id}
                        container={c}
                        stats={stats[c.id]}
                        pending={pending[c.id] ?? null}
                        onAction={handleAction}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="text-muted-foreground mt-12 border-t pt-6 text-center text-xs">
          Helmport · read-optimised homelab dashboard ·{" "}
          {overview ? `${overview.host.operatingSystem}` : "connecting…"}
        </footer>
      </main>

      <Toaster toasts={toasts} />
    </TooltipProvider>
  );
}
