import type { RequestStatus } from "@prisma/client";
import Link from "next/link";
import { TreasuryActions } from "@/app/tesoreria/TreasuryActions";
import { RoleAccessNotice } from "@/components/RoleAccessNotice";
import { StatusPill } from "@/components/StatusPill";
import { KpiStrip } from "@/components/KpiStrip";
import { getDemoRole } from "@/lib/demo-auth";
import { formatCurrency, formatDate, formatDateOnly } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function TesoreriaPage() {
  const role = await getDemoRole();
  if (role !== "TESORERIA") {
    return <RoleAccessNotice currentRole={role} allowedRoles={["TESORERIA"]} />;
  }

  const requests = await prisma.viaticRequest.findMany({
    where: {
      status: { in: ["READY_FOR_PAYMENT", "TREASURY_RETURNED", "PAID"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      area: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: {
          payment: true,
          workers: true,
          correctionRequests: {
            orderBy: { requestedAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  const statusPriority: Partial<Record<RequestStatus, number>> = {
    READY_FOR_PAYMENT: 0,
    TREASURY_RETURNED: 1,
    PAID: 2,
  };
  const rows = requests
    .map((request) => {
      const version = request.versions[0];
      const amount =
        version?.workers.reduce(
          (total, worker) => total + Number(worker.netAmount),
          0
        ) ?? 0;

      return {
        request,
        version,
        amount,
        lastCorrection: version?.correctionRequests[0] ?? null,
      };
    })
    .sort((a, b) => {
      const priority =
        (statusPriority[a.request.status] ?? 99) -
        (statusPriority[b.request.status] ?? 99);
      return priority || b.request.createdAt.getTime() - a.request.createdAt.getTime();
    });
  const readyRows = rows.filter(
    ({ request }) => request.status === "READY_FOR_PAYMENT"
  );
  const paidRows = rows.filter(({ request }) => request.status === "PAID");
  const returnedRows = rows.filter(
    ({ request }) => request.status === "TREASURY_RETURNED"
  );
  const readyAmount = readyRows.reduce((total, row) => total + row.amount, 0);
  const paidAmount = paidRows.reduce((total, row) => total + row.amount, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Gestión de pagos
          </p>
          <h2 className="text-3xl font-semibold text-slate-900">Tesorería</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Registrá pagos o devolvé solicitudes a Administración con una
            observación trazable.
          </p>
        </div>
        <Link
          href="/reportes"
          className="inline-flex min-h-11 self-start items-center justify-center rounded-full border border-slate-200 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-300 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 sm:self-auto"
        >
          Ver reportes
        </Link>
      </header>

      <KpiStrip
        label="Resumen de Tesorería"
        items={[
          {
            label: "Listas para pagar",
            value: readyRows.length,
            detail: formatCurrency(readyAmount),
            tone: "emerald",
          },
          {
            label: "Pagos registrados",
            value: paidRows.length,
            detail: formatCurrency(paidAmount),
            tone: "sky",
          },
          {
            label: "Con observaciones",
            value: returnedRows.length,
            detail: "En Administración",
            tone: "rose",
          },
        ]}
      />

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <p className="font-semibold text-slate-800">No hay pagos para gestionar</p>
          <p className="mt-1 text-sm text-slate-500">
            Las solicitudes aparecerán aquí cuando estén firmadas y listas para pago.
          </p>
        </div>
      ) : (
        <section aria-labelledby="treasury-queue-title" className="space-y-3">
          <div>
            <h3 id="treasury-queue-title" className="text-lg font-semibold text-slate-900">
              Bandeja operativa
            </h3>
            <p className="text-sm text-slate-600">
              Priorizá las solicitudes listas y consultá el historial registrado.
            </p>
          </div>

          <div className="divide-y divide-slate-200 border-y border-slate-200 md:hidden">
            {rows.map(({ request, version, amount, lastCorrection }) => (
              <article
                key={request.id}
                className="py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
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
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Lote</dt>
                    <dd className="mt-1 font-semibold text-slate-800">
                      {version?.loteNumber ?? "Sin lote"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Importe</dt>
                    <dd className="mt-1 font-semibold text-slate-800">
                      {formatCurrency(amount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Fecha prevista</dt>
                    <dd className="mt-1 text-slate-700">
                      {formatDateOnly(version?.plannedPaymentDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Pago</dt>
                    <dd className="mt-1 text-slate-700">
                      {formatDateOnly(version?.payment?.paidAt)}
                    </dd>
                  </div>
                </dl>
                {lastCorrection && (
                  <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800">
                    Observación: {lastCorrection.reason}
                  </p>
                )}
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <TreasuryActions
                    requestId={request.id}
                    status={request.status}
                    plannedPaymentDate={version?.plannedPaymentDate}
                    paidAt={version?.payment?.paidAt}
                    paymentReference={version?.payment?.paymentReference}
                    detailHref={`/solicitudes/${request.id}`}
                  />
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto border-y border-slate-200 md:block">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Solicitud</th>
                  <th className="px-4 py-3">Área</th>
                  <th className="px-4 py-3">Lote</th>
                  <th className="px-4 py-3">Fecha prevista</th>
                  <th className="px-4 py-3 text-right">Importe</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ request, version, amount }) => (
                  <tr key={request.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="whitespace-nowrap font-semibold text-slate-900">
                        {request.requestNumber}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDate(request.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3">{request.area.name}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {version?.loteNumber ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatDateOnly(version?.plannedPaymentDate)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatCurrency(amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusPill status={request.status} />
                    </td>
                    <td className="px-4 py-3">
                      <TreasuryActions
                        requestId={request.id}
                        status={request.status}
                        plannedPaymentDate={version?.plannedPaymentDate}
                        paidAt={version?.payment?.paidAt}
                        paymentReference={version?.payment?.paymentReference}
                        detailHref={`/solicitudes/${request.id}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
