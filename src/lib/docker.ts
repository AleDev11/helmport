import Docker from "dockerode";
import type {
  ActionResult,
  ContainerAction,
  ContainerDetail,
  ContainerState,
  ContainerStats,
  ContainerSummary,
  DiskUsage,
  HealthStatus,
  HostInfo,
  LogLine,
  MountInfo,
  NetworkAttachment,
  PortMapping,
} from "./types";
import { cleanName, shortImage } from "./format";

/**
 * Docker connection.
 *
 * In production we talk to a locked-down docker-socket-proxy over TCP
 * (never the raw socket), configured via env. In local dev we fall back
 * to the host unix socket if no proxy host is provided.
 */
function createDocker(): Docker {
  const host = process.env.HELMPORT_DOCKER_HOST?.trim();
  const port = Number(process.env.HELMPORT_DOCKER_PORT ?? 2375);

  if (host) {
    return new Docker({ host, port, protocol: "http" });
  }

  const socketPath = process.env.HELMPORT_DOCKER_SOCKET?.trim() || "/var/run/docker.sock";
  return new Docker({ socketPath });
}

// Reuse a single client across requests (module singleton).
const docker = createDocker();

export function getDocker(): Docker {
  return docker;
}

/** Map docker's raw state string to our typed enum. */
function normalizeState(state: string): ContainerState {
  const s = state.toLowerCase();
  const known: ContainerState[] = [
    "created",
    "running",
    "paused",
    "restarting",
    "removing",
    "exited",
    "dead",
  ];
  return (known.find((k) => k === s) ?? "exited") as ContainerState;
}

function normalizeHealth(status?: string): HealthStatus {
  if (!status) return "none";
  const m = /\((healthy|unhealthy|health: starting)\)/i.exec(status);
  if (!m) return "none";
  const v = m[1].toLowerCase();
  if (v.includes("starting")) return "starting";
  return v as HealthStatus;
}

