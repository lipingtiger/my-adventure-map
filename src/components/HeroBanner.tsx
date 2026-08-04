import { Compass, MapPinned } from "lucide-react";
import heroImage from "../assets/adventure-hero.png";
import { Journey } from "../types";
import { getTimelineStops } from "../utils/journey";

export function HeroBanner({ journey }: { journey: Journey }) {
  const timelineStops = getTimelineStops(journey);
  const firstStop = timelineStops[0];
  const lastStop = timelineStops[timelineStops.length - 1];
  const routeLabel = `${firstStop?.startPoint ?? firstStop?.name ?? "Start"} to ${
    lastStop?.destination ?? lastStop?.name ?? "Destination"
  }`;

  return (
    <section className="hero" aria-label="Adventure map hero">
      <img className="hero__image" src={heroImage} alt="Scenic road winding toward mountains and coast" />
      <div className="hero__shade" />
      <div className="hero__content">
        <div className="hero__eyebrow">
          <Compass aria-hidden="true" size={18} />
          {journey.status} journey
        </div>
        <h1>{journey.title}</h1>
        <p>{journey.subtitle}</p>
        <div className="hero__route" aria-label={`Current journey: ${routeLabel}`}>
          <MapPinned aria-hidden="true" size={20} />
          <span>{routeLabel}</span>
        </div>
      </div>
    </section>
  );
}
