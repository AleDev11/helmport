import type { APIRoute } from "astro";
import { getDiskUsage, getHostInfo, listContainers } from "@/lib/docker";

export const prerender = false;

/** Aggregate snapshot for the dashboard: host, disk usage and containers. */
export const GET: APIRoute = async () => {
  try {
    const [host, disk, containers] = await Promise.all([
      getHostInfo(),
      getDiskUsage(),
      listContainers(),
    ]);

    return new Response(JSON.stringify({ host, disk, containers }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reach Docker";
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
};
