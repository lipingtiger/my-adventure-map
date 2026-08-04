import L, { LatLngBoundsExpression } from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { orderedStops, StopType, torontoToSeattleTrip, TripStop } from "../data/trips/torontoToSeattle";

const markerStyles: Record<StopType, { label: string; className: string }> = {
  start: { label: "S", className: "map-marker--start" },
  city: { label: "C", className: "map-marker--city" },
  "scenic-stop": { label: "V", className: "map-marker--scenic" },
  "national-park": { label: "P", className: "map-marker--park" },
  hiking: { label: "H", className: "map-marker--hiking" },
  overnight: { label: "O", className: "map-marker--overnight" },
  destination: { label: "D", className: "map-marker--destination" },
};

const routePositions = orderedStops.map((stop) => [stop.latitude, stop.longitude] as [number, number]);

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

function createStopIcon(stop: TripStop) {
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

export function TripMap() {
  const firstStop = orderedStops[0];
  const center: [number, number] = firstStop ? [firstStop.latitude, firstStop.longitude] : [0, 0];

  return (
    <section className="map-panel" aria-labelledby="map-title">
      <div className="section-heading route-heading">
        <div>
          <span className="section-kicker">Interactive map</span>
          <h2 id="map-title">{torontoToSeattleTrip.title}</h2>
        </div>
        <p className="route-note">{torontoToSeattleTrip.routeNote}</p>
      </div>
      <div className="map-legend" aria-label="Map marker legend">
        {Object.entries(markerStyles).map(([type, markerStyle]) => (
          <span key={type}>
            <i className={`map-legend__dot ${markerStyle.className}`} />
            {formatStopType(type)}
          </span>
        ))}
      </div>
      <div className="trip-map" aria-label={`${torontoToSeattleTrip.title} interactive route map`}>
        <MapContainer center={center} zoom={5} scrollWheelZoom={false} className="trip-map__canvas">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Polyline positions={routePositions} pathOptions={{ color: "#0f7a7a", weight: 5, opacity: 0.88 }} />
          {orderedStops.map((stop) => (
            <Marker key={stop.id} icon={createStopIcon(stop)} position={[stop.latitude, stop.longitude]}>
              <Popup>
                <div className="map-popup">
                  <span className="map-popup__order">Day {stop.order}</span>
                  <h3>{stop.name}</h3>
                  <p className="map-popup__meta">
                    {formatDate(stop.date)} | {stop.city ?? stop.stateOrProvince} | {formatStopType(stop.type)}
                  </p>
                  <p>{stop.description}</p>
                  {stop.overnight ? <p className="map-popup__overnight">Overnight: {stop.overnight}</p> : null}
                  <PopupList title="Lodging" items={stop.lodgingOptions?.map((lodging) => `${lodging.name} (${lodging.type})`)} />
                  <PopupList title="Attractions" items={stop.attractions?.map((attraction) => attraction.name)} />
                  <PopupList title="Hikes" items={stop.hikes?.map((hike) => `${hike.name} - ${hike.difficulty}`)} />
                  <PopupList title="Notes" items={stop.notes} />
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
