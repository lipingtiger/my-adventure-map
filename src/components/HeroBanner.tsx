import { Compass, MapPinned } from "lucide-react";
import heroImage from "../assets/adventure-hero.png";
import { journey } from "../data/journey";

export function HeroBanner() {
  return (
    <section className="hero" aria-label="Adventure map hero">
      <img className="hero__image" src={heroImage} alt="Scenic road winding toward mountains and coast" />
      <div className="hero__shade" />
      <div className="hero__content">
        <div className="hero__eyebrow">
          <Compass aria-hidden="true" size={18} />
          Road trip journal
        </div>
        <h1>{journey.title}</h1>
        <p>{journey.subtitle}</p>
        <div className="hero__route" aria-label={`Current journey: ${journey.currentJourney}`}>
          <MapPinned aria-hidden="true" size={20} />
          <span>{journey.currentJourney}</span>
        </div>
      </div>
    </section>
  );
}
