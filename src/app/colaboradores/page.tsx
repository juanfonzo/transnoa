import Link from "next/link";
import { WorkerCreateModal } from "@/app/solicitudes/WorkerCreateModal";
import { RoleAccessNotice } from "@/components/RoleAccessNotice";
import { getDemoRole } from "@/lib/demo-auth";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const DEMO_COLLABORATOR_LEGAJO = "1001";

function calculateBalance(
  entries: Array<{ type: "CREDIT" | "DEBIT"; amount: unknown }>
) {
  return entries.reduce((sum, entry) => {
    const amount = Number(entry.amount);
    return entry.type === "CREDIT" ? sum + amount : sum - amount;
  }, 0);
}

export default async function ColaboradoresPage() {
  const role = await getDemoRole();
  if (role !== "ADMIN" && role !== "COLABORADOR") {
    return (
      <RoleAccessNotice
        currentRole={role}
        allowedRoles={["ADMIN", "COLABORADOR"]}
      />
    );
  }

  if (role === "COLABORADOR") {
    const worker = await prisma.worker.findUnique({
      where: { legajo: DEMO_COLLABORATOR_LEGAJO },
      include: {
        balanceEntries: {
          orderBy: { createdAt: "desc" },
          include: {
            relatedRequest: { include: { request: true, payment: true } },
          },
        },
        requestWorkers: {
          include: {
            requestVersion: { include: { request: true, payment: true } },
          },
        },
      },
    });

    if (!worker) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <p className="font-semibold text-slate-800">Perfil demo no disponible</p>
          <p className="mt-1 text-sm text-slate-500">
            Ejecutá el seed de demostración para restaurar la cuenta del colaborador.
          </p>
        </div>
      );
    }

    const balance = calculateBalance(worker.balanceEntries);
    const payments = worker.requestWorkers
      .filter((entry) => Boolean(entry.requestVersion.payment))
      .sort((a, b) => {
        const aTime = a.requestVersion.payment?.paidAt.getTime() ?? 0;
        const bTime = b.requestVersion.payment?.paidAt.getTime() ?? 0;
        return bTime - aTime;
      });
    const balanceLabel =
      balance > 0
        ? "Saldo a favor"
        : balance < 0
          ? "Saldo a regularizar"
          : "Sin saldo pendiente";
    const balanceTone =
      balance > 0
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : balance < 0
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-slate-200 bg-slate-50 text-slate-800";

    return (
      <div className="space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Portal personal · Perfil demostrativo
          </p>
          <h2 className="text-3xl font-semibold text-slate-900">Mi cuenta de viáticos</h2>
          <p className="mt-1 text-sm text-slate-600">
            Consultá pagos y ajustes asociados a tu legajo.
          </p>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <article className={`rounded-3xl border p-6 shadow-sm ${balanceTone}`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-75">
              {balanceLabel}
            </p>
            <p className="mt-2 text-3xl font-semibold">{formatCurrency(balance)}</p>
            <p className="mt-3 max-w-xl text-sm leading-6 opacity-80">
              {balance < 0
                ? "Este importe corresponde a viáticos no utilizados o ajustes pendientes de compensación."
                : balance > 0
                  ? "Este importe quedará disponible para compensar próximos viáticos."
                  : "No tenés importes pendientes de compensación en tu cuenta."}
            </p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Colaborador
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{worker.name}</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Legajo</dt>
                <dd className="font-semibold text-slate-800">{worker.legajo}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Provincia</dt>
                <dd className="text-right font-semibold text-slate-800">
                  {worker.province ?? "Sin informar"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Estado</dt>
                <dd className="font-semibold text-emerald-700">
                  {worker.status ?? "Activo"}
                </dd>
              </div>
            </dl>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Pagos recibidos</h3>
            <p className="text-sm text-slate-600">Últimos viáticos registrados por Tesorería.</p>
            {payments.length === 0 ? (
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                Todavía no hay pagos asociados a este legajo.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {payments.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/solicitudes/${entry.requestVersion.request.id}`}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-3 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">
                        {entry.requestVersion.request.requestNumber}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDateOnly(entry.requestVersion.payment?.paidAt)} · Lote {entry.requestVersion.loteNumber ?? "-"}
                      </p>
                    </div>
                    <p className="text-right font-semibold text-slate-900">
                      {formatCurrency(Number(entry.netAmount))}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Ajustes y movimientos</h3>
            <p className="text-sm text-slate-600">Detalle de créditos y débitos de la cuenta.</p>
            {worker.balanceEntries.length === 0 ? (
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                No hay ajustes registrados.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {worker.balanceEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-3"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{entry.reason}</p>
                      <p className="text-xs text-slate-500">
                        {formatDateOnly(entry.createdAt)}
                        {entry.relatedRequest
                          ? ` · ${entry.relatedRequest.request.requestNumber}`
                          : ""}
                      </p>
                    </div>
                    <p
                      className={`text-right font-semibold ${
                        entry.type === "CREDIT" ? "text-emerald-700" : "text-amber-700"
                      }`}
                    >
                      {entry.type === "CREDIT" ? "+" : "-"}
                      {formatCurrency(Number(entry.amount))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      </div>
    );
  }

  const workers = await prisma.worker.findMany({
    orderBy: { name: "asc" },
    include: { balanceEntries: true },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Gestión de personas
          </p>
          <h2 className="text-3xl font-semibold text-slate-900">Colaboradores</h2>
          <p className="mt-1 text-sm text-slate-600">
            Cuenta corriente y saldo actualizado por trabajador.
          </p>
        </div>
        <WorkerCreateModal />
      </header>

      {workers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No hay colaboradores registrados.
        </div>
      ) : (
        <>
          <section aria-label="Colaboradores" className="space-y-3 md:hidden">
            {workers.map((worker) => {
              const balance = calculateBalance(worker.balanceEntries);
              return (
                <article
                  key={worker.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{worker.name}</p>
                      <p className="text-xs text-slate-500">
                        Legajo {worker.legajo} · {worker.province ?? "Sin provincia"}
                      </p>
                    </div>
                    <p className="text-right font-semibold text-slate-900">
                      {formatCurrency(balance)}
                    </p>
                  </div>
                  <details className="mt-4 text-xs text-slate-600">
                    <summary className="min-h-10 cursor-pointer rounded-full border border-slate-200 px-4 py-2 text-center font-semibold uppercase tracking-wide">
                      Ver movimientos ({worker.balanceEntries.length})
                    </summary>
                    <div className="mt-2 space-y-2 rounded-xl bg-slate-50 p-3">
                      {worker.balanceEntries.length === 0 ? (
                        <p>Sin movimientos registrados.</p>
                      ) : (
                        worker.balanceEntries.map((entry) => (
                          <div key={entry.id} className="flex justify-between gap-3">
                            <span>{entry.reason}</span>
                            <span className="font-semibold">
                              {entry.type === "CREDIT" ? "+" : "-"}
                              {formatCurrency(Number(entry.amount))}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </details>
                </article>
              );
            })}
          </section>

          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Colaborador</th>
                  <th className="px-4 py-3">Legajo</th>
                  <th className="px-4 py-3 text-right">Saldo actual</th>
                  <th className="px-4 py-3">Movimientos</th>
                  <th className="px-4 py-3">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workers.map((worker) => {
                  const balance = calculateBalance(worker.balanceEntries);
                  return (
                    <tr key={worker.id} className="align-top hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{worker.name}</div>
                        <div className="text-xs text-slate-500">{worker.province ?? "-"}</div>
                      </td>
                      <td className="px-4 py-3">{worker.legajo}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {formatCurrency(balance)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {worker.balanceEntries.length} movimiento(s)
                      </td>
                      <td className="px-4 py-3">
                        <details className="text-xs text-slate-600">
                          <summary className="min-h-10 cursor-pointer rounded-full border border-slate-200 px-4 py-2 text-center font-semibold uppercase tracking-wide">
                            Ver detalle
                          </summary>
                          <div className="mt-2 min-w-64 space-y-2 rounded-xl bg-slate-50 p-3">
                            {worker.balanceEntries.length === 0 ? (
                              <p>Sin movimientos registrados.</p>
                            ) : (
                              worker.balanceEntries.map((entry) => (
                                <div key={entry.id} className="flex justify-between gap-3">
                                  <span>{entry.reason}</span>
                                  <span className="font-semibold">
                                    {entry.type === "CREDIT" ? "+" : "-"}
                                    {formatCurrency(Number(entry.amount))}
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
        </>
      )}
    </div>
  );
}
