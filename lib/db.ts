import { supabase } from "./supabase";
import { hoyAR } from "./format";
import type {
  Cierre,
  Contactado,
  DiaRegistro,
  ListaItem,
  Perfil,
  Totales,
} from "./types";

// ---------------- CONTACTADOS ----------------
export async function getContactados(): Promise<Contactado[]> {
  const { data, error } = await supabase
    .from("contactados")
    .select("*")
    .order("fecha", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function sumarContactados(
  rubro: string,
  cantidad: number
): Promise<void> {
  const { error } = await supabase
    .from("contactados")
    .insert({ fecha: hoyAR(), rubro, cantidad });
  if (error) throw error;
}

// ---------------- CIERRES ----------------
export async function getCierres(): Promise<Cierre[]> {
  const { data, error } = await supabase
    .from("cierres")
    .select("*")
    .order("fecha", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function guardarCierre(c: {
  r1: number;
  r2: number;
  r3: number;
  ventas: number;
}): Promise<void> {
  const { error } = await supabase
    .from("cierres")
    .insert({ fecha: hoyAR(), ...c });
  if (error) throw error;
}

// ---------------- LISTA (CSV de perfiles a hablar) ----------------
export async function getLista(): Promise<ListaItem[]> {
  const { data, error } = await supabase
    .from("lista")
    .select("*")
    .order("id", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function importarLista(
  filas: { url: string; nombre: string | null }[],
  rubro: string,
  carpeta: string
): Promise<number> {
  const limpias = filas.filter((f) => f.url.trim());
  if (limpias.length === 0) return 0;
  let insertados = 0;
  for (let i = 0; i < limpias.length; i += 500) {
    const lote = limpias.slice(i, i + 500).map((f) => ({
      url: f.url.trim(),
      nombre: f.nombre?.trim() || null,
      rubro,
      carpeta,
    }));
    const { data, error } = await supabase.from("lista").insert(lote).select("id");
    if (error) throw error;
    insertados += data?.length ?? 0;
  }
  return insertados;
}

/** Marca un item como hablado (contactado) y suma 1 a 'contactados'. */
export async function marcarHablado(item: ListaItem): Promise<void> {
  if (item.hablado) return; // idempotente
  // impacta en estadísticas, ligado al item para poder revertir
  const { error: e2 } = await supabase
    .from("contactados")
    .insert({ fecha: hoyAR(), rubro: item.rubro, cantidad: 1, lista_id: item.id });
  if (e2) throw e2;
  const { error } = await supabase
    .from("lista")
    .update({ hablado: true, descartado: false, fecha_hablado: new Date().toISOString() })
    .eq("id", item.id);
  if (error) throw error;
}

/** Marca "no contacto" (X): quita el contactado de la estadística y descarta. */
export async function marcarNoContacto(item: ListaItem): Promise<void> {
  const { error: e2 } = await supabase
    .from("contactados")
    .delete()
    .eq("lista_id", item.id);
  if (e2) throw e2;
  const { error } = await supabase
    .from("lista")
    .update({ hablado: false, descartado: true, fecha_hablado: null })
    .eq("id", item.id);
  if (error) throw error;
}

/** Vuelve un item al estado inicial (pendiente). */
export async function resetItem(item: ListaItem): Promise<void> {
  const { error: e2 } = await supabase
    .from("contactados")
    .delete()
    .eq("lista_id", item.id);
  if (e2) throw e2;
  const { error } = await supabase
    .from("lista")
    .update({ hablado: false, descartado: false, fecha_hablado: null })
    .eq("id", item.id);
  if (error) throw error;
}

/** Elimina la carpeta (borra sus perfiles; no toca las estadísticas ya generadas). */
export async function eliminarCarpeta(carpeta: string): Promise<void> {
  const { error } = await supabase.from("lista").delete().eq("carpeta", carpeta);
  if (error) throw error;
}

// ---------------- PERFILES (seguimientos) ----------------
export async function getPerfiles(): Promise<Perfil[]> {
  const { data, error } = await supabase
    .from("perfiles")
    .select("*")
    .order("ultimo_contacto", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function agregarPerfil(p: {
  handle: string;
  nombre: string | null;
  rubro: string | null;
  ultimo_contacto: string;
}): Promise<void> {
  const { error } = await supabase.from("perfiles").insert(p);
  if (error) throw error;
}

export async function tocarPerfil(id: number): Promise<void> {
  const { error } = await supabase
    .from("perfiles")
    .update({ ultimo_contacto: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function quitarPerfil(id: number): Promise<void> {
  const { error } = await supabase.from("perfiles").delete().eq("id", id);
  if (error) throw error;
}

// ---------------- AGREGACIONES (en cliente) ----------------
export function calcularTotales(
  contactados: Contactado[],
  cierres: Cierre[]
): Totales {
  let cont = 0;
  const porRubroMap: Record<string, number> = {};
  for (const c of contactados) {
    cont += c.cantidad;
    porRubroMap[c.rubro] = (porRubroMap[c.rubro] ?? 0) + c.cantidad;
  }
  let r1 = 0,
    r2 = 0,
    r3 = 0,
    ventas = 0;
  for (const k of cierres) {
    r1 += k.r1;
    r2 += k.r2;
    r3 += k.r3;
    ventas += k.ventas;
  }
  const resp = r1 + r2 + r3;
  const porRubro = Object.entries(porRubroMap).sort((a, b) => b[1] - a[1]);
  return {
    cont,
    r1,
    r2,
    r3,
    ventas,
    resp,
    respPct: cont ? Math.round((resp / cont) * 1000) / 10 : 0,
    convPct: cont ? Math.round((ventas / cont) * 1000) / 10 : 0,
    porRubro,
  };
}

/** Suma de contactados por fecha (YYYY-MM-DD -> cantidad) */
export function contactadosPorFecha(
  contactados: Contactado[]
): Record<string, number> {
  const m: Record<string, number> = {};
  for (const c of contactados) m[c.fecha] = (m[c.fecha] ?? 0) + c.cantidad;
  return m;
}

/** Registro diario combinado (contactados + cierres por fecha) */
export function registroDiario(
  contactados: Contactado[],
  cierres: Cierre[]
): DiaRegistro[] {
  const map: Record<string, DiaRegistro> = {};
  const get = (f: string) =>
    (map[f] ??= { fecha: f, cont: 0, r1: 0, r2: 0, r3: 0, ventas: 0 });
  for (const c of contactados) get(c.fecha).cont += c.cantidad;
  for (const k of cierres) {
    const d = get(k.fecha);
    d.r1 += k.r1;
    d.r2 += k.r2;
    d.r3 += k.r3;
    d.ventas += k.ventas;
  }
  return Object.values(map).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}

/** Totales de hoy (para el panel "hoy hasta ahora") */
export function totalesHoy(contactados: Contactado[], cierres: Cierre[]) {
  const f = hoyAR();
  const cont = contactados
    .filter((c) => c.fecha === f)
    .reduce((a, c) => a + c.cantidad, 0);
  const k = cierres.filter((x) => x.fecha === f);
  return {
    cont,
    r1: k.reduce((a, x) => a + x.r1, 0),
    r2: k.reduce((a, x) => a + x.r2, 0),
    r3: k.reduce((a, x) => a + x.r3, 0),
    ventas: k.reduce((a, x) => a + x.ventas, 0),
  };
}
