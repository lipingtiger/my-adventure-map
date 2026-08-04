# My Adventure Map Project Notes

## Current Version

Version 0.4: scalable multi-journey architecture with reusable journey interfaces, route pages, journey cards, split journey data, and React Router.

## Data Model Summary

The editable current journey lives in `src/data/journeys/toronto-seattle-2026/`.

The journey model supports title, subtitle, dates, status, description, route note, estimated distance, duration, and an ordered `stops` array.

Each stop supports route order, date, location, coordinates, stop type, description, completion status, overnight location, lodging options, attractions, hikes, notes, start point, destination, and optional status.
Each travel day can also include `drivingDistanceKm` and `drivingDistanceNote`.

## Route Editing

To change the route, edit `src/data/journeys/toronto-seattle-2026/stops.ts`.

Change a date by editing the stop's `date`. If the whole journey start or end changes, also update `startDate` or `endDate`.

Reorder the route by changing stop `order` values. The map and timeline sort by `order`.

Add a stop by copying an existing stop object, assigning a unique `id`, changing its `order`, and adding accurate coordinates.

Add or update each day's driving distance with `drivingDistanceKm`. Use `drivingDistanceNote` for optional detours, local days, or approximate values.

Mark a stop optional by adding `optional: true` and explaining the reason in `notes`.

Hide a map-only point from the timeline with `showInTimeline: false`. Toronto uses this so it appears on the map as the route start while Day 1 remains the Toronto-to-Sault Ste. Marie driving day.

Add lodging in the journey folder's `lodging.ts`. Valid lodging types are `motel`, `hostel`, `campground`, and `lodge`.

Add attractions through `attractions`. Coordinates are optional for side attractions.

Add hikes through `hikes`. Include distance, difficulty, estimated time, trailhead, reservation status, and seasonal notes when useful.

## Environment Variables

OpenRouteService API access is read from `import.meta.env.VITE_ORS_API_KEY` in `src/config/openRouteService.ts`.

`TripMap` uses OpenRouteService to request real driving routes between each pair of ordered stops. If one segment fails, for example because ORS cannot snap a park coordinate to a drivable road and returns 404, only that segment falls back to a straight line. The rest of the route can still use road geometry.

For local development, put the key in `.env.local`:

```bash
VITE_ORS_API_KEY=your_key_here
```

Do not commit `.env.local`.

## Next Planned Features

- Add an edit form for stops and lodging.
- Add route filtering by stop type.
- Add saved map layers for hikes and attractions.
- Add daily mileage and drive-time estimates.
- Add export or print mode for the itinerary.
