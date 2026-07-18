import type { APIRoute } from "astro";

export const prerender = false;

/** Lightweight liveness probe (does not touch Docker). */
export const GET: APIRoute = () =>
  new Response(JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
