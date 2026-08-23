import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sourceUrl = new URL("../../src/lib/date-only.ts", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: "date-only.ts",
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(
  transpiled.outputText
).toString("base64")}`;
const {
  addDateOnlyDays,
  buildDateOnlyKeys,
  dateOnlyKey,
  diffDateOnlyDaysInclusive,
  formatDateOnly,
  parseDateOnly,
} = await import(moduleUrl);

test("parsea fechas calendario en UTC", () => {
  assert.equal(parseDateOnly("2026-01-10").toISOString(), "2026-01-10T00:00:00.000Z");
  assert.equal(parseDateOnly("2026-02-30"), null);
  assert.equal(parseDateOnly("10/01/2026"), null);
});

test("presenta la fecha sin desplazamiento de zona horaria", () => {
  assert.equal(formatDateOnly(new Date("2026-01-10T00:00:00.000Z")), "10/1/2026");
  assert.equal(formatDateOnly(new Date("2026-01-10T03:00:00.000Z")), "10/1/2026");
});

test("construye rangos inclusivos estables", () => {
  const start = parseDateOnly("2026-12-31");
  const end = addDateOnlyDays(start, 2);

  assert.equal(dateOnlyKey(end), "2027-01-02");
  assert.deepEqual(buildDateOnlyKeys(start, end), [
    "2026-12-31",
    "2027-01-01",
    "2027-01-02",
  ]);
});

test("normaliza horas heredadas antes de calcular días", () => {
  const legacyStart = new Date("2026-01-10T03:00:00.000Z");
  const utcEnd = new Date("2026-01-14T00:00:00.000Z");

  assert.equal(diffDateOnlyDaysInclusive(legacyStart, utcEnd), 5);
  assert.equal(
    addDateOnlyDays(legacyStart, 1).toISOString(),
    "2026-01-11T00:00:00.000Z",
  );
  assert.equal(diffDateOnlyDaysInclusive(utcEnd, legacyStart), 0);
});
