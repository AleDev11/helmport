import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Play,
  Square,
  RotateCw,
  Loader2,
  Network,
  HardDrive,
  ScrollText,
  Info,
  AlertTriangle,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StatusDot } from "./StatusDot";
import { OverviewTab, LogsTab, VolumesTab, NetworksTab } from "./ContainerPanels";
import { Toaster, type Toast } from "./Toaster";
import { fetchDetail, runAction } from "./api";
import type { ContainerAction, ContainerDetail as Detail } from "@/lib/types";

export default function ContainerView({ id }: { id: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<ContainerAction | null>(null);
  const [tab, setTab] = useState("overview");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const pushToast = useCallback((kind: Toast["kind"], message: string) => {
    const tid = ++toastId.current;
    setToasts((t) => [...t, { id: tid, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== tid)), 4000);
  }, []);

  const load = useCallback(async () => {
    try {
      setDetail(await fetchDetail(id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load container");
    }
  }, [id]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 8000);
    return () => clearInterval(t);
  }, [load]);

  const handleAction = useCallback(
    async (action: ContainerAction) => {
      setPending(action);
      try {
        const res = await runAction(id, action);
        if (res.ok) pushToast("success", `Container ${action}ed`);
        else pushToast("error", res.error || `Failed to ${action}`);
      } catch (err) {
        pushToast("error", err instanceof Error ? err.message : `Failed to ${action}`);
      } finally {
        setPending(null);
        await load();
      }
    },
    [id, load, pushToast],
  );

  const running = detail?.state === "running";

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <motion.a
          href="/"
          className="text-muted-foreground hover:text-foreground mb-5 inline-flex items-center gap-1.5 text-sm"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
        >
          <ArrowLeft className="size-4" /> Back to dashboard
        </motion.a>

        {error && !detail ? (
          <div className="border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-3 rounded-lg border px-4 py-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Couldn't load this container</p>
              <p className="text-destructive/80 mt-0.5">{error}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <motion.header
              className="mb-6 flex flex-wrap items-start justify-between gap-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <StatusDot state={detail?.state ?? "created"} />
                  <h1 className="truncate text-xl font-semibold tracking-tight">
                    {detail?.name ?? id.slice(0, 12)}
                  </h1>
                </div>
                <p className="text-muted-foreground mt-1 truncate font-mono text-xs">
                  {detail?.image ?? "…"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {detail &&
                  (running ? (
                    <>
                      <Button
                        variant="outline"
                        disabled={pending !== null}
                        onClick={() => handleAction("restart")}
                      >
                        {pending === "restart" ? <Loader2 className="animate-spin" /> : <RotateCw />}
                        Restart
                      </Button>
                      <Button
                        variant="outline"
                        className="text-destructive"
                        disabled={pending !== null}
                        onClick={() => handleAction("stop")}
                      >
                        {pending === "stop" ? <Loader2 className="animate-spin" /> : <Square />}
                        Stop
                      </Button>
                    </>
                  ) : (
                    <Button disabled={pending !== null} onClick={() => handleAction("start")}>
                      {pending === "start" ? <Loader2 className="animate-spin" /> : <Play />}
                      Start
                    </Button>
                  ))}
              </div>
            </motion.header>

            {/* Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
            >
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                  <TabsTrigger value="overview">
                    <Info className="size-3.5" /> Overview
                  </TabsTrigger>
                  <TabsTrigger value="logs">
                    <ScrollText className="size-3.5" /> Logs
                  </TabsTrigger>
                  <TabsTrigger value="volumes">
                    <HardDrive className="size-3.5" /> Volumes
                  </TabsTrigger>
                  <TabsTrigger value="networks">
                    <Network className="size-3.5" /> Networks
                  </TabsTrigger>
                </TabsList>

                <div className="bg-card mt-4 rounded-xl border p-5">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TabsContent value="overview">
                      <OverviewTab detail={detail} />
                    </TabsContent>
                    <TabsContent value="logs">
                      <LogsTab id={id} />
                    </TabsContent>
                    <TabsContent value="volumes">
                      <VolumesTab detail={detail} />
                    </TabsContent>
                    <TabsContent value="networks">
                      <NetworksTab detail={detail} />
                    </TabsContent>
                  </motion.div>
                </div>
              </Tabs>
            </motion.div>
          </>
        )}
      </div>

      <Toaster toasts={toasts} />
    </TooltipProvider>
  );
}
