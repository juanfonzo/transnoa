import Link from "next/link";
import { getDemoRole } from "@/lib/demo-auth";
import { roleLabels, DemoRole } from "@/lib/roles";
import { FlowCard } from "@/components/FlowCard";
import { roleValueProposition } from "@/lib/demo-experience";

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
      description: "Crear solicitudes, cargar la cuadrilla y enviarlas a Administración.",
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
      description: "Controlar estados, versiones y próximas acciones.",
      href: "/solicitudes",
      tone: "slate",
    },
  ],
  COLABORADOR: [
    {
      title: "Cuenta corriente",
      description: "Consultar el saldo y los movimientos de viáticos personales.",
      href: "/colaboradores",
      tone: "emerald",
    },
    {
      title: "Historial",
      description: "Revisar pagos, ajustes y detalle por período.",
      href: "/colaboradores",
      tone: "slate",
    },
  ],
  ADMIN: [
    {
      title: "Bandeja",
      description: "Validar, estandarizar y asignar lote y fecha.",
      href: "/administracion",
      tone: "sky",
    },
    {
      title: "Correcciones",
      description: "Resolver devoluciones y preparar una nueva versión para firma.",
      href: "/administracion",
      tone: "amber",
    },
    {
      title: "Viático diario",
      description: "Gestionar valores y ajustes retroactivos con trazabilidad.",
      href: "/administracion?tab=viaticos",
      tone: "emerald",
    },
  ],
  TESORERIA: [
    {
      title: "Bandeja de pagos",
      description: "Registrar pagos o devolver solicitudes con observaciones.",
      href: "/tesoreria",
      tone: "emerald",
    },
    {
      title: "Reportes operativos",
      description: "Exportar solicitudes y pagos para control y conciliación.",
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
              Demo interactiva
            </p>
            <h2 className="text-3xl font-semibold text-slate-900">
              Panel principal
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-600">
              {roleValueProposition[role]} Cambiá el rol para recorrer el circuito
              completo desde la perspectiva de cada perfil.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
                Trazabilidad completa
              </span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                Control por rol
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
              Experiencia enfocada en sus tareas.
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
              Módulo clave
            </span>
            <h3 className="mt-3 text-lg font-semibold text-slate-900">
              {module.title}
            </h3>
            <p className="mt-2 text-sm text-slate-600">{module.description}</p>
            <Link
              href={module.href}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition group-hover:border-slate-300 group-hover:text-slate-900"
            >
              Ver módulo
            </Link>
          </article>
        ))}
      </section>

    </div>
  );
}

