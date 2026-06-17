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
  vaciarLista,
} from "@/lib/db";
import { fmtFechaCorta } from "@/lib/format";

const PAGE = 25;

/** Una celda parece URL/perfil */
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

/** Normaliza a un href clickeable */
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

  // import
  const [parsed, setParsed] = useState<{ url: string; nombre: string | null }[]>([]);
  const [rubro, setRubro] = useState<string>(RUBROS[0]);
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
          if (!urlCell) continue; // saltea encabezado o filas sin url
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
    setImportando(true);
    try {
      const n = await importarLista(parsed, rubro);
      setParsed([]);
      setFileName("");
      await load();
      flash(`${n} perfiles importados ✓`);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error al importar");
    } finally {
      setImportando(false);
    }
  }

  async function onHablar(item: ListaItem) {
    if (item.hablado) return;
    // optimista
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
      await load(); // revierte si falló
      flash(e instanceof Error ? e.message : "Error al marcar");
    }
  }

  async function onVaciar() {
    if (!confirm("¿Vaciar toda la lista? (no borra tus estadísticas)")) return;
    try {
      await vaciarLista();
      setPage(0);
      await load();
      flash("Lista vaciada");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error");
    }
  }

  const hablados = useMemo(() => items.filter((i) => i.hablado).length, [items]);
  const totalPaginas = Math.max(Math.ceil(items.length / PAGE), 1);
  const pageItems = items.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <div className="p-8">
      <PageHeader
        title="Lista"
        subtitle="Importá perfiles y hablales de a 25. Cada click abre la URL y lo marca como contactado."
        actions={
          items.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={onVaciar}>
              Vaciar lista
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
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Archivo CSV" className="flex-1">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
            />
          </Field>
          <Field label="Rubro de esta lista" className="w-44">
            <select className="w-full" value={rubro} onChange={(e) => setRubro(e.target.value)}>
              {RUBROS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Button onClick={onImportar} disabled={importando || parsed.length === 0}>
            {importando ? "Importando…" : `Importar ${parsed.length || ""} perfiles`}
          </Button>
        </div>
        {fileName && parsed.length > 0 && (
          <p className="mt-3 text-xs text-fg-muted">
            <strong className="text-fg">{parsed.length}</strong> URLs detectadas en{" "}
            {fileName}. Se cargarán con rubro <strong className="text-fg">{rubro}</strong>.
          </p>
        )}
      </Card>

      {/* Lista */}
      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState>Todavía no importaste ninguna lista. Subí un CSV arriba.</EmptyState>
        </Card>
      ) : (
        <>
          {/* Progreso */}
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-fg-muted">
              <strong className="text-fg">{hablados}</strong> de{" "}
              <strong className="text-fg">{items.length}</strong> hablados
            </span>
            <span className="text-fg-muted">
              Bloque {page + 1} de {totalPaginas}
            </span>
          </div>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-bg-elev-2">
            <div
              className="h-full rounded-full bg-green transition-all"
              style={{ width: `${(hablados / items.length) * 100}%` }}
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
                    item.hablado
                      ? "text-fg-dim line-through"
                      : "text-accent hover:underline"
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
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-green/20">
                      ✓
                    </span>
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

          {/* Paginación */}
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
            >
              ← Anterior
            </Button>
            <span className="text-xs text-fg-dim">
              Perfiles {page * PAGE + 1}–{Math.min((page + 1) * PAGE, items.length)} de{" "}
              {items.length}
            </span>
            <Button
              size="sm"
              disabled={page + 1 >= totalPaginas}
              onClick={() => setPage((p) => Math.min(p + 1, totalPaginas - 1))}
            >
              Siguiente 25 →
            </Button>
          </div>
        </>
      )}
      <Toast msg={toast} />
    </div>
  );
}
