import { useEffect, useState } from "react";
import { hasSupabaseConfig, supabase } from "../config/supabase";

const UPLOADED_VIDEOS_PAGE_SIZE = 1000;
const UPLOADED_VIDEOS_SELECT =
  "caption, created_at, id, journey_id, stop_id, taken_at, thumbnail_url, title, video_url";

export type UploadedVideo = {
  caption: string | null;
  createdAt: string;
  id: string;
  journeyId: string;
  stopId: string | null;
  takenAt: string | null;
  thumbnailUrl: string | null;
  title: string;
  videoUrl: string;
};

type UploadedVideoRow = {
  caption: string | null;
  created_at: string;
  id: string;
  journey_id: string;
  stop_id: string | null;
  taken_at: string | null;
  thumbnail_url: string | null;
  title: string;
  video_url: string;
};

function toUploadedVideo(row: UploadedVideoRow): UploadedVideo {
  return {
    caption: row.caption,
    createdAt: row.created_at,
    id: row.id,
    journeyId: row.journey_id,
    stopId: row.stop_id,
    takenAt: row.taken_at,
    thumbnailUrl: row.thumbnail_url,
    title: row.title,
    videoUrl: row.video_url,
  };
}

async function fetchUploadedVideos(journeyId: string) {
  if (!supabase) {
    return { error: null, rows: [] as UploadedVideoRow[] };
  }

  const rows: UploadedVideoRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("journey_video_links")
      .select(UPLOADED_VIDEOS_SELECT)
      .eq("journey_id", journeyId)
      .order("created_at", { ascending: false })
      .range(offset, offset + UPLOADED_VIDEOS_PAGE_SIZE - 1);

    if (error) {
      return { error, rows };
    }

    const pageRows = (data ?? []) as UploadedVideoRow[];
    rows.push(...pageRows);

    if (pageRows.length < UPLOADED_VIDEOS_PAGE_SIZE) {
      return { error: null, rows };
    }

    offset += UPLOADED_VIDEOS_PAGE_SIZE;
  }
}

export function useUploadedVideos(journeyId: string) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(hasSupabaseConfig);
  const [videos, setVideos] = useState<UploadedVideo[]>([]);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return undefined;
    }

    const supabaseClient = supabase;
    let isMounted = true;

    async function loadVideos() {
      setIsLoading(true);
      setErrorMessage(null);

      const { error, rows } = await fetchUploadedVideos(journeyId);

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      setVideos(rows.map(toUploadedVideo));
      setIsLoading(false);
    }

    void loadVideos();

    const channel = supabaseClient
      .channel(`journey-video-links-${journeyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `journey_id=eq.${journeyId}`,
          schema: "public",
          table: "journey_video_links",
        },
        () => void loadVideos(),
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabaseClient.removeChannel(channel);
    };
  }, [journeyId]);

  return { errorMessage, isLoading, videos };
}
