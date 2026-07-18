import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Toast {
  id: number;
  kind: "success" | "error";
  message: string;
}

/** Minimal, dependency-free toast stack (bottom-right). */
export function Toaster({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "bg-popover text-popover-foreground pointer-events-auto flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm shadow-lg",
            "animate-in slide-in-from-bottom-2 fade-in-0",
          )}
        >
          {t.kind === "success" ? (
            <CheckCircle2 className="text-success size-4 shrink-0" />
          ) : (
            <XCircle className="text-destructive size-4 shrink-0" />
          )}
          <span className="min-w-0 break-words">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
