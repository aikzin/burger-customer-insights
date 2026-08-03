import { createClient } from "@supabase/supabase-js";

// Publishable browser configuration. Environment values still take precedence,
// while these public defaults keep Vercel previews functional when envs are absent.
const defaultUrl = "https://zgsukxilawqzhaxjkbma.supabase.co";
const defaultPublishableKey = "sb_publishable_kWdEoirM5oyA9sSqC5fYBg_5Eu9nKog";

const url = import.meta.env.VITE_SUPABASE_URL?.trim() || defaultUrl;
const publishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim() || defaultPublishableKey;

export const isSupabaseConfigured = Boolean(url && publishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
