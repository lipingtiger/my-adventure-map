import { supabaseUrl } from "../config/supabase";

export function adminUrl(action: string) {
  return window.location.hostname.endsWith("chatgpt.site") ? `/api/admin-tools/${action}`
    : `${supabaseUrl.replace(/\/$/, "")}/functions/v1/admin-tools/${action}`;
}

export async function adminRequest(action: string, token: string, body: unknown) {
  const isForm = body instanceof FormData;
  const response = await fetch(adminUrl(action), {
    method: "POST", headers: { Authorization: `Bearer ${token}`, ...(isForm ? {} : { "Content-Type": "application/json" }) },
    body: isForm ? body : JSON.stringify(body), signal: AbortSignal.timeout(60_000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  if (action !== "admin-session") window.dispatchEvent(new Event("map-data-changed"));
  return data;
}
