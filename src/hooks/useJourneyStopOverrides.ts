import { useEffect, useMemo, useState } from "react";
import { hasSupabaseConfig, supabase } from "../config/supabase";
import { Journey, Stop } from "../types";

const STOP_OVERRIDES_PAGE_SIZE = 1000;
const STOP_OVERRIDES_SELECT =
  "city, country, date, description, destination, driving_distance_km, driving_distance_note, journey_id, latitude, longitude, name, overnight, start_point, state_or_province, stop_id, updated_at";

export type JourneyStopOverride = {
  city: string | null;
  country: string;
  date: string;
  description: string;
  destination: string | null;
  drivingDistanceKm: number | null;
  drivingDistanceNote: string | null;
  journeyId: string;
  latitude: number;
  longitude: number;
  name: string;
  overnight: string | null;
  startPoint: string | null;
  stateOrProvince: string;
  stopId: string;
  updatedAt: string;
};

type JourneyStopOverrideRow = {
  city: string | null;
  country: string;
  date: string;
  description: string;
  destination: string | null;
  driving_distance_km: number | null;
  driving_distance_note: string | null;
  journey_id: string;
  latitude: number;
  longitude: number;
  name: string;
  overnight: string | null;
  start_point: string | null;
  state_or_province: string;
  stop_id: string;
  updated_at: string;
};

function toJourneyStopOverride(row: JourneyStopOverrideRow): JourneyStopOverride {
  return {
    city: row.city,
    country: row.country,
    date: row.date,
    description: row.description,
    destination: row.destination,
    drivingDistanceKm: row.driving_distance_km,
    drivingDistanceNote: row.driving_distance_note,
    journeyId: row.journey_id,
    latitude: row.latitude,
    longitude: row.longitude,
    name: row.name,
    overnight: row.overnight,
    startPoint: row.start_point,
    stateOrProvince: row.state_or_province,
    stopId: row.stop_id,
    updatedAt: row.updated_at,
  };
}

function applyNullableTextOverride(currentValue: string | undefined, overrideValue: string | null) {
  return overrideValue === null ? undefined : overrideValue ?? currentValue;
}

function applyStopOverride(stop: Stop, override: JourneyStopOverride): Stop {
  return {
    ...stop,
    city: applyNullableTextOverride(stop.city, override.city),
    country: override.country,
    date: override.date,
    description: override.description,
    destination: applyNullableTextOverride(stop.destination, override.destination),
    drivingDistanceKm: override.drivingDistanceKm ?? undefined,
    drivingDistanceNote: applyNullableTextOverride(stop.drivingDistanceNote, override.drivingDistanceNote),
    latitude: override.latitude,
    longitude: override.longitude,
    name: override.name,
    overnight: applyNullableTextOverride(stop.overnight, override.overnight),
    startPoint: applyNullableTextOverride(stop.startPoint, override.startPoint),
    stateOrProvince: override.stateOrProvince,
  };
}

export function applyJourneyStopOverrides(journey: Journey, overrides: JourneyStopOverride[]) {
  if (overrides.length === 0) {
    return journey;
  }

  const overridesByStop = new Map(overrides.map((override) => [override.stopId, override]));

  return {
    ...journey,
    stops: journey.stops.map((stop) => {
      const override = overridesByStop.get(stop.id);

      return override ? applyStopOverride(stop, override) : stop;
    }),
  };
}

async function fetchJourneyStopOverrides(journeyId: string) {
  if (!supabase) {
    return { error: null, rows: [] as JourneyStopOverrideRow[] };
  }

  const rows: JourneyStopOverrideRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("journey_stop_overrides")
      .select(STOP_OVERRIDES_SELECT)
      .eq("journey_id", journeyId)
      .order("updated_at", { ascending: false })
      .range(offset, offset + STOP_OVERRIDES_PAGE_SIZE - 1);

    if (error) {
      return { error, rows };
    }

    const pageRows = (data ?? []) as JourneyStopOverrideRow[];
    rows.push(...pageRows);

    if (pageRows.length < STOP_OVERRIDES_PAGE_SIZE) {
      return { error: null, rows };
    }

    offset += STOP_OVERRIDES_PAGE_SIZE;
  }
}

export function useJourneyStopOverrides(journey: Journey) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(hasSupabaseConfig);
  const [overrides, setOverrides] = useState<JourneyStopOverride[]>([]);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return undefined;
    }

    const supabaseClient = supabase;
    let isMounted = true;

    async function loadOverrides() {
      setIsLoading(true);
      setErrorMessage(null);

      const { error, rows } = await fetchJourneyStopOverrides(journey.id);

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      setOverrides(rows.map(toJourneyStopOverride));
      setIsLoading(false);
    }

    void loadOverrides();

    const channel = supabaseClient
      .channel(`journey-stop-overrides-${journey.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `journey_id=eq.${journey.id}`,
          schema: "public",
          table: "journey_stop_overrides",
        },
        () => void loadOverrides(),
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabaseClient.removeChannel(channel);
    };
  }, [journey.id]);

  const journeyWithOverrides = useMemo(() => applyJourneyStopOverrides(journey, overrides), [journey, overrides]);

  return { errorMessage, isLoading, journey: journeyWithOverrides, overrides };
}
