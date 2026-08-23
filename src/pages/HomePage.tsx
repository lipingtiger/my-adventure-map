import { HeroBanner } from "../components/HeroBanner";
import { JourneyTimeline } from "../components/JourneyTimeline";
import { JourneyOverview } from "../components/JourneyOverview";
import { TripMap } from "../components/TripMap";
import { currentJourney } from "../data/journeys";
import { useJourneyStopOverrides } from "../hooks/useJourneyStopOverrides";

export function HomePage() {
  const { errorMessage, isLoading, journey } = useJourneyStopOverrides(currentJourney);

  if (isLoading || errorMessage) {
    return (
      <main className="standard-page" aria-busy={isLoading}>
        <div className="page-shell page-shell--standard">
          <p className={`journey-loading${errorMessage ? " journey-loading--error" : ""}`}>
            {errorMessage ? "Unable to load the latest journey. Please try again." : "Loading latest journey..."}
          </p>
        </div>
      </main>
    );
  }

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
