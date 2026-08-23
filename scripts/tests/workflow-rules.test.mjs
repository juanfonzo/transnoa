import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sourceUrl = new URL("../../src/lib/workflow-rules.ts", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: "workflow-rules.ts",
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(
  transpiled.outputText
).toString("base64")}`;
const {
  buildDateKeys,
  findMissingConceptDates,
  STANDARDIZE_ALLOWED_STATUSES,
  validatePaymentEligibility,
  validatePaymentInput,
  validateStatus,
  validateVersionReadiness,
} = await import(moduleUrl);

const date = (value) => new Date(`${value}T00:00:00.000Z`);

test("construye todas las fechas inclusivas del período", () => {
  assert.deepEqual(buildDateKeys(date("2026-08-25"), date("2026-08-27")), [
    "2026-08-25",
    "2026-08-26",
    "2026-08-27",
  ]);
});

test("detecta días sin conceptos", () => {
  assert.deepEqual(
    findMissingConceptDates({
      startDate: date("2026-08-25"),
      endDate: date("2026-08-27"),
      conceptDates: [date("2026-08-25"), date("2026-08-27")],
    }),
    ["2026-08-26"]
  );
});

test("una versión completa queda lista para firma", () => {
  assert.equal(
    validateVersionReadiness({
      loteNumber: "QA-2026-0003",
      plannedPaymentDate: date("2026-08-28"),
      workerCount: 2,
      startDate: date("2026-08-25"),
      endDate: date("2026-08-27"),
      conceptDates: [
        date("2026-08-25"),
        date("2026-08-26"),
        date("2026-08-27"),
      ],
    }),
    null
  );
});

test("bloquea versiones incompletas antes de firma", () => {
  const base = {
    loteNumber: "QA-2026-0003",
    plannedPaymentDate: date("2026-08-28"),
    workerCount: 2,
    startDate: date("2026-08-25"),
    endDate: date("2026-08-27"),
    conceptDates: [
      date("2026-08-25"),
      date("2026-08-26"),
      date("2026-08-27"),
    ],
  };

  assert.equal(validateVersionReadiness({ ...base, loteNumber: "" }).code, "MISSING_LOTE");
  assert.equal(
    validateVersionReadiness({ ...base, plannedPaymentDate: null }).code,
    "MISSING_PLANNED_PAYMENT_DATE"
  );
  assert.equal(
    validateVersionReadiness({ ...base, workerCount: 0 }).code,
    "MISSING_WORKERS"
  );
  assert.equal(
    validateVersionReadiness({
      ...base,
      conceptDates: [date("2026-08-25"), date("2026-08-27")],
    }).code,
    "MISSING_CONCEPTS"
  );
});

test("administración sólo estandariza estados pendientes", () => {
  assert.equal(
    validateStatus(
      "SUBMITTED_TO_ADMIN",
      STANDARDIZE_ALLOWED_STATUSES,
      "Estado inválido"
    ),
    null
  );
  assert.equal(
    validateStatus("PAID", STANDARDIZE_ALLOWED_STATUSES, "Estado inválido").code,
    "INVALID_STATUS"
  );
});

test("el primer pago exige estado listo y firma actual", () => {
  assert.equal(
    validatePaymentEligibility({
      status: "READY_FOR_PAYMENT",
      hasPayment: false,
      hasSignature: true,
    }),
    null
  );
  assert.equal(
    validatePaymentEligibility({
      status: "READY_FOR_PAYMENT",
      hasPayment: false,
      hasSignature: false,
    }).code,
    "MISSING_SIGNATURE"
  );
  assert.equal(
    validatePaymentEligibility({
      status: "PENDING_SIGNATURE",
      hasPayment: false,
      hasSignature: true,
    }).code,
    "INVALID_STATUS"
  );
});

test("el pago exige fecha y una referencia real", () => {
  assert.equal(
    validatePaymentInput({ paidAt: null, paymentReference: "QA-PAY-0004" }).code,
    "MISSING_PAYMENT_DATE"
  );
  assert.equal(
    validatePaymentInput({ paidAt: date("2026-09-03"), paymentReference: "  " })
      .code,
    "MISSING_PAYMENT_REFERENCE"
  );
  assert.equal(
    validatePaymentInput({
      paidAt: date("2026-09-03"),
      paymentReference: "QA-PAY-0004",
    }),
    null
  );
});

test("la edición de pago sólo admite solicitudes pagadas", () => {
  assert.equal(
    validatePaymentEligibility({
      status: "PAID",
      hasPayment: true,
      hasSignature: true,
    }),
    null
  );
  assert.equal(
    validatePaymentEligibility({
      status: "READY_FOR_PAYMENT",
      hasPayment: true,
      hasSignature: true,
    }).code,
    "INVALID_STATUS"
  );
});
