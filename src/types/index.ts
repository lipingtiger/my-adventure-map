export type JourneyStatus = "planning" | "active" | "completed";

export type StopType =
  | "start"
  | "city"
  | "scenic-stop"
  | "national-park"
  | "hiking"
  | "overnight"
  | "destination";

export type LodgingType = "motel" | "hostel" | "campground" | "lodge";

export interface Stop {
  id: string;
  journeyId: string;
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
  drivingDistanceKm?: number;
  drivingDistanceNote?: string;
  overnight?: string;
  notes?: string[];
  startPoint?: string;
  destination?: string;
  optional?: boolean;
  showInTimeline?: boolean;
}

export interface Attraction {
  id: string;
  journeyId: string;
  stopId: string;
  name: string;
  type: string;
  latitude?: number;
  longitude?: number;
  description: string;
  estimatedVisitHours?: number;
}

export interface Hike {
  id: string;
  journeyId: string;
  stopId: string;
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
  optional?: boolean;
}

export interface Lodging {
  id: string;
  journeyId: string;
  stopId: string;
  name: string;
  type: LodgingType;
  city: string;
  website?: string;
  notes?: string;
}

export interface Photo {
  id: string;
  journeyId: string;
  stopId?: string;
  title: string;
  src?: string;
  alt: string;
  date?: string;
  caption?: string;
}

export interface Video {
  id: string;
  journeyId: string;
  stopId?: string;
  title: string;
  src?: string;
  thumbnailSrc?: string;
  date?: string;
  caption?: string;
}

export interface JournalEntry {
  id: string;
  journeyId: string;
  stopId?: string;
  title: string;
  date: string;
  body: string;
  mood?: string;
  tags?: string[];
}

export interface Journey {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  status: JourneyStatus;
  description: string;
  routeNote: string;
  totalDistanceLabel: string;
  durationLabel: string;
  coverImage?: string;
  stops: Stop[];
  attractions: Attraction[];
  hikes: Hike[];
  lodging: Lodging[];
  photos: Photo[];
  videos: Video[];
  journalEntries: JournalEntry[];
}
