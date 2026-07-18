import { RefreshCw, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import type { HostInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  host: HostInfo | null;
  refreshing: boolean;
  lastUpdated: number | null;
  onRefresh: () => void;
}

export function Header({ host, refreshing, lastUpdated, onRefresh }: Props) {
  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="bg-primary/10 text-primary grid size-9 place-items-center rounded-lg">
            <Server className="size-5" strokeWidth={2.25} />
          </span>
          <div className="leading-tight">
            <p className="font-semibold tracking-tight">Helmport</p>
            <p className="text-muted-foreground hidden text-xs sm:block">
              {host ? host.name : "Homelab dashboard"}
            </p>
          </div>
        </div>

        <div className="text-muted-foreground ml-auto hidden items-center gap-4 text-xs md:flex">
          {host && (
            <>
              <span>{host.ncpu} vCPU</span>
              <span className="bg-border h-3 w-px" />
              <span>Docker {host.dockerVersion}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            aria-label="Refresh"
            title={lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}` : "Refresh"}
          >
            <RefreshCw className={cn(refreshing && "animate-spin")} />
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
