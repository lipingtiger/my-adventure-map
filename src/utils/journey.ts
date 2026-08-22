import { Journey, Stop } from "../types";

export function sortStops(stops: Stop[]) {
  return [...stops].sort((firstStop, secondStop) => firstStop.order - secondStop.order);
}

export function getStopDayLabel(stop: Stop) {
  if (typeof stop.dayNumber === "number") {
    return typeof stop.dayStopOrder === "number" && stop.dayStopOrder > 1
      ? `Day ${stop.dayNumber} · Stop ${stop.dayStopOrder}`
      : `Day ${stop.dayNumber}`;
  }

  return stop.showInTimeline === false ? "Route start" : `Day ${stop.order}`;
}

export function getTimelineStops(journey: Journey) {
  return sortStops(journey.stops).filter((stop) => stop.showInTimeline !== false);
}

export function getJourneyDurationDays(journey: Journey) {
  const start = new Date(`${journey.startDate}T12:00:00`);
  const end = new Date(`${journey.endDate}T12:00:00`);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay) + 1;
}

export function getStopAttractions(journey: Journey, stopId: string) {
  return journey.attractions.filter((attraction) => attraction.stopId === stopId);
}

export function getStopHikes(journey: Journey, stopId: string) {
  return journey.hikes.filter((hike) => hike.stopId === stopId);
}

export function getStopLodging(journey: Journey, stopId: string) {
  return journey.lodging.filter((lodging) => lodging.stopId === stopId);
}

export function formatDisplayDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export function formatDateRange(startDate: string, endDate: string) {
  return `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
}
