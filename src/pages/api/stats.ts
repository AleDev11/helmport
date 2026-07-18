import type { APIRoute } from "astro";
import { getStatsFor, listContainers } from "@/lib/docker";

export const prerender = false;

/**
 * Live resource stats for running containers.
 * Optionally accepts ?ids=a,b,c to limit the sample; otherwise samples
 * every running container.
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    const idsParam = url.searchParams.get("ids");
    let ids: string[];

    if (idsParam) {
      ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 100);
    } else {
      const containers = await listContainers();
      ids = containers.filter((c) => c.state === "running").map((c) => c.id);
    }

    const stats = await getStatsFor(ids);
    return new Response(JSON.stringify({ stats }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to sample stats";
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
};
