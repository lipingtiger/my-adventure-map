import { useEffect, useState } from "react";
import { hasSupabaseConfig, supabase } from "../config/supabase";

export type UploadedPhoto = {
  caption: string | null;
  createdAt: string;
  id: string;
  journeyId: string;
  publicUrl: string;
  stopId: string | null;
  takenAt: string | null;
  title: string;
};

type UploadedPhotoRow = {
  caption: string | null;
  created_at: string;
  id: string;
  journey_id: string;
  public_url: string;
  stop_id: string | null;
  taken_at: string | null;
  title: string;
};

function toUploadedPhoto(row: UploadedPhotoRow): UploadedPhoto {
  return {
    caption: row.caption,
    createdAt: row.created_at,
    id: row.id,
    journeyId: row.journey_id,
    publicUrl: row.public_url,
    stopId: row.stop_id,
    takenAt: row.taken_at,
    title: row.title,
  };
}

export function useUploadedPhotos(journeyId: string) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(hasSupabaseConfig);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return undefined;
    }

    const supabaseClient = supabase;
    let isMounted = true;

    async function loadPhotos() {
      setIsLoading(true);
      setErrorMessage(null);

      const { data, error } = await supabaseClient
        .from("journey_photos")
        .select("caption, created_at, id, journey_id, public_url, stop_id, taken_at, title")
        .eq("journey_id", journeyId)
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      setPhotos(((data ?? []) as UploadedPhotoRow[]).map(toUploadedPhoto));
      setIsLoading(false);
    }

    void loadPhotos();

    const channel = supabaseClient
      .channel(`journey-photos-${journeyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `journey_id=eq.${journeyId}`,
          schema: "public",
          table: "journey_photos",
        },
        () => void loadPhotos(),
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabaseClient.removeChannel(channel);
    };
  }, [journeyId]);

  return { errorMessage, isLoading, photos };
}
