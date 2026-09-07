import type { createClient } from "npm:@supabase/supabase-js@2";
import { distanceKm, routeKey, routingProfile } from "../_shared/routes.ts";

export async function journeyRoute(body: any, db: ReturnType<typeof createClient>) {
  if (!body.journeyId || !body.startStopId || !body.endStopId) throw new Error("Choose a journey route segment.");
  const { data: a, error } = await db.from("journey_stops").select("*")
    .eq("journey_id", body.journeyId).eq("stop_id", body.startStopId).single();
  if (error) throw error;
  const { data: b } = await db.from("journey_stops").select("*").eq("journey_id", body.journeyId)
    .gt("sort_order", a.sort_order).order("sort_order").limit(1).maybeSingle();
  if (!b || b.stop_id !== body.endStopId) throw new Error("Route stops changed. Refresh the journey.");
  const key = routeKey(body.journeyId, a, b);
  const { data: cached } = await db.from("journey_route_cache").select("*").eq("route_key", key).maybeSingle();
  if (cached) return { ...cached, source: routingProfile(b.transportation) ? "ors" : "direct" };
  const profile = routingProfile(b.transportation);
  let result = { positions: [[a.latitude, a.longitude], [b.latitude, b.longitude]],
    distance_km: distanceKm(a, b), duration_hours: null as number | null };
  if (profile && result.distance_km > 0) {
    const apiKey = Deno.env.get("ORS_API_KEY");
    if (!apiKey) throw new Error("Route calculation is not configured.");
    const response = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}/geojson`, {
      method: "POST", headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ coordinates: [[a.longitude, a.latitude], [b.longitude, b.latitude]], instructions: false }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error("Route unavailable. A direct estimate is shown.");
    const feature = (await response.json()).features?.[0];
    if (!feature?.geometry?.coordinates?.length) throw new Error("Route unavailable.");
    result = { positions: feature.geometry.coordinates.map(([lng, lat]: number[]) => [lat, lng]),
      distance_km: feature.properties.summary.distance / 1000,
      duration_hours: feature.properties.summary.duration / 3600 };
  }
  const { error: saveError } = await db.from("journey_route_cache").upsert({ ...result, route_key: key, journey_id: body.journeyId });
  if (saveError) throw saveError;
  return { ...result, source: profile ? "ors" : "direct" };
}
