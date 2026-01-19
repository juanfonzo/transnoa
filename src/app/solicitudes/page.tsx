import type { RequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";
import { getRequestStatusLabel, getStatusTone, getToneClasses } from "@/lib/status";
import { SolicitudWizard } from "@/app/solicitudes/SolicitudWizard";
import { SolicitudActions } from "@/app/solicitudes/SolicitudActions";
import { StatusPill } from "@/components/StatusPill";

export default async function SolicitudesPage() {
  const [requests, areas, workers, latestRate] = await Promise.all([
    prisma.viaticRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        area: true,
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: { workers: true },
        },
      },
    }),
    prisma.area.findMany({ orderBy: { name: "asc" } }),
    prisma.worker.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, legajo: true },
    }),
    prisma.viaticRateHistory.findFirst({ orderBy: { effectiveFrom: "desc" } }),
  ]);

  const statusCounts = requests.reduce<Record<string, number>>((acc, request) => {
    acc[request.status] = (acc[request.status] ?? 0) + 1;
    return acc;
  }, {});

  const dailyAmount = Number(latestRate?.amount ?? 25000);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">Solicitudes</h2>
          <p className="mt-1 text-sm text-slate-600">
            Seguimiento general de solicitudes, versiones y estados actuales.
          </p>
        </div>
        <SolicitudWizard areas={areas} workers={workers} dailyAmount={dailyAmount} />
      </header>

      <section className="flex flex-wrap gap-3">
        {Object.entries(statusCounts).map(([status, count]) => {
          const typedStatus = status as RequestStatus;
          const tone = getStatusTone(typedStatus);
          return (
            <div
              key={status}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getToneClasses(
                    tone
                  )}`}
                >
                  {getRequestStatusLabel(typedStatus)}
                </span>
                <span className="text-lg font-semibold text-slate-900">
                  {count}
                </span>
              </div>
            </div>
          );
        })}
        {requests.length === 0 && (
          <span className="text-sm text-slate-500">
            Sin solicitudes registradas.
          </span>
        )}
      </section>

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Cuando cargues una solicitud, aparecera aqui.
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
                <th className="px-4 py-3">Fechas</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((request) => {
                const version = request.versions[0];
                const total = version
                  ? version.workers.reduce(
                      (sum, worker) => sum + Number(worker.netAmount),
                      0
                    )
                  : 0;

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
                    <td className="px-4 py-3">v{version?.versionNumber ?? "-"}</td>
                    <td className="px-4 py-3">{version?.loteNumber ?? "-"}</td>
                    <td className="px-4 py-3">
                      {formatDate(version?.startDate)} - {formatDate(version?.endDate)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {formatCurrency(total)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={request.status} />
                    </td>
                    <td className="px-4 py-3">
                      <SolicitudActions requestId={request.id} status={request.status} />
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
