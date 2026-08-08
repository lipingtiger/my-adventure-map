import L, { LatLngBoundsExpression } from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { History, Maximize2 } from "lucide-react";
import { hasOpenRouteServiceApiKey } from "../config/openRouteService";
import { hasSupabaseConfig } from "../config/supabase";
import { LiveLocation, useLiveLocation, useLiveLocationHistory } from "../hooks/useLiveLocation";
import { useOpenRouteServiceRoute } from "../hooks/useOpenRouteServiceRoute";
import { UploadedPhoto, useUploadedPhotos } from "../hooks/useUploadedPhotos";
import { Journey, Photo, Stop, StopType, Video } from "../types";
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

type MapPhoto = {
  caption?: string | null;
  date?: string | null;
  id: string;
  src: string;
  title: string;
};

type MapVideo = {
  caption?: string;
  date?: string;
  id: string;
  src: string;
  thumbnailSrc?: string;
  title: string;
};

type StopMedia = {
  photos: MapPhoto[];
  videos: MapVideo[];
};

function MapViewportController({
  fitRequestId,
  historyPositions,
  journeyId,
  plannedPositions,
  routeReady,
  showLiveHistory,
}: {
  fitRequestId: number;
  historyPositions: [number, number][];
  journeyId: string;
  plannedPositions: [number, number][];
  routeReady: boolean;
  showLiveHistory: boolean;
}) {
  const map = useMap();
  const hasFitHistoryRef = useRef(false);
  const hasInitialFitRef = useRef(false);
  const isProgrammaticMoveRef = useRef(false);
  const userHasInteractedRef = useRef(false);

  const fitPositions = useCallback(
    (positions: [number, number][]) => {
      if (positions.length === 0) {
        return;
      }

      isProgrammaticMoveRef.current = true;
      map.invalidateSize({ pan: false });

      const bounds = L.latLngBounds(positions) as LatLngBoundsExpression;
      map.fitBounds(bounds, { padding: [34, 34] });

      const clearProgrammaticMove = () => {
        isProgrammaticMoveRef.current = false;
      };
      const fallbackTimeoutId = window.setTimeout(clearProgrammaticMove, 500);

      map.once("moveend zoomend", () => {
        window.clearTimeout(fallbackTimeoutId);
        clearProgrammaticMove();
      });
    },
    [map],
  );

  useEffect(() => {
    hasFitHistoryRef.current = false;
    hasInitialFitRef.current = false;
    userHasInteractedRef.current = false;
  }, [journeyId]);

  useEffect(() => {
    const markUserInteraction = () => {
      if (!isProgrammaticMoveRef.current) {
        userHasInteractedRef.current = true;
      }
    };

    map.on("dragstart", markUserInteraction);
    map.on("zoomstart", markUserInteraction);

    return () => {
      map.off("dragstart", markUserInteraction);
      map.off("zoomstart", markUserInteraction);
    };
  }, [map]);

  useEffect(() => {
    const syncMapSize = () => {
      map.invalidateSize({ pan: false });
    };
    const frameId = window.requestAnimationFrame(syncMapSize);
    const resizeObserver = new ResizeObserver(syncMapSize);

    resizeObserver.observe(map.getContainer());
    window.addEventListener("resize", syncMapSize);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncMapSize);
    };
  }, [map]);

  useEffect(() => {
    if (!routeReady || hasInitialFitRef.current || plannedPositions.length === 0) {
      return;
    }

    hasInitialFitRef.current = true;
    fitPositions(plannedPositions);
  }, [fitPositions, plannedPositions, routeReady]);

  useEffect(() => {
    if (fitRequestId === 0 || plannedPositions.length === 0) {
      return;
    }

    userHasInteractedRef.current = false;
    fitPositions(plannedPositions);
  }, [fitPositions, fitRequestId, plannedPositions]);

  useEffect(() => {
    if (
      !showLiveHistory ||
      userHasInteractedRef.current ||
      hasFitHistoryRef.current ||
      historyPositions.length < 2
    ) {
      return;
    }

    hasFitHistoryRef.current = true;
    fitPositions(historyPositions);
  }, [fitPositions, historyPositions, showLiveHistory]);

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

function formatLocalDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    second: "2-digit",
    timeZoneName: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatUtcDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    second: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
    year: "numeric",
  }).format(new Date(value));
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
            <p className="map-popup__distance">Last received (local): {formatLocalDateTime(location.updatedAt)}</p>
            <p>Last received (UTC): {formatUtcDateTime(location.updatedAt)}</p>
            <p>Device time (local): {formatLocalDateTime(location.recordedAt)}</p>
            <p>Device time (UTC): {formatUtcDateTime(location.recordedAt)}</p>
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

