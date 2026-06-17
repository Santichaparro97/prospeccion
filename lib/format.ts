export const TZ = "America/Argentina/Buenos_Aires";

const MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];
const MESES_LARGO = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "Hoy" en Argentina como YYYY-MM-DD */
export function hoyAR(): string {
  // en-CA produce formato YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

/** Partes año/mes(0-11)/día del hoy en Argentina */
export function hoyPartesAR(): { y: number; m: number; d: number } {
  const s = hoyAR();
  const [y, m, d] = s.split("-").map(Number);
  return { y, m: m - 1, d };
}

/** "2026-06-17" -> "17 jun" */
export function fmtFechaCorta(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]}`;
}

export function mesLargo(m: number): string {
  return MESES_LARGO[m];
}

/** Días entre una fecha ISO y hoy (en días enteros) */
export function diasDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/** ISO de "hace N días" desde ahora */
export function haceNDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
