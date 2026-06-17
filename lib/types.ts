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
  url: string;
  nombre: string | null;
  rubro: string;
  hablado: boolean;
  fecha_hablado: string | null;
  created_at: string;
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
