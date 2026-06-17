"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ConfigBanner } from "@/components/ConfigBanner";
import { Button, Card, EmptyState, Field, Spinner, Toast } from "@/components/ui";
import { RUBROS, type Perfil } from "@/lib/types";
import { agregarPerfil, getPerfiles, quitarPerfil, tocarPerfil } from "@/lib/db";
import { diasDesde, haceNDias } from "@/lib/format";

export default function SeguimientosPage() {
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [handle, setHandle] = useState("");
  const [nombre, setNombre] = useState("");
  const [rubro, setRubro] = useState<string>(RUBROS[0]);
  const [dias, setDias] = useState("0");

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 1800);
  }

  const load = useCallback(async () => {
    setError(null);
    try {
      setPerfiles(await getPerfiles());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onAgregar() {
    if (!handle.trim()) return flash("Ingresá el perfil / usuario");
    setBusy(true);
    try {
      await agregarPerfil({
        handle: handle.trim(),
        nombre: nombre.trim() || null,
        rubro,
        ultimo_contacto: haceNDias(Math.max(parseInt(dias) || 0, 0)),
      });
      setHandle("");
      setNombre("");
      setDias("0");
      await load();
      flash("Perfil agregado ✓");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  async function run(fn: () => Promise<void>, msg: string) {
    setBusy(true);
    try {
      await fn();
      await load();
      flash(msg);
    } finally {
      setBusy(false);
    }
  }

  const ordenados = [...perfiles]
    .map((p) => ({ ...p, dias: diasDesde(p.ultimo_contacto) }))
    .sort((a, b) => b.dias - a.dias);

  return (
    <div className="p-8">
      <PageHeader
        title="Seguimientos"
        subtitle="Perfiles puntuales que querés seguir de cerca."
      />
      <ConfigBanner />

      {error && (
        <div className="mb-4 rounded-lg border border-red/40 bg-red/10 px-4 py-3 text-sm text-red">
          {error}
        </div>
      )}

      <Card className="mb-5 p-5">
        <h3 className="text-sm font-semibold">＋ Agregar perfil a seguimiento</h3>
        <p className="mb-4 mt-0.5 text-xs text-fg-dim">
          Sumá un perfil que querés seguir. Indicá hace cuántos días le escribiste.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Perfil / usuario" className="min-w-40 flex-1">
            <input className="w-full" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@usuario" />
          </Field>
          <Field label="Nombre (opcional)" className="min-w-40 flex-1">
            <input className="w-full" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Negocio o persona" />
          </Field>
          <Field label="Rubro" className="w-36">
            <select className="w-full" value={rubro} onChange={(e) => setRubro(e.target.value)}>
              {RUBROS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field label="Último contacto hace (días)" className="w-44">
            <input type="number" min={0} className="w-full" value={dias} onChange={(e) => setDias(e.target.value)} />
          </Field>
          <Button onClick={onAgregar} disabled={busy}>
            + Agregar
          </Button>
        </div>
      </Card>

      {loading ? (
        <Spinner />
      ) : ordenados.length === 0 ? (
        <Card>
          <EmptyState>Sin perfiles en seguimiento. Agregá uno arriba.</EmptyState>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="mb-1 text-sm text-fg-muted">
            <strong className="text-fg">{ordenados.length}</strong> perfil
            {ordenados.length !== 1 && "es"} en seguimiento.
          </div>
          {ordenados.map((p) => (
            <Card key={p.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-44 flex-1">
                <div className="font-medium">{p.nombre || p.handle}</div>
                <div className="text-xs text-fg-dim">
                  {p.handle} · {p.rubro ?? "—"}
                </div>
              </div>
              <span className="text-xs font-medium text-pink-400">Instagram</span>
              <div className="text-xs text-fg-muted">
                Último contacto hace {p.dias} día{p.dias !== 1 && "s"}
              </div>
              {p.dias >= 3 && (
                <span className="rounded-md border border-amber/30 bg-amber/10 px-2 py-0.5 text-xs font-medium text-amber">
                  Toca seguir
                </span>
              )}
              <div className="ml-auto flex gap-2">
                <Button size="sm" disabled={busy} onClick={() => run(() => tocarPerfil(p.id), "Marcado: contactado hoy")}>
                  Contacté hoy
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => quitarPerfil(p.id), "Perfil quitado")}>
                  Quitar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Toast msg={toast} />
    </div>
  );
}
