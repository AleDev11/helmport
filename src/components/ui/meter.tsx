import * as React from "react";
import { cn } from "@/lib/utils";

type MeterTone = "primary" | "success" | "warning" | "destructive" | "auto";

const TONE_CLASS: Record<Exclude<MeterTone, "auto">, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

/** Pick a tone from a 0–100 value when tone is "auto". */
function resolveTone(value: number, tone: MeterTone): Exclude<MeterTone, "auto"> {
  if (tone !== "auto") return tone;
  if (value >= 90) return "destructive";
  if (value >= 75) return "warning";
  return "success";
}

interface MeterProps extends React.ComponentProps<"div"> {
  /** 0–100 */
  value: number;
  tone?: MeterTone;
  "aria-label"?: string;
}

/** Accessible horizontal meter/progress bar. */
function Meter({ value, tone = "auto", className, ...props }: MeterProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const resolved = resolveTone(clamped, tone);
  return (
    <div
      role="meter"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("bg-muted relative h-1.5 w-full overflow-hidden rounded-full", className)}
      {...props}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", TONE_CLASS[resolved])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export { Meter };
