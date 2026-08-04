import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

mkdirSync("dist/.openai", { recursive: true });
mkdirSync("dist/server", { recursive: true });

copyFileSync(".openai/hosting.json", "dist/.openai/hosting.json");

const indexHtml = readFileSync("dist/index.html", "utf8");

writeFileSync(
  "dist/server/index.js",
  `const indexHtml = ${JSON.stringify(indexHtml)};

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

    return new Response(indexHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  },
};
`,
);
