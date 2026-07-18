import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  /** Optional meter 0–100 shown under the value. */
  meter?: number;
  meterTone?: "primary" | "success" | "warning" | "destructive" | "auto";
  accent?: string;
  index?: number;
}

export function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  meter,
  meterTone = "auto",
  accent = "text-primary",
  index = 0,
}: StatTileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
    >
      <Card className="gap-0 p-5">
        <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums leading-none">{value}</p>
        </div>
        <span className={cn("bg-muted/60 grid size-9 place-items-center rounded-lg", accent)}>
          <Icon className="size-4.5" strokeWidth={2} />
        </span>
      </div>
        {typeof meter === "number" ? (
          <Meter value={meter} tone={meterTone} className="mt-4" aria-label={label} />
        ) : null}
        {sub ? <p className="text-muted-foreground mt-3 text-xs">{sub}</p> : null}
      </Card>
    </motion.div>
  );
}