function createStopIcon(stop: Stop, hasMedia: boolean) {
  const markerStyle = markerStyles[stop.type];
  const mediaBadge = hasMedia ? '<i class="map-marker__media" aria-hidden="true"></i>' : "";

  return L.divIcon({
    className: `map-marker ${markerStyle.className}${hasMedia ? " map-marker--has-media" : ""}`,
    html: `<span>${markerStyle.label}</span>${mediaBadge}`,
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

function getDateKey(value?: string | null) {
  return value ? value.slice(0, 10) : null;
}

function getStopIdForMedia(stopIdByDate: Map<string, string>, stopId?: string | null, date?: string | null) {
  return stopId ?? stopIdByDate.get(getDateKey(date) ?? "") ?? null;
}

function addMediaToStop<T>(mediaByStop: Map<string, StopMedia>, stopId: string, mediaType: "photos" | "videos", item: T) {
  const currentMedia = mediaByStop.get(stopId) ?? { photos: [], videos: [] };
  currentMedia[mediaType].push(item as never);
  mediaByStop.set(stopId, currentMedia);
}

function getMapMediaByStop(journey: Journey, uploadedPhotos: UploadedPhoto[], orderedStops: Stop[]) {
  const stopIdByDate = new Map(
    orderedStops
      .filter((stop) => stop.showInTimeline !== false)
      .map((stop) => [getDateKey(stop.date) ?? stop.date, stop.id] as const),
  );
  const mediaByStop = new Map<string, StopMedia>();

  journey.photos.forEach((photo: Photo) => {
    if (!photo.src) {
      return;
    }

    const stopId = getStopIdForMedia(stopIdByDate, photo.stopId, photo.date);

    if (!stopId) {
      return;
    }

    addMediaToStop(mediaByStop, stopId, "photos", {
      caption: photo.caption,
      date: photo.date,
      id: photo.id,
      src: photo.src,
      title: photo.title,
    });
  });

  uploadedPhotos.forEach((photo) => {
    const stopId = getStopIdForMedia(stopIdByDate, photo.stopId, photo.takenAt);

    if (!stopId) {
      return;
    }

    addMediaToStop(mediaByStop, stopId, "photos", {
      caption: photo.caption,
      date: photo.takenAt,
      id: photo.id,
      src: photo.publicUrl,
      title: photo.title,
    });
  });

  journey.videos.forEach((video: Video) => {
    if (!video.src) {
      return;
    }

    const stopId = getStopIdForMedia(stopIdByDate, video.stopId, video.date);

    if (!stopId) {
      return;
    }

    addMediaToStop(mediaByStop, stopId, "videos", {
      caption: video.caption,
      date: video.date,
      id: video.id,
      src: video.src,
      thumbnailSrc: video.thumbnailSrc,
      title: video.title,
    });
  });

  return mediaByStop;
}

function StopMediaGallery({ media }: { media?: StopMedia }) {
  if (!media || (media.photos.length === 0 && media.videos.length === 0)) {
    return null;
  }

  return (
    <div className="map-popup__media">
      {media.photos.length > 0 ? (
        <div className="map-popup__media-section">
          <h4>Photos</h4>
          <div className="map-popup__photo-grid">
            {media.photos.map((photo) => (
              <a className="map-popup__photo" href={photo.src} key={photo.id} rel="noreferrer" target="_blank">
                <img alt={photo.title} loading="lazy" src={photo.src} />
                <span>{photo.title}</span>
              </a>
            ))}
          </div>
        </div>
      ) : null}
      {media.videos.length > 0 ? (
        <div className="map-popup__media-section">
          <h4>Videos</h4>
          <div className="map-popup__video-list">
            {media.videos.map((video) => (
              <div className="map-popup__video" key={video.id}>
                <video controls poster={video.thumbnailSrc} preload="metadata" src={video.src} />
                <a href={video.src} rel="noreferrer" target="_blank">
                  {video.title}
                </a>
                {video.caption ? <p>{video.caption}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function TripMap({ journey }: { journey: Journey }) {
  const [fitRequestId, setFitRequestId] = useState(0);
  const [showLiveHistory, setShowLiveHistory] = useState(false);
  const orderedStops = useMemo(() => sortStops(journey.stops), [journey.stops]);
  const { errorMessage: uploadedPhotoError, photos: uploadedPhotos } = useUploadedPhotos(journey.id);
  const { errorMessage, routePositions, routeSegments, status, summary } = useOpenRouteServiceRoute(orderedStops);
  const { errorMessage: liveLocationError, location: liveLocation, status: liveLocationStatus } = useLiveLocation(
    journey.id,
  );
  const {
    errorMessage: liveHistoryError,
    history: liveLocationHistory,
    status: liveHistoryStatus,
  } = useLiveLocationHistory(journey.id, showLiveHistory);
  const firstStop = orderedStops[0];
  const center: [number, number] = firstStop ? [firstStop.latitude, firstStop.longitude] : [0, 0];
  const liveHistoryPositions = useMemo(
    () => liveLocationHistory.map((point) => [point.latitude, point.longitude] as [number, number]),
    [liveLocationHistory],
  );
  const plannedFitPositions = useMemo(
    () =>
      routePositions.length > 0
        ? routePositions
        : orderedStops.map((stop) => [stop.latitude, stop.longitude] as [number, number]),
    [orderedStops, routePositions],
  );
  const mediaByStop = useMemo(
    () => getMapMediaByStop(journey, uploadedPhotos, orderedStops),
    [journey, orderedStops, uploadedPhotos],
  );
  const routeReady = status !== "loading";
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
  const liveHistoryStatusLabel = {
    disabled: "Location history is not configured",
    error: "Location history connection error",
    hidden: "No shared history points yet",
    idle: "Location history hidden",
    live: `${liveLocationHistory.length.toLocaleString()} actual route point${
      liveLocationHistory.length === 1 ? "" : "s"
    }`,
    loading: "Loading location history...",
    stale: "Location history is stale",
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
        {showLiveHistory ? <span>{liveHistoryStatusLabel[liveHistoryStatus]}</span> : null}
        {liveLocationError ? <span>{liveLocationError}</span> : null}
        {liveHistoryError ? <span>{liveHistoryError}</span> : null}
        {uploadedPhotoError ? <span>{uploadedPhotoError}</span> : null}
        {errorMessage ? <span>{errorMessage}</span> : null}
      </div>
      <div className="live-map-tools" aria-label="Map tools">
        <button
          className="live-history-toggle"
          onClick={() => setFitRequestId((currentRequestId) => currentRequestId + 1)}
          type="button"
        >
          <Maximize2 aria-hidden="true" size={16} strokeWidth={2.8} />
          <span>Fit journey</span>
        </button>
        {hasSupabaseConfig ? (
          <button
            aria-pressed={showLiveHistory}
            className="live-history-toggle"
            onClick={() => setShowLiveHistory((isVisible) => !isVisible)}
            type="button"
          >
            <History aria-hidden="true" size={16} strokeWidth={2.8} />
            <span>{showLiveHistory ? "Hide actual path" : "Show actual path"}</span>
          </button>
        ) : null}
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
          {showLiveHistory && liveHistoryPositions.length > 1 ? (
            <Polyline
              positions={liveHistoryPositions}
              pathOptions={{ color: "#d9291c", opacity: 0.92, weight: 5 }}
            />
          ) : null}
          {showLiveHistory
            ? liveLocationHistory.map((point) => (
                <CircleMarker
                  key={point.id}
                  center={[point.latitude, point.longitude]}
                  pathOptions={{
                    color: "#a91f16",
                    fillColor: "#ff5a4f",
                    fillOpacity: 0.82,
                    opacity: 0.92,
                    weight: 2,
                  }}
                  radius={4}
                />
              ))
            : null}
          {orderedStops.map((stop) => {
            const lodging = getStopLodging(journey, stop.id);
            const attractions = getStopAttractions(journey, stop.id);
            const hikes = getStopHikes(journey, stop.id);
            const stopMedia = mediaByStop.get(stop.id);
            const hasMedia = Boolean(stopMedia && (stopMedia.photos.length > 0 || stopMedia.videos.length > 0));

            return (
              <Marker key={stop.id} icon={createStopIcon(stop, hasMedia)} position={[stop.latitude, stop.longitude]}>
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
                    <StopMediaGallery media={stopMedia} />
                  </div>
                </Popup>
              </Marker>
            );
          })}
          <SharedLiveLocationMarker location={liveLocation} />
          <MapViewportController
            fitRequestId={fitRequestId}
            historyPositions={liveHistoryPositions}
            journeyId={journey.id}
            plannedPositions={plannedFitPositions}
            routeReady={routeReady}
            showLiveHistory={showLiveHistory}
          />
        </MapContainer>
      </div>
    </section>
  );
}
