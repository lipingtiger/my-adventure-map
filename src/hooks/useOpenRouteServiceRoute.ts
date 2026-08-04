import { useEffect, useMemo, useState } from "react";
import {
  hasOpenRouteServiceApiKey,
  openRouteServiceApiKey,
  openRouteServiceDirectionsUrl,
} from "../config/openRouteService";
import { Stop } from "../types";

type RouteStatus = "idle" | "loading" | "success" | "partial" | "fallback";

type OpenRouteServiceFeatureCollection = {
  features?: Array<{
    geometry?: {
      coordinates?: [number, number][];
    };
    properties?: {
      summary?: {
        distance?: number;
        duration?: number;
      };
    };
  }>;
};

export type RouteSegment = {
  id: string;
  positions: [number, number][];
  source: "ors" | "fallback";
};

export type RouteSummary = {
  distanceKm?: number;
  durationHours?: number;
};

function toLeafletPositions(coordinates: [number, number][]) {
  return coordinates.map(([longitude, latitude]) => [latitude, longitude] as [number, number]);
}

function toFallbackSegment(startStop: Stop, endStop: Stop): [number, number][] {
  return [
    [startStop.latitude, startStop.longitude],
    [endStop.latitude, endStop.longitude],
  ];
}

function getFallbackSegments(stops: Stop[]): RouteSegment[] {
  return stops.slice(0, -1).map((stop, index) => ({
    id: `${stop.id}-${stops[index + 1].id}`,
    positions: toFallbackSegment(stop, stops[index + 1]),
    source: "fallback",
  }));
}

async function fetchRouteSegment(startStop: Stop, endStop: Stop, signal: AbortSignal) {
  const response = await fetch(openRouteServiceDirectionsUrl, {
    method: "POST",
    headers: {
      Authorization: openRouteServiceApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      coordinates: [
        [startStop.longitude, startStop.latitude],
        [endStop.longitude, endStop.latitude],
      ],
      instructions: false,
      preference: "recommended",
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`OpenRouteService returned ${response.status}`);
  }

  const data = (await response.json()) as OpenRouteServiceFeatureCollection;
  const feature = data.features?.[0];

  if (!feature?.geometry?.coordinates?.length) {
    throw new Error("OpenRouteService did not return route geometry.");
  }

  return {
    distanceMeters: feature.properties?.summary?.distance,
    durationSeconds: feature.properties?.summary?.duration,
    positions: toLeafletPositions(feature.geometry.coordinates),
  };
}

export function useOpenRouteServiceRoute(stops: Stop[]) {
  const fallbackSegments = useMemo(() => getFallbackSegments(stops), [stops]);
  const fallbackPositions = useMemo(
    () => stops.map((stop) => [stop.latitude, stop.longitude] as [number, number]),
    [stops],
  );
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>(fallbackSegments);
  const [status, setStatus] = useState<RouteStatus>(hasOpenRouteServiceApiKey ? "loading" : "fallback");
  const [errorMessage, setErrorMessage] = useState<string | null>(
    hasOpenRouteServiceApiKey ? null : "OpenRouteService API key is not configured.",
  );
  const [summary, setSummary] = useState<RouteSummary | null>(null);

  useEffect(() => {
    setRouteSegments(fallbackSegments);

    if (!hasOpenRouteServiceApiKey || stops.length < 2) {
      setStatus("fallback");
      setSummary(null);
      setErrorMessage(
        stops.length < 2
          ? "At least two stops are required for road routing."
          : "OpenRouteService API key is not configured.",
      );
      return;
    }

    const abortController = new AbortController();

    async function fetchRoute() {
      setStatus("loading");
      setErrorMessage(null);

      const nextSegments: RouteSegment[] = [];
      let failedSegments = 0;
      let distanceMeters = 0;
      let durationSeconds = 0;

      for (let index = 0; index < stops.length - 1; index += 1) {
        const startStop = stops[index];
        const endStop = stops[index + 1];
        const segmentId = `${startStop.id}-${endStop.id}`;

        try {
          const segment = await fetchRouteSegment(startStop, endStop, abortController.signal);

          if (abortController.signal.aborted) {
            return;
          }

          nextSegments.push({
            id: segmentId,
            positions: segment.positions,
            source: "ors",
          });

          if (typeof segment.distanceMeters === "number") {
            distanceMeters += segment.distanceMeters;
          }

          if (typeof segment.durationSeconds === "number") {
            durationSeconds += segment.durationSeconds;
          }
        } catch (error) {
          if (abortController.signal.aborted) {
            return;
          }

          failedSegments += 1;
          nextSegments.push({
            id: segmentId,
            positions: toFallbackSegment(startStop, endStop),
            source: "fallback",
          });
        }
      }

      const totalSegments = stops.length - 1;

      setRouteSegments(nextSegments);
      setSummary({
        distanceKm: distanceMeters > 0 ? distanceMeters / 1000 : undefined,
        durationHours: durationSeconds > 0 ? durationSeconds / 3600 : undefined,
      });

      if (failedSegments === 0) {
        setStatus("success");
        setErrorMessage(null);
      } else if (failedSegments === totalSegments) {
        setStatus("fallback");
        setErrorMessage("OpenRouteService could not route any segment. Showing straight-line fallback.");
      } else {
        setStatus("partial");
        setErrorMessage(`${failedSegments} of ${totalSegments} route segments used straight-line fallback.`);
      }
    }

    void fetchRoute();

    return () => {
      abortController.abort();
    };
  }, [fallbackSegments, stops]);

  return {
    errorMessage,
    fallbackPositions,
    routePositions: routeSegments.flatMap((segment) => segment.positions),
    routeSegments,
    status,
    summary,
  };
}
