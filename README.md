# my-adventure-map
an interactive travel map and journal for my road trips

## Version 0.2

Version 0.2 adds an interactive OpenStreetMap route map, Leaflet markers, a connected route polyline, and a journey timeline. Route data lives in:

`src/data/trips/torontoToSeattle.ts`

Edit an existing stop by changing its object in the `stops` array. Add a new stop by adding another object with an `id`, `name`, `stateOrProvince`, `date`, `latitude`, `longitude`, `type`, `description`, and `completed` value.

## Development

Install dependencies:

```bash
pnpm install
```

Run the local development server:

```bash
pnpm dev
```

Build for production:

```bash
pnpm build
```
