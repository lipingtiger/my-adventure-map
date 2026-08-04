# my-adventure-map
an interactive travel map and journal for my road trips

## Version 0.3

Version 0.3 upgrades the route into a flexible 17-day Toronto-to-Seattle itinerary through the United States, Yellowstone National Park, Grand Teton National Park, Idaho, Oregon, and Washington. Route data lives in:

`src/data/trips/torontoToSeattle.ts`

Edit an existing stop by changing its object in the `stops` array. Add a new stop by adding another object with an `id`, `order`, `name`, `date`, coordinates, `type`, `description`, and any lodging, attractions, hikes, or notes.

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
