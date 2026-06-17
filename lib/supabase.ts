import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ¿Está realmente configurado con un proyecto Supabase de verdad?
export const isSupabaseConfigured = Boolean(
  url &&
    anonKey &&
    url.startsWith("http") &&
    !url.includes("TU-PROYECTO") &&
    !url.includes("placeholder")
);

if (!isSupabaseConfigured) {
  console.warn(
    "[prospeccion] Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

// Placeholders sintácticamente válidos para que el build/prerender no rompa
// cuando faltan las env vars. Las queries reales fallan (banner visible),
// pero las páginas renderizan.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder-anon-key"
);
