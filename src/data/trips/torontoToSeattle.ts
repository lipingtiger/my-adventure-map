export type TripStatus = "planning" | "active" | "completed";

export type StopType =
  | "start"
  | "city"
  | "scenic-stop"
  | "national-park"
  | "hiking"
  | "overnight"
  | "destination";

export type LodgingType = "motel" | "hostel" | "campground" | "lodge";

export type LodgingOption = {
  name: string;
  type: LodgingType;
  city: string;
  website?: string;
  notes?: string;
};

export type Attraction = {
  name: string;
  type: string;
  latitude?: number;
  longitude?: number;
  description: string;
  estimatedVisitHours?: number;
};

export type Hike = {
  name: string;
  distanceKm?: number;
  difficulty: string;
  estimatedHours: string;
  trailhead: string;
  latitude?: number;
  longitude?: number;
  description: string;
  reservationRequired: boolean;
  seasonalNotes?: string;
};

export type TripStop = {
  id: string;
  order: number;
  name: string;
  city?: string;
  stateOrProvince: string;
  country: string;
  date: string;
  latitude: number;
  longitude: number;
  type: StopType;
  description: string;
  completed: boolean;
  overnight?: string;
  lodgingOptions?: LodgingOption[];
  attractions?: Attraction[];
  hikes?: Hike[];
  notes?: string[];
  startPoint?: string;
  destination?: string;
  optional?: boolean;
};

export type Trip = {
  id: string;
  title: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  description: string;
  estimatedDistanceLabel: string;
  durationLabel: string;
  routeNote: string;
  stops: TripStop[];
};

