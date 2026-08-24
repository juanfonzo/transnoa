export type ActionField =
  | "requestId"
  | "dates"
  | "workerIds"
  | "concepts"
  | "loteNumber"
  | "plannedPaymentDate"
  | "paidAt"
  | "paymentReference"
  | "reason";

export type ActionErrorCode =
  | "ACTOR_NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "INVALID_STATUS"
  | "MISSING_WORKERS"
  | "MISSING_CONCEPTS"
  | "MISSING_LOTE"
  | "MISSING_PLANNED_PAYMENT_DATE"
  | "MISSING_SIGNATURE"
  | "MISSING_PAYMENT_DATE"
  | "MISSING_PAYMENT_REFERENCE"
  | "MISSING_CORRECTION_REASON";

export type ActionResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      code: ActionErrorCode;
      message: string;
      field?: ActionField;
    };

export function actionSuccess(message: string): ActionResult {
  return { ok: true, message };
}

export function actionError(
  code: ActionErrorCode,
  message: string,
  field?: ActionField
): ActionResult {
  return { ok: false, code, message, field };
}
