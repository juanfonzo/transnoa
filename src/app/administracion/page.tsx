import type { RequestStatus } from "@prisma/client";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { addDateOnlyDays, parseDateOnly } from "@/lib/date-only";
import { formatCurrency, formatDate, formatDateOnly } from "@/lib/format";
import { getRequestStatusLabel, getStatusTone, getToneClasses } from "@/lib/status";
import { AdminActions } from "@/app/administracion/AdminActions";
import { AdminRateModal } from "@/app/administracion/AdminRateModal";
import { RenditionBulkForm } from "@/app/administracion/RenditionBulkForm";
import { applyRetroactiveBatch } from "@/app/actions/rates";
import { SubmitButton } from "@/components/SubmitButton";
import { StatusPill } from "@/components/StatusPill";
import { RoleAccessNotice } from "@/components/RoleAccessNotice";
import { getDemoRole } from "@/lib/demo-auth";

const adminQueues = [
  {
    status: "SUBMITTED_TO_ADMIN",
    title: "Ingresos nuevos",
    description: "Solicitudes enviadas por jefes para validar.",
  },
  {
    status: "ADMIN_REVIEW",
    title: "En revisión",
    description: "Administración está estandarizando los datos.",
  },
  {
    status: "PENDING_SIGNATURE",
    title: "Pendiente de firma",
    description: "Listas para que el jefe firme la versión final.",
  },
  {
    status: "TREASURY_RETURNED",
    title: "Devueltas por Tesorería",
    description: "Requieren cambios de lote o fecha.",
  },
  {
    status: "ADMIN_CORRECTION",
    title: "En corrección",
    description: "Versiones en ajuste antes de reenviar.",
  },
] as const;

const tabs = [
  { id: "solicitudes", label: "Solicitudes" },
  { id: "viaticos", label: "Viáticos y retroactivos" },
  { id: "rendiciones", label: "Rendiciones" },
] as const satisfies ReadonlyArray<{ id: TabKey; label: string }>;

type TabKey =
  | "solicitudes"
  | "viaticos"
  | "rendiciones";

type SearchParams = {
  tab?: string;
  lote?: string;
  fecha?: string;
  colaborador?: string;
  estado?: string;
};

type PageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

function parseDateRange(value: string) {
  const parsed = parseDateOnly(value);
  return parsed ? { start: parsed, end: addDateOnlyDays(parsed, 1) } : null;
}

