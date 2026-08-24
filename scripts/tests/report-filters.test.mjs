import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sourceUrl = new URL("../../src/lib/report-filters.ts", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: "report-filters.ts",
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(
  transpiled.outputText,
).toString("base64")}`;
const {
  buildReportSearchParams,
  hasActiveReportFilters,
  parseReportFilters,
} = await import(moduleUrl);

test("normaliza pestaña, página, fechas y estados desconocidos", () => {
  const filters = parseReportFilters({
    tab: "desconocido",
    pagina: "-5",
    desde: "2026-02-30",
    hasta: "2026-08-24",
    estado: "INVALID",
  });

  assert.equal(filters.tab, "saldos");
  assert.equal(filters.page, 1);
  assert.equal(filters.from, "");
  assert.equal(filters.to, "2026-08-24");
  assert.equal(filters.correctionStatus, "");
  assert.equal(filters.adjustmentStatus, "");
});

test("interpreta el estado según el reporte activo", () => {
  const correction = parseReportFilters(
    new URLSearchParams("tab=correcciones&estado=OPEN&pagina=3"),
  );
  const retroactive = parseReportFilters(
    new URLSearchParams("tab=retroactivos&estado=PAID"),
  );

  assert.equal(correction.correctionStatus, "OPEN");
  assert.equal(correction.adjustmentStatus, "");
  assert.equal(correction.page, 3);
  assert.equal(retroactive.correctionStatus, "");
  assert.equal(retroactive.adjustmentStatus, "PAID");
});

test("preserva filtros y omite el estado incompatible al construir enlaces", () => {
  const filters = parseReportFilters({
    tab: "correcciones",
    estado: "OPEN",
    lote: " L-2026-100 ",
    colaborador: "worker-1",
  });
  const query = buildReportSearchParams(filters, { page: 2 });

  assert.equal(query.get("tab"), "correcciones");
  assert.equal(query.get("estado"), "OPEN");
  assert.equal(query.get("lote"), "L-2026-100");
  assert.equal(query.get("colaborador"), "worker-1");
  assert.equal(query.get("pagina"), "2");
  assert.equal(query.get("saldo"), null);
  assert.equal(hasActiveReportFilters(filters), true);
});

test("una vista sin criterios no se considera filtrada", () => {
  assert.equal(
    hasActiveReportFilters(parseReportFilters({ tab: "retroactivos" })),
    false,
  );
});
