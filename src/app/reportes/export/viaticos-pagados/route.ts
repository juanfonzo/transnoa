import { prisma } from "@/lib/prisma";
import { toExcelHtml } from "@/lib/excel";

export async function GET() {
  const rows = await prisma.viaticRequestWorker.findMany({
    where: {
      requestVersion: {
        request: { status: "PAID" },
        payment: { isNot: null },
      },
    },
    include: {
      worker: true,
      requestVersion: {
        include: {
          request: { include: { area: true } },
          payment: true,
        },
      },
      rendition: { include: { legs: { orderBy: { orderIndex: "asc" } } } },
    },
    orderBy: { requestVersionId: "desc" },
  });

  const data = rows.map((row) => {
    const version = row.requestVersion;
    const payment = version.payment;
    const rendition = row.rendition;
    const legsText =
      rendition?.legs
        .map((leg) => {
          const kmText = [leg.departureKm, leg.arrivalKm]
            .filter((value) => typeof value === "number")
            .join(" -> ");
          const kmSuffix = kmText ? ` (${kmText} km)` : "";
          return `${leg.departureLocation} -> ${leg.arrivalLocation}${kmSuffix}`;
        })
        .join(" | ") ?? "";

    return [
      version.request.requestNumber,
      version.versionNumber,
      version.request.area.name,
      version.loteNumber ?? "",
      payment?.paidAt ?? "",
      row.worker.name,
      row.worker.legajo,
      row.daysCount,
      row.netAmount,
      rendition?.reason ?? "",
      rendition?.vehiclePlate ?? "",
      legsText,
      rendition?.attachmentUrl ?? "",
      rendition?.notes ?? "",
    ];
  });

  const excel = toExcelHtml([
    [
      "solicitud",
      "version",
      "area",
      "lote",
      "fecha_pago",
      "colaborador",
      "legajo",
      "dias",
      "monto_neto",
      "motivo",
      "patente",
      "tramos",
      "respaldo_url",
      "notas",
    ],
    ...data,
  ]);

  return new Response(excel, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": "attachment; filename=viaticos-pagados.xls",
    },
  });
}
