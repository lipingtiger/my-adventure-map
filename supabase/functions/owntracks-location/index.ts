import { createClient } from "npm:@supabase/supabase-js@2";

type OwnTracksPayload = {
  _type?: string;
  acc?: number;
  alt?: number;
  batt?: number;
  cog?: number;
  lat?: number;
  lon?: number;
  tid?: string;
  topic?: string;
  tst?: number;
  vel?: number;
};

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, content-type, x-owntracks-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected server error";
}

function getBasicCredentials(authHeader: string | null) {
  if (!authHeader?.startsWith("Basic ")) {
    return null;
  }

  let decoded: string;

  try {
    decoded = atob(authHeader.slice("Basic ".length));
  } catch {
    return null;
  }

  const separatorIndex = decoded.indexOf(":");

  if (separatorIndex === -1) {
    return null;
  }

  return {
    password: decoded.slice(separatorIndex + 1),
    username: decoded.slice(0, separatorIndex),
  };
}

function isAuthorized(req: Request) {
  const trackerToken = Deno.env.get("OWNTRACKS_TRACKER_TOKEN");
  const suppliedToken = req.headers.get("x-owntracks-token") ?? req.headers.get("authorization")?.replace("Bearer ", "");

  if (trackerToken && suppliedToken === trackerToken) {
    return true;
  }

  const username = Deno.env.get("OWNTRACKS_HTTP_USERNAME");
  const password = Deno.env.get("OWNTRACKS_HTTP_PASSWORD");
  const basicCredentials = getBasicCredentials(req.headers.get("authorization"));

  return Boolean(username && password && basicCredentials?.username === username && basicCredentials.password === password);
}

function getTrackerId(payload: OwnTracksPayload, url: URL) {
  return (
    url.searchParams.get("tracker_id") ??
    url.searchParams.get("d") ??
    payload.tid ??
    payload.topic?.split("/").filter(Boolean).slice(-1)[0] ??
    "primary"
  );
}

function getSecretKeys() {
  try {
    return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

async function handleOwnTracksRequest(req: Request) {
  if (req.method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!isAuthorized(req)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const rawBody = await req.text();

  if (!rawBody.trim()) {
    return jsonResponse({ ignored: true, reason: "Empty OwnTracks payload" });
  }

  let payload: OwnTracksPayload;

  try {
    payload = JSON.parse(rawBody) as OwnTracksPayload;
  } catch {
    return jsonResponse({ error: "Invalid JSON payload" }, 400);
  }

  if (payload._type !== "location") {
    return jsonResponse({ ignored: true, reason: "Not a location payload" });
  }

  if (typeof payload.lat !== "number" || typeof payload.lon !== "number") {
    return jsonResponse({ error: "Payload must include numeric lat and lon" }, 400);
  }

  const url = new URL(req.url);
  const journeyId = url.searchParams.get("journey_id") ?? Deno.env.get("DEFAULT_JOURNEY_ID") ?? "toronto-seattle-2026";
  const trackerId = getTrackerId(payload, url);
  const recordedAt = payload.tst ? new Date(payload.tst * 1000).toISOString() : new Date().toISOString();
  const secretKeys = getSecretKeys();
  const serviceRoleKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!serviceRoleKey) {
    return jsonResponse({ error: "Missing Supabase service role key" }, 500);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);
  const locationRow = {
    accuracy_m: payload.acc ?? null,
    altitude_m: payload.alt ?? null,
    battery_percent: payload.batt ?? null,
    heading_degrees: payload.cog ?? null,
    journey_id: journeyId,
    latitude: payload.lat,
    longitude: payload.lon,
    raw_payload: payload,
    recorded_at: recordedAt,
    sharing_enabled: true,
    source: "owntracks",
    speed_mps: payload.vel ?? null,
    tracker_id: trackerId,
  };
  const { error } = await supabase.from("live_locations").upsert(locationRow, { onConflict: "journey_id,tracker_id" });

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  const { error: historyError } = await supabase
    .from("live_location_history")
    .upsert(locationRow, { ignoreDuplicates: true, onConflict: "journey_id,tracker_id,recorded_at" });

  if (historyError) {
    console.error("Unable to write live location history", historyError);

    return jsonResponse({
      historyWarning: historyError.message,
      journeyId,
      ok: true,
      recordedAt,
      trackerId,
    });
  }

  return jsonResponse({ journeyId, ok: true, recordedAt, trackerId });
}

Deno.serve(async (req) => {
  try {
    return await handleOwnTracksRequest(req);
  } catch (error) {
    console.error("OwnTracks endpoint failed", error);

    return jsonResponse({ error: getErrorMessage(error), ok: false }, 500);
  }
});
