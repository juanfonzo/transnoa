import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

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
      "request_number",
      "version",
      "area",
      "lote",
      "paid_at",
      "payment_reference",
      "total",
      "created_by",
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

  const csv = toCsv(rows);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=pagos.csv",
    },
  });
}

