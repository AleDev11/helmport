import type { APIRoute } from "astro";
import { inspectContainer } from "@/lib/docker";

export const prerender = false;

const ID_RE = /^[a-f0-9]{12,64}$/i;

/** Detailed, sanitized inspect for one container. */
export const GET: APIRoute = async ({ params }) => {
  const id = params.id ?? "";
  if (!ID_RE.test(id)) {
    return json({ error: "Invalid container id" }, 400);
  }
  try {
    const detail = await inspectContainer(id);
    if (!detail) return json({ error: "Container not found" }, 404);
    return json(detail, 200);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Inspect failed" }, 502);
  }
};

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
