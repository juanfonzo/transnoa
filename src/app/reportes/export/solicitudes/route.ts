import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

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
      "request_number",
      "area",
      "status",
      "version",
      "lote",
      "start_date",
      "end_date",
      "planned_payment_date",
      "total",
      "created_at",
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

  const csv = toCsv(rows);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=solicitudes.csv",
    },
  });
}
