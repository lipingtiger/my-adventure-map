import L, { LatLngBoundsExpression } from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { torontoToSeattleTrip } from "../data/trips/torontoToSeattle";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const routePositions = torontoToSeattleTrip.stops.map(
  (stop) => [stop.latitude, stop.longitude] as [number, number],
);

function FitRouteToBounds() {
  const map = useMap();

  useEffect(() => {
    if (routePositions.length > 0) {
      const bounds = L.latLngBounds(routePositions) as LatLngBoundsExpression;
      map.fitBounds(bounds, { padding: [34, 34] });
    }
  }, [map]);

  return null;
}

function formatStopType(type: string) {
  return type
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export function TripMap() {
  const firstStop = torontoToSeattleTrip.stops[0];
  const center: [number, number] = firstStop
    ? [firstStop.latitude, firstStop.longitude]
    : [0, 0];

  return (
    <section className="map-panel" aria-labelledby="map-title">
      <div className="section-heading route-heading">
        <div>
          <span className="section-kicker">Interactive map</span>
          <h2 id="map-title">{torontoToSeattleTrip.title}</h2>
        </div>
        <p className="route-note">{torontoToSeattleTrip.routeNote}</p>
      </div>
      <div className="trip-map" aria-label={`${torontoToSeattleTrip.title} interactive route map`}>
        <MapContainer center={center} zoom={5} scrollWheelZoom={false} className="trip-map__canvas">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Polyline positions={routePositions} pathOptions={{ color: "#0f7a7a", weight: 5, opacity: 0.88 }} />
          {torontoToSeattleTrip.stops.map((stop, index) => (
            <Marker key={stop.id} position={[stop.latitude, stop.longitude]}>
              <Popup>
                <div className="map-popup">
                  <span className="map-popup__order">Stop {index + 1}</span>
                  <h3>{stop.name}</h3>
                  <p className="map-popup__meta">
                    {formatDate(stop.date)} | {stop.stateOrProvince} | {formatStopType(stop.type)}
                  </p>
                  <p>{stop.description}</p>
                </div>
              </Popup>
            </Marker>
          ))}
          <FitRouteToBounds />
        </MapContainer>
      </div>
    </section>
  );
}
