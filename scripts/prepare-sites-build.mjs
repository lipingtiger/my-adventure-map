import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

mkdirSync("dist/.openai", { recursive: true });
mkdirSync("dist/server", { recursive: true });

copyFileSync(".openai/hosting.json", "dist/.openai/hosting.json");

function escapeInlineScript(value) {
  return value.replaceAll("</script", "<\\/script");
}

function escapeInlineStyle(value) {
  return value.replaceAll("</style", "<\\/style");
}

function inlineViteAssets(html) {
  return html
    .replace(/<link rel="stylesheet" crossorigin href="([^"]+)">/g, (_tag, href) => {
      const cssPath = join("dist", href.replace(/^\//, ""));
      const css = readFileSync(cssPath, "utf8");

      return `<style>${escapeInlineStyle(css)}</style>`;
    })
    .replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, (_tag, src) => {
      const scriptPath = join("dist", src.replace(/^\//, ""));
      const script = readFileSync(scriptPath, "utf8");

      return `<script>window.__MY_ADVENTURE_MAP_ENV__=__MY_ADVENTURE_MAP_RUNTIME_ENV__;</script><script type="module">${escapeInlineScript(script)}</script>`;
    });
}

const indexHtml = inlineViteAssets(readFileSync("dist/index.html", "utf8"));

writeFileSync(
  "dist/server/index.js",
  `const indexHtml = ${JSON.stringify(indexHtml)};

function serializeRuntimeEnv(env) {
  return JSON.stringify({
    VITE_ORS_API_KEY: env.VITE_ORS_API_KEY ?? "",
    VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY ?? "",
    VITE_SUPABASE_URL: env.VITE_SUPABASE_URL ?? "",
  }).replaceAll("<", "\\\\u003c");
}

async function fetchLiveLocation(request, env) {
  const url = new URL(request.url);
  const journeyId = url.searchParams.get("journey_id") ?? "toronto-seattle-2026";

  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
    return Response.json({ error: "Supabase environment variables are not configured" }, { status: 500 });
  }

  const params = new URLSearchParams({
    journey_id: "eq." + journeyId,
    limit: "1",
    order: "updated_at.desc",
    select:
      "accuracy_m,altitude_m,battery_percent,heading_degrees,journey_id,latitude,longitude,recorded_at,sharing_enabled,source,speed_mps,tracker_id,updated_at",
  });
  const supabaseUrl = env.VITE_SUPABASE_URL.replace(/\\/$/, "");
  const response = await fetch(supabaseUrl + "/rest/v1/live_locations?" + params.toString(), {
    headers: {
      apikey: env.VITE_SUPABASE_ANON_KEY,
      Authorization: "Bearer " + env.VITE_SUPABASE_ANON_KEY,
    },
  });

  if (!response.ok) {
    return Response.json({ error: await response.text() }, { status: response.status });
  }

  const rows = await response.json();
  const row = Array.isArray(rows) ? rows[0] ?? null : null;

  return Response.json(
    { location: row?.sharing_enabled ? row : null },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

async function fetchLiveLocationHistory(request, env) {
  const url = new URL(request.url);
  const journeyId = url.searchParams.get("journey_id") ?? "toronto-seattle-2026";
  const trackerId = url.searchParams.get("tracker_id");
  const requestedLimit = Number(url.searchParams.get("limit") ?? "1000");
  const requestedOffset = Number(url.searchParams.get("offset") ?? "0");
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.round(requestedLimit), 1), 1000) : 1000;
  const offset = Number.isFinite(requestedOffset) ? Math.max(Math.round(requestedOffset), 0) : 0;

  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
    return Response.json({ error: "Supabase environment variables are not configured" }, { status: 500 });
  }

  const params = new URLSearchParams({
    journey_id: "eq." + journeyId,
    limit: String(limit),
    offset: String(offset),
    order: "recorded_at.asc",
    select:
      "accuracy_m,altitude_m,battery_percent,created_at,heading_degrees,id,journey_id,latitude,longitude,recorded_at,sharing_enabled,source,speed_mps,tracker_id",
    sharing_enabled: "eq.true",
  });

  if (trackerId) {
    params.set("tracker_id", "eq." + trackerId);
  }

  const supabaseUrl = env.VITE_SUPABASE_URL.replace(/\\/$/, "");
  const response = await fetch(supabaseUrl + "/rest/v1/live_location_history?" + params.toString(), {
    headers: {
      apikey: env.VITE_SUPABASE_ANON_KEY,
      Authorization: "Bearer " + env.VITE_SUPABASE_ANON_KEY,
    },
  });

  if (!response.ok) {
    return Response.json({ error: await response.text() }, { status: response.status });
  }

  const rows = await response.json();

  return Response.json(
    { history: Array.isArray(rows) ? rows : [] },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/live-location") {
      return fetchLiveLocation(request, env);
    }

    if (url.pathname === "/api/live-location-history") {
      return fetchLiveLocationHistory(request, env);
    }

    const response = await env.ASSETS.fetch(request);

    if (response.status !== 404 || request.method !== "GET") {
      return response;
    }

    const accept = request.headers.get("accept") ?? "";

    if (!accept.includes("text/html")) {
      return response;
    }

    const html = indexHtml.replace("__MY_ADVENTURE_MAP_RUNTIME_ENV__", serializeRuntimeEnv(env));

    return new Response(html, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  },
};
`,
);
