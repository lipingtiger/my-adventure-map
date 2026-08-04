# My Adventure Map Project Notes

## Current Version

Version 0.3: upgraded Toronto-to-Seattle route with national parks, hikes, lodging options, richer map popups, and collapsible itinerary cards.

## Data Model Summary

The editable trip lives in `src/data/trips/torontoToSeattle.ts`.

The journey model supports title, subtitle, dates, status, description, route note, estimated distance, duration, and an ordered `stops` array.

Each stop supports route order, date, location, coordinates, stop type, description, completion status, overnight location, lodging options, attractions, hikes, notes, start point, destination, and optional status.

## Route Editing

To change the route, edit only `src/data/trips/torontoToSeattle.ts`.

Change a date by editing the stop's `date`. If the whole journey start or end changes, also update `startDate` or `endDate`.

Reorder the route by changing stop `order` values. The map and timeline sort by `order`.

Add a stop by copying an existing stop object, assigning a unique `id`, changing its `order`, and adding accurate coordinates.

Mark a stop optional by adding `optional: true` and explaining the reason in `notes`.

Add lodging through `lodgingOptions`. Valid lodging types are `motel`, `hostel`, `campground`, and `lodge`.

Add attractions through `attractions`. Coordinates are optional for side attractions.

Add hikes through `hikes`. Include distance, difficulty, estimated time, trailhead, reservation status, and seasonal notes when useful.

## Next Planned Features

- Add an edit form for stops and lodging.
- Add route filtering by stop type.
- Add saved map layers for hikes and attractions.
- Add daily mileage and drive-time estimates.
- Add export or print mode for the itinerary.
