import {
  AdjustmentStatus,
  CorrectionStatus,
  Prisma,
} from "@prisma/client";
import { addDateOnlyDays, parseDateOnly } from "@/lib/date-only";
import { prisma } from "@/lib/prisma";
import {
  REPORT_PAGE_SIZE,
  type ReportFilters,
} from "@/lib/report-filters";

export type ReportFilterOptions = {
  workers: Array<{ id: string; legajo: string; name: string }>;
  areas: Array<{ id: string; name: string }>;
  periods: string[];
};

export type BalanceReportRow = {
  workerId: string;
  legajo: string;
  workerName: string;
  province: string | null;
  credits: number;
  debits: number;
  balance: number;
  movements: number;
  lastMovementAt: Date | null;
};

export type CorrectionReportRow = {
  id: string;
  requestId: string;
  requestNumber: string;
  areaName: string;
  versionNumber: number;
  lotNumber: string | null;
  workers: string[];
  totalAmount: number;
  requestedAt: Date;
  requestedBy: string;
  reason: string;
  suggestedPaymentDate: Date | null;
  status: CorrectionStatus;
};

export type RetroactiveReportRow = {
  id: string;
  period: string;
  effectiveFromDate: Date;
  oldAmount: number;
  newAmount: number;
  workerId: string;
  workerLegajo: string;
  workerName: string;
  daysAffected: number;
  amountDiff: number;
  status: AdjustmentStatus;
  paymentReference: string | null;
  requestId: string | null;
  requestNumber: string | null;
};

export type PaginatedReport<T> = {
  rows: T[];
  total: number;
  page: number;
  totalPages: number;
};

export type BalanceReport = PaginatedReport<BalanceReportRow> & {
  summary: {
    workers: number;
    creditAmount: number;
    debtAmount: number;
    netBalance: number;
  };
};

export type CorrectionReport = PaginatedReport<CorrectionReportRow> & {
  summary: {
    total: number;
    open: number;
    resolved: number;
    cancelled: number;
  };
};

export type RetroactiveReport = PaginatedReport<RetroactiveReportRow> & {
  summary: {
    items: number;
    amount: number;
    days: number;
  };
};

type RawBalanceRow = {
  workerId: string;
  legajo: string;
  workerName: string;
  province: string | null;
  credits: Prisma.Decimal;
  debits: Prisma.Decimal;
  balance: Prisma.Decimal;
  movements: number;
  lastMovementAt: Date | null;
};

type RawBalanceSummary = {
  workers: number;
  creditAmount: Prisma.Decimal;
  debtAmount: Prisma.Decimal;
  netBalance: Prisma.Decimal;
};

function totalPages(total: number) {
  return Math.max(1, Math.ceil(total / REPORT_PAGE_SIZE));
}

function currentPage(requestedPage: number, total: number) {
  return Math.min(requestedPage, totalPages(total));
}

function dateRange(from: string, to: string) {
  const start = parseDateOnly(from);
  const end = parseDateOnly(to);

  return {
    ...(start ? { gte: start } : {}),
    ...(end ? { lt: addDateOnlyDays(end, 1) } : {}),
  };
}

function balanceGroupedQuery(filters: ReportFilters) {
  const workerFilter = filters.workerId
    ? Prisma.sql`WHERE w.id = ${filters.workerId}`
    : Prisma.empty;

  const signedBalance = Prisma.sql`COALESCE(SUM(CASE WHEN ledger.type = 'CREDIT' THEN ledger.amount ELSE -ledger.amount END), 0)`;
  const having =
    filters.balanceState === "A_FAVOR"
      ? Prisma.sql`HAVING ${signedBalance} > 0`
      : filters.balanceState === "DEUDOR"
        ? Prisma.sql`HAVING ${signedBalance} < 0`
        : filters.balanceState === "SIN_SALDO"
          ? Prisma.sql`HAVING ${signedBalance} = 0`
          : Prisma.empty;

  return Prisma.sql`
    SELECT
      w.id AS "workerId",
      w.legajo,
      w.name AS "workerName",
      w.province,
      COALESCE(SUM(CASE WHEN ledger.type = 'CREDIT' THEN ledger.amount ELSE 0 END), 0)::numeric AS credits,
      COALESCE(SUM(CASE WHEN ledger.type = 'DEBIT' THEN ledger.amount ELSE 0 END), 0)::numeric AS debits,
      ${signedBalance}::numeric AS balance,
      COUNT(ledger.id)::int AS movements,
      MAX(ledger."createdAt") AS "lastMovementAt"
    FROM "Worker" w
    LEFT JOIN "WorkerViaticBalanceLedger" ledger ON ledger."workerId" = w.id
    ${workerFilter}
    GROUP BY w.id, w.legajo, w.name, w.province
    ${having}
  `;
}

function mapBalanceRows(rows: RawBalanceRow[]): BalanceReportRow[] {
  return rows.map((row) => ({
    ...row,
    credits: Number(row.credits),
    debits: Number(row.debits),
    balance: Number(row.balance),
  }));
}

