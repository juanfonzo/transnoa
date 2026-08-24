"use client";

import { useEffect, useState } from "react";
import { demoRoles, roleLabels, type DemoRole } from "@/lib/roles";

const flowSteps = [
  "Jefe de Área carga la solicitud con cuadrilla y conceptos diarios.",
  "Administración valida, estandariza y asigna lote y fecha.",
  "Jefe firma y la solicitud queda lista para pago.",
  "Tesorería registra el pago o solicita una corrección.",
];

const roleHighlights: Record<DemoRole, string[]> = {
  JEFE_AREA: [
    "Crear solicitudes y cargar cuadrillas.",
    "Revisar versiones y firmar.",
    "Monitorear los estados del flujo.",
  ],
  COLABORADOR: [
    "Ver saldo y movimientos personales.",
    "Consultar pagos por período.",
    "Recibir ajustes retroactivos.",
  ],
  ADMIN: [
    "Validar solicitudes y estandarizar datos.",
    "Asignar lote y fecha de pago.",
    "Resolver devoluciones de Tesorería.",
  ],
  TESORERIA: [
    "Registrar y actualizar pagos.",
    "Solicitar correcciones a Administración.",
    "Descargar reportes operativos.",
  ],
};

type FlowCardProps = {
  initialRole: DemoRole;
};

export function FlowCard({ initialRole }: FlowCardProps) {
  const [role, setRole] = useState<DemoRole>(initialRole);

  useEffect(() => {
    setRole(initialRole);
  }, [initialRole]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex-1">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Flujo principal
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {flowSteps.map((step) => (
              <li key={step} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm lg:w-80">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Qué puede hacer cada rol
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {demoRoles.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRole(option)}
                className={`min-h-10 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
                  role === option
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
                aria-pressed={role === option}
              >
                {roleLabels[option]}
              </button>
            ))}
          </div>
          <ul className="mt-3 space-y-2 text-xs text-slate-600">
            {roleHighlights[role].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
