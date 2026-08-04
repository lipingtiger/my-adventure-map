import { Navigate, useParams } from "react-router-dom";
import { JourneyTimeline } from "../components/JourneyTimeline";
import { JourneyOverview } from "../components/JourneyOverview";
import { TripMap } from "../components/TripMap";
import { getJourneyBySlug } from "../data/journeys";

export function JourneyDetailsPage() {
  const { slug } = useParams();
  const journey = getJourneyBySlug(slug);

  if (!journey) {
    return <Navigate to="/journeys" replace />;
  }

  return (
    <main className="standard-page">
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
