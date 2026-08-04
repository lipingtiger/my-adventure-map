import { useEffect, useState } from "react";
import { hasSupabaseConfig, supabase } from "../config/supabase";

export type LiveLocationStatus = "disabled" | "loading" | "live" | "stale" | "hidden" | "error";

export type LiveLocation = {
  accuracyM: number | null;
  altitudeM: number | null;
  batteryPercent: number | null;
  headingDegrees: number | null;
  journeyId: string;
  latitude: number;
  longitude: number;
  recordedAt: string;
  source: string;
  speedMps: number | null;
  trackerId: string;
  updatedAt: string;
};

type LiveLocationRow = {
  accuracy_m: number | null;
  altitude_m: number | null;
  battery_percent: number | null;
  heading_degrees: number | null;
  journey_id: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
  sharing_enabled: boolean;
  source: string;
  speed_mps: number | null;
  tracker_id: string;
  updated_at: string;
};

function toLiveLocation(row: LiveLocationRow): LiveLocation {
  return {
    accuracyM: row.accuracy_m,
    altitudeM: row.altitude_m,
    batteryPercent: row.battery_percent,
    headingDegrees: row.heading_degrees,
    journeyId: row.journey_id,
    latitude: row.latitude,
    longitude: row.longitude,
    recordedAt: row.recorded_at,
    source: row.source,
    speedMps: row.speed_mps,
    trackerId: row.tracker_id,
    updatedAt: row.updated_at,
  };
}

function getLocationStatus(row: LiveLocationRow): LiveLocationStatus {
  const updatedAt = new Date(row.updated_at).getTime();
  const ageMs = Date.now() - updatedAt;
  const staleAfterMs = 30 * 60 * 1000;

  return ageMs > staleAfterMs ? "stale" : "live";
}

export function useLiveLocation(journeyId: string) {
  const [location, setLocation] = useState<LiveLocation | null>(null);
  const [status, setStatus] = useState<LiveLocationStatus>(hasSupabaseConfig ? "loading" : "disabled");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setStatus("disabled");
      return undefined;
    }

    const supabaseClient = supabase;
    let isMounted = true;

    async function loadLiveLocation() {
      setStatus("loading");
      setErrorMessage(null);

      const { data, error } = await supabaseClient
        .from("live_locations")
        .select(
          "accuracy_m, altitude_m, battery_percent, heading_degrees, journey_id, latitude, longitude, recorded_at, sharing_enabled, source, speed_mps, tracker_id, updated_at",
        )
        .eq("journey_id", journeyId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle<LiveLocationRow>();

      if (!isMounted) {
        return;
      }

      if (error) {
        setStatus("error");
        setErrorMessage(error.message);
        return;
      }

      if (!data || !data.sharing_enabled) {
        setStatus("hidden");
        setLocation(null);
        return;
      }

      setLocation(toLiveLocation(data));
      setStatus(getLocationStatus(data));
    }

    void loadLiveLocation();

    const channel = supabaseClient
      .channel(`live-location-${journeyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `journey_id=eq.${journeyId}`,
          schema: "public",
          table: "live_locations",
        },
        (payload) => {
          const row = payload.new as LiveLocationRow | null;

          if (!row?.sharing_enabled) {
            setStatus("hidden");
            setLocation(null);
            return;
          }

          setLocation(toLiveLocation(row));
          setStatus(getLocationStatus(row));
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabaseClient.removeChannel(channel);
    };
  }, [journeyId]);

  return { errorMessage, location, status };
}
