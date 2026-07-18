import { HardDrive, Boxes, Container, Database, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import type { DiskUsage } from "@/lib/types";
import { formatBytes } from "@/lib/format";

const ROWS = [
  { key: "imagesSize", label: "Images", icon: Boxes, tone: "bg-chart-1" },
  { key: "containersSize", label: "Containers", icon: Container, tone: "bg-chart-2" },
  { key: "volumesSize", label: "Volumes", icon: Database, tone: "bg-chart-3" },
  { key: "buildCacheSize", label: "Build cache", icon: Layers, tone: "bg-chart-4" },
] as const;

export function DiskPanel({ disk }: { disk: DiskUsage }) {
  const total = disk.totalSize || 1;
  return (
    <Card className="gap-0">
      <CardHeader className="flex-row items-center justify-between gap-2 pb-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <HardDrive className="text-primary size-4" /> Docker disk usage
        </CardTitle>
        <span className="text-muted-foreground text-xs tabular-nums">
          {formatBytes(disk.totalSize)} total
        </span>
      </CardHeader>
      <CardContent className="pt-5">
        {/* Stacked bar */}
        <div className="bg-muted flex h-2.5 w-full overflow-hidden rounded-full">
          {ROWS.map((r) => {
            const val = disk[r.key];
            const pct = (val / total) * 100;
            if (pct <= 0) return null;
            return (
              <div
                key={r.key}
                className={r.tone}
                style={{ width: `${pct}%` }}
                title={`${r.label}: ${formatBytes(val)}`}
              />
            );
          })}
        </div>

        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {ROWS.map((r) => {
            const val = disk[r.key];
            const Icon = r.icon;
            return (
              <li key={r.key} className="flex items-center gap-2.5">
                <span className={`size-2.5 shrink-0 rounded-sm ${r.tone}`} />
                <Icon className="text-muted-foreground size-4 shrink-0" />
                <span className="text-sm">{r.label}</span>
                <span className="text-muted-foreground ml-auto text-sm tabular-nums">
                  {formatBytes(val)}
                </span>
              </li>
            );
          })}
        </ul>

        {disk.reclaimable > 0 && (
          <p className="text-muted-foreground mt-4 border-t pt-3 text-xs">
            <span className="text-warning font-medium">{formatBytes(disk.reclaimable)}</span>{" "}
            reclaimable from unused build cache.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
