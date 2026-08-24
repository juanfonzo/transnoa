import type { RequestStatus } from "@prisma/client";
import {
  SolicitudesList,
  type SolicitudListRow,
} from "@/app/solicitudes/SolicitudesList";
import { SolicitudWizard } from "@/app/solicitudes/SolicitudWizard";
import { RoleAccessNotice } from "@/components/RoleAccessNotice";
import { KpiStrip } from "@/components/KpiStrip";
import { getDemoRole } from "@/lib/demo-auth";
import { formatCurrency, formatDate, formatDateOnly } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  getRequestStatusLabel,
  getStatusTone,
} from "@/lib/status";

const summaryLabels: Partial<Record<RequestStatus, string>> = {
  SUBMITTED_TO_ADMIN: "En Administración",
  READY_FOR_PAYMENT: "Listas para pagar",
  TREASURY_RETURNED: "Devueltas",
  PAID: "Pagadas",
};

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
      select: {
        id: true,
        name: true,
        legajo: true,
        balanceEntries: { select: { type: true, amount: true } },
      },
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
  const workerOptions = workers.map((worker) => ({
    id: worker.id,
    name: worker.name,
    legajo: worker.legajo,
    balance: worker.balanceEntries.reduce((total, entry) => {
      const amount = Number(entry.amount);
      return entry.type === "CREDIT" ? total + amount : total - amount;
    }, 0),
  }));
  const listRows: SolicitudListRow[] = rows.map(({ request, version, total }) => ({
    requestId: request.id,
    requestNumber: request.requestNumber,
    createdAtLabel: formatDate(request.createdAt),
    areaName: request.area.name,
    versionLabel: version ? `v${version.versionNumber}` : "-",
    loteLabel: version?.loteNumber ?? "-",
    dateRangeLabel: `${formatDateOnly(version?.startDate)} – ${formatDateOnly(
      version?.endDate,
    )}`,
    total,
    totalLabel: formatCurrency(total),
    status: request.status,
    detailHref: `/solicitudes/${request.id}`,
  }));

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
        <SolicitudWizard
          areas={areas}
          workers={workerOptions}
          dailyAmount={dailyAmount}
        />
      </header>

      <KpiStrip
        label="Resumen de solicitudes"
        items={Object.entries(statusCounts).map(([status, count]) => {
          const typedStatus = status as RequestStatus;
          return {
            label: summaryLabels[typedStatus] ?? getRequestStatusLabel(typedStatus),
            value: count,
            tone: getStatusTone(typedStatus),
          };
        })}
      />

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <p className="font-semibold text-slate-800">Todavía no hay solicitudes</p>
          <p className="mt-1 text-sm text-slate-500">
            Creá la primera solicitud para iniciar el circuito de aprobación.
          </p>
        </div>
      ) : (
        <SolicitudesList rows={listRows} />
      )}
    </div>
  );
}
