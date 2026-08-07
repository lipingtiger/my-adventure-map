import { useEffect, useState } from "react";
import { hasSupabaseConfig, supabase } from "../config/supabase";

export type LiveLocationStatus = "disabled" | "loading" | "live" | "stale" | "hidden" | "error";
export type LiveLocationHistoryStatus = "idle" | LiveLocationStatus;

const LIVE_LOCATION_HISTORY_PAGE_SIZE = 1000;
const LIVE_LOCATION_HISTORY_SELECT =
  "accuracy_m, altitude_m, battery_percent, created_at, heading_degrees, id, journey_id, latitude, longitude, recorded_at, sharing_enabled, source, speed_mps, tracker_id";

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

export type LiveLocationHistoryPoint = {
  accuracyM: number | null;
  altitudeM: number | null;
  batteryPercent: number | null;
  createdAt: string;
  headingDegrees: number | null;
  id: string;
  journeyId: string;
  latitude: number;
  longitude: number;
  recordedAt: string;
  source: string;
  speedMps: number | null;
  trackerId: string;
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

type LiveLocationHistoryRow = {
  accuracy_m: number | null;
  altitude_m: number | null;
  battery_percent: number | null;
  created_at: string;
  heading_degrees: number | null;
  id: string;
  journey_id: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
  sharing_enabled: boolean;
  source: string;
  speed_mps: number | null;
  tracker_id: string;
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

function toLiveLocationHistoryPoint(row: LiveLocationHistoryRow): LiveLocationHistoryPoint {
  return {
    accuracyM: row.accuracy_m,
    altitudeM: row.altitude_m,
    batteryPercent: row.battery_percent,
    createdAt: row.created_at,
    headingDegrees: row.heading_degrees,
    id: row.id,
    journeyId: row.journey_id,
    latitude: row.latitude,
    longitude: row.longitude,
    recordedAt: row.recorded_at,
    source: row.source,
    speedMps: row.speed_mps,
    trackerId: row.tracker_id,
  };
}

function getLocationStatus(row: LiveLocationRow): LiveLocationStatus {
  const updatedAt = new Date(row.updated_at).getTime();
  const ageMs = Date.now() - updatedAt;
  const staleAfterMs = 30 * 60 * 1000;

  return ageMs > staleAfterMs ? "stale" : "live";
}

function sortHistoryRows(rows: LiveLocationHistoryRow[]) {
  return [...rows].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
}

function canUseLiveLocationProxy() {
  return typeof window !== "undefined" && window.location.hostname.endsWith(".chatgpt.site");
}

async function fetchLiveLocationFromProxy(journeyId: string) {
  const response = await fetch(`/api/live-location?journey_id=${encodeURIComponent(journeyId)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = (await response.json()) as { location: LiveLocationRow | null };

  return data.location;
}

async function fetchLiveLocationHistoryPageFromProxy(journeyId: string, offset: number) {
  const params = new URLSearchParams({
    journey_id: journeyId,
    limit: String(LIVE_LOCATION_HISTORY_PAGE_SIZE),
    offset: String(offset),
  });
  const response = await fetch(`/api/live-location-history?${params.toString()}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = (await response.json()) as { history: LiveLocationHistoryRow[] };

  return data.history;
}

async function fetchLiveLocationHistoryFromProxy(journeyId: string) {
  const rows: LiveLocationHistoryRow[] = [];
  let offset = 0;

  while (true) {
    const pageRows = await fetchLiveLocationHistoryPageFromProxy(journeyId, offset);
    rows.push(...pageRows);

    if (pageRows.length < LIVE_LOCATION_HISTORY_PAGE_SIZE) {
      return rows;
    }

    offset += LIVE_LOCATION_HISTORY_PAGE_SIZE;
  }
}

export function useLiveLocation(journeyId: string) {
  const [location, setLocation] = useState<LiveLocation | null>(null);
  const [status, setStatus] = useState<LiveLocationStatus>(hasSupabaseConfig ? "loading" : "disabled");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (canUseLiveLocationProxy()) {
      let isMounted = true;
      let intervalId: number | undefined;

      async function loadLiveLocation() {
        setStatus("loading");
        setErrorMessage(null);

        try {
          const row = await fetchLiveLocationFromProxy(journeyId);

          if (!isMounted) {
            return;
          }

          if (!row) {
            setStatus("hidden");
            setLocation(null);
            return;
          }

          setLocation(toLiveLocation(row));
          setStatus(getLocationStatus(row));
        } catch (error) {
          if (!isMounted) {
            return;
          }

          setStatus("error");
          setErrorMessage(error instanceof Error ? error.message : "Unable to load live location");
        }
      }

      void loadLiveLocation();
      intervalId = window.setInterval(() => void loadLiveLocation(), 20_000);

      return () => {
        isMounted = false;
        window.clearInterval(intervalId);
      };
    }

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

export function useLiveLocationHistory(journeyId: string, enabled: boolean) {
  const [history, setHistory] = useState<LiveLocationHistoryPoint[]>([]);
  const [status, setStatus] = useState<LiveLocationHistoryStatus>(
    enabled ? (hasSupabaseConfig ? "loading" : "disabled") : "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setHistory([]);
      setStatus("idle");
      setErrorMessage(null);
      return undefined;
    }

    if (canUseLiveLocationProxy()) {
      let isMounted = true;
      let intervalId: number | undefined;

      async function loadLiveLocationHistory() {
        setStatus("loading");
        setErrorMessage(null);

        try {
          const rows = await fetchLiveLocationHistoryFromProxy(journeyId);

          if (!isMounted) {
            return;
          }

          setHistory(sortHistoryRows(rows).map(toLiveLocationHistoryPoint));
          setStatus(rows.length > 0 ? "live" : "hidden");
        } catch (error) {
          if (!isMounted) {
            return;
          }

          setStatus("error");
          setErrorMessage(error instanceof Error ? error.message : "Unable to load live location history");
        }
      }

      void loadLiveLocationHistory();
      intervalId = window.setInterval(() => void loadLiveLocationHistory(), 60_000);

      return () => {
        isMounted = false;
        window.clearInterval(intervalId);
      };
    }

    if (!supabase) {
      setStatus("disabled");
      return undefined;
    }

    const supabaseClient = supabase;
    let isMounted = true;

    async function loadLiveLocationHistory() {
      setStatus("loading");
      setErrorMessage(null);

      const rows: LiveLocationHistoryRow[] = [];
      let offset = 0;

      while (isMounted) {
        const { data, error } = await supabaseClient
          .from("live_location_history")
          .select(LIVE_LOCATION_HISTORY_SELECT)
          .eq("journey_id", journeyId)
          .eq("sharing_enabled", true)
          .order("recorded_at", { ascending: true })
          .range(offset, offset + LIVE_LOCATION_HISTORY_PAGE_SIZE - 1);

        if (!isMounted) {
          return;
        }

        if (error) {
          setStatus("error");
          setErrorMessage(error.message);
          return;
        }

        const pageRows = (data ?? []) as LiveLocationHistoryRow[];
        rows.push(...pageRows);

        if (pageRows.length < LIVE_LOCATION_HISTORY_PAGE_SIZE) {
          break;
        }

        offset += LIVE_LOCATION_HISTORY_PAGE_SIZE;
      }

      setHistory(sortHistoryRows(rows).map(toLiveLocationHistoryPoint));
      setStatus(rows.length > 0 ? "live" : "hidden");
    }

    void loadLiveLocationHistory();

    const channel = supabaseClient
      .channel(`live-location-history-${journeyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          filter: `journey_id=eq.${journeyId}`,
          schema: "public",
          table: "live_location_history",
        },
        (payload) => {
          const row = payload.new as LiveLocationHistoryRow | null;

          if (!row?.sharing_enabled) {
            return;
          }

          setHistory((currentHistory) =>
            [...currentHistory, toLiveLocationHistoryPoint(row)].sort(
              (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
            ),
          );
          setStatus("live");
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabaseClient.removeChannel(channel);
    };
  }, [enabled, journeyId]);

  return { errorMessage, history, status };
}
