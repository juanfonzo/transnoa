import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Prisma } from "@prisma/client";
import ts from "typescript";

const sourceUrl = new URL("../../src/lib/viatic-balance.ts", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: "viatic-balance.ts",
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(
  transpiled.outputText,
).toString("base64")}`;
const {
  calculateBalanceApplication,
  getBalanceSettlementType,
} = await import(moduleUrl);

const decimal = (value) => new Prisma.Decimal(value);

test("descuenta el saldo deudor del importe bruto", () => {
  const result = calculateBalanceApplication(decimal("84000"), decimal("-7000"));

  assert.equal(result.appliedAmount.toFixed(2), "-7000.00");
  assert.equal(result.netAmount.toFixed(2), "77000.00");
  assert.equal(getBalanceSettlementType(result.appliedAmount), "CREDIT");
});

test("limita la deuda aplicada para que el neto nunca sea negativo", () => {
  const result = calculateBalanceApplication(decimal("84000"), decimal("-100000"));

  assert.equal(result.appliedAmount.toFixed(2), "-84000.00");
  assert.equal(result.netAmount.toFixed(2), "0.00");
  assert.equal(getBalanceSettlementType(result.appliedAmount), "CREDIT");
});

test("suma el saldo a favor y lo consume con un débito compensatorio", () => {
  const result = calculateBalanceApplication(decimal("84000"), decimal("9000"));

  assert.equal(result.appliedAmount.toFixed(2), "9000.00");
  assert.equal(result.netAmount.toFixed(2), "93000.00");
  assert.equal(getBalanceSettlementType(result.appliedAmount), "DEBIT");
});

test("mantiene precisión decimal y no crea compensación para saldo cero", () => {
  const withDebt = calculateBalanceApplication(
    decimal("12345.67"),
    decimal("-45.67"),
  );
  const withoutBalance = calculateBalanceApplication(
    decimal("12345.67"),
    decimal("0"),
  );

  assert.equal(withDebt.netAmount.toFixed(2), "12300.00");
  assert.equal(withoutBalance.netAmount.toFixed(2), "12345.67");
  assert.equal(getBalanceSettlementType(withoutBalance.appliedAmount), null);
});
