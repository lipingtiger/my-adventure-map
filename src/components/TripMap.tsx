import L, { LatLngBoundsExpression } from "leaflet";
import { useEffect, useMemo } from "react";
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { hasOpenRouteServiceApiKey } from "../config/openRouteService";
import { hasSupabaseConfig } from "../config/supabase";
import { LiveLocation, useLiveLocation } from "../hooks/useLiveLocation";
import { useOpenRouteServiceRoute } from "../hooks/useOpenRouteServiceRoute";
import { Journey, Stop, StopType } from "../types";
import { formatDisplayDate, getStopAttractions, getStopHikes, getStopLodging, sortStops } from "../utils/journey";

const markerStyles: Record<StopType, { label: string; className: string }> = {
  start: { label: "S", className: "map-marker--start" },
  city: { label: "C", className: "map-marker--city" },
  "scenic-stop": { label: "V", className: "map-marker--scenic" },
  "national-park": { label: "P", className: "map-marker--park" },
  hiking: { label: "H", className: "map-marker--hiking" },
  overnight: { label: "O", className: "map-marker--overnight" },
  destination: { label: "D", className: "map-marker--destination" },
};

function FitRouteToBounds({ routePositions }: { routePositions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (routePositions.length > 0) {
      const bounds = L.latLngBounds(routePositions) as LatLngBoundsExpression;
      map.fitBounds(bounds, { padding: [34, 34] });
    }
  }, [map, routePositions]);

  return null;
}

