import { prisma } from "@/lib/prisma";
import { toExcelHtml } from "@/lib/excel";

export async function GET() {
  const requests = await prisma.viaticRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      area: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: { workers: true },
      },
    },
  });

  const rows = [
    [
      "solicitud",
      "area",
      "estado",
      "version",
      "lote",
      "inicio",
      "fin",
      "fecha_pago_planificada",
      "total",
      "fecha_creacion",
    ],
    ...requests.map((request) => {
      const version = request.versions[0];
      const total = version
        ? version.workers.reduce(
            (sum, worker) => sum + Number(worker.netAmount),
            0
          )
        : 0;

      return [
        request.requestNumber,
        request.area.name,
        request.status,
        version?.versionNumber ?? "",
        version?.loteNumber ?? "",
        version?.startDate ?? "",
        version?.endDate ?? "",
        version?.plannedPaymentDate ?? "",
        total,
        request.createdAt,
      ];
    }),
  ];

  const excel = toExcelHtml(rows);

  return new Response(excel, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": "attachment; filename=solicitudes.xls",
    },
  });
}