export default async function AdministracionPage({ searchParams }: PageProps) {
  const role = await getDemoRole();
  if (role !== "ADMIN") {
    return <RoleAccessNotice currentRole={role} allowedRoles={["ADMIN"]} />;
  }

  const resolvedSearchParams = await searchParams;
  const rawTab =
    typeof resolvedSearchParams?.tab === "string"
      ? resolvedSearchParams.tab
      : "solicitudes";
  const activeTab: TabKey = tabs.some((tab) => tab.id === rawTab)
    ? (rawTab as TabKey)
    : "solicitudes";

  const filterLote =
    typeof resolvedSearchParams?.lote === "string"
      ? resolvedSearchParams.lote.trim()
      : "";
  const filterFecha =
    typeof resolvedSearchParams?.fecha === "string"
      ? resolvedSearchParams.fecha
      : "";
  const filterColaborador =
    typeof resolvedSearchParams?.colaborador === "string"
      ? resolvedSearchParams.colaborador
      : "";
  const filterEstado =
    typeof resolvedSearchParams?.estado === "string"
      ? resolvedSearchParams.estado
      : "";

  const dateRange = filterFecha ? parseDateRange(filterFecha) : null;

  const showSolicitudes = activeTab === "solicitudes";
  const showViaticos = activeTab === "viaticos";
  const showRendiciones = activeTab === "rendiciones";

  const [
    adminRequests,
    latestRate,
    latestBatch,
    balanceWorkers,
    renditionVersions,
    renditionWorkers,
  ] = await Promise.all([
    showSolicitudes
      ? prisma.viaticRequest.findMany({
          where: { status: { in: adminQueues.map((queue) => queue.status) } },
          orderBy: { createdAt: "desc" },
          include: {
            area: true,
            versions: { orderBy: { versionNumber: "desc" }, take: 1 },
          },
        })
      : Promise.resolve([]),
    showViaticos
      ? prisma.viaticRateHistory.findFirst({
          orderBy: { effectiveFrom: "desc" },
        })
      : Promise.resolve(null),
    showViaticos
      ? prisma.retroactiveAdjustmentBatch.findFirst({
          orderBy: { createdAt: "desc" },
          include: {
            items: {
              include: { worker: true },
              orderBy: { worker: { name: "asc" } },
            },
          },
        })
      : Promise.resolve(null),
    showViaticos
      ? prisma.worker.findMany({
          orderBy: { name: "asc" },
          include: { balanceEntries: true },
        })
      : Promise.resolve([]),
    showRendiciones
      ? prisma.viaticRequestVersion.findMany({
          where: {
            request: { status: "PAID" },
            ...(filterLote
              ? { loteNumber: { contains: filterLote, mode: "insensitive" } }
              : {}),
            ...(filterColaborador
              ? { workers: { some: { workerId: filterColaborador } } }
              : {}),
            ...(dateRange
              ? {
                  payment: {
                    is: {
                      paidAt: { gte: dateRange.start, lt: dateRange.end },
                    },
                  },
                }
              : { payment: { isNot: null } }),
          },
          include: {
            request: { include: { area: true } },
            payment: true,
            workers: {
              include: {
                worker: true,
                rendition: {
                  include: { legs: { orderBy: { orderIndex: "asc" } } },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    showRendiciones
      ? prisma.worker.findMany({ orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  const statusCounts = adminRequests.reduce<Record<string, number>>(
    (acc, request) => {
      acc[request.status] = (acc[request.status] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const renditionFilteredVersions = renditionVersions.filter((version) => {
    if (!filterEstado) {
      return true;
    }
    const isComplete =
      version.workers.length > 0 &&
      version.workers.every(
        (entry) => entry.rendition && entry.rendition.legs.length > 0
      );
    if (filterEstado === "pendiente") {
      return !isComplete;
    }
    if (filterEstado === "completa") {
      return isComplete;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">
            Administración
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Validación, estandarización y correcciones pendientes.
          </p>
        </div>
        <nav className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={{ pathname: "/administracion", query: { tab: tab.id } }}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 text-slate-600"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>
      {activeTab === "solicitudes" && (
        <section className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {adminQueues.map((queue) => {
              const tone = getStatusTone(queue.status as RequestStatus);
              return (
                <div
                  key={queue.status}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {queue.title}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">
                    {statusCounts[queue.status] ?? 0}
                  </p>
                  <p className="mt-1 hidden text-sm text-slate-600 sm:block">
                    {queue.description}
                  </p>
                  <span
                    className={`mt-3 hidden rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide sm:inline-flex ${getToneClasses(
                      tone
                    )}`}
                  >
                    {getRequestStatusLabel(queue.status)}
                  </span>
                </div>
              );
            })}
          </div>

          {adminRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No hay solicitudes pendientes para Administración.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-[720px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Solicitud</th>
                    <th className="px-4 py-3">Área</th>
                    <th className="px-4 py-3">Versión</th>
                    <th className="px-4 py-3">Lote</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminRequests.map((request) => {
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
                        <td className="px-4 py-3">
                          {request.versions[0]?.loteNumber ?? "-"}
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
                            <AdminActions
                              requestId={request.id}
                              status={request.status}
                              loteNumber={version?.loteNumber}
                              plannedPaymentDate={version?.plannedPaymentDate}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === "viaticos" && (
        <section className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Viático diario
                </p>
                <p className="text-2xl font-semibold text-slate-900">
                  {formatCurrency(Number(latestRate?.amount ?? 0))}
                </p>
                <p className="text-xs text-slate-500">
                  Vigente desde {formatDateOnly(latestRate?.effectiveFrom)}
                </p>
              </div>
              <div className="mt-3">
                <AdminRateModal
                  currentAmount={Number(latestRate?.amount ?? 0)}
                  effectiveFrom={latestRate?.effectiveFrom ?? new Date()}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Ajuste retroactivo
              </p>
              {latestBatch ? (
                <div className="mt-3 space-y-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Período {latestBatch.periodMonth}
                      </p>
                      <p className="text-xs text-slate-500">
                        Desde {formatDateOnly(latestBatch.effectiveFromDate)}
                      </p>
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatCurrency(Number(latestBatch.oldAmount))} a
                      {formatCurrency(Number(latestBatch.newAmount))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      {latestBatch.status}
                    </span>
                    {latestBatch.items.length > 0 &&
                      latestBatch.status === "DRAFT" && (
                        <form action={applyRetroactiveBatch}>
                          <input
                            type="hidden"
                            name="batchId"
                            value={latestBatch.id}
                          />
                          <SubmitButton
                            label="Aplicar retroactivos"
                            pendingLabel="Aplicando..."
                            className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white"
                          />
                        </form>
                      )}
                  </div>
                  {latestBatch.items.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No hay colaboradores con ajustes pendientes.
                    </p>
                  ) : (
                    <div className="max-h-48 space-y-2 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                      {latestBatch.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between"
                        >
                          <span className="font-semibold text-slate-700">
                            {item.worker.name}
                          </span>
                          <span className="text-slate-600">
                            {Number(item.daysAffected).toLocaleString("es-AR", {
                              minimumFractionDigits:
                                Number(item.daysAffected) % 1 === 0 ? 0 : 1,
                              maximumFractionDigits: 1,
                            })}{" "}
                            días x{" "}
                            {formatCurrency(Number(item.amountDiff))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  Aún no se generaron ajustes retroactivos.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Cuenta corriente colaboradores
                </h3>
                <p className="text-sm text-slate-600">
                  Saldos y movimientos registrados por trabajador.
                </p>
              </div>
            </div>

            {balanceWorkers.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                No hay colaboradores registrados.
              </div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Colaborador</th>
                      <th className="px-4 py-3">Legajo</th>
                      <th className="px-4 py-3">Saldo actual</th>
                      <th className="px-4 py-3">Movimientos</th>
                      <th className="px-4 py-3">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {balanceWorkers.map((worker) => {
                      const balance = worker.balanceEntries.reduce(
                        (sum, entry) => {
                          const amount = Number(entry.amount);
                          return entry.type === "CREDIT"
                            ? sum + amount
                            : sum - amount;
                        },
                        0
                      );

                      return (
                        <tr key={worker.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">
                              {worker.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {worker.province ?? "-"}
                            </div>
                          </td>
                          <td className="px-4 py-3">{worker.legajo}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {formatCurrency(balance)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {worker.balanceEntries.length} movimiento(s)
                          </td>
                          <td className="px-4 py-3">
                            <details className="text-xs text-slate-600">
                              <summary className="cursor-pointer rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                Ver detalle
                              </summary>
                              <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                {worker.balanceEntries.length === 0 ? (
                                  <p className="text-xs text-slate-500">
                                    Sin movimientos registrados.
                                  </p>
                                ) : (
                                  worker.balanceEntries.map((entry) => (
                                    <div
                                      key={entry.id}
                                      className="flex items-center justify-between text-xs"
                                    >
                                      <span className="font-semibold text-slate-700">
                                        {entry.type === "CREDIT"
                                          ? "A favor"
                                          : "Deudor"}
                                      </span>
                                      <span className="text-slate-500">
                                        {Number(entry.amount).toLocaleString(
                                          "es-AR",
                                          {
                                            style: "currency",
                                            currency: "ARS",
                                          }
                                        )}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </details>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
      {activeTab === "rendiciones" && (
        <section className="space-y-4">
          <form
            method="get"
            className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_1.2fr_0.9fr_auto]"
          >
            <input type="hidden" name="tab" value="rendiciones" />
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Nro lote
              <input
                name="lote"
                defaultValue={filterLote}
                placeholder="L-2026-0001"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Fecha pago
              <input
                type="date"
                name="fecha"
                defaultValue={filterFecha}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Colaborador
              <select
                name="colaborador"
                defaultValue={filterColaborador}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700"
              >
                <option value="">Todos</option>
                {renditionWorkers.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Estado rendición
              <select
                name="estado"
                defaultValue={filterEstado}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700"
              >
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="completa">Completa</option>
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
              >
                Aplicar filtros
              </button>
            </div>
          </form>

          {renditionFilteredVersions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No hay viáticos pagados para rendir con esos filtros.
            </div>
          ) : (
            <div className="space-y-3">
              {renditionFilteredVersions.map((version) => {
                const payment = version.payment;
                const allWorkers = [...version.workers].sort((a, b) =>
                  a.worker.name.localeCompare(b.worker.name)
                );
                const totalAmount = allWorkers.reduce(
                  (sum, entry) => sum + Number(entry.netAmount),
                  0
                );
                const isComplete =
                  allWorkers.length > 0 &&
                  allWorkers.every(
                    (entry) => entry.rendition && entry.rendition.legs.length > 0
                  );
                const loteLabel = version.loteNumber ?? "Sin lote";

                return (
                  <details
                    key={version.id}
                    className="rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <summary className="cursor-pointer px-4 py-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">
                            Lote {loteLabel} - {version.request.requestNumber}
                          </p>
                          <p className="text-xs text-slate-500">
                            Pago {formatDateOnly(payment?.paidAt)} -{" "}
                            {version.request.area.name}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            {allWorkers.map((entry) => (
                              <span
                                key={entry.id}
                                className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600"
                              >
                                {entry.worker.name}
                              </span>
                            ))}
                          </div>
                        </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      {formatCurrency(totalAmount)}
                    </span>
                    <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                              isComplete
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {isComplete ? "Completa" : "Pendiente"}
                          </span>
                          {isComplete && (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                              Enviado a Tesorería
                            </span>
                          )}
                        </div>
                      </div>
                    </summary>
                    <div className="border-t border-slate-100 px-4 py-4">
                      <RenditionBulkForm
                        workers={allWorkers.map((entry) => ({
                          requestWorkerId: entry.id,
                          name: entry.worker.name,
                          legajo: entry.worker.legajo,
                          isComplete: Boolean(
                            entry.rendition && entry.rendition.legs.length > 0
                          ),
                          availableViaticos: Number(entry.daysCount),
                        }))}
                      />
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
