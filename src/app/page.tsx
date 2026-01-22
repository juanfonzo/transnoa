import Link from "next/link";
import { getDemoRole } from "@/lib/demo-auth";
import { roleLabels, DemoRole } from "@/lib/roles";
import { FlowCard } from "@/components/FlowCard";

type ModuleCard = {
  title: string;
  description: string;
  href: string;
  tone: "slate" | "amber" | "emerald" | "sky";
};

const modulesByRole: Record<DemoRole, ModuleCard[]> = {
  JEFE_AREA: [
    {
      title: "Solicitudes",
      description: "Crear borradores, cargar cuadrilla y enviar a administracion.",
      href: "/solicitudes",
      tone: "sky",
    },
    {
      title: "Firma interna",
      description: "Previsualizar y firmar solicitudes listas para pago.",
      href: "/solicitudes",
      tone: "amber",
    },
    {
      title: "Seguimiento",
      description: "Estados, historico y exportaciones basicas.",
      href: "/solicitudes",
      tone: "slate",
    },
  ],
  COLABORADOR: [
    {
      title: "Cuenta corriente",
      description: "Saldo y movimientos de viaticos personales.",
      href: "/colaboradores",
      tone: "emerald",
    },
    {
      title: "Historial",
      description: "Pagos, ajustes y detalle por periodo.",
      href: "/colaboradores",
      tone: "slate",
    },
  ],
  ADMIN: [
    {
      title: "Bandeja",
      description: "Validar, estandarizar y asignar lote/fecha.",
      href: "/administracion",
      tone: "sky",
    },
    {
      title: "Pagos y correcciones",
      description: "Registrar pagos, ajustar lote y validar cierres.",
      href: "/administracion?tab=pagos",
      tone: "amber",
    },
    {
      title: "Viatico diario",
      description: "Cambios de monto y ajustes retroactivos.",
      href: "/administracion?tab=viaticos",
      tone: "emerald",
    },
  ],
  TESORERIA: [
    {
      title: "Tesoreria",
      description: "Descargar reportes de pagos y viaticos.",
      href: "/reportes",
      tone: "slate",
    },
  ],
};

export default async function Home() {
  const role = await getDemoRole();
  const modules = modulesByRole[role];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Demo operativo
            </p>
            <h2 className="text-3xl font-semibold text-slate-900">
              Panel principal
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-600">
              Recorre el flujo completo de viaticos con datos reales en Neon.
              Cambia el rol para mostrar la experiencia de cada perfil.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
                Trazabilidad completa
              </span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                Persistencia real
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Rol activo
            </p>
            <p className="text-base font-semibold text-slate-900">
              {roleLabels[role]}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Modulos filtrados para la presentacion.
            </p>
          </div>
        </div>
      </section>

      <FlowCard initialRole={role} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => (
          <article
            key={module.title}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span
              className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                module.tone === "emerald"
                  ? "bg-emerald-100 text-emerald-700"
                  : module.tone === "amber"
                    ? "bg-amber-100 text-amber-700"
                    : module.tone === "sky"
                      ? "bg-sky-100 text-sky-700"
                      : "bg-slate-100 text-slate-600"
              }`}
            >
              Modulo clave
            </span>
            <h3 className="mt-3 text-lg font-semibold text-slate-900">
              {module.title}
            </h3>
            <p className="mt-2 text-sm text-slate-600">{module.description}</p>
            <Link
              href={module.href}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition group-hover:border-slate-300 group-hover:text-slate-900"
            >
              Ver modulo
            </Link>
          </article>
        ))}
      </section>

    </div>
  );
}

