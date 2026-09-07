import { CalendarDays, Flag, MapPin, Milestone } from "lucide-react";
import { Journey } from "../types";
import { formatDateRange, getJourneyDurationDays } from "../utils/journey";

export function JourneyOverview({ journey }: { journey: Journey }) {
  const durationDays = getJourneyDurationDays(journey);
  const overviewItems = [
    {
      icon: MapPin,
      label: "Current Journey",
      value: journey.title,
    },
    {
      icon: CalendarDays,
      label: "Travel Dates",
      value: formatDateRange(journey.startDate, journey.endDate),
    },
    {
      icon: Flag,
      label: "Journey Status",
      value: journey.status,
    },
    {
      icon: Milestone,
      label: "Overview",
      value: [journey.totalDistanceLabel, durationDays > 0 ? `${durationDays} travel days` : journey.durationLabel].filter(Boolean).join(" | ") || "Planning",
    },
  ];

  return (
    <section className="overview" aria-labelledby="overview-title">
      <div className="section-heading">
        <span className="section-kicker">Journey Overview</span>
        <h2 id="overview-title">{journey.description}</h2>
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
