import type { APIRoute } from "astro";
import { getLogs } from "@/lib/docker";

export const prerender = false;

const ID_RE = /^[a-f0-9]{12,64}$/i;

/** Last N log lines for a container. `?tail=` (default 400, max 2000). */
export const GET: APIRoute = async ({ params, url }) => {
  const id = params.id ?? "";
  if (!ID_RE.test(id)) {
    return json({ error: "Invalid container id" }, 400);
  }
  const tail = Number(url.searchParams.get("tail") ?? 400);
  try {
    const lines = await getLogs(id, Number.isFinite(tail) ? tail : 400);
    return json({ lines }, 200);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Logs failed" }, 502);
  }
};

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
