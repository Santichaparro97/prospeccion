"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { PageHeader } from "@/components/PageHeader";
import { ConfigBanner } from "@/components/ConfigBanner";
import { Button, Card, EmptyState, Field, Spinner, Toast } from "@/components/ui";
import { RUBROS, estadoLista, type ListaItem } from "@/lib/types";
import {
  eliminarCarpeta,
  getLista,
  importarLista,
  marcarHablado,
  marcarNoContacto,
  resetItem,
} from "@/lib/db";
import { fmtFechaCorta, isoAFechaAR } from "@/lib/format";

const PAGE = 24;

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

  useEffect(() => {
    if (carpetas.length === 0) {
      setCarpetaActiva(null);
    } else if (!carpetaActiva || !carpetas.some((c) => c.nombre === carpetaActiva)) {
      setCarpetaActiva(carpetas[0].nombre);
    }
  }, [carpetas, carpetaActiva]);

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
    const destino = modo === "nueva" ? nuevaCarpeta.trim() : carpetaDestino;
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

  // patch local optimista
  function patch(id: number, p: Partial<ListaItem>) {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)));
  }

  async function onHablar(item: ListaItem) {
    if (item.hablado) return;
    patch(item.id, { hablado: true, fecha_hablado: new Date().toISOString() });
    try {
      await marcarHablado(item);
    } catch (e) {
      await load();
      flash(e instanceof Error ? e.message : "Error al marcar");
    }
  }

  async function onX(item: ListaItem) {
    if (estadoLista(item) === "cancelado") {
      // deshacer -> pendiente
      patch(item.id, { hablado: false, fecha_hablado: null });
      try {
        await resetItem(item);
        flash("Vuelto a pendiente");
      } catch (e) {
        await load();
        flash(e instanceof Error ? e.message : "Error");
      }
    } else {
      // cancelar: pasa a "no contacto" y deja de contar
      patch(item.id, { hablado: false, fecha_hablado: new Date().toISOString() });
      try {
        await marcarNoContacto(item);
        flash("Cancelado · no contacto");
      } catch (e) {
        await load();
        flash(e instanceof Error ? e.message : "Error");
      }
    }
  }

  async function onEliminar() {
    if (!carpetaActiva) return;
    if (!confirm(`¿Eliminar la carpeta "${carpetaActiva}" y todos sus perfiles? (no borra estadísticas ya generadas)`))
      return;
    try {
      await eliminarCarpeta(carpetaActiva);
      setPage(0);
      await load();
      flash("Carpeta eliminada");
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
  const colIzq = pageItems.slice(0, 12);
  const colDer = pageItems.slice(12, 24);

  function renderItem(item: ListaItem, absIndex: number) {
    const estado = estadoLista(item);
    return (
      <div
        key={item.id}
        className={`flex items-center gap-3 px-4 py-3 ${
          estado === "contactado"
            ? "bg-green/5"
            : estado === "cancelado"
              ? "bg-red/5"
              : "hover:bg-bg-elev-2"
        }`}
      >
        <span className="w-6 shrink-0 text-right text-xs text-fg-dim tabular">{absIndex}</span>
        <a
          href={aHref(item.url)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onHablar(item)}
          className={`min-w-0 flex-1 truncate text-sm ${
            estado === "cancelado"
              ? "text-fg-dim line-through"
              : estado === "contactado"
                ? "text-fg-dim"
                : "text-accent hover:underline"
          }`}
          title={item.url}
        >
          {item.nombre ? (
            <>
              <span className={estado === "pendiente" ? "text-fg" : ""}>{item.nombre}</span>{" "}
              <span className="text-fg-dim">· {item.url}</span>
            </>
          ) : (
            item.url
          )}
        </a>

        {/* estado: ✓ contactado / outline pendiente / "No contacto" si cancelado */}
        {estado === "cancelado" ? (
          <span className="text-xs font-medium text-red/80">No contacto</span>
        ) : estado === "contactado" ? (
          <span className="flex items-center gap-1 text-xs font-medium text-green">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-green/20">✓</span>
            {item.fecha_hablado && fmtFechaCorta(isoAFechaAR(item.fecha_hablado))}
          </span>
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-md border border-border-soft text-transparent">
            ✓
          </span>
        )}

        {/* X: cancelar / deshacer */}
        <button
          onClick={() => onX(item)}
          title={estado === "cancelado" ? "Deshacer (volver a pendiente)" : "Cancelar / no contacto"}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-xs transition-colors ${
            estado === "cancelado"
              ? "bg-red/20 text-red"
              : "border border-border-soft text-fg-dim hover:border-red/50 hover:text-red"
          }`}
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Lista"
        subtitle="Importá perfiles en carpetas y hablales de a 24. Abrir el link marca contactado; la ✕ lo pasa a no contacto."
        actions={
          carpetaActiva ? (
            <Button variant="danger" size="sm" onClick={onEliminar}>
              Eliminar “{carpetaActiva}”
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
            <strong className="text-fg">{modo === "nueva" ? nuevaCarpeta || "(sin nombre)" : carpetaDestino}</strong> con rubro{" "}
            <strong className="text-fg">{rubro}</strong>.
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
                  active ? "bg-accent-soft font-medium text-fg" : "text-fg-muted hover:bg-bg-elev-2 hover:text-fg"
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

      {loading ? (
        <Spinner />
      ) : carpetas.length === 0 ? (
        <Card>
          <EmptyState>Todavía no importaste ninguna lista. Subí un CSV arriba y creá tu primera carpeta.</EmptyState>
        </Card>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-fg-muted">
              <strong className="text-fg">{hablados}</strong> de <strong className="text-fg">{itemsCarpeta.length}</strong>{" "}
              hablados en “{carpetaActiva}”
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

          {/* 12 + 12 en PC, apilado en celular */}
          <Card className="overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="divide-y divide-border">
                {colIzq.map((it, i) => renderItem(it, page * PAGE + i + 1))}
              </div>
              <div className="divide-y divide-border md:border-l md:border-border">
                {colDer.map((it, i) => renderItem(it, page * PAGE + 12 + i + 1))}
              </div>
            </div>
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
              Siguiente 24 →
            </Button>
          </div>
        </>
      )}
      <Toast msg={toast} />
    </div>
  );
}
