"use client";

import { isSupabaseConfigured } from "@/lib/supabase";

export function ConfigBanner() {
  if (isSupabaseConfigured) return null;
  return (
    <div className="mb-5 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
      <strong>Falta conectar Supabase.</strong> Pegá tu URL y anon key en{" "}
      <code className="rounded bg-bg px-1">.env.local</code> y reiniciá el
      servidor. Mientras tanto los datos no van a cargar.
    </div>
  );
}
