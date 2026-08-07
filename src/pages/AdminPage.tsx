import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { currentJourney } from "../data/journeys";
import {
  hasOpenRouteServiceApiKey,
  openRouteServiceApiKey,
  openRouteServiceGeocodeUrl,
} from "../config/openRouteService";
import { hasSupabaseConfig, supabase, supabaseUrl } from "../config/supabase";
import { useJourneyStopOverrides } from "../hooks/useJourneyStopOverrides";
import { sortStops } from "../utils/journey";

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

function getFunctionUrl(action: string) {
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/admin-tools/${action}`;
}

function toIsoDateTime(value: string) {
  return new Date(value).toISOString();
}

function getFormString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
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
  const [selectedStopId, setSelectedStopId] = useState(currentJourney.stops.find((stop) => stop.showInTimeline !== false)?.id ?? currentJourney.stops[0]?.id ?? "");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [isFindingCoordinates, setIsFindingCoordinates] = useState(false);
  const [isUpdatingStop, setIsUpdatingStop] = useState(false);
  const { errorMessage: stopOverridesError, journey } = useJourneyStopOverrides(currentJourney);
  const editableStops = useMemo(() => sortStops(journey.stops), [journey.stops]);
  const orderedStops = useMemo(() => editableStops.filter((stop) => stop.showInTimeline !== false), [editableStops]);
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
                  {orderedStops.map((stop) => (
                    <option key={stop.id} value={stop.id}>
                      Day {stop.order}: {stop.name}
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