async function findBalanceRows(
  filters: ReportFilters,
  pagination?: { skip: number; take: number },
) {
  const grouped = balanceGroupedQuery(filters);
  const pageClause = pagination
    ? Prisma.sql`LIMIT ${pagination.take} OFFSET ${pagination.skip}`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<RawBalanceRow[]>(Prisma.sql`
    SELECT *
    FROM (${grouped}) balances
    ORDER BY ABS(balance) DESC, "workerName" ASC, "workerId" ASC
    ${pageClause}
  `);

  return mapBalanceRows(rows);
}

export async function getBalanceReport(
  filters: ReportFilters,
): Promise<BalanceReport> {
  const grouped = balanceGroupedQuery(filters);
  const [summaryRow] = await prisma.$queryRaw<RawBalanceSummary[]>(Prisma.sql`
    SELECT
      COUNT(*)::int AS workers,
      COALESCE(SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END), 0)::numeric AS "creditAmount",
      ABS(COALESCE(SUM(CASE WHEN balance < 0 THEN balance ELSE 0 END), 0))::numeric AS "debtAmount",
      COALESCE(SUM(balance), 0)::numeric AS "netBalance"
    FROM (${grouped}) balances
  `);

  const total = summaryRow?.workers ?? 0;
  const page = currentPage(filters.page, total);
  const rows = await findBalanceRows(filters, {
    skip: (page - 1) * REPORT_PAGE_SIZE,
    take: REPORT_PAGE_SIZE,
  });

  return {
    rows,
    total,
    page,
    totalPages: totalPages(total),
    summary: {
      workers: total,
      creditAmount: Number(summaryRow?.creditAmount ?? 0),
      debtAmount: Number(summaryRow?.debtAmount ?? 0),
      netBalance: Number(summaryRow?.netBalance ?? 0),
    },
  };
}

function correctionWhere(filters: ReportFilters): Prisma.CorrectionRequestWhereInput {
  const requestedAt = dateRange(filters.from, filters.to);

  return {
    ...(filters.correctionStatus
      ? { status: filters.correctionStatus as CorrectionStatus }
      : {}),
    ...(Object.keys(requestedAt).length > 0 ? { requestedAt } : {}),
    requestVersion: {
      ...(filters.lot
        ? { loteNumber: { contains: filters.lot, mode: "insensitive" } }
        : {}),
      ...(filters.workerId
        ? { workers: { some: { workerId: filters.workerId } } }
        : {}),
      ...(filters.areaId ? { request: { areaId: filters.areaId } } : {}),
    },
  };
}

const correctionSelect = {
  id: true,
  requestedAt: true,
  reason: true,
  suggestedPaymentDate: true,
  status: true,
  requestedBy: { select: { name: true } },
  requestVersion: {
    select: {
      versionNumber: true,
      loteNumber: true,
      workers: {
        select: {
          netAmount: true,
          worker: { select: { name: true } },
        },
        orderBy: { worker: { name: "asc" as const } },
      },
      request: {
        select: {
          id: true,
          requestNumber: true,
          area: { select: { name: true } },
        },
      },
    },
  },
} satisfies Prisma.CorrectionRequestSelect;

type CorrectionRecord = Prisma.CorrectionRequestGetPayload<{
  select: typeof correctionSelect;
}>;

function mapCorrectionRows(rows: CorrectionRecord[]): CorrectionReportRow[] {
  return rows.map((row) => ({
    id: row.id,
    requestId: row.requestVersion.request.id,
    requestNumber: row.requestVersion.request.requestNumber,
    areaName: row.requestVersion.request.area.name,
    versionNumber: row.requestVersion.versionNumber,
    lotNumber: row.requestVersion.loteNumber,
    workers: row.requestVersion.workers.map((entry) => entry.worker.name),
    totalAmount: row.requestVersion.workers.reduce(
      (sum, entry) => sum + Number(entry.netAmount),
      0,
    ),
    requestedAt: row.requestedAt,
    requestedBy: row.requestedBy.name,
    reason: row.reason,
    suggestedPaymentDate: row.suggestedPaymentDate,
    status: row.status,
  }));
}

async function findCorrectionRows(
  filters: ReportFilters,
  pagination?: { skip: number; take: number },
) {
  const rows = await prisma.correctionRequest.findMany({
    where: correctionWhere(filters),
    select: correctionSelect,
    orderBy: [{ requestedAt: "desc" }, { id: "desc" }],
    ...(pagination ?? {}),
  });

  return mapCorrectionRows(rows);
}

export async function getCorrectionReport(
  filters: ReportFilters,
): Promise<CorrectionReport> {
  const where = correctionWhere(filters);
  const [total, grouped] = await Promise.all([
    prisma.correctionRequest.count({ where }),
    prisma.correctionRequest.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
  ]);
  const page = currentPage(filters.page, total);
  const rows = await findCorrectionRows(filters, {
    skip: (page - 1) * REPORT_PAGE_SIZE,
    take: REPORT_PAGE_SIZE,
  });
  const byStatus = new Map(
    grouped.map((entry) => [entry.status, entry._count._all]),
  );

  return {
    rows,
    total,
    page,
    totalPages: totalPages(total),
    summary: {
      total,
      open: byStatus.get(CorrectionStatus.OPEN) ?? 0,
      resolved: byStatus.get(CorrectionStatus.RESOLVED) ?? 0,
      cancelled: byStatus.get(CorrectionStatus.CANCELLED) ?? 0,
    },
  };
}

