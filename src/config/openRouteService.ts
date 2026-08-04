import { getPublicEnv } from "./appEnv";

export const openRouteServiceApiKey = getPublicEnv("VITE_ORS_API_KEY");

export const hasOpenRouteServiceApiKey = openRouteServiceApiKey.length > 0;

export const openRouteServiceDirectionsUrl =
  "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
