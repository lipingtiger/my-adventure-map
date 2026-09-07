import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { LatLng, LeafletMouseEvent, Point } from "leaflet";
import { MapPin, Pencil, Play, X } from "lucide-react";
import { useJourneys } from "../hooks/useJourneys";
import { useAdminSession } from "../hooks/useAdminSession";
import { LibraryMedia, useMediaLibrary } from "../hooks/useMediaLibrary";
import { useLiveLocation } from "../hooks/useLiveLocation";
import { Journey } from "../types";
import { sortStops } from "../utils/journey";
import { directLines, Position } from "../../supabase/functions/_shared/routes";

const colors = ["#127a7c", "#bd365f", "#497331", "#8156a7", "#c16b17", "#2674bc"];
function nearLine(point: Point, a: Point, b: Point) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((point.x-a.x)*dx+(point.y-a.y)*dy) / (dx*dx+dy*dy || 1)));
  return point.distanceTo(new Point(a.x+t*dx, a.y+t*dy)) < 14;
}
function WorldContent({ journeys, items, editing, isAdmin, onPhoto }: {
  journeys: Journey[]; items: LibraryMedia[]; editing: boolean; isAdmin: boolean; onPhoto: (item: LibraryMedia) => void;
}) {
  const navigate = useNavigate();
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const [routesAtPoint, setRoutesAtPoint] = useState<{ position: LatLng; journeys: Journey[] } | null>(null);
  const editPosition = (event: LeafletMouseEvent) => {
    if (isAdmin) navigate(`/admin?library=1&lat=${event.latlng.lat}&lng=${event.latlng.wrap().lng}`);
  };
  useMapEvents({ zoomend: () => setZoom(map.getZoom()), contextmenu: editPosition,
    click: (event) => { if (editing) editPosition(event); } });
  const routes = useMemo(() => journeys.map((journey, index) => ({ journey, color: colors[index % colors.length],
    lines: directLines(sortStops(journey.stops).map((stop) => [stop.latitude, stop.longitude] as Position)) })), [journeys]);
  const groups = useMemo(() => {
    const buckets = new Map<string, LibraryMedia[]>();
    for (const item of items) {
      if (item.latitude === null || item.longitude === null) continue;
      const pixel = map.project([item.latitude, item.longitude], zoom);
      const key = `${Math.floor(pixel.x / 36)}:${Math.floor(pixel.y / 36)}`;
      buckets.set(key, [...(buckets.get(key) ?? []), item]);
    }
    return [...buckets.values()];
  }, [items, map, zoom]);
  function openRoute(event: LeafletMouseEvent, clicked: Journey) {
    if (editing) return editPosition(event);
    const nearby = routes.filter(({ lines }) => lines.some((line) => line.slice(1).some((b, i) =>
      nearLine(event.layerPoint, map.latLngToLayerPoint(line[i]), map.latLngToLayerPoint(b))))).map(({ journey }) => journey);
    if (nearby.length > 1) setRoutesAtPoint({ position: event.latlng, journeys: nearby });
    else navigate(`/journeys/${clicked.slug}`);
  }
  return <>
    {routes.flatMap(({ journey, lines, color }) => lines.filter((line) => line.length > 1).map((line, i) =>
      <Polyline key={`${journey.id}:${i}`} positions={line} pathOptions={{ color, weight: 6, opacity: 0.85 }}
        eventHandlers={{ click: (event) => openRoute(event, journey) }}><Tooltip>{journey.title}</Tooltip></Polyline>))}
    {routesAtPoint && <Popup position={routesAtPoint.position}><div className="world-route-choices">
      {routesAtPoint.journeys.map((journey) => <Link key={journey.id} to={`/journeys/${journey.slug}`}>{journey.title}</Link>)}
    </div></Popup>}
    {groups.map((group) => <CircleMarker key={group.map((item) => item.id).join(":")} center={[group[0].latitude!, group[0].longitude!]}
      radius={group.length > 1 ? 12 : 8} pathOptions={{ color: "#fff", weight: 2, fillColor: "#bb335b", fillOpacity: 1 }}
      eventHandlers={{ contextmenu: (event) => {
        event.originalEvent.stopPropagation();
        if (isAdmin) navigate(`/admin?library=1&media=${group.map((item) => item.id).join(",")}`);
      } }}>
      <Tooltip>{group.length} highlight{group.length > 1 ? "s" : ""}</Tooltip>
      <Popup maxWidth={360}><div className="world-media-popup">
        <strong>{group[0].location_name || "Highlights"}</strong>
        <div className="world-popup-grid">{group.map((item) => item.kind === "photo" ?
          <button key={item.id} onClick={() => onPhoto(item)}><img loading="lazy" src={item.thumbnail_url || item.public_url} alt={item.title} /><span>{item.title}</span></button>
          : <a href={item.video_url} key={item.id} target="_blank" rel="noreferrer"><img loading="lazy" src={item.thumbnail_url || ""} alt={item.title} /><span><Play size={14} />{item.title}</span></a>)}</div>
        {isAdmin && <Link to={`/admin?library=1&media=${group.map((item) => item.id).join(",")}`}><Pencil size={15} />Edit highlights</Link>}
      </div></Popup>
    </CircleMarker>)}
  </>;
}

