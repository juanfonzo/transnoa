import { getDemoRole } from "@/lib/demo-auth";
import { toExcelHtml } from "@/lib/excel";
import { getBalanceExportRows } from "@/lib/report-data";
import { parseReportFilters } from "@/lib/report-filters";

function situation(balance: number) {
  if (balance > 0) return "A favor";
  if (balance < 0) return "Deudor";
  return "Sin saldo";
}

export async function GET(request: Request) {
  const role = await getDemoRole();
  if (role !== "ADMIN" && role !== "TESORERIA") {
    return new Response("Reporte no disponible para el rol activo.", { status: 403 });
  }

  const filters = parseReportFilters(new URL(request.url).searchParams);
  const balances = await getBalanceExportRows(filters);
  const rows = [
    [
      "legajo",
      "colaborador",
      "provincia",
      "creditos",
      "debitos",
      "saldo_actual",
      "situacion",
      "movimientos",
      "ultimo_movimiento",
    ],
    ...balances.map((row) => [
      row.legajo,
      row.workerName,
      row.province ?? "",
      row.credits,
      row.debits,
      Math.abs(row.balance),
      situation(row.balance),
      row.movements,
      row.lastMovementAt?.toISOString() ?? "",
    ]),
  ];

  return new Response(toExcelHtml(rows), {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": "attachment; filename=reporte-saldos.xls",
    },
  });
}
