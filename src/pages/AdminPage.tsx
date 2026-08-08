import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { currentJourney } from "../data/journeys";
import {
  hasOpenRouteServiceApiKey,
  openRouteServiceApiKey,
  openRouteServiceDirectionsUrl,
  openRouteServiceGeocodeUrl,
} from "../config/openRouteService";
import { hasSupabaseConfig, supabase, supabaseUrl } from "../config/supabase";
import { useJourneyStopOverrides } from "../hooks/useJourneyStopOverrides";
import { UploadedPhoto, useUploadedPhotos } from "../hooks/useUploadedPhotos";
import { sortStops } from "../utils/journey";
import type { Photo, Stop, Video } from "../types";

type AdminMessage = {
  tone: "error" | "success";
  text: string;
};

type OpenRouteServiceGeocodeResponse = {
  features?: Array<{
    geometry?: {
      coordinates?: [number, number];
    };
    properties?: {
      label?: string;
      name?: string;
    };
  }>;
};

type OpenRouteServiceDirectionsResponse = {
  features?: Array<{
    properties?: {
      summary?: {
        distance?: number;
      };
    };
  }>;
};

const UNASSIGNED_MEDIA_STOP_ID = "__unassigned__";

function getFunctionUrl(action: string) {
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/admin-tools/${action}`;
}

function toIsoDateTime(value: string) {
  return new Date(value).toISOString();
}

function getFormString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getStopOptionLabel(stop: { name: string; order: number; showInTimeline?: boolean }) {
  return stop.showInTimeline === false ? `Route start: ${stop.name}` : `Day ${stop.order}: ${stop.name}`;
}

function getMediaStopLabel(stop?: Stop) {
  return stop ? getStopOptionLabel(stop) : "No specific stop";
}

function getDateKey(value?: string | null) {
  return value ? value.slice(0, 10) : null;
}

function getResolvedMediaStopId(stopIdByDate: Map<string, string>, stopId?: string | null, date?: string | null) {
  return stopId || stopIdByDate.get(getDateKey(date) ?? "") || UNASSIGNED_MEDIA_STOP_ID;
}

function getMediaCount(countsByStop: Map<string, number>, stopId: string) {
  return countsByStop.get(stopId) ?? 0;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getStraightLineDistanceKm(startStop: Pick<Stop, "latitude" | "longitude">, endStop: Pick<Stop, "latitude" | "longitude">) {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(endStop.latitude - startStop.latitude);
  const longitudeDelta = toRadians(endStop.longitude - startStop.longitude);
  const startLatitude = toRadians(startStop.latitude);
  const endLatitude = toRadians(endStop.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function getBoundaryCountry(country: string) {
  const normalizedCountry = country.trim().toLowerCase();

  if (["canada", "ca", "can"].includes(normalizedCountry)) {
    return "CAN";
  }

  if (["united states", "united states of america", "usa", "us", "u.s.", "u.s.a."].includes(normalizedCountry)) {
    return "USA";
  }

  return "";
}

function getGeocodeQuery(formData: FormData) {
  return [
    getFormString(formData, "name"),
    getFormString(formData, "city"),
    getFormString(formData, "stateOrProvince"),
    getFormString(formData, "country"),
  ]
    .filter(Boolean)
    .join(", ");
}

export function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [authMessage, setAuthMessage] = useState<AdminMessage | null>(null);
  const [photoMessage, setPhotoMessage] = useState<AdminMessage | null>(null);
  const [historyMessage, setHistoryMessage] = useState<AdminMessage | null>(null);
  const [stopMessage, setStopMessage] = useState<AdminMessage | null>(null);
  const [managePhotoMessage, setManagePhotoMessage] = useState<AdminMessage | null>(null);
  const [selectedStopId, setSelectedStopId] = useState(currentJourney.stops.find((stop) => stop.showInTimeline !== false)?.id ?? currentJourney.stops[0]?.id ?? "");
  const [selectedMediaStopId, setSelectedMediaStopId] = useState(currentJourney.stops[0]?.id ?? UNASSIGNED_MEDIA_STOP_ID);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [isFindingCoordinates, setIsFindingCoordinates] = useState(false);
  const [isUpdatingStop, setIsUpdatingStop] = useState(false);
  const [updatingPhotoId, setUpdatingPhotoId] = useState<string | null>(null);
  const { errorMessage: stopOverridesError, journey } = useJourneyStopOverrides(currentJourney);
  const {
    errorMessage: uploadedPhotosError,
    isLoading: isLoadingUploadedPhotos,
    photos: uploadedPhotos,
  } = useUploadedPhotos(currentJourney.id);
  const editableStops = useMemo(() => sortStops(journey.stops), [journey.stops]);
  const orderedStops = useMemo(() => editableStops.filter((stop) => stop.showInTimeline !== false), [editableStops]);
  const photoStops = editableStops;
  const stopIdByDate = useMemo(
    () =>
      new Map(
        orderedStops.map((stop) => [getDateKey(stop.date) ?? stop.date, stop.id] as const),
      ),
    [orderedStops],
  );
  const staticPhotos = useMemo(() => journey.photos.filter((photo): photo is Photo & { src: string } => Boolean(photo.src)), [journey.photos]);
  const staticVideos = useMemo(() => journey.videos.filter((video): video is Video & { src: string } => Boolean(video.src)), [journey.videos]);
  const mediaCountsByStop = useMemo(() => {
    const counts = new Map<string, number>();
    const increment = (stopId: string) => counts.set(stopId, (counts.get(stopId) ?? 0) + 1);

    uploadedPhotos.forEach((photo) => {
      increment(getResolvedMediaStopId(stopIdByDate, photo.stopId, photo.takenAt));
    });
    staticPhotos.forEach((photo) => {
      increment(getResolvedMediaStopId(stopIdByDate, photo.stopId, photo.date));
    });
    staticVideos.forEach((video) => {
      increment(getResolvedMediaStopId(stopIdByDate, video.stopId, video.date));
    });

    return counts;
  }, [staticPhotos, staticVideos, stopIdByDate, uploadedPhotos]);
  const selectedMediaStop = useMemo(
    () => photoStops.find((stop) => stop.id === selectedMediaStopId),
    [photoStops, selectedMediaStopId],
  );
  const selectedUploadedPhotos = useMemo(
    () =>
      uploadedPhotos.filter(
        (photo) => getResolvedMediaStopId(stopIdByDate, photo.stopId, photo.takenAt) === selectedMediaStopId,
      ),
    [selectedMediaStopId, stopIdByDate, uploadedPhotos],
  );
  const selectedStaticPhotos = useMemo(
    () =>
      staticPhotos.filter(
        (photo) => getResolvedMediaStopId(stopIdByDate, photo.stopId, photo.date) === selectedMediaStopId,
      ),
    [selectedMediaStopId, staticPhotos, stopIdByDate],
  );
  const selectedStaticVideos = useMemo(
    () =>
      staticVideos.filter(
        (video) => getResolvedMediaStopId(stopIdByDate, video.stopId, video.date) === selectedMediaStopId,
      ),
    [selectedMediaStopId, staticVideos, stopIdByDate],
  );
  const selectedStop = useMemo(
    () => editableStops.find((stop) => stop.id === selectedStopId) ?? editableStops[0],
    [editableStops, selectedStopId],
  );
  const stopFormKey = selectedStop
    ? [
        selectedStop.id,
        selectedStop.name,
        selectedStop.city,
        selectedStop.stateOrProvince,
        selectedStop.country,
        selectedStop.date,
        selectedStop.latitude,
        selectedStop.longitude,
        selectedStop.overnight,
        selectedStop.startPoint,
        selectedStop.destination,
        selectedStop.drivingDistanceKm,
      ].join("|")
    : "no-stop";

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    let isMounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      return;
    }

    setIsSigningIn(true);
    setAuthMessage(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setIsSigningIn(false);

    if (error) {
      setAuthMessage({ text: error.message, tone: "error" });
      return;
    }

    setPassword("");
    setAuthMessage({ text: "Signed in.", tone: "success" });
  }

  async function signOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setSession(null);
  }

  async function uploadPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    setIsUploading(true);
    setPhotoMessage(null);

    const response = await fetch(getFunctionUrl("upload-photo"), {
      body: formData,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      method: "POST",
    });
    const data = (await response.json()) as { error?: string };

    setIsUploading(false);

    if (!response.ok) {
      setPhotoMessage({ text: data.error ?? "Photo upload failed.", tone: "error" });
      return;
    }

    form.reset();
    setPhotoMessage({ text: "Photo uploaded. It will appear in the Gallery.", tone: "success" });
  }

  async function clearHistory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const startAt = String(formData.get("startAt") ?? "");
    const endAt = String(formData.get("endAt") ?? "");

    setIsClearingHistory(true);
    setHistoryMessage(null);

    const response = await fetch(getFunctionUrl("clear-location-history"), {
      body: JSON.stringify({
        endAt: toIsoDateTime(endAt),
        journeyId: currentJourney.id,
        startAt: toIsoDateTime(startAt),
        trackerId: String(formData.get("trackerId") ?? "").trim() || undefined,
      }),
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const data = (await response.json()) as { deletedCount?: number; error?: string };

    setIsClearingHistory(false);

    if (!response.ok) {
      setHistoryMessage({ text: data.error ?? "History cleanup failed.", tone: "error" });
      return;
    }

    setHistoryMessage({
      text: `Deleted ${data.deletedCount ?? 0} location history point${data.deletedCount === 1 ? "" : "s"}.`,
      tone: "success",
    });
  }

  async function updateStop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const drivingDistanceKm = String(formData.get("drivingDistanceKm") ?? "").trim();

    setIsUpdatingStop(true);
    setStopMessage(null);

    const response = await fetch(getFunctionUrl("update-stop"), {
      body: JSON.stringify({
        city: String(formData.get("city") ?? "").trim() || null,
        country: String(formData.get("country") ?? "").trim(),
        date: String(formData.get("date") ?? "").trim(),
        description: String(formData.get("description") ?? "").trim(),
        destination: String(formData.get("destination") ?? "").trim() || null,
        drivingDistanceKm: drivingDistanceKm ? Number(drivingDistanceKm) : null,
        drivingDistanceNote: String(formData.get("drivingDistanceNote") ?? "").trim() || null,
        journeyId: currentJourney.id,
        latitude: Number(formData.get("latitude")),
        longitude: Number(formData.get("longitude")),
        name: String(formData.get("name") ?? "").trim(),
        overnight: String(formData.get("overnight") ?? "").trim() || null,
        startPoint: String(formData.get("startPoint") ?? "").trim() || null,
        stateOrProvince: String(formData.get("stateOrProvince") ?? "").trim(),
        stopId: String(formData.get("stopId") ?? "").trim(),
      }),
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const data = (await response.json()) as { error?: string };

    setIsUpdatingStop(false);

    if (!response.ok) {
      setStopMessage({ text: data.error ?? "Stop update failed.", tone: "error" });
      return;
    }

    setStopMessage({ text: "Stop updated. The map and timeline will refresh.", tone: "success" });
  }

  async function findStopCoordinates(event: FormEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;

    if (!form) {
      return;
    }

    if (!hasOpenRouteServiceApiKey) {
      setStopMessage({ text: "OpenRouteService API key is not configured.", tone: "error" });
      return;
    }

    const formData = new FormData(form);
    const query = getGeocodeQuery(formData);

    if (!query) {
      setStopMessage({ text: "Enter a stop name or city before finding coordinates.", tone: "error" });
      return;
    }

    setIsFindingCoordinates(true);
    setStopMessage(null);

    const params = new URLSearchParams({
      size: "1",
      text: query,
    });
    const boundaryCountry = getBoundaryCountry(getFormString(formData, "country"));

    if (boundaryCountry) {
      params.set("boundary.country", boundaryCountry);
    }

    try {
      const response = await fetch(`${openRouteServiceGeocodeUrl}?${params.toString()}`, {
        headers: {
          Accept: "application/json",
          Authorization: openRouteServiceApiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`OpenRouteService returned ${response.status}`);
      }

      const data = (await response.json()) as OpenRouteServiceGeocodeResponse;
      const feature = data.features?.[0];
      const coordinates = feature?.geometry?.coordinates;

      if (!coordinates) {
        setStopMessage({ text: `No coordinates found for "${query}".`, tone: "error" });
        return;
      }

      const [longitude, latitude] = coordinates;
      const latitudeInput = form.elements.namedItem("latitude");
      const longitudeInput = form.elements.namedItem("longitude");

      if (latitudeInput instanceof HTMLInputElement) {
        latitudeInput.value = latitude.toFixed(6);
      }

      if (longitudeInput instanceof HTMLInputElement) {
        longitudeInput.value = longitude.toFixed(6);
      }

      setStopMessage({
        text: `Coordinates found${feature.properties?.label ? `: ${feature.properties.label}` : ""}. Save stop changes to move the marker.`,
        tone: "success",
      });
    } catch (error) {
      setStopMessage({
        text: error instanceof Error ? error.message : "Unable to find coordinates.",
        tone: "error",
      });
    } finally {
      setIsFindingCoordinates(false);
    }
  }

  async function calculateDistanceFromPreviousStop(event: FormEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;

    if (!form) {
      return;
    }

    const formData = new FormData(form);
    const stopId = getFormString(formData, "stopId");
    const stopIndex = editableStops.findIndex((stop) => stop.id === stopId);
    const previousStop = stopIndex > 0 ? editableStops[stopIndex - 1] : null;

    if (!previousStop) {
      setStopMessage({ text: "This stop does not have a previous stop.", tone: "error" });
      return;
    }

    const latitude = Number(formData.get("latitude"));
    const longitude = Number(formData.get("longitude"));

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setStopMessage({ text: "Enter valid coordinates before calculating distance.", tone: "error" });
      return;
    }

    const distanceInput = form.elements.namedItem("drivingDistanceKm");
    const noteInput = form.elements.namedItem("drivingDistanceNote");
    const currentCoordinates = { latitude, longitude };

    setIsCalculatingDistance(true);
    setStopMessage(null);

    try {
      if (!hasOpenRouteServiceApiKey) {
        throw new Error("OpenRouteService API key is not configured.");
      }

      const response = await fetch(openRouteServiceDirectionsUrl, {
        body: JSON.stringify({
          coordinates: [
            [previousStop.longitude, previousStop.latitude],
            [longitude, latitude],
          ],
          instructions: false,
          preference: "recommended",
        }),
        headers: {
          Authorization: openRouteServiceApiKey,
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`OpenRouteService returned ${response.status}`);
      }

      const data = (await response.json()) as OpenRouteServiceDirectionsResponse;
      const distanceMeters = data.features?.[0]?.properties?.summary?.distance;

      if (typeof distanceMeters !== "number") {
        throw new Error("OpenRouteService did not return a route distance.");
      }

      const distanceKm = Math.round(distanceMeters / 1000);

      if (distanceInput instanceof HTMLInputElement) {
        distanceInput.value = String(distanceKm);
      }

      if (noteInput instanceof HTMLInputElement && !noteInput.value.trim()) {
        noteInput.value = `Calculated from ${previousStop.name}`;
      }

      setStopMessage({
        text: `Driving distance calculated from ${previousStop.name}: ${distanceKm} km. Save stop changes to keep it.`,
        tone: "success",
      });
    } catch (error) {
      const distanceKm = Math.round(getStraightLineDistanceKm(previousStop, currentCoordinates));

      if (distanceInput instanceof HTMLInputElement) {
        distanceInput.value = String(distanceKm);
      }

      setStopMessage({
        text: `Used straight-line distance from ${previousStop.name}: ${distanceKm} km. Save stop changes to keep it.`,
        tone: "success",
      });
    } finally {
      setIsCalculatingDistance(false);
    }
  }

  async function updatePhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const photoId = getFormString(formData, "photoId");

    setUpdatingPhotoId(photoId);
    setManagePhotoMessage(null);

    const response = await fetch(getFunctionUrl("update-photo"), {
      body: JSON.stringify({
        caption: getFormString(formData, "caption") || null,
        journeyId: currentJourney.id,
        photoId,
        stopId: getFormString(formData, "stopId") || null,
        takenAt: getFormString(formData, "takenAt") || null,
        title: getFormString(formData, "title"),
      }),
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const data = (await response.json()) as { error?: string };

    setUpdatingPhotoId(null);

    if (!response.ok) {
      setManagePhotoMessage({ text: data.error ?? "Photo update failed.", tone: "error" });
      return;
    }

    setManagePhotoMessage({ text: "Photo updated. Gallery and map will refresh.", tone: "success" });
  }

  async function deletePhoto(photo: UploadedPhoto) {
    if (!session) {
      return;
    }

    const shouldDelete = window.confirm(`Delete "${photo.title}" from the gallery and map?`);

    if (!shouldDelete) {
      return;
    }

    setDeletingPhotoId(photo.id);
    setManagePhotoMessage(null);

    const response = await fetch(getFunctionUrl("delete-photo"), {
      body: JSON.stringify({
        journeyId: currentJourney.id,
        photoId: photo.id,
      }),
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const data = (await response.json()) as { error?: string };

    setDeletingPhotoId(null);

    if (!response.ok) {
      setManagePhotoMessage({ text: data.error ?? "Photo deletion failed.", tone: "error" });
      return;
    }

    setManagePhotoMessage({ text: "Photo deleted from Gallery and map.", tone: "success" });
  }

  if (!hasSupabaseConfig) {
    return (
      <main className="standard-page">
        <div className="page-shell page-shell--standard placeholder-page">
          <span className="section-kicker">Admin</span>
          <h1>Admin tools unavailable</h1>
          <p>Supabase environment variables are required for admin login and uploads.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="standard-page">
      <div className="page-shell page-shell--standard admin-page">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Admin</span>
            <h1>Trip Admin</h1>
          </div>
          {session ? (
            <button className="admin-secondary-button" onClick={signOut} type="button">
              Sign out
            </button>
          ) : null}
        </div>
        {stopOverridesError ? <p className="admin-message admin-message--error">{stopOverridesError}</p> : null}

        {!session ? (
          <form className="admin-panel admin-form" onSubmit={signIn}>
            <h2>Login</h2>
            <label>
              Email
              <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
            </label>
            <label>
              Password
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            <button disabled={isSigningIn} type="submit">
              {isSigningIn ? "Signing in..." : "Sign in"}
            </button>
            {authMessage ? <p className={`admin-message admin-message--${authMessage.tone}`}>{authMessage.text}</p> : null}
          </form>
        ) : (
          <div className="admin-grid">
            <form className="admin-panel admin-form admin-panel--wide" key={stopFormKey} onSubmit={updateStop}>
              <h2>Update Stop</h2>
              <p className="admin-help">Change a day or stop when the trip route shifts.</p>
              <label>
                Stop
                <select name="stopId" onChange={(event) => setSelectedStopId(event.target.value)} value={selectedStop?.id ?? ""}>
                  {editableStops.map((stop) => (
                    <option key={stop.id} value={stop.id}>
                      {stop.showInTimeline === false ? "Route start" : `Day ${stop.order}`}: {stop.name}
                    </option>
                  ))}
                </select>
              </label>
              {selectedStop ? (
                <>
                  <div className="admin-form__columns">
                    <label>
                      Name
                      <input name="name" required defaultValue={selectedStop.name} placeholder="Chicago" />
                    </label>
                    <label>
                      Date
                      <input name="date" required type="date" defaultValue={selectedStop.date} />
                    </label>
                  </div>
                  <div className="admin-form__columns">
                    <label>
                      City
                      <input name="city" defaultValue={selectedStop.city ?? ""} placeholder="Chicago" />
                    </label>
                    <label>
                      State / Province
                      <input name="stateOrProvince" required defaultValue={selectedStop.stateOrProvince} />
                    </label>
                    <label>
                      Country
                      <input name="country" required defaultValue={selectedStop.country} />
                    </label>
                  </div>
                  <div className="admin-form__columns">
                    <label>
                      Latitude
                      <input name="latitude" required type="number" step="any" defaultValue={selectedStop.latitude} />
                    </label>
                    <label>
                      Longitude
                      <input name="longitude" required type="number" step="any" defaultValue={selectedStop.longitude} />
                    </label>
                  </div>
                  <button
                    className="admin-secondary-button"
                    disabled={isFindingCoordinates}
                    onClick={findStopCoordinates}
                    type="button"
                  >
                    {isFindingCoordinates ? "Finding coordinates..." : "Find coordinates"}
                  </button>
                  <label>
                    Description
                    <textarea name="description" required rows={3} defaultValue={selectedStop.description} />
                  </label>
                  <div className="admin-form__columns">
                    <label>
                      Overnight
                      <input name="overnight" defaultValue={selectedStop.overnight ?? ""} />
                    </label>
                    <label>
                      Distance km
                      <input name="drivingDistanceKm" type="number" min="0" step="any" defaultValue={selectedStop.drivingDistanceKm ?? ""} />
                    </label>
                    <label>
                      Distance note
                      <input name="drivingDistanceNote" defaultValue={selectedStop.drivingDistanceNote ?? ""} />
                    </label>
                  </div>
                  <button
                    className="admin-secondary-button"
                    disabled={isCalculatingDistance}
                    onClick={calculateDistanceFromPreviousStop}
                    type="button"
                  >
                    {isCalculatingDistance ? "Calculating distance..." : "Calculate distance from previous stop"}
                  </button>
                  <div className="admin-form__columns">
                    <label>
                      Start point
                      <input name="startPoint" defaultValue={selectedStop.startPoint ?? ""} />
                    </label>
                    <label>
                      Destination
                      <input name="destination" defaultValue={selectedStop.destination ?? ""} />
                    </label>
                  </div>
                  <button disabled={isUpdatingStop} type="submit">
                    {isUpdatingStop ? "Saving..." : "Save stop changes"}
                  </button>
                  {stopMessage ? <p className={`admin-message admin-message--${stopMessage.tone}`}>{stopMessage.text}</p> : null}
                </>
              ) : null}
            </form>

            <form className="admin-panel admin-form" onSubmit={uploadPhoto}>
              <h2>Upload Photo</h2>
              <input name="journeyId" type="hidden" value={currentJourney.id} />
              <label>
                Title
                <input name="title" placeholder="Sunset near Yellowstone" required />
              </label>
              <label>
                Stop
                <select name="stopId">
                  <option value="">No specific stop</option>
                  {photoStops.map((stop) => (
                    <option key={stop.id} value={stop.id}>
                      {getStopOptionLabel(stop)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <input name="takenAt" type="date" />
              </label>
              <label>
                Caption
                <textarea name="caption" placeholder="A short note about this photo." rows={4} />
              </label>
              <label>
                Image
                <input accept="image/*" name="file" required type="file" />
              </label>
              <button disabled={isUploading} type="submit">
                {isUploading ? "Uploading..." : "Upload photo"}
              </button>
              {photoMessage ? <p className={`admin-message admin-message--${photoMessage.tone}`}>{photoMessage.text}</p> : null}
            </form>

            <section className="admin-panel admin-panel--wide">
              <h2>Manage Media</h2>
              <p className="admin-help">Choose a stop first, then edit the uploaded photos assigned to that stop.</p>
              {isLoadingUploadedPhotos ? <p className="admin-message">Loading uploaded photos...</p> : null}
              {uploadedPhotosError ? <p className="admin-message admin-message--error">{uploadedPhotosError}</p> : null}
              {managePhotoMessage ? (
                <p className={`admin-message admin-message--${managePhotoMessage.tone}`}>{managePhotoMessage.text}</p>
              ) : null}
              <div className="admin-media-manager">
                <div aria-label="Media stops" className="admin-media-stop-list">
                  {photoStops.map((stop) => (
                    <button
                      className={`admin-media-stop${selectedMediaStopId === stop.id ? " admin-media-stop--active" : ""}`}
                      key={stop.id}
                      onClick={() => setSelectedMediaStopId(stop.id)}
                      type="button"
                    >
                      <span>{getStopOptionLabel(stop)}</span>
                      <strong>{getMediaCount(mediaCountsByStop, stop.id)}</strong>
                    </button>
                  ))}
                  <button
                    className={`admin-media-stop${selectedMediaStopId === UNASSIGNED_MEDIA_STOP_ID ? " admin-media-stop--active" : ""}`}
                    onClick={() => setSelectedMediaStopId(UNASSIGNED_MEDIA_STOP_ID)}
                    type="button"
                  >
                    <span>No specific stop</span>
                    <strong>{getMediaCount(mediaCountsByStop, UNASSIGNED_MEDIA_STOP_ID)}</strong>
                  </button>
                </div>
                <div className="admin-media-detail">
                  <div className="admin-media-detail__header">
                    <h3>{getMediaStopLabel(selectedMediaStop)}</h3>
                    <span>
                      {selectedUploadedPhotos.length + selectedStaticPhotos.length + selectedStaticVideos.length} item
                      {selectedUploadedPhotos.length + selectedStaticPhotos.length + selectedStaticVideos.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {selectedUploadedPhotos.length > 0 ? (
                    <div className="admin-photo-list">
                      {selectedUploadedPhotos.map((photo) => (
                        <article className="admin-photo-item" key={photo.id}>
                          <img alt={photo.title} loading="lazy" src={photo.publicUrl} />
                          <form className="admin-form admin-photo-form" onSubmit={updatePhoto}>
                            <input name="photoId" type="hidden" value={photo.id} />
                            <div className="admin-form__columns">
                              <label>
                                Title
                                <input name="title" required defaultValue={photo.title} />
                              </label>
                              <label>
                                Stop
                                <select name="stopId" defaultValue={photo.stopId ?? ""}>
                                  <option value="">No specific stop</option>
                                  {photoStops.map((stop) => (
                                    <option key={stop.id} value={stop.id}>
                                      {getStopOptionLabel(stop)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Date
                                <input name="takenAt" type="date" defaultValue={photo.takenAt ?? ""} />
                              </label>
                            </div>
                            <label>
                              Caption
                              <textarea name="caption" rows={3} defaultValue={photo.caption ?? ""} />
                            </label>
                            <div className="admin-photo-actions">
                              <button disabled={updatingPhotoId === photo.id} type="submit">
                                {updatingPhotoId === photo.id ? "Saving..." : "Save photo"}
                              </button>
                              <button
                                className="admin-danger-button"
                                disabled={deletingPhotoId === photo.id}
                                onClick={() => void deletePhoto(photo)}
                                type="button"
                              >
                                {deletingPhotoId === photo.id ? "Deleting..." : "Delete photo"}
                              </button>
                            </div>
                          </form>
                        </article>
                      ))}
                    </div>
                  ) : null}
                  {selectedStaticPhotos.length > 0 || selectedStaticVideos.length > 0 ? (
                    <div className="admin-static-media-list">
                      {selectedStaticPhotos.map((photo) => (
                        <article className="admin-static-media" key={photo.id}>
                          <img alt={photo.alt} loading="lazy" src={photo.src} />
                          <div>
                            <h4>{photo.title}</h4>
                            {photo.caption ? <p>{photo.caption}</p> : null}
                            <span>Static photo</span>
                          </div>
                        </article>
                      ))}
                      {selectedStaticVideos.map((video) => (
                        <article className="admin-static-media" key={video.id}>
                          <video controls poster={video.thumbnailSrc} preload="metadata" src={video.src} />
                          <div>
                            <h4>{video.title}</h4>
                            {video.caption ? <p>{video.caption}</p> : null}
                            <span>Static video</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : null}
                  {!isLoadingUploadedPhotos &&
                  selectedUploadedPhotos.length === 0 &&
                  selectedStaticPhotos.length === 0 &&
                  selectedStaticVideos.length === 0 ? (
                    <p className="admin-message">No media for this stop yet.</p>
                  ) : null}
                </div>
              </div>
            </section>

            <form className="admin-panel admin-form" onSubmit={clearHistory}>
              <h2>Clear Actual Route History</h2>
              <p className="admin-help">
                This permanently deletes OwnTracks history points in the selected time range. The current blue live marker is not deleted.
              </p>
              <label>
                Start time
                <input name="startAt" required type="datetime-local" />
              </label>
              <label>
                End time
                <input name="endAt" required type="datetime-local" />
              </label>
              <label>
                Tracker ID
                <input name="trackerId" placeholder="Optional, for example phone" />
              </label>
              <button disabled={isClearingHistory} type="submit">
                {isClearingHistory ? "Deleting..." : "Delete history points"}
              </button>
              {historyMessage ? (
                <p className={`admin-message admin-message--${historyMessage.tone}`}>{historyMessage.text}</p>
              ) : null}
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
