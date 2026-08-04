import { CalendarDays, MapPin, Milestone } from "lucide-react";
import { journey } from "../data/journey";

const overviewItems = [
  {
    icon: MapPin,
    label: "Current Journey",
    value: journey.currentJourney,
  },
  {
    icon: CalendarDays,
    label: "Travel Dates",
    value: journey.travelDates,
  },
  {
    icon: Milestone,
    label: "Journey Plan",
    value: journey.stopsLabel,
  },
];

export function JourneyOverview() {
  return (
    <section className="overview" aria-labelledby="overview-title">
      <div className="section-heading">
        <span className="section-kicker">Journey Overview</span>
        <h2 id="overview-title">A westbound story in motion</h2>
      </div>
      <div className="overview__grid">
        {overviewItems.map((item) => {
          const Icon = item.icon;

          return (
            <article className="overview-card" key={item.label}>
              <div className="overview-card__icon">
                <Icon aria-hidden="true" size={22} />
              </div>
              <div>
                <h3>{item.label}</h3>
                <p>{item.value}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
