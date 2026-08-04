import { Journey } from "../../types";
import { torontoSeattle2026Journey } from "./toronto-seattle-2026/journey";

export const journeys: Journey[] = [torontoSeattle2026Journey];

export const currentJourney = journeys[0];

export function getJourneyBySlug(slug: string | undefined) {
  return journeys.find((journey) => journey.slug === slug);
}
