import { loadEnv } from "vite";
import assert from "node:assert/strict";
const env = loadEnv("development", process.cwd(), "VITE_");
const base = env.VITE_SUPABASE_URL;
const headers = { apikey: env.VITE_SUPABASE_ANON_KEY };
async function rows(table, select, order = "id") {
  const result = [];
  for (let offset = 0; ; offset += 1000) {
    const params = new URLSearchParams({ select, order, offset: String(offset), limit: "1000" });
    const response = await fetch(`${base}/rest/v1/${table}?${params}`, { headers, signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200, `${table} must be readable`);
    const page = await response.json(); result.push(...page);
    if (page.length < 1000) return result;
  }
}
const journeys = await rows("journey_settings", "journey_id,slug,title,status", "journey_id");
const stops = await rows("journey_stops", "journey_id,stop_id,sort_order,transportation", "sort_order");
const photos = await rows("journey_photos", "id,journey_id,latitude,longitude,is_highlight,thumbnail_url");
const videos = await rows("journey_video_links", "id,journey_id,latitude,longitude,is_highlight,thumbnail_url");
assert.ok(journeys.every((journey) => journey.slug && journey.title));
assert.ok(journeys.filter((journey) => journey.status === "active").length <= 1);
assert.ok(stops.every((stop) => journeys.some((journey) => journey.journey_id === stop.journey_id)));
for (const item of [...photos, ...videos]) assert.equal(item.latitude === null, item.longitude === null);
console.log(`Database read checks passed: ${journeys.length} journeys, ${stops.length} stops, ${photos.length} photos, ${videos.length} videos.`);
const unauthorized = await fetch(`${base}/functions/v1/admin-tools/delete-journey`, {
  method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: "{}",
});
assert.equal(unauthorized.status, 401); console.log("Admin writes reject unauthenticated requests.");
const tracking = await fetch(`${base}/functions/v1/owntracks-location`, {
  method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: "{}",
});
assert.equal(tracking.status, 401); console.log("Location ingestion rejects unauthenticated requests.");
for (const journey of journeys.slice(0, 1)) {
  const own = stops.filter((stop) => stop.journey_id === journey.journey_id);
  if (own.length < 2) continue;
  const request = () => fetch(`${base}/functions/v1/admin-tools/route-segment`, { method: "POST",
    headers: { ...headers, "Content-Type": "application/json" }, signal: AbortSignal.timeout(25000),
    body: JSON.stringify({journeyId:journey.journey_id,startStopId:own[0].stop_id,endStopId:own[1].stop_id}) });
  const first = await request();
  const route = await first.json();
  assert.equal(first.status, 200, route.error);
  assert.ok(route.positions.length >= 2);
  const second = await request(); const cached = await second.json();
  assert.equal(second.status, 200); assert.deepEqual(cached.positions, route.positions);
  console.log(`Live route and cache checks passed (${Math.round(route.distance_km)} km).`);
}
