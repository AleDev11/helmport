import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  Square,
  RotateCw,
  Loader2,
  Network,
  HardDrive,
  ScrollText,
  Info,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusDot } from "./StatusDot";
import { fetchDetail, fetchLogs } from "./api";
import type {
  ContainerAction,
  ContainerDetail as Detail,
  ContainerSummary,
  LogLine,
} from "@/lib/types";
import { formatUptime } from "@/lib/format";
import { cn } from "@/lib/utils";

const LOGS_POLL = 3000;

interface Props {
  container: ContainerSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: ContainerAction | null;
  onAction: (id: string, action: ContainerAction) => void;
}

export function ContainerDetail({ container, open, onOpenChange, pending, onAction }: Props) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [tab, setTab] = useState("overview");
  const id = container?.id ?? null;
  // Prefer the live summary state (kept fresh by the list) over the inspect
  // snapshot, so the header updates right after a lifecycle action.
  const running = (container?.state ?? detail?.state) === "running";

  useEffect(() => {
    if (!open || !id) return;
    setDetail(null);
    setTab("overview");
    const ctrl = new AbortController();
    fetchDetail(id, ctrl.signal)
      .then(setDetail)
      .catch(() => {});
    return () => ctrl.abort();
  }, [open, id]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0">
        {container && (
          <>
            <SheetHeader className="pr-12">
              <div className="flex items-center gap-2.5">
                <StatusDot state={container.state} />
                <SheetTitle className="truncate">{container.name}</SheetTitle>
              </div>
              <SheetDescription className="truncate font-mono text-xs">
                {container.image}
              </SheetDescription>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {running ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending !== null}
                      onClick={() => onAction(container.id, "restart")}
                    >
                      {pending === "restart" ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <RotateCw />
                      )}
                      Restart
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      disabled={pending !== null}
                      onClick={() => onAction(container.id, "stop")}
                    >
                      {pending === "stop" ? <Loader2 className="animate-spin" /> : <Square />}
                      Stop
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    disabled={pending !== null}
                    onClick={() => onAction(container.id, "start")}
                  >
                    {pending === "start" ? <Loader2 className="animate-spin" /> : <Play />}
                    Start
                  </Button>
                )}
              </div>
            </SheetHeader>

            <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
              <div className="px-6 pt-4">
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
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                <TabsContent value="overview">
                  <OverviewTab detail={detail} container={container} />
                </TabsContent>
                <TabsContent value="logs" className="h-full">
                  {open && tab === "logs" && id && <LogsTab id={id} />}
                </TabsContent>
                <TabsContent value="volumes">
                  <VolumesTab detail={detail} />
                </TabsContent>
                <TabsContent value="networks">
                  <NetworksTab detail={detail} />
                </TabsContent>
              </div>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* --------------------------------- Overview -------------------------------- */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2 min-w-0 break-words">{children}</dd>
    </div>
  );
}

function OverviewTab({ detail, container }: { detail: Detail | null; container: ContainerSummary }) {
  if (!detail) return <LoadingBlock />;
  return (
    <div className="divide-border divide-y">
      <Row label="Status">
        <span className="capitalize">{detail.status || detail.state}</span>
        {detail.startedAt && detail.state === "running" && (
          <span className="text-muted-foreground"> · up {formatUptime(detail.startedAt)}</span>
        )}
      </Row>
      <Row label="Image">
        <span className="font-mono text-xs">{detail.image}</span>
      </Row>
      <Row label="Command">
        <span className="font-mono text-xs">{detail.command || "—"}</span>
      </Row>
      <Row label="Restart policy">{detail.restartPolicy}</Row>
      {detail.restartCount > 0 && <Row label="Restarts">{detail.restartCount}</Row>}
      {detail.project && (
        <Row label="Compose">
          {detail.project}
          {detail.service ? ` · ${detail.service}` : ""}
        </Row>
      )}
      {detail.composeFiles.length > 0 && (
        <Row label="Compose file">
          {detail.composeFiles.map((f) => (
            <div key={f} className="font-mono text-xs">
              {f}
            </div>
          ))}
        </Row>
      )}
      <Row label="Ports">
        {detail.ports.length === 0 ? (
          <span className="text-muted-foreground">None published</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {detail.ports.map((p, i) => (
              <Badge key={i} variant="outline" className="font-mono">
                {p.publicPort ? `${p.publicPort}→` : ""}
                {p.privatePort}/{p.type}
              </Badge>
            ))}
          </div>
        )}
      </Row>
      {detail.env.length > 0 && (
        <Row label="Environment">
          <div className="space-y-0.5">
            {detail.env.map((e) => (
              <div key={e.key} className="font-mono text-xs">
                <span className="text-foreground">{e.key}</span>
                <span className="text-muted-foreground">={e.masked || '""'}</span>
              </div>
            ))}
            <p className="text-muted-foreground pt-1 text-[11px] italic">
              Values are masked for safety.
            </p>
          </div>
        </Row>
      )}
    </div>
  );
}

