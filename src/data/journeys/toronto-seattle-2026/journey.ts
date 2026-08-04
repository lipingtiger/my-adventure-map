import { Journey } from "../../../types";
import { torontoSeattle2026Attractions } from "./attractions";
import { torontoSeattle2026Hikes } from "./hikes";
import { torontoSeattle2026JournalEntries } from "./journal";
import { torontoSeattle2026Lodging } from "./lodging";
import { torontoSeattle2026Photos } from "./photos";
import { torontoSeattle2026Stops } from "./stops";
import { torontoSeattle2026Videos } from "./videos";

// Journey editing guide:
// - Update route order in `stops.ts`.
// - Add lodging in `lodging.ts` and connect it with `stopId`.
// - Add attractions in `attractions.ts` and connect them with `stopId`.
// - Add hikes in `hikes.ts` and connect them with `stopId`.
// - Add photos, videos, and journal entries in their matching files.
export const torontoSeattle2026Journey: Journey = {
  id: "toronto-seattle-2026",
  slug: "toronto-seattle-2026",
  title: "Toronto to Seattle",
  subtitle: "A flexible cross-border route through Yellowstone, Grand Teton, and the Pacific Northwest.",
  startDate: "2026-08-05",
  endDate: "2026-08-21",
  status: "planning",
  description:
    "A scenic Toronto-to-Seattle road trip that crosses into the United States early, then continues through North Dakota, Wyoming national parks, Idaho, Oregon, and Washington.",
  routeNote: "This route is flexible and may change during the journey.",
  totalDistanceLabel: "4,300+ km",
  durationLabel: "17 days on the road",
  stops: torontoSeattle2026Stops,
  attractions: torontoSeattle2026Attractions,
  hikes: torontoSeattle2026Hikes,
  lodging: torontoSeattle2026Lodging,
  photos: torontoSeattle2026Photos,
  videos: torontoSeattle2026Videos,
  journalEntries: torontoSeattle2026JournalEntries,
};
