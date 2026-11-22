import { createClient } from "@supabase/supabase-js";

// This is the active production Bits2Bytes Supabase project.
// The URL and publishable key are public client configuration, never secrets.
// Environment variables can override these defaults for a separate deployment.
const defaultSupabaseUrl = "https://enfqoofluceqrlcjemfu.supabase.co";
const defaultSupabasePublishableKey = "sb_publishable_aKG0gu1e_twW7N1MqNlkrQ_Tub1P1u2";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || defaultSupabaseUrl;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || defaultSupabasePublishableKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true
      }
    })
  : null;
