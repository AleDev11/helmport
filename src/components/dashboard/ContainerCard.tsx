import { useState } from "react";
import {
  MoreVertical,
  Play,
  Square,
  RotateCw,
  Cpu,
  MemoryStick,
  Network,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/ui/meter";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { StatusDot } from "./StatusDot";
import type { ContainerAction, ContainerStats, ContainerSummary } from "@/lib/types";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  container: ContainerSummary;
  stats?: ContainerStats;
  pending: ContainerAction | null;
  onAction: (id: string, action: ContainerAction) => void;
}

const HEALTH_LABEL: Record<string, { text: string; variant: "success" | "destructive" | "warning" }> = {
  healthy: { text: "healthy", variant: "success" },
  unhealthy: { text: "unhealthy", variant: "destructive" },
  starting: { text: "starting", variant: "warning" },
};

export function ContainerCard({ container, stats, pending, onAction }: Props) {
  const [open, setOpen] = useState(false);
  const running = container.state === "running";
  const busy = pending !== null;
  const health = HEALTH_LABEL[container.health];

  const cpu = stats?.cpuPercent ?? 0;
  const mem = stats?.memUsage ?? 0;
  const memPct = stats?.memPercent ?? 0;

  return (
    <Card
      className={cn(
        "group relative gap-0 overflow-hidden p-4 transition-colors",
        "hover:border-primary/40",
        !running && "opacity-90",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <StatusDot state={container.state} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight" title={container.name}>
              {container.name}
            </p>
            <p className="text-muted-foreground truncate text-xs" title={container.image}>
              {container.imageShort}
            </p>
          </div>
        </div>

        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground -mr-1 -mt-1"
              aria-label={`Actions for ${container.name}`}
              disabled={busy}
            >
              {busy ? <Loader2 className="animate-spin" /> : <MoreVertical />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Manage</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {running ? (
              <>
                <DropdownMenuItem onSelect={() => onAction(container.id, "restart")}>
                  <RotateCw /> Restart
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => onAction(container.id, "stop")}
                >
                  <Square /> Stop
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onSelect={() => onAction(container.id, "start")}>
                <Play /> Start
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Badges */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge variant={running ? "success" : "secondary"} className="capitalize">
          {container.state}
        </Badge>
        {health && <Badge variant={health.variant}>{health.text}</Badge>}
        {container.ports
          .filter((p) => p.publicPort)
          .slice(0, 3)
          .map((p) => (
            <Badge key={`${p.privatePort}-${p.type}`} variant="outline" className="font-mono">
              {p.publicPort}:{p.privatePort}
            </Badge>
          ))}
      </div>

      {/* Live metrics */}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <Metric
          icon={Cpu}
          label="CPU"
          value={running ? `${cpu.toFixed(1)}%` : "—"}
          meter={running ? cpu : 0}
          dim={!running}
        />
        <Metric
          icon={MemoryStick}
          label="RAM"
          value={running ? formatBytes(mem) : "—"}
          meter={running ? memPct : 0}
          dim={!running}
        />
      </div>

      {/* Footer */}
      <div className="text-muted-foreground mt-4 flex items-center justify-between gap-2 text-xs">
        <span className="truncate" title={container.status}>
          {container.status}
        </span>
        {running && stats && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1 tabular-nums">
                <Network className="size-3" />
                {formatBytes(stats.netRx)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Net ↓ {formatBytes(stats.netRx)} · ↑ {formatBytes(stats.netTx)}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </Card>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  meter,
  dim,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  meter: number;
  dim?: boolean;
}) {
  return (
    <div>
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span className="flex items-center gap-1">
          <Icon className="size-3" /> {label}
        </span>
        <span className={cn("tabular-nums", dim && "opacity-50")}>{value}</span>
      </div>
      <Meter value={meter} className="mt-1.5" />
    </div>
  );
}
