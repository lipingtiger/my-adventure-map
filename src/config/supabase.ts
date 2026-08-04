import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "./appEnv";

export const supabaseUrl = getPublicEnv("VITE_SUPABASE_URL");
export const supabaseAnonKey = getPublicEnv("VITE_SUPABASE_ANON_KEY");
export const hasSupabaseConfig = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

export const supabase = hasSupabaseConfig ? createClient(supabaseUrl, supabaseAnonKey) : null;
