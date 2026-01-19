import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { StatusPill } from "@/components/StatusPill";
import { TreasuryActions } from "@/app/tesoreria/TreasuryActions";

export default async function TesoreriaPage() {
  const requests = await prisma.viaticRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      area: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: { payment: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-semibold text-slate-900">Tesoreria</h2>
        <p className="mt-1 text-sm text-slate-600">
          Solicitudes listas para pago y control de movimientos registrados.
        </p>
      </header>

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No hay solicitudes disponibles para tesoreria.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Solicitud</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Lote</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((request) => {
                const version = request.versions[0];
                const paidAt = version?.payment?.paidAt;

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
                    <td className="px-4 py-3">{version?.loteNumber ?? "-"}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={request.status} />
                    </td>
                    <td className="px-4 py-3">
                      {paidAt ? (
                        <span className="text-sm font-semibold text-slate-900">
                          {formatDate(paidAt)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Pendiente</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {paidAt ? (
                        <span className="text-xs text-slate-400">-</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <TreasuryActions
                            requestId={request.id}
                            plannedPaymentDate={version?.plannedPaymentDate}
                          />
                        </div>
                      )}
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
