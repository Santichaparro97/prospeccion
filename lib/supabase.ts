import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Mensaje claro en consola si faltan las keys (uso personal).
  console.warn(
    "[prospeccion] Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local"
  );
}

// Cliente único de navegador. Herramienta de uso personal: sin auth.
export const supabase = createClient(url ?? "", anonKey ?? "");

export const isSupabaseConfigured = Boolean(
  url && anonKey && !url.includes("TU-PROYECTO")
);
