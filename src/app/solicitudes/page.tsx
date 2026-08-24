import type { RequestStatus } from "@prisma/client";
import { SolicitudActions } from "@/app/solicitudes/SolicitudActions";
import { SolicitudWizard } from "@/app/solicitudes/SolicitudWizard";
import { RoleAccessNotice } from "@/components/RoleAccessNotice";
import { StatusPill } from "@/components/StatusPill";
import { KpiStrip } from "@/components/KpiStrip";
import { getDemoRole } from "@/lib/demo-auth";
import { formatCurrency, formatDate, formatDateOnly } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  getRequestStatusLabel,
  getStatusTone,
} from "@/lib/status";

const summaryLabels: Partial<Record<RequestStatus, string>> = {
  SUBMITTED_TO_ADMIN: "En Administración",
  READY_FOR_PAYMENT: "Listas para pagar",
  TREASURY_RETURNED: "Devueltas",
  PAID: "Pagadas",
};

export default async function SolicitudesPage() {
  const role = await getDemoRole();
  if (role !== "JEFE_AREA") {
    return <RoleAccessNotice currentRole={role} allowedRoles={["JEFE_AREA"]} />;
  }

  const jefe = await prisma.user.findFirst({
    where: { role: "JEFE_AREA", active: true },
    select: { id: true, areaId: true },
  });

  const [requests, areas, workers, latestRate] = await Promise.all([
    prisma.viaticRequest.findMany({
      where: jefe?.areaId ? { areaId: jefe.areaId } : { id: "__missing_demo_jefe__" },
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
      select: {
        id: true,
        name: true,
        legajo: true,
        balanceEntries: { select: { type: true, amount: true } },
      },
    }),
    prisma.viaticRateHistory.findFirst({ orderBy: { effectiveFrom: "desc" } }),
  ]);

  const statusPriority: Partial<Record<RequestStatus, number>> = {
    PENDING_SIGNATURE: 0,
    TREASURY_RETURNED: 1,
    SUBMITTED_TO_ADMIN: 2,
    ADMIN_REVIEW: 3,
    READY_FOR_PAYMENT: 4,
    PAID: 5,
  };
  const rows = requests
    .map((request) => {
      const version = request.versions[0];
      const total =
        version?.workers.reduce(
          (sum, worker) => sum + Number(worker.netAmount),
          0
        ) ?? 0;
      return { request, version, total };
    })
    .sort((a, b) => {
      const priority =
        (statusPriority[a.request.status] ?? 99) -
        (statusPriority[b.request.status] ?? 99);
      return priority || b.request.createdAt.getTime() - a.request.createdAt.getTime();
    });
  const statusCounts = requests.reduce<Record<string, number>>((acc, request) => {
    acc[request.status] = (acc[request.status] ?? 0) + 1;
    return acc;
  }, {});
  const dailyAmount = Number(latestRate?.amount ?? 25000);
  const workerOptions = workers.map((worker) => ({
    id: worker.id,
    name: worker.name,
    legajo: worker.legajo,
    balance: worker.balanceEntries.reduce((total, entry) => {
      const amount = Number(entry.amount);
      return entry.type === "CREDIT" ? total + amount : total - amount;
    }, 0),
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Gestión del área
          </p>
          <h2 className="text-3xl font-semibold text-slate-900">Solicitudes</h2>
          <p className="mt-1 text-sm text-slate-600">
            Creá, seguí y firmá las solicitudes de tu equipo.
          </p>
        </div>
        <SolicitudWizard
          areas={areas}
          workers={workerOptions}
          dailyAmount={dailyAmount}
        />
      </header>

      <KpiStrip
        label="Resumen de solicitudes"
        items={Object.entries(statusCounts).map(([status, count]) => {
          const typedStatus = status as RequestStatus;
          return {
            label: summaryLabels[typedStatus] ?? getRequestStatusLabel(typedStatus),
            value: count,
            tone: getStatusTone(typedStatus),
          };
        })}
      />

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <p className="font-semibold text-slate-800">Todavía no hay solicitudes</p>
          <p className="mt-1 text-sm text-slate-500">
            Creá la primera solicitud para iniciar el circuito de aprobación.
          </p>
        </div>
      ) : (
        <>
          <section aria-label="Solicitudes del área" className="divide-y divide-slate-200 border-y border-slate-200 md:hidden">
            {rows.map(({ request, version, total }) => (
              <article
                key={request.id}
                className="py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {request.requestNumber}
                    </p>
                    <p className="text-xs text-slate-500">
                      {request.area.name} · {formatDate(request.createdAt)}
                    </p>
                  </div>
                  <StatusPill status={request.status} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Versión</dt>
                    <dd className="mt-1 font-medium text-slate-800">
                      v{version?.versionNumber ?? "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Lote</dt>
                    <dd className="mt-1 font-medium text-slate-800">
                      {version?.loteNumber ?? "Sin asignar"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Período</dt>
                    <dd className="mt-1 text-slate-700">
                      {formatDateOnly(version?.startDate)} – {formatDateOnly(version?.endDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Total</dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {formatCurrency(total)}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <SolicitudActions
                    requestId={request.id}
                    status={request.status}
                    detailHref={`/solicitudes/${request.id}`}
                  />
                </div>
              </article>
            ))}
          </section>

          <div className="hidden overflow-x-auto border-y border-slate-200 md:block">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Solicitud</th>
                  <th className="px-4 py-3">Área</th>
                  <th className="px-4 py-3">Versión</th>
                  <th className="px-4 py-3">Lote</th>
                  <th className="px-4 py-3">Fechas</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ request, version, total }) => (
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
                      {formatDateOnly(version?.startDate)} – {formatDateOnly(version?.endDate)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatCurrency(total)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={request.status} />
                    </td>
                    <td className="px-4 py-3">
                      <SolicitudActions
                        requestId={request.id}
                        status={request.status}
                        detailHref={`/solicitudes/${request.id}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