function mapPorts(ports: Docker.Port[] | undefined): PortMapping[] {
  if (!ports?.length) return [];
  const seen = new Set<string>();
  const out: PortMapping[] = [];
  for (const p of ports) {
    const key = `${p.PrivatePort}/${p.Type}/${p.PublicPort ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      ip: p.IP,
      privatePort: p.PrivatePort,
      publicPort: p.PublicPort,
      type: p.Type,
    });
  }
  return out.sort((a, b) => (a.publicPort ?? 0) - (b.publicPort ?? 0) || a.privatePort - b.privatePort);
}

/** List all containers, sanitized for the client. */
export async function listContainers(): Promise<ContainerSummary[]> {
  const raw = await docker.listContainers({ all: true });
  return raw
    .map((c): ContainerSummary => {
      const labels = c.Labels ?? {};
      return {
        id: c.Id,
        name: cleanName(c.Names?.[0] ?? c.Id.slice(0, 12)),
        image: c.Image,
        imageShort: shortImage(c.Image),
        state: normalizeState(c.State),
        status: c.Status,
        health: normalizeHealth(c.Status),
        createdAt: c.Created,
        startedAt: null,
        ports: mapPorts(c.Ports),
        project: labels["com.docker.compose.project"] ?? null,
        service: labels["com.docker.compose.service"] ?? null,
        restartCount: 0,
      };
    })
    .sort((a, b) => {
      // Running first, then by project, then by name.
      if (a.state === "running" && b.state !== "running") return -1;
      if (b.state === "running" && a.state !== "running") return 1;
      const p = (a.project ?? "").localeCompare(b.project ?? "");
      if (p !== 0) return p;
      return a.name.localeCompare(b.name);
    });
}

/**
 * Compute CPU/memory/net/block stats for a single container.
 * Uses a one-shot (stream: false) sample which already contains the
 * pre-read needed to derive CPU %.
 */
export async function getContainerStats(id: string): Promise<ContainerStats | null> {
  try {
    const container = docker.getContainer(id);
    const s = (await container.stats({ stream: false })) as Docker.ContainerStats;

    const cpuDelta =
      s.cpu_stats.cpu_usage.total_usage - (s.precpu_stats.cpu_usage?.total_usage ?? 0);
    const systemDelta =
      (s.cpu_stats.system_cpu_usage ?? 0) - (s.precpu_stats.system_cpu_usage ?? 0);
    const onlineCpus =
      s.cpu_stats.online_cpus || s.cpu_stats.cpu_usage.percpu_usage?.length || 1;
    const cpuPercent =
      systemDelta > 0 && cpuDelta > 0 ? (cpuDelta / systemDelta) * onlineCpus * 100 : 0;

    // Docker over-reports memory; subtract cache when present.
    const cache = s.memory_stats.stats?.cache ?? s.memory_stats.stats?.["inactive_file"] ?? 0;
    const memUsage = Math.max(0, (s.memory_stats.usage ?? 0) - cache);
    const memLimit = s.memory_stats.limit ?? 0;
    const memPercent = memLimit > 0 ? (memUsage / memLimit) * 100 : 0;

    let netRx = 0;
    let netTx = 0;
    for (const iface of Object.values(s.networks ?? {})) {
      netRx += iface.rx_bytes ?? 0;
      netTx += iface.tx_bytes ?? 0;
    }

    let blkRead = 0;
    let blkWrite = 0;
    for (const entry of s.blkio_stats?.io_service_bytes_recursive ?? []) {
      if (entry.op?.toLowerCase() === "read") blkRead += entry.value;
      if (entry.op?.toLowerCase() === "write") blkWrite += entry.value;
    }

    return {
      id,
      cpuPercent: Math.round(cpuPercent * 100) / 100,
      memUsage,
      memLimit,
      memPercent: Math.round(memPercent * 100) / 100,
      netRx,
      netTx,
      blkRead,
      blkWrite,
    };
  } catch {
    return null;
  }
}

/** Stats for many containers, computed in parallel with a concurrency cap. */
export async function getStatsFor(ids: string[]): Promise<Record<string, ContainerStats>> {
  const out: Record<string, ContainerStats> = {};
  const CONCURRENCY = 6;
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((id) => getContainerStats(id)));
    results.forEach((r) => {
      if (r) out[r.id] = r;
    });
  }
  return out;
}

/** Host / daemon summary. */
export async function getHostInfo(): Promise<HostInfo> {
  const info = await docker.info();
  return {
    name: info.Name ?? "docker",
    containersRunning: info.ContainersRunning ?? 0,
    containersStopped: info.ContainersStopped ?? 0,
    containersTotal: info.Containers ?? 0,
    images: info.Images ?? 0,
    ncpu: info.NCPU ?? 0,
    memTotal: info.MemTotal ?? 0,
    dockerVersion: info.ServerVersion ?? "",
    operatingSystem: info.OperatingSystem ?? "",
    kernelVersion: info.KernelVersion ?? "",
  };
}

/** Aggregate disk usage across images, containers, volumes and build cache. */
export async function getDiskUsage(): Promise<DiskUsage> {
  const df = (await docker.df()) as {
    LayersSize?: number;
    Images?: Array<{ Size?: number; SharedSize?: number }>;
    Containers?: Array<{ SizeRw?: number }>;
    Volumes?: Array<{ UsageData?: { Size?: number } }>;
    BuildCache?: Array<{ Size?: number; InUse?: boolean }>;
  };

  const imagesSize = df.LayersSize ?? (df.Images ?? []).reduce((a, i) => a + (i.Size ?? 0), 0);
  const containersSize = (df.Containers ?? []).reduce((a, c) => a + (c.SizeRw ?? 0), 0);
  const volumesSize = (df.Volumes ?? []).reduce((a, v) => a + (v.UsageData?.Size ?? 0), 0);
  const buildCacheSize = (df.BuildCache ?? []).reduce((a, b) => a + (b.Size ?? 0), 0);
  const reclaimable = (df.BuildCache ?? [])
    .filter((b) => !b.InUse)
    .reduce((a, b) => a + (b.Size ?? 0), 0);

  const totalSize = imagesSize + containersSize + volumesSize + buildCacheSize;
  return { imagesSize, containersSize, volumesSize, buildCacheSize, totalSize, reclaimable };
}

/** Detailed, sanitized inspect for a single container. */
export async function inspectContainer(id: string): Promise<ContainerDetail | null> {
  try {
    const info = await docker.getContainer(id).inspect();
    const labels = info.Config?.Labels ?? {};
    const state = normalizeState(info.State?.Status ?? "exited");

    const ports: PortMapping[] = [];
    const portBindings = info.NetworkSettings?.Ports ?? {};
    for (const [key, binds] of Object.entries(portBindings)) {
      const [priv, type] = key.split("/");
      if (binds && binds.length) {
        for (const b of binds) {
          ports.push({
            ip: b.HostIp,
            privatePort: Number(priv),
            publicPort: Number(b.HostPort),
            type: type ?? "tcp",
          });
        }
      } else {
        ports.push({ privatePort: Number(priv), type: type ?? "tcp" });
      }
    }

    const mounts: MountInfo[] = (info.Mounts ?? []).map((m) => ({
      type: m.Type ?? "bind",
      name: m.Name ?? null,
      source: m.Source ?? "",
      destination: m.Destination ?? "",
      mode: m.Mode ?? "",
      rw: m.RW ?? true,
    }));

    const networks: NetworkAttachment[] = Object.entries(
      info.NetworkSettings?.Networks ?? {},
    ).map(([name, n]) => ({
      name,
      ipAddress: n.IPAddress ?? "",
      gateway: n.Gateway ?? "",
      macAddress: n.MacAddress ?? "",
      aliases: n.Aliases ?? [],
    }));

    // Env: expose keys, mask values (never leak secrets to the browser).
    const env = (info.Config?.Env ?? []).map((e) => {
      const idx = e.indexOf("=");
      const key = idx >= 0 ? e.slice(0, idx) : e;
      const value = idx >= 0 ? e.slice(idx + 1) : "";
      return { key, masked: value ? "••••••••" : "" };
    });

    const composeFiles = (labels["com.docker.compose.project.config_files"] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      id: info.Id,
      name: cleanName(info.Name ?? id.slice(0, 12)),
      image: info.Config?.Image ?? "",
      imageShort: shortImage(info.Config?.Image ?? ""),
      state,
      status: info.State?.Status ?? "",
      health: normalizeHealth(
        info.State?.Health?.Status ? `(${info.State.Health.Status})` : undefined,
      ),
      createdAt: Date.parse(info.Created ?? "") / 1000 || 0,
      startedAt: info.State?.StartedAt ?? null,
      ports: ports.sort((a, b) => (a.publicPort ?? 0) - (b.publicPort ?? 0)),
      project: labels["com.docker.compose.project"] ?? null,
      service: labels["com.docker.compose.service"] ?? null,
      restartCount: info.RestartCount ?? 0,
      command: [info.Path, ...(info.Args ?? [])].filter(Boolean).join(" "),
      restartPolicy: info.HostConfig?.RestartPolicy?.Name || "no",
      env,
      labels: Object.entries(labels).map(([key, value]) => ({ key, value })),
      mounts,
      networks,
      composeFiles,
      workingDir: info.Config?.WorkingDir ?? "",
      logPath: info.LogPath ?? null,
    };
  } catch {
    return null;
  }
}

/** Parse Docker's multiplexed log stream buffer into typed lines. */
function parseLogBuffer(buf: Buffer): LogLine[] {
  const lines: LogLine[] = [];
  const pushRaw = (stream: LogLine["stream"], raw: string) => {
    for (const part of raw.split("\n")) {
      if (!part) continue;
      const sp = part.indexOf(" ");
      const maybeTs = sp > 0 ? part.slice(0, sp) : "";
      const isTs = /^\d{4}-\d{2}-\d{2}T/.test(maybeTs);
      lines.push({
        stream,
        timestamp: isTs ? maybeTs : "",
        text: isTs ? part.slice(sp + 1) : part,
      });
    }
  };

  // Multiplexed frames have an 8-byte header: [type,0,0,0, len(4 BE)].
  let offset = 0;
  let looksMultiplexed = true;
  while (offset + 8 <= buf.length) {
    const type = buf[offset];
    if (type !== 1 && type !== 2) {
      looksMultiplexed = false;
      break;
    }
    const len = buf.readUInt32BE(offset + 4);
    if (offset + 8 + len > buf.length) {
      looksMultiplexed = false;
      break;
    }
    const payload = buf.toString("utf8", offset + 8, offset + 8 + len);
    pushRaw(type === 2 ? "stderr" : "stdout", payload);
    offset += 8 + len;
  }

  if (!looksMultiplexed || lines.length === 0) {
    // TTY / raw stream: treat the whole buffer as text.
    lines.length = 0;
    pushRaw("stdout", buf.toString("utf8"));
  }
  return lines;
}

/** Fetch the last `tail` log lines for a container. */
export async function getLogs(id: string, tail = 400): Promise<LogLine[]> {
  const container = docker.getContainer(id);
  const buf = (await container.logs({
    follow: false,
    stdout: true,
    stderr: true,
    tail: Math.max(1, Math.min(tail, 2000)),
    timestamps: true,
  })) as unknown as Buffer;
  return parseLogBuffer(Buffer.isBuffer(buf) ? buf : Buffer.from(buf));
}

const ALLOWED_ACTIONS: ContainerAction[] = ["start", "stop", "restart"];

/**
 * Perform a lifecycle action on a container.
 * Only start/stop/restart are permitted — no exec, no removal.
 */
export async function performAction(
  id: string,
  action: ContainerAction,
): Promise<ActionResult> {
  if (!ALLOWED_ACTIONS.includes(action)) {
    return { ok: false, action, id, error: "Action not allowed" };
  }
  try {
    const container = docker.getContainer(id);
    switch (action) {
      case "start":
        await container.start();
        break;
      case "stop":
        await container.stop({ t: 10 });
        break;
      case "restart":
        await container.restart({ t: 10 });
        break;
    }
    return { ok: true, action, id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // Docker returns 304 when already in target state — treat as success.
    if (/304|already/i.test(message)) return { ok: true, action, id };
    return { ok: false, action, id, error: message };
  }
}
