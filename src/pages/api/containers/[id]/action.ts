import type { APIRoute } from "astro";
import { performAction } from "@/lib/docker";
import type { ContainerAction } from "@/lib/types";

export const prerender = false;

const ALLOWED: ContainerAction[] = ["start", "stop", "restart"];
// Docker IDs are 64-char hex; accept short (12) form too.
const ID_RE = /^[a-f0-9]{12,64}$/i;

/**
 * Reject cross-site POSTs (defence-in-depth alongside Astro's checkOrigin).
 * We compare the browser Origin against the Host it actually addressed —
 * NOT request.url, whose port reflects the container's internal port when
 * behind a Docker port mapping or reverse proxy. `x-forwarded-host` takes
 * precedence so it also works behind a tunnel / reverse proxy.
 */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser client (curl, server-side)
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const POST: APIRoute = async ({ params, request }) => {
  if (!sameOrigin(request)) {
    return json({ ok: false, error: "Cross-origin request rejected" }, 403);
  }

  const id = params.id ?? "";
  if (!ID_RE.test(id)) {
    return json({ ok: false, error: "Invalid container id" }, 400);
  }

  let action: unknown;
  try {
    const body = (await request.json()) as { action?: unknown };
    action = body.action;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  if (typeof action !== "string" || !ALLOWED.includes(action as ContainerAction)) {
    return json({ ok: false, error: "Unsupported action" }, 400);
  }

  const result = await performAction(id, action as ContainerAction);
  return json(result, result.ok ? 200 : 500);
};

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
