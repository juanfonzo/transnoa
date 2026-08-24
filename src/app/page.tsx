import type { RequestStatus } from "@prisma/client";
import { KpiStrip, type KpiItem } from "@/components/KpiStrip";
import { getDemoRole } from "@/lib/demo-auth";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { roleLabels, type DemoRole } from "@/lib/roles";

const DEMO_COLLABORATOR_LEGAJO = "1001";

function countStatuses(
  statuses: RequestStatus[],
  counts: Partial<Record<RequestStatus, number>>,
) {
  return statuses.reduce((total, status) => total + (counts[status] ?? 0), 0);
}

async function getAreaHeadKpis(): Promise<KpiItem[]> {
  const areaHead = await prisma.user.findFirst({
    where: { role: "JEFE_AREA", active: true },
    select: { areaId: true },
  });
  const requests = areaHead?.areaId
    ? await prisma.viaticRequest.findMany({
        where: { areaId: areaHead.areaId },
        select: {
          status: true,
          versions: {
            orderBy: { versionNumber: "desc" },
            take: 1,
            select: { workers: { select: { netAmount: true } } },
          },
        },
      })
    : [];
  const counts = requests.reduce<Partial<Record<RequestStatus, number>>>((acc, request) => {
    acc[request.status] = (acc[request.status] ?? 0) + 1;
    return acc;
  }, {});
  const amountFor = (status: RequestStatus) =>
    requests
      .filter((request) => request.status === status)
      .reduce(
        (total, request) =>
          total +
          (request.versions[0]?.workers.reduce(
            (subtotal, worker) => subtotal + Number(worker.netAmount),
            0,
          ) ?? 0),
        0,
      );

  return [
    {
      label: "Pendientes de firma",
      value: counts.PENDING_SIGNATURE ?? 0,
      tone: "amber",
    },
    {
      label: "En Administración",
      value: countStatuses(
        ["SUBMITTED_TO_ADMIN", "ADMIN_REVIEW", "TREASURY_RETURNED", "ADMIN_CORRECTION"],
        counts,
      ),
      tone: "sky",
    },
    {
      label: "Listas para pagar",
      value: counts.READY_FOR_PAYMENT ?? 0,
      detail: formatCurrency(amountFor("READY_FOR_PAYMENT")),
      tone: "emerald",
    },
    {
      label: "Pagadas",
      value: counts.PAID ?? 0,
      detail: formatCurrency(amountFor("PAID")),
      tone: "slate",
    },
  ];
}

async function getAdminKpis(): Promise<KpiItem[]> {
  const requests = await prisma.viaticRequest.findMany({ select: { status: true } });
  const counts = requests.reduce<Partial<Record<RequestStatus, number>>>((acc, request) => {
    acc[request.status] = (acc[request.status] ?? 0) + 1;
    return acc;
  }, {});

  return [
    { label: "Ingresos nuevos", value: counts.SUBMITTED_TO_ADMIN ?? 0, tone: "sky" },
    { label: "En revisión", value: counts.ADMIN_REVIEW ?? 0, tone: "amber" },
    { label: "Pendientes de firma", value: counts.PENDING_SIGNATURE ?? 0, tone: "amber" },
    {
      label: "Para corregir",
      value: countStatuses(["TREASURY_RETURNED", "ADMIN_CORRECTION"], counts),
      tone: "rose",
    },
  ];
}

async function getTreasuryKpis(): Promise<KpiItem[]> {
  const requests = await prisma.viaticRequest.findMany({
    where: { status: { in: ["READY_FOR_PAYMENT", "TREASURY_RETURNED", "PAID"] } },
    select: {
      status: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: { workers: { select: { netAmount: true } } },
      },
    },
  });
  const amountFor = (status: RequestStatus) =>
    requests
      .filter((request) => request.status === status)
      .reduce(
        (total, request) =>
          total +
          (request.versions[0]?.workers.reduce(
            (subtotal, worker) => subtotal + Number(worker.netAmount),
            0,
          ) ?? 0),
        0,
      );

  return [
    {
      label: "Listas para pagar",
      value: requests.filter((request) => request.status === "READY_FOR_PAYMENT").length,
      detail: formatCurrency(amountFor("READY_FOR_PAYMENT")),
      tone: "emerald",
    },
    {
      label: "Pagos registrados",
      value: requests.filter((request) => request.status === "PAID").length,
      detail: formatCurrency(amountFor("PAID")),
      tone: "sky",
    },
    {
      label: "Con observaciones",
      value: requests.filter((request) => request.status === "TREASURY_RETURNED").length,
      tone: "rose",
    },
  ];
}

async function getCollaboratorKpis(): Promise<KpiItem[]> {
  const worker = await prisma.worker.findUnique({
    where: { legajo: DEMO_COLLABORATOR_LEGAJO },
    select: {
      balanceEntries: { select: { type: true, amount: true } },
      requestWorkers: {
        select: {
          netAmount: true,
          requestVersion: { select: { payment: { select: { id: true } } } },
        },
      },
    },
  });
  const entries = worker?.balanceEntries ?? [];
  const balance = entries.reduce((total, entry) => {
    const amount = Number(entry.amount);
    return entry.type === "CREDIT" ? total + amount : total - amount;
  }, 0);
  const payments =
    worker?.requestWorkers.filter((entry) => Boolean(entry.requestVersion.payment)) ?? [];
  const paidAmount = payments.reduce((total, entry) => total + Number(entry.netAmount), 0);
  const balanceLabel =
    balance > 0
      ? "Saldo a favor"
      : balance < 0
        ? "Saldo a regularizar"
        : "Saldo actual";

  return [
    {
      label: balanceLabel,
      value: formatCurrency(balance),
      tone: balance > 0 ? "emerald" : balance < 0 ? "amber" : "slate",
      valueClassName: "text-xl",
    },
    {
      label: "Pagos recibidos",
      value: payments.length,
      detail: formatCurrency(paidAmount),
      tone: "sky",
    },
    { label: "Movimientos", value: entries.length, tone: "slate" },
  ];
}

async function getPanelKpis(role: DemoRole) {
  switch (role) {
    case "JEFE_AREA":
      return getAreaHeadKpis();
    case "COLABORADOR":
      return getCollaboratorKpis();
    case "ADMIN":
      return getAdminKpis();
    case "TESORERIA":
      return getTreasuryKpis();
  }
}

export default async function Home() {
  const role = await getDemoRole();
  const kpis = await getPanelKpis(role);

  return (
    <section aria-labelledby="panel-title">
      <h2 id="panel-title" className="sr-only">
        Panel de {roleLabels[role]}
      </h2>
      <KpiStrip label={`Indicadores de ${roleLabels[role]}`} items={kpis} />
    </section>
  );
}
