export type TripStatus = "planning" | "active" | "completed";

export type StopType =
  | "city"
  | "overnight"
  | "national-park"
  | "scenic-stop"
  | "destination";

export type TripStop = {
  id: string;
  name: string;
  stateOrProvince: string;
  date: string;
  latitude: number;
  longitude: number;
  type: StopType;
  description: string;
  completed: boolean;
};

export type Trip = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  estimatedDistanceLabel: string;
  durationLabel: string;
  routeNote: string;
  stops: TripStop[];
};

export const torontoToSeattleTrip: Trip = {
  id: "toronto-to-seattle-2026",
  title: "Toronto to Seattle",
  startDate: "2026-08-05",
  endDate: "2026-08-21",
  status: "planning",
  estimatedDistanceLabel: "4,100+ km",
  durationLabel: "17 days on the road",
  routeNote: "This route is flexible and may change during the journey.",
  stops: [
    {
      id: "toronto",
      name: "Toronto",
      stateOrProvince: "Ontario",
      date: "2026-08-05",
      latitude: 43.6532,
      longitude: -79.3832,
      type: "city",
      description: "Departure point for the westbound road trip.",
      completed: false,
    },
    {
      id: "sault-ste-marie",
      name: "Sault Ste. Marie",
      stateOrProvince: "Ontario",
      date: "2026-08-06",
      latitude: 46.5219,
      longitude: -84.3461,
      type: "overnight",
      description: "A northern Ontario stop near the St. Marys River.",
      completed: false,
    },
    {
      id: "thunder-bay",
      name: "Thunder Bay",
      stateOrProvince: "Ontario",
      date: "2026-08-08",
      latitude: 48.3809,
      longitude: -89.2477,
      type: "overnight",
      description: "Lake Superior views and a key rest point before heading west.",
      completed: false,
    },
    {
      id: "winnipeg",
      name: "Winnipeg",
      stateOrProvince: "Manitoba",
      date: "2026-08-10",
      latitude: 49.8951,
      longitude: -97.1384,
      type: "city",
      description: "Prairie city stop for food, supplies, and a route reset.",
      completed: false,
    },
    {
      id: "theodore-roosevelt-national-park",
      name: "Theodore Roosevelt National Park",
      stateOrProvince: "North Dakota",
      date: "2026-08-12",
      latitude: 46.979,
      longitude: -103.5387,
      type: "national-park",
      description: "Badlands scenery and wildlife along the western North Dakota route.",
      completed: false,
    },
    {
      id: "cody",
      name: "Cody",
      stateOrProvince: "Wyoming",
      date: "2026-08-14",
      latitude: 44.5263,
      longitude: -109.0565,
      type: "overnight",
      description: "Gateway stop before entering the Yellowstone region.",
      completed: false,
    },
    {
      id: "yellowstone-national-park",
      name: "Yellowstone National Park",
      stateOrProvince: "Wyoming",
      date: "2026-08-15",
      latitude: 44.428,
      longitude: -110.5885,
      type: "national-park",
      description: "Geothermal landscapes, wildlife, and classic park drives.",
      completed: false,
    },
    {
      id: "grand-teton-national-park",
      name: "Grand Teton National Park",
      stateOrProvince: "Wyoming",
      date: "2026-08-17",
      latitude: 43.7904,
      longitude: -110.6818,
      type: "national-park",
      description: "Mountain views and lakeside stops beneath the Teton Range.",
      completed: false,
    },
    {
      id: "seattle",
      name: "Seattle",
      stateOrProvince: "Washington",
      date: "2026-08-21",
      latitude: 47.6062,
      longitude: -122.3321,
      type: "destination",
      description: "Final destination on the provisional westbound route.",
      completed: false,
    },
  ],
};

export const orderedStops = [...torontoToSeattleTrip.stops].sort(
  (firstStop, secondStop) => firstStop.date.localeCompare(secondStop.date),
);
