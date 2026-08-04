import { CheckCircle2, CircleDashed } from "lucide-react";
import { Journey } from "../types";
import { formatShortDate, getStopAttractions, getStopHikes, getStopLodging, getTimelineStops } from "../utils/journey";

function listLodgingTypes(types: { type: string }[]) {
  if (!types.length) {
    return "Flexible";
  }

  return [...new Set(types.map((item) => item.type))].join(", ");
}

export function JourneyTimeline({ journey }: { journey: Journey }) {
  const timelineStops = getTimelineStops(journey);

  return (
    <section className="timeline" aria-labelledby="timeline-title">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Route timeline</span>
          <h2 id="timeline-title">{journey.durationLabel}</h2>
        </div>
      </div>
      <ol className="timeline__list">
        {timelineStops.map((stop) => {
          const Icon = stop.completed ? CheckCircle2 : CircleDashed;
          const status = stop.completed ? "completed" : "planned";
          const lodging = getStopLodging(journey, stop.id);
          const attractions = getStopAttractions(journey, stop.id);
          const hikes = getStopHikes(journey, stop.id);

          return (
            <li className="timeline-stop" data-status={status} key={stop.id}>
              <div className="timeline-stop__marker">
                <Icon aria-hidden="true" size={20} />
              </div>
              <details className="timeline-stop__content" open={stop.order <= 3}>
                <summary>
                  <span className="timeline-stop__date">
                    Day {stop.order} | <time dateTime={stop.date}>{formatShortDate(stop.date)}</time>
                  </span>
                  <h3>{stop.name}</h3>
                  <span className="timeline-stop__route">
                    {stop.startPoint} to {stop.destination}
                  </span>
                </summary>
                <div className="timeline-stop__details">
                  <p>{stop.description}</p>
                  <div className="timeline-meta">
                    <span>Overnight: {stop.overnight ?? "Flexible"}</span>
                    <span>Lodging: {listLodgingTypes(lodging)}</span>
                    <span>{stop.optional ? "Optional" : status === "completed" ? "Completed" : "Planned"}</span>
                  </div>
                  {attractions.length ? (
                    <div className="timeline-detail-block">
                      <h4>Attractions</h4>
                      <ul>
                        {attractions.map((attraction) => (
                          <li key={attraction.id}>
                            <strong>{attraction.name}</strong>: {attraction.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {hikes.length ? (
                    <div className="timeline-detail-block">
                      <h4>Hiking Options</h4>
                      <ul>
                        {hikes.map((hike) => (
                          <li key={hike.id}>
                            <strong>{hike.name}</strong>: {hike.distanceKm ? `${hike.distanceKm} km, ` : ""}
                            {hike.difficulty}, {hike.estimatedHours}. {hike.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
