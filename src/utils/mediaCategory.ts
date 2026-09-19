export type MediaCategory = "journey" | "located" | "unlocated";

export function mediaCategory(item: { journey_id: string | null; latitude: number | null; longitude: number | null }): MediaCategory {
  if (item.journey_id !== null) return "journey";
  return item.latitude !== null && item.longitude !== null ? "located" : "unlocated";
}
