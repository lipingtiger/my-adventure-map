# My Adventure Map Structure

## Folder Layout

`src/types/` contains reusable TypeScript interfaces: `Journey`, `Stop`, `Attraction`, `Hike`, `Lodging`, `Photo`, `Video`, and `JournalEntry`.

`src/data/journeys/` contains all journey data. Each journey gets its own folder.

`src/data/journeys/toronto-seattle-2026/` is the current journey data folder:

- `journey.ts`: assembles the full journey object
- `stops.ts`: route order, map coordinates, dates, overnight city, and stop descriptions
- `hikes.ts`: hiking trail options linked to stops by `stopId`
- `lodging.ts`: lodging options linked to stops by `stopId`
- `attractions.ts`: attractions linked to stops by `stopId`
- `photos.ts`: photo records and placeholders
- `videos.ts`: video records and placeholders
- `journal.ts`: journal entries

`src/data/journeys/index.ts` exports every journey and the current journey.

`src/components/` contains reusable UI pieces such as `TripMap`, `JourneyTimeline`, `JourneyOverview`, and layout/navigation.

`src/pages/` contains route-level pages: home, journeys, journey details, gallery, hiking, camping, and about.

## Data Flow

Journey data starts in a journey folder under `src/data/journeys/`.

The folder's `journey.ts` imports stops, hikes, lodging, attractions, photos, videos, and journal entries, then exports one complete `Journey` object.

`src/data/journeys/index.ts` exports all journeys as an array.

Pages select a `Journey` from that index and pass it into reusable components.

`TripMap` receives a `Journey` object and renders its stops, route line, marker popups, lodging, attractions, and hikes.

`JourneyTimeline` receives a `Journey` object and renders timeline cards from the same data.

## Add A New Journey

1. Duplicate `src/data/journeys/toronto-seattle-2026/`.
2. Rename the folder to a new slug, for example `alaska-2027`.
3. Update all exported const names inside the copied files.
4. Change the `id`, `slug`, title, dates, and description in the copied `journey.ts`.
5. Update stops, lodging, attractions, hikes, photos, videos, and journal entries.
6. Export the new journey from `src/data/journeys/index.ts`.

## Duplicate An Existing Journey

Copy the full journey folder, rename it, then update:

- every `journeyId`
- the `Journey.id`
- the `Journey.slug`
- stop `id` values if they need to differ
- dates and route order

Keep the same architecture; do not add journey-specific imports inside components.

## Add Photos

Add photo records to the journey's `photos.ts`.

Use `stopId` when a photo belongs to a specific stop. Leave `stopId` empty for journey-wide cover or mood photos.

If the image file is local, place it under `src/assets/` or a future journey-specific asset folder, then import/reference it consistently.

## Add Videos

Add video records to the journey's `videos.ts`.

Use `stopId` when a clip belongs to a specific day or location.

Use `thumbnailSrc` when a preview image is available.

## Add A Hiking Trail

Add a `Hike` object to the journey's `hikes.ts`.

Set `stopId` to the day or stop where the hike should appear.

Include distance, difficulty, estimated time, trailhead, reservation status, and seasonal notes when relevant.

The timeline and map popup will pick it up automatically through the `Journey` object.
