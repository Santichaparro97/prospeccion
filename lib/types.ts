export const RUBROS = [
  "Gastronomía",
  "Inmobiliaria",
  "Estética y belleza",
  "Indumentaria",
  "Profesionales",
  "Salud",
  "Otro",
] as const;

export type Rubro = (typeof RUBROS)[number];

export interface Contactado {
  id: number;
  fecha: string; // YYYY-MM-DD
  rubro: string;
  cantidad: number;
  created_at: string;
}

export interface Cierre {
  id: number;
  fecha: string;
  r1: number;
  r2: number;
  r3: number;
  ventas: number;
  created_at: string;
}

export interface ListaItem {
  id: number;
  carpeta: string;
  url: string;
  nombre: string | null;
  rubro: string;
  hablado: boolean; // true = contactado (cuenta en estadísticas)
  // Estado derivado de (hablado, fecha_hablado), sin columnas nuevas:
  //   pendiente  -> hablado=false, fecha_hablado=null
  //   contactado -> hablado=true,  fecha_hablado=set
  //   cancelado  -> hablado=false, fecha_hablado=set  ("no contacto")
  fecha_hablado: string | null;
  created_at: string;
}

export type EstadoLista = "pendiente" | "contactado" | "cancelado";

export function estadoLista(i: ListaItem): EstadoLista {
  if (i.hablado) return "contactado";
  if (i.fecha_hablado) return "cancelado";
  return "pendiente";
}

export interface Perfil {
  id: number;
  handle: string;
  nombre: string | null;
  rubro: string | null;
  ultimo_contacto: string;
  created_at: string;
}

// Totales acumulados calculados en cliente
export interface Totales {
  cont: number;
  r1: number;
  r2: number;
  r3: number;
  ventas: number;
  resp: number;
  respPct: number;
  convPct: number;
  porRubro: [string, number][];
}

export interface DiaRegistro {
  fecha: string;
  cont: number;
  r1: number;
  r2: number;
  r3: number;
  ventas: number;
}