export function HomePage() {
  const { journeys, isLoading, errorMessage, refresh } = useJourneys();
  const { items, error } = useMediaLibrary(true);
  const { isAdmin } = useAdminSession();
  const [editing, setEditing] = useState(false);
  const [photo, setPhoto] = useState<LibraryMedia | null>(null);
  const active = journeys.find((journey) => journey.status === "active");
  const { location } = useLiveLocation(active?.id || "__world__");
  return <main className="world-home">
    <div className="page-shell world-heading"><h1>My Adventure Map</h1>
      <div className="admin-toolbar"><Link to="/journeys">Journeys ({journeys.length})</Link>
        {isAdmin && <button aria-pressed={editing} onClick={() => setEditing(!editing)}><MapPin size={17} />{editing ? "Finish placing highlights" : "Place highlights"}</button>}
      </div>
      {isLoading && <p>Loading journeys...</p>}
      {(errorMessage || error) && <p role="alert">{errorMessage || error} <button onClick={refresh}>Retry</button></p>}
    </div>
    <MapContainer center={[25, 0]} zoom={2} minZoom={2} maxBounds={[[-85, -180], [85, 180]]} maxBoundsViscosity={0.8}
      className="world-map" scrollWheelZoom={true}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" noWrap />
      <WorldContent journeys={journeys} items={items} editing={editing && isAdmin} isAdmin={isAdmin} onPhoto={setPhoto} />
      {location && <CircleMarker center={[location.latitude, location.longitude]} radius={9}
        pathOptions={{ color: "#fff", weight: 3, fillColor: "#156fdd", fillOpacity: 1 }}>
        <Popup>Live location{active ? ` - ${active.title}` : ""}</Popup>
      </CircleMarker>}
    </MapContainer>
    <div className="page-shell world-legend">{journeys.map((journey, i) => <Link to={`/journeys/${journey.slug}`} key={journey.id}>
      <i style={{ background: colors[i % colors.length] }} />{journey.title}</Link>)}</div>
    {photo && <div className="media-modal" role="dialog" aria-modal="true" aria-label={photo.title} onClick={() => setPhoto(null)}>
      <div className="world-photo-viewer" onClick={(event) => event.stopPropagation()}>
        <button className="media-close" title="Close photo" aria-label="Close photo" onClick={() => setPhoto(null)}><X /></button>
        <img src={photo.public_url} alt={photo.title} /><strong>{photo.title}</strong>{photo.caption && <p>{photo.caption}</p>}
      </div></div>}
  </main>;
}