/* ----------------------------------- Logs ---------------------------------- */

function LogsTab({ id }: { id: string }) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoscroll, setAutoscroll] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const l = await fetchLogs(id, 500);
      setLines(l);
    } catch {
      /* keep previous */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), LOGS_POLL);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (autoscroll && boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [lines, autoscroll]);

  return (
    <div className="flex h-full min-h-[50vh] flex-col">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs">
          {loading ? "Loading…" : `${lines.length} lines · last 500`}
        </span>
        <div className="flex items-center gap-1">
          <label className="text-muted-foreground flex cursor-pointer items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={autoscroll}
              onChange={(e) => setAutoscroll(e.target.checked)}
              className="accent-primary size-3.5"
            />
            Auto-scroll
          </label>
          <Button size="icon-sm" variant="ghost" onClick={() => void load()} aria-label="Refresh logs">
            <RefreshCw className={cn(loading && "animate-spin")} />
          </Button>
        </div>
      </div>
      <div
        ref={boxRef}
        className="bg-muted/40 flex-1 overflow-auto rounded-lg border p-3 font-mono text-xs leading-relaxed"
      >
        {loading && lines.length === 0 ? (
          <span className="text-muted-foreground">Fetching logs…</span>
        ) : lines.length === 0 ? (
          <span className="text-muted-foreground">No log output.</span>
        ) : (
          lines.map((l, i) => (
            <div key={i} className="whitespace-pre-wrap break-all">
              {l.timestamp && (
                <span className="text-muted-foreground/60 mr-2 select-none">
                  {l.timestamp.slice(11, 19)}
                </span>
              )}
              <span className={l.stream === "stderr" ? "text-destructive" : "text-foreground/90"}>
                {l.text}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Volumes --------------------------------- */

function VolumesTab({ detail }: { detail: Detail | null }) {
  if (!detail) return <LoadingBlock />;
  if (detail.mounts.length === 0)
    return <p className="text-muted-foreground text-sm">No mounts or volumes.</p>;
  return (
    <div className="space-y-3">
      {detail.mounts.map((m, i) => (
        <div key={i} className="rounded-lg border p-3 text-sm">
          <div className="mb-1.5 flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {m.type}
            </Badge>
            {m.name && <span className="font-mono text-xs">{m.name}</span>}
            <Badge variant={m.rw ? "outline" : "warning"} className="ml-auto">
              {m.rw ? "rw" : "ro"}
            </Badge>
          </div>
          <div className="font-mono text-xs">
            <div className="text-muted-foreground break-all">{m.source || "—"}</div>
            <div className="text-primary">→ {m.destination}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------- Networks -------------------------------- */

function NetworksTab({ detail }: { detail: Detail | null }) {
  if (!detail) return <LoadingBlock />;
  if (detail.networks.length === 0)
    return <p className="text-muted-foreground text-sm">Not attached to any network.</p>;
  return (
    <div className="space-y-3">
      {detail.networks.map((n) => (
        <div key={n.name} className="rounded-lg border p-3 text-sm">
          <div className="mb-2 flex items-center gap-2">
            <Network className="text-primary size-4" />
            <span className="font-medium">{n.name}</span>
          </div>
          <dl className="grid grid-cols-3 gap-x-3 gap-y-1 font-mono text-xs">
            {n.ipAddress && <NetRow label="IP" value={n.ipAddress} />}
            {n.gateway && <NetRow label="Gateway" value={n.gateway} />}
            {n.macAddress && <NetRow label="MAC" value={n.macAddress} />}
            {n.aliases.length > 0 && <NetRow label="Aliases" value={n.aliases.join(", ")} />}
          </dl>
        </div>
      ))}
    </div>
  );
}

function NetRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2 flex items-center gap-1.5 break-all">
        {value}
        <button
          onClick={() => {
            navigator.clipboard?.writeText(value).then(
              () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              },
              () => {},
            );
          }}
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        </button>
      </dd>
    </>
  );
}

function LoadingBlock() {
  return (
    <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
      <Loader2 className="size-4 animate-spin" /> Loading…
    </div>
  );
}
