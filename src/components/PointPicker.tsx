import { useState } from "react";
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import { Search } from "lucide-react";
import { openRouteServiceApiKey, openRouteServiceGeocodeUrl } from "../config/openRouteService";

export type PickedPoint = { latitude: number; longitude: number; address?: string };
function PickEvents({ onChange }: { onChange: (point: PickedPoint) => void }) {
  useMapEvents({ click: (event) => onChange({ latitude: event.latlng.lat, longitude: event.latlng.wrap().lng }) });
  return null;
}
export function PointPicker({ value, onChange }: { value: PickedPoint | null; onChange: (point: PickedPoint) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ label: string; latitude: number; longitude: number }>>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function search() {
    setBusy(true); setMessage("");
    try {
      const params = new URLSearchParams({ text: query, size: "5" });
      const response = await fetch(`${openRouteServiceGeocodeUrl}?${params}`, {
        headers: { Authorization: openRouteServiceApiKey }, signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("Address search unavailable. Select a position on the map.");
      const data = await response.json();
      const matches = (data.features ?? []).map((item: any) => ({ label: item.properties.label,
        latitude: item.geometry.coordinates[1], longitude: item.geometry.coordinates[0] }));
      setResults(matches);
      if (!matches.length) setMessage("No matching addresses.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Search failed."); }
    finally { setBusy(false); }
  }
  return <div className="point-picker">
    <div className="point-search"><label>Address or city<input value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <button type="button" title="Search address" aria-label="Search address" disabled={busy || !query.trim()} onClick={() => void search()}><Search size={18} /></button></div>
    {results.length > 0 && <select aria-label="Matching addresses" value="" onChange={(e) => {
      const selected = results[Number(e.target.value)]; onChange({ ...selected, address: selected.label }); setResults([]);
    }}><option value="" disabled>Choose an address</option>{results.map((item, i) => <option key={i} value={i}>{item.label}</option>)}</select>}
    {message && <p role="status">{message}</p>}
    <MapContainer key={value?.address || "pick"} center={value ? [value.latitude, value.longitude] : [25, 0]} zoom={value ? 11 : 2} className="point-picker-map" scrollWheelZoom={false}>
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <PickEvents onChange={onChange} />
      {value && <CircleMarker center={[value.latitude, value.longitude]} radius={8} />}
    </MapContainer>
    {value && <p>{value.address || `${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}`}</p>}
  </div>;
}
