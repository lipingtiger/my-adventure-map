import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { currentJourney } from "../data/journeys";
import { hasSupabaseConfig, supabase, supabaseUrl } from "../config/supabase";
import { sortStops } from "../utils/journey";

type AdminMessage = {
  tone: "error" | "success";
  text: string;
};

function getFunctionUrl(action: string) {
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/admin-tools/${action}`;
}

function toIsoDateTime(value: string) {
  return new Date(value).toISOString();
}

export function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [authMessage, setAuthMessage] = useState<AdminMessage | null>(null);
  const [photoMessage, setPhotoMessage] = useState<AdminMessage | null>(null);
  const [historyMessage, setHistoryMessage] = useState<AdminMessage | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const orderedStops = useMemo(() => sortStops(currentJourney.stops).filter((stop) => stop.showInTimeline !== false), []);

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
