import { Link } from "react-router-dom";
import { journeys } from "../data/journeys";
import { formatDateRange, getTimelineStops } from "../utils/journey";

function countNationalParks(journeyId: string) {
  const journey = journeys.find((item) => item.id === journeyId);

  if (!journey) {
    return 0;
  }

  return journey.stops.filter((stop) => stop.type === "national-park").length;
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
          {journeys.map((journey) => {
            const timelineStops = getTimelineStops(journey);

            return (
              <Link className="journey-card" key={journey.id} to={`/journeys/${journey.slug}`}>
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
                      <dd>{countNationalParks(journey.id)}</dd>
                    </div>
                    <div>
                      <dt>Hikes</dt>
                      <dd>{journey.hikes.length}</dd>
                    </div>
                  </dl>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
