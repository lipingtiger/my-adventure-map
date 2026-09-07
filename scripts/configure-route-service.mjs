import { loadEnv } from "vite";
import { execFileSync } from "node:child_process";
const env = loadEnv("development", process.cwd(), "VITE_");
if (!env.VITE_ORS_API_KEY) throw new Error("Missing routing API key in local configuration.");
execFileSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "secrets", "set",
  `ORS_API_KEY=${env.VITE_ORS_API_KEY}`, "--project-ref", "ifuzxvbpihapdtoiqeni"], { stdio: "pipe" });
console.log("Routing service configured.");
