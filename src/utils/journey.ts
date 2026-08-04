import { Journey, Stop } from "../types";

export function sortStops(stops: Stop[]) {
  return [...stops].sort((firstStop, secondStop) => firstStop.order - secondStop.order);
}

export function getTimelineStops(journey: Journey) {
  return sortStops(journey.stops).filter((stop) => stop.showInTimeline !== false);
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
