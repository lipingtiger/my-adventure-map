import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../config/supabase";
import { journeys as legacyJourneys } from "../data/journeys";
import { Journey } from "../types";
import { toJourneyStop } from "./useJourneyStopOverrides";

export const emptyJourney: Journey = {
  id: "", slug: "", title: "", subtitle: "", description: "", startDate: "", endDate: "",
  status: "planning", routeNote: "", totalDistanceLabel: "", durationLabel: "",
  stops: [], attractions: [], hikes: [], lodging: [], photos: [], videos: [], journalEntries: [],
};

async function allRows(table: string, order: string) {
  if (!supabase) throw new Error("Database is not configured.");
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from(table).select("*").order(order).range(offset, offset + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

const JourneyContext = createContext({ journeys: [] as Journey[], isLoading: true, errorMessage: "", refresh: () => {} });

export function JourneysProvider({ children }: { children: ReactNode }) {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    let cancelled = false;
    void Promise.all([allRows("journey_settings", "created_at"), allRows("journey_stops", "sort_order")])
      .then(([settings, stops]) => {
        if (cancelled) return;
        setJourneys(settings.map((row) => {
          const legacy = legacyJourneys.find((item) => item.id === row.journey_id);
          const ownStops = stops.filter((stop) => stop.journey_id === row.journey_id).map(toJourneyStop);
          return {
            ...(legacy ?? emptyJourney), id: row.journey_id, slug: row.slug, title: row.title,
            subtitle: row.subtitle, description: row.description, status: row.status,
            routeNote: row.route_note, totalDistanceLabel: row.total_distance_label,
            durationLabel: row.duration_label, startDate: row.start_date ?? "", endDate: row.end_date ?? "",
            stops: ownStops,
          };
        }));
        setError("");
      }).catch((error) => { if (!cancelled) setError(error.message ?? "Unable to load journeys."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [revision]);
  useEffect(() => {
    const interval = window.setInterval(refresh, 30_000);
    window.addEventListener("map-data-changed", refresh);
    return () => { window.clearInterval(interval); window.removeEventListener("map-data-changed", refresh); };
  }, [refresh]);
  return <JourneyContext.Provider value={{ journeys, isLoading, errorMessage, refresh }}>{children}</JourneyContext.Provider>;
}

export const useJourneys = () => useContext(JourneyContext);
