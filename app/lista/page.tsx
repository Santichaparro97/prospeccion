"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { PageHeader } from "@/components/PageHeader";
import { ConfigBanner } from "@/components/ConfigBanner";
import { Button, Card, EmptyState, Field, Spinner, Toast } from "@/components/ui";
import { RUBROS, type ListaItem } from "@/lib/types";
import {
  getLista,
  importarLista,
  marcarHablado,
  vaciarCarpeta,
} from "@/lib/db";
import { fmtFechaCorta } from "@/lib/format";

const PAGE = 25;

function pareceUrl(s: string): boolean {
  if (!s) return false;
  const v = s.trim();
  return (
    /^https?:\/\//i.test(v) ||
    v.startsWith("@") ||
    /\.(com|net|org|ar|io|me)(\/|$)/i.test(v) ||
    /instagram|tiktok|facebook|linkedin|wa\.me/i.test(v)
  );
}

function aHref(url: string): string {
  const v = url.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("@")) return `https://instagram.com/${v.slice(1)}`;
  return `https://${v}`;
}

export default function ListaPage() {
  const [items, setItems] = useState<ListaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [carpetaActiva, setCarpetaActiva] = useState<string | null>(null);

  // import
  const [parsed, setParsed] = useState<{ url: string; nombre: string | null }[]>([]);
  const [rubro, setRubro] = useState<string>(RUBROS[0]);
  const [modo, setModo] = useState<"nueva" | "existente">("nueva");
  const [nuevaCarpeta, setNuevaCarpeta] = useState("");
  const [carpetaDestino, setCarpetaDestino] = useState("");
  const [importando, setImportando] = useState(false);
  const [fileName, setFileName] = useState("");

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 1800);
  }

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await getLista());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // carpetas con conteo
  const carpetas = useMemo(() => {
    const m: Record<string, { total: number; hablados: number }> = {};
    for (const i of items) {
      (m[i.carpeta] ??= { total: 0, hablados: 0 }).total++;
      if (i.hablado) m[i.carpeta].hablados++;
    }
    return Object.entries(m)
      .map(([nombre, v]) => ({ nombre, ...v }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [items]);

  // mantener una carpeta activa válida
  useEffect(() => {
    if (carpetas.length === 0) {
      setCarpetaActiva(null);
    } else if (!carpetaActiva || !carpetas.some((c) => c.nombre === carpetaActiva)) {
      setCarpetaActiva(carpetas[0].nombre);
    }
  }, [carpetas, carpetaActiva]);

  // si no hay carpetas, forzamos modo "nueva"
  useEffect(() => {
    if (carpetas.length === 0 && modo === "existente") setModo("nueva");
    if (carpetas.length > 0 && !carpetaDestino) setCarpetaDestino(carpetas[0].nombre);
  }, [carpetas, modo, carpetaDestino]);

  function onFile(file: File) {
    setFileName(file.name);
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (res) => {
        const rows = res.data as unknown as string[][];
        const out: { url: string; nombre: string | null }[] = [];
        for (const row of rows) {
          if (!Array.isArray(row)) continue;
          const urlCell = row.find((c) => pareceUrl(c));
          if (!urlCell) continue;
          const nombre = row.find((c) => c && c !== urlCell)?.trim() || null;
          out.push({ url: urlCell.trim(), nombre });
        }
        setParsed(out);
        if (out.length === 0) flash("No encontré URLs en el archivo");
      },
      error: () => flash("No se pudo leer el archivo"),
    });
  }

  async function onImportar() {
    if (parsed.length === 0) return;
    const destino =
      modo === "nueva" ? nuevaCarpeta.trim() : carpetaDestino;
    if (!destino) return flash("Indicá un nombre de carpeta");
    setImportando(true);
    try {
      const n = await importarLista(parsed, rubro, destino);
      setParsed([]);
      setFileName("");
      setNuevaCarpeta("");
      await load();
      setCarpetaActiva(destino);
      setPage(0);
      flash(`${n} perfiles importados en "${destino}" ✓`);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error al importar");
    } finally {
      setImportando(false);
    }
  }

  async function onHablar(item: ListaItem) {
    if (item.hablado) return;
    setItems((prev) =>
      prev.map((x) =>
        x.id === item.id
          ? { ...x, hablado: true, fecha_hablado: new Date().toISOString() }
          : x
      )
    );
    try {
      await marcarHablado(item);
      flash("Marcado como hablado ✓ (+1 contactado)");
    } catch (e) {
      await load();
      flash(e instanceof Error ? e.message : "Error al marcar");
    }
  }

  async function onVaciar() {
    if (!carpetaActiva) return;
    if (!confirm(`¿Vaciar la carpeta "${carpetaActiva}"? (no borra tus estadísticas)`))
      return;
    try {
      await vaciarCarpeta(carpetaActiva);
      setPage(0);
      await load();
      flash("Carpeta vaciada");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error");
    }
  }

  const itemsCarpeta = useMemo(
    () => items.filter((i) => i.carpeta === carpetaActiva),
    [items, carpetaActiva]
  );
  const hablados = itemsCarpeta.filter((i) => i.hablado).length;
  const totalPaginas = Math.max(Math.ceil(itemsCarpeta.length / PAGE), 1);
  const pageItems = itemsCarpeta.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <div className="p-8">
      <PageHeader
        title="Lista"
        subtitle="Importá perfiles en carpetas y hablales de a 25. Cada click abre la URL y suma un contactado."
        actions={
          carpetaActiva ? (
            <Button variant="ghost" size="sm" onClick={onVaciar}>
              Vaciar “{carpetaActiva}”
            </Button>
          ) : undefined
        }
      />
      <ConfigBanner />

      {error && (
        <div className="mb-4 rounded-lg border border-red/40 bg-red/10 px-4 py-3 text-sm text-red">
          {error}
        </div>
      )}

      {/* Importar */}
      <Card className="mb-5 p-5">
        <h3 className="text-sm font-semibold">Importar lista (CSV de Google Sheets)</h3>
        <p className="mb-4 mt-0.5 text-xs text-fg-dim">
          En Sheets: Archivo → Descargar → CSV. Detecto la columna de URLs automáticamente.
        </p>

        {/* destino: carpeta nueva o existente */}
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <span className="mb-1.5 block text-xs font-medium text-fg-muted">Destino</span>
            <div className="flex overflow-hidden rounded-lg border border-border-soft">
              <button
                onClick={() => setModo("nueva")}
                className={`px-3 py-2 text-sm ${
                  modo === "nueva" ? "bg-accent text-white" : "text-fg-muted hover:bg-bg-elev-2"
                }`}
              >
                Carpeta nueva
              </button>
              <button
                onClick={() => carpetas.length && setModo("existente")}
                disabled={carpetas.length === 0}
                className={`px-3 py-2 text-sm disabled:opacity-40 ${
                  modo === "existente" ? "bg-accent text-white" : "text-fg-muted hover:bg-bg-elev-2"
                }`}
              >
                Carpeta existente
              </button>
            </div>
          </div>

          {modo === "nueva" ? (
            <Field label="Nombre de la carpeta" className="min-w-48 flex-1">
              <input
                className="w-full"
                value={nuevaCarpeta}
                onChange={(e) => setNuevaCarpeta(e.target.value)}
                placeholder="Ej: Gastronomía Palermo"
              />
            </Field>
          ) : (
            <Field label="Agregar a la carpeta" className="min-w-48 flex-1">
              <select className="w-full" value={carpetaDestino} onChange={(e) => setCarpetaDestino(e.target.value)}>
                {carpetas.map((c) => (
                  <option key={c.nombre}>{c.nombre}</option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Rubro de esta lista" className="w-44">
            <select className="w-full" value={rubro} onChange={(e) => setRubro(e.target.value)}>
              {RUBROS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <Field label="Archivo CSV" className="flex-1">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
            />
          </Field>
          <Button onClick={onImportar} disabled={importando || parsed.length === 0}>
            {importando ? "Importando…" : `Importar ${parsed.length || ""} perfiles`}
          </Button>
        </div>
        {fileName && parsed.length > 0 && (
          <p className="mt-3 text-xs text-fg-muted">
            <strong className="text-fg">{parsed.length}</strong> URLs detectadas en {fileName}. Irán a la carpeta{" "}
            <strong className="text-fg">
              {modo === "nueva" ? nuevaCarpeta || "(sin nombre)" : carpetaDestino}
            </strong>{" "}
            con rubro <strong className="text-fg">{rubro}</strong>.
          </p>
        )}
      </Card>

      {/* Pestañas de carpetas */}
      {carpetas.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 border-b border-border pb-3">
          {carpetas.map((c) => {
            const active = c.nombre === carpetaActiva;
            return (
              <button
                key={c.nombre}
                onClick={() => {
                  setCarpetaActiva(c.nombre);
                  setPage(0);
                }}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-accent-soft font-medium text-fg"
                    : "text-fg-muted hover:bg-bg-elev-2 hover:text-fg"
                }`}
              >
                {c.nombre}{" "}
                <span className={active ? "text-fg-muted" : "text-fg-dim"}>
                  ({c.hablados}/{c.total})
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Lista de la carpeta activa */}
      {loading ? (
        <Spinner />
      ) : carpetas.length === 0 ? (
        <Card>
          <EmptyState>
            Todavía no importaste ninguna lista. Subí un CSV arriba y creá tu primera carpeta.
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-fg-muted">
              <strong className="text-fg">{hablados}</strong> de{" "}
              <strong className="text-fg">{itemsCarpeta.length}</strong> hablados en “{carpetaActiva}”
            </span>
            <span className="text-fg-muted">
              Bloque {page + 1} de {totalPaginas}
            </span>
          </div>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-bg-elev-2">
            <div
              className="h-full rounded-full bg-green transition-all"
              style={{ width: `${itemsCarpeta.length ? (hablados / itemsCarpeta.length) * 100 : 0}%` }}
            />
          </div>

          <Card className="divide-y divide-border overflow-hidden">
            {pageItems.map((item, i) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  item.hablado ? "bg-green/5" : "hover:bg-bg-elev-2"
                }`}
              >
                <span className="w-7 shrink-0 text-right text-xs text-fg-dim tabular">
                  {page * PAGE + i + 1}
                </span>
                <a
                  href={aHref(item.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onHablar(item)}
                  className={`flex-1 truncate text-sm ${
                    item.hablado ? "text-fg-dim line-through" : "text-accent hover:underline"
                  }`}
                  title={item.url}
                >
                  {item.nombre ? (
                    <>
                      <span className={item.hablado ? "" : "text-fg"}>{item.nombre}</span>{" "}
                      <span className="text-fg-dim">· {item.url}</span>
                    </>
                  ) : (
                    item.url
                  )}
                </a>
                {item.hablado ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-green">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-green/20">✓</span>
                    {item.fecha_hablado && fmtFechaCorta(item.fecha_hablado.slice(0, 10))}
                  </span>
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-md border border-border-soft text-transparent">
                    ✓
                  </span>
                )}
              </div>
            ))}
          </Card>

          <div className="mt-4 flex items-center justify-between">
            <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(p - 1, 0))}>
              ← Anterior
            </Button>
            <span className="text-xs text-fg-dim">
              Perfiles {itemsCarpeta.length ? page * PAGE + 1 : 0}–{Math.min((page + 1) * PAGE, itemsCarpeta.length)} de{" "}
              {itemsCarpeta.length}
            </span>
            <Button size="sm" disabled={page + 1 >= totalPaginas} onClick={() => setPage((p) => Math.min(p + 1, totalPaginas - 1))}>
              Siguiente 25 →
            </Button>
          </div>
        </>
      )}
      <Toast msg={toast} />
    </div>
  );
}