// Route editing guide:
// - Change a date by editing a stop's `date`, plus trip `startDate` or `endDate` if needed.
// - Reorder stops by changing `order`; map and timeline sort by this value.
// - Add a new stop by copying an object in `stops`, giving it a unique `id`, and setting coordinates.
// - Mark a stop optional by adding `optional: true` and describing the condition in `notes`.
// - Add lodging with `lodgingOptions`; use motel, hostel, campground, or lodge for `type`.
// - Add an attraction with `attractions`; latitude and longitude are optional for side visits.
// - Add a hike with `hikes`; use `reservationRequired` and `seasonalNotes` for planning constraints.
export const torontoToSeattleTrip: Trip = {
  id: "toronto-to-seattle-us-parks-2026",
  title: "Toronto to Seattle",
  subtitle: "A flexible cross-border route through Yellowstone, Grand Teton, and the Pacific Northwest.",
  startDate: "2026-08-05",
  endDate: "2026-08-21",
  status: "planning",
  description:
    "A shorter, more scenic Toronto-to-Seattle road trip that crosses into the United States early, then continues through North Dakota, Wyoming national parks, Idaho, Oregon, and Washington.",
  estimatedDistanceLabel: "4,300+ km",
  durationLabel: "17 days on the road",
  routeNote: "This route is flexible and may change during the journey.",
  stops: [
    {
      id: "day-01-sault-ste-marie",
      order: 1,
      name: "Sault Ste. Marie",
      city: "Sault Ste. Marie",
      stateOrProvince: "Ontario",
      country: "Canada",
      date: "2026-08-05",
      latitude: 46.5219,
      longitude: -84.3461,
      type: "start",
      description: "Long driving day from Toronto to the north shore of Lake Huron.",
      completed: false,
      overnight: "Sault Ste. Marie",
      startPoint: "Toronto, Ontario",
      destination: "Sault Ste. Marie, Ontario",
      lodgingOptions: [
        {
          name: "Sault Ste. Marie motel or campground",
          type: "motel",
          city: "Sault Ste. Marie",
          notes: "Choose a flexible one-night option near the highway or waterfront.",
        },
      ],
      notes: ["Toronto departure coordinate: 43.6532, -79.3832."],
    },
    {
      id: "day-02-duluth",
      order: 2,
      name: "Duluth",
      city: "Duluth",
      stateOrProvince: "Minnesota",
      country: "United States",
      date: "2026-08-06",
      latitude: 46.7867,
      longitude: -92.1005,
      type: "overnight",
      description: "Cross into the United States and follow Lake Superior toward Duluth.",
      completed: false,
      overnight: "Duluth",
      startPoint: "Sault Ste. Marie, Ontario",
      destination: "Duluth, Minnesota",
      lodgingOptions: [
        {
          name: "Duluth waterfront motel",
          type: "motel",
          city: "Duluth",
          notes: "Look near Canal Park if walkability matters.",
        },
        {
          name: "Lake Superior campground",
          type: "campground",
          city: "Duluth",
          notes: "Weather-dependent backup for a lower-cost overnight.",
        },
      ],
      attractions: [
        {
          name: "Lake Superior waterfront",
          type: "waterfront",
          description: "Evening walk along the lakefront after arrival.",
          estimatedVisitHours: 1,
        },
        {
          name: "Canal Park",
          type: "district",
          latitude: 46.7797,
          longitude: -92.0923,
          description: "Historic waterfront district with food, lake views, and shipping activity.",
          estimatedVisitHours: 2,
        },
        {
          name: "Aerial Lift Bridge",
          type: "landmark",
          latitude: 46.7791,
          longitude: -92.0947,
          description: "Duluth's signature bridge at the entrance to the harbor.",
          estimatedVisitHours: 0.5,
        },
      ],
    },
    {
      id: "day-03-fargo",
      order: 3,
      name: "Fargo",
      city: "Fargo",
      stateOrProvince: "North Dakota",
      country: "United States",
      date: "2026-08-07",
      latitude: 46.8772,
      longitude: -96.7898,
      type: "overnight",
      description: "Moderate driving day across Minnesota into North Dakota.",
      completed: false,
      overnight: "Fargo",
      startPoint: "Duluth, Minnesota",
      destination: "Fargo, North Dakota",
      lodgingOptions: [
        {
          name: "Fargo highway motel",
          type: "motel",
          city: "Fargo",
          notes: "Prioritize easy parking and quick morning departure.",
        },
      ],
    },
    {
      id: "day-04-medora-theodore-roosevelt",
      order: 4,
      name: "Medora and Theodore Roosevelt National Park",
      city: "Medora",
      stateOrProvince: "North Dakota",
      country: "United States",
      date: "2026-08-08",
      latitude: 46.9139,
      longitude: -103.5244,
      type: "national-park",
      description: "Drive to Medora and visit Theodore Roosevelt National Park's South Unit.",
      completed: false,
      overnight: "Medora",
      startPoint: "Fargo, North Dakota",
      destination: "Medora, North Dakota",
      lodgingOptions: [
        {
          name: "Medora motel or lodge",
          type: "motel",
          city: "Medora",
          notes: "Book early because Medora is small and park demand can be high.",
        },
        {
          name: "Theodore Roosevelt area campground",
          type: "campground",
          city: "Medora",
          notes: "Good weather-dependent option near the South Unit.",
        },
      ],
      attractions: [
        {
          name: "Theodore Roosevelt National Park, South Unit",
          type: "national park",
          latitude: 46.979,
          longitude: -103.5387,
          description: "Badlands scenery and wildlife near Medora.",
          estimatedVisitHours: 3,
        },
        {
          name: "Painted Canyon",
          type: "viewpoint",
          latitude: 46.8953,
          longitude: -103.3779,
          description: "Accessible overlook into layered badlands terrain.",
          estimatedVisitHours: 0.75,
        },
        {
          name: "Scenic Loop Drive",
          type: "scenic drive",
          description: "Main South Unit drive with overlooks and wildlife viewing.",
          estimatedVisitHours: 2,
        },
      ],
      hikes: [
        {
          name: "Wind Canyon Trail",
          distanceKm: 1.5,
          difficulty: "easy",
          estimatedHours: "1 hour",
          trailhead: "Wind Canyon Trailhead",
          latitude: 46.9472,
          longitude: -103.5228,
          description: "Short badlands trail with Little Missouri River views.",
          reservationRequired: false,
        },
      ],
    },
    {
      id: "day-05-cody",
      order: 5,
      name: "Cody",
      city: "Cody",
      stateOrProvince: "Wyoming",
      country: "United States",
      date: "2026-08-09",
      latitude: 44.5263,
      longitude: -109.0565,
      type: "overnight",
      description: "Long scenic drive toward Yellowstone with a western gateway overnight.",
      completed: false,
      overnight: "Cody",
      startPoint: "Medora, North Dakota",
      destination: "Cody, Wyoming",
      lodgingOptions: [
        {
          name: "Cody motel",
          type: "motel",
          city: "Cody",
          notes: "Good flexible base before Yellowstone's East Entrance.",
        },
        {
          name: "Cody hostel or cabin",
          type: "hostel",
          city: "Cody",
          notes: "Use as a lower-cost backup if available.",
        },
      ],
      attractions: [
        {
          name: "Buffalo Bill Center of the West",
          type: "museum",
          latitude: 44.526,
          longitude: -109.0737,
          description: "Large western history museum complex; visit if arrival time allows.",
          estimatedVisitHours: 2,
        },
        {
          name: "Cody historic downtown",
          type: "downtown",
          description: "Walkable evening stop for food and supplies.",
          estimatedVisitHours: 1,
        },
      ],
    },
    {
      id: "day-06-yellowstone-east",
      order: 6,
      name: "Yellowstone National Park",
      city: "Yellowstone National Park",
      stateOrProvince: "Wyoming",
      country: "United States",
      date: "2026-08-10",
      latitude: 44.428,
      longitude: -110.5885,
      type: "national-park",
      description: "Enter through Yellowstone East Entrance and explore lake, geyser, and valley areas.",
      completed: false,
      overnight: "Yellowstone area, Cody, West Yellowstone, or park lodge depending on availability",
      startPoint: "Cody, Wyoming",
      destination: "Yellowstone National Park",
      lodgingOptions: [
        {
          name: "Yellowstone park lodge",
          type: "lodge",
          city: "Yellowstone National Park",
          notes: "Best location if available; book early.",
        },
        {
          name: "West Yellowstone motel",
          type: "motel",
          city: "West Yellowstone",
          notes: "Practical outside-park backup.",
        },
        {
          name: "Cody motel backup",
          type: "motel",
          city: "Cody",
          notes: "Longer drive, but useful if park-area lodging is full.",
        },
      ],
      attractions: [
        {
          name: "Yellowstone Lake",
          type: "lake",
          latitude: 44.4279,
          longitude: -110.5885,
          description: "Large high-elevation lake near the East Entrance route.",
          estimatedVisitHours: 1,
        },
        {
          name: "West Thumb Geyser Basin",
          type: "geyser basin",
          latitude: 44.4156,
          longitude: -110.5727,
          description: "Boardwalk geothermal area beside Yellowstone Lake.",
          estimatedVisitHours: 1,
        },
        {
          name: "Hayden Valley",
          type: "wildlife area",
          latitude: 44.645,
          longitude: -110.464,
          description: "Excellent wildlife viewing corridor.",
          estimatedVisitHours: 1.5,
        },
        {
          name: "Mud Volcano",
          type: "thermal area",
          latitude: 44.625,
          longitude: -110.434,
          description: "Short geothermal boardwalk with active mud features.",
          estimatedVisitHours: 0.75,
        },
      ],
    },
    {
      id: "day-07-yellowstone-geysers",
      order: 7,
      name: "Yellowstone Geyser Basins",
      city: "Yellowstone National Park",
      stateOrProvince: "Wyoming",
      country: "United States",
      date: "2026-08-11",
      latitude: 44.4605,
      longitude: -110.8281,
      type: "hiking",
      description: "Geyser basin day with Old Faithful, Grand Prismatic Spring, and an optional longer hike.",
      completed: false,
      overnight: "Yellowstone area or West Yellowstone",
      startPoint: "Yellowstone area",
      destination: "Yellowstone National Park",
      lodgingOptions: [
        {
          name: "West Yellowstone motel",
          type: "motel",
          city: "West Yellowstone",
          notes: "Convenient for west-side geyser basin access.",
        },
        {
          name: "Yellowstone campground or lodge",
          type: "campground",
          city: "Yellowstone National Park",
          notes: "Use only if reservation and weather line up.",
        },
      ],
      attractions: [
        {
          name: "Old Faithful",
          type: "geyser",
          latitude: 44.4605,
          longitude: -110.8281,
          description: "Classic geyser stop in the Upper Geyser Basin.",
          estimatedVisitHours: 1.5,
        },
        {
          name: "Upper Geyser Basin",
          type: "geyser basin",
          latitude: 44.4663,
          longitude: -110.8379,
          description: "Boardwalk and trail network around dense geothermal features.",
          estimatedVisitHours: 2,
        },
        {
          name: "Grand Prismatic Spring",
          type: "thermal spring",
          latitude: 44.525,
          longitude: -110.8382,
          description: "Colorful thermal spring with overlook access nearby.",
          estimatedVisitHours: 1,
        },
      ],
      hikes: [
        {
          name: "Fairy Falls and Grand Prismatic Overlook",
          distanceKm: 8,
          difficulty: "moderate",
          estimatedHours: "3 to 4 hours",
          trailhead: "Fairy Falls Trailhead",
          latitude: 44.5155,
          longitude: -110.8328,
          description: "Moderate hike pairing the Grand Prismatic overlook with Fairy Falls.",
          reservationRequired: false,
          seasonalNotes: "Check thermal-area closures and afternoon storm risk.",
        },
      ],
    },
    {
      id: "day-08-yellowstone-canyon",
      order: 8,
      name: "Yellowstone Canyon and Mammoth",
      city: "Yellowstone National Park",
      stateOrProvince: "Wyoming",
      country: "United States",
      date: "2026-08-12",
      latitude: 44.7191,
      longitude: -110.4966,
      type: "national-park",
      description: "Northern Yellowstone day focused on canyon viewpoints, terraces, and wildlife valleys.",
      completed: false,
      overnight: "Yellowstone area or Gardiner",
      startPoint: "Yellowstone area",
      destination: "Yellowstone National Park",
      lodgingOptions: [
        {
          name: "Gardiner motel",
          type: "motel",
          city: "Gardiner",
          notes: "Good north-entrance option after Mammoth or Lamar Valley.",
        },
        {
          name: "Yellowstone park lodge",
          type: "lodge",
          city: "Yellowstone National Park",
          notes: "Best if available and route timing works.",
        },
      ],
      attractions: [
        {
          name: "Grand Canyon of the Yellowstone",
          type: "canyon",
          latitude: 44.7191,
          longitude: -110.4966,
          description: "Major canyon and waterfall viewpoint area.",
          estimatedVisitHours: 2,
        },
        {
          name: "Artist Point",
          type: "viewpoint",
          latitude: 44.7216,
          longitude: -110.4799,
          description: "Famous Lower Falls viewpoint on the South Rim.",
          estimatedVisitHours: 0.75,
        },
        {
          name: "Mammoth Hot Springs",
          type: "thermal terraces",
          latitude: 44.9766,
          longitude: -110.7013,
          description: "Terraced hot springs near Yellowstone's north entrance.",
          estimatedVisitHours: 1.5,
        },
        {
          name: "Lamar Valley",
          type: "wildlife area",
          latitude: 44.927,
          longitude: -110.248,
          description: "Wildlife viewing valley; best around morning or evening.",
          estimatedVisitHours: 2,
        },
      ],
      hikes: [
        {
          name: "Brink of the Lower Falls or South Rim Trail",
          difficulty: "moderate",
          estimatedHours: "1 to 3 hours",
          trailhead: "Canyon Village area",
          latitude: 44.718,
          longitude: -110.496,
          description: "Flexible canyon hike choice depending on time, weather, and parking.",
          reservationRequired: false,
          seasonalNotes: "Trail access may vary with maintenance, weather, or wildlife activity.",
        },
      ],
    },
    {
      id: "day-09-grand-teton-jackson",
      order: 9,
      name: "Grand Teton National Park and Jackson",
      city: "Jackson",
      stateOrProvince: "Wyoming",
      country: "United States",
      date: "2026-08-13",
      latitude: 43.7904,
      longitude: -110.6818,
      type: "national-park",
      description: "Travel from Yellowstone through Grand Teton National Park to Jackson.",
      completed: false,
      overnight: "Jackson or nearby hostel/motel",
      startPoint: "Yellowstone National Park",
      destination: "Jackson, Wyoming",
      lodgingOptions: [
        {
          name: "Jackson motel",
          type: "motel",
          city: "Jackson",
          notes: "Expensive area; compare nearby towns if budget is tight.",
        },
        {
          name: "Jackson hostel",
          type: "hostel",
          city: "Jackson",
          notes: "Lower-cost option if available.",
        },
      ],
      attractions: [
        {
          name: "Oxbow Bend",
          type: "viewpoint",
          latitude: 43.8666,
          longitude: -110.5476,
          description: "Classic Snake River and Mount Moran viewpoint.",
          estimatedVisitHours: 0.5,
        },
        {
          name: "Snake River Overlook",
          type: "viewpoint",
          latitude: 43.7544,
          longitude: -110.624,
          description: "Historic Teton viewpoint above the Snake River.",
          estimatedVisitHours: 0.5,
        },
        {
          name: "Mormon Row",
          type: "historic district",
          latitude: 43.6655,
          longitude: -110.6644,
          description: "Historic barns with Teton backdrop.",
          estimatedVisitHours: 0.75,
        },
        {
          name: "Jackson Lake viewpoints",
          type: "viewpoint",
          description: "Flexible scenic stops along Jackson Lake and Teton Park Road.",
          estimatedVisitHours: 1,
        },
      ],
    },
    {
      id: "day-10-grand-teton-hiking",
      order: 10,
      name: "Grand Teton Hiking Options",
      city: "Jackson",
      stateOrProvince: "Wyoming",
      country: "United States",
      date: "2026-08-14",
      latitude: 43.6973,
      longitude: -110.7328,
      type: "hiking",
      description: "Choose one Grand Teton hike depending on time, weather, parking, and energy.",
      completed: false,
      overnight: "Jackson or nearby",
      startPoint: "Jackson, Wyoming",
      destination: "Grand Teton National Park",
      lodgingOptions: [
        {
          name: "Jackson motel or hostel",
          type: "hostel",
          city: "Jackson",
          notes: "Stay near Jackson for easier food and resupply options.",
        },
      ],
      hikes: [
        {
          name: "Taggart Lake Trail",
          distanceKm: 6,
          difficulty: "easy to moderate",
          estimatedHours: "2 to 3 hours",
          trailhead: "Taggart Lake Trailhead",
          latitude: 43.6973,
          longitude: -110.7328,
          description: "Shorter lake hike with strong Teton views.",
          reservationRequired: false,
          seasonalNotes: "Arrive early for parking during summer.",
        },
        {
          name: "Hidden Falls and Inspiration Point",
          distanceKm: 9,
          difficulty: "moderate",
          estimatedHours: "3 to 5 hours",
          trailhead: "Jenny Lake Trailhead",
          latitude: 43.7519,
          longitude: -110.7218,
          description: "Longer option without the Jenny Lake boat; shorter if using the boat shuttle.",
          reservationRequired: false,
          seasonalNotes: "Boat operations and trail conditions can change; check before choosing.",
        },
      ],
      notes: ["Both hikes are options; choose one depending on time and energy."],
    },
    {
      id: "day-11-twin-falls",
      order: 11,
      name: "Twin Falls",
      city: "Twin Falls",
      stateOrProvince: "Idaho",
      country: "United States",
      date: "2026-08-15",
      latitude: 42.5629,
      longitude: -114.4609,
      type: "overnight",
      description: "Drive from Jackson to Twin Falls and reset with canyon viewpoints.",
      completed: false,
      overnight: "Twin Falls",
      startPoint: "Jackson, Wyoming",
      destination: "Twin Falls, Idaho",
      lodgingOptions: [
        {
          name: "Twin Falls motel",
          type: "motel",
          city: "Twin Falls",
          notes: "Convenient stop before a shorter Boise day.",
        },
      ],
      attractions: [
        {
          name: "Shoshone Falls",
          type: "waterfall",
          latitude: 42.5959,
          longitude: -114.4005,
          description: "Major Snake River waterfall near Twin Falls.",
          estimatedVisitHours: 1,
        },
        {
          name: "Snake River Canyon",
          type: "canyon",
          description: "Scenic canyon area around Twin Falls.",
          estimatedVisitHours: 1,
        },
        {
          name: "Perrine Memorial Bridge",
          type: "bridge",
          latitude: 42.6006,
          longitude: -114.4511,
          description: "High bridge over the Snake River Canyon.",
          estimatedVisitHours: 0.5,
        },
      ],
    },
    {
      id: "day-12-boise",
      order: 12,
      name: "Boise",
      city: "Boise",
      stateOrProvince: "Idaho",
      country: "United States",
      date: "2026-08-16",
      latitude: 43.615,
      longitude: -116.2023,
      type: "city",
      description: "Shorter day into Boise with time for a walk and food downtown.",
      completed: false,
      overnight: "Boise",
      startPoint: "Twin Falls, Idaho",
      destination: "Boise, Idaho",
      lodgingOptions: [
        {
          name: "Boise motel or hostel",
          type: "motel",
          city: "Boise",
          notes: "Pick a central location if planning to walk downtown.",
        },
      ],
      attractions: [
        {
          name: "Boise River Greenbelt",
          type: "urban trail",
          latitude: 43.6137,
          longitude: -116.2041,
          description: "Easy walk or bike path along the Boise River.",
          estimatedVisitHours: 1.5,
        },
        {
          name: "Downtown Boise",
          type: "downtown",
          description: "Food, supplies, and an easier evening after park days.",
          estimatedVisitHours: 2,
        },
      ],
    },
    {
      id: "day-13-pendleton",
      order: 13,
      name: "Pendleton",
      city: "Pendleton",
      stateOrProvince: "Oregon",
      country: "United States",
      date: "2026-08-17",
      latitude: 45.6721,
      longitude: -118.7886,
      type: "overnight",
      description: "Shorter recovery driving day from Boise to Pendleton.",
      completed: false,
      overnight: "Pendleton",
      startPoint: "Boise, Idaho",
      destination: "Pendleton, Oregon",
      lodgingOptions: [
        {
          name: "Pendleton motel",
          type: "motel",
          city: "Pendleton",
          notes: "Simple overnight before the Columbia River Gorge.",
        },
      ],
    },
    {
      id: "day-14-columbia-river-gorge-portland",
      order: 14,
      name: "Columbia River Gorge and Portland Area",
      city: "Portland",
      stateOrProvince: "Oregon",
      country: "United States",
      date: "2026-08-18",
      latitude: 45.5762,
      longitude: -122.1158,
      type: "scenic-stop",
      description: "Follow the Columbia River Gorge toward the Portland area.",
      completed: false,
      overnight: "Portland or nearby",
      startPoint: "Pendleton, Oregon",
      destination: "Portland area, Oregon",
      lodgingOptions: [
        {
          name: "Portland area motel",
          type: "motel",
          city: "Portland",
          notes: "Choose based on parking and morning route toward Seattle.",
        },
        {
          name: "Portland hostel",
          type: "hostel",
          city: "Portland",
          notes: "Possible lower-cost option if secure parking is available.",
        },
      ],
      attractions: [
        {
          name: "Multnomah Falls",
          type: "waterfall",
          latitude: 45.5762,
          longitude: -122.1158,
          description: "Iconic Columbia River Gorge waterfall.",
          estimatedVisitHours: 1,
        },
        {
          name: "Historic Columbia River Highway",
          type: "scenic drive",
          description: "Historic route with viewpoints and waterfall access.",
          estimatedVisitHours: 2,
        },
      ],
      hikes: [
        {
          name: "Multnomah Falls to Benson Bridge",
          difficulty: "easy",
          estimatedHours: "1 hour",
          trailhead: "Multnomah Falls Lodge",
          latitude: 45.5762,
          longitude: -122.1158,
          description: "Short classic walk to the bridge viewpoint.",
          reservationRequired: false,
          seasonalNotes: "Timed-use permits or access restrictions may apply in peak season.",
        },
      ],
    },
    {
      id: "day-15-seattle-arrival",
      order: 15,
      name: "Seattle Arrival",
      city: "Seattle",
      stateOrProvince: "Washington",
      country: "United States",
      date: "2026-08-19",
      latitude: 47.6062,
      longitude: -122.3321,
      type: "destination",
      description: "Travel from the Portland area to Seattle, with Mount St. Helens as an optional stop.",
      completed: false,
      overnight: "Seattle",
      startPoint: "Portland area, Oregon",
      destination: "Seattle, Washington",
      lodgingOptions: [
        {
          name: "Seattle motel or hostel",
          type: "hostel",
          city: "Seattle",
          notes: "Prioritize parking, transit access, and cancellation flexibility.",
        },
      ],
      attractions: [
        {
          name: "Mount St. Helens optional stop",
          type: "optional scenic stop",
          latitude: 46.1912,
          longitude: -122.1944,
          description: "Optional detour depending on road conditions and available time.",
          estimatedVisitHours: 2,
        },
      ],
      notes: ["Mount St. Helens is optional because road conditions and available time may change."],
    },
    {
      id: "day-16-seattle-buffer",
      order: 16,
      name: "Seattle Buffer Day",
      city: "Seattle",
      stateOrProvince: "Washington",
      country: "United States",
      date: "2026-08-20",
      latitude: 47.6205,
      longitude: -122.3493,
      type: "city",
      description: "Use for rest, delayed arrival, vehicle issues, or sightseeing.",
      completed: false,
      overnight: "Seattle",
      startPoint: "Seattle, Washington",
      destination: "Seattle, Washington",
      optional: true,
      lodgingOptions: [
        {
          name: "Seattle flexible second night",
          type: "hostel",
          city: "Seattle",
          notes: "Keep flexible until the route timing is clearer.",
        },
      ],
      notes: ["Buffer day can be repurposed for sightseeing or recovery."],
    },
    {
      id: "day-17-seattle-completion",
      order: 17,
      name: "Seattle Journey Completion",
      city: "Seattle",
      stateOrProvince: "Washington",
      country: "United States",
      date: "2026-08-21",
      latitude: 47.608,
      longitude: -122.3352,
      type: "destination",
      description: "Journey completion day in Seattle.",
      completed: false,
      overnight: "Seattle",
      startPoint: "Seattle, Washington",
      destination: "Seattle, Washington",
      notes: ["Use this as the official trip completion marker."],
    },
  ],
};

export const orderedStops = [...torontoToSeattleTrip.stops].sort(
  (firstStop, secondStop) => firstStop.order - secondStop.order,
);
