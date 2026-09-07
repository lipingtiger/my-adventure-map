import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../config/supabase";
import { adminRequest } from "../utils/admin";

export function useAdminSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [verifiedToken, setVerifiedToken] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => { if (alive) setSession(data.session); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    let alive = true;
    setError("");
    if (session) void adminRequest("admin-session", session.access_token, {}).then(() => {
      if (alive) setVerifiedToken(session.access_token);
    }).catch((err) => { if (alive) setError(err.message); });
    return () => { alive = false; };
  }, [session?.access_token]);
  return { session, isAdmin: !!session && verifiedToken === session.access_token, error };
}
