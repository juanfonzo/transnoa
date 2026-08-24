import Link from "next/link";
import { RoleAccessNotice } from "@/components/RoleAccessNotice";
import { getDemoRole } from "@/lib/demo-auth";

export default async function ReportesPage() {
  const role = await getDemoRole();
  if (role !== "TESORERIA" && role !== "ADMIN") {
    return (
      <RoleAccessNotice
        currentRole={role}
        allowedRoles={["ADMIN", "TESORERIA"]}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Control y conciliación
          </p>
          <h2 className="text-3xl font-semibold text-slate-900">Reportes</h2>
          <p className="mt-1 text-sm text-slate-600">
            Exportaciones operativas con datos de solicitudes, pagos y rendiciones.
          </p>
        </div>
        <Link
          href={role === "TESORERIA" ? "/tesoreria" : "/administracion"}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700"
        >
          {role === "TESORERIA" ? "Volver a Tesorería" : "Volver a Administración"}
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Solicitudes
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Resumen general con área, fechas, lote y estado actual.
          </p>
          <a
            href="/reportes/export/solicitudes"
            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600"
          >
            Descargar Excel
          </a>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Pagos</h3>
          <p className="mt-2 text-sm text-slate-600">
            Pagos registrados por lote, fecha y responsable de Tesorería.
          </p>
          <a
            href="/reportes/export/pagos"
            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600"
          >
            Descargar Excel
          </a>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Viáticos pagados
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Detalle por colaborador con lote, importe y rendición asociada.
          </p>
          <a
            href="/reportes/export/viaticos-pagados"
            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600"
          >
            Descargar Excel
          </a>
        </div>
      </section>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
        Los archivos conservan número de solicitud, lote y responsables para
        facilitar el control cruzado y la conciliación.
      </div>
    </div>
  );
}

