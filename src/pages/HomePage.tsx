import { HeroBanner } from "../components/HeroBanner";
import { JourneyTimeline } from "../components/JourneyTimeline";
import { JourneyOverview } from "../components/JourneyOverview";
import { TripMap } from "../components/TripMap";
import { currentJourney } from "../data/journeys";

export function HomePage() {
  return (
    <main>
      <HeroBanner journey={currentJourney} />
      <div className="page-shell">
        <TripMap journey={currentJourney} />
        <JourneyOverview journey={currentJourney} />
        <JourneyTimeline journey={currentJourney} />
      </div>
    </main>
  );
}
