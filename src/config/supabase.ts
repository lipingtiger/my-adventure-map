import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
export const hasSupabaseConfig = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

export const supabase = hasSupabaseConfig ? createClient(supabaseUrl, supabaseAnonKey) : null;
