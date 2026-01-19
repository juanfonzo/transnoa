"use client";

import { useState } from "react";
import { demoRoles, roleLabels, type DemoRole } from "@/lib/roles";

const flowSteps = [
  "Jefe carga la solicitud con cuadrilla y conceptos diarios.",
  "Administracion valida, estandariza y asigna lote/fecha.",
  "Jefe firma y la solicitud queda lista para tesoreria.",
  "Tesoreria registra el pago y deja trazabilidad.",
];

const roleHighlights: Record<DemoRole, string[]> = {
  JEFE_AREA: [
    "Crear solicitudes y cargar cuadrillas.",
    "Revisar versiones y firmar.",
    "Monitorear estados del flujo.",
  ],
  COLABORADOR: [
    "Ver saldo y movimientos personales.",
    "Consultar pagos por periodo.",
    "Recibir ajustes retroactivos.",
  ],
  ADMIN: [
    "Validar solicitudes y estandarizar datos.",
    "Asignar lote y fecha de pago.",
    "Actualizar viatico diario.",
  ],
  TESORERIA: [
    "Registrar pagos y comprobantes.",
    "Solicitar correcciones a administracion.",
    "Exportar reportes de pagos.",
  ],
};

type FlowCardProps = {
  initialRole: DemoRole;
};

export function FlowCard({ initialRole }: FlowCardProps) {
  const [role, setRole] = useState<DemoRole>(initialRole);

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
            Que puede hacer cada rol
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {demoRoles.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRole(option)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
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
