import { prisma } from "@/lib/prisma";
import { getDemoRole } from "@/lib/demo-auth";
import { toExcelHtml } from "@/lib/excel";
import { dateOnlyKey } from "@/lib/date-only";

export async function GET() {
  const role = await getDemoRole();
  if (role !== "ADMIN" && role !== "TESORERIA") {
    return new Response("Reporte no disponible para el rol activo.", { status: 403 });
  }

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
        dateOnlyKey(payment.paidAt),
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

