import { cn } from "@/lib/utils";
import type { ContainerState } from "@/lib/types";

const STATE_TONE: Record<ContainerState, string> = {
  running: "bg-success",
  restarting: "bg-warning",
  paused: "bg-warning",
  created: "bg-muted-foreground",
  removing: "bg-warning",
  exited: "bg-muted-foreground/60",
  dead: "bg-destructive",
};

/** A small status indicator; pulses softly while running. */
export function StatusDot({ state, className }: { state: ContainerState; className?: string }) {
  const tone = STATE_TONE[state] ?? "bg-muted-foreground";
  return (
    <span className={cn("relative inline-flex size-2.5 shrink-0", className)}>
      {state === "running" && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
            tone,
          )}
        />
      )}
      <span className={cn("relative inline-flex size-2.5 rounded-full", tone)} />
    </span>
  );
}
