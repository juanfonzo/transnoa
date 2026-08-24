import Link from "next/link";
import type { AdjustmentStatus, CorrectionStatus } from "@prisma/client";
import { KpiStrip } from "@/components/KpiStrip";
import { RoleAccessNotice } from "@/components/RoleAccessNotice";
import { getDemoRole } from "@/lib/demo-auth";
import { formatCurrency, formatDate, formatDateOnly } from "@/lib/format";
import {
  getBalanceReport,
  getCorrectionReport,
  getReportFilterOptions,
  getRetroactiveReport,
  type BalanceReportRow,
  type CorrectionReportRow,
  type ReportFilterOptions,
  type RetroactiveReportRow,
} from "@/lib/report-data";
import {
  buildReportSearchParams,
  hasActiveReportFilters,
  parseReportFilters,
  type ReportFilters,
  type ReportTab,
} from "@/lib/report-filters";

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

type Tone = "slate" | "sky" | "amber" | "emerald" | "rose";

const reportTabs: Array<{
  id: ReportTab;
  label: string;
  description: string;
}> = [
  {
    id: "saldos",
    label: "Saldos",
    description: "Cuenta corriente vigente por colaborador.",
  },
  {
    id: "correcciones",
    label: "Correcciones",
    description: "Observaciones y estado de resolución.",
  },
  {
    id: "retroactivos",
    label: "Retroactivos",
    description: "Diferencias calculadas y su aplicación.",
  },
];

const correctionMeta: Record<
  CorrectionStatus,
  { label: string; tone: Tone }
> = {
  OPEN: { label: "Abierta", tone: "rose" },
  RESOLVED: { label: "Resuelta", tone: "emerald" },
  CANCELLED: { label: "Anulada", tone: "slate" },
};

const adjustmentMeta: Record<
  AdjustmentStatus,
  { label: string; tone: Tone }
> = {
  DRAFT: { label: "Borrador", tone: "slate" },
  PENDING_SIGNATURE: { label: "Pendiente de firma", tone: "amber" },
  READY_FOR_PAYMENT: { label: "Listo para pagar", tone: "sky" },
  PAID: { label: "Pagado", tone: "emerald" },
  CANCELLED: { label: "Anulado", tone: "rose" },
};

const toneClasses: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700",
  sky: "bg-sky-100 text-sky-800",
  amber: "bg-amber-100 text-amber-800",
  emerald: "bg-emerald-100 text-emerald-800",
  rose: "bg-rose-100 text-rose-800",
};

const inputClasses =
  "mt-1 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";

function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}

function FilterActions({ filters }: { filters: ReportFilters }) {
  return (
    <div
      className={`flex items-end gap-2 md:col-span-2 ${
        filters.tab === "saldos" ? "xl:col-span-2" : "xl:col-span-1"
      }`}
    >
      <button
        type="submit"
        className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        Aplicar
      </button>
      {hasActiveReportFilters(filters) && (
        <Link
          href={`/reportes?tab=${filters.tab}`}
          className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-400 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          Limpiar
        </Link>
      )}
    </div>
  );
}

