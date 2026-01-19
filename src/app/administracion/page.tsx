import type { RequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";
import { getRequestStatusLabel, getStatusTone, getToneClasses } from "@/lib/status";
import { AdminActions } from "@/app/administracion/AdminActions";
import { AdminRateModal } from "@/app/administracion/AdminRateModal";
import { StatusPill } from "@/components/StatusPill";

const adminQueues = [
  {
    status: "SUBMITTED_TO_ADMIN",
    title: "Ingresos nuevos",
    description: "Solicitudes enviadas por jefes para validar.",
  },
  {
    status: "ADMIN_REVIEW",
    title: "En revision",
    description: "Administracion esta estandarizando datos.",
  },
  {
    status: "PENDING_SIGNATURE",
    title: "Pendiente de firma",
    description: "Listas para que el jefe firme la version final.",
  },
  {
    status: "TREASURY_RETURNED",
    title: "Devueltas por tesoreria",
    description: "Requieren cambios de lote o fecha.",
  },
  {
    status: "ADMIN_CORRECTION",
    title: "En correccion",
    description: "Versiones en ajuste antes de reenviar.",
  },
] as const;

export default async function AdministracionPage() {
  const [requests, latestRate, latestBatch] = await Promise.all([
    prisma.viaticRequest.findMany({
      where: { status: { in: adminQueues.map((queue) => queue.status) } },
      orderBy: { createdAt: "desc" },
      include: {
        area: true,
        versions: { orderBy: { versionNumber: "desc" }, take: 1 },
      },
    }),
    prisma.viaticRateHistory.findFirst({
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.retroactiveAdjustmentBatch.findFirst({
      orderBy: { createdAt: "desc" },
      include: { items: { include: { worker: true } } },
    }),
  ]);

  const statusCounts = requests.reduce<Record<string, number>>((acc, request) => {
    acc[request.status] = (acc[request.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-semibold text-slate-900">Administracion</h2>
        <p className="mt-1 text-sm text-slate-600">
          Validacion, estandarizacion y correcciones pendientes.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Viatico diario
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {formatCurrency(Number(latestRate?.amount ?? 0))}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Vigente desde {formatDate(latestRate?.effectiveFrom)}
              </p>
            </div>
            <AdminRateModal
              currentAmount={Number(latestRate?.amount ?? 0)}
              effectiveFrom={latestRate?.effectiveFrom ?? new Date()}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ajuste retroactivo
          </p>
          {latestBatch ? (
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Periodo {latestBatch.periodMonth}
                  </p>
                  <p className="text-xs text-slate-500">
                    Desde {formatDate(latestBatch.effectiveFromDate)}
                  </p>
                </div>
                <div className="text-xs text-slate-500">
                  {formatCurrency(Number(latestBatch.oldAmount))} â†’
                  {formatCurrency(Number(latestBatch.newAmount))}
                </div>
              </div>
              {latestBatch.items.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No hay colaboradores con ajustes pendientes.
                </p>
              ) : (
                <div className="max-h-48 space-y-2 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  {latestBatch.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">
                        {item.worker.name}
                      </span>
                      <span className="text-slate-600">
                        {item.daysAffected} dias Â· {formatCurrency(Number(item.amountDiff))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Aun no se generaron ajustes retroactivos.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {adminQueues.map((queue) => {
          const tone = getStatusTone(queue.status as RequestStatus);
          return (
            <div
              key={queue.status}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {queue.title}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {statusCounts[queue.status] ?? 0}
              </p>
              <p className="mt-1 text-sm text-slate-600">{queue.description}</p>
              <span
                className={`mt-4 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${getToneClasses(
                  tone
                )}`}
              >
                {getRequestStatusLabel(queue.status)}
              </span>
            </div>
          );
        })}
      </section>

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No hay solicitudes pendientes para administracion.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Solicitud</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Lote</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((request) => {
                const version = request.versions[0];
                return (
                  <tr key={request.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {request.requestNumber}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDate(request.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3">{request.area.name}</td>
                    <td className="px-4 py-3">
                      v{request.versions[0]?.versionNumber ?? "-"}
                    </td>
                    <td className="px-4 py-3">{request.versions[0]?.loteNumber ?? "-"}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={request.status} />
                    </td>
                    <td className="px-4 py-3">
                      <AdminActions
                        requestId={request.id}
                        status={request.status}
                        loteNumber={version?.loteNumber}
                        plannedPaymentDate={version?.plannedPaymentDate}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

