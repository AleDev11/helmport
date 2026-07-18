import type {
  ActionResult,
  ContainerAction,
  ContainerDetail,
  ContainerStats,
  ContainerSummary,
  DiskUsage,
  HostInfo,
  LogLine,
} from "@/lib/types";

export interface Overview {
  host: HostInfo;
  disk: DiskUsage;
  containers: ContainerSummary[];
}

async function asJson<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function fetchOverview(signal?: AbortSignal): Promise<Overview> {
  return asJson<Overview>(await fetch("/api/overview", { signal }));
}

export async function fetchStats(
  ids?: string[],
  signal?: AbortSignal,
): Promise<Record<string, ContainerStats>> {
  const qs = ids?.length ? `?ids=${encodeURIComponent(ids.join(","))}` : "";
  const data = await asJson<{ stats: Record<string, ContainerStats> }>(
    await fetch(`/api/stats${qs}`, { signal }),
  );
  return data.stats;
}

export async function fetchDetail(
  id: string,
  signal?: AbortSignal,
): Promise<ContainerDetail> {
  return asJson<ContainerDetail>(await fetch(`/api/containers/${id}`, { signal }));
}

export async function fetchLogs(
  id: string,
  tail = 400,
  signal?: AbortSignal,
): Promise<LogLine[]> {
  const data = await asJson<{ lines: LogLine[] }>(
    await fetch(`/api/containers/${id}/logs?tail=${tail}`, { signal }),
  );
  return data.lines;
}

export async function runAction(
  id: string,
  action: ContainerAction,
): Promise<ActionResult> {
  return asJson<ActionResult>(
    await fetch(`/api/containers/${id}/action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    }),
  );
}
