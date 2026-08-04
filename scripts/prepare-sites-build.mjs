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

export default {
  async fetch(request, env) {
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
