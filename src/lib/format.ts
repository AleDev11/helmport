/** Human-friendly formatting helpers. Pure functions, no side effects. */

const UNITS = ["B", "KB", "MB", "GB", "TB", "PB"];

/** Format a byte count into a human-readable string (base 1024). */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : decimals)} ${UNITS[i]}`;
}

/** Format a fractional ratio (0..1) as a percentage string. */
export function formatPercent(ratio: number, decimals = 0): string {
  if (!Number.isFinite(ratio)) return "0%";
  return `${(ratio * 100).toFixed(decimals)}%`;
}

/** Compact relative "uptime" from a unix timestamp (seconds) until now. */
export function formatUptime(startedAtIso: string | number): string {
  const start = typeof startedAtIso === "number" ? startedAtIso * 1000 : Date.parse(startedAtIso);
  if (!Number.isFinite(start) || start <= 0) return "—";
  let sec = Math.max(0, Math.floor((Date.now() - start) / 1000));
  const d = Math.floor(sec / 86400);
  sec -= d * 86400;
  const h = Math.floor(sec / 3600);
  sec -= h * 3600;
  const m = Math.floor(sec / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${sec}s`;
}

/** Normalize a docker container name (strips leading slash). */
export function cleanName(name: string): string {
  return name.replace(/^\//, "");
}

/** Strip registry/tag noise from an image reference for display. */
export function shortImage(image: string): string {
  const noDigest = image.split("@")[0];
  const parts = noDigest.split("/");
  return parts[parts.length - 1] || noDigest;
}
