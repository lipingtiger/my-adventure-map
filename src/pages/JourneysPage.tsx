import { Link } from "react-router-dom";
import { journeys } from "../data/journeys";
import { useJourneyStopOverrides } from "../hooks/useJourneyStopOverrides";
import { Journey } from "../types";
import { formatDateRange, getTimelineStops } from "../utils/journey";

function JourneyCard({ baseJourney }: { baseJourney: Journey }) {
  const { journey } = useJourneyStopOverrides(baseJourney);
  const timelineStops = getTimelineStops(journey);
  const nationalParkCount = journey.stops.filter((stop) => stop.type === "national-park").length;
  const hikingStopCount = journey.stops.filter((stop) => stop.type === "hiking").length;

  return (
    <Link className="journey-card" to={`/journeys/${journey.slug}`}>
      <div className="journey-card__cover" aria-hidden="true">
        <span>Cover image</span>
      </div>
      <div className="journey-card__body">
        <span className="journey-card__status">{journey.status}</span>
        <h2>{journey.title}</h2>
        <p className="journey-card__date">{formatDateRange(journey.startDate, journey.endDate)}</p>
        <p>{journey.description}</p>
        <dl className="journey-card__stats">
          <div>
            <dt>Total distance</dt>
            <dd>{journey.totalDistanceLabel}</dd>
          </div>
          <div>
            <dt>Stops</dt>
            <dd>{timelineStops.length}</dd>
          </div>
          <div>
            <dt>National parks</dt>
            <dd>{nationalParkCount}</dd>
          </div>
          <div>
            <dt>Hikes</dt>
            <dd>{hikingStopCount}</dd>
          </div>
        </dl>
      </div>
    </Link>
  );
}

export function JourneysPage() {
  return (
    <main className="standard-page">
      <div className="page-shell page-shell--standard">
        <div className="section-heading">
          <div>
            <span className="section-kicker">All journeys</span>
            <h1>Journeys</h1>
          </div>
        </div>
        <div className="journey-card-grid">
          {journeys.map((journey) => (
            <JourneyCard baseJourney={journey} key={journey.id} />
          ))}
        </div>
      </div>
    </main>
  );
}
