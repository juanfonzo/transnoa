import { CorrectionStatus } from "@prisma/client";
import { dateOnlyKey } from "@/lib/date-only";
import { getDemoRole } from "@/lib/demo-auth";
import { toExcelHtml } from "@/lib/excel";
import { getCorrectionExportRows } from "@/lib/report-data";
import { parseReportFilters } from "@/lib/report-filters";

const statusLabels: Record<CorrectionStatus, string> = {
  OPEN: "Abierta",
  RESOLVED: "Resuelta",
  CANCELLED: "Anulada",
};

export async function GET(request: Request) {
  const role = await getDemoRole();
  if (role !== "ADMIN" && role !== "TESORERIA") {
    return new Response("Reporte no disponible para el rol activo.", { status: 403 });
  }

  const filters = parseReportFilters(new URL(request.url).searchParams);
  const corrections = await getCorrectionExportRows(filters);
  const rows = [
    [
      "solicitud",
      "version",
      "area",
      "colaboradores",
      "lote",
      "importe",
      "fecha_solicitud",
      "solicitada_por",
      "observacion",
      "fecha_pago_sugerida",
      "estado",
    ],
    ...corrections.map((row) => [
      row.requestNumber,
      row.versionNumber,
      row.areaName,
      row.workers.join(", "),
      row.lotNumber ?? "",
      row.totalAmount,
      row.requestedAt.toISOString(),
      row.requestedBy,
      row.reason,
      row.suggestedPaymentDate
        ? dateOnlyKey(row.suggestedPaymentDate)
        : "",
      statusLabels[row.status],
    ]),
  ];

  return new Response(toExcelHtml(rows), {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": "attachment; filename=reporte-correcciones.xls",
    },
  });
}
