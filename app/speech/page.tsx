"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ConfigBanner } from "@/components/ConfigBanner";
import { Button, Card, EmptyState, Field, Spinner, Toast } from "@/components/ui";
import type { Speech } from "@/lib/types";
import { agregarSpeech, borrarSpeech, getSpeeches } from "@/lib/db";

export default function SpeechPage() {
  const [speeches, setSpeeches] = useState<Speech[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [copiadoId, setCopiadoId] = useState<number | null>(null);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 1800);
  }

  const load = useCallback(async () => {
    setError(null);
    try {
      setSpeeches(await getSpeeches());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onGuardar() {
    if (!texto.trim()) return flash("Escribí el mensaje");
    setBusy(true);
    try {
      await agregarSpeech({ titulo: titulo.trim() || null, texto: texto.trim() });
      setTitulo("");
      setTexto("");
      await load();
      flash("Mensaje guardado ✓");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  async function onCopiar(s: Speech) {
    try {
      await navigator.clipboard.writeText(s.texto);
      setCopiadoId(s.id);
      setTimeout(() => setCopiadoId((c) => (c === s.id ? null : c)), 1500);
    } catch {
      flash("No se pudo copiar");
    }
  }

  async function onBorrar(s: Speech) {
    if (!confirm("¿Borrar este mensaje?")) return;
    setBusy(true);
    try {
      await borrarSpeech(s.id);
      await load();
      flash("Mensaje borrado");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Speech"
        subtitle="Guardá tus mensajes de prospección y copialos con un click."
      />
      <ConfigBanner />

      {error && (
        <div className="mb-4 rounded-lg border border-red/40 bg-red/10 px-4 py-3 text-sm text-red">
          {error}
        </div>
      )}

      {/* Agregar */}
      <Card className="mb-5 p-5">
        <h3 className="text-sm font-semibold">Agregar mensaje</h3>
        <p className="mb-4 mt-0.5 text-xs text-fg-dim">
          Guardá el mensaje completo. Después lo copiás y pegás directo.
        </p>
        <div className="space-y-3">
          <Field label="Título (opcional)">
            <input
              className="w-full"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Primer mensaje · Gastronomía"
            />
          </Field>
          <Field label="Mensaje">
            <textarea
              className="w-full"
              rows={5}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Hola! Vi tu perfil y…"
            />
          </Field>
          <div>
            <Button onClick={onGuardar} disabled={busy}>
              + Guardar mensaje
            </Button>
          </div>
        </div>
      </Card>

      {/* Lista */}
      {loading ? (
        <Spinner />
      ) : speeches.length === 0 ? (
        <Card>
          <EmptyState>Todavía no guardaste ningún mensaje. Agregá uno arriba.</EmptyState>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-fg-muted">
            <strong className="text-fg">{speeches.length}</strong> mensaje
            {speeches.length !== 1 && "s"} guardado{speeches.length !== 1 && "s"}.
          </div>
          {speeches.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {s.titulo && (
                    <div className="mb-1 text-sm font-semibold">{s.titulo}</div>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant={copiadoId === s.id ? "green" : "primary"}
                    onClick={() => onCopiar(s)}
                  >
                    {copiadoId === s.id ? "✓ Copiado" : "Copiar"}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => onBorrar(s)}>
                    Borrar
                  </Button>
                </div>
              </div>
              <pre className="whitespace-pre-wrap break-words font-sans text-sm text-fg-muted">
                {s.texto}
              </pre>
            </Card>
          ))}
        </div>
      )}
      <Toast msg={toast} />
    </div>
  );
}