function retroactiveWhere(
  filters: ReportFilters,
): Prisma.RetroactiveAdjustmentItemWhereInput {
  const effectiveFromDate = dateRange(filters.from, filters.to);

  return {
    ...(filters.workerId ? { workerId: filters.workerId } : {}),
    ...(filters.adjustmentStatus
      ? { status: filters.adjustmentStatus as AdjustmentStatus }
      : {}),
    batch: {
      ...(filters.period
        ? { periodMonth: { contains: filters.period, mode: "insensitive" } }
        : {}),
      ...(Object.keys(effectiveFromDate).length > 0
        ? { effectiveFromDate }
        : {}),
    },
  };
}

const retroactiveSelect = {
  id: true,
  daysAffected: true,
  amountDiff: true,
  status: true,
  worker: {
    select: { id: true, legajo: true, name: true },
  },
  batch: {
    select: {
      periodMonth: true,
      effectiveFromDate: true,
      oldAmount: true,
      newAmount: true,
      createdAt: true,
    },
  },
  payment: {
    select: {
      paymentReference: true,
      requestVersion: {
        select: {
          request: { select: { id: true, requestNumber: true } },
        },
      },
    },
  },
} satisfies Prisma.RetroactiveAdjustmentItemSelect;

type RetroactiveRecord = Prisma.RetroactiveAdjustmentItemGetPayload<{
  select: typeof retroactiveSelect;
}>;

function mapRetroactiveRows(
  rows: RetroactiveRecord[],
): RetroactiveReportRow[] {
  return rows.map((row) => ({
    id: row.id,
    period: row.batch.periodMonth,
    effectiveFromDate: row.batch.effectiveFromDate,
    oldAmount: Number(row.batch.oldAmount),
    newAmount: Number(row.batch.newAmount),
    workerId: row.worker.id,
    workerLegajo: row.worker.legajo,
    workerName: row.worker.name,
    daysAffected: Number(row.daysAffected),
    amountDiff: Number(row.amountDiff),
    status: row.status,
    paymentReference: row.payment?.paymentReference ?? null,
    requestId: row.payment?.requestVersion.request.id ?? null,
    requestNumber: row.payment?.requestVersion.request.requestNumber ?? null,
  }));
}

async function findRetroactiveRows(
  filters: ReportFilters,
  pagination?: { skip: number; take: number },
) {
  const rows = await prisma.retroactiveAdjustmentItem.findMany({
    where: retroactiveWhere(filters),
    select: retroactiveSelect,
    orderBy: [
      { batch: { createdAt: "desc" } },
      { worker: { name: "asc" } },
      { id: "asc" },
    ],
    ...(pagination ?? {}),
  });

  return mapRetroactiveRows(rows);
}

export async function getRetroactiveReport(
  filters: ReportFilters,
): Promise<RetroactiveReport> {
  const where = retroactiveWhere(filters);
  const [total, aggregate] = await Promise.all([
    prisma.retroactiveAdjustmentItem.count({ where }),
    prisma.retroactiveAdjustmentItem.aggregate({
      where,
      _sum: { amountDiff: true, daysAffected: true },
    }),
  ]);
  const page = currentPage(filters.page, total);
  const rows = await findRetroactiveRows(filters, {
    skip: (page - 1) * REPORT_PAGE_SIZE,
    take: REPORT_PAGE_SIZE,
  });

  return {
    rows,
    total,
    page,
    totalPages: totalPages(total),
    summary: {
      items: total,
      amount: Number(aggregate._sum.amountDiff ?? 0),
      days: Number(aggregate._sum.daysAffected ?? 0),
    },
  };
}

export async function getReportFilterOptions(): Promise<ReportFilterOptions> {
  const [workers, areas, batches] = await Promise.all([
    prisma.worker.findMany({
      orderBy: [{ name: "asc" }, { legajo: "asc" }],
      select: { id: true, legajo: true, name: true },
    }),
    prisma.area.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.retroactiveAdjustmentBatch.findMany({
      distinct: ["periodMonth"],
      orderBy: { periodMonth: "desc" },
      select: { periodMonth: true },
    }),
  ]);

  return {
    workers,
    areas,
    periods: batches.map((batch) => batch.periodMonth),
  };
}

export function getBalanceExportRows(filters: ReportFilters) {
  return findBalanceRows(filters);
}

export function getCorrectionExportRows(filters: ReportFilters) {
  return findCorrectionRows(filters);
}

export function getRetroactiveExportRows(filters: ReportFilters) {
  return findRetroactiveRows(filters);
}
