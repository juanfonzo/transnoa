import type { Prisma, RequestStatus } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminActions } from "@/app/administracion/AdminActions";
import { SolicitudActions } from "@/app/solicitudes/SolicitudActions";
import { RequestTimeline } from "@/app/solicitudes/[id]/RequestTimeline";
import { TreasuryActions } from "@/app/tesoreria/TreasuryActions";
import { RoleAccessNotice } from "@/components/RoleAccessNotice";
import { StatusPill } from "@/components/StatusPill";
import { KpiStrip } from "@/components/KpiStrip";
import { dateOnlyKey } from "@/lib/date-only";
import { getDemoRole } from "@/lib/demo-auth";
import { formatCurrency, formatDateOnly, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { buildRequestTimeline } from "@/lib/request-timeline";
import type { DemoRole } from "@/lib/roles";

const DEMO_COLLABORATOR_LEGAJO = "1001";

const backRoutes: Record<DemoRole, { href: string; label: string }> = {
  JEFE_AREA: { href: "/solicitudes", label: "Volver a Solicitudes" },
  COLABORADOR: { href: "/colaboradores", label: "Volver a Mi cuenta" },
  ADMIN: { href: "/administracion", label: "Volver a Administración" },
  TESORERIA: { href: "/tesoreria", label: "Volver a Tesorería" },
};

const actionableAdminStatuses: RequestStatus[] = [
  "SUBMITTED_TO_ADMIN",
  "ADMIN_REVIEW",
  "TREASURY_RETURNED",
  "ADMIN_CORRECTION",
];

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatDays(value: unknown) {
  return Number(value).toLocaleString("es-AR", {
    minimumFractionDigits: Number(value) % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  });
}

function formatAppliedBalance(value: unknown) {
  const amount = Number(value);
  return `${amount > 0 ? "+" : ""}${formatCurrency(amount)}`;
}

export default async function RequestDetailPage({ params }: PageProps) {
  const [{ id }, role] = await Promise.all([params, getDemoRole()]);
  const where: Prisma.ViaticRequestWhereInput = { id };

  if (role === "JEFE_AREA") {
    const jefe = await prisma.user.findFirst({
      where: { role: "JEFE_AREA", active: true },
      select: { areaId: true },
    });
    where.areaId = jefe?.areaId ?? "__missing_demo_jefe_area__";
  }

  if (role === "COLABORADOR") {
    where.versions = {
      some: {
        workers: {
          some: { worker: { legajo: DEMO_COLLABORATOR_LEGAJO } },
        },
      },
    };
  }

  const [request, auditLogs] = await Promise.all([
    prisma.viaticRequest.findFirst({
      where,
      include: {
        area: true,
        createdBy: { select: { name: true, role: true } },
        versions: {
          orderBy: { versionNumber: "desc" },
          include: {
            createdBy: { select: { name: true, role: true } },
            workers: {
              orderBy: { worker: { name: "asc" } },
              include: {
                worker: { select: { name: true, legajo: true } },
                rendition: {
                  include: {
                    legs: { orderBy: { orderIndex: "asc" } },
                    createdBy: { select: { name: true } },
                  },
                },
              },
            },
            dayConcepts: { orderBy: { date: "asc" } },
            signature: {
              include: { signedBy: { select: { name: true, role: true } } },
            },
            payment: {
              include: { createdBy: { select: { name: true, role: true } } },
            },
            correctionRequests: {
              orderBy: { requestedAt: "desc" },
              include: { requestedBy: { select: { name: true, role: true } } },
            },
          },
        },
      },
    }),
    prisma.auditLog.findMany({
      where: { entityId: id },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    }),
  ]);

  if (!request) {
    const exists = await prisma.viaticRequest.count({ where: { id } });
    if (!exists) notFound();
    return (
      <RoleAccessNotice
        currentRole={role}
        allowedRoles={["JEFE_AREA", "ADMIN", "TESORERIA"]}
        message="La solicitud existe, pero no pertenece al área o al legajo habilitado para el rol activo."
      />
    );
  }

  const currentVersion = request.versions[0];
  const visibleWorkers =
    currentVersion?.workers.filter(
      (entry) => role !== "COLABORADOR" || entry.worker.legajo === DEMO_COLLABORATOR_LEGAJO,
    ) ?? [];
  const visibleAmount = visibleWorkers.reduce(
    (sum, entry) => sum + Number(entry.netAmount),
    0,
  );
  const timeline = buildRequestTimeline({
    requestCreatedAt: request.createdAt,
    createdByName: request.createdBy.name,
    versions: request.versions.map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      createdAt: version.createdAt,
      createdByName: version.createdBy.name,
      signature: version.signature
        ? {
            id: version.signature.id,
            signedAt: version.signature.signedAt,
            signedByName: version.signature.signedBy.name,
            method:
              version.signature.signatureMethod.startsWith("PIN")
                ? "firma interna demo"
                : version.signature.signatureMethod,
          }
        : null,
      payment: version.payment
        ? {
            id: version.payment.id,
            createdAt: version.payment.createdAt,
            paidAt: version.payment.paidAt,
            reference: version.payment.paymentReference,
            createdByName: version.payment.createdBy.name,
          }
        : null,
      corrections: version.correctionRequests.map((correction) => ({
        id: correction.id,
        requestedAt: correction.requestedAt,
        requestedByName: correction.requestedBy.name,
        reason: correction.reason,
      })),
      renditions: version.workers.flatMap((entry) => {
        if (!entry.rendition) return [];
        if (role === "COLABORADOR" && entry.worker.legajo !== DEMO_COLLABORATOR_LEGAJO) {
          return [];
        }
        return [
          {
            id: entry.rendition.id,
            createdAt: entry.rendition.createdAt,
            workerName: entry.worker.name,
          },
        ];
      }),
    })),
    audits: auditLogs.map((audit) => ({
      id: audit.id,
      action: audit.action,
      createdAt: audit.createdAt,
      userName: audit.user?.name,
    })),
  });
  const backRoute = backRoutes[role];
  const canAct =
    (role === "JEFE_AREA" && request.status === "PENDING_SIGNATURE") ||
    (role === "ADMIN" && actionableAdminStatuses.includes(request.status)) ||
    (role === "TESORERIA" &&
      (request.status === "READY_FOR_PAYMENT" || request.status === "PAID"));

  return (
    <div className="space-y-6">
      <Link
        href={backRoute.href}
        className="inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        ← {backRoute.label}
      </Link>

      <header>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Expediente de viáticos
              </p>
              <StatusPill status={request.status} />
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950 sm:text-4xl">
              {request.requestNumber}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {request.area.name} · Creada por {request.createdBy.name}. La vista reúne el contenido vigente y las evidencias del circuito.
            </p>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:w-80" aria-label="Acción pendiente">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {canAct ? "Acción disponible" : "Estado para tu rol"}
            </p>
            <div className="mt-3">
              {role === "JEFE_AREA" && request.status === "PENDING_SIGNATURE" && (
                <SolicitudActions requestId={request.id} status={request.status} />
              )}
              {role === "ADMIN" && actionableAdminStatuses.includes(request.status) && (
                <AdminActions
                  requestId={request.id}
                  status={request.status}
                  loteNumber={currentVersion?.loteNumber}
                  plannedPaymentDate={currentVersion?.plannedPaymentDate}
                />
              )}
              {role === "TESORERIA" &&
                (request.status === "READY_FOR_PAYMENT" || request.status === "PAID") && (
                  <TreasuryActions
                    requestId={request.id}
                    status={request.status}
                    plannedPaymentDate={currentVersion?.plannedPaymentDate}
                    paidAt={currentVersion?.payment?.paidAt}
                    paymentReference={currentVersion?.payment?.paymentReference}
                  />
                )}
              {!canAct && (
                <p className="text-sm leading-6 text-slate-600">
                  No hay acciones pendientes para el rol activo. Podés revisar la trazabilidad y las evidencias.
                </p>
              )}
            </div>
          </section>
        </div>

        <KpiStrip
          label="Resumen de la solicitud"
          className="mt-6"
          items={[
            {
              label: "Versión vigente",
              value: `v${currentVersion?.versionNumber ?? "-"}`,
              tone: "sky",
            },
            {
              label: "Período",
              value: `${formatDateOnly(currentVersion?.startDate)} – ${formatDateOnly(currentVersion?.endDate)}`,
              valueClassName: "text-sm",
            },
            {
              label: "Lote",
              value: currentVersion?.loteNumber ?? "Sin asignar",
              valueClassName: "text-base",
            },
            {
              label: "Fecha prevista",
              value: formatDateOnly(currentVersion?.plannedPaymentDate),
              valueClassName: "text-base",
              tone: "amber",
            },
            {
              label: role === "COLABORADOR" ? "Tu importe" : "Importe neto",
              value: formatCurrency(visibleAmount),
              valueClassName: "text-xl",
              tone: "emerald",
            },
          ]}
        />
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
        <div className="space-y-6">
          <section className="border-t border-slate-200 pt-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Versión v{currentVersion?.versionNumber ?? "-"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  {role === "COLABORADOR" ? "Tu asignación" : "Cuadrilla e importes"}
                </h2>
              </div>
              <p className="text-sm text-slate-500">
                {visibleWorkers.length} colaborador(es)
              </p>
            </div>

            {visibleWorkers.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                Esta versión no tiene colaboradores visibles para el rol activo.
              </p>
            ) : (
              <>
                <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200 md:hidden">
                  {visibleWorkers.map((entry) => (
                    <article key={entry.id} className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{entry.worker.name}</p>
                          <p className="text-xs text-slate-500">Legajo {entry.worker.legajo}</p>
                        </div>
                        <p className="font-semibold text-slate-900">
                          {formatCurrency(Number(entry.netAmount))}
                        </p>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-xs text-slate-500">Días</dt>
                          <dd className="font-medium text-slate-800">{formatDays(entry.daysCount)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">Bruto</dt>
                          <dd className="font-medium text-slate-800">
                            {formatCurrency(Number(entry.grossAmount))}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">Saldo aplicado</dt>
                          <dd
                            className={`font-medium ${
                              Number(entry.balanceAppliedAmount) < 0
                                ? "text-amber-700"
                                : Number(entry.balanceAppliedAmount) > 0
                                  ? "text-emerald-700"
                                  : "text-slate-800"
                            }`}
                          >
                            {formatAppliedBalance(entry.balanceAppliedAmount)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">Rendición</dt>
                          <dd className="font-medium text-slate-800">
                            {entry.rendition?.legs.length ? "Completa" : "Pendiente"}
                          </dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
                <div className="mt-5 hidden overflow-x-auto border-y border-slate-200 md:block">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Colaborador</th>
                        <th className="px-4 py-3 text-right">Días</th>
                        <th className="px-4 py-3 text-right">Diario</th>
                        <th className="px-4 py-3 text-right">Bruto</th>
                        <th className="px-4 py-3 text-right">Saldo aplicado</th>
                        <th className="px-4 py-3 text-right">Neto</th>
                        <th className="px-4 py-3">Rendición</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleWorkers.map((entry) => (
                        <tr key={entry.id}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{entry.worker.name}</p>
                            <p className="text-xs text-slate-500">Legajo {entry.worker.legajo}</p>
                          </td>
                          <td className="px-4 py-3 text-right">{formatDays(entry.daysCount)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(Number(entry.dailyAmount))}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(Number(entry.grossAmount))}</td>
                          <td
                            className={`px-4 py-3 text-right font-medium ${
                              Number(entry.balanceAppliedAmount) < 0
                                ? "text-amber-700"
                                : Number(entry.balanceAppliedAmount) > 0
                                  ? "text-emerald-700"
                                  : "text-slate-600"
                            }`}
                          >
                            {formatAppliedBalance(entry.balanceAppliedAmount)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            {formatCurrency(Number(entry.netAmount))}
                          </td>
                          <td className="px-4 py-3">
                            {entry.rendition?.legs.length ? "Completa" : "Pendiente"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <section className="border-t border-slate-200 pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Agenda</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Conceptos por día</h2>
            {currentVersion?.dayConcepts.length ? (
              <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
                {currentVersion.dayConcepts.map((concept) => (
                  <article key={concept.id} className="grid gap-2 py-3.5 sm:grid-cols-[10rem_1fr] sm:items-start">
                    <time
                      className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                      dateTime={dateOnlyKey(concept.date)}
                    >
                      {formatDateOnly(concept.date, {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      })}
                    </time>
                    <p className="text-sm font-medium leading-6 text-slate-800">
                      {concept.conceptText}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                No hay conceptos diarios registrados para esta versión.
              </p>
            )}
          </section>

          <section className="grid border-y border-slate-200 md:grid-cols-2 md:divide-x md:divide-slate-200" aria-label="Evidencias">
            <article className="border-b border-slate-200 py-5 md:border-b-0 md:pr-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Evidencia de firma
              </p>
              {currentVersion?.signature ? (
                <>
                  <p className="mt-3 text-lg font-semibold text-slate-900">Documento confirmado</p>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Firmante</dt>
                      <dd className="text-right font-semibold text-slate-800">
                        {currentVersion.signature.signedBy.name}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Fecha</dt>
                      <dd className="text-right text-slate-800">
                        {formatDateTime(currentVersion.signature.signedAt)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Método</dt>
                      <dd className="text-right text-slate-800">Firma interna demo</dd>
                    </div>
                    {role !== "COLABORADOR" && currentVersion.signature.docHash && (
                      <div>
                        <dt className="text-slate-500">Huella del documento</dt>
                        <dd className="mt-1 break-all rounded-xl bg-slate-50 p-3 font-mono text-xs text-slate-700">
                          {currentVersion.signature.docHash}
                        </dd>
                      </div>
                    )}
                  </dl>
                </>
              ) : (
                <p className="mt-4 rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  La versión vigente todavía no fue firmada.
                </p>
              )}
            </article>

            <article className="py-5 md:pl-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Evidencia de pago
              </p>
              {currentVersion?.payment ? (
                <>
                  <p className="mt-3 text-lg font-semibold text-emerald-800">Pago confirmado</p>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Referencia</dt>
                      <dd className="text-right font-semibold text-slate-800">
                        {currentVersion.payment.paymentReference ?? "Sin referencia"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Fecha de pago</dt>
                      <dd className="text-right text-slate-800">
                        {formatDateOnly(currentVersion.payment.paidAt)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Registrado por</dt>
                      <dd className="text-right text-slate-800">
                        {currentVersion.payment.createdBy.name}
                      </dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p className="mt-4 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  Todavía no existe un pago asociado a la versión vigente.
                </p>
              )}
            </article>
          </section>

        </div>

        <div className="lg:sticky lg:top-6">
          <RequestTimeline events={timeline} />
        </div>
      </div>
    </div>
  );
}
