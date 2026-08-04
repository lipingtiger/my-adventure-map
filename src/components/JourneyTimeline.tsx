import { CheckCircle2, CircleDashed } from "lucide-react";
import { orderedStops } from "../data/trips/torontoToSeattle";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export function JourneyTimeline() {
  return (
    <section className="timeline" aria-labelledby="timeline-title">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Route timeline</span>
          <h2 id="timeline-title">Stops in order</h2>
        </div>
      </div>
      <ol className="timeline__list">
        {orderedStops.map((stop) => {
          const Icon = stop.completed ? CheckCircle2 : CircleDashed;

          return (
            <li className="timeline-stop" data-status={stop.completed ? "completed" : "planned"} key={stop.id}>
              <div className="timeline-stop__marker">
                <Icon aria-hidden="true" size={20} />
              </div>
              <div className="timeline-stop__content">
                <time dateTime={stop.date}>{formatDate(stop.date)}</time>
                <h3>{stop.name}</h3>
                <p>{stop.description}</p>
                <span>{stop.completed ? "Completed" : "Planned"}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
