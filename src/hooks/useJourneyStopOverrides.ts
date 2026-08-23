import { useEffect, useMemo, useState } from "react";
import { hasSupabaseConfig, supabase } from "../config/supabase";
import { Journey, JourneyStatus, OvernightStatus, Stop, StopType } from "../types";

const STOP_OVERRIDES_PAGE_SIZE = 1000;
const STOP_OVERRIDES_SELECT =
  "city, country, date, description, destination, driving_distance_km, driving_distance_note, journey_id, latitude, longitude, name, overnight, start_point, state_or_province, stop_id, updated_at";
const JOURNEY_STOPS_PAGE_SIZE = 1000;
const JOURNEY_STOPS_SELECT =
  "address, city, completed, country, date, day_number, day_stop_order, description, destination, driving_distance_km, driving_distance_note, journey_id, latitude, longitude, name, notes, optional, overnight, overnight_status, show_in_timeline, sort_order, start_point, state_or_province, stop_id, type, updated_at";

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

type JourneyStopRow = {
  address: string | null;
  city: string | null;
  completed: boolean;
  country: string;
  date: string;
  day_number: number | null;
  day_stop_order: number | null;
  description: string;
  destination: string | null;
  driving_distance_km: number | null;
  driving_distance_note: string | null;
  journey_id: string;
  latitude: number;
  longitude: number;
  name: string;
  notes: string[] | null;
  optional: boolean;
  overnight: string | null;
  overnight_status: string;
  show_in_timeline: boolean;
  sort_order: number;
  start_point: string | null;
  state_or_province: string;
  stop_id: string;
  type: string;
  updated_at: string;
};

type JourneySettingsRow = {
  status: JourneyStatus;
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

function nullableTextToUndefined(value: string | null) {
  return value === null ? undefined : value;
}

function toJourneyStop(row: JourneyStopRow): Stop {
  return {
    address: nullableTextToUndefined(row.address),
    city: nullableTextToUndefined(row.city),
    completed: row.completed,
    country: row.country,
    date: row.date,
    dayNumber: row.day_number ?? undefined,
    dayStopOrder: row.day_stop_order ?? undefined,
    description: row.description,
    destination: nullableTextToUndefined(row.destination),
    drivingDistanceKm: row.driving_distance_km ?? undefined,
    drivingDistanceNote: nullableTextToUndefined(row.driving_distance_note),
    id: row.stop_id,
    journeyId: row.journey_id,
    latitude: row.latitude,
    longitude: row.longitude,
    name: row.name,
    notes: row.notes ?? undefined,
    optional: row.optional,
    order: Number(row.sort_order),
    overnight: nullableTextToUndefined(row.overnight),
    overnightStatus: row.overnight_status as OvernightStatus,
    showInTimeline: row.show_in_timeline,
    startPoint: nullableTextToUndefined(row.start_point),
    stateOrProvince: row.state_or_province,
    type: row.type as StopType,
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

async function fetchJourneyStops(journeyId: string) {
  if (!supabase) {
    return { error: null, rows: [] as JourneyStopRow[] };
  }

  const rows: JourneyStopRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("journey_stops")
      .select(JOURNEY_STOPS_SELECT)
      .eq("journey_id", journeyId)
      .order("sort_order", { ascending: true })
      .range(offset, offset + JOURNEY_STOPS_PAGE_SIZE - 1);

    if (error) {
      return { error, rows };
    }

    const pageRows = (data ?? []) as JourneyStopRow[];
    rows.push(...pageRows);

    if (pageRows.length < JOURNEY_STOPS_PAGE_SIZE) {
      return { error: null, rows };
    }

    offset += JOURNEY_STOPS_PAGE_SIZE;
  }
}

async function fetchJourneySettings(journeyId: string) {
  if (!supabase) {
    return { error: null, row: null as JourneySettingsRow | null };
  }

  const { data, error } = await supabase
    .from("journey_settings")
    .select("status")
    .eq("journey_id", journeyId)
    .maybeSingle<JourneySettingsRow>();

  return { error, row: data };
}

export function useJourneyStopOverrides(journey: Journey) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(hasSupabaseConfig);
  const [loadedJourneyId, setLoadedJourneyId] = useState<string | null>(hasSupabaseConfig ? null : journey.id);
  const [databaseStops, setDatabaseStops] = useState<Stop[]>([]);
  const [overrides, setOverrides] = useState<JourneyStopOverride[]>([]);
  const [journeyStatus, setJourneyStatus] = useState<JourneyStatus | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoadedJourneyId(journey.id);
      setIsLoading(false);
      return undefined;
    }

    const supabaseClient = supabase;
    let isMounted = true;

    async function loadOverrides() {
      setIsLoading(true);
      setErrorMessage(null);

      const [
        { error: stopsError, rows: stopRows },
        { error: overridesError, rows: overrideRows },
        { error: settingsError, row: settingsRow },
      ] = await Promise.all([
        fetchJourneyStops(journey.id),
        fetchJourneyStopOverrides(journey.id),
        fetchJourneySettings(journey.id),
      ]);

      if (!isMounted) {
        return;
      }

      if (stopsError) {
        setErrorMessage(stopsError.message);
        setLoadedJourneyId(journey.id);
        setIsLoading(false);
        return;
      }

      if (overridesError) {
        setErrorMessage(overridesError.message);
        setLoadedJourneyId(journey.id);
        setIsLoading(false);
        return;
      }

      if (settingsError) {
        setErrorMessage(settingsError.message);
        setLoadedJourneyId(journey.id);
        setIsLoading(false);
        return;
      }

      setDatabaseStops(stopRows.map(toJourneyStop));
      setOverrides(overrideRows.map(toJourneyStopOverride));
      setJourneyStatus(settingsRow?.status ?? null);
      setLoadedJourneyId(journey.id);
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
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `journey_id=eq.${journey.id}`,
          schema: "public",
          table: "journey_stops",
        },
        () => void loadOverrides(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `journey_id=eq.${journey.id}`,
          schema: "public",
          table: "journey_settings",
        },
        () => void loadOverrides(),
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabaseClient.removeChannel(channel);
    };
  }, [journey.id]);

  const usesDatabaseStops = databaseStops.length > 0;
  const journeyWithOverrides = useMemo(
    () => {
      const journeyWithStops = usesDatabaseStops
        ? { ...journey, stops: databaseStops }
        : applyJourneyStopOverrides(journey, overrides);

      return journeyStatus ? { ...journeyWithStops, status: journeyStatus } : journeyWithStops;
    },
    [databaseStops, journey, journeyStatus, overrides, usesDatabaseStops],
  );

  const hasLoadedCurrentJourney = loadedJourneyId === journey.id;

  return {
    errorMessage: hasLoadedCurrentJourney ? errorMessage : null,
    isLoading: isLoading || !hasLoadedCurrentJourney,
    journey: hasLoadedCurrentJourney ? journeyWithOverrides : journey,
    overrides: hasLoadedCurrentJourney ? overrides : [],
    usesDatabaseStops: hasLoadedCurrentJourney && usesDatabaseStops,
  };
}
