import { Link, useParams } from "react-router-dom";
import { HeroBanner } from "../components/HeroBanner";
import { useJourneys } from "../hooks/useJourneys";
import { JourneyTimeline } from "../components/JourneyTimeline";
import { JourneyOverview } from "../components/JourneyOverview";
import { TripMap } from "../components/TripMap";
import { getJourneyBySlug } from "../data/journeys";
import { useJourneyStopOverrides } from "../hooks/useJourneyStopOverrides";
import { Journey } from "../types";

function JourneyDetailsContent({ baseJourney }: { baseJourney: Journey }) {
  const { errorMessage, isLoading } = useJourneys();
  const journey = baseJourney;

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
      <div className="page-shell page-shell--standard">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Journey Details</span>
            <h1>{journey.title}</h1>
          </div>
        </div>
        <TripMap journey={journey} />
        <JourneyOverview journey={journey} />
        <JourneyTimeline journey={journey} />
      </div>
    </main>
  );
}

export function JourneyDetailsPage() {
  const { slug } = useParams();
  const { journeys, isLoading, errorMessage } = useJourneys();
  const baseJourney = journeys.find((journey) => journey.slug === slug);

  if (!baseJourney) {
    return <main className="page-shell standard-page"><p>{isLoading ? "Loading journey..." : errorMessage || "Journey not found."}</p><Link to="/journeys">All journeys</Link></main>;
  }

  return <JourneyDetailsContent key={baseJourney.id} baseJourney={baseJourney} />;
}
