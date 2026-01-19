import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";

export default async function ColaboradoresPage() {
  const workers = await prisma.worker.findMany({
    orderBy: { name: "asc" },
    include: { balanceEntries: true },
  });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-semibold text-slate-900">Colaboradores</h2>
        <p className="mt-1 text-sm text-slate-600">
          Cuenta corriente y saldo actualizado por trabajador.
        </p>
      </header>

      {workers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No hay colaboradores registrados.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
              {workers.map((worker) => {
                const balance = worker.balanceEntries.reduce((sum, entry) => {
                  const amount = Number(entry.amount);
                  return entry.type === "CREDIT" ? sum + amount : sum - amount;
                }, 0);

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
                                  {entry.type === "CREDIT" ? "A favor" : "Deudor"}
                                </span>
                                <span className="text-slate-500">
                                  {Number(entry.amount).toLocaleString("es-AR", {
                                    style: "currency",
                                    currency: "ARS",
                                  })}
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
  );
}