function ReportFiltersForm({
  filters,
  options,
}: {
  filters: ReportFilters;
  options: ReportFilterOptions;
}) {
  return (
    <form
      method="get"
      aria-label={`Filtros del reporte de ${filters.tab}`}
      className={`grid gap-3 border-y border-slate-200 py-4 md:grid-cols-2 ${
        filters.tab === "correcciones"
          ? "xl:grid-cols-8"
          : filters.tab === "retroactivos"
            ? "xl:grid-cols-7"
            : "xl:grid-cols-6"
      }`}
    >
      <input type="hidden" name="tab" value={filters.tab} />

      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 xl:col-span-2">
        Colaborador
        <select
          name="colaborador"
          defaultValue={filters.workerId}
          className={inputClasses}
        >
          <option value="">Todos</option>
          {options.workers.map((worker) => (
            <option key={worker.id} value={worker.id}>
              {worker.name} · {worker.legajo}
            </option>
          ))}
        </select>
      </label>

      {filters.tab === "saldos" && (
        <>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 xl:col-span-2">
            Situación
            <select
              name="saldo"
              defaultValue={filters.balanceState}
              className={inputClasses}
            >
              <option value="">Todas</option>
              <option value="A_FAVOR">Saldo a favor</option>
              <option value="DEUDOR">Saldo deudor</option>
              <option value="SIN_SALDO">Sin saldo</option>
            </select>
          </label>
          <FilterActions filters={filters} />
        </>
      )}

      {filters.tab === "correcciones" && (
        <>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Estado
            <select
              name="estado"
              defaultValue={filters.correctionStatus}
              className={inputClasses}
            >
              <option value="">Todos</option>
              <option value="OPEN">Abierta</option>
              <option value="RESOLVED">Resuelta</option>
              <option value="CANCELLED">Anulada</option>
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Área
            <select
              name="area"
              defaultValue={filters.areaId}
              className={inputClasses}
            >
              <option value="">Todas</option>
              {options.areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Lote
            <input
              name="lote"
              defaultValue={filters.lot}
              placeholder="L-2026-100"
              className={inputClasses}
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Solicitada desde
            <input
              type="date"
              name="desde"
              defaultValue={filters.from}
              className={inputClasses}
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Solicitada hasta
            <input
              type="date"
              name="hasta"
              defaultValue={filters.to}
              className={inputClasses}
            />
          </label>
          <FilterActions filters={filters} />
        </>
      )}

      {filters.tab === "retroactivos" && (
        <>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Período
            <select
              name="periodo"
              defaultValue={filters.period}
              className={inputClasses}
            >
              <option value="">Todos</option>
              {options.periods.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Estado
            <select
              name="estado"
              defaultValue={filters.adjustmentStatus}
              className={inputClasses}
            >
              <option value="">Todos</option>
              <option value="DRAFT">Borrador</option>
              <option value="PENDING_SIGNATURE">Pendiente de firma</option>
              <option value="READY_FOR_PAYMENT">Listo para pagar</option>
              <option value="PAID">Pagado</option>
              <option value="CANCELLED">Anulado</option>
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Vigencia desde
            <input
              type="date"
              name="desde"
              defaultValue={filters.from}
              className={inputClasses}
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Vigencia hasta
            <input
              type="date"
              name="hasta"
              defaultValue={filters.to}
              className={inputClasses}
            />
          </label>
          <FilterActions filters={filters} />
        </>
      )}
    </form>
  );
}

function ReportPagination({
  filters,
  page,
  totalPages,
  total,
}: {
  filters: ReportFilters;
  page: number;
  totalPages: number;
  total: number;
}) {
  if (total === 0) return null;

  const previous = buildReportSearchParams(filters, { page: page - 1 });
  const next = buildReportSearchParams(filters, { page: page + 1 });

  return (
    <nav
      aria-label="Paginación del reporte"
      className="flex flex-col gap-3 border-t border-slate-200 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"
    >
      <span>
        Página {page} de {totalPages} · {total} {total === 1 ? "registro" : "registros"}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={`/reportes?${previous.toString()}`}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 px-4 text-xs font-semibold uppercase tracking-wide text-slate-700 hover:border-slate-400"
          >
            Anterior
          </Link>
        ) : (
          <span className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-100 px-4 text-xs font-semibold uppercase tracking-wide text-slate-300">
            Anterior
          </span>
        )}
        {page < totalPages ? (
          <Link
            href={`/reportes?${next.toString()}`}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 px-4 text-xs font-semibold uppercase tracking-wide text-slate-700 hover:border-slate-400"
          >
            Siguiente
          </Link>
        ) : (
          <span className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-100 px-4 text-xs font-semibold uppercase tracking-wide text-slate-300">
            Siguiente
          </span>
        )}
      </div>
    </nav>
  );
}

