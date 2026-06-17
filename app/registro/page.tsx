"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ConfigBanner } from "@/components/ConfigBanner";
import { Card, EmptyState, Spinner } from "@/components/ui";
import type { Cierre, Contactado, DiaRegistro } from "@/lib/types";
import { getCierres, getContactados, registroDiario } from "@/lib/db";
import { fmtFechaCorta } from "@/lib/format";

export default function RegistroPage() {
  const [dias, setDias] = useState<DiaRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [c, k]: [Contactado[], Cierre[]] = await Promise.all([
        getContactados(),
        getCierres(),
      ]);
      setDias(registroDiario(c, k));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-8">
      <PageHeader
        title="Registro diario"
        subtitle="Lo que cargaste cada día. Se va acumulando."
      />
      <ConfigBanner />

      {error && (
        <div className="mb-4 rounded-lg border border-red/40 bg-red/10 px-4 py-3 text-sm text-red">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <Spinner />
        ) : dias.length === 0 ? (
          <EmptyState>Todavía no cargaste ningún día.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                <th className="px-4 py-2.5 font-medium">Fecha</th>
                <th className="px-4 py-2.5 font-medium">Contactados</th>
                <th className="px-4 py-2.5 font-medium">Resp M1</th>
                <th className="px-4 py-2.5 font-medium">Resp M2</th>
                <th className="px-4 py-2.5 font-medium">Resp M3</th>
                <th className="px-4 py-2.5 font-medium">Ventas</th>
                <th className="px-4 py-2.5 font-medium">Tasa resp.</th>
              </tr>
            </thead>
            <tbody>
              {dias.map((d) => {
                const resp = d.r1 + d.r2 + d.r3;
                return (
                  <tr key={d.fecha} className="border-b border-border/60 last:border-0 hover:bg-bg-elev-2">
                    <td className="px-4 py-3">{fmtFechaCorta(d.fecha)}</td>
                    <td className="px-4 py-3 tabular">{d.cont}</td>
                    <td className="px-4 py-3 tabular">{d.r1}</td>
                    <td className="px-4 py-3 tabular">{d.r2}</td>
                    <td className="px-4 py-3 tabular">{d.r3}</td>
                    <td className="px-4 py-3 tabular text-green">{d.ventas}</td>
                    <td className="px-4 py-3 tabular text-fg-muted">
                      {d.cont ? Math.round((resp / d.cont) * 1000) / 10 : 0}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
