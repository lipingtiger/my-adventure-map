import { torontoToSeattleTrip } from "./trips/torontoToSeattle";

const orderedStops = [...torontoToSeattleTrip.stops].sort(
  (firstStop, secondStop) => firstStop.order - secondStop.order,
);
const startStop = orderedStops[0];
const endStop = orderedStops[orderedStops.length - 1];

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export const journey = {
  title: "My Adventure Map",
  subtitle: "Every road tells a story.",
  currentJourney: `${startStop.startPoint ?? startStop.name} \u2192 ${endStop.city ?? endStop.name}`,
  travelDates: `${formatDate(torontoToSeattleTrip.startDate)} - ${formatDate(torontoToSeattleTrip.endDate)}`,
  distanceLabel: torontoToSeattleTrip.estimatedDistanceLabel,
  stopsLabel: `${torontoToSeattleTrip.stops.length} flexible days`,
  storyLabel: torontoToSeattleTrip.durationLabel,
};
