import { torontoToSeattleTrip } from "./trips/torontoToSeattle";

const startStop = torontoToSeattleTrip.stops[0];
const endStop = torontoToSeattleTrip.stops[torontoToSeattleTrip.stops.length - 1];

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
  currentJourney: `${startStop.name} \u2192 ${endStop.name}`,
  travelDates: `${formatDate(torontoToSeattleTrip.startDate)} - ${formatDate(torontoToSeattleTrip.endDate)}`,
  distanceLabel: torontoToSeattleTrip.estimatedDistanceLabel,
  stopsLabel: `${torontoToSeattleTrip.stops.length} planned stops`,
  storyLabel: torontoToSeattleTrip.durationLabel,
};
