import { HeroBanner } from "../components/HeroBanner";
import { JourneyTimeline } from "../components/JourneyTimeline";
import { JourneyOverview } from "../components/JourneyOverview";
import { TripMap } from "../components/TripMap";
import { currentJourney } from "../data/journeys";
import { useJourneyStopOverrides } from "../hooks/useJourneyStopOverrides";

export function HomePage() {
  const { journey } = useJourneyStopOverrides(currentJourney);

  return (
    <main>
      <HeroBanner journey={journey} />
      <div className="page-shell">
        <TripMap journey={journey} />
        <JourneyOverview journey={journey} />
        <JourneyTimeline journey={journey} />
      </div>
    </main>
  );
}
