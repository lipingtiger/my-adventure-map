import { useCallback, useEffect, useState } from "react";
import { supabase } from "../config/supabase";

export type LibraryMedia = {
  id: string; kind: "photo" | "video"; journey_id: string | null; stop_id: string | null;
  title: string; caption: string | null; public_url?: string; video_url?: string; thumbnail_url: string | null;
  latitude: number | null; longitude: number | null; location_name: string | null; is_highlight: boolean; created_at: string;
};
export function useMediaLibrary(highlightsOnly = false) {
  const [items, setItems] = useState<LibraryMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    let cancelled = false;
    async function load(kind: "photo" | "video") {
      if (!supabase) throw new Error("Database is not configured.");
      const rows: LibraryMedia[] = [];
      const common = "id,journey_id,stop_id,title,caption,thumbnail_url,latitude,longitude,location_name,is_highlight,created_at";
      for (let offset = 0; ; offset += 1000) {
        let query = supabase.from(kind === "photo" ? "journey_photos" : "journey_video_links")
          .select(`${common},${kind === "photo" ? "public_url" : "video_url"}`).order("created_at", { ascending: false }).order("id").range(offset, offset + 999);
        if (highlightsOnly) query = query.eq("is_highlight", true).not("latitude", "is", null);
        const { data, error } = await query;
        if (error) throw error;
        rows.push(...((data ?? []) as unknown as LibraryMedia[]).map((item) => ({ ...item, kind })));
        if (!data || data.length < 1000) return rows;
      }
    }
    void Promise.all([load("photo"), load("video")]).then(([photos, videos]) => {
      if (!cancelled) { setItems([...photos, ...videos].sort((a, b) => b.created_at.localeCompare(a.created_at))); setError(""); }
    }).catch((err) => { if (!cancelled) setError(err.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [highlightsOnly, revision]);
  useEffect(() => {
    window.addEventListener("map-data-changed", refresh);
    const interval = window.setInterval(refresh, 30_000);
    return () => { window.removeEventListener("map-data-changed", refresh); window.clearInterval(interval); };
  }, [refresh]);
  return { items, loading, error, refresh };
}
