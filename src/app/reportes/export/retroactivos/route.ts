import { AdjustmentStatus } from "@prisma/client";
import { dateOnlyKey } from "@/lib/date-only";
import { getDemoRole } from "@/lib/demo-auth";
import { toExcelHtml } from "@/lib/excel";
import { getRetroactiveExportRows } from "@/lib/report-data";
import { parseReportFilters } from "@/lib/report-filters";

const statusLabels: Record<AdjustmentStatus, string> = {
  DRAFT: "Borrador",
  PENDING_SIGNATURE: "Pendiente de firma",
  READY_FOR_PAYMENT: "Listo para pagar",
  PAID: "Pagado",
  CANCELLED: "Anulado",
};

export async function GET(request: Request) {
  const role = await getDemoRole();
  if (role !== "ADMIN" && role !== "TESORERIA") {
    return new Response("Reporte no disponible para el rol activo.", { status: 403 });
  }

  const filters = parseReportFilters(new URL(request.url).searchParams);
  const adjustments = await getRetroactiveExportRows(filters);
  const rows = [
    [
      "periodo",
      "vigencia_desde",
      "valor_anterior",
      "valor_nuevo",
      "legajo",
      "colaborador",
      "dias_afectados",
      "diferencia",
      "estado",
      "solicitud_aplicada",
      "referencia_pago",
    ],
    ...adjustments.map((row) => [
      row.period,
      dateOnlyKey(row.effectiveFromDate),
      row.oldAmount,
      row.newAmount,
      row.workerLegajo,
      row.workerName,
      row.daysAffected,
      row.amountDiff,
      statusLabels[row.status],
      row.requestNumber ?? "",
      row.paymentReference ?? "",
    ]),
  ];

  return new Response(toExcelHtml(rows), {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": "attachment; filename=reporte-retroactivos.xls",
    },
  });
}
