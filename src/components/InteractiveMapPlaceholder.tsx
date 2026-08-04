import { Map, Navigation, Route } from "lucide-react";
import { journey } from "../data/journey";

export function InteractiveMapPlaceholder() {
  return (
    <section className="map-panel" aria-labelledby="map-title">
      <div className="section-heading">
        <span className="section-kicker">Interactive map</span>
        <h2 id="map-title">Route Preview</h2>
      </div>
      <div className="map-placeholder">
        <div className="map-placeholder__grid" />
        <div className="map-placeholder__route">
          <span className="route-point route-point--start">Toronto</span>
          <span className="route-line" />
          <span className="route-point route-point--end">Seattle</span>
        </div>
        <div className="map-placeholder__center">
          <Map aria-hidden="true" size={42} />
          <p>Interactive map placeholder</p>
          <span>{journey.currentJourney}</span>
        </div>
        <div className="map-placeholder__badge map-placeholder__badge--north">
          <Navigation aria-hidden="true" size={16} />
          North
        </div>
        <div className="map-placeholder__badge map-placeholder__badge--distance">
          <Route aria-hidden="true" size={16} />
          {journey.distanceLabel}
        </div>
      </div>
    </section>
  );
}
