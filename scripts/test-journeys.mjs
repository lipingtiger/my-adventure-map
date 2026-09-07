import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function moduleUrl(path, imports = {}) {
  let source = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  for (const [key, value] of Object.entries(imports)) source = source.replaceAll(key, value);
  return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
}
const sharedUrl = moduleUrl("supabase/functions/_shared/routes.ts");
const { directLines, distanceKm, routingProfile, routeKey } = await import(sharedUrl);
const { journeyRoute } = await import(moduleUrl("supabase/functions/admin-tools/routes.ts", { "../_shared/routes.ts": sharedUrl }));
const { manageJourney } = await import(moduleUrl("supabase/functions/admin-tools/journeys.ts"));

test("world routes split in both directions at the date line", () => {
  for (const points of [[[35, 170], [45, -170]], [[45, -170], [35, 170]]]) {
    const lines = directLines(points);
    assert.equal(lines.length, 2);
    assert.equal(lines[0][1][0], 40);
    for (const line of lines) assert.ok(Math.abs(line[0][1] - line[1][1]) <= 180);
  }
  assert.deepEqual(directLines([[10, 20], [20, 30]]), [[[10, 20], [20, 30]]]);
});
test("distance remains finite at identical and antipodal positions", () => {
  assert.equal(distanceKm({latitude: 0, longitude: 0}, {latitude: 0, longitude: 0}), 0);
  assert.ok(Math.abs(distanceKm({latitude: 0, longitude: 0}, {latitude: 0, longitude: 180}) - 20015) < 1);
});
test("transport determines routing profile and cache identity", () => {
  assert.equal(routingProfile("walking"), "foot-walking");
  assert.equal(routingProfile("bicycle"), "cycling-regular");
  assert.equal(routingProfile("car"), "driving-car");
  assert.equal(routingProfile("boat"), undefined);
  assert.equal(routingProfile("airplane"), undefined);
  const a = {latitude: 1, longitude: 2}, b = {latitude: 3, longitude: 4};
  assert.notEqual(routeKey("one", a, b), routeKey("two", a, b));
  assert.notEqual(routeKey("one", a, b), routeKey("one", a, {...b, transportation: "walking"}));
  assert.notEqual(routeKey("one", a, b), routeKey("one", a, {...b, latitude: 5}));
});
function dbStub(stops, cached = null) {
  let saved = null;
  return { get saved() { return saved; }, from(table) {
    let id;
    const chain = {
      select() { return this; }, eq(key, value) { if (key === "stop_id") id = value; return this; },
      gt() { return this; }, order() { return this; }, limit() { return this; },
      async single() { return { data: stops.find((item) => item.stop_id === id) }; },
      async maybeSingle() { return { data: table === "journey_route_cache" ? cached : stops[1] }; },
      async upsert(value) { saved = value; return { error: null }; },
    };
    return chain;
  } };
}
test("cached geometry is reused without a routing request", async () => {
  const db = dbStub([{stop_id:"a",sort_order:0,latitude:0,longitude:0}, {stop_id:"b",sort_order:1,latitude:1,longitude:1,transportation:"car"}],
    {positions:[[0,0],[1,1]],distance_km:160});
  const result = await journeyRoute({journeyId:"trip",startStopId:"a",endStopId:"b"}, db);
  assert.equal(result.distance_km, 160); assert.equal(db.saved, null);
});
test("a reordered endpoint cannot receive stale cached geometry", async () => {
  const db = dbStub([{stop_id:"a",sort_order:0,latitude:0,longitude:0}, {stop_id:"c",sort_order:1,latitude:1,longitude:1}]);
  await assert.rejects(() => journeyRoute({journeyId:"trip",startStopId:"a",endStopId:"b"}, db), /changed/);
});
test("air routes use direct distance and persist it", async () => {
  const db = dbStub([{stop_id:"a",sort_order:0,latitude:0,longitude:0}, {stop_id:"b",sort_order:1,latitude:0,longitude:1,transportation:"airplane"}]);
  const result = await journeyRoute({journeyId:"trip",startStopId:"a",endStopId:"b"}, db);
  assert.equal(result.source, "direct"); assert.ok(result.distance_km > 111 && result.distance_km < 112);
  assert.equal(db.saved.journey_id, "trip");
});
test("create journey validates inputs and retries a conflicting share link", async () => {
  const calls = [];
  const context = {userId:"admin",supabase:{async rpc(name,args) {
    calls.push({name,args}); return {error: calls.length === 1 ? {code:"23505"} : null};
  }}};
  const input = {title:"Tokyo to Kyoto",subtitle:"Spring trip",start:{name:"Tokyo",latitude:35,longitude:139}};
  const result = await manageJourney("create-journey",input,context);
  assert.equal(calls[0].args.p_slug,"tokyo-to-kyoto");
  assert.match(result.slug,/^tokyo-to-kyoto-/);
  assert.equal(calls[0].args.p_id,calls[1].args.p_id);
  await assert.rejects(() => manageJourney("create-journey",{...input,start:{...input.start,latitude:91}},context),/coordinates/);
});
test("journey deletion uses the transaction RPC and never removes storage", async () => {
  let called;
  await manageJourney("delete-journey",{journeyId:"trip"},{userId:"admin",supabase:{async rpc(name,args) { called={name,args}; return {error:null}; }}});
  assert.deepEqual(called,{name:"delete_map_journey",args:{p_id:"trip"}});
});
