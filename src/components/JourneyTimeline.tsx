import { CheckCircle2, CircleDashed } from "lucide-react";
import { orderedStops } from "../data/trips/torontoToSeattle";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function listLodgingTypes(types?: { type: string }[]) {
  if (!types?.length) {
    return "Flexible";
  }

  return [...new Set(types.map((item) => item.type))].join(", ");
}

export function JourneyTimeline() {
  return (
    <section className="timeline" aria-labelledby="timeline-title">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Route timeline</span>
          <h2 id="timeline-title">17-day provisional itinerary</h2>
        </div>
      </div>
      <ol className="timeline__list">
        {orderedStops.map((stop) => {
          const Icon = stop.completed ? CheckCircle2 : CircleDashed;
          const status = stop.completed ? "completed" : "planned";

          return (
            <li className="timeline-stop" data-status={status} key={stop.id}>
              <div className="timeline-stop__marker">
                <Icon aria-hidden="true" size={20} />
              </div>
              <details className="timeline-stop__content" open={stop.order <= 3}>
                <summary>
                  <span className="timeline-stop__date">
                    Day {stop.order} | <time dateTime={stop.date}>{formatDate(stop.date)}</time>
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
                    <span>Lodging: {listLodgingTypes(stop.lodgingOptions)}</span>
                    <span>{stop.optional ? "Optional" : status === "completed" ? "Completed" : "Planned"}</span>
                  </div>
                  {stop.attractions?.length ? (
                    <div className="timeline-detail-block">
                      <h4>Attractions</h4>
                      <ul>
                        {stop.attractions.map((attraction) => (
                          <li key={attraction.name}>
                            <strong>{attraction.name}</strong>: {attraction.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {stop.hikes?.length ? (
                    <div className="timeline-detail-block">
                      <h4>Hiking Options</h4>
                      <ul>
                        {stop.hikes.map((hike) => (
                          <li key={hike.name}>
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
