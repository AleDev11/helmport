/**
 * Sanitized data shapes exposed to the client.
 * We deliberately never surface secrets (env vars, full mount specs,
 * command lines) to the browser — only what the dashboard needs.
 */

export type ContainerState =
  | "created"
  | "running"
  | "paused"
  | "restarting"
  | "removing"
  | "exited"
  | "dead";

export type HealthStatus = "healthy" | "unhealthy" | "starting" | "none";

export interface PortMapping {
  ip?: string;
  privatePort: number;
  publicPort?: number;
  type: string;
}

export interface ContainerSummary {
  id: string;
  name: string;
  image: string;
  imageShort: string;
  state: ContainerState;
  status: string;
  health: HealthStatus;
  createdAt: number;
  startedAt: string | null;
  ports: PortMapping[];
  /** Compose project & service, if labelled. */
  project: string | null;
  service: string | null;
  restartCount: number;
}

export interface ContainerStats {
  id: string;
  cpuPercent: number;
  memUsage: number;
  memLimit: number;
  memPercent: number;
  netRx: number;
  netTx: number;
  blkRead: number;
  blkWrite: number;
}

export interface HostInfo {
  name: string;
  containersRunning: number;
  containersStopped: number;
  containersTotal: number;
  images: number;
  ncpu: number;
  memTotal: number;
  dockerVersion: string;
  operatingSystem: string;
  kernelVersion: string;
}

export interface DiskUsage {
  imagesSize: number;
  containersSize: number;
  volumesSize: number;
  buildCacheSize: number;
  totalSize: number;
  reclaimable: number;
}

export type ContainerAction = "start" | "stop" | "restart";

export interface ActionResult {
  ok: boolean;
  action: ContainerAction;
  id: string;
  error?: string;
}
