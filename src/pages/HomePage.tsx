import { HeroBanner } from "../components/HeroBanner";
import { JourneyTimeline } from "../components/JourneyTimeline";
import { JourneyOverview } from "../components/JourneyOverview";
import { TripMap } from "../components/TripMap";

export function HomePage() {
  return (
    <main>
      <HeroBanner />
      <div className="page-shell">
        <TripMap />
        <JourneyOverview />
        <JourneyTimeline />
      </div>
    </main>
  );
}
