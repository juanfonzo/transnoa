export default function ReportesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-semibold text-slate-900">Reportes</h2>
        <p className="mt-1 text-sm text-slate-600">
          Exportaciones rapidas para compartir resultados del demo.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Solicitudes
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Resumen general con area, fechas, lote y estado.
          </p>
          <a
            href="/reportes/export/solicitudes"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600"
          >
            Descargar CSV
          </a>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Pagos</h3>
          <p className="mt-2 text-sm text-slate-600">
            Pagos registrados por lote y responsable de tesoreria.
          </p>
          <a
            href="/reportes/export/pagos"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600"
          >
            Descargar CSV
          </a>
        </div>
      </section>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Estos reportes son un punto de partida. Podemos sumar filtros por lote,
        periodo o responsable cuando lo necesites.
      </div>
    </div>
  );
}

