"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ConfigBanner } from "@/components/ConfigBanner";
import { Button, Card, EmptyState, Field, Spinner, StatCard, Toast } from "@/components/ui";
import { RUBROS, type Cierre, type Contactado, type ListaItem } from "@/lib/types";
import {
  calcularTotales,
  contactadosPorFecha,
  getCierres,
  getContactados,
  getLista,
  guardarCierre,
  listaComoContactados,
  sumarContactados,
  totalesHoy,
} from "@/lib/db";
import { hoyPartesAR, mesLargo } from "@/lib/format";

const FUN = [
  { l: "Contactados", key: "cont", c: "var(--accent)" },
  { l: "Respondieron", key: "resp", c: "var(--cyan)" },
  { l: "Vendí", key: "ventas", c: "var(--green)" },
] as const;

export default function Dashboard() {
  const [contactados, setContactados] = useState<Contactado[]>([]);
  const [cierres, setCierres] = useState<Cierre[]>([]);
  const [lista, setLista] = useState<ListaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // carga rápida
  const [cant, setCant] = useState("1");
  const [rubro, setRubro] = useState<string>(RUBROS[0]);
  // fin del día
  const [fr1, setFr1] = useState("0");
  const [fr2, setFr2] = useState("0");
  const [fr3, setFr3] = useState("0");
  const [fv, setFv] = useState("0");

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 1800);
  }

  const load = useCallback(async () => {
    setError(null);
    try {
      const [c, k, l] = await Promise.all([getContactados(), getCierres(), getLista()]);
      setContactados(c);
      setCierres(k);
      setLista(l);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // los perfiles "hablado" de la lista cuentan como contactados
  const allContactados = useMemo(
    () => [...contactados, ...listaComoContactados(lista)],
    [contactados, lista]
  );
  const t = useMemo(() => calcularTotales(allContactados, cierres), [allContactados, cierres]);
  const hoy = useMemo(() => totalesHoy(allContactados, cierres), [allContactados, cierres]);

  async function onSumar() {
    const n = parseInt(cant);
    if (!n || n < 1) return flash("Ingresá una cantidad válida");
    setBusy(true);
    try {
      await sumarContactados(rubro, n);
      await load();
      flash(`+${n} contactados ✓`);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  async function onCerrar() {
    const r1 = parseInt(fr1) || 0;
    const r2 = parseInt(fr2) || 0;
    const r3 = parseInt(fr3) || 0;
    const ventas = parseInt(fv) || 0;
    if (r1 + r2 + r3 + ventas === 0) return flash("Cargá al menos un número");
    setBusy(true);
    try {
      await guardarCierre({ r1, r2, r3, ventas });
      setFr1("0");
      setFr2("0");
      setFr3("0");
      setFv("0");
      await load();
      flash("Fin del día guardado ✓");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  // --------- gráficos (datos derivados) ---------
  const msgs = [
    { n: 1, v: t.r1 },
    { n: 2, v: t.r2 },
    { n: 3, v: t.r3 },
  ];
  const maxMsg = Math.max(...msgs.map((m) => m.v), 1);
  const maxRubro = Math.max(...t.porRubro.map((x) => x[1]), 1);

  // calendario mes actual (AR)
  const { y, m, d: today } = hoyPartesAR();
  const offset = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  const porFecha = contactadosPorFecha(allContactados);
  const porDiaMes: Record<number, number> = {};
  for (const [f, v] of Object.entries(porFecha)) {
    const [yy, mm, dd] = f.split("-").map(Number);
    if (yy === y && mm === m + 1) porDiaMes[dd] = v;
  }
  const maxDia = Math.max(...Object.values(porDiaMes), 1);
  const heat = (v: number) =>
    !v ? "var(--bg-elev-2)" : `rgba(59,130,246,${0.18 + (v / maxDia) * 0.82})`;
  const funVal = (key: string) =>
    key === "cont" ? t.cont : key === "resp" ? t.resp : t.ventas;

  return (
    <div className="p-8">
      <PageHeader
        title="Dashboard"
        subtitle="Conteo diario acumulado · se guarda en Supabase."
      />
      <ConfigBanner />

      {error && (
        <div className="mb-4 rounded-lg border border-red/40 bg-red/10 px-4 py-3 text-sm text-red">
          {error}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <StatCard label="Contactados" value={t.cont} sub="total acumulado" />
            <StatCard label="Respondieron" value={t.resp} sub={`${t.respPct}% de respuesta`} accent="var(--cyan)" />
            <StatCard label="Ventas" value={t.ventas} sub={`${t.convPct}% conversión`} accent="var(--green)" />
            <StatCard label="Resp. msg 1" value={t.r1} sub="en el 1er mensaje" accent="var(--accent)" />
            <StatCard label="Resp. msg 2+3" value={t.r2 + t.r3} sub="insistiendo" accent="var(--violet)" />
          </div>

          {/* Carga rápida + Fin del día */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="text-sm font-semibold">⚡ Carga rápida</h3>
              <p className="mb-4 mt-0.5 text-xs text-fg-dim">
                Durante el día: cuántos contactaste. Canal: Instagram.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cantidad de contactados">
                  <input
                    type="number"
                    min={1}
                    className="w-full"
                    value={cant}
                    onChange={(e) => setCant(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onSumar()}
                  />
                </Field>
                <Field label="Rubro">
                  <select className="w-full" value={rubro} onChange={(e) => setRubro(e.target.value)}>
                    {RUBROS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs text-fg-dim">
                  <span className="h-2.5 w-2.5 rounded-sm bg-pink-500" />
                  Canal: Instagram
                </span>
                <Button onClick={onSumar} disabled={busy}>
                  + Sumar contactados
                </Button>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold">🌙 Fin del día</h3>
              <p className="mb-4 mt-0.5 text-xs text-fg-dim">
                Al cierre: cargá respuestas y ventas. Se suma a lo de hoy.
              </p>
              <div className="grid grid-cols-4 gap-3">
                <Field label="Resp. msg 1">
                  <input type="number" min={0} className="w-full" value={fr1} onChange={(e) => setFr1(e.target.value)} />
                </Field>
                <Field label="Resp. msg 2">
                  <input type="number" min={0} className="w-full" value={fr2} onChange={(e) => setFr2(e.target.value)} />
                </Field>
                <Field label="Resp. msg 3">
                  <input type="number" min={0} className="w-full" value={fr3} onChange={(e) => setFr3(e.target.value)} />
                </Field>
                <Field label="Ventas">
                  <input type="number" min={0} className="w-full" value={fv} onChange={(e) => setFv(e.target.value)} />
                </Field>
              </div>
              <div className="mt-3">
                <Button variant="green" onClick={onCerrar} disabled={busy}>
                  Guardar fin del día
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-border pt-3 text-sm text-fg-muted tabular">
                <span>Hoy hasta ahora:</span>
                <span>Contactados <b className="text-fg">{hoy.cont}</b></span>
                <span>M1 <b className="text-fg">{hoy.r1}</b></span>
                <span>M2 <b className="text-fg">{hoy.r2}</b></span>
                <span>M3 <b className="text-fg">{hoy.r3}</b></span>
                <span>Ventas <b className="text-fg">{hoy.ventas}</b></span>
              </div>
            </Card>
          </div>

          {/* Calendario + respuestas por mensaje */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
            <Card className="p-5">
              <h3 className="text-sm font-semibold">Calendario de contactos</h3>
              <p className="mb-4 mt-0.5 text-xs text-fg-dim">
                Cuántos contactaste cada día · {mesLargo(m)} {y}
              </p>
              <div className="grid grid-cols-7 gap-1.5">
                {["D", "L", "M", "M", "J", "V", "S"].map((dd, i) => (
                  <div key={i} className="pb-0.5 text-center text-[10px] uppercase text-fg-dim">
                    {dd}
                  </div>
                ))}
                {Array.from({ length: offset }).map((_, i) => (
                  <div key={`e${i}`} />
                ))}
                {Array.from({ length: dim }).map((_, i) => {
                  const day = i + 1;
                  const v = porDiaMes[day] ?? 0;
                  return (
                    <div
                      key={day}
                      title={`${day}: ${v} contactados`}
                      className={`relative flex aspect-square flex-col items-center justify-center rounded-md border text-xs ${
                        day === today ? "border-accent" : "border-transparent"
                      }`}
                      style={{ background: heat(v) }}
                    >
                      <span className="absolute left-1.5 top-1 text-[9px] text-fg-dim">{day}</span>
                      {v > 0 && <span className="text-sm font-bold">{v}</span>}
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold">Respuestas por nº de mensaje</h3>
              <p className="mb-4 mt-0.5 text-xs text-fg-dim">
                De dónde vienen tus respuestas. % sobre el total de contactados.
              </p>
              {t.resp === 0 ? (
                <EmptyState>Sin respuestas cargadas todavía.</EmptyState>
              ) : (
                <>
                  <div className="flex h-40 items-end gap-4 border-b border-border py-2">
                    {msgs.map((mm) => (
                      <div key={mm.n} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                        <div className="text-sm font-semibold">{mm.v}</div>
                        <div
                          className="w-full max-w-14 rounded-t-md bg-accent"
                          style={{ height: `${Math.max((mm.v / maxMsg) * 100, 2)}%` }}
                        />
                        <div className="text-xs text-fg-muted">Msg {mm.n}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-fg-dim">
                    {msgs.map((mm) => (
                      <div key={mm.n} className="flex justify-between">
                        <span>Mensaje {mm.n}: {mm.v} respuestas</span>
                        <span className="font-medium text-fg-muted">
                          {t.cont ? Math.round((mm.v / t.cont) * 1000) / 10 : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* Embudo + progreso */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="text-sm font-semibold">Embudo</h3>
              <p className="mb-4 mt-0.5 text-xs text-fg-dim">Contactados → respondieron → vendiste.</p>
              {FUN.map((e) => {
                const v = funVal(e.key);
                const w = Math.max(t.cont ? (v / t.cont) * 100 : 0, v > 0 ? 6 : 2);
                return (
                  <div key={e.key} className="mb-2 flex items-center gap-3">
                    <div className="w-28 shrink-0 text-right text-xs text-fg-muted">{e.l}</div>
                    <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-bg-elev-2">
                      <div
                        className="flex h-full items-center rounded-md px-2 text-xs font-semibold text-white"
                        style={{ width: `${w}%`, background: e.c }}
                      >
                        {v > 0 && v}
                      </div>
                    </div>
                    <div className="w-11 shrink-0 text-right text-xs text-fg-dim tabular">
                      {t.cont ? Math.round((v / t.cont) * 1000) / 10 : 0}%
                    </div>
                  </div>
                );
              })}
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold">Progreso</h3>
              <p className="mb-4 mt-0.5 text-xs text-fg-dim">Tus tasas acumuladas y la meta del mes.</p>
              <Progress label="Tasa de respuesta" pct={t.respPct} color="var(--cyan)" />
              <Progress label="Tasa de conversión a venta" pct={t.convPct} color="var(--green)" />
              <Progress
                label="Meta del mes (10 ventas)"
                pct={Math.min((t.ventas / 10) * 100, 100)}
                right={`${t.ventas}/10`}
                color="var(--accent)"
              />
            </Card>
          </div>

          {/* Por rubro */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold">Contactados por rubro</h3>
            <p className="mb-4 mt-0.5 text-xs text-fg-dim">A qué rubros le estás dando más volumen.</p>
            {t.porRubro.length === 0 ? (
              <EmptyState>Cargá contactados para ver el desglose por rubro.</EmptyState>
            ) : (
              t.porRubro.map(([ru, n]) => (
                <div key={ru} className="mb-3.5">
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{ru}</span>
                    <span className="text-fg-muted tabular">{n}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg-elev-2">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(n / maxRubro) * 100}%` }} />
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      )}
      <Toast msg={toast} />
    </div>
  );
}

function Progress({
  label,
  pct,
  color,
  right,
}: {
  label: string;
  pct: number;
  color: string;
  right?: string;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="text-fg-muted">{label}</span>
        <span className="font-semibold">{right ?? `${pct}%`}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-bg-elev-2">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
