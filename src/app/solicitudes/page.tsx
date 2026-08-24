import type { RequestStatus } from "@prisma/client";
import Link from "next/link";
import { SolicitudActions } from "@/app/solicitudes/SolicitudActions";
import { SolicitudWizard } from "@/app/solicitudes/SolicitudWizard";
import { RoleAccessNotice } from "@/components/RoleAccessNotice";
import { StatusPill } from "@/components/StatusPill";
import { getDemoRole } from "@/lib/demo-auth";
import { formatCurrency, formatDate, formatDateOnly } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  getRequestStatusLabel,
  getStatusTone,
  getToneClasses,
} from "@/lib/status";

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
      select: { id: true, name: true, legajo: true },
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
        <SolicitudWizard areas={areas} workers={workers} dailyAmount={dailyAmount} />
      </header>

      <section aria-label="Resumen de solicitudes" className="flex gap-3 overflow-x-auto pb-1">
        {Object.entries(statusCounts).map(([status, count]) => {
          const typedStatus = status as RequestStatus;
          const tone = getStatusTone(typedStatus);
          return (
            <div
              key={status}
              className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getToneClasses(
                    tone
                  )}`}
                >
                  {getRequestStatusLabel(typedStatus)}
                </span>
                <span className="text-lg font-semibold text-slate-900">{count}</span>
              </div>
            </div>
          );
        })}
      </section>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <p className="font-semibold text-slate-800">Todavía no hay solicitudes</p>
          <p className="mt-1 text-sm text-slate-500">
            Creá la primera solicitud para iniciar el circuito de aprobación.
          </p>
        </div>
      ) : (
        <>
          <section aria-label="Solicitudes del área" className="space-y-3 md:hidden">
            {rows.map(({ request, version, total }) => (
              <article
                key={request.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
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
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                  <Link
                    href={`/solicitudes/${request.id}`}
                    className="inline-flex min-h-10 items-center rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                  >
                    Ver trazabilidad
                  </Link>
                  {request.status === "PENDING_SIGNATURE" && (
                    <SolicitudActions requestId={request.id} status={request.status} />
                  )}
                </div>
              </article>
            ))}
          </section>

          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/solicitudes/${request.id}`}
                          className="inline-flex min-h-10 items-center rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                        >
                          Ver detalle
                        </Link>
                        <SolicitudActions requestId={request.id} status={request.status} />
                      </div>
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
