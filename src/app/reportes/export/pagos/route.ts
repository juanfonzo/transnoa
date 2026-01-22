import { prisma } from "@/lib/prisma";
import { toExcelHtml } from "@/lib/excel";

export async function GET() {
  const payments = await prisma.treasuryPayment.findMany({
    orderBy: { paidAt: "desc" },
    include: {
      requestVersion: {
        include: {
          request: { include: { area: true } },
          workers: true,
        },
      },
      createdBy: true,
    },
  });

  const rows = [
    [
      "solicitud",
      "version",
      "area",
      "lote",
      "fecha_pago",
      "referencia_pago",
      "total",
      "creado_por",
    ],
    ...payments.map((payment) => {
      const request = payment.requestVersion.request;
      const total = payment.requestVersion.workers.reduce(
        (sum, worker) => sum + Number(worker.netAmount),
        0
      );

      return [
        request.requestNumber,
        payment.requestVersion.versionNumber,
        request.area.name,
        payment.requestVersion.loteNumber ?? "",
        payment.paidAt,
        payment.paymentReference ?? "",
        total,
        payment.createdBy.name,
      ];
    }),
  ];

  const excel = toExcelHtml(rows);

  return new Response(excel, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": "attachment; filename=pagos.xls",
    },
  });
}

