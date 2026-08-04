type PublicEnvKey = "VITE_ORS_API_KEY" | "VITE_SUPABASE_ANON_KEY" | "VITE_SUPABASE_URL";

function getRuntimeEnv() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.__MY_ADVENTURE_MAP_ENV__;
}

export function getPublicEnv(key: PublicEnvKey) {
  return getRuntimeEnv()?.[key] ?? import.meta.env[key] ?? "";
}
