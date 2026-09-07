import { useEffect, useMemo, useState } from "react";
import { Stop } from "../types";
import { adminUrl } from "../utils/admin";
import { directLines, distanceKm, routeKey, routingProfile } from "../../supabase/functions/_shared/routes";

export type RouteSegment = { id: string; positions: [number, number][]; source: "ors" | "direct" | "fallback" };
export type RouteSummary = { distanceKm?: number; durationHours?: number; estimated?: boolean };
const memoryCache = new Map<string, { positions: [number, number][]; distance_km: number; duration_hours: number | null; source: "ors" | "direct" }>();

export function useOpenRouteServiceRoute(stops: Stop[]) {
  const signature = stops.map((stop) => `${stop.id}:${stop.latitude}:${stop.longitude}:${stop.transportation || "car"}`).join("|");
  const [routeSegments, setSegments] = useState<RouteSegment[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "partial" | "fallback">("loading");
  const [summary, setSummary] = useState<RouteSummary | null>(null);
  const [errorMessage, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const segments: RouteSegment[] = [];
      let km = 0, hours = 0, failures = 0;
      let estimated = false;
      setStatus("loading"); setError(null);
      setSegments(stops.slice(1).flatMap((b, index) => directLines([[stops[index].latitude, stops[index].longitude], [b.latitude, b.longitude]])
        .map((positions, part) => ({ id: `${index}:${part}`, positions, source: "fallback" as const }))));
      for (let i = 1; i < stops.length; i++) {
        const a = stops[i - 1], b = stops[i];
        const key = routeKey(b.journeyId, a, b);
        let result: { positions: [number, number][]; distance_km: number; duration_hours: number | null; source: RouteSegment["source"] } = {
          positions: [[a.latitude, a.longitude], [b.latitude, b.longitude]], distance_km: distanceKm(a, b), duration_hours: null,
          source: routingProfile(b.transportation) ? "fallback" : "direct",
        };
        try {
          if (result.source !== "direct") {
            const cached = memoryCache.get(key);
            if (cached) result = cached;
            else {
              const response = await fetch(adminUrl("route-segment"), { method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ journeyId: b.journeyId, startStopId: a.id, endStopId: b.id }), signal: controller.signal });
              const data = await response.json();
              if (!response.ok) throw new Error(data.error);
              result = data;
              memoryCache.set(key, data);
            }
          }
        } catch {
          if (controller.signal.aborted) return;
          failures++;
        }
        km += result.distance_km;
        hours += result.duration_hours ?? 0;
        estimated ||= result.source !== "ors";
        directLines(result.positions).forEach((positions, part) => segments.push({ id: `${key}:${part}`, positions, source: result.source }));
      }
      if (controller.signal.aborted) return;
      setSegments(segments); setSummary({ distanceKm: km, durationHours: estimated ? undefined : hours, estimated });
      setStatus(failures ? "partial" : "success");
      if (failures) setError(`${failures} segment(s) unavailable; direct distance estimates shown.`);
    }
    void load();
    return () => controller.abort();
  }, [signature, stops[0]?.journeyId]);
  const routePositions = useMemo(() => routeSegments.flatMap((segment) => segment.positions), [routeSegments]);
  return { routeSegments, routePositions, status, summary, errorMessage };
}