function EmptyReport({ filters }: { filters: ReportFilters }) {
  const filtered = hasActiveReportFilters(filters);
  return (
    <div className="border-y border-dashed border-slate-200 py-10 text-center">
      <p className="text-sm font-medium text-slate-700">
        {filtered
          ? "No encontramos registros con estos filtros."
          : "Todavía no hay información para este reporte."}
      </p>
      {filtered && (
        <Link
          href={`/reportes?tab=${filters.tab}`}
          className="mt-3 inline-flex text-xs font-semibold uppercase tracking-wide text-slate-600 underline decoration-slate-300 underline-offset-4"
        >
          Limpiar filtros
        </Link>
      )}
    </div>
  );
}

function balanceSituation(balance: number) {
  if (balance > 0) return { label: "A favor", tone: "emerald" as const };
  if (balance < 0) return { label: "Deudor", tone: "rose" as const };
  return { label: "Sin saldo", tone: "slate" as const };
}

function BalanceRowsMobile({ rows }: { rows: BalanceReportRow[] }) {
  return (
    <div className="divide-y divide-slate-200 border-y border-slate-200 xl:hidden">
      {rows.map((row) => {
        const situation = balanceSituation(row.balance);
        return (
          <article key={row.workerId} className="space-y-3 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-950">{row.workerName}</h3>
                <p className="text-xs text-slate-500">Legajo {row.legajo}</p>
              </div>
              <StatusPill label={situation.label} tone={situation.tone} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Saldo actual</dt>
                <dd className="font-semibold text-slate-900">
                  {formatCurrency(Math.abs(row.balance))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Movimientos</dt>
                <dd className="font-medium text-slate-900">{row.movements}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Créditos</dt>
                <dd>{formatCurrency(row.credits)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Débitos</dt>
                <dd>{formatCurrency(row.debits)}</dd>
              </div>
            </dl>
            <p className="text-xs text-slate-500">
              Último movimiento: {formatDate(row.lastMovementAt)}
            </p>
          </article>
        );
      })}
    </div>
  );
}

function BalanceTable({ rows }: { rows: BalanceReportRow[] }) {
  return (
    <div className="hidden overflow-x-auto border-y border-slate-200 xl:block">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Colaborador</th>
            <th className="px-4 py-3 text-right">Créditos</th>
            <th className="px-4 py-3 text-right">Débitos</th>
            <th className="px-4 py-3">Saldo actual</th>
            <th className="px-4 py-3 text-center">Movimientos</th>
            <th className="px-4 py-3">Último movimiento</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((row) => {
            const situation = balanceSituation(row.balance);
            return (
              <tr key={row.workerId} className="align-middle">
                <td className="px-4 py-4">
                  <span className="font-semibold text-slate-950">{row.workerName}</span>
                  <span className="block text-xs text-slate-500">
                    Legajo {row.legajo}{row.province ? ` · ${row.province}` : ""}
                  </span>
                </td>
                <td className="px-4 py-4 text-right font-medium text-slate-700">
                  {formatCurrency(row.credits)}
                </td>
                <td className="px-4 py-4 text-right font-medium text-slate-700">
                  {formatCurrency(row.debits)}
                </td>
                <td className="px-4 py-4">
                  <span className="mr-2 font-semibold text-slate-950">
                    {formatCurrency(Math.abs(row.balance))}
                  </span>
                  <StatusPill label={situation.label} tone={situation.tone} />
                </td>
                <td className="px-4 py-4 text-center text-slate-700">{row.movements}</td>
                <td className="px-4 py-4 text-slate-600">{formatDate(row.lastMovementAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CorrectionRowsMobile({ rows }: { rows: CorrectionReportRow[] }) {
  return (
    <div className="divide-y divide-slate-200 border-y border-slate-200 xl:hidden">
      {rows.map((row) => {
        const meta = correctionMeta[row.status];
        return (
          <article key={row.id} className="space-y-3 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-950">{row.requestNumber}</h3>
                <p className="text-xs text-slate-500">
                  {row.areaName} · v{row.versionNumber}
                </p>
              </div>
              <StatusPill label={meta.label} tone={meta.tone} />
            </div>
            <p className="text-sm leading-6 text-slate-700">{row.reason}</p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Lote</dt>
                <dd>{row.lotNumber ?? "Sin lote"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Importe</dt>
                <dd className="font-semibold">{formatCurrency(row.totalAmount)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Solicitada</dt>
                <dd>{formatDate(row.requestedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Fecha sugerida</dt>
                <dd>{formatDateOnly(row.suggestedPaymentDate)}</dd>
              </div>
            </dl>
            <Link
              href={`/solicitudes/${row.requestId}`}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 px-4 text-xs font-semibold uppercase tracking-wide text-slate-700"
            >
              Ver caso
            </Link>
          </article>
        );
      })}
    </div>
  );
}

function CorrectionTable({ rows }: { rows: CorrectionReportRow[] }) {
  return (
    <div className="hidden overflow-x-auto border-y border-slate-200 xl:block">
      <table className="w-full min-w-[1100px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Solicitud</th>
            <th className="px-4 py-3">Área / colaboradores</th>
            <th className="px-4 py-3">Lote</th>
            <th className="px-4 py-3 text-right">Importe</th>
            <th className="px-4 py-3">Observación</th>
            <th className="px-4 py-3">Fechas</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((row) => {
            const meta = correctionMeta[row.status];
            return (
              <tr key={row.id} className="align-top">
                <td className="px-4 py-4">
                  <span className="font-semibold text-slate-950">{row.requestNumber}</span>
                  <span className="block text-xs text-slate-500">Versión {row.versionNumber}</span>
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {row.areaName}
                  <span className="block max-w-52 truncate text-xs text-slate-500" title={row.workers.join(", ")}>
                    {row.workers.join(", ") || "Sin colaboradores"}
                  </span>
                </td>
                <td className="px-4 py-4 text-slate-700">{row.lotNumber ?? "Sin lote"}</td>
                <td className="px-4 py-4 text-right font-semibold text-slate-950">
                  {formatCurrency(row.totalAmount)}
                </td>
                <td className="max-w-72 px-4 py-4 text-slate-700">
                  <p className="line-clamp-2" title={row.reason}>{row.reason}</p>
                  <span className="mt-1 block text-xs text-slate-500">Por {row.requestedBy}</span>
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {formatDate(row.requestedAt)}
                  <span className="block text-xs text-slate-500">
                    Sugerida: {formatDateOnly(row.suggestedPaymentDate)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <StatusPill label={meta.label} tone={meta.tone} />
                </td>
                <td className="px-4 py-4">
                  <Link
                    href={`/solicitudes/${row.requestId}`}
                    className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-full border border-slate-200 px-4 text-xs font-semibold uppercase tracking-wide text-slate-700 hover:border-slate-400"
                  >
                    Ver caso
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RetroactiveRowsMobile({ rows }: { rows: RetroactiveReportRow[] }) {
  return (
    <div className="divide-y divide-slate-200 border-y border-slate-200 xl:hidden">
      {rows.map((row) => {
        const meta = adjustmentMeta[row.status];
        return (
          <article key={row.id} className="space-y-3 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-950">{row.workerName}</h3>
                <p className="text-xs text-slate-500">
                  {row.workerLegajo} · {row.period}
                </p>
              </div>
              <StatusPill label={meta.label} tone={meta.tone} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Diferencia</dt>
                <dd className="font-semibold">{formatCurrency(row.amountDiff)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Días afectados</dt>
                <dd>{row.daysAffected.toLocaleString("es-AR")}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Valor diario</dt>
                <dd>{formatCurrency(row.oldAmount)} → {formatCurrency(row.newAmount)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Vigencia</dt>
                <dd>{formatDateOnly(row.effectiveFromDate)}</dd>
              </div>
            </dl>
            {row.requestId ? (
              <Link
                href={`/solicitudes/${row.requestId}`}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 px-4 text-xs font-semibold uppercase tracking-wide text-slate-700"
              >
                Ver aplicación · {row.requestNumber}
              </Link>
            ) : (
              <p className="text-xs text-slate-500">Aún sin pago asociado.</p>
            )}
          </article>
        );
      })}
    </div>
  );
}

function RetroactiveTable({ rows }: { rows: RetroactiveReportRow[] }) {
  return (
    <div className="hidden overflow-x-auto border-y border-slate-200 xl:block">
      <table className="w-full min-w-[1050px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Período</th>
            <th className="px-4 py-3">Colaborador</th>
            <th className="px-4 py-3">Valor diario</th>
            <th className="px-4 py-3 text-right">Días</th>
            <th className="px-4 py-3 text-right">Diferencia</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Aplicación</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((row) => {
            const meta = adjustmentMeta[row.status];
            return (
              <tr key={row.id} className="align-middle">
                <td className="px-4 py-4">
                  <span className="font-semibold text-slate-950">{row.period}</span>
                  <span className="block text-xs text-slate-500">
                    Desde {formatDateOnly(row.effectiveFromDate)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="font-medium text-slate-900">{row.workerName}</span>
                  <span className="block text-xs text-slate-500">Legajo {row.workerLegajo}</span>
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {formatCurrency(row.oldAmount)} → {formatCurrency(row.newAmount)}
                </td>
                <td className="px-4 py-4 text-right text-slate-700">
                  {row.daysAffected.toLocaleString("es-AR")}
                </td>
                <td className="px-4 py-4 text-right font-semibold text-slate-950">
                  {formatCurrency(row.amountDiff)}
                </td>
                <td className="px-4 py-4">
                  <StatusPill label={meta.label} tone={meta.tone} />
                </td>
                <td className="px-4 py-4">
                  {row.requestId ? (
                    <Link
                      href={`/solicitudes/${row.requestId}`}
                      className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-full border border-slate-200 px-4 text-xs font-semibold uppercase tracking-wide text-slate-700 hover:border-slate-400"
                    >
                      {row.requestNumber ?? "Ver aplicación"}
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-500">Sin pago asociado</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function ReportesPage({ searchParams }: PageProps) {
  const role = await getDemoRole();
  if (role !== "TESORERIA" && role !== "ADMIN") {
    return (
      <RoleAccessNotice
        currentRole={role}
        allowedRoles={["ADMIN", "TESORERIA"]}
      />
    );
  }

  const resolvedSearchParams = await searchParams;
  const filters = parseReportFilters(resolvedSearchParams);
  const [options, reportState] = await Promise.all([
    getReportFilterOptions(),
    filters.tab === "saldos"
      ? getBalanceReport(filters).then((data) => ({ tab: "saldos" as const, data }))
      : filters.tab === "correcciones"
        ? getCorrectionReport(filters).then((data) => ({ tab: "correcciones" as const, data }))
        : getRetroactiveReport(filters).then((data) => ({ tab: "retroactivos" as const, data })),
  ]);

  const exportQuery = buildReportSearchParams(filters, { page: undefined });
  const activeMeta = reportTabs.find((tab) => tab.id === filters.tab) ?? reportTabs[0];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Control y conciliación
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Reportes</h1>
          <p className="mt-1 text-sm text-slate-600">
            Consultá saldos, observaciones y diferencias retroactivas con trazabilidad.
          </p>
        </div>
        <Link
          href={role === "TESORERIA" ? "/tesoreria" : "/administracion"}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-400 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          {role === "TESORERIA" ? "Volver a Tesorería" : "Volver a Administración"}
        </Link>
      </header>

      <nav aria-label="Tipos de reporte" className="flex gap-1 overflow-x-auto pb-1 sm:gap-2">
        {reportTabs.map((tab) => {
          const active = tab.id === filters.tab;
          return (
            <Link
              key={tab.id}
              href={`/reportes?tab=${tab.id}`}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-10 shrink-0 items-center justify-center rounded-full px-3 text-[11px] font-semibold uppercase tracking-wide transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 sm:px-4 sm:text-xs ${
                active
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <section className="space-y-4" aria-labelledby="active-report-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="active-report-title" className="text-xl font-semibold text-slate-950">
              {activeMeta.label}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{activeMeta.description}</p>
          </div>
          <a
            href={`/reportes/export/${filters.tab}?${exportQuery.toString()}`}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-slate-900 px-4 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            <span aria-hidden="true">↓</span>
            Exportar vista
          </a>
        </div>

        <ReportFiltersForm filters={filters} options={options} />

        {reportState.tab === "saldos" && (
          <>
            <KpiStrip
              label="Indicadores del reporte de saldos"
              items={[
                { label: "Colaboradores", value: reportState.data.summary.workers, tone: "slate" },
                { label: "Saldos a favor", value: formatCurrency(reportState.data.summary.creditAmount), tone: "emerald", valueClassName: "text-xl" },
                { label: "Saldos deudores", value: formatCurrency(reportState.data.summary.debtAmount), tone: "rose", valueClassName: "text-xl" },
                { label: "Saldo neto", value: formatCurrency(reportState.data.summary.netBalance), tone: "sky", valueClassName: "text-xl" },
              ]}
            />
            {reportState.data.rows.length === 0 ? (
              <EmptyReport filters={filters} />
            ) : (
              <>
                <BalanceRowsMobile rows={reportState.data.rows} />
                <BalanceTable rows={reportState.data.rows} />
              </>
            )}
            <ReportPagination
              filters={filters}
              page={reportState.data.page}
              totalPages={reportState.data.totalPages}
              total={reportState.data.total}
            />
          </>
        )}

        {reportState.tab === "correcciones" && (
          <>
            <KpiStrip
              label="Indicadores del reporte de correcciones"
              items={[
                { label: "Correcciones", value: reportState.data.summary.total, tone: "slate" },
                { label: "Abiertas", value: reportState.data.summary.open, tone: "rose" },
                { label: "Resueltas", value: reportState.data.summary.resolved, tone: "emerald" },
                { label: "Anuladas", value: reportState.data.summary.cancelled, tone: "slate" },
              ]}
            />
            {reportState.data.rows.length === 0 ? (
              <EmptyReport filters={filters} />
            ) : (
              <>
                <CorrectionRowsMobile rows={reportState.data.rows} />
                <CorrectionTable rows={reportState.data.rows} />
              </>
            )}
            <ReportPagination
              filters={filters}
              page={reportState.data.page}
              totalPages={reportState.data.totalPages}
              total={reportState.data.total}
            />
          </>
        )}

        {reportState.tab === "retroactivos" && (
          <>
            <KpiStrip
              label="Indicadores del reporte de retroactivos"
              items={[
                { label: "Ajustes", value: reportState.data.summary.items, tone: "slate" },
                { label: "Diferencia total", value: formatCurrency(reportState.data.summary.amount), tone: "emerald", valueClassName: "text-xl" },
                { label: "Días recalculados", value: reportState.data.summary.days.toLocaleString("es-AR"), tone: "sky" },
              ]}
            />
            {reportState.data.rows.length === 0 ? (
              <EmptyReport filters={filters} />
            ) : (
              <>
                <RetroactiveRowsMobile rows={reportState.data.rows} />
                <RetroactiveTable rows={reportState.data.rows} />
              </>
            )}
            <ReportPagination
              filters={filters}
              page={reportState.data.page}
              totalPages={reportState.data.totalPages}
              total={reportState.data.total}
            />
          </>
        )}
      </section>

      <details className="group border-y border-slate-200 py-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
          <span className="flex items-center justify-between gap-4">
            Otras exportaciones operativas
            <span aria-hidden="true" className="text-slate-400 transition group-open:rotate-45">＋</span>
          </span>
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ["Solicitudes", "/reportes/export/solicitudes"],
            ["Pagos", "/reportes/export/pagos"],
            ["Viáticos pagados", "/reportes/export/viaticos-pagados"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="inline-flex min-h-10 items-center justify-between border-b border-slate-200 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-950"
            >
              {label}
              <span aria-hidden="true">↓</span>
            </a>
          ))}
        </div>
      </details>
    </div>
  );
}