function createCurrentLocationIcon() {
  return L.divIcon({
    className: "current-location-marker",
    html: "<span></span>",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
}

function SharedLiveLocationMarker({ location }: { location: LiveLocation | null }) {
  const currentLocationIcon = useMemo(() => createCurrentLocationIcon(), []);

  if (!location) {
    return null;
  }

  const position: [number, number] = [location.latitude, location.longitude];

  return (
    <>
      <Circle
        center={position}
        pathOptions={{ color: "#2563eb", fillColor: "#60a5fa", fillOpacity: 0.14, opacity: 0.35, weight: 2 }}
        radius={Math.max(location.accuracyM ?? 20, 20)}
      />
      <Marker icon={currentLocationIcon} position={position}>
        <Popup>
          <div className="map-popup">
            <span className="map-popup__order">OwnTracks live location</span>
            <h3>Shared Current Location</h3>
            <p className="map-popup__meta">
              {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </p>
            {location.accuracyM ? <p>Accuracy: about {Math.round(location.accuracyM).toLocaleString()} m</p> : null}
            {location.batteryPercent ? <p>Phone battery: {location.batteryPercent}%</p> : null}
            <p className="map-popup__distance">Last received: {new Date(location.updatedAt).toLocaleString()}</p>
            <p>Device time: {new Date(location.recordedAt).toLocaleString()}</p>
          </div>
        </Popup>
      </Marker>
    </>
  );
}

function formatStopType(type: string) {
  return type
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function createStopIcon(stop: Stop) {
  const markerStyle = markerStyles[stop.type];

  return L.divIcon({
    className: `map-marker ${markerStyle.className}`,
    html: `<span>${markerStyle.label}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

function PopupList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) {
    return null;
  }

  return (
    <div className="map-popup__section">
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function TripMap({ journey }: { journey: Journey }) {
  const orderedStops = useMemo(() => sortStops(journey.stops), [journey.stops]);
  const { errorMessage, routePositions, routeSegments, status, summary } = useOpenRouteServiceRoute(orderedStops);
  const { errorMessage: liveLocationError, location: liveLocation, status: liveLocationStatus } = useLiveLocation(
    journey.id,
  );
  const firstStop = orderedStops[0];
  const center: [number, number] = firstStop ? [firstStop.latitude, firstStop.longitude] : [0, 0];
  const routeIsRoadGeometry = status === "success";
  const routeHasRoadGeometry = status === "success" || status === "partial";
  const liveLocationStatusLabel = {
    disabled: "Supabase live location not configured",
    error: "Live location connection error",
    hidden: "Live location sharing paused",
    live: "OwnTracks live location on map",
    loading: "Loading OwnTracks live location...",
    stale: "OwnTracks location is stale",
  };

  return (
    <section className="map-panel" aria-labelledby="map-title">
      <div className="section-heading route-heading">
        <div>
          <span className="section-kicker">Interactive map</span>
          <h2 id="map-title">{journey.title}</h2>
        </div>
        <p className="route-note">{journey.routeNote}</p>
      </div>
      <div className="map-legend" aria-label="Map marker legend">
        {Object.entries(markerStyles).map(([type, markerStyle]) => (
          <span key={type}>
            <i className={`map-legend__dot ${markerStyle.className}`} />
            {formatStopType(type)}
          </span>
        ))}
      </div>
      <div className="route-status" data-status={status}>
        <span>
          {routeIsRoadGeometry
            ? "Road route loaded from OpenRouteService"
            : routeHasRoadGeometry
              ? "Road route partially loaded from OpenRouteService"
              : "Using straight-line fallback route"}
        </span>
        {status === "loading" ? <span>Calculating road route...</span> : null}
        {summary?.distanceKm ? <span>{Math.round(summary.distanceKm).toLocaleString()} km</span> : null}
        {summary?.durationHours ? <span>{Math.round(summary.durationHours).toLocaleString()} driving hours</span> : null}
        {hasSupabaseConfig ? <span>{liveLocationStatusLabel[liveLocationStatus]}</span> : null}
        {liveLocationError ? <span>{liveLocationError}</span> : null}
        {errorMessage ? <span>{errorMessage}</span> : null}
      </div>
      <div
        className="trip-map"
        data-ors-api-key-configured={hasOpenRouteServiceApiKey}
        aria-label={`${journey.title} interactive route map`}
      >
        <MapContainer center={center} zoom={5} scrollWheelZoom={false} className="trip-map__canvas">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {routeSegments.map((segment) => (
            <Polyline
              key={segment.id}
              positions={segment.positions}
              pathOptions={{
                color: segment.source === "ors" ? "#0f7a7a" : "#d98a28",
                dashArray: segment.source === "ors" ? undefined : "10 10",
                weight: segment.source === "ors" ? 5 : 4,
                opacity: segment.source === "ors" ? 0.88 : 0.72,
              }}
            />
          ))}
          {orderedStops.map((stop) => {
            const lodging = getStopLodging(journey, stop.id);
            const attractions = getStopAttractions(journey, stop.id);
            const hikes = getStopHikes(journey, stop.id);

            return (
              <Marker key={stop.id} icon={createStopIcon(stop)} position={[stop.latitude, stop.longitude]}>
                <Popup>
                  <div className="map-popup">
                    <span className="map-popup__order">
                      {stop.showInTimeline === false ? "Start" : `Day ${stop.order}`}
                    </span>
                    <h3>{stop.name}</h3>
                    <p className="map-popup__meta">
                      {formatDisplayDate(stop.date)} | {stop.city ?? stop.stateOrProvince} | {formatStopType(stop.type)}
                    </p>
                    <p>{stop.description}</p>
                    <p className="map-popup__distance">
                      Distance:{" "}
                      {typeof stop.drivingDistanceKm === "number"
                        ? `${stop.drivingDistanceKm.toLocaleString()} km`
                        : "Flexible"}
                      {stop.drivingDistanceNote ? ` (${stop.drivingDistanceNote})` : ""}
                    </p>
                    {stop.overnight ? <p className="map-popup__overnight">Overnight: {stop.overnight}</p> : null}
                    <PopupList title="Lodging" items={lodging.map((item) => `${item.name} (${item.type})`)} />
                    <PopupList title="Attractions" items={attractions.map((attraction) => attraction.name)} />
                    <PopupList title="Hikes" items={hikes.map((hike) => `${hike.name} - ${hike.difficulty}`)} />
                    <PopupList title="Notes" items={stop.notes} />
                  </div>
                </Popup>
              </Marker>
            );
          })}
          <SharedLiveLocationMarker location={liveLocation} />
          <FitRouteToBounds routePositions={routePositions} />
        </MapContainer>
      </div>
    </section>
  );
}
