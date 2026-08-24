export const REPORT_PAGE_SIZE = 8;

export const reportTabs = ["saldos", "correcciones", "retroactivos"] as const;
export type ReportTab = (typeof reportTabs)[number];

export const balanceStates = ["A_FAVOR", "DEUDOR", "SIN_SALDO"] as const;
export type BalanceState = (typeof balanceStates)[number];

export const correctionStatuses = ["OPEN", "RESOLVED", "CANCELLED"] as const;
export type ReportCorrectionStatus = (typeof correctionStatuses)[number];

export const adjustmentStatuses = [
  "DRAFT",
  "PENDING_SIGNATURE",
  "READY_FOR_PAYMENT",
  "PAID",
  "CANCELLED",
] as const;
export type ReportAdjustmentStatus = (typeof adjustmentStatuses)[number];

type SearchParamsInput =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | undefined;

export type ReportFilters = {
  tab: ReportTab;
  page: number;
  workerId: string;
  balanceState: BalanceState | "";
  correctionStatus: ReportCorrectionStatus | "";
  adjustmentStatus: ReportAdjustmentStatus | "";
  areaId: string;
  lot: string;
  period: string;
  from: string;
  to: string;
};

type FilterOverride = Partial<{
  tab: ReportTab;
  page: number | undefined;
  workerId: string | undefined;
  balanceState: BalanceState | "" | undefined;
  correctionStatus: ReportCorrectionStatus | "" | undefined;
  adjustmentStatus: ReportAdjustmentStatus | "" | undefined;
  areaId: string | undefined;
  lot: string | undefined;
  period: string | undefined;
  from: string | undefined;
  to: string | undefined;
}>;

function firstValue(input: SearchParamsInput, key: string) {
  const raw = input instanceof URLSearchParams ? input.get(key) : input?.[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value.trim() : "";
}

function limitedText(value: string, maxLength = 80) {
  return value.slice(0, maxLength);
}

function enumValue<T extends string>(value: string, values: readonly T[]) {
  return values.includes(value as T) ? (value as T) : "";
}

function dateOnlyValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "";

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? value
    : "";
}

export function parseReportFilters(input: SearchParamsInput): ReportFilters {
  const requestedPage = Number.parseInt(firstValue(input, "pagina"), 10);

  return {
    tab: enumValue(firstValue(input, "tab"), reportTabs) || "saldos",
    page:
      Number.isSafeInteger(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1,
    workerId: limitedText(firstValue(input, "colaborador")),
    balanceState: enumValue(firstValue(input, "saldo"), balanceStates),
    correctionStatus: enumValue(
      firstValue(input, "estado"),
      correctionStatuses,
    ),
    adjustmentStatus: enumValue(
      firstValue(input, "estado"),
      adjustmentStatuses,
    ),
    areaId: limitedText(firstValue(input, "area")),
    lot: limitedText(firstValue(input, "lote")),
    period: limitedText(firstValue(input, "periodo")),
    from: dateOnlyValue(firstValue(input, "desde")),
    to: dateOnlyValue(firstValue(input, "hasta")),
  };
}

export function buildReportSearchParams(
  filters: ReportFilters,
  override: FilterOverride = {},
) {
  const values = { ...filters, ...override };
  const query = new URLSearchParams();

  query.set("tab", values.tab);
  if (values.page && values.page > 1) query.set("pagina", String(values.page));
  if (values.workerId) query.set("colaborador", values.workerId);
  if (values.areaId) query.set("area", values.areaId);
  if (values.lot) query.set("lote", values.lot);
  if (values.period) query.set("periodo", values.period);
  if (values.from) query.set("desde", values.from);
  if (values.to) query.set("hasta", values.to);

  if (values.tab === "saldos" && values.balanceState) {
    query.set("saldo", values.balanceState);
  }
  if (values.tab === "correcciones" && values.correctionStatus) {
    query.set("estado", values.correctionStatus);
  }
  if (values.tab === "retroactivos" && values.adjustmentStatus) {
    query.set("estado", values.adjustmentStatus);
  }

  return query;
}

export function hasActiveReportFilters(filters: ReportFilters) {
  if (filters.tab === "saldos") {
    return Boolean(filters.workerId || filters.balanceState);
  }

  if (filters.tab === "correcciones") {
    return Boolean(
      filters.workerId ||
        filters.correctionStatus ||
        filters.areaId ||
        filters.lot ||
        filters.from ||
        filters.to,
    );
  }

  return Boolean(
    filters.workerId ||
      filters.adjustmentStatus ||
      filters.period ||
      filters.from ||
      filters.to,
  );
}
